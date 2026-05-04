export class Inventory {
  constructor(gameState) {
    this.gameState = gameState;
  }

  add(itemId) {
    this.gameState.addItem(itemId);
  }

  has(itemId) {
    return this.gameState.hasItem(itemId);
  }
}
