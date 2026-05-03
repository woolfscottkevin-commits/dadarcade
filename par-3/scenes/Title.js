import { DEFAULT_DIFFICULTY, DIFFICULTIES } from "../data/biomes.js";
import { getValue, setValue } from "../systems/Persistence.js";

export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    this.difficulty = getValue("difficulty", DEFAULT_DIFFICULTY);
    this.cameras.main.setBackgroundColor("#102516");
    this.drawBackground();

    this.add.text(360, 210, "PAR 3", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "96px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#07110a",
      strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(360, 292, "Top-down golf with actual air under the ball", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "24px",
      color: "#d5f6db",
    }).setOrigin(0.5);

    this.add.text(360, 430, "Difficulty", labelStyle()).setOrigin(0.5);
    this.buttons = {};
    const ids = ["kid", "normal", "hard"];
    ids.forEach((id, index) => {
      const x = 188 + index * 172;
      this.buttons[id] = this.addButton(x, 505, DIFFICULTIES[id].label, () => {
        this.difficulty = id;
        setValue("difficulty", id);
        this.paintButtons();
      });
    });
    this.paintButtons();

    this.addButton(360, 690, "Play Hole 1", () => {
      window.gtag?.("event", "par3_start", { difficulty: this.difficulty });
      this.scene.start("Course", { difficulty: this.difficulty });
    }, 280, 72);

    this.add.text(360, 825, "Phase 1 prototype: one grass par 3, wind, arc, roll, cup.", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "22px",
      color: "#bde6c6",
      align: "center",
      wordWrap: { width: 560 },
    }).setOrigin(0.5);
  }

  drawBackground() {
    this.add.rectangle(360, 640, 720, 1280, 0x173622);
    this.add.ellipse(360, 1020, 560, 540, 0x2d5a28);
    this.add.ellipse(360, 660, 320, 680, 0x4a8b3f);
    this.add.ellipse(360, 290, 210, 155, 0x79b85c);
    this.add.circle(360, 290, 18, 0x0a0a0a, 0.65);
    this.add.rectangle(374, 248, 3, 70, 0xffffff);
    this.add.triangle(394, 178, 0, 0, 0, 26, 42, 10, 0xff3b30);
    this.add.circle(360, 1040, 11, 0xffffff);
    for (let i = 0; i < 26; i += 1) {
      const x = Phaser.Math.Between(30, 690);
      const y = Phaser.Math.Between(360, 1220);
      this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xffffff, 0.07);
    }
  }

  addButton(x, y, label, onClick, width = 142, height = 58) {
    const bg = this.add.rectangle(x, y, width, height, 0xf5f7ed, 0.95).setStrokeStyle(3, 0x132117, 0.8);
    const text = this.add.text(x, y, label, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "800",
      color: "#102516",
    }).setOrigin(0.5);
    const hit = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onClick);
    hit.on("pointerover", () => bg.setFillStyle(0xffffff, 1));
    hit.on("pointerout", () => this.paintButtons());
    return { bg, text, hit };
  }

  paintButtons() {
    if (!this.buttons) return;
    Object.entries(this.buttons).forEach(([id, btn]) => {
      if (id === this.difficulty) {
        btn.bg.setFillStyle(0x8ae6a2, 1).setStrokeStyle(4, 0xffffff, 0.95);
      } else {
        btn.bg.setFillStyle(0xf5f7ed, 0.95).setStrokeStyle(3, 0x132117, 0.8);
      }
    });
  }
}

function labelStyle() {
  return {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "24px",
    fontStyle: "800",
    color: "#ffffff",
    letterSpacing: 0,
  };
}
