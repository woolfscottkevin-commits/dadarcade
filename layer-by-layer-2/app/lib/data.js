// Fetches book data once and keeps it. Content JSON lives in data/content/, builds in data/builds/,
// figures (lessons and redstone) in data/figures/, and the build catalogue in data/catalog.json.
const cache = new Map();
export function json(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then(r => { if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); })
      .catch(e => { cache.delete(path); throw e; }));
  }
  return cache.get(path);
}
export const content = name => json(`data/content/${name}.json`);
export const catalog = () => json('data/catalog.json');
export const buildData = slug => json(`data/builds/${slug}.json`);
export const figureData = id => json(`data/figures/${id}.json`);

let reg;
export function registryMeta() { return reg || (reg = json('data/blocks.json')); }

// Item icons come from one sprite sheet (data/icons.webp, 16 per row). CSS class .ii sizes them
// with --isz; this returns the span for one icon index.
export function iconSpan(index) {
  if (index == null || index < 0) return '<span class="ii ii-none" aria-hidden="true"></span>';
  return `<span class="ii" aria-hidden="true" style="--ix:${index % 16};--iy:${Math.floor(index / 16)}"></span>`;
}
// icon index for an item name, from the registry
export async function iconFor(item) {
  const r = await registryMeta();
  if (!r._iconIdx) r._iconIdx = new Map(r.icons.items.map((n, i) => [n, i]));
  return r._iconIdx.get(item) ?? -1;
}
