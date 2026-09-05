// Media resolution for Morning Drive's visual tiles.
//
// THE RULE: the model never supplies an image URL. It names a subject — an
// artwork title, a landmark, an animal, a country — and everything in this file
// turns that name into a real, verified, correctly-licensed image. A model-
// invented URL looks plausible and 404s in the car at 7am.
//
// Every resolver returns null rather than throwing. A tile that can't be
// resolved is simply dropped for the day; the drive still ships.

const UA = "MorningDrive/1.0 (https://dadarcade.com)";
const TIMEOUT_MS = 8000;

async function getJson(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Confirm an image URL actually serves an image before we store it.
async function imageLoads(url) {
  if (!url || !/^https:\/\//.test(url)) return false;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok && (res.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
}

// Score how well a catalogue entry matches what the model asked for. A plain
// substring test is not enough: the Met holds "Study for 'A Sunday on La Grande
// Jatte'", which contains the requested title exactly but is a preparatory
// sketch, not the famous painting (that one is in Chicago). Conversely the Met
// catalogues Hokusai's Great Wave as "Under the Wave off Kanagawa", sharing no
// leading substring with the name every child knows it by.
function matchScore(candTitle, wantTitle, candArtist, wantArtist) {
  const norm = (v) => String(v || "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const ct = norm(candTitle), wt = norm(wantTitle);
  if (!ct || !wt) return 0;

  let score;
  if (ct === wt) score = 100;
  else if (ct.startsWith(wt) || wt.startsWith(ct)) score = 70;
  else if (ct.includes(wt) || wt.includes(ct)) score = 45;
  else {
    const have = new Set(ct.split(" "));
    const want = wt.split(" ").filter((w) => w.length > 2);
    const hits = want.filter((w) => have.has(w)).length;
    score = want.length ? Math.round(40 * (hits / want.length)) : 0;
  }

  // We want the finished, recognisable work — not a study or a later copy.
  if (/\b(study|sketch|copy|after|fragment|reproduction)\b/.test(ct)) score -= 35;

  if (wantArtist) {
    const ca = norm(candArtist), wa = norm(wantArtist);
    const surname = wa.split(" ").filter(Boolean).pop();
    if (ca && surname && ca.includes(surname)) score += 20;
  }
  return score;
}

const MIN_MATCH = 45;

// ----------------------------------------------------------------------------
// Artwork — searches the Met (CC0) and the Art Institute of Chicago together
// ----------------------------------------------------------------------------

async function metCandidates(title, artist) {
  const q = encodeURIComponent(`${title} ${artist || ""}`.trim());
  const search = await getJson(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${q}&hasImages=true&isPublicDomain=true`
  );
  const out = [];
  for (const id of (search?.objectIDs || []).slice(0, 6)) {
    const o = await getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
    if (!o?.isPublicDomain) continue;
    // NEVER primaryImage — the originals run to 8MB, brutal on a phone in a car.
    const img = o.primaryImageSmall || o.primaryImage;
    if (!img) continue;
    out.push({
      score: matchScore(o.title, title, o.artistDisplayName, artist),
      imageUrl: img,
      title: o.title,
      artist: o.artistDisplayName || artist || "Unknown artist",
      year: o.objectDate || "",
      credit: "The Metropolitan Museum of Art (CC0 / public domain)",
      sourceUrl: o.objectURL || "",
      source: "met",
    });
  }
  return out;
}

async function articCandidates(title, artist) {
  const q = encodeURIComponent(`${title} ${artist || ""}`.trim());
  const search = await getJson(
    `https://api.artic.edu/api/v1/artworks/search?q=${q}&limit=6` +
      `&fields=id,title,artist_title,date_display,image_id,is_public_domain`
  );
  const out = [];
  for (const a of search?.data || []) {
    if (!a?.is_public_domain || !a?.image_id) continue;
    out.push({
      score: matchScore(a.title, title, a.artist_title, artist),
      // IIIF lets us choose the width; 600 keeps it near 100KB.
      imageUrl: `https://www.artic.edu/iiif/2/${a.image_id}/full/600,/0/default.jpg`,
      title: a.title,
      artist: a.artist_title || artist || "Unknown artist",
      year: a.date_display || "",
      credit: "Art Institute of Chicago (public domain)",
      sourceUrl: `https://www.artic.edu/artworks/${a.id}`,
      source: "artic",
    });
  }
  return out;
}

// Search BOTH collections and take the best match overall, rather than letting
// whichever we query first win with a weak hit.
export async function resolveArtwork({ title, artist }) {
  if (!title) return null;
  const [met, artic] = await Promise.all([
    metCandidates(title, artist).catch(() => []),
    articCandidates(title, artist).catch(() => []),
  ]);
  const ranked = [...met, ...artic]
    .filter((c) => c.score >= MIN_MATCH)
    .sort((a, b) => b.score - a.score);

  for (const c of ranked.slice(0, 3)) {
    if (await imageLoads(c.imageUrl)) {
      const { score, ...rest } = c;
      return rest;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Wikipedia image + attribution (landmarks, animals, people)
// ----------------------------------------------------------------------------

// Wikimedia only serves thumbnail widths it has been asked to generate, so
// rewriting "/330px-" to "/600px-" in a URL fails with a 400 for most files.
// pithumbsize asks MediaWiki to produce the size properly.
export async function resolveWikiImage(pageTitle, { width = 600 } = {}) {
  if (!pageTitle) return null;
  const t = encodeURIComponent(String(pageTitle).replace(/\s+/g, "_"));
  const data = await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
      `&prop=pageimages&titles=${t}&pithumbsize=${width}&redirects=1`
  );
  const page = Object.values(data?.query?.pages || {})[0];
  const src = page?.thumbnail?.source;
  if (!src || !(await imageLoads(src))) return null;

  return {
    title: page.title || String(pageTitle),
    imageUrl: src,
    width: page.thumbnail.width,
    height: page.thumbnail.height,
    credit: await fileCredit(src),
    sourceUrl: `https://en.wikipedia.org/wiki/${t}`,
    source: "wikimedia",
  };
}

// Most Wikimedia photos are CC-BY-SA, which legally REQUIRES visible credit.
// Resolve the licence and author for the exact file we're about to show.
async function fileCredit(thumbUrl) {
  try {
    const bare = thumbUrl.split("?")[0].split("/").pop(); // strip UTM params
    const fname = decodeURIComponent(bare).replace(/^\d+px-/, "");
    const meta = await getJson(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo` +
        `&titles=File:${encodeURIComponent(fname)}&iiprop=extmetadata` +
        `&iiextmetadatafilter=LicenseShortName|Artist`
    );
    const em = Object.values(meta?.query?.pages || {})[0]?.imageinfo?.[0]?.extmetadata || {};
    const licence = em.LicenseShortName?.value || "";
    const author = String(em.Artist?.value || "").replace(/<[^>]+>/g, "").trim();
    if (!author && !licence) return "via Wikimedia Commons";
    return `${author || "Unknown"}${licence ? ` (${licence})` : ""} via Wikimedia Commons`;
  } catch {
    return "via Wikimedia Commons";
  }
}

// ----------------------------------------------------------------------------
// Flags
// ----------------------------------------------------------------------------

let flagCodeCache = null;

// flagcdn publishes a code -> country-name map. We need the reverse.
async function flagCodes() {
  if (flagCodeCache) return flagCodeCache;
  const map = await getJson("https://flagcdn.com/en/codes.json");
  if (!map) return null;
  const byName = new Map();
  for (const [code, name] of Object.entries(map)) {
    if (code.includes("-")) continue; // skip sub-national flags
    byName.set(String(name).toLowerCase(), code);
  }
  flagCodeCache = byName;
  return byName;
}

export async function resolveFlag(countryName) {
  if (!countryName) return null;
  const byName = await flagCodes();
  if (!byName) return null;
  const key = String(countryName).trim().toLowerCase();
  const code = byName.get(key) || byName.get(key.replace(/^the\s+/, ""));
  if (!code) return null;
  const imageUrl = `https://flagcdn.com/w320/${code}.png`;
  if (!(await imageLoads(imageUrl))) return null;
  return { imageUrl, code, country: countryName, credit: "flagcdn.com", source: "flagcdn" };
}
