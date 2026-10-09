# Layer by Layer 2: the build generator

Python tools that make every 3D build, figure, picture and data file for the web book at
`/layer-by-layer-2`. Volume 1's print engine (`engine.py`, `blocks.py`, `textures.py`) is the
base. Volume 2 adds tiers, figures, extension modules and an exporter for the WebGL book.

## Commands

Use the Python with numpy and Pillow (on this Mac:
`/private/tmp/claude-501/-Users-kevin-Documents-Claude-Code-Working-dadarcade/86ba6449-e80e-4317-8a37-e07d7ed1f04a/scratchpad/venv/bin/python`,
called `$PY` below). Run from the repo root.

| What | Command |
|---|---|
| Look at a build or figure (safe while others work) | `$PY tools/lbl/export.py --preview <slug> [--out DIR]` |
| Full export into `layer-by-layer-2/data` and `img` | `$PY tools/lbl/export.py` (integration only; it rewrites shared files) |
| Minecraft pack (labs), after an export | `$PY tools/lbl/mcpack.py` (`--dry` checks everything and writes nothing) |
| Check every block maps to Bedrock | `$PY tools/lbl/mc/blockmap.py` |

`--preview` prints block counts and size per tier, then writes PNGs from the front (view0),
from the back (view2), and a cutaway at half height. **Open the PNGs with the Read tool and look
at them.** That is the only way to know a build looks good.

## Coordinates

- `x` runs east (right in the pictures), `z` runs south (toward the viewer), `y` is up.
- `y = 0` is the first layer, sitting on the grass. `y = -1` is the ground layer: blocks there replace
  the grass (paths, ponds, flower beds). Nothing goes below `y = -1` except deliberate dug-out
  features (pools), and never below `y = -3`.
- The exporter recentres every build, so start at (0, 0, 0) and build in +x and +z.
- North is up on the layer plans. Put the front door on the south side (+z) unless the design
  needs otherwise: the default camera looks at the south-east corner.

## The build DSL

```python
from lbl import *          # Build, B, reg, tx, gable, hip, disc, ring, door, line3, blob, ...

def cottage():
    b = Build('Cozy Cottage')
    b.fill(0, 0, 0, 8, 0, 6, 'stone_bricks')                 # box fill, inclusive
    b.walls(0, 0, 8, 6, 1, 3, 'oak_planks')                  # 4 walls, x0 z0 x1 z1, y0..y1
    b.set(4, 1, 6, 'oak_planks', 'stairs', f='N')            # one block with a shape
    door(b, 4, 1, 6, 'oak_door', 'S')                        # 2-high door
    gable(b, 0, 8, 0, 6, 4, 'spruce_planks', o=1, gable_mat='oak_planks', axis='x')
    with b.tier(2):                                          # Pro tier extras
        b.fill(-2, 0, 8, 10, 0, 8, 'spruce_planks', 'fence')
    with b.tier(3):                                          # Legend tier extras
        ...
    return b

BUILDS = {'cozy-cottage': cottage}                           # slug -> function
```

`b.set(x, y, z, block_key, shape='full', **state)`; `b.set(..., None)` removes a block.
`b.fill(x0,y0,z0, x1,y1,z1, key, shape, **state)`, `b.walls(x0,z0,x1,z1, y0,y1, key, shape, **state)`,
`b.clear(...)`.

### Shapes and their state

| shape | state | notes |
|---|---|---|
| `full` | `a='x'/'y'/'z'` for logs and pillars; `f='N'/'E'/'S'/'W'` for blocks with a front (furnace, carved pumpkin, piston) | default |
| `slab` | `h='bottom'` or `'top'` | item name from the block's `slab=` name |
| `stairs` | `f` = the side where the **tall back half** is; `h='bottom'`/`'top'` (upside down) | corners join automatically |
| `fence`, `wall`, `pane` | none | connect to neighbours automatically (pane on its own shows a cross) |
| `gate` | `a='x'` or `'z'` (the axis the gate spans) | |
| `door` | `side` = which edge of the cell the panel hugs; `h='lower'`/`'upper'` | use `door(b, x, y, z, key, side)` |
| `trapdoor` | `h='bottom'`/`'top'`, or `open=True, side=...` | shutters: open trapdoor on the wall side |
| `carpet`, `plate`, `detector`, `table`, `chest`, `bush`, `campfire`, `anvil`, `cauldron`, `bell`, `rod` | none | |
| `button`, `lever`, `torch`, `ladder` | `side` (wall it is attached to) or none (on the floor) | |
| `lantern` | `hang=True` to hang under a block | |
| `bed` | `part='head'/'foot'`, `f` = direction the head points | place both halves |
| `hopper` | `f='D'` (down) or N/E/S/W spout | |
| `flower`, `tuft`, `crop` | none | small plants |
| `pot` | `plant='poppy'` (any block key) | flower pot |
| `panel` | `side`, `t` (thickness in px), `y0`, `y1` (0..16), `inset` | signs, banners, frames |
| `dust` | none | redstone dust, connects automatically |

