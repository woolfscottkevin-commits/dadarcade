// Spelling Trainer — multi-user router + every screen renderer.
//
// Local dev: from the repo root run `npx serve` (or `python3 -m http.server`)
// and open http://localhost:3000/spelling/  (or :8000 etc).
//
// The app keeps no in-memory "current screen" state machine — instead each
// render function clears #app and rebuilds the DOM for the next view. Only
// per-flow ephemeral state (e.g. the in-progress test session) lives in
// module-scoped variables and is reset by routeStart().

import { USERS, JOKES, COMMON_WORDS, normalizeWord, highlightWord } from "./data/index.js";
import {
  getActiveUser, setActiveUser, clearActiveUser,
  getUserState, mutate, todayISO,
  totalWeeks, isRestingToday, isProgramComplete,
  advanceDay, savePreTest, savePostTestAndAdvance,
  toggleMuted, currentWeekData, fridayWordEntries, resetUser
} from "./state.js";
import { speak, cancelSpeech } from "./tts.js";
import { ding, thunk, primeAudio } from "./audio.js";

const appEl = document.getElementById("app");
const muteBtn = document.getElementById("mute-toggle");
const pillEl = document.getElementById("switch-user-pill");
const persistBanner = document.getElementById("persistence-banner");

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------

document.addEventListener("click", primeAudio, { once: true, capture: true });

window.addEventListener("beforeunload", () => { cancelSpeech(); });

muteBtn.addEventListener("click", () => {
  const id = getActiveUser();
  if (!id) return;
  const m = toggleMuted(id);
  refreshMuteUI();
  if (!m) ding(); // small feedback when re-enabling sound
});

pillEl.addEventListener("click", () => {
  cancelSpeech();
  clearActiveUser();
  renderPicker();
});

route();

// ------------------------------------------------------------------
// Router
// ------------------------------------------------------------------

function route() {
  const id = getActiveUser();
  if (!id || !USERS[id]) {
    renderPicker();
    return;
  }
  // Persistence-failed banner is a one-shot for the active user.
  const s = getUserState(id);
  if (s.persistenceFailed) persistBanner.hidden = false;

  if (isProgramComplete(id)) {
    renderFinalCelebration(id);
    return;
  }
  if (isRestingToday(id)) {
    renderRest(id);
    return;
  }
  renderHome(id);
}

// ------------------------------------------------------------------
// Chrome
// ------------------------------------------------------------------

function mountChrome(userId) {
  document.body.setAttribute("data-user", userId);
  const u = USERS[userId];
  pillEl.querySelector(".su-name").textContent = u.displayName;
  pillEl.hidden = false;
  muteBtn.hidden = false;
  refreshMuteUI();
}

function unmountChrome() {
  document.body.removeAttribute("data-user");
  pillEl.hidden = true;
}

function refreshMuteUI() {
  const id = getActiveUser();
  const muted = id ? !!getUserState(id).muted : false;
  muteBtn.textContent = muted ? "🔇" : "🔊";
}

// ------------------------------------------------------------------
// Screen helper
// ------------------------------------------------------------------

function screen(html, wireUp) {
  cancelSpeech();
  appEl.innerHTML = html;
  if (typeof wireUp === "function") {
    // Call synchronously — element refs are valid the moment innerHTML resolves.
    wireUp(appEl);
  }
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cap(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function trackEvent(name, params = {}) {
  try {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  } catch (err) { /* ignore */ }
}

// ------------------------------------------------------------------
// Picker
// ------------------------------------------------------------------

function pickerStatus(id) {
  const total = totalWeeks(id);
  const s = getUserState(id);
  if (s.lastDayAdvancedOn === null && s.currentWeek === 1 && s.currentDay === "monday") {
    return "Tap to start →";
  }
  if (s.currentWeek > total) return `🏆 ${total} weeks done — practice freestyle →`;
  return `Week ${s.currentWeek}, ${cap(s.currentDay)} →`;
}

function renderPicker() {
  cancelSpeech();
  unmountChrome();
  muteBtn.hidden = true;

  const connorStatus = pickerStatus("connor");
  const claireStatus = pickerStatus("claire");

  screen(`
    <section class="picker-screen">
      <h1 class="picker-hello">Who's spelling today?</h1>
      <p class="picker-sub">Pick a name to keep your own progress.</p>
      <div class="picker-grid">
        <button class="user-card" data-id="connor"
                style="--accent:#FFB347;--accent-soft:#fff4e0;--accent-ink:#b35900">
          <div class="face">🦁</div>
          <div class="uname">Connor</div>
          <div class="grade">1st-grade plan · 8 weeks</div>
          <div class="cta">${esc(connorStatus)}</div>
        </button>
        <button class="user-card" data-id="claire"
                style="--accent:#C77DFF;--accent-soft:#f3e5ff;--accent-ink:#6a1b9a">
          <div class="face">🦋</div>
          <div class="uname">Claire</div>
          <div class="grade">3rd-grade plan · 27 modules</div>
          <div class="cta">${esc(claireStatus)}</div>
        </button>
      </div>
      <p class="muted-note" style="margin-top:1.2rem">Each kid's progress is saved separately on this device.</p>
    </section>
  `, (root) => {
    root.querySelectorAll(".user-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        primeAudio();
        const id = btn.getAttribute("data-id");
        setActiveUser(id);
        trackEvent("spelling_user_selected", { user: id });
        route();
      });
    });
  });
}

// ------------------------------------------------------------------
// Home (per user)
// ------------------------------------------------------------------

