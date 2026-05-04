# Granddad's Attic — Phase 0: Style Lock Workbook

**Goal:** End the weekend with a locked Midjourney prompt + `--sref` code that produces visually consistent attic scenes from any angle. Every later asset uses these locked references.

**Time budget:** 4–6 hours over a weekend.
**Cost budget:** ~$10–15 in Midjourney generation credits (one Standard plan month covers this easily).
**Deliverables:** `STYLE.md` with locked prompt and sref, plus 3 verified test angles saved to a `style-reference/` folder.

---

## How to read this document

Each prompt is broken into three parts:
- **Block of text** — copy this entire block into Midjourney
- **What we're testing** — what to look for in results
- **Decision** — what to do based on results

You will run prompts in order. Don't skip ahead. Each step gates the next.

---

## STAGE 1 — Master Prompt Exploration (1 hour)

We're generating 4 different "vibe candidates" of the same scene to find the visual register we want to live in.

### Prompt A — Warm Cinematic Realism

```
Sun-drenched attic interior at golden hour, warm afternoon light streaming through a single dusty dormer window, visible dust motes floating in beams of sunlight, vintage 1940s domestic interior, worn wood floor planks, exposed wooden rafters overhead, old leather suitcases stacked in corner, framed photographs and brass picture frames, faded burgundy and amber color palette, deep shadow contrast, atmospheric photographic still, Kodak Portra 400 film aesthetic, shallow depth of field, 35mm lens at f/2.8, painterly realism, intimate nostalgic mood, no people, empty room --ar 16:9 --style raw --v 7
```

### Prompt B — Painterly Storybook

```
Cozy attic room interior in late afternoon, soft warm sunlight through small window, dust particles in light beams, 1940s vintage objects scattered throughout, wooden trunk, brass radio, old typewriter, framed photos on wall, painted illustration style, hand-painted texture, slightly stylized realism, warm amber and sepia tones, deep cozy shadows, storybook mood, Hayao Miyazaki environmental painting influence, atmospheric, peaceful, empty room with no people --ar 16:9 --style raw --v 7
```

### Prompt C — Myst-Inspired Pre-Rendered

```
Pre-rendered 3D scene of an attic interior, warm golden hour lighting, single window casting long light beams, dust motes visible, 1940s era furniture and possessions, wooden trunk, vintage radio, old uniform on coatrack, framed photographs, painting on wall, classic Myst 1993 pre-rendered aesthetic, Cyan Worlds visual style, soft volumetric lighting, painterly textures, warm sepia and amber palette, mysterious contemplative atmosphere, empty room --ar 16:9 --style raw --v 7
```

### Prompt D — Photographic Documentary

```
Photograph of a quiet attic interior, late afternoon natural light through dormer window, real visible dust in air, weathered wood floors, 1940s-era objects, worn leather trunk, old tube radio, faded military uniform on hanger, framed wedding photograph on wall, brass and wood textures, untouched for decades, documentary photography, natural color grading slightly warm, Leica Q2 lens character, no flash, deep authentic shadows, hauntingly empty, no people --ar 16:9 --style raw --v 7
```

### Decision after Stage 1

Generate all 4 prompts. Stare at the 16 resulting images side by side.

Pick **one prompt** that feels right. The criteria:
- Does it feel like a real place you could walk into?
- Is the warmth there without being saccharine?
- Are there enough specific objects to anchor a story?
- Could you imagine puzzles happening here?

Note the prompt letter (A/B/C/D). This is your **master register**.

---

## STAGE 2 — Master Prompt Refinement (1 hour)

Now we tighten the winning prompt with 3 variations to find the single best establishing shot.

Replace `[MASTER]` below with your winning prompt from Stage 1, then run these variations:

### Refinement 1 — Same prompt, twice more for selection variety

Run your winning master prompt 3 more times. Midjourney gives 4 variations per generation, so you get 12 more candidates to pick from. Pick the single strongest result.

### Refinement 2 — Time of day push

```
[MASTER PROMPT], even more dramatic light beams, low sun angle, longer shadows, more visible dust in air
```

### Refinement 3 — Composition push

```
[MASTER PROMPT], wider angle showing more of the room, trunk in foreground, window in background, balanced composition
```

### Decision after Stage 2

