// Real news, from real feeds.
//
// The old "Today's News" tile was model-written prose with no source. It once
// offered "octopuses have three hearts and blue blood" as news — a decades-old
// animal fact — and pooling made it worse, serving invented stories weeks after
// they were written.
//
// So this tile no longer comes from the content bank. Articles are fetched from
// published RSS feeds at assembly time, and the model's only job is to retell a
// REAL, DATED, LINKED article at a child's reading level. It is never asked what
// happened, only to rephrase what a named outlet already reported.

const UA = "MorningDrive/1.0 (https://dadarcade.com)";
const TIMEOUT_MS = 12_000;

// Ordered by how well they suit a 7- and 9-year-old. Newsround is written FOR
// children; Science News Explores is written for students; the rest are adult
// outlets whose science and history stories retell well.
export const FEEDS = [
  { source: "BBC Newsround",        url: "https://feeds.bbci.co.uk/newsround/rss.xml" },
  { source: "Science News Explores",url: "https://www.snexplores.org/feed" },
  { source: "Smithsonian Magazine", url: "https://www.smithsonianmag.com/rss/latest_articles/" },
  { source: "NASA",                 url: "https://science.nasa.gov/feed/" },
  { source: "Phys.org",             url: "https://phys.org/rss-feed/breaking/space-news/" },
];

// Feed furniture rather than stories: the programme listings that dominate the
// Newsround feed, and NASA's seminar and workshop notices.
const NOT_A_STORY = [
  /^watch newsround/i, /signed and subtitled/i, /^newsround$/i,
  /\b(seminar|workshop|colloquium|webinar|town hall|call for (papers|proposals))\b/i,
  /\b(job|vacancy|internship|fellowship) (opening|posting)\b/i,
];

// Kept deliberately blunt. These feeds are general news, and a story about a war
// or a shooting must never reach a tile a 7-year-old reads on the way to school.
// The model is told to skip anything unsuitable as well — this is the first of
// two filters, not the only one.
export const UNSUITABLE = new RegExp([
  "war", "killed", "kills", "killing", "dead", "death", "died", "fatal", "murder",
  "shooting", "shot dead", "gun", "stabb", "terror", "bomb", "missile", "strike",
  "invasion", "troops", "hostage", "abuse", "assault", "rape", "suicide",
  "crash", "disaster", "earthquake kills", "famine", "starv", "refugee",
  "election", "president", "prime minister", "parliament", "congress", "senate",
  "protest", "riot", "arrest", "prison", "court", "lawsuit", "trial",
  "cancer", "disease outbreak", "virus outbreak", "pandemic", "drug", "alcohol",
  "layoff", "bankrupt", "recession",
].join("|"), "i");

export async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function decode(raw) {
  return String(raw || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

// Deliberately hand-rolled: one regex pass over well-formed RSS beats adding a
// dependency to a project with three of them.
export function parseFeed(xml, source) {
  const out = [];
  for (const block of xml.match(/<item[ >][\s\S]*?<\/item>/gi) || []) {
    const title = tag(block, "title");
    const link = tag(block, "link") || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "");
    const summary = tag(block, "description") || tag(block, "summary");
    const dateRaw = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
    const published = dateRaw ? new Date(dateRaw) : null;
    if (!title || !link) continue;
    out.push({
      source, title, link, summary,
      published: published && !isNaN(published) ? published.toISOString().slice(0, 10) : null,
    });
  }
  return out;
}

function isUsable(item, maxAgeDays, today) {
  if (NOT_A_STORY.some((re) => re.test(item.title))) return false;
  const text = `${item.title} ${item.summary}`;
  if (UNSUITABLE.test(text)) return false;
  if (item.summary.length < 40) return false; // too thin to retell accurately
  if (item.published) {
    const age = (Date.parse(today) - Date.parse(item.published)) / 86400000;
    if (age > maxAgeDays || age < -2) return false;
  }
  return true;
}

// Gather candidate articles across every feed. Failures are per-feed: one outlet
// being down must not cost the tile.
export async function fetchNewsCandidates(today, { maxAgeDays = 10, perFeed = 6 } = {}) {
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      const xml = await fetchText(f.url);
      if (!xml) return { source: f.source, ok: false, items: [] };
      const items = parseFeed(xml, f.source)
        .filter((i) => isUsable(i, maxAgeDays, today))
        .slice(0, perFeed);
      return { source: f.source, ok: true, items };
    })
  );

  // Interleave sources so one prolific feed cannot crowd out the rest.
  const bySource = results.map((r) => r.items);
  const merged = [];
  for (let i = 0; i < Math.max(0, ...bySource.map((s) => s.length)); i++) {
    for (const list of bySource) if (list[i]) merged.push(list[i]);
  }

  return {
    candidates: merged,
    feedsOk: results.filter((r) => r.ok).map((r) => r.source),
    feedsFailed: results.filter((r) => !r.ok).map((r) => r.source),
  };
}

// ----------------------------------------------------------------------------
// Retelling
// ----------------------------------------------------------------------------
// The model picks from the candidate list by INDEX and rewrites the wording. It
// never supplies a link, a source or a date — those are copied from the fetched
// article by code afterwards. That makes an invented story structurally
// impossible: every field a reader could check comes from the feed, not the model.

import { generateText, Output } from "ai";
import { z } from "zod";

const MODEL = "anthropic/claude-sonnet-4.6";

const pickSchema = z.object({
  picks: z.array(z.object({
    index: z.number().int().describe("The number of the article you are retelling, from the list."),
    headline: z.string().describe("The story retold as a headline a 7-year-old can read. Keep it accurate to the article."),
    summary: z.string().describe("2-3 sentences retelling what the article says, at a 7-year-old's reading level. Do not add facts the article does not contain."),
    question: z.string().describe("One open discussion question for the car."),
    subject: z.string().describe("Two or three words naming the subject, lowercase."),
  })).length(2),
});

export async function retellNews({ candidates, avoidSubjects = [] }) {
  if (!candidates?.length) return null;

  const list = candidates
    .map((c, i) => `${i}. [${c.source}, ${c.published || "recent"}] ${c.title}\n   ${c.summary.slice(0, 320)}`)
    .join("\n\n");

  const avoid = avoidSubjects.length
    ? `\n\nSubjects already used by some tile — do not pick an article about these:\n${avoidSubjects.slice(0, 120).map((s) => `- ${s}`).join("\n")}`
    : "";

  const prompt = `Below are real articles published in the last few days. Choose the TWO that a 9-year-old and a 7-year-old would most enjoy hearing about in the car, and retell each one at their reading level.

${list}

Rules:
- Report the article by its number. Do not write about anything that is not on this list.
- Retell only what the article says. Do not add facts, figures or claims of your own — a parent may open the link and read the original.
- Choose things that actually happened recently. Skip anything that is a general fact rather than an event, and skip anything sad, frightening, violent or political.
- Prefer discovery, space, animals, archaeology, science and record-breaking. Two different subjects, not two of the same kind.
- Pick them from TWO DIFFERENT outlets where the list allows it, so the morning is not one publication's front page.${avoid}

Return exactly two picks.`;

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: pickSchema }),
    prompt,
  });

  const out = [];
  for (const pick of output.picks || []) {
    const article = candidates[pick.index];
    if (!article) continue; // hallucinated index — drop rather than guess
    out.push({
      headline: pick.headline,
      summary: pick.summary,
      question: pick.question,
      subject: pick.subject,
      // Everything verifiable comes from the feed, never from the model.
      source: article.source,
      sourceUrl: article.link,
      published: article.published,
      originalHeadline: article.title,
    });
  }
  return out.length ? out : null;
}
