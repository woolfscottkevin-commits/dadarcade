// HP bar — renders into a target element. Updates by re-rendering width + text.

export function createHealthBar() {
  const root = document.createElement("div");
  root.className = "hp-bar";
  const fill = document.createElement("div");
  fill.className = "hp-bar-fill";
  const text = document.createElement("div");
  text.className = "hp-bar-text";
  root.appendChild(fill);
  root.appendChild(text);
  return {
    el: root,
    update(hp, maxHp) {
      const pct = maxHp > 0 ? Math.max(0, hp / maxHp) * 100 : 0;
      fill.style.width = `${pct}%`;
      // Color: green high → orange mid → red low
      if (pct > 60) fill.style.background = "var(--lawn-green)";
      else if (pct > 30) fill.style.background = "var(--sunset-orange)";
      else fill.style.background = "var(--punchy-red)";
      text.textContent = `${Math.max(0, Math.floor(hp))} / ${maxHp}`;
    },
    shake() {
      root.classList.remove("hp-shake");
      void root.offsetWidth;
      root.classList.add("hp-shake");
    },
  };
}
