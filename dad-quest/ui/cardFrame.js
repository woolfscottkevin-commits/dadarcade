// Renders a card as a DOM element. Returns the root <div>.
// The combat scene attaches click/touch handlers; this module just builds markup.

import { CARDS } from "../data/cards.js";
import { getAsset } from "../assets/assetLoader.js";

const TYPE_COLORS = {
  attack: "var(--punchy-red)",
  skill: "var(--sky-blue)",
  power: "var(--sunset-orange)",
  status: "var(--coffee-brown)",
};

const TYPE_GLYPHS = {
  attack: "⚔",
  skill: "◆",
  power: "★",
  status: "✱",
};

export function renderCard(cardInst, opts = {}) {
  const def = CARDS.find((c) => c.id === cardInst.cardId);
  if (!def) return document.createElement("div");

  const root = document.createElement("button");
  root.type = "button";
  root.className = "card";
  root.dataset.uuid = cardInst.uuid;
  root.dataset.cardId = def.id;
  root.dataset.type = def.type;

  if (opts.affordable === false) root.classList.add("card-unaffordable");
  if (def.effect === "unplayable") root.classList.add("card-unplayable");

  const stripe = document.createElement("div");
  stripe.className = "card-stripe";
  stripe.style.background = TYPE_COLORS[def.type] || "var(--coffee-brown)";
  root.appendChild(stripe);

  // Cost circle
  const cost = document.createElement("div");
  cost.className = "card-cost";
  cost.textContent = String(opts.effectiveCost ?? def.cost);
  root.appendChild(cost);

  // Type glyph
  const glyph = document.createElement("div");
  glyph.className = "card-glyph";
  glyph.textContent = TYPE_GLYPHS[def.type] || "·";
  root.appendChild(glyph);

  // Art (or placeholder for Burnout)
  const art = document.createElement("div");
  art.className = "card-art";
  if (def.art) {
    const img = document.createElement("img");
    const cached = getAsset(def.art);
    img.src = cached ? cached.src : def.art;
    img.alt = def.name;
    art.appendChild(img);
  } else {
    art.classList.add("card-art-burnout");
    const plate = document.createElement("div");
    plate.className = "card-art-burnout-plate";
    plate.textContent = "BURNOUT";
    art.appendChild(plate);
  }
  root.appendChild(art);

  // Name
  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = def.name;
  root.appendChild(name);

  // Description
  const desc = document.createElement("div");
  desc.className = "card-desc";
  desc.textContent = def.description;
  root.appendChild(desc);

  return root;
}
