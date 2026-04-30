// Procedural map generator for Dad Quest.
// Implements DESIGN.md § 1.7.
//   Distribution is 60% combat / 10% elite / 10% rest / 10% shop / 10% event
//   for rows 2–5. Row 1 is always combat (per DESIGN.md).
//
// Output shape (returned by generateAct(actNumber)):
//   {
//     act: 1,
//     rows: [ /* rows 1..6 */
//       [ { id: "1-0", row: 1, col: 0, type, enemy?, outgoing: [nodeIds], visited: false }, ... ],
//       ...
//       [ { id: "6-0", row: 6, col: 0, type: "boss", enemy: "ultimate_hoa_president", outgoing: [] } ]
//     ]
//   }
// Note: rows is 1-indexed for clarity (rows[0] is undefined). Iterate rows.slice(1).

const NORMAL_ENEMIES = [
  "aggressive_roomba", "sprinkler_sentry", "door_to_door_salesman", "karen_manager",
  "yappy_dog", "gossip_neighbor", "pyramid_schemer", "lost_tourist",
];
const ELITE_ENEMIES = ["the_mailman", "the_substitute_teacher", "the_personal_trainer"];

const DIST = {
  combat: 0.60,
  elite: 0.10,
  rest: 0.10,
  shop: 0.10,
  event: 0.10,
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickType(rowIdx) {
  // Row 1 always combat
  if (rowIdx === 1) return "combat";
  const r = Math.random();
  if (r < DIST.combat) return "combat";
  // Row 2 is too early for elites: players should see at least one reward
  // before a high-risk branch appears.
  if (r < DIST.combat + DIST.elite) return rowIdx === 2 ? "combat" : "elite";
  if (r < DIST.combat + DIST.elite + DIST.rest) return "rest";
  if (r < DIST.combat + DIST.elite + DIST.rest + DIST.shop) return "shop";
  return "event";
}

function buildLayerEdges(numSrc, numDst) {
  // Each source produces 1–2 outgoing edges. Edges must be planar
  // (non-crossing), which means: when sources are visited in increasing
  // order, their assigned destination indices are non-decreasing.
  // Strategy: walk left-to-right with a sliding cursor.
  const edges = [];
  let cursor = 0;
  for (let i = 0; i < numSrc; i++) {
    const remainingSrc = numSrc - i;
    if (i === numSrc - 1) {
      // last source must reach all remaining destinations
      for (let d = cursor; d < numDst; d++) edges.push([i, d]);
      continue;
    }
    // We need every dst in [cursor, numDst) to be covered by *some* future
    // source. Future capacity is 2 * (remainingSrc - 1) max — but each
    // future source can also overlap with previous, so realistic min remaining
    // dst per future source is 1.
    const dstLeft = numDst - cursor;
    const futureSrc = remainingSrc - 1;
    // Pick how many edges THIS source emits (1 or 2)
    let k;
    if (dstLeft - 2 > futureSrc * 2) {
      // Too many dsts for the rest — this source must take 2
      k = 2;
    } else if (dstLeft - 1 < futureSrc) {
      // Too few dsts to share — this source takes only 1
      k = 1;
    } else {
      k = Math.random() < 0.5 ? 1 : 2;
    }
    // Emit edges
    for (let j = 0; j < k; j++) {
      const d = cursor + j;
      if (d <= numDst - 1) edges.push([i, d]);
    }
    // Advance cursor: overlap by 1 (Slay-the-Spire-style fork) if k==2,
    // otherwise step forward by 1.
    cursor = Math.min(numDst - 1, cursor + (k === 2 ? 1 : 1));
  }
  // Defensive: ensure every dst has ≥1 incoming
  const incoming = new Array(numDst).fill(0);
  for (const [, d] of edges) incoming[d]++;
  for (let d = 0; d < numDst; d++) {
    if (incoming[d] === 0) {
      // Pick the source whose nearest existing edge is closest to d.
      let bestSrc = 0;
      let bestDelta = Infinity;
      for (let s = 0; s < numSrc; s++) {
        const myDsts = edges.filter(([sx]) => sx === s).map(([, dx]) => dx);
        if (myDsts.length === 0) continue;
        for (const dx of myDsts) {
          const delta = Math.abs(dx - d);
          if (delta < bestDelta) { bestDelta = delta; bestSrc = s; }
        }
      }
      // Adding this edge can only break planarity if it would cross with
      // an edge from src bestSrc to a dst on the wrong side of d, or any
      // other src's edges. Practical mitigation: if it would cross, fall
      // back to adding from the source closest in normalized position.
      edges.push([bestSrc, d]);
    }
  }
  // Sort + dedupe
  const seen = new Set();
  const dedup = [];
  for (const e of edges) {
    const key = e.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(e);
  }
  return dedup;
}

// Validate that no two edges cross. Two edges (s1,d1)-(s2,d2) cross iff
// (s1 < s2 && d1 > d2) || (s1 > s2 && d1 < d2). We allow shared endpoints.
function edgesAreNonCrossing(edges) {
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      if (a === c || b === d) continue;
      if ((a < c && b > d) || (a > c && b < d)) return false;
    }
  }
  return true;
}