function renderHome(userId) {
  mountChrome(userId);
  const u = USERS[userId];
  const s = getUserState(userId);
  const week = currentWeekData(userId);
  const total = totalWeeks(userId);

  const dayLabels = ["monday","tuesday","wednesday","thursday","friday"];
  const pillsHTML = dayLabels.map((d) => {
    let klass = "day-pill";
    if (d === s.currentDay) klass += " current";
    return `<span class="${klass}">${cap(d)}</span>`;
  }).join("");

  const startLabel = ({
    monday: "Start the pre-test",
    tuesday: "Open the pattern lesson",
    wednesday: "Start sentence dictation",
    thursday: "Play Word Chain",
    friday: "Start the post-test"
  })[s.currentDay] || "Start today";

  const moduleCode = week?.moduleCode ? `<span class="locale-badge">${esc(week.moduleCode)}</span>` : "";

  screen(`
    <section class="screen">
      <div class="home-hero">
        <div class="badge">${esc(u.displayName)} · Week ${s.currentWeek} of ${total}</div>
        <h1 class="title-2">${esc(week?.focus || "Spelling Trainer")}</h1>
        ${moduleCode}
        <div class="day-pills">${pillsHTML}</div>
      </div>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="start">▶ ${esc(startLabel)}</button>
        <button class="btn btn-secondary" data-act="progress">📊 Progress</button>
        <button class="btn btn-secondary" data-act="freestyle">🎮 Freestyle</button>
        <button class="btn btn-ghost" data-act="switch">Switch user</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="start"]').addEventListener("click", () => startToday(userId));
    root.querySelector('[data-act="progress"]').addEventListener("click", () => renderProgressTracker(userId));
    root.querySelector('[data-act="freestyle"]').addEventListener("click", () => renderFreestyleWeekPicker(userId));
    root.querySelector('[data-act="switch"]').addEventListener("click", () => { clearActiveUser(); renderPicker(); });
  });
}

function renderRest(userId) {
  mountChrome(userId);
  const u = USERS[userId];
  screen(`
    <section class="screen">
      <div class="rest-illustration">🌙</div>
      <h1 class="title-1">Great work today, ${esc(u.displayName)}!</h1>
      <p class="subtitle">Come back tomorrow for the next step.</p>
      <div class="btn-row stack">
        <button class="btn btn-secondary btn-big" data-act="freestyle">🎮 Practice freestyle</button>
        <button class="btn btn-secondary" data-act="progress">📊 Show progress</button>
        <button class="btn btn-ghost" data-act="switch">Switch user</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="freestyle"]').addEventListener("click", () => renderFreestyleWeekPicker(userId));
    root.querySelector('[data-act="progress"]').addEventListener("click", () => renderProgressTracker(userId));
    root.querySelector('[data-act="switch"]').addEventListener("click", () => { clearActiveUser(); renderPicker(); });
  });
}

// ------------------------------------------------------------------
// Day dispatch
// ------------------------------------------------------------------

function startToday(userId) {
  const s = getUserState(userId);
  trackEvent("spelling_day_start", { user: userId, day: s.currentDay, week: s.currentWeek });
  switch (s.currentDay) {
    case "monday":    return renderPreTestCover(userId);
    case "tuesday":   return renderTuesdayEntry(userId);
    case "wednesday": return renderDictationCover(userId);
    case "thursday":  return renderWordChainCover(userId);
    case "friday":    return renderPostTestCover(userId);
    default:          return renderHome(userId);
  }
}

// ------------------------------------------------------------------
// Monday — Pre-test
// ------------------------------------------------------------------

function renderPreTestCover(userId) {
  mountChrome(userId);
  const s = getUserState(userId);
  const week = currentWeekData(userId);
  if (!week) return renderHome(userId);
  screen(`
    <section class="screen">
      <h1 class="title-1">Week ${s.currentWeek} Pre-Test</h1>
      <p class="subtitle">${esc(week.focus)}</p>
      <p class="lede">I'll say each word out loud. Listen, then write it on paper. Tap Next when you've written it. There's a surprise joke in the middle!</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="start">Start</button>
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="start"]').addEventListener("click", () => {
      const words = week.words.slice();
      startTestRunner(userId, "pre", words);
    });
    root.querySelector('[data-act="back"]').addEventListener("click", () => renderHome(userId));
  });
}

// ------------------------------------------------------------------
// Friday — Post-test
// ------------------------------------------------------------------

function renderPostTestCover(userId) {
  mountChrome(userId);
  const s = getUserState(userId);
  const week = currentWeekData(userId);
  if (!week) return renderHome(userId);
  const carry = s.scores[String(s.currentWeek)]?.carryOver || [];
  const carryNote = carry.length > 0
    ? `<p class="muted-note">Including ${carry.length} word${carry.length === 1 ? "" : "s"} from last week.</p>`
    : "";
  screen(`
    <section class="screen">
      <h1 class="title-1">Week ${s.currentWeek} Post-Test</h1>
      <p class="subtitle">${esc(week.focus)}</p>
      <p class="lede">Last test of the week. Same rules as Monday — listen, write, tap Next.</p>
      ${carryNote}
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="start">Start</button>
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="start"]').addEventListener("click", () => {
      const entries = fridayWordEntries(userId);
      startTestRunner(userId, "post", entries);
    });
    root.querySelector('[data-act="back"]').addEventListener("click", () => renderHome(userId));
  });
}

// ------------------------------------------------------------------
// Test runner (shared by Monday + Friday)
// ------------------------------------------------------------------

function startTestRunner(userId, phase, entries) {
  const normalized = entries.map(normalizeWord);
  const session = {
    userId, phase, entries: normalized,
    index: 0,
    jokesPool: shuffle(JOKES),
    jokesUsed: 0,
    jokeAfterIndex: 6,  // joke fires when index reaches 6 (i.e., after word 6)
    jokeShown: false,
    pendingJoke: false
  };
  // Only enable joke injection if the list is long enough.
  if (normalized.length < 12) session.jokeAfterIndex = -1;
  renderTestRunner(userId, session);
}

