// Combat turn loop for Dad Quest.
// Implements the canonical tick order from DESIGN.md § 1.4, with Phase 3
// extensions:
//   - Multi-enemy combat (Pyramid Schemer + summoned Roomba)
//   - All new intent types (attack_with_status, apply_status, attack_and_disrupt,
//     attack_with_modifier, block_and_status, summon, aoe_attack, self_buff,
//     heal_and_buff, apply_status_aoe_to_player, attack_telegraphed)
//   - Boss HP scales by act (110/175/250)
//   - Player-side next-turn modifiers (draw_minus from Pop Quiz)
//   - Victory/defeat resolution: victory wins ties (e.g., Weekend Warrior kills
//     last enemy AND drops player to 0 HP → victory).
//
// Tick order (matches DESIGN.md § 1.4 exactly):
//   1. Start of player turn:
//        a. drain queued "next turn" effects
//        b. fire `on_turn_start` triggers
//        c. reset per-turn flags
//        d. compute draw count: 5 minus any active draw_minus modifiers (floor at 1)
//        e. tick down each modifier's duration; remove expired
//        f. draw N cards
//        g. gain 3 energy
//   2. Player plays cards. After each card play, check victory FIRST then defeat.
//   3. Player ends turn → fire on_turn_end → Doug Jitters (Caffeine > 5 → take excess) → discard hand → tick player statuses
//   4. Enemy turn → each enemy resolves intent in display order; check defeat after each hit
//      Summoned-this-turn enemies skip their first turn (so the player has a chance to plan).
//   5. Enemy end-of-turn → tick enemy statuses → roll next intent
//   6. Goto 1.

import { gameState } from "./gameState.js";
import { CARDS } from "../data/cards.js";
import { ENEMIES, BOSS_HP_BY_ACT } from "../data/enemies.js";
import { CHARACTERS } from "../data/characters.js";
import {
  STATUS,
  applyStatus,
  setStatus,
  getStatus,
  tickStatuses,
  resolveDamage,
  selfDamage,
  applyDamageToTarget,
} from "./statusEffects.js";
import {
  createCombatDeck,
  drawCards,
  discardHand,
  discardCard,
  exhaustCard,
  returnExhaustToDeck,
} from "./deck.js";
import { executeEffect, fireTriggers } from "./effectExecutor.js";
import { selectIntent } from "../ai/enemyAI.js";

const HAND_SIZE = 5;
const MAX_ENERGY = 3;
let listener = null;

export function setCombatListener(fn) {
  listener = fn;
}

function notify(eventName, payload) {
  if (listener) listener(eventName, payload);
}

// ------------------------------------------------------------------
// Combat lifecycle
// ------------------------------------------------------------------

function makeEnemyInstance(def, options = {}) {
  let hp = def.hp;
  let maxHp = def.hp;
  // Boss HP scaling per act
  if (def.tier === "boss") {
    const scaled = BOSS_HP_BY_ACT[gameState.run.act] || def.hp;
    hp = scaled;
    maxHp = scaled;
  }
  return {
    id: def.id,
    name: def.name,
    art: def.art,
    tier: def.tier,
    hp,
    maxHp,
    statuses: {},
    intentPattern: def.intentPattern,
    intentMode: def.intentMode,
    patternIndex: 0,
    nextIntent: null,
    oncePerCombatFired: new Set(),
    spawnedThisTurn: !!options.spawnedThisTurn,
  };
}

