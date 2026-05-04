# Granddad's Attic — Design Document

**Project:** Granddad's Attic, a premium pre-rendered puzzle adventure for Dad Arcade.
**Tagline:** Some secrets wait sixty years to be told.
**Path within repo:** `/attic/` inside the dad-arcade repo.
**Live URL:** dadarcade.com/attic
**Target solve time:** 10–15 minutes.
**Target audience:** Smart high schoolers and adults; playable by Claire (Grade 4) with light help.
**Pattern:** Pre-rendered still scenes (Path A — Myst 1993 model). Vanilla JS. No game engine.

---

## 1. Concept

You have inherited your grandfather's attic. Granddad passed last year. He always said he was "just an accountant" during the war, but as you sort through his things, you find evidence he was hiding something. Through five interlocking puzzles, you piece together that he served at a clandestine codebreaking station in the Pacific — and the final puzzle is the coded message he left, addressed to *you*, hidden in plain sight for sixty years.

The game is contemplative, warm, and intimate. Not scary. Not dark. The mystery is tender, not sinister. The final reveal is the kind of thing that makes you call your own grandfather (or wish you could).

**Reference points:**
- *Myst* (1993) — pre-rendered scene aesthetic and pacing
- *Return of the Obra Dinn* — the satisfaction of progressively decoding a real mystery
- *Gone Home* — domestic, intimate, emotionally driven
- *The Imitation Game* — the codebreaking era and its quiet heroism

---

## 2. The Story

### Backstory (revealed gradually, never stated outright)

**Granddad's name:** Lt. Henry "Hank" Walsh, USNR.

He served 1942–1945 at FRUMEL (Fleet Radio Unit, Melbourne) — a real Allied codebreaking station in Australia that intercepted Japanese naval traffic. His specific role: cryptanalyst on the JN-25 cipher team. After the war, he was sworn to secrecy under the wartime non-disclosure regime, which for Pacific signals intelligence remained classified into the 1990s. By the time it was declassified, he had built a 50-year habit of silence. He never told a soul, not even Grandma.

But he left a message. He encoded it the only way that felt right — using the same cipher techniques he had used during the war — and hid it in pieces around the attic, knowing that one day someone would care enough to find it.

That someone is you.

### The Final Message (decoded)

After all five puzzles, the player decodes a final letter:

> *To whoever finds this —*
>
> *I never told anyone what I really did during the war. I was sworn to silence, and by the time I was free to speak, I'd forgotten how. So I am writing it down the only way I know how — the way I learned at FRUMEL in '43.*
>
> *I worked on the codes. Japanese fleet ciphers, mostly. I will not pretend it was glorious. It was a desk and a slide rule and ten thousand sheets of intercepted gibberish. But once, in May of '43, our team caught a transmission about a flight plan. We passed it up the chain, and a man named Yamamoto did not live to see Tuesday.*
>
> *I have thought about that every day for sixty years.*
>
> *I never told your grandmother. I never told your mother. I am telling you now because you cared enough to find this, and because someone in this family should know that the quiet old man in the brown chair was, for a brief moment, useful.*
>
> *I love you. Be kind to your mother. Read more books.*
>
> *— Granddad*

The Yamamoto reference is real history (Operation Vengeance, April 1943, downstream of FRUMEL/Hypo intercepts). The emotional truth — a quiet old man who was secretly extraordinary — is universal.

---

## 3. The Puzzles (5 total)

Designed to escalate from accessible to clever, each gating the next. Total solve time: 10–15 minutes for an attentive high schooler.

### Puzzle 1 — The Locked Footlocker (Combination)

**Object:** A WWII military footlocker with a 3-digit combination dial.

**Clue:** A framed wedding photo on the wall. Inscription on the back (visible when player flips it): *"Hank & Margaret — 6.14.46."* The combination is **6-14-46**.

**Difficulty:** Easy. Tutorial puzzle. Teaches: examine objects from multiple angles, look for numbers.

**Reward:** Inside the footlocker — Granddad's service uniform, a leather-bound diary (locked with a tiny padlock), and a small brass key labeled "RADIO."

### Puzzle 2 — The Diary's Lock (Caesar Cipher)

**Object:** Leather diary with a small lock. The lock has 5 letter dials (like a luggage lock).