Pick **the single strongest image** across all the Stage 1 + Stage 2 results. This is your **anchor image**.

Save it locally as `style-reference/anchor.png`.

In Midjourney, click on the image and copy its **Job ID** (the `--sref` code). It looks like a long alphanumeric string. **This is the most important string in the entire project.**

Save in `STYLE.md`:
```
ANCHOR PROMPT: [your final prompt text]
ANCHOR SREF: --sref [job-id-here]
```

---

## STAGE 3 — The 3-Angle Consistency Test (90 min)

This is the gate. You must verify that with the locked prompt + sref, you can generate three different angles of the *same* attic and have them feel like one cohesive space.

For all three prompts below: append `--sref [your-anchor-sref] --sw 100` to lock the style. (`--sw 100` is style weight, default is fine.)

### Angle 1 — Trunk-forward composition

```
Attic interior, [original master prompt without composition language], view facing the dormer window, foreground dominated by an old wooden steamer trunk with brass clasps, leather suitcase beside it, warm golden hour sunlight through window casting beams across the trunk, 1940s domestic objects in soft focus background, wooden floor, exposed rafters, atmospheric dust in air, no people, empty room --ar 16:9 --style raw --v 7 --sref [anchor]
```

### Angle 2 — Desk-forward composition

```
Attic interior, [original master prompt language], view of an antique wooden writing desk in foreground, vintage tube radio with dial visible on the desk, leather-bound journal and brass key on desk surface, warm afternoon sun spilling across the desk from a side window, 1940s era, dust motes in light, wooden floor, soft shadows, no people, empty room --ar 16:9 --style raw --v 7 --sref [anchor]
```

### Angle 3 — Coatrack/uniform composition

```
Attic interior, [original master prompt language], view of a wooden coatrack in foreground holding a faded olive-green WWII Navy uniform jacket with brass buttons, sailor cap on top hook, warm afternoon sunlight from window to the side, dust visible in air, wooden wall paneling, framed sepia photograph on wall in background, 1940s era, atmospheric, no people, empty room --ar 16:9 --style raw --v 7 --sref [anchor]
```

### The Test

Look at all three images side by side. Ask:

1. **Lighting consistency** — Same time of day? Same color temperature? Same direction of light?
2. **Material palette** — Same wood tones? Same fabric textures? Same brass quality?
3. **Atmospheric quality** — Same dust density? Same shadow depth? Same mood?
4. **"Same room" test** — Could a stranger looking at these three say "yeah, that's three views of the same attic"?

If any answer is no: refine sref weight (`--sw 50` to 200), regenerate, or pick a stronger anchor and restart from Stage 2.

If all answers are yes: **GATE PASSED.** Save these three images as `style-reference/test-angle-1.png`, `test-angle-2.png`, `test-angle-3.png`. Lock everything in `STYLE.md`.

---

## STAGE 4 — Object Close-Up Test (1 hour)

Establishing shots are the easy part. Close-ups are where styles drift hardest. We need to verify close-ups still feel like the same world.

Run these three close-up prompts using the same `--sref [anchor]`:

### Close-up 1 — The diary

```
Close-up macro shot of an old leather-bound diary on a wooden desk, warm afternoon light from a window above, soft shadows, brown leather worn at corners, small brass lock with five letter dials, gold embossed initials "H.W." on cover, dust motes in light, 1940s era, vintage photographic still, painterly realism, atmospheric, no people --ar 16:9 --style raw --v 7 --sref [anchor]
```

### Close-up 2 — The radio

```
Close-up of a vintage 1940s tube radio on a wooden desk, brown bakelite case, brass tuning dial showing frequency numbers 88-108, illuminated dial, warm afternoon sunlight, dust in air, soft shadows, painterly photographic, 1940s domestic interior, no people --ar 16:9 --style raw --v 7 --sref [anchor]
```

### Close-up 3 — The badge

```
Close-up of a tarnished brass military badge in the open palm of an old leather glove on a wooden surface, US Navy insignia, engraved text barely visible, warm afternoon light, atmospheric dust, painterly photographic still, 1940s era, intimate nostalgic mood, no people --ar 16:9 --style raw --v 7 --sref [anchor]
```

### Decision after Stage 4

Compare these three close-ups to the three establishing shots from Stage 3. Same color world? Same lighting register? Same material quality?

