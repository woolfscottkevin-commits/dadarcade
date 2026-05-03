# Par 3 - Design Document

Project: Par 3, a premium-tier top-down golf game for Dad Arcade.
Path: `/par-3/`
Live URL: `https://dadarcade.com/par-3`
Pattern: Multi-file ES modules using Phaser 3 and Matter.js. Par 3 intentionally breaks the single-file pattern because faked 3D ball flight, wind, hazards, and course flow need separate systems.

## Concept

Par 3 is a top-down 2D golf game with drag-and-release shots, faked 3D ball flight, visual height/shadow, wind, surface-specific rollout, and satisfying cup physics. The first shipped prototype focuses on one excellent grass hole. The full course is nine par 3 holes across grass, desert, and snow biomes.

Reference feel: Wonder Putt juice, Desert Golfing minimalism, Golf Story faked ball flight. The game is mobile-first portrait at a 720 x 1280 logical resolution and scales up to desktop with letterboxing.

## Stack

- Phaser 3.80.1 from CDN: `https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`
- Matter.js via Phaser Physics Matter
- Vanilla ES modules
- No npm, no bundler, no build step
- localStorage keys prefixed with `par3_`
- Procedural visuals and procedural Web Audio for v1

## Folder Structure

```text
/par-3/
  index.html
  main.js
  DESIGN.md
  CLAUDE.md
  scenes/
    Boot.js
    Title.js
    Course.js
    Hole.js
    Scorecard.js
    Daily.js
    Leaderboard.js
  systems/
    Audio.js
    BallPhysics.js
    Camera.js
    Cup.js
    DragController.js
    HoleGenerator.js
    Leaderboard.js
    Persistence.js
    Wind.js
  data/
    biomes.js
    holes.js
    unlockables.js
  ui/
    AimLine.js
    HUD.js
    PowerMeter.js
  styles/
    par3.css
```

## Core Mechanics

- Ball ground position is `(x, y)`.
- Ball height is `z`, a visual-only value.
- `z > 0` means the ball is airborne and ignores ground hazards.
- `z = 0` means Matter rollout, surface friction, slope, and cup checks apply.
- Drag anywhere on screen to start a shot. Pull away from the intended target and release.
- Drag distance from 0-150 px maps to 0-100% power so full swings are reachable from the tee on portrait phones.
- Aim line predicts wind-adjusted flight path.
- Power meter ring fills green to yellow to red.
- Cup capture requires distance within difficulty cup radius, `z < 4`, and speed below 200 px/s.
- Fast cup passes lip out and deflect slightly.

## Difficulty

| Parameter | Kid | Normal | Hard |
| --- | --- | --- | --- |
| Cup radius | 24 px | 16 px | 12 px |
| Wind scale | 50% | 100% | 130% |
| Aim line | Full | 75% | 50% |
| Aim jitter | 0% | 5% target | 15% target |
| Bunker friction | 0.92 | 0.85 | 0.80 |
| Penalty drop | Last safe | Last safe | Tee |

## Course Plan

Grass:
- Hole 1: Tutorial Open
- Hole 2: Bunker Bend
- Hole 3: Water Carry

Desert:
- Hole 4: Cactus Alley
- Hole 5: Dune Descent
- Hole 6: All Sand

Snow:
- Hole 7: Pine Pass
- Hole 8: Ice Lake
- Hole 9: Mountain Final

## Phases

### Phase 1 - Physics Prototype + One Grass Hole

Deliver a fully playable one-hole prototype with Phaser/Matter scaffold, procedural grass visuals, drag shots, aim line, power meter, faked 3D flight, wind, camera behavior, cup detection, lip-outs, stroke counter, difficulty toggle, procedural audio, and a score screen.

### Phase 2 - Full Course + Biomes + Local Persistence

Add all 9 holes, hazards, biome physics, scorecard, local bests, hole-in-one history, retry flow, and mute polish.

### Phase 3 - Daily Challenge + Leaderboards + Unlockables

Add seeded daily challenge, one attempt per day, streaks, Supabase leaderboard tables, initials submit flow, star rewards, balls, and clubs.

### Phase 4 - Polish + Ship

Add tutorial overlay, SEO/OG polish, homepage tile, sitemap entry, animation polish, Lighthouse pass, and live deployment.

## Out of Scope v1

No multiplayer, tournaments, course editor, 18-hole courses, licensed real courses, replay/ghost mode, social sharing, or player-tuned physics.
