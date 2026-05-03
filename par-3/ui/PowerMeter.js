export class PowerMeter {
  constructor(scene, ball) {
    this.scene = scene;
    this.ball = ball;
    this.graphics = scene.add.graphics().setDepth(44);
  }

  clear() {
    this.graphics.clear();
  }

  draw(state) {
    this.clear();
    if (!state) return;
    const color = state.power < 0.45 ? 0x7cf67b : state.power < 0.76 ? 0xf7d34f : 0xff5148;
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * state.power;
    this.graphics.lineStyle(7, 0x000000, 0.32);
    this.graphics.strokeCircle(this.ball.x, this.ball.y, 34);
    this.graphics.lineStyle(7, color, 0.96);
    this.graphics.beginPath();
    this.graphics.arc(this.ball.x, this.ball.y, 34, start, end, false);
    this.graphics.strokePath();
    this.graphics.lineStyle(2, 0xffffff, 0.58);
    this.graphics.beginPath();
    this.graphics.moveTo(this.ball.x, this.ball.y);
    this.graphics.lineTo(state.pointer.x, state.pointer.y);
    this.graphics.strokePath();
  }
}
