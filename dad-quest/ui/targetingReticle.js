// Tiny reticle overlay applied as a CSS class to the targeted enemy element.
// Pure helpers — the combat scene calls these as it manages selection state.

export function applyReticleTo(enemyEls, targetIdx) {
  enemyEls.forEach((entry, i) => {
    entry.wrap.classList.toggle("combat-enemy-targeted", i === targetIdx);
  });
}

export function clearReticles(enemyEls) {
  enemyEls.forEach((entry) => entry.wrap.classList.remove("combat-enemy-targeted"));
}
