export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture("par3-particle", 16, 16);
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xdce8ff, 0.7);
    g.fillCircle(10, 10, 5);
    g.generateTexture("par3-ball", 32, 32);
    g.destroy();
    this.scene.start("Title");
  }
}
