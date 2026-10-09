// Everything a kid does is saved only on this device, in localStorage, and every access is
// wrapped so a private window or blocked storage never breaks the book.
const P = 'lbl2:';
export const store = {
  get(k, d) { try { const v = localStorage.getItem(P + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(P + k); } catch (e) {} },
  keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(P)).map(k => k.slice(P.length)); } catch (e) { return []; } },
};

export const settings = {
  all() { return Object.assign({ text: 1, spacey: false, calm: false, sound: true, rate: 0.95 }, store.get('settings', {})); },
  set(k, v) { const s = settings.all(); s[k] = v; store.set('settings', s); return s; },
};

// Builder log: finished builds, where you are in Build Mode, gathered blocks.
export const log = {
  done() { return store.get('done', {}); },                       // slug -> {tier, at}
  markDone(slug, tier) { const d = log.done(); d[slug] = { tier, at: new Date().toISOString().slice(0, 10) }; store.set('done', d); },
  unmark(slug) { const d = log.done(); delete d[slug]; store.set('done', d); },
  // where Build Mode got to. Only Build Mode writes it: looking at layers on a build page never moves it.
  where(slug) { return store.get('where:' + slug, null); },      // {tier, layer}
  setWhere(slug, tier, layer) { store.set('where:' + slug, { tier, layer }); },
  // the size last picked on a build page
  pickedTier(slug) { return store.get('tier:' + slug, null); },
  pickTier(slug, tier) { store.set('tier:' + slug, tier); },
  // builds that have already built themselves once on screen ("Watch it build" plays by itself only the first time)
  watched(slug) { return !!store.get('watched', {})[slug]; },
  markWatched(slug) { const w = store.get('watched', {}); if (!w[slug]) { w[slug] = 1; store.set('watched', w); } },
  got(slug, tier) { return store.get(`got:${slug}:${tier}`, {}); },
  setGot(slug, tier, v) { store.set(`got:${slug}:${tier}`, v); },
  layerDone(slug, tier) { return store.get(`ld:${slug}:${tier}`, {}); },
  setLayerDone(slug, tier, v) { store.set(`ld:${slug}:${tier}`, v); },
  tried(kind) { return store.get('tried:' + kind, {}); },        // lessons and gadgets opened
  markTried(kind, id) { const t = log.tried(kind); if (!t[id]) { t[id] = 1; store.set('tried:' + kind, t); } },
};

// "Move my progress": a code a grown-up can copy to another device or into the Home Screen app.
export function exportProgress() {
  const o = {}; for (const k of store.keys()) o[k] = store.get(k);
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function importProgress(code) {
  const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  for (const [k, v] of Object.entries(o)) store.set(k, v);
  return Object.keys(o).length;
}
