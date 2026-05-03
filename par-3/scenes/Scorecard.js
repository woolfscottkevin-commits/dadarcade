export class Scorecard extends Phaser.Scene {
  constructor() {
    super("Scorecard");
  }

  init(data) {
    this.hole = data.hole;
    this.strokes = data.strokes;
    this.difficulty = data.difficulty;
  }

  create() {
    this.cameras.main.setBackgroundColor("#102516");
    this.add.rectangle(360, 640, 720, 1280, 0x102516);
    const relative = this.strokes - this.hole.par;
    const label = relative <= -2 ? "Eagle" : relative === -1 ? "Birdie" : relative === 0 ? "Par" : relative === 1 ? "Bogey" : `+${relative}`;

    this.add.text(360, 220, label, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "78px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#07110a",
      strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(360, 330, `${this.hole.name} complete`, bodyStyle(28, "#d5f6db")).setOrigin(0.5);
    this.add.text(360, 445, `${this.strokes} stroke${this.strokes === 1 ? "" : "s"} on a par ${this.hole.par}`, bodyStyle(34, "#ffffff")).setOrigin(0.5);
    this.add.text(360, 530, `Difficulty: ${this.difficulty}`, bodyStyle(22, "#bde6c6")).setOrigin(0.5);

    this.addButton(360, 720, "Retry Hole", () => this.scene.start("Course", { difficulty: this.difficulty }));
    this.addButton(360, 820, "Title", () => this.scene.start("Title"));
  }

  addButton(x, y, label, onClick) {
    this.add.rectangle(x, y, 280, 66, 0x8ae6a2, 1).setStrokeStyle(3, 0xffffff, 0.9);
    this.add.text(x, y, label, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "24px",
      fontStyle: "900",
      color: "#102516",
    }).setOrigin(0.5);
    this.add.zone(x, y, 280, 66).setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
  }
}

function bodyStyle(size, color) {
  return {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: `${size}px`,
    color,
    align: "center",
  };
}