function renderTestRunner(userId, session) {
  mountChrome(userId);
  const total = session.entries.length;
  const current = session.index + 1;

  // If we're at the joke slot, show the joke card.
  if (session.pendingJoke) {
    const joke = session.jokesPool[session.jokesUsed % session.jokesPool.length];
    session.jokesUsed += 1;
    session.jokeShown = true;
    session.pendingJoke = false;
    screen(`
      <section class="screen runner">
        <div class="counter">Joke break!</div>
        <div class="joke-card">
          <span class="joke-tag">JOKE</span>
          <div>${esc(joke)}</div>
        </div>
        <div class="runner-buttons">
          <button class="btn btn-secondary btn-big" data-act="replay">🔁 Read it again</button>
          <button class="btn btn-primary btn-big" data-act="next">▶ Back to spelling</button>
        </div>
        <button class="early-done" data-act="done">I'm done early</button>
      </section>
    `, (root) => {
      // Speak the joke once when the screen mounts.
      speak(joke, { rate: 0.95 });
      root.querySelector('[data-act="replay"]').addEventListener("click", () => speak(joke, { rate: 0.95 }));
      root.querySelector('[data-act="next"]').addEventListener("click", () => {
        renderTestRunner(userId, session);
      });
      root.querySelector('[data-act="done"]').addEventListener("click", () => goToHandoff(userId, session));
    });
    return;
  }

  // Done?
  if (session.index >= total) {
    return renderHandoff(userId, session);
  }

  const entry = session.entries[session.index];

  screen(`
    <section class="screen runner">
      <div class="counter">Word ${current} of ${total}</div>
      <div class="speaker" aria-hidden="true">🔊</div>
      <div class="runner-buttons">
        <button class="btn btn-primary btn-big" data-act="play">🔊 Play word</button>
        <button class="btn btn-secondary btn-big" data-act="repeat">🔁 Repeat</button>
        <button class="btn btn-secondary btn-big" data-act="next">▶ Next</button>
      </div>
      <button class="early-done" data-act="done">I'm done early</button>
    </section>
  `, (root) => {
    // Auto-speak the word on entry to the screen.
    speak(entry.speak, { rate: 0.85 });

    const playOrRepeat = () => speak(entry.speak, { rate: 0.85 });
    root.querySelector('[data-act="play"]').addEventListener("click", playOrRepeat);
    root.querySelector('[data-act="repeat"]').addEventListener("click", playOrRepeat);

    root.querySelector('[data-act="next"]').addEventListener("click", () => {
      // Should the next slot be a joke?
      if (
        session.jokeAfterIndex >= 0 &&
        !session.jokeShown &&
        session.index + 1 === session.jokeAfterIndex
      ) {
        session.pendingJoke = true;
      }
      session.index += 1;
      renderTestRunner(userId, session);
    });

    root.querySelector('[data-act="done"]').addEventListener("click", () => goToHandoff(userId, session));
  });
}

function goToHandoff(userId, session) {
  session.index = session.entries.length;  // mark complete
  renderHandoff(userId, session);
}

function renderHandoff(userId, session) {
  mountChrome(userId);
  screen(`
    <section class="screen handoff">
      <span class="emoji">🎉</span>
      <h1 class="title-1">All done!</h1>
      <p class="lede">Hand the iPad to Mom or Dad. 👋</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="grade">I'm a parent, continue</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="grade"]').addEventListener("click", () => renderGrading(userId, session));
  });
}

// ------------------------------------------------------------------
// Parent grading (shared)
// ------------------------------------------------------------------

function renderGrading(userId, session) {
  mountChrome(userId);
  const u = USERS[userId];
  const entries = session.entries;
  // grades[i] = true means correct (default), false means missed
  const grades = entries.map(() => true);

  const cardsHTML = entries.map((entry, i) => `
    <button class="word-card correct" data-i="${i}" type="button">
      <span class="status">✓</span>
      <span class="word-text">${esc(entry.display)}</span>
    </button>
  `).join("");

  screen(`
    <section class="screen">
      <div class="grading-header">
        <h1 class="title-2">Quick — tap the words ${esc(u.displayName)} MISSED</h1>
        <p class="subtitle">Everything is correct by default. Just tap the misses.</p>
      </div>
      <div class="grading-grid">${cardsHTML}</div>
      <div class="sticky-save">
        <button class="btn btn-primary btn-big" data-act="save">Save scores</button>
      </div>
    </section>
  `, (root) => {
    root.querySelectorAll(".word-card").forEach((card) => {
      card.addEventListener("click", () => {
        const i = Number(card.getAttribute("data-i"));
        grades[i] = !grades[i];
        card.classList.toggle("correct", grades[i]);
        card.classList.toggle("miss", !grades[i]);
        card.querySelector(".status").textContent = grades[i] ? "✓" : "✗";
        if (!grades[i]) {
          card.classList.remove("shake");
          // Force reflow so the animation re-runs.
          // eslint-disable-next-line no-unused-expressions
          card.offsetWidth;
          card.classList.add("shake");
          thunk();
        } else {
          ding();
        }
      });
    });

    root.querySelector('[data-act="save"]').addEventListener("click", () => {
      const misses = entries.filter((_, i) => !grades[i]).map((e) => e.display);
      const total = entries.length;
      if (session.phase === "pre") {
        savePreTest(userId, getUserState(userId).currentWeek, total, misses);
        advanceDay(userId, "tuesday");
        trackEvent("spelling_day_complete", { user: userId, day: "monday", week: getUserState(userId).currentWeek - 0 });
        renderTestSavedPre(userId, total - misses.length, total);
      } else {
        const weekN = getUserState(userId).currentWeek;
        const result = savePostTestAndAdvance(userId, weekN, total, misses);
        trackEvent("spelling_day_complete", { user: userId, day: "friday", week: weekN });
        if (result.mastered) trackEvent("spelling_week_mastered", { user: userId, week: weekN });
        if (getUserState(userId).currentWeek > totalWeeks(userId)) {
          trackEvent("spelling_program_complete", { user: userId });
        }
        renderTestSavedPost(userId, weekN, result, total);
      }
    });
  });
}

function renderTestSavedPre(userId, correct, total) {
  mountChrome(userId);
  screen(`
    <section class="screen celebrate">
      <span class="big-emoji">✅</span>
      <h1 class="title-1">Saved!</h1>
      <div class="summary">Pre-test: ${correct} / ${total}</div>
      <p class="lede">Come back tomorrow for the pattern lesson.</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="done">Done</button>
      </div>
    </section>
  `, (root) => {
    ding();
    root.querySelector('[data-act="done"]').addEventListener("click", () => route());
  });
}

function renderTestSavedPost(userId, weekN, result, total) {
  mountChrome(userId);
  const post = result.post;
  const pre = result.pre ?? "?";
  let body;
  if (result.mastered) {
    body = `
      <span class="big-emoji">🏆</span>
      <h1 class="title-1">Pattern mastered!</h1>
      <div class="summary">Pre: ${pre} / ${total} → Post: ${post} / ${total}</div>
      <p class="lede">Onward to the next week.</p>
    `;
    ding();
  } else {
    body = `
      <span class="big-emoji">💪</span>
      <h1 class="title-1">Great progress!</h1>
      <div class="summary">Pre: ${pre} / ${total} → Post: ${post} / ${total}</div>
      <p class="lede">A few of these will come back next Monday.</p>
    `;
  }
  screen(`
    <section class="screen celebrate">
      ${body}
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="done">Done</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="done"]').addEventListener("click", () => route());
  });
}

