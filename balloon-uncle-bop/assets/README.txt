Balloon Uncle Bop — Art Drop Slots
==================================

The game is 100% playable with no art — every image below has a clean
hand-drawn canvas fallback. Drop an image with the EXACT filename into this
folder and it appears automatically on the next load. No code changes.

IMPORTANT — image format
  Use real PNG or JPG files. iPhone photos are often HEIC (even when the file
  is named ".png") and will NOT load in a browser. If a photo doesn't show up,
  it's almost certainly HEIC — re-export/convert it to PNG or JPG first.
  Any shape/size works: each photo is auto-cropped to a circle (cover-fit), so
  a normal phone photo with a background is fine. A head-and-shoulders crop
  reads best. Big phone photos (5–12 MB) should be downsized to ~700 px for
  fast loading.

FAMILY FACES — the balloons that float up
-----------------------------------------
Every balloon is a RANDOM family member, so all faces appear mixed together in
a level. ONE photo per person (the balloon grows that same photo bigger each
tap to "inflate" — no multiple inflation drawings needed).

  face-dad.png      \
  face-claire.png    >  the family balloons (edit the FACES array in index.html
  face-connor.png   /   to add/rename people — data only, no other changes)

OLIVER — the star (the nephew)
------------------------------
  face-oliver.png   Oliver's photo. Used in TWO places, reserved as a treat:
                    1) the little cheering buddy at the bottom during play
                    2) the BIG "Oliver Wins!" hero on the win screen
                    His face is intentionally kept OFF the lose screen.

GOLD BONUS BALLOON
  (no art needed) a rare golden star balloon is drawn by the game. One tap =
  big bonus points. Pure treat; it never costs a life.

BOMB — the "don't tap me" balloon (Level 3+)
  bomb.png      grumpy / stormy face, clearly DIFFERENT from the happy family
                balloons (red/dark + scowl). If absent, a drawn one is used.

BACKGROUND (optional)
  background.png  full-screen party scene; replaces the gradient. Cover-fit.

Leaderboard: all-time top scores use the site's shared /api/scores backend
(game id "bub", registered in api/scores.js). Players enter 3 initials
(defaults to OLI). It needs the live site to save scores; locally it just
shows "No scores yet".
