// Character select scene.
// Phase 3: tapping Begin Run starts a run, generates Act 1 map, jumps to map scene.

import { CHARACTERS } from "../data/characters.js";
import { CARDS } from "../data/cards.js";
import { RELICS } from "../data/relics.js";
import { getAsset } from "../assets/assetLoader.js";
import { startRun } from "../engine/gameState.js";
import { setScene } from "../engine/sceneManager.js";

let selectedId = null;
let beginBtn = null;

function deckSummary(starterDeck) {
  const counts = new Map();
  for (const id of starterDeck) counts.set(id, (counts.get(id) || 0) + 1);
  const parts = [];
  for (const [id, n] of counts.entries()) {
    const def = CARDS.find((c) => c.id === id);
    if (!def) continue;
    parts.push(n > 1 ? `${def.name} ×${n}` : def.name);
  }
  return parts;
}

function relicSummary(id) {
  const r = RELICS.find((x) => x.id === id);
  return r ? `${r.name} — ${r.description}` : id;
}

function renderCard(c) {
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

  const name = document.createElement("div");
  name.className = "select-name";
  name.textContent = `${c.name} — ${c.archetype}`;
  body.appendChild(name);

  const stats = document.createElement("div");
  stats.className = "select-stats";
  stats.textContent = `HP ${c.startingHP} · ${c.signatureMechanic.replace("_", " ")}`;
  body.appendChild(stats);

  const vibe = document.createElement("div");
  vibe.className = "select-vibe";
  vibe.textContent = c.vibe;
  body.appendChild(vibe);

  const relicLine = document.createElement("div");
  relicLine.className = "select-relic";
  relicLine.textContent = `Starter relic: ${relicSummary(c.startingRelic)}`;
  body.appendChild(relicLine);

  const deckLine = document.createElement("div");
  deckLine.className = "select-deck";
  deckLine.textContent = `Starter deck: ${deckSummary(c.starterDeck).join(", ")}`;
  body.appendChild(deckLine);

  card.appendChild(body);

  card.addEventListener("click", () => {
    selectedId = c.id;
    document.querySelectorAll(".select-card").forEach((el) => el.classList.toggle("selected", el.dataset.charId === c.id));
    if (beginBtn) beginBtn.disabled = false;
  });

  return card;
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
    sub.textContent = "Phase 3 — full 3-act run";
    wrap.appendChild(sub);

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
      startRun(selectedId);
      setScene("map");
    });
    wrap.appendChild(beginBtn);

    root.appendChild(wrap);
  },
  unmount() {
    beginBtn = null;
  },
};
