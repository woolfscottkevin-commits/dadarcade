"""Layer by Layer 2: four mini builds.

    mini-sofa          Cushion Sofa and Coffee Table (a cozy living-room corner)
    mini-doorbell      Copper Trumpet Doorbell (a front door with a working trumpet doorbell)
    mini-fairy-house   Mushroom Fairy House (a toadstool cottage in a firefly garden)
    mini-balloon       Mini Hot Air Balloon (striped wool balloon on a little grass hill)

Minis have one tier. x runs east, z runs south (toward the camera), y is up; y = 0 sits on the grass.
"""
import math, random
from lbl import *


# ---------------------------------------------------------------- small helpers
def _inward(dx, dz):
    """The side of a cell that faces the centre of a round shape (for stairs whose tall half points in)."""
    if abs(dx) >= abs(dz):
        return 'W' if dx > 0 else 'E'
    return 'N' if dz > 0 else 'S'


def _anchor(b, shell, room, mat):
    """Make a round shell buildable layer by layer. Where a ring steps in or out, its blocks can touch
    the ring below only at a corner, and the game has nothing to place them against. For each run of
    blocks with nothing under it or beside it, add one hidden block inside the shell: under the run,
    or beside it on top of something. shell: the shell cells; room: cells it may use; mat(p): its block."""
    N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    solid = lambda p: b.get(*p) is not None
    for y in sorted({p[1] for p in shell}):
        while True:
            layer = {p for p in shell if p[1] == y and solid(p)}
            seen = {p for p in layer if solid((p[0], y - 1, p[2])) or any(
                solid((p[0] + dx, y, p[2] + dz)) and (p[0] + dx, y, p[2] + dz) not in layer for dx, dz in N4)}
            todo = list(seen)
            while todo:
                x, _, z = todo.pop()
                for dx, dz in N4:
                    q = (x + dx, y, z + dz)
                    if q in layer and q not in seen: seen.add(q); todo.append(q)
            # a hidden block must itself have something to go on: a block under it, or beside it (and held)
            held = lambda q: solid((q[0], q[1] - 1, q[2])) or any(
                solid(n) and (n[1] < y or n in seen or n not in layer) for n in ((q[0] + dx, q[1], q[2] + dz) for dx, dz in N4))
            fix = None
            for (x, _, z) in sorted(layer - seen):
                for q in [(x, y - 1, z)] + [(x + dx, y, z + dz) for dx, dz in N4]:
                    if q in room and not solid(q) and held(q): fix = q; break
                if fix: break
            if fix is None: break
            b.set(*fix, mat(fix)); shell = set(shell) | {fix}


def _edge(cells, dx, dz):
    return any((dx + ex, dz + ez) not in cells for ex, ez in ((1, 0), (-1, 0), (0, 1), (0, -1)))


