// SVG edge renderer for the map graph.
// Computes line positions from node DOM elements relative to the SVG container.

export function renderEdges(svgEl, mapData, options = {}) {
  const { reachableSet, completedSet } = options;
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  const ns = "http://www.w3.org/2000/svg";

  const containerRect = svgEl.getBoundingClientRect();
  const getCenter = (id) => {
    const el = document.querySelector(`.map-node[data-id="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - containerRect.left,
      y: r.top + r.height / 2 - containerRect.top,
    };
  };

  for (let r = 1; r <= 6; r++) {
    const row = mapData.rows[r];
    if (!row) continue;
    for (const node of row) {
      const start = getCenter(node.id);
      if (!start) continue;
      for (const targetId of node.outgoing) {
        const end = getCenter(targetId);
        if (!end) continue;
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", start.x);
        line.setAttribute("y1", start.y);
        line.setAttribute("x2", end.x);
        line.setAttribute("y2", end.y);
        const isCompleted = completedSet?.has(node.id);
        const isReachableFromHere = reachableSet?.has(targetId);
        line.setAttribute("stroke", isCompleted ? "var(--suburb-beige)" : isReachableFromHere ? "var(--sunset-orange)" : "var(--coffee-brown)");
        line.setAttribute("stroke-width", isReachableFromHere ? "4" : "3");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("opacity", isReachableFromHere ? "0.95" : "0.45");
        svgEl.appendChild(line);
      }
    }
  }
}
