import { HOLES } from "../data/holes.js";

export class Course extends Phaser.Scene {
  constructor() {
    super("Course");
  }

  init(data) {
    this.difficulty = data.difficulty || "normal";
    this.holeIndex = data.holeIndex || 0;
    this.scores = data.scores || [];
  }

  create() {
    this.scene.start("Hole", {
      difficulty: this.difficulty,
      holeIndex: this.holeIndex,
      scores: this.scores,
      holes: HOLES,
    });
  }
}
