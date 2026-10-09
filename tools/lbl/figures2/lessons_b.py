# Master Builder Secrets, part B: draining water, shelf walls, level up a build.
# Each figure is a list of frames (one Build per step). Words: tools/lbl/content/lessons/<id>.json
import random
import numpy as np
from lbl import *


def keep_ground(frames, top='grass_block'):
    """The 3D book draws its own ground only where no frame has a block below y = 0, so a path or
    paving that arrives in a later frame leaves a hole in the earlier ones. Fill those spots with
    the ground block in the frames that lack them."""
    spots = {p for f in frames for p in f.c if p[1] < 0}
    for f in frames:
        for (x, y, z) in spots:
            if (x, y, z) not in f.c: f.set(x, y, z, top if y == -1 else 'dirt')
    return frames


# ---------------------------------------------------------------- draining water
SEA_X, SEA_Z, SEA_TOP = 10, 10, 2          # a chunk of sea: x 0..10, z 0..10, water y 0..SEA_TOP
RING = (2, 2, 10, 10)                       # room walls x0, z0, x1, z1 (inside x 3..9, z 3..9)
WALL_TOP = SEA_TOP + 1                      # the walls poke one block out of the water
MID = 6                                     # the middle pillar on each wall: 3 glass blocks either side
PUDDLE = ((3, 3), (4, 3), (3, 4))           # water the sand missed, in the back corner
SPONGE = (4, 4)                             # next to the puddle, touching two of its blocks
# A cutaway: the room sits in the near corner of the chunk, so its two glass walls face you with no
# water in front and you can see inside. The sea wraps the two far sides. (With water in front too,
# the glass reads as solid blue and the inside disappears.)


def _sea(b, rng):
    """Sand sea floor with gravel patches and coral, then water."""
    for x in range(SEA_X + 1):
        for z in range(SEA_Z + 1):
            b.set(x, -1, z, 'gravel' if rng.random() < 0.15 else 'sand')
    b.fill(0, 0, 0, SEA_X, SEA_TOP, SEA_Z, 'water')
    for (x, y, z, k) in ((0, 0, 0, 'tube_coral_block'), (1, 0, 0, 'brain_coral_block'), (0, 0, 1, 'horn_coral_block'),
                         (0, 1, 0, 'fire_coral_block'), (7, 0, 0, 'brain_coral_block'), (0, 0, 7, 'tube_coral_block'),
                         (10, 0, 0, 'horn_coral_block'), (0, 0, 10, 'fire_coral_block'), (1, 0, 10, 'brain_coral_block'),
                         (10, 0, 1, 'tube_coral_block')):
        b.set(x, y, z, k)


def _ring(b):
    x0, z0, x1, z1 = RING
    b.walls(x0, z0, x1, z1, 0, WALL_TOP, 'prismarine_bricks')
    # glass on the two sides that face you, so you can see in
    for x in range(x0 + 1, x1): b.fill(x, 0, z1, x, WALL_TOP - 1, z1, 'glass')
    for z in range(z0 + 1, z1): b.fill(x1, 0, z, x1, WALL_TOP - 1, z, 'glass')
    for (x, z) in ((x0, z0), (x1, z0), (x0, z1), (x1, z1), (MID, z1), (x1, MID), (MID, z0), (x0, MID)):
        b.fill(x, 0, z, x, WALL_TOP, z, 'dark_prismarine')


def _inside(fn):
    x0, z0, x1, z1 = RING
    for x in range(x0 + 1, x1):
        for z in range(z0 + 1, z1):
            fn(x, z)


