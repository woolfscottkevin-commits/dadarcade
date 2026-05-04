export class InventoryBar {
  constructor({ root, gameState }) {
    this.root = root;
    this.gameState = gameState;
  }

  render() {
    this.root.textContent = this.gameState.snapshot().inventory.join(" | ");
  }
}
