// Effect-string parser and executor.
// Reads the canonical grammar documented at the top of /dad-quest/data/cards.js,
// dispatches each verb against combat state. Phase 2 is responsible for executing
// the subset that actually fires during the three verification scenarios; verbs
// that don't fire in those scenarios still need to PARSE without crashing
// (warn-and-skip on unknown verbs).
//
// Public API:
//   executeEffect(effectStr, ctx)            run an arbitrary effect string
//   evaluateScalingExpression(expr, ctx)     resolve a `scaling:expr` to a number
//   parseEffect(effectStr)                   light validator used by debug pass
//
// `ctx` shape:
//   {
//     combat,       // combatState (player, enemies, piles, triggers, flags)
//     sourceCard,   // optional: the card instance running this effect
//     targetIndex,  // optional override; defaults to combat.targetIndex
//     scalingValue, // optional precomputed value to override base damage of a scaling card
//   }

import { CARDS } from "../data/cards.js";
import {
  STATUS,
  applyStatus,
  setStatus,
  getStatus,
  resolveDamage,
  selfDamage,
} from "./statusEffects.js";
import { drawCards as drawCardsFromPiles } from "./deck.js";

const CONDITION_TWO_SEG = ["caffeine_gte", "target_citations_gte", "yard_work_gte"];
const CONDITION_ONE_SEG = ["gained_caffeine_this_turn", "applied_citation_this_turn"];

const TRIGGER_HOOKS = new Set([
  "on_play_skill",
  "on_gain_caffeine",
  "on_third_card",
  "on_fourth_card",
  "on_turn_start",
  "on_turn_end",
  "passive",
]);

const SUPPORTED_VERBS = new Set([
  "deal_damage", "deal_damage_all", "deal_damage_random",
  "gain_block", "gain", "lose", "heal", "lose_hp", "draw",
  "apply", "apply_all", "apply_random",
  "add_to_hand", "add_to_discard",
  "spend_yard_work_bonus",
  "first_damage_prevent",
  "next_citation_card_costs_zero",
  "bonus_damage_per_citation_applied_combat",
  "damage_enemies_with_citations_gte",
]);

const RECOGNIZED_LITERALS = new Set([
  "unplayable",
  "upgrade_hand_for_combat",
  "heal_damage_taken_this_turn",
]);

// ------------------------------------------------------------------
// Public surface
// ------------------------------------------------------------------

