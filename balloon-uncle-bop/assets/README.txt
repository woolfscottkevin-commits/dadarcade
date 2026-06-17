Balloon Uncle Bop — Art Drop Slots
==================================

The game is 100% playable RIGHT NOW with no art — every image below has a
clean hand-drawn canvas fallback. Drop a PNG with the EXACT filename into this
folder and it will appear automatically on the next load. No code changes.

General rules for every face image:
  • Square canvas, recommended 512 x 512 px
  • TRANSPARENT background (PNG with alpha)
  • Center the face; leave a little breathing room around the edges
  • The balloon's knot + string are drawn by the game underneath, so you only
    need the head/face — no need to draw a balloon body or string.

FAMILY FACES — the balloons that float up
-----------------------------------------
Every balloon is a RANDOM family member, so all faces appear mixed together in
a level. ONE photo per person (the game grows that same photo bigger each tap
to make it "inflate" — you do NOT need multiple inflation drawings).

  face-dad.png      you
  face-claire.png   kid 1
  face-connor.png   kid 2

Want to add a 4th person (or rename someone)? Edit the FACES array near the top
of index.html — copy a line, set a new id/name/img filename + any fallback
palette. Data only, no other code changes. The names shown on the start screen
come straight from that array.

Tip: a tight head-and-shoulders crop on a transparent background reads best at
balloon size. A quick way to get transparent PNGs is any "remove background"
tool, then export at ~512x512.

BOMB — the "don't tap me" balloon (only appears on Level 3+)
  bomb.png      grumpy / stormy face, angry brow, clearly DIFFERENT from the
                happy family balloons (think red/dark + scowl). Must read as
                "uh-oh" at a glance to a 6-year-old, but stay cute, not scary.

OLIVER — the little buddy at the bottom who reacts to the action (3 poses)
  oliver-idle.png   calm, gentle smile (idle bounce)
  oliver-cheer.png  arms up, big cheer (plays on every pop + level win)
  oliver-sad.png    aww / sad-but-cute (plays if a bomb is tapped)

BACKGROUND (optional)
  background.png  full-screen party scene. If present it replaces the default
                CSS/canvas gradient. Any size; it's cover-fit to the screen.
                A landscape-ish image works best across portrait + landscape.
