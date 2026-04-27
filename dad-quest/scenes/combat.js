// Combat scene. DOM-based layout with optional canvas overlay reserved for FX.
// Wires the engine into a playable single combat against an Aggressive Roomba.

import { CARDS } from "../data/cards.js";
import { CHARACTERS } from "../data/characters.js";
import { gameState } from "../engine/gameState.js";
import {
  startCombat,
  endPlayerTurn,
  playCard,
  canPlayCard,
  getEffectiveCost,
  setCombatListener,
} from "../engine/combat.js";
import { setScene } from "../engine/sceneManager.js";
import { STATUS, getStatus } from "../engine/statusEffects.js";
import { getAsset } from "../assets/assetLoader.js";
import { renderCard } from "../ui/cardFrame.js";
import { createHealthBar } from "../ui/healthBar.js";
import { createBlockIndicator } from "../ui/blockIndicator.js";
import { createStatusRow } from "../ui/statusIcons.js";
import { createRelicTray } from "../ui/relicTray.js";
import { createIntentDisplay } from "../ui/intentDisplay.js";

let layoutEls = null;
let onKey = null;

function buildLayout(root) {
  root.innerHTML = "";

  const stage = document.createElement("div");
  stage.className = "combat-stage";

  // Top bar — relic tray on right
  const topBar = document.createElement("div");
  topBar.className = "combat-top";
  const enemyArea = document.createElement("div");
  enemyArea.className = "combat-enemy-area";
  const relicTray = createRelicTray();
  topBar.appendChild(enemyArea);
  topBar.appendChild(relicTray.el);
  stage.appendChild(topBar);

  // Player block
  const playerBlock = document.createElement("div");
  playerBlock.className = "combat-player";

  const portrait = document.createElement("div");
  portrait.className = "combat-portrait";
  const portraitImg = document.createElement("img");
  portrait.appendChild(portraitImg);
  playerBlock.appendChild(portrait);

  const playerInfo = document.createElement("div");
  playerInfo.className = "combat-player-info";
  const playerName = document.createElement("div");
  playerName.className = "combat-name";
  const hpBar = createHealthBar();
  const blockInd = createBlockIndicator();
  const statusRow = createStatusRow();
  playerInfo.appendChild(playerName);
  playerInfo.appendChild(hpBar.el);
  playerInfo.appendChild(blockInd.el);
  playerInfo.appendChild(statusRow.el);
  playerBlock.appendChild(playerInfo);

  // Energy + end turn
  const ctrls = document.createElement("div");
  ctrls.className = "combat-ctrls";
  const energyEl = document.createElement("div");
  energyEl.className = "combat-energy";
  const endBtn = document.createElement("button");
  endBtn.type = "button";
  endBtn.className = "combat-end-btn";
  endBtn.textContent = "End Turn";
  ctrls.appendChild(energyEl);
  ctrls.appendChild(endBtn);
  playerBlock.appendChild(ctrls);

  stage.appendChild(playerBlock);

  // Hand
  const handEl = document.createElement("div");
  handEl.className = "combat-hand";
  stage.appendChild(handEl);

  // Pile counts
  const pilesEl = document.createElement("div");
  pilesEl.className = "combat-piles";
  pilesEl.innerHTML = `<span class="pile-label">Draw</span><span class="pile-num" data-pile="draw">0</span><span class="pile-label">Discard</span><span class="pile-num" data-pile="discard">0</span><span class="pile-label">Exhaust</span><span class="pile-num" data-pile="exhaust">0</span>`;
  stage.appendChild(pilesEl);

  // Floating message banner (e.g., "Jitters tax!", "Burnout — unplayable")
  const banner = document.createElement("div");
  banner.className = "combat-banner";
  banner.style.opacity = "0";
  stage.appendChild(banner);

  root.appendChild(stage);

  return {
    stage,
    enemyArea,
    relicTray,
    portraitImg,
    playerName,
    hpBar,
    blockInd,
    statusRow,
    energyEl,
    endBtn,
    handEl,
    pilesEl,
    banner,
    enemyEls: [],
  };
}

function flashBanner(text) {
  if (!layoutEls) return;
  const b = layoutEls.banner;
  b.textContent = text;
  b.style.opacity = "1";
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.style.opacity = "0"; }, 1100);
}

function renderEnemies() {
  const c = gameState.combat;
  layoutEls.enemyArea.innerHTML = "";
  layoutEls.enemyEls = [];
  c.enemies.forEach((enemy, i) => {
    const wrap = document.createElement("div");
    wrap.className = "combat-enemy";
    wrap.dataset.idx = String(i);

    const intent = createIntentDisplay();
    wrap.appendChild(intent.el);

    const sprite = document.createElement("img");
    sprite.className = "combat-enemy-sprite";
    const cached = getAsset(enemy.art);
    sprite.src = cached ? cached.src : enemy.art;
    sprite.alt = enemy.name;
    wrap.appendChild(sprite);

    const name = document.createElement("div");
    name.className = "combat-enemy-name";
    name.textContent = enemy.name;
    wrap.appendChild(name);

    const hpBar = createHealthBar();
    wrap.appendChild(hpBar.el);

    const blockInd = createBlockIndicator();
    wrap.appendChild(blockInd.el);

    const statusRow = createStatusRow();
    wrap.appendChild(statusRow.el);

    layoutEls.enemyArea.appendChild(wrap);
    layoutEls.enemyEls.push({ wrap, intent, hpBar, blockInd, statusRow });
  });
}

