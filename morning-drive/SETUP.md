# Morning Drive — first-time setup

The page (`/morning-drive`) ships ready to load. Before it'll actually
produce content, three one-time setup steps:

## 1. Apply the Supabase migrations

Morning Drive lives in the **woolfsatprep** Supabase project
(`https://sonzonoitvcfiyjxzdbo.supabase.co`) — the `morning_drive_*` tables
can't collide with the SAT app's own tables.

Note that woolfsatprep sits on a **different Supabase account** from the one
holding `elitemathprep` / `testday` / `woolftrade` (org "Elite Math Prep",
`woolf.scott.kevin@gmail.com`). If the dashboard bounces you to an org page
when you open a project link, you're signed into the wrong account.

[`migrations/001_init.sql`](./migrations/001_init.sql) has already been
applied. If you ever need to re-run it (idempotent): paste into **Supabase
Studio → SQL Editor → Run**.

[`migrations/002_vocab_review.sql`](./migrations/002_vocab_review.sql) was
applied on 2026-08-28. It adds an `item_key` column to `morning_drive_attempts`
so Word Match can track which specific *word* a kid missed, rather than just
which slot on the page. Verified live: the column and the
`morning_drive_attempts_item_idx` index are both present.

Three tables: `morning_drive_days`, `morning_drive_seen`,
`morning_drive_attempts`. All with RLS enabled; service-role bypasses
RLS so the API can write freely; `anon` can only SELECT from
`morning_drive_days`.

## 2. Set env vars on Vercel

In **Vercel → Project → Settings → Environment Variables**, add (all
three environments unless noted):

| Name                          | Value                                                                          | Where  |
| ----------------------------- | ------------------------------------------------------------------------------ | ------ |
| `SUPABASE_URL`                | `https://sonzonoitvcfiyjxzdbo.supabase.co`                                     | server |
| `SUPABASE_SERVICE_ROLE_KEY`   | (from **woolfsatprep** Supabase Studio → Project Settings → API → service_role secret) | server |
| `CRON_SECRET`                 | any random 32+ char string                                                     | server |

All three env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`CRON_SECRET`) are set for Production + Development as of 2026-05-13.
Preview env vars are intentionally not set (Preview branches don't run
the cron); upgrade the Vercel CLI and re-add if you ever want them.

The AI SDK's Vercel AI Gateway authentication is wired automatically via OIDC
when the function runs on Vercel — no manual token to configure. For
`vercel dev` locally, run `vercel env pull` once so the dev session inherits
the same OIDC-issued Gateway token.

## 3. Verify the cron

In `vercel.json` the cron is registered at `30 8 * * *` UTC — that's 4:30 AM
US-Eastern during DST (March–November) and 3:30 AM Eastern outside DST. The
kids leave for school after 7 AM ET so either window is comfortable.

After your first deploy, **Vercel → Deployments → Crons** should list
`/api/morning-drive-cron`. To test manually before waiting overnight:

```bash
# Smoke-test against your prod URL
curl -X GET "https://dadarcade.com/api/morning-drive-cron?date=2026-05-14" \
  -H "Authorization: Bearer $CRON_SECRET"
```

You should see `{"ok": true, "status": "generated", ...}` on a successful
run, or `{"ok": true, "status": "exists", ...}` if today's row already exists.

## How it all hangs together

- **Cron at 4:30am ET** → `api/morning-drive-cron.js` decides which sections
  run today, builds each kid's math plan, reads the do-not-repeat lists +
  difficulty + format stats from Supabase, calls Sonnet via Vercel AI Gateway
  with `generateText` + `Output.object()` against a per-day Zod schema, assembles
  Word Match in code, writes the payload to `morning_drive_days`, and logs every
  item to `morning_drive_seen`.