export function startCombat(enemyIds) {
  const ch = CHARACTERS.find((c) => c.id === gameState.run.character);
  if (!ch) throw new Error("startCombat: no character selected");

  const enemies = enemyIds.map((id) => {
    const def = ENEMIES.find((e) => e.id === id);
    if (!def) throw new Error(`Unknown enemy: ${id}`);
    return makeEnemyInstance(def);
  });

  const player = {
    character: ch.id,
    hp: gameState.run.hp,
    maxHp: gameState.run.maxHp,
    statuses: {},
    nextTurnModifiers: [],
  };

  const piles = createCombatDeck(gameState.run.deck);

  const isBoss = enemies.some((e) => e.tier === "boss");

  gameState.combat = {
    player,
    enemies,
    piles,
    energy: 0,
    maxEnergy: MAX_ENERGY,
    turn: 0,
    targetIndex: 0,
    isBoss,
    triggers: {
      on_play_skill: [],
      on_gain_caffeine: [],
      on_third_card: [],
      on_fourth_card: [],
      on_turn_start: [],
      on_turn_end: [],
      passive: [],
    },
    flags: {
      cardsPlayedThisTurn: 0,
      gainedCaffeineThisTurn: false,
      appliedCitationThisTurn: false,
      citationsAppliedThisCombat: 0,
      damageTakenThisTurn: 0,
      firstDamagePreventThisTurn: false,
      nextCitationCardCostsZero: false,
      costZeroThisTurn: new Set(),
    },
    queuedNextTurnEffects: [],
    cardEffectOverrides: new Map(),
    run: gameState.run,
    pendingOutcome: null,
  };

  for (const e of gameState.combat.enemies) {
    e.nextIntent = selectIntent(e);
    advanceUntilExecutable(e);
  }

  applyCombatStartRelics();
  startPlayerTurn();
}

// If an enemy's current intent is something like "summon, oncePerCombat" that
// has already fired this combat, advance to the next valid intent. We do this
// at start so we don't show a stale "Recruit" intent when the Schemer should
// be on Hard Sell forever after.
function advanceUntilExecutable(enemy) {
  if (enemy.intentMode !== "cycle") return;
  let safety = 8;
  while (safety-- > 0) {
    const intent = enemy.nextIntent;
    if (!intent) return;
    if (intent.oncePerCombat && enemy.oncePerCombatFired.has(intent.label)) {
      enemy.nextIntent = selectIntent(enemy);
      continue;
    }
    return;
  }
}

function applyCombatStartRelics() {
  const c = gameState.combat;
  const relicSet = new Set(gameState.run.relics);

  if (relicSet.has("travel_mug") && c.player.character === "doug") {
    // Relic-granted Caffeine bypasses on_gain_caffeine triggers (Phase 2 ruling).
    applyStatus(c.player, STATUS.CAFFEINE, 2);
  }
  // Other 17 relics defined-but-inert — Phase 4 wires them.
}

export function startPlayerTurn() {
  const c = gameState.combat;
  c.turn += 1;

  // Reset per-turn flags
  c.flags.cardsPlayedThisTurn = 0;
  c.flags.gainedCaffeineThisTurn = false;
  c.flags.appliedCitationThisTurn = false;
  c.flags.damageTakenThisTurn = 0;
  c.flags.firstDamagePreventThisTurn = false;
  c.flags.costZeroThisTurn = new Set();

  // Drain queued next-turn effects
  const queued = c.queuedNextTurnEffects.slice();
  c.queuedNextTurnEffects = [];
  for (const eff of queued) executeEffect(eff, makeCtx());

  // on_turn_start triggers
  fireTriggers("on_turn_start", makeCtx());

  // Compute draw count, then tick modifier durations
  let drawCount = HAND_SIZE;
  for (const m of c.player.nextTurnModifiers) {
    if (m.type === "draw_minus") drawCount -= m.amount;
  }
  drawCount = Math.max(1, drawCount); // floor at 1

  // Decrement durations and remove expired
  for (const m of c.player.nextTurnModifiers) m.duration -= 1;
  c.player.nextTurnModifiers = c.player.nextTurnModifiers.filter((m) => m.duration > 0);

  drawCards(c.piles, drawCount);
  c.energy = c.maxEnergy;

  // Spawned-this-turn enemies are now allowed to act next enemy turn.
  for (const e of c.enemies) e.spawnedThisTurn = false;

  notify("turnStart", { turn: c.turn });
}

export function getEffectiveCost(cardInst) {
  const c = gameState.combat;
  const def = CARDS.find((d) => d.id === cardInst.cardId);
  if (!def) return 0;
  if (c.flags.costZeroThisTurn.has(cardInst.uuid)) return 0;
  return def.cost;
}

