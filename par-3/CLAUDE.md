# Par 3 Working Notes

Status: Phase 1 playable prototype.

## Stack

- Static HTML + vanilla ES modules.
- Phaser 3.80.1 loaded in `index.html`.
- Matter physics enabled through Phaser config.
- No package manager or build step.

## Current Play Flow

`Boot -> Title -> Course -> Hole -> Scorecard`

Only Hole 1 (`grass-1`, "Tutorial Open") exists right now. Course flow intentionally routes through `Course.js` so Phase 2 can expand to nine holes without changing title/start behavior.

## Debug Tips

- Open `/par-3/` from a static server. Direct `file://` may break ES modules because of browser CORS rules.
- Keyboard: `R` retries, `Space` scopes to the pin, `M` toggles mute.
- Touch/mouse: drag anywhere, pull away from target, release.
- localStorage keys use the `par3_` prefix. Current Phase 1 keys: `par3_difficulty`, `par3_muted`.

## Phase 1 Notes

- Ball flight is faked with visual `z`; Matter owns ground position and rollout.
- Wind only applies during flight.
- The aim line predicts the same launch curve used by `BallPhysics`.
- `HoleGenerator.surfaceAt()` is the seam for future hazards, desert/snow surfaces, and water/OB penalties.
- `systems/Leaderboard.js`, `scenes/Daily.js`, and `scenes/Leaderboard.js` are placeholders for Phase 3.
