// Async asset preloader for Dad Quest.
// Loads every entry in ASSET_MANIFEST in parallel, reports progress per file,
// and rejects the whole pass if any single asset fails (so Phase 1 verifies
// the asset pipeline end-to-end). After success, getAsset(path) returns the
// cached HTMLImageElement.

const cache = new Map();

function flatten(manifest) {
  const all = [];
  for (const key of Object.keys(manifest)) {
    for (const path of manifest[key]) all.push(path);
  }
  return all;
}

function loadOne(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Asset failed to load: ${path}`));
    img.src = path;
  });
}

export async function preloadAssets(manifest, onProgress) {
  const paths = flatten(manifest);
  const total = paths.length;
  let loaded = 0;

  const tasks = paths.map(async (path) => {
    try {
      const img = await loadOne(path);
      cache.set(path, img);
      loaded += 1;
      if (typeof onProgress === "function") onProgress(loaded, total, path);
      return img;
    } catch (err) {
      if (typeof onProgress === "function") onProgress(loaded, total, path);
      throw err;
    }
  });

  await Promise.all(tasks);
  return cache;
}

export function getAsset(path) {
  return cache.get(path);
}
