// Batch generation for the content bank.
//
// One call produces 30-60 items of a SINGLE kind. That is the whole cost story:
// the old nightly prompt re-sent every item ever written so the model wouldn't
// repeat itself (~26,000 tokens, growing). Here the unique index on
// (kind, fingerprint) enforces that instead, and the prompt only needs a short
// list of recent items of the ONE kind being generated.
//
// Batching also improves the content. Asking for 50 jokes at once lets the
// model see the whole set and vary it; 50 separate calls each wrote in the dark.

import { generateText, Output } from "ai";
import { z } from "zod";
import {
  ITEM_SCHEMAS, KIDS, BIBLE_TRANSLATION,
  assignGrammarPlan, assignMathPlan,
} from "./_morning-drive-shared.js";
import { POOL_KINDS, insertItems, itemKey, usedSubjects } from "./_morning-drive-pool.js";
import { resolveArtwork, resolveFlag, resolveWikiImage } from "./_morning-drive-media.js";
import { buildVideoBatch } from "./_morning-drive-video.js";

const MODEL = "anthropic/claude-sonnet-4.6";

// Shared voice/safety rules, appended to every batch prompt. Short by design —
// this text is paid for on every top-up.
const HOUSE_RULES = `
Everything is read aloud in the car to a ${KIDS.claire.name} (Grade ${KIDS.claire.grade}) and a ${KIDS.connor.name} (Grade ${KIDS.connor.grade}).
- Nothing violent, frightening, cruel or sad. No war, crime, disaster, death or politics.
- No bathroom humour, no insults, no sarcasm aimed at anyone.
- Be accurate. If you are not confident a fact, date or attribution is right, choose a different one.
- Warm, playful and specific. Vary sentence shape and subject matter across the batch — these are
  served one per day over weeks, so the set as a whole must not feel samey.`;

const BATCH_INSTRUCTIONS = {
  joke: (n) => `Write ${n} kid-clean jokes — puns, knock-knocks, riddles. Mark each 'connor' (younger, visual) or 'claire' (older, wordplay). No bathroom humour.`,
  wyr: (n) => `Write ${n} Would-You-Rather pairs. Both options genuinely tempting — never one obviously worse.`,
  trivia: (n) => `Write ${n} history trivia questions across explorers, inventors, ancient civilisations, presidents and scientists. Mixed difficulty — some a 7-year-old can get, some that stretch a 9-year-old. 1-2 sentences of context with each answer.`,
  fact: (n) => `Write ${n} fun facts across animals, space, food science, nature, the human body and geography. One emoji and 2-3 sentences each.`,
  news: (n) => `Write ${n} short "cool thing in science and nature" stories — space, animals, oceans, inventions, archaeology. Do NOT frame them as breaking news or say "this week": they are read weeks apart. Leave sourceUrl blank unless you are certain the URL is real. One discussion question each.`,
  riddle: (n) => `Write ${n} kid-solvable riddles or lateral-thinking puzzles, with the answer and a one-line explanation of the trick.`,
  twoTruths: (n) => `Write ${n} Two-Truths-and-a-Lie sets about animals, space, history or the body. Exactly two true, one false, and the lie must be plausible rather than silly.`,
  characterTrait: (n) => `Write ${n} character traits (patience, courage, honesty, generosity…), each with an emoji, a kid-language definition, why it matters with a concrete example, and one specific "try this today" action for school.`,
  bible: (n) => `Choose ${n} short Bible verses in ${BIBLE_TRANSLATION}. Themes: kindness, courage, honesty, gratitude, perseverance, forgiveness, friendship — never judgment, punishment or anything frightening, and no violent narrative detail. Each with the reference, the verse, an open "what do you think it means?" question, a plain-language meaning, and the story behind it.`,
  quote: (n) => `Choose ${n} short quotes from real people — scientists, explorers, athletes, authors, civil-rights figures, inventors. Vary who they are; do not fill the set with presidents or athletes. Each with an open question, the author, and kid-friendly context.`,
  spanishWord: (n) => `Choose ${n} useful, concrete Spanish words a child would actually say. Each with the English meaning, a phonetic respelling a parent can read without knowing Spanish (e.g. "PEH-rro"), a short Spanish sentence and its translation.`,
  geography: (n) => `Write ${n} geography pairs. Each has a US question (a state, US city or US landmark) and a World question (a country, world city or world landmark), both 4-option multiple choice with the written answer, 2-3 sentences of context and one surprising fact.`,
  word: (n, kid) => `Choose ${n} Word-of-the-Day entries for ${KIDS[kid].name} (Grade ${KIDS[kid].grade}). ${kid === "connor" ? "Concrete and encounterable — enormous, sturdy, gentle." : "More abstract — determined, vivid, peculiar."}
The definition must NOT contain the word or any form of it: weeks later it is shown ALONE as a quiz prompt, so "something swift zips past" gives the answer away. The example sentence SHOULD use the word.`,
  spelling: (n, kid) => `Choose ${n} Grade ${KIDS[kid].grade} spelling words for ${KIDS[kid].name}, each with one sentence using it. The word is SPOKEN ALOUD by the phone and spelled back out loud, so avoid homophones (there/their, pair/pear, knight/night) — a child cannot tell which you mean.`,
  thisDayInHistory: (n, kid, slots) => `Write one "on this day" entry for EACH of these ${slots?.length || n} calendar dates:

${(slots || []).join(", ")}

Set \`monthDay\` to the date from that list, exactly as written (MM-DD). One entry per date, no extras, no substitutions — a date you skip is a morning with no entry.
Each must be a well-documented event on that date that you are confident about: a discovery, invention, expedition, scientific first or milestone. Nothing violent or frightening.`,
  artwork: (n) => `Name ${n} different famous artworks.
Each MUST be: held by the Metropolitan Museum of Art or the Art Institute of Chicago (the only two collections searched — no MoMA, Louvre, Orsay, Rijksmuseum or Uffizi, so no Starry Night or Mona Lisa); out of copyright, which in practice means made before about 1900 (American Gothic and Nighthawks are at the Art Institute but still in copyright); and entirely appropriate for a 7-year-old — no nudity, no violence. Landscapes, animals, boats, dancers, night skies, children and everyday scenes are ideal.
Give the exact title and the artist's full name. Ask what they SEE before telling them anything.`,
  landmark: (n) => `Choose ${n} famous landmarks. \`wikiTitle\` must be the EXACT English Wikipedia article title ("Machu Picchu", "Great Wall of China", "Uluru") because the photo is fetched from that article.`,
  animal: (n) => `Choose ${n} animals worth a photograph. \`wikiTitle\` must be the EXACT English Wikipedia article title ("Axolotl", "Blue whale", "Snow leopard"). Three short facts each, and a question to ask while looking at the picture.`,
  flag: (n) => `Choose ${n} countries whose flags are interesting to talk about. \`country\` must be the plain English country name ("Japan", "Brazil", "Kenya"). The kids see the flag and pick the country, so the 4 choices are country names. Explain what the colours or symbols mean.`,
};

