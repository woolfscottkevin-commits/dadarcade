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
import { createIntentDisplay, describeIntent, describeIntentVerbose } from "../ui/intentDisplay.js";
import { createRunHud } from "../ui/runHud.js";
import { applyReticleTo } from "../ui/targetingReticle.js";
import { playSfx } from "../ui/sfx.js";

let layoutEls = null;
let onKey = null;
let lastYardWork = null;
let yardWorkCoachOpen = false;

// Combat narration: a per-fight log + a tap-to-advance banner queue so the
// player can read each enemy action at their own pace, with the effect
// (damage breakdown, status meanings) spelled out.
let combatLog = [];
let bannerQueue = [];     // [{ title, details: string[], color }]
let currentBanner = null; // the entry currently shown on the banner element
let actionBuffer = null;  // accumulator while an enemy action is in flight
let pendingFinish = null;
let bannerEnabledAt = 0;  // earliest Date.now() at which the current banner accepts taps

const MIN_READ_MS = 1000;

const STATUS_EXPLAIN = {
  vulnerable: "Take 50% more attack damage while active.",
  weak: "Deals 25% less attack damage while active.",
  strength: "Adds bonus damage to every attack.",
  citation: "Brenda's HOA combos scale with citations on enemies.",
  caffeine: "Doug's fuel — some office cards spend or reward it.",
  yard_work: "Hank's combo counter — other yard cards check or spend it.",
};

function statusLabel(key) {
  return (key || "").charAt(0).toUpperCase() + (key || "").slice(1).replace(/_/g, " ");
}

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

// Immediate flash for player-side feedback (yard work changes, "not enough
// energy", "Burnout — can't play"). Auto-fades. Skipped if a narration banner
// is currently displayed.
function flashBanner(text, color) {
  if (!layoutEls) return;
  if (currentBanner) return;
  const b = layoutEls.banner;
  b.classList.remove("combat-banner--narration");
  b.innerHTML = `<div class="combat-banner-title">${text}</div>`;
  b.style.borderColor = color || "var(--punchy-red)";
  b.style.opacity = "1";
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.style.opacity = "0"; }, 1100);
}

function resetCombatNarration() {
  combatLog = [];
  bannerQueue = [];
  currentBanner = null;
  actionBuffer = null;
  pendingFinish = null;
  if (layoutEls?.banner) {
    layoutEls.banner.style.opacity = "0";
    layoutEls.banner.classList.remove("combat-banner--narration");
  }
}

function logEntry(side, text) {
  combatLog.push({ side, text, turn: gameState.combat?.turn ?? 0 });
  if (combatLog.length > 200) combatLog.shift();
}

function isNarrating() {
  return currentBanner !== null;
}

function pushBanner(entry) {
  bannerQueue.push(entry);
  if (!currentBanner) showNextBanner();
}

function showNextBanner() {
  if (!layoutEls) return;
  if (!bannerQueue.length) {
    currentBanner = null;
    const b = layoutEls.banner;
    b.style.opacity = "0";
    b.classList.remove("combat-banner--narration");
    if (pendingFinish) {
      const f = pendingFinish;
      pendingFinish = null;
      setTimeout(f, 350);
    }
    refresh();
    return;
  }
  currentBanner = bannerQueue.shift();
  renderBanner(currentBanner);
  refresh();
}

function renderBanner(entry) {
  if (!layoutEls) return;
  const b = layoutEls.banner;
  b.classList.add("combat-banner--narration");
  clearTimeout(b._t);
  b.innerHTML = "";
  const titleEl = document.createElement("div");
  titleEl.className = "combat-banner-title";
  titleEl.textContent = entry.title;
  b.appendChild(titleEl);
  for (const detail of entry.details || []) {
    const d = document.createElement("div");
    d.className = "combat-banner-detail";
    d.textContent = detail;
    b.appendChild(d);
  }
  const hint = document.createElement("div");
  hint.className = "combat-banner-hint";
  hint.textContent = "Reading…";
  b.appendChild(hint);
  b.style.borderColor = entry.color || "var(--punchy-red)";
  b.style.opacity = "1";

  bannerEnabledAt = Date.now() + MIN_READ_MS;
  setTimeout(() => {
    if (currentBanner !== entry || !layoutEls) return;
    const h = layoutEls.banner.querySelector(".combat-banner-hint");
    if (!h) return;
    const remaining = bannerQueue.length;
    h.textContent = remaining > 0
      ? `Tap to continue · ${remaining} more`
      : "Tap to continue";
  }, MIN_READ_MS);
}

function tryAdvanceBanner() {
  if (!currentBanner) return;
  if (Date.now() < bannerEnabledAt) return;
  showNextBanner();
}

// Aggregator: build one rich banner per enemy action.
function startAction(title, color) {
  flushAction();
  actionBuffer = { title, details: [], color: color || null, hits: [], reasons: new Set() };
}

function addDetail(text) {
  if (actionBuffer) actionBuffer.details.push(text);
  else pushBanner({ title: text, details: [], color: null });
}

function recordHit(intentValue, result, enemy) {
  if (!actionBuffer) return;
  actionBuffer.hits.push({
    base: intentValue ?? 0,
    final: result.finalDamage || 0,
    blocked: result.blockLost || 0,
    hp: result.hpLost || 0,
  });
  const atkStr = (enemy?.statuses?.strength) || 0;
  const atkWeak = (enemy?.statuses?.weak) || 0;
  const playerVuln = (gameState.combat?.player?.statuses?.vulnerable) || 0;
  if (atkStr > 0) actionBuffer.reasons.add(`+${atkStr} Strength on attacker`);
  if (atkWeak > 0) actionBuffer.reasons.add("Attacker is Weak (−25% damage)");
  if (playerVuln > 0) actionBuffer.reasons.add("You are Vulnerable (+50% damage taken)");
}

