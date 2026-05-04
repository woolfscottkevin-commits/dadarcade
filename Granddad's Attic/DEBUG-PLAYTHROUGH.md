# Granddad's Attic - Debug Playthrough

Date: 2026-05-04

## Build

- Canonical folder: `/Users/kevinwoolf/coding-projects/Dad Arcade/Granddad's Attic`
- Local URL: `http://127.0.0.1:8031/index.html?v=phase4e`
- Mode: no-debug target

## Deterministic Checks

- Asset count: 27 WebP files across `assets/scenes/` and `assets/closeups/`.
- Empty assets: none found.
- Footlocker: `6 / 14 / 46` passes; adjacent wrong value fails.
- Diary: `HONOR` passes; `KRQRU` fails.
- Radio: `97.0` passes; `96.7` fails.
- Safe: `HONOR` passes; `BADGE` fails.
- GameState can progress through all five solved puzzle flags and set an ended state.

## Flow Notes

- Radio tuning no longer solves on immediate slider release; the Phase 4e build keeps the 1.5-second hold behavior.
- Jacket blocked-state text now points back to the music box note clue.
- Painting blocked-state text now tells the player there is a safe behind the frame and that the badge word is needed.

## Remaining Manual QA

- Confirm mobile Safari modal scroll, button size, and 16:9 scene framing.
- Recheck hotspots after original-resolution MidJourney downloads replace preview captures.
- Add final audio/voice polish before shipping.

## No-Debug Browser QA - 2026-05-04

Passed on a fresh local origin at `http://127.0.0.1:8040/granddads-attic/`:

- Launcher redirected to the Phase 5a game.
- Fresh first-run title showed `Begin`.
- Full playthrough completed without debug overlays:
  - Footlocker `6 / 14 / 46`
  - Diary `HONOR`
  - Radio `97.0` hold
  - Floorboard and music box
  - Sheet music `BADGE`
  - Jacket badge pickup
  - Safe `HONOR`
  - Final letter
  - End screen
- Radio did not fire immediately on setting `97.0`; it fired after the hold timer.
- Final letter `Continue` unlocked after the required delay.
- End screen displayed the final emotional copy and solve time.
- Browser console errors: none.
- Dad Arcade homepage and `/games/` both show Granddad's Attic.

Still not completed:

- Physical iPhone/Safari testing.
- Full-resolution MidJourney original asset swap.
