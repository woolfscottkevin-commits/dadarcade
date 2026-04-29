// Combat scene. DOM-based layout with floating banner overlay for FX-style messages.
// Phase 3: multi-enemy support, target selection, intent telegraph badge,
//          dynamic enemy entry from Pyramid Schemer's Recruit.
// Boss HP scaling is handled inside engine/combat.js based on gameState.run.act.

import { CARDS } from "../data/cards.js";
import { CHARACTERS } from "../data/characters.js";
import { gameState } from "../engine/gameState.js";
import {
  startCombat,
  endPlayerTurn,
  playCard,
  canPlayCard,
  needsTarget,
  setTarget,
  getEffectiveCost,
  setCombatListener,
  peekNextIntent,
} from "../engine/combat.js";
import { setScene } from "../engine/sceneManager.js";
import { STATUS, getStatus } from "../engine/statusEffects.js";
import { getAsset } from "../assets/assetLoader.js";
import { renderCard } from "../ui/cardFrame.js";
import { createHealthBar } from "../ui/healthBar.js";
import { createBlockIndicator } from "../ui/blockIndicator.js";
import { createStatusRow } from "../ui/statusIcons.js";
import { createIntentDisplay, describeIntent } from "../ui/intentDisplay.js";
import { createRunHud } from "../ui/runHud.js";
import { applyReticleTo } from "../ui/targetingReticle.js";
import { playSfx } from "../ui/sfx.js";

let layoutEls = null;
let onKey = null;
let lastYardWork = null;
let yardWorkCoachOpen = false;

// Combat narration: a per-fight log + a paced banner queue so the player can
// see *who did what* during the enemy turn instead of one silent burst.
let combatLog = [];
let bannerQueue = [];
let bannerTimer = null;
let pendingFinish = null;
const BEAT_MS = 700;

const YARD_WORK_COACH_KEY = "dadQuest.coach.yardWork.v2";

function buildLayout(root) {
  root.innerHTML = "";
  const stage = document.createElement("div");
  stage.className = "combat-stage";

  // Run HUD (replaces the standalone relic tray from Phase 2)
  const runHud = createRunHud();
  stage.appendChild(runHud.el);

  const enemyArea = document.createElement("div");
  enemyArea.className = "combat-enemy-area";
  stage.appendChild(enemyArea);

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

  const handEl = document.createElement("div");
  handEl.className = "combat-hand";
  stage.appendChild(handEl);

  const pilesEl = document.createElement("div");
  pilesEl.className = "combat-piles";
  pilesEl.innerHTML = `<span class="pile-label">Draw</span><span class="pile-num" data-pile="draw">0</span><span class="pile-label">Discard</span><span class="pile-num" data-pile="discard">0</span><span class="pile-label">Exhaust</span><span class="pile-num" data-pile="exhaust">0</span>`;
  const logBtn = document.createElement("button");
  logBtn.type = "button";
  logBtn.className = "combat-log-btn";
  logBtn.setAttribute("aria-label", "Open combat log");
  logBtn.innerHTML = `<span aria-hidden="true">📜</span> Log`;
  pilesEl.appendChild(logBtn);
  stage.appendChild(pilesEl);

  const logModal = document.createElement("div");
  logModal.className = "combat-log-modal";
  logModal.hidden = true;
  logModal.innerHTML = `
    <div class="combat-log-card">
      <button type="button" class="combat-log-close" aria-label="Close">×</button>
      <h2>Combat Log</h2>
      <div class="combat-log-list" role="log"></div>
    </div>`;
  stage.appendChild(logModal);

  const banner = document.createElement("div");
  banner.className = "combat-banner";
  banner.style.opacity = "0";
  stage.appendChild(banner);

  const tutorial = document.createElement("div");
  tutorial.className = "combat-tutorial";
  tutorial.hidden = true;
  tutorial.innerHTML = `
    <div class="combat-tutorial-card">
      <button type="button" class="combat-tutorial-close" aria-label="Close">×</button>
      <h2>Quick Briefing</h2>
      <p>Spend energy to play cards. Enemy intent badges tell you what will happen after you end the turn.</p>
      <p>Tap an enemy to target single-target attacks. Block fades at end of turn; HP, deck, gold, and relics carry through the run.</p>
    </div>`;
  stage.appendChild(tutorial);

  const mechanicCoach = document.createElement("div");
  mechanicCoach.className = "combat-tutorial mechanic-coach";
  mechanicCoach.hidden = true;
  mechanicCoach.innerHTML = `
    <div class="combat-tutorial-card mechanic-coach-card">
      <button type="button" class="combat-tutorial-close mechanic-coach-close" aria-label="Close">×</button>
      <div class="mechanic-coach-kicker">Hank mechanic</div>
      <h2>Yard Work is Hank's combo counter</h2>
      <p><strong>It does nothing by itself.</strong> It is a number Hank builds during this fight, then other cards check or spend that number.</p>
      <div class="mechanic-coach-example">
        <div><strong>More Yard Work means:</strong></div>
        <div><strong>Drought Strike</strong> deals Yard Work × 3 damage.</div>
        <div><strong>Garage Workshop</strong> blocks more when you have 3+.</div>
        <div><strong>Weed Whacker</strong> spends it all for bonus damage.</div>
      </div>
      <p class="mechanic-coach-note">If a card says "Gain 2 Yard Work" and you see +3, that's your Lawn Flag relic adding +1.</p>
      <button type="button" class="mechanic-coach-ok">Got it</button>
    </div>`;
  stage.appendChild(mechanicCoach);

  root.appendChild(stage);

  return {
    stage, runHud, enemyArea, portraitImg, playerName, hpBar, blockInd, statusRow,
    energyEl, endBtn, handEl, pilesEl, logBtn, logModal, banner, tutorial, mechanicCoach,
    enemyEls: [],
  };
}

