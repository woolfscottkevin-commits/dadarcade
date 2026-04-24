# Dad Arcade — Claude working notes

## Always ship

**Default behavior for this repo: when you finish a change, commit it and push it.** Do not wait for an explicit "push" command. The Vercel Git integration handles deploy automatically on push to `main`.

Safe exceptions (pause and confirm before pushing):
- Pre-commit hooks fail and the fix is not obvious
- The change touches `api/` secrets or env vars
- The change spans more than one logical feature — ask whether to split into multiple commits first
- You've made an assumption you're not confident about — flag it, then push once acknowledged

Commit message style (match recent history):
- Short imperative subject, prefixed with area when helpful (`Chess: …`, `Homepage: …`, or game name for a new game)
- 1–3 line body explaining the "why"
- End with:
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```

## Architecture (don't relitigate)

- **Static HTML/JS site**, not Next.js. Every game is a single `<slug>/index.html` at the repo root.
- Vercel serverless functions live in `/api/` (CommonJS via ESM compile at build).
- Leaderboards: Upstash Redis via [api/scores.js](api/scores.js). Add new games to `VALID_GAMES`.
- Analytics: GA4 (`G-90KFJNYR94`) already on every page via `gtag`. Fire events directly; do not install PostHog or anything else.
- Homepage structure: three sections — **New This Week**, **Featured**, **All Games**. New games go in New This Week and All Games. Featured is user-curated.
- Games listing: [games/index.html](games/index.html) has JSON-LD entries + visible cards. Keep them in sync.
- Sitemap: [sitemap.xml](sitemap.xml) — add a `<url>` block for every new game page.
- Bug-report dropdown in [index.html](index.html) — add new games there too.

## Things that have bitten me before

- **Don't write `\u2014`-style JS escapes into HTML text.** HTML doesn't interpret them. Use actual UTF-8 characters (`—`, `•`, `…`) or HTML entities (`&mdash;`, `&bull;`).
- Touch controls using `@media(hover:none) and (pointer:coarse)` don't fire on desktop-emulated mobile viewports. Add a `(max-width: X)` fallback.
- The `preview_eval` tool sometimes navigates back to a previous URL on its own; if state disappears, navigate explicitly with `window.location.assign(...)` rather than `reload()`.
