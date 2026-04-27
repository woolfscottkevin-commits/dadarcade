// Canonical run state for Dad Quest.
// One global object that scenes and combat read from / write to.
// Phase 2: minimum needed for character select + a single combat.
// Phase 3+ will add map/run progress fields here.

import { CHARACTERS } from "../data/characters.js";

export const gameState = {
  run: {
    character: null,        // "hank" | "doug" | "brenda"
    hp: 0,
    maxHp: 0,
    gold: 0,
    deck: [],               // array of card instances: { uuid, cardId }
    relics: [],             // array of relic IDs the player owns
  },
  combat: null,             // populated when entering combat, nulled on exit
  scene: "boot",            // "boot" | "characterSelect" | "combat" | "victory" | "gameOver"
};

function makeCardInstance(cardId) {
  const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `card_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  return { uuid, cardId };
}

export function startRun(characterId) {
  const ch = CHARACTERS.find((c) => c.id === characterId);
  if (!ch) throw new Error(`Unknown character: ${characterId}`);
  gameState.run.character = ch.id;
  gameState.run.maxHp = ch.startingHP;
  // Pocket Square: +5 max HP at the start
  if (ch.startingRelic === "pocket_square") {
    gameState.run.maxHp += 5;
  }
  gameState.run.hp = gameState.run.maxHp;
  gameState.run.gold = 0;
  gameState.run.deck = ch.starterDeck.map(makeCardInstance);
  gameState.run.relics = [ch.startingRelic];
  gameState.combat = null;
}

export function endRun() {
  gameState.run.character = null;
  gameState.run.hp = 0;
  gameState.run.maxHp = 0;
  gameState.run.gold = 0;
  gameState.run.deck = [];
  gameState.run.relics = [];
  gameState.combat = null;
}