function flashBanner(text, color) {
  if (!layoutEls) return;
  const b = layoutEls.banner;
  b.textContent = text;
  if (color) b.style.borderColor = color;
  b.style.opacity = "1";
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.style.opacity = "0"; }, 1100);
}

function resetCombatNarration() {
  combatLog = [];
  bannerQueue = [];
  if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
  pendingFinish = null;
}

function logEntry(side, text) {
  combatLog.push({ side, text, turn: gameState.combat?.turn ?? 0 });
  if (combatLog.length > 200) combatLog.shift();
}

function queueBanner(text, color) {
  bannerQueue.push({ text, color });
  if (!bannerTimer) drainBanners();
}

function drainBanners() {
  if (!bannerQueue.length) {
    bannerTimer = null;
    if (pendingFinish) {
      const f = pendingFinish;
      pendingFinish = null;
      setTimeout(f, 250);
    }
    return;
  }
  const { text, color } = bannerQueue.shift();
  flashBanner(text, color);
  bannerTimer = setTimeout(drainBanners, BEAT_MS);
}

function intentColor(type) {
  if (type === "attack" || type === "attack_telegraphed" || type === "attack_with_status" ||
      type === "attack_and_disrupt" || type === "attack_with_modifier" || type === "aoe_attack") {
    return "var(--punchy-red)";
  }
  if (type === "block" || type === "block_and_status") return "var(--sky-blue)";
  if (type === "self_buff" || type === "heal_and_buff") return "var(--lawn-green)";
  if (type === "apply_status" || type === "apply_status_aoe_to_player") return "var(--deep-navy)";
  return null;
}

function renderCombatLog() {
  if (!layoutEls) return;
  const list = layoutEls.logModal.querySelector(".combat-log-list");
  list.innerHTML = "";
  if (!combatLog.length) {
    const empty = document.createElement("p");
    empty.className = "combat-log-empty";
    empty.textContent = "Nothing's happened yet. Play a card or end your turn.";
    list.appendChild(empty);
    return;
  }
  let lastTurn = null;
  for (const entry of combatLog) {
    if (entry.turn !== lastTurn) {
      const hdr = document.createElement("div");
      hdr.className = "combat-log-turn";
      hdr.textContent = `Turn ${entry.turn}`;
      list.appendChild(hdr);
      lastTurn = entry.turn;
    }
    const row = document.createElement("div");
    row.className = `combat-log-row combat-log-${entry.side}`;
    row.textContent = entry.text;
    list.appendChild(row);
  }
  list.scrollTop = list.scrollHeight;
}

function openCombatLog() {
  if (!layoutEls) return;
  renderCombatLog();
  layoutEls.logModal.hidden = false;
}

function closeCombatLog() {
  if (!layoutEls) return;
  layoutEls.logModal.hidden = true;
}

function closeYardWorkCoach() {
  if (!layoutEls) return;
  layoutEls.mechanicCoach.hidden = true;
  yardWorkCoachOpen = false;
  try {
    localStorage.setItem(YARD_WORK_COACH_KEY, "1");
  } catch {
    // localStorage can be unavailable in some browser privacy modes.
  }
}

function maybeShowYardWorkCoach(yardWork) {
  if (!layoutEls || yardWork <= 0 || yardWorkCoachOpen) return;
  try {
    if (localStorage.getItem(YARD_WORK_COACH_KEY)) return;
  } catch {
    // If storage is blocked, show once per mounted combat scene.
    if (layoutEls.mechanicCoach.dataset.seenThisMount === "1") return;
  }
  layoutEls.mechanicCoach.hidden = false;
  layoutEls.mechanicCoach.dataset.seenThisMount = "1";
  yardWorkCoachOpen = true;
}