// ------------------------------------------------------------------
// Tuesday — Pattern lesson + drill
// ------------------------------------------------------------------

function renderTuesdayEntry(userId) {
  const s = getUserState(userId);
  const weekKey = String(s.currentWeek);
  const misses = s.scores[weekKey]?.misses || [];
  if (misses.length === 0) {
    return renderAcedSkip(userId);
  }
  return renderPatternLesson(userId);
}

function renderAcedSkip(userId) {
  mountChrome(userId);
  const u = USERS[userId];
  screen(`
    <section class="screen celebrate">
      <span class="big-emoji">🌟</span>
      <h1 class="title-1">You aced the pre-test, ${esc(u.displayName)}!</h1>
      <p class="lede">You already know these. We'll see you Friday for the final test.</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="done">Done</button>
      </div>
    </section>
  `, (root) => {
    ding();
    root.querySelector('[data-act="done"]').addEventListener("click", () => {
      advanceDay(userId, "friday");
      route();
    });
  });
}

function renderPatternLesson(userId) {
  mountChrome(userId);
  const week = currentWeekData(userId);
  if (!week) return renderHome(userId);
  screen(`
    <section class="screen">
      <h1 class="title-1">${esc(week.focus)}</h1>
      <p class="subtitle">Today's pattern</p>
      <div class="rule-card">${esc(week.rule)}</div>
      <div class="btn-row stack">
        <button class="btn btn-secondary btn-big" data-act="read">🔊 Read it to me</button>
        <button class="btn btn-primary btn-big" data-act="next">Got it</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="read"]').addEventListener("click", () => speak(week.rule, { rate: 0.9 }));
    root.querySelector('[data-act="next"]').addEventListener("click", () => renderDrillLoop(userId));
  });
}

function renderDrillLoop(userId) {
  mountChrome(userId);
  const s = getUserState(userId);
  const week = currentWeekData(userId);
  const missesRaw = s.scores[String(s.currentWeek)]?.misses || [];
  // misses are stored as display strings; find matching entries (with audioOverride if applicable).
  const entries = missesRaw.map((display) => {
    const match = week.words.find((w) => normalizeWord(w).display === display);
    return match ? normalizeWord(match) : { display, speak: display };
  });

  const session = { index: 0, played: new Set() };
  showDrillWord();

  function showDrillWord() {
    if (session.index >= entries.length) {
      return renderWritingInstruction(userId, entries);
    }
    const entry = entries[session.index];
    const highlighted = highlightWord(entry.display, week.patternHighlight);
    screen(`
      <section class="screen">
        <div class="counter" style="text-align:center;font-weight:800;color:var(--user-ink)">Word ${session.index + 1} of ${entries.length}</div>
        <div class="big-word">${highlighted}</div>
        <div class="btn-row stack">
          <button class="btn btn-primary btn-big" data-act="play">🔊 Play word</button>
          <button class="btn btn-secondary btn-big" data-act="repeat">🔁 Repeat</button>
          <button class="btn btn-secondary btn-big" data-act="next" disabled>▶ Next</button>
        </div>
      </section>
    `, (root) => {
      const nextBtn = root.querySelector('[data-act="next"]');
      const enableNext = () => { session.played.add(session.index); nextBtn.disabled = false; };
      root.querySelector('[data-act="play"]').addEventListener("click", () => {
        speak(entry.speak, { rate: 0.85 });
        enableNext();
      });
      root.querySelector('[data-act="repeat"]').addEventListener("click", () => {
        speak(entry.speak, { rate: 0.85 });
        enableNext();
      });
      nextBtn.addEventListener("click", () => {
        if (nextBtn.disabled) return;
        session.index += 1;
        showDrillWord();
      });
    });
  }
}

function renderWritingInstruction(userId, entries) {
  mountChrome(userId);
  const items = entries.map((e) => `<li>${esc(e.display)}</li>`).join("");
  screen(`
    <section class="screen">
      <h1 class="title-1">Write each word 3 times</h1>
      <p class="subtitle">In your notebook, please.</p>
      <ul class="write-list">${items}</ul>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="done">I'm done writing!</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="done"]').addEventListener("click", () => {
      advanceDay(userId, "wednesday");
      trackEvent("spelling_day_complete", { user: userId, day: "tuesday", week: getUserState(userId).currentWeek });
      route();
    });
  });
}

// ------------------------------------------------------------------
// Wednesday — Sentence dictation
// ------------------------------------------------------------------

