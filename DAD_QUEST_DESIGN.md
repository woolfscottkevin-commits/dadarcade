# Dad Quest — Design Doc & Asset Spec (v1)

A Slay-the-Spire-lite deckbuilder roguelike for Dad Arcade. Modern-suburban absurdism. Original IP — no commercial card-game branding, no copied card names, all art generated externally.

This document is the **single source of truth for Phase 1**. Phase 2 (code build) does not start until every asset in section 4 is generated and dropped into `/dad-quest/assets/`.

---

## Table of contents

1. [Game Design](#1-game-design)
2. [Art Style Lock](#2-art-style-lock)
3. [Image-Gen Prompt Pack](#3-image-gen-prompt-pack)
4. [Asset Manifest](#4-asset-manifest)
5. [Phase 1 Status](#5-phase-1-status)

---

## 1. Game Design

### 1.1 Core loop (one run)

1. **Character select** — pick 1 of 3 starter classes. Each has its own starter deck, starting HP, starting relic, and signature mechanic.
2. **Map screen** — branching node graph across 3 acts. Player chooses one path through ~15 nodes per act. Node types: combat (most common), elite combat, rest site, shop, random event, boss (one per act, mandatory).
3. **Combat** — turn-based, energy-driven. Player turn: 3 energy, draw 5 cards, play any cards they can pay for, end turn. Enemy turn: every enemy resolves its telegraphed intent in display order. Status effects tick. Loop until someone hits 0 HP.
4. **Post-combat** — pick 1 of 3 cards to add to deck, or skip. Gain gold (10–25 normal, 25–35 elite, 50+ boss).
5. **Shops** — buy cards (50–100g common, 75–150g uncommon, 150–200g rare), buy relics (150–300g), pay 75g to remove a card.
6. **Run end** — Act 3 boss kill = win → return to character select. HP hits 0 = lose → return to character select. No persistent meta-progression in v1.

### 1.2 Characters (3)

#### Hank — The Suburban Dad
- **Vibe:** weekend warrior in cargo shorts with a fully stocked tool shed; reliable, slow-burn power, hits like a truck once warmed up.
- **Starting HP:** 75
- **Starting relic:** Lawn Flag (gain +1 Yard Work whenever you'd gain Yard Work)
- **Signature mechanic — Yard Work:** a stacking counter (not a debuff). Many cards generate Yard Work; some scale with it; some consume it for big payoffs. Yard Work persists across turns within a combat. Resets between combats.
- **Starter deck (10):** 5× Strike, 3× Defend, 1× Saturday Routine, 1× Green Thumb

#### Doug — The Office Drone
- **Vibe:** Doug from Accounting; corporate jargon as combat; fueled by coffee, undone by burnout.
- **Starting HP:** 65
- **Starting relic:** Travel Mug (start each combat with 2 Caffeine)
- **Signature mechanic — Caffeine / Jitters:** Caffeine is a stacking counter you build with cards. Many Doug cards scale with current Caffeine. **Jitters tax:** at end of player turn, if Caffeine > 5, take (Caffeine − 5) damage. Risk-reward. Caffeine resets between combats.
- **Starter deck (10):** 5× Strike, 3× Defend, 1× Coffee Break, 1× Caffeinated

#### Brenda — The HOA President
- **Vibe:** weaponized bureaucracy; clipboards, citations, and emergency meetings; a status-effect specialist who scales by burying enemies in paperwork.
- **Starting HP:** 70
- **Starting relic:** Pocket Square (+5 max HP, +1 max HP for every non-elite combat won)
- **Signature mechanic — Citations:** a debuff Brenda applies to enemies. Citations do nothing on their own, but many of her cards trigger off them or scale with them. Citations persist on an enemy until the enemy dies; they don't tick or expire mid-combat.
- **Starter deck (10):** 5× Strike, 3× Defend, 1× The Bulletin Board, 1× Code Enforcement

### 1.3 Cards (78 total)

Three rarities: **Common**, **Uncommon**, **Rare**. Three types: **Attack** (deals damage), **Skill** (utility/defense), **Power** (persistent within combat). Energy costs 0–3.

Notation: `Cost / Type / Rarity`. "Exhaust" = card leaves combat after use, returns to deck after combat.

#### Hank cards (22)

**Attacks (10)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Strike | 1 / Attack / Common (starter) | Deal 6 damage. |
| Mow Down | 1 / Attack / Common | Deal 7. Gain 1 Yard Work. |
| Hedge Trim | 1 / Attack / Common | Deal 4 to ALL enemies. |
| Leaf Blower | 2 / Attack / Uncommon | Deal 3 damage 4 times to random enemies. |
| Weed Whacker | 1 / Attack / Uncommon | Deal 5. Spend all Yard Work; deal +2 per stack spent. |
| Lawn Aerator | 2 / Attack / Common | Deal 12. Apply 2 Vulnerable. |
| Riding Mower | 3 / Attack / Rare | Deal 18. Lose 4 HP. |
| Garden Gnome | 0 / Attack / Common | Deal 4. |
| Sprinkler Strike | 1 / Attack / Uncommon | Deal 3 to all. Gain 1 Yard Work. |
| Drought Strike | 2 / Attack / Rare | Deal X damage where X = current Yard Work × 3. |

**Skills (8)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Defend | 1 / Skill / Common (starter) | Gain 5 Block. |
| Saturday Routine | 1 / Skill / Common (starter) | Gain 5 Block. Gain 2 Yard Work. |
| Weekend Warrior | 1 / Skill / Uncommon | Gain 1 energy. Lose 2 HP. |
| Compost Pile | 0 / Skill / Common | Gain 1 Yard Work. Draw 1. |
| Power Nap | 1 / Skill / Common | Heal 4 HP. Draw 1. |
| Tool Shed | 2 / Skill / Uncommon | Add 2 random Hank Attacks to your hand (cost 0 this turn). |
| Garage Workshop | 1 / Skill / Uncommon | Gain 8 Block. If Yard Work ≥ 3, gain 12 Block instead. |
| Honey-Do List | 0 / Skill / Common | Draw 2 cards. |

**Powers (4)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Green Thumb | 1 / Power / Common (starter) | Whenever you play a Skill, gain 1 Yard Work. |
| Big-Box Membership | 1 / Power / Uncommon | At start of turn, draw 1 extra card. |
| Suburbanite | 2 / Power / Rare | At start of turn, gain 1 Yard Work. |
| Tinkerer | 1 / Power / Rare | Whenever you play 3+ cards in a turn, gain 6 Block. |

#### Doug cards (22)

**Attacks (10)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Strike | 1 / Attack / Common (starter) | Deal 6 damage. |
| Stapler | 1 / Attack / Common | Deal 9. Apply 1 Vulnerable. |
| Email Blast | 1 / Attack / Common | Deal 3 to all. Apply 1 Weak to all. |
| Performance Review | 2 / Attack / Uncommon | Deal 14. If Caffeine ≥ 3, deal +6. |
| Power Move | 0 / Attack / Common | Deal 4. Draw 1. |
| Death by Meeting | 2 / Attack / Rare | Deal 16. Add 1 "Burnout" curse to your discard pile. |
| Pivot | 1 / Attack / Common | Deal 7. Apply 1 Weak. |
| Synergy | 1 / Attack / Uncommon | Deal 5. If you've gained Caffeine this turn, deal 9 instead. |
| Espresso Shot | 0 / Attack / Common | Deal 3. Gain 2 Caffeine. |
| The Spreadsheet | 1 / Attack / Rare | Deal X damage where X = cards played this turn × 3. |

**Skills (8)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Defend | 1 / Skill / Common (starter) | Gain 5 Block. |
| Coffee Break | 0 / Skill / Common (starter) | Gain 3 Caffeine. Heal 3 HP. |
| Standing Desk | 1 / Skill / Common | Gain 8 Block. If Caffeine ≥ 3, +4 Block. |
| Snooze | 1 / Skill / Uncommon | Lose 3 Caffeine. Heal 6 HP. |
| Caffeine Dependency | 0 / Skill / Uncommon | Gain 4 Caffeine. Take 2 damage. |
| Out of Office | 1 / Skill / Uncommon | Gain 6 Block. Gain 1 energy. |
| Open Floor Plan | 1 / Skill / Uncommon | Apply 2 Vulnerable to all enemies. |
| The Quiet Quit | 2 / Skill / Rare | Heal 8 HP. Gain 8 Block. |

**Powers (4)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Caffeinated | 1 / Power / Common (starter) | Whenever you gain Caffeine, also gain 1 Strength. |
| The Grind | 2 / Power / Rare | Whenever you play 4+ cards in a turn, deal 6 to all enemies. |
| Performance Bonus | 1 / Power / Uncommon | At end of turn, if Caffeine ≥ 5, gain 4 gold. |
| Burnout Insurance | 2 / Power / Rare | The first time you'd take damage each turn, prevent it. |

**Burnout (curse, generated by Death by Meeting)**: 0 / Status / Unplayable. Cannot be removed except by card-removal effects. Counts toward hand size.

#### Brenda cards (22)

**Attacks (10)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Strike | 1 / Attack / Common (starter) | Deal 6 damage. |
| Citation | 1 / Attack / Common | Deal 4. Apply 2 Citation. |
| Cease and Desist | 2 / Attack / Uncommon | Deal 8. Apply 3 Citation. Apply 2 Vulnerable. |
| Letter of Complaint | 1 / Attack / Common | Deal 3 to all. Apply 1 Citation to all. |
| Public Shaming | 1 / Attack / Uncommon | Deal 4. Deal +2 per Citation on the target. |
| Megaphone | 2 / Attack / Common | Deal 12. Apply 2 Weak. |
| The Petition | 0 / Attack / Common | Deal 2. Apply 4 Citation. |
| Subpoena | 3 / Attack / Rare | Deal 20. |
| By-Law Violation | 1 / Attack / Rare | Deal 6. If target has 5+ Citations, double damage. |
| Court Order | 2 / Attack / Rare | Deal X damage where X = total Citations across all enemies × 2. |

**Skills (8)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Defend | 1 / Skill / Common (starter) | Gain 5 Block. |
| The Bulletin Board | 0 / Skill / Common (starter) | Apply 2 Citation to all enemies. |
| Neighborhood Watch | 1 / Skill / Common | Gain 6 Block. Apply 1 Citation to all. |
| Power Tripping | 1 / Skill / Uncommon | Gain 8 Block. If you applied Citation this turn, +4 Block. |
| Form 401-B | 0 / Skill / Common | Draw 2 cards. |
| Bake Sale | 1 / Skill / Uncommon | Heal 5 HP. Gain 2 gold. |
| Emergency Meeting | 1 / Skill / Uncommon | Apply 3 Citation distributed randomly among enemies. |
| The HOA Treasury | 1 / Skill / Rare | Gain 4 Block. Gain 4 gold. |

**Powers (4)**

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Code Enforcement | 1 / Power / Common (starter) | At start of turn, apply 1 Citation to a random enemy. |
| Petty Tyrant | 1 / Power / Rare | Deal +1 damage per Citation you've applied this combat (caps at +10). |
| Compliance | 2 / Power / Rare | At start of your turn, enemies with 5+ Citations take 4 damage. |
| The Bylaws | 1 / Power / Uncommon | The first card you play each turn that applies Citation costs 0. |

#### Shared cards (12)

Available as rewards to all characters.

| Card | Cost / Type / Rarity | Effect |
|---|---|---|
| Slimming | 1 / Skill / Uncommon | Lose 3 HP. Gain 12 Block. |
| Apotheosis | 2 / Skill / Rare | Upgrade all cards in your hand for the rest of combat. Exhaust. |
| Bandage Up | 0 / Skill / Common | Heal 4 HP. Exhaust. |
| Master of Strategy | 3 / Skill / Rare | Draw 3 cards. |
| Panic Button | 1 / Skill / Uncommon | Gain 8 Block. Gain 1 energy. Exhaust. |
| The Backup Plan | 1 / Skill / Uncommon | Add 2 random Skills to your hand. They cost 0 this turn. Exhaust. |
| Last Stand | 1 / Skill / Rare | Heal HP equal to damage taken this turn. Exhaust. |
| Pep Talk | 0 / Skill / Uncommon | Gain 2 Strength next turn. Exhaust. |
| Adrenaline | 0 / Skill / Rare | Gain 1 energy. Draw 2. Exhaust. |
| Quick Thinking | 0 / Skill / Common | Draw 1. |
| Reinforcements | 2 / Skill / Common | Gain 14 Block. |
| Iron Will | 1 / Skill / Uncommon | Gain 2 Strength. |

**Card totals:** Hank 22, Doug 22, Brenda 22, Shared 12 = **78 cards.**

### 1.4 Status effects

| Status | Applied to | Effect |
|---|---|---|
| Block | Self | Absorbs damage. Expires at end of player's turn unless retained by relic/card. |
| Vulnerable | Anyone | Target takes 50% more damage. Decrements by 1 each turn. |
| Weak | Anyone | Target deals 25% less damage. Decrements by 1 each turn. |
| Strength | Anyone | +1 damage per stack on attack cards (non-X-cost). Persists for combat. |
| Yard Work | Self (Hank only) | Counter. Generated by skills/cards. Spent or scaled by other cards. Persists for combat. |
| Caffeine | Self (Doug only) | Counter. End-of-turn Jitters tax: if > 5, take (Caffeine − 5) damage. Persists for combat. |
| Citation | Enemies (Brenda only) | Counter applied to enemies. Persists until enemy dies. Triggers and scaling on Brenda cards. |
| Burnout | Self (Doug curse) | Unplayable. Generated by Death by Meeting. Counts as hand size. |

**Tick order each turn:**
1. Start of player turn → apply Strength buffs from "next turn" effects, draw cards, "start of turn" power triggers.
2. Player plays cards.
3. End-of-turn button → "end of turn" power triggers (e.g., Performance Bonus, Jitters tax), Block expires, Vulnerable/Weak decrement on player.
4. Enemy turn → each enemy resolves its intent in display order.
5. Enemy end-of-turn → Vulnerable/Weak decrement on enemies.
6. Goto step 1.

### 1.5 Enemies (12)

Every enemy displays its **intent** above its sprite each turn — telegraphing what it will do. Intents: Attack (sword icon + damage number), Block (shield icon + value), Buff (up arrow), Debuff (down arrow), Special (?). Patterns repeat or are weighted-random; players learn them.

#### Normal enemies (8) — Acts 1–2

| # | Name | HP | Pattern (cycles or weighted) |
|---|---|---|---|
| 1 | Aggressive Roomba | 18 | Bump (Atk 6) → Charge (Atk 9) cycle |
| 2 | Sprinkler Sentry | 22 | 60% Spray (Atk 3 three times) / 40% Pressurize (Block 8) |
| 3 | Door-to-Door Salesman | 25 | Pitch (Atk 4 + apply 2 Weak) → Hard Sell (Atk 8) cycle |
| 4 | Karen Manager | 28 | 40% Complain (Atk 5 + 2 Vulnerable) / 30% Escalate (Atk 10) / 30% Brandish Phone (Block 6) |
| 5 | Yappy Dog | 14 | Bark (apply 2 Weak) → Nip (Atk 4 twice) cycle |
| 6 | Gossip Neighbor | 20 | Whisper (Atk 3 + player discards 1 card at random) → Spread Rumor (apply 3 Vulnerable) cycle |
| 7 | Pyramid Schemer | 30 | Recruit (summon 1 Aggressive Roomba — once per combat) → Hard Sell (Atk 9) → repeat Hard Sell |
| 8 | Lost Tourist | 18 | Confused Wander (Atk 4 to player AND any other enemy) → Panic (Block 10) cycle |

#### Elites (3)

| # | Name | HP | Pattern |
|---|---|---|---|
| 9 | The Mailman | 60 | Package Delivery (Atk 14) → Certified Letter (Atk 6 + apply 2 Vulnerable) → Dog Defense (Block 12) → repeat |
| 10 | The Substitute Teacher | 70 | Pop Quiz (Atk 10 + player draws 2 fewer cards next turn) → Detention (Atk 18) → Lecture (Block 12 + apply 2 Weak) → repeat |
| 11 | The Personal Trainer | 80 | Burpees (Atk 4 four times) → Power Lift Setup (gain 5 Strength, Block 6) → Power Lift Release (Atk 25) → repeat |

#### Final boss (1)

| # | Name | HP | Pattern |
|---|---|---|---|
| 12 | The Ultimate HOA President | 250 | Pass New Bylaw (apply 2 Vulnerable + 2 Weak) → Citation Barrage (Atk 8 three times) → Call Emergency Meeting (heal 20, gain 4 Strength) → Final Summons (Atk 30, telegraphed 1 turn ahead) → repeat |

Note for v2 / cut from v1: Acts 1 and 2 each get their own boss. v1 ships with The Ultimate HOA President as the only boss for all three acts (HP scales: Act 1 110, Act 2 175, Act 3 250). This is a known scope cut.

### 1.6 Relics (20)

| # | Name | Rarity | Effect |
|---|---|---|---|
| 1 | Lucky Penny | Common | Start each combat with 1 extra Block. |
| 2 | Travel Mug | Common (Doug starter) | Start each combat with 2 Caffeine (or +1 energy on turn 1 for non-Doug). |
| 3 | Pocket Square | Common (Brenda starter) | +5 max HP. +1 max HP per non-elite combat won. |
| 4 | Lawn Flag | Common (Hank starter) | Whenever you'd gain Yard Work, gain +1 (Hank). For others: gain 1 Strength on first attack each combat. |
| 5 | Coupon Book | Common | Shop prices reduced 20%. |
| 6 | Reading Glasses | Common | +5 max HP. (Flavor: clearer enemy intents.) |
| 7 | Pedometer | Common | Whenever you enter a non-combat node, heal 4 HP. |
| 8 | House Keys | Common | Start each combat with 1 extra card on first draw. |
| 9 | Loud Lawn Mower | Uncommon | Start of combat: deal 4 damage to ALL enemies. |
| 10 | Insulated Lunchbox | Uncommon | At end of turn, gain 4 Block if you have 0 Block. |
| 11 | Snake Plant | Uncommon | At start of each combat, gain 1 Strength. |
| 12 | The Manual | Uncommon | Whenever you play 4+ cards in a turn, draw 1. |
| 13 | Property Deed | Uncommon | +6 max HP (one-time on pickup). |
| 14 | Espresso Machine | Uncommon | Doug: max Caffeine cap +3 (Jitters tax doesn't trigger until > 8). Others: +1 energy on turn 1 each combat. |
| 15 | Power Suit | Rare | Start of combat: gain 4 Block. |
| 16 | The Trophy | Rare | After defeating an elite, choose 1 of 3 random relics. |
| 17 | Riding Mower Keys | Rare | Start of combat: gain 2 energy on turn 1. |
| 18 | The Megaphone | Rare | Whenever you apply a debuff to an enemy, deal 3 damage to that enemy. |
| 19 | The Master Plan | Boss | +1 max energy. Lose 6 HP at start of each combat. |
| 20 | Endless Inbox | Boss | Start each combat with 3 random Common cards in hand (they Exhaust). |

### 1.7 Map

Each act = 1 boss + ~15 nodes total = ~5 normal combats + 1–2 elites + 1 rest site + 1 shop + 1–2 events + boss (mandatory final).

**Generation rules:**
- 6 rows per act. Row 6 is the boss (single node, all paths converge).
- Rows 1–5 each have 3–4 nodes. Edges only connect adjacent rows; max 2 outgoing edges per node; no crossing edges (planar graph for clean rendering).
- Distribution per non-boss row: 60% combat, 10% elite, 10% rest, 10% shop, 10% event. Constraint: no two adjacent rows both have an elite; row 1 is always combat (no rest/shop/elite on first row).
- Player starts below row 1 and may enter via any node in row 1. Can only move forward to a node in the next row connected by an edge from current node.
- Map is fully visible at all times. Highlight player position and the 1–2 reachable nodes from current position.

### 1.8 Scope discipline

**v1 ships with:** 3 characters, 78 cards, 12 enemies (with the boss reskinned/HP-scaled across 3 acts), 20 relics, 3 acts of map, save/load, mobile-first UI, home-page tile, SEO meta, About copy.

**v1 explicitly does NOT include:** ascension levels, daily challenge, custom seeds, achievements, leaderboards, meta-progression unlocks, character unlocks, card upgrades (cards have no `+` upgraded versions in v1 — Apotheosis temporarily upgrades cards within a single combat as a flavor effect; mechanically it just doubles all numbers on hand cards for that combat), **distinct Act 1 and Act 2 bosses** (v1 reskins/scales The Ultimate HOA President across all 3 acts — see § 1.5).

**v2 backlog (deferred — do not implement in v1):**
- **Act 1 boss + Act 2 boss** as their own enemies with unique art, unique HP, unique intent patterns. Shortlist: an "Aggressive Roomba Hivemind" elite-evolved boss for Act 1; a "Corner Office CEO" boss for Act 2. Filenames reserved: `enemy_act1_boss.png`, `enemy_act2_boss.png`. Add to `enemies.ts` and to the map generator's act-end node so each act terminates on its own boss instead of HP-scaled HOA President clones.
- Card upgrade system (`+` versions of every card, granted by Rest sites and Campfire upgrades).
- Ascension levels for replayability.
- Daily challenge with shared seed.

**Hard timebox:** if Phase 2 stretches past 2 long sessions, cut Brenda first (she has the most complex status interactions). 2 characters + 56 cards + 12 enemies still ships a complete game.

---

## 2. Art Style Lock

### 2.1 Reference vibe

**Modern flat cartoon — Adventure Time / Gravity Falls / Hilda-adjacent.** Bold consistent black outlines, flat color fills with a single tone of cel-shading shadow only (no gradient blending), expressive oversized features (big heads, big hands, big eyes), slightly off-model proportions for comedic effect. Suburbia maximalism — manicured lawns, pastel siding, sunset skies, beige interiors.

**NOT:** 3D Pixar, anime, Simpsons-yellow, South Park flat-construction-paper, pixel art, painterly, photorealistic, vector minimalism, MS Paint, isometric, Disney classic, Studio Ghibli.

### 2.2 Color palette (lock to these hex codes)

**Primary:**
- Sky blue `#4FC3F7`
- Lawn green `#7CB342`
- Sunset orange `#FB8C00`

**Secondary:**
- Cream `#FFF3E0`
- Suburb beige `#D7CCC8`
- Coffee brown `#6D4C41`

**Accent:**
- Punchy red `#E53935`
- Deep navy `#1A237E`

**Skin tones (3):**
- Warm peach `#F4C2A1`
- Light tan `#E0AC8B`
- Deep tan `#B8896C`

All card art must pull from this palette. Backgrounds: solid or 2-tone gradient using palette colors. Foreground subjects: outlined in black, filled with palette colors only.

### 2.3 Composition rules

- **Aspect ratio:** card art and enemy art = square 1:1. Character portraits = portrait 3:4. Relic icons = square 1:1.
- **Subject:** centered, single focal point, fills ~70% of frame.
- **Background:** simple, palette-locked. Solid color, 2-color gradient, or minimal silhouette pattern (suburban skyline, lawn horizon, office cubicle outlines).
- **Negative space:** allow some breathing room — don't bleed subject to edges.
- **No text or letters in the image** (cards have text added in code via the card frame). No watermarks, signatures, or logos.
- **No borders.** The card frame is added in code; the art fills the full image.

### 2.4 Style anchors

- **Line weight:** bold, consistent, ~3–4px-equivalent black outlines on all subject elements. Slight tapering at line ends OK; no rough sketchy lines.
- **Shading:** ONE flat shadow tone per fill color (think 2-tone cel shading). No soft gradients on subjects. Backgrounds may use a single 2-stop gradient.
- **Eye style:** large round white eyes with black pupils. Slight comedic asymmetry OK (one eye larger, eyebrows expressive). No sclera-less manga eyes, no realistic eyes.
- **Hand style:** 4-finger cartoon mitten hands (3 fingers + thumb), or full 5-finger if more detail needed. No realistic hand anatomy.
- **Faces:** expressive, exaggerated. Big toothy grins, raised eyebrows, popping veins for anger, squinting eyes for smug.
- **Props:** chunky, slightly oversized, clearly readable silhouettes (a rake reads as a rake at thumbnail size).

---

## 3. Image-Gen Prompt Pack

### How to use

Every prompt below has three parts:
- **`[PREFIX]`** — paste this at the start of every prompt to lock the style.
- **Subject text** — unique per asset.
- **`[SUFFIX]`** — paste this at the end of every prompt to lock palette / composition / Midjourney parameters.

**`[PREFIX]`:**
```
modern flat cartoon illustration in the style of Adventure Time and Gravity Falls and Hilda, bold consistent black outlines, flat color fills with single-tone cel-shaded shadow accents, expressive oversized features, slightly off-model proportions for comedic effect, kid-friendly suburbia aesthetic,
```

**`[SUFFIX]` (for square 1:1 art — cards, enemies, relics):**
```
centered subject, simple gradient or solid background using the locked palette (sky blue #4FC3F7, lawn green #7CB342, sunset orange #FB8C00, cream #FFF3E0, suburb beige #D7CCC8, coffee brown #6D4C41, punchy red #E53935, deep navy #1A237E), 4-finger cartoon mitten hands, large round expressive white eyes with black pupils, no text, no letters, no logos, no watermark, no borders, no signatures --ar 1:1 --style raw --v 6
```

**`[SUFFIX-PORTRAIT]` (for character portraits — 3:4):**
```
centered subject, simple gradient background using the locked palette (sky blue #4FC3F7, lawn green #7CB342, sunset orange #FB8C00, cream #FFF3E0), 4-finger cartoon mitten hands, large round expressive white eyes with black pupils, no text, no letters, no logos, no watermark, no borders, no signatures --ar 3:4 --style raw --v 6
```

For each prompt below, paste `[PREFIX]` + the subject sentence + the appropriate `[SUFFIX]`.

---

### 3.1 Character portraits (3) — `--ar 3:4`

#### `char_hank.png`
```
[PREFIX] a friendly suburban dad in his 40s, wearing cargo shorts a tucked-in polo shirt and a backwards baseball cap, holding a garden rake over one shoulder like a knight's sword, slight beer belly, big confident grin, golden retriever sitting at his feet, suburban front lawn behind him at golden hour, [SUFFIX-PORTRAIT]
```

#### `char_doug.png`
```
[PREFIX] a stressed office worker man in his 30s wearing a wrinkled blue dress shirt with rolled-up sleeves and a loosened red tie, dark circles under his eyes, holding an oversized coffee mug in one hand and a stack of TPS reports in the other, fluorescent office cubicle background with motivational posters, slight caffeine jitter motion lines, [SUFFIX-PORTRAIT]
```

#### `char_brenda.png`
```
[PREFIX] a stern middle-aged woman with a chin-length blonde bob haircut, wearing a pastel pink cardigan over a floral blouse, holding a clipboard with a pen poised to write, a measuring tape clipped to her belt, raised judgmental eyebrow, suburban cul-de-sac with picket fences behind her, [SUFFIX-PORTRAIT]
```

---

### 3.2 Card art — Hank (22) — `--ar 1:1`

#### `card_strike_hank.png`
```
[PREFIX] a strong gloved fist punching forward with motion lines and dust impact, set against a sunset-orange sky background, cargo-short-clad legs visible at bottom, [SUFFIX]
```

#### `card_mow_down.png`
```
[PREFIX] a red push lawn mower mid-charge with grass clippings flying out behind it, motion lines, the dad character's hands gripping the handle, lawn-green ground, [SUFFIX]
```

#### `card_hedge_trim.png`
```
[PREFIX] a pair of oversized hedge clippers slicing horizontally through the frame, perfectly cubed hedge cubes flying outward in multiple directions, sky-blue background, [SUFFIX]
```

#### `card_leaf_blower.png`
```
[PREFIX] a leaf blower being aimed at the viewer with a swirling tornado of orange and red autumn leaves blasting outward, dad character partially visible holding it with both hands, motion lines, [SUFFIX]
```

#### `card_weed_whacker.png`
```
[PREFIX] a string trimmer (weed whacker) spinning at full speed with a chaotic spray of grass and dandelion bits flying outward, lawn-green background with sunshine rays, [SUFFIX]
```

#### `card_lawn_aerator.png`
```
[PREFIX] a spike-rolling lawn aerator being pushed forward, small holes appearing in the green ground in its wake, suburban lawn setting, [SUFFIX]
```

#### `card_riding_mower.png`
```
[PREFIX] a heroic suburban dad on a red riding mower mid-jump in the air with grass clippings flying everywhere, action-movie pose, sunset sky behind, [SUFFIX]
```

#### `card_garden_gnome.png`
```
[PREFIX] a small ceramic garden gnome with a red pointed hat being thrown like a baseball, motion blur trail behind it, lawn-green background, gnome has an angry determined face, [SUFFIX]
```

#### `card_sprinkler_strike.png`
```
[PREFIX] a rotating lawn sprinkler in mid-sweep firing arcs of water in all directions, water droplets sparkling, lawn-green and sky-blue background, [SUFFIX]
```

#### `card_drought_strike.png`
```
[PREFIX] cracked dry parched earth foreground transitioning into a sun-scorched yellow lawn, a single dead-looking shrub, intense bright sun overhead with heat distortion lines, [SUFFIX]
```

#### `card_defend_hank.png`
```
[PREFIX] a sturdy wooden picket fence section held up like a shield with both gloved hands, sky-blue background, slight motion lines suggesting it's being raised quickly, [SUFFIX]
```

#### `card_saturday_routine.png`
```
[PREFIX] a checklist clipboard covered in checkmarks held in one hand and a coffee mug steaming in the other, suburban garage workshop background with tools on pegboards, [SUFFIX]
```

#### `card_weekend_warrior.png`
```
[PREFIX] a determined suburban dad flexing both biceps in a heroic pose, headband, sunset orange background, lawn-care tools propped behind him, [SUFFIX]
```

#### `card_compost_pile.png`
```
[PREFIX] a steaming wooden compost bin overflowing with banana peels, eggshells, and grass clippings, a small green seedling sprouting from the top, lawn-green background, [SUFFIX]
```

#### `card_power_nap.png`
```
[PREFIX] the dad character snoozing in a hammock between two trees with cartoon Z's floating above, suburban backyard at golden hour, [SUFFIX]
```

#### `card_tool_shed.png`
```
[PREFIX] an open wooden tool shed door revealing tools magically glowing inside — rakes, shovels, hedge clippers all suspended mid-air with sparkles, suburban backyard, [SUFFIX]
```

#### `card_garage_workshop.png`
```
[PREFIX] a tidy suburban garage interior with a workbench, pegboard of organized tools, and a half-finished birdhouse on the bench, beige and brown palette, [SUFFIX]
```

#### `card_honey_do_list.png`
```
[PREFIX] a comically long paper scroll of a honey-do list unrolling toward the viewer with handwritten check-boxes (no readable text), the dad character reading it with a resigned expression, cream background, [SUFFIX]
```

#### `card_green_thumb.png`
```
[PREFIX] a glowing radiant green thumb (the actual thumb of a hand) emitting magical sparkle particles, small sprouts growing from a thumbprint pattern, sky-blue background, [SUFFIX]
```

#### `card_big_box_membership.png`
```
[PREFIX] a comically oversized warehouse-store membership card being held up like a trophy with both hands, a giant warehouse store with bulk pallets in the background, sunset orange and beige palette, [SUFFIX]
```

#### `card_suburbanite.png`
```
[PREFIX] a rendered cul-de-sac of identical pastel suburban houses seen from above with the dad character standing in the middle of his perfectly manicured lawn, isometric-ish but cartoon, sky-blue background, [SUFFIX]
```

#### `card_tinkerer.png`
```
[PREFIX] a cluttered workbench with screws, springs, gears, and a half-built mystery contraption in the center, the dad character's hands holding a screwdriver, beige garage background, [SUFFIX]
```

---

### 3.3 Card art — Doug (22) — `--ar 1:1`

#### `card_strike_doug.png`
```
[PREFIX] a fist clutching a heavy black office stapler swinging forward, motion lines, fluorescent office cubicle background, [SUFFIX]
```

#### `card_stapler.png`
```
[PREFIX] a red Swingline-style office stapler being slammed down with force, staples flying outward, motion impact lines, cream background, [SUFFIX]
```

#### `card_email_blast.png`
```
[PREFIX] a computer monitor exploding outward with hundreds of envelope icons flying in all directions, motion blur, cubicle wall background, [SUFFIX]
```

#### `card_performance_review.png`
```
[PREFIX] an angry boss in a suit pointing accusingly at a clipboard covered in red marks, the office worker character cowering in front, fluorescent office background, [SUFFIX]
```

#### `card_power_move.png`
```
[PREFIX] the office-drone character striding confidently forward in a power suit pose, briefcase in hand, motion lines, office hallway background, [SUFFIX]
```

#### `card_death_by_meeting.png`
```
[PREFIX] an exhausted office worker slumped face-down on a conference table littered with empty coffee cups, projector screen with vague chart shapes glowing in background, deep navy and coffee brown palette, [SUFFIX]
```

#### `card_pivot.png`
```
[PREFIX] the office-drone character mid-spin with a confident finger-gun pose, motion swirl trails, abstract corporate-shapes background, [SUFFIX]
```

#### `card_synergy.png`
```
[PREFIX] two cartoon hands coming together in a confident handshake with sparkles and lightning bolts shooting from the connection point, sky-blue background, [SUFFIX]
```

#### `card_espresso_shot.png`
```
[PREFIX] a tiny espresso cup with steam rising and a single dramatic drop falling into it, intense glowing aura around the cup, deep coffee brown gradient background, [SUFFIX]
```

#### `card_the_spreadsheet.png`
```
[PREFIX] a glowing magical spreadsheet hovering in the air with cells of green and red data, the office-drone character pointing at it triumphantly, deep navy background, [SUFFIX]
```

#### `card_defend_doug.png`
```
[PREFIX] an office worker raising a thick three-ring binder up in front of his face like a shield, papers flying, fluorescent office background, [SUFFIX]
```

#### `card_coffee_break.png`
```
[PREFIX] the office-drone character mid-sip from an enormous oversized coffee mug with steam clouds rising, eyes wide with caffeinated relief, break-room background, [SUFFIX]
```

#### `card_standing_desk.png`
```
[PREFIX] the office-drone character standing tall behind an adjustable height desk with monitors, posture perfect, sunlight streaming through office window, [SUFFIX]
```

#### `card_snooze.png`
```
[PREFIX] the office-drone character asleep at his cubicle desk with face on keyboard, drool puddle, big floating cartoon Z's, fluorescent office background, [SUFFIX]
```

#### `card_caffeine_dependency.png`
```
[PREFIX] a shaking trembling hand reaching desperately for a coffee mug with multiple ghosted afterimages of the hand showing the trembling motion, coffee brown gradient background, [SUFFIX]
```

#### `card_out_of_office.png`
```
[PREFIX] an automatic-reply email icon over a beach scene with palm trees and a lounge chair, sunset orange and sky blue, the office-drone character in vacation shorts holding a piña colada, [SUFFIX]
```

#### `card_open_floor_plan.png`
```
[PREFIX] a chaotic open-plan office viewed from above showing dozens of desks crammed together with the office-drone character looking horrified in the center, beige and cream palette, [SUFFIX]
```

#### `card_the_quiet_quit.png`
```
[PREFIX] the office-drone character with feet up on the desk leaning back in chair scrolling on phone, headphones on, totally checked out expression, cubicle background, [SUFFIX]
```

#### `card_caffeinated.png`
```
[PREFIX] the office-drone character with wide manic glowing eyes and steam coming out of his ears, coffee mug held high, electric energy aura around his whole body, sunset orange background, [SUFFIX]
```

#### `card_the_grind.png`
```
[PREFIX] a comedic interpretation of "the grind" — a giant coffee grinder grinding office workers into productivity dust, surreal but cartoon-friendly, deep navy and coffee brown palette, [SUFFIX]
```

#### `card_performance_bonus.png`
```
[PREFIX] a cartoon trophy made of stacked cash with a smiling office worker face on it, glittering gold sparkles, sunset orange background, [SUFFIX]
```

#### `card_burnout_insurance.png`
```
[PREFIX] a hard hat with a fire-extinguisher sticker on it, sitting on a fluffy cloud with a halo above, sky-blue background, soft cartoon glow, [SUFFIX]
```

---

### 3.4 Card art — Brenda (22) — `--ar 1:1`

#### `card_strike_brenda.png`
```
[PREFIX] a clipboard being swung forward like a weapon with paper flying off, motion lines, suburban background, [SUFFIX]
```

#### `card_citation.png`
```
[PREFIX] a single official-looking citation paper being slapped onto a wooden post with a hammer, dust impact, suburban cul-de-sac background (paper has only abstract symbols, no readable text), [SUFFIX]
```

#### `card_cease_and_desist.png`
```
[PREFIX] a stern hand holding up an official-looking certificate with a wax seal in front of a cul-de-sac picket fence, the seal glowing red, [SUFFIX]
```

#### `card_letter_of_complaint.png`
```
[PREFIX] dozens of envelopes flying out of an oversized mailbox in all directions, sky-blue background, suburban houses on the horizon, [SUFFIX]
```

#### `card_public_shaming.png`
```
[PREFIX] a cartoon person standing in a wooden stocks (medieval-style hand-and-head pillory) being scolded by a finger-pointing crowd of suburban neighbors, sunset orange dramatic lighting, [SUFFIX]
```

#### `card_megaphone.png`
```
[PREFIX] Brenda the HOA president shouting into a red bullhorn megaphone with sound-wave rings emanating outward, sky-blue background with some cracked windows, [SUFFIX]
```

#### `card_the_petition.png`
```
[PREFIX] a clipboard with a long signed petition sheet curling off of it (no readable signatures, just squiggly marks), suburban background, [SUFFIX]
```

#### `card_subpoena.png`
```
[PREFIX] a glowing magical legal scroll being delivered by a stern bureaucratic hand, golden seal at the bottom dripping wax, deep navy background with sparkle particles, [SUFFIX]
```

#### `card_by_law_violation.png`
```
[PREFIX] a giant red rubber stamp coming down hard onto a document, ink splashing, motion impact, cream and red palette, [SUFFIX]
```

#### `card_court_order.png`
```
[PREFIX] a cartoon judge's gavel mid-strike on a wooden block with a dramatic golden glow radiating outward, deep navy background, [SUFFIX]
```

#### `card_defend_brenda.png`
```
[PREFIX] Brenda the HOA president holding a clipboard up in front of her face with a defensive raised eyebrow, suburban background, [SUFFIX]
```

#### `card_the_bulletin_board.png`
```
[PREFIX] a community bulletin board covered with overlapping flyers and notices stuck on with thumbtacks (no readable text, just abstract document shapes), beige and cream palette, [SUFFIX]
```

#### `card_neighborhood_watch.png`
```
[PREFIX] a yellow neighborhood-watch road sign with a cartoon eye on it next to a suburban street lamp, suburban houses behind, [SUFFIX]
```

#### `card_power_tripping.png`
```
[PREFIX] Brenda standing in a power-pose with hands on hips, glowing aura around her, cul-de-sac of houses bowing toward her in the background, sunset orange dramatic sky, [SUFFIX]
```

#### `card_form_401b.png`
```
[PREFIX] a chaotic stack of carbonless paper forms being filled out by floating ballpoint pens, deep navy and cream palette, no readable text just form-shape patterns, [SUFFIX]
```

#### `card_bake_sale.png`
```
[PREFIX] a folding table set up on a sunny lawn with a hand-lettered sign (illegible squiggle text) and a tray of cupcakes, balloons tied to the table corners, sky-blue and lawn-green background, [SUFFIX]
```

#### `card_emergency_meeting.png`
```
[PREFIX] a suburban living room with folding chairs in a circle, agitated neighbors gesturing, Brenda standing at a podium pointing at a chart on a tripod (no readable text), beige interior, [SUFFIX]
```

#### `card_the_hoa_treasury.png`
```
[PREFIX] a small ornate wooden chest overflowing with gold coins on a folding card table, suburban-house wallpaper background, sparkle particles, [SUFFIX]
```

#### `card_code_enforcement.png`
```
[PREFIX] a glowing magical city-ordinance book floating open with golden light streaming from its pages, suburban houses faintly visible behind, sky-blue and gold palette, [SUFFIX]
```

#### `card_petty_tyrant.png`
```
[PREFIX] Brenda sitting on a comically small throne made of clipboards and binders, wearing a tiny crown, holding her clipboard like a scepter, deep navy background, [SUFFIX]
```

#### `card_compliance.png`
```
[PREFIX] a row of identical perfectly trimmed suburban hedges and identical pastel mailboxes stretching to a vanishing point, eerie tidiness, sky-blue background, [SUFFIX]
```

#### `card_the_bylaws.png`
```
[PREFIX] an enormous bound leather book of HOA bylaws floating open in mid-air with golden chains wrapping around it, glowing rays shooting out, deep navy mystical background, [SUFFIX]
```

---

### 3.5 Card art — Shared (12) — `--ar 1:1`

#### `card_slimming.png`
```
[PREFIX] a cartoon person in workout clothes squeezing into a too-tight metal corset of armor plating, slight strain expression but determined, sky-blue background, [SUFFIX]
```

#### `card_apotheosis.png`
```
[PREFIX] a glowing radiant pile of cards levitating with golden light beams shooting upward toward the heavens, sparkle particles, deep navy and gold palette, [SUFFIX]
```

#### `card_bandage_up.png`
```
[PREFIX] a cartoon character wrapping a long white bandage around their own arm with a brave thumbs-up, fluffy cloud background, [SUFFIX]
```

#### `card_master_of_strategy.png`
```
[PREFIX] a hand fanning out a spread of three blank-faced playing cards (no symbols), slight motion lines suggesting a shuffle, deep navy gradient background, [SUFFIX]
```

#### `card_panic_button.png`
```
[PREFIX] a giant red emergency push button on a yellow-and-black-striped pedestal being slammed by an open palm, motion impact lines, cream and red palette, [SUFFIX]
```

#### `card_the_backup_plan.png`
```
[PREFIX] a cartoon character pulling a glowing magical scroll out from inside their jacket like a hidden ace, sparkle particles, sunset orange background, [SUFFIX]
```

#### `card_last_stand.png`
```
[PREFIX] a battered cartoon hero standing dramatically with one fist raised, a single beam of sunlight breaking through stormclouds onto them, dramatic sunset orange and deep navy palette, [SUFFIX]
```

#### `card_pep_talk.png`
```
[PREFIX] one cartoon character putting a friendly hand on the shoulder of another, big smile, motivational sparkles around them, sky-blue background, [SUFFIX]
```

#### `card_adrenaline.png`
```
[PREFIX] a glowing red energy drink can with electric lightning bolts shooting out and a heartbeat motion line behind it, sunset orange dramatic background, [SUFFIX]
```

#### `card_quick_thinking.png`
```
[PREFIX] a glowing cartoon lightbulb popping into existence above a thinking cartoon character's head, sparkle particles, cream background, [SUFFIX]
```

#### `card_reinforcements.png`
```
[PREFIX] a stack of three sturdy wooden picket-fence shields locked together in formation, slight golden glow, suburban background, [SUFFIX]
```

#### `card_iron_will.png`
```
[PREFIX] a flexed cartoon arm with a glowing iron tattoo of a clenched fist on the bicep, sparkle particles, sunset orange background, [SUFFIX]
```

---

### 3.6 Enemy art (12) — `--ar 1:1`

#### `enemy_aggressive_roomba.png`
```
[PREFIX] a small disc-shaped robot vacuum cleaner with cartoon angry red eyes and tiny rage-clenched mitten arms, motion lines suggesting it's charging forward, beige tile floor background, [SUFFIX]
```

#### `enemy_sprinkler_sentry.png`
```
[PREFIX] an aggressive lawn sprinkler with a cartoon angry face on its rotating head, water arcs spraying outward like attacks, lawn-green background, [SUFFIX]
```

#### `enemy_door_to_door_salesman.png`
```
[PREFIX] a smarmy man in an ill-fitting suit with slicked-back hair holding a vacuum cleaner with both hands, fake plastic grin too wide, suburban front-porch background, [SUFFIX]
```

#### `enemy_karen_manager.png`
```
[PREFIX] a sharply-dressed woman with a severe asymmetrical bob haircut holding up a smartphone aggressively pointed at the viewer, mouth open mid-shout, retail-store background, [SUFFIX]
```

#### `enemy_yappy_dog.png`
```
[PREFIX] a small fluffy white shih-tzu-style dog mid-bark with comically large angry teeth and tiny enraged eyes, motion lines, suburban yard background, [SUFFIX]
```

#### `enemy_gossip_neighbor.png`
```
[PREFIX] a middle-aged woman in a bathrobe and curlers leaning over a picket fence with a hand cupped to her mouth whispering conspiratorially, sneaky expression, suburban background, [SUFFIX]
```

#### `enemy_pyramid_schemer.png`
```
[PREFIX] an over-enthusiastic person in business-casual clothes holding up a stack of branded merchandise (no readable logos) with a manic grin, an upside-down pyramid floating behind them, sunset orange background, [SUFFIX]
```

#### `enemy_lost_tourist.png`
```
[PREFIX] a confused tourist wearing socks with sandals, cargo shorts, a bucket hat and a Hawaiian shirt, holding an enormous unfolded paper map upside down, fanny pack, sky-blue background, [SUFFIX]
```

#### `enemy_the_mailman.png`
```
[PREFIX] a stern uniformed mail carrier with reflective sunglasses, holding a leather mail satchel that's bursting with packages, oversized mail-truck door behind him, navy and beige palette, threatening pose, [SUFFIX]
```

#### `enemy_the_substitute_teacher.png`
```
[PREFIX] a frazzled middle-aged substitute teacher in a wrinkled cardigan holding a ruler aggressively in one hand and a coffee thermos in the other, classroom chalkboard with abstract scribbles behind (no readable text), [SUFFIX]
```

#### `enemy_the_personal_trainer.png`
```
[PREFIX] an absurdly muscular fitness trainer in a tight gym tank top holding a 50-pound dumbbell in each hand, vein-popping flex pose, aggressive grin, gym background with weight racks, sunset orange palette, [SUFFIX]
```

#### `enemy_ultimate_hoa_president.png`
```
[PREFIX] an imposing villainous final-boss version of an HOA president — Brenda-archetype woman in a power-suit pantsuit, holding a gavel and a thick rulebook, glowing red eyes, towering pose with cape-like blazer, dramatic deep-navy and crimson background with lightning, suburban houses tiny in foreground, [SUFFIX]
```

---

### 3.7 Relic icon art (20) — `--ar 1:1`

Smaller resolution OK (e.g., 512×512). Single object, centered, plain or near-plain background.

#### `relic_lucky_penny.png`
```
[PREFIX] a single shiny copper penny floating in mid-air with a soft golden glow and tiny sparkle particles, plain cream background, [SUFFIX]
```

#### `relic_travel_mug.png`
```
[PREFIX] a stainless-steel insulated travel coffee mug with steam curling up from the lid, soft sky-blue gradient background, [SUFFIX]
```

#### `relic_pocket_square.png`
```
[PREFIX] a folded paisley-pattern pocket square in three peaks, gentle shadow, plain cream background, [SUFFIX]
```

#### `relic_lawn_flag.png`
```
[PREFIX] a small triangular pennant flag on a wooden stake stuck into a patch of green lawn, the flag has a stylized lawnmower silhouette, sky-blue background, [SUFFIX]
```

#### `relic_coupon_book.png`
```
[PREFIX] a thick stapled booklet of clipping coupons (no readable text, just abstract dashed-line border patterns), plain cream background, [SUFFIX]
```

#### `relic_reading_glasses.png`
```
[PREFIX] a pair of round wire-rim reading glasses floating in mid-air with a soft glow on the lenses, plain sky-blue gradient background, [SUFFIX]
```

#### `relic_pedometer.png`
```
[PREFIX] a small clip-on digital pedometer with a glowing green LCD step-count display showing abstract digit shapes (no readable numbers), plain beige background, [SUFFIX]
```

#### `relic_house_keys.png`
```
[PREFIX] a brass keyring holding three different brass house keys, a small rubber keychain charm shaped like a tiny house attached, plain cream gradient background, [SUFFIX]
```

#### `relic_loud_lawn_mower.png`
```
[PREFIX] a tiny iconic red push lawn mower toy-sized with cartoon sound wave rings emanating outward suggesting loud noise, plain lawn-green background, [SUFFIX]
```

#### `relic_insulated_lunchbox.png`
```
[PREFIX] a vintage-style metal lunchbox with a curved handle and a thermos clipped to the side, plain cream background, [SUFFIX]
```

#### `relic_snake_plant.png`
```
[PREFIX] a potted snake plant (sansevieria) with stiff upright striped green leaves in a small terracotta pot, soft glow, plain cream background, [SUFFIX]
```

#### `relic_the_manual.png`
```
[PREFIX] a thick spiral-bound owner's manual booklet with a plain cover, slight magical glow, no readable text, plain navy gradient background, [SUFFIX]
```

#### `relic_property_deed.png`
```
[PREFIX] a rolled paper scroll tied with a red ribbon, a wax seal at the bottom, plain cream background, [SUFFIX]
```

#### `relic_espresso_machine.png`
```
[PREFIX] a small chrome home espresso machine with a tiny steam puff rising from the steam wand, plain coffee-brown gradient background, [SUFFIX]
```

#### `relic_power_suit.png`
```
[PREFIX] a sharply tailored navy business power-suit blazer on a wooden hanger with a red pocket square peeking out, slight golden glow, plain cream background, [SUFFIX]
```

#### `relic_the_trophy.png`
```
[PREFIX] a golden plastic participation trophy of a generic cartoon person on a marble base, sparkles around it, sunset orange gradient background, [SUFFIX]
```

#### `relic_riding_mower_keys.png`
```
[PREFIX] a single ignition-style key with a green rubber grip and a small lawn-mower-shaped keychain, plain lawn-green background, [SUFFIX]
```

#### `relic_the_megaphone.png`
```
[PREFIX] a small red bullhorn megaphone with cartoon sound wave rings emanating from the wide end, plain sky-blue background, [SUFFIX]
```

#### `relic_the_master_plan.png`
```
[PREFIX] a rolled-up blueprint scroll partially unfurled showing abstract architectural lines (no readable text), faint blue glow, plain deep-navy background, [SUFFIX]
```

#### `relic_endless_inbox.png`
```
[PREFIX] a chaotic stack of overflowing manila file folders bursting with paper documents, the stack leaning precariously, plain beige background, [SUFFIX]
```

---

## 4. Asset Manifest

Drop generated images into the structure below at the repo root. Filenames must match exactly (lowercase, snake_case, `.png`).

```
/dad-quest/assets/
  characters/                   (3:4 portrait, recommended 1024×1365)
    char_hank.png               [ ]
    char_doug.png               [ ]
    char_brenda.png             [ ]

  cards/                        (1:1 square, recommended 1024×1024)
    card_strike_hank.png        [ ]
    card_mow_down.png           [ ]
    card_hedge_trim.png         [ ]
    card_leaf_blower.png        [ ]
    card_weed_whacker.png       [ ]
    card_lawn_aerator.png       [ ]
    card_riding_mower.png       [ ]
    card_garden_gnome.png       [ ]
    card_sprinkler_strike.png   [ ]
    card_drought_strike.png     [ ]
    card_defend_hank.png        [ ]
    card_saturday_routine.png   [ ]
    card_weekend_warrior.png    [ ]
    card_compost_pile.png       [ ]
    card_power_nap.png          [ ]
    card_tool_shed.png          [ ]
    card_garage_workshop.png    [ ]
    card_honey_do_list.png      [ ]
    card_green_thumb.png        [ ]
    card_big_box_membership.png [ ]
    card_suburbanite.png        [ ]
    card_tinkerer.png           [ ]

    card_strike_doug.png        [ ]
    card_stapler.png            [ ]
    card_email_blast.png        [ ]
    card_performance_review.png [ ]
    card_power_move.png         [ ]
    card_death_by_meeting.png   [ ]
    card_pivot.png              [ ]
    card_synergy.png            [ ]
    card_espresso_shot.png      [ ]
    card_the_spreadsheet.png    [ ]
    card_defend_doug.png        [ ]
    card_coffee_break.png       [ ]
    card_standing_desk.png      [ ]
    card_snooze.png             [ ]
    card_caffeine_dependency.png [ ]
    card_out_of_office.png      [ ]
    card_open_floor_plan.png    [ ]
    card_the_quiet_quit.png     [ ]
    card_caffeinated.png        [ ]
    card_the_grind.png          [ ]
    card_performance_bonus.png  [ ]
    card_burnout_insurance.png  [ ]

    card_strike_brenda.png      [ ]
    card_citation.png           [ ]
    card_cease_and_desist.png   [ ]
    card_letter_of_complaint.png [ ]
    card_public_shaming.png     [ ]
    card_megaphone.png          [ ]
    card_the_petition.png       [ ]
    card_subpoena.png           [ ]
    card_by_law_violation.png   [ ]
    card_court_order.png        [ ]
    card_defend_brenda.png      [ ]
    card_the_bulletin_board.png [ ]
    card_neighborhood_watch.png [ ]
    card_power_tripping.png     [ ]
    card_form_401b.png          [ ]
    card_bake_sale.png          [ ]
    card_emergency_meeting.png  [ ]
    card_the_hoa_treasury.png   [ ]
    card_code_enforcement.png   [ ]
    card_petty_tyrant.png       [ ]
    card_compliance.png         [ ]
    card_the_bylaws.png         [ ]

    card_slimming.png           [ ]
    card_apotheosis.png         [ ]
    card_bandage_up.png         [ ]
    card_master_of_strategy.png [ ]
    card_panic_button.png       [ ]
    card_the_backup_plan.png    [ ]
    card_last_stand.png         [ ]
    card_pep_talk.png           [ ]
    card_adrenaline.png         [ ]
    card_quick_thinking.png     [ ]
    card_reinforcements.png     [ ]
    card_iron_will.png          [ ]

  enemies/                      (1:1 square, recommended 1024×1024)
    enemy_aggressive_roomba.png        [ ]
    enemy_sprinkler_sentry.png         [ ]
    enemy_door_to_door_salesman.png    [ ]
    enemy_karen_manager.png            [ ]
    enemy_yappy_dog.png                [ ]
    enemy_gossip_neighbor.png          [ ]
    enemy_pyramid_schemer.png          [ ]
    enemy_lost_tourist.png             [ ]
    enemy_the_mailman.png              [ ]
    enemy_the_substitute_teacher.png   [ ]
    enemy_the_personal_trainer.png     [ ]
    enemy_ultimate_hoa_president.png   [ ]

  relics/                       (1:1 square, recommended 512×512)
    relic_lucky_penny.png          [ ]
    relic_travel_mug.png           [ ]
    relic_pocket_square.png        [ ]
    relic_lawn_flag.png            [ ]
    relic_coupon_book.png          [ ]
    relic_reading_glasses.png      [ ]
    relic_pedometer.png            [ ]
    relic_house_keys.png           [ ]
    relic_loud_lawn_mower.png      [ ]
    relic_insulated_lunchbox.png   [ ]
    relic_snake_plant.png          [ ]
    relic_the_manual.png           [ ]
    relic_property_deed.png        [ ]
    relic_espresso_machine.png     [ ]
    relic_power_suit.png           [ ]
    relic_the_trophy.png           [ ]
    relic_riding_mower_keys.png    [ ]
    relic_the_megaphone.png        [ ]
    relic_the_master_plan.png      [ ]
    relic_endless_inbox.png        [ ]
```

**Asset totals:** 3 characters + 78 cards + 12 enemies + 20 relics = **113 images.**

UI elements (energy icon, health-heart icon, block-shield icon, status-effect icons, card frame, intent icons, gold icon, energy display, end-turn button) are NOT in the manifest — they are generated in code as inline SVG / CSS in Phase 2. Don't generate art for those.

---

## 5. Phase 1 Status

**Phase 1 deliverable:** This document.

**Architecture (confirmed):** Dad Arcade is a static HTML/JS site. Phase 2 will build Dad Quest at `/dad-quest/index.html` using **vanilla ES modules** organized into a proper folder structure — no React, no Next.js, no build step. The architectural goal (separation of concerns, reusable engine modules for the next game) is achieved in vanilla JS via per-concern files and ES module imports. Provisional structure:

```
/dad-quest/
  index.html                  (shell + <canvas> + DOM scene container)
  main.js                     (entry; bootstraps loader + initial scene)
  engine/
    gameState.js              (canonical state shape + reducer-style mutations)
    combat.js                 (pure functions: applyCard, enemyTurn, endTurn, resolveDamage)
    deck.js                   (shuffle, draw, discard, exhaust)
    statusEffects.js          (apply / tick / expire)
    rewards.js                (post-combat reward generation)
    sceneManager.js           (scene swap + history)
  ai/
    enemyAI.js                (intent selection — deterministic / weighted patterns)
  data/
    cards.js                  (all card definitions)
    enemies.js                (all enemy definitions)
    relics.js                 (all relic definitions)
    characters.js             (all character definitions)
    events.js                 (random event definitions)
  procgen/
    mapGenerator.js           (branching map graph)
  saves/
    saveState.js              (localStorage save/load, single active run)
  assets/
    assetManifest.js          (string constants; no hardcoded paths in scenes)
    assetLoader.js            (preloader with progress bar, image cache)
  scenes/
    characterSelect.js
    map.js
    combat.js
    reward.js
    shop.js
    event.js
    rest.js
    gameOver.js
    victory.js
  ui/
    cardFrame.js              (renders the card frame + text over loaded card art)
    healthBar.js
    blockIndicator.js
    statusIcons.js
    relicTray.js
    deckViewer.js
  styles/
    dad-quest.css
  assets/                     (Kevin's generated images — see § 4 manifest)
    characters/ cards/ enemies/ relics/
```

Combat scene → `<canvas>` (smooth animations, particle effects). Map / shop / event / character-select scenes → DOM (clickable nodes, easier text rendering, accessible). Scene manager swaps which root element is active.

**Stop instruction:** Phase 2 (code build) starts when art is generated and dropped into `/dad-quest/assets/`. Phase 2 will spot-check 5 random files from the manifest before beginning, and will pause if anything is missing.

**Estimated art generation time:** at ~30 seconds per Midjourney generation (single attempt, no re-rolls), 113 images ≈ **57 minutes of pure generation time**. Realistic with re-rolls and selection: **3–5 hours of focused work**. Consider batching by category — characters first (3), then enemies (12), then cards by character (Hank → Doug → Brenda → Shared), then relics last.

**Tip on style consistency:** Midjourney's `--sref` (style reference) flag locks style across generations. After your first 1–3 successful images, grab their image URLs and append `--sref <url1> <url2>` to every subsequent prompt. This will dramatically tighten cross-card consistency beyond what the text prefix alone can do.
