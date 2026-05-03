import { HOLES } from "../data/holes.js";

export class Course extends Phaser.Scene {
  constructor() {
    super("Course");
  }

  init(data) {
    this.difficulty = data.difficulty || "normal";
  }

  create() {
    this.scene.start("Hole", {
      difficulty: this.difficulty,
      holeIndex: 0,
      scores: [],
      holes: HOLES,
    });
  }
}
