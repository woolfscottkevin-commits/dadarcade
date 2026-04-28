// Renders a single map-node circle.
// type: "combat" | "elite" | "rest" | "boss" | "shop"(future) | "event"(future)
// state: "completed" | "current" | "reachable" | "locked"

const TYPE_ICON = {
  combat: "X",
  elite: "!",
  rest: "Zz",
  boss: "♛",
  shop: "$",
  event: "?",
};

const TYPE_LABEL = {
  combat: "Fight",
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
  btn.setAttribute("aria-label", `${TYPE_LABEL[node.type] || node.type}, ${state}`);

  const icon = document.createElement("span");
  icon.className = `map-node-icon map-node-icon-${node.type}`;
  icon.textContent = TYPE_ICON[node.type] || "·";
  btn.appendChild(icon);

  const label = document.createElement("span");
  label.className = "map-node-label";
  label.textContent = TYPE_LABEL[node.type] || node.type;
  btn.appendChild(label);

  if (state === "reachable") {
    const action = document.createElement("span");
    action.className = "map-node-action";
    action.textContent = "Choose";
    btn.appendChild(action);
  }

  if (state === "completed") {
    const check = document.createElement("span");
    check.className = "map-node-check";
    check.textContent = "✓";
    btn.appendChild(check);
  }

  if (opts.onTap && (state === "reachable")) {
    btn.addEventListener("click", () => opts.onTap(node));
  }
  return btn;
}
