// Renders a single map-node circle.
// type: "combat" | "elite" | "rest" | "boss" | "shop"(future) | "event"(future)
// state: "completed" | "current" | "reachable" | "locked"

const TYPE_GLYPH = {
  combat: "⚔",
  elite: "💀",
  rest: "🛌",
  boss: "👑",
  shop: "🛒",
  event: "?",
};

const TYPE_LABEL = {
  combat: "Combat",
  elite: "Elite",
  rest: "Rest",
  boss: "Boss",
  shop: "Shop",
  event: "Event",
};

export function renderMapNode(node, state, opts = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `map-node map-node-${node.type} map-node-${state}`;
  btn.dataset.id = node.id;
  btn.dataset.type = node.type;
  btn.dataset.state = state;
  btn.disabled = state === "locked" || state === "completed";

  const glyph = document.createElement("span");
  glyph.className = "map-node-glyph";
  glyph.textContent = TYPE_GLYPH[node.type] || "·";
  btn.appendChild(glyph);

  const label = document.createElement("span");
  label.className = "map-node-label";
  label.textContent = TYPE_LABEL[node.type] || node.type;
  btn.appendChild(label);

  if (opts.onTap && (state === "reachable")) {
    btn.addEventListener("click", () => opts.onTap(node));
  }
  return btn;
}