**Clue:** Inside the front cover (visible without unlocking): *"Sworn to silence. So I shifted three to the right. — H.W."*

The diary's spine is engraved with: **KQYHU**.

Caesar cipher, shift 3 left → **HNVER** → no, that's wrong on purpose to teach the player. Shift 3 *forward* (encoding) means decoding is shift 3 *back*: **K→H, Q→N, Y→V, H→E, U→R** = "HNVER." That's not a word.

*Re-read clue:* "shifted three to the right" — meaning encoded by shifting right. So decode by shifting left. Try again carefully: **K→H, Q→N, Y→V, H→E, U→R**. Hmm. Let me recompute the puzzle properly.

The combination should be a real 5-letter word. Let's use **HONOR**. Encoded with shift +3: H→K, O→R, N→Q, O→R, R→U = **KRQRU**. So the spine reads **KRQRU**, the player decodes to **HONOR**, and that's the diary combination.

**Difficulty:** Easy-Medium. Introduces ciphers gently. The clue spells out "shift three" so the player isn't lost.

**Reward:** Diary opens. Inside are entries from 1942–1945 referencing a place called "the building" and a room called "Hut 7." Multiple entries are partly redacted (drawn over in heavy ink) — except the dates are visible, which become important later. The diary also includes a photograph of a young Hank in uniform standing next to a piece of equipment with a label: **"FRUMEL — 7 Albert Street."**

### Puzzle 3 — The Old Radio (Frequency Tuning)

**Object:** A vintage 1940s tube radio on the desk. Has a tuning dial (drag to set frequency, 88.0 to 108.0 in 0.1 increments).

**Clue:** The brass key from the footlocker fits the radio's back panel. Opening it reveals a slip of paper: *"Margaret's birthday. Always our station."*

Earlier, in the diary, the player will have read: *"Listened to Margaret's favorite show on her birthday — channel 9, 6 o'clock sharp."*

Wait — that's not enough. We need a frequency. Let's tighten: the wedding photo gives 6.14.46 (puzzle 1). The diary mentions Margaret's birthday is **September 7th** (9/7). Frequency = **97.0**.

**Difficulty:** Medium. Player has to connect two non-adjacent clues (wedding photo gave wedding date; diary gave birthday).

**Reward:** Tuning to 97.0 plays a recorded message — Granddad's voice (use a free TTS or your own recording): *"If you're hearing this, you found the radio. Good. The next piece is in the music box. The melody isn't a song — it's a message. Listen for the pattern, not the tune. Five notes. They spell something."*

A loose floorboard under the radio rattles when the message ends. Player discovers a small wooden music box hidden underneath.

### Puzzle 4 — The Music Box (Letter-to-Note Substitution)

**Object:** A wooden music box. When opened, it plays a 5-note melody on repeat. The notes are visually highlighted as they play (a row of 8 piano keys lights up: C-D-E-F-G-A-B-C, mapped to letters A-B-C-D-E-F-G-H).

The melody plays: **C — A — F — E — A** = **A-F-D-E-F**.

Hmm, that doesn't spell anything. Let me redesign.

Let's use 8 notes mapped to the first 8 letters: **C=A, D=B, E=C, F=D, G=E, A=F, B=G, C(high)=H**. The melody plays **C-A-F-E** which decodes to **A-F-D-C**. Still not a word.

Better approach: use Solfège notes mapped to letters, OR use 7 notes mapped to the 7 letters of a meaningful word.

Cleanest solution: The melody is a recognizable sequence — **B-A-D-G-E** (using note names directly, since B, A, D, G, E are all valid musical note names). The melody plays B♭-A-D-G-E. Player realizes the notes spell **BADGE**.

**Clue:** A music sheet inside the lid shows the notes written out in standard notation, with the *letter names* of each note printed underneath. Hint card next to it: *"Some words sound like music."*

**Difficulty:** Medium-Hard. Requires recognizing that note names CAN spell English words (B, A, C, D, E, F, G are all letters). Players who don't read music can still solve it because the letters are printed.

**Reward:** The word **BADGE** matters. There's a coatrack in the corner with Granddad's old uniform jacket. Clicking on it now (after solving) reveals the player can interact with the chest pocket. Inside: a dull brass military badge with engravings: **"H. WALSH, USNR — FRUMEL 1942–1945"** and on the back, a strange grid of letters and numbers.

