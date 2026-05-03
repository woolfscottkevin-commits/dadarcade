const PREVIEW_STEPS = 58;
const STEP_DT = 1 / 24;
const GRAVITY_Z = 980;
const MAX_POWER_SPEED = 1040;

export class AimLine {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(45);
    this.apex = scene.add.text(0, 0, "X", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#173622",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(46).setVisible(false);
  }

  clear() {
    this.graphics.clear();
    this.apex.setVisible(false);
  }

  draw(state, wind, difficulty) {
    this.clear();
    if (!state || state.power <= 0.02) return;

    const points = this.predict(state, wind);
    const visibleCount = Math.max(6, Math.floor(points.length * difficulty.aimScale));
    this.graphics.lineStyle(4, 0xffffff, 0.9);
    for (let i = 1; i < visibleCount; i += 1) {
      const prev = points[i - 1];
      const cur = points[i];
      if (i % 2 === 0) {
        const alpha = Phaser.Math.Clamp(1 - i / visibleCount, 0.18, 0.86);
        this.graphics.lineStyle(4, 0xffffff, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(prev.x, prev.y);
        this.graphics.lineTo(cur.x, cur.y);
        this.graphics.strokePath();
      }
    }
    const apex = points.reduce((best, p) => (p.z > best.z ? p : best), points[0]);
    this.apex.setPosition(apex.x, apex.y - apex.z).setVisible(true);
  }

  predict(state, wind) {
    const points = [];
    const velocity = new Phaser.Math.Vector2(
      state.direction.x * MAX_POWER_SPEED * state.power,
      state.direction.y * MAX_POWER_SPEED * state.power,
    );
    let x = state.launch.x;
    let y = state.launch.y;
    let z = 1;
    let vz = 420 + 520 * state.power;

    for (let i = 0; i < PREVIEW_STEPS; i += 1) {
      velocity.x += wind.x * STEP_DT;
      velocity.y += wind.y * STEP_DT;
      x += velocity.x * STEP_DT;
      y += velocity.y * STEP_DT;
      vz -= GRAVITY_Z * STEP_DT;
      z = Math.max(0, z + vz * STEP_DT);
      points.push({ x, y, z });
      if (z <= 0 && i > 8) break;
    }
    return points;
  }
}