function refresh() {
  const c = gameState.combat;
  if (!c || !layoutEls) return;

  const ch = CHARACTERS.find((x) => x.id === c.player.character);
  if (ch) {
    const cached = getAsset(ch.portrait);
    layoutEls.portraitImg.src = cached ? cached.src : ch.portrait;
    layoutEls.portraitImg.alt = ch.name;
    layoutEls.playerName.textContent = ch.name;
  }
  layoutEls.hpBar.update(c.player.hp, c.player.maxHp);
  layoutEls.blockInd.update(getStatus(c.player, STATUS.BLOCK));
  layoutEls.statusRow.update(c.player.statuses);
  layoutEls.relicTray.update(gameState.run.relics);
  layoutEls.energyEl.textContent = `${c.energy}/${c.maxEnergy}`;

  // Enemies
  c.enemies.forEach((enemy, i) => {
    const els = layoutEls.enemyEls[i];
    if (!els) return;
    els.intent.update(enemy.nextIntent);
    els.hpBar.update(enemy.hp, enemy.maxHp);
    els.blockInd.update(getStatus(enemy, STATUS.BLOCK));
    els.statusRow.update(enemy.statuses);
    els.wrap.classList.toggle("dead", enemy.hp <= 0);
  });

  // Hand
  layoutEls.handEl.innerHTML = "";
  c.piles.hand.forEach((inst, idx) => {
    const def = CARDS.find((d) => d.id === inst.cardId);
    if (!def) return;
    const cost = getEffectiveCost(inst);
    const affordable = canPlayCard(inst);
    const card = renderCard(inst, { affordable, effectiveCost: cost });
    if (idx < 9) {
      const kbd = document.createElement("div");
      kbd.className = "card-kbd";
      kbd.textContent = String(idx + 1);
      card.appendChild(kbd);
    }
    card.addEventListener("click", () => onCardTap(inst, card));
    layoutEls.handEl.appendChild(card);
  });

  // Pile counts
  layoutEls.pilesEl.querySelector('[data-pile="draw"]').textContent = String(c.piles.drawPile.length);
  layoutEls.pilesEl.querySelector('[data-pile="discard"]').textContent = String(c.piles.discardPile.length);
  layoutEls.pilesEl.querySelector('[data-pile="exhaust"]').textContent = String(c.piles.exhaustPile.length);
}

function onCardTap(inst, cardEl) {
  const def = CARDS.find((d) => d.id === inst.cardId);
  if (!def) return;
  if (def.effect === "unplayable") {
    cardEl.classList.remove("card-shake");
    void cardEl.offsetWidth;
    cardEl.classList.add("card-shake");
    flashBanner("Burnout — can't play");
    return;
  }
  if (!canPlayCard(inst)) {
    cardEl.classList.remove("card-shake");
    void cardEl.offsetWidth;
    cardEl.classList.add("card-shake");
    flashBanner("Not enough energy");
    return;
  }
  // Auto-target first alive enemy
  const c = gameState.combat;
  const aliveIdx = c.enemies.findIndex((e) => e.hp > 0);
  const result = playCard(inst, aliveIdx >= 0 ? aliveIdx : 0);
  refresh();
}

function onListenerEvent(name, payload) {
  if (!layoutEls) return;
  if (name === "turnStart") refresh();
  if (name === "playerHit") {
    if (layoutEls.hpBar) layoutEls.hpBar.shake();
    refresh();
  }
  if (name === "jittersTax") {
    flashBanner(`Jitters! −${payload.amount}`);
    if (layoutEls.hpBar) layoutEls.hpBar.shake();
    refresh();
  }
  if (name === "cardPlayed") refresh();
  if (name === "enemyIntent") refresh();
  if (name === "combatEnd") {
    setTimeout(() => {
      if (payload.outcome === "victory") setScene("victory");
      else setScene("gameOver");
    }, 600);
  }
}

export const combatScene = {
  mount(root) {
    layoutEls = buildLayout(root);

    // Default v1 fight: one Aggressive Roomba.
    setCombatListener(onListenerEvent);
    startCombat(["aggressive_roomba"]);
    renderEnemies();
    refresh();

    layoutEls.endBtn.addEventListener("click", () => {
      endPlayerTurn();
      refresh();
    });

    onKey = (e) => {
      if (gameState.scene !== "combat") return;
      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        const inst = gameState.combat?.piles.hand[idx];
        if (!inst) return;
        const cardEl = layoutEls.handEl.children[idx];
        onCardTap(inst, cardEl);
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        endPlayerTurn();
        refresh();
      }
    };
    window.addEventListener("keydown", onKey);
  },
  unmount() {
    setCombatListener(null);
    if (onKey) {
      window.removeEventListener("keydown", onKey);
      onKey = null;
    }
    layoutEls = null;
  },
};
