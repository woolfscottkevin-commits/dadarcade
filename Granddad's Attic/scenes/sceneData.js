const backToCenter = [
  { id: "back", label: "Return to center", x: 0.42, y: 0.82, w: 0.16, h: 0.14, action: "goToScene", target: "center" }
];

export const sceneData = {
  center: {
    label: "Center attic view",
    image: "assets/scenes/center.webp",
    caption: "The attic is quiet except for the dust moving through the light.",
    hotspots: [
      { id: "desk", label: "Look at the desk", x: 0.02, y: 0.31, w: 0.23, h: 0.42, action: "goToScene", target: "desk" },
      { id: "footlocker", label: "Look at the footlocker", x: 0.31, y: 0.54, w: 0.29, h: 0.25, action: "goToScene", target: "footlocker" },
      { id: "coatrack", label: "Look at the coatrack", x: 0.78, y: 0.18, w: 0.17, h: 0.56, action: "goToScene", target: "coatrack" },
      { id: "painting", label: "Look at the painting", x: 0.45, y: 0.2, w: 0.17, h: 0.2, action: "goToScene", target: "painting" },
      { id: "window", label: "Look toward the window", x: 0.61, y: 0.07, w: 0.21, h: 0.34, action: "goToScene", target: "window" }
    ]
  },
  desk: {
    label: "Desk view",
    image: "assets/scenes/desk.webp",
    caption: "The desk holds the old radio and the small things Granddad could never throw away.",
    hotspots: [
      { id: "radio", label: "Examine the radio", x: 0.69, y: 0.36, w: 0.26, h: 0.35, action: "radio" },
      { id: "desk-back", label: "Return to center", x: 0.42, y: 0.82, w: 0.16, h: 0.14, action: "goToScene", target: "center" }
    ]
  },
  footlocker: {
    label: "Footlocker close-up",
    image: "assets/scenes/footlocker.webp",
    caption: "The brass lock waits below a faded wedding photograph.",
    hotspots: [
      { id: "footlocker-lock", label: "Try the footlocker lock", x: 0.33, y: 0.5, w: 0.32, h: 0.18, action: "footlocker" },
      { id: "wedding-photo", label: "Turn over the wedding photograph", x: 0.08, y: 0.17, w: 0.21, h: 0.25, action: "weddingPhoto" },
      ...backToCenter
    ]
  },
  footlockerOpen: {
    label: "Open footlocker",
    image: "assets/scenes/footlocker-open.webp",
    caption: "Inside are a brass key and a locked diary.",
    hotspots: [
      { id: "take-rewards", label: "Take the key and diary", x: 0.35, y: 0.34, w: 0.3, h: 0.3, action: "takeFootlockerRewards" },
      ...backToCenter
    ]
  },
  coatrack: {
    label: "Coatrack view",
    image: "assets/scenes/coatrack.webp",
    caption: "Granddad's jacket still holds its shape.",
    hotspots: [
      { id: "jacket", label: "Search the jacket pocket", x: 0.02, y: 0.13, w: 0.25, h: 0.68, action: "jacket" },
      ...backToCenter
    ]
  },
  painting: {
    label: "Painting view",
    image: "assets/scenes/painting.webp",
    caption: "The frame hangs just crooked enough to invite a closer look.",
    hotspots: [
      { id: "move-painting", label: "Move the painting", x: 0.29, y: 0.36, w: 0.42, h: 0.28, action: "painting" },
      ...backToCenter
    ]
  },
  paintingMoved: {
    label: "Painting moved",
    image: "assets/scenes/painting-moved.webp",
    caption: "Behind the painting, a safe sits flush with the attic wall.",
    hotspots: [
      { id: "safe", label: "Try the safe", x: 0.23, y: 0.39, w: 0.32, h: 0.36, action: "safe" },
      ...backToCenter
    ]
  },
  safeOpen: {
    label: "Open safe",
    image: "assets/scenes/safe-open.webp",
    caption: "A folded letter waits inside the safe.",
    hotspots: [
      { id: "letter", label: "Read the final letter", x: 0.22, y: 0.34, w: 0.22, h: 0.36, action: "letter" },
      ...backToCenter
    ]
  },
  window: {
    label: "Window view",
    image: "assets/scenes/window.webp",
    caption: "Morning light catches in the dust above the old floorboards.",
    hotspots: backToCenter
  },
  floorboardReveal: {
    label: "Loose floorboard",
    image: "assets/scenes/floorboard-reveal.webp",
    caption: "A plank has lifted from the floor. There is something hidden below.",
    hotspots: [
      { id: "music-box", label: "Reach below the loose floorboard", x: 0.43, y: 0.45, w: 0.27, h: 0.27, action: "takeMusicBox" },
      ...backToCenter
    ]
  },
  centerLate: {
    label: "Late attic view",
    image: "assets/scenes/center-late.webp",
    caption: "The attic feels different now, as if it has exhaled.",
    hotspots: [
      { id: "safe-open", label: "Return to the safe", x: 0.45, y: 0.18, w: 0.2, h: 0.28, action: "goToScene", target: "safeOpen" }
    ]
  }
};
