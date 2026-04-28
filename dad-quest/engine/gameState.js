// Canonical run state for Dad Quest.
// Phase 3 extends Phase 2 with multi-combat run state: act, position, completedNodes, map, combatsWon.
//
// Persistence rules (Phase 3):
//   - HP carries between combats (not auto-healed).
//   - Deck carries between combats (exhaust pile returns to deck after each combat).
//   - Gold carries; spent at shops in Phase 4.
//   - Relics carry; combat-start effects re-apply each combat.
//   - Combat-scoped statuses (Strength, Yard Work, Caffeine, Citations, Block, Vulnerable, Weak)
//     are stored on combatState.player / combatState.enemies and reset every combat.
//   - HP at 0 = run ends (game over).
//   - Defeating Act 3 boss = run wins (run-victory scene).

import { CHARACTERS } from "../data/characters.js";
import { RELICS } from "../data/relics.js";
import { generateAct } from "../procgen/mapGenerator.js";

export const gameState = {
  run: {
    character: null,
    hp: 0,
    maxHp: 0,
    gold: 0,
    deck: [],
    relics: [],
    // Phase 3 additions:
    act: 1,
    position: null,            // current node ID, or null pre-entry
    completedNodes: [],        // node IDs cleared
    map: null,                 // current act's generated map
    combatsWon: 0,             // total combats won this run
  },
  combat: null,
  scene: "boot",
};

export function makeCardInstance(cardId, extra = {}) {
  const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `card_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  return { uuid, cardId, ...extra };
}

export function startRun(characterId) {
  const ch = CHARACTERS.find((c) => c.id === characterId);
  if (!ch) throw new Error(`Unknown character: ${characterId}`);
  gameState.run.character = ch.id;
  gameState.run.maxHp = ch.startingHP;
  if (ch.startingRelic === "pocket_square") {
    gameState.run.maxHp += 5; // Pocket Square +5 max HP at run start
  }
  gameState.run.hp = gameState.run.maxHp;
  gameState.run.gold = 0;
  gameState.run.deck = ch.starterDeck.map(makeCardInstance);
  gameState.run.relics = [ch.startingRelic];
  gameState.run.act = 1;
  gameState.run.position = null;
  gameState.run.completedNodes = [];
  gameState.run.map = generateAct(1);
  gameState.run.combatsWon = 0;
  gameState.combat = null;
}

export function endRun() {
  gameState.run.character = null;
  gameState.run.hp = 0;
  gameState.run.maxHp = 0;
  gameState.run.gold = 0;
  gameState.run.deck = [];
  gameState.run.relics = [];
  gameState.run.act = 1;
  gameState.run.position = null;
  gameState.run.completedNodes = [];
  gameState.run.map = null;
  gameState.run.combatsWon = 0;
  gameState.combat = null;
}

export function setRunFromSnapshot(runSnapshot, combatSnapshot = null) {
  Object.assign(gameState.run, runSnapshot || {});
  gameState.combat = combatSnapshot;
  if (gameState.combat) gameState.combat.run = gameState.run;
}

// Called after a boss is defeated. If we just beat the Act 3 boss, the caller
// should route to runVictory; otherwise we generate the next act's map.
// Returns "runVictory" | "newAct" so the caller can decide the scene.
export function advanceAct() {
  if (gameState.run.act >= 3) {
    return "runVictory";
  }
  gameState.run.act += 1;
  gameState.run.position = null;
  gameState.run.completedNodes = [];
  gameState.run.map = generateAct(gameState.run.act);
  return "newAct";
}

// Add a card to the run deck (used by reward scene).
export function addCardToDeck(cardId) {
  gameState.run.deck.push(makeCardInstance(cardId));
}

export function removeCardFromDeck(uuid) {
  const idx = gameState.run.deck.findIndex((c) => c.uuid === uuid);
  if (idx >= 0) {
    gameState.run.deck.splice(idx, 1);
    return true;
  }
  return false;
}

export function healRun(amount) {
  gameState.run.hp = Math.min(gameState.run.maxHp, gameState.run.hp + amount);
}

export function spendGold(amount) {
  if (gameState.run.gold < amount) return false;
  gameState.run.gold -= amount;
  return true;
}

export function gainGold(amount) {
  gameState.run.gold += amount;
}

export function addRelicToRun(relicId) {
  if (!relicId || gameState.run.relics.includes(relicId)) return false;
  const relic = RELICS.find((r) => r.id === relicId);
  if (!relic) return false;
  gameState.run.relics.push(relicId);

  // One-time pickup passives. Starter relics are handled by startRun.
  if (relicId === "reading_glasses") {
    gameState.run.maxHp += 5;
    gameState.run.hp += 5;
  } else if (relicId === "property_deed") {
    gameState.run.maxHp += 6;
    gameState.run.hp += 6;
  }
  return true;
}

// Mark the current node completed and clear position so that — for nodes
// whose travel has already advanced position — the map shows the right state.
// Called after combat win or rest taken.
export function markCurrentNodeCompleted() {
  const id = gameState.run.position;
  if (!id) return;
  if (!gameState.run.completedNodes.includes(id)) {
    gameState.run.completedNodes.push(id);
  }
  if (gameState.run.map) {
    for (const row of gameState.run.map.rows) {
      if (!row) continue;
      const node = row.find((n) => n.id === id);
      if (node) node.visited = true;
    }
  }
}
