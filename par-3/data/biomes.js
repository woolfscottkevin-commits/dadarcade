export const BIOMES = {
  grass: {
    id: "grass",
    label: "Grass",
    colors: {
      rough: 0x2d5a28,
      fairway: 0x4a8b3f,
      green: 0x79b85c,
      sand: 0xe8d896,
      water: 0x4a90e2,
      border: 0x143f24,
      stripe: 0x5c9e4d,
    },
    surfaceFriction: {
      fairway: 0.985,
      rough: 0.95,
      sand: 0.85,
      green: 0.975,
    },
    rollout: 0.72,
    bounce: 0.42,
  },
};

export const DIFFICULTIES = {
  kid: {
    id: "kid",
    label: "Kid",
    cupRadius: 24,
    windScale: 0.5,
    aimScale: 1,
    aimJitter: 0,
    bunkerFriction: 0.92,
    dropAtTee: false,
  },
  normal: {
    id: "normal",
    label: "Normal",
    cupRadius: 16,
    windScale: 1,
    aimScale: 0.75,
    aimJitter: 0.05,
    bunkerFriction: 0.85,
    dropAtTee: false,
  },
  hard: {
    id: "hard",
    label: "Hard",
    cupRadius: 12,
    windScale: 1.3,
    aimScale: 0.5,
    aimJitter: 0.15,
    bunkerFriction: 0.8,
    dropAtTee: true,
  },
};

export const DEFAULT_DIFFICULTY = "normal";
