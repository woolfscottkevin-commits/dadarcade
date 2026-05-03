export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    this.top = scene.add.rectangle(360, 30, 720, 60, 0x000000, 0.42);
    this.title = scene.add.text(24, 16, "", textStyle(22, "700")).setOrigin(0, 0);
    this.strokes = scene.add.text(360, 12, "", textStyle(26, "800")).setOrigin(0.5, 0);
    this.wind = scene.add.text(696, 14, "", textStyle(18, "700")).setOrigin(1, 0);
    this.status = scene.add.rectangle(360, 88, 432, 38, 0x000000, 0.24).setStrokeStyle(1, 0xffffff, 0.1);
    this.hint = scene.add.text(360, 77, "Drag back anywhere, release to swing", textStyle(18, "700")).setOrigin(0.5, 0);
    this.surface = scene.add.text(24, 76, "", textStyle(15, "700")).setOrigin(0, 0);
    this.root.add([this.top, this.status, this.title, this.strokes, this.wind, this.hint, this.surface]);
  }

  objects() {
    return [this.root];
  }

  update({ hole, strokes, wind, surface, state }) {
    this.title.setText(`Hole ${hole.number}  Par ${hole.par}`);
    this.strokes.setText(`Stroke ${Math.max(1, strokes + 1)}`);
    this.wind.setText(`${windArrow(wind.angle())} ${"▮".repeat(wind.bars())}`);
    this.surface.setText(surface ? surface.toUpperCase() : "");
    if (state === "ready") this.hint.setText("Drag back anywhere, release to swing");
    if (state === "flight") this.hint.setText("Hold the line...");
    if (state === "rolling") this.hint.setText("Roll, roll, roll");
    if (state === "holed") this.hint.setText("In the cup");
  }
}

function textStyle(size, weight) {
  return {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: `${size}px`,
    fontStyle: weight,
    color: "#ffffff",
    stroke: "#07110a",
    strokeThickness: 4,
  };
}

function windArrow(angle) {
  const arrows = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
  const index = Math.round((((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 8) % 8;
  return arrows[index];
}