// Media kinds are generated as subjects, then resolved to verified images
// BEFORE entering the pool — so the nightly assembly never touches a URL and a
// broken link can never reach the page.
const MEDIA_RESOLVERS = {
  artwork: async (item) => {
    const art = await resolveArtwork({ title: item.title, artist: item.artist });
    if (!art) return null;
    return {
      question: item.question, lookFor: item.lookFor, story: item.story,
      title: art.title, artist: art.artist, year: art.year,
      image: { url: art.imageUrl, credit: art.credit, sourceUrl: art.sourceUrl, source: art.source },
    };
  },
  landmark: async (item) => {
    const img = await resolveWikiImage(item.wikiTitle || item.name);
    if (!img) return null;
    return { ...item, image: { url: img.imageUrl, credit: img.credit, sourceUrl: img.sourceUrl, source: img.source, width: img.width, height: img.height } };
  },
  animal: async (item) => {
    const img = await resolveWikiImage(item.wikiTitle || item.name);
    if (!img) return null;
    return { ...item, image: { url: img.imageUrl, credit: img.credit, sourceUrl: img.sourceUrl, source: img.source, width: img.width, height: img.height } };
  },
  flag: async (item) => {
    const f = await resolveFlag(item.country);
    if (!f) return null;
    return { ...item, image: { url: f.imageUrl, credit: f.credit, source: f.source } };
  },
};

// A short list of what already exists for this kind, so the batch doesn't
// rewrite the same joke. Exact duplicates are caught by the unique index
// anyway — this is only to avoid near-misses, so it stays small on purpose.
async function recentKeys(sb, kind, kid, limit = 80) {
  let q = sb.from("morning_drive_pool").select("payload")
    .eq("kind", kind).order("id", { ascending: false }).limit(limit);
  q = kid ? q.eq("kid", kid) : q.is("kid", null);
  const { data } = await q;
  return (data || []).map((r) => itemKey(kind, r.payload)).filter(Boolean);
}

// Math and grammar are the one place variety has to be engineered rather than
// asked for, so a batch is generated against N days of assigned (topic, format)
// plans instead of a free-form request.
function planBlock(kind, kid, dateStr, days) {
  const assign = kind === "math" ? assignMathPlan : assignGrammarPlan;
  const perDay = POOL_KINDS[kind].perDay;
  const lines = [];
  let n = 1;
  for (let d = 0; d < days; d++) {
    const day = new Date(new Date(dateStr).getTime() + d * 86400000).toISOString().slice(0, 10);
    for (const p of assign(day, kid, perDay)) {
      lines.push(`  ${n++}. topic: **${p.topic}** — format: *${p.format}*`);
    }
  }
  return { count: lines.length, text: lines.join("\n") };
}

