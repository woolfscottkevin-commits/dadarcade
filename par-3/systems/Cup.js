export class Cup {
  constructor(scene, hole, difficulty) {
    this.scene = scene;
    this.hole = hole;
    this.radius = difficulty.cupRadius;
    this.speedMax = 200;
  }

  check(ball) {
    const dx = ball.x - this.hole.pin.x;
    const dy = ball.y - this.hole.pin.y;
    const distance = Math.hypot(dx, dy);
    if (distance > this.radius || ball.z >= 4) return "miss";
    return ball.speed <= this.speedMax ? "holed" : "lip";
  }
}
