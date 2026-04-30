// Renders the next-turn intent above an enemy.
// Maps every Phase 3 intent type to a category for color inheritance:
//   attack-ish → punchy red
//   block-ish  → sky blue
//   buff-ish   → green / orange
//   debuff-ish → navy

const ATTACK_TYPES = new Set([
  "attack", "attack_telegraphed", "attack_with_status", "attack_and_disrupt", "attack_with_modifier", "aoe_attack",
]);
const BLOCK_TYPES = new Set([
  "block", "block_and_status",
]);
const BUFF_TYPES = new Set([
  "self_buff", "heal_and_buff",
]);
const DEBUFF_TYPES = new Set([
  "apply_status", "apply_status_aoe_to_player",
]);
const SPECIAL_TYPES = new Set([
  "summon", "special",
]);

function categoryClass(type) {
  if (ATTACK_TYPES.has(type)) return "intent-attack";
  if (BLOCK_TYPES.has(type)) return "intent-block";
  if (BUFF_TYPES.has(type)) return "intent-buff";
  if (DEBUFF_TYPES.has(type)) return "intent-debuff";
  if (SPECIAL_TYPES.has(type)) return "intent-special";
  return "";
}

export function describeIntent(intent) {
  return renderText(intent);
}

const STATUS_NAME = {
  vulnerable: "Vulnerable",
  weak: "Weak",
  strength: "Strength",
  caffeine: "Caffeine",
  citation: "Citation",
  yard_work: "Yard Work",
};

function statusName(key) {
  return STATUS_NAME[key] || (key || "").replace(/_/g, " ");
}

// Mirrors engine/statusEffects.js resolveDamage so the verbose intent text can
// show the actual incoming-per-hit number, not just the base. Returns the
// final per-hit damage value (still pre-Block).
function effectiveDamage(base, attacker, defender) {
  let outgoing = base;
  if (attacker) {
    outgoing += attacker.statuses?.strength || 0;
    if ((attacker.statuses?.weak || 0) > 0) outgoing *= 0.75;
  }
  let incoming = outgoing;
  if (defender && (defender.statuses?.vulnerable || 0) > 0) incoming *= 1.5;
  return Math.max(0, Math.floor(incoming));
}

function modifierNote(attacker, defender) {
  const parts = [];
  const str = attacker?.statuses?.strength || 0;
  const weak = (attacker?.statuses?.weak || 0) > 0;
  const vuln = (defender?.statuses?.vulnerable || 0) > 0;
  if (str > 0) parts.push(`+${str} Strength`);
  if (weak) parts.push("Weak −25%");
  if (vuln) parts.push("Vuln +50%");
  return parts.join(", ");
}

function describeAttackPhrase(base, hits, attacker, defender) {
  const finalPerHit = effectiveDamage(base, attacker, defender);
  const modified = finalPerHit !== base;
  const why = modifierNote(attacker, defender);
  if (hits > 1) {
    const total = finalPerHit * hits;
    if (modified) {
      return `Attacks ${hits} times for ${finalPerHit} damage each (${total} total before block — base ${base} adjusted by ${why})`;
    }
    return `Attacks ${hits} times for ${finalPerHit} damage each (${total} total before block)`;
  }
  if (modified) return `Attacks you for ${finalPerHit} damage (base ${base} adjusted by ${why})`;
  return `Attacks you for ${finalPerHit} damage`;
}