def draining_water():
    frames = []
    for step in range(6):
        b = Build('Draining Water'); rng = random.Random(5)
        _sea(b, rng)
        if step >= 1: _ring(b)
        if step == 2:   # sand up to the top of the water: no water is left inside
            _inside(lambda x, z: b.fill(x, 0, z, x, SEA_TOP, z, 'sand'))
        if step >= 3:
            _inside(lambda x, z: b.fill(x, 0, z, x, SEA_TOP, z, None))
        if step == 3:
            for (x, z) in PUDDLE: b.set(x, 0, z, 'water')
        if step == 4:   # the sponge was placed next to the puddle and soaked it all up
            b.set(SPONGE[0], 0, SPONGE[1], 'wet_sponge')
        if step == 5:   # finished: a floor, a glass roof with a hatch, a ladder, lights
            _inside(lambda x, z: b.set(x, -1, z, 'dark_prismarine'))
            for (x, z) in ((4, 4), (8, 4), (4, 8), (8, 8)): b.set(x, -1, z, 'sea_lantern')
            _inside(lambda x, z: b.set(x, WALL_TOP, z, 'glass'))
            b.set(3, WALL_TOP, 3, 'oak_trapdoor', 'trapdoor', h='top')                 # the hatch, over the ladder
            for y in range(0, WALL_TOP): b.set(3, y, 3, 'ladder', 'ladder', side='N')
            b.set(5, 0, 3, 'chest', 'chest'); b.set(6, 0, 3, 'crafting_table'); b.set(7, 0, 3, 'barrel')
            b.set(9, 0, 3, 'blue_bed', 'bed', part='head', f='N'); b.set(9, 0, 4, 'blue_bed', 'bed', part='foot', f='N')
            b.fill(5, 0, 5, 7, 0, 7, 'light_blue_carpet', 'carpet')                   # a rug in the middle
            b.set(3, 0, 9, 'flower_pot', 'pot', plant='cornflower')
        frames.append(b)
    return frames


# ---------------------------------------------------------------- shelf walls
def _powered_back(key, chain):
    """The back of a powered shelf. In the game a powered shelf changes its front: the two dividers go,
    and joined shelves lose the posts where they meet, so the row reads as one long shelf.
    chain: 'L' / 'C' / 'R' (left, middle, right as you face it). Made from the shelf's own texture
    (columns 0-1 and 14-15 are its posts, 5 and 10 its dividers), like the Shelf Armory gadget."""
    sk = f'lb_pw_{key}_{chain}'
    if sk not in SPECIAL:
        img = np.array(B[key]['side'], dtype=float).copy()
        r = slice(4, 12)
        img[r, 5] = img[r, 6]; img[r, 10] = img[r, 9]
        if chain in ('C', 'R'): img[r, 0:2] = img[r, 2:4]
        if chain in ('L', 'C'): img[r, 14:16] = img[r, 12:14]
        SPECIAL[sk] = img
    return sk


def _shelf_items(build, p, v):
    """A shelf with up to three items showing: the shelf boxes plus small block cubes in the cubbies.
    show = [key or None, key or None, key or None], left to right as you face the shelf.
    chain = 'L' / 'C' / 'R' draws it powered and joined to its neighbours."""
    boxes, extra = EXTRA_SHAPES['shelf'](build, p, v)
    if v.get('chain'):                            # the third box is the back of the shelf
        boxes = list(boxes); boxes[2] = (boxes[2][0], _powered_back(v['b'], v['chain']))
        extra = list(extra) + ['pw', v['chain']]
    side = v.get('side', 'N'); show = list(v.get('show', [])) + [None] * 3
    lo, hi = 5.5 / 16, 10.5 / 16      # item cube: 5 px, in the middle of the shelf, just in front of the back
    for i, k in enumerate(show[:3]):
        if k is None: continue
        a0, a1 = (0.5 + 5.25 * i) / 16, (5.25 + 5.25 * i) / 16   # across the shelf, left to right
        if side == 'N':   box = (a0, lo, 4 / 16, a1, hi, 8 / 16)            # faces south: left is west
        elif side == 'S': box = (1 - a1, lo, 8 / 16, 1 - a0, hi, 12 / 16)   # faces north: left is east
        elif side == 'W': box = (4 / 16, lo, 1 - a1, 8 / 16, hi, 1 - a0)   # faces east: left is north
        else:             box = (8 / 16, lo, a0, 12 / 16, hi, a1)           # faces west: left is south
        boxes.append((box, k))
    return boxes, list(extra) + ['items'] + [str(k) for k in show[:3]]


