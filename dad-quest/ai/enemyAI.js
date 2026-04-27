// Enemy intent selection.
// Pure-ish: cycle mode advances `enemy.patternIndex`; weighted mode does not.

export function selectIntent(enemy) {
  const pattern = enemy.intentPattern || [];
  if (pattern.length === 0) return null;

  if (enemy.intentMode === "weighted") {
    const totalWeight = pattern.reduce((s, p) => s + (p.weight || 1), 0);
    let r = Math.random() * totalWeight;
    for (const p of pattern) {
      r -= (p.weight || 1);
      if (r <= 0) return p;
    }
    return pattern[pattern.length - 1];
  }

  // Default: cycle mode
  const idx = enemy.patternIndex || 0;
  const intent = pattern[idx % pattern.length];
  enemy.patternIndex = (idx + 1) % pattern.length;
  return intent;
}