# ================================================================ 1. Cushion Sofa and Coffee Table
def sofa_corner(post='stripped_spruce_log', panel='white_concrete', cap='slab', inner='1', crown='1', floor='oak_planks', H='4', table='dark_oak_planks'):
    b = Build('Cushion Sofa and Coffee Table')
    X1, Z1 = 6, 6                     # floor x 0..6, z 0..6; walls on the north (z=-1) and west (x=-1)
    PANEL, POST, FLOOR = panel, post, floor
    H = int(H)
    # floor with a log frame on the two open sides
    b.fill(0, 0, 0, X1, 0, Z1, FLOOR)
    for x in range(0, X1 + 1): b.set(x, 0, Z1, POST, a='x')
    for z in range(0, Z1): b.set(X1, 0, z, POST, a='z')
    # walls: a log sill, white panels, a cap; posts at the corner and both ends
    for x in range(-1, X1 + 1):
        b.set(x, 0, -1, POST, a='x')
        for y in range(1, H + 1): b.set(x, y, -1, PANEL)
        if cap == 'log': b.set(x, H + 1, -1, POST, a='x')
        if cap == 'slab': b.set(x, H + 1, -1, FLOOR, 'slab')
    for z in range(0, Z1 + 1):
        b.set(-1, 0, z, POST, a='z')
        for y in range(1, H + 1): b.set(-1, y, z, PANEL)
        if cap == 'log': b.set(-1, H + 1, z, POST, a='z')
        if cap == 'slab': b.set(-1, H + 1, z, FLOOR, 'slab')
    top = H + 1 if cap == 'log' else H
    for (x, z) in ((-1, -1), (X1, -1), (-1, Z1)):
        b.fill(x, 0, z, x, top, z, POST)
    if cap == 'slab':
        for (x, z) in ((-1, -1), (X1, -1), (-1, Z1)): b.set(x, H + 1, z, FLOOR, 'slab')
    # inside: posts stand one block out from the panels, with a crown of upside-down stairs between
    if inner in ('1', 'corner'):
        for (x, z) in (((0, 0), (X1, 0), (0, Z1)) if inner == '1' else ((0, 0),)):
            b.fill(x, 1, z, x, H, z, POST)
    if crown == '1':
        for x in range(1, X1): b.set(x, H, 0, FLOOR, 'stairs', f='N', h='top')
        for z in range(1, Z1): b.set(0, H, z, FLOOR, 'stairs', f='W', h='top')
    # window in the west wall with a window seat
    for z in (2, 3, 4):
        for y in (2, 3): b.set(-1, y, z, 'glass', 'pane')
        b.set(0, 1, z, FLOOR, 'slab', h='top')
    b.set(0, 2, 3, 'yellow_wool', 'cushion'); b.set(0, 2, 4, 'white_wool', 'cushion')
    # outside: a post that splits the north wall in two, shutters and a flower sill on the window, bushes
    for y in range(1, H + 1): b.set(2, y, -1, POST)
    for y in (2, 3):
        b.set(-2, y, 1, 'spruce_trapdoor', 'trapdoor', open=True, side='E')
        b.set(-2, y, 5, 'spruce_trapdoor', 'trapdoor', open=True, side='E')
    for z in (2, 3, 4): b.set(-2, 1, z, 'spruce_trapdoor', 'trapdoor', h='top')
    b.set(-2, 2, 2, 'flower_pot', 'pot', plant='poppy'); b.set(-2, 2, 4, 'flower_pot', 'pot', plant='dandelion')
    b.set(-2, 0, -2, 'azalea_leaves'); b.set(-3, 0, -1, 'azalea_leaves'); b.set(-2, 0, 0, 'flowering_azalea', 'plant')
    b.set(1, 0, -2, 'short_grass', 'tuft'); b.set(4, 0, -2, 'dandelion', 'flower')

    # sofa in the north nook: wool base, wool stairs for the back and arms, three cushions
    S = 'cyan_wool'
    for x in range(1, 6):
        b.set(x, 1, 0, S); b.set(x, 1, 1, S)
    for x in range(2, 5):
        b.set(x, 2, 0, S, 'stairs', f='N')
    for z in (0, 1):
        b.set(1, 2, z, S, 'stairs', f='W'); b.set(5, 2, z, S, 'stairs', f='E')
    for x, c in zip(range(2, 5), ('yellow_wool', 'white_wool', 'yellow_wool')):
        b.set(x, 2, 1, c, 'cushion')
    # shelves above the sofa
    for x in range(2, 5):
        b.set(x, 3, 0, 'oak_shelf', 'shelf', side='N')

    # floor lamp, bookshelf and a side table
    b.set(0, 1, 1, 'spruce_planks', 'fence'); b.set(0, 2, 1, 'spruce_planks', 'fence'); b.set(0, 3, 1, 'lantern', 'lantern')
    b.set(0, 1, 5, 'bookshelf'); b.set(0, 2, 5, 'flower_pot', 'pot', plant='flowering_azalea')
    b.set(X1, 1, 1, 'barrel'); b.set(X1, 2, 1, 'white_candle_lit', 'candle', n=2)

    # rug and coffee table
    for x in range(1, 6):
        for z in range(2, 6):
            edge = x in (1, 5) or z in (2, 5)
            b.set(x, 1, z, 'red_carpet' if edge else 'white_carpet', 'carpet')
    b.set(2, 1, 3, table, 'stairs', f='W', h='top')
    b.set(3, 1, 3, table, 'slab', h='top')
    b.set(4, 1, 3, table, 'stairs', f='E', h='top')
    b.set(2, 2, 3, 'flower_pot', 'pot', plant='poppy')
    return b


