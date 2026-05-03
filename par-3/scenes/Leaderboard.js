export class Leaderboard extends Phaser.Scene {
  constructor() {
    super("Leaderboard");
  }

  create() {
    this.scene.start("Title");
  }
}