function renderDictationCover(userId) {
  mountChrome(userId);
  const week = currentWeekData(userId);
  if (!week) return renderHome(userId);
  screen(`
    <section class="screen">
      <h1 class="title-1">Sentence Dictation</h1>
      <p class="subtitle">${esc(week.focus)}</p>
      <p class="lede">I'll read a sentence. Type what you hear. You'll see which words are right or wrong, but this is just practice — no scores saved.</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="start">Start</button>
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="start"]').addEventListener("click", () => startDictation(userId));
    root.querySelector('[data-act="back"]').addEventListener("click", () => renderHome(userId));
  });
}

function startDictation(userId) {
  const week = currentWeekData(userId);
  const session = {
    sentences: week.sentences.slice(),
    index: 0,
    totalCorrect: 0,
    totalWords: 0,
    checkedThis: false
  };
  renderDictation(userId, session);
}

function normalizeSentence(s) {
  return String(s).toLowerCase()
    .replace(/[.,!?;:""''""—–]/g, " ")  // punctuation (but keep apostrophe via the dedicated step below)
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSentence(s) {
  // Keep apostrophes inside words so "won't" stays one token.
  return normalizeSentence(s).split(/\s+/).filter(Boolean);
}

function renderDictation(userId, session) {
  mountChrome(userId);
  const total = session.sentences.length;
  const current = session.index + 1;
  const sentence = session.sentences[session.index];

  screen(`
    <section class="screen">
      <div class="dictation-counter">Sentence ${current} of ${total}</div>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="play">🔊 Play sentence</button>
        <button class="btn btn-secondary btn-big" data-act="repeat">🔁 Repeat sentence</button>
      </div>
      <input type="text" class="dictation-input" id="dict-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type what you hear…" />
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="check">Check</button>
      </div>
      <div id="feedback"></div>
    </section>
  `, (root) => {
    const input = root.querySelector("#dict-input");
    const feedback = root.querySelector("#feedback");
    const checkBtn = root.querySelector('[data-act="check"]');
    let checked = false;

    setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 60);
    speak(sentence, { rate: 0.75 });

    root.querySelector('[data-act="play"]').addEventListener("click", () => speak(sentence, { rate: 0.75 }));
    root.querySelector('[data-act="repeat"]').addEventListener("click", () => speak(sentence, { rate: 0.75 }));

    checkBtn.addEventListener("click", () => {
      if (checked) {
        // Move to next.
        session.index += 1;
        if (session.index >= total) {
          renderDictationSummary(userId, session);
        } else {
          renderDictation(userId, session);
        }
        return;
      }
      const typed = tokenizeSentence(input.value || "");
      const canonical = tokenizeSentence(sentence);
      const len = Math.max(typed.length, canonical.length);
      let correct = 0;
      const parts = [];
      for (let i = 0; i < len; i++) {
        const t = typed[i] || "";
        const c = canonical[i] || "";
        if (t && t === c) { correct += 1; parts.push(`<span class="word-ok">${esc(t)}</span>`); }
        else if (t) parts.push(`<span class="word-bad">${esc(t)}</span>`);
        else parts.push(`<span class="word-bad">∅</span>`);
      }
      session.totalCorrect += correct;
      session.totalWords += canonical.length;
      const label = (session.index + 1 === total) ? "Done" : "Next sentence";
      feedback.innerHTML = `
        <div class="feedback-row">${parts.join(" ")}<span class="score-line">Got ${correct} of ${canonical.length} words right!</span></div>
      `;
      checked = true;
      checkBtn.textContent = label;
      if (correct === canonical.length) ding();
      else thunk();
    });
  });
}

function renderDictationSummary(userId, session) {
  mountChrome(userId);
  screen(`
    <section class="screen celebrate">
      <span class="big-emoji">📝</span>
      <h1 class="title-1">Dictation complete!</h1>
      <div class="summary">${session.totalCorrect} of ${session.totalWords} words across 5 sentences</div>
      <p class="lede">This was practice — no scores saved.</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="done">Done</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="done"]').addEventListener("click", () => {
      advanceDay(userId, "thursday");
      trackEvent("spelling_day_complete", { user: userId, day: "wednesday", week: getUserState(userId).currentWeek });
      route();
    });
  });
}

// ------------------------------------------------------------------
// Thursday — Word Chain
// ------------------------------------------------------------------

