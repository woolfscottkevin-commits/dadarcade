"""Master Build Showcase: one small 3D diorama beside each story (layer-by-layer-2 showcase.json).

Each figure is a list of frames. The showcase page opens on the LAST frame and lets the reader step
back with "Part 1 of 3" buttons, so the last frame is always the finished scene.
No people, no mobs, no logos: an empty minecart track, an empty campsite, empty streets.
"""
import random
from lbl import *


# ---------------------------------------------------------------------------- small helpers

def keep_ground(frames, top='grass_block'):
    """The 3D book draws its own ground only where no frame has a block below y = 0, so a path that
    arrives in a later frame leaves a hole in the earlier ones. Fill those spots with the ground block
    in the frames that lack them."""
    spots = {p for f in frames for p in f.c if p[1] < 0}
    for f in frames:
        for (x, y, z) in spots:
            if (x, y, z) not in f.c: f.set(x, y, z, top if y == -1 else 'dirt')
    return frames


def flowers(b, spots, rng, kinds=('poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium')):
    for x, z in spots:
        b.set(x, 0, z, rng.choice(kinds), 'flower')


def shutters(b, x, y, z, wall, wood='spruce_trapdoor', h=1):
    """Open trapdoor shutters either side of a window at (x, y, z) in a wall facing `wall` (N/E/S/W)."""
    dx, dz = DIRS[wall]
    for yy in range(y, y + h):
        if wall in 'NS':
            for sx in (x - 1, x + 1): b.set(sx, yy, z + dz, wood, 'trapdoor', open=True, side=OPP[wall])
        else:
            for sz in (z - 1, z + 1): b.set(x + dx, yy, sz, wood, 'trapdoor', open=True, side=OPP[wall])


def poplar(b, x, z, h, leaves, rng, y=0):
    """A tall, narrow poplar: a straight trunk and a spindle of leaves (thin at the bottom and top,
    3 x 3 in the middle), so it reads as a tree and not a box."""
    for yy in range(y, y + h): b.set(x, yy, z, 'poplar_log', a='y')
    top = y + h + 1                          # the leaves end one block above the trunk
    for yy in range(y + 2, top + 1):
        k = yy - (y + 2); n = top - (y + 2)
        if k == 0 or yy >= top - 1: cells = [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]
        else: cells = [(dx, dz) for dx in (-1, 0, 1) for dz in (-1, 0, 1)]
        for dx, dz in cells:
            if (dx, dz) == (0, 0) and yy < y + h: continue
            if abs(dx) + abs(dz) == 2 and rng.random() < 0.35: continue
            if b.get(x + dx, yy, z + dz) is None: b.set(x + dx, yy, z + dz, leaves)
    b.set(x, top + 1, z, leaves)


# ---------------------------------------------------------------------------- 1. movie build challenge

def steep_hip(b, x0, x1, z0, z1, ybase, mat, o=1):
    """A steep pyramid roof: each ring is one block in and two blocks up (a full block under a stair)."""
    X0, X1, Z0, Z1 = x0 - o, x1 + o, z0 - o, z1 + o; y = ybase; i = 0
    while X0 <= X1 and Z0 <= Z1:
        ring = [(x, Z0) for x in range(X0, X1 + 1)] + [(x, Z1) for x in range(X0, X1 + 1)] + \
               [(X0, z) for z in range(Z0 + 1, Z1)] + [(X1, z) for z in range(Z0 + 1, Z1)]
        if X0 == X1 and Z0 == Z1:
            b.set(X0, y - 1, Z0, mat); b.set(X0, y, Z0, mat); b.set(X0, y + 1, Z0, mat, 'slab')
            return y + 1
        for x, z in set(ring):
            if i: b.set(x, y - 1, z, mat)
            f = 'S' if z == Z0 else 'N' if z == Z1 else 'E' if x == X0 else 'W'
            b.set(x, y, z, mat, 'stairs', f=f)
        X0 += 1; X1 -= 1; Z0 += 1; Z1 -= 1; y += 2; i += 1
    return y


