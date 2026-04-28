// Phase 4 single-run save/load. Saves are deliberately local-only and small:
// one active run plus an optional combat snapshot.

import { gameState, setRunFromSnapshot } from "../engine/gameState.js";

const SAVE_KEY = "dadQuest.activeRun.v1";
const SAVE_VERSION = 1;

function canStore() {
  return typeof localStorage !== "undefined";
}

function serializeCombat(combat) {
  if (!combat) return null;
  return {
    ...combat,
    flags: {
      ...combat.flags,
      costZeroThisTurn: Array.from(combat.flags?.costZeroThisTurn || []),
    },
    enemies: (combat.enemies || []).map((enemy) => ({
      ...enemy,
      oncePerCombatFired: Array.from(enemy.oncePerCombatFired || []),
    })),
    cardEffectOverrides: Array.from(combat.cardEffectOverrides || []),
    run: null,
  };
}

function hydrateCombat(combat) {
  if (!combat) return null;
  combat.flags = combat.flags || {};
  combat.flags.costZeroThisTurn = new Set(combat.flags.costZeroThisTurn || []);
  combat.enemies = (combat.enemies || []).map((enemy) => ({
    ...enemy,
    oncePerCombatFired: new Set(enemy.oncePerCombatFired || []),
  }));
  combat.cardEffectOverrides = new Map(combat.cardEffectOverrides || []);
  combat.run = gameState.run;
  return combat;
}

export function saveGame(sceneName = gameState.scene) {
  if (!canStore()) return;
  if (!gameState.run.character) {
    clearSavedGame();
    return;
  }
  const payload = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    scene: sceneName,
    run: gameState.run,
    combat: serializeCombat(gameState.combat),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function loadSavedGame() {
  if (!canStore()) return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || payload.version !== SAVE_VERSION || !payload.run?.character) return null;
    setRunFromSnapshot(payload.run, hydrateCombat(payload.combat));
    return payload;
  } catch (err) {
    console.warn("[Dad Quest] save load failed:", err);
    return null;
  }
}

export function peekSavedGame() {
  if (!canStore()) return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    return payload?.run?.character ? payload : null;
  } catch {
    return null;
  }
}

export function clearSavedGame() {
  if (!canStore()) return;
  localStorage.removeItem(SAVE_KEY);
}
