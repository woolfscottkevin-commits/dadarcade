// Post-combat reward scene.
// Awards gold immediately on entry. Offers 3 cards or skip.
// Routes back to map (or runVictory after Act 3 boss).

import { CARDS } from "../data/cards.js";
import { RELICS } from "../data/relics.js";
import { gameState, addCardToDeck, addRelicToRun, advanceAct, markCurrentNodeCompleted } from "../engine/gameState.js";
import { setScene } from "../engine/sceneManager.js";
import { generateCardRewards, awardGold, generateRelicRewards } from "../engine/rewards.js";
import { saveGame } from "../saves/saveState.js";
import { renderCard } from "../ui/cardFrame.js";

let cleanup = null;

function routeNext(wasBoss) {
  if (wasBoss) {
    const result = advanceAct();
    if (result === "runVictory") {
      saveGame("runVictory");
      setScene("runVictory");
    } else {
      saveGame("map");
      setScene("map");
    }
  } else {
    saveGame("map");
    setScene("map");
  }
}

function renderRelicChoice(root, wasBoss, choices) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "reward-wrap";
  const title = document.createElement("h1");
  title.className = "reward-title";
  title.textContent = "Relic Found!";
  wrap.appendChild(title);
  const row = document.createElement("div");
  row.className = "reward-relics";
  for (const id of choices) {
    const relic = RELICS.find((r) => r.id === id);
    if (!relic) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reward-relic-choice";
    btn.innerHTML = `<img src="${relic.art}" alt="${relic.name}"><strong>${relic.name}</strong><span>${relic.description}</span>`;
    btn.addEventListener("click", () => {
      addRelicToRun(id);
      routeNext(wasBoss);
    });
    row.appendChild(btn);
  }
  wrap.appendChild(row);
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "reward-skip-btn";
  skip.textContent = "Skip Relic";
  skip.addEventListener("click", () => routeNext(wasBoss));
  wrap.appendChild(skip);
  root.appendChild(wrap);
}

export const rewardScene = {
  mount(root) {
    root.innerHTML = "";

    const wasBoss = !!gameState.run.pendingIsBoss;
    const tier = wasBoss ? "boss" : (gameState.run.pendingNodeType === "elite" ? "elite" : "normal");
    const wasElite = tier === "elite";

    // Mark the node we just completed
    markCurrentNodeCompleted();
    if (tier === "normal" && gameState.run.relics.includes("pocket_square")) {
      gameState.run.maxHp += 1;
      gameState.run.hp = Math.min(gameState.run.maxHp, gameState.run.hp + 1);
    }

    // Award gold immediately
    const goldGained = awardGold(tier);
    gameState.run.gold += goldGained;

    // Generate 3 card offerings
    const offerings = generateCardRewards(tier, gameState.run.character);

    const trophyChoices = wasElite && gameState.run.relics.includes("the_trophy")
      ? generateRelicRewards(3, false)
      : [];

    // Clear the transient pendingEnemy / pendingIsBoss fields after awards computed
    delete gameState.run.pendingEnemy;
    delete gameState.run.pendingIsBoss;
    delete gameState.run.pendingNodeType;
    delete gameState.run.pendingFreshCombat;
    saveGame("reward");

    const wrap = document.createElement("div");
    wrap.className = "reward-wrap";

    const title = document.createElement("h1");
    title.className = "reward-title";
    title.textContent = "Combat Won!";
    wrap.appendChild(title);

    const goldLine = document.createElement("p");
    goldLine.className = "reward-gold";
    goldLine.textContent = `+${goldGained} gold (total ${gameState.run.gold})`;
    wrap.appendChild(goldLine);

    const sub = document.createElement("p");
    sub.className = "reward-sub";
    sub.textContent = offerings.length > 0 ? "Pick a card to add to your deck — or skip." : "No new card rewards available.";
    wrap.appendChild(sub);

    const cardsRow = document.createElement("div");
    cardsRow.className = "reward-cards";
    for (const cid of offerings) {
      const def = CARDS.find((c) => c.id === cid);
      if (!def) continue;
      const cell = document.createElement("div");
      cell.className = "reward-cell";
      const cardEl = renderCard({ uuid: `reward_${cid}`, cardId: cid }, { effectiveCost: def.cost });
      cell.appendChild(cardEl);
      const takeBtn = document.createElement("button");
      takeBtn.type = "button";
      takeBtn.className = "reward-take-btn";
      takeBtn.textContent = "Take";
      takeBtn.addEventListener("click", () => {
        addCardToDeck(cid);
        saveGame("reward");
        if (trophyChoices.length) renderRelicChoice(root, wasBoss, trophyChoices);
        else routeNext(wasBoss);
      });
      cell.appendChild(takeBtn);
      cardsRow.appendChild(cell);
    }
    wrap.appendChild(cardsRow);

    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "reward-skip-btn";
    skip.textContent = "Skip";
    skip.addEventListener("click", () => {
      if (trophyChoices.length) renderRelicChoice(root, wasBoss, trophyChoices);
      else routeNext(wasBoss);
    });
    wrap.appendChild(skip);

    root.appendChild(wrap);

    cleanup = null;
  },
  unmount() {
    if (cleanup) cleanup();
    cleanup = null;
  },
};