- **Page load** → `morning-drive/index.html` fetches `/api/morning-drive`,
  which reads the day from `morning_drive_days` and returns the JSON. If
  the row is missing (cron failed or hasn't run yet), the API falls back
  to on-demand generation — slower (~10–20s) but still ships.

- **Each math / Word Match tap** → POSTed to `/api/morning-drive`, logged to
  `morning_drive_attempts` with `kid`, `topic`, `item_key`, `attempts`,
  `correct`. Geography and Two Truths are shared between both kids, so they
  stay unlogged — there's no single `kid` to attribute them to.

- **Past Days pill** → `/api/morning-drive?past=1` lists the last 30 days;
  picking one loads it in read-only mode (answers revealed, no attempt
  logging).

## Local dev

```bash
vercel env pull           # one-time, brings down dev secrets + OIDC token
vercel dev                # runs the API + serves /morning-drive
open http://localhost:3000/morning-drive
```

If you need to clear today's content and regenerate during testing:

```sql
delete from morning_drive_days where date = '2026-05-13';
delete from morning_drive_seen where date = '2026-05-13';
```


---

## Content design (rewritten August 2026)

### Where each section comes from

Everything except Word Match is generated fresh each night by Sonnet. Word
Match is assembled **in code** from previous days' words.

| Section | Every day? | Built by |
| --- | --- | --- |
| Claire's / Connor's Math | yes | model, against an assigned plan |
| Claire's / Connor's Grammar | yes | model, against an assigned plan |
| Words of the Day | yes | model |
| Word Match | yes* | **code** — prior days' words |
| Verse of the Day, Quote of the Day | yes | model |
| Jokes | yes | model |
| Geography, Would You Rather, News, Trivia, Fun Facts, On This Day, Riddle, Two Truths, Today's Challenge, Spelling, Spanish Word | rotating | model |
| **Art of the Day, Landmark, Flag, Animal** | rotating | model names it, **code resolves the image** |

\* Word Match sits out until each kid has at least 4 prior words banked.

### Visual tiles: the model never supplies an image URL

This is the rule the whole media pipeline exists to enforce. Ask a language
model for an image URL and you get something that looks exactly right and 404s.
So the model supplies only a **subject** — an artwork title and artist, a
Wikipedia article title, a country name — and
[`api/_morning-drive-media.js`](../api/_morning-drive-media.js) turns that into
a real image:

| Tile | Source | Payload |
| --- | --- | --- |
| Art of the Day | Met Museum + Art Institute of Chicago | ~100–220 KB |
| Landmark, Animal | Wikipedia `pageimages` | ~120–235 KB at 600px |
| Flag | flagcdn.com | 172 B – 2 KB |

Every resolved URL is HEAD-checked before being stored. **A tile that doesn't
resolve is dropped for that day** and recorded in `meta.droppedForMedia`; the
drive still ships.

Two things that will bite if you touch this code:

- **Artwork matching is scored, not substring-matched.** The Met holds *"Study
  for 'A Sunday on La Grande Jatte'"*, which contains the requested title
  exactly but is a preparatory sketch — the famous painting is in Chicago.
  Conversely the Met catalogues Hokusai's Great Wave as *"Under the Wave off
  Kanagawa"*, sharing no leading substring with the name kids know it by. Hence
  `matchScore()`, the study/sketch penalty, and searching both collections
  before choosing.
- **Wikimedia only serves thumbnail widths it has already generated.** Rewriting
  `/330px-` to `/600px-` in a URL returns HTTP 400 for most files. Use
  `pithumbsize`, which asks MediaWiki to generate the size properly.

### Image licensing — not optional

Met (CC0) and Art Institute (public domain) images need no credit. **Most
Wikimedia photos are CC-BY-SA and legally require visible attribution**, so
`fileCredit()` resolves the licence and author for the exact file being shown,
and the page renders it under the image in `.img-credit`. Don't delete that
line to tidy up the layout.

### Content safety for artwork

The Met's collection contains a great deal of classical nudity, and department
filters do not reliably exclude it. That is why the model names a specific
famous, kid-appropriate work rather than the code pulling a random object ID —
the model knows *Wheat Field with Cypresses* is fine for a 7-year-old. Switch
this to random selection and you will get nudes.

### Bandwidth

This is read on a phone, on mobile data, in a moving car. Image tiles are capped
at `MAX_IMAGE_SECTIONS_PER_DAY` (2), enforced in `pickRotation()` by swapping
surplus photo tiles for text tiles, and every image is lazy-loaded with its
dimensions set so the page doesn't jump. Never use the Met's `primaryImage`:
those originals run to **8 MB**. `primaryImageSmall` is ~220 KB.

### Section rotation

Showing every section each morning is far too long for one drive, so most
rotate. `ROTATING_PER_DAY` in `api/_morning-drive-shared.js` controls how many
appear (currently **5** of 15). Raise it to show more per day.

The choice is derived from the date alone, so re-opening an old day in **Past
Days** always replays the exact sections it originally had.

### Grammar

Same assigned-topic machinery as math, for the same reason: left to itself the
model asks about nouns and verbs every single day. 20 topics per kid and 6
formats, in `GRAMMAR_TOPICS` / `GRAMMAR_FORMATS`, 3 questions each. Every
grammar question carries a `why` field stating the rule in one sentence, shown
however they answered — a wrong answer should still teach the rule.

### Math variety

Each question gets an **assigned topic and an assigned format**, rotated by
date, rather than the model being handed the same short topic list every night.
This was the fix for "different names and numbers in the same problem":
text-level dedupe can't detect that twenty questions share one skeleton.

- 20 topics per kid × 12 formats, in `MATH_TOPICS` / `MATH_FORMATS`.
- 5 distinct topics and 5 distinct formats per kid per day.
- Topic sets cycle over 20 days; full plans over 60.
- `fetchRecentFormats()` feeds the last 21 days of *shapes* back into the
  prompt, so the model can see which skeletons are over-used.

The multipliers in `assignMathPlan()` must stay **coprime with the pool
lengths**. This is easy to break: a step of 4 over 20 topics looks fine per-day
but silently pins every day to one residue class, giving only 4 distinct topic
sets ever. `morning-drive/tests/plan.test.mjs` guards this.

### Word Match — spaced repetition

Kids learn 2 words a day; Word Match quizzes words from **earlier** mornings.
Priority order:

1. Words they got wrong (or needed multiple taps on) the last time it came up.
2. Words never yet reviewed, oldest first.
3. Words answered cleanly — drifting further back the more times they've nailed it.

`VOCAB_REVIEW_PER_KID` (default 3) sets how many each kid gets. Distractors are
drawn from the kid's own bank of learned words, so wrong answers are always
words they've actually met.

### Changing the kids' grades

One place: the `KIDS` block at the top of `api/_morning-drive-shared.js`.

```js
export const KIDS = {
  claire: { name: "Claire", grade: 4, blurb: "older, sharp, reads well" },
  connor: { name: "Connor", grade: 2, blurb: "younger, concrete thinker" },
};
```

Grade drives the math topic pools, the reading level, and the vocabulary
difficulty. **Bump it every August** — nothing does this automatically, and a
stale grade is invisible from the page itself.

## Tests

```bash
node morning-drive/tests/plan.test.mjs
```

Covers rotation determinism and coverage, math and grammar topic/format
cycling, the image-tiles-per-day cap, word hygiene (masking and corrupted-entry
rejection), and Word Match priority ordering. No network or database needed.

The media resolvers hit live third-party APIs, so they get a separate smoke
check rather than a unit test:

```bash
node morning-drive/tests/media.check.mjs
```

It resolves several real artworks, landmarks, animals and flags, and confirms
that deliberately hallucinated subjects return null rather than a broken tile.

To iterate on the front end without a database, serve the repo and open
`morning-drive/tests/preview.html` — it stubs the API with a full fake payload
containing every section:

```bash
python3 -m http.server 8899
```


---

## The content bank (September 2026)

### Why

The nightly prompt had reached **~50,000 input tokens**, and **91% of it was the
"do not repeat these" block** — every item the model had previously written,
re-sent every night so it wouldn't say the same thing twice. It grew with
history, so the cost compounded. Measured against 30 days of real data:

```
instructions + plans :   9,170 chars   ~2,478 tokens
do-not-repeat block  :  98,254 chars  ~26,555 tokens   <- 91%
```

A unique index does that job for free.

### How it works now

Almost every tile is **evergreen**: a joke, a riddle, a verse, a flag question
about Japan is no worse for having been written six weeks earlier. So:

- **Content is generated in batches** into `morning_drive_pool` — 25 to 70 items
  of a single kind per call.
- **The nightly job assembles a day in pure code.** It claims unused rows,
  stamps `used_on`, and writes `morning_drive_days`. **No model call.**
- **Top-ups are bounded**: at most **one kind per night**, and only when that
  kind has dropped below its `min`. Most nights do nothing.

Roughly 15 top-ups a month at ~3.5k tokens each, against 30 nightly calls at
~50k. About a 30x reduction, and it no longer grows with history.

Batching also produces *better* content: asking for 50 jokes at once lets the
model see the whole set and vary it, where 50 separate calls each wrote blind.

### The pieces

| File | Role |
| --- | --- |
| [`_morning-drive-pool.js`](../api/_morning-drive-pool.js) | `POOL_KINDS` (what to stock), `SECTION_NEEDS` (what a day consumes), claim/insert/assemble |
| [`_morning-drive-batch.js`](../api/_morning-drive-batch.js) | Per-kind batch prompts, media resolution, insertion |
| [`morning-drive-cron.js`](../api/morning-drive-cron.js) | Assembles from the pool, tops up one kind, falls back to legacy generation |

### Seeding

The pool starts empty. Apply
[`003_content_pool.sql`](./migrations/003_content_pool.sql), then run the
top-up endpoint repeatedly — `kinds=N` caps how many batches one invocation
attempts, so this stays inside the function timeout:

```bash
curl "https://dadarcade.com/api/morning-drive-cron?mode=topup&kinds=4" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**25 batches produce about 874 items** — call it six or seven invocations at
`kinds=4`. Until it is seeded the cron falls back to the old full-day
generation, so nothing breaks mid-transition; it just costs what it used to.

### Things worth knowing

- **The pool is service-role only.** Deliberately no anon read policy: it holds
  unused answers, and a curious kid with the network tab open should not be able
  to read tomorrow's questions.
- **Media is resolved at top-up time, not at serve time.** Artwork, landmark,
  flag and animal items enter the pool with a verified image URL already
  attached, so a broken link can never reach the page and the nightly assembly
  never touches the network.
- **Running dry is reported, not rendered.** A section the pool cannot fill is
  listed in `meta.shortFromPool` and omitted. If an *everyday* section cannot be
  filled, the claimed items are released and the legacy generator runs instead.
- **News is no longer framed as recent.** Pooled items may be served weeks after
  they are written, so the batch prompt explicitly forbids "this week" framing.
  This was always the honest position — the stories were never fetched from a
  live source.
- **`morning_drive_seen` is not written by the pool path.** The unique index on
  `(kind, fingerprint)` is the never-repeat guarantee now. That table is still
  written by the legacy path.

```bash
node morning-drive/tests/pool.test.mjs
```

Covers config coherence (every kind has a schema; no kind's minimum is below one
day's demand), claiming and release, insert dedupe, and assembling a full day —
all against an in-memory stand-in for Supabase, so no network, credentials or AI
credit are needed.
