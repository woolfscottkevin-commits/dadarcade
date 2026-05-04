# Claude Code Build Prompt — Granddad's Attic, Phase 3 (Engine Build)

## Read this first

You are building **Granddad's Attic**, a pre-rendered Myst-style puzzle adventure for Dad Arcade. This prompt covers **Phase 3 only** — the playable engine with **placeholder art**. Real Midjourney scenes will be dropped in later in a separate asset-pass phase.

The complete design specification is in `/attic/DESIGN.md` in the repo. **Read that file in full before writing a single line of code.** Every decision below is sourced from that doc.

This is a vanilla JS / no-build / no-bundler / no-game-engine project. It is intentionally simple in tech: HTML, CSS, ES modules, Web Audio API, localStorage. No React. No Phaser. No Three.js. No npm. The "game engine" is a small custom scene manager + hotspot system you will write yourself.

The game is a single 10–15 minute experience. Five puzzles, one room, ~6 vantage points, ~25 images (placeholders for now). Solo player. No accounts, no backend, no leaderboard. Just a story.

You are working solo through this. Run the auto-debug skill at the end of each phase before reporting completion.

## Project location

Repo root: `dad-arcade` (you are already in it).

All work for this project lives under `/attic/`.

Live URL when shipped: `dadarcade.com/attic` (route already reserved — do not modify any other route).

## What "done" means for Phase 3

A user can:

1. Open `/attic/index.html` in a browser
2. See a title screen with the game name, tagline, "Begin" button, and ambient piano (placeholder beep is fine)
3. Click Begin → fade to the attic center vantage point
4. Navigate between 6 vantage points by clicking arrow hotspots
5. Click on the **footlocker** → close-up scene → solve combination dial puzzle → unlock it
6. Pick up the brass key and diary from the footlocker
7. Open the diary → solve the 5-letter Caesar cipher dial → unlock it
8. Read 5 redacted diary entries with visible dates (2-3, 3-4, 3-3, 3-4, 4-2)
9. Use the brass key on the **radio** → tune to 97.0 → hear Granddad's recorded message (placeholder text-to-speech, web speech API, or a placeholder beep with on-screen subtitle is fine)
10. Find the music box under the loose floorboard
11. Open the music box → hear the 5-note melody (B♭-A-D-G-E, simple Web Audio sine waves are fine)
12. Read the music sheet showing note names → realize they spell **BADGE**
13. Click the uniform jacket → find the badge in the pocket
14. Examine badge back → see Polybius square
15. Combine diary date coordinates + Polybius square → decode to **HONOR**
16. Click the painting on the wall → it slides aside revealing a safe
17. Enter HONOR on the safe → it opens
18. Read the final letter (full-screen overlay, scrollable)
19. End screen with solve time, "Play again" button

Save state persists across page reloads. Hint photograph progressively unlocks more lines based on current puzzle progress. Mobile portrait layout works on iPhone.

## Tech stack (immovable)

- **Vanilla JavaScript ES modules** — `<script type="module">` from `main.js`
- **HTML5 + CSS3** — no preprocessor
- **Web Audio API** — no Howler, no Tone.js
- **localStorage** — for save state (no Supabase, no backend)
- **No dependencies** — no npm, no build step, no bundler. Open `index.html` directly works.
- **Hosted on Vercel** — but locally just `python -m http.server` or equivalent

## File structure to create

Match this exactly. Do not invent extra folders.

```
/attic/
  index.html
  main.js
  styles/
    attic.css
  scenes/
    SceneManager.js
    HotspotRenderer.js
    sceneData.js
  puzzles/
    Footlocker.js
    Diary.js
    Radio.js
    MusicBox.js
    Safe.js
  systems/
    GameState.js
    Inventory.js
    Persistence.js
    Audio.js
    DialogReader.js
    HintSystem.js
  ui/
    TitleScreen.js
    EndScreen.js
    InventoryBar.js
  assets/
    scenes/                 ← Placeholder images (see "Placeholder art" below)
    closeups/
    audio/
      ambient/
      sfx/
      voice/
      music/
    text/
      diary.json
      letter.txt
      hints.json
      voiceMessages.json
  CLAUDE.md                 ← Phase status notes
```

The full DESIGN.md already exists at `/attic/DESIGN.md`. Do not overwrite it. Read it for canonical answers.

## Placeholder art strategy

