// Card and gold reward generation.
// DESIGN.md § 1.1 sets the gold ranges. Card rarity weights are documented below.

import { CARDS } from "../data/cards.js";
import { gameState } from "./gameState.js";

// Base rarity weights (sum to 100):
//   common 60, uncommon 33, rare 7
// Elite +5% rare, Boss +10% rare (boss = 50/33/17). The "starter" rarity
// (basic Strike/Defend) is not in the reward pool at all.
const BASE_WEIGHTS = { common: 60, uncommon: 33, rare: 7 };
const ELITE_WEIGHTS = { common: 55, uncommon: 33, rare: 12 };
const BOSS_WEIGHTS  = { common: 50, uncommon: 33, rare: 17 };

// Basic per-character cards excluded from rewards (each starter deck has 5+3 of these).
const BASIC_CARDS = new Set([
  "strike_hank", "strike_doug", "strike_brenda",
  "defend_hank", "defend_doug", "defend_brenda",
  "burnout",
]);

const OVERSTACK_THRESHOLD = 4; // Don't offer cards the player already owns 4+ of.

function rngPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function weightedPick(buckets) {
  // buckets: { common: [..], uncommon: [..], rare: [..] }, weights: BASE_WEIGHTS-style
  const weights = buckets._weights;
  const total = weights.common + weights.uncommon + weights.rare;
  let r = Math.random() * total;
  if (r < weights.common && buckets.common.length) return rngPick(buckets.common);
  r -= weights.common;
  if (r < weights.uncommon && buckets.uncommon.length) return rngPick(buckets.uncommon);
  if (buckets.rare.length) return rngPick(buckets.rare);
  // Fallback: any non-empty bucket
  if (buckets.uncommon.length) return rngPick(buckets.uncommon);
  if (buckets.common.length) return rngPick(buckets.common);
  return null;
}

export function generateCardRewards(combatTier, character) {
  const tier = combatTier || "normal";
  const weights = tier === "boss" ? BOSS_WEIGHTS : tier === "elite" ? ELITE_WEIGHTS : BASE_WEIGHTS;

  // Build owned-counts map for the over-stack filter.
  const ownedCount = new Map();
  for (const inst of gameState.run.deck) {
    ownedCount.set(inst.cardId, (ownedCount.get(inst.cardId) || 0) + 1);
  }

  // Eligible pool: same-character cards + shared, minus basics, minus 4+ stacks.
  const eligible = CARDS.filter((c) => {
    if (BASIC_CARDS.has(c.id)) return false;
    if (c.character !== character && c.character !== "shared") return false;
    if ((ownedCount.get(c.id) || 0) >= OVERSTACK_THRESHOLD) return false;
    return true;
  });

  const buckets = {
    common: eligible.filter((c) => c.rarity === "common"),
    uncommon: eligible.filter((c) => c.rarity === "uncommon"),
    rare: eligible.filter((c) => c.rarity === "rare"),
    _weights: weights,
  };

  const picked = [];
  const taken = new Set();
  for (let i = 0; i < 3; i++) {
    let attempts = 0;
    while (attempts++ < 24) {
      const cand = weightedPick(buckets);
      if (!cand) break;
      if (taken.has(cand.id)) continue;
      taken.add(cand.id);
      picked.push(cand.id);
      break;
    }
    // If we couldn't pick 3 distinct rewards (very small pool late-run), cap.
    if (picked.length <= i) break;
  }
  return picked;
}

export function awardGold(combatTier) {
  if (combatTier === "boss") return 50 + Math.floor(Math.random() * 16); // 50..65
  if (combatTier === "elite") return 25 + Math.floor(Math.random() * 11); // 25..35
  return 10 + Math.floor(Math.random() * 16); // 10..25
}
