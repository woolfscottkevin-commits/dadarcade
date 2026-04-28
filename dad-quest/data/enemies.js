// All enemy definitions for Dad Quest, transcribed from DESIGN.md § 1.5.
// 8 normals + 3 elites + 1 boss = 12 enemies.
//
// Phase 3 schema (data migration from Phase 1/2):
//   intent.type values:
//     "attack"                     simple damage; uses .value, optional .hits
//     "block"                      gain block on self; .value
//     "attack_with_status"         damage + apply status to player; .value, .status, .stacks
//     "apply_status"               apply status to player only; .status, .stacks
//     "attack_and_disrupt"         attack + disruptive effect; .value, .disrupt (e.g. "discard_random_card")
//     "attack_with_modifier"       attack + a player-side modifier next turn; .value, .modifier, .amount, .duration
//                                  (modifier values: "draw_minus")
//     "block_and_status"           gain block + apply status to player; .value, .status, .stacks
//     "summon"                     spawn a new enemy mid-combat; .enemy, .oncePerCombat
//     "aoe_attack"                 attack player AND another enemy; .value, .target ("player_and_other_enemy")
//     "self_buff"                  gain self-status; .strength, .block (combine as needed)
//     "heal_and_buff"              heal self + apply self status; .heal, .strength
//     "apply_status_aoe_to_player" multiple statuses to player at once; .statuses [{status, stacks}, ...]
//     "attack_telegraphed"         normal attack, but flagged so the prior turn renders a "⚠ NEXT TURN" badge
//                                  (set telegraphedFromPrevious: true on the intent)
//   intent.label    human-readable text shown above the enemy
//   intent.weight   only for intentMode "weighted"; sum across pattern == 100
//
// intentMode: "cycle" (deterministic loop) | "weighted" (% chance per item).

export const ENEMIES = [
  // ------------------------------------------------------------------
  // NORMAL ENEMIES (8) — Acts 1-2
  // ------------------------------------------------------------------
  {
    id: "aggressive_roomba",
    name: "Aggressive Roomba",
    hp: 18,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "attack", value: 6, label: "Bump" },
      { type: "attack", value: 9, label: "Charge" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_aggressive_roomba.png",
  },
  {
    id: "sprinkler_sentry",
    name: "Sprinkler Sentry",
    hp: 22,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "attack", value: 3, hits: 3, label: "Spray", weight: 60 },
      { type: "block", value: 8, label: "Pressurize", weight: 40 },
    ],
    intentMode: "weighted",
    art: "assets/enemies/enemy_sprinkler_sentry.png",
  },
  {
    id: "door_to_door_salesman",
    name: "Door-to-Door Salesman",
    hp: 25,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "attack_with_status", value: 4, status: "weak", stacks: 2, label: "Pitch" },
      { type: "attack", value: 8, label: "Hard Sell" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_door_to_door_salesman.png",
  },
  {
    id: "karen_manager",
    name: "Karen Manager",
    hp: 28,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "attack_with_status", value: 5, status: "vulnerable", stacks: 2, label: "Complain", weight: 40 },
      { type: "attack", value: 10, label: "Escalate", weight: 30 },
      { type: "block", value: 6, label: "Brandish Phone", weight: 30 },
    ],
    intentMode: "weighted",
    art: "assets/enemies/enemy_karen_manager.png",
  },
  {
    id: "yappy_dog",
    name: "Yappy Dog",
    hp: 14,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "apply_status", status: "weak", stacks: 2, label: "Bark" },
      { type: "attack", value: 4, hits: 2, label: "Nip" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_yappy_dog.png",
  },
  {
    id: "gossip_neighbor",
    name: "Gossip Neighbor",
    hp: 20,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "attack_and_disrupt", value: 3, disrupt: "discard_random_card", label: "Whisper" },
      { type: "apply_status", status: "vulnerable", stacks: 3, label: "Spread Rumor" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_gossip_neighbor.png",
  },
  {
    id: "pyramid_schemer",
    name: "Pyramid Schemer",
    hp: 30,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "summon", enemy: "aggressive_roomba", oncePerCombat: true, label: "Recruit" },
      { type: "attack", value: 9, label: "Hard Sell" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_pyramid_schemer.png",
  },
  {
    id: "lost_tourist",
    name: "Lost Tourist",
    hp: 18,
    tier: "normal",
    acts: [1, 2],
    intentPattern: [
      { type: "aoe_attack", value: 4, target: "player_and_other_enemy", label: "Confused Wander" },
      { type: "block", value: 10, label: "Panic" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_lost_tourist.png",
  },

  // ------------------------------------------------------------------
  // ELITES (3)
  // ------------------------------------------------------------------
  {
    id: "the_mailman",
    name: "The Mailman",
    hp: 60,
    tier: "elite",
    acts: [1, 2],
    intentPattern: [
      { type: "attack", value: 14, label: "Package Delivery" },
      { type: "attack_with_status", value: 6, status: "vulnerable", stacks: 2, label: "Certified Letter" },
      { type: "block", value: 12, label: "Dog Defense" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_the_mailman.png",
  },
  {
    id: "the_substitute_teacher",
    name: "The Substitute Teacher",
    hp: 70,
    tier: "elite",
    acts: [1, 2],
    intentPattern: [
      { type: "attack_with_modifier", value: 10, modifier: "draw_minus", amount: 2, duration: 1, label: "Pop Quiz" },
      { type: "attack", value: 18, label: "Detention" },
      { type: "block_and_status", value: 12, status: "weak", stacks: 2, label: "Lecture" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_the_substitute_teacher.png",
  },
  {
    id: "the_personal_trainer",
    name: "The Personal Trainer",
    hp: 80,
    tier: "elite",
    acts: [1, 2],
    intentPattern: [
      { type: "attack", value: 4, hits: 4, label: "Burpees" },
      { type: "self_buff", strength: 5, block: 6, label: "Power Lift Setup" },
      { type: "attack", value: 25, label: "Power Lift Release" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_the_personal_trainer.png",
  },

  // ------------------------------------------------------------------
  // FINAL BOSS (1)
  // HP scales across acts in v1: Act 1 = 110, Act 2 = 175, Act 3 = 250.
  // The boss-combat-start path (engine/combat.js) overrides hp/maxHp based on run.act.
  // ------------------------------------------------------------------
  {
    id: "ultimate_hoa_president",
    name: "The Ultimate HOA President",
    hp: 250,
    tier: "boss",
    acts: [1, 2, 3],
    intentPattern: [
      { type: "apply_status_aoe_to_player",
        statuses: [{ status: "vulnerable", stacks: 2 }, { status: "weak", stacks: 2 }],
        label: "Pass New Bylaw" },
      { type: "attack", value: 8, hits: 3, label: "Citation Barrage" },
      { type: "heal_and_buff", heal: 20, strength: 4, label: "Call Emergency Meeting" },
      { type: "attack_telegraphed", value: 30, label: "Final Summons", telegraphedFromPrevious: true },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_ultimate_hoa_president.png",
  },
];

export const BOSS_HP_BY_ACT = { 1: 110, 2: 175, 3: 250 };
