// Connor — 1st-grade summer remediation curriculum.
// 8 weeks. Words are mostly bare strings; a few may carry an audioOverride
// (none in Connor's set today, but the schema supports it for parity with Claire).

export const CONNOR = {
  id: "connor",
  displayName: "Connor",
  grade: "1st",
  accentColor: "#FFB347",
  weeks: [
    {
      n: 1,
      focus: "Short Vowels + FLOSS Rule",
      rule: "Short-vowel words have one vowel making its short sound — a, e, i, o, or u. Some end in two of the same letter — the FLOSS rule: when a word ends in f, l, or s after a short vowel, the letter doubles up.",
      patternHighlight: "short-vowel-or-floss",
      words: [
        "cat", "bat", "pan", "hand", "trap", "lamp", "snack",
        "sit", "pig", "ship", "fish", "drill", "big",
        "hop", "shop", "frog", "block", "spot", "log",
        "bug", "hug", "puppy", "scrub", "shut", "duck",
        "web", "help", "sent", "wet", "leg", "hen",
        "will", "miss", "tell", "fluff", "press", "class"
      ],
      sentences: [
        "The big cat sat on the lamp.",
        "I will help my dad fix the trap.",
        "My puppy can hop, dig, and run fast.",
        "Tell the class to press the bell.",
        "The frog had a snack on the log."
      ]
    },
    {
      n: 2,
      focus: "Digraphs (sh, ch, th, wh) + -ng / -nk",
      rule: "When two letters team up to make one sound, that's a digraph. SH makes 'shh,' CH makes the 'ch' in chip, TH makes the 'th' in think, WH makes the 'wh' in when. Also watch for words that end in NG or NK.",
      patternHighlight: "digraph",
      words: [
        "ship", "shop", "wish", "shape", "trash", "splash",
        "chin", "chop", "chick", "much", "chip",
        "this", "that", "think", "thank", "thumb",
        "which", "whip", "wheel",
        "long", "thing", "drink", "pink"
      ],
      sentences: [
        "The chick can swim in the pond.",
        "I think I will thank my mom.",
        "We had a long, long ship trip.",
        "Which shop sells the chip?",
        "That dog has a thick wet chin."
      ]
    },
    {
      n: 3,
      focus: "Beginning Blends (2- and 3-letter)",
      rule: "Blends are when two or three letters at the start of a word each say their own sound, but they zoom together quickly. Like 'stop' starts with S and T blending. Three-letter blends like STR or SPL stack three sounds.",
      patternHighlight: "blend-start",
      words: [
        "stop", "step", "skip", "snack", "spit",
        "flap", "clap", "club", "bloom", "slid",
        "drip", "trap", "grin", "crack", "brick",
        "strap", "split", "scrub", "stream", "splash", "sprout"
      ],
      sentences: [
        "Don't stop, just step over the splash.",
        "The kid had to scrub the brick.",
        "A frog will trap a fly in one snap.",
        "The crab can crack the shell.",
        "We saw a strong stream split the road."
      ]
    },
    {
      n: 4,
      focus: "Magic E (CVCe)",
      rule: "Magic E! When a word ends in a silent E, that E reaches back over the consonant and makes the vowel say its name. 'Cap' becomes 'cape.' 'Kit' becomes 'kite.' The E doesn't make a sound — it's a magic helper.",
      patternHighlight: "magic-e",
      words: [
        "bake", "game", "shape", "space", "wake",
        "hike", "slide", "white", "drive", "slice",
        "woke", "joke", "home", "wrote", "globe",
        "flute", "cute", "tube", "use", "refuse",
        "awhile", "beside", "amuse"
      ],
      sentences: [
        "The white kite is in the sky.",
        "We had to bake a cake at home.",
        "I woke up and slid down the slide.",
        "Use the cute tube to make a game.",
        "Drive the bike on the long path."
      ]
    },
    {
      n: 5,
      focus: "Vowel Teams (ai, ay, ee, ea)",
      rule: "Vowel teams! When two vowels walk together, the first one usually does the talking and says its name. AI as in rain. AY as in play. EE as in tree. EA as in mean.",
      patternHighlight: "vowel-team",
      words: [
        "rain", "sail", "mail", "pain", "brain", "chain", "plain",
        "play", "may", "way", "day", "stay", "today", "sprayed",
        "see", "tree", "wheel",
        "read", "mean", "teach", "peanut"
      ],
      sentences: [
        "The rain made a big puddle.",
        "We play in the yard every day.",
        "I read about a green tree.",
        "The mail came in the bag.",
        "Teach me to sail the boat."
      ]
    },
    {
      n: 6,
      focus: "R-Controlled Vowels (ar, or, er, ir, ur)",
      rule: "R-controlled vowels — when R follows a vowel, R takes over and changes the vowel sound. AR sounds like car. OR sounds like fork. ER, IR, and UR all sound the same — like her, bird, and turn. Tricky!",
      patternHighlight: "r-controlled",
      words: [
        "farm", "arm", "yard", "barn", "bark", "card", "started", "smart",
        "horn", "fork", "story", "score", "thorn", "report",
        "her", "fern",
        "girl", "bird", "stir", "third", "shirt",
        "fur", "hurt", "turn", "turkey", "twirl"
      ],
      sentences: [
        "The girl saw a bird in the barn.",
        "Her horn is on the third shelf.",
        "The turkey can turn and twirl.",
        "I park my card in the yard.",
        "Tell the story about the spark."
      ]
    },
    {
      n: 7,
      focus: "oo, ew, ou, ow",
      rule: "OO can make two different sounds. Short OO like in book and foot. Long OO like in moon and school. EW makes the long OO sound, like new and blew. OU and OW can make the 'ow!' sound like in ouch and town.",
      patternHighlight: "oo-ew-ou-ow",
      words: [
        "book", "good", "foot", "wool", "shook", "cookie", "football",
        "soon", "zoo", "noon", "moon", "school", "balloon",
        "new", "blew", "chew", "threw", "cashew",
        "ouch", "house", "about", "town", "growl", "mouth"
      ],
      sentences: [
        "I took a good book to the brook.",
        "The moon shines at noon.",
        "My new shoe is in the school.",
        "The town is too far for me.",
        "Ouch, my foot is in the mud!"
      ]
    },
    {
      n: 8,
      focus: "Plurals + Contractions + Cumulative",
      rule: "Plurals — when there's more than one, we add S or ES. Add ES when the word ends in S, SH, CH, or X — like boxes and brushes. Contractions — two words squished together with an apostrophe taking the place of missing letters. 'I am' becomes 'I'm.' 'Can not' becomes 'can't.'",
      patternHighlight: "plurals-contractions",
      words: [
        "boxes", "leaves", "dresses", "brushes", "judges", "coconuts", "germs", "cents",
        "I'm", "can't", "isn't", "we'll", "didn't", "won't", "that's", "haven't",
        "trap", "shape", "split", "white", "rain", "turkey", "moon", "house"
      ],
      sentences: [
        "I'm sure she didn't lose the boxes.",
        "We'll see all the dresses on the rack.",
        "He can't find the brushes for the leaves.",
        "That's a lot of crumbs on the floor!",
        "Haven't you seen all the judges yet?"
      ]
    }
  ]
};