export function executeEffect(effectStr, ctx) {
  if (!effectStr) return;

  if (RECOGNIZED_LITERALS.has(effectStr)) {
    if (effectStr === "unplayable") return;             // never executes
    if (effectStr === "upgrade_hand_for_combat") return runUpgradeHand(ctx);
    if (effectStr === "heal_damage_taken_this_turn") return runHealDamageTaken(ctx);
    return;
  }

  if (effectStr.startsWith("compound:")) {
    const subs = splitCompoundChildren(effectStr.slice("compound:".length));
    for (const s of subs) executeEffect(s, ctx);
    return;
  }

  if (effectStr.startsWith("conditional:")) {
    return runConditional(effectStr.slice("conditional:".length), ctx);
  }

  if (effectStr.startsWith("trigger:")) {
    return registerTriggerFromString(effectStr.slice("trigger:".length), ctx);
  }

  if (effectStr.startsWith("next_turn:")) {
    return queueNextTurnEffect(effectStr.slice("next_turn:".length), ctx);
  }

  if (effectStr.startsWith("scaling:")) {
    return runScalingDamage(effectStr.slice("scaling:".length), ctx);
  }

  // Atomic verbs
  const parts = effectStr.split(":");
  const verb = parts[0];
  const rest = parts.slice(1);

  switch (verb) {
    case "deal_damage": return dealDamage(int(rest[0]), ctx);
    case "deal_damage_all": return dealDamageAll(int(rest[0]), ctx);
    case "deal_damage_random": return dealDamageRandom(int(rest[0]), int(rest[1]), ctx);
    case "gain_block": return gainBlock(int(rest[0]), ctx);
    case "gain": return gainResource(rest[0], int(rest[1]), ctx);
    case "lose": return loseResource(rest[0], int(rest[1]), ctx);
    case "heal": return heal(int(rest[0]), ctx);
    case "lose_hp": return loseHp(int(rest[0]), ctx);
    case "draw": return drawN(int(rest[0]), ctx);
    case "apply": return applyTarget(rest[0], int(rest[1]), ctx);
    case "apply_all": return applyAll(rest[0], int(rest[1]), ctx);
    case "apply_random": return applyRandom(rest[0], int(rest[1]), ctx);
    case "add_to_hand": return addToHand(rest[0], int(rest[1]), rest.slice(2).join(":"), ctx);
    case "add_to_discard": return addToDiscard(rest[0], int(rest[1] || "1"), ctx);
    case "spend_yard_work_bonus": return spendYardWorkBonus(int(rest[0]), ctx);
    case "first_damage_prevent":
      ctx.combat.flags.firstDamagePreventThisTurn = true;
      return;
    case "next_citation_card_costs_zero":
      ctx.combat.flags.nextCitationCardCostsZero = true;
      return;
    case "bonus_damage_per_citation_applied_combat":
      // Petty Tyrant: the bonus is read at damage time via pettyTyrantBonus().
      // The verb itself is a no-op when fired directly.
      return;
    case "damage_enemies_with_citations_gte":
      return damageEnemiesWithCitationsGte(int(rest[0]), int(rest[1]), ctx);
    default:
      console.warn(`[effectExecutor] unsupported verb '${verb}' in effect '${effectStr}'`);
      return;
  }
}

