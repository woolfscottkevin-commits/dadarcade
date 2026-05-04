# Granddad's Attic

A short Myst-style puzzle adventure for Dad Arcade. Built as plain static files: vanilla JavaScript modules, CSS, and WebP assets. No build step, no npm install, no backend.

## Run Locally

From this folder:

```sh
python3 -m http.server 8031 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8031/index.html?v=phase5a
```

## Current Status

- Full puzzle chain is playable.
- Phase 2 MidJourney preview assets are installed.
- Phase 5a adds mobile CSS hardening, richer procedural audio, browser speech for the radio message when available, a stronger ending screen, and packaging docs.

## QA Checklist

- Play once from `Start Over` with no `debug=1` query.
- Confirm footlocker, diary, radio, music box, badge, safe, final letter, and ending all work.
- Test on desktop Safari/Chrome.
- Test on a real iPhone Safari viewport for modal scrolling and button comfort.
- After original-resolution assets are imported, recheck all hotspots with `?debug=1`.

## Deployment

This can ship as static files from this folder. Any static host works, including Vercel, Netlify, GitHub Pages, or a Dad Arcade local launcher.

For Dad Arcade integration, point the arcade card/link at:

```text
Granddad's Attic/index.html
```

## Art Replacement

Current art files are preview/capture WebPs. See `ASSET-QUALITY.md` and `scripts/import-original-assets.mjs` for the full-resolution replacement path.
