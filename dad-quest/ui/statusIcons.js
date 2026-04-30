// Status icons — one chip per active status with a stack count.
// Caller passes the statuses bag; this rebuilds the row each frame.
// Tapping a chip toggles a popover with the status label + description,
// since mobile has no hover for the title-attribute tooltip.

const META = {
  vulnerable: { glyph: "↓", label: "Vulnerable", color: "var(--deep-navy)", help: "Takes 50% more attack damage." },
  weak:       { glyph: "↘", label: "Weak",       color: "var(--coffee-brown)", help: "Deals 25% less attack damage." },
  strength:   { glyph: "↑", label: "Strength",   color: "var(--punchy-red)", help: "Adds damage to attacks." },
  yard_work:  { glyph: "⚒", label: "Yard Work",  color: "var(--lawn-green)", help: "Hank's combo counter. Does nothing by itself; other Hank cards check it or spend it." },
  caffeine:   { glyph: "☕", label: "Caffeine",   color: "var(--coffee-brown)", help: "Doug's fuel. Some office cards spend or reward caffeine." },
  citation:   { glyph: "✉", label: "Citation",   color: "var(--sunset-orange)", help: "Brenda's paperwork. Some HOA cards scale from citations on enemies." },
};

const DISTRACTED_META = {
  glyph: "📚",
  label: "Distracted",
  color: "var(--punchy-red)",
  help: "You draw fewer cards each turn while this is active. Caused by the boss's Pop Quiz.",
};

const POPOVER_AUTO_DISMISS_MS = 4500;

export function createStatusRow() {
  const root = document.createElement("div");
  root.className = "status-row";

  const popover = document.createElement("div");
  popover.className = "status-popover";
  popover.hidden = true;
  popover.innerHTML = `<strong class="status-popover-label"></strong><span class="status-popover-help"></span>`;
  root.appendChild(popover);

  let activeChip = null;
  let dismissTimer = null;
  let docListener = null;

  function hidePopover() {
    popover.hidden = true;
    activeChip = null;
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
    if (docListener) {
      document.removeEventListener("pointerdown", docListener, true);
      docListener = null;
    }
  }

  function showPopoverFor(chip, meta, valueLabel) {
    if (activeChip === chip) { hidePopover(); return; }
    activeChip = chip;
    popover.querySelector(".status-popover-label").textContent = `${meta.label} ${valueLabel}`;
    popover.querySelector(".status-popover-help").textContent = meta.help;
    popover.style.borderColor = meta.color;
    popover.hidden = false;
    // Position horizontally centered on the chip, clamped within the row.
    const rowWidth = root.clientWidth || 0;
    const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
    popover.style.left = "0px"; // reset so we can measure
    const popWidth = popover.offsetWidth;
    let left = chipCenter - popWidth / 2;
    if (rowWidth > 0) {
      left = Math.max(0, Math.min(rowWidth - popWidth, left));
    }
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${chip.offsetTop + chip.offsetHeight + 6}px`;

    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = setTimeout(hidePopover, POPOVER_AUTO_DISMISS_MS);

    if (docListener) document.removeEventListener("pointerdown", docListener, true);
    docListener = (e) => {
      if (!root.contains(e.target)) hidePopover();
    };
    document.addEventListener("pointerdown", docListener, true);
  }

  function buildChip(key, meta, displayValue, valueLabelForPopover) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "status-chip";
    chip.dataset.status = key;
    chip.title = `${meta.label} ${valueLabelForPopover}: ${meta.help}`;
    chip.setAttribute("aria-label", `${meta.label} ${valueLabelForPopover}. ${meta.help}`);
    chip.style.borderColor = meta.color;
    chip.innerHTML = `<span class="status-glyph">${meta.glyph}</span><span class="status-name">${meta.label}</span><span class="status-num">${displayValue}</span>`;
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      showPopoverFor(chip, meta, valueLabelForPopover);
    });
    return chip;
  }

  return {
    el: root,
    update(statuses, nextTurnModifiers) {
      hidePopover();
      // Clear all chips but keep the popover element.
      const chips = root.querySelectorAll(".status-chip");
      chips.forEach((c) => c.remove());

      if (statuses) {
        for (const key of Object.keys(META)) {
          const v = statuses[key] || 0;
          if (v <= 0) continue;
          const chip = buildChip(key, META[key], v, String(v));
          root.insertBefore(chip, popover);
        }
      }
      if (nextTurnModifiers && nextTurnModifiers.length) {
        let drawMinusTotal = 0;
        for (const mod of nextTurnModifiers) {
          if (mod.type === "draw_minus") drawMinusTotal += mod.amount || 0;
        }
        if (drawMinusTotal > 0) {
          const chip = buildChip("distracted", DISTRACTED_META, `−${drawMinusTotal}`, `−${drawMinusTotal}`);
          root.insertBefore(chip, popover);
        }
      }
    },
  };
}
