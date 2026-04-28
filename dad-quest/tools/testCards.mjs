// Card-effect verification harness.
// For every card, sets up a controlled combat, plays the card, and asserts
// the expected mechanical effect actually happens. Run from the repo root with:
//   node dad-quest/tools/testCards.mjs
//
// Design goals:
//   - Hit every CARDS entry at least once.
//   - For conditional cards, exercise both true and false branches.
//   - For scaling cards, exercise a non-trivial state.
//   - For trigger powers, register them, fire the hook, and verify.
//   - Report every discrepancy as a FAIL line; print a summary.
//
// This file is test/dev tooling only and is not loaded by the game.

import { CARDS } from "../data/cards.js";
import { gameState, makeCardInstance } from "../engine/gameState.js";
import {
  STATUS,
  applyStatus,
  setStatus,
  getStatus,
} from "../engine/statusEffects.js";
import { executeEffect, fireTriggers } from "../engine/effectExecutor.js";
import { playCard, getEffectiveCost } from "../engine/combat.js";

// -----------------------------------------------------------------------
// Test scaffolding
// -----------------------------------------------------------------------

let pass = 0;
let fail = 0;
const failures = [];

function check(cardName, label, predicate, detail) {
  if (predicate) {
    pass += 1;
    return;
  }
  fail += 1;
  failures.push(`  [FAIL] ${cardName} :: ${label} ${detail ? `— ${detail}` : ""}`);
}

function makeMockCombat({
  playerHp = 80,
  playerMaxHp = 80,
  character = "hank",
  enemyHp = 200,
  enemies = null,
  relics = [],
  flags = {},
} = {}) {
  // Reset gameState.run to a known state with a single-card deck (the card
  // under test is added directly to hand, so deck contents don't matter).
  gameState.run = {
    character,
    hp: playerHp,
    maxHp: playerMaxHp,
    gold: 0,
    deck: [],
    relics: relics.slice(),
    act: 1,
    position: null,
    completedNodes: [],
    map: null,
    combatsWon: 0,
  };

  const enemyList = enemies || [
    { id: "test_dummy", name: "Test Dummy", hp: enemyHp, maxHp: enemyHp, statuses: {} },
  ];

  gameState.combat = {
    player: {
      character,
      hp: playerHp,
      maxHp: playerMaxHp,
      statuses: {},
      nextTurnModifiers: [],
    },
    enemies: enemyList,
    piles: { drawPile: [], hand: [], discardPile: [], exhaustPile: [] },
    energy: 9,
    maxEnergy: 9,
    turn: 1,
    targetIndex: 0,
    isBoss: false,
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
      firstAttackPlayedThisCombat: false,
      bonusFirstDraw: 0,
      nextCitationCardCostsZero: false,
      costZeroThisTurn: new Set(),
      ...flags,
    },
    queuedNextTurnEffects: [],
    cardEffectOverrides: new Map(),
    run: gameState.run,
    pendingOutcome: null,
  };
  return gameState.combat;
}

function makeCtx(c) {
  return { combat: c, targetIndex: c.targetIndex };
}

function fmt(n) { return Number.isFinite(n) ? n : "?"; }

// -----------------------------------------------------------------------
// Per-card tests, indexed by card.id.
// Each handler receives the card def, runs a scenario, and calls check().
// -----------------------------------------------------------------------

const handlers = {};

// Helpers that wrap common patterns -------------------------------------

function testDamage(card, expected) {
  const c = makeMockCombat({ enemyHp: 1000 });
  const before = c.enemies[0].hp;
  executeEffect(card.effect, makeCtx(c));
  const dealt = before - c.enemies[0].hp;
  check(card.name, `deal_damage = ${expected}`, dealt === expected, `actual=${dealt}`);
}

function testBlock(card, expected) {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  const block = getStatus(c.player, STATUS.BLOCK);
  check(card.name, `gain_block = ${expected}`, block === expected, `actual=${block}`);
}

function testStatusApply(card, status, expectedPerEnemy) {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  const v0 = getStatus(c.enemies[0], status);
  const v1 = getStatus(c.enemies[1], status);
  check(card.name, `apply ${status} on e0 = ${expectedPerEnemy[0]}`, v0 === expectedPerEnemy[0], `actual=${v0}`);
  if (expectedPerEnemy[1] !== undefined) {
    check(card.name, `apply ${status} on e1 = ${expectedPerEnemy[1]}`, v1 === expectedPerEnemy[1], `actual=${v1}`);
  }
}

