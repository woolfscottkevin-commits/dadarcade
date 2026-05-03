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
    const zoom = Phaser.Math.Clamp(860 / dy, 0.62, 0.95);
    this.camera.setZoom(zoom);
    this.camera.centerOn((ball.x + pin.x) * 0.5, (ball.y + pin.y) * 0.5);
  }

  follow(ball) {
    this.camera.setZoom(0.9);
    this.camera.startFollow(ball.groundPoint, true, 0.08, 0.08);
  }

  stopFollow() {
    this.camera.stopFollow();
  }

  cup(pin) {
    this.camera.stopFollow();
    this.scene.tweens.add({
      targets: this.camera,
      zoom: 1.45,
      scrollX: Phaser.Math.Clamp(pin.x - this.camera.width / 2, 0, this.camera.getBounds().width),
      scrollY: Phaser.Math.Clamp(pin.y - this.camera.height / 2, 0, this.camera.getBounds().height),
      duration: 420,
      ease: "Sine.easeOut",
    });
  }
}
