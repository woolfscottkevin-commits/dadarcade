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
      this.drawEllipse(fairway, biome.colors.fairway, 2);
    }
    this.drawDecorations("ground");
    this.drawEllipse(hole.green, biome.colors.green, 3);
    this.drawGreenSlope();
    this.drawTee();
    this.drawPin();
    this.drawDecorations("obstacle");
  }

  drawEllipse(shape, color, depth, alpha = 1) {
    return this.scene.add.ellipse(shape.x, shape.y, shape.rx * 2, shape.ry * 2, color, alpha)
      .setRotation(shape.rotation || 0)
      .setDepth(depth);
  }

  drawMownTexture() {
    const g = this.scene.add.graphics().setDepth(1);
    const h = this.hole.world.height;
    for (let y = 0; y < h; y += 56) {
      g.fillStyle(y % 112 === 0 ? 0xffffff : 0x000000, 0.035);
      g.fillRect(-280, y, 1280, 28);
    }
  }

  drawDecorations(layer) {
    for (const item of this.hole.decorations || []) {
      const isGround = ["sand", "water", "ice", "snowdrift"].includes(item.type);
      if ((layer === "ground") !== isGround) continue;
      if (item.type === "sand") this.drawEllipse(item, this.biome.colors.sand, 2.35, 0.95);
      if (item.type === "water") this.drawEllipse(item, this.biome.colors.water, 2.32, 0.9);
      if (item.type === "ice") this.drawEllipse(item, this.biome.colors.water, 2.34, 0.55);
      if (item.type === "snowdrift") this.drawEllipse(item, 0xffffff, 2.36, 0.58);
      if (item.type === "tree") this.drawTree(item.x, item.y, item.size);
      if (item.type === "cactus") this.drawCactus(item.x, item.y, item.size);
      if (item.type === "pine") this.drawPine(item.x, item.y, item.size);
      if (item.type === "rock") this.drawRock(item.x, item.y, item.size);
    }
  }

  drawTree(x, y, size) {
    this.scene.add.circle(x, y, size * 0.52, 0x234c26, 0.95).setDepth(10);
    this.scene.add.circle(x - size * 0.18, y - size * 0.1, size * 0.34, 0x2f6a31, 0.95).setDepth(11);
    this.scene.add.circle(x + size * 0.18, y + size * 0.08, size * 0.32, 0x1f4322, 0.95).setDepth(11);
  }

  drawCactus(x, y, size) {
    const color = 0x2f7d3a;
    this.scene.add.rectangle(x, y, size * 0.34, size * 1.15, color, 1).setDepth(10);
    this.scene.add.circle(x, y - size * 0.58, size * 0.17, color, 1).setDepth(10);
    this.scene.add.rectangle(x - size * 0.32, y + size * 0.02, size * 0.18, size * 0.52, color, 1).setDepth(10);
    this.scene.add.rectangle(x + size * 0.32, y - size * 0.16, size * 0.18, size * 0.5, color, 1).setDepth(10);
  }

  drawPine(x, y, size) {
    this.scene.add.triangle(x, y - size * 0.38, 0, size, size, size, size / 2, 0, 0x123f37, 1).setDepth(10);
    this.scene.add.triangle(x, y, 0, size, size, size, size / 2, 0, 0x1e5a49, 1).setDepth(11);
    this.scene.add.rectangle(x, y + size * 0.44, size * 0.16, size * 0.28, 0x6a4b2d, 1).setDepth(9);
  }

  drawRock(x, y, size) {
    const g = this.scene.add.graphics().setDepth(10);
    g.fillStyle(0x7b7f86, 0.96);
    g.beginPath();
    g.moveTo(x - size * 0.48, y + size * 0.08);
    g.lineTo(x - size * 0.18, y - size * 0.38);
    g.lineTo(x + size * 0.32, y - size * 0.28);
    g.lineTo(x + size * 0.5, y + size * 0.18);
    g.lineTo(x + size * 0.08, y + size * 0.42);
    g.closePath();
    g.fillPath();
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
        rollout: 0.42,
      };
    }
    for (const item of this.hole.decorations || []) {
      if (["sand", "water", "ice", "snowdrift"].includes(item.type) && inEllipse(x, y, item)) {
        return surfaceForDecoration(item.type, this.biome, this.difficulty);
      }
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

function surfaceForDecoration(type, biome, difficulty) {
  if (type === "sand") {
    return {
      type: "sand",
      friction: difficulty.bunkerFriction,
      slope: { x: 0, y: 0 },
      safe: true,
      rollout: 0.3,
    };
  }
  if (type === "water") {
    return {
      type: "water",
      friction: 0.8,
      slope: { x: 0, y: 0 },
      safe: false,
      penalty: true,
      rollout: 0.08,
    };
  }
  if (type === "ice") {
    return {
      type: "ice",
      friction: 0.998,
      slope: { x: 0, y: 0 },
      safe: true,
      rollout: 0.92,
    };
  }
  return {
    type: "snowdrift",
    friction: biome.surfaceFriction.rough,
    slope: { x: 0, y: 0 },
    safe: true,
    rollout: 0.34,
  };
}

function inEllipse(x, y, e) {
  const angle = -(e.rotation || 0);
  const rawX = x - e.x;
  const rawY = y - e.y;
  const localX = rawX * Math.cos(angle) - rawY * Math.sin(angle);
  const localY = rawX * Math.sin(angle) + rawY * Math.cos(angle);
  const dx = localX / e.rx;
  const dy = localY / e.ry;
  return dx * dx + dy * dy <= 1;
}
