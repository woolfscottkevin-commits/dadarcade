// Morning Drive — page render + attempt logging.
// All state lives on the page; nothing reactive. We re-render the body when
// the user switches into a past day, but individual section interactions
// (correct/wrong, reveal) mutate the DOM directly to keep things snappy.

const sectionsEl = document.getElementById("sections");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const dateLabel = document.getElementById("app-date");
const scoreClaireEl = document.getElementById("score-claire");
const scoreConnorEl = document.getElementById("score-connor");
const pastBtn = document.getElementById("past-days-btn");
const pastSheet = document.getElementById("past-sheet");
const pastListEl = document.getElementById("past-list");
const readOnlyBanner = document.getElementById("read-only-banner");
const roDateLabel = document.getElementById("ro-date");
const backToTodayBtn = document.getElementById("back-to-today");

let activePayload = null;
let activeDate = null;
let isReadOnly = false;
let scores = { claire: 0, connor: 0 };
const answered = new Set(); // problemKey markers so a kid can't score twice
const attemptCounts = new Map(); // problemKey -> wrong-pick count so far
let dayProgress = {}; // persisted per-day state, replayed after a reload:
                      // { [problemKey]: { wrong: [choiceIdx,…], solved: bool } }

// ----------------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------------

init();

async function init() {
  try {
    await loadDay({ date: null, readOnly: false });
  } catch (err) {
    showError(`Couldn't load today's questions: ${err.message || err}`);
  }
  wireUI();
  warmVoices();
}

function wireUI() {
  pastBtn.addEventListener("click", openPastSheet);
  pastSheet.querySelector(".past-close").addEventListener("click", closePastSheet);
  pastSheet.addEventListener("click", (e) => {
    if (e.target === pastSheet) closePastSheet();
  });
  backToTodayBtn.addEventListener("click", () => {
    loadDay({ date: null, readOnly: false }).catch((err) =>
      showError(`Couldn't load today: ${err.message || err}`)
    );
  });
}

// ----------------------------------------------------------------------------
// Data fetch + render
// ----------------------------------------------------------------------------

function todayInET() {
  // Same formatter the API uses, kept here so the UI can decide whether a
  // selected past date is actually today (and therefore live, not read-only).
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

async function loadDay({ date, readOnly }) {
  resetState();
  showStatus(readOnly ? `Loading ${date}…` : "Loading today's questions…");
  const url = date
    ? `/api/morning-drive?date=${encodeURIComponent(date)}`
    : "/api/morning-drive";
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.payload) throw new Error("No payload returned");
  activePayload = data.payload;
  activeDate = data.date;
  // If the user picked today's date from the Past Days picker, treat it as
  // live (no Reviewing banner, attempts logged) — they're back to today,
  // just got there a long way around.
  isReadOnly = !!readOnly && data.date !== todayInET();
  // Pull any saved attempt history for a live day so wrong picks come back red
  // and solved questions stay solved even if the page reloaded mid-session.
  dayProgress = isReadOnly ? {} : loadProgressForDay(activeDate);
  renderHeader();
  renderSections();
  // Analytics ping
  try {
    if (typeof gtag === "function") {
      gtag("event", readOnly ? "morning_drive_view_past" : "morning_drive_view", {
        date: activeDate,
        source: data.source,
      });
    }
  } catch {}
}

function resetState() {
  hide(errorEl);
  show(statusEl);
  hide(sectionsEl);
  sectionsEl.innerHTML = "";
  scores = { claire: 0, connor: 0 };
  scoreClaireEl.textContent = "0";
  scoreConnorEl.textContent = "0";
  answered.clear();
  attemptCounts.clear();
  dayProgress = {};
}

function showStatus(text) { statusEl.textContent = text; show(statusEl); }
function showError(text) { errorEl.textContent = text; show(errorEl); hide(statusEl); }
function hide(el) { el.hidden = true; }
function show(el) { el.hidden = false; }

function renderHeader() {
  // Friendly date string
  try {
    const [y, m, d] = activeDate.split("-").map(Number);
    const local = new Date(Date.UTC(y, m - 1, d));
    dateLabel.textContent = local.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
    });
  } catch {
    dateLabel.textContent = activeDate;
  }
  if (isReadOnly) {
    show(readOnlyBanner);
    roDateLabel.textContent = activeDate;
  } else {
    hide(readOnlyBanner);
  }
}

