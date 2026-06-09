Balloon Uncle Bop — Art Drop Slots
==================================

The game is 100% playable RIGHT NOW with no art — every image below has a
clean hand-drawn canvas fallback. Drop a PNG with the EXACT filename into this
folder and it will appear automatically on the next load. No code changes.

General rules for every face/balloon image:
  • Square canvas, recommended 512 x 512 px
  • TRANSPARENT background (PNG with alpha)
  • Center the character; leave a little breathing room around the edges
  • The balloon's "string/knot" can be part of the art or left off (the game
    draws a knot + string under each balloon either way)

UNCLE — the main balloon (5 inflation stages, gets bigger + sillier each stage)
  uncle-1.png   stage 1  — small, just a normal happy Uncle face
  uncle-2.png   stage 2  — a bit puffier, bigger grin
  uncle-3.png   stage 3  — rounder, cheeks puffing
  uncle-4.png   stage 4  — really inflated, goofy wide mouth
  uncle-5.png   stage 5  — MAX puff, about to burst, silliest face
  uncle-pop.png (optional) — the frozen mid-pop "silly pop face" shown for a
                blink when it bursts. If missing, the game reuses stage 5.

BOMB — the "don't tap me" balloon (only appears on Level 3)
  bomb.png      grumpy / stormy Uncle, angry brow, clearly DIFFERENT from the
                happy balloons (think red/dark + scowl). Must read as "uh-oh"
                at a glance to a 6-year-old, but stay cute, not scary.

OLIVER — the little buddy at the bottom who reacts to the action (3 poses)
  oliver-idle.png   calm, gentle smile (idle bounce)
  oliver-cheer.png  arms up, big cheer (plays on every pop + level win)
  oliver-sad.png    aww / sad-but-cute (plays if a bomb is tapped)

PIRATE UNCLE — example UNLOCKABLE costume set (unlocks at 50 lifetime pops)
  skin-pirate-1.png … skin-pirate-5.png   same 5 inflation stages as Uncle,
                but in a pirate costume (hat, eye patch, etc.)
  (To add MORE costume sets later: edit the SKINS array near the top of
   index.html — copy the pirate entry, point it at new filenames, set an
   unlockAt threshold. Data only, no other code changes.)

BACKGROUND (optional)
  background.png  full-screen party scene. If present it replaces the default
                CSS/canvas gradient. Any size; it's cover-fit to the screen.
                A landscape-ish image works best across portrait + landscape.
