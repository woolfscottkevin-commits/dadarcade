// Barrel + small data-shape helpers shared by every screen.
//
// Exports:
//   USERS           — { connor: CONNOR, claire: CLAIRE }
//   JOKES           — joke array
//   COMMON_WORDS    — Word Chain dictionary supplement
//   normalizeWord(entry)         — { display, speak } regardless of input form
//   highlightWord(display, key)  — HTML string with <span class="hl">…</span>
//                                  around the pattern feature for Tuesday's drill

import { CONNOR } from "./curriculum-connor.js";
import { CLAIRE } from "./curriculum-claire.js";
import { JOKES } from "./jokes.js";
import { COMMON_WORDS } from "./common-words.js";

export { JOKES, COMMON_WORDS };

export const USERS = {
  connor: CONNOR,
  claire: CLAIRE
};

// Word entries come as either a bare string ("cat") or as
// { word: "Mr.", audioOverride: "Spell the abbreviation: Mister…" }.
// Anywhere we display or speak a word we route through this helper so the
// rest of the codebase doesn't have to branch on shape.
export function normalizeWord(entry) {
  if (typeof entry === "string") {
    return { display: entry, speak: entry };
  }
  if (entry && typeof entry === "object") {
    const display = typeof entry.word === "string" ? entry.word : "";
    const speak = typeof entry.audioOverride === "string" && entry.audioOverride.length > 0
      ? entry.audioOverride
      : display;
    return { display, speak };
  }
  return { display: String(entry ?? ""), speak: String(entry ?? "") };
}

// HTML-escape minimal special chars. Our curriculum words include apostrophes
// and periods but no &/</>; this is a safety net in case future curricula add
// edgier characters.
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrap(s, openIdx, len, klass = "hl") {
  if (openIdx < 0 || openIdx >= s.length || len <= 0) return esc(s);
  const before = esc(s.slice(0, openIdx));
  const match = esc(s.slice(openIdx, openIdx + len));
  const after = esc(s.slice(openIdx + len));
  return `${before}<span class="${klass}">${match}</span>${after}`;
}

function wrapFirstMatch(word, regex, klass = "hl") {
  const m = regex.exec(word);
  if (!m) return null;
  return wrap(word, m.index, m[0].length, klass);
}

function wrapSuffix(word, suffix, klass = "hl") {
  const lc = word.toLowerCase();
  if (!lc.endsWith(suffix)) return null;
  return wrap(word, word.length - suffix.length, suffix.length, klass);
}

