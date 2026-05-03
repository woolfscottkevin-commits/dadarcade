export class CameraDirector {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  setWorld(width, height) {
    this.camera.setBounds(-240, 0, width + 480, height);
  }

  address(ball, pin) {
    const dy = Math.abs(pin.y - ball.y);
    const zoom = Phaser.Math.Clamp(940 / dy, 0.68, 1);
    this.camera.setZoom(zoom);
    this.camera.centerOn((ball.x + pin.x) * 0.5, (ball.y + pin.y) * 0.5);
  }

  follow(ball) {
    this.camera.setZoom(0.96);
    this.camera.startFollow(ball.groundPoint, true, 0.08, 0.08);
  }

  stopFollow() {
    this.camera.stopFollow();
  }

  cup(pin) {
    this.camera.stopFollow();
    this.camera.pan(pin.x, pin.y, 420, "Sine.easeOut", true);
    this.scene.tweens.add({
      targets: this.camera,
      zoom: 1.45,
      duration: 420,
      ease: "Sine.easeOut",
    });
  }
}