// If the planar attempt fails (rare given the algorithm above), retry up to N times.
function buildPlanarLayer(numSrc, numDst) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const edges = buildLayerEdges(numSrc, numDst);
    if (edgesAreNonCrossing(edges)) return edges;
  }
  // Fallback: deterministic minimal planar layout.
  const edges = [];
  for (let i = 0; i < numSrc; i++) {
    const d = Math.min(numDst - 1, Math.round(i * (numDst - 1) / Math.max(1, numSrc - 1)));
    edges.push([i, d]);
  }
  for (let d = 0; d < numDst; d++) {
    if (!edges.some(([, dd]) => dd === d)) {
      const s = Math.min(numSrc - 1, Math.round(d * (numSrc - 1) / Math.max(1, numDst - 1)));
      edges.push([s, d]);
    }
  }
  return edges;
}

function pickEnemy(prevRowEnemies, kind) {
  const pool = kind === "elite" ? ELITE_ENEMIES : NORMAL_ENEMIES;
  for (let attempt = 0; attempt < 5; attempt++) {
    const cand = pick(pool);
    if (!prevRowEnemies.includes(cand)) return cand;
  }
  return pick(pool); // give up after retries; allow duplicate adjacency
}

function ensureUtilityNode(rows, type, preferredRows, parentsById) {
  for (let r = 2; r <= 5; r++) {
    if (rows[r].some((n) => n.type === type)) return;
  }
  // Pick a combat node whose parents don't already have this type, so the
  // forced-conversion doesn't reintroduce back-to-back-on-a-path clustering.
  for (const r of preferredRows) {
    const safe = rows[r].filter((n) => {
      if (n.type !== "combat") return false;
      const parents = (parentsById && parentsById.get(n.id)) || [];
      return !parents.some((p) => p.type === type);
    });
    if (safe.length > 0) {
      pick(safe).type = type;
      return;
    }
  }
  // Fallback: if every combat node has a same-type parent, place it anyway.
  for (const r of preferredRows) {
    const candidates = rows[r].filter((n) => n.type === "combat");
    if (candidates.length > 0) {
      pick(candidates).type = type;
      return;
    }
  }
}