def movie_build_challenge():
    """A 16 x 16 x 32 plot: corner markers, a 32-block measuring pillar, and a plains tower going up inside."""
    P = 15                       # plot cells x 0..15, z 0..15
    X0, X1, Z0, Z1 = 5, 11, 4, 10     # tower walls (7 x 7)
    cx, cz = (X0 + X1) // 2, (Z0 + Z1) // 2
    corners = [(X0, Z0), (X1, Z0), (X0, Z1), (X1, Z1)]

    def plot(b):
        for i in range(P + 1):
            for x, z in ((i, 0), (i, P), (0, i), (P, i)): b.set(x, -1, z, 'white_concrete')
        for x, z in ((P, 0), (0, P), (P, P)): b.set(x, 0, z, 'lime_concrete')
        for y in range(32):       # the height limit: 8 stripes of 4 blocks
            b.set(0, y, 0, 'red_concrete' if (y // 4) % 2 == 0 else 'white_concrete')

    def ground_floor(b, finished=True):
        b.walls(X0, Z0, X1, Z1, 0, 3, 'stone_bricks')
        for x, z in corners:
            for y in range(0, 4): b.set(x, y, z, 'oak_log', a='y')
        for x in range(X0, X1 + 1):           # a sloped cobblestone plinth all round
            b.set(x, 0, Z0 - 1, 'cobblestone', 'stairs', f='S'); b.set(x, 0, Z1 + 1, 'cobblestone', 'stairs', f='N')
        for z in range(Z0, Z1 + 1):
            b.set(X0 - 1, 0, z, 'cobblestone', 'stairs', f='E'); b.set(X1 + 1, 0, z, 'cobblestone', 'stairs', f='W')
        b.set(cx, 0, Z1 + 1, 'cobblestone', 'slab')
        b.set(cx, 0, Z1, None); b.set(cx, 1, Z1, None)
        if finished:
            door(b, cx, 0, Z1, 'oak_door', 'S')
            for x in (X0, X1):
                b.set(x, 1, cz, 'glass', 'pane'); b.set(x, 2, cz, 'glass', 'pane')
            b.set(cx, 1, Z0, 'glass', 'pane'); b.set(cx, 2, Z0, 'glass', 'pane')

    def oak_floor(b):
        for x, z in corners:
            for y in range(4, 8): b.set(x, y, z, 'oak_log', a='y')
        for y in range(5, 8):
            for x in range(X0 + 1, X1):
                b.set(x, y, Z0, 'oak_planks'); b.set(x, y, Z1, 'oak_planks')
            for z in range(Z0 + 1, Z1):
                b.set(X0, y, z, 'oak_planks'); b.set(X1, y, z, 'oak_planks')
        for x in range(X0 + 1, X1):          # a log belt between the stone and the wood
            for z in (Z0, Z1): b.set(x, 4, z, 'stripped_oak_log', a='x')
        for z in range(Z0 + 1, Z1):
            for x in (X0, X1): b.set(x, 4, z, 'stripped_oak_log', a='z')
        for y in (5, 6):
            b.set(cx, y, Z1, 'glass', 'pane'); b.set(cx, y, Z0, 'glass', 'pane')
            b.set(X1, y, cz, 'glass', 'pane'); b.set(X0, y, cz, 'glass', 'pane')
        shutters(b, cx, 5, Z1, 'S', h=2); shutters(b, X1, 5, cz, 'E', h=2); shutters(b, X0, 5, cz, 'W', h=2)
        b.set(cx, 4, Z1 + 1, 'spruce_trapdoor', 'trapdoor', h='top')
        b.set(X1 + 1, 4, cz, 'spruce_trapdoor', 'trapdoor', h='top')
        b.set(X0 - 1, 4, cz, 'spruce_trapdoor', 'trapdoor', h='top')

    def top_floor(b):
        x0, x1, z0, z1 = X0 - 1, X1 + 1, Z0 - 1, Z1 + 1      # jettied out by one block
        for x in range(x0, x1 + 1):        # upside-down stairs carry the overhang
            b.set(x, 8, z0, 'spruce_planks', 'stairs', f='S', h='top'); b.set(x, 8, z1, 'spruce_planks', 'stairs', f='N', h='top')
        for z in range(z0 + 1, z1):
            b.set(x0, 8, z, 'spruce_planks', 'stairs', f='E', h='top'); b.set(x1, 8, z, 'spruce_planks', 'stairs', f='W', h='top')
        b.walls(x0, z0, x1, z1, 9, 11, 'white_terracotta')
        for x, z in ((x0, z0), (x1, z0), (x0, z1), (x1, z1)):
            for y in range(9, 12): b.set(x, y, z, 'spruce_log', a='y')
        for d in (-2, 0, 2):
            for y in (9, 10):
                b.set(cx + d, y, z1, 'glass', 'pane'); b.set(x1, y, cz + d, 'glass', 'pane')
                b.set(cx + d, y, z0, 'glass', 'pane'); b.set(x0, y, cz + d, 'glass', 'pane')
        steep_hip(b, x0, x1, z0, z1, 12, 'spruce_planks', o=1)

    def garden(b, rng):
        for z in range(Z1 + 2, P): b.set(cx, -1, z, 'dirt_path')
        for x in (cx - 1, cx + 1):
            b.set(x, 0, Z1 + 2, 'oak_planks', 'fence'); b.set(x, 1, Z1 + 2, 'lantern', 'lantern')
        flowers(b, [(cx - 1, 13), (cx - 2, 12), (cx + 1, 13), (cx + 2, 12), (cx - 3, 13), (cx + 3, 13), (cx + 1, 14), (cx - 1, 14)], rng)
        for x, z in ((X0 - 2, Z1 + 1), (X1 + 2, Z1 + 1), (X1 + 2, Z0)): b.set(x, 0, z, 'oak_leaves', 'bush')
        tx, tz = 2, 11                       # a little oak in the front corner
        for y in range(0, 3): b.set(tx, y, tz, 'oak_log', a='y')
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for y in (3, 4):
                    if y == 4 and abs(dx) + abs(dz) == 2: continue
                    b.set(tx + dx, y, tz + dz, 'oak_leaves')
        b.set(tx, 5, tz, 'oak_leaves')

    f1 = Build('Plot'); plot(f1)

    f2 = Build('Half built'); plot(f2); ground_floor(f2, finished=False)
    for x, z in corners:
        for y in range(4, 7 if (x, z) != (X1, Z1) else 6): f2.set(x, y, z, 'oak_log', a='y')
    for x in range(X0 + 1, X1): f2.set(x, 4, Z1, 'stripped_oak_log', a='x'); f2.set(x, 4, Z0, 'stripped_oak_log', a='x')
    for x in range(X0 + 1, X0 + 3): f2.set(x, 5, Z1, 'oak_planks')
    f2.set(X1 + 3, 0, Z1 + 1, 'chest', 'chest'); f2.set(X1 + 3, 0, Z1 + 2, 'crafting_table')

    f3 = Build('Finished'); plot(f3); ground_floor(f3); oak_floor(f3); top_floor(f3); garden(f3, random.Random(16))
    return keep_ground([f1, f2, f3])


# ---------------------------------------------------------------------------- 2. build the earth: new york

def new_york_block():
    """One city corner at real size (1 block = 1 meter): three narrow brick buildings with iron-bar
    balconies, one flower pot on one balcony, sidewalks and gray streets."""
    b = Build('New York corner')
    FZ = 7                                    # front walls (south); back walls at z = 0
    # x0, x1, top y, wall, awning (the middle one gets a pale stone ledge over its shop instead,
    # which also covers the first-floor window sills that would otherwise float over the shop glass)
    houses = [(0, 4, 11, 'bricks', 'green_wool'), (5, 10, 14, 'mud_bricks', 'smooth_quartz'), (11, 15, 9, 'deepslate_bricks', 'red_wool')]
    for x in range(-1, 20):                   # streets (y = -1 replaces the ground)
        for z in range(-1, 15):
            b.set(x, -1, z, 'smooth_stone' if (x <= 16 and z <= 10) else 'gray_concrete')
    for x in range(0, 17, 3): b.set(x, -1, 12, 'white_concrete')               # lane dashes
    for z in range(0, 10, 3): b.set(18, -1, z, 'white_concrete')
    for x in range(-1, 17): b.set(x, 0, 10, 'smooth_stone', 'slab')             # curb
    for z in range(-1, 10): b.set(16, 0, z, 'smooth_stone', 'slab')

    def window(x, y, z, wall, h=2):
        dx, dz = DIRS[wall]
        for yy in range(y, y + h): b.set(x, yy, z, 'glass', 'pane')
        b.set(x, y + h, z, 'smooth_quartz')                                    # lintel
        b.set(x + dx, y - 1, z + dz, 'stone_bricks', 'slab', h='top')          # sill

    for x0, x1, top, wall, awn in houses:
        b.walls(x0, 0, x1, FZ, 0, top, wall)                                    # hollow, so windows look in
        b.fill(x0 + 1, top - 1, 1, x1 - 1, top - 1, FZ - 1, 'gravel')
        for x in range(x0, x1 + 1):                                             # cornice
            b.set(x, top, FZ + 1, 'stone_bricks', 'stairs', f='N', h='top')
        for fy in range(4, top - 2, 3):                                         # upper floors
            for x in range(x0 + 1, x1, 2): window(x, fy, FZ, 'S')
            for x in range(x0 + 1, x1, 2): window(x, fy, 0, 'N')
            if x0 == 0:
                for z in (2, 5): window(0, fy, z, 'W')
            if x1 == 15:
                for z in (1, 3, 5): window(15, fy, z, 'E')
            if x0 == 5 and fy > 9:                                              # the tall middle one
                for z in (1, 3, 5): window(10, fy, z, 'E')
            if x0 == 5 and fy > 11:
                for z in (2, 5): window(5, fy, z, 'W')
        for x in range(x0 + 1, x1):                                             # shop front
            b.set(x, 0, FZ, 'smooth_quartz'); b.set(x, 1, FZ, 'glass', 'pane'); b.set(x, 2, FZ, 'glass', 'pane')
        if awn:
            for x in range(x0, x1 + 1): b.set(x, 3, FZ + 1, awn, 'slab', h='top')
        b.set(x1 - 1, 0, FZ, None); b.set(x1 - 1, 1, FZ, None)
        door(b, x1 - 1, 0, FZ, 'dark_oak_door', 'S')
    for z in (2, 4):                                                            # corner shop wraps round
        b.set(15, 0, z, 'smooth_quartz'); b.set(15, 1, z, 'glass', 'pane'); b.set(15, 2, z, 'glass', 'pane')
    for z in range(0, FZ + 1): b.set(16, 3, z, 'red_wool', 'slab', h='top')

    def balcony(x0, x1, y, lintel=True):
        for x in range(x0, x1 + 1):
            for z in (FZ + 1, FZ + 2): b.set(x, y - 1, z, 'smooth_stone', 'slab', h='top')
            b.set(x, y, FZ + 2, 'iron_bars', 'pane')
        b.set(x0, y, FZ + 1, 'iron_bars', 'pane'); b.set(x1, y, FZ + 1, 'iron_bars', 'pane')
        for x in range(x0 + 1, x1):
            for yy in (y, y + 1): b.set(x, yy, FZ, 'glass', 'pane')
            if lintel: b.set(x, y + 2, FZ, 'smooth_quartz')

    balcony(1, 3, 7); balcony(6, 9, 7); balcony(6, 9, 10); balcony(12, 14, 7, lintel=False)
    b.set(7, 7, FZ + 1, 'flower_pot', 'pot', plant='poppy')                     # the one flower pot

    # a wooden water tank on the roof of the brick building
    for x, z in ((1, 2), (4, 2), (1, 5), (4, 5)):
        for y in (11, 12): b.set(x, y, z, 'spruce_planks', 'fence')
    b.fill(1, 13, 2, 4, 13, 5, 'spruce_planks', 'slab')
    for x in range(1, 5):
        for z in range(2, 6):
            edge_x, edge_z = x in (1, 4), z in (2, 5)
            if edge_x and edge_z: continue
            for y in (14, 15, 16): b.set(x, y, z, 'spruce_planks')
            if edge_x or edge_z:
                b.set(x, 17, z, 'dark_oak_planks', 'stairs', f='E' if x == 1 else 'W' if x == 4 else 'S' if z == 2 else 'N')
            else:
                b.set(x, 17, z, 'dark_oak_planks'); b.set(x, 18, z, 'dark_oak_planks', 'slab')

    for y in range(0, 3): b.set(16, y, 10, 'polished_deepslate', 'wall')       # street lamp
    b.set(16, 3, 10, 'lantern', 'lantern')
    return [b]


# ---------------------------------------------------------------------------- 3. camp out challenge

def campsite():
    """A riverside camp: a campfire ringed by wool cushions, two straw beds under a red poplar,
    leaf litter on the grass."""
    b = Build('Riverside camp'); rng = random.Random(26)
    W = 13                                          # x 0..13, z 0..11
    for x in range(0, W + 1):                       # a river along the back
        for z in range(0, 3): b.set(x, -1, z, 'water')
        b.set(x, -1, 3, 'gravel' if x % 4 == 2 else 'sand')
    for x in (1, 5, 9, 10): b.set(x, -1, 4, 'sand')
    for x, h in ((0, 2), (1, 3), (12, 2), (13, 3)):  # reeds on the bank
        for y in range(h): b.set(x, y, 3, 'sugar_cane', 'plant')
    for z in (1, 2): b.set(7, 0, z, 'spruce_planks', 'slab'); b.set(8, 0, z, 'spruce_planks', 'slab')
    b.set(7, -1, 3, 'spruce_planks'); b.set(8, -1, 3, 'spruce_planks')     # a little dock

    fx, fz = 9, 7                                   # campfire with a ring of cushions
    for x in range(fx - 1, fx + 2):
        for z in range(fz - 1, fz + 2): b.set(x, -1, z, 'gravel')
    b.set(fx, -1, fz, 'cobblestone'); b.set(fx, 0, fz, 'campfire', 'campfire')
    ring = [((fx - 2, fz - 1), 'red_wool'), ((fx - 2, fz + 1), 'orange_wool'), ((fx - 1, fz + 2), 'yellow_wool'),
            ((fx + 1, fz + 2), 'lime_wool'), ((fx + 2, fz + 1), 'light_blue_wool'), ((fx + 2, fz - 1), 'blue_wool'),
            ((fx + 1, fz - 2), 'magenta_wool'), ((fx - 1, fz - 2), 'pink_wool')]
    for (x, z), wool in ring: b.set(x, 0, z, wool, 'cushion')
    b.set(6, 0, 10, 'spruce_planks', 'fence'); b.set(6, 1, 10, 'lantern', 'lantern')

    tx, tz = 3, 6                                   # the red poplar with two straw beds underneath
    poplar(b, tx, tz, 6, 'red_poplar_leaves', rng)
    b.set(tx, 2, tz + 1, 'shelf_mushroom', 'shelf_mushroom', side='N', big=True)
    for x in (tx + 1, tx + 2):
        b.set(x, 0, tz + 2, 'straw_bed', 'straw_bed', part='foot', f='N')
        b.set(x, 0, tz + 1, 'straw_bed', 'straw_bed', part='head', f='N')
    poplar(b, 1, 10, 4, 'yellow_poplar_leaves', rng)  # a smaller one in the front corner

    for x, z in ((1, 5), (2, 8), (1, 9), (4, 9), (5, 5), (0, 7), (12, 8), (13, 7), (6, 10), (2, 10), (10, 5), (13, 4)):
        if b.get(x, 0, z) is None: b.set(x, 0, z, 'leaf_litter', 'plant')
    for x, z in ((5, 10), (12, 11), (0, 11), (10, 11)):
        if b.get(x, 0, z) is None: b.set(x, 0, z, 'wildflowers', 'plant')
    b.set(13, 0, 10, 'firefly_bush', 'plant'); b.set(0, 0, 4, 'firefly_bush', 'plant')
    for x, z in ((7, 11), (3, 11), (6, 4), (11, 10)):
        if b.get(x, 0, z) is None: b.set(x, 0, z, 'short_grass', 'tuft')
    return [b]


# ---------------------------------------------------------------------------- 4. theme park track

def coaster_track():
    """A short minecart track: out of a dark stone tunnel, through an obsidian archway, then it turns
    and climbs a sunny hill. The climb runs north, so its slope faces the camera."""
    b = Build('Out of the tunnel'); rng = random.Random(7)
    TZ = 7                                              # out of the tunnel the track runs east along z = TZ
    CX = 12                                             # then turns and climbs north along x = CX

    # the tunnel hill (west): a rocky mound with a little grass on top
    hgt = {}
    for x in range(0, 6):
        for z in range(TZ - 4, TZ + 5):
            dz = abs(z - TZ)
            h = 6 - max(0, dz - 2) - (1 if x == 0 or dz == 4 else 0) - (1 if x == 5 and dz > 2 else 0)
            if h <= 0: continue
            hgt[x, z] = h
            for y in range(0, h):
                r = rng.random()
                b.set(x, y, z, 'stone' if r < 0.6 else 'andesite' if r < 0.85 else 'tuff' if r < 0.95 else 'cobbled_deepslate')
    for (x, z), h in hgt.items():                       # grass on every step of the hill, rock on the sides
        b.set(x, h - 1, z, 'grass_block')
        if h >= 5 and rng.random() < 0.3: b.set(x, h, z, 'short_grass', 'tuft')
    for x in range(0, 6):                               # carve the tunnel and line it with dark stone
        for y in range(0, 3):
            for z in range(TZ - 1, TZ + 2): b.set(x, y, z, None)
            for z in (TZ - 2, TZ + 2): b.set(x, y, z, 'deepslate_bricks')
        for z in range(TZ - 2, TZ + 3): b.set(x, 3, z, 'deepslate_tiles')
        for z in range(TZ - 1, TZ + 2): b.set(x, -1, z, 'cobbled_deepslate')
    for y in range(0, 4):                               # a dark frame round the tunnel mouth
        for z in (TZ - 2, TZ + 2): b.set(5, y, z, 'polished_deepslate')
    for z in range(TZ - 2, TZ + 3): b.set(5, 3, z, 'polished_deepslate')
    b.set(5, 2, TZ - 1, 'polished_deepslate', 'stairs', f='N', h='top'); b.set(5, 2, TZ + 1, 'polished_deepslate', 'stairs', f='S', h='top')
    b.set(3, 2, TZ, 'lantern', 'lantern', hang=True)

    # the obsidian archway
    AX = 9
    for y in range(0, 6):
        for z in (TZ - 2, TZ + 2): b.set(AX, y, z, 'obsidian')
    for z in range(TZ - 2, TZ + 3): b.set(AX, 5, z, 'obsidian'); b.set(AX, -1, z, 'obsidian')
    for y, z in ((1, TZ - 2), (3, TZ + 2), (5, TZ - 1)): b.set(AX, y, z, 'crying_obsidian')

    # the sunny hill (north-east): rail height along the climb, then the ground around it
    rail_y = {TZ - 1: 0, TZ - 2: 1, TZ - 3: 2, TZ - 4: 3, TZ - 5: 4, TZ - 6: 4, TZ - 7: 4}
    tops = {}
    for z, ry in rail_y.items():
        for x in range(CX - 3, CX + 5):
            if x < CX: h = ry + (1 if CX - x == 2 and ry >= 2 else 0) - max(0, CX - x - 2)
            else: h = ry - max(0, x - CX - 1)
            if z == TZ - 7: h = min(h, ry)
            if h <= 0: continue
            tops[x, z] = h
            for y in range(0, h): b.set(x, y, z, 'grass_block' if y == h - 1 else 'dirt')

    # the track. Outside the tunnel it lies on a gravel bed, so it shows up the hill.
    for x in range(0, CX): b.set(x, 0, TZ, 'rail', 'rail', a='x')
    b.set(CX, 0, TZ, 'rail', 'rail', f='N', side='W')                 # the turn
    for z, ry in rail_y.items():
        if z == TZ - 7: continue
        if ry < 4: b.set(CX, ry, z, 'powered_rail_on', 'rail', f='N')          # ramps up toward the north
        else: b.set(CX, ry, z, 'powered_rail_on' if z == TZ - 5 else 'rail', 'rail', a='z')
    b.set(CX, 4, TZ - 7, 'hay_block')                                 # a soft stop at the end
    b.set(CX - 1, 4, TZ - 5, 'redstone_torch', 'torch')               # powers the gold rails down the slope
    for x in range(6, CX):
        if x != AX: b.set(x, -1, TZ, 'gravel')
    b.set(CX, -1, TZ, 'gravel')
    for z, ry in rail_y.items():
        if z != TZ - 7 and ry > 0: b.set(CX, ry - 1, z, 'gravel')
        elif ry == 0: b.set(CX, -1, z, 'gravel')

    for (x, z), h in tops.items():                          # flowers and grass on the hill
        if abs(x - CX) <= 1 or b.get(x, h, z) is not None: continue
        r = rng.random()
        if r < 0.2: b.set(x, h, z, rng.choice(['poppy', 'dandelion', 'oxeye_daisy', 'cornflower']), 'flower')
        elif r < 0.35: b.set(x, h, z, 'short_grass', 'tuft')
    tx, tz = CX - 2, TZ - 6                                 # a little oak on the hilltop
    ty = tops[tx, tz]
    for y in range(ty, ty + 3): b.set(tx, y, tz, 'oak_log', a='y')
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            for y in (ty + 3, ty + 4):
                if y == ty + 4 and abs(dx) + abs(dz) == 2: continue
                b.set(tx + dx, y, tz + dz, 'oak_leaves')
    b.set(tx, ty + 5, tz, 'oak_leaves')
    for x, z in ((10, 9), (14, 9), (7, 10), (15, 8), (11, 11), (6, 3)):
        b.set(x, 0, z, 'short_grass', 'tuft')
    for x, z in ((13, 10), (9, 11)): b.set(x, 0, z, 'dandelion', 'flower')
    return [b]


# ---------------------------------------------------------------------------- 5. the 700-hour builder

def three_stages():
    """One corner of a big build, three times: a plain stone box, then roof and trim, then every detail.
    Each frame adds the next copy beside the last one. The copies step back along a diagonal so the
    default camera sees them side by side, none hiding another."""

    def plain(b, ox, oz):
        b.fill(ox, 0, oz, ox + 4, 4, oz + 4, 'stone')

    def trimmed(b, ox, oz):
        x0, x1, z0, z1 = ox, ox + 4, oz, oz + 4
        b.fill(x0, 0, z0, x1, 3, z1, 'stone')
        b.walls(x0, z0, x1, z1, 0, 0, 'stone_bricks')                         # stone brick base
        for x, z in ((x0, z0), (x1, z0), (x0, z1), (x1, z1)):
            for y in range(0, 4): b.set(x, y, z, 'oak_log', a='y')
        for x in range(x0 + 1, x1):                                           # log beam on top of the walls
            b.set(x, 3, z0, 'stripped_oak_log', a='x'); b.set(x, 3, z1, 'stripped_oak_log', a='x')
        for z in range(z0 + 1, z1):
            b.set(x0, 3, z, 'stripped_oak_log', a='z'); b.set(x1, 3, z, 'stripped_oak_log', a='z')
        # the ridge runs front to back, so the pointed gable end faces the path
        gable(b, x0, x1, z0, z1, 4, 'dark_oak_planks', o=1, gable_mat='oak_planks', axis='z')

    def detailed(b, ox, oz):
        trimmed(b, ox, oz)
        x0, x1, z0, z1 = ox, ox + 4, oz, oz + 4
        b.clear(x0 + 1, 1, z0 + 1, x1 - 1, 3, z1 - 1)                         # a real room, so the windows look in
        b.fill(x0 + 1, 0, z0 + 1, x1 - 1, 0, z1 - 1, 'spruce_planks')
        for y in range(1, 4): b.set(x0 + 3, y, z0 + 1, 'bricks')              # the chimney comes down to the floor
        door(b, x0 + 2, 0, z1, 'spruce_door', 'S')
        b.set(x0 + 2, 0, z1 + 1, 'spruce_planks', 'stairs', f='N')            # a doorstep
        for x in (x0 + 1, x0 + 3):                                            # windows beside the door
            b.set(x, 1, z1, 'glass', 'pane'); b.set(x, 2, z1, 'glass', 'pane')
            b.set(x, 3, z1 + 1, 'spruce_trapdoor', 'trapdoor', h='top')       # little window hoods
        b.set(x0 + 2, 5, z1, 'glass', 'pane')                                 # a window up in the gable
        b.set(x0 + 2, 4, z1 + 1, 'spruce_trapdoor', 'trapdoor', h='top')
        b.set(x1, 1, z0 + 2, 'glass', 'pane'); b.set(x1, 2, z0 + 2, 'glass', 'pane')
        shutters(b, x1, 1, z0 + 2, 'E', h=2)
        b.set(x0, 1, z0 + 2, 'glass', 'pane'); b.set(x0, 2, z0 + 2, 'glass', 'pane')   # and round the back
        shutters(b, x0, 1, z0 + 2, 'W', h=2)
        b.set(x0 + 1, 1, z0, 'glass', 'pane'); b.set(x0 + 1, 2, z0, 'glass', 'pane')
        b.set(x0 + 2, 5, z0, 'glass', 'pane')
        for y in range(4, 9): b.set(x0 + 3, y, z0 + 1, 'bricks')              # chimney
        b.set(x0 + 3, 9, z0 + 1, 'campfire', 'campfire')
        for z in (z1 + 2, z1 + 3): b.set(x0 + 2, -1, z, 'dirt_path')
        for x in (x0 + 1, x0 + 3):                                            # lantern posts by the path
            b.set(x, 0, z1 + 2, 'spruce_planks', 'fence'); b.set(x, 1, z1 + 2, 'lantern', 'lantern')
        for x, z, k in ((x0 + 1, z1 + 1, 'flowering_azalea'), (x0 + 3, z1 + 1, 'azalea'),
                        (x1 + 1, z1, 'flowering_azalea'), (x1 + 1, z0, 'azalea')):
            b.set(x, 0, z, k, 'plant')
        flowers(b, [(x0, z1 + 2), (x0, z1 + 3), (x1, z1 + 2), (x1, z1 + 3), (x1 + 1, z1 + 2), (x0 - 1, z1 + 1), (x1 + 1, z0 + 2)], random.Random(3))

    S = [(0, 10), (7, 5), (14, 0)]

    def path(b, a, c):                                # a gravel path from one copy to the next
        (ax, az), (cx, cz) = a, c
        for x, _, z in line3((ax + 2, 0, az + 6), (cx + 2, 0, cz + 6)):
            b.set(x, -1, z, 'gravel'); b.set(x + 1, -1, z, 'gravel')

    def lawn(b):
        for x, z in ((1, 6), (5, 3), (10, 14), (18, 8), (4, 16), (11, 1), (17, 14)):
            b.set(x, 0, z, 'short_grass', 'tuft')
        # the builder's corner: a crafting table, a chest and a stack of stone ready for the next job
        b.set(13, 0, 12, 'crafting_table'); b.set(14, 0, 12, 'chest', 'chest'); b.set(15, 0, 12, 'barrel')
        for x, y, z in ((13, 0, 13), (14, 0, 13), (13, 1, 13), (13, 0, 14)): b.set(x, y, z, 'stone')

    f1 = Build('Plain box'); plain(f1, *S[0])
    f2 = Build('Roof and trim'); plain(f2, *S[0]); trimmed(f2, *S[1]); path(f2, S[0], S[1])
    f3 = Build('Every detail'); plain(f3, *S[0]); trimmed(f3, *S[1]); path(f3, S[0], S[1]); path(f3, S[1], S[2]); detailed(f3, *S[2])
    for f in (f1, f2, f3): lawn(f)
    return keep_ground([f1, f2, f3])


# ---------------------------------------------------------------------------- 6. tnt chain record

def tnt_chain():
    """A long TNT chain snaking over flat sand, with a lever at the start. Nothing is set off."""
    rows = [10, 7, 4, 1]                            # the chain starts at the front and snakes back
    X0, X1 = 1, 14
    cells = []
    for i, z in enumerate(rows):
        xs = range(X1, X0 - 1, -1) if i % 2 == 0 else range(X0, X1 + 1)
        cells += [(x, z) for x in xs]
        if i + 1 < len(rows):
            turn_x = X0 if i % 2 == 0 else X1
            cells += [(turn_x, z - 1), (turn_x, z - 2)]
    def chain(b, n):
        for x, z in cells[:n]: b.set(x, 0, z, 'tnt')
        b.set(X1 + 1, 0, rows[0], 'polished_andesite')     # the lever powers this block, which lights the first TNT
        b.set(X1 + 1, 1, rows[0], 'lever', 'lever')
    def desert(b):
        for x in range(0, 17):            # the sand plain itself, so every picture shows sand
            for z in range(0, 13): b.set(x, -1, z, 'sand')
        for x, z, k in ((3, 12, 'short_dry_grass'), (16, 3, 'tall_dry_grass'), (0, 5, 'short_dry_grass'),
                        (9, 12, 'short_dry_grass'), (16, 7, 'short_dry_grass'), (5, 0, 'tall_dry_grass'), (11, 3, 'short_dry_grass')):
            b.set(x, 0, z, k, 'plant')
        # two low sandstone rocks in the corners, well away from the chain
        for x, y, z, sh, st in ((16, 0, 0, 'full', {}), (16, 1, 0, 'slab', {}), (15, 0, 0, 'stairs', dict(f='E')),
                                (16, 0, 1, 'stairs', dict(f='N')), (0, 0, 12, 'full', {}), (1, 0, 12, 'slab', {}),
                                (0, 0, 11, 'stairs', dict(f='S'))):
            b.set(x, y, z, 'sandstone', sh, **st)
        for x, z in ((14, 0), (16, 2), (2, 12), (0, 10)): b.set(x, -1, z, 'sandstone')
    f1 = Build('The start'); chain(f1, X1 - X0 + 1); desert(f1)
    f2 = Build('The whole chain'); chain(f2, len(cells)); desert(f2)
    return [f1, f2]


# ---------------------------------------------------------------------------- 7. what's next

def new_doorway():
    """A winding stone path that ends at an empty stone archway. In the second frame the archway
    fills with soft coloured light, like a doorway to somewhere new."""
    AZ = 1                                          # the arch stands across z = AZ..AZ+1, facing south
    L, R = 3, 9                                     # inner pillar columns; the opening is x 4..8
    OPEN = {(x, y) for x in range(L + 1, R) for y in range(0, 5)} | {(x, 5) for x in range(L + 2, R - 1)} | {(6, 6)}

    def arch(b):
        for x in range(L - 2, R + 3):               # a pale stone floor under the whole arch
            for z in (AZ, AZ + 1): b.set(x, -1, z, 'polished_andesite')
        for z in (AZ, AZ + 1):
            for x in (L - 1, L, R, R + 1):          # two pillars, each 2 blocks wide
                b.set(x, 0, z, 'polished_tuff')
                for y in range(1, 7): b.set(x, y, z, 'tuff_bricks')
                b.set(x, 3, z, 'chiseled_tuff' if x in (L - 1, R + 1) else 'tuff_bricks')
            b.set(L - 2, 0, z, 'polished_tuff', 'stairs', f='E'); b.set(R + 2, 0, z, 'polished_tuff', 'stairs', f='W')
            for x in range(L + 1, R):               # the curved top of the opening
                for y in range(5, 8):
                    if (x, y) not in OPEN: b.set(x, y, z, 'tuff_bricks')
            for x, y, f in ((L + 1, 5, 'W'), (R - 1, 5, 'E'), (L + 2, 6, 'W'), (R - 2, 6, 'E')):
                b.set(x, y, z, 'tuff_bricks', 'stairs', f=f, h='top')
            for x in (L - 1, L, R, R + 1): b.set(x, 7, z, 'tuff_bricks')
            b.set(6, 7, z, 'chiseled_tuff')         # keystone
            b.set(L - 2, 7, z, 'polished_tuff', 'stairs', f='E', h='top'); b.set(R + 2, 7, z, 'polished_tuff', 'stairs', f='W', h='top')
            for x in range(L - 1, R + 2): b.set(x, 8, z, 'polished_tuff', 'slab')
            b.set(5, 8, z, 'polished_tuff', 'stairs', f='E'); b.set(6, 8, z, 'polished_tuff'); b.set(7, 8, z, 'polished_tuff', 'stairs', f='W')
            b.set(6, 9, z, 'polished_tuff', 'slab')
        for x, y, z in ((L - 1, 8, AZ + 1), (L, 8, AZ), (R + 1, 8, AZ)):
            b.set(x, 9, z, 'moss_carpet', 'carpet')  # a little moss on top: it is old
        b.set(R + 1, 9, AZ + 1, 'moss_carpet', 'carpet')

    def path(b, rng):
        pts = [(8, 15), (8, 13), (7, 11), (5, 10), (4, 8), (4, 6), (5, 5), (6, 4), (6, 3)]
        cells = set()
        for (ax, az), (cx, cz) in zip(pts, pts[1:]):
            for x, _, z in line3((ax, 0, az), (cx, 0, cz)):
                cells |= {(x + dx, z + dz) for dx, dz in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))}
        cells = {(x, z) for x, z in cells if z <= 15 and z >= AZ + 2}
        for x, z in sorted(cells):
            r = rng.random()
            b.set(x, -1, z, 'cobblestone' if r < 0.4 else 'mossy_cobblestone' if r < 0.7 else 'stone' if r < 0.88 else 'gravel')
        for x in range(L + 1, R): b.set(x, -1, AZ + 2, 'polished_andesite')

    def garden(b, rng):
        # a little azalea tree on the left (Flowering Azalea Leaves), bushes round the arch, flowers by the path
        tx, tz = 1, 11
        for y in range(0, 3): b.set(tx, y, tz, 'oak_log', a='y')
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for y in (3, 4):
                    if y == 4 and abs(dx) + abs(dz) == 2: continue
                    b.set(tx + dx, y, tz + dz, 'azalea_leaves')
        b.set(tx, 5, tz, 'azalea_leaves')
        for x, z, k in ((0, 2, 'flowering_azalea'), (12, 2, 'azalea'), (11, 4, 'flowering_azalea'), (0, 5, 'azalea'), (12, 13, 'bush'), (10, 8, 'bush')):
            b.set(x, 0, z, k, 'plant')
        for x, z in ((2, 7), (3, 12), (9, 7), (11, 11), (7, 7), (10, 14), (6, 13), (3, 4), (9, 4), (2, 14)):
            if (x, -1, z) not in b.c: b.set(x, 0, z, 'pink_petals' if (x + z) % 2 else 'wildflowers', 'plant')
        for x, z in ((3, 8), (9, 10), (12, 6), (11, 9), (0, 8), (7, 8), (5, 13), (12, 15)):
            if (x, -1, z) not in b.c and (x, 0, z) not in b.c: b.set(x, 0, z, 'short_grass', 'tuft')
        for x in (L - 2, R + 2):
            b.set(x, 0, AZ + 3, 'stone_bricks', 'wall'); b.set(x, 1, AZ + 3, 'lantern', 'lantern')

    LIGHT = ['cyan', 'light_blue', 'light_blue', 'purple', 'magenta', 'pink', 'pink']
    def light(b):
        for (x, y) in OPEN: b.set(x, y, AZ, LIGHT[y] + '_stained_glass')
        for x in range(L + 1, R): b.set(x, -1, AZ + 1, 'sea_lantern')
        for x, c in ((L - 1, 'purple_candle_lit'), (R + 1, 'light_blue_candle_lit')): b.set(x, 0, AZ + 2, c, 'candle', n=3)

    f1 = Build('An empty archway'); arch(f1); path(f1, random.Random(11)); garden(f1, random.Random(5))
    f2 = Build('A doorway to somewhere new'); arch(f2); path(f2, random.Random(11)); garden(f2, random.Random(5)); light(f2)
    return [f1, f2]


FIGURES = {
    'sc-whats-next': new_doorway,
    'sc-tnt-chain-record': tnt_chain,
    'sc-700-hour-builder': three_stages,
    'sc-minecraft-world-chessington': coaster_track,
    'sc-camp-out-challenge': campsite,
    'sc-build-the-earth-new-york': new_york_block,
    'sc-movie-build-challenge': movie_build_challenge,
}

META = {
    'sc-whats-next': dict(ground='grass_block', time=0.42, view='hero'),
    'sc-tnt-chain-record': dict(ground='sand', time=0.42, view='hero'),
    'sc-700-hour-builder': dict(ground='grass_block', time=0.42, view='hero'),
    'sc-minecraft-world-chessington': dict(ground='grass_block', time=0.42, view='hero'),
    'sc-camp-out-challenge': dict(ground='grass_block', time=0.6, view='hero'),
    'sc-build-the-earth-new-york': dict(ground='stone', time=0.42, view='hero'),
    'sc-movie-build-challenge': dict(ground='grass_block', time=0.42, view='hero'),
}
