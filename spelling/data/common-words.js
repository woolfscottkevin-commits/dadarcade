// Common short English words from Dolch/Fry pre-K through 3rd-grade lists.
// All lowercase, all <= 7 letters, no proper nouns, no contractions.
// Used to thicken the Word Chain dictionary so the kid always has many valid
// one-letter neighbors to discover. Curriculum words from the active user are
// unioned in at runtime.

export const COMMON_WORDS = [
  // Sight words — Fry first 200, short ones
  "the", "a", "and", "of", "to", "in", "is", "it", "was", "for",
  "he", "on", "are", "as", "with", "his", "they", "at", "be", "this",
  "have", "from", "or", "one", "had", "by", "but", "not", "what", "all",
  "were", "when", "your", "can", "said", "there", "use", "an", "each", "which",
  "she", "do", "how", "their", "if", "will", "up", "other", "about", "out",
  "many", "then", "them", "these", "so", "some", "her", "would", "make", "like",
  "him", "into", "time", "has", "look", "two", "more", "go", "see", "no",
  "way", "could", "my", "than", "first", "been", "call", "who", "its", "now",
  "find", "long", "down", "day", "did", "get", "come", "made", "may", "part",
  "over", "new", "sound", "take", "only", "little", "work", "know", "place",
  "year", "live", "me", "back", "give", "most", "very", "after", "thing",
  "our", "just", "name", "good", "any", "same", "tell", "boy", "follow", "came",
  "want", "show", "form", "small", "set", "put", "end", "why", "again", "turn",
  "here", "off", "went", "old", "number", "great", "every",

  // CVC short-a
  "cab", "dab", "jab", "lab", "tab", "nab",
  "bad", "dad", "fad", "had", "lad", "mad", "pad", "sad", "tad",
  "bag", "gag", "hag", "lag", "nag", "rag", "sag", "tag", "wag", "zag",
  "ham", "jam", "ram", "yam", "slam", "swam",
  "ban", "can", "fan", "man", "ran", "tan", "van",
  "cap", "gap", "lap", "map", "nap", "rap", "sap", "tap", "yap", "zap",
  "bat", "fat", "hat", "mat", "pat", "rat", "sat", "vat",

  // CVC short-e
  "bed", "fed", "led", "red", "wed",
  "beg", "keg", "peg",
  "bet", "jet", "let", "met", "net", "pet", "vet",
  "den", "men", "pen", "ten",
  "gem", "hem",

  // CVC short-i
  "bib", "fib", "rib",
  "hid", "kid", "lid", "rid",
  "dig", "fig", "gig", "jig", "rig", "wig",
  "rim", "vim", "dim",
  "bin", "din", "fin", "kin", "pin", "tin",
  "fit", "kit", "lit",

  // CVC short-o
  "bob", "cob", "fob", "lob", "mob", "rob",
  "cod", "god", "nod", "pod",
  "cog", "fog", "hog", "jog",
  "con", "ton",
  "mop", "top",
  "cot", "dot", "got", "jot", "rot", "tot",
  "ox",

  // CVC short-u
  "cub", "hub", "pub", "sub",
  "bud", "cud", "dud",
  "lug", "pug", "tug",
  "nun", "pun",
  "cup",
  "gut", "jut", "rut",

  // Common FLOSS
  "bell", "fell", "sell", "well", "yell",
  "ball", "call", "fall", "hall", "mall", "tall", "wall",
  "doll", "roll", "toll",
  "fill", "pill", "till", "kill", "mill", "bill",
  "dull", "hull", "pull",
  "buzz", "fuzz",
  "huff", "puff",
  "less", "moss", "fuss", "boss", "loss",

  // Useful CVCe words
  "ate", "bite", "came", "cane", "cape", "case", "code",
  "cone", "cope", "core", "date", "dime", "dine", "dive",
  "dome", "dune", "duke", "fade", "fake", "fate", "fine", "fire", "five",
  "gate", "gaze", "haze", "hide", "hive", "hope", "hose", "huge",
  "kite", "lane", "late", "lime", "line", "made", "mate",
  "maze", "mice", "mile", "mine", "mole", "muse",
  "name", "nice", "nine", "node", "nose", "note",
  "page", "pale", "pane", "pile", "pine", "pipe", "pole", "pose",
  "race", "rage", "rake", "rate", "rice", "ride", "ripe", "rise",
  "rode", "rope", "rose", "rule", "safe", "sage", "sake", "sale", "same",
  "sane", "side", "site", "tale", "tame", "tape", "tide",
  "tile", "tire", "tone", "tore", "tune", "vane", "vase", "vine",
  "vote", "wade", "wage", "wake", "wave", "wide", "wife", "wine",
  "wipe", "wire", "wise", "zone",

  // Vowel-team / long-vowel basics
  "main", "gain", "vain", "wait", "bait", "fail",
  "hail", "jail", "nail", "pail", "rail", "tail",
  "bay", "gay", "hay", "jay", "lay", "nay",
  "pay", "ray", "say",
  "bee", "fee", "tee", "wee", "feel", "heel", "keel",
  "peel", "reel", "feed", "heed", "need", "reed", "seed",
  "weed",
  "beat", "feat", "heat", "meat", "neat", "seat",
  "bead", "head", "lead", "team", "beam", "seam",

  // R-controlled
  "car", "bar", "far", "jar", "mar", "par", "tar", "star",
  "art", "cart", "dart", "hart", "mart", "part", "tart",
  "harm", "arm", "harp", "carp", "tarp",
  "or", "nor", "fork", "cork", "born",
  "corn", "morn", "torn", "worn", "fort", "port", "sort",
  "per",
  "fir", "sir",
  "fur", "blur", "spur", "curl", "hurl",

  // OO / EW / OU / OW
  "boo", "coo", "moo", "too", "woo",
  "boot", "hoot", "loot", "root", "toot",
  "hook", "look", "took",
  "few", "dew", "hew", "mew", "pew", "yew",
  "out", "bout", "pout", "rout",
  "bow", "how", "low", "mow", "now", "row",
  "sow", "tow", "vow", "wow", "gown",

  // Common longer everyday words for chain neighbors
  "back", "pack", "rack", "sack", "tack", "lack", "jack", "hack",
  "deck", "neck", "peck", "sock", "duck", "luck", "muck",
  "ring", "king", "wing", "song",
  "drum", "plum", "trim",
  "grow", "glow", "show", "flow", "snow", "blow", "slow",
  "have", "love", "give", "live", "leave",
  "many", "very", "year", "this", "that",
  "play", "want", "than",
  "find", "kind", "mind", "wind",
  "send", "lend", "bend", "mend", "tend",
  "best", "rest", "test", "west", "vest",
  "lost", "cost", "host", "post",
  "list", "fist", "mist", "wrist",
  "must", "just", "dust", "rust",
  "land", "band", "sand", "hand",
  "wind", "find", "bind",
  "soft", "loft",
  "milk", "silk",
  "able", "table", "cable", "fable",
  "apple", "people",

  // Extra neighbors so single-letter Word Chain moves work for the most
  // common curriculum starting words.
  "bean", "lean", "wean", "dean", "jean", "mean",
  "beam", "seam", "team", "ream",
  "mead", "meal", "meat", "mend", "ment",
  "moan", "loan", "roan", "moat", "boat", "coat", "goat",
  "rain", "main", "gain", "pain", "vain", "lain", "wain",
  "raid", "maid", "paid", "laid", "said",
  "rail", "pail", "tail", "wail", "mail", "fail", "jail",
  "ride", "side", "tide", "hide", "wide",
  "ripe", "pipe", "wipe",
  "rode", "rope", "rose", "rote", "rove",
  "tame", "fame", "name", "game", "lame", "same",
  "tape", "cape", "gape", "nape", "rape",
  "tile", "file", "mile", "pile", "vile", "wile",
  "best", "jest", "lest", "nest", "pest", "rest", "test", "vest", "west", "zest",
  "bell", "cell", "dell", "fell", "hell", "jell", "sell", "tell", "well", "yell",
  "bill", "dill", "fill", "gill", "hill", "jill", "kill", "mill", "pill", "rill", "sill", "till", "will",
  "boll", "doll", "loll", "moll", "poll", "roll", "toll",
  "buff", "cuff", "duff", "huff", "muff", "puff", "ruff",
  "boom", "loom", "doom", "room", "zoom",
  "book", "cook", "hook", "look", "nook", "rook", "took",
  "tool", "fool", "cool", "pool", "wool",
  "rear", "year", "bear", "dear", "fear", "hear", "near", "pear", "sear", "tear", "wear",
  "stop", "shop", "slop", "atop", "stub", "stud", "stun",
  "step", "sept", "seep", "slep",
  "fish", "dish", "wish", "mish",
  "frog", "flog", "blog", "clog", "smog",
  "trap", "tram", "tran", "tray",
  "rang", "fang", "gang", "hang", "pang", "sang", "tang", "wang",
  "ring", "ding", "king", "ping", "sing", "wing", "zing",
  "thin", "thick", "think", "thank",
  "child", "wild", "mild",
  "bake", "cake", "fake", "lake", "make", "rake", "sake", "take", "wake",
  "free", "tree", "three", "flee", "thee", "tree", "agree",
  "trek", "true", "trim", "tray", "trip"
];
