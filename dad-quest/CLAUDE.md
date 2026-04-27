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
├── index.html              shell + scene roots + module entry
├── main.js                 entry: preloader → register scenes → start at characterSelect
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
│   └── dad-quest.css       palette vars, reset, boot + scene styles
├── engine/
│   ├── gameState.js        run state + startRun/endRun
│   ├── sceneManager.js     register/setScene dispatcher
│   ├── deck.js             draw/discard/exhaust + Fisher-Yates shuffle
│   ├── statusEffects.js    apply/get/tick + canonical damage math (single floor)
│   ├── effectExecutor.js   parse/execute every effect-string verb
│   └── combat.js           turn loop matching DESIGN.md § 1.4 tick order
├── ai/
│   └── enemyAI.js          cycle vs weighted intent picker
├── ui/
│   ├── cardFrame.js        DOM card builder (cost, art, type stripe, desc)
│   ├── healthBar.js        HP bar with shake animation
│   ├── blockIndicator.js   shield + number, hides at 0
│   ├── statusIcons.js      chip row for vulnerable/weak/strength/yard_work/caffeine/citation
│   ├── relicTray.js        small icons + tooltip
│   └── intentDisplay.js    "Atk 6" / "Block 8" / "Atk 3 ×3" badge above each enemy
├── scenes/
│   ├── characterSelect.js  3 portraits, deck preview, Begin Run
│   ├── combat.js           DOM combat layout + canvas-free FX overlays
│   ├── victory.js          "Victory!" → endRun → characterSelect
│   └── gameOver.js         "Defeated" → endRun → characterSelect
├── procgen/                (Phase 3: map generator)
└── saves/                  (Phase 4: localStorage save/load)
```

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, asset pipeline, frozen game data | ✓ 2026-04-27 |
| 2 | Combat vertical slice: engine, scenes, UI, 3 characters vs Aggressive Roomba | ✓ 2026-04-27 |
| 3 | Scenes & economy: map gen, shop, rest, events, multi-combat runs | pending |
| 4 | Save/load, polish, home-page integration, SEO, About copy | pending |

## Phase 2 specifics

**Tick order (matches DESIGN.md § 1.4 exactly):**
1. Player turn start → drain queued next-turn effects → fire `on_turn_start` triggers → draw 5 → energy = 3
2. Player plays cards (each play resolves effect, checks victory)
3. End-turn button → fire `on_turn_end` triggers → Doug's Jitters tax (Caffeine > 5) → discard hand → tick player statuses (Block expires, Vulnerable/Weak −1)
4. Enemy turn → each enemy resolves intent in display order; check defeat after each hit
5. Enemy end-of-turn → tick enemy statuses (Vulnerable/Weak −1) → roll next intent
6. Goto 1

**Damage math (in `engine/statusEffects.js`):** `outgoing = (base + attacker.strength) × (Weak ? 0.75 : 1)`, then `incoming = outgoing × (Vulnerable ? 1.5 : 1)`, then **single** `Math.floor`, then Block absorbs first.

**Self-damage (`lose_hp:N`)** bypasses Strength/Weak/Vulnerable/Block — flat HP hit.

**Apotheosis** doubles every numeric payload in each card's effect string for the rest of the combat. Threshold values inside `*_gte:N` conditions are NOT doubled. Implemented via `combatState.cardEffectOverrides: Map<uuid, effectString>` consulted in `playCard` before parsing.

**Three starter relics are wired:** Lawn Flag (Hank, +1 bonus to gained Yard Work), Travel Mug (Doug, +2 Caffeine at combat start; does not fire `on_gain_caffeine` triggers), Pocket Square (Brenda, +5 max HP at run start). The other 17 relics are defined-but-inert in `data/relics.js` — Phase 3 will wire them.

**Only Aggressive Roomba is wired as a fight.** All 12 enemy definitions parse and select intents correctly, but only the Roomba is referenced by `combat.js` for the Phase 2 vertical slice.

## Keyboard shortcuts (combat scene)

- `1`–`9` — play the corresponding hand card if affordable
- `Space` — End Turn
- `Esc` — reserved for Phase 3 (settings/pause)

## URL flags

- `/dad-quest/?phase=1` — boot all the way through preload then render the Phase 1 "Ready" splash instead of going to character select. Useful for verifying the asset pipeline in isolation.

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
