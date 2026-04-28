// Lightweight Phase 4 random events. Events are intentionally small and
// deterministic after selection so save/load can preserve the chosen event ID.

export const EVENTS = [
  {
    id: "neighborhood_bbq",
    title: "Neighborhood BBQ",
    body: "A folding table groans under potato salad, suspicious brownies, and somebody's third explanation of pellet grills.",
    choices: [
      { label: "Eat responsibly", effect: "heal_percent:20", result: "You feel better and only mildly judged." },
      { label: "Win the raffle", effect: "gold:25", result: "You leave with a gift card and a paper plate." },
    ],
  },
  {
    id: "garage_sale",
    title: "Garage Sale",
    body: "A driveway full of treasures: one kayak paddle, fourteen cables, and a relic priced with masking tape.",
    choices: [
      { label: "Buy the odd keepsake", effect: "relic:common", cost: 60, result: "It is probably useful. Probably." },
      { label: "Haggle for cash", effect: "gold:15", result: "Somehow you made money at someone else's sale." },
    ],
  },
  {
    id: "lost_receipt",
    title: "Lost Receipt",
    body: "A customer-service desk beckons. The line is short, but the fluorescent lights are undefeated.",
    choices: [
      { label: "Stand your ground", effect: "remove_card", costHp: 5, result: "A card leaves your deck. So does a little optimism." },
      { label: "Walk away", effect: "heal:6", result: "Preserving sanity is also a strategy." },
    ],
  },
  {
    id: "cul_de_sac_detour",
    title: "Cul-de-sac Detour",
    body: "A wrong turn reveals a quiet shortcut and a suspiciously helpful clipboard.",
    choices: [
      { label: "Take the shortcut", effect: "max_hp:3", result: "A tiny bit sturdier, spiritually and otherwise." },
      { label: "Read the clipboard", effect: "card_reward", result: "You learn something actionable, regrettably." },
    ],
  },
  {
    id: "coffee_cart",
    title: "Coffee Cart",
    body: "A pop-up espresso cart appears at the exact moment your willpower becomes negotiable.",
    choices: [
      { label: "Tip generously", effect: "heal:12", costGold: 20, result: "Worth every coin." },
      { label: "Ask for the strong stuff", effect: "gold:10|max_hp:-2", result: "You feel productive and slightly transparent." },
    ],
  },
];
