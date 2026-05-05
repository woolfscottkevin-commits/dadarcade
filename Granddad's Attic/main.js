import { SceneManager } from "./scenes/SceneManager.js?v=phase5d";
import { sceneData } from "./scenes/sceneData.js?v=phase4a";
import { GameState } from "./systems/GameState.js?v=phase3";
import { Persistence } from "./systems/Persistence.js";
import { AudioSystem } from "./systems/Audio.js?v=phase5a";
import { TitleScreen } from "./ui/TitleScreen.js?v=phase3";
import { EndScreen } from "./ui/EndScreen.js?v=phase5a";

const app = document.querySelector("#app");
const persistence = new Persistence("granddads-attic-save-v1");
let gameState = new GameState(persistence.load());
const audio = new AudioSystem();
let sceneManager = createSceneManager();

function createSceneManager() {
  return new SceneManager({
    root: app,
    scenes: sceneData,
    gameState,
    audio,
    onStateChange: () => persistence.save(gameState.snapshot()),
    onEnd: () => showEndScreen()
  });
}

function showTitle() {
  TitleScreen.mount(app, {
    hasSave: gameState.hasStarted(),
    onBegin: async () => {
      persistence.clear();
      gameState = new GameState();
      sceneManager = createSceneManager();
      await startGame("center");
    },
    onResume: async () => {
      await startGame(gameState.get("currentScene") === "title" ? "center" : gameState.get("currentScene"));
    },
    onStartOver: () => {
      persistence.clear();
      window.location.reload();
    }
  });
}

async function startGame(sceneId) {
  gameState.start();
  audio.startAmbient().catch((error) => {
    console.warn("Audio startup skipped:", error);
  });
  persistence.save(gameState.snapshot());
  sceneManager.show(sceneId);
}

function showEndScreen() {
  const state = gameState.snapshot();
  const elapsed = Math.max(0, (state.endedAt ?? Date.now()) - (state.startedAt ?? Date.now()));
  EndScreen.mount(app, {
    solveTime: formatTime(elapsed),
    onPlayAgain: () => {
      persistence.clear();
      window.location.reload();
    }
  });
}

function formatTime(milliseconds) {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

showTitle();

window.atticDebug = {
  get gameState() {
    return gameState;
  },
  get sceneManager() {
    return sceneManager;
  },
  reset: () => {
    persistence.clear();
    window.location.reload();
  }
};
