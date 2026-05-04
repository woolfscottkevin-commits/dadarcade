# Granddad's Attic - Phase Status

Canonical folder: `/Users/kevinwoolf/coding-projects/Dad Arcade/Granddad's Attic`

## Completed

- Phase 0 style lock passed.
- Locked Midjourney style reference: `--sref https://s.mj.run/3rugejTXYQY`
- Phase 1 scaffold created.
- Phase 2 selected art imported: 27 WebP preview assets in `assets/scenes/` and `assets/closeups/`.
- Phase 3 playable engine pass completed on 2026-05-04.
- Phase 4 initial hotspot tuning pass completed on 2026-05-04.
- Phase 4b puzzle UI polish pass completed on 2026-05-04.
- Phase 4c CSS mobile tuning pass completed on 2026-05-04.
- Phase 4d radio hold-timer pass completed on 2026-05-04.
- Phase 4e first-time-player clarity text pass completed on 2026-05-04.
- Phase 5a finishing pass completed on 2026-05-04.

## Current Build Contract

- Vanilla JS ES modules.
- No npm, no bundler, no framework.
- Run with a simple static server, e.g. `python3 -m http.server 8031 --bind 127.0.0.1`.
- Main local URL: `http://127.0.0.1:8031/index.html`

## Phase 3 Shipped

- Title screen with resume/new/start-over flow.
- Real scene art rendering with hotspot overlays and `?debug=1` support.
- Inventory bar with clickable diary, music box, and badge.
- Full puzzle chain:
  - Footlocker combination: `6 / 14 / 46`
  - Diary cipher: `HONOR`
  - Radio tuning: `97.0`
  - Music box clue: `Bb - A - D - G - E`
  - Badge Polybius clue
  - Safe word: `HONOR`
  - Final letter and end screen with solve time
- Save/resume through localStorage.
- Procedural placeholder audio for lock/chime/page/melody events.
- Browser-verified full playthrough with no console errors.
- Hotspots tuned against imported preview art for center, desk/radio, footlocker, coatrack/jacket, painting, safe, letter, and floorboard reveal.
- Puzzle overlays polished with clue cards, brass dial styling, radio signal meter, music-note strip, and improved badge grid treatment.
- Mobile CSS tuned for portrait phones: 16:9 scene preservation, full-width title/modal actions, single-column modals, compact dial grids, and phone-safe letter/music/badge layouts.

## Known Shortcuts

- Art is still browser-captured MidJourney preview resolution, not final original downloads.
- Radio tuning now requires holding the dial near `97.0` for 1.5 seconds.
- Letter and puzzle clue text are rendered as HTML overlays for readability.
- Mobile CSS has a portrait layout pass, but needs hands-on phone tuning after the next visual polish pass.
- Phase 5a adds safer mobile modal spacing, richer procedural audio, browser speech for the radio message when available, a stronger ending screen, and packaging/import docs.

## Next Phase

Phase 4 should tune hotspot coordinates against the selected images, improve modal art framing, polish mobile layout, and replace preview captures with original MidJourney downloads where available.

## Phase 4 Status

Initial hotspot tuning is done. The large misses from Phase 3 were corrected:

- Desk radio hotspot now sits on the right-side radio.
- Coatrack jacket hotspot now sits on the uniform instead of the wall photos.
- Painting, revealed safe, safe-letter, and floorboard hotspots were tightened to the actual object regions.
- Center-scene desk, footlocker, coatrack, painting, and window zones were adjusted to match the selected art.

Browser verification:

- `http://127.0.0.1:8031/index.html?debug=1&v=phase4a` loads with five center hotspots.
- Navigation smoke test passed for desk/radio, coatrack/jacket, and painting hotspots.
- No browser console errors during hotspot smoke test.

Next Phase 4 work: modal/UI polish and mobile tuning.

## Phase 4b Status

Puzzle UI polish is done for the main puzzle surfaces:

- Footlocker number dials now read as brass lock plates instead of raw form fields.
- Diary and safe letter dials share the same polished mechanism treatment.
- Radio tuning modal has a framed radio panel, large frequency readout, and signal meter.
- Music box modal shows the `Bb A D G E` sequence as a five-note strip.
- Sheet music and badge clues have stronger artifact/card styling.

