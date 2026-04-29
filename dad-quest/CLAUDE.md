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
│   ├── characters.js       3 character defs
│   └── events.js           5 random events
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
│   ├── combat.js           turn loop matching DESIGN.md § 1.4 tick order
│   └── rewards.js          card/gold rewards, relic rewards, shop inventory
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
│   ├── characterSelect.js  3 portraits, deck preview, Continue Run, How to Play
│   ├── combat.js           DOM combat layout + canvas-free FX overlays
│   ├── map.js              branching act map, combat/rest/shop/event routing
│   ├── reward.js           post-combat card/gold/relic rewards
│   ├── rest.js             30% max-HP heal site
│   ├── shop.js             card buys, relic buys, one card removal
│   ├── event.js            random events
│   ├── runVictory.js       Act-3 boss win summary
│   ├── victory.js          "Victory!" → endRun → characterSelect
│   └── gameOver.js         "Defeated" → endRun → characterSelect
├── procgen/
│   └── mapGenerator.js     3-act branching graph generator (planar, 60/10/10/10/10)
└── saves/                  (Phase 4: localStorage save/load)
    └── saveState.js        single active run persistence
```

Phase 3 also added: `engine/rewards.js`, `scenes/{map,reward,rest,runVictory}.js`, `ui/{mapNode,edgeRenderer,runHud,targetingReticle}.js`.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, asset pipeline, frozen game data | ✓ 2026-04-27 |
| 2 | Combat vertical slice: engine, scenes, UI, 3 characters vs Aggressive Roomba | ✓ 2026-04-27 |
| 3 | Run loop: 3-act maps, rewards, rest, all 12 enemies + multi-enemy combat | ✓ 2026-04-27 |
| 4 | Shops, random events, remaining 17 relics' bindings, save/load, polish, home-page tile | ✓ 2026-04-28 |

## Resolved rulings (carry forward — DESIGN.md is silent or imprecise here)

These are settled mechanical decisions made during Phase 2/3. They override any conflicting reading of DESIGN.md and stay valid through Phase 4.

1. **Combat scene is DOM, not `<canvas>`.** A canvas overlay can be added for FX (damage numbers, lunge animations); the layout is DOM. DESIGN.md § 5's "canvas" reference is outdated.
2. **Caffeinated triggers per stack of Caffeine gained, not per gain event.** Coffee Break (gain 3 Caffeine) → 3 Strength.
3. **Relic-granted resources at combat-start do NOT fire `on_gain_*` triggers; card-played gains DO.** Travel Mug grants 2 Caffeine without triggering Caffeinated. Phase 4's relic bindings must respect this.
4. **Powers exhaust on play; their triggers stay registered for the rest of combat.** Powers and the rest of the exhaust pile return to the run deck after combat ends. Mid-combat reshuffles do NOT pull from exhaust.
5. **Player Block clears at the START of the next player turn, not at the end of the current one.** This is a deliberate correction of the Phase 2 doc which said "Block expires" at end of player turn — taken literally, that meant Defend's block was wiped before any enemy got to swing, making it useless. Fixed in `engine/statusEffects.js` (no longer zeroes Block in `tickStatuses("playerTurnEnd")`) and `engine/combat.js` (zeroes `c.player.statuses.block` at the top of `startPlayerTurn`). Insulated Lunchbox's "if 0 Block at end of turn" check is now meaningful — it only fires if the player genuinely played no defensive cards.

## Phase 3 specifics

**Run state schema (in `gameState.run`):**
- `character`, `hp`, `maxHp`, `gold`, `deck`, `relics` — persist between combats.
- `act` (1–3), `position` (current node ID or null), `completedNodes` (array), `map` (current act's generated map), `combatsWon`.
- `pendingEnemy` / `pendingIsBoss` / `pendingNodeType` are transient fields stashed by the map scene before transitioning into combat; the reward scene reads then deletes them.
- `advanceAct()` heals to full before Act 2/3. HP still persists inside each act.

**Reset rules:**
- HP, gold, deck, relics, max HP — RUN-scoped (carry).
- Strength, Yard Work, Caffeine, Citations, Block, Vulnerable, Weak — COMBAT-scoped (reset every combat by `engine/combat.startCombat`).

**Map node distribution (Phase 4):**
- Row 1: 100% combat (per DESIGN.md).
- Rows 2–5: 60% combat, 10% elite, 10% rest, 10% shop, 10% event.
- Row 6: boss (always Ultimate HOA President in v1).
- Shops and events are generated only after row 1.

**Boss scaling:** HP is Act 1 = 70, Act 2 = 110, Act 3 = 160, with boss intent payloads scaled by act in `engine/combat.scaleBossPatternForAct`. **Do NOT mutate the boss's canonical `hp: 250`** — `BOSS_HP_BY_ACT` and combat-start cloning provide the act values.

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
- Shops generate 5 character/shared cards, 3 unowned relics, and one card-removal service. Coupon Book applies a 20% price reduction.
- The Trophy adds a 1-of-3 relic choice after elite rewards. Boss wins also offer a 1-of-3 relic choice, including boss relics.

**Victory/defeat tie resolution:** if a single card play simultaneously kills the last enemy and drops the player to 0 HP (e.g., Weekend Warrior self-damage), **victory wins.** Combat checks `allEnemiesDead()` before checking player HP ≤ 0.

## Phase 4 specifics

**Save/load:**
- `saves/saveState.js` stores one active local run at `dadQuest.activeRun.v1`.
- Saves happen after major actions: starting a run, map travel, card play/end turn, reward pick/skip, rest, shop purchases/removal, and event completion.
- Combat snapshots serialize/hydrate `Set` and `Map` fields (`costZeroThisTurn`, `oncePerCombatFired`, `cardEffectOverrides`) so mid-combat refreshes can resume.
- Reward snapshots store already-rolled gold/cards/relics so refreshing on the reward screen cannot duplicate rewards.
- Normal and elite combat rewards include a small breather heal (6% / 10% max HP) to reduce pure attrition.
- Character select shows Continue Run when a save exists. Returning after game over or run victory clears the save.

**Shops:**
- `scenes/shop.js` supports card purchase, relic purchase, and one card removal per shop.
- Card pool uses the reward eligibility rules (same character + shared, no basic Strike/Defend/Burnout).
- Relic purchases skip already-owned relics. One-time max-HP relics apply immediately on pickup.

**Random events:**
- `data/events.js` defines 5 v1 events. `scenes/event.js` supports heal, percent heal, gold, max-HP changes, random relics by rarity, one-card rewards, and card removal.
- Event nodes pick and store their event ID on entry so refresh/resume does not reroll the event.

**Relic bindings:**
- All 20 relics now have executable v1 behavior: starter relics, shop-price passive, max HP pickups, non-combat heal, first-draw bonus, combat-start damage/block/strength/energy/HP loss, end-turn block, 4th-card draw, elite relic choice, debuff damage, max energy, and temporary common-card generation.
- Relic-granted resources at combat start continue to bypass `on_gain_*` triggers per the resolved Phase 2 ruling.

**Site integration and polish:**
- Dad Quest is linked from the home page's New This Week and All Games sections, `games/index.html`, and `sitemap.xml`.
- `dad-quest/index.html` includes page title, description, canonical, Open Graph tags, and an About section below the game.
- Character select includes a How to Play modal and first-run tutorial flag.

## Keyboard shortcuts (combat scene)

- `1`–`9` — play the corresponding hand card if affordable
- `Space` — End Turn
- `Esc` — reserved for Phase 4 (settings/pause)

## URL flags

- `/dad-quest/?phase=1` — boot through preload then render the Phase 1 "Ready" splash. Useful for verifying the asset pipeline in isolation.

## Phase 2 specifics

**Tick order (matches DESIGN.md § 1.4, except for Block — see Resolved ruling 5):**
1. Player turn start → reset per-turn flags → **wipe player Block** → drain queued next-turn effects → fire `on_turn_start` triggers → draw 5 → energy = 3
2. Player plays cards (each play resolves effect, checks victory)
3. End-turn button → fire `on_turn_end` triggers → Doug's Jitters tax (Caffeine > 5) → discard hand → tick player statuses (Vulnerable/Weak −1; Block is NOT cleared here so it can absorb the upcoming enemy turn)
4. Enemy turn → each enemy resolves intent in display order; player Block absorbs damage as it lands; check defeat after each hit
5. Enemy end-of-turn → tick enemy statuses (Vulnerable/Weak −1) → roll next intent
6. Goto 1

**Damage math (in `engine/statusEffects.js`):** `outgoing = (base + attacker.strength) × (Weak ? 0.75 : 1)`, then `incoming = outgoing × (Vulnerable ? 1.5 : 1)`, then **single** `Math.floor`, then Block absorbs first.

**Self-damage (`lose_hp:N`)** bypasses Strength/Weak/Vulnerable/Block — flat HP hit.

**Apotheosis** doubles every numeric payload in each card's effect string for the rest of the combat. Threshold values inside `*_gte:N` conditions are NOT doubled. Implemented via `combatState.cardEffectOverrides: Map<uuid, effectString>` consulted in `playCard` before parsing.

**All 20 relics are wired as of Phase 4:** Lawn Flag, Travel Mug, Pocket Square, and the 17 non-starter relics all have executable bindings in combat, reward, map, shop, or event flow as appropriate.

**All 12 enemies are wired as fights in Phase 3.** The map generator assigns normal / elite / boss encounters, and Pyramid Schemer can summon Aggressive Roomba mid-combat.

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
- Don't modify the parent dad-arcade repo's `vercel.json`, `package.json`, robots.txt, or other game directories. Dad Quest remains static-routed.
- Don't commit `.DS_Store` if you spot one — add to `.gitignore` if not already covered by the parent repo.