function renderSections() {
  hide(statusEl);
  sectionsEl.innerHTML = "";
  const p = activePayload;
  // Sections rotate day to day, and past days were generated under older
  // shapes, so we render whatever the payload actually contains rather than
  // assuming a fixed set. Order below is the order Dad reads them out.
  const add = (node) => { if (node) sectionsEl.appendChild(node); };

  if (p.claireMath?.length) add(renderMathSection("claire", "Claire's Math", "👧", p.claireMath));
  if (p.connorMath?.length) add(renderMathSection("connor", "Connor's Math", "🧒", p.connorMath));
  if (p.grammarClaire?.length) add(renderGrammarSection("claire", "Claire's Grammar", "\u270F\uFE0F", p.grammarClaire));
  if (p.grammarConnor?.length) add(renderGrammarSection("connor", "Connor's Grammar", "\u270F\uFE0F", p.grammarConnor));
  if (p.wordsOfDay) add(renderWordsSection(p.wordsOfDay));
  add(renderWordMatchSection(p));
  if (p.bibleVerse) add(renderBibleSection(p.bibleVerse));
  if (p.quote) add(renderQuoteSection(p.quote));
  if (p.spelling) add(renderSpellingSection(p.spelling));
  if (p.spanishWord) add(renderSpanishSection(p.spanishWord));
  if (p.artwork?.image) add(renderArtworkSection(p.artwork));
  if (p.landmark?.image) add(renderLandmarkSection(p.landmark));
  if (p.flag?.image) add(renderFlagSection(p.flag));
  if (p.animal?.image) add(renderAnimalSection(p.animal));
  if (p.geography) add(renderGeographySection(p.geography));
  if (p.thisDayInHistory) add(renderThisDaySection(p.thisDayInHistory));
  if (p.news?.length) add(renderNewsSection(p.news));
  if (p.trivia?.length) add(renderTriviaSection(p.trivia));
  if (p.facts?.length) add(renderFactsSection(p.facts));
  if (p.twoTruths) add(renderTwoTruthsSection(p.twoTruths));
  if (p.riddle) add(renderRiddleSection(p.riddle));
  if (p.characterTrait) add(renderCharacterTraitSection(p.characterTrait));
  if (p.jokes && (p.jokes.length || p.jokes.claire || p.jokes.connor)) add(renderJokesSection(p.jokes));
  if (p.wyr?.length) add(renderWyrSection(p.wyr));

  show(sectionsEl);
}

// ----------------------------------------------------------------------------
// Section renderers
// ----------------------------------------------------------------------------

function makeSection(slug, title, emoji) {
  const section = document.createElement("section");
  section.className = `section s-${slug}`;
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `<span class="emoji" aria-hidden="true">${emoji}</span><span>${escapeHtml(title)}</span>`;
  const body = document.createElement("div");
  body.className = "section-body";
  section.appendChild(header);
  section.appendChild(body);
  return { section, body };
}

function renderMathSection(kid, title, emoji, questions) {
  const { section, body } = makeSection(kid, title, emoji);
  const trophy = document.createElement("div");
  trophy.className = "trophy";
  trophy.textContent = `🏆 ${title.split("'")[0]} got all 5!`;
  trophy.style.display = "none";

  questions.forEach((q, i) => {
    const problemKey = `math_${kid}_${i + 1}`;
    body.appendChild(renderMCQuestion({
      problemKey,
      kid,
      kind: "math",
      topic: q.topic || "math",
      prompt: q.question,
      hint: q.hint,
      choices: q.choices,
      correctIndex: q.correctIndex,
      onCorrect: () => {
        if (!answered.has(problemKey)) {
          answered.add(problemKey);
          scores[kid] += 1;
          (kid === "claire" ? scoreClaireEl : scoreConnorEl).textContent = String(scores[kid]);
          if (scores[kid] === 5) trophy.style.display = "block";
        }
      },
    }));
  });
  body.appendChild(trophy);
  return section;
}

