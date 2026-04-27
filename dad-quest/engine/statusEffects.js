// Status effects for Dad Quest combat.
// Maps to DESIGN.md § 1.4 exactly.
//
// DAMAGE MATH (apply in this exact order; floor ONCE at the end):
//   1. outgoing = baseAttack + (attacker.strength || 0)        // Strength on non-X-cost attacks
//   2. outgoing = outgoing * (attacker has Weak ? 0.75 : 1)    // Weak applied at the source
//   3. incoming = outgoing * (target has Vulnerable ? 1.5 : 1) // Vulnerable applied at the target
//   4. final    = Math.floor(incoming)                         // single floor after all multipliers
//   5. Block absorbs `final` first; remainder reduces HP. Block can go to 0 but never negative.
//
// Self-damage from cards (lose_hp:N) bypasses Strength/Weak/Vulnerable/Block entirely.
//
// Tick rules:
//   playerTurnEnd  → Block expires (player only); Vulnerable/Weak decrement on player.
//   enemyTurnEnd   → Vulnerable/Weak decrement on each enemy.
//   Strength, Yard Work, Caffeine do NOT auto-decrement (Caffeine resets between combats elsewhere).
//   Citation persists until the enemy dies; never ticks down.

export const STATUS = {
  BLOCK: "block",
  VULNERABLE: "vulnerable",
  WEAK: "weak",
  STRENGTH: "strength",
  YARD_WORK: "yard_work",
  CAFFEINE: "caffeine",
  CITATION: "citation",
};

export function ensureStatusBag(target) {
  if (!target.statuses) target.statuses = {};
  return target.statuses;
}

export function applyStatus(target, status, amount) {
  const bag = ensureStatusBag(target);
  bag[status] = (bag[status] || 0) + amount;
  if (bag[status] < 0) bag[status] = 0;
}

export function setStatus(target, status, amount) {
  const bag = ensureStatusBag(target);
  bag[status] = Math.max(0, amount);
}

export function getStatus(target, status) {
  if (!target || !target.statuses) return 0;
  return target.statuses[status] || 0;
}

export function tickStatuses(target, phase) {
  const bag = ensureStatusBag(target);
  if (phase === "playerTurnEnd") {
    bag[STATUS.BLOCK] = 0;
    if (bag[STATUS.VULNERABLE] > 0) bag[STATUS.VULNERABLE] -= 1;
    if (bag[STATUS.WEAK] > 0) bag[STATUS.WEAK] -= 1;
  } else if (phase === "enemyTurnEnd") {
    if (bag[STATUS.VULNERABLE] > 0) bag[STATUS.VULNERABLE] -= 1;
    if (bag[STATUS.WEAK] > 0) bag[STATUS.WEAK] -= 1;
  }
}

// Resolve a damage hit from `attacker` (may be null for relic/card flat damage)
// to `target`. Returns { hpLost, blockLost, finalDamage }.
export function resolveDamage(attacker, target, baseAttack) {
  let outgoing = baseAttack;
  if (attacker) {
    outgoing += getStatus(attacker, STATUS.STRENGTH);
    if (getStatus(attacker, STATUS.WEAK) > 0) outgoing *= 0.75;
  }
  let incoming = outgoing;
  if (getStatus(target, STATUS.VULNERABLE) > 0) incoming *= 1.5;
  const finalDamage = Math.max(0, Math.floor(incoming));
  return applyDamageToTarget(target, finalDamage);
}

// Apply a fully-resolved damage number to a target through Block.
export function applyDamageToTarget(target, finalDamage) {
  const startBlock = getStatus(target, STATUS.BLOCK);
  let damage = finalDamage;
  let blockLost = 0;
  if (startBlock > 0) {
    blockLost = Math.min(startBlock, damage);
    setStatus(target, STATUS.BLOCK, startBlock - blockLost);
    damage -= blockLost;
  }
  let hpLost = 0;
  if (damage > 0) {
    hpLost = Math.min(target.hp, damage);
    target.hp -= hpLost;
  }
  return { hpLost, blockLost, finalDamage };
}

// Self damage / unblockable damage (lose_hp:N from cards).
// Bypasses Block, Strength, Weak, Vulnerable.
export function selfDamage(target, amount) {
  const hpLost = Math.min(target.hp, amount);
  target.hp -= hpLost;
  return { hpLost, blockLost: 0, finalDamage: hpLost };
}