EXTRA_SHAPES['lb_shelf_items'] = _shelf_items
EXTRA_ITEMS['lb_shelf_items'] = lambda v: EXTRA_ITEMS['shelf'](v)

TOP_ROW = [['gold_block', 'diamond_block', 'emerald_block'], ['amethyst_block', 'lapis_block', 'copper_block'],
           ['emerald_block', 'gold_block', 'diamond_block']]
KIT_A = [['stone_bricks', 'cobblestone', 'stone'], ['smooth_stone', 'stone_bricks', 'cobblestone'],   # a stone builder's kit
         ['stone', 'smooth_stone', 'stone_bricks']]
KIT_B = [['pumpkin', 'melon', 'hay_block'], ['pumpkin', 'oak_leaves', 'hay_block'],         # a farmer's hotbar
         ['melon', 'pumpkin', 'oak_leaves']]


SX0, SX1 = 2, 4                              # the shelf bank: x 2..4, rows y 1 and 2, on the north wall
RX, RZ, RH = 6, 3, 3                         # room: floor x 0..RX, z 0..RZ; walls y 0..RH, a beam on top
SW_WALL, SW_TRIM, SW_FLOOR, SW_RUG = 'pale_oak_planks', 'dark_oak', 'spruce_planks', 'cyan_carpet'


def shelf_walls():
    """A shelf wall in the corner of a room: two rows of three Birch Shelves on a cabinet base, under a
    ledge. The bank stands out from the wall with open ends, so you can see every shelf from the corner.
    From step 4 the base under the bottom row is Blocks of Redstone: those three shelves join up and
    swap with the whole hotbar."""
    frames = []
    for step in range(5):
        b = Build('Shelf Walls')
        b.fill(0, -1, 0, RX, -1, RZ, SW_FLOOR)                           # floor
        b.fill(1, 0, 0, RX, RH, 0, SW_WALL)                             # north wall
        b.fill(0, 0, 1, 0, RH, RZ, SW_WALL)                             # west wall
        for (x, z) in ((0, 0), (RX, 0), (0, RZ)):                       # log pillars at the corners
            b.fill(x, 0, z, x, RH + 1, z, SW_TRIM + '_log')
        b.fill(1, RH + 1, 0, RX - 1, RH + 1, 0, SW_TRIM + '_log', a='x')  # beams along the top
        b.fill(0, RH + 1, 1, 0, RH + 1, RZ - 1, SW_TRIM + '_log', a='z')
        b.fill(0, 1, 2, 0, 2, 2, 'glass', 'pane')                       # a window in the west wall
        # the cabinet: a base under the shelves and a ledge over them, one block out from the wall
        for x in range(SX0 - 1, SX1 + 2):
            under = SX0 <= x <= SX1
            b.set(x, 0, 1, 'redstone_block' if (under and step >= 3) else 'dark_oak_planks')
            b.set(x, 3, 1, 'dark_oak_planks', 'stairs', f='N', h='top')
        b.set(SX0 - 1, 1, 1, 'lantern', 'lantern'); b.set(SX1 + 1, 1, 1, 'lantern', 'lantern')
        b.set(RX, 0, 1, 'flower_pot', 'pot', plant='azalea')
        b.fill(SX0, 0, 2, SX1, 0, 3, SW_RUG, 'carpet')                  # a rug
        if step >= 1:
            for i, x in enumerate(range(SX0, SX1 + 1)):
                for y, row in ((2, TOP_ROW), (1, KIT_B if step >= 4 else KIT_A)):
                    pw = {'chain': 'LCR'[i]} if (y == 1 and step >= 3) else {}   # the powered row joins up
                    b.set(x, y, 1, 'birch_shelf', 'lb_shelf_items', side='N', show=row[i] if step >= 2 else [], **pw)
        frames.append(b)
    return frames