function isTargetingCard(def) {
  // Single-target attacks need a target. AOE / self / status-all cards don't.
  if (!def.effect) return false;
  if (def.effect.startsWith("scaling:")) return true;
  if (def.effect.startsWith("deal_damage:")) return true;
  if (def.effect.startsWith("compound:")) {
    // If any sub-effect is single-target, we need a target. Simple heuristic:
    return /\bdeal_damage:\d+/.test(def.effect) || /\bapply:[a-z_]+:\d+/.test(def.effect);
  }
  if (def.effect.startsWith("conditional:")) {
    return /\bdeal_damage:\d+/.test(def.effect) || /\bapply:[a-z_]+:\d+/.test(def.effect);
  }
  if (def.effect.startsWith("apply:")) return true;
  return false;
}

export function canPlayCard(cardInst) {
  const c = gameState.combat;
  if (!c) return false;
  const def = CARDS.find((d) => d.id === cardInst.cardId);
  if (!def) return false;
  if (def.effect === "unplayable") return false;
  if (getEffectiveCost(cardInst) > c.energy) return false;
  return true;
}

export function needsTarget(cardInst) {
  const def = CARDS.find((d) => d.id === cardInst.cardId);
  if (!def) return false;
  return isTargetingCard(def);
}

export function setTarget(idx) {
  const c = gameState.combat;
  if (!c) return;
  const e = c.enemies[idx];
  if (e && e.hp > 0) c.targetIndex = idx;
}

// Auto-fix target if stale (previously targeted enemy is dead).
function ensureLiveTarget() {
  const c = gameState.combat;
  if (!c.enemies[c.targetIndex] || c.enemies[c.targetIndex].hp <= 0) {
    const idx = c.enemies.findIndex((e) => e.hp > 0);
    if (idx >= 0) c.targetIndex = idx;
  }
}

export function playCard(cardInst, targetIndex) {
  const c = gameState.combat;
  if (!c) return { ok: false, reason: "no combat" };
  const def = CARDS.find((d) => d.id === cardInst.cardId);
  if (!def) return { ok: false, reason: "unknown card" };

  if (def.effect === "unplayable") {
    notify("cardRejected", { cardInst, reason: "unplayable" });
    return { ok: false, reason: "unplayable" };
  }

  if (typeof targetIndex === "number") c.targetIndex = targetIndex;
  ensureLiveTarget();

  const cost = getEffectiveCost(cardInst);
  if (cost > c.energy) {
    notify("cardRejected", { cardInst, reason: "energy" });
    return { ok: false, reason: "energy" };
  }

  c.energy -= cost;
  c.flags.cardsPlayedThisTurn += 1;

  const ctx = makeCtx({ sourceCard: cardInst });

  const override = c.cardEffectOverrides.get(cardInst.uuid);
  const effect = override || def.effect;
  executeEffect(effect, ctx);

  if (def.type === "skill") fireTriggers("on_play_skill", ctx);
  if (c.flags.cardsPlayedThisTurn === 3) fireTriggers("on_third_card", ctx);
  if (c.flags.cardsPlayedThisTurn === 4) fireTriggers("on_fourth_card", ctx);

  if (def.type === "power") {
    exhaustCard(c.piles, cardInst);
  } else if (def.exhaust) {
    exhaustCard(c.piles, cardInst);
  } else {
    discardCard(c.piles, cardInst);
  }

  notify("cardPlayed", { cardInst, def });

  // Victory/defeat resolution: victory wins ties.
  if (allEnemiesDead()) {
    finalizeOutcome("victory");
    return { ok: true, victory: true };
  }
  if (c.player.hp <= 0) {
    finalizeOutcome("defeat");
    return { ok: true, defeat: true };
  }
  return { ok: true };
}