export function parseEffect(effectStr) {
  // Used by debug script. Returns { ok: true } or { ok: false, reason }.
  // Doesn't run side effects — just walks the structure.
  if (!effectStr) return { ok: false, reason: "empty effect" };
  if (RECOGNIZED_LITERALS.has(effectStr)) return { ok: true };
  if (effectStr.startsWith("compound:")) {
    const subs = splitCompoundChildren(effectStr.slice("compound:".length));
    for (const s of subs) {
      const r = parseEffect(s);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  if (effectStr.startsWith("conditional:")) {
    return parseConditional(effectStr.slice("conditional:".length));
  }
  if (effectStr.startsWith("trigger:")) {
    const payload = effectStr.slice("trigger:".length);
    const seg = payload.split(":");
    const hook = seg[0];
    if (!TRIGGER_HOOKS.has(hook)) {
      return { ok: false, reason: `unknown trigger hook '${hook}'` };
    }
    const childEffect = seg.slice(1).join(":");
    if (!childEffect) return { ok: true };
    return parseEffect(childEffect);
  }
  if (effectStr.startsWith("next_turn:")) {
    return parseEffect(effectStr.slice("next_turn:".length));
  }
  if (effectStr.startsWith("scaling:")) {
    const expr = effectStr.slice("scaling:".length);
    return parseScalingExpr(expr) ? { ok: true } : { ok: false, reason: `bad scaling expr '${expr}'` };
  }

  const parts = effectStr.split(":");
  const verb = parts[0];
  if (SUPPORTED_VERBS.has(verb)) return { ok: true };
  return { ok: false, reason: `unknown verb '${verb}'` };
}

// ------------------------------------------------------------------
// Internals — parsing
// ------------------------------------------------------------------

// A compound payload like "deal_damage:14,conditional:caffeine_gte:3:deal_damage:6"
// — sub-effects are comma-separated at the top level. None of our atoms use commas
// internally, so a plain split is safe.
function splitCompoundChildren(payload) {
  return payload.split(",");
}

function consumeCondition(parts) {
  if (CONDITION_TWO_SEG.includes(parts[0])) {
    return { cond: parts.slice(0, 2).join(":"), rest: parts.slice(2) };
  }
  if (CONDITION_ONE_SEG.includes(parts[0])) {
    return { cond: parts[0], rest: parts.slice(1) };
  }
  throw new Error(`unknown condition '${parts[0]}'`);
}

function parseConditional(payload) {
  try {
    const elseIdx = payload.indexOf("|else:");
    let condAndTrue, falseBranch;
    if (elseIdx >= 0) {
      condAndTrue = payload.slice(0, elseIdx);
      falseBranch = payload.slice(elseIdx + "|else:".length);
    } else {
      condAndTrue = payload;
      falseBranch = null;
    }
    const segs = condAndTrue.split(":");
    const { rest } = consumeCondition(segs);
    const trueEffect = rest.join(":");
    if (!trueEffect) return { ok: false, reason: "conditional missing true branch" };
    const trueR = parseEffect(trueEffect);
    if (!trueR.ok) return trueR;
    if (falseBranch) {
      const falseR = parseEffect(falseBranch);
      if (!falseR.ok) return falseR;
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function parseScalingExpr(expr) {
  // Allow numeric literals + variable refs joined by `+` and `*`, single-level.
  const validVars = ["yard_work", "cards_played_this_turn", "total_citations", "target_citations"];
  const terms = expr.split("+");
  for (const term of terms) {
    if (/^\d+$/.test(term)) continue;
    if (term.includes("*")) {
      const [v, m] = term.split("*");
      if (!validVars.includes(v)) return false;
      if (!/^\d+$/.test(m)) return false;
      continue;
    }
    if (validVars.includes(term)) continue;
    return false;
  }
  return true;
}

// ------------------------------------------------------------------
// Internals — execution
// ------------------------------------------------------------------

function int(s) { return parseInt(s, 10); }

function getTarget(ctx) {
  const i = (ctx.targetIndex !== undefined ? ctx.targetIndex : ctx.combat.targetIndex) | 0;
  return ctx.combat.enemies[i];
}

// Petty Tyrant: when registered, cards the player plays gain +1 damage per
// Citation they've applied this combat (capped at +10). The verb is registered
// as `passive:bonus_damage_per_citation_applied_combat:1:cap:10` — we look for
// it in the trigger map at damage time rather than firing a separate hook.
function pettyTyrantBonus(ctx) {
  const passives = ctx.combat.triggers && ctx.combat.triggers.passive;
  if (!passives || passives.length === 0) return 0;
  const has = passives.some((t) =>
    t.effect && t.effect.startsWith("bonus_damage_per_citation_applied_combat"));
  if (!has) return 0;
  const applied = ctx.combat.flags.citationsAppliedThisCombat || 0;
  return Math.min(10, applied);
}

function dealDamage(amount, ctx) {
  const tgt = getTarget(ctx);
  if (!tgt || tgt.hp <= 0) return;
  const player = ctx.combat.player;
  const total = amount + pettyTyrantBonus(ctx);
  const result = resolveDamage(player, tgt, total);
  noteDamageDealt(ctx, tgt, result, total);
}

function dealDamageAll(amount, ctx) {
  const total = amount + pettyTyrantBonus(ctx);
  for (const e of ctx.combat.enemies) {
    if (e.hp <= 0) continue;
    const result = resolveDamage(ctx.combat.player, e, total);
    noteDamageDealt(ctx, e, result, total);
  }
}

function dealDamageRandom(amount, hits, ctx) {
  const total = amount + pettyTyrantBonus(ctx);
  for (let i = 0; i < hits; i++) {
    const alive = ctx.combat.enemies.filter((e) => e.hp > 0);
    if (alive.length === 0) return;
    const pick = alive[Math.floor(Math.random() * alive.length)];
    const result = resolveDamage(ctx.combat.player, pick, total);
    noteDamageDealt(ctx, pick, result, total);
  }
}

function noteDamageDealt(ctx, target, result, base) {
  if (ctx?.notify) {
    ctx.notify("playerDamageDealt", { target, result, base });
  }
}

function isDebuff(status) {
  return status === STATUS.VULNERABLE || status === STATUS.WEAK || status === STATUS.CITATION;
}

function noteDebuffApplied(ctx, target, status) {
  if (!target || !isDebuff(status)) return;
  if (ctx.combat.run?.relics?.includes("the_megaphone")) {
    const result = resolveDamage(null, target, 3);
    noteDamageDealt(ctx, target, result, 3);
  }
}

function gainBlock(amount, ctx) {
  applyStatus(ctx.combat.player, STATUS.BLOCK, amount);
}

function gainResource(name, amount, ctx) {
  if (name === "energy") {
    ctx.combat.energy += amount;
    return;
  }
  if (name === "gold") {
    // Adds gold directly to the run total (used by Bake Sale, HOA Treasury,
    // Performance Bonus). Persists between combats.
    if (ctx.combat.run) ctx.combat.run.gold = (ctx.combat.run.gold || 0) + amount;
    return;
  }
  // Yard Work / Caffeine / Strength
  // Lawn Flag: Hank's "+1 bonus" when gaining Yard Work.
  let final = amount;
  if (name === STATUS.YARD_WORK
      && ctx.combat.player.character === "hank"
      && ctx.combat.run.relics.includes("lawn_flag")) {
    final += 1;
  }
  applyStatus(ctx.combat.player, name, final);

  if (name === STATUS.CAFFEINE) {
    ctx.combat.flags.gainedCaffeineThisTurn = true;
    // `on_gain_caffeine` fires per stack gained (not per event) — that's how
    // Caffeinated converts Caffeine → Strength point-for-point.
    for (let i = 0; i < final; i++) fireTriggers("on_gain_caffeine", ctx);
  }
}

function loseResource(name, amount, ctx) {
  applyStatus(ctx.combat.player, name, -amount);
}

function heal(amount, ctx) {
  const p = ctx.combat.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

function loseHp(amount, ctx) {
  selfDamage(ctx.combat.player, amount);
}

function drawN(n, ctx) {
  drawCardsFromPiles(ctx.combat.piles, n);
}

function applyTarget(status, amount, ctx) {
  const tgt = getTarget(ctx);
  // Skip dead targets — a compound card whose first sub-effect kills the
  // target should not write status onto the corpse, and (more importantly)
  // should not bump the citationsAppliedThisCombat counter.
  if (!tgt || tgt.hp <= 0) return;
  applyStatus(tgt, status, amount);
  noteDebuffApplied(ctx, tgt, status);
  if (status === STATUS.CITATION) {
    ctx.combat.flags.appliedCitationThisTurn = true;
    ctx.combat.flags.citationsAppliedThisCombat += amount;
  }
}

function applyAll(status, amount, ctx) {
  for (const e of ctx.combat.enemies) {
    if (e.hp <= 0) continue;
    applyStatus(e, status, amount);
    noteDebuffApplied(ctx, e, status);
    if (status === STATUS.CITATION) {
      ctx.combat.flags.appliedCitationThisTurn = true;
      ctx.combat.flags.citationsAppliedThisCombat += amount;
    }
  }
}

function applyRandom(status, amount, ctx) {
  // Distribute `amount` total stacks one-at-a-time across random alive enemies.
  for (let i = 0; i < amount; i++) {
    const alive = ctx.combat.enemies.filter((e) => e.hp > 0);
    if (alive.length === 0) return;
    const pick = alive[Math.floor(Math.random() * alive.length)];
    applyStatus(pick, status, 1);
    noteDebuffApplied(ctx, pick, status);
    if (status === STATUS.CITATION) {
      ctx.combat.flags.appliedCitationThisTurn = true;
      ctx.combat.flags.citationsAppliedThisCombat += 1;
    }
  }
}

function addToHand(filter, n, flag, ctx) {
  // Phase 2: implements only filters used by the codebase: hank_attack and any_skill.
  let pool;
  if (filter === "hank_attack") {
    pool = CARDS.filter((c) => c.character === "hank" && c.type === "attack" && c.id !== "burnout");
  } else if (filter === "any_skill") {
    pool = CARDS.filter((c) => c.type === "skill" && c.id !== "burnout");
  } else if (filter === "any_common") {
    pool = CARDS.filter((c) => c.rarity === "common" && c.id !== "burnout");
  } else {
    console.warn(`[effectExecutor] unsupported add_to_hand filter '${filter}'`);
    return;
  }
  for (let i = 0; i < n; i++) {
    if (pool.length === 0) return;
    const def = pool[Math.floor(Math.random() * pool.length)];
    const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `cardgen_${Math.random().toString(36).slice(2)}`;
    const inst = { uuid, cardId: def.id };
    if (flag.includes("exhausts")) inst.exhaustOnPlay = true;
    ctx.combat.piles.hand.push(inst);
    if (flag.includes("cost_zero_this_turn")) ctx.combat.flags.costZeroThisTurn.add(uuid);
  }
}

function addToDiscard(cardId, n, ctx) {
  for (let i = 0; i < n; i++) {
    const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `cardgen_${Math.random().toString(36).slice(2)}`;
    ctx.combat.piles.discardPile.push({ uuid, cardId });
  }
}

function spendYardWorkBonus(perStack, ctx) {
  const stacks = getStatus(ctx.combat.player, STATUS.YARD_WORK);
  if (stacks <= 0) return;
  const bonus = stacks * perStack;
  setStatus(ctx.combat.player, STATUS.YARD_WORK, 0);
  // Apply bonus damage to the current target on top of the base hit.
  const tgt = getTarget(ctx);
  if (!tgt || tgt.hp <= 0) return;
  const result = resolveDamage(ctx.combat.player, tgt, bonus);
  noteDamageDealt(ctx, tgt, result);
}

function damageEnemiesWithCitationsGte(threshold, dmg, ctx) {
  for (const e of ctx.combat.enemies) {
    if (e.hp <= 0) continue;
    if (getStatus(e, STATUS.CITATION) >= threshold) {
      const result = resolveDamage(null, e, dmg);
      noteDamageDealt(ctx, e, result);
    }
  }
}

// ------------------------------------------------------------------
// Conditional execution
// ------------------------------------------------------------------

function evalCond(condStr, ctx) {
  const parts = condStr.split(":");
  const verb = parts[0];
  switch (verb) {
    case "caffeine_gte":
      return getStatus(ctx.combat.player, STATUS.CAFFEINE) >= int(parts[1]);
    case "yard_work_gte":
      return getStatus(ctx.combat.player, STATUS.YARD_WORK) >= int(parts[1]);
    case "target_citations_gte": {
      const tgt = getTarget(ctx);
      if (!tgt) return false;
      return getStatus(tgt, STATUS.CITATION) >= int(parts[1]);
    }
    case "gained_caffeine_this_turn":
      return !!ctx.combat.flags.gainedCaffeineThisTurn;
    case "applied_citation_this_turn":
      return !!ctx.combat.flags.appliedCitationThisTurn;
    default:
      console.warn(`[effectExecutor] unknown condition '${condStr}'`);
      return false;
  }
}

function runConditional(payload, ctx) {
  const elseIdx = payload.indexOf("|else:");
  let condAndTrue, falseBranch;
  if (elseIdx >= 0) {
    condAndTrue = payload.slice(0, elseIdx);
    falseBranch = payload.slice(elseIdx + "|else:".length);
  } else {
    condAndTrue = payload;
    falseBranch = null;
  }
  const segs = condAndTrue.split(":");
  const { cond, rest } = consumeCondition(segs);
  const trueEffect = rest.join(":");
  if (evalCond(cond, ctx)) {
    executeEffect(trueEffect, ctx);
  } else if (falseBranch) {
    executeEffect(falseBranch, ctx);
  }
}

// ------------------------------------------------------------------
// Trigger registration
// ------------------------------------------------------------------

function registerTriggerFromString(payload, ctx) {
  const segs = payload.split(":");
  const hook = segs[0];
  const effect = segs.slice(1).join(":");
  if (!TRIGGER_HOOKS.has(hook)) {
    console.warn(`[effectExecutor] unknown trigger hook '${hook}'`);
    return;
  }
  if (!ctx.combat.triggers[hook]) ctx.combat.triggers[hook] = [];
  ctx.combat.triggers[hook].push({
    effect,
    sourceUuid: ctx.sourceCard ? ctx.sourceCard.uuid : null,
  });
}

export function fireTriggers(hook, ctx) {
  const list = ctx.combat.triggers[hook] || [];
  // Snapshot the list — triggers should not mutate themselves out from under us.
  const snapshot = list.slice();
  for (const t of snapshot) {
    if (!t.effect) continue;
    executeEffect(t.effect, ctx);
  }
}

// ------------------------------------------------------------------
// Scaling
// ------------------------------------------------------------------

export function evaluateScalingExpression(expr, ctx) {
  // Supported expressions (exhaustive — must match data/cards.js):
  //   yard_work*3
  //   cards_played_this_turn*3
  //   total_citations*2
  //   4+target_citations*2
  const terms = expr.split("+");
  let total = 0;
  for (const term of terms) {
    if (/^\d+$/.test(term)) {
      total += int(term);
      continue;
    }
    if (term.includes("*")) {
      const [v, m] = term.split("*");
      total += getScalingVar(v, ctx) * int(m);
      continue;
    }
    total += getScalingVar(term, ctx);
  }
  return total;
}

function getScalingVar(name, ctx) {
  switch (name) {
    case "yard_work": return getStatus(ctx.combat.player, STATUS.YARD_WORK);
    case "cards_played_this_turn": return ctx.combat.flags.cardsPlayedThisTurn;
    case "total_citations": {
      let total = 0;
      for (const e of ctx.combat.enemies) total += getStatus(e, STATUS.CITATION);
      return total;
    }
    case "target_citations": {
      const t = getTarget(ctx);
      return t ? getStatus(t, STATUS.CITATION) : 0;
    }
    default:
      console.warn(`[effectExecutor] unknown scaling var '${name}'`);
      return 0;
  }
}

function runScalingDamage(expr, ctx) {
  const value = evaluateScalingExpression(expr, ctx);
  dealDamage(value, ctx);
}

// ------------------------------------------------------------------
// Special one-offs
// ------------------------------------------------------------------

function runUpgradeHand(ctx) {
  // Apotheosis: double every numeric payload value in each card currently in hand
  // for the rest of this combat. Conditional thresholds (caffeine_gte:3) are NOT doubled.
  for (const inst of ctx.combat.piles.hand) {
    const def = CARDS.find((c) => c.id === inst.cardId);
    if (!def) continue;
    const upgraded = upgradeEffectString(def.effect);
    ctx.combat.cardEffectOverrides.set(inst.uuid, upgraded);
  }
}

// Helper visible to tests via runUpgradeHand. Doubles payload numbers but NOT
// numbers inside conditional thresholds (`*_gte:N`).
export function upgradeEffectString(effectStr) {
  if (!effectStr) return effectStr;
  // Mark every "_gte:NUMBER" so the doubler doesn't touch the threshold value.
  const sentinel = "__DQ_GTE_SENTINEL__";
  const masked = effectStr.replace(/(_gte):(\d+)/g, (m, p1, p2) => `${p1}${sentinel}${p2}`);
  const doubled = masked.replace(/(?<![\w])(\d+)/g, (m, n) => String(int(n) * 2));
  return doubled.replace(new RegExp(sentinel, "g"), ":");
}

function runHealDamageTaken(ctx) {
  const dmg = ctx.combat.flags.damageTakenThisTurn || 0;
  if (dmg > 0) heal(dmg, ctx);
}

function queueNextTurnEffect(effect, ctx) {
  if (!ctx.combat.queuedNextTurnEffects) ctx.combat.queuedNextTurnEffects = [];
  ctx.combat.queuedNextTurnEffects.push(effect);
}