Browser verification:

- Footlocker modal renders one clue card and three polished dials.
- Diary modal renders one clue card and five letter dials.
- Radio modal renders the radio panel, signal meter, and hold meter.
- Music box modal renders the five-note strip; sheet music and badge grid still open.
- No browser console errors during the Phase 4b smoke test.

Next Phase 4 work: hands-on phone tuning, audio polish, and final art-resolution replacement.

## Phase 4c Status

Mobile CSS tuning is done:

- Replaced the old mobile `9 / 16` scene frame with preserved `16 / 9` art framing, avoiding heavy crop of the landscape-only assets.
- Reduced app padding and title scale for narrow screens.
- Made title and modal action buttons full-width on mobile.
- Changed modals to single-column mobile layouts with a 16:9 art header.
- Tuned number and letter dial grids for 420px-and-under screens.
- Tightened music strip, Polybius table, and final-letter sizing for phone widths.

Verification:

- Desktop route `http://127.0.0.1:8031/index.html?v=phase4c` loads with no console errors.
- Footlocker modal still renders three dials and remains interactive after the CSS changes.
- Automated true-phone viewport screenshots were not available in this local environment; hands-on iPhone/Safari testing is still recommended.

Next Phase 4 work: hands-on phone tuning, audio polish, and final art-resolution replacement.

## Phase 4d Status

Radio tuning behavior is now closer to the intended interaction:

- Tuning near `97.0` starts a 1.5-second hold timer.
- Moving away from the station cancels the timer and clears the hold bar.
- A small hold meter now appears below the signal meter so the player can see the steady-tuning requirement.

Verification target:

- `http://127.0.0.1:8031/index.html?v=phase4d`

## Phase 4e Status

First-time-player clarity text was tightened for two blocked states:

- Jacket search now points back to the music box note clue before revealing the badge.
- Painting interaction now makes it clear that the safe is behind the frame, but needs the badge-derived word first.

Verification target:

- `http://127.0.0.1:8031/index.html?v=phase4e`

## Debug Pass - 2026-05-04

Static and deterministic checks completed:

- Confirmed all 27 imported WebP assets exist and none are zero-byte files.
- Confirmed footlocker accepts `6 / 14 / 46` and rejects an adjacent wrong value.
- Confirmed diary accepts `HONOR` and rejects the visible cipher text.
- Confirmed radio tuning helper accepts `97.0` and rejects `96.7`.
- Confirmed safe accepts `HONOR` and rejects `BADGE`.
- Confirmed full state progression can reach all five solved puzzle flags and an ended game state.
- Confirmed local route target remains `http://127.0.0.1:8031/index.html?v=phase4e`.

Residual debug work:

- Hands-on no-debug browser playthrough should be repeated when browser automation is available or on the user's machine directly.
- Real phone/Safari viewport testing is still needed.
- Preview MidJourney captures should be replaced with original downloads before final hotspot sign-off.

## Phase 5a Status

Finishing pass completed:

- Mobile CSS hardened with safe-area padding, range touch sizing, modal overscroll containment, and ending-screen mobile treatment.
- Procedural audio improved for ambience, lock clicks, wrong attempts, paper rustle, radio static, chimes, and music box notes.
- Radio message now attempts browser speech synthesis after a static burst when available, while preserving the readable subtitle.
- End screen now uses the selected `assets/scenes/end.webp` image and gives the final moment more emotional space.
- Added `README.md`, `ASSET-QUALITY.md`, `scripts/import-original-assets.mjs`, and `dad-arcade-launcher/index.html`.
- Original-resolution MidJourney files were not present locally, so no asset replacement was performed yet. The import path is ready for `original-assets/*.webp`.

Verification target:

- `http://127.0.0.1:8031/index.html?v=phase5a`

## Deploy Readiness - 2026-05-04

- Added Granddad's Attic to Dad Arcade homepage and `/games/`.
- Added clean launcher route `/granddads-attic/`, which opens the canonical project folder build.
- Added sitemap entry for `https://dadarcade.com/granddads-attic`.
- Completed no-debug browser QA on a fresh local origin with no console errors.
- Remaining non-blocking release caveats: physical iPhone/Safari testing and original-resolution MidJourney asset replacement.