function renderEnemies() {
  const c = gameState.combat;
  layoutEls.enemyArea.innerHTML = "";
  layoutEls.enemyEls = [];
  c.enemies.forEach((enemy, i) => {
    const wrap = document.createElement("div");
    wrap.className = "combat-enemy";
    wrap.dataset.idx = String(i);
    wrap.addEventListener("click", () => {
      if (enemy.hp <= 0) return;
      setTarget(i);
      refresh();
    });

    const intent = createIntentDisplay();
    wrap.appendChild(intent.el);

    // Telegraph badge — shown when the NEXT intent has telegraphedFromPrevious
    const tele = document.createElement("div");
    tele.className = "intent-telegraph";
    tele.style.display = "none";
    wrap.appendChild(tele);

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
    layoutEls.enemyEls.push({ wrap, intent, hpBar, blockInd, statusRow, tele });
  });
}

function refresh() {
  const c = gameState.combat;
  if (!c || !layoutEls) return;

  layoutEls.runHud.update({
    ...gameState.run,
    hp: c.player.hp,
    maxHp: c.player.maxHp,
  });

  const ch = CHARACTERS.find((x) => x.id === c.player.character);
  if (ch) {
    const cached = getAsset(ch.portrait);
    layoutEls.portraitImg.src = cached ? cached.src : ch.portrait;
    layoutEls.portraitImg.alt = ch.name;
    layoutEls.playerName.textContent = ch.name;
  }
  layoutEls.hpBar.update(c.player.hp, c.player.maxHp);
  layoutEls.blockInd.update(getStatus(c.player, STATUS.BLOCK));
  layoutEls.statusRow.update(c.player.statuses, c.player.nextTurnModifiers);
  layoutEls.energyEl.textContent = `${c.energy}/${c.maxEnergy}`;

  const yardWork = getStatus(c.player, STATUS.YARD_WORK);
  if (c.player.character === "hank" && yardWork > 0) {
    if (lastYardWork !== null && yardWork > lastYardWork) {
      flashBanner(`Yard Work ${lastYardWork} → ${yardWork}`, "var(--lawn-green)");
    }
    maybeShowYardWorkCoach(yardWork);
  }
  lastYardWork = yardWork;

  // Re-render enemies if the count changed (e.g., a summon happened)
  if (layoutEls.enemyEls.length !== c.enemies.length) {
    renderEnemies();
  }

  c.enemies.forEach((enemy, i) => {
    const els = layoutEls.enemyEls[i];
    if (!els) return;
    els.intent.update(enemy.nextIntent);
    els.hpBar.update(enemy.hp, enemy.maxHp);
    els.blockInd.update(getStatus(enemy, STATUS.BLOCK));
    els.statusRow.update(enemy.statuses);
    els.wrap.classList.toggle("dead", enemy.hp <= 0);
    // Telegraph badge: peek next intent. If it's flagged telegraphedFromPrevious, render warning.
    const nxt = peekNextIntent(enemy);
    if (nxt && nxt.telegraphedFromPrevious) {
      els.tele.style.display = "inline-block";
      els.tele.textContent = `⚠ NEXT TURN: ${prettyIntent(nxt)}`;
    } else {
      els.tele.style.display = "none";
    }
  });

  // Targeting reticle
  applyReticleTo(layoutEls.enemyEls, c.targetIndex);

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

  layoutEls.pilesEl.querySelector('[data-pile="draw"]').textContent = String(c.piles.drawPile.length);
  layoutEls.pilesEl.querySelector('[data-pile="discard"]').textContent = String(c.piles.discardPile.length);
  layoutEls.pilesEl.querySelector('[data-pile="exhaust"]').textContent = String(c.piles.exhaustPile.length);
}

function prettyIntent(intent) {
  if (intent.type === "attack" || intent.type === "attack_telegraphed") {
    return `Atk ${intent.value}${intent.hits && intent.hits > 1 ? ` ×${intent.hits}` : ""}`;
  }
  if (intent.type === "block") return `Block ${intent.value}`;
  return intent.label || intent.type;
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
  const c = gameState.combat;
  // If single-target attack and current target is dead or not set, auto-pick leftmost alive.
  if (needsTarget(inst)) {
    if (!c.enemies[c.targetIndex] || c.enemies[c.targetIndex].hp <= 0) {
      const idx = c.enemies.findIndex((e) => e.hp > 0);
      if (idx >= 0) c.targetIndex = idx;
    }
  }
  playCard(inst, c.targetIndex);
  playSfx("card");
  refresh();
}

