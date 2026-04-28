// Rest site scene. v1 = heal only (no card upgrade — that's v2 backlog).

import { gameState, markCurrentNodeCompleted } from "../engine/gameState.js";
import { setScene } from "../engine/sceneManager.js";

const REST_HEAL_PERCENT = 0.30;

export const restScene = {
  mount(root) {
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "rest-wrap";

    const title = document.createElement("h1");
    title.className = "rest-title";
    title.textContent = "Rest Site";
    wrap.appendChild(title);

    // Simple campfire SVG (palette-locked)
    const fire = document.createElement("div");
    fire.className = "rest-fire";
    fire.innerHTML = `
      <svg viewBox="0 0 64 64" width="84" height="84" aria-hidden="true">
        <ellipse cx="32" cy="56" rx="24" ry="4" fill="#D7CCC8"/>
        <rect x="6" y="46" width="52" height="6" rx="2" fill="#6D4C41"/>
        <path d="M32 18 C 22 32 18 38 32 50 C 46 38 42 32 32 18 Z" fill="#FB8C00"/>
        <path d="M32 28 C 26 36 24 40 32 48 C 40 40 38 36 32 28 Z" fill="#E53935"/>
      </svg>`;
    wrap.appendChild(fire);

    const healAmount = Math.ceil(gameState.run.maxHp * REST_HEAL_PERCENT);
    const desc = document.createElement("p");
    desc.className = "rest-desc";
    desc.textContent = `Heal ${healAmount} HP (current ${gameState.run.hp} / ${gameState.run.maxHp}).`;
    wrap.appendChild(desc);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rest-btn";
    btn.textContent = "Rest";
    btn.addEventListener("click", () => {
      gameState.run.hp = Math.min(gameState.run.maxHp, gameState.run.hp + healAmount);
      markCurrentNodeCompleted();
      setScene("map");
    });
    wrap.appendChild(btn);

    root.appendChild(wrap);
  },
};
