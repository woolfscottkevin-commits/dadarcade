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

  sectionsEl.appendChild(renderMathSection("claire", "Claire's Math", "👧", p.claireMath || []));
  sectionsEl.appendChild(renderMathSection("connor", "Connor's Math", "🧒", p.connorMath || []));
  sectionsEl.appendChild(renderWordsSection(p.wordsOfDay));
  sectionsEl.appendChild(renderVocabMatchSection(p.vocabMatch, p.wordsOfDay));
  sectionsEl.appendChild(renderNewsSection(p.news || []));
  sectionsEl.appendChild(renderTriviaSection(p.trivia || []));
  sectionsEl.appendChild(renderFactsSection(p.facts || []));
  sectionsEl.appendChild(renderJokesSection(p.jokes || []));
  sectionsEl.appendChild(renderWyrSection(p.wyr || []));

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

function renderMCQuestion({ problemKey, kid, kind, topic, prompt, hint, choices, correctIndex, onCorrect, quotedDef }) {
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
        logAttempt({ kid, kind, problemKey, topic, attempts, correct: true });
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

function renderVocabMatchSection(vocabMatch, wordsOfDay) {
  const { section, body } = makeSection("vocab", "Word Match", "🧩");
  if (!vocabMatch) {
    body.innerHTML = `<p class="rc-sub">No vocab match today.</p>`;
    return section;
  }
  body.appendChild(renderVocabMatchCard("Connor — which word means this?", "connor", vocabMatch.connor, wordsOfDay?.connor?.word));
  body.appendChild(renderVocabMatchCard("Claire — which word means this?", "claire", vocabMatch.claire, wordsOfDay?.claire?.word));
  return section;
}

function renderVocabMatchCard(label, kid, vm, fallbackWord) {
  const problemKey = `vocab_match_${kid}`;
  return renderMCQuestion({
    problemKey,
    kid,
    kind: "vocab_match",
    topic: "vocab-definition",
    prompt: label,
    quotedDef: vm.definition,
    choices: vm.options,
    correctIndex: vm.correctIndex,
    onCorrect: () => {
      // Vocab match scores don't roll into the math score badge — they count
      // separately. We still log them so we can chart later.
    },
  });
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
  jokes.forEach((j) => {
    const card = document.createElement("div");
    card.className = "reveal-card" + (isReadOnly ? " open" : "");
    const levelClass = j.level === "claire" ? "lc" : "ln";
    const levelLabel = j.level === "claire" ? "Claire-level" : "Connor-level";
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

function logAttempt({ kid, kind, problemKey, topic, attempts, correct }) {
  if (isReadOnly) return; // don't pollute stats during review
  if (!activeDate) return;
  try {
    fetch("/api/morning-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: activeDate, kid, kind, problemKey, topic, attempts, correct }),
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
