// Flashcards — decks, round building, and full-screen practice mode.
//
// Everything here is generated in code. No model, no network, no cost: a times
// table is a times table, and asking a language model to produce one would be
// both slower and less reliable than multiplying two numbers.

const STORE_KEY = "md_flashcards_v1";

// ----------------------------------------------------------------------------
// Decks
// ----------------------------------------------------------------------------

export const DECKS = [
  {
    id: "multiplication",
    title: "Multiplication",
    emoji: "✖️",
    // Which times tables to draw from. The menu exposes these behind a
    // disclosure arrow so a kid can drill just their 7s.
    tables: Array.from({ length: 12 }, (_, i) => i + 1),
    tableLabel: (n) => `${n}s`,
  },
  {
    id: "division",
    title: "Division",
    emoji: "➗",
    tables: Array.from({ length: 12 }, (_, i) => i + 1),
    tableLabel: (n) => `÷ ${n}`,
  },
  {
    id: "fractions",
    title: "Fractions",
    emoji: "\u{1F355}",
    visual: true,
  },
];

export const DECK_BY_ID = Object.fromEntries(DECKS.map((d) => [d.id, d]));

// ----------------------------------------------------------------------------
// Saved selection
// ----------------------------------------------------------------------------

const DEFAULT_SELECTION = {
  decks: ["multiplication"],
  tables: { multiplication: [], division: [] }, // empty = all tables
};

export function loadSelection() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_SELECTION);
    return {
      decks: Array.isArray(raw.decks) && raw.decks.length ? raw.decks.filter((d) => DECK_BY_ID[d]) : ["multiplication"],
      tables: {
        multiplication: Array.isArray(raw.tables?.multiplication) ? raw.tables.multiplication : [],
        division: Array.isArray(raw.tables?.division) ? raw.tables.division : [],
      },
    };
  } catch {
    return structuredClone(DEFAULT_SELECTION);
  }
}

export function saveSelection(sel) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(sel)); } catch { /* private mode */ }
}

// ----------------------------------------------------------------------------
// Card generation
// ----------------------------------------------------------------------------

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

function multiplicationCard(tables) {
  const pool = tables?.length ? tables : DECK_BY_ID.multiplication.tables;
  const a = pick(pool);
  const b = 1 + rnd(12);
  return {
    deck: "multiplication",
    key: `mul:${a}x${b}`,
    prompt: `${a} × ${b}`,
    answer: String(a * b),
  };
}

