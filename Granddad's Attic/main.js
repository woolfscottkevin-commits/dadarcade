// Granddad's Attic — entry point.
// Boots the title screen, owns the GameState + Persistence + AudioSystem,
// and wires the SceneManager to broadcast state changes back to localStorage.
//
// Local dev: from the canonical folder run
//   python3 -m http.server 8765 --bind 127.0.0.1
// and open http://127.0.0.1:8765/index.html
// Production: served at /granddads-attic/ via the launcher in
// /granddads-attic/index.html which sets <base href="/Granddad's%20Attic/">.

// All module imports share the same cache-bust so a single edit to
// /granddads-attic/index.html?v=… and /Granddad's Attic/index.html?v=…
// refreshes the whole graph in the browser. Bump the suffix on every deploy
// where any of these files change.
import { SceneManager } from "./scenes/SceneManager.js?v=20260519a";
import { sceneData } from "./scenes/sceneData.js?v=20260519a";
import { GameState } from "./systems/GameState.js?v=20260519a";
import { Persistence } from "./systems/Persistence.js?v=20260519a";
import { AudioSystem } from "./systems/Audio.js?v=20260519a";
import { TitleScreen } from "./ui/TitleScreen.js?v=20260519a";
import { EndScreen } from "./ui/EndScreen.js?v=20260519a";

const app = document.querySelector("#app");
const persistence = new Persistence("granddads-attic-save-v1");
let gameState = new GameState(persistence.load());
const audio = new AudioSystem();
audio.setMuted(!!gameState.get("audioMuted"));
let sceneManager = createSceneManager();

const muteToggle = document.querySelector("#mute-toggle");
if (muteToggle) {
  syncMuteUI();
  muteToggle.addEventListener("click", () => {
    const next = !gameState.get("audioMuted");
    gameState.set("audioMuted", next);
    audio.setMuted(next);
    persistence.save(gameState.snapshot());
    syncMuteUI();
  });
}

function syncMuteUI() {
  if (!muteToggle) return;
  const muted = !!gameState.get("audioMuted");
  muteToggle.textContent = muted ? "🔇" : "🔊";
  muteToggle.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
}

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
      audio.setMuted(!!gameState.get("audioMuted"));
      sceneManager = createSceneManager();
      syncMuteUI();
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
  get gameState() { return gameState; },
  get sceneManager() { return sceneManager; },
  reset: () => { persistence.clear(); window.location.reload(); }
};
