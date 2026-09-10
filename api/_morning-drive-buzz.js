// What is going on in the wider world — the material the radio opens with.
//
// The first show was built entirely out of the day's tiles, and it landed the
// way a recap lands: Connor had just done all of it. What was wanted was the
// other thing radio does — "hey Connor, did you know the NFL started last night
// and the Seahawks beat the Patriots thirteen to ten?" Things from outside the
// lesson, told like a friend telling you.
//
// So the DJ gets their own material, gathered by code. Real finished games with
// real scores from ESPN's public scoreboards, and a set of feeds picked for the
// kind of thing a seven-year-old repeats at lunch: new dinosaurs, space, animals,
// what is visible in the sky tonight.
//
// The rule from the news tile holds here. The model never supplies a score, a
// team, a date or a source — code fetches those and the model only says them
// aloud. Scores are even spelled into words here rather than at the microphone,
// so "13" cannot come out as "thirty-one".

import { fetchText, parseFeed, UNSUITABLE } from "./_morning-drive-news.js";

const TIMEOUT_MS = 12_000;

// ----------------------------------------------------------------------------
// Sport
// ----------------------------------------------------------------------------

// ESPN's site API is public and needs no key. Between them these cover every
// month of the year, so the show is never short of a result.
export const LEAGUES = [
  { label: "the NFL",              path: "football/nfl" },
  { label: "college football",     path: "football/college-football" },
  { label: "Major League Baseball", path: "baseball/mlb" },
  { label: "the NBA",              path: "basketball/nba" },
  { label: "the WNBA",             path: "basketball/wnba" },
  { label: "the NHL",              path: "hockey/nhl" },
  { label: "Major League Soccer",  path: "soccer/usa.1" },
];

const ONES = ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
  "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

// Scores are read aloud, so they are turned into words here where the number is
// still a number. Asking the model to convert is asking it to do arithmetic on
// the one part of the sentence that has to be exactly right.
export function spellNumber(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return String(n);
  if (v < 20) return ONES[v];
  if (v < 100) {
    const t = TENS[Math.floor(v / 10)];
    const r = v % 10;
    return r ? `${t}-${ONES[r]}` : t;
  }
  if (v < 1000) {
    const h = `${ONES[Math.floor(v / 100)]} hundred`;
    const r = v % 100;
    return r ? `${h} ${spellNumber(r)}` : h;
  }
  return String(v);
}

const ymd = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

// No custom User-Agent here, deliberately. ESPN's edge answers 403 to
// "MorningDrive/1.0 (https://dadarcade.com)" — anything shaped like a bot — while
// serving the same public JSON to the default agent. Sending nothing is the
// honest option; the alternative was dressing the request up as Chrome.
async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Turn ESPN's week/season fields into the thing that actually makes a result
// worth mentioning: not "week 1" but "the first week of the season".
export function seasonContext(league, data) {
  const type = data?.season?.type ?? data?.leagues?.[0]?.season?.type?.type;
  const week = data?.week?.number;
  if (type === 1) return `${league} preseason`;
  if (type === 3 || type === 4) return `${league} playoffs`;
  if (week === 1) return `the opening week of the ${league.replace(/^the /, "")} season`;
  if (week) return `week ${week} of the ${league.replace(/^the /, "")} season`;
  return league;
}

// Which result is worth the forty seconds. A shutout and an overtime finish are
// the two a child actually repeats; after that, a blowout or a one-score game
// beats a four-point Tuesday.
export function notability(game) {
  let score = 0;
  if (game.overtime) score += 4;
  if (/ to zero$/.test(game.score)) score += 4;   // "forty-five to nothing"
  if (game.margin >= 21) score += 2;
  if (game.margin <= 3) score += 2;
  if (/opening week|playoffs/.test(game.context)) score += 3;
  return score;
}

export function readGame(event, leagueLabel, context) {
  const comp = event?.competitions?.[0];
  const status = comp?.status?.type;
  if (!comp || status?.state !== "post") return null;

  const teams = comp.competitors || [];
  const winner = teams.find((t) => t.winner);
  const loser = teams.find((t) => !t.winner);
  if (!winner || !loser) return null; // a draw, or a game ESPN has not settled

  const ws = Number(winner.score);
  const ls = Number(loser.score);
  if (!Number.isFinite(ws) || !Number.isFinite(ls)) return null;

  // One human detail, so the DJ has something to say beyond the numbers.
  const leader = (comp.leaders || [])
    .map((l) => ({ stat: l.shortDisplayName, line: l.leaders?.[0]?.displayValue, who: l.leaders?.[0]?.athlete?.fullName }))
    .find((l) => l.who && l.line);

  return {
    league: leagueLabel,
    context,
    when: event.date,
    winner: winner.team?.displayName,
    loser: loser.team?.displayName,
    // Both forms: words for the microphone, digits for anything that checks.
    score: `${spellNumber(ws)} to ${spellNumber(ls)}`,
    scoreDigits: `${ws}-${ls}`,
    margin: ws - ls,
    overtime: /\bOT\b|overtime|shootout/i.test(status?.detail || ""),
    standout: leader ? `${leader.who}: ${leader.line}` : null,
  };
}

