import { Boot } from "./scenes/Boot.js";
import { Title } from "./scenes/Title.js";
import { Course } from "./scenes/Course.js";
import { Hole } from "./scenes/Hole.js";
import { Scorecard } from "./scenes/Scorecard.js";
import { Daily } from "./scenes/Daily.js";
import { Leaderboard } from "./scenes/Leaderboard.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 720,
  height: 1280,
  backgroundColor: "#183b24",
  pixelArt: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 0 },
      enableSleeping: false,
      debug: false,
    },
  },
  render: {
    transparent: false,
    antialias: true,
    roundPixels: false,
  },
  scene: [Boot, Title, Course, Hole, Scorecard, Daily, Leaderboard],
};

if (!window.Phaser) {
  document.body.innerHTML = "<p style='padding:24px;color:white'>Par 3 could not load Phaser. Please check your connection and reload.</p>";
} else {
  window.par3Game = new Phaser.Game(config);
}