If yes: **STYLE LOCK COMPLETE.** Move to Stage 5 documentation.

If no: this is normal. Close-ups often need a slightly different prompt structure. Try:
- Reducing `--sw` to 50 (less style weight, more prompt freedom)
- Or, add tone-matching language: "matching warm sepia and amber palette of attic interior"
- Iterate until consistency holds

---

## STAGE 5 — Lock and Document (30 min)

Create `/attic/STYLE.md` with the following filled in:

```markdown
# Granddad's Attic — Locked Visual Style

## Anchor sref
--sref [long-id-here]
--sw 100  (default; close-ups may use --sw 50)

## Master prompt template
[paste your final winning master prompt here, with {SCENE_DESCRIPTION} placeholder where the scene-specific language goes]

## Master prompt — full example
[paste the full prompt that produced the anchor image]

## Locked palette (from anchor image)
- Warm wood: #[hex]
- Sun amber: #[hex]
- Deep shadow: #[hex]
- Window blue: #[hex]
- Brass: #[hex]
- Faded leather: #[hex]

## Approved test angles (visual references)
- style-reference/anchor.png
- style-reference/test-angle-1-trunk.png
- style-reference/test-angle-2-desk.png
- style-reference/test-angle-3-coatrack.png
- style-reference/closeup-1-diary.png
- style-reference/closeup-2-radio.png
- style-reference/closeup-3-badge.png

## Generation rules for Phase 2
1. Every generation uses --sref [anchor-id]
2. Default --sw 100 for establishing shots
3. Use --sw 50 for tight close-ups if drift is visible
4. --ar 16:9 for desktop, --ar 9:16 for mobile portrait
5. Always include "warm afternoon golden hour light"
6. Always include "1940s era" for material consistency
7. Never include people or pets
8. Always end prompt with "--style raw --v 7"

## Rejected directions (do not regenerate these)
- [list any prompt variations that failed the consistency test, so you don't waste credits trying them again]

## Phase 2 generation list
[copy from Phase 2 plan once written]
```

Save anchor image and all 6 test images to `style-reference/` folder. Commit the entire `/attic/style-reference/` folder to the repo. **This is your visual contract.**

---

## Common pitfalls and fixes

**Problem: Each generation produces beautiful but unrelated rooms.**
Fix: You don't have an sref locked yet, or your sref weight is too low. Set `--sw 100` minimum.

**Problem: Sref locks look but kills variety — every angle looks identical.**
Fix: Lower `--sw` to 50. Style is suggested, not enforced. Compositions vary more.

**Problem: Close-ups feel like a different game.**
Fix: Add explicit color callbacks to the close-up prompt: "warm amber and sepia palette, matching golden hour interior." And try `--sw 50` to give the prompt more weight.

**Problem: Light direction inconsistent across angles.**
Fix: Always specify "warm afternoon sunlight from [side/dormer/west] window" in every prompt. Pick one direction (left? right? overhead?) and stick to it.

**Problem: Period drift — some images feel 1920s, others 1960s.**
Fix: Always anchor with "1940s era" early in the prompt. Add specific objects: "tube radio, military uniform, sepia photographs."

**Problem: People keep appearing despite "no people."**
Fix: Add `--no people, person, figure, hands` to the prompt parameters.

---

## When to call it done

You're done with Phase 0 when:

1. You have a `STYLE.md` file with a locked sref code
2. You have 7 reference images saved to `style-reference/`
3. The 3 establishing angles feel like the same room to a stranger
4. The 3 close-ups feel like they live in that same room
5. You can generate a 4th never-before-seen angle right now and it fits without thinking

If all five hold: ship Phase 0 and move to Phase 2 (full asset generation).

If any one fails: iterate before moving on. The cost of a bad style lock is regenerating 25 final assets later.

---

## Phase 2 preview (do not start this weekend)

After Phase 0 ships, Phase 2 generates the full asset list:

- 6 establishing vantage points
- 10 close-up scenes
- 2 special transition scenes (floorboard reveal, painting slide)
- 1 ending scene
- All in 16:9 desktop and 9:16 mobile portrait variants
- ~30 final images total
- Estimated 60–100 generations to land 30 winners
- Estimated 4–6 hours over a weekend with a locked style

**But not yet. This weekend, only Phase 0.**