// Finished games from the last couple of days. Fetched per league and per date
// because ESPN's scoreboard is a day view, and a late kickoff lands on the next
// day in UTC.
export async function fetchSports(today, { hoursBack = 48, perLeague = 3 } = {}) {
  const base = Date.parse(`${today}T12:00:00Z`);
  const days = [1, 0, -1].map((back) => ymd(new Date(base - back * 86400000)));
  const cutoff = Date.parse(`${today}T09:00:00Z`) - hoursBack * 3600000;

  const perLeagueResults = await Promise.all(
    LEAGUES.map(async (lg) => {
      const seen = new Set();
      const games = [];
      let context = lg.label;
      for (const day of days) {
        const data = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/${lg.path}/scoreboard?dates=${day}`);
        if (!data) continue;
        context = seasonContext(lg.label, data);
        for (const event of data.events || []) {
          if (seen.has(event.id)) continue;
          seen.add(event.id);
          const game = readGame(event, lg.label, context);
          if (!game) continue;
          if (Date.parse(game.when) < cutoff) continue;
          games.push(game);
        }
      }
      games.sort((a, b) => notability(b) - notability(a) || Date.parse(b.when) - Date.parse(a.when));
      return { league: lg.label, ok: true, games: games.slice(0, perLeague) };
    })
  );

  // Interleave leagues so a fifteen-game baseball night cannot crowd out the
  // one football result that is the whole reason a seven-year-old is listening.
  const lists = perLeagueResults.map((r) => r.games);
  const merged = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const list of lists) if (list[i]) merged.push(list[i]);
  }
  return merged;
}

// ----------------------------------------------------------------------------
// Everything else going on
// ----------------------------------------------------------------------------

// Deliberately not the tile's feeds. The news tile reads BBC Newsround and
// friends; if the radio read the same wire it would be a recap again by another
// route. These lean towards the things kids bring up unprompted.
export const BUZZ_FEEDS = [
  { source: "Science Daily",          url: "https://www.sciencedaily.com/rss/fossils_ruins/dinosaurs.xml" },
  { source: "Science Daily",          url: "https://www.sciencedaily.com/rss/plants_animals.xml" },
  { source: "Smithsonian Magazine",   url: "https://www.smithsonianmag.com/rss/smart-news/" },
  { source: "Space dot com",          url: "https://www.space.com/feeds/all" },
  { source: "EarthSky",               url: "https://earthsky.org/feed/" },
];

// The tile's UNSUITABLE list is written for news wires and does not cover what
// turns up here. A museum burglary — the Renoir theft in the first live run —
// reads as adventure to an adult and as a crime story to a seven-year-old.
const UNSUITABLE_FOR_RADIO = new RegExp([
  "thieves", "thief", "stole", "stolen", "theft", "robbery", "burgl", "looted",
  "smuggl", "poach", "trafficking", "extinct forever", "euthan", "slaughter",
].join("|"), "i");

// Gear reviews and shopping guides run through these feeds and are not stories.
const NOT_A_STORY = [
  /\breview\b/i, /\bdeal[s]?\b/i, /\bsale\b/i, /% off/i, /best .* (of|for) \d{4}/i,
  /\bcoupon\b/i, /\bbuying guide\b/i, /\bsubscribe\b/i, /\bpodcast\b/i,
  /\blive updates?\b/i, /\bopinion\b/i, /\bquiz\b/i,
];

export function isUsableStory(item, today, maxAgeDays = 6) {
  const text = `${item.title} ${item.summary}`;
  if (NOT_A_STORY.some((re) => re.test(item.title))) return false;
  if (UNSUITABLE.test(text) || UNSUITABLE_FOR_RADIO.test(text)) return false;
  if (item.summary.length < 40) return false; // too thin to retell accurately
  if (item.published) {
    const age = (Date.parse(today) - Date.parse(item.published)) / 86400000;
    if (age > maxAgeDays || age < -2) return false;
  }
  return true;
}

export async function fetchBuzzCandidates(today, { maxAgeDays = 6, perFeed = 5 } = {}) {
  const results = await Promise.all(
    BUZZ_FEEDS.map(async (f) => {
      const xml = await fetchText(f.url);
      if (!xml) return { source: f.source, ok: false, items: [] };
      const items = parseFeed(xml, f.source)
        .filter((i) => isUsableStory(i, today, maxAgeDays))
        .slice(0, perFeed);
      return { source: f.source, ok: true, items };
    })
  );

  const lists = results.map((r) => r.items);
  const merged = [];
  // The two Science Daily feeds overlap, so the same new dinosaur arrived twice
  // in the first live run. Key on the link, and on the title for outlets that
  // syndicate one story under two URLs.
  const seen = new Set();
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const list of lists) {
      const item = list[i];
      if (!item) continue;
      const key = `${item.link}|${item.title.toLowerCase()}`;
      if (seen.has(item.link) || seen.has(item.title.toLowerCase())) continue;
      seen.add(item.link);
      seen.add(item.title.toLowerCase());
      merged.push(item);
    }
  }
  return {
    candidates: merged,
    feedsOk: results.filter((r) => r.ok).length,
    feedsFailed: results.filter((r) => !r.ok).map((r) => r.source),
  };
}

// ----------------------------------------------------------------------------

// Everything the DJ gets from outside the house. A failure on either side is
// survivable — the show is still a show with only sport, or only stories.
export async function gatherBuzz(today, { avoidSubjects = [] } = {}) {
  const [sports, stories] = await Promise.all([
    fetchSports(today).catch(() => []),
    fetchBuzzCandidates(today).catch(() => ({ candidates: [], feedsOk: 0, feedsFailed: [] })),
  ]);

  // Drop anything the page already covered this morning, so hearing it is not
  // the second time today.
  const avoid = avoidSubjects.map((s) => String(s).toLowerCase()).filter(Boolean);
  const fresh = stories.candidates.filter((c) => {
    const text = `${c.title} ${c.summary}`.toLowerCase();
    return !avoid.some((subject) => subject.length > 3 && text.includes(subject));
  });

  return {
    sports,
    stories: fresh.slice(0, 14).map((c) => ({
      source: c.source,
      title: c.title,
      summary: c.summary.slice(0, 400),
      published: c.published,
    })),
    feedsOk: stories.feedsOk,
    feedsFailed: stories.feedsFailed,
  };
}
