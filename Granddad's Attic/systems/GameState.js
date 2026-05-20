const initialState = {
  puzzlesSolved: {
    footlocker: false,
    diary: false,
    radio: false,
    musicbox: false,
    safe: false
  },
  flags: {
    radioUnlocked: false,
    radio_message_played: false,
    hint_badge_realized: false,
    paintingMoved: false,
    letterRead: false,
    // First-visit nudges + discoverability flags.
    firstHotspotFound: false
  },
  inventory: [],
  examined: [],
  scenesVisited: [],
  currentScene: "title",
  hintsShown: [],
  startedAt: null,
  endedAt: null,
  audioMuted: false
};

function mergeState(savedState = {}) {
  return {
    ...structuredClone(initialState),
    ...savedState,
    puzzlesSolved: {
      ...initialState.puzzlesSolved,
      ...(savedState.puzzlesSolved ?? {})
    },
    flags: {
      ...initialState.flags,
      ...(savedState.flags ?? {})
    },
    inventory: savedState.inventory ?? [],
    examined: savedState.examined ?? [],
    scenesVisited: savedState.scenesVisited ?? [],
    hintsShown: savedState.hintsShown ?? []
  };
}

export class GameState {
  constructor(savedState = {}) {
    this.state = mergeState(savedState);
  }

  get(key) {
    if (key in this.state.flags) return this.state.flags[key];
    if (key in this.state.puzzlesSolved) return this.state.puzzlesSolved[key];
    return this.state[key];
  }

  set(key, value) {
    if (key in this.state.flags) {
      this.state.flags[key] = value;
      return;
    }

    if (key in this.state.puzzlesSolved) {
      this.state.puzzlesSolved[key] = value;
      return;
    }

    this.state[key] = value;
  }

  markSolved(puzzleId) {
    if (puzzleId in this.state.puzzlesSolved) {
      this.state.puzzlesSolved[puzzleId] = true;
    }
  }

  addItem(itemId) {
    if (!this.state.inventory.includes(itemId)) {
      this.state.inventory.push(itemId);
    }
  }

  removeItem(itemId) {
    this.state.inventory = this.state.inventory.filter((item) => item !== itemId);
  }

  hasItem(itemId) {
    return this.state.inventory.includes(itemId);
  }

  markExamined(itemId) {
    if (!this.state.examined.includes(itemId)) {
      this.state.examined.push(itemId);
    }
  }

  markVisited(sceneId) {
    if (!this.state.scenesVisited.includes(sceneId)) {
      this.state.scenesVisited.push(sceneId);
    }
  }

  addHint(hintId) {
    if (!this.state.hintsShown.includes(hintId)) {
      this.state.hintsShown.push(hintId);
    }
  }

  hasStarted() {
    return Boolean(this.state.startedAt);
  }

  start() {
    if (!this.state.startedAt) {
      this.state.startedAt = Date.now();
    }
  }

  finish() {
    if (!this.state.endedAt) {
      this.state.endedAt = Date.now();
    }
  }

  snapshot() {
    return structuredClone(this.state);
  }
}