You are NOT generating real Midjourney art in this phase. Use these placeholders so the engine works end-to-end:

- **Establishing scenes (6 vantage points + variants):** Solid color CSS gradient backgrounds with a centered text label naming the scene (e.g., "CENTER VIEW — TRUNK / DESK / COATRACK"). Use the warm palette from DESIGN.md section 5: `linear-gradient(135deg, #4A3A2A, #8B6F47)`. White centered text, large.
- **Close-ups (10 close-up scenes):** Same gradient-with-label approach. E.g., "DIARY CLOSE-UP."
- **Hotspot visualization in dev mode:** Toggle with `?debug=1` in the URL. When on, draw semi-transparent red rectangles over every hotspot so you can verify positions.

The point: when real images replace placeholders later, only the image file paths change. Hotspot coordinates, scene logic, and game state stay identical.

## Hotspot coordinate convention

**Use percentages, not pixels.** A hotspot is `{x, y, w, h}` as floats 0.0–1.0 of the scene image. This way the same coordinates work on desktop landscape and mobile portrait.

Example:
```js
{ id: "diary", x: 0.42, y: 0.38, w: 0.12, h: 0.16, action: "openCloseup", target: "diary_closeup" }
```

Render hotspots as absolute-positioned divs over the scene container, sized in % units.

## The puzzle dependency graph (build this exactly)

```
START
  ↓
[Center View] — visible: footlocker, painting (locked), photo of you+granddad
  ↓ click footlocker
[Footlocker Closeup] — combination dial puzzle
  ↓ enter 6-14-46
[Footlocker Open] — items: BRASS_KEY, DIARY (locked)
  ↓ pick up items, return to center
  ↓ click DIARY in inventory
[Diary Closeup] — 5-letter cipher dial puzzle
  ↓ enter HONOR (decoded from KRQRU on cover)
[Diary Open] — readable, shows 5 redacted entries with dates
  ↓ read entries, return to center
  ↓ click DESK vantage
[Desk View] — radio visible
  ↓ click radio
[Radio Closeup] — locked, requires BRASS_KEY
  ↓ use BRASS_KEY
[Radio Tuning] — drag dial 88.0–108.0
  ↓ tune to 97.0 (Margaret's birthday from diary: 9/7)
[Radio Plays Granddad's Message]
  ↓ message ends, loose floorboard rattles
[Floorboard Reveal] — click loose board, find MUSIC_BOX
  ↓
[Music Box Closeup] — open lid, hear B♭-A-D-G-E melody
  ↓ examine sheet music inside lid
  ↓ realize note names spell BADGE
  ↓ go to coatrack
[Coatrack View] — uniform jacket
  ↓ click jacket pocket (only enabled after BADGE realized)
[Jacket Pocket] — find BADGE
  ↓ examine BADGE back
[Badge Closeup] — see 5×5 Polybius square
  ↓ go to diary, see redacted entry dates: 2-3, 3-4, 3-3, 3-4, 4-2
  ↓ decode using Polybius square → HONOR
  ↓ go to painting on wall
[Painting] — now interactive (after BADGE found), click to slide aside
[Safe] — 5-letter combination dial
  ↓ enter HONOR
[Safe Open] — final letter visible
  ↓ click letter
[Final Letter Reading] — full screen overlay, scrollable text
  ↓ click "Continue"
[End Screen] — solve time, Play Again button
```

This dependency graph is the contract. Hotspots become active or inactive based on `GameState`. Always check requirements before enabling clicks.

## Puzzle implementations — be exact

### Puzzle 1: Footlocker

- 3 dials, each 0–9, default at 0
- Drag up to increment, drag down to decrement, OR click +/- buttons (provide both for accessibility)
- "Try" button checks combination
- Solution: `6-1-4` for first dial, `1-4-6` no wait — re-read DESIGN.md. The solution is **6, 14, 46** but each dial is 0–9, so we need 6 dials? Or are the dials 0–99?

  **Decision:** Use 3 dials, each 0–99. Solution is `6, 14, 46`. Dial UI shows 2 digits per dial. This matches the date 6.14.46.

- On correct entry: lock click sound, lid swings open animation (CSS transform), inventory gains BRASS_KEY and DIARY
- On wrong entry: shake animation, dull thud sound, dials reset

### Puzzle 2: Diary lock

