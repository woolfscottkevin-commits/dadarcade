// Phase 4 shop scene: buy cards, buy relics, or remove one card.

import { CARDS } from "../data/cards.js";
import { RELICS } from "../data/relics.js";
import { gameState, addCardToDeck, addRelicToRun, markCurrentNodeCompleted, removeCardFromDeck, spendGold } from "../engine/gameState.js";
import { generateShopInventory } from "../engine/rewards.js";
import { setScene } from "../engine/sceneManager.js";
import { saveGame } from "../saves/saveState.js";
import { renderCard } from "../ui/cardFrame.js";
import { createRunHud } from "../ui/runHud.js";

function currentNode() {
  const id = gameState.run.position;
  for (const row of gameState.run.map?.rows || []) {
    if (!row) continue;
    const node = row.find((n) => n.id === id);
    if (node) return node;
  }
  return null;
}

function ensureInventory() {
  const node = currentNode();
  if (!node) return generateShopInventory(gameState.run.character);
  if (!node.shopInventory) node.shopInventory = generateShopInventory(gameState.run.character);
  return node.shopInventory;
}

function finishShop() {
  markCurrentNodeCompleted();
  saveGame("map");
  setScene("map");
}

export const shopScene = {
  mount(root) {
    root.innerHTML = "";
    const inventory = ensureInventory();

    const wrap = document.createElement("div");
    wrap.className = "shop-wrap";
    const hud = createRunHud();
    hud.update(gameState.run);
    wrap.appendChild(hud.el);

    const title = document.createElement("h1");
    title.className = "shop-title";
    title.textContent = "Shop";
    wrap.appendChild(title);

    const cards = document.createElement("section");
    cards.className = "shop-section";
    cards.innerHTML = `<h2>Cards</h2>`;
    const cardGrid = document.createElement("div");
    cardGrid.className = "shop-card-grid";
    for (const item of inventory.cards) {
      const def = CARDS.find((c) => c.id === item.cardId);
      if (!def) continue;
      const cell = document.createElement("div");
      cell.className = "shop-cell";
      cell.appendChild(renderCard({ uuid: `shop_${item.cardId}`, cardId: item.cardId }, { effectiveCost: def.cost }));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-buy-btn";
      btn.textContent = item.sold ? "Sold" : `${item.price} gold`;
      btn.disabled = item.sold || gameState.run.gold < item.price;
      btn.addEventListener("click", () => {
        if (!spendGold(item.price)) return;
        addCardToDeck(item.cardId);
        item.sold = true;
        saveGame("shop");
        shopScene.mount(root);
      });
      cell.appendChild(btn);
      cardGrid.appendChild(cell);
    }
    cards.appendChild(cardGrid);
    wrap.appendChild(cards);

    const relics = document.createElement("section");
    relics.className = "shop-section";
    relics.innerHTML = `<h2>Relics</h2>`;
    const relicGrid = document.createElement("div");
    relicGrid.className = "shop-relic-grid";
    for (const item of inventory.relics) {
      const def = RELICS.find((r) => r.id === item.relicId);
      if (!def) continue;
      const cell = document.createElement("div");
      cell.className = "shop-relic";
      cell.innerHTML = `<img src="${def.art}" alt="${def.name}"><strong>${def.name}</strong><span>${def.description}</span>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-buy-btn";
      btn.textContent = item.sold ? "Sold" : `${item.price} gold`;
      btn.disabled = item.sold || gameState.run.gold < item.price;
      btn.addEventListener("click", () => {
        if (!spendGold(item.price)) return;
        addRelicToRun(item.relicId);
        item.sold = true;
        saveGame("shop");
        shopScene.mount(root);
      });
      cell.appendChild(btn);
      relicGrid.appendChild(cell);
    }
    relics.appendChild(relicGrid);
    wrap.appendChild(relics);

    const remove = document.createElement("section");
    remove.className = "shop-section shop-remove";
    remove.innerHTML = `<h2>Card Removal</h2>`;
    const removeRow = document.createElement("div");
    removeRow.className = "shop-remove-row";
    if (inventory.removedCard) {
      removeRow.textContent = "Card removal already used.";
    } else {
      const select = document.createElement("select");
      select.className = "shop-remove-select";
      for (const inst of gameState.run.deck) {
        const def = CARDS.find((c) => c.id === inst.cardId);
        if (!def) continue;
        const opt = document.createElement("option");
        opt.value = inst.uuid;
        opt.textContent = def.name;
        select.appendChild(opt);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-buy-btn";
      btn.textContent = `Remove (${inventory.removalPrice} gold)`;
      btn.disabled = gameState.run.gold < inventory.removalPrice || gameState.run.deck.length <= 1;
      btn.addEventListener("click", () => {
        if (!spendGold(inventory.removalPrice)) return;
        removeCardFromDeck(select.value);
        inventory.removedCard = true;
        saveGame("shop");
        shopScene.mount(root);
      });
      removeRow.appendChild(select);
      removeRow.appendChild(btn);
    }
    remove.appendChild(removeRow);
    wrap.appendChild(remove);

    const leave = document.createElement("button");
    leave.type = "button";
    leave.className = "shop-leave-btn";
    leave.textContent = "Leave Shop";
    leave.addEventListener("click", finishShop);
    wrap.appendChild(leave);

    root.appendChild(wrap);
  },
};
