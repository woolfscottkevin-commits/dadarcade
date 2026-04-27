// Row of relic icons. Tap/hover for tooltip.

import { RELICS } from "../data/relics.js";
import { getAsset } from "../assets/assetLoader.js";

export function createRelicTray() {
  const root = document.createElement("div");
  root.className = "relic-tray";
  return {
    el: root,
    update(relicIds) {
      root.innerHTML = "";
      for (const id of relicIds) {
        const def = RELICS.find((r) => r.id === id);
        if (!def) continue;
        const cell = document.createElement("div");
        cell.className = "relic-cell";
        cell.title = `${def.name} — ${def.description}`;
        const img = document.createElement("img");
        const cached = getAsset(def.art);
        img.src = cached ? cached.src : def.art;
        img.alt = def.name;
        cell.appendChild(img);
        root.appendChild(cell);
      }
    },
  };
}