### Puzzle 5 — The Cipher Grid (Final Code, Polybius/Book Cipher Hybrid)

**Object:** The badge's reverse engraving is a 5×5 grid of letters (a Polybius square). On the desk, the player has noticed a stack of dated diary entries from puzzle 2 — the *dates* of the redacted entries are: **3-4, 5-1, 4-3, 5-1, 2-2, 1-5, 4-3, 5-3, 3-1, 1-5**.

These are coordinates. Each pair (row, column) maps to the letter at that position in the Polybius square.

The Polybius square is the standard 5×5 with I/J combined:
```
    1  2  3  4  5
1   A  B  C  D  E
2   F  G  H  I  K
3   L  M  N  O  P
4   Q  R  S  T  U
5   V  W  X  Y  Z
```

Decoding (row,col): **3-4** = O, **5-1** = V, **4-3** = S — wait let me make this spell something meaningful.

Let me work backwards from a target word. Target: **GRANDSON** (or **GRANDKID** to be gender-neutral, but it's 8 letters which is fine).

Wait, I want the final decoded message to be longer and emotional. Let's use a shorter target as the *key* to unlock the final letter, and have the letter itself be already-written but hidden.

Target word: **HONOR** (5 letters, meaningful, callback to the diary combination).

H = (2,3), O = (3,4), N = (3,3), O = (3,4), R = (4,2). So the diary's redacted entry dates (which the player has been collecting throughout) need to be: **2-3, 3-4, 3-3, 3-4, 4-2**.

Five redacted entries in the diary, each with a visible date in (row, column) format. Player extracts them in order. Decodes via the Polybius square on the badge. Gets **HONOR**.

**Where does HONOR go?** A small wall safe behind a painting. The painting was visible from puzzle 1 but uninteractable until now. The safe has 5 letter dials. Enter HONOR.

**Difficulty:** Hard. This is the climax puzzle. Requires connecting multiple earlier finds: the diary dates (puzzle 2), the badge grid (puzzle 4), and the painting (background detail since puzzle 1).

**Reward:** The safe opens. Inside: the final letter (the one quoted in section 2 above). Player reads it. End screen.

---

## 4. The Attic (Scene Layout)

The attic is one room with **6 establishing/vantage angles** plus close-up scenes for each interactive object.

### Vantage Points (the "navigation hubs")

1. **Center** — entered facing a window. Trunk in foreground, desk to the left, coatrack on right, painting on far wall.
2. **Desk** — close on the desk and radio. Diary lives here once unlocked. Lamp throws warm light.
3. **Trunk/Footlocker** — close on the locked footlocker.
4. **Coatrack/Uniform** — close on the uniform jacket and shelf.
5. **Painting/Safe Wall** — close on the painting (which hides the safe).
6. **Window** — looking out across rooftops at golden hour. Atmosphere shot. Optional.

### Close-Up Scenes (zoomed object views)

- Footlocker dial close-up (interactive 3-digit dial)
- Diary close-up (pages turn, lock interactive)
- Diary lock close-up (5 letter dials)
- Radio close-up (tuning dial interactive)
- Music box close-up (lid open, notes playing)
- Music box sheet music close-up
- Badge close-up (front and back)
- Wedding photo close-up (front and back)
- Safe close-up (5 letter dials)
- Final letter close-up (full-screen reading view)

### Scene Count Estimate

- 6 vantage points × 2 lighting states (early-game / late-game tone shift) = 12 establishing scenes (lighting shift is optional polish — could skip for v1)
- 10 close-up scenes
- 2 special scenes (loose floorboard reveal, painting moves to reveal safe)
- 1 ending scene (player reading the letter, soft focus)

**Total: ~25 final images for v1.** (12 if you skip the lighting shift.)

This is a tight, achievable count. Roughly 50–80 Midjourney generations to land 25 winners.

---

## 5. Visual Style — The Locked Prompt

**This phase is non-negotiable. Lock the style before generating any final assets.**

### Master Style Prompt (draft — refine in Phase 0)

```
Warm afternoon golden hour light streaming through dusty attic window,
cinematic photographic still, painterly atmospheric realism,
Kodak Portra 400 film aesthetic, shallow depth of field,
visible dust motes in sun rays, warm amber and sepia palette
with deep shadow contrast, vintage 1940s domestic interior,
worn wood floors, old leather, brass details, faded fabric,
hyper-detailed textures, 35mm lens, f/2.8,
nostalgic and intimate mood, Myst 1993 pre-rendered scene aesthetic,
Cyan Worlds visual style, --ar 16:9 --style raw --v 7
```

### Color Palette

- **Primary warm:** #C49A6C (warm amber), #8B6F47 (aged wood), #4A3A2A (deep shadow)
- **Highlights:** #F4D9A4 (sunlit dust), #FFFFFF (sun-hot)
- **Cool accents:** #5A6B7A (window blue), #2A3540 (deep shadow blue)
- **Desaturated overall:** This isn't a vivid scene. It's a quiet one.

### Style Lock Process

1. Generate 10 establishing shots of the attic with the master prompt
2. Pick the strongest one
3. Use that image as a `--sref` (style reference) for ALL subsequent generations
4. Test consistency: generate 3 different angles of the same attic
5. If they don't look like the same room, refine the prompt or change `--sref`
6. Lock the prompt + sref. Document both in `STYLE.md`.

**Gate:** Phase 0 ends when 3 different angles of the attic look unmistakably like the same physical space.

---

## 6. Technical Architecture

### Stack

- **Vanilla JavaScript ES modules** (no build step, no bundler)
- **HTML5 + CSS3** for layout
- **No game engine** — just images, click handlers, state machine
- **Web Audio API** for ambient and SFX
- **localStorage** for save state
- **Hosted on Vercel** under dadarcade.com

### File Structure

```
/attic/
  index.html                ← Entry point, <main> for current scene
  main.js                   ← App bootstrap, scene routing
  STORY.md                  ← The narrative source of truth
  PUZZLES.md                ← Puzzle solutions and dependency graph
  STYLE.md                  ← Locked Midjourney prompt and sref
  DESIGN.md                 ← This file
  CLAUDE.md                 ← Phase status, build notes
  scenes/
    SceneManager.js         ← Loads scene, fades between scenes
    HotspotRenderer.js      ← Draws/handles invisible click regions
    sceneData.js            ← All scene definitions (image paths, hotspots)
  puzzles/
    Footlocker.js           ← 3-digit combination
    Diary.js                ← 5-letter Caesar cipher dial
    Radio.js                ← Frequency tuning dial
    MusicBox.js             ← Note-letter substitution UI
    Safe.js                 ← Final 5-letter combination
  systems/
    GameState.js            ← Tracks puzzle progress, inventory
    Inventory.js            ← Manages collected items
    Persistence.js          ← localStorage save/load
    Audio.js                ← Ambient + SFX manager
    DialogReader.js         ← Letter/diary reading overlay
  assets/
    scenes/                 ← Establishing shots (1920×1080 + 1080×1920)
    closeups/               ← Object close-ups
    audio/
      ambient/              ← Looping rain, clock tick
      sfx/                  ← Lock clicks, paper rustle, radio static
      voice/                ← Granddad's recorded message
      music/                ← Music box melody, ending theme
  ui/
    Inventory.html          ← Inventory bar component
    DialogOverlay.html      ← Letter/diary reading overlay
  styles/
    attic.css               ← All styling, mobile responsive
```

### Scene Data Format

Each scene is defined by a JSON-like structure:

```js
{
  id: "desk_view",
  image: "/assets/scenes/desk_view.jpg",
  ambient: "attic_quiet",
  hotspots: [
    {
      id: "diary",
      shape: "rect",
      coords: [820, 410, 1050, 580],
      action: "openCloseup",
      target: "diary_closeup",
      requires: { puzzleSolved: "footlocker" }, // diary only appears after footlocker
      tooltip: "Granddad's diary"
    },
    {
      id: "back_to_center",
      shape: "rect",
      coords: [0, 900, 200, 1080],
      action: "navigateScene",
      target: "center_view",
      tooltip: "Step back"
    }
  ]
}
```

### State Machine

`GameState.js` tracks:

```js
{
  puzzlesSolved: { footlocker: false, diary: false, radio: false, musicbox: false, safe: false },
  inventory: [], // ["brass_key", "badge", ...]
  itemsExamined: [], // for hint progression
  scenesVisited: [],
  currentScene: "center_view",
  audioMuted: false,
  startedAt: timestamp,
  endedAt: null
}
```

Save to localStorage every state change. Resume from save on next visit.

### Puzzle Modal Pattern

Each puzzle is a full-screen modal overlay over the current scene. Modal contains the interactive UI for that specific puzzle (combination dial, frequency tuner, music box keyboard, etc.). On solve, modal fades out, state updates, scene re-renders with new hotspots active.

### Mobile/Desktop Responsive

- Desktop: full landscape 1920×1080 scenes
- Mobile (portrait): 1080×1920 portrait crops of each scene (generated separately in Midjourney with `--ar 9:16`)
- Hotspot coordinates defined as percentages, not pixels, so they map across resolutions
- All UI elements (inventory bar, back button) are touch-target-sized (44px minimum)

---

## 7. Audio Design

Audio carries 50% of the atmospheric weight in a Myst-like. Don't underinvest.

### Ambient (looping)

- **Attic quiet** — distant rain on roof, soft house creaks, wind, very low
- **Attic with clock** — adds a slow ticking grandfather clock (shifts mood subtly)
- **Radio static** — when radio is on but mistuned

### SFX (one-shot)

- Wood creak (walking between vantage points)
- Lock click (footlocker, diary, safe — three different click sounds)
- Paper rustle (diary pages, letter)
- Radio dial click + static sweep
- Music box wind-up + lid open
- Music box melody (composed: B♭-A-D-G-E, slow, 5 notes, plays on loop)
- Final letter unfold sound
- Soft piano chord on solving each puzzle

### Voice

- Granddad's radio message (~30 seconds, warm older-man voice). Options:
  1. Record it yourself with a deeper voice and mild reverb
  2. Use a paid TTS like ElevenLabs (a "warm older man" voice) — fits the budget
  3. Use a friend who has the right voice
  
  **Recommend ElevenLabs** ($5/month, ships in minutes, sounds great)

### Music

- **Title theme:** soft solo piano, melancholy major key, 30 seconds, loops
- **Ending theme:** when the final letter is read, full piano arrangement of the music box melody (B♭-A-D-G-E expanded into a tender 60-second piece)
- Either license royalty-free (Epidemic Sound, Artlist) or compose yourself if you have the chops

### Source Strategy

- Use **freesound.org** for SFX (Creative Commons)
- Use **Epidemic Sound** or **Artlist** for music (~$15/mo, cancel after)
- Use **ElevenLabs** for voice
- Total audio budget: **$20–$30**

---

## 8. UX & Player Guidance

### Hints System

Players will get stuck. Provide a graduated hint system that doesn't feel like cheating.

**The Photograph** — A framed photo on the wall of "you" as a kid with Granddad. Click it any time. Each click reveals one more line of dialogue from Granddad's "voice in your memory":

- Click 1: "Take your time. Look at everything."
- Click 2: "Have you opened the trunk yet? It was always at the foot of my bed."
- Click 3: "Margaret's birthday was September 7th. Did I ever tell you that?"
- ... etc.

The hints are tied to current puzzle progress. Soft, in-character, optional.

### Tutorial / Onboarding

Opening 30 seconds:
1. Title card fades in: "Granddad's Attic" with soft piano
2. A single sentence: "Your grandfather has passed. You are sorting through his things."
3. Click anywhere → fade to the center vantage point
4. Subtle pulse animation on the trunk (the only interactive object initially) draws the eye
5. First click on the trunk shows a brief inline hint: "Click and drag to inspect objects."

### Saving and Resuming

- Auto-save every state change (no save button)
- Returning to the URL resumes where you left off
- "Start Over" button on title screen if player wants fresh

### End State

After reading the final letter:
- Fade to black
- Title card: "Granddad's Attic — A short story"
- Credits: design, story, art, audio (you)
- "Play again" button (resets state)
- "Share" button (copies a link with no spoilers)
- Solve time displayed: "You spent 14 minutes with Granddad."

---

## 9. The Phases

### Phase 0 — Style Lock (1 weekend)

**The most important phase. Skip and you'll regenerate everything later.**

- Write master Midjourney prompt
- Generate 10 establishing shots; pick winner
- Lock as `--sref`
- Generate 3 different angles of the same attic to test consistency
- Document final prompt + sref in `STYLE.md`
- Commit a `style-reference/` folder to repo with the locked images
- **Gate:** Three angles look like the same room.

**Deliverable:** `STYLE.md` and a folder of locked style references.

### Phase 1 — Story & Puzzle Lock (1 weekend)

- Write the final letter (the one Granddad leaves) in your own voice
- Refine the puzzle chain — verify every clue is findable, every solution is reachable
- Build a puzzle dependency graph (what unlocks what)
- Write all in-game text: diary entries, radio message script, hint photo lines
- Decide gender-neutral wording where applicable (the player isn't specified — could be grandson, granddaughter, or grandkid)
- Pick voice solution (record yourself / ElevenLabs / friend)
- **Gate:** Someone else (Kristin?) reads the docs and confirms the story is clear and the puzzle chain is solvable.

**Deliverables:** `STORY.md`, `PUZZLES.md` with solution guide, dependency graph diagram.

### Phase 2 — Asset Generation (2 weekends)

- Generate all ~25 final images using locked style
- Generate 1080×1920 portrait variants for mobile
- Light retouching where needed (color match, crop)
- Record/generate Granddad's voice
- Source ambient loops, SFX, music
- Compose or license title and ending themes
- Organize all assets in `/assets/`
- **Gate:** Every asset exists, all visually consistent, all named systematically.

**Deliverables:** Full `/assets/` folder.

### Phase 3 — Engine Build (2 weekends)

- Build SceneManager + HotspotRenderer + scene data structure
- Implement all 5 puzzle modals
- Build Inventory, GameState, Persistence
- Build hint system (the photograph)
- Build dialog reader (for letter and diary)
- Wire all puzzles together in the dependency chain
- Audio system: ambient loops, SFX triggers, music
- Mobile responsive: portrait scenes, percentage hotspots, touch targets
- **Gate:** Full play-through works start to finish, all 5 puzzles solvable, save/load works.

**Deliverable:** Playable game on localhost.

### Phase 4 — Polish & Test (1 weekend)

- Playtest with Kristin (or a friend) — observe; do not help
- Note every place they got stuck
- Refine hints if needed
- Check Lighthouse score (target 90+)
- Fix any mobile UX issues
- Add SEO meta, OG image, sitemap entry
- **Gate:** Two playtesters complete it in 10–20 minutes without help.

### Phase 5 — Ship (½ weekend)

- Add Granddad's Attic tile to dadarcade.com home grid
- Custom thumbnail (the strongest establishing shot)
- Push to Vercel
- Test on real iPhone
- Soft launch — share with a few people first
- Public push when stable

**Total realistic timeline:** 7–8 weekends.

---

## 10. Out of Scope (v1)

If any of these come up during a build phase, surface as a question — do not silently add.

- Multiple endings or branching narrative
- More than 5 puzzles
- More than one room (this is *the attic*, not the whole house)
- Real-time movement / 3D
- Multiplayer
- Difficulty modes
- Achievements or stars
- Leaderboards
- Translation / localization
- Sequels (though the brand setup leaves room: "Grandma's Garden," "Dad's Garage" later)
- Sprite-based animation
- Day/night cycle in the attic
- Custom cipher tools (player solves with pen and paper or browser tab)

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Style isn't consistent across scenes | Medium | Phase 0 gate; lock `--sref` before any final assets |
| Final letter doesn't land emotionally | Medium | Have Kristin read it before recording; iterate |
| Puzzle 5 too hard | High | Hint photograph progresses with player; add explicit nudge if player has been on puzzle 5 for >5 min |
| Voice acting sounds bad | Medium | ElevenLabs first; record yourself only if you nail it |
| Scope creep (a 6th puzzle, a 2nd room) | High | This doc is the contract. New ideas go in v2. |
| Mobile UX feels cramped | Medium | Generate true portrait scenes, not just cropped landscapes |
| Player skips clues and gets stuck | Medium | The photograph hints; explicit "highlight interactive objects" toggle if needed |

---

## 12. Success Criteria

v1 ships successfully if:

- Average play time: 12–18 minutes
- Two unrelated playtesters complete it without external help
- The final letter makes at least one playtester say something like "wow" or get visibly moved
- The aesthetic is consistent enough that a stranger looking at any 3 scenes says "yeah, that's the same place"
- Lighthouse score 90+
- Tile fits cleanly on dadarcade.com home grid
- Total cost (assets, audio, voice) under $50
