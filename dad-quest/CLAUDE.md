# Dad Quest — Claude working notes

## Project overview

Dad Quest is a Slay-the-Spire-lite deckbuilder roguelike with modern-suburban absurdist humor. One run = pick 1 of 3 starter characters, navigate a 3-act branching map, fight turn-based combats with a 3-energy / 5-card hand, pick a card / earn gold / occasionally a relic after each fight, beat the Act-3 boss to win. No persistent meta-progression in v1. Full design lives in `DESIGN.md` (in this directory).

## Stack constraints

- Vanilla **ES modules**. Plain HTML/CSS/JS served as static files.
- **No React, no Next.js, no build step, no bundler, no framework.**
- Mobile-first. Must work on iPhone Safari with touch-friendly tap targets.
- Hosted as a sub-path of Dad Arcade on Vercel (static). Routing is automatic — do not touch `vercel.json` at the parent repo.
- Other Dad Arcade games are single-file HTML5 Canvas. Dad Quest intentionally breaks that pattern (multi-file modules) due to scope.

## File structure

```
dad-quest/
├── index.html              shell + boot/app divs + module entry
├── main.js                 entry: boot preloader, render Ready splash
├── DESIGN.md               authoritative design + asset spec
├── CLAUDE.md               this file (operational context)
├── data/
│   ├── cards.js            79 card defs (78 player + Burnout curse)
│   ├── enemies.js          12 enemy defs (8 normal + 3 elite + 1 boss)
│   ├── relics.js           20 relic defs
│   └── characters.js       3 character defs
├── assets/
│   ├── assetManifest.js    canonical 113-asset path list
│   ├── assetLoader.js      async preloader + image cache
│   ├── characters/         3 portraits (3:4)
│   ├── cards/              78 card art (1:1)
│   ├── enemies/            12 enemy art (1:1)
│   └── relics/             20 relic icons (1:1)
├── styles/
│   └── dad-quest.css       palette vars, reset, boot + splash styles
├── engine/                 (Phase 2: combat, deck, status, gameState)
├── ai/                     (Phase 2: enemy AI executor)
├── procgen/                (Phase 3: map generator)
├── saves/                  (Phase 4: localStorage save/load)
├── scenes/                 (Phase 2/3: characterSelect, map, combat, etc.)
└── ui/                     (Phase 2: card frame, health bar, status icons)
```

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, asset pipeline, frozen game data | ✓ 2026-04-27 |
| 2 | Combat: scene manager, deck, status effects, enemy turns, effect-string executor | pending |
| 3 | Scenes & economy: map gen, character select, shop, rest, events | pending |
| 4 | Save/load, polish, home-page integration, SEO, About copy | pending |

## Source of truth

`DESIGN.md` is authoritative for game design, art style, and asset spec. This `CLAUDE.md` is operational context for the codebase. If they conflict, `DESIGN.md` wins — surface the conflict in your response.

## Effect-string grammar (Phase 2 will execute these)

Card and relic `effect` fields use placeholder strings, not handlers. The grammar is documented at the top of `data/cards.js` and `data/relics.js`. Phase 2 builds the parser/executor.

Known shapes:
- `deal_damage:N`, `deal_damage_all:N`, `deal_damage_random:N:hits`
- `gain_block:N`, `gain:resource:N`, `lose:resource:N`, `heal:N`, `lose_hp:N`, `draw:N`
- `apply:status:N`, `apply_all:status:N`, `apply_random:status:N`
- `compound:effect_a,effect_b,...` (chained)
- `conditional:cond:effect|else:effect` (branching)
- `scaling:expr` (X-cost-style scaling: `yard_work*3`, `cards_played_this_turn*3`, `total_citations*2`, `4+target_citations*2`)
- `trigger:hook:effect` (powers/relics: `on_turn_start`, `on_turn_end`, `on_play_skill`, `on_gain_caffeine`, `on_third_card`, `on_fourth_card`, `on_first_attack`, `on_apply_debuff`, `on_elite_kill`, `passive`)
- One-offs: `upgrade_hand_for_combat`, `heal_damage_taken_this_turn`, `next_turn:effect`, `first_damage_prevent`, `unplayable`

## Don't do

- Don't add React, Vue, Next.js, Vite, webpack, esbuild, or any build step.
- Don't generate, modify, rename, or delete any image file in `assets/{characters,cards,enemies,relics}/`. They are read-only Phase 1 inputs.
- Don't create files outside the documented structure.
- Don't bleed Phase 2/3/4 work into the current scope. If a feature seems to require something deferred, **stop** and ask.
- Don't modify the parent dad-arcade repo's `vercel.json`, `package.json`, root `index.html`, sitemap, robots.txt, or other game directories. Dad Quest is a self-contained subdirectory; static routing is automatic.
- Don't add a Dad Quest tile or link to dadarcade.com home until Phase 4.
- Don't commit `.DS_Store` if you spot one — add to `.gitignore` if not already covered by the parent repo.
