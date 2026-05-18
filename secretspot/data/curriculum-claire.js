// Claire — 3rd-grade curriculum. 9 modules × 3 weeks = 27 weeks total.
//
// Words are typically plain strings. A few entries are { word, audioOverride }
// objects — the audioOverride is what TTS speaks. This unlocks the M7W1
// abbreviations (Mr., Mrs., Ms., Dr., Rd., St., Ave.) which otherwise sound
// confusing when read literally by speech synthesis.
//
// All 27 × 5 = 135 dictation sentences are authored inline. Sentence style is
// 6-14 words, age-appropriate for a 9yo, uses 2-3 of the module's words, and
// reads naturally aloud.

export const CLAIRE = {
  id: "claire",
  displayName: "Claire",
  grade: "3rd",
  accentColor: "#C77DFF",
  weeks: [
    {
      n: 1, moduleCode: "M1W1",
      focus: "Short Vowels",
      rule: "Short-vowel words have one vowel making its short sound — a, e, i, o, or u. Some end in two of the same letter — the FLOSS rule: when a word ends in f, l, or s after a short vowel, double the letter.",
      patternHighlight: "short-vowel-or-floss",
      words: ["crop","plan","thing","smell","shut","sticky","spent","lunch","pumpkin","clock","gift","class","skip","swing","crash","dish","frog","plum","planning","sprint","wedge","problem"],
      sentences: [
        "We spent lunch planning the next class trip.",
        "The pumpkin had a sticky thing inside.",
        "I had to shut the gift box before he saw.",
        "The clock made a strange smell when it broke.",
        "Don't skip the swing on the way home."
      ]
    },
    {
      n: 2, moduleCode: "M1W2",
      focus: "VCe Spellings",
      rule: "Magic E! When a word ends in silent E, that E reaches back over the consonant and makes the vowel say its name. 'Cap' becomes 'cape.' The E doesn't make a sound — it's a magic helper.",
      patternHighlight: "magic-e",
      words: ["spoke","mile","save","excuse","cone","invite","cube","price","erase","ripe","broke","flame","like","rule","spent","swing","class","lunch","surprise","decide","clothes","strange"],
      sentences: [
        "We spoke about the surprise after class ended.",
        "Try to save a mile for the long path.",
        "The cube of ice broke off the cone.",
        "I had to erase the price on the tag.",
        "Decide if you like the strange new flame."
      ]
    },
    {
      n: 3, moduleCode: "M1W3",
      focus: "More Long a, Long e Spellings",
      rule: "Long-a and long-e have many spellings. AI as in 'rain' and AY as in 'play' both say long-a. EA as in 'real,' EE as in 'sweet,' and sometimes just E say long-e.",
      patternHighlight: "vowel-team",
      words: ["lay","real","trail","sweet","today","dream","sleep","tea","treat","afraid","leave","bait","speed","lead","erase","invite","excuse","spoke","flavor","even","between","pavement"],
      sentences: [
        "I had a sweet dream about a winding trail.",
        "Today I will lead the way down the pavement.",
        "Don't leave the bait between the rocks.",
        "She spoke at speed about her favorite flavor.",
        "Even after tea, I was still afraid of sleep."
      ]
    },
    {
      n: 4, moduleCode: "M2W1",
      focus: "More Long o Spellings",
      rule: "Long-o shows up many ways. OA in 'load,' OW in 'yellow,' OE in 'toe,' OLD in 'told,' and tricky cases like 'almost.'",
      patternHighlight: "vowel-team",
      words: ["load","open","told","yellow","soak","shadow","toe","follow","glow","sold","window","almost","boast","does","trail","afraid","sleep","dream","chosen","approach","alone","below"],
      sentences: [
        "He told me to open the yellow window.",
        "The shadow below the trail almost made me jump.",
        "I follow the soft glow into the snow.",
        "She was chosen to approach the lonely cabin.",
        "Don't boast about that load you almost sold."
      ]
    },
    {
      n: 5, moduleCode: "M2W2",
      focus: "More Long i Spellings",
      rule: "Long-i spellings beyond magic-E: IGH as in 'sight,' IND as in 'mind,' IE as in 'pie,' and quirky cases like 'height.'",
      patternHighlight: "vowel-team",
      words: ["slight","mild","sight","pie","mind","tie","pilot","might","lie","tight","blind","fight","height","midnight","follow","toe","boast","open","frighten","silent","excite","combine"],
      sentences: [
        "The pilot saw a slight light at midnight.",
        "I might tie the pie box a bit tight.",
        "Don't lie about the height of that hill.",
        "The blind man followed a silent path with care.",
        "His mind began to excite when the fight started."
      ]
    },
    {
      n: 6, moduleCode: "M2W3",
      focus: "More Short and Long Vowels",
      rule: "Mixed practice. Watch for short vowels (math, socks, stuff), long vowels (toast, easy, paid), and words that combine both like 'sticky' and 'shiny.'",
      patternHighlight: "short-vowel-or-floss",
      words: ["math","toast","easy","socks","Friday","stuff","paid","cheese","eighteen","elbow","program","shiny","piles","sticky","slight","pilot","height","mind","holiday","moment","eager","blossom"],
      sentences: [
        "On Friday I had toast with cheese for lunch.",
        "Math is easy when I take it one moment at a time.",
        "She was eager to wear shiny socks on the holiday.",
        "My elbow bumped piles of sticky stuff on the desk.",
        "We paid for the program about the spring blossom."
      ]
    },
    {
      n: 7, moduleCode: "M3W1",
      focus: "Three-Letter Blends",
      rule: "Three letters blending at the start — SCR, SPL, SPR, SQU, STR — each letter still says its sound, just zoomed together. Like 'splash' starts S-P-L all blending.",
      patternHighlight: "three-letter-blend",
      words: ["splash","strange","scratch","squeeze","squeak","squeal","screen","split","splat","sprain","sprint","strip","strap","scrap","easy","eighteen","elbow","program","straddle","splurge","scrawl","squirrel"],
      sentences: [
        "A loud splash made the squirrel sprint up the tree.",
        "Try not to scratch the screen with that scrap.",
        "I had to squeeze the strap before it would split.",
        "That strange squeak came from a broken sprain brace.",
        "She made a quick splat with paint on the strip."
      ]
    },
    {
      n: 8, moduleCode: "M3W2",
      focus: "Words with /j/, /k/, and /kw/",
      rule: "The /j/ sound can be spelled DGE at the end ('ledge'), J at the start, or G before E or I. /K/ can be C, K, or CK. /KW/ is always QU as in 'quick.'",
      patternHighlight: "j-s-sound",
      words: ["ledge","nudge","smudge","budge","ridge","wedge","quiet","circus","second","quart","quick","comma","stage","huge","scratch","splash","sprint","squeal","quiver","constant","budget","enrage"],
      sentences: [
        "I had to nudge the huge ledge so it would budge.",
        "The quiet second before the circus is the best.",
        "Be quick — bring the quart up to the stage.",
        "A small smudge on the ridge made the photo strange.",
        "Don't let the comma in the budget enrage you."
      ]
    },
    {
      n: 9, moduleCode: "M3W3",
      focus: "Silent Consonants",
      rule: "Some letters are silent. KN at the start sounds like N — 'knee,' 'know.' WR at the start sounds like R — 'write,' 'wrong.' The K and W are quiet helpers.",
      patternHighlight: "silent-letter",
      words: ["wreck","knee","wrap","knot","knife","write","wring","knew","knock","knight","wrong","wrench","wrist","wrote","wedge","second","quart","stage","kneel","knitting","wreath","unwrapped"],
      sentences: [
        "He knew the knot in his wrist would not budge.",
        "I had to kneel and wrap the wreath around the post.",
        "She wrote that the wrong wrench broke the door.",
        "Don't knock on the knight's door after he is hurt.",
        "The wreck near the road bent the knife in half."
      ]
    },
    {
      n: 10, moduleCode: "M4W1",
      focus: "Spelling the /ch/ Sound",
      rule: "The /ch/ sound can be CH ('peach,' 'each') or TCH after a short vowel ('fetch,' 'hatch'). Use TCH when a short vowel comes right before.",
      patternHighlight: "ch-spelling",
      words: ["fetch","stretch","roach","each","peach","screech","snatch","hatch","branch","clutch","trench","cinch","ouch","couch","wreck","knock","wrist","wrong","stretcher","switching","launch","slouch"],
      sentences: [
        "Each peach in the basket has a different shape.",
        "Don't snatch the branch before it has time to hatch.",
        "I had to stretch on the couch to fetch the remote.",
        "Ouch, my wrist hurts when I clutch the bag too hard.",
        "It's a cinch to launch a kite from the open trench."
      ]
    },
    {
      n: 11, moduleCode: "M4W2",
      focus: "Spelling the /ou/ Sound",
      rule: "The /ou/ sound — like 'ouch!' — is usually OU ('round,' 'cloud') or OW ('clown,' 'crown'). Both make the same 'ow' sound.",
      patternHighlight: "ou-sound",
      words: ["clown","round","bow","cloud","power","crown","thousand","crowd","sound","count","powder","blouse","frown","pound","couch","peach","stretch","trench","mountain","announce","vowel","coward"],
      sentences: [
        "The clown in the crowd took a long, slow bow.",
        "I heard a strange sound from the mountain at night.",
        "A thousand drops of cloud powder fell on her blouse.",
        "Don't frown — your crown is still on straight.",
        "Count to ten and announce that you are not a coward."
      ]
    },
    {
      n: 12, moduleCode: "M4W3",
      focus: "Spelling the /aw/ Sound",
      rule: "The /aw/ sound has many spellings: AW ('crawl,' 'lawn'), AU ('haunt'), AL ('talk,' 'salt'), and just O ('cross,' 'cost').",
      patternHighlight: "aw-sound",
      words: ["talk","cross","awful","law","cloth","cost","crawl","chalk","also","raw","salt","wall","lawn","always","thousand","powder","blouse","frown","squawk","haunt","stalk","sauce"],
      sentences: [
        "Don't talk while you cross the lawn after rain.",
        "The awful smell of raw fish will haunt me forever.",
        "She wrote with chalk on a small wall by the gate.",
        "Always add a little salt to the warm sauce.",
        "The cost of cloth is also higher than last year."
      ]
    },
    {
      n: 13, moduleCode: "M5W1",
      focus: "Spelling the /oi/ Sound",
      rule: "The /oi/ sound — like 'oink' — is OI in the middle of a word ('point,' 'coin') and OY at the end ('boy,' 'joy').",
      patternHighlight: "oi-sound",
      words: ["joy","point","voice","join","oil","coin","noise","spoil","toy","joint","boy","soil","choice","boil","always","crawl","awful","also","moisture","voyage","avoid","joyful"],
      sentences: [
        "It was a joy to hear her voice on the phone.",
        "Try to avoid the noise so you don't spoil the show.",
        "Point to the coin you want from the small pile.",
        "Don't join the boy who likes to ruin every toy.",
        "Make a joyful choice and boil the rice with oil."
      ]
    },
    {
      n: 14, moduleCode: "M5W2",
      focus: "Homophones",
      rule: "Homophones sound the same but mean different things and spell differently. 'Hole' is a gap; 'whole' means all. 'Its' shows possession; 'it's' means it is. Read the sentence to know which one fits.",
      patternHighlight: "homophones",
      words: ["hole","whole","its","it's","hear","here","won","one","our","hour","their","there","fur","fir","voice","noise","joy","spoil","piece","peace","waste","waist"],
      sentences: [
        "I can hear that the whole hour passed in peace.",
        "We won one piece of fruit and ate it right here.",
        "Their fir tree is over there next to our garden.",
        "It's a small hole, but its edges are very sharp.",
        "Don't waste this lovely fur jacket — wear it at the waist."
      ]
    },
    {
      n: 15, moduleCode: "M5W3",
      focus: "Contractions",
      rule: "A contraction squishes two words with an apostrophe replacing the missing letters. 'Would have' becomes 'would've.' 'Are not' becomes 'aren't.' The apostrophe holds the spot where letters left.",
      patternHighlight: "plurals-contractions",
      words: ["I'd","aren't","haven't","doesn't","hadn't","would've","wouldn't","should've","we'd","weren't","hasn't","couldn't","he'd","they'd","whole","their","fur","hear","shouldn't","won't","contraction","placement"],
      sentences: [
        "I'd help if you would've called me a bit sooner.",
        "We weren't sure if their friends could come too.",
        "Doesn't he know we hadn't heard the whole story?",
        "You shouldn't say it won't work if you haven't tried.",
        "She hasn't told us where the placement of the comma should go."
      ]
    },
    {
      n: 16, moduleCode: "M6W1",
      focus: "Vowel + /r/ Sounds",
      rule: "When R follows a vowel, R takes over the sound. AR sounds like 'car' or 'mark.' OR sounds like 'horse' or 'storm.' The R rules!",
      patternHighlight: "r-controlled",
      words: ["horse","mark","storm","market","acorn","large","March","north","barking","stork","thorn","forest","chore","restore","doesn't","weren't","couldn't","they'd","horsepower","before","artist","carve"],
      sentences: [
        "Mark saw a large horse during the loud March storm.",
        "We took the north road past the busy market.",
        "Before sunset, an artist began to carve the small acorn.",
        "A barking dog scared a stork out of the forest.",
        "It's my chore to restore the path after the thorn bush grows."
      ]
    },
    {
      n: 17, moduleCode: "M6W2",
      focus: "Vowel + /r/ Sounds in nurse",
      rule: "ER, IR, UR, and even OR (in 'work,' 'word') can all make the 'er' sound. Same sound, different spellings — practice tells you which to use.",
      patternHighlight: "r-controlled",
      words: ["nurse","work","shirt","hurt","chirp","word","serve","curly","dirt","worry","turn","stir","firm","skirt","forest","market","storm","horse","churning","swerve","squirm","twirling"],
      sentences: [
        "The nurse can serve a warm drink to anyone who is hurt.",
        "Don't worry about the dirt on your new shirt.",
        "Turn the spoon and stir until the soup is firm.",
        "I heard a small chirp from the curly bush in the yard.",
        "She did a twirling spin in her long blue skirt."
      ]
    },
    {
      n: 18, moduleCode: "M6W3",
      focus: "Vowel + /r/ Sounds in air and fear",
      rule: "AIR and EAR can sound like 'air' ('chair,' 'wear,' 'pear') or like 'ear' ('fear,' 'near,' 'beard'). Listen carefully — the sound tells you the meaning.",
      patternHighlight: "r-controlled",
      words: ["air","wear","chair","fear","bare","bear","hair","care","pear","pair","share","near","tear","beard","worry","nurse","serve","firm","shearing","stairway","bleary","careless"],
      sentences: [
        "Take care to share the pear with your little sister.",
        "I have no fear of the bear with the funny beard.",
        "Pull up a chair near the window for some fresh air.",
        "Don't tear your hair — we'll find the missing pair.",
        "Bare feet on cold grass make her shiver in the air."
      ]
    },
    {
      n: 19, moduleCode: "M7W1",
      focus: "Compound Words and Abbreviations",
      rule: "Compound words mash two words together — 'birth' + 'day' = 'birthday.' Abbreviations are shortened forms with a period — Mr., Mrs., Dr., St., Ave.",
      patternHighlight: "compound-or-abbrev",
      words: [
        "birthday","anyone","afternoon","airplane","grandmother","faraway","daylight",
        { word: "Mr.",  audioOverride: "Spell the abbreviation for Mister. Capital M, R, period." },
        { word: "Mrs.", audioOverride: "Spell the abbreviation for Misses. Capital M, R, S, period." },
        { word: "Ms.",  audioOverride: "Spell the abbreviation for Mizz. Capital M, S, period." },
        { word: "Dr.",  audioOverride: "Spell the abbreviation for Doctor. Capital D, R, period." },
        { word: "Rd.",  audioOverride: "Spell the abbreviation for Road. Capital R, D, period." },
        { word: "St.",  audioOverride: "Spell the abbreviation for Street. Capital S, T, period." },
        { word: "Ave.", audioOverride: "Spell the abbreviation for Avenue. Capital A, V, E, period." },
        "chair","pair","beard","fear","nighttime","granddaughter","eyesight","underground"
      ],
      sentences: [
        "On my birthday, my grandmother flew home from a faraway city.",
        "Anyone can ride this airplane after the bright daylight.",
        "We took a long afternoon walk through the underground tunnel.",
        "His eyesight at nighttime is better than his granddaughter's.",
        "We saw the airplane fly faraway through the daylight clouds."
      ]
    },
    {
      n: 20, moduleCode: "M7W2",
      focus: "Irregular Plurals",
      rule: "Most plurals just add S, but some words change. 'Leaf' becomes 'leaves' (f → v + es). 'Goose' becomes 'geese.' 'Woman' becomes 'women.' These don't follow a rule — you memorize them.",
      patternHighlight: "irregular-plural",
      words: ["leaf","leaves","loaf","loaves","knife","knives","louse","lice","wolf","wolves","goose","geese","woman","women","calves","oxen","shelves","echoes","anyone","faraway","afternoon","airplane"],
      sentences: [
        "Three women picked up the leaves and put them in bags.",
        "The wolves howled while two calves walked through the woods.",
        "I see four loaves of bread on the kitchen shelves.",
        "Two geese flew over the field where the oxen rested.",
        "Don't leave the knives near the louse on the floor."
      ]
    },
    {
      n: 21, moduleCode: "M7W3",
      focus: "Words with /oo/ Sounds",
      rule: "OO has two sounds — short OO like 'book' and long OO like 'moon.' Long OO can also be spelled OO ('cool'), EW ('drew'), UE ('blue'), or U_E ('feud').",
      patternHighlight: "oo-sound",
      words: ["mood","wooden","drew","smooth","blue","balloon","true","crooked","chew","tooth","hooves","cool","pooch","feud","wolves","women","leaves","knives","foolproof","spoonful","footstool","scrapbook"],
      sentences: [
        "I drew a blue balloon on the page of my scrapbook.",
        "The wooden footstool was smooth and very cool to touch.",
        "Her pooch lost a tooth while trying to chew a rope.",
        "It is true that a foolproof plan needs a spoonful of luck.",
        "His mood improved after the long feud finally ended."
      ]
    },
    {
      n: 22, moduleCode: "M8W1",
      focus: "Words with -ed and -ing",
      rule: "Adding -ED or -ING sometimes changes the base word. Double the last consonant if the word ends in CVC ('swim' → 'swimming'). Drop the silent E ('save' → 'saving').",
      patternHighlight: "ed-ing-suffix",
      words: ["swimming","drumming","dropping","sitting","taping","invented","saving","smiled","planned","changing","joking","loved","gripped","tasted","wooden","smooth","crooked","chew","admired","scrapped","forgetting","skidding"],
      sentences: [
        "He smiled while sitting in the sunny park.",
        "She loved swimming and dropping into the cool pool.",
        "We planned a long day of joking and saving energy.",
        "He gripped the cup and tasted the warm tea.",
        "The car was skidding before they invented better brakes."
      ]
    },
    {
      n: 23, moduleCode: "M8W2",
      focus: "Prefixes re-, un- and Suffixes -less, -ness",
      rule: "Prefixes add meaning to the start. RE- means 'again' ('rewrite'). UN- means 'not' or 'opposite' ('unfair'). Suffixes add meaning at the end. -LESS means 'without' ('helpless'). -NESS makes a noun ('kindness').",
      patternHighlight: "prefix-suffix",
      words: ["unfold","rejoin","reheat","unfair","rewrite","unwrap","painless","helpless","kindness","fearless","goodness","spotless","softness","darkness","invited","planned","drumming","changing","forgiveness","effortless","reawaken","unequal"],
      sentences: [
        "It was unfair to rewrite the whole story without help.",
        "The shot was painless, thanks to the doctor's kindness.",
        "Unfold the map, then reheat the soup before dinner.",
        "Her goodness made the dark room feel less helpless.",
        "He felt fearless in the soft darkness of the back yard."
      ]
    },
    {
      n: 24, moduleCode: "M8W3",
      focus: "Changing Final y to i",
      rule: "When a word ends in Y after a consonant, change Y to I before adding most endings. 'Puppy' becomes 'puppies.' 'Try' becomes 'tried.' But keep Y before -ING: 'crying.'",
      patternHighlight: "y-to-i",
      words: ["cities","cries","puppies","hurried","stories","flies","parties","tried","pennies","happiness","carried","babies","spied","ponies","rejoin","unwrap","softness","kindness","earlier","memories","loveliest","denied"],
      sentences: [
        "She hurried past the cities full of bright lights and music.",
        "The puppies tried to chase the flies in the back yard.",
        "He carried two pennies and a stack of old memories.",
        "Babies bring great happiness to family parties.",
        "The loveliest ponies spied us from the top of the hill."
      ]
    },
    {
      n: 25, moduleCode: "M9W1",
      focus: "Suffixes -ful, -ly, and -er",
      rule: "Suffixes! -FUL means 'full of' ('joyful'). -LY makes adverbs ('quickly'). -ER means 'someone who does it' ('teacher,' 'singer').",
      patternHighlight: "ful-ly-er",
      words: ["singer","loudly","joyful","teacher","fighter","closely","powerful","farmer","quickly","careful","friendly","speaker","wonderful","truly","hurried","cities","stories","carried","watchful","delightful","steadily","container"],
      sentences: [
        "The teacher spoke quickly but very clearly to the class.",
        "Our singer is truly a powerful and joyful speaker.",
        "The friendly farmer waved at us as we walked closely past.",
        "Be careful and steadily fill the container with water.",
        "She watched the wonderful match with a watchful eye."
      ]
    },
    {
      n: 26, moduleCode: "M9W2",
      focus: "Words with ough, augh",
      rule: "OUGH and AUGH look strange and sound different in different words. 'Through' rhymes with 'blue.' 'Thought' rhymes with 'taught.' 'Tough' rhymes with 'rough.' 'Cough' rhymes with 'off.' Memorize each one — there's no clean rule.",
      patternHighlight: "ough-augh",
      words: ["taught","thought","rough","laugh","bought","cough","ought","caught","fought","daughter","tough","through","enough","brought","quickly","powerful","friendly","singer","laundry","naughty","forethought","throughout"],
      sentences: [
        "My daughter laughed when I bought a tough little puzzle.",
        "He thought he caught a cold from coughing throughout the night.",
        "She taught me enough to get through any rough day.",
        "We fought past the laundry pile to reach the back door.",
        "With a little forethought, no plan feels too naughty to try."
      ]
    },
    {
      n: 27, moduleCode: "M9W3",
      focus: "Words with /j/ and /s/",
      rule: "G says /j/ before E, I, or Y ('giant,' 'gentle'). C says /s/ before E, I, or Y ('center,' 'circle'). Otherwise G says /g/ and C says /k/.",
      patternHighlight: "j-s-sound",
      words: ["jacket","pencil","circle","center","giant","gentle","bouncing","largest","unchanging","replace","fiercely","cinch","emerge","jawbone","thought","caught","rough","daughter","general","garbage","bracelet","silence"],
      sentences: [
        "A giant gentle dog sat in the center of the circle.",
        "I caught my pencil rolling out of my jacket pocket.",
        "Her bracelet is the largest in the room, even in silence.",
        "Replace the broken jawbone and the puzzle will be a cinch.",
        "Fiercely bouncing waves emerge from the rough sea each spring."
      ]
    }
  ]
};
