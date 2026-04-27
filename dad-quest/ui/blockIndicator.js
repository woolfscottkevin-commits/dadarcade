// Block indicator — small shield + number. Hidden when block === 0.

export function createBlockIndicator() {
  const root = document.createElement("div");
  root.className = "block-indicator";
  const shield = document.createElement("span");
  shield.className = "block-shield";
  shield.textContent = "🛡";
  const num = document.createElement("span");
  num.className = "block-num";
  root.appendChild(shield);
  root.appendChild(num);
  root.style.display = "none";
  return {
    el: root,
    update(block) {
      if (block > 0) {
        root.style.display = "inline-flex";
        num.textContent = String(block);
      } else {
        root.style.display = "none";
      }
    },
  };
}
