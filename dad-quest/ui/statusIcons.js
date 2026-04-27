// Status icons — one chip per active status with a stack count.
// Caller passes the statuses bag; this rebuilds the row each frame.

const META = {
  vulnerable: { glyph: "↓", label: "Vulnerable", color: "var(--deep-navy)" },
  weak:       { glyph: "↘", label: "Weak",       color: "var(--coffee-brown)" },
  strength:   { glyph: "↑", label: "Strength",   color: "var(--punchy-red)" },
  yard_work:  { glyph: "⚒", label: "Yard Work",  color: "var(--lawn-green)" },
  caffeine:   { glyph: "☕", label: "Caffeine",   color: "var(--coffee-brown)" },
  citation:   { glyph: "✉", label: "Citation",   color: "var(--sunset-orange)" },
};

export function createStatusRow() {
  const root = document.createElement("div");
  root.className = "status-row";
  return {
    el: root,
    update(statuses) {
      root.innerHTML = "";
      if (!statuses) return;
      for (const key of Object.keys(META)) {
        const v = statuses[key] || 0;
        if (v <= 0) continue;
        const m = META[key];
        const chip = document.createElement("span");
        chip.className = "status-chip";
        chip.dataset.status = key;
        chip.title = `${m.label} ${v}`;
        chip.style.borderColor = m.color;
        chip.innerHTML = `<span class="status-glyph">${m.glyph}</span><span class="status-num">${v}</span>`;
        root.appendChild(chip);
      }
    },
  };
}
