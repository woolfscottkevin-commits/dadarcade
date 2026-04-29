// Character select scene.
// Phase 3: tapping Begin Run starts a run, generates Act 1 map, jumps to map scene.

import { CHARACTERS } from "../data/characters.js";
import { CARDS } from "../data/cards.js";
import { RELICS } from "../data/relics.js";
import { getAsset } from "../assets/assetLoader.js";
import { gameState, startRun } from "../engine/gameState.js";
import { setScene } from "../engine/sceneManager.js";
import { clearSavedGame, peekSavedGame, saveGame } from "../saves/saveState.js";

let selectedId = null;
let beginBtn = null;
let modalEl = null;

// Skimmer-friendly per-character copy. The data file holds the canonical
// vibe/archetype; this map adds the at-a-glance pitch + difficulty + the
// character-specific short version of their starter relic effect.
const SELECT_COPY = {
  hank: {
    pitch: "Stack Yard Work, then unleash big damage.",
    vibeShort: "Weekend warrior in cargo shorts; slow-burn power.",
    difficulty: "Easy",
    resourceLabel: "Yard Work",
    relicShort: "+1 Yard Work whenever you'd gain it",
  },
  doug: {
    pitch: "Drink coffee. Get strong. Don't blow up.",
    vibeShort: "Corporate jargon as combat; fueled by caffeine.",
    difficulty: "Risk / Reward",
    resourceLabel: "Caffeine",
    relicShort: "Start each combat with 2 Caffeine",
  },
  brenda: {
    pitch: "Cite enemies. Damage scales with paperwork.",
    vibeShort: "Weaponized bureaucracy; status-effect specialist.",
    difficulty: "Combo",
    resourceLabel: "Citations",
    relicShort: "+5 max HP, +1 per non-elite combat won",
  },
};

// Split the starter deck into "basic" (Strike, Defend) and "signature"
// (everything else — the cards that actually define the character).
function splitDeck(starterDeck) {
  const counts = new Map();
  for (const id of starterDeck) counts.set(id, (counts.get(id) || 0) + 1);
  const basics = [];
  const signature = [];
  for (const [id, n] of counts.entries()) {
    const def = CARDS.find((c) => c.id === id);
    if (!def) continue;
    const isBasic = id.startsWith("strike_") || id.startsWith("defend_");
    const label = n > 1 ? `${n}× ${def.name}` : def.name;
    (isBasic ? basics : signature).push(label);
  }
  return { basics, signature };
}

function renderCard(c) {
  const copy = SELECT_COPY[c.id] || {};
  const card = document.createElement("button");
  card.type = "button";
  card.className = "select-card";
  card.dataset.charId = c.id;

  const img = document.createElement("img");
  const cached = getAsset(c.portrait);
  img.src = cached ? cached.src : c.portrait;
  img.alt = c.name;
  card.appendChild(img);

  const body = document.createElement("div");
  body.className = "select-body";

  // Name (existing) — also include the archetype as a subline so the bold
  // playstyle pitch can lead the body without competing with the name.
  const heading = document.createElement("div");
  heading.className = "select-heading";
  heading.innerHTML = `<span class="select-name">${c.name}</span><span class="select-archetype">${c.archetype}</span>`;
  body.appendChild(heading);

  // The pitch — top-level skim line. The single most important sentence on the card.
  if (copy.pitch) {
    const pitch = document.createElement("div");
    pitch.className = "select-pitch";
    pitch.textContent = copy.pitch;
    body.appendChild(pitch);
  }

  // Chip row: HP · Resource · Difficulty
  const chips = document.createElement("div");
  chips.className = "select-chips";
  chips.appendChild(makeChip(`${c.startingHP} HP`, "chip-hp"));
  chips.appendChild(makeChip(copy.resourceLabel || c.signatureMechanic.replace("_", " "), "chip-resource"));
  if (copy.difficulty) chips.appendChild(makeChip(copy.difficulty, "chip-difficulty"));
  body.appendChild(chips);

  // Trimmed vibe — single short flavor line, de-emphasized.
  if (copy.vibeShort) {
    const vibe = document.createElement("div");
    vibe.className = "select-vibe";
    vibe.textContent = copy.vibeShort;
    body.appendChild(vibe);
  }

  // Kit divider — visually separates flavor/at-a-glance from mechanical loadout.
  const divider = document.createElement("div");
  divider.className = "select-divider";
  body.appendChild(divider);

  // Relic — icon + name (bold) + short effect (one line).
  const relicDef = RELICS.find((r) => r.id === c.startingRelic);
  const relic = document.createElement("div");
  relic.className = "select-relic";
  relic.innerHTML = `
    <span class="select-row-icon" aria-hidden="true">🎁</span>
    <span class="select-row-text">
      <strong>${relicDef ? relicDef.name : c.startingRelic}</strong>
      <span class="select-row-detail">${copy.relicShort || (relicDef ? relicDef.description : "")}</span>
    </span>`;
  body.appendChild(relic);

  // Deck — basics dimmed, signature cards highlighted.
  const { basics, signature } = splitDeck(c.starterDeck);
  const deck = document.createElement("div");
  deck.className = "select-deck";
  deck.innerHTML = `
    <span class="select-row-icon" aria-hidden="true">🃏</span>
    <span class="select-row-text">
      <span class="select-deck-basics">${basics.join(" · ")}</span>
      ${signature.length ? `<span class="select-deck-signature">${signature.join(" · ")}</span>` : ""}
    </span>`;
  body.appendChild(deck);

  card.appendChild(body);

  card.addEventListener("click", () => {
    selectedId = c.id;
    document.querySelectorAll(".select-card").forEach((el) => el.classList.toggle("selected", el.dataset.charId === c.id));
    if (beginBtn) beginBtn.disabled = false;
  });

  return card;
}

