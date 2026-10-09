# Layer by Layer 2: the web app (front-end contract)

The book is `layer-by-layer-2/index.html` plus ES modules in `layer-by-layer-2/app/`. No build step,
no frameworks. Served at `/layer-by-layer-2` (no trailing slash) with `<base href="/layer-by-layer-2/">`,
so every path in HTML, CSS `url()` and `fetch()` is relative to `/layer-by-layer-2/`
(CSS `url()` is relative to the CSS file: from `app/css/x.css` use `../../data/...`).

Local test server: `http://localhost:8777/layer-by-layer-2/index.html#/<route>` (serves the repo root).
After editing CSS or JS, reload the page (`location.reload()`); changing only the hash does not reload files.

## Routes (hash router in app/main.js)

`#/` home · `#/builds` · `#/build/<slug>?t=<tier>&step=<n>` · `#/mode/<slug>?t=<tier>` (Build Mode) ·
`#/secrets` and `#/secrets/<id>` · `#/redstone` and `#/redstone/<id>` · `#/showcase` and `#/showcase/<id>` ·
`#/top10` and `#/top10/<id>` · `#/log` · `#/grownups` · `#/howto`

## A page module

`app/pages/<page>.js` exports `async function render(main, params, ctx)`:

- `main` is the `<main>` element (empty when render starts). Put everything inside it.
- `params` are the route captures (e.g. `[id]`).
- `ctx = { book, setReadable(bool), query, path, go(hash) }`. `book` is `data/content/book.json`.
  Call `ctx.setReadable(true)` on pages with real reading text; mark the readable container with
  `data-readable` (headings, paragraphs, list items and `.tip` inside it get read aloud; add class
  `no-read` to skip something). Single elements can be marked `data-read`.
- Return an optional cleanup function (remove window listeners, timers).
- The router wraps page changes in a view transition and scrolls to the top for you.

## Shared modules (import, don't copy)

- `lib/ui.js`: `esc()` (ALWAYS escape data in HTML), `$`, `$$`, `icon(name)` (see ICONS in the file),
  `tip(kind, title, text)` (the only 4 tip kinds: pro, warn, know, start), `pips(n)`, `plural()`, `stacks(n)`,
  `outLink(label, url)` (outside links: shows "Ask a grown-up" first; also any `<a data-out>`),
  `sourcesLine(urls)`, `toast(msg)`, `track(event, params)` (GA4: event names start `lbl2_`, never send
  free text), `calm()` (true in Calm mode or reduced motion: skip decorative animation), `SECTIONS`.
- `lib/data.js`: `content(name)` -> `data/content/<name>.json`, `catalog()`, `buildData(slug)`,
  `figureData(id)`, `registryMeta()`, `iconSpan(index)` (an item icon; size with `--isz`), `iconFor(itemName)`.
- `lib/figure.js`: `mountFigure(el, id, opts)` shows a 3D figure (lesson steps, redstone states, scenes)
  in `el` and returns `{frames, set(k), view(name), spin(on), time(t)}`. Frames are 1-based.
  Options: `{time: 0.4, style: 'drop'|'snap', view: 'hero'|'front'|'side'|'top', build: true}`
  (`build: true` loads a build instead of a figure; useful for testing before figures exist).
  There is ONE WebGL canvas; only one figure can be live on a page. Show posters elsewhere:
  `img/figures/<id>.webp` (last frame) and `img/posters/<slug>.webp` (builds).
- `lib/store.js`: `store.get/set` (localStorage, safe), `log.done()`, `log.tried(kind)`, `log.markTried(kind, id)`,
  `exportProgress()`, `importProgress(code)`.
- `lib/sound.js`: `pop()`, `tick()`, `clack()`, `fanfare()` (quiet UI sounds; respect settings automatically).

## Styling

- Tokens and components are in `app/css/base.css`: colours (`--c` is the current section colour;
  `--c-secrets`, `--c-redstone`, `--c-showcase`, `--c-top10`, `--c-log`...), `.wrap`, `.section`, `.band`
  (coloured page header with the stepped block edge), `.card`, `.grid` (`--min` sets column width),
  `.btn` (`.big`, `.small`, `.ghost`, `.gold`, `.dark`), `.chip`, `.tip`, `ol.steps`, `.kicker`, `.pips`.
  Use them. Display font is `var(--display)` (Lilita One), body `var(--body)` (Nunito).
- Each section page owns ONE stylesheet: `app/css/<page>.css` (already linked in index.html). Prefix your
  classes with your page name (`.sc-...` showcase, `.t10-...` top 10, `.ms-...` secrets, `.rs-...` redstone,
  `.lg-...` log) so pages never clash. Don't edit base.css, build.css, pages.css or other pages' files.
- Design for an iPad first (1024x768 landscape and 768x1024 portrait), then a phone (390x844).
  Touch targets at least 44px (primary actions 56px+). Text at least 17px. No horizontal scroll.
- Motion: only meaningful motion. Decorative motion (scroll reveals, parallax) only in Showcase and Top 10,
  and only inside `@media (prefers-reduced-motion: no-preference)` AND `html:not([data-calm])`.
  Scroll-driven animations (`animation-timeline: view()`) must sit inside `@supports (animation-timeline: view())`.
  Never move text a kid is reading. Never autoplay anything longer than 5 seconds without a pause button.
- Accessibility: semantic headings in order, buttons are `<button>`, images have alt (decorative: alt=""),
  the 3D canvas container gets an aria-label describing what it shows, colour is never the only signal.

## House rules

No em dashes in any visible text. Kid voice: short sentences, plain words. Never draw or describe mobs,
characters, logos or real people's faces. Every outside link goes through the grown-up gate.
