// Spelling Trainer — multi-user state with per-user persistence.
//
// localStorage keys:
//   dadarcade.spelling.activeUser   — "connor" | "claire" | absent
//   dadarcade.spelling.user.connor  — JSON state
//   dadarcade.spelling.user.claire  — JSON state
//
// Every read/write is wrapped in try/catch. If persistence fails (private
// mode, quota), we flip persistenceFailed on the in-memory copy so the UI
// can surface a one-time banner without breaking the app.

import { USERS } from "./data/index.js";

const ACTIVE_KEY = "dadarcade.spelling.activeUser";
const USER_KEY_PREFIX = "dadarcade.spelling.user.";
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

// In-memory cache of each user's state, hydrated on demand.
const cache = new Map();

function userKey(id) { return `${USER_KEY_PREFIX}${id}`; }

function totalWeeksFor(id) {
  const u = USERS[id];
  return u && Array.isArray(u.weeks) ? u.weeks.length : 0;
}

function blankScores(id) {
  const total = totalWeeksFor(id);
  const scores = {};
  for (let n = 1; n <= total; n++) {
    scores[String(n)] = { pre: null, post: null, misses: [], carryOver: [] };
  }
  return scores;
}

function defaultUserState(id) {
  return {
    userId: id,
    currentWeek: 1,
    currentDay: "monday",
    lastDayAdvancedOn: null,
    scores: blankScores(id),
    voiceIndex: 0,
    muted: false,
    persistenceFailed: false
  };
}

function hydrate(id, raw) {
  const def = defaultUserState(id);
  if (!raw || typeof raw !== "object") return def;
  const merged = { ...def, ...raw };
  merged.userId = id;
  if (typeof merged.currentWeek !== "number" || merged.currentWeek < 1) merged.currentWeek = 1;
  const total = totalWeeksFor(id);
  if (merged.currentWeek > total + 1) merged.currentWeek = total + 1;
  if (!DAYS.includes(merged.currentDay)) merged.currentDay = "monday";
  if (typeof merged.voiceIndex !== "number" || merged.voiceIndex < 0) merged.voiceIndex = 0;
  merged.muted = !!merged.muted;
  // Heal scores so every expected week slot is present.
  const baseScores = blankScores(id);
  const raws = raw.scores || {};
  for (const k of Object.keys(baseScores)) {
    const slot = raws[k] || {};
    baseScores[k] = {
      pre: slot.pre ?? null,
      post: slot.post ?? null,
      misses: Array.isArray(slot.misses) ? slot.misses.slice() : [],
      carryOver: Array.isArray(slot.carryOver) ? slot.carryOver.slice() : []
    };
  }
  merged.scores = baseScores;
  return merged;
}

function loadUser(id) {
  try {
    const raw = localStorage.getItem(userKey(id));
    if (!raw) return defaultUserState(id);
    return hydrate(id, JSON.parse(raw));
  } catch (err) {
    const s = defaultUserState(id);
    s.persistenceFailed = true;
    return s;
  }
}

function persistUser(id) {
  const s = cache.get(id);
  if (!s) return;
  try {
    localStorage.setItem(userKey(id), JSON.stringify(s));
  } catch (err) {
    s.persistenceFailed = true;
  }
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// --- Active user ---

export function getActiveUser() {
  try {
    const v = localStorage.getItem(ACTIVE_KEY);
    if (v === "connor" || v === "claire") return v;
    return null;
  } catch (err) {
    return null;
  }
}

export function setActiveUser(id) {
  if (id !== "connor" && id !== "claire") return;
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch (err) { /* in-memory only */ }
}

export function clearActiveUser() {
  try { localStorage.removeItem(ACTIVE_KEY); } catch (err) { /* ignore */ }
}

// --- Per-user state ---

export function getUserState(id) {
  if (!cache.has(id)) cache.set(id, loadUser(id));
  return cache.get(id);
}

export function mutate(id, fn) {
  const s = getUserState(id);
  fn(s);
  persistUser(id);
  return s;
}

export function totalWeeks(id) {
  return totalWeeksFor(id);
}

// True when the user has already completed today's activity.
export function isRestingToday(id) {
  return getUserState(id).lastDayAdvancedOn === todayISO();
}

// True when the user has finished their full program.
export function isProgramComplete(id) {
  const s = getUserState(id);
  return s.currentWeek > totalWeeksFor(id);
}

export function advanceDay(id, nextDay) {
  mutate(id, (s) => {
    s.lastDayAdvancedOn = todayISO();
    if (nextDay) {
      s.currentDay = nextDay;
    } else {
      const idx = DAYS.indexOf(s.currentDay);
      s.currentDay = idx >= 0 && idx < DAYS.length - 1 ? DAYS[idx + 1] : s.currentDay;
    }
  });
}

export function savePreTest(id, weekN, total, misses) {
  mutate(id, (s) => {
    const key = String(weekN);
    if (!s.scores[key]) s.scores[key] = { pre: null, post: null, misses: [], carryOver: [] };
    s.scores[key].pre = total - misses.length;
    s.scores[key].misses = misses.slice();
  });
}

// Returns { mastered, post, total, pre, advanced } so the UI can pick the
// next screen. Always advances week + bumps voiceIndex; lock at totalWeeks+1.
export function savePostTestAndAdvance(id, weekN, total, misses) {
  let result;
  mutate(id, (s) => {
    const key = String(weekN);
    if (!s.scores[key]) s.scores[key] = { pre: null, post: null, misses: [], carryOver: [] };
    const post = total - misses.length;
    s.scores[key].post = post;
    const mastered = total > 0 ? (post / total) >= 0.9 : true;
    if (!mastered) {
      const nextKey = String(weekN + 1);
      if (s.scores[nextKey]) {
        const existing = new Set(s.scores[nextKey].carryOver);
        for (const w of misses) existing.add(w);
        s.scores[nextKey].carryOver = Array.from(existing);
      }
    }
    s.lastDayAdvancedOn = todayISO();
    s.currentWeek += 1;
    s.voiceIndex += 1;
    s.currentDay = "monday";
    const cap = totalWeeksFor(id) + 1;
    if (s.currentWeek > cap) s.currentWeek = cap;
    result = { mastered, post, total, pre: s.scores[key].pre, advanced: true };
  });
  return result;
}

export function toggleMuted(id) {
  let next = false;
  mutate(id, (s) => { s.muted = !s.muted; next = s.muted; });
  return next;
}

export function setMuted(id, muted) {
  mutate(id, (s) => { s.muted = !!muted; });
}

export function resetUser(id) {
  const fresh = defaultUserState(id);
  cache.set(id, fresh);
  try {
    localStorage.removeItem(userKey(id));
  } catch (err) { /* ignore */ }
}

// --- Helpers for screens ---

export function currentWeekData(id) {
  const u = USERS[id];
  const s = getUserState(id);
  if (!u || s.currentWeek < 1 || s.currentWeek > u.weeks.length) return null;
  return u.weeks[s.currentWeek - 1];
}

// Friday word list = this week's words ∪ this week's carryOver (carry-overs first).
export function fridayWordEntries(id) {
  const u = USERS[id];
  const s = getUserState(id);
  const week = u.weeks[s.currentWeek - 1];
  if (!week) return [];
  const carry = s.scores[String(s.currentWeek)]?.carryOver || [];
  return [...week.words, ...carry];
}
