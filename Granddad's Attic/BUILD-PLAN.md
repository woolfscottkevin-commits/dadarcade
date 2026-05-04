# Granddad's Attic - Build Plan

## Phase 0 - Style Lock

Status: complete.

Deliverables:

- `STYLE.md`
- `style-reference/`
- locked `--sref`

## Phase 1 - Scaffold and Source Docs

Status: in progress.

Deliverables:

- Vanilla JS folder structure.
- Placeholder title screen and scene shell.
- `STORY.md`
- `PUZZLES.md`
- `ASSET-LIST.md`
- canonical text JSON files.

Done when:

- `index.html` opens without a build step.
- Placeholder scene navigation works.
- Future implementation files exist in the correct ownership boundaries.

## Phase 2 - Final Art Production

Goal:

Generate and save final Midjourney assets listed in `ASSET-LIST.md`.

Process:

1. Generate each asset using locked style.
2. Save best candidate to the listed path.
3. Record job IDs beside accepted assets.
4. Reject and regenerate anything with inconsistent architecture, open exterior views, people, modern objects, or unreadable critical clues.

Done when:

- All required image files exist.
- Every clue-bearing image has a readable art version or an HTML overlay plan.
- Mobile crop risks are noted.

## Phase 3 - Placeholder Engine Build

Goal:

Build the complete playable 10-15 minute game loop using placeholders or final art as available.

Systems:

- Scene manager
- Hotspot renderer
- Inventory
- Persistence
- Audio
- Dialog reader
- Hint system
- Puzzle modules

Done when:

- Player can complete all five puzzles end to end.
- Save state survives reload.
- Hint progression works.
- Mobile portrait is playable.

## Phase 4 - Art Integration

Goal:

Replace placeholders with final image assets and align hotspots.

Done when:

- All scenes use final art.
- Hotspot positions are tuned against desktop and mobile.
- Debug mode `?debug=1` confirms every click target.

## Phase 5 - Polish and Ship

Goal:

Finish audio, transitions, accessibility, QA, and Dad Arcade integration.

Done when:

- Title screen and end screen are final.
- Ambient audio and puzzle SFX are in place.
- No console errors.
- Game is linked from Dad Arcade as intended.
- Vercel preview passes manual QA.

## Verification Checklist

- Open with a local static server.
- Test desktop 1440x900.
- Test mobile portrait.
- Test reload after every major puzzle.
- Test wrong inputs.
- Test final solve from a clean save.
- Test `window.atticDebug.reset()`.