function testHeal(card, startHp, maxHp, expectedHp) {
  const c = makeMockCombat({ playerHp: startHp, playerMaxHp: maxHp });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, `heal → hp=${expectedHp}`, c.player.hp === expectedHp, `actual=${c.player.hp}`);
}

function testResource(card, status, expected, character = "hank") {
  const c = makeMockCombat({ character });
  executeEffect(card.effect, makeCtx(c));
  const v = getStatus(c.player, status);
  check(card.name, `gain ${status} = ${expected}`, v === expected, `actual=${v}`);
}

function testDraw(card, deckSize, handStart, expectedHand) {
  const c = makeMockCombat();
  for (let i = 0; i < deckSize; i++) c.piles.drawPile.push({ uuid: `d${i}`, cardId: "strike_hank" });
  for (let i = 0; i < handStart; i++) c.piles.hand.push({ uuid: `h${i}`, cardId: "strike_hank" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, `draw → hand=${expectedHand}`, c.piles.hand.length === expectedHand, `actual=${c.piles.hand.length}`);
}

// ---------------------------------------------------------------------
// HANK
// ---------------------------------------------------------------------

handlers.strike_hank = (card) => testDamage(card, 6);
handlers.mow_down = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  const beforeHp = c.enemies[0].hp;
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "deals 7", beforeHp - c.enemies[0].hp === 7, `dealt=${beforeHp - c.enemies[0].hp}`);
  check(card.name, "+1 yard_work", getStatus(c.player, STATUS.YARD_WORK) === 1);
};
handlers.hedge_trim = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "AOE 4 to e0", c.enemies[0].hp === 96, `e0=${c.enemies[0].hp}`);
  check(card.name, "AOE 4 to e1", c.enemies[1].hp === 96, `e1=${c.enemies[1].hp}`);
};
handlers.leaf_blower = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  // 3×4 hits = 12 (single enemy → all 4 hits land on it)
  const dealt = 1000 - c.enemies[0].hp;
  check(card.name, "4 hits × 3 = 12 total on lone enemy", dealt === 12, `dealt=${dealt}`);
};
handlers.weed_whacker = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  setStatus(c.player, STATUS.YARD_WORK, 4);
  executeEffect(card.effect, makeCtx(c));
  // base 5 + (4 yard_work × 2 bonus) = 5 + 8 = 13
  const dealt = 1000 - c.enemies[0].hp;
  check(card.name, "base 5 + 4×2 yard work bonus = 13", dealt === 13, `dealt=${dealt}, yw_after=${getStatus(c.player, STATUS.YARD_WORK)}`);
  check(card.name, "yard_work spent to 0", getStatus(c.player, STATUS.YARD_WORK) === 0);
};
handlers.lawn_aerator = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "12 dmg", 1000 - c.enemies[0].hp === 12);
  check(card.name, "2 vulnerable", getStatus(c.enemies[0], STATUS.VULNERABLE) === 2);
};
handlers.riding_mower = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80, enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "18 dmg", 1000 - c.enemies[0].hp === 18);
  check(card.name, "self -4 hp", c.player.hp === 46, `hp=${c.player.hp}`);
};
handlers.garden_gnome = (card) => testDamage(card, 4);
handlers.sprinkler_strike = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "AOE 3 to e0", c.enemies[0].hp === 97);
  check(card.name, "AOE 3 to e1", c.enemies[1].hp === 97);
  check(card.name, "+1 yard work", getStatus(c.player, STATUS.YARD_WORK) === 1);
};
handlers.drought_strike = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  setStatus(c.player, STATUS.YARD_WORK, 5);
  executeEffect(card.effect, makeCtx(c));
  // 5 yard work × 3 = 15
  check(card.name, "scaling 5*3 = 15", 1000 - c.enemies[0].hp === 15, `dealt=${1000 - c.enemies[0].hp}`);
};