# ---------------------------------------------------------------- level up
# One small house, five steps: Starter, then depth, a second roof, details, and lights with a garden.
HX0, HZ0, HX1, HZ1 = 0, 0, 8, 4            # wall footprint (front door on the south side, z = 4)
DOOR_X = 4
WIN_S = (2, 6)                               # front windows (x), two blocks tall at y 1..2
WIN_E = 2                                    # side window (z) on the east wall
WALL, ROOF, LOG = 'birch_planks', 'dark_oak_planks', 'spruce_log'
FRONT = HZ1 + 1                              # the row just in front of the front wall
PZ = FRONT + 2                               # the front edge of the porch, where its posts stand


def _starter(b):
    b.fill(HX0, -1, HZ0, HX1, -1, HZ1, 'oak_planks')
    b.walls(HX0, HZ0, HX1, HZ1, 0, 3, WALL)
    door(b, DOOR_X, 0, HZ1, 'oak_door', 'S')
    for x in WIN_S:
        for z in (HZ0, HZ1): b.fill(x, 1, z, x, 2, z, 'glass', 'pane')
    b.fill(HX1, 1, WIN_E, HX1, 2, WIN_E, 'glass', 'pane')
    for z in (WIN_E - 1, WIN_E + 1): b.fill(HX0, 1, z, HX0, 2, z, 'glass', 'pane')   # west: either side of the chimney
    gable(b, HX0, HX1, HZ0, HZ1, 4, ROOF, o=1, gable_mat=WALL, axis='x')


def _depth(b):
    """Log corners, a stone base, a stone skirt and gable beams: the flat walls now step in and out."""
    for x in range(HX0, HX1 + 1):
        for z in (HZ0, HZ1):
            if x != DOOR_X: b.set(x, 0, z, 'cobblestone')
    for z in range(HZ0 + 1, HZ1):
        for x in (HX0, HX1): b.set(x, 0, z, 'cobblestone')
    for x in (HX0, HX1):
        for z in (HZ0, HZ1): b.fill(x, 0, z, x, 3, z, LOG)
    for x in range(HX0 - 1, HX1 + 2):
        if x != DOOR_X: b.set(x, 0, FRONT, 'cobblestone', 'stairs', f='N')
        b.set(x, 0, HZ0 - 1, 'cobblestone', 'stairs', f='S')
    for z in range(HZ0, HZ1 + 1):
        b.set(HX1 + 1, 0, z, 'cobblestone', 'stairs', f='W'); b.set(HX0 - 1, 0, z, 'cobblestone', 'stairs', f='E')
    b.set(DOOR_X, -1, FRONT, 'cobblestone')
    for z in range(HZ0, HZ1 + 1):
        for x in (HX0, HX1): b.set(x, 4, z, LOG, a='z')


def _porch(b):
    """A second roof: a little gable over the front door on two fence posts. It sits lower than the
    main roof, and its ridge runs into the main roof's slope."""
    for x in range(DOOR_X - 1, DOOR_X + 2):
        b.set(x, 0, FRONT, None)                                     # the skirt makes way for the porch
        for z in range(FRONT, PZ + 1): b.set(x, -1, z, 'stone_bricks')
    for x in (DOOR_X - 1, DOOR_X + 1): b.fill(x, 0, PZ, x, 2, PZ, 'spruce_planks', 'fence')
    for z in range(FRONT, PZ + 1):
        b.set(DOOR_X - 2, 3, z, ROOF, 'stairs', f='E'); b.set(DOOR_X + 2, 3, z, ROOF, 'stairs', f='W')
        b.set(DOOR_X - 1, 4, z, ROOF, 'stairs', f='E'); b.set(DOOR_X + 1, 4, z, ROOF, 'stairs', f='W')
        b.set(DOOR_X, 5, z, ROOF, 'slab')
    for x in range(DOOR_X - 1, DOOR_X + 2): b.set(x, 3, PZ, LOG, a='x')   # a beam over the posts
    b.set(DOOR_X, 4, PZ, WALL)                                       # fills the little gable


