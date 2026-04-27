// Game over scene. Shown after the player's HP hits 0.
// "Try Again" wipes the run and returns to character select.

import { setScene } from "../engine/sceneManager.js";
import { endRun } from "../engine/gameState.js";

export const gameOverScene = {
  mount(root) {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "outcome-wrap";

    const title = document.createElement("h1");
    title.className = "outcome-title outcome-defeat";
    title.textContent = "Defeated";
    wrap.appendChild(title);

    const sub = document.createElement("p");
    sub.className = "outcome-sub";
    sub.textContent = "You were taken down by the Aggressive Roomba.";
    wrap.appendChild(sub);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "outcome-btn";
    btn.textContent = "Try Again";
    btn.addEventListener("click", () => {
      endRun();
      setScene("characterSelect");
    });
    wrap.appendChild(btn);

    root.appendChild(wrap);
  },
};
