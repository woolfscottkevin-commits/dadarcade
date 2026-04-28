// Map scene. Renders the current act's map graph with the player position
// indicator and reachable-node highlighting. Tap a reachable node → confirm
// modal → travel to the appropriate scene.

import { gameState } from "../engine/gameState.js";
import { setScene } from "../engine/sceneManager.js";
import { reachableNodeIds, findNode } from "../procgen/mapGenerator.js";
import { ENEMIES } from "../data/enemies.js";
import { CHARACTERS } from "../data/characters.js";
import { getAsset } from "../assets/assetLoader.js";
import { renderMapNode } from "../ui/mapNode.js";
import { renderEdges } from "../ui/edgeRenderer.js";
import { createRunHud } from "../ui/runHud.js";

let pending = null; // { node }
let runHud = null;
let resizeListener = null;

function createPlayerMarker() {
  const ch = CHARACTERS.find((c) => c.id === gameState.run.character);
  const marker = document.createElement("div");
  marker.className = "map-player-marker";
  marker.setAttribute("aria-label", ch ? `${ch.name} position` : "Player position");
  if (ch) {
    const img = document.createElement("img");
    const cached = getAsset(ch.portrait);
    img.src = cached ? cached.src : ch.portrait;
    img.alt = "";
    marker.appendChild(img);
  }
  return marker;
}

function enemyName(id) {
  if (!id) return "";
  const def = ENEMIES.find((e) => e.id === id);
  return def ? def.name : id;
}

function build(root) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "map-wrap";

  runHud = createRunHud();
  runHud.update(gameState.run);
  wrap.appendChild(runHud.el);

  const title = document.createElement("h2");
  title.className = "map-title";
  title.textContent = `Act ${gameState.run.act} of 3`;
  wrap.appendChild(title);

  const mapBox = document.createElement("div");
  mapBox.className = "map-box";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("map-edges");
  mapBox.appendChild(svg);

  const grid = document.createElement("div");
  grid.className = "map-grid";

  // Render rows top-down: row 6 (boss) at top, row 1 at bottom (entry side).
  for (let r = 6; r >= 1; r--) {
    const rowEl = document.createElement("div");
    rowEl.className = "map-row";
    rowEl.dataset.row = String(r);
    const nodes = gameState.run.map.rows[r] || [];
    const reachable = new Set(reachableNodeIds(gameState.run.map, gameState.run.position, gameState.run.completedNodes));
    const completed = new Set(gameState.run.completedNodes);
    for (const node of nodes) {
      let state = "locked";
      if (completed.has(node.id)) state = "completed";
      else if (gameState.run.position === node.id) state = "current";
      else if (reachable.has(node.id)) state = "reachable";
      const el = renderMapNode(node, state, { onTap: onNodeTap });
      if (gameState.run.position === node.id) {
        el.classList.add("map-node-has-player");
        el.appendChild(createPlayerMarker());
      }
      rowEl.appendChild(el);
    }
    grid.appendChild(rowEl);
  }

  if (!gameState.run.position) {
    const entry = document.createElement("div");
    entry.className = "map-entry-row";
    entry.appendChild(createPlayerMarker());
    grid.appendChild(entry);
  }

  mapBox.appendChild(grid);
  wrap.appendChild(mapBox);

  // Confirm modal placeholder
  const modal = document.createElement("div");
  modal.className = "map-modal";
  modal.style.display = "none";
  wrap.appendChild(modal);

  root.appendChild(wrap);

  // Defer edge render until DOM is laid out, then again on resize/scroll.
  const reachable = new Set(reachableNodeIds(gameState.run.map, gameState.run.position, gameState.run.completedNodes));
  const completed = new Set(gameState.run.completedNodes);
  // Set SVG dimensions to match container
  const ensureEdges = () => {
    const rect = mapBox.getBoundingClientRect();
    svg.setAttribute("width", String(rect.width));
    svg.setAttribute("height", String(rect.height));
    svg.style.width = rect.width + "px";
    svg.style.height = rect.height + "px";
    renderEdges(svg, gameState.run.map, { reachableSet: reachable, completedSet: completed });
  };
  // Run twice: once now (for layout), once after the next paint
  setTimeout(ensureEdges, 0);
  setTimeout(ensureEdges, 80);

  resizeListener = ensureEdges;
  window.addEventListener("resize", resizeListener);
}

function onNodeTap(node) {
  pending = { node };
  showConfirmModal();
}

function showConfirmModal() {
  const modal = document.querySelector(".map-modal");
  if (!modal || !pending) return;
  modal.innerHTML = "";
  modal.style.display = "flex";
  const card = document.createElement("div");
  card.className = "map-modal-card";

  const t = document.createElement("h3");
  t.className = "map-modal-title";
  const node = pending.node;
  if (node.type === "rest") t.textContent = "Rest at the camp?";
  else if (node.type === "boss") t.textContent = `Face the boss: ${enemyName(node.enemy)}?`;
  else if (node.type === "elite") t.textContent = `Engage the Elite: ${enemyName(node.enemy)}?`;
  else t.textContent = `Travel to: ${enemyName(node.enemy)}?`;
  card.appendChild(t);

  const row = document.createElement("div");
  row.className = "map-modal-row";

  const yes = document.createElement("button");
  yes.type = "button";
  yes.className = "map-modal-btn map-modal-yes";
  yes.textContent = "Travel";
  yes.addEventListener("click", () => confirmTravel());
  row.appendChild(yes);

  const no = document.createElement("button");
  no.type = "button";
  no.className = "map-modal-btn map-modal-no";
  no.textContent = "Cancel";
  no.addEventListener("click", () => {
    pending = null;
    modal.style.display = "none";
  });
  row.appendChild(no);

  card.appendChild(row);
  modal.appendChild(card);
}

function confirmTravel() {
  if (!pending) return;
  const { node } = pending;
  pending = null;
  // Move position BEFORE mounting destination scene
  gameState.run.position = node.id;
  if (node.type === "rest") {
    setScene("rest");
  } else {
    // combat / elite / boss: stash chosen enemy and isBoss in a transient field
    gameState.run.pendingEnemy = node.enemy;
    gameState.run.pendingIsBoss = node.type === "boss";
    gameState.run.pendingNodeType = node.type; // used by reward weighting
    setScene("combat");
  }
}

export const mapScene = {
  mount(root) {
    build(root);
  },
  unmount() {
    if (resizeListener) {
      window.removeEventListener("resize", resizeListener);
      resizeListener = null;
    }
    runHud = null;
    pending = null;
  },
};
