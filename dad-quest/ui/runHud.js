// Top run-summary HUD. Shows act / hp / gold / relics. Used on map + combat.

import { RELICS } from "../data/relics.js";
import { getAsset } from "../assets/assetLoader.js";

export function createRunHud() {
  const root = document.createElement("div");
  root.className = "run-hud";

  const act = document.createElement("div");
  act.className = "run-hud-cell run-hud-act";
  root.appendChild(act);

  const hp = document.createElement("div");
  hp.className = "run-hud-cell run-hud-hp";
  root.appendChild(hp);

  const gold = document.createElement("div");
  gold.className = "run-hud-cell run-hud-gold";
  root.appendChild(gold);

  const relics = document.createElement("div");
  relics.className = "run-hud-cell run-hud-relics";
  root.appendChild(relics);

  return {
    el: root,
    update(run) {
      act.textContent = `Act ${run.act} of 3`;
      hp.innerHTML = `<span class="run-hud-glyph">❤</span><span class="run-hud-num">${Math.max(0, run.hp)} / ${run.maxHp}</span>`;
      gold.innerHTML = `<span class="run-hud-glyph">⛀</span><span class="run-hud-num">${run.gold}</span>`;
      relics.innerHTML = "";
      for (const id of run.relics) {
        const def = RELICS.find((r) => r.id === id);
        if (!def) continue;
        const cell = document.createElement("div");
        cell.className = "run-hud-relic";
        cell.title = `${def.name} — ${def.description}`;
        const cached = getAsset(def.art);
        const img = document.createElement("img");
        img.src = cached ? cached.src : def.art;
        img.alt = def.name;
        cell.appendChild(img);
        relics.appendChild(cell);
      }
    },
  };
}
