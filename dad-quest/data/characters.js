// Character definitions for Dad Quest, transcribed from DESIGN.md § 1.2.
// 3 starter classes: Hank, Doug, Brenda.
// `starterDeck` is an array of card IDs (matching cards.js).
// Repeated entries denote multiple copies in the starting deck.

export const CHARACTERS = [
  {
    id: "hank",
    name: "Hank",
    archetype: "The Suburban Dad",
    vibe: "weekend warrior in cargo shorts with a fully stocked tool shed; reliable, slow-burn power, hits like a truck once warmed up.",
    startingHP: 75,
    startingRelic: "lawn_flag",
    signatureMechanic: "yard_work",
    starterDeck: [
      "strike_hank", "strike_hank", "strike_hank", "strike_hank", "strike_hank",
      "defend_hank", "defend_hank", "defend_hank",
      "saturday_routine",
      "green_thumb",
    ],
    portrait: "assets/characters/char_hank.png",
    description: "Reliable, slow-burn power, hits like a truck once warmed up.",
  },
  {
    id: "doug",
    name: "Doug",
    archetype: "The Office Drone",
    vibe: "Doug from Accounting; corporate jargon as combat; fueled by coffee, undone by burnout.",
    startingHP: 65,
    startingRelic: "travel_mug",
    signatureMechanic: "caffeine",
    starterDeck: [
      "strike_doug", "strike_doug", "strike_doug", "strike_doug", "strike_doug",
      "defend_doug", "defend_doug", "defend_doug",
      "coffee_break",
      "caffeinated",
    ],
    portrait: "assets/characters/char_doug.png",
    description: "Risk-reward Caffeine engine; pile it on for big swings, but watch the Jitters tax.",
  },
  {
    id: "brenda",
    name: "Brenda",
    archetype: "The HOA President",
    vibe: "weaponized bureaucracy; clipboards, citations, and emergency meetings; a status-effect specialist who scales by burying enemies in paperwork.",
    startingHP: 70,
    startingRelic: "pocket_square",
    signatureMechanic: "citations",
    starterDeck: [
      "strike_brenda", "strike_brenda", "strike_brenda", "strike_brenda", "strike_brenda",
      "defend_brenda", "defend_brenda", "defend_brenda",
      "the_bulletin_board",
      "code_enforcement",
    ],
    portrait: "assets/characters/char_brenda.png",
    description: "Status-effect specialist who scales by stacking Citations on enemies.",
  },
];