function onListenerEvent(name, payload) {
  if (!layoutEls) return;
  if (name === "turnStart") {
    if (payload.turn > 1) logEntry("system", `— Turn ${payload.turn} —`);
    refresh();
  }
  if (name === "playerHit") {
    playSfx("hit");
    if (layoutEls.hpBar) layoutEls.hpBar.shake();
    const r = payload.result || {};
    const hp = r.hpLost || 0;
    const blocked = r.blockLost || 0;
    const detail = blocked > 0 ? ` (blocked ${blocked})` : "";
    logEntry("enemy", `${payload.enemy.name} hit you for ${hp}${detail}`);
    refresh();
  }
  if (name === "jittersTax") {
    queueBanner(`Jitters! −${payload.amount}`);
    logEntry("system", `Jitters tax: −${payload.amount} HP`);
    if (layoutEls.hpBar) layoutEls.hpBar.shake();
    refresh();
  }
  if (name === "cardPlayed") {
    const cardName = payload.def?.name || payload.cardInst?.cardId || "card";
    logEntry("player", `You played ${cardName}`);
    refresh();
  }
  if (name === "enemyIntent") {
    const summary = `${payload.enemy.name} — ${describeIntent(payload.intent)}`;
    queueBanner(summary, intentColor(payload.intent.type));
    logEntry("enemy", summary);
    refresh();
  }
  if (name === "enemySpawned") {
    queueBanner(`${payload.enemy.name} joined the fight!`);
    logEntry("system", `${payload.enemy.name} joined the fight`);
    renderEnemies();
    refresh();
  }
  if (name === "enemyHit") {
    const tname = payload.target?.name || "enemy";
    logEntry("enemy", `${tname} took ${payload.amount} (friendly fire)`);
  }
  if (name === "playerDiscardForced") {
    const cardName = payload.card?.cardId ? payload.card.cardId.replace(/_/g, " ") : "a card";
    queueBanner(`Discarded — ${cardName}`);
    logEntry("enemy", `Forced you to discard ${cardName}`);
    refresh();
  }
  if (name === "playerDistracted") {
    queueBanner(`${payload.label}! −${payload.amount} cards next turn`, "var(--punchy-red)");
    logEntry("enemy", `${payload.label}: −${payload.amount} cards next turn`);
    refresh();
  }
  if (name === "combatEnd") {
    playSfx(payload.outcome === "victory" ? "victory" : "defeat");
    logEntry("system", payload.outcome === "victory" ? "Victory" : "Defeat");
    const finish = () => {
      if (payload.outcome === "victory") setScene("reward");
      else setScene("gameOver");
    };
    if (bannerQueue.length || bannerTimer) {
      pendingFinish = finish;
    } else {
      setTimeout(finish, 600);
    }
  }
}

export const combatScene = {
  mount(root) {
    layoutEls = buildLayout(root);
    lastYardWork = null;
    yardWorkCoachOpen = false;
    resetCombatNarration();

    setCombatListener(onListenerEvent);

    // Start a fresh map-selected fight, or resume a saved mid-combat snapshot.
    if (gameState.run.pendingFreshCombat || !gameState.combat || gameState.combat.pendingOutcome) {
      const enemyId = gameState.run.pendingEnemy || "aggressive_roomba";
      delete gameState.run.pendingFreshCombat;
      startCombat([enemyId]);
    }
    renderEnemies();
    refresh();

    if (gameState.run.showTutorial) {
      layoutEls.tutorial.hidden = false;
      const close = layoutEls.tutorial.querySelector(".combat-tutorial-close");
      close.addEventListener("click", () => {
        layoutEls.tutorial.hidden = true;
        delete gameState.run.showTutorial;
      });
    }

    const coachClose = layoutEls.mechanicCoach.querySelector(".mechanic-coach-close");
    const coachOk = layoutEls.mechanicCoach.querySelector(".mechanic-coach-ok");
    coachClose.addEventListener("click", closeYardWorkCoach);
    coachOk.addEventListener("click", closeYardWorkCoach);

    layoutEls.endBtn.addEventListener("click", () => {
      playSfx("endTurn");
      endPlayerTurn();
      refresh();
    });

    layoutEls.logBtn.addEventListener("click", openCombatLog);
    layoutEls.logModal.querySelector(".combat-log-close").addEventListener("click", closeCombatLog);
    layoutEls.logModal.addEventListener("click", (e) => {
      if (e.target === layoutEls.logModal) closeCombatLog();
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
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    pendingFinish = null;
    layoutEls = null;
    lastYardWork = null;
    yardWorkCoachOpen = false;
  },
};