def _details(b):
    """Shutters, flower boxes, a gable window and a chimney."""
    for x in WIN_S:
        for y in (1, 2):
            for sx in (x - 1, x + 1):
                if abs(sx - DOOR_X) > 1:    # the porch covers the wall next to the door
                    b.set(sx, y, FRONT, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
        b.set(x, 0, FRONT, 'spruce_trapdoor', 'trapdoor', h='top')
    for y in (1, 2):
        for sz in (WIN_E - 1, WIN_E + 1): b.set(HX1 + 1, y, sz, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
        for x in WIN_S:
            for sx in (x - 1, x + 1): b.set(sx, y, HZ0 - 1, 'spruce_trapdoor', 'trapdoor', open=True, side='S')
    b.set(HX1 + 1, 0, WIN_E, 'spruce_trapdoor', 'trapdoor', h='top')
    # flower boxes: in Bedrock a Flower Pot can stand on a closed trapdoor (flowers themselves need dirt)
    b.set(WIN_S[0], 1, FRONT, 'flower_pot', 'pot', plant='poppy'); b.set(WIN_S[1], 1, FRONT, 'flower_pot', 'pot', plant='allium')
    b.set(HX1 + 1, 1, WIN_E, 'flower_pot', 'pot', plant='cornflower')
    b.set(HX1, 5, 2, 'glass', 'pane')                               # a little window up in the gable
    b.fill(HX0 - 1, 0, 2, HX0 - 1, 8, 2, 'bricks')                  # chimney on the west end
    b.set(HX0 - 1, 9, 2, 'campfire', 'campfire')


TREE = ('cherry_log', 'cherry_leaves')         # the little tree in the Legend garden
TREE_AT = (HX0 - 1, PZ + 1)


def _tree(b, x, z, log, leaves):
    b.fill(x, 0, z, x, 3, z, log)
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            if (dx, dz) != (0, 0): b.set(x + dx, 3, z + dz, leaves)
            if abs(dx) + abs(dz) < 2: b.set(x + dx, 4, z + dz, leaves)
    b.set(x, 5, z, leaves)


def _garden(b):
    """Lights and landscaping: a porch lantern, path lights, a path, flower beds, bushes and a tree."""
    b.set(DOOR_X, 2, PZ, 'lantern', 'lantern', hang=True)            # hangs under the porch beam
    for z in range(PZ + 1, PZ + 3): b.set(DOOR_X, -1, z, 'dirt_path')
    for x in (DOOR_X - 2, DOOR_X + 2):
        b.set(x, 0, PZ + 2, 'spruce_planks', 'fence'); b.set(x, 1, PZ + 2, 'lantern', 'lantern')
    beds = {0: 'poppy', 1: 'dandelion', 2: 'cornflower', 6: 'allium', 7: 'oxeye_daisy', 8: 'poppy'}
    for x, f in beds.items(): b.set(x, 0, FRONT + 1, f, 'flower')
    for (x, z) in ((2, PZ + 1), (7, PZ + 2)): b.set(x, 0, z, 'short_grass', 'tuft')
    b.set(HX1 + 1, 0, FRONT + 1, 'flowering_azalea', 'bush'); b.set(HX1 + 1, 0, HZ0 - 1, 'azalea', 'bush')
    if TREE: _tree(b, TREE_AT[0], TREE_AT[1], *TREE)


def level_up():
    frames = []
    for step in range(5):
        b = Build('Level Up')
        _starter(b)
        if step >= 1: _depth(b)
        if step >= 2: _porch(b)
        if step >= 3: _details(b)
        if step >= 4: _garden(b)
        frames.append(b)
    return keep_ground(frames)


FIGURES = {'draining-water': draining_water, 'shelf-walls': shelf_walls, 'level-up': level_up}

META = {
    'draining-water': dict(ground='sand', time=0.45, view='hero'),
    'shelf-walls': dict(ground=None, time=0.4, view='front'),
    'level-up': dict(ground='grass_block', time=0.4, view='hero'),
}