Ext modules add more shapes (see below). Check `EXTRA_SHAPES` for the full list:
`$PY -c "import sys; sys.path.insert(0,'tools/lbl'); from lbl import *; print(sorted(EXTRA_SHAPES))"`.

### Helpers (helpers.py)

`gable(b, x0, x1, z0, z1, ybase, mat, o=1, gable_mat=None, axis='x', ridge='slab')` (x0..z1 is the wall
footprint, `o` the overhang, `axis` the ridge direction) · `hip(...)` pyramid roof · `disc(r)`, `ring(r, th)`,
`disc_even(r)`, `thick_ring(r)` sets of (dx, dz) for circles · `line3(p0, p1)` · `blob(b, cx, cy, cz, r, mat, rng)`
for tree canopies and rocks · `door(...)`. Use `random.Random(seed)` for any randomness so builds are
the same every time.

## Tiers (Volume 2)

Every big build comes in three sizes. Kids pick one; the 3D view can morph between them.

- **Starter (tier 1)**: the core building, about 10 to 15 minutes to build in Creative. It must look
  finished and nice on its own, not like a half build.
- **Pro (tier 2)**: the full build: depth, trim, interior, garden.
- **Legend (tier 3)**: show-off extras: towers, wings, landscaping, lighting, secrets.

Wrap code in `with b.tier(2):` / `with b.tier(3):`. A higher tier may replace a lower tier's block
(`b.set` at the same spot inside the tier block) or remove one (`b.set(..., None)`); use that sparingly,
for things like swapping a plain wall for a window.

## Figures (lessons and redstone)

A figure is a list of frames (each a `Build`). Frame k shows when the reader is on step k; blocks
that change between frames animate. Put them in `tools/lbl/figures2/<topic>.py`:

```python
FIGURES = {'roof-shapes': roof_shapes}   # id -> function returning [Build, Build, ...]
```

Keep figures small (under about 12x12x12) so they read clearly at phone size.

## Extension modules (new blocks, textures, shapes)

Put new blocks in `tools/lbl/ext/<name>.py`. Every module there is imported by `lbl`.

```python
from lbl import *
import numpy as np
# textures are 16x16x4 float arrays (RGBA, 0..255). Make ORIGINAL ones from the helpers in
# textures.py (noise, planks, log_side, log_top, stone, cobble, bricks, panel, wool, concrete,
# terracotta, glass, leaves, ...). Never copy or trace Mojang's textures.
reg('pale_oak_planks', 'Pale Oak Planks', tx.planks('#d9d3cc', 'pop'), color='#d9d3cc',
    stairs='Pale Oak Stairs', slab='Pale Oak Slab', fence='Pale Oak Fence', new='1.21.50')

def shelf(build, p, v):                      # a new shape: boxes in 0..1 units + override
    side = v.get('side', 'N')
    return [(side_panel(side, 6), None)], [side]
EXTRA_SHAPES['shelf'] = shelf
EXTRA_ITEMS['shelf'] = lambda v: B[v['b']].get('shelf_item') or B[v['b']]['name'] + ' Shelf'
```

`reg(key, name, top, side=None, bottom=None, color=..., translucent=False, cutout=False, glow=False,
stairs=..., slab=..., fence=..., wall=..., front=..., light=<0..15>, item=..., new=...)`.
`color` is used on layer plans; pick a colour a kid would call that block. `light` is the light level
the block gives off (look it up on minecraft.wiki). `glow=True` makes it draw full-bright.

