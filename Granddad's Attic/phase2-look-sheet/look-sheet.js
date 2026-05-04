const assets = window.ATTIC_PHASE2_ASSETS;
const storageKey = "granddads-attic-phase2-selections";
const sheet = document.querySelector("#sheet");
const progress = document.querySelector("#progress");
const exportPanel = document.querySelector("#export-panel");
const exportText = document.querySelector("#export-text");

let selections = readSelections();

function readSelections() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function writeSelections() {
  localStorage.setItem(storageKey, JSON.stringify(selections, null, 2));
}

function candidateImage(asset, index) {
  if (asset.imageSource === "cdn") {
    return `https://cdn.midjourney.com/${asset.jobId}/0_${index}.png`;
  }
  const version = asset.imageVersion || "20260504";
  return `thumbs-final/${asset.slug}-${index}.jpg?v=${version}`;
}

function jobUrl(asset, index) {
  return `https://www.midjourney.com/jobs/${asset.jobId}?index=${index}`;
}

function render() {
  sheet.innerHTML = "";

  for (const asset of assets) {
    const row = document.createElement("section");
    row.className = "row";
    row.dataset.asset = asset.slug;

    const picked = selections[asset.slug];
    row.innerHTML = `
      <div class="meta">
        <div class="asset-title">
          <h2>${asset.label}</h2>
          <span class="picked">${picked === undefined ? "open" : `pick ${picked}`}</span>
        </div>
        <code class="target">${asset.target}</code>
        <p class="note">${asset.note}</p>
        <p class="recommendation">${asset.recommendation}</p>
        <a class="job-link" href="${jobUrl(asset, 0)}" target="_blank" rel="noreferrer">Open MidJourney job</a>
      </div>
      <div class="choices"></div>
    `;

    const choices = row.querySelector(".choices");

    for (let index = 0; index < 4; index += 1) {
      const choice = document.createElement("button");
      choice.className = `choice${picked === index ? " selected" : ""}`;
      choice.type = "button";
      choice.dataset.index = String(index);
      choice.title = `${asset.label} choice ${index}`;
      choice.innerHTML = `
        <span class="badge">${index}</span>
        <img src="${candidateImage(asset, index)}" alt="${asset.label} candidate ${index}" loading="lazy">
        <span class="fallback">Image did not load<br><a href="${jobUrl(asset, index)}" target="_blank" rel="noreferrer">Open ${index} in MidJourney</a></span>
      `;
      choice.querySelector("img").addEventListener("error", () => {
        choice.classList.add("image-failed");
      });
      choice.addEventListener("click", () => select(asset.slug, index));
      choices.append(choice);
    }

    sheet.append(row);
  }

  updateProgress();
}

function select(slug, index) {
  selections = { ...selections, [slug]: index };
  writeSelections();

  const row = sheet.querySelector(`[data-asset="${slug}"]`);
  row.querySelector(".picked").textContent = `pick ${index}`;
  row.querySelectorAll(".choice").forEach((choice) => {
    choice.classList.toggle("selected", Number(choice.dataset.index) === index);
  });

  updateProgress();
}

function updateProgress() {
  const pickedCount = assets.filter((asset) => selections[asset.slug] !== undefined).length;
  progress.textContent = `${pickedCount}/${assets.length} picked`;
}

function exportMarkdown() {
  const lines = [
    "# Granddad's Attic - Phase 2 Picks",
    "",
    "| Asset | Selected index | Target path | MidJourney URL |",
    "| --- | ---: | --- | --- |"
  ];

  for (const asset of assets) {
    const selected = selections[asset.slug];
    const value = selected === undefined ? "" : selected;
    const url = selected === undefined ? jobUrl(asset, 0) : jobUrl(asset, selected);
    lines.push(`| ${asset.slug} | ${value} | \`${asset.target}\` | [open](${url}) |`);
  }

  return lines.join("\n");
}

document.querySelector("#export").addEventListener("click", () => {
  exportText.value = exportMarkdown();
  exportPanel.classList.add("open");
  exportText.focus();
  exportText.select();
});

document.querySelector("#close-export").addEventListener("click", () => {
  exportPanel.classList.remove("open");
});

document.querySelector("#clear").addEventListener("click", () => {
  selections = {};
  writeSelections();
  render();
});

document.addEventListener("wheel", (event) => {
  if (event.target.closest("#export-panel")) return;
  sheet.scrollBy({ top: event.deltaY, behavior: "auto" });
  event.preventDefault();
}, { passive: false });

document.addEventListener("keydown", (event) => {
  if (event.target.matches("textarea, input")) return;
  const scrollKeys = {
    ArrowDown: 96,
    ArrowUp: -96,
    PageDown: Math.floor(sheet.clientHeight * 0.85),
    PageUp: -Math.floor(sheet.clientHeight * 0.85),
    Home: -sheet.scrollTop,
    End: sheet.scrollHeight
  };
  if (!(event.key in scrollKeys)) return;
  sheet.scrollBy({ top: scrollKeys[event.key], behavior: "auto" });
  event.preventDefault();
});

render();
