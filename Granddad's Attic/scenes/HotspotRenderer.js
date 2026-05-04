export class HotspotRenderer {
  constructor({ gameState }) {
    this.gameState = gameState;
  }

  render(hotspots = [], { onActivate }) {
    const layer = document.createElement("div");
    layer.className = "hotspot-layer";

    for (const hotspot of hotspots) {
      if (!this.isEnabled(hotspot)) continue;

      const button = document.createElement("button");
      button.className = "hotspot";
      button.type = "button";
      button.setAttribute("aria-label", hotspot.label);
      button.style.left = `${hotspot.x * 100}%`;
      button.style.top = `${hotspot.y * 100}%`;
      button.style.width = `${hotspot.w * 100}%`;
      button.style.height = `${hotspot.h * 100}%`;
      button.addEventListener("click", () => onActivate(hotspot));
      layer.append(button);
    }

    return layer;
  }

  isEnabled(hotspot) {
    if (!hotspot.requires) return true;
    return hotspot.requires.every((flag) => this.gameState.get(flag));
  }
}
