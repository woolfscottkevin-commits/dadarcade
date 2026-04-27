// Combat turn loop for Dad Quest.
// Implements the canonical tick order from DESIGN.md § 1.4:
//   1. Start of player turn:
//        a. fire `on_turn_start` triggers
//        b. apply queued "next turn" effects (e.g., Pep Talk)
//        c. reset per-turn flags
//        d. draw 5 cards (+ relic/power bonuses)
//        e. gain 3 energy (or whatever max)
//   2. Player plays cards. After each card play, check victory.
//   3. Player ends turn:
//        a. fire `on_turn_end` triggers (Performance Bonus, Doug's Jitters tax via combat.js itself)
//        b. discard hand
//        c. tick player statuses (Block expires, Vulnerable/Weak decrement)
//   4. Enemy turn: each enemy resolves its current intent in display order.
//        Check defeat after every attack.
//   5. Enemy end-of-turn: tick enemy statuses; roll next intent for each enemy.
//   6. Goto 1.

import { gameState } from "./gameState.js";
import { CARDS } from "../data/cards.js";
import { ENEMIES } from "../data/enemies.js";
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
import { setScene } from "./sceneManager.js";

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

export function startCombat(enemyIds) {
  const ch = CHARACTERS.find((c) => c.id === gameState.run.character);
  if (!ch) throw new Error("startCombat: no character selected");

  const enemyDefs = enemyIds.map((id) => {
    const def = ENEMIES.find((e) => e.id === id);
    if (!def) throw new Error(`Unknown enemy: ${id}`);
    return def;
  });

  const enemies = enemyDefs.map((def) => ({
    id: def.id,
    name: def.name,
    art: def.art,
    hp: def.hp,
    maxHp: def.hp,
    statuses: {},
    intentPattern: def.intentPattern,
    intentMode: def.intentMode,
    patternIndex: 0,
    nextIntent: null,
  }));

  const player = {
    character: ch.id,
    hp: gameState.run.hp,
    maxHp: gameState.run.maxHp,
    statuses: {},
  };

  const piles = createCombatDeck(gameState.run.deck);

  gameState.combat = {
    player,
    enemies,
    piles,
    energy: 0,
    maxEnergy: MAX_ENERGY,
    turn: 0,
    targetIndex: 0,
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
    pendingOutcome: null, // "victory" | "defeat"
  };

  // Roll first intent for each enemy
  for (const e of gameState.combat.enemies) {
    e.nextIntent = selectIntent(e);
  }

  // Apply combat-start relic effects
  applyCombatStartRelics();

  // Begin turn 1
  startPlayerTurn();
}

function applyCombatStartRelics() {
  const c = gameState.combat;
  const relicSet = new Set(gameState.run.relics);

  // Travel Mug — Doug only this phase: gain 2 Caffeine.
  if (relicSet.has("travel_mug") && c.player.character === "doug") {
    applyStatus(c.player, STATUS.CAFFEINE, 2);
    // Note: we deliberately do NOT trigger on_gain_caffeine for the relic-granted
    // starting Caffeine — Caffeinated triggers only on in-combat gains via cards.
    // (DESIGN.md is silent; this is the friendlier reading and matches the
    //  Phase-2 prompt's Scenario B expectations.)
  }
  // Lucky Penny, Loud Lawn Mower, Snake Plant, Power Suit, Riding Mower Keys,
  // Master Plan, Endless Inbox: defined-but-inert in Phase 2 per the prompt.
}

export function startPlayerTurn() {
  const c = gameState.combat;
  c.turn += 1;

  // 1a. Reset per-turn flags
  c.flags.cardsPlayedThisTurn = 0;
  c.flags.gainedCaffeineThisTurn = false;
  c.flags.appliedCitationThisTurn = false;
  c.flags.damageTakenThisTurn = 0;
  c.flags.firstDamagePreventThisTurn = false;
  c.flags.costZeroThisTurn = new Set();

  // 1b. Drain queued next-turn effects (e.g., Pep Talk)
  const queued = c.queuedNextTurnEffects.slice();
  c.queuedNextTurnEffects = [];
  for (const eff of queued) executeEffect(eff, makeCtx());

  // 1c. Fire on_turn_start triggers (Powers + relic equivalents)
  fireTriggers("on_turn_start", makeCtx());

  // 1d. Draw cards — base 5 (Big-Box Membership / House Keys can stretch this in Phase 3+)
  drawCards(c.piles, HAND_SIZE);

  // 1e. Energy refill
  c.energy = c.maxEnergy;

  notify("turnStart", { turn: c.turn });
}