handlers.defend_hank = (card) => testBlock(card, 5);
handlers.saturday_routine = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "5 block", getStatus(c.player, STATUS.BLOCK) === 5);
  check(card.name, "+2 yard work", getStatus(c.player, STATUS.YARD_WORK) === 2);
};
handlers.weekend_warrior = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80 });
  c.energy = 0; // start with 0 energy
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+1 energy", c.energy === 1, `energy=${c.energy}`);
  check(card.name, "self -2 hp", c.player.hp === 48, `hp=${c.player.hp}`);
};
handlers.compost_pile = (card) => {
  const c = makeMockCombat();
  c.piles.drawPile.push({ uuid: "d0", cardId: "strike_hank" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+1 yard work", getStatus(c.player, STATUS.YARD_WORK) === 1);
  check(card.name, "drew 1 (hand=1)", c.piles.hand.length === 1);
};
handlers.power_nap = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80 });
  c.piles.drawPile.push({ uuid: "d0", cardId: "strike_hank" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "heal 4 → 54", c.player.hp === 54);
  check(card.name, "drew 1", c.piles.hand.length === 1);
};
handlers.tool_shed = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "added 2 cards to hand", c.piles.hand.length === 2);
  check(card.name, "added 2 uuids to costZero", c.flags.costZeroThisTurn.size === 2);
  // All added cards should be Hank attacks
  const allHankAttacks = c.piles.hand.every((inst) => {
    const def = CARDS.find((d) => d.id === inst.cardId);
    return def.character === "hank" && def.type === "attack";
  });
  check(card.name, "all added cards are hank attacks", allHankAttacks);
};
handlers.garage_workshop = (card) => {
  // Without enough yard work
  let c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "no YW: 8 block", getStatus(c.player, STATUS.BLOCK) === 8, `block=${getStatus(c.player, STATUS.BLOCK)}`);
  // With ≥3 yard work
  c = makeMockCombat();
  setStatus(c.player, STATUS.YARD_WORK, 3);
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "3 YW: 12 block", getStatus(c.player, STATUS.BLOCK) === 12, `block=${getStatus(c.player, STATUS.BLOCK)}`);
};
handlers.honey_do_list = (card) => testDraw(card, 5, 0, 2);

handlers.green_thumb = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  // After registering, fire on_play_skill manually and check yard work climbs.
  fireTriggers("on_play_skill", makeCtx(c));
  check(card.name, "trigger fires gain:yard_work:1", getStatus(c.player, STATUS.YARD_WORK) === 1);
  fireTriggers("on_play_skill", makeCtx(c));
  check(card.name, "trigger fires again", getStatus(c.player, STATUS.YARD_WORK) === 2);
};
handlers.big_box_membership = (card) => {
  const c = makeMockCombat();
  c.piles.drawPile.push({ uuid: "d0", cardId: "strike_hank" });
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_turn_start", makeCtx(c));
  check(card.name, "on_turn_start drew 1", c.piles.hand.length === 1);
};
handlers.suburbanite = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_turn_start", makeCtx(c));
  check(card.name, "on_turn_start +1 yard work", getStatus(c.player, STATUS.YARD_WORK) === 1);
};
handlers.tinkerer = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_third_card", makeCtx(c));
  check(card.name, "on_third_card +6 block", getStatus(c.player, STATUS.BLOCK) === 6);
};

// ---------------------------------------------------------------------
// DOUG
// ---------------------------------------------------------------------