function renderMCQuestion({ problemKey, kid, kind, topic, itemKey, prompt, hint, choices, correctIndex, onCorrect, quotedDef, revealHtml, logged = true }) {
  const card = document.createElement("div");
  card.className = "qcard";
  const promptHtml = quotedDef
    ? `${escapeHtml(prompt)}<span class="quoted-def">${escapeHtml(quotedDef)}</span>`
    : escapeHtml(prompt);
  card.innerHTML = `<p class="qprompt">${promptHtml}</p>`;
  const grid = document.createElement("div");
  grid.className = "choices";

  let locked = false;
  let revealedAfterReadOnly = false;
  let revealNode = null; // optional context block, shown once they've answered

  // Attempt tally — shows Dad at a glance how many wrong picks happened.
  const badge = document.createElement("div");
  badge.className = "attempt-badge";
  badge.hidden = true;
  function refreshBadge() {
    const wrong = attemptCounts.get(problemKey) || 0;
    if (locked) {
      if (wrong === 0) {
        badge.className = "attempt-badge ok";
        badge.textContent = "✅ First try!";
      } else {
        badge.className = "attempt-badge after-wrong";
        badge.textContent = `✅ Correct after ${wrong} wrong ${wrong === 1 ? "try" : "tries"}`;
      }
      badge.hidden = false;
    } else if (wrong > 0) {
      badge.className = "attempt-badge wrong-running";
      badge.textContent = `❌ ${wrong} wrong ${wrong === 1 ? "try" : "tries"} so far`;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  choices.forEach((choiceText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = choiceText;
    if (isReadOnly && idx === correctIndex) {
      btn.classList.add("revealed-correct");
      btn.disabled = true;
      revealedAfterReadOnly = true;
    }
    btn.addEventListener("click", () => {
      if (locked || isReadOnly) return;
      const isCorrect = idx === correctIndex;
      const priorWrong = attemptCounts.get(problemKey) || 0;
      const attempts = priorWrong + 1; // current pick counts

      if (isCorrect) {
        locked = true;
        btn.classList.add("locked-correct");
        card.classList.add("correct");
        grid.querySelectorAll(".choice").forEach((b) => { b.disabled = true; });
        onCorrect && onCorrect();
        saveProblemProgress(problemKey, { solved: true });
        refreshBadge();
        if (revealNode) revealNode.hidden = false;
        if (logged) logAttempt({ kid, kind, problemKey, topic, itemKey, attempts, correct: true });
      } else {
        attemptCounts.set(problemKey, priorWrong + 1);
        btn.classList.add("locked-wrong");
        btn.disabled = true;
        saveProblemProgress(problemKey, { wrongIndex: idx });
        card.classList.remove("wrong");
        // restart shake animation
        void card.offsetWidth;
        card.classList.add("wrong");
        refreshBadge();
      }
    });
    grid.appendChild(btn);
  });
  card.appendChild(grid);
  card.appendChild(badge);

  // Context revealed after they answer (geography, two-truths). In read-only
  // review mode it's open from the start, same as every other reveal card.
  if (revealHtml) {
    revealNode = document.createElement("div");
    revealNode.className = "answer-reveal";
    revealNode.innerHTML = revealHtml;
    revealNode.hidden = !isReadOnly;
    card.appendChild(revealNode);
  }

  // Replay any saved attempts (e.g. after the tab reloaded while the phone was
  // locked) so wrong picks stay red and a solved question stays solved.
  const saved = !isReadOnly ? dayProgress[problemKey] : null;
  if (saved) {
    const btns = grid.querySelectorAll(".choice");
    attemptCounts.set(problemKey, (saved.wrong || []).length);
    (saved.wrong || []).forEach((wi) => {
      const b = btns[wi];
      if (b) { b.classList.add("locked-wrong"); b.disabled = true; }
    });
    if (saved.solved) {
      locked = true;
      const cb = btns[correctIndex];
      if (cb) cb.classList.add("locked-correct");
      card.classList.add("correct");
      btns.forEach((b) => { b.disabled = true; });
      if (revealNode) revealNode.hidden = false;
      onCorrect && onCorrect(); // restore score badge / trophy
    }
    refreshBadge();
  }

  if (!isReadOnly && hint) {
    const meta = document.createElement("div");
    meta.className = "qmeta";
    const hintBtn = document.createElement("button");
    hintBtn.type = "button";
    hintBtn.className = "hint-btn";
    hintBtn.textContent = "Need a hint?";
    const hintBox = document.createElement("div");
    hintBox.className = "hint-box";
    hintBox.hidden = true;
    hintBox.textContent = hint;
    hintBtn.addEventListener("click", () => {
      hintBox.hidden = !hintBox.hidden;
      hintBtn.textContent = hintBox.hidden ? "Need a hint?" : "Hide hint";
    });
    meta.appendChild(hintBtn);
    card.appendChild(meta);
    card.appendChild(hintBox);
  } else if (isReadOnly && hint) {
    const hintBox = document.createElement("div");
    hintBox.className = "hint-box";
    hintBox.textContent = `Hint: ${hint}`;
    card.appendChild(hintBox);
  }

  return card;
}

function renderWordsSection(words) {
  const { section, body } = makeSection("words", "Words of the Day", "📚");
  if (!words) {
    body.innerHTML = `<p class="rc-sub">No words today.</p>`;
    return section;
  }
  body.appendChild(renderWordCard("Connor's word", "ln", words.connor));
  body.appendChild(renderWordCard("Claire's word", "lc", words.claire));
  return section;
}

function renderWordCard(label, levelClass, w) {
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <p class="rc-sub"><span class="level-badge ${levelClass}">${escapeHtml(label)}</span></p>
    <h3 class="rc-title">${escapeHtml(w.word)}</h3>
    <p class="rc-body">Can you guess what it means?</p>
    <button type="button" class="reveal-btn r-words">Reveal ✨</button>
    <div class="rc-hidden">
      <p class="rc-body"><strong>Definition:</strong> ${escapeHtml(w.definition)}</p>
      <p class="example-line">"${escapeHtml(w.example)}"</p>
    </div>`;
  const btn = card.querySelector(".reveal-btn");
  btn.addEventListener("click", () => card.classList.add("open"));
  return card;
}

function renderWordMatchSection(p) {
  const review = p.vocabReview;
  const hasReview = review && ((review.claire?.length || 0) + (review.connor?.length || 0)) > 0;

  // Days generated before the review rewrite carry the old `vocabMatch` shape,
  // which quizzed that same morning's words. Render those as-is so Past Days
  // still replays faithfully instead of showing an empty section.
  if (!hasReview) return renderLegacyVocabMatchSection(p.vocabMatch);

  const { section, body } = makeSection("vocab", "Word Match", "\u{1F9E9}");
  const intro = document.createElement("p");
  intro.className = "rc-sub section-note";
  intro.textContent = "Words from earlier mornings — do you still remember them?";
  body.appendChild(intro);

  for (const kid of ["connor", "claire"]) {
    const items = review[kid] || [];
    if (!items.length) continue;
    const label = document.createElement("p");
    label.className = "rc-sub";
    const name = kid === "claire" ? "Claire" : "Connor";
    label.innerHTML = `<span class="level-badge ${kid === "claire" ? "lc" : "ln"}">${name}</span>`;
    body.appendChild(label);
    items.forEach((vm, i) => body.appendChild(renderWordMatchCard(kid, vm, i)));
  }
  return section;
}

function renderWordMatchCard(kid, vm, i) {
  return renderMCQuestion({
    problemKey: `vocab_review_${kid}_${i + 1}`,
    kid,
    kind: "vocab_match",
    topic: "vocab-review",
    itemKey: vm.word, // the word itself, so misses can be resurfaced later
    prompt: "Which word means this?",
    quotedDef: vm.definition,
    choices: vm.options,
    correctIndex: vm.correctIndex,
    revealHtml: vm.learnedOn
      ? `<span class="learned-on">You learned this on ${escapeHtml(friendlyDate(vm.learnedOn))}.</span>`
      : "",
  });
}

function renderLegacyVocabMatchSection(vocabMatch) {
  if (!vocabMatch) return null;
  const { section, body } = makeSection("vocab", "Word Match", "\u{1F9E9}");
  for (const kid of ["connor", "claire"]) {
    const vm = vocabMatch[kid];
    if (!vm) continue;
    const name = kid === "claire" ? "Claire" : "Connor";
    body.appendChild(renderMCQuestion({
      problemKey: `vocab_match_${kid}`,
      kid,
      kind: "vocab_match",
      topic: "vocab-definition",
      itemKey: vm.word,
      prompt: `${name} — which word means this?`,
      quotedDef: vm.definition,
      choices: vm.options,
      correctIndex: vm.correctIndex,
    }));
  }
  return section;
}

// ----------------------------------------------------------------------------
// Images
// ----------------------------------------------------------------------------
// Every image is resolved and verified server-side, so by the time it reaches
// here the URL is known good. Still lazy-loaded: this is read on a phone on
// mobile data in a moving car, and the tile may be far down the page.
function renderImage(image, altText) {
  if (!image?.url) return null;
  const wrap = document.createElement("figure");
  wrap.className = "tile-figure";
  const img = document.createElement("img");
  img.src = image.url;
  img.alt = altText || "";
  img.loading = "lazy";
  img.decoding = "async";
  if (image.width && image.height) {
    // Reserve the space so the page doesn't jump as it loads.
    img.width = image.width;
    img.height = image.height;
  }
  img.addEventListener("error", () => { wrap.remove(); });
  wrap.appendChild(img);
  if (image.credit) {
    // Most Wikimedia photos are CC-BY-SA: the credit is a licence condition,
    // not decoration. Do not remove it.
    const cap = document.createElement("figcaption");
    cap.className = "img-credit";
    cap.textContent = image.credit;
    wrap.appendChild(cap);
  }
  return wrap;
}

// ----------------------------------------------------------------------------
// Speech (spelling tile)
// ----------------------------------------------------------------------------
// iOS Safari will only start speech from inside a real user gesture, and only
// if speechSynthesis.speak() is reached SYNCHRONOUSLY. The first version of this
// awaited voice loading first — which falls back to a 1500ms timer — so by the
// time it called speak() the gesture was long over and iOS silently refused.
// Desktop Chrome does not enforce that, which is why it passed local testing and
// failed on the actual phone in the car.
//
// So: warm the voice list in the background at load, and never await anything on
// the tap path.
let cachedVoices = [];
function warmVoices() {
  if (!("speechSynthesis" in window)) return;
  const load = () => { cachedVoices = window.speechSynthesis.getVoices() || []; };
  load();
  if (!cachedVoices.length) {
    window.speechSynthesis.addEventListener("voiceschanged", load, { once: true });
    setTimeout(load, 1200);
  }
}

// Fully synchronous. Returns false if speech is unavailable so the caller can
// fall back to showing the word rather than leaving a dead button.
function speak(text, { rate = 0.85 } = {}) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return false;
  try {
    // Only cancel when something is actually in flight: on iOS an unconditional
    // cancel() immediately before speak() can swallow the new utterance.
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    const u = new SpeechSynthesisUtterance(String(text));
    u.rate = rate;
    u.volume = 1;
    const voices = cachedVoices.length ? cachedVoices : (window.speechSynthesis.getVoices() || []);
    const voice = voices.find((v) => /^en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : "en-US";
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// New section renderers
// ----------------------------------------------------------------------------

function renderGrammarSection(kid, title, emoji, questions) {
  const { section, body } = makeSection(`grammar-${kid}`, title, emoji);
  questions.forEach((q, i) => {
    const problemKey = `grammar_${kid}_${i + 1}`;
    body.appendChild(renderMCQuestion({
      problemKey,
      kid,
      kind: "grammar",
      topic: q.topic || "grammar",
      prompt: q.question,
      hint: q.hint,
      choices: q.choices,
      correctIndex: q.correctIndex,
      // The rule matters more than the score — show it however they answered.
      revealHtml: q.why ? `<p class="rc-body"><strong>The rule:</strong> ${escapeHtml(q.why)}</p>` : "",
    }));
  });
  return section;
}

function renderArtworkSection(a) {
  const { section, body } = makeSection("artwork", "Art of the Day", "\u{1F3A8}");
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  const fig = renderImage(a.image, `${a.title} by ${a.artist}`);
  if (fig) body.appendChild(fig);
  card.innerHTML = `
    <p class="rc-body think-prompt">\u{1F4AD} ${escapeHtml(a.question)}</p>
    <p class="look-for">\u{1F50D} <strong>Look for:</strong> ${escapeHtml(a.lookFor || "")}</p>
    <button type="button" class="reveal-btn r-artwork">What is it? \u2728</button>
    <div class="rc-hidden">
      <h3 class="rc-title">${escapeHtml(a.title)}</h3>
      <p class="rc-sub artwork-by">${escapeHtml(a.artist)}${a.year ? ` \u00b7 ${escapeHtml(a.year)}` : ""}</p>
      <p class="rc-body">${escapeHtml(a.story)}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderLandmarkSection(l) {
  const { section, body } = makeSection("landmark", "Landmark of the Day", "\u{1F5FC}");
  const fig = renderImage(l.image, l.name);
  if (fig) body.appendChild(fig);
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <p class="rc-body think-prompt">\u{1F4AD} ${escapeHtml(l.question)}</p>
    <button type="button" class="reveal-btn r-landmark">Where is this? \u2728</button>
    <div class="rc-hidden">
      <h3 class="rc-title">${escapeHtml(l.name)}</h3>
      <p class="rc-sub">${escapeHtml(l.country || "")}</p>
      <p class="rc-body">${escapeHtml(l.context)}</p>
      <p class="example-line">\u2728 ${escapeHtml(l.funFact || "")}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderFlagSection(f) {
  const { section, body } = makeSection("flag", "Flag of the Day", "\u{1F6A9}");
  const fig = renderImage(f.image, "Flag to identify");
  if (fig) { fig.classList.add("flag-figure"); body.appendChild(fig); }
  body.appendChild(renderMCQuestion({
    problemKey: "flag",
    kind: "flag",
    topic: "flag",
    prompt: f.question || "Which country's flag is this?",
    choices: f.choices,
    correctIndex: f.correctIndex,
    logged: false, // shared between both kids
    revealHtml: `<p class="rc-body">${escapeHtml(f.fact || "")}</p>`,
  }));
  return section;
}

function renderAnimalSection(a) {
  const { section, body } = makeSection("animal", "Animal of the Day", "\u{1F43E}");
  const fig = renderImage(a.image, a.name);
  if (fig) body.appendChild(fig);
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <p class="rc-body think-prompt">\u{1F4AD} ${escapeHtml(a.question)}</p>
    <button type="button" class="reveal-btn r-animal">Tell me about it \u2728</button>
    <div class="rc-hidden">
      <h3 class="rc-title">${escapeHtml(a.name)}</h3>
      <ul class="fact-list">${(a.facts || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderSpellingSection(sp) {
  const { section, body } = makeSection("spelling", "Spelling", "\u{1F5E3}\uFE0F");
  const note = document.createElement("p");
  note.className = "rc-sub section-note";
  note.textContent = "Tap the word to hear it. Spell it out loud, then check.";
  body.appendChild(note);

  for (const kid of ["connor", "claire"]) {
    const list = sp[kid] || [];
    if (!list.length) continue;
    const label = document.createElement("p");
    label.className = "rc-sub";
    label.innerHTML = `<span class="level-badge ${kid === "claire" ? "lc" : "ln"}">${kid === "claire" ? "Claire" : "Connor"}</span>`;
    body.appendChild(label);
    list.forEach((item, i) => body.appendChild(renderSpellingCard(kid, item, i)));
  }
  return section;
}

function renderSpellingCard(kid, item, i) {
  const card = document.createElement("div");
  card.className = "reveal-card spell-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <div class="spell-row">
      <button type="button" class="speak-btn" aria-label="Hear the word">\u{1F50A} Hear it</button>
      <button type="button" class="reveal-btn r-spell">Show spelling \u2728</button>
    </div>
    <div class="rc-hidden">
      <h3 class="rc-title spell-word">${escapeHtml(item.word)}</h3>
      <p class="example-line">"${escapeHtml(item.sentence || "")}"</p>
    </div>`;
  const speakBtn = card.querySelector(".speak-btn");
  speakBtn.addEventListener("click", () => {
    const ok = speak(`${item.word}. ${item.sentence || ""}`);
    if (!ok) {
      // No speech support (or blocked) — fall back to just showing the word
      // rather than leaving a dead button.
      card.classList.add("open");
      speakBtn.textContent = "Speech unavailable";
      speakBtn.disabled = true;
    }
  });
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  return card;
}

function renderSpanishSection(sw) {
  const { section, body } = makeSection("spanish", "Spanish Word", "\u{1F1EA}\u{1F1F8}");
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <h3 class="rc-title spanish-word">${escapeHtml(sw.spanish)}</h3>
    <p class="rc-sub pronunciation">${escapeHtml(sw.pronunciation || "")}</p>
    <p class="rc-body">Can you guess what it means?</p>
    <button type="button" class="reveal-btn r-spanish">Reveal \u2728</button>
    <div class="rc-hidden">
      <p class="rc-body"><strong>${escapeHtml(sw.english)}</strong></p>
      <p class="example-line">${escapeHtml(sw.example || "")}</p>
      <p class="example-line translation">${escapeHtml(sw.exampleEnglish || "")}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderBibleSection(v) {
  const { section, body } = makeSection("bible", "Verse of the Day", "\u{1F4D6}");
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <p class="rc-sub">
      <span class="level-badge ref">${escapeHtml(v.reference)}</span>
      ${v.translation ? `<span class="translation-tag">${escapeHtml(v.translation)}</span>` : ""}
    </p>
    <blockquote class="verse-text">${escapeHtml(v.text)}</blockquote>
    <p class="rc-body think-prompt">\u{1F4AD} ${escapeHtml(v.question)}</p>
    <button type="button" class="reveal-btn r-bible">Tell me about it \u2728</button>
    <div class="rc-hidden">
      <p class="rc-body">${escapeHtml(v.meaning)}</p>
      <p class="story-line"><strong>The story:</strong> ${escapeHtml(v.story)}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderQuoteSection(q) {
  const { section, body } = makeSection("quote", "Quote of the Day", "\u{1F4AC}");
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <blockquote class="quote-text">${escapeHtml(q.text)}</blockquote>
    <p class="rc-body think-prompt">\u{1F4AD} ${escapeHtml(q.question)}</p>
    <button type="button" class="reveal-btn r-quote">Who said it? \u2728</button>
    <div class="rc-hidden">
      <p class="rc-body quote-author">\u2014 ${escapeHtml(q.author)}</p>
      <p class="example-line">${escapeHtml(q.context)}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderGeographySection(geo) {
  const { section, body } = makeSection("geo", "Geography", "\u{1F5FA}\uFE0F");
  const rows = [["us", "United States", "\u{1F1FA}\u{1F1F8}"], ["world", "Around the World", "\u{1F30D}"]];
  for (const [key, label, emoji] of rows) {
    const g = geo[key];
    if (!g) continue;
    const head = document.createElement("p");
    head.className = "rc-sub";
    head.innerHTML = `<span class="level-badge geo">${emoji} ${escapeHtml(label)}</span>`;
    body.appendChild(head);
    body.appendChild(renderMCQuestion({
      problemKey: `geo_${key}`,
      kind: "geography",
      topic: `geography-${key}`,
      prompt: g.question,
      choices: g.choices,
      correctIndex: g.correctIndex,
      logged: false, // shared between both kids, so there's no `kid` to log it under
      revealHtml: `
        <p class="rc-body">${escapeHtml(g.context)}</p>
        ${g.funFact ? `<p class="example-line">\u2728 ${escapeHtml(g.funFact)}</p>` : ""}`,
    }));
  }
  return section;
}

function renderThisDaySection(t) {
  const { section, body } = makeSection("tdih", "On This Day", "\u{1F4C5}");
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <p class="rc-body think-prompt">\u{1F4AD} ${escapeHtml(t.question)}</p>
    <button type="button" class="reveal-btn r-tdih">What happened? \u2728</button>
    <div class="rc-hidden">
      <p class="rc-sub"><span class="level-badge year">${escapeHtml(t.year)}</span></p>
      <p class="rc-body"><strong>${escapeHtml(t.event)}</strong></p>
      <p class="example-line">${escapeHtml(t.context)}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderTwoTruthsSection(tt) {
  const { section, body } = makeSection("truths", "Two Truths and a Lie", "\u{1F575}\uFE0F");
  const items = tt.items || [];
  if (items.length !== 3) return null;
  body.appendChild(renderMCQuestion({
    problemKey: "two_truths",
    kind: "two_truths",
    topic: "two-truths",
    prompt: "Two of these are true. Which one is the LIE?",
    choices: items.map((i) => i.text),
    correctIndex: tt.lieIndex,
    logged: false,
    revealHtml: `<p class="rc-body">${escapeHtml(tt.explanation)}</p>`,
  }));
  return section;
}

function renderRiddleSection(r) {
  const { section, body } = makeSection("riddle", "Riddle", "\u{1F9E0}");
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <p class="rc-body"><strong>${escapeHtml(r.riddle)}</strong></p>
    <button type="button" class="reveal-btn r-riddle">Reveal answer \u2728</button>
    <div class="rc-hidden">
      <p class="rc-body"><strong>Answer:</strong> ${escapeHtml(r.answer)}</p>
      <p class="example-line">${escapeHtml(r.explanation)}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderCharacterTraitSection(c) {
  const { section, body } = makeSection("trait", "Today's Challenge", "\u{1F31F}");
  const card = document.createElement("div");
  card.className = "reveal-card" + (isReadOnly ? " open" : "");
  card.innerHTML = `
    <p class="rc-sub"><span class="emoji" aria-hidden="true">${escapeHtml(c.emoji || "\u{1F31F}")}</span> <strong>${escapeHtml(c.trait)}</strong></p>
    <p class="rc-body">${escapeHtml(c.definition)}</p>
    <button type="button" class="reveal-btn r-trait">Why it matters \u2728</button>
    <div class="rc-hidden">
      <p class="rc-body">${escapeHtml(c.why)}</p>
      <p class="challenge-line">\u{1F3AF} <strong>Try this today:</strong> ${escapeHtml(c.challenge)}</p>
    </div>`;
  card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
  body.appendChild(card);
  return section;
}

function renderNewsSection(news) {
  const { section, body } = makeSection("news", "Today's News", "📰");
  news.forEach((n) => {
    const card = document.createElement("div");
    card.className = "reveal-card open";
    const link = n.sourceUrl
      ? `<a class="news-link" href="${escapeAttr(n.sourceUrl)}" target="_blank" rel="noopener">Read more →</a>`
      : "";
    card.innerHTML = `
      <h3 class="news-headline">${escapeHtml(n.headline)}</h3>
      <p class="news-summary">${escapeHtml(n.summary)}</p>
      <div class="news-question">💬 ${escapeHtml(n.question)}</div>
      ${link}`;
    body.appendChild(card);
  });
  return section;
}

function renderTriviaSection(trivia) {
  const { section, body } = makeSection("trivia", "History Trivia", "🏺");
  trivia.forEach((t) => {
    const card = document.createElement("div");
    card.className = "reveal-card" + (isReadOnly ? " open" : "");
    card.innerHTML = `
      <p class="rc-body"><strong>${escapeHtml(t.question)}</strong></p>
      <button type="button" class="reveal-btn r-trivia">Reveal answer ✨</button>
      <div class="rc-hidden">
        <p class="rc-body"><strong>Answer:</strong> ${escapeHtml(t.answer)}</p>
        <p class="example-line">${escapeHtml(t.context)}</p>
      </div>`;
    card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
    body.appendChild(card);
  });
  return section;
}

function renderFactsSection(facts) {
  const { section, body } = makeSection("facts", "Fun Facts", "✨");
  facts.forEach((f) => {
    const card = document.createElement("div");
    card.className = "reveal-card" + (isReadOnly ? " open" : "");
    card.innerHTML = `
      <p class="rc-sub"><span class="emoji" aria-hidden="true">${escapeHtml(f.emoji || "✨")}</span> <strong>${escapeHtml(f.title)}</strong></p>
      <button type="button" class="reveal-btn r-facts">Tap to reveal ✨</button>
      <div class="rc-hidden">
        <p class="rc-body">${escapeHtml(f.fact)}</p>
      </div>`;
    card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
    body.appendChild(card);
  });
  return section;
}

function renderJokesSection(jokes) {
  const { section, body } = makeSection("jokes", "Jokes of the Day", "🤣");
  // The bank serves one joke per kid as { connor: [...], claire: [...] }; older
  // days stored a flat array of two. Accept both shapes.
  const list = Array.isArray(jokes)
    ? jokes
    : ["connor", "claire"].flatMap((kid) => (jokes?.[kid] || []).map((j) => ({ ...j, level: j.level || kid })));
  list.forEach((j) => {
    const card = document.createElement("div");
    card.className = "reveal-card" + (isReadOnly ? " open" : "");
    // Name the child rather than labelling the joke with their "level" — a kid
    // reading "Connor-level" next to an easier joke draws the obvious conclusion.
    const levelClass = j.level === "claire" ? "lc" : "ln";
    const levelLabel = j.level === "claire" ? "Claire's joke" : "Connor's joke";
    card.innerHTML = `
      <p class="rc-sub"><span class="level-badge ${levelClass}">${levelLabel}</span></p>
      <p class="rc-body"><strong>${escapeHtml(j.setup)}</strong></p>
      <button type="button" class="reveal-btn r-jokes">Reveal punchline 🥁</button>
      <div class="rc-hidden">
        <p class="rc-body">${escapeHtml(j.punchline)}</p>
      </div>`;
    card.querySelector(".reveal-btn").addEventListener("click", () => card.classList.add("open"));
    body.appendChild(card);
  });
  return section;
}

function renderWyrSection(wyr) {
  const { section, body } = makeSection("wyr", "Would You Rather", "🎲");
  wyr.forEach((w, i) => {
    const card = document.createElement("div");
    card.className = "qcard";
    card.innerHTML = `<p class="qprompt">Would you rather…</p>`;
    const row = document.createElement("div");
    row.className = "wyr-row";
    const a = document.createElement("button");
    a.type = "button"; a.className = "wyr-btn a"; a.textContent = w.a;
    const b = document.createElement("button");
    b.type = "button"; b.className = "wyr-btn b"; b.textContent = w.b;
    const result = document.createElement("p");
    result.className = "wyr-result"; result.hidden = true;
    let picked = false;
    function pick(which, btn) {
      if (picked || isReadOnly) return;
      picked = true;
      btn.classList.add("picked");
      (which === "a" ? b : a).disabled = true;
      result.textContent = which === "a" ? "Great pick! 🎉" : "Bold choice! 🎉";
      result.hidden = false;
    }
    a.addEventListener("click", () => pick("a", a));
    b.addEventListener("click", () => pick("b", b));
    row.appendChild(a); row.appendChild(b);
    card.appendChild(row);
    card.appendChild(result);
    body.appendChild(card);
  });
  return section;
}

// ----------------------------------------------------------------------------
// Past days picker
// ----------------------------------------------------------------------------

async function openPastSheet() {
  pastListEl.innerHTML = `<p class="rc-sub" style="padding:0.6rem;">Loading…</p>`;
  show(pastSheet);
  try {
    const res = await fetch("/api/morning-drive?past=1");
    const data = await res.json();
    const days = data.days || [];
    if (!days.length) {
      pastListEl.innerHTML = `<p class="rc-sub" style="padding:0.6rem;">No past days yet.</p>`;
      return;
    }
    pastListEl.innerHTML = "";
    days.forEach((d) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "past-item";
      item.innerHTML = `<span class="pi-date">${escapeHtml(d.date)}</span><span class="pi-head">${escapeHtml(d.headline || "")}</span>`;
      item.addEventListener("click", async () => {
        closePastSheet();
        try {
          await loadDay({ date: d.date, readOnly: true });
        } catch (err) {
          showError(`Couldn't load ${d.date}: ${err.message || err}`);
        }
      });
      pastListEl.appendChild(item);
    });
  } catch (err) {
    pastListEl.innerHTML = `<p class="rc-sub" style="padding:0.6rem;color:#b91c1c;">Couldn't load past days.</p>`;
  }
}

function closePastSheet() { hide(pastSheet); }

// ----------------------------------------------------------------------------
// Local progress persistence
// ----------------------------------------------------------------------------
// Mirrors each kid's attempt history into localStorage, keyed by day, so the
// red wrong-answer marks (and a solved question) survive a page reload — phones
// get locked and handed around, and mobile Safari quietly reloads the tab. We
// keep the most recent days only so storage can't grow without bound.

const PROGRESS_KEY = "morning-drive-progress-v1";
const PROGRESS_MAX_DAYS = 30;

function readAllProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}