function summarizeHits() {
  if (!actionBuffer || !actionBuffer.hits.length) return;
  const hits = actionBuffer.hits;
  const totalHp = hits.reduce((s, h) => s + h.hp, 0);
  const totalBlocked = hits.reduce((s, h) => s + h.blocked, 0);
  const totalBase = hits.reduce((s, h) => s + h.base, 0);
  const totalFinal = hits.reduce((s, h) => s + h.final, 0);

  let line;
  if (hits.length > 1) {
    if (totalHp === 0 && totalBlocked > 0) {
      line = `Hit ${hits.length} times — blocked all ${totalBlocked} damage.`;
    } else {
      line = `Hit ${hits.length} times — total ${totalFinal} damage; blocked ${totalBlocked}, you took ${totalHp} HP.`;
    }
  } else {
    if (totalHp === 0 && totalBlocked > 0) line = `Blocked all ${totalBlocked} damage.`;
    else if (totalBlocked > 0) line = `Blocked ${totalBlocked}, you took ${totalHp} HP.`;
    else if (totalHp > 0) line = `You took ${totalHp} HP.`;
    else line = "No damage.";
  }

  if (totalFinal !== totalBase || actionBuffer.reasons.size > 0) {
    const reasons = Array.from(actionBuffer.reasons);
    const why = reasons.length ? ` — ${reasons.join("; ")}` : "";
    line += ` (Base ${totalBase} → ${totalFinal}${why}.)`;
  }
  actionBuffer.details.push(line);
}

function flushAction() {
  if (actionBuffer) {
    summarizeHits();
    pushBanner({ title: actionBuffer.title, details: actionBuffer.details, color: actionBuffer.color });
    actionBuffer = null;
  }
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
  if (isNarrating()) return;
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
    flushAction();
    if (payload.turn > 1) logEntry("system", `— Turn ${payload.turn} —`);
    refresh();
  }
  if (name === "playerHit") {
    playSfx("hit");
    if (layoutEls.hpBar) layoutEls.hpBar.shake();
    const r = payload.result || {};
    const hp = r.hpLost || 0;
    const blocked = r.blockLost || 0;
    const intentValue = actionBuffer?._intentValue ?? null;
    recordHit(intentValue, r, payload.enemy);
    logEntry("enemy", `${payload.enemy.name} hit you for ${hp}${blocked > 0 ? ` (blocked ${blocked})` : ""}`);
    refresh();
  }
  if (name === "jittersTax") {
    startAction("Jitters!", "var(--punchy-red)");
    addDetail(`You took ${payload.amount} damage from too much caffeine.`);
    flushAction();
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
    const enemy = payload.enemy;
    const intent = payload.intent;
    const verbose = describeIntentVerbose(intent);
    const title = `${enemy.name}: ${verbose}`;
    startAction(title, intentColor(intent.type));
    actionBuffer._intentValue = intent.value || null;
    const explainStatus = (key) => {
      const meaning = STATUS_EXPLAIN[key];
      if (meaning) addDetail(`${statusLabel(key)} — ${meaning}`);
    };
    if (intent.status) explainStatus(intent.status);
    if (Array.isArray(intent.statuses)) {
      for (const s of intent.statuses) explainStatus(s.status);
    }
    logEntry("enemy", `${enemy.name} — ${describeIntent(intent)}`);
    refresh();
  }
  if (name === "enemySpawned") {
    addDetail(`${payload.enemy.name} joined the fight!`);
    logEntry("system", `${payload.enemy.name} joined the fight`);
    renderEnemies();
    refresh();
  }
  if (name === "enemyHit") {
    const tname = payload.target?.name || "enemy";
    addDetail(`${tname} took ${payload.amount} damage (friendly fire).`);
    logEntry("enemy", `${tname} took ${payload.amount} (friendly fire)`);
  }
  if (name === "playerDiscardForced") {
    const cardName = payload.card?.cardId ? payload.card.cardId.replace(/_/g, " ") : "a card";
    addDetail(`Forced discard: ${cardName}.`);
    logEntry("enemy", `Forced you to discard ${cardName}`);
    refresh();
  }
  if (name === "playerDistracted") {
    // Pop Quiz is already named in the verbose intent title; no extra banner
    // line needed. Just log it for the combat-log scrollback.
    logEntry("enemy", `${payload.label}: −${payload.amount} cards next turn`);
    refresh();
  }
  if (name === "combatEnd") {
    flushAction();
    playSfx(payload.outcome === "victory" ? "victory" : "defeat");
    logEntry("system", payload.outcome === "victory" ? "Victory" : "Defeat");
    const finish = () => {
      if (payload.outcome === "victory") setScene("reward");
      else setScene("gameOver");
    };
    if (currentBanner || bannerQueue.length) {
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
      if (isNarrating()) return;
      playSfx("endTurn");
      endPlayerTurn();
      refresh();
    });

    layoutEls.logBtn.addEventListener("click", openCombatLog);
    layoutEls.logModal.querySelector(".combat-log-close").addEventListener("click", closeCombatLog);
    layoutEls.logModal.addEventListener("click", (e) => {
      if (e.target === layoutEls.logModal) closeCombatLog();
    });

    layoutEls.banner.addEventListener("click", tryAdvanceBanner);

    onKey = (e) => {
      if (gameState.scene !== "combat") return;
      if (isNarrating()) {
        if (e.key === " " || e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          tryAdvanceBanner();
        }
        return;
      }
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
    pendingFinish = null;
    bannerQueue = [];
    currentBanner = null;
    actionBuffer = null;
    layoutEls = null;
    lastYardWork = null;
    yardWorkCoachOpen = false;
  },
};
