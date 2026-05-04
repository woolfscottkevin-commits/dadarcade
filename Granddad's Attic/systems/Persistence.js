export class Persistence {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }
}
