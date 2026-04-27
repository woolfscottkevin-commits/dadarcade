// Dad Quest — Phase 2 entry point.
// Boot preload → register all scenes → switch to character select.
// (Phase 1 "Ready" splash is reachable at /dad-quest/?phase=1 for debugging.)

import { ASSET_MANIFEST, TOTAL_ASSETS } from "./assets/assetManifest.js";
import { preloadAssets, getAsset } from "./assets/assetLoader.js";
import { CHARACTERS } from "./data/characters.js";
import { registerScene, setScene } from "./engine/sceneManager.js";
import { characterSelectScene } from "./scenes/characterSelect.js";
import { combatScene } from "./scenes/combat.js";
import { victoryScene } from "./scenes/victory.js";
import { gameOverScene } from "./scenes/gameOver.js";

const boot = document.getElementById("boot");
const app = document.getElementById("app");
const fill = document.getElementById("progress-fill");
const label = document.getElementById("progress-label");
const errorBox = document.getElementById("boot-error");
const progressBar = document.querySelector(".progress-shell");

function updateProgress(loaded, total) {
  const pct = total > 0 ? (loaded / total) * 100 : 0;
  fill.style.width = `${pct}%`;
  label.textContent = `Loading ${loaded} / ${total}`;
  if (progressBar) progressBar.setAttribute("aria-valuenow", String(loaded));
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function showPhase1Splash() {
  app.innerHTML = "";
  const splash = document.createElement("div");
  splash.className = "ready-splash";
  const h1 = document.createElement("h1");
  h1.textContent = "Dad Quest";
  splash.appendChild(h1);
  const p = document.createElement("p");
  p.textContent = `All ${TOTAL_ASSETS} assets loaded ✓`;
  splash.appendChild(p);
  const row = document.createElement("div");
  row.className = "portrait-row";
  for (const c of CHARACTERS) {
    const cached = getAsset(c.portrait);
    const card = document.createElement("div");
    card.className = "portrait-card";
    const img = document.createElement("img");
    img.alt = `${c.name} — ${c.archetype}`;
    img.src = cached ? cached.src : c.portrait;
    card.appendChild(img);
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = `${c.name} — ${c.archetype}`;
    card.appendChild(name);
    row.appendChild(card);
  }
  splash.appendChild(row);
  const tag = document.createElement("small");
  tag.className = "phase-tag";
  tag.textContent = "Phase 1 — foundation";
  splash.appendChild(tag);
  app.appendChild(splash);
  boot.style.display = "none";
  app.style.display = "flex";
}

async function bootSequence() {
  updateProgress(0, TOTAL_ASSETS);
  try {
    await preloadAssets(ASSET_MANIFEST, (loaded, total) => updateProgress(loaded, total));
    console.log(`Dad Quest Phase 2: ${TOTAL_ASSETS} assets loaded.`);

    const phase1Mode = new URLSearchParams(location.search).get("phase") === "1";
    if (phase1Mode) {
      showPhase1Splash();
      return;
    }

    registerScene("characterSelect", characterSelectScene);
    registerScene("combat", combatScene);
    registerScene("victory", victoryScene);
    registerScene("gameOver", gameOverScene);

    boot.style.display = "none";
    app.style.display = "flex";
    setScene("characterSelect");
  } catch (err) {
    showError(err && err.message ? err.message : String(err));
    console.error("[Dad Quest] preload failure:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootSequence);
} else {
  bootSequence();
}