## AR models (usdz.py)

| What | Command |
|---|---|
| AR model of every exported build | `$PY tools/lbl/usdz.py` |
| Only some builds, plus preview pictures | `$PY tools/lbl/usdz.py --png DIR <slug> ...` |

Writes `layer-by-layer-2/ar/<slug>.usdz` for AR Quick Look ("see it on your table" on iPad and iPhone).
Run it after `export.py`: it reads only the exported files (`data/blocks.json`, `data/tiles.png`,
`data/builds/<slug>.json`, `data/catalog.json`), so it works for any build.

- **What it makes:** the highest tier of the build on a small diorama base: one layer of the build's
  `ground` from the catalog (default `grass_block`) with a 1-block margin, and dirt under it.
  1 block = 2.5 cm, base at y = 0, centred. Faces are culled like the web engine; whole block faces
  are merged into big repeating quads. One material per tile: a 128px NEAREST copy of the 16px tile,
  cut-out tiles use alpha 0.5, glass and water are see-through, glowing blocks glow.
- **How it is checked:** it packs with `usdzip` and runs `usdchecker --arkit` on every file. Any
  error stops the script. `--png DIR` renders `<slug>.png` (south-east, like the posters) and
  `<slug>-back.png` with `usdrecord`. **Open them with the Read tool** and compare with
  `img/posters/<slug>.webp`. It prints the size; keep each file under 4 MB.
- Needs Apple's USD tools (`usdcat`, `usdzip`, `usdchecker`, `usdrecord`), so run it on the Mac.
- The build page shows the AR button only in browsers with AR Quick Look, and only when
  `ar/<slug>.usdz` exists.

## Minecraft pack (labs: mcpack.py, mc/blockmap.py)

| What | Command |
|---|---|
| Pack with every exported build and tier | `$PY tools/lbl/mcpack.py` |
| Same, but only build and check it | `$PY tools/lbl/mcpack.py --dry` |
| Map every registry block in every shape, check against Mojang's list | `$PY tools/lbl/mc/blockmap.py` |
| Refresh Mojang's block list for a new game version | `$PY tools/lbl/mc/blockmap.py --fetch v1.26.60.x` (a bedrock-samples tag) |

- **What it makes:** `layer-by-layer-2/dl/layer-by-layer-2.mcpack`, a behavior pack with one structure per build and
  tier (`structures/lbl/<slug>_<tier>.mcstructure`, `-` in a slug becomes `_`; one-tier builds are just the slug), and
  `dl/layer-by-layer-2.json`, the index the build page reads. In game: a new Creative world with cheats and the pack on,
  then `/structure load lbl:<name> ~1 ~-1 ~1 0_degrees none layer_by_layer 6`. The page shows the exact line.
- **Hidden:** the "Get it in Minecraft (beta)" card on the build page shows only after `#/build/<slug>?labs=1`
  (`?labs=0` hides it again).
- **Blocks:** `mc/blockmap.py` turns every key + shape + state into a Bedrock block and checks it against
  `mc/mojang-blocks.min.json` (Mojang's own list for the tag it names). A key or shape it does not know stops the
  pack with a list of what is missing: add it to `blockmap.py` (the direction tables there say where each rule came from).
  New states such as `n` (candles, snow), `delay` or `big` are used when the exporter puts them in the palette.
- **Not in the pack:** cushions (entities in game; the index lists them per tier and the page tells kids to add them),
  the head of an extended piston (the piston is written pulled in), the item in an item frame and lectern books.
- Bump `PACK_VERSION` in `mcpack.py` for every release: Minecraft ignores a pack with the same version.

## House rules (do not break)

- **Original pictures only.** Procedural textures, no Mojang textures or traced art.
- **No mobs, characters, logos or real people** in any build, figure or picture. Not even mob-shaped
  blocks (Copper Golem Statue, Dried Ghast, Creaking). A home for an animal shows its space empty.
- **Real blocks only.** Every block must exist in Minecraft Bedrock 26.50+ under that exact name.
  Check minecraft.wiki when unsure. Never use experimental blocks (Ice Crystal, Icicle).
- Kid copy: plain words a 9 to 11 year old can read, short sentences, no em dashes.