function renderWordChainCover(userId) {
  mountChrome(userId);
  screen(`
    <section class="screen">
      <h1 class="title-1">Word Chain</h1>
      <p class="subtitle">One letter at a time</p>
      <p class="lede">I'll show you a starting word. Type a new word that changes by just one letter — swap one, add one, or take one out (for longer words). Get a chain of 3 to finish the day!</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="start">Start</button>
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="start"]').addEventListener("click", () => startWordChain(userId));
    root.querySelector('[data-act="back"]').addEventListener("click", () => renderHome(userId));
  });
}

function buildDictionary(userId) {
  const u = USERS[userId];
  const set = new Set();
  for (const week of u.weeks) {
    for (const wEntry of week.words) {
      const { display } = normalizeWord(wEntry);
      // Strip non-letters for the dictionary key (so "I'm" → "im" wouldn't match, intentional).
      const key = display.toLowerCase().replace(/[^a-z]/g, "");
      if (key) set.add(key);
    }
  }
  for (const w of COMMON_WORDS) {
    set.add(String(w).toLowerCase());
  }
  return set;
}

// Distance==1 check with policy:
//   prev.length <= 5: substitution only.
//   prev.length >  5: substitution, insertion, or deletion.
// Returns "sub" | "insert" | "delete" | null.
function editKind(prev, next) {
  if (prev === next) return null;
  const lp = prev.length, ln = next.length;
  // Substitution case (same length).
  if (lp === ln) {
    let diffs = 0, diffAt = -1;
    for (let i = 0; i < lp; i++) {
      if (prev[i] !== next[i]) { diffs++; diffAt = i; if (diffs > 1) return null; }
    }
    return diffs === 1 ? "sub" : null;
  }
  if (lp <= 5) return null;  // longer-words rule unlocks insert/delete
  // Insertion (next is prev with one extra char).
  if (ln === lp + 1) {
    let i = 0, j = 0, edits = 0;
    while (i < lp && j < ln) {
      if (prev[i] === next[j]) { i++; j++; }
      else { j++; edits++; if (edits > 1) return null; }
    }
    return edits + (ln - j) <= 1 ? "insert" : null;
  }
  // Deletion (next is prev with one fewer char).
  if (ln === lp - 1) {
    let i = 0, j = 0, edits = 0;
    while (i < lp && j < ln) {
      if (prev[i] === next[j]) { i++; j++; }
      else { i++; edits++; if (edits > 1) return null; }
    }
    return edits + (lp - i) <= 1 ? "delete" : null;
  }
  return null;
}

function chooseStartingWord(userId) {
  const week = currentWeekData(userId);
  if (!week) return null;
  // Prefer letter-only curriculum words 3-6 chars long. Skip entries with
  // apostrophes (contractions) or periods (abbreviations) so the kid starts
  // on a familiar, dictionary-friendly word.
  const candidates = week.words
    .map(normalizeWord)
    .map((e) => e.display)
    .filter((w) => /^[A-Za-z]+$/.test(w))
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 3 && w.length <= 6);
  if (candidates.length === 0) {
    const all = week.words
      .map((e) => normalizeWord(e).display)
      .filter((w) => /^[A-Za-z]+$/.test(w))
      .map((w) => w.toLowerCase())
      .filter(Boolean);
    if (all.length === 0) return null;
    return pickRandom(all);
  }
  return pickRandom(candidates);
}

function startWordChain(userId) {
  const dictionary = buildDictionary(userId);
  const session = {
    dictionary,
    chain: [],
    completed: false
  };
  const start = chooseStartingWord(userId);
  if (start) session.chain.push(start);
  renderWordChain(userId, session);
}

function renderWordChain(userId, session) {
  mountChrome(userId);
  const chain = session.chain;
  const startWord = chain[0] || "";
  const items = chain.map((w) => `<li>${esc(w)}</li>`).join("");

  const lastWord = chain[chain.length - 1] || "";
  const lenPolicy = lastWord.length > 5
    ? "Swap, add, or take out one letter."
    : "Swap exactly one letter.";

  screen(`
    <section class="screen">
      <h1 class="title-1">Word Chain</h1>
      <p class="subtitle">Goal: a chain of 3 or more.</p>
      <div class="chain-start">${esc(startWord || "—")}</div>
      <ul class="chain-list">${items}</ul>
      <div class="muted-note">${esc(lenPolicy)}</div>
      <input type="text" class="dictation-input" id="chain-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Next word…" />
      <div class="chain-feedback" id="chain-feedback"></div>
      <div class="chain-controls">
        <button class="btn btn-primary" data-act="submit">Submit</button>
        <button class="btn btn-secondary" data-act="new">Start new chain</button>
        <button class="btn btn-warn" data-act="give-up">I give up</button>
      </div>
    </section>
  `, (root) => {
    const input = root.querySelector("#chain-input");
    const feedback = root.querySelector("#chain-feedback");
    setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 60);

    const liveCheck = () => {
      const raw = (input.value || "").toLowerCase().replace(/[^a-z]/g, "");
      if (!raw) { feedback.textContent = ""; feedback.className = "chain-feedback"; return; }
      const reason = validateWordChainAttempt(raw, session);
      if (reason === null) {
        feedback.textContent = "Looks good!";
        feedback.className = "chain-feedback ok";
      } else {
        feedback.textContent = reason;
        feedback.className = "chain-feedback bad";
      }
    };

    let debounceId;
    input.addEventListener("input", () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(liveCheck, 120);
    });

    root.querySelector('[data-act="submit"]').addEventListener("click", () => {
      const raw = (input.value || "").toLowerCase().replace(/[^a-z]/g, "");
      const reason = validateWordChainAttempt(raw, session);
      if (reason !== null) {
        feedback.textContent = reason;
        feedback.className = "chain-feedback bad";
        thunk();
        return;
      }
      session.chain.push(raw);
      ding();
      // Completion check.
      if (session.chain.length >= 3 && !session.completed) {
        session.completed = true;
      }
      renderWordChain(userId, session);
    });

    root.querySelector('[data-act="new"]').addEventListener("click", () => startWordChain(userId));

    root.querySelector('[data-act="give-up"]').addEventListener("click", () => renderWordChainEnd(userId, session));
  });
}

function validateWordChainAttempt(raw, session) {
  if (!raw) return "Type a word first.";
  if (!session.dictionary.has(raw)) return "Not in the dictionary.";
  if (session.chain.includes(raw)) return "Already used in this chain.";
  const prev = session.chain[session.chain.length - 1] || "";
  if (!prev) return null;
  const kind = editKind(prev, raw);
  if (kind === null) {
    if (prev.length <= 5) return "Changes more than one letter — keep it to a single swap.";
    return "Too many changes — try just one letter (swap, add, or remove).";
  }
  return null;
}

function renderWordChainEnd(userId, session) {
  mountChrome(userId);
  const len = session.chain.length;
  const reached = session.completed || len >= 3;
  screen(`
    <section class="screen celebrate">
      <span class="big-emoji">${reached ? "🎯" : "🔁"}</span>
      <h1 class="title-1">${reached ? "Nice chain!" : "Give it another go?"}</h1>
      <div class="summary">Chain length: ${len}</div>
      <p class="lede">${reached ? "You hit the goal of 3! Done for today." : "Try a new chain to reach 3."}</p>
      <div class="btn-row stack">
        ${reached
          ? `<button class="btn btn-primary btn-big" data-act="done">Done</button>`
          : `<button class="btn btn-primary btn-big" data-act="retry">Try again</button>
             <button class="btn btn-ghost" data-act="back">Back to home</button>`}
      </div>
    </section>
  `, (root) => {
    if (reached) {
      root.querySelector('[data-act="done"]').addEventListener("click", () => {
        advanceDay(userId, "friday");
        trackEvent("spelling_day_complete", { user: userId, day: "thursday", week: getUserState(userId).currentWeek });
        route();
      });
    } else {
      root.querySelector('[data-act="retry"]').addEventListener("click", () => startWordChain(userId));
      root.querySelector('[data-act="back"]').addEventListener("click", () => renderHome(userId));
    }
  });
}

// ------------------------------------------------------------------
// Progress tracker
// ------------------------------------------------------------------

function renderProgressTracker(userId) {
  mountChrome(userId);
  const u = USERS[userId];
  const s = getUserState(userId);
  const total = totalWeeks(userId);

  let rowsHTML = "";
  let lastModule = null;
  for (let n = 1; n <= total; n++) {
    const week = u.weeks[n - 1];
    const slot = s.scores[String(n)] || { pre: null, post: null };
    const isCurrent = n === s.currentWeek;
    const isFuture = n > s.currentWeek;
    const wordTotal = week.words.length + (slot.carryOver?.length || 0);
    const pre = slot.pre, post = slot.post;
    let pill = `<span class="pill">⬜ locked</span>`;
    if (isCurrent) pill = `<span class="pill now">▶ current</span>`;
    else if (!isFuture) {
      if (post != null && wordTotal > 0 && post / wordTotal >= 0.9) pill = `<span class="pill mastered">✅ mastered</span>`;
      else if (post != null) pill = `<span class="pill warn">⚠ needs work</span>`;
      else if (pre != null) pill = `<span class="pill warn">in progress</span>`;
    }
    let impText = "—";
    if (pre != null && post != null && wordTotal > 0) {
      const delta = Math.round(((post - pre) / wordTotal) * 100);
      impText = `${delta >= 0 ? "+" : ""}${delta}%`;
    }
    const scoreLine = `Pre ${pre ?? "—"} · Post ${post ?? "—"} <span class="imp">${esc(impText)}</span>`;

    // Insert module-group headers (Claire only).
    if (week.moduleCode) {
      const mod = week.moduleCode.slice(0, 2); // "M1"
      if (mod !== lastModule) {
        rowsHTML += `<div class="module-group-header">${esc(mod)}</div>`;
        lastModule = mod;
      }
    }

    rowsHTML += `
      <div class="tracker-row${isCurrent ? " current" : ""}${isFuture ? " future" : ""}">
        <div class="wk">${n}</div>
        <div>
          <div class="focus">${esc(week.focus)}</div>
          <div class="scores">${scoreLine}</div>
        </div>
        <div>${pill}</div>
      </div>
    `;
  }

  screen(`
    <section class="screen">
      <h1 class="title-1">${esc(u.displayName)}'s Progress</h1>
      <p class="subtitle">${total} weeks total</p>
      <div class="tracker-rows">${rowsHTML}</div>
      <div class="btn-row stack">
        <button class="btn btn-secondary btn-big" data-act="back">Back</button>
        <button class="btn btn-warn" data-act="reset">🔄 Reset my progress</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="back"]').addEventListener("click", () => route());
    root.querySelector('[data-act="reset"]').addEventListener("click", () => showResetConfirm(userId));
  });
}

