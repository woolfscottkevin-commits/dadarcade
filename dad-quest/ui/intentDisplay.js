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
