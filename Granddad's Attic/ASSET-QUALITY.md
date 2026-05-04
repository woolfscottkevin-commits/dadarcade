# Asset Quality Pass

Current build art is functional but not final: the 27 game images are browser-captured MidJourney preview/crop assets. They are good enough for layout, puzzle flow, and hotspot tuning, but should be replaced before final shipping.

## Source Of Truth

Use `PHASE-2-PICKS.md` for selected MidJourney jobs and indices.

## Replacement Contract

Every replacement should keep the same target filename:

- `assets/scenes/*.webp`
- `assets/closeups/*.webp`

The game code references these paths directly, so replacement can be a file swap as long as filenames stay stable.

## Import Folder

Put original-resolution WebP files here:

```text
original-assets/
```

Use the asset slug as the filename, for example:

```text
original-assets/center.webp
original-assets/radio-tuning.webp
original-assets/final-letter.webp
```

Then run:

```sh
node scripts/import-original-assets.mjs
```

The script copies known files into the live `assets/` tree and reports missing files.

## After Import

1. Open `http://127.0.0.1:8031/index.html?debug=1&v=phase5a`.
2. Visit every scene and close-up route in the puzzle chain.
3. Confirm hotspots still sit on the visible objects.
4. Retune `scenes/sceneData.js` only if the original images have different framing.

## Current Limitation

No original MidJourney downloads were available locally during the Phase 5a pass. The import path is ready, but the actual quality swap still depends on downloading those originals from MidJourney.