export async function generateBatch(sb, { kind, kid = null, dateStr, slots = null }) {
  const spec = POOL_KINDS[kind];
  if (!spec) throw new Error(`Unknown pool kind: ${kind}`);

  // Video runs backwards from every other kind: code gathers and verifies real
  // videos first, and the model only chooses among them and writes the words.
  if (kind === "video") {
    const { items, channelsOk, channelsFailed, verified } = await buildVideoBatch({ count: spec.batch, today: dateStr });
    const { inserted, attempted } = await insertItems(sb, { kind, items });
    return { kind, generated: items.length, verified, channelsOk, channelsFailed, attempted, inserted };
  }
  const itemSchema = ITEM_SCHEMAS[kind];
  if (!itemSchema) throw new Error(`No item schema for kind: ${kind}`);

  let count = spec.batch;
  let instruction;

  if (spec.batchDays) {
    const plan = planBlock(kind, kid, dateStr, spec.batchDays);
    count = plan.count;
    instruction = `Write ${count} ${kind === "math" ? "math" : "grammar"} questions for ${KIDS[kid].name} (Grade ${KIDS[kid].grade}), multiple choice with 4 options.

Every question has an ASSIGNED topic and format below. Follow both, and copy them into the question's \`topic\` and \`format\` fields verbatim.

${plan.text}

- These are served ${spec.perDay} a day over ${spec.batchDays} days, so the whole set must feel varied: different situations, characters and settings. Do not open every question with a name and a quantity.
- Distractors should be the mistakes a kid actually makes (forgot to regroup, off by one), not random values.
- EXACTLY ONE option may be defensible. Check every distractor is genuinely wrong.
- Never mark the correct option — no tick, no "(correct)", no aside only it carries. All four read the same way.
- Any working shown inside an option must be arithmetically correct.${kind === "grammar" ? "\n- Every question needs a `why` field stating the rule in one sentence." : ""}`;
  } else {
    if (spec.slotted && slots?.length) count = slots.length;
    instruction = BATCH_INSTRUCTIONS[kind]?.(count, kid, slots) || `Write ${count} items.`;
  }

  const avoid = await recentKeys(sb, kind, kid);
  const avoidBlock = avoid.length
    ? `\n\n## Already used — do not repeat or closely rework these\n${avoid.map((a) => `- ${a}`).join("\n")}`
    : "";

  // Subjects are tracked across ALL kinds, not just this one. "Octopuses have
  // blue blood" appeared in Today's News and in Fun Facts on the same morning
  // because each kind only ever checked itself.
  const SUBJECT_KINDS = ["fact", "news", "trivia", "twoTruths", "animal"];
  let subjectBlock = "";
  if (SUBJECT_KINDS.includes(kind)) {
    const subjects = await usedSubjects(sb);
    if (subjects.length) {
      subjectBlock = `\n\n## Subjects already covered elsewhere — pick different ones\nThese have been used by some tile already. Do not write about them again, in any tile.\n${subjects.map((x) => `- ${x}`).join("\n")}`;
    }
    subjectBlock += `\n\nGive every item a short lowercase \`subject\` tag naming its topic, and make all ${count} subjects distinct from each other as well.`;
  }

  const prompt = `${instruction}
${HOUSE_RULES}${avoidBlock}${subjectBlock}

Return all ${count} items.`;

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: z.object({ items: z.array(itemSchema).min(1).max(count) }) }),
    prompt,
  });

  let items = output.items || [];
  const generated = items.length;

  // Resolve images before storing. Anything that cannot be verified is dropped
  // here, at top-up time, so it can never surface as a broken tile at 7am.
  let resolveFailures = 0;
  const resolver = MEDIA_RESOLVERS[kind];
  if (resolver) {
    const resolved = [];
    for (let i = 0; i < items.length; i += 4) {
      const chunk = await Promise.all(
        items.slice(i, i + 4).map((it) => resolver(it).catch(() => null))
      );
      for (const r of chunk) r ? resolved.push(r) : resolveFailures++;
    }
    items = resolved;
  }

  // The model is asked for the date directly rather than having it parsed back
  // out of the prose, so a differently-worded sentence cannot misfile an entry.
  const slotOf = spec.slotted
    ? (item) => (/^\d{2}-\d{2}$/.test(String(item.monthDay || "")) ? item.monthDay : null)
    : null;

  const { inserted, attempted } = await insertItems(sb, { kind, kid, items, slotOf });
  return { kind, kid, generated, resolveFailures, attempted, inserted };
}
