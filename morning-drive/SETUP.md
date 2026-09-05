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