function loadProgressForDay(date) {
  return readAllProgress()[date] || {};
}

function saveProblemProgress(problemKey, { wrongIndex, solved } = {}) {
  if (isReadOnly || !activeDate) return; // never record while reviewing a past day
  try {
    const all = readAllProgress();
    const day = all[activeDate] || (all[activeDate] = {});
    const entry = day[problemKey] || (day[problemKey] = { wrong: [], solved: false });
    if (typeof wrongIndex === "number" && !entry.wrong.includes(wrongIndex)) {
      entry.wrong.push(wrongIndex);
    }
    if (solved) entry.solved = true;

    // Prune oldest days (date strings sort lexically = chronologically).
    const dates = Object.keys(all).sort();
    while (dates.length > PROGRESS_MAX_DAYS) delete all[dates.shift()];

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    dayProgress = all[activeDate];
  } catch { /* storage full / unavailable — best-effort only */ }
}

// ----------------------------------------------------------------------------
// Attempt logging
// ----------------------------------------------------------------------------

function logAttempt({ kid, kind, problemKey, topic, itemKey, attempts, correct }) {
  if (isReadOnly) return; // don't pollute stats during review
  if (!activeDate) return;
  try {
    fetch("/api/morning-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: activeDate, kid, kind, problemKey, topic, itemKey, attempts, correct }),
      keepalive: true,
    }).catch(() => { /* silently ignore — best-effort log */ });
  } catch {}
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// "2026-08-12" -> "August 12". Used by Word Match to show when a word was learned.
function friendlyDate(dateStr) {
  try {
    const [y, m, d] = String(dateStr).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "long", day: "numeric", timeZone: "UTC",
    });
  } catch { return dateStr; }
}
