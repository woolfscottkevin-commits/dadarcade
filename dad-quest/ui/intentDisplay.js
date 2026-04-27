// Renders the next-turn intent above an enemy.
// "Atk 6", "Atk 3 ×3", "Block 8", "Buff", "Debuff", "?".

const TYPE_LABEL = {
  attack: "Atk",
  block: "Block",
  buff: "Buff",
  debuff: "Debuff",
  special: "?",
};

export function createIntentDisplay() {
  const root = document.createElement("div");
  root.className = "intent-display";
  return {
    el: root,
    update(intent) {
      root.innerHTML = "";
      if (!intent) return;
      const label = TYPE_LABEL[intent.type] || "?";
      const v = intent.value !== undefined ? intent.value : "";
      const hits = intent.hits && intent.hits > 1 ? ` ×${intent.hits}` : "";
      const text = intent.type === "attack"
        ? `${label} ${v}${hits}`
        : intent.type === "block"
          ? `${label} ${v}`
          : intent.label || label;
      const span = document.createElement("span");
      span.className = `intent intent-${intent.type}`;
      span.textContent = text;
      root.appendChild(span);
    },
  };
}
