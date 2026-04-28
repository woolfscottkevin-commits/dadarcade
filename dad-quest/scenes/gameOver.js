// Game over scene. Phase 3: includes run summary stats.

import { setScene } from "../engine/sceneManager.js";
import { endRun, gameState } from "../engine/gameState.js";
import { CHARACTERS } from "../data/characters.js";
import { clearSavedGame } from "../saves/saveState.js";

export const gameOverScene = {
  mount(root) {
    root.innerHTML = "";
    const ch = CHARACTERS.find((c) => c.id === gameState.run.character);
    const wrap = document.createElement("div");
    wrap.className = "outcome-wrap";

    const title = document.createElement("h1");
    title.className = "outcome-title outcome-defeat";
    title.textContent = "Defeated";
    wrap.appendChild(title);

    const sub = document.createElement("p");
    sub.className = "outcome-sub";
    sub.textContent = ch
      ? `${ch.name} fell in Act ${gameState.run.act}.`
      : "The run ends.";
    wrap.appendChild(sub);

    const stats = document.createElement("div");
    stats.className = "outcome-stats";
    stats.innerHTML = `
      <div>Combats won: <strong>${gameState.run.combatsWon}</strong></div>
      <div>Act reached: <strong>${gameState.run.act}</strong></div>
      <div>Gold: <strong>${gameState.run.gold}</strong></div>
      <div>Final deck size: <strong>${gameState.run.deck.length}</strong></div>
    `;
    wrap.appendChild(stats);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "outcome-btn";
    btn.textContent = "Try Again";
    btn.addEventListener("click", () => {
      endRun();
      clearSavedGame();
      setScene("characterSelect");
    });
    wrap.appendChild(btn);

    root.appendChild(wrap);
  },
};