function showResetConfirm(userId) {
  const u = USERS[userId];
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-card">
      <h2>Reset all of ${esc(u.displayName)}'s progress?</h2>
      <p>This wipes every saved score and starts ${esc(u.displayName)} back at Week 1, Monday. ${esc(u.displayName === USERS.connor.displayName ? "Claire" : "Connor")}'s progress is not affected. This can't be undone.</p>
      <div class="btn-row">
        <button class="btn btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn btn-warn" data-act="confirm">Yes, reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('[data-act="cancel"]').addEventListener("click", () => overlay.remove());
  overlay.querySelector('[data-act="confirm"]').addEventListener("click", () => {
    resetUser(userId);
    overlay.remove();
    route();
  });
}

// ------------------------------------------------------------------
// Freestyle
// ------------------------------------------------------------------

function renderFreestyleWeekPicker(userId) {
  mountChrome(userId);
  const u = USERS[userId];
  const total = totalWeeks(userId);

  // For Claire (has moduleCode), group by module.
  const hasModules = u.weeks.some((w) => !!w.moduleCode);
  let body = "";
  if (hasModules) {
    let lastModule = null;
    let buf = "";
    body = "";
    for (let n = 1; n <= total; n++) {
      const week = u.weeks[n - 1];
      const mod = (week.moduleCode || "").slice(0, 2);
      if (mod !== lastModule) {
        if (buf) body += `<div class="week-grid">${buf}</div>`;
        body += `<div class="module-group-header">${esc(mod)}</div>`;
        buf = "";
        lastModule = mod;
      }
      buf += `
        <button class="week-tile" data-week="${n}" type="button">
          <div class="n">W${n}</div>
          <div class="f">${esc(week.focus)}</div>
          <div class="mc">${esc(week.moduleCode || "")}</div>
        </button>
      `;
    }
    if (buf) body += `<div class="week-grid">${buf}</div>`;
  } else {
    let tiles = "";
    for (let n = 1; n <= total; n++) {
      const week = u.weeks[n - 1];
      tiles += `
        <button class="week-tile" data-week="${n}" type="button">
          <div class="n">${n}</div>
          <div class="f">${esc(week.focus)}</div>
        </button>
      `;
    }
    body = `<div class="week-grid">${tiles}</div>`;
  }

  screen(`
    <section class="screen">
      <h1 class="title-1">Freestyle</h1>
      <p class="subtitle">Pick any week. No scores saved.</p>
      ${body}
      <div class="btn-row stack">
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </section>
  `, (root) => {
    root.querySelectorAll(".week-tile").forEach((tile) => {
      tile.addEventListener("click", () => {
        const n = Number(tile.getAttribute("data-week"));
        renderFreestyleModePicker(userId, n);
      });
    });
    root.querySelector('[data-act="back"]').addEventListener("click", () => route());
  });
}

