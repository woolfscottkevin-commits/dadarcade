import { resolveArtwork, resolveWikiImage, resolveFlag } from "../../api/_morning-drive-media.js";

const show = (label, r) => {
  if (!r) return console.log(`  ${label.padEnd(38)} -> null (tile drops)`);
  const bits = [r.title || r.country || "", r.artist || "", r.year || ""].filter(Boolean).join(" / ");
  console.log(`  ${label.padEnd(38)} -> ${r.source}  ${bits}`);
  console.log(`  ${"".padEnd(38)}    ${r.imageUrl.slice(0, 78)}`);
  if (r.credit) console.log(`  ${"".padEnd(38)}    credit: ${r.credit.slice(0, 62)}`);
};

console.log("\nARTWORK (model proposes a title, code verifies)");
show("Wheat Field with Cypresses/van Gogh", await resolveArtwork({ title: "Wheat Field with Cypresses", artist: "Vincent van Gogh" }));
show("A Sunday on La Grande Jatte/Seurat", await resolveArtwork({ title: "A Sunday on La Grande Jatte", artist: "Georges Seurat" }));
show("The Great Wave off Kanagawa", await resolveArtwork({ title: "The Great Wave off Kanagawa", artist: "Hokusai" }));
show("HALLUCINATED: Sunset Over Bumble", await resolveArtwork({ title: "Sunset Over Bumbleford Meadow", artist: "A. Nobody" }));

console.log("\nWIKI IMAGE + attribution");
for (const p of ["Machu Picchu", "Great Wall of China", "Axolotl", "Blue whale", "Eiffel Tower"]) {
  show(p, await resolveWikiImage(p));
}
show("HALLUCINATED: Zorbulon Spire", await resolveWikiImage("Zorbulon Spire of Qqqx"));

console.log("\nFLAGS");
for (const c of ["Peru", "Japan", "Kenya", "Brazil", "the Netherlands", "Freedonia"]) {
  show(c, await resolveFlag(c));
}
console.log("");