handlers.strike_doug = (card) => testDamage(card, 6);
handlers.stapler = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "9 dmg", 1000 - c.enemies[0].hp === 9);
  check(card.name, "1 vulnerable", getStatus(c.enemies[0], STATUS.VULNERABLE) === 1);
};
handlers.email_blast = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "AOE 3 to e0", c.enemies[0].hp === 97);
  check(card.name, "AOE 3 to e1", c.enemies[1].hp === 97);
  check(card.name, "1 weak on e0", getStatus(c.enemies[0], STATUS.WEAK) === 1);
  check(card.name, "1 weak on e1", getStatus(c.enemies[1], STATUS.WEAK) === 1);
};
handlers.performance_review = (card) => {
  // Without enough caffeine
  let c = makeMockCombat({ enemyHp: 1000, character: "doug" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "no caf: 14 dmg", 1000 - c.enemies[0].hp === 14, `dealt=${1000 - c.enemies[0].hp}`);
  // With caffeine ≥ 3
  c = makeMockCombat({ enemyHp: 1000, character: "doug" });
  setStatus(c.player, STATUS.CAFFEINE, 3);
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "3 caf: 14+6 = 20 dmg", 1000 - c.enemies[0].hp === 20, `dealt=${1000 - c.enemies[0].hp}`);
};
handlers.power_move = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  c.piles.drawPile.push({ uuid: "d0", cardId: "strike_doug" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "4 dmg", 1000 - c.enemies[0].hp === 4);
  check(card.name, "drew 1", c.piles.hand.length === 1);
};
handlers.death_by_meeting = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "16 dmg", 1000 - c.enemies[0].hp === 16);
  check(card.name, "1 burnout in discard", c.piles.discardPile.length === 1 && c.piles.discardPile[0].cardId === "burnout");
};
handlers.pivot = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "7 dmg", 1000 - c.enemies[0].hp === 7);
  check(card.name, "1 weak", getStatus(c.enemies[0], STATUS.WEAK) === 1);
};
handlers.synergy = (card) => {
  // Without caffeine gained
  let c = makeMockCombat({ enemyHp: 1000, character: "doug" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "no caf: 5 dmg", 1000 - c.enemies[0].hp === 5);
  // With caffeine gained this turn
  c = makeMockCombat({ enemyHp: 1000, character: "doug" });
  c.flags.gainedCaffeineThisTurn = true;
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "caf gained: 9 dmg", 1000 - c.enemies[0].hp === 9);
};
handlers.espresso_shot = (card) => {
  const c = makeMockCombat({ enemyHp: 1000, character: "doug" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "3 dmg", 1000 - c.enemies[0].hp === 3);
  check(card.name, "+2 caffeine", getStatus(c.player, STATUS.CAFFEINE) === 2);
  check(card.name, "gainedCaffeineThisTurn flag set", c.flags.gainedCaffeineThisTurn === true);
};
handlers.the_spreadsheet = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  c.flags.cardsPlayedThisTurn = 4; // pretend 4 cards already played
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "scaling 4*3 = 12", 1000 - c.enemies[0].hp === 12);
};

handlers.defend_doug = (card) => testBlock(card, 5);
handlers.coffee_break = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80, character: "doug" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+3 caffeine", getStatus(c.player, STATUS.CAFFEINE) === 3);
  check(card.name, "+3 hp → 53", c.player.hp === 53);
  check(card.name, "gainedCaffeineThisTurn flag set", c.flags.gainedCaffeineThisTurn === true);
};
handlers.standing_desk = (card) => {
  let c = makeMockCombat({ character: "doug" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "no caf: 8 block", getStatus(c.player, STATUS.BLOCK) === 8);
  c = makeMockCombat({ character: "doug" });
  setStatus(c.player, STATUS.CAFFEINE, 3);
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "3 caf: 12 block", getStatus(c.player, STATUS.BLOCK) === 12);
};
handlers.snooze = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80, character: "doug" });
  setStatus(c.player, STATUS.CAFFEINE, 5);
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "-3 caffeine: 5→2", getStatus(c.player, STATUS.CAFFEINE) === 2);
  check(card.name, "+6 hp → 56", c.player.hp === 56);
};
handlers.caffeine_dependency = (card) => {
  const c = makeMockCombat({ character: "doug", playerHp: 50, playerMaxHp: 80 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+4 caffeine", getStatus(c.player, STATUS.CAFFEINE) === 4);
  check(card.name, "self -2 hp", c.player.hp === 48);
};
handlers.out_of_office = (card) => {
  const c = makeMockCombat();
  c.energy = 0;
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+6 block", getStatus(c.player, STATUS.BLOCK) === 6);
  check(card.name, "+1 energy", c.energy === 1);
};
handlers.open_floor_plan = (card) => testStatusApply(card, STATUS.VULNERABLE, [2, 2]);
handlers.the_quiet_quit = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+8 hp → 58", c.player.hp === 58);
  check(card.name, "+8 block", getStatus(c.player, STATUS.BLOCK) === 8);
};

handlers.caffeinated = (card) => {
  const c = makeMockCombat({ character: "doug" });
  executeEffect(card.effect, makeCtx(c));
  // Now gain caffeine and verify Strength scales 1:1
  executeEffect("gain:caffeine:3", makeCtx(c));
  check(card.name, "3 caffeine → 3 strength", getStatus(c.player, STATUS.STRENGTH) === 3, `str=${getStatus(c.player, STATUS.STRENGTH)}`);
};
handlers.the_grind = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_fourth_card", makeCtx(c));
  check(card.name, "on_fourth_card AOE 6 e0", c.enemies[0].hp === 94);
  check(card.name, "on_fourth_card AOE 6 e1", c.enemies[1].hp === 94);
};
handlers.performance_bonus = (card) => {
  const c = makeMockCombat({ character: "doug" });
  executeEffect(card.effect, makeCtx(c));
  // Without enough caffeine: no gold
  fireTriggers("on_turn_end", makeCtx(c));
  check(card.name, "no caf: no gold", c.run.gold === 0);
  // With enough caffeine: +4 gold
  setStatus(c.player, STATUS.CAFFEINE, 5);
  fireTriggers("on_turn_end", makeCtx(c));
  check(card.name, "5 caf: +4 gold", c.run.gold === 4);
};
handlers.burnout_insurance = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_turn_start", makeCtx(c));
  check(card.name, "on_turn_start sets firstDamagePrevent flag", c.flags.firstDamagePreventThisTurn === true);
};

