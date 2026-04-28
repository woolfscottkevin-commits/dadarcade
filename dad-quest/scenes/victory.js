// Per-combat victory scene — Phase 2 only.
// Phase 3 routes combat wins through scenes/reward.js instead, then map → next combat.
// scenes/runVictory.js is the post-Act-3-boss "you won the run" scene.
// This file stays registered as a fallback in case any code path still calls setScene("victory").

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