export function getEffectiveCost(cardInst) {
  const c = gameState.combat;
  const def = CARDS.find((d) => d.id === cardInst.cardId);
  if (!def) return 0;
  if (c.flags.costZeroThisTurn.has(cardInst.uuid)) return 0;
  // Bylaws: first card this turn that applies Citation costs 0 — Phase 3 wires the consumption rule.
  return def.cost;
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

  const cost = getEffectiveCost(cardInst);
  if (cost > c.energy) {
    notify("cardRejected", { cardInst, reason: "energy" });
    return { ok: false, reason: "energy" };
  }

  c.energy -= cost;
  c.flags.cardsPlayedThisTurn += 1;

  const ctx = makeCtx({ sourceCard: cardInst });

  // Resolve effect — if this card has an Apotheosis override, use it.
  const override = c.cardEffectOverrides.get(cardInst.uuid);
  const effect = override || def.effect;
  executeEffect(effect, ctx);

  // Type-based triggers
  if (def.type === "skill") fireTriggers("on_play_skill", ctx);

  // Generic card-count milestones
  if (c.flags.cardsPlayedThisTurn === 3) fireTriggers("on_third_card", ctx);
  if (c.flags.cardsPlayedThisTurn === 4) fireTriggers("on_fourth_card", ctx);

  // Powers go to a "passive" zone (we treat them as exhausted-from-hand).
  // Their effect already registered triggers; they shouldn't return to hand.
  if (def.type === "power") {
    exhaustCard(c.piles, cardInst);
  } else if (def.exhaust) {
    exhaustCard(c.piles, cardInst);
  } else {
    discardCard(c.piles, cardInst);
  }

  notify("cardPlayed", { cardInst, def });

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

  // 3a. End-of-turn triggers (Powers like Performance Bonus)
  fireTriggers("on_turn_end", makeCtx());

  // 3a-bis. Doug's Jitters tax — built-in mechanic, not a power. Threshold default 5.
  // Espresso Machine relic raises to 8 (Phase 3 wires; we use default here).
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

  // 3b. Discard hand
  discardHand(c.piles);

  // 3c. Tick player statuses (Block expires, Vulnerable/Weak decrement)
  tickStatuses(c.player, "playerTurnEnd");

  if (c.player.hp <= 0) {
    finalizeOutcome("defeat");
    return;
  }

  // Step 4: Enemy turn
  runEnemyTurn();

  if (c.pendingOutcome) return;

  // Step 5: tick enemy statuses, roll next intent
  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    tickStatuses(e, "enemyTurnEnd");
    e.nextIntent = selectIntent(e);
  }

  // Step 6: next player turn
  startPlayerTurn();
}

export function runEnemyTurn() {
  const c = gameState.combat;
  for (const e of c.enemies) {
    if (e.hp <= 0) continue;
    resolveEnemyIntent(e);
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

  const hits = intent.hits || 1;
  const damageBefore = c.player.hp;

  if (intent.type === "attack") {
    for (let i = 0; i < hits; i++) {
      if (c.player.hp <= 0) break;
      // Burnout Insurance: prevent the first damage of the turn.
      if (c.flags.firstDamagePreventThisTurn) {
        c.flags.firstDamagePreventThisTurn = false; // consumed
        continue;
      }
      const result = resolveDamage(enemy, c.player, intent.value || 0);
      // (resolveDamage already applied to player; track for Last Stand-style reads.)
      c.flags.damageTakenThisTurn += result.hpLost;
      notify("playerHit", { enemy, result });
    }
    // Status rider on attack (e.g., Pitch — apply 2 Weak after damaging)
    if (intent.status && c.player.hp > 0) {
      applyStatus(c.player, intent.status, intent.statusValue || 1);
    }
  } else if (intent.type === "block") {
    applyStatus(enemy, STATUS.BLOCK, intent.value || 0);
  } else if (intent.type === "buff") {
    // Phase 2 doesn't wire the boss/elite buff specials. No-op safely.
  } else if (intent.type === "debuff") {
    if (intent.status) {
      applyStatus(c.player, intent.status, intent.statusValue || 1);
    }
  } else if (intent.type === "special") {
    // Phase 3+ wires special intents (summon, draw-minus, telegraph, etc.).
  }

  // Track damage delta for relic/card "damage taken" reads.
  const dealt = damageBefore - c.player.hp;
  if (dealt > 0) c.flags.damageTakenThisTurn = (c.flags.damageTakenThisTurn || 0); // already counted per-hit
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
  // Persist any HP change back to the run.
  gameState.run.hp = Math.max(0, c.player.hp);
  // Return all four piles back to the run deck (exhaust included per design).
  returnExhaustToDeck(c.piles, gameState.run.deck);
  notify("combatEnd", { outcome });
  // Scene transition handled by combat scene listener so it can play exit FX.
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeCtx(extra) {
  return Object.assign({
    combat: gameState.combat,
    targetIndex: gameState.combat.targetIndex,
  }, extra || {});
}

export function getCombat() { return gameState.combat; }