function divisionCard(tables) {
  const pool = tables?.length ? tables : DECK_BY_ID.division.tables;
  // Build from the answer outwards so every card divides evenly — a flashcard
  // with a remainder is a different skill and would just confuse the drill.
  const divisor = pick(pool);
  const quotient = 1 + rnd(12);
  return {
    deck: "division",
    key: `div:${divisor * quotient}/${divisor}`,
    prompt: `${divisor * quotient} ÷ ${divisor}`,
    answer: String(quotient),
  };
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

// Fractions lead with the picture, because "one half plus one half" means
// nothing to a 7-year-old until they have seen two half-circles become a whole.
function fractionsCard() {
  const denominator = pick([2, 2, 3, 4, 4, 6, 8]);
  const a = 1 + rnd(denominator - 1);
  const b = 1 + rnd(denominator - a); // keep the total at or below one whole
  const sum = a + b;
  const g = gcd(sum, denominator);
  const simplified = sum === denominator
    ? "1 whole"
    : `${sum / g}/${denominator / g}`;

  return {
    deck: "fractions",
    key: `frac:${a}/${denominator}+${b}/${denominator}`,
    prompt: `${a}/${denominator} + ${b}/${denominator}`,
    answer: simplified,
    // Rendered as pies on both faces of the card.
    visual: { a, b, denominator, sum },
  };
}

const GENERATORS = {
  multiplication: (sel) => multiplicationCard(sel.tables?.multiplication),
  division: (sel) => divisionCard(sel.tables?.division),
  fractions: () => fractionsCard(),
};

// ----------------------------------------------------------------------------
// Rounds
// ----------------------------------------------------------------------------

export const ROUND_SIZE = 10;

// Spread the round as evenly as the count allows: three decks over ten cards is
// 4/3/3, and which deck gets the extra rotates so it is not always the first.
export function planRound(deckIds, size = ROUND_SIZE, offset = 0) {
  const decks = deckIds.filter((d) => GENERATORS[d]);
  if (!decks.length) return [];
  const base = Math.floor(size / decks.length);
  let extra = size % decks.length;
  const plan = [];
  decks.forEach((deck, i) => {
    const n = base + ((i + offset) % decks.length < extra ? 1 : 0);
    for (let k = 0; k < n; k++) plan.push(deck);
  });
  // The counts are even; the ORDER should not be, or every round opens with the
  // same deck.
  for (let i = plan.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  return plan;
}

export function buildRound(selection, size = ROUND_SIZE, offset = 0) {
  const plan = planRound(selection.decks, size, offset);
  const cards = [];
  const seen = new Set();
  for (const deck of plan) {
    // Try a few times to avoid the same fact twice in one round of ten.
    let card = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      card = GENERATORS[deck](selection);
      if (!seen.has(card.key)) break;
    }
    seen.add(card.key);
    cards.push(card);
  }
  return cards;
}

// ----------------------------------------------------------------------------
// Fraction pictures
// ----------------------------------------------------------------------------
// "One half plus one half" is abstract until you have watched two half-circles
// become a whole one, so the fraction cards lead with the picture and put the
// notation underneath.

function slicePath(cx, cy, r, index, total) {
  const a0 = (index / total) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((index + 1) / total) * 2 * Math.PI - Math.PI / 2;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

export function fractionPie(filled, total, size = 96, fill = "var(--claire)") {
  const r = size / 2 - 3;
  const cx = size / 2, cy = size / 2;
  const slices = Array.from({ length: total }, (_, i) =>
    `<path d="${slicePath(cx, cy, r, i, total)}" fill="${i < filled ? fill : "#ffffff"}" stroke="#94a3b8" stroke-width="1.5"/>`
  ).join("");
  return `<svg class="frac-pie" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${slices}</svg>`;
}

// Two pies for the operands, and on the reveal a third for the total. More than
// one whole is drawn as a full pie plus the remainder.
function fractionVisual(v, { showAnswer }) {
  const one = (f, d) => fractionPie(f, d);
  const label = (f, d) => `<span class="frac-label">${f}/${d}</span>`;
  const operand = (f, d) => `<div class="frac-term">${one(f, d)}${label(f, d)}</div>`;

  if (!showAnswer) {
    return `<div class="frac-row">
      ${operand(v.a, v.denominator)}
      <span class="frac-op">+</span>
      ${operand(v.b, v.denominator)}
      <span class="frac-op">=</span>
      <span class="frac-q">?</span>
    </div>`;
  }

  const wholes = Math.floor(v.sum / v.denominator);
  const rest = v.sum % v.denominator;
  const totalPies = wholes > 0
    ? `<div class="frac-term">${fractionPie(v.denominator, v.denominator, 96, "var(--green)")}${rest ? fractionPie(rest, v.denominator, 96, "var(--green)") : ""}</div>`
    : `<div class="frac-term">${fractionPie(v.sum, v.denominator, 96, "var(--green)")}</div>`;

  return `<div class="frac-row">
    ${operand(v.a, v.denominator)}
    <span class="frac-op">+</span>
    ${operand(v.b, v.denominator)}
    <span class="frac-op">=</span>
    ${totalPies}
  </div>`;
}

// ----------------------------------------------------------------------------
// Full-screen practice mode
// ----------------------------------------------------------------------------

export function openFlashcards(selection, { onExit } = {}) {
  let round = buildRound(selection);
  let index = 0;
  let flipped = false;
  let roundNumber = 1;

  const overlay = document.createElement("div");
  overlay.className = "fc-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Flashcards");
  overlay.innerHTML = `
    <button type="button" class="fc-close" aria-label="Exit flashcards">×</button>
    <div class="fc-progress" aria-live="polite"></div>
    <div class="fc-stage"></div>`;

  const stage = overlay.querySelector(".fc-stage");
  const progress = overlay.querySelector(".fc-progress");

  // close() reports WHY it closed, so the caller can tell "I'm done" from
  // "show me the deck list again". It previously fired onExit itself and the
  // round-end button fired it a second time with the real reason.
  function close(reason) {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    document.body.classList.remove("fc-open");
    onExit?.(reason);
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); }
  }

  function renderCard() {
    const card = round[index];
    progress.textContent = `${index + 1} / ${round.length}${roundNumber > 1 ? ` · round ${roundNumber}` : ""}`;

    const face = (showAnswer) => card.visual
      ? `${fractionVisual(card.visual, { showAnswer })}
         ${showAnswer ? `<div class="fc-answer">${card.answer}</div>` : ""}`
      : `<div class="fc-prompt">${card.prompt}</div>
         ${showAnswer ? `<div class="fc-answer">${card.answer}</div>` : ""}`;

    stage.innerHTML = `
      <div class="fc-card${flipped ? " flipped" : ""}" tabindex="0" role="button"
           aria-label="${flipped ? "Tap for the next card" : "Tap to see the answer"}">
        <div class="fc-inner">
          <div class="fc-face fc-front">${face(false)}<div class="fc-hint">tap to flip</div></div>
          <div class="fc-face fc-back">${face(true)}<div class="fc-hint">tap for next</div></div>
        </div>
      </div>`;
    stage.querySelector(".fc-card").addEventListener("click", advance);
  }

  function renderRoundEnd() {
    progress.textContent = `${round.length} done`;
    stage.innerHTML = `
      <div class="fc-card fc-done">
        <div class="fc-inner">
          <div class="fc-face fc-front">
            <div class="fc-done-title">Nice work! \u{1F389}</div>
            <div class="fc-done-sub">That is ${round.length} cards.</div>
            <div class="fc-done-actions">
              <button type="button" class="fc-btn fc-again">Go another round</button>
              <button type="button" class="fc-btn fc-new">Practice something new</button>
            </div>
          </div>
        </div>
      </div>`;
    stage.querySelector(".fc-again").addEventListener("click", () => {
      roundNumber += 1;
      // Offset the plan so the spare card in an uneven split moves to a
      // different deck each round.
      round = buildRound(selection, ROUND_SIZE, roundNumber - 1);
      index = 0; flipped = false;
      renderCard();
    });
    stage.querySelector(".fc-new").addEventListener("click", () => close({ chooseNew: true }));
  }

  function advance() {
    if (!flipped) { flipped = true; renderCard(); return; }
    flipped = false;
    index += 1;
    if (index >= round.length) renderRoundEnd();
    else renderCard();
  }

  overlay.querySelector(".fc-close").addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.classList.add("fc-open");
  document.body.appendChild(overlay);
  renderCard();
  return { close };
}

