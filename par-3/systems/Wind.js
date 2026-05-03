export class Wind {
  constructor(hole, difficulty) {
    const base = hole.wind || { x: 0, y: 0, label: "Calm" };
    this.x = base.x * difficulty.windScale;
    this.y = base.y * difficulty.windScale;
    this.label = base.label || "Breeze";
    this.magnitude = Math.hypot(this.x, this.y);
  }

  apply(velocity, dt) {
    velocity.x += this.x * dt;
    velocity.y += this.y * dt;
  }

  bars() {
    return Math.max(0, Math.min(5, Math.ceil(this.magnitude / 3)));
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }
}
