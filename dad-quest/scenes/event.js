// Phase 4 random event scene.

import { CARDS } from "../data/cards.js";
import { EVENTS } from "../data/events.js";
import { RELICS } from "../data/relics.js";
import { gameState, addCardToDeck, addRelicToRun, gainGold, healRun, markCurrentNodeCompleted, removeCardFromDeck, spendGold } from "../engine/gameState.js";
import { generateCardRewards, generateRelicRewards } from "../engine/rewards.js";
import { setScene } from "../engine/sceneManager.js";
import { saveGame } from "../saves/saveState.js";
import { createRunHud } from "../ui/runHud.js";

function randomRelicByRarity(rarity) {
  const owned = new Set(gameState.run.relics);
  const pool = RELICS.filter((relic) => {
    if (owned.has(relic.id)) return false;
    if (relic.rarity === "boss") return false;
    return rarity === "any" || relic.rarity === rarity;
  });
  const fallback = generateRelicRewards(1, false)[0];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : fallback;
}

function currentEvent() {
  const id = gameState.run.pendingEvent;
  return EVENTS.find((e) => e.id === id) || EVENTS[0];
}

function applyAtomic(effect) {
  const [kind, value] = effect.split(":");
  if (kind === "heal") healRun(parseInt(value, 10));
  else if (kind === "heal_percent") healRun(Math.ceil(gameState.run.maxHp * (parseInt(value, 10) / 100)));
  else if (kind === "gold") gainGold(parseInt(value, 10));
  else if (kind === "max_hp") {
    const delta = parseInt(value, 10);
    gameState.run.maxHp = Math.max(1, gameState.run.maxHp + delta);
    gameState.run.hp = Math.max(1, Math.min(gameState.run.maxHp, gameState.run.hp + Math.max(0, delta)));
  } else if (kind === "relic") {
    const rarity = value || "common";
    addRelicToRun(randomRelicByRarity(rarity));
  } else if (kind === "card_reward") {
    const pick = generateCardRewards("normal", gameState.run.character)[0];
    if (pick) addCardToDeck(pick);
  }
}

function completeEvent(resultText) {
  delete gameState.run.pendingEvent;
  markCurrentNodeCompleted();
  saveGame("map");
  return resultText;
}

function renderRemoveChoice(root, choice) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "event-wrap";
  const title = document.createElement("h1");
  title.className = "event-title";
  title.textContent = "Choose a Card to Remove";
  wrap.appendChild(title);
  const list = document.createElement("div");
  list.className = "event-remove-list";
  for (const inst of gameState.run.deck) {
    const def = CARDS.find((c) => c.id === inst.cardId);
    if (!def) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "event-choice-btn";
    btn.textContent = def.name;
    btn.addEventListener("click", () => {
      removeCardFromDeck(inst.uuid);
      const result = completeEvent(choice.result);
      renderResult(root, result);
    });
    list.appendChild(btn);
  }
  wrap.appendChild(list);
  root.appendChild(wrap);
}

function renderResult(root, text) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "event-wrap";
  const h = document.createElement("h1");
  h.className = "event-title";
  h.textContent = "Event Complete";
  wrap.appendChild(h);
  const p = document.createElement("p");
  p.className = "event-body";
  p.textContent = text;
  wrap.appendChild(p);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "event-choice-btn event-continue";
  btn.textContent = "Continue";
  btn.addEventListener("click", () => setScene("map"));
  wrap.appendChild(btn);
  root.appendChild(wrap);
}

function choose(root, choice) {
  if (choice.cost && !spendGold(choice.cost)) return;
  if (choice.costGold && !spendGold(choice.costGold)) return;
  if (choice.costHp) gameState.run.hp = Math.max(1, gameState.run.hp - choice.costHp);
  if (choice.effect === "remove_card") {
    renderRemoveChoice(root, choice);
    return;
  }
  for (const effect of choice.effect.split("|")) applyAtomic(effect);
  const result = completeEvent(choice.result);
  renderResult(root, result);
}

export const eventScene = {
  mount(root) {
    root.innerHTML = "";
    const ev = currentEvent();
    const wrap = document.createElement("div");
    wrap.className = "event-wrap";
    const hud = createRunHud();
    hud.update(gameState.run);
    wrap.appendChild(hud.el);
    const title = document.createElement("h1");
    title.className = "event-title";
    title.textContent = ev.title;
    wrap.appendChild(title);
    const body = document.createElement("p");
    body.className = "event-body";
    body.textContent = ev.body;
    wrap.appendChild(body);

    const choices = document.createElement("div");
    choices.className = "event-choices";
    for (const choice of ev.choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-choice-btn";
      btn.textContent = choice.label;
      const goldCost = choice.cost || choice.costGold || 0;
      btn.disabled = goldCost > gameState.run.gold || (choice.costHp && gameState.run.hp <= choice.costHp);
      btn.addEventListener("click", () => choose(root, choice));
      choices.appendChild(btn);
    }
    wrap.appendChild(choices);
    root.appendChild(wrap);
  },
};