// ----------------------------------------------------------------------------
// Menu
// ----------------------------------------------------------------------------
// Tapping a deck TITLE starts a round of just that deck — the quickest path,
// and the one a kid will use most. The checkboxes are for mixing decks, and the
// disclosure arrow narrows a deck to particular tables.

export function renderFlashcardMenu(container, { onStart } = {}) {
  const selection = loadSelection();
  const expanded = new Set();

  function toggleTable(deckId, n) {
    const list = selection.tables[deckId] || (selection.tables[deckId] = []);
    const at = list.indexOf(n);
    if (at >= 0) list.splice(at, 1); else list.push(n);
    saveSelection(selection);
    draw();
  }

  function draw() {
    container.innerHTML = "";
    for (const deck of DECKS) {
      const row = document.createElement("div");
      row.className = "fc-deck";

      const head = document.createElement("div");
      head.className = "fc-deck-head";

      // Disclosure arrow, only where there is something to disclose.
      if (deck.tables) {
        const caret = document.createElement("button");
        caret.type = "button";
        caret.className = "fc-caret" + (expanded.has(deck.id) ? " open" : "");
        caret.setAttribute("aria-expanded", String(expanded.has(deck.id)));
        caret.setAttribute("aria-label", `Choose which ${deck.title.toLowerCase()} facts`);
        caret.textContent = "▸";
        caret.addEventListener("click", (e) => {
          e.stopPropagation();
          expanded.has(deck.id) ? expanded.delete(deck.id) : expanded.add(deck.id);
          draw();
        });
        head.appendChild(caret);
      } else {
        const spacer = document.createElement("span");
        spacer.className = "fc-caret-spacer";
        head.appendChild(spacer);
      }

      const title = document.createElement("button");
      title.type = "button";
      title.className = "fc-deck-title";
      title.innerHTML = `<span class="fc-deck-emoji">${deck.emoji}</span>${deck.title}`;
      // Straight into a round of this deck alone.
      title.addEventListener("click", () => {
        onStart?.({ decks: [deck.id], tables: selection.tables });
      });
      head.appendChild(title);

      const box = document.createElement("input");
      box.type = "checkbox";
      box.className = "fc-check";
      box.checked = selection.decks.includes(deck.id);
      box.setAttribute("aria-label", `Include ${deck.title} in a mixed round`);
      box.addEventListener("change", () => {
        const at = selection.decks.indexOf(deck.id);
        if (box.checked && at < 0) selection.decks.push(deck.id);
        if (!box.checked && at >= 0) selection.decks.splice(at, 1);
        saveSelection(selection);
        drawStart();
      });
      head.appendChild(box);
      row.appendChild(head);

      if (deck.tables && expanded.has(deck.id)) {
        const chips = document.createElement("div");
        chips.className = "fc-tables";
        const chosen = selection.tables[deck.id] || [];
        const all = document.createElement("button");
        all.type = "button";
        all.className = "fc-chip" + (chosen.length === 0 ? " on" : "");
        all.textContent = "All";
        all.addEventListener("click", () => {
          selection.tables[deck.id] = [];
          saveSelection(selection);
          draw();
        });
        chips.appendChild(all);
        for (const n of deck.tables) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "fc-chip" + (chosen.includes(n) ? " on" : "");
          chip.textContent = deck.tableLabel(n);
          chip.addEventListener("click", () => toggleTable(deck.id, n));
          chips.appendChild(chip);
        }
        row.appendChild(chips);
      }

      container.appendChild(row);
    }
    drawStart();
  }

  function drawStart() {
    let start = container.querySelector(".fc-start");
    if (!start) {
      start = document.createElement("button");
      start.type = "button";
      start.className = "fc-start";
      start.addEventListener("click", () => {
        if (!selection.decks.length) return;
        onStart?.({ decks: [...selection.decks], tables: selection.tables });
      });
      container.appendChild(start);
    } else {
      container.appendChild(start); // keep it last
    }
    const n = selection.decks.length;
    start.disabled = n === 0;
    start.textContent = n === 0
      ? "Tick a deck to mix"
      : n === 1
        ? `Start ${DECK_BY_ID[selection.decks[0]].title}`
        : `Start mixed round (${n} decks)`;
  }

  draw();
  return { redraw: draw };
}