function renderFreestyleModePicker(userId, weekN) {
  mountChrome(userId);
  const u = USERS[userId];
  const week = u.weeks[weekN - 1];
  if (!week) return renderFreestyleWeekPicker(userId);
  screen(`
    <section class="screen">
      <h1 class="title-1">Week ${weekN}</h1>
      <p class="subtitle">${esc(week.focus)}</p>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="listen">👂 Just listen</button>
        <button class="btn btn-secondary btn-big" data-act="quiz">✍ Quiz me</button>
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="listen"]').addEventListener("click", () => renderFreestyleListen(userId, weekN));
    root.querySelector('[data-act="quiz"]').addEventListener("click", () => renderFreestyleQuiz(userId, weekN));
    root.querySelector('[data-act="back"]').addEventListener("click", () => renderFreestyleWeekPicker(userId));
  });
}

function renderFreestyleListen(userId, weekN) {
  const u = USERS[userId];
  const week = u.weeks[weekN - 1];
  const entries = week.words.map(normalizeWord);
  const session = { index: 0, entries };
  show();

  function show() {
    mountChrome(userId);
    if (session.index >= session.entries.length) {
      screen(`
        <section class="screen celebrate">
          <span class="big-emoji">👋</span>
          <h1 class="title-1">All done!</h1>
          <div class="btn-row stack">
            <button class="btn btn-primary btn-big" data-act="again">Listen again</button>
            <button class="btn btn-secondary" data-act="back">Pick another week</button>
          </div>
        </section>
      `, (root) => {
        root.querySelector('[data-act="again"]').addEventListener("click", () => { session.index = 0; show(); });
        root.querySelector('[data-act="back"]').addEventListener("click", () => renderFreestyleWeekPicker(userId));
      });
      return;
    }
    const entry = session.entries[session.index];
    screen(`
      <section class="screen runner">
        <div class="counter">Word ${session.index + 1} of ${session.entries.length}</div>
        <div class="big-word">${esc(entry.display)}</div>
        <div class="runner-buttons">
          <button class="btn btn-primary btn-big" data-act="play">🔊 Play</button>
          <button class="btn btn-secondary btn-big" data-act="next">▶ Next</button>
        </div>
        <button class="early-done" data-act="back">Pick another week</button>
      </section>
    `, (root) => {
      speak(entry.speak, { rate: 0.85 });
      root.querySelector('[data-act="play"]').addEventListener("click", () => speak(entry.speak, { rate: 0.85 }));
      root.querySelector('[data-act="next"]').addEventListener("click", () => { session.index += 1; show(); });
      root.querySelector('[data-act="back"]').addEventListener("click", () => renderFreestyleWeekPicker(userId));
    });
  }
}

function renderFreestyleQuiz(userId, weekN) {
  const u = USERS[userId];
  const week = u.weeks[weekN - 1];
  const entries = week.words.map(normalizeWord);
  const session = { index: 0, entries, correct: 0, checked: false };
  show();

  function show() {
    mountChrome(userId);
    if (session.index >= session.entries.length) {
      screen(`
        <section class="screen celebrate">
          <span class="big-emoji">📝</span>
          <h1 class="title-1">Quiz complete!</h1>
          <div class="summary">${session.correct} / ${session.entries.length} correct</div>
          <p class="lede">Freestyle isn't saved — just a check-in.</p>
          <div class="btn-row stack">
            <button class="btn btn-primary btn-big" data-act="again">Try again</button>
            <button class="btn btn-secondary" data-act="back">Pick another week</button>
          </div>
        </section>
      `, (root) => {
        root.querySelector('[data-act="again"]').addEventListener("click", () => { session.index = 0; session.correct = 0; show(); });
        root.querySelector('[data-act="back"]').addEventListener("click", () => renderFreestyleWeekPicker(userId));
      });
      return;
    }
    const entry = session.entries[session.index];
    screen(`
      <section class="screen">
        <div class="dictation-counter">Word ${session.index + 1} of ${session.entries.length}</div>
        <div class="btn-row stack">
          <button class="btn btn-primary btn-big" data-act="play">🔊 Play</button>
          <button class="btn btn-secondary btn-big" data-act="repeat">🔁 Repeat</button>
        </div>
        <input type="text" class="dictation-input" id="q-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type the word…" />
        <div class="btn-row stack">
          <button class="btn btn-primary btn-big" data-act="check">Check</button>
        </div>
        <div id="qfeedback"></div>
      </section>
    `, (root) => {
      const input = root.querySelector("#q-input");
      const feedback = root.querySelector("#qfeedback");
      const checkBtn = root.querySelector('[data-act="check"]');
      let checked = false;
      setTimeout(() => { try { input.focus(); } catch (e) {/*ignore*/} }, 60);
      speak(entry.speak, { rate: 0.85 });
      root.querySelector('[data-act="play"]').addEventListener("click", () => speak(entry.speak, { rate: 0.85 }));
      root.querySelector('[data-act="repeat"]').addEventListener("click", () => speak(entry.speak, { rate: 0.85 }));
      checkBtn.addEventListener("click", () => {
        if (checked) { session.index += 1; show(); return; }
        const typed = (input.value || "").trim();
        const ok = typed.toLowerCase() === entry.display.toLowerCase();
        if (ok) { session.correct += 1; ding(); } else { thunk(); }
        feedback.innerHTML = ok
          ? `<div class="feedback-row"><span class="word-ok">✓ ${esc(entry.display)}</span></div>`
          : `<div class="feedback-row"><span class="word-bad">${esc(typed || "—")}</span> → <span class="word-ok">${esc(entry.display)}</span></div>`;
        checked = true;
        checkBtn.textContent = (session.index + 1 >= session.entries.length) ? "Finish" : "Next word";
      });
    });
  }
}

// ------------------------------------------------------------------
// Final celebration (Connor at week 9 OR Claire at week 28)
// ------------------------------------------------------------------

function renderFinalCelebration(userId) {
  mountChrome(userId);
  const u = USERS[userId];
  const s = getUserState(userId);
  const cells = u.weeks.map((week, i) => {
    const n = i + 1;
    const slot = s.scores[String(n)] || {};
    const wordTotal = week.words.length + (slot.carryOver?.length || 0);
    const post = slot.post;
    let mark = "—";
    if (post != null && wordTotal > 0) {
      mark = (post / wordTotal >= 0.9) ? "✅" : "⚠";
    }
    return `
      <div class="cell">
        <div class="wk">W${n}</div>
        <div class="sc">${mark} ${post ?? "—"}/${wordTotal}</div>
      </div>
    `;
  }).join("");

  screen(`
    <section class="screen celebrate">
      <span class="big-emoji">🏆</span>
      <h1 class="title-1">${esc(u.displayName)} did it!</h1>
      <p class="lede">All ${u.weeks.length} weeks complete. Freestyle is still here for practice any time.</p>
      <div class="final-grid">${cells}</div>
      <div class="btn-row stack">
        <button class="btn btn-primary btn-big" data-act="freestyle">🎮 Freestyle</button>
        <button class="btn btn-secondary" data-act="progress">📊 Progress</button>
        <button class="btn btn-ghost" data-act="switch">Switch user</button>
      </div>
    </section>
  `, (root) => {
    root.querySelector('[data-act="freestyle"]').addEventListener("click", () => renderFreestyleWeekPicker(userId));
    root.querySelector('[data-act="progress"]').addEventListener("click", () => renderProgressTracker(userId));
    root.querySelector('[data-act="switch"]').addEventListener("click", () => { clearActiveUser(); renderPicker(); });
  });
}
