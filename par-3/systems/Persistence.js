const PREFIX = "par3_";

export function getValue(key, fallback = null) {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function setValue(key, value) {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    // Private browsing can deny storage; gameplay should continue.
  }
}

export function getJSON(key, fallback) {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}