// ---------------------------------------------------------------------
// BRENDA
// ---------------------------------------------------------------------

handlers.strike_brenda = (card) => testDamage(card, 6);
handlers.citation = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "4 dmg", 1000 - c.enemies[0].hp === 4);
  check(card.name, "2 citation", getStatus(c.enemies[0], STATUS.CITATION) === 2);
  check(card.name, "appliedCitationThisTurn flag set", c.flags.appliedCitationThisTurn === true);
  check(card.name, "citationsAppliedThisCombat += 2", c.flags.citationsAppliedThisCombat === 2);
};
handlers.cease_and_desist = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "8 dmg", 1000 - c.enemies[0].hp === 8);
  check(card.name, "3 citation", getStatus(c.enemies[0], STATUS.CITATION) === 3);
  check(card.name, "2 vulnerable", getStatus(c.enemies[0], STATUS.VULNERABLE) === 2);
};
handlers.letter_of_complaint = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "AOE 3 e0", c.enemies[0].hp === 97);
  check(card.name, "AOE 3 e1", c.enemies[1].hp === 97);
  check(card.name, "1 citation e0", getStatus(c.enemies[0], STATUS.CITATION) === 1);
  check(card.name, "1 citation e1", getStatus(c.enemies[1], STATUS.CITATION) === 1);
};
handlers.public_shaming = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  setStatus(c.enemies[0], STATUS.CITATION, 3);
  executeEffect(card.effect, makeCtx(c));
  // 4 + 3*2 = 10
  check(card.name, "scaling 4 + 3 cit × 2 = 10", 1000 - c.enemies[0].hp === 10, `dealt=${1000 - c.enemies[0].hp}`);
};
handlers.megaphone = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "12 dmg", 1000 - c.enemies[0].hp === 12);
  check(card.name, "2 weak", getStatus(c.enemies[0], STATUS.WEAK) === 2);
};
handlers.the_petition = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "2 dmg", 1000 - c.enemies[0].hp === 2);
  check(card.name, "4 citation", getStatus(c.enemies[0], STATUS.CITATION) === 4);
};
handlers.subpoena = (card) => testDamage(card, 20);
handlers.by_law_violation = (card) => {
  // Without 5+ citations
  let c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "<5 cit: 6 dmg", 1000 - c.enemies[0].hp === 6);
  // With 5+ citations
  c = makeMockCombat({ enemyHp: 1000 });
  setStatus(c.enemies[0], STATUS.CITATION, 5);
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "≥5 cit: 12 dmg", 1000 - c.enemies[0].hp === 12);
};
handlers.court_order = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 1000, maxHp: 1000, statuses: { citation: 3 } },
      { id: "e1", name: "E1", hp: 1000, maxHp: 1000, statuses: { citation: 4 } },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  // total citations = 7, × 2 = 14, dealt to target (e0)
  check(card.name, "scaling 7 cit × 2 = 14", 1000 - c.enemies[0].hp === 14, `dealt=${1000 - c.enemies[0].hp}`);
  check(card.name, "e1 untouched by court_order direct dmg", c.enemies[1].hp === 1000);
};

