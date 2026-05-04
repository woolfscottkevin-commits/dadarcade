const jobs = [
  {
    row: "A",
    jobId: "4d9cc803-9d44-4fe1-8561-d5043b2d4ba3",
    note: "dark floor gap, no reward object"
  },
  {
    row: "B",
    jobId: "8372fe48-ba66-4968-a742-6af64bedddd9",
    note: "floor gap with hidden keepsake box"
  },
  {
    row: "C",
    jobId: "229affc3-da1c-4201-b842-53951b96afa7",
    note: "floor gap with music box reveal"
  }
];

const choices = jobs.flatMap((job) =>
  [0, 1, 2, 3].map((index) => ({
    id: `${job.row}${index}`,
    row: job.row,
    index,
    note: job.note,
    jobId: job.jobId,
    image: `https://cdn.midjourney.com/${job.jobId}/0_${index}_640_N.webp?method=shortest`,
    url: `https://www.midjourney.com/jobs/${job.jobId}?index=${index}`
  }))
);

const grid = document.querySelector("#choices");
const template = document.querySelector("#choice-template");
const selectedLabel = document.querySelector("#selected-label");
const exportLine = document.querySelector("#export-line");

function selectChoice(choice, card) {
  document.querySelectorAll(".choice.is-selected").forEach((node) => {
    node.classList.remove("is-selected");
  });

  card.classList.add("is-selected");
  selectedLabel.textContent = choice.id;
  exportLine.textContent = `floorboard-reveal | ${choice.id} | assets/scenes/floorboard-reveal.webp | ${choice.url}`;
  localStorage.setItem("granddads-attic-floorboard-pick", JSON.stringify(choice));
}

for (const choice of choices) {
  const node = template.content.firstElementChild.cloneNode(true);
  const button = node.querySelector("button");
  const image = node.querySelector("img");
  const badge = node.querySelector(".badge");
  const source = node.querySelector(".source");
  const link = node.querySelector("a");

  badge.textContent = choice.id;
  image.src = choice.image;
  image.alt = `Floorboard reveal option ${choice.id}`;
  source.textContent = `${choice.note}`;
  link.href = choice.url;

  button.addEventListener("click", () => selectChoice(choice, node));
  grid.append(node);
}

const stored = localStorage.getItem("granddads-attic-floorboard-pick");
if (stored) {
  const choice = choices.find((item) => item.id === JSON.parse(stored).id);
  const card = [...document.querySelectorAll(".choice")][choices.indexOf(choice)];
  if (choice && card) {
    selectChoice(choice, card);
  }
}
