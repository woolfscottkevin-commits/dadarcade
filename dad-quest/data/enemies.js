// All enemy definitions for Dad Quest, transcribed from DESIGN.md § 1.5.
// 8 normals + 3 elites + 1 boss = 12 enemies.
// Phase 2 wires intent execution; this file is data only.
//
// intent.type values: "attack" | "block" | "buff" | "debuff" | "special"
// intent.value     : numeric (damage, block, status stacks, etc.)
// intent.hits      : optional, for multi-hit attacks (defaults to 1)
// intent.label     : human-readable name shown above the enemy
// intent.weight    : optional, only for intentMode "weighted" (sums to 100)
// intent.status    : optional, status name applied (vulnerable | weak | strength)
// intent.targetSelf: optional bool — buff/block intents that affect the enemy itself
// intent.special   : optional string identifier for one-off behaviors (Phase 2 dispatches on this)

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
      { type: "block", value: 8, label: "Pressurize", weight: 40, targetSelf: true },
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
      { type: "attack", value: 4, label: "Pitch", status: "weak", statusValue: 2 },
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
      { type: "attack", value: 5, label: "Complain", status: "vulnerable", statusValue: 2, weight: 40 },
      { type: "attack", value: 10, label: "Escalate", weight: 30 },
      { type: "block", value: 6, label: "Brandish Phone", weight: 30, targetSelf: true },
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
      { type: "debuff", label: "Bark", status: "weak", statusValue: 2 },
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
      { type: "attack", value: 3, label: "Whisper", special: "discard_random:1" },
      { type: "debuff", label: "Spread Rumor", status: "vulnerable", statusValue: 3 },
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
      { type: "special", label: "Recruit", special: "summon_once:aggressive_roomba" },
      { type: "attack", value: 9, label: "Hard Sell" },
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
      { type: "attack", value: 4, label: "Confused Wander", special: "also_damage_random_enemy:4" },
      { type: "block", value: 10, label: "Panic", targetSelf: true },
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
      { type: "attack", value: 6, label: "Certified Letter", status: "vulnerable", statusValue: 2 },
      { type: "block", value: 12, label: "Dog Defense", targetSelf: true },
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
      { type: "attack", value: 10, label: "Pop Quiz", special: "draw_minus_2_next_turn" },
      { type: "attack", value: 18, label: "Detention" },
      { type: "block", value: 12, label: "Lecture", status: "weak", statusValue: 2, targetSelf: true },
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
      { type: "buff", label: "Power Lift Setup", special: "gain_strength:5,gain_block:6", targetSelf: true },
      { type: "attack", value: 25, label: "Power Lift Release" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_the_personal_trainer.png",
  },

  // ------------------------------------------------------------------
  // FINAL BOSS (1)
  // HP scales across acts in v1: Act 1 = 110, Act 2 = 175, Act 3 = 250.
  // Phase 2/3 wires the scaling.
  // ------------------------------------------------------------------
  {
    id: "ultimate_hoa_president",
    name: "The Ultimate HOA President",
    hp: 250,
    tier: "boss",
    acts: [3],
    intentPattern: [
      { type: "debuff", label: "Pass New Bylaw", special: "apply:vulnerable:2,apply:weak:2" },
      { type: "attack", value: 8, hits: 3, label: "Citation Barrage" },
      { type: "buff", label: "Call Emergency Meeting", special: "heal:20,gain_strength:4", targetSelf: true },
      { type: "attack", value: 30, label: "Final Summons", special: "telegraphed_one_turn_ahead" },
    ],
    intentMode: "cycle",
    art: "assets/enemies/enemy_ultimate_hoa_president.png",
  },
];