// Pattern highlight for Tuesday's drill. Returns an HTML string. Each branch
// is intentionally simple — visible feedback that "this piece is the pattern"
// is the goal; we don't need linguistic perfection.
export function highlightWord(displayWord, patternKey) {
  const w = displayWord;
  const lc = w.toLowerCase();

  switch (patternKey) {
    case "short-vowel-or-floss": {
      // FLOSS rule: doubled f/l/s/z at end.
      const floss = /([flsz])\1$/i.exec(w);
      if (floss) return wrap(w, w.length - 2, 2);
      // Else: wrap first short vowel.
      const v = /[aeiou]/i.exec(w);
      if (v) return wrap(w, v.index, 1);
      return esc(w);
    }

    case "digraph": {
      const r = wrapFirstMatch(w, /(sh|ch|th|wh|ng|nk)/i);
      return r ?? esc(w);
    }

    case "blend-start": {
      // Leading consonant cluster of length 2-3.
      const m = /^([bcdfghjklmnpqrstvwxyz]{2,3})(?=[aeiou])/i.exec(w);
      if (m) return wrap(w, 0, m[1].length);
      return esc(w);
    }

    case "three-letter-blend": {
      const m = /^(scr|spl|spr|squ|str)/i.exec(w);
      if (m) return wrap(w, 0, 3);
      // Fallback to two-letter blend so we still highlight something useful.
      const two = /^([bcdfghjklmnpqrstvwxyz]{2})(?=[aeiou])/i.exec(w);
      if (two) return wrap(w, 0, 2);
      return esc(w);
    }

    case "magic-e": {
      // Drop trailing silent E.
      const m = /[bcdfghjklmnpqrstvwxz]e$/i.exec(w);
      if (m && /[aeiou]/i.test(w.slice(0, -2))) {
        return wrap(w, w.length - 1, 1);
      }
      return esc(w);
    }

    case "vowel-team": {
      const r = wrapFirstMatch(w, /(ai|ay|ee|ea|oa|oe|ie|igh|ow|ind|old)/i);
      return r ?? esc(w);
    }

    case "r-controlled": {
      const r = wrapFirstMatch(w, /(air|ear|are|ar|or|er|ir|ur)/i);
      return r ?? esc(w);
    }

    case "oo-ew-ou-ow": {
      const r = wrapFirstMatch(w, /(oo|ew|ou|ow)/i);
      return r ?? esc(w);
    }

    case "oo-sound": {
      // Long /oo/: oo, ew, ue, or u_e.
      let r = wrapFirstMatch(w, /(oo|ew|ue)/i);
      if (r) return r;
      const ucvce = /u[bcdfghjklmnpqrstvwxz]e$/i.exec(w);
      if (ucvce) return wrap(w, ucvce.index, ucvce[0].length);
      return esc(w);
    }

    case "ou-sound": {
      const r = wrapFirstMatch(w, /(ou|ow)/i);
      return r ?? esc(w);
    }

    case "aw-sound": {
      let r = wrapFirstMatch(w, /(aw|au|al)/i);
      if (r) return r;
      // /aw/ via short o in talk/cross/cost — wrap the o.
      const o = /o/i.exec(w);
      if (o) return wrap(w, o.index, 1);
      return esc(w);
    }

    case "oi-sound": {
      const r = wrapFirstMatch(w, /(oi|oy)/i);
      return r ?? esc(w);
    }

    case "ch-spelling": {
      // Prefer TCH so the "after-short-vowel" pattern jumps out.
      let r = wrapFirstMatch(w, /(tch)/i);
      if (r) return r;
      r = wrapFirstMatch(w, /(ch)/i);
      return r ?? esc(w);
    }

    case "silent-letter":
    case "silent-consonant": {
      // KN- or WR- at start: dim the silent letter.
      if (/^kn/i.test(w)) return wrap(w, 0, 1, "hl dim");
      if (/^wr/i.test(w)) return wrap(w, 0, 1, "hl dim");
      return esc(w);
    }

    case "plurals-contractions": {
      // Contraction first — wrap the apostrophe + tail.
      const apo = w.indexOf("'");
      if (apo >= 0) return wrap(w, apo, w.length - apo);
      // Plural -es / -s suffix.
      if (/es$/i.test(w) && w.length > 2) return wrap(w, w.length - 2, 2);
      if (/s$/i.test(w) && w.length > 1) return wrap(w, w.length - 1, 1);
      return esc(w);
    }

    case "compound-or-abbrev": {
      // Abbreviation: highlight the trailing period.
      if (w.endsWith(".")) return wrap(w, w.length - 1, 1);
      // Compound: highlight the split when one of these tails matches.
      const tails = ["day","night","time","light","noon","afternoon","airplane","mother","grandmother","granddaughter","daughter","father","grandfather","grandson","room","house","away","faraway","sight","ground","brother","sister"];
      for (const t of tails) {
        if (lc !== t && lc.endsWith(t) && lc.length > t.length) {
          return wrap(w, w.length - t.length, t.length);
        }
      }
      return esc(w);
    }

    case "irregular-plural": {
      if (/ves$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/en$/i.test(w) && w.length > 3) return wrap(w, w.length - 2, 2);
      if (/ice$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/eese$/i.test(w)) return wrap(w, w.length - 4, 4);
      if (/oes$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/men$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/es$/i.test(w)) return wrap(w, w.length - 2, 2);
      if (/s$/i.test(w)) return wrap(w, w.length - 1, 1);
      return esc(w);
    }

    case "ed-ing-suffix": {
      if (/ing$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/ed$/i.test(w)) return wrap(w, w.length - 2, 2);
      return esc(w);
    }

    case "prefix-suffix": {
      if (/^un/i.test(w)) return wrap(w, 0, 2);
      if (/^re/i.test(w)) return wrap(w, 0, 2);
      if (/ness$/i.test(w)) return wrap(w, w.length - 4, 4);
      if (/less$/i.test(w)) return wrap(w, w.length - 4, 4);
      return esc(w);
    }

    case "y-to-i": {
      if (/iest$/i.test(w)) return wrap(w, w.length - 4, 4);
      if (/ier$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/ies$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/ied$/i.test(w)) return wrap(w, w.length - 3, 3);
      return esc(w);
    }

    case "ful-ly-er": {
      if (/ful$/i.test(w)) return wrap(w, w.length - 3, 3);
      if (/ly$/i.test(w)) return wrap(w, w.length - 2, 2);
      if (/er$/i.test(w)) return wrap(w, w.length - 2, 2);
      return esc(w);
    }

    case "ough-augh": {
      let r = wrapFirstMatch(w, /(ough|augh)/i);
      return r ?? esc(w);
    }

    case "j-s-sound": {
      // /j/ via dge or g before e/i/y or j; /s/ via c before e/i/y; /kw/ via qu.
      let r = wrapFirstMatch(w, /(dge|tch|qu)/i);
      if (r) return r;
      r = wrapFirstMatch(w, /([gc][eiy])/i);
      if (r) return r;
      r = wrapFirstMatch(w, /j/i);
      return r ?? esc(w);
    }

    case "homophones":
    default:
      // No inner highlight — meaning context lives in the rule + sentences.
      return esc(w);
  }
}