handlers.defend_brenda = (card) => testBlock(card, 5);
handlers.the_bulletin_board = (card) => testStatusApply(card, STATUS.CITATION, [2, 2]);
handlers.neighborhood_watch = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+6 block", getStatus(c.player, STATUS.BLOCK) === 6);
  check(card.name, "1 cit e0", getStatus(c.enemies[0], STATUS.CITATION) === 1);
  check(card.name, "1 cit e1", getStatus(c.enemies[1], STATUS.CITATION) === 1);
};
handlers.power_tripping = (card) => {
  // Without applied citation
  let c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "no cit: 8 block", getStatus(c.player, STATUS.BLOCK) === 8);
  // With applied citation flag
  c = makeMockCombat();
  c.flags.appliedCitationThisTurn = true;
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "cit applied: 12 block", getStatus(c.player, STATUS.BLOCK) === 12);
};
handlers.form_401b = (card) => testDraw(card, 5, 0, 2);
handlers.bake_sale = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+5 hp → 55", c.player.hp === 55);
  check(card.name, "+2 gold", c.run.gold === 2);
};
handlers.emergency_meeting = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  const total = getStatus(c.enemies[0], STATUS.CITATION) + getStatus(c.enemies[1], STATUS.CITATION);
  check(card.name, "3 random cit total", total === 3, `total=${total}`);
};
handlers.the_hoa_treasury = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+4 block", getStatus(c.player, STATUS.BLOCK) === 4);
  check(card.name, "+4 gold", c.run.gold === 4);
};

handlers.code_enforcement = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: {} },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_turn_start", makeCtx(c));
  const total = getStatus(c.enemies[0], STATUS.CITATION) + getStatus(c.enemies[1], STATUS.CITATION);
  check(card.name, "on_turn_start +1 random cit", total === 1);
};
handlers.petty_tyrant = (card) => {
  const c = makeMockCombat({ enemyHp: 1000 });
  executeEffect(card.effect, makeCtx(c)); // register passive
  c.flags.citationsAppliedThisCombat = 5;
  // Now play a 6-damage strike — bonus should be +5
  executeEffect("deal_damage:6", makeCtx(c));
  const dealt = 1000 - c.enemies[0].hp;
  check(card.name, "5 cit applied → strike 6+5 = 11", dealt === 11, `dealt=${dealt}`);
};
handlers.compliance = (card) => {
  const c = makeMockCombat({
    enemies: [
      { id: "e0", name: "E0", hp: 100, maxHp: 100, statuses: { citation: 6 } },
      { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: { citation: 3 } },
    ],
  });
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_turn_start", makeCtx(c));
  check(card.name, "e0 (6 cit) takes 4", c.enemies[0].hp === 96);
  check(card.name, "e1 (3 cit) untouched", c.enemies[1].hp === 100);
};
handlers.the_bylaws = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  fireTriggers("on_turn_start", makeCtx(c));
  check(card.name, "on_turn_start sets nextCitationCardCostsZero", c.flags.nextCitationCardCostsZero === true);
};

// ---------------------------------------------------------------------
// SHARED
// ---------------------------------------------------------------------