- 5 letter dials, each A–Z
- Drag to scroll through letters
- Spine engraving visible: **KRQRU**
- Inside front cover (visible without unlocking): "Sworn to silence. So I shifted three to the right. — H.W."
- Solution: shift each letter back by 3 → **HONOR**
- On correct: page turn sound, diary opens, 5 redacted entries appear with visible dates
  - Entry 1: dated as **"2-3 / Apr 1943"** — body redacted with black ink overlay
  - Entry 2: dated **"3-4 / May 1943"** — redacted
  - Entry 3: dated **"3-3 / May 1943"** — redacted
  - Entry 4: dated **"3-4 / Jun 1943"** — redacted (note: same date format as entry 2 — that's intentional, Polybius square has duplicates)
  - Entry 5: dated **"4-2 / Jul 1943"** — redacted
- Also visible (not redacted): a single non-redacted entry mentions Margaret's birthday is September 7th
- Hard-code these in `assets/text/diary.json`

### Puzzle 3: Radio

- Cannot interact until BRASS_KEY is in inventory
- When BRASS_KEY clicked while looking at radio → key inserts → tuning dial unlocks
- Tuning dial: drag horizontally, frequency display shows 88.0 to 108.0 in 0.1 increments
- Static volume scales with distance from 97.0 (max static at far frequencies, no static at 97.0)
- When held within 0.2 of 97.0 for 1.5 seconds: lock indicator → message plays
- Message playback: text appears as subtitles, audio is placeholder (Web Speech API `speechSynthesis` with a male voice, OR just a beep + on-screen text — your call, easier wins)
- Message text (in `voiceMessages.json`):
  > "If you're hearing this, you found the radio. Good. The next piece is in the music box. The melody isn't a song — it's a message. Listen for the pattern, not the tune. Five notes. They spell something."
- After message, fade to floorboard reveal scene; player clicks loose board to find MUSIC_BOX

### Puzzle 4: Music box

- Open lid: animation, melody plays on loop until closed
- Melody: **B♭ (Bb), A, D, G, E** — five notes. Use Web Audio API sine wave oscillators, frequency table:
  - Bb = 466.16 Hz
  - A = 440.00 Hz
  - D = 293.66 Hz
  - G = 392.00 Hz
  - E = 329.63 Hz
- Each note plays for 600ms, 200ms gap between notes, then 1500ms gap before melody repeats
- Inside lid: a sheet music graphic (placeholder: white card with text "♪ Bb - A - D - G - E ♪")
- Hint card text on the closeup: "Some words sound like music."
- This puzzle has no input — solving means *realizing* the answer is BADGE
- Set a flag `hint_badge_realized = true` when player clicks the sheet music
- The jacket pocket only becomes interactive once that flag is true (otherwise clicks return "I should look more carefully at the music box first")

### Puzzle 5: Safe

- Cannot interact until BADGE is in inventory
- Painting only becomes interactive once BADGE is found (with subtle visual cue — soft glow or pulse)
- Click painting → slide-aside animation reveals safe
- Safe has 5 letter dials, identical UI to diary
- Solution: **HONOR** (from Polybius square decode of 2-3, 3-4, 3-3, 3-4, 4-2)
- The Polybius square shown on the badge:
  ```
        1  2  3  4  5
    1   A  B  C  D  E
    2   F  G  H  I  K
    3   L  M  N  O  P
    4   Q  R  S  T  U
    5   V  W  X  Y  Z
  ```
- On correct entry: dramatic safe-open sound, slow swing, final letter visible inside

## The final letter

Stored in `assets/text/letter.txt`. Use this exact text (player chose grandchild gender-neutral wording):

```
To whoever finds this —

I never told anyone what I really did during the war. I was sworn to silence, and by the time I was free to speak, I'd forgotten how. So I am writing it down the only way I know how — the way I learned at FRUMEL in '43.

I worked on the codes. Japanese fleet ciphers, mostly. I will not pretend it was glorious. It was a desk and a slide rule and ten thousand sheets of intercepted gibberish. But once, in May of '43, our team caught a transmission about a flight plan. We passed it up the chain, and a man named Yamamoto did not live to see Tuesday.

I have thought about that every day for sixty years.

I never told your grandmother. I never told your mother. I am telling you now because you cared enough to find this, and because someone in this family should know that the quiet old man in the brown chair was, for a brief moment, useful.

I love you. Be kind to your mother. Read more books.

— Granddad
```

Render this in a serif font (Georgia or similar), warm cream background, gentle vignette. Scroll if needed. Below the letter, a "Continue" button fades in after 8 seconds (don't let players blow past it).

## The hint photograph system

Always-visible photo frame in every vantage point. Shows a simple placeholder ("Photo of you and Granddad").

Click it: a tooltip-style overlay appears with one line of dialogue from Granddad's "voice in your memory."

Hint progression based on `GameState.puzzlesSolved`:

```js
// hints.json
{
  "intro": "Take your time. Look at everything.",
  "footlocker_unsolved": "Have you opened the trunk yet? It was always at the foot of my bed.",
  "footlocker_unsolved_2": "Margaret and I got married right after the war. Best day of my life.",
  "diary_unsolved": "I kept a diary back then. Couldn't write anything important — but I wrote what I could.",
  "diary_unsolved_2": "We used to joke at FRUMEL — shift three to the right and call it Tuesday.",
  "radio_unsolved": "The radio was Margaret's, you know. She loved her programs. Tuned it on her birthday every year.",
  "radio_unsolved_2": "Margaret's birthday — September seventh. Couldn't forget that one if I tried.",
  "musicbox_unsolved": "The music box plays one of my favorites. Listen to the notes themselves, not the song.",
  "musicbox_unsolved_2": "B-A-D-G-E. Some words just sound like music.",
  "safe_unsolved": "The painting on the wall — your grandmother painted that. I never told her what was behind it.",
  "safe_unsolved_2": "HONOR. The word that mattered most. Use the badge to find it.",
  "ending": "Thank you for finding this."
}
```

Each click reveals one line. Don't show all hints at once. Show the most-relevant unrevealed hint based on current state. After 3 unrelated clicks, allow level-up to "harder" hints.

## Audio system

Web Audio API. Three buses:

1. **Ambient** — looping low-volume background. Default: silence in this build, since you have no real audio yet. Provide a `src/audio/ambient/quiet.wav` placeholder (a 1-second of -50dB white noise loop is fine, or just no audio playback).
2. **SFX** — one-shot sounds. For now, generate procedurally with Web Audio:
   - Lock click: short 80Hz square wave burst, 50ms
   - Wrong combo: low 60Hz triangle, 200ms
   - Solve chime: ascending C5-E5-G5 sine, 600ms
   - Page turn: brief noise burst, 100ms
3. **Music** — title theme placeholder: a slow C-major arpeggio on sine waves, 30 sec loop.

When real audio assets arrive in a later phase, swap file paths only.

Mute toggle persists in localStorage as `attic_muted`.

## State management

`GameState.js` — the single source of truth.

```js
const initialState = {
  puzzlesSolved: {
    footlocker: false,
    diary: false,
    radio: false,
    musicbox: false,
    safe: false
  },
  flags: {
    hint_badge_realized: false,
    radio_message_played: false,
    floorboard_revealed: false,
    painting_glowing: false
  },
  inventory: [],          // ["BRASS_KEY", "DIARY", "MUSIC_BOX", "BADGE"]
  examined: [],           // ["wedding_photo_back", "diary_cover_inscription", ...]
  scenesVisited: [],
  currentScene: "title",
  hintsShown: [],
  audioMuted: false,
  startedAt: null,
  endedAt: null
}
```

Every state change → save to localStorage as `attic_save_v1`. On load, hydrate from localStorage if present.

## Mobile responsiveness

- Detect viewport orientation
- Use 16:9 aspect for landscape, 9:16 for portrait
- Scenes have two image variants (landscape and portrait) — for placeholder phase, just use the same gradient with adjusted aspect ratio
- All buttons minimum 44×44 px
- Touch events alongside mouse events (use `pointerdown`/`pointermove`/`pointerup`)

## Save/resume

- Auto-save on every state change
- Resume on URL revisit (skip title screen if a save exists, jump to last scene)
- "Start Over" button on title screen wipes save and resets

## Build phases (within Phase 3)

Build in this order. Test each step before moving on.

### Step 1: Scaffold + scene navigation (no puzzles yet)

- `index.html`, `main.js`, `attic.css`
- `SceneManager` with fade transitions
- `HotspotRenderer` with debug overlay (`?debug=1`)
- All 6 vantage points + 10 close-up scenes as placeholder gradients
- Navigation hotspots between vantage points work
- `GameState` minimal stub
- Title screen → center view → can navigate around

**Test:** I can move between every vantage point and view every close-up. Hotspots highlight in debug mode.

### Step 2: Inventory + GameState + Persistence

- `Inventory.js` with collected items array
- Inventory bar UI (bottom of screen, click items to use)
- `Persistence.js` saving to localStorage on every state change
- "Start Over" button works

**Test:** Place a debug button that adds BRASS_KEY to inventory. Reload page. Inventory persists. Click "Start Over" → empty inventory.

### Step 3: Puzzles 1 and 2 (Footlocker, Diary)

- Footlocker dial UI + solve logic
- Diary cipher dial UI + solve logic
- Diary opens to readable entries (placeholder text from `diary.json`)
- Inventory updates correctly

**Test:** Full play-through of puzzles 1–2. Combination 6-14-46 unlocks footlocker. KRQRU/HONOR unlocks diary.

### Step 4: Puzzles 3 and 4 (Radio, Music Box)

- Radio frequency dial with key requirement
- Web Speech API or beep+subtitle for Granddad's message
- Floorboard reveal scene
- Music box lid + Web Audio melody
- Sheet music close-up
- Jacket pocket → BADGE
- Badge close-up showing Polybius square

**Test:** Full play-through of puzzles 1–4.

### Step 5: Puzzle 5 + Final Letter + End Screen

- Painting interactive after BADGE collected
- Safe puzzle (HONOR)
- Final letter overlay with serif typography
- End screen with solve time
- Play Again button

**Test:** Full play-through start to finish. Save and resume mid-game.

### Step 6: Hint photograph + audio + polish

- Hint system with progressive lines
- Procedural audio (lock clicks, chimes, music box notes, title theme)
- Mobile responsive checks
- Lighthouse pass

**Test:** Two distinct sessions (one desktop, one phone) complete the game without external help.

## Constraints — do not deviate

- **No frameworks.** No React, no Vue, no Svelte, no Phaser. Vanilla only.
- **No build step.** No webpack, no Vite, no rollup. Open `index.html` and it works.
- **No npm.** No package.json, no node_modules. Zero dependencies.
- **No backend.** No Supabase, no API calls.
- **Single-screen experience.** No router, no URL state.
- **English only.** No i18n.
- **Modern browsers only.** Safari 15+, Chrome 100+. ES modules, no transpilation.
- **No tracking, no analytics, no cookies** beyond localStorage.

## What you must NOT touch

- `/par-3/` — the golf game, untouched
- `/dad-quest/` — the deckbuilder, untouched
- Any other Dad Arcade game folder
- Home page (`/index.html` at repo root) — adding the Attic tile is a separate later step
- Vercel config, Cloudflare DNS, anything outside `/attic/`

If you think you need to touch something outside `/attic/`, stop and ask.

## When you encounter ambiguity

The DESIGN.md file is the source of truth. Re-read it. If the answer isn't there, choose the simplest implementation that fits the existing decisions, document the choice in `CLAUDE.md`, and continue.

Do not invent new features. Do not add a tutorial overlay. Do not add achievement notifications. Do not add a settings menu beyond what is specified. Do not add a difficulty toggle. Every "what if we also" is OUT OF SCOPE.

## Auto-debug at the end

When all 6 steps are complete and the full play-through works:

1. Run the auto-debug skill against the entire `/attic/` directory
2. Verify the puzzle dependency graph is intact (each puzzle blocks the next)
3. Verify save/resume works mid-game on at least 3 different points
4. Verify mobile portrait layout doesn't break
5. Verify debug mode (`?debug=1`) shows hotspot rectangles
6. Verify localStorage cleanup on "Start Over"
7. Verify the final letter renders correctly with serif font
8. Verify the end screen shows solve time
9. Run a Lighthouse audit on the production build, target 90+ for performance
10. Update `CLAUDE.md` with status, known issues, and handoff notes for the asset replacement phase

Then report completion with a summary of what shipped, what's stubbed (placeholder art, voice audio), and what the asset replacement phase needs to do.

## Final note

This is a story game first, an engine project second. The puzzles are clever but the *point* is the letter at the end. Keep that in mind through every decision. The art is sparse, the audio is quiet, the pacing is slow on purpose. Don't add flourishes that fight the tone.

When in doubt: simpler, quieter, warmer.
