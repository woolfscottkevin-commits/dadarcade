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
├── procgen/
│   └── mapGenerator.js     3-act branching graph generator (planar, 70/15/15)
└── saves/                  (Phase 4: localStorage save/load)
```

Phase 3 also added: `engine/rewards.js`, `scenes/{map,reward,rest,runVictory}.js`, `ui/{mapNode,edgeRenderer,runHud,targetingReticle}.js`.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, asset pipeline, frozen game data | ✓ 2026-04-27 |
| 2 | Combat vertical slice: engine, scenes, UI, 3 characters vs Aggressive Roomba | ✓ 2026-04-27 |
| 3 | Run loop: 3-act maps, rewards, rest, all 12 enemies + multi-enemy combat | ✓ 2026-04-27 |
| 4 | Shops, random events, remaining 17 relics' bindings, save/load, polish, home-page tile | pending |

## Resolved rulings (carry forward — DESIGN.md is silent or imprecise here)

These are settled mechanical decisions made during Phase 2/3. They override any conflicting reading of DESIGN.md and stay valid through Phase 4.

1. **Combat scene is DOM, not `<canvas>`.** A canvas overlay can be added for FX (damage numbers, lunge animations); the layout is DOM. DESIGN.md § 5's "canvas" reference is outdated.
2. **Caffeinated triggers per stack of Caffeine gained, not per gain event.** Coffee Break (gain 3 Caffeine) → 3 Strength.
3. **Relic-granted resources at combat-start do NOT fire `on_gain_*` triggers; card-played gains DO.** Travel Mug grants 2 Caffeine without triggering Caffeinated. Phase 4's relic bindings must respect this.
4. **Powers exhaust on play; their triggers stay registered for the rest of combat.** Powers and the rest of the exhaust pile return to the run deck after combat ends. Mid-combat reshuffles do NOT pull from exhaust.

## Phase 3 specifics

**Run state schema (in `gameState.run`):**
- `character`, `hp`, `maxHp`, `gold`, `deck`, `relics` — persist between combats.
- `act` (1–3), `position` (current node ID or null), `completedNodes` (array), `map` (current act's generated map), `combatsWon`.
- `pendingEnemy` / `pendingIsBoss` / `pendingNodeType` are transient fields stashed by the map scene before transitioning into combat; the reward scene reads then deletes them.

**Reset rules:**
- HP, gold, deck, relics, max HP — RUN-scoped (carry).
- Strength, Yard Work, Caffeine, Citations, Block, Vulnerable, Weak — COMBAT-scoped (reset every combat by `engine/combat.startCombat`).

**Map node distribution (Phase 3 deviation from DESIGN.md):**
- Row 1: 100% combat (per DESIGN.md).
- Rows 2–5: 70% combat, 15% elite, 15% rest.
- Row 6: boss (always Ultimate HOA President in v1).
- PHASE 4 TODO: restore 60% combat / 10% elite / 10% rest / 10% shop / 10% event when shops + events ship.

**Boss HP scaling:** Act 1 = 110, Act 2 = 175, Act 3 = 250. Implemented in `engine/combat.makeEnemyInstance` based on `gameState.run.act`. **Do NOT mutate `data/enemies.js`** — it keeps `hp: 250` as the canonical Act-3 value.

**Multi-enemy combat (Phase 3):**
- Combat now supports 1–2 enemies. Only Pyramid Schemer's once-per-combat Recruit creates a 2-enemy fight.
- Single-target attacks need a target (`needsTarget(cardInst)`). Tap an enemy to set `combatState.targetIndex`.
- Auto-target fallback: if the current target dies, the next single-target play auto-selects the leftmost alive enemy.
- AOE attacks (`deal_damage_all:N`, `apply_all:status:N`) hit every alive enemy.
- Summoned enemies skip their first turn (give the player time to plan).

**New intent types (data/enemies.js → engine/combat.js):**
- `attack_with_status`, `apply_status`, `attack_and_disrupt` (`disrupt: "discard_random_card"`), `attack_with_modifier` (`modifier: "draw_minus"`), `block_and_status`, `summon`, `aoe_attack`, `self_buff`, `heal_and_buff`, `apply_status_aoe_to_player`, `attack_telegraphed`.
- The boss's Final Summons uses `telegraphedFromPrevious: true` so the renderer peeks ahead and shows a "⚠ NEXT TURN" badge during the prior intent.

**Player next-turn modifiers:**
- `combatState.player.nextTurnModifiers` is an array of `{ type, amount, duration }`. Pop Quiz pushes `{ type: "draw_minus", amount: 2, duration: 2 }` (duration 2 because the start-of-turn tick will decrement it once).
- Effective draw count is `max(1, 5 - sum(draw_minus.amount))` — never below 1.

**Reward generation (`engine/rewards.js`):**
- Pool: same-character + shared, minus basics (Strike/Defend variants + Burnout) and minus any card the player already owns 4+ copies of.
- Rarity weights — base: 60/33/7. Elite: 55/33/12. Boss: 50/33/17.
- Gold per tier: normal 10–25, elite 25–35, boss 50–65.

**Victory/defeat tie resolution:** if a single card play simultaneously kills the last enemy and drops the player to 0 HP (e.g., Weekend Warrior self-damage), **victory wins.** Combat checks `allEnemiesDead()` before checking player HP ≤ 0.

## Keyboard shortcuts (combat scene)

- `1`–`9` — play the corresponding hand card if affordable
- `Space` — End Turn
- `Esc` — reserved for Phase 4 (settings/pause)

## URL flags

- `/dad-quest/?phase=1` — boot through preload then render the Phase 1 "Ready" splash. Useful for verifying the asset pipeline in isolation.

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

**Three starter relics are wired:** Lawn Flag (Hank, +1 bonus to gained Yard Work), Travel Mug (Doug, +2 Caffeine at combat start; does not fire `on_gain_caffeine` triggers), Pocket Square (Brenda, +5 max HP at run start). The other 17 relics are defined-but-inert in `data/relics.js` until Phase 4.

**All 12 enemies are wired as fights in Phase 3.** The map generator assigns normal / elite / boss encounters, and Pyramid Schemer can summon Aggressive Roomba mid-combat.

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