# ================================================================ 2. Copper Trumpet Doorbell
def doorbell(roof='deepslate_tiles', porch='stone_bricks', awning='slab', wall='white_concrete'):
    b = Build('Copper Trumpet Doorbell')
    X1, Z1 = 6, 4                     # house x 0..6, z 0..4, front wall at z = 4
    LOG, WALL, ROOF, BASE = 'stripped_dark_oak_log', wall, roof, 'stone_bricks'
    b.fill(0, 0, 0, X1, 0, Z1, BASE)
    b.fill(1, 0, 1, X1 - 1, 0, Z1 - 1, 'spruce_planks')
    b.walls(0, 0, X1, Z1, 1, 3, WALL)
    for x in (0, X1):
        for z in (0, Z1): b.fill(x, 1, z, x, 3, z, LOG)
    gable(b, 0, X1, 0, Z1, 4, ROOF, o=1, gable_mat=WALL, axis='z')
    for x in range(0, X1 + 1): b.set(x, 4, Z1, LOG, a='x'); b.set(x, 4, 0, LOG, a='x')
    for z in range(1, Z1): b.set(0, 4, z, LOG, a='z'); b.set(X1, 4, z, LOG, a='z')
    for y in (5, 6): b.set(3, y, Z1, 'glass', 'pane'); b.set(3, y, 0, 'glass', 'pane')
    # copper door in the middle. The bell button is 2 blocks away, so it never opens the door.
    door(b, 3, 1, Z1, 'waxed_copper_door', 'S')
    # windows are 2 high so they show up on the white walls
    for y in (2, 3):
        b.set(1, y, Z1, 'glass', 'pane')                       # front, with a potted flower under it
        b.set(X1, y, 2, 'glass', 'pane'); b.set(0, y, 2, 'glass', 'pane'); b.set(3, y, 0, 'glass', 'pane')
        for d in (1, 3):                                       # shutters on the side and back windows
            b.set(X1 + 1, y, d, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
            b.set(-1, y, d, 'spruce_trapdoor', 'trapdoor', open=True, side='E')
            b.set(d + 1, y, -1, 'spruce_trapdoor', 'trapdoor', open=True, side='S')
    b.set(1, 1, Z1 + 1, 'flower_pot', 'pot', plant='poppy')
    # porch and steps
    b.fill(0, 0, Z1 + 1, X1, 0, Z1 + 2, porch)
    for x in range(2, 5): b.set(x, 0, Z1 + 3, porch, 'stairs', f='N')
    for z in range(Z1 + 4, Z1 + 6): b.set(3, -1, z, 'dirt_path')
    # canopy over the door, a lantern, bushes
    for x in (2, 3, 4):
        if awning == 'slab': b.set(x, 3, Z1 + 1, ROOF, 'slab')
        elif awning == 'stairs': b.set(x, 3, Z1 + 1, ROOF, 'stairs', f='N')
    b.set(3, 1, Z1 + 1, 'brown_carpet', 'carpet')
    b.set(2, 2, Z1 + 1, 'waxed_copper_lantern', 'lantern', hang=True)
    b.set(0, 1, Z1 + 2, 'spruce_planks', 'fence'); b.set(0, 2, Z1 + 2, 'waxed_copper_lantern', 'lantern')
    b.set(-1, 0, Z1 + 1, 'azalea_leaves'); b.set(-1, 0, Z1 + 2, 'flowering_azalea', 'plant')
    b.set(-1, 0, 1, 'azalea_leaves'); b.set(-1, 0, 3, 'flowering_azalea', 'plant')
    # inside: a rug and a barrel with a plant
    for x in range(2, 5):
        for z in (1, 2): b.set(x, 1, z, 'red_carpet' if x != 3 else 'white_carpet', 'carpet')
    b.set(1, 1, 1, 'barrel'); b.set(1, 2, 1, 'flower_pot', 'pot', plant='flowering_azalea')
    # the doorbell: button at eye level, dust underneath it, along to the note block on copper
    b.set(5, 2, Z1 + 1, 'oak_button', 'button', side='N')
    b.set(5, 1, Z1 + 1, 'redstone_dust_off', 'dust'); b.set(6, 1, Z1 + 1, 'redstone_dust_off', 'dust')
    b.set(7, 0, Z1 + 1, 'waxed_copper_block'); b.set(7, 1, Z1 + 1, 'note_block')
    return b


# ================================================================ 3. Mushroom Fairy House
def fairy_house(trunk_r='2.3', cap='dome', rim='4.5'):
    b = Build('Mushroom Fairy House')
    cx, cz = 4, 4
    STEM, CAP = 'mushroom_stem', 'red_mushroom_block'
    # trunk: a round mushroom stem, 5 wide and 6 tall (it reaches up inside the cap rim)
    trunk = disc(float(trunk_r))
    for y in range(0, 6):
        for (dx, dz) in trunk:
            if _edge(trunk, dx, dz): b.set(cx + dx, y, cz + dz, STEM)
    # cap: a drooping rim, straight sides 2 high, a rounded shoulder and a flat crown. Hollow inside.
    # y = 6 is solid: it is the ceiling the inside lantern hangs from.
    if cap == 'flat':
        layers = [(5, 4.2, 'rim'), (6, 4.2, 'solid'), (7, 3.6, 'shell'), (8, 2.2, 'solid')]
    else:
        layers = [(5, float(rim), 'rim'), (6, 4.5, 'solid'), (7, 4.2, 'shell'), (8, 3.5, 'shell'), (9, 2.3, 'solid')]
    for i, (y, r, kind) in enumerate(layers):
        here = disc(r); up = disc(layers[i + 1][1]) if i + 1 < len(layers) else set()
        for (dx, dz) in here:
            if kind == 'rim' and not _edge(here, dx, dz): continue
            if kind == 'shell' and (dx, dz) in up and not _edge(here, dx, dz): continue
            b.set(cx + dx, y, cz + dz, CAP)
    # the upper rings step in, so each one gets a hidden block to rest on (inside the cap, out of sight)
    upper = [(y, r) for (y, r, kind) in layers if y > 6]
    _anchor(b, {p for p in b.c if p[1] > 6}, {(cx + dx, y, cz + dz) for (y, r) in upper for (dx, dz) in disc(r)}, lambda p: CAP)
    # white spots on the cap
    for (dx, y, dz) in [(3, 7, 2), (-3, 7, 2), (0, 7, 4), (4, 6, -1), (-4, 6, 1), (-2, 9, 1), (1, 9, 0),
                        (-3, 7, -2), (1, 6, 4), (-4, 6, -2), (-1, 6, -4), (-3, 8, 0), (2, 6, -4)]:
        p = (cx + dx, y, cz + dz)
        if p in b.c: b.set(*p, STEM)
    # door, windows with shutters
    door(b, cx, 0, cz + 2, 'spruce_door', 'S')
    b.set(cx + 2, 2, cz, 'glass', 'pane'); b.set(cx - 2, 2, cz, 'glass', 'pane'); b.set(cx, 2, cz - 2, 'glass', 'pane')
    for d in (-1, 1):
        b.set(cx + 3, 2, cz + d, 'spruce_trapdoor', 'trapdoor', open=True, side='W')      # east window
        b.set(cx - 3, 2, cz + d, 'spruce_trapdoor', 'trapdoor', open=True, side='E')      # west window
        b.set(cx + d, 2, cz - 3, 'spruce_trapdoor', 'trapdoor', open=True, side='S')      # back window
    # shelf mushrooms on the trunk
    b.set(cx + 3, 1, cz - 1, 'shelf_mushroom', 'shelf_mushroom', side='W', big=True)
    b.set(cx + 2, 3, cz + 2, 'shelf_mushroom', 'shelf_mushroom', side='N')
    b.set(cx - 1, 1, cz + 3, 'shelf_mushroom', 'shelf_mushroom', side='N')
    b.set(cx - 3, 3, cz - 1, 'shelf_mushroom', 'shelf_mushroom', side='E', big=True)
    # inside: a plank floor, a straw bed, a little table with a candle, a lantern from the ceiling
    b.fill(cx - 1, -1, cz - 1, cx + 1, -1, cz + 1, 'spruce_planks')
    b.set(cx - 1, 0, cz, 'straw_bed', 'straw_bed', part='foot', f='N'); b.set(cx - 1, 0, cz - 1, 'straw_bed', 'straw_bed', part='head', f='N')
    b.set(cx + 1, 0, cz - 1, 'barrel'); b.set(cx + 1, 1, cz - 1, 'white_candle_lit', 'candle', n=2)
    b.set(cx, 5, cz, 'lantern', 'lantern', hang=True)
    # lanterns hanging from the rim: two either side of the door, two at the back
    rim_cells = disc(float(rim))
    for x in (cx - 2, cx + 2):
        zs = [z2 for (dx, z2) in rim_cells if dx == x - cx]
        b.set(x, 4, cz + max(zs), 'lantern', 'lantern', hang=True)
        b.set(x, 4, cz + min(zs), 'lantern', 'lantern', hang=True)
    # a little toadstool: a 3 x 3 cap with one block on top and a white spot
    tx_, tz_ = cx - 4, cz + 5
    b.fill(tx_, 0, tz_, tx_, 1, tz_, STEM)
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1): b.set(tx_ + dx, 2, tz_ + dz, CAP)
    b.set(tx_, 3, tz_, CAP); b.set(tx_ + 1, 2, tz_ + 1, STEM)
    # garden: firefly bushes in three clumps, a lantern post by the path, flowers
    for z in range(cz + 3, cz + 6): b.set(cx, -1, z, 'dirt_path')
    for (x, z) in [(cx - 2, cz + 4), (cx - 3, cz + 4), (cx - 2, cz + 5),      # left of the path
                   (cx + 3, cz + 3), (cx + 4, cz + 3),                        # by the shelf mushrooms
                   (cx - 4, cz - 2), (cx - 4, cz - 3)]:                       # at the back
        b.set(x, 0, z, 'firefly_bush', 'plant')
    b.set(cx + 1, 0, cz + 6, 'spruce_planks', 'fence'); b.set(cx + 1, 1, cz + 6, 'lantern', 'lantern')
    for (x, z) in [(cx - 1, cz + 5), (cx + 2, cz + 6), (cx - 2, cz + 6), (cx + 2, cz + 4), (cx + 1, cz + 5), (cx - 5, cz + 3), (cx + 5, cz + 4), (cx + 4, cz + 5), (cx - 3, cz + 3)]:
        b.set(x, 0, z, 'wildflowers', 'plant')
    for (x, z) in [(cx + 5, cz + 3), (cx + 3, cz + 6), (cx + 5, cz - 2), (cx - 5, cz - 1)]:
        b.set(x, 0, z, 'pink_petals', 'plant')
    for (x, z) in [(cx - 1, cz + 3), (cx + 1, cz + 3)]:
        b.set(x, -1, z, 'moss_block')
    return b


