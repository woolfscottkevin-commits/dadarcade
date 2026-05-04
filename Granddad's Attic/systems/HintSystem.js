export class HintSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  currentHint() {
    if (this.gameState.get("safeUnlocked")) return "Read what he left for you.";
    if (this.gameState.hasItem("BADGE")) return "Numbers become letters when you know the grid.";
    if (this.gameState.get("hint_badge_realized")) return "The jacket deserves another look.";
    if (this.gameState.get("radioMessageHeard")) return "Five notes. Not a tune. A word.";
    if (this.gameState.get("diaryUnlocked")) return "Margaret's birthday was always their station.";
    return "Every old photograph has two sides.";
  }
}
