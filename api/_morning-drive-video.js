// Educational video, from curated channels.
//
// NO API KEY IS USED. YouTube's Data API needs one; its public per-channel RSS
// feed does not. That buys real, recent, verifiable videos — but the RSS carries
// NO DURATION FIELD, so the "under a minute" rule cannot be enforced here. The
// channel list is the substitute: these are outlets that make short explainers
// for children. Add a YOUTUBE_API_KEY later and length can be filtered properly.
//
// Channel IDs are checked, not assumed: the first ID I tried for SciShow Kids
// actually belonged to minutephysics, and nothing about the feed would have
// revealed that.

const UA = "MorningDrive/1.0 (https://dadarcade.com)";
const TIMEOUT_MS = 12_000;

// Smithsonian Channel was dropped after its feed offered a "Dexter:
// Resurrection" drama teaser — its YouTube slate is entertainment now, whatever
// the name suggests. TED-Ed stays but is the reason the model does a final
// age-appropriateness pass: it also offered "Why Is It So Hard for Men to Open
// Up?", which no keyword list would have caught.
export const CHANNELS = [
  { name: "SciShow Kids",      id: "UC1Nj4gkoi_n5eCcrKCVOXKA" },
  { name: "Crash Course Kids", id: "UCRFIPG2u1DxKLNuE3y2SjHA" },
  { name: "TED-Ed",            id: "UCAuUUnT6oDeKwE6v1NGQxug" },
  { name: "BBC Earth",         id: "UCdsOTr6SmDrxuWE7sJFrkhQ" },
  { name: "NASA",              id: "UCLA_DiR1FfKNvjuUpBHmylQ" },
];

// Same blunt safety net as the news feeds. These are general channels and a
// video about a disaster must not reach a tile a 7-year-old opens in the car.
const UNSUITABLE = /\b(war|died|death|killed|deadly|disaster|extinction event|nuclear|weapon|apocalyp|horror|scary|nightmare|murder|crime|drug|virus outbreak|pandemic)\b/i;

async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

const decode = (s) => String(s || "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

function parseChannelFeed(xml, channel) {
  const out = [];
  for (const entry of xml.match(/<entry>[\s\S]*?<\/entry>/g) || []) {
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = decode(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    const description = decode(entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]);
    const thumbnail = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1];
    if (!videoId || !title) continue;
    if (UNSUITABLE.test(`${title} ${description}`)) continue;
    out.push({
      videoId, title, description: description.slice(0, 400),
      channel: channel.name,
      published: published ? published.slice(0, 10) : null,
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      // youtube-nocookie keeps the kids out of YouTube's ad-profile tracking.
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
    });
  }
  return out;
}

// oEmbed needs no key and confirms two things the feed cannot: that the video
// still exists, and that it is actually embeddable. A video pulled or set to
// "no embedding" would otherwise render as a dead grey box in the car.
export async function verifyVideo(video) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(video.url)}&format=json`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.title) return null;
    return {
      ...video,
      title: data.title || video.title,
      // Deliberately NOT data.author_name: oEmbed reported a SciShow Kids video
      // as "Animal Wonders Montana" (the collaborator who made it), which would
      // put a channel name on the tile that the kids have never heard of.
      thumbnail: data.thumbnail_url || video.thumbnail,
    };
  } catch { return null; }
}

export async function fetchVideoCandidates({ perChannel = 4, maxAgeDays = 900, today } = {}) {
  const lists = await Promise.all(
    CHANNELS.map(async (ch) => {
      const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`);
      if (!xml) return { channel: ch.name, ok: false, items: [] };
      let items = parseChannelFeed(xml, ch);
      if (today) {
        items = items.filter((v) => {
          if (!v.published) return true;
          const age = (Date.parse(today) - Date.parse(v.published)) / 86400000;
          return age <= maxAgeDays;
        });
      }
      return { channel: ch.name, ok: true, items: items.slice(0, perChannel) };
    })
  );

  // Interleave so one prolific channel cannot fill the whole batch.
  const buckets = lists.map((l) => l.items);
  const merged = [];
  for (let i = 0; i < Math.max(0, ...buckets.map((b) => b.length)); i++) {
    for (const b of buckets) if (b[i]) merged.push(b[i]);
  }
  return {
    candidates: merged,
    channelsOk: lists.filter((l) => l.ok).map((l) => l.channel),
    channelsFailed: lists.filter((l) => !l.ok).map((l) => l.channel),
  };
}


// ----------------------------------------------------------------------------
// Batch: pick the good ones and write the introduction
// ----------------------------------------------------------------------------
// Code gathers and verifies the videos; the model only chooses among real ones
// and writes the words around them. It never supplies a video id, so it cannot
// invent a link.

import { generateText, Output } from "ai";
import { z } from "zod";

const MODEL = "anthropic/claude-sonnet-4.6";

const pickSchema = z.object({
  picks: z.array(z.object({
    index: z.number().int().describe("The number of the video from the list."),
    hook: z.string().describe("One sentence telling the kids why this is worth watching, without giving away the interesting part."),
    question: z.string().describe("One question to ask them after watching."),
    subject: z.string().describe("Two or three words naming the subject, lowercase."),
  })).min(1),
});

export async function buildVideoBatch({ count = 12, today }) {
  const { candidates, channelsOk, channelsFailed } = await fetchVideoCandidates({ today, perChannel: 5 });
  if (!candidates.length) return { items: [], channelsOk, channelsFailed, verified: 0 };

  // Verify before the model sees them, so it never chooses something that
  // cannot actually be played.
  const verified = [];
  for (let i = 0; i < candidates.length; i += 4) {
    const chunk = await Promise.all(candidates.slice(i, i + 4).map((v) => verifyVideo(v).catch(() => null)));
    for (const v of chunk) if (v) verified.push(v);
  }
  if (!verified.length) return { items: [], channelsOk, channelsFailed, verified: 0 };

  const list = verified
    .map((v, i) => `${i}. [${v.channel}] ${v.title}\n   ${(v.description || "").slice(0, 200)}`)
    .join("\n\n");

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: pickSchema }),
    prompt: `Below are real educational videos from channels we trust. Choose up to ${count} that a 9-year-old and a 7-year-old would genuinely enjoy, and write a one-line hook and a question for each.

${list}

Rules:
- Report each video by its number. Do not invent videos.
- These are watched in the car on the way to school. Choose SHORT, self-contained, curious things: animals, space, how things work, nature, history.
- Skip anything aimed at adults or teenagers, anything about relationships, mental health, politics, war, illness or death, and anything that is a trailer or an advert for a TV show.
- If fewer than ${count} are suitable, return fewer. Returning three good ones beats padding with six bad ones.
- The hook should make them curious without spoiling it.`,
  });

  const items = [];
  for (const pick of output.picks || []) {
    const v = verified[pick.index];
    if (!v) continue; // invented index — drop rather than guess
    items.push({
      videoId: v.videoId, title: v.title, channel: v.channel,
      url: v.url, embedUrl: v.embedUrl, thumbnail: v.thumbnail, published: v.published,
      hook: pick.hook, question: pick.question, subject: pick.subject,
    });
  }
  return { items, channelsOk, channelsFailed, verified: verified.length };
}
