export class Daily extends Phaser.Scene {
  constructor() {
    super("Daily");
  }

  create() {
    this.scene.start("Title");
  }
}
