// Tiny localStorage wrapper. Reads + writes are wrapped in try/catch so
// quota-exceeded, private-mode, or missing-storage failures don't surface
// as console errors and block the game.

export class Persistence {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  save(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (err) {
      // Silent fallback — we keep the in-memory state going. The next
      // successful save will pick up wherever the player is now.
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (err) { /* ignore */ }
  }
}