export function endPlayerTurn() {
  const c = gameState.combat;
  if (!c) return;
  if (c.pendingOutcome) return;

  fireTriggers("on_turn_end", makeCtx());

  // Doug's Jitters tax
  if (c.player.character === "doug") {
    const caffeine = getStatus(c.player, STATUS.CAFFEINE);
    if (caffeine > 5) {
      const jitters = caffeine - 5;
      const before = c.player.hp;
      selfDamage(c.player, jitters);
      c.flags.damageTakenThisTurn += (before - c.player.hp);
      notify("jittersTax", { amount: jitters });
    }
  }

  discardHand(c.piles);
  tickStatuses(c.player, "playerTurnEnd");

  // Check victory FIRST in case some end-of-turn power killed an enemy.
  if (allEnemiesDead()) {
    finalizeOutcome("victory");
    return;
  }
  if (c.player.hp <= 0) {
    finalizeOutcome("defeat");
    return;
  }

  runEnemyTurn();

  if (c.pendingOutcome) return;

  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    tickStatuses(e, "enemyTurnEnd");
    e.nextIntent = selectIntent(e);
    advanceUntilExecutable(e);
  }

  startPlayerTurn();
}

export function runEnemyTurn() {
  const c = gameState.combat;
  for (const enemy of c.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.spawnedThisTurn) continue; // skip first turn after summon
    resolveEnemyIntent(enemy);
    if (allEnemiesDead()) {
      finalizeOutcome("victory");
      return;
    }
    if (c.player.hp <= 0) {
      finalizeOutcome("defeat");
      return;
    }
  }
}

function resolveEnemyIntent(enemy) {
  const c = gameState.combat;
  const intent = enemy.nextIntent;
  if (!intent) return;
  notify("enemyIntent", { enemy, intent });

  switch (intent.type) {
    case "attack":
    case "attack_telegraphed": {
      const hits = intent.hits || 1;
      for (let i = 0; i < hits; i++) {
        if (c.player.hp <= 0) break;
        if (c.flags.firstDamagePreventThisTurn) {
          c.flags.firstDamagePreventThisTurn = false;
          continue;
        }
        const result = resolveDamage(enemy, c.player, intent.value || 0);
        c.flags.damageTakenThisTurn += result.hpLost;
        notify("playerHit", { enemy, result });
      }
      break;
    }
    case "block": {
      applyStatus(enemy, STATUS.BLOCK, intent.value || 0);
      break;
    }
    case "attack_with_status": {
      const hits = intent.hits || 1;
      for (let i = 0; i < hits; i++) {
        if (c.player.hp <= 0) break;
        if (c.flags.firstDamagePreventThisTurn) {
          c.flags.firstDamagePreventThisTurn = false;
          continue;
        }
        const result = resolveDamage(enemy, c.player, intent.value || 0);
        c.flags.damageTakenThisTurn += result.hpLost;
        notify("playerHit", { enemy, result });
      }
      if (c.player.hp > 0 && intent.status) {
        applyStatus(c.player, intent.status, intent.stacks || 1);
      }
      break;
    }
    case "apply_status": {
      if (intent.status) applyStatus(c.player, intent.status, intent.stacks || 1);
      break;
    }
    case "attack_and_disrupt": {
      if (c.flags.firstDamagePreventThisTurn) {
        c.flags.firstDamagePreventThisTurn = false;
      } else {
        const result = resolveDamage(enemy, c.player, intent.value || 0);
        c.flags.damageTakenThisTurn += result.hpLost;
        notify("playerHit", { enemy, result });
      }
      if (c.player.hp > 0 && intent.disrupt === "discard_random_card") {
        const hand = c.piles.hand;
        if (hand.length > 0) {
          const idx = Math.floor(Math.random() * hand.length);
          const [card] = hand.splice(idx, 1);
          c.piles.discardPile.push(card);
          notify("playerDiscardForced", { card });
        }
      }
      break;
    }
    case "attack_with_modifier": {
      if (c.flags.firstDamagePreventThisTurn) {
        c.flags.firstDamagePreventThisTurn = false;
      } else {
        const result = resolveDamage(enemy, c.player, intent.value || 0);
        c.flags.damageTakenThisTurn += result.hpLost;
        notify("playerHit", { enemy, result });
      }
      if (intent.modifier === "draw_minus" && c.player.hp > 0) {
        c.player.nextTurnModifiers.push({
          type: "draw_minus",
          amount: intent.amount || 2,
          duration: (intent.duration || 1) + 1, // +1 because we tick it down at next turn start
        });
      }
      break;
    }
    case "block_and_status": {
      applyStatus(enemy, STATUS.BLOCK, intent.value || 0);
      if (intent.status) applyStatus(c.player, intent.status, intent.stacks || 1);
      break;
    }
    case "summon": {
      const key = intent.label || "summon";
      if (intent.oncePerCombat && enemy.oncePerCombatFired.has(key)) break;
      const def = ENEMIES.find((e) => e.id === intent.enemy);
      if (def) {
        const inst = makeEnemyInstance(def, { spawnedThisTurn: true });
        inst.nextIntent = selectIntent(inst);
        c.enemies.push(inst);
        notify("enemySpawned", { enemy: inst });
      }
      enemy.oncePerCombatFired.add(key);
      break;
    }
    case "aoe_attack": {
      // Hit player
      if (c.flags.firstDamagePreventThisTurn) {
        c.flags.firstDamagePreventThisTurn = false;
      } else {
        const result = resolveDamage(enemy, c.player, intent.value || 0);
        c.flags.damageTakenThisTurn += result.hpLost;
        notify("playerHit", { enemy, result });
      }
      // Hit a random other alive enemy
      const others = c.enemies.filter((e) => e !== enemy && e.hp > 0);
      if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)];
        // Source-less damage (Lost Tourist isn't really "the attacker" in a strength sense for friendly fire)
        applyDamageToTarget(target, intent.value || 0);
        notify("enemyHit", { target, amount: intent.value });
      }
      break;
    }
    case "self_buff": {
      if (intent.strength) applyStatus(enemy, STATUS.STRENGTH, intent.strength);
      if (intent.block) applyStatus(enemy, STATUS.BLOCK, intent.block);
      break;
    }
    case "heal_and_buff": {
      if (intent.heal) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + intent.heal);
      }
      if (intent.strength) applyStatus(enemy, STATUS.STRENGTH, intent.strength);
      break;
    }
    case "apply_status_aoe_to_player": {
      const list = intent.statuses || [];
      for (const s of list) applyStatus(c.player, s.status, s.stacks || 1);
      break;
    }
    default:
      // Legacy types from older Phase 1/2 data — keep tolerant.
      if (intent.type === "buff" || intent.type === "debuff") {
        if (intent.status) applyStatus(c.player, intent.status, intent.statusValue || 1);
      }
      break;
  }

  // Mark once-per-combat fired
  if (intent.oncePerCombat && intent.label) {
    enemy.oncePerCombatFired.add(intent.label);
  }
}

