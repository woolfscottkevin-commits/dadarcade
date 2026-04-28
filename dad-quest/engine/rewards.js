// Card and gold reward generation.
// DESIGN.md § 1.1 sets the gold ranges. Card rarity weights are documented below.

import { CARDS } from "../data/cards.js";
import { RELICS } from "../data/relics.js";
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

export function shopPriceModifier() {
  return gameState.run.relics.includes("coupon_book") ? 0.8 : 1;
}

export function pricedAmount(base) {
  return Math.max(1, Math.floor(base * shopPriceModifier()));
}

export function cardShopPrice(card) {
  const base = card.rarity === "rare"
    ? 150 + Math.floor(Math.random() * 51)
    : card.rarity === "uncommon"
      ? 75 + Math.floor(Math.random() * 76)
      : 50 + Math.floor(Math.random() * 51);
  return pricedAmount(base);
}

export function relicShopPrice(relic) {
  const base = relic.rarity === "boss"
    ? 300
    : relic.rarity === "rare"
      ? 220 + Math.floor(Math.random() * 81)
      : relic.rarity === "uncommon"
        ? 175 + Math.floor(Math.random() * 51)
        : 150 + Math.floor(Math.random() * 51);
  return pricedAmount(base);
}

export function removeCardPrice() {
  return pricedAmount(75);
}

export function generateShopInventory(character) {
  const eligibleCards = CARDS.filter((c) => {
    if (BASIC_CARDS.has(c.id)) return false;
    if (c.character !== character && c.character !== "shared") return false;
    return c.type !== "status";
  });
  const cardItems = [];
  const cardTaken = new Set();
  while (cardItems.length < 5 && cardTaken.size < eligibleCards.length) {
    const card = rngPick(eligibleCards);
    if (!card || cardTaken.has(card.id)) continue;
    cardTaken.add(card.id);
    cardItems.push({ cardId: card.id, price: cardShopPrice(card), sold: false });
  }

  const owned = new Set(gameState.run.relics);
  const eligibleRelics = RELICS.filter((r) => !owned.has(r.id));
  const relicItems = [];
  const relicTaken = new Set();
  while (relicItems.length < 3 && relicTaken.size < eligibleRelics.length) {
    const relic = rngPick(eligibleRelics);
    if (!relic || relicTaken.has(relic.id)) continue;
    relicTaken.add(relic.id);
    relicItems.push({ relicId: relic.id, price: relicShopPrice(relic), sold: false });
  }

  return { cards: cardItems, relics: relicItems, removalPrice: removeCardPrice(), removedCard: false };
}

export function generateRelicRewards(count = 3, includeBoss = false) {
  const owned = new Set(gameState.run.relics);
  const pool = RELICS.filter((r) => !owned.has(r.id) && (includeBoss || r.rarity !== "boss"));
  const rewards = [];
  const taken = new Set();
  while (rewards.length < count && taken.size < pool.length) {
    const relic = rngPick(pool);
    if (!relic || taken.has(relic.id)) continue;
    taken.add(relic.id);
    rewards.push(relic.id);
  }
  return rewards;
}