# ================================================================ 4. Mini Hot Air Balloon
BALLOON_SHAPES = {
    'round': [1.5, 2.6, 3.3, 3.7, 3.7, 3.7, 3.3, 2.6, 1.5],
    'drop': [1.5, 2.2, 2.8, 3.3, 3.7, 3.7, 3.7, 3.3, 2.6, 1.5],
    'big': [1.5, 2.2, 3.0, 3.6, 4.2, 4.2, 4.2, 3.6, 3.0, 1.6],
    'bulb': [1.5, 2.0, 2.6, 3.2, 3.7, 4.1, 4.1, 4.1, 3.8, 3.2, 2.2],   # narrow mouth, widest up high, round crown
}


def balloon(shape='bulb', colors='red_wool/white_wool', gores='8', band='', crown='yellow_wool'):
    b = Build('Mini Hot Air Balloon')
    cx, cz = 4, 4
    cols = colors.split('/')
    # little grass hill, a bit lopsided so it looks natural
    low = disc(4.2)
    high = disc(2.6) | {(-3, 0), (-3, 1), (0, 3), (1, 3), (-1, 3)}
    for (dx, dz) in low: b.set(cx + dx, 0, cz + dz, 'grass_block')
    for (dx, dz) in high: b.set(cx + dx, 1, cz + dz, 'grass_block')
    def on_hill(dx, dz):                     # the first empty layer above the hill at this spot
        return 2 if (dx, dz) in high else 1 if (dx, dz) in low else 0
    for (dx, dz, f) in [(-3, 3, 'dandelion'), (3, 2, 'poppy'), (-4, -1, 'oxeye_daisy'), (2, 4, 'cornflower'),
                        (-2, 4, 'poppy'), (4, -1, 'dandelion'), (-1, -4, 'cornflower')]:
        b.set(cx + dx, on_hill(dx, dz), cz + dz, f, 'flower')
    for (dx, dz) in [(-2, -3), (3, -2), (-4, 2), (4, 1)]:
        b.set(cx + dx, on_hill(dx, dz), cz + dz, 'short_grass', 'tuft')
    base = 2
    # basket: barrels at the corners, open trapdoor sides, a campfire burner in the middle
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            x, z = cx + dx, cz + dz
            if dx and dz: b.set(x, base, z, 'barrel')
            elif dx or dz:
                side = 'E' if dx == 1 else 'W' if dx == -1 else 'S' if dz == 1 else 'N'
                b.set(x, base, z, 'spruce_trapdoor', 'trapdoor', open=True, side=side)
    b.set(cx, base, cz, 'campfire', 'campfire')
    b.set(cx, base - 1, cz, 'hay_block')          # a signal fire: the smoke rises up the open mouth into the balloon
    # tether: an Iron Chain from the basket to a fence post on the hill
    b.set(cx + 2, base, cz, 'chain', 'chain', a='x')
    b.set(cx + 3, 1, cz, 'spruce_planks', 'fence'); b.set(cx + 3, 2, cz, 'spruce_planks', 'fence')
    # envelope: stacked rings, striped, stairs smooth the top and bottom
    rad = BALLOON_SHAPES[shape]
    y0 = base + 5
    n = int(gores)
    # a band only goes on a row with the same width above and below it, so every cell there is a full block
    flat = [i for i in range(1, len(rad) - 1) if disc(rad[i]) <= disc(rad[i - 1]) and disc(rad[i]) <= disc(rad[i + 1])]
    band_row = flat[len(flat) // 2] if (band and flat) else None
    def col(i, dx, dz):
        if i == band_row: return band
        a = (math.atan2(dz, dx) + math.pi / n) % (2 * math.pi)
        return cols[int(a / (2 * math.pi) * n) % len(cols)]
    for i, r in enumerate(rad):
        y = y0 + i
        top = i == len(rad) - 1
        here = disc(r)
        below = disc(rad[i - 1]) if i > 0 else set()
        above = disc(rad[i + 1]) if not top else set()
        for (dx, dz) in here:
            if (dx, dz) in above and (dx, dz) in below and not _edge(here, dx, dz): continue
            c = col(i, dx, dz)
            if i == 0:                                    # the skirt around the open mouth
                if (dx, dz) != (0, 0): b.set(cx + dx, y, cz + dz, 'yellow_wool', 'stairs', f=_inward(dx, dz), h='top')
                continue
            if top:                                       # a crown patch in the middle, so the stripes do not meet in a cross
                if crown and abs(dx) <= 1 and abs(dz) <= 1: c = crown
                b.set(cx + dx, y, cz + dz, c, 'slab'); continue
            if (dx, dz) not in above: b.set(cx + dx, y, cz + dz, c, 'stairs', f=_inward(dx, dz)); continue
            if (dx, dz) not in below: b.set(cx + dx, y, cz + dz, c, 'stairs', f=_inward(dx, dz), h='top'); continue
            b.set(cx + dx, y, cz + dz, c)
    # ropes from the basket corners up to the skirt
    for dx in (-1, 1):
        for dz in (-1, 1):
            for y in range(base + 1, y0): b.set(cx + dx, y, cz + dz, 'chain', 'chain')
    # the rings step out and in, so some blocks would only touch the ring below at a corner:
    # give each of those runs one hidden block to rest on, inside the balloon
    _anchor(b, {p for p in b.c if p[1] >= y0}, {(cx + dx, y0 + i, cz + dz) for i, r in enumerate(rad) for (dx, dz) in disc(r) if (dx, dz) != (0, 0)},
            lambda p: col(p[1] - y0, p[0] - cx, p[2] - cz))
    return b


BUILDS = {
    'mini-sofa': sofa_corner,
    'mini-doorbell': doorbell,
    'mini-fairy-house': fairy_house,
    'mini-balloon': balloon,
}

CHANGELOG = 'https://www.minecraft.net/en-us/article/minecraft--bedrock-edition-26-50-changelog'

META = {
    'mini-sofa': dict(
        title='Cushion Sofa and Coffee Table', kind='mini', diff=1, mode='Survival',
        pitch='Real seats at last: a comfy wool sofa with cushions.',
        blurb='Wilderness Bound added cushions, so your sofa can have soft seats at last. '
              'Build a cozy corner with a wool sofa, a coffee table, a lamp and a rug. '
              'Then sit on a cushion and relax.',
        teaches=['Soft shapes with wool stairs', 'Cushions for real seats', 'Upside-down stairs for table legs'],
        tips=[('know', 'Cushions come from slabs', 'Put 3 wool slabs of the same color in a row on a crafting table. You get 1 cushion.'),
              ('pro', 'Change the color', 'Changed your mind? Craft any cushion with a dye to change its color.'),
              ('pro', 'A window seat', 'A cushion can go on any flat surface. The window seat here is a row of top slabs with cushions on them.')],
        challenge='Make it yours: Pick your favorite sofa color and mix up the cushions. Then add an armchair: one wool block, two wool stairs and a cushion.',
        dad="Dad's Corner: Which room in your home should be next? Walk it out in steps together, then build it one block per step.",
        needs='26.50',
        new_blocks=['Cyan Wool Stairs', 'Yellow Cushion', 'White Cushion', 'Oak Shelf'],
        palette=['Cyan Wool', 'White Concrete', 'Oak Planks', 'Stripped Spruce Log'],
        time=0.39, ground='grass_block', order=3,
        sources=[CHANGELOG, 'https://minecraft.wiki/w/Cushion'],
    ),
    'mini-doorbell': dict(
        title='Doorbell Cottage', kind='mini', diff=1, mode='Survival',
        pitch='Press the button and a copper trumpet toots hello.',
        blurb='This is a real doorbell that works. The button by the door sends power along the redstone dust to a note block. '
              'The note block sits on copper, so it plays a trumpet.',
        teaches=['A button and redstone dust', 'Copper trumpet note blocks', 'Log frames on white walls'],
        tips=[('know', 'Copper makes a trumpet', 'A note block on top of copper plays a trumpet. Each copper stage sounds different. Green copper sounds deeper.'),
              ('warn', 'Leave air on top', 'Keep the space above the note block empty. A block there stops the trumpet.'),
              ('pro', 'Keep the tune', 'Copper slowly turns green, and the trumpet changes with it. Waxed copper stays the same, so this build uses Waxed Block of Copper.'),
              ('warn', 'Two blocks from the door', 'A button powers the block it is on. If that block touches the door, the door opens too. So the button sits two blocks away.')],
        challenge='Make it yours: Tap the note block to change its note. There are 25 notes to try. Can you find the best ding-dong?',
        dad="Dad's Corner: Ring the bell, then swap the copper for Oxidized Copper. Can your grown-up hear the change with their eyes closed?",
        needs='26.10',
        new_blocks=['Waxed Copper Lantern'],
        palette=['White Concrete', 'Stripped Dark Oak Log', 'Deepslate Tiles', 'Stone Bricks'],
        time=0.39, ground='grass_block', order=4,
        sources=['https://www.minecraft.net/en-us/updates/tiny-takeover-drop', 'https://minecraft.wiki/w/Note_Block',
                 'https://minecraft.wiki/w/Button', 'https://minecraft.wiki/w/Redstone_mechanics'],
    ),
    'mini-fairy-house': dict(
        title='Mushroom Fairy House', kind='mini', diff=1, mode='Creative',
        pitch='A spotty toadstool cottage in a glowing firefly garden.',
        blurb='A tiny cottage hides inside this giant mushroom. White spots dot the red cap, and shelf mushrooms grow on the stem. '
              'Switch to Night to see the lanterns glow.',
        teaches=['Round shapes from circles', 'Hollow domes', 'Lights for Night mode'],
        tips=[('know', 'Fireflies come out at night', 'A firefly bush gives off a little light. When it gets dark, glowing fireflies fly around it.'),
              ('pro', 'Grow a firefly garden', 'Use bone meal on a firefly bush. It spreads to the blocks around it.'),
              ('know', 'Bigger shelf mushrooms', 'Bone meal turns a small shelf mushroom into a big one. They are a little bit bouncy, too.'),
              ('warn', 'Mushroom blocks in Survival', 'Breaking a mushroom block only gives you mushrooms, or nothing. Use a Silk Touch tool to keep the block.'),
              ('warn', 'A straw bed is for one night', 'A straw bed breaks when you wake up. It does not set your spawn point.')],
        challenge='Make it yours: Build a little toadstool next door from Brown Mushroom Blocks. Join them with a path.',
        dad="Dad's Corner: Switch to Night together and count every light you can find. Which one is the brightest?",
        needs='26.50',
        new_blocks=['Shelf Mushroom', 'Straw Bed', 'Firefly Bush', 'Wildflowers'],
        palette=['Red Mushroom Block', 'Mushroom Stem', 'Spruce Trapdoor', 'Firefly Bush'],
        time=0.93, ground='grass_block', order=5,
        sources=['https://minecraft.wiki/w/Firefly_Bush', 'https://minecraft.wiki/w/Shelf_Mushroom', CHANGELOG,
                 'https://minecraft.wiki/w/Mushroom_Block', 'https://minecraft.wiki/w/Straw_Bed'],
    ),
    'mini-balloon': dict(
        title='Mini Hot Air Balloon', kind='mini', diff=1, mode='Survival',
        pitch='A striped balloon, made round with the new wool stairs.',
        blurb='Wool stairs and slabs are new in 26.50, and they make this balloon smooth and round. '
              'Red and white stripes wrap all the way around. An Iron Chain rope ties the basket to the hill.',
        teaches=['Round shapes with wool stairs', 'Stripes that wrap around', 'Iron Chain ropes'],
        tips=[('pro', 'Stairs point in', "Point every stair's tall side toward the middle of the circle. The low step faces out, so the balloon curves."),
              ('pro', 'Craft plenty', '6 wool blocks make 4 wool stairs. 3 wool blocks make 6 wool slabs.'),
              ('know', 'Smoke signal', 'The hay bale under the burner makes a signal fire. Its smoke rises 24 blocks, right into the balloon.'),
              ('warn', 'No Silk Touch?', 'Grass blocks turn into dirt when you mine them. Build the hill from dirt. Grass spreads onto dirt next to it.')],
        challenge='Make it yours: Pick your own stripe colors. Or make a rainbow, with a new color for each stripe.',
        dad="Dad's Corner: If your balloon could fly anywhere, where would it go? Plan the trip together on a paper map.",
        needs='26.50',
        new_blocks=['Red Wool Stairs', 'White Wool Stairs', 'Yellow Wool Stairs', 'Red Wool Slab', 'White Wool Slab', 'Yellow Wool Slab'],
        palette=['Red Wool', 'White Wool', 'Barrel', 'Spruce Trapdoor'],
        time=0.39, ground='grass_block', order=6,
        sources=[CHANGELOG, 'https://minecraft.wiki/w/Wool_Stairs', 'https://minecraft.wiki/w/Wool_Slab',
                 'https://minecraft.wiki/w/Campfire', 'https://minecraft.wiki/w/Grass_Block'],
    ),
}