function allEnemiesDead() {
  return gameState.combat.enemies.every((e) => e.hp <= 0);
}

function finalizeOutcome(outcome) {
  const c = gameState.combat;
  if (c.pendingOutcome) return;
  c.pendingOutcome = outcome;
  endCombat(outcome);
}

export function endCombat(outcome) {
  const c = gameState.combat;
  if (!c) return;
  gameState.run.hp = Math.max(0, c.player.hp);
  returnExhaustToDeck(c.piles, gameState.run.deck);
  if (outcome === "victory") gameState.run.combatsWon += 1;
  notify("combatEnd", { outcome });
}

function makeCtx(extra) {
  return Object.assign({
    combat: gameState.combat,
    targetIndex: gameState.combat.targetIndex,
  }, extra || {});
}

export function getCombat() { return gameState.combat; }

// Helper for the renderer: returns the next intent in the cycle for telegraph
// preview. For weighted enemies, returns null since we can't peek deterministically.
export function peekNextIntent(enemy) {
  if (enemy.intentMode !== "cycle") return null;
  const pattern = enemy.intentPattern || [];
  if (pattern.length === 0) return null;
  // selectIntent already advanced patternIndex when nextIntent was set, so
  // patternIndex points at the *next* intent that will be returned.
  let probeIdx = enemy.patternIndex;
  let safety = pattern.length + 2;
  while (safety-- > 0) {
    const candidate = pattern[probeIdx % pattern.length];
    if (candidate.oncePerCombat && enemy.oncePerCombatFired.has(candidate.label)) {
      probeIdx += 1;
      continue;
    }
    return candidate;
  }
  return null;
}
