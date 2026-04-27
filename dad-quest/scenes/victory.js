// Victory scene. Shown after the player wins a combat.
// Phase 2: just a confirmation + "Return to Character Select" button.
// Phase 3 will replace this with the pick-1-of-3-card reward flow.

import { setScene } from "../engine/sceneManager.js";
import { endRun, gameState } from "../engine/gameState.js";

export const victoryScene = {
  mount(root) {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "outcome-wrap";

    const title = document.createElement("h1");
    title.className = "outcome-title outcome-victory";
    title.textContent = "Victory!";
    wrap.appendChild(title);

    const sub = document.createElement("p");
    sub.className = "outcome-sub";
    sub.textContent = "You defeated the Aggressive Roomba.";
    wrap.appendChild(sub);

    const stats = document.createElement("p");
    stats.className = "outcome-stats";
    stats.textContent = `HP remaining: ${gameState.run.hp} / ${gameState.run.maxHp}`;
    wrap.appendChild(stats);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "outcome-btn";
    btn.textContent = "Return to Character Select";
    btn.addEventListener("click", () => {
      endRun();
      setScene("characterSelect");
    });
    wrap.appendChild(btn);

    root.appendChild(wrap);
  },
};
