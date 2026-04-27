// Tiny scene dispatcher.
// Scenes register a mount(root) and an optional unmount() callback.
// setScene() unmounts the current scene, swaps which root container is active,
// and mounts the new one.

import { gameState } from "./gameState.js";

const scenes = new Map();
let currentScene = null;

const SCENE_ROOT_IDS = {
  boot: "boot",
  characterSelect: "app-character-select",
  combat: "app-combat",
  victory: "app-victory",
  gameOver: "app-game-over",
};

export function registerScene(name, def) {
  scenes.set(name, def);
}

export function getScene() {
  return currentScene;
}

export function setScene(name) {
  const def = scenes.get(name);
  if (!def) throw new Error(`Unknown scene: ${name}`);

  // Unmount current
  if (currentScene) {
    const cur = scenes.get(currentScene);
    if (cur && typeof cur.unmount === "function") {
      try { cur.unmount(); } catch (e) { console.error("unmount error:", e); }
    }
  }

  // Hide every scene root, show the target
  for (const id of Object.values(SCENE_ROOT_IDS)) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  }
  const rootId = SCENE_ROOT_IDS[name];
  const root = document.getElementById(rootId);
  if (!root) throw new Error(`Scene root missing in DOM: #${rootId}`);
  root.classList.add("active");

  currentScene = name;
  gameState.scene = name;

  if (typeof def.mount === "function") {
    def.mount(root);
  }
}
