// SVG edge renderer for the map graph.
// Computes soft sidewalk-style paths from node DOM elements relative to the SVG container.

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
        const isCompleted = completedSet?.has(node.id);
        const isReachableFromHere = reachableSet?.has(targetId);
        const midY = (start.y + end.y) / 2;
        const bend = Math.max(-90, Math.min(90, (end.x - start.x) * 0.18));
        const d = `M ${start.x} ${start.y} C ${start.x + bend} ${midY}, ${end.x - bend} ${midY}, ${end.x} ${end.y}`;
        const state = isCompleted ? "completed" : isReachableFromHere ? "reachable" : "locked";

        const underlay = document.createElementNS(ns, "path");
        underlay.setAttribute("d", d);
        underlay.setAttribute("class", `map-route-path map-route-path-underlay map-route-path-${state}`);
        svgEl.appendChild(underlay);

        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", d);
        path.setAttribute("class", `map-route-path map-route-path-center map-route-path-${state}`);
        svgEl.appendChild(path);
      }
    }
  }
}
