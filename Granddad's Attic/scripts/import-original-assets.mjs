import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "original-assets");

const assets = [
  ["center", "assets/scenes/center.webp"],
  ["desk", "assets/scenes/desk.webp"],
  ["footlocker", "assets/scenes/footlocker.webp"],
  ["coatrack", "assets/scenes/coatrack.webp"],
  ["painting", "assets/scenes/painting.webp"],
  ["window", "assets/scenes/window.webp"],
  ["footlocker-open", "assets/scenes/footlocker-open.webp"],
  ["floorboard-reveal", "assets/scenes/floorboard-reveal.webp"],
  ["painting-moved", "assets/scenes/painting-moved.webp"],
  ["safe-open", "assets/scenes/safe-open.webp"],
  ["wedding-photo-front", "assets/closeups/wedding-photo-front.webp"],
  ["wedding-photo-back", "assets/closeups/wedding-photo-back.webp"],
  ["footlocker-lock", "assets/closeups/footlocker-lock.webp"],
  ["diary-locked", "assets/closeups/diary-locked.webp"],
  ["diary-front-cover", "assets/closeups/diary-front-cover.webp"],
  ["diary-open", "assets/closeups/diary-open.webp"],
  ["radio-locked", "assets/closeups/radio-locked.webp"],
  ["radio-tuning", "assets/closeups/radio-tuning.webp"],
  ["music-box-closed", "assets/closeups/music-box-closed.webp"],
  ["music-box-open", "assets/closeups/music-box-open.webp"],
  ["sheet-music", "assets/closeups/sheet-music.webp"],
  ["badge-front", "assets/closeups/badge-front.webp"],
  ["badge-back", "assets/closeups/badge-back.webp"],
  ["safe-lock", "assets/closeups/safe-lock.webp"],
  ["final-letter", "assets/closeups/final-letter.webp"],
  ["center-late", "assets/scenes/center-late.webp"],
  ["end", "assets/scenes/end.webp"]
];

let copied = 0;
const missing = [];

for (const [slug, target] of assets) {
  const source = path.join(sourceDir, `${slug}.webp`);
  const destination = path.join(root, target);

  try {
    const info = await stat(source);
    if (!info.isFile() || info.size === 0) {
      missing.push(`${slug}.webp`);
      continue;
    }
  } catch {
    missing.push(`${slug}.webp`);
    continue;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  copied += 1;
  console.log(`copied ${slug}.webp -> ${target}`);
}

console.log(`\nImported ${copied} original asset(s).`);
if (missing.length > 0) {
  console.log(`Missing ${missing.length}:`);
  for (const file of missing) console.log(`- original-assets/${file}`);
}
