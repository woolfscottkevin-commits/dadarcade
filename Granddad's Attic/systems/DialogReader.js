export class DialogReader {
  constructor(root) {
    this.root = root;
  }

  show(text) {
    this.root.dispatchEvent(new CustomEvent("attic:dialog", { detail: { text } }));
  }
}