function makeChip(text, modClass) {
  const el = document.createElement("span");
  el.className = `select-chip ${modClass || ""}`.trim();
  el.textContent = text;
  return el;
}

export const characterSelectScene = {
  mount(root) {
    selectedId = null;
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "select-wrap";

    const title = document.createElement("h1");
    title.className = "select-title";
    title.textContent = "Choose Your Dad";
    wrap.appendChild(title);

    const sub = document.createElement("p");
    sub.className = "select-sub";
    sub.textContent = "Three acts of suburban deckbuilder chaos";
    wrap.appendChild(sub);

    const saved = peekSavedGame();
    if (saved) {
      const continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "select-continue";
      continueBtn.textContent = `Continue Run — Act ${saved.run.act}`;
      continueBtn.addEventListener("click", () => {
        const scene = saved.scene && saved.scene !== "boot" ? saved.scene : "map";
        setScene(scene === "characterSelect" ? "map" : scene);
      });
      wrap.appendChild(continueBtn);
    }

    const row = document.createElement("div");
    row.className = "select-row";
    for (const c of CHARACTERS) row.appendChild(renderCard(c));
    wrap.appendChild(row);

    beginBtn = document.createElement("button");
    beginBtn.type = "button";
    beginBtn.className = "select-begin";
    beginBtn.textContent = "Begin Run";
    beginBtn.disabled = true;
    beginBtn.addEventListener("click", () => {
      if (!selectedId) return;
      clearSavedGame();
      startRun(selectedId);
      saveGame("map");
      maybeShowTutorial();
      setScene("map");
    });
    wrap.appendChild(beginBtn);

    const howTo = document.createElement("button");
    howTo.type = "button";
    howTo.className = "select-howto";
    howTo.textContent = "How to Play";
    howTo.addEventListener("click", () => showHowTo(root));
    wrap.appendChild(howTo);

    root.appendChild(wrap);
  },
  unmount() {
    beginBtn = null;
    modalEl = null;
  },
};

function maybeShowTutorial() {
  try {
    if (localStorage.getItem("dadQuest.tutorialSeen.v1")) return;
    localStorage.setItem("dadQuest.tutorialSeen.v1", "1");
    gameState.run.showTutorial = true;
  } catch {
    gameState.run.showTutorial = true;
  }
}

function showHowTo(root) {
  if (modalEl) modalEl.remove();
  modalEl = document.createElement("div");
  modalEl.className = "howto-modal";
  modalEl.innerHTML = `
    <div class="howto-card">
      <button type="button" class="howto-close" aria-label="Close">×</button>
      <h2>How to Play</h2>
      <p>Pick a character, climb the map, and defeat the Act 3 boss. Combat uses 3 energy per turn and a 5-card hand.</p>
      <p>Enemy intents show what happens next. Block absorbs damage, Vulnerable increases damage taken, Weak reduces outgoing damage, and Strength adds attack damage.</p>
      <p>After fights, take one card or skip. Shops sell cards and relics, events bend the run, and rest sites heal 30% of max HP.</p>
    </div>`;
  modalEl.querySelector(".howto-close").addEventListener("click", () => modalEl.remove());
  root.appendChild(modalEl);
}