// Plain-English version of an intent for use in narration banners.
// Always reads as a complete sentence describing what the enemy will do.
// Optional ctx { attacker, defender } lets the function show the actual
// post-modifier per-hit damage instead of just the raw base value.
export function describeIntentVerbose(intent, ctx = {}) {
  if (!intent) return "Acts.";
  const stacks = intent.stacks || 1;
  const { attacker, defender } = ctx;
  switch (intent.type) {
    case "attack":
    case "attack_telegraphed": {
      const v = intent.value || 0;
      const hits = intent.hits || 1;
      return `${describeAttackPhrase(v, hits, attacker, defender)}.`;
    }
    case "attack_with_status": {
      const v = intent.value || 0;
      const hits = intent.hits || 1;
      return `${describeAttackPhrase(v, hits, attacker, defender)} and applies ${statusName(intent.status)} +${stacks}.`;
    }
    case "attack_and_disrupt": {
      const v = intent.value || 0;
      return `${describeAttackPhrase(v, 1, attacker, defender)} and forces you to discard a random card from your hand.`;
    }
    case "attack_with_modifier": {
      const v = intent.value || 0;
      const phrase = describeAttackPhrase(v, 1, attacker, defender);
      if (intent.modifier === "draw_minus") {
        return `${phrase} and assigns ${intent.label || "Pop Quiz"}: you'll draw ${intent.amount || 2} fewer cards next turn.`;
      }
      return `${phrase} with a side effect.`;
    }
    case "aoe_attack": {
      const v = intent.value || 0;
      const finalPerHit = effectiveDamage(v, attacker, defender);
      const why = modifierNote(attacker, defender);
      const note = finalPerHit !== v ? ` (base ${v} adjusted by ${why})` : "";
      return `Hits everyone for ${finalPerHit} damage${note} — including its own allies.`;
    }
    case "block":
      return `Gains ${intent.value || 0} Block.`;
    case "block_and_status":
      return `Gains ${intent.value || 0} Block and applies ${statusName(intent.status)} +${stacks}.`;
    case "apply_status":
      return `Applies ${statusName(intent.status)} +${stacks} to you.`;
    case "apply_status_aoe_to_player": {
      const list = (intent.statuses || [])
        .map((s) => `${statusName(s.status)} +${s.stacks || 1}`)
        .join(", ");
      return list ? `Applies ${list} to you.` : "Applies status effects to you.";
    }
    case "self_buff": {
      const parts = [];
      if (intent.strength) parts.push(`+${intent.strength} Strength`);
      if (intent.block) parts.push(`+${intent.block} Block`);
      return parts.length ? `Buffs itself: ${parts.join(", ")}.` : "Buffs itself.";
    }
    case "heal_and_buff": {
      const parts = [];
      if (intent.heal) parts.push(`heals ${intent.heal} HP`);
      if (intent.strength) parts.push(`gains +${intent.strength} Strength`);
      return parts.length ? `It ${parts.join(" and ")}.` : "It buffs itself.";
    }
    case "summon":
      return intent.label
        ? `Uses ${intent.label} to call in an ally.`
        : "Summons an ally to fight alongside it.";
    default:
      return intent.label || `Acts (${intent.type}).`;
  }
}

function renderText(intent) {
  switch (intent.type) {
    case "attack":
    case "attack_telegraphed":
      return `Atk ${intent.value || 0}${intent.hits && intent.hits > 1 ? ` ×${intent.hits}` : ""}`;
    case "attack_with_status":
      return `Atk ${intent.value || 0} + ${intent.status}`;
    case "attack_and_disrupt":
      return `Atk ${intent.value || 0} + disrupt`;
    case "attack_with_modifier":
      return `Atk ${intent.value || 0} + draw−${intent.amount || 0}`;
    case "aoe_attack":
      return `Atk ${intent.value || 0} (AOE)`;
    case "block":
      return `Block ${intent.value || 0}`;
    case "block_and_status":
      return `Block ${intent.value || 0} + ${intent.status}`;
    case "apply_status":
      return `${intent.status} +${intent.stacks || 1}`;
    case "apply_status_aoe_to_player": {
      const list = (intent.statuses || []).map((s) => `${s.status} +${s.stacks}`).join(", ");
      return list || "Status";
    }
    case "self_buff": {
      const parts = [];
      if (intent.strength) parts.push(`Str +${intent.strength}`);
      if (intent.block) parts.push(`Block +${intent.block}`);
      return parts.length ? parts.join(", ") : "Buff";
    }
    case "heal_and_buff": {
      const parts = [];
      if (intent.heal) parts.push(`Heal ${intent.heal}`);
      if (intent.strength) parts.push(`Str +${intent.strength}`);
      return parts.length ? parts.join(", ") : "Buff";
    }
    case "summon":
      return intent.label || "Summon";
    default:
      return intent.label || intent.type;
  }
}

export function createIntentDisplay() {
  const root = document.createElement("div");
  root.className = "intent-display";
  return {
    el: root,
    update(intent) {
      root.innerHTML = "";
      if (!intent) return;
      const span = document.createElement("span");
      const cat = categoryClass(intent.type);
      span.className = `intent ${cat}`.trim();
      span.title = intent.label || "";
      span.textContent = renderText(intent);
      root.appendChild(span);
    },
  };
}
