export class Scorecard extends Phaser.Scene {
  constructor() {
    super("Scorecard");
  }

  init(data) {
    this.hole = data.hole;
    this.holeIndex = data.holeIndex || 0;
    this.holes = data.holes || [data.hole];
    this.scores = data.scores || [data.strokes];
    this.strokes = data.strokes;
    this.difficulty = data.difficulty;
  }

  create() {
    this.cameras.main.setBackgroundColor("#102516");
    this.add.rectangle(360, 640, 720, 1280, 0x102516);
    if (this.isFinalHole()) {
      this.createRoundSummary();
    } else {
      this.createHoleSummary();
    }
  }

  createHoleSummary() {
    const relative = this.strokes - this.hole.par;
    const label = scoreLabel(this.strokes, relative);

    this.add.text(360, 190, label, titleStyle(78)).setOrigin(0.5);
    this.add.text(360, 310, `Hole ${this.hole.number} cleared`, bodyStyle(30, "#d5f6db", "800")).setOrigin(0.5);
    this.add.text(360, 372, this.hole.name, bodyStyle(42, "#ffffff", "900")).setOrigin(0.5);
    this.add.text(360, 470, `${this.strokes} stroke${this.strokes === 1 ? "" : "s"} on a par ${this.hole.par}`, bodyStyle(34, "#ffffff", "700")).setOrigin(0.5);
    this.add.text(360, 546, `Difficulty: ${toTitleCase(this.difficulty)}`, bodyStyle(22, "#bde6c6", "700")).setOrigin(0.5);

    this.addButton(360, 700, "Next Hole", () => this.startHole(this.holeIndex + 1, this.scores));
    this.addButton(360, 800, "Retry Hole", () => this.startHole(this.holeIndex, this.previousScores()));
    this.addButton(360, 900, "Main Menu", () => this.scene.start("Title"));
  }

  createRoundSummary() {
    const total = this.scores.reduce((sum, strokes) => sum + (strokes || 0), 0);
    const par = this.holes.reduce((sum, hole) => sum + hole.par, 0);
    const relative = total - par;

    this.add.text(360, 132, "Round Complete", titleStyle(56)).setOrigin(0.5);
    this.add.text(360, 226, `${total} strokes`, bodyStyle(46, "#ffffff", "900")).setOrigin(0.5);
    this.add.text(360, 290, `${formatRelative(relative)} through ${this.holes.length} holes`, bodyStyle(26, "#d5f6db", "800")).setOrigin(0.5);
    this.add.text(360, 340, `Difficulty: ${toTitleCase(this.difficulty)}`, bodyStyle(20, "#bde6c6", "700")).setOrigin(0.5);

    const startY = 430;
    this.holes.forEach((hole, index) => {
      const y = startY + index * 46;
      const strokes = this.scores[index] || "-";
      this.add.text(104, y, `${hole.number}`, bodyStyle(22, "#bde6c6", "900")).setOrigin(0.5);
      this.add.text(156, y, hole.name, bodyStyle(22, "#ffffff", "700")).setOrigin(0, 0.5);
      this.add.text(612, y, `${strokes}`, bodyStyle(24, "#ffffff", "900")).setOrigin(0.5);
    });

    this.addButton(360, 950, "Play Again", () => this.scene.start("Course", { difficulty: this.difficulty }));
    this.addButton(360, 1050, "Main Menu", () => this.scene.start("Title"));
  }

  addButton(x, y, label, onClick) {
    this.add.rectangle(x, y, 320, 66, 0x8ae6a2, 1).setStrokeStyle(3, 0xffffff, 0.9);
    this.add.text(x, y, label, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "24px",
      fontStyle: "900",
      color: "#102516",
    }).setOrigin(0.5);
    this.add.zone(x, y, 320, 66).setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
  }

  startHole(holeIndex, scores) {
    this.scene.start("Hole", {
      difficulty: this.difficulty,
      holeIndex,
      holes: this.holes,
      scores,
    });
  }

  previousScores() {
    const scores = [...this.scores];
    scores[this.holeIndex] = undefined;
    return scores;
  }

  isFinalHole() {
    return this.holeIndex >= this.holes.length - 1;
  }
}

function titleStyle(size) {
  return {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: `${size}px`,
    fontStyle: "900",
    color: "#ffffff",
    stroke: "#07110a",
    strokeThickness: 10,
    align: "center",
  };
}

function bodyStyle(size, color, weight = "700") {
  return {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: `${size}px`,
    fontStyle: weight,
    color,
    align: "center",
  };
}

function scoreLabel(strokes, relative) {
  if (strokes === 1) return "Ace!";
  if (relative <= -2) return "Eagle";
  if (relative === -1) return "Birdie";
  if (relative === 0) return "Par";
  if (relative === 1) return "Bogey";
  return `+${relative}`;
}

function formatRelative(relative) {
  if (relative === 0) return "Even par";
  if (relative < 0) return `${relative}`;
  return `+${relative}`;
}

function toTitleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
