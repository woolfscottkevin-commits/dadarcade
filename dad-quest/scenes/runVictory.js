// Run-victory scene. Shown after defeating the Act 3 boss.
// Distinct from per-combat victory.js (which Phase 3 routes through reward.js instead).

import { gameState, endRun } from "../engine/gameState.js";
import { setScene } from "../engine/sceneManager.js";
import { CHARACTERS } from "../data/characters.js";
import { clearSavedGame } from "../saves/saveState.js";

export const runVictoryScene = {
  mount(root) {
    root.innerHTML = "";

    const ch = CHARACTERS.find((c) => c.id === gameState.run.character);
    const wrap = document.createElement("div");
    wrap.className = "outcome-wrap run-victory";

    // Confetti via CSS keyframes
    const confetti = document.createElement("div");
    confetti.className = "confetti-layer";
    for (let i = 0; i < 40; i++) {
      const dot = document.createElement("span");
      dot.className = "confetti";
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.animationDelay = `${Math.random() * 1.5}s`;
      dot.style.background = pickConfettiColor();
      confetti.appendChild(dot);
    }
    wrap.appendChild(confetti);

    const title = document.createElement("h1");
    title.className = "outcome-title outcome-victory";
    title.textContent = "Run Complete!";
    wrap.appendChild(title);

    const sub = document.createElement("p");
    sub.className = "outcome-sub";
    sub.textContent = `${ch ? ch.name : "Your dad"} defeated The Ultimate HOA President.`;
    wrap.appendChild(sub);

    const stats = document.createElement("div");
    stats.className = "outcome-stats";
    stats.innerHTML = `
      <div>Combats won: <strong>${gameState.run.combatsWon}</strong></div>
      <div>Gold remaining: <strong>${gameState.run.gold}</strong></div>
      <div>Final deck size: <strong>${gameState.run.deck.length}</strong></div>
      <div>HP: <strong>${gameState.run.hp} / ${gameState.run.maxHp}</strong></div>
      <div>Relics: <strong>${gameState.run.relics.length}</strong></div>
    `;
    wrap.appendChild(stats);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "outcome-btn";
    btn.textContent = "Return to Character Select";
    btn.addEventListener("click", () => {
      endRun();
      clearSavedGame();
      setScene("characterSelect");
    });
    wrap.appendChild(btn);

    root.appendChild(wrap);
  },
};

function pickConfettiColor() {
  const colors = ["#FB8C00", "#7CB342", "#4FC3F7", "#E53935", "#1A237E", "#FFF3E0"];
  return colors[Math.floor(Math.random() * colors.length)];
}