handlers.slimming = (card) => {
  const c = makeMockCombat({ playerHp: 50, playerMaxHp: 80 });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "self -3 hp", c.player.hp === 47);
  check(card.name, "+12 block", getStatus(c.player, STATUS.BLOCK) === 12);
};
handlers.apotheosis = (card) => {
  const c = makeMockCombat();
  // Put a Strike (6 dmg) instance in hand — apotheosis should override it to 12.
  const strikeInst = makeCardInstance("strike_hank");
  c.piles.hand.push(strikeInst);
  executeEffect(card.effect, makeCtx(c));
  const override = c.cardEffectOverrides.get(strikeInst.uuid);
  check(card.name, "override registered", typeof override === "string");
  check(card.name, "Strike 6 → 12", override === "deal_damage:12", `override=${override}`);
};
handlers.bandage_up = (card) => testHeal(card, 50, 80, 54);
handlers.master_of_strategy = (card) => testDraw(card, 5, 0, 3);
handlers.panic_button = (card) => {
  const c = makeMockCombat();
  c.energy = 0;
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+8 block", getStatus(c.player, STATUS.BLOCK) === 8);
  check(card.name, "+1 energy", c.energy === 1);
};
handlers.the_backup_plan = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "added 2 cards to hand", c.piles.hand.length === 2);
  check(card.name, "all are skills", c.piles.hand.every((inst) => CARDS.find((d) => d.id === inst.cardId).type === "skill"));
};
handlers.last_stand = (card) => {
  const c = makeMockCombat({ playerHp: 30, playerMaxHp: 80 });
  c.flags.damageTakenThisTurn = 15;
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "heal 15 → 45", c.player.hp === 45);
};
handlers.pep_talk = (card) => {
  const c = makeMockCombat();
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "queued next-turn effect", c.queuedNextTurnEffects.length === 1);
  // Drain to verify it actually applies +2 strength
  for (const eff of c.queuedNextTurnEffects) executeEffect(eff, makeCtx(c));
  check(card.name, "drained: +2 strength", getStatus(c.player, STATUS.STRENGTH) === 2);
};
handlers.adrenaline = (card) => {
  const c = makeMockCombat();
  c.energy = 0;
  c.piles.drawPile.push({ uuid: "d0", cardId: "strike_hank" }, { uuid: "d1", cardId: "strike_hank" });
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "+1 energy", c.energy === 1);
  check(card.name, "drew 2", c.piles.hand.length === 2);
};
handlers.quick_thinking = (card) => testDraw(card, 5, 0, 1);
handlers.reinforcements = (card) => testBlock(card, 14);
handlers.iron_will = (card) => testResource(card, STATUS.STRENGTH, 2);
handlers.burnout = (card) => {
  // Burnout shouldn't run anything
  const c = makeMockCombat();
  const beforeHp = c.enemies[0].hp;
  executeEffect(card.effect, makeCtx(c));
  check(card.name, "unplayable: enemy hp unchanged", c.enemies[0].hp === beforeHp);
  check(card.name, "unplayable: player block 0", getStatus(c.player, STATUS.BLOCK) === 0);
};

// ---------------------------------------------------------------------
// Integration tests via the real playCard() — catches issues with
// targeting, getEffectiveCost, trigger orchestration, and discard/exhaust
// piles that pure executeEffect testing misses.
// ---------------------------------------------------------------------