export function generateAct(actNumber) {
  // Row counts: rows 1..5 each have 3 or 4 nodes. Row 6 = boss (1 node).
  const rowCounts = [null]; // 1-indexed
  for (let r = 1; r <= 5; r++) rowCounts[r] = rand(3, 4);
  rowCounts[6] = 1;

  // 1. Build node grid (no types yet for rows 2..5)
  const rows = [null];
  for (let r = 1; r <= 5; r++) {
    rows[r] = [];
    for (let c = 0; c < rowCounts[r]; c++) {
      rows[r].push({
        id: `a${actNumber}-${r}-${c}`,
        row: r, col: c,
        type: r === 1 ? "combat" : null, // row 1 forced
        enemy: null,
        outgoing: [],
        visited: false,
      });
    }
  }
  rows[6] = [{
    id: `a${actNumber}-6-0`,
    row: 6, col: 0,
    type: "boss",
    enemy: "ultimate_hoa_president",
    outgoing: [],
    visited: false,
  }];

  // 2. Build edges first so we can use real parent->child paths for the
  //    "no two specials in a row on the same path" check.
  for (let r = 1; r <= 5; r++) {
    const src = rows[r];
    const dst = rows[r + 1];
    const edges = buildPlanarLayer(src.length, dst.length);
    for (const [s, d] of edges) {
      src[s].outgoing.push(dst[d].id);
    }
  }

  // Build a parents lookup keyed by node id so type assignment can ask
  // "does any node leading TO me have the same type?".
  const parentsById = new Map();
  for (let r = 1; r <= 5; r++) {
    for (const src of rows[r]) {
      for (const childId of src.outgoing) {
        if (!parentsById.has(childId)) parentsById.set(childId, []);
        parentsById.get(childId).push(src);
      }
    }
  }

  // 3. Assign types for rows 2..5 with anti-clustering: a node's type is
  //    re-rolled (up to 3 attempts) if any of its parents already has the
  //    same special type (elite/rest/shop/event). Combat is always allowed.
  const SPECIAL = new Set(["elite", "rest", "shop", "event"]);
  const conflictsWithParents = (node, type) => {
    if (!SPECIAL.has(type)) return false;
    const parents = parentsById.get(node.id) || [];
    return parents.some((p) => p.type === type);
  };
  for (let r = 2; r <= 5; r++) {
    for (const node of rows[r]) {
      let t = pickType(r);
      for (let i = 0; i < 3 && conflictsWithParents(node, t); i++) {
        t = pickType(r);
      }
      // If RNG kept landing on the same special, fall back to combat to
      // guarantee no back-to-back same-type path.
      if (conflictsWithParents(node, t)) t = "combat";
      node.type = t;
    }
  }

  // A fun run needs visible planning texture every act, not just a combat gauntlet.
  // Keep the 60/10/10/10/10 distribution as the base, then guarantee at least
  // one rest, one shop, and one event by converting combat nodes when RNG misses.
  ensureUtilityNode(rows, "rest", [5, 4, 3, 2], parentsById);
  ensureUtilityNode(rows, "shop", [3, 4, 2, 5], parentsById);
  ensureUtilityNode(rows, "event", [2, 3, 4, 5], parentsById);

  // 4. Assign enemies to combat / elite nodes, avoiding back-to-back same enemy
  let prevRowEnemies = [];
  for (let r = 1; r <= 5; r++) {
    const thisRowEnemies = [];
    for (const node of rows[r]) {
      if (node.type === "combat") {
        node.enemy = pickEnemy(prevRowEnemies, "combat");
        thisRowEnemies.push(node.enemy);
      } else if (node.type === "elite") {
        node.enemy = pickEnemy(prevRowEnemies, "elite");
        thisRowEnemies.push(node.enemy);
      }
    }
    prevRowEnemies = thisRowEnemies;
  }

  return { act: actNumber, rows };
}

// Helper used by the map scene to find a node by id.
export function findNode(map, id) {
  if (!map) return null;
  for (let r = 1; r <= 6; r++) {
    const row = map.rows[r];
    if (!row) continue;
    const n = row.find((nd) => nd.id === id);
    if (n) return n;
  }
  return null;
}

// Reachable nodes from current position (or all of row 1 if position is null).
export function reachableNodeIds(map, position, completedNodes) {
  if (!map) return [];
  const completed = new Set(completedNodes || []);
  if (!position) {
    return map.rows[1].map((n) => n.id).filter((id) => !completed.has(id));
  }
  const node = findNode(map, position);
  if (!node) return [];
  return node.outgoing.filter((id) => !completed.has(id));
}
