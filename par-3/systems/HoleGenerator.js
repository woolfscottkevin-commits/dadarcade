export class HoleGenerator {
  constructor(scene, hole, biome, difficulty) {
    this.scene = scene;
    this.hole = hole;
    this.biome = biome;
    this.difficulty = difficulty;
  }

  build() {
    const { scene, hole, biome } = this;
    scene.matter.world.setBounds(0, 0, hole.world.width, hole.world.height, 64, true, true, true, true);
    scene.cameras.main.setBackgroundColor(biome.colors.border);

    scene.add.rectangle(360, hole.world.height / 2, hole.world.width + 560, hole.world.height, biome.colors.rough).setDepth(0);
    this.drawMownTexture();
    for (const fairway of hole.fairway) {
      scene.add.ellipse(fairway.x, fairway.y, fairway.rx * 2, fairway.ry * 2, biome.colors.fairway).setDepth(2);
    }
    scene.add.ellipse(hole.green.x, hole.green.y, hole.green.rx * 2, hole.green.ry * 2, biome.colors.green).setDepth(3);
    this.drawGreenSlope();
    this.drawTee();
    this.drawPin();
  }

  drawMownTexture() {
    const g = this.scene.add.graphics().setDepth(1);
    const h = this.hole.world.height;
    for (let y = 0; y < h; y += 56) {
      g.fillStyle(y % 112 === 0 ? 0xffffff : 0x000000, 0.035);
      g.fillRect(-280, y, 1280, 28);
    }
  }

  drawGreenSlope() {
    const g = this.scene.add.graphics().setDepth(4);
    const slope = this.hole.green.slope;
    for (let i = -2; i <= 2; i += 1) {
      const x = this.hole.green.x + i * 36;
      const y = this.hole.green.y + i * 8;
      g.lineStyle(2, 0xffffff, 0.14);
      g.beginPath();
      g.moveTo(x - slope.x * 34, y - slope.y * 34);
      g.lineTo(x + slope.x * 34, y + slope.y * 34);
      g.strokePath();
    }
  }

  drawTee() {
    const { x, y } = this.hole.tee;
    this.scene.add.ellipse(x, y, 92, 48, 0x6fb35a, 0.65).setDepth(5);
    this.scene.add.circle(x - 24, y + 2, 4, 0xeaf7ff).setDepth(6);
    this.scene.add.circle(x + 24, y + 2, 4, 0xeaf7ff).setDepth(6);
  }

  drawPin() {
    const { x, y } = this.hole.pin;
    this.scene.add.circle(x, y, this.difficulty.cupRadius, 0x0b0b0b, 0.78).setDepth(7);
    this.scene.add.circle(x, y, this.difficulty.cupRadius + 4, 0xffffff, 0.18).setDepth(6);
    const pole = this.scene.add.rectangle(x + 10, y - 36, 3, 78, 0xffffff).setDepth(15);
    pole.setOrigin(0.5, 1);
    const flag = this.scene.add.triangle(x + 22, y - 106, 0, 0, 0, 28, 40, 11, 0xff3b30).setDepth(16);
    this.scene.tweens.add({
      targets: flag,
      x: x + 26,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  surfaceAt(x, y) {
    const green = this.hole.green;
    if (inEllipse(x, y, green)) {
      return {
        type: "green",
        friction: this.biome.surfaceFriction.green,
        slope: green.slope,
        safe: true,
        rollout: this.biome.rollout,
      };
    }
    for (const fairway of this.hole.fairway) {
      if (inEllipse(x, y, fairway)) {
        return {
          type: "fairway",
          friction: this.biome.surfaceFriction.fairway,
          slope: { x: 0, y: 0 },
          safe: true,
          rollout: this.biome.rollout,
        };
      }
    }
    return {
      type: "rough",
      friction: this.biome.surfaceFriction.rough,
      slope: { x: 0, y: 0 },
      safe: true,
      rollout: 0.58,
    };
  }
}

function inEllipse(x, y, e) {
  const dx = (x - e.x) / e.rx;
  const dy = (y - e.y) / e.ry;
  return dx * dx + dy * dy <= 1;
}