function integrationTests() {
  // The Bylaws — registers a power that should make the first citation card
  // played each turn cost 0. Verify both a citation card and a non-citation
  // card with the flag active.
  {
    const c = makeMockCombat({ enemyHp: 1000 });
    const bylaws = makeCardInstance("the_bylaws");
    const citation = makeCardInstance("citation");
    const strike = makeCardInstance("strike_brenda");
    c.piles.hand.push(bylaws, citation, strike);
    c.energy = 4;
    // Play The Bylaws (cost 1). The trigger fires on next turn start.
    playCard(bylaws);
    fireTriggers("on_turn_start", makeCtx(c));
    // The flag should be set; the citation card's effective cost should now be 0.
    const citCost = getEffectiveCost(citation);
    check("The Bylaws integration", "citation cost = 0 (was 1)", citCost === 0, `actual=${citCost}`);
    const strikeCost = getEffectiveCost(strike);
    check("The Bylaws integration", "strike cost still = 1", strikeCost === 1, `actual=${strikeCost}`);
    // After playing the citation card, the flag should consume so a SECOND citation card costs full.
    const energyBefore = c.energy;
    playCard(citation);
    check("The Bylaws integration", "playing citation didn't reduce energy", c.energy === energyBefore, `energy=${c.energy}`);
    const cit2 = makeCardInstance("the_petition");
    c.piles.hand.push(cit2);
    const cit2Cost = getEffectiveCost(cit2);
    check("The Bylaws integration", "second citation card pays full cost", cit2Cost === 0, `actual=${cit2Cost}`);
    // (the_petition is cost 0 by base — verify any cost-1 citation card)
    const cit3 = makeCardInstance("citation");
    c.piles.hand.push(cit3);
    const cit3Cost = getEffectiveCost(cit3);
    check("The Bylaws integration", "second cost-1 citation card pays 1", cit3Cost === 1, `actual=${cit3Cost}`);
  }

  // Petty Tyrant — registered as passive. Damage should scale with citations applied.
  {
    const c = makeMockCombat({ enemyHp: 1000 });
    const tyrant = makeCardInstance("petty_tyrant");
    c.piles.hand.push(tyrant);
    c.energy = 1;
    playCard(tyrant);
    c.flags.citationsAppliedThisCombat = 7;
    const strike = makeCardInstance("strike_brenda");
    c.piles.hand.push(strike);
    const before = c.enemies[0].hp;
    c.energy = 1;
    playCard(strike, 0);
    const dealt = before - c.enemies[0].hp;
    check("Petty Tyrant integration", "7 cit applied → strike 6+7 = 13", dealt === 13, `dealt=${dealt}`);
  }

  // Petty Tyrant cap at +10
  {
    const c = makeMockCombat({ enemyHp: 1000 });
    const tyrant = makeCardInstance("petty_tyrant");
    c.piles.hand.push(tyrant);
    c.energy = 1;
    playCard(tyrant);
    c.flags.citationsAppliedThisCombat = 50;
    const strike = makeCardInstance("strike_brenda");
    c.piles.hand.push(strike);
    const before = c.enemies[0].hp;
    c.energy = 1;
    playCard(strike, 0);
    const dealt = before - c.enemies[0].hp;
    check("Petty Tyrant cap", "50 cit applied → cap at +10 → 6+10 = 16", dealt === 16, `dealt=${dealt}`);
  }

  // Single-target attack on a 2-enemy combat with stale targetIndex (target dead)
  // should auto-redirect to a live enemy via ensureLiveTarget.
  {
    const c = makeMockCombat({
      enemies: [
        { id: "e0", name: "E0", hp: 0, maxHp: 100, statuses: {} },  // already dead
        { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
      ],
    });
    c.targetIndex = 0;
    const strike = makeCardInstance("strike_hank");
    c.piles.hand.push(strike);
    c.energy = 1;
    playCard(strike);
    check("Stale target redirect", "e1 got hit despite stale targetIndex=0", c.enemies[1].hp === 94, `e1.hp=${c.enemies[1].hp}`);
  }

  // Compound that kills target mid-effect: subsequent status applies should
  // NOT increment citationsAppliedThisCombat (target already dead).
  // Cease and Desist on a 3 HP enemy: 8 dmg kills, then citation/vuln applied.
  {
    const c = makeMockCombat({
      enemies: [
        { id: "e0", name: "E0", hp: 3, maxHp: 100, statuses: {} },
        { id: "e1", name: "E1", hp: 100, maxHp: 100, statuses: {} },
      ],
    });
    c.targetIndex = 0;
    const cnd = makeCardInstance("cease_and_desist");
    c.piles.hand.push(cnd);
    c.energy = 2;
    playCard(cnd);
    check("Kill mid-compound", "e0 dies", c.enemies[0].hp === 0);
    // citation/vulnerable should NOT apply to dead e0
    const citOnDead = getStatus(c.enemies[0], STATUS.CITATION);
    check("Kill mid-compound", "no citation on dead e0", citOnDead === 0, `cit=${citOnDead}`);
    const vulnOnDead = getStatus(c.enemies[0], STATUS.VULNERABLE);
    check("Kill mid-compound", "no vulnerable on dead e0", vulnOnDead === 0, `vuln=${vulnOnDead}`);
  }
}

// ---------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------

console.log(`Dad Quest card-effect verification — ${CARDS.length} cards\n`);

let untested = 0;
for (const card of CARDS) {
  if (!handlers[card.id]) {
    console.log(`  [SKIP] ${card.name} (${card.id}) — no test handler`);
    untested += 1;
    continue;
  }
  try {
    handlers[card.id](card);
  } catch (e) {
    fail += 1;
    failures.push(`  [FAIL] ${card.name} :: threw exception — ${e.message}`);
  }
}

console.log("\n--- Integration tests ---");
try {
  integrationTests();
} catch (e) {
  fail += 1;
  failures.push(`  [FAIL] integrationTests :: threw — ${e.message}\n${e.stack}`);
}

console.log(`\n${"=".repeat(70)}`);
console.log(`PASS: ${pass}   FAIL: ${fail}   UNTESTED: ${untested}   TOTAL CARDS: ${CARDS.length}`);
console.log("=".repeat(70));
if (failures.length) {
  console.log("\nFailures:\n");
  for (const f of failures) console.log(f);
}

process.exit(fail > 0 ? 1 : 0);
