"""Master Builder Secrets, part A: four technique figures (one frame per lesson step).

soft-curves        wool stairs and slabs turn a blocky balloon round
cushion-furniture  a plain bench becomes a cozy sofa nook with cushions
copper-palette     copper's four colors used on purpose, then waxed
vibrant-light      a flat box gets depth, shade and light for Vibrant Visuals
"""
import math
from lbl import *


def _frames(steps):
    """Run step functions one after another on fresh Builds: frame k = steps[0..k] applied."""
    out = []
    for k in range(len(steps)):
        b = Build('frame %d' % (k + 1))
        for fn in steps[:k + 1]: fn(b)
        out.append(b)
    return out


# ---------------------------------------------------------------- 1. soft curves (balloon)
# The envelope is a stack of rings, widest in the upper middle like a real balloon.
_SQ3 = {(dx, dz) for dx in (-1, 0, 1) for dz in (-1, 0, 1)}                                 # 3 x 3
_OCT5 = {(dx, dz) for dx in range(-2, 3) for dz in range(-2, 3) if abs(dx) + abs(dz) < 4}   # 5 x 5, corners cut
_CIR7 = {(dx, dz) for dx in range(-3, 4) for dz in range(-3, 4) if dx * dx + dz * dz <= 10}  # 7-wide circle
_CIR9 = {(dx, dz) for dx in range(-4, 5) for dz in range(-4, 5) if dx * dx + dz * dz <= 17}  # 9-wide circle
# Narrow at the bottom, wide and round at the top, like a real balloon (a teardrop, not a ball).
BALLOON = [_SQ3 - {(0, 0)}, _OCT5, _CIR7, _CIR7, _CIR9, _CIR9, _CIR7]   # the mouth ring at the bottom, up to the top
CAP = _OCT5                     # step 3 lays a cap of slabs on the flat top
B_Y0, BX, BZ = 3, 4, 4          # envelope starts at y=3, centred on (4, 4)


def _gore(dx, dz):
    """Balloon stripes: eight wedges round the middle, red and yellow."""
    a = math.atan2(dz, dx) + math.pi
    return 'red_wool' if int(a // (math.pi / 4)) % 2 == 0 else 'yellow_wool'


def _inward(dx, dz):
    """The side of a cell that points to the middle of its ring (where a stair's tall half goes)."""
    if abs(dx) > abs(dz): return 'W' if dx > 0 else 'E'
    if abs(dz) > abs(dx): return 'N' if dz > 0 else 'S'
    return None                                   # a diagonal corner


def _envelope(b, top=False, slabs=False, bottom=False):
    """top: stairs on the upper edges. slabs: a cap of slabs on the flat top, and slabs in the
    top corners. bottom: upside-down stairs (and top slabs in the corners) on the lower edges."""
    last = len(BALLOON) - 1
    rings = BALLOON + ([CAP] if slabs else [])
    for i, ring in enumerate(BALLOON):
        above = rings[i + 1] if i + 1 < len(rings) else set()
        below = BALLOON[i - 1] if i > 0 else set()
        for (dx, dz) in ring:
            x, y, z = BX + dx, B_Y0 + i, BZ + dz
            mat = _gore(dx, dz)
            edge = any((dx + ex, dz + ez) not in ring for ex, ez in DIRS.values())
            up, down = (dx, dz) not in above, (dx, dz) not in below
            f = _inward(dx, dz)
            if edge and up and f and top: b.set(x, y, z, mat, 'stairs', f=f)
            elif edge and up and f is None and slabs: b.set(x, y, z, mat, 'slab')
            elif edge and down and f and bottom: b.set(x, y, z, mat, 'stairs', f=f, h='top')
            elif edge and down and f is None and bottom: b.set(x, y, z, mat, 'slab', h='top')
            else: b.set(x, y, z, mat)
    if slabs:
        for (dx, dz) in CAP: b.set(BX + dx, B_Y0 + last + 1, BZ + dz, _gore(dx, dz), 'slab')


def _basket(b):
    """The balloon has landed: the basket floor sits in the ground (y = -1), so the basket stands on the
    grass with trapdoor sides, and two Iron Chains at each corner reach up to the balloon's mouth."""
    b.fill(3, -1, 3, 5, -1, 5, 'spruce_planks')
    for x in (3, 4, 5):
        b.set(x, 0, 3, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
        b.set(x, 0, 5, 'spruce_trapdoor', 'trapdoor', open=True, side='S')
    b.set(3, 0, 4, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
    b.set(5, 0, 4, 'spruce_trapdoor', 'trapdoor', open=True, side='E')
    b.set(4, 0, 4, 'campfire', 'campfire')
    for x in (3, 5):
        for z in (3, 5):
            for y in (1, 2): b.set(x, y, z, 'chain', 'chain')


def keep_ground(frames, top='grass_block'):
    """The 3D book draws its own ground only where no frame has a block below y = 0, so a block set
    into the ground in a later frame leaves a hole (and a dark patch) in the earlier ones. Fill those
    spots with the ground block in the frames that lack them."""
    spots = {p for f in frames for p in f.c if p[1] < 0}
    for f in frames:
        for (x, y, z) in spots:
            if (x, y, z) not in f.c: f.set(x, y, z, top if y == -1 else 'dirt')
    return frames


def _meadow(b):
    """A few flowers on the field where the balloon lands."""
    for (x, z, f) in ((8, 7, 'poppy'), (0, 8, 'dandelion'), (7, 8, 'oxeye_daisy'), (8, 1, 'cornflower')): b.set(x, 0, z, f, 'flower')
    for (x, z) in ((1, 7), (8, 8), (6, 8), (0, 1)): b.set(x, 0, z, 'short_grass', 'tuft')


def soft_curves():
    return keep_ground(_frames([
        lambda b: (_meadow(b), _envelope(b)),
        lambda b: _envelope(b, top=True),
        lambda b: _envelope(b, top=True, slabs=True),
        lambda b: _envelope(b, top=True, slabs=True, bottom=True),
        _basket,
    ]))


# ---------------------------------------------------------------- 2. cushion furniture (a sofa nook)
# A corner of a cabin: floor, a north wall and a west wall. Only the furniture changes between steps.
SOFA = 'cyan_wool'
RUG = 'red_wool'


def _room(b):
    b.fill(0, -1, 0, 7, -1, 6, 'spruce_planks')                     # floor (replaces the grass)
    for y in range(0, 3):
        for x in range(0, 8): b.set(x, y, 0, 'birch_planks')         # north wall
        for z in range(1, 7): b.set(0, y, z, 'birch_planks')         # west wall
        for (x, z) in ((0, 0), (7, 0), (0, 6)): b.set(x, y, z, 'stripped_spruce_log', a='y')
    for x in range(0, 8): b.set(x, 3, 0, 'spruce_planks', 'slab')
    for z in range(1, 7): b.set(0, 3, z, 'spruce_planks', 'slab')
    for x in (3, 4): b.set(x, 2, 0, 'glass', 'pane')                 # window over the sofa
    for z in (3, 4): b.set(0, 1, z, 'glass', 'pane')                 # window on the side wall


def _seat(b):
    for x in (2, 3, 4): b.set(x, 0, 2, SOFA)                        # the seat: three blocks in a row


def _sofa(b):
    for x in (2, 3, 4):
        b.set(x, 0, 1, SOFA); b.set(x, 1, 1, SOFA, 'stairs', f='N')   # the back
    for x in (1, 5):                                                # the arms
        b.set(x, 0, 1, SOFA); b.set(x, 0, 2, SOFA)
        b.set(x, 1, 1, SOFA, 'slab'); b.set(x, 1, 2, SOFA, 'slab')


def _cushions(b):
    for x, c in ((2, 'orange_wool'), (3, 'yellow_wool'), (4, 'orange_wool')): b.set(x, 1, 2, c, 'cushion')


def _table(b):
    for x in (3, 4): b.set(x, 0, 4, 'birch_trapdoor', 'trapdoor', h='top')     # a low coffee table (pale, so it shows on the dark floor)
    b.set(3, 1, 4, 'flower_pot', 'pot', plant='cornflower')
    for x, c in ((3, 'yellow_wool'), (4, 'orange_wool')): b.set(x, 0, 5, c, 'cushion')   # floor cushions


def _cozy(b):
    b.fill(2, -1, 3, 5, -1, 5, RUG)                                 # a wool rug set into the floor
    b.set(6, 0, 1, 'spruce_planks', 'fence'); b.set(6, 1, 1, 'spruce_planks', 'fence'); b.set(6, 2, 1, 'lantern', 'lantern')
    b.set(1, 2, 1, 'spruce_shelf', 'shelf', side='N'); b.set(2, 2, 1, 'spruce_shelf', 'shelf', side='N')
    b.set(1, 0, 4, 'flower_pot', 'pot', plant='poppy')


def cushion_furniture():
    return _frames([lambda b: (_room(b), _seat(b)), _sofa, _cushions, _table, _cozy])


# ---------------------------------------------------------------- 3. copper palette (a little copper tower)
_STAGE = ['', 'exposed_', 'weathered_', 'oxidized_']


def cu(kind, stage, waxed=False):
    """Block key for a copper block at stage 0 (new) .. 3 (oxidized), waxed or not."""
    st = _STAGE[stage]
    if kind == 'block': k = 'copper_block' if stage == 0 else st + 'copper'
    elif kind == 'cut': k = st + 'cut_copper'
    elif kind == 'chiseled': k = st + 'chiseled_copper'
    elif kind == 'rod': k = st + 'lightning_rod'
    else: k = st + 'copper_' + kind               # grate, door, trapdoor, lantern, bars, chain, bulb, bulb_lit
    if waxed: k = 'waxed_' + k
    assert k in B, k
    return k


def _swatch(b):
    """The palette: the four stages side by side, waxed so they never change."""
    for i in range(4): b.set(8, 0, 5 - i, cu('block', i, True))   # reads new to old, left to right


WALL_TOP = 4                                      # walls are y 0..4, the roof starts on y 5


def _tower(b, walls, base, pillars, roof, waxed=False, grate=None, door_stage=None):
    """A 5 x 5 copper tower. Stages: 0 new .. 3 oxidized. roof lists 4 stages, eaves to top."""
    W = lambda kind, st: cu(kind, st, waxed)
    for y in range(0, WALL_TOP + 2):
        for x in range(1, 6):
            for z in range(1, 6):
                if x in (1, 5) or z in (1, 5):
                    corner = x in (1, 5) and z in (1, 5)
                    b.set(x, y, z, W('chiseled', pillars) if corner and y <= WALL_TOP else W('cut', base if y == 0 else walls))
    # hip roof of cut copper stairs, one ring per layer, with a 1 block overhang
    X0, X1, y = 0, 6, WALL_TOP + 1
    while X0 < X1:
        k = W('cut', roof[min(y - WALL_TOP - 1, 3)])
        for x in range(X0, X1 + 1):
            b.set(x, y, X0, k, 'stairs', f='S'); b.set(x, y, X1, k, 'stairs', f='N')
        for z in range(X0 + 1, X1):
            b.set(X0, y, z, k, 'stairs', f='E'); b.set(X1, y, z, k, 'stairs', f='W')
        X0 += 1; X1 -= 1; y += 1
    b.set(3, y, 3, W('cut', roof[3]))
    # door and windows
    door(b, 3, 0, 5, W('door', walls if door_stage is None else door_stage), 'S')
    g = W('grate', walls if grate is None else grate)
    for (x, z) in ((3, 1), (1, 3), (5, 3)):       # tall grate windows
        for y in (2, 3): b.set(x, y, z, g)
    b.set(3, 3, 5, g)


def _garden(b):
    for z in (6, 7, 8): b.set(3, -1, z, 'dirt_path')
    # kept out of the lantern posts' screen columns (x - z = -6 and -4), so no flower looks like it sits on a lantern
    for (x, z, f) in ((0, 7, 'allium'), (0, 8, 'poppy'), (6, 7, 'allium'), (5, 8, 'oxeye_daisy')): b.set(x, 0, z, f, 'flower')
    for (x, z) in ((1, 6), (0, 2), (7, 0), (8, 8)): b.set(x, 0, z, 'short_grass', 'tuft')


def _copper_new(b): _tower(b, 0, 0, 0, [0, 0, 0, 0])
def _copper_old(b): _tower(b, 3, 3, 3, [3, 3, 3, 3])
def _copper_mix(b): _tower(b, 0, 1, 2, [1, 2, 3, 3], waxed=True, grate=2, door_stage=1)


def _copper_details(b):
    b.set(3, 9, 3, cu('rod', 0, True), 'rod')                                 # lightning rod on top
    for x in (2, 4):                                                           # lantern posts at the end of the path
        b.set(x, 0, 8, cu('chiseled', 2, True)); b.set(x, 1, 8, cu('lantern', 0, True), 'lantern')
    for x in (2, 4): b.set(x, 4, 6, cu('chain', 1, True), 'chain')            # a lantern on a chain by the door
    b.set(2, 3, 6, cu('lantern', 0, True), 'lantern', hang=True); b.set(4, 3, 6, cu('lantern', 0, True), 'lantern', hang=True)


def copper_palette():
    return _frames([lambda b: (_garden(b), _swatch(b)), _copper_new, _copper_old, _copper_mix, _copper_details])


# ---------------------------------------------------------------- 4. light for Vibrant Visuals
# A small cottage whose long front (door, windows, path) faces east, toward the sunrise (+x).
# Walls x 0..5 by z 0..8, y 0..3. The front wall is x = 5; the roof ridge runs north-south, so
# the front eave hangs over the door and windows and throws shade on them.
LW, LB, LF, LR = 'smooth_quartz', 'cobblestone', 'stripped_spruce_log', 'spruce_planks'
LX1, LZ1 = 5, 8                                   # far corner of the walls
FRONT_WIN = ((1, 2), (6, 7))                      # z ranges of the two front windows (y 1..2)
END_WIN = (2, 3)                                  # x range of the window in each end wall
DOOR_Z = 4


def _l_garden(b):
    for x in range(LX1 + 1, LX1 + 5): b.set(x, -1, DOOR_Z, 'dirt_path')           # the path runs east, to the sunrise
    for (x, z, f) in ((8, 1, 'poppy'), (9, 7, 'dandelion'), (7, 8, 'allium'), (2, 10, 'oxeye_daisy'), (9, 2, 'cornflower')):
        b.set(x, 0, z, f, 'flower')
    for (x, z) in ((7, 0), (10, 6), (-1, 10), (4, 10), (10, 1)): b.set(x, 0, z, 'short_grass', 'tuft')


def _l_box(b):
    for y in range(0, 4):
        for x in range(0, LX1 + 1):
            for z in range(0, LZ1 + 1):
                if x in (0, LX1) or z in (0, LZ1): b.set(x, y, z, LB if y == 0 else LW)
    b.fill(0, 4, 0, LX1, 4, LZ1, LR, 'slab')                                  # flat roof
    door(b, LX1, 0, DOOR_Z, 'spruce_door', 'E')
    for z0, z1 in FRONT_WIN:                                                   # windows flush with the wall
        for z in (z0, z1):
            for y in (1, 2): b.set(LX1, y, z, 'glass')
    for x in END_WIN:
        for y in (1, 2): b.set(x, y, LZ1, 'glass'); b.set(x, y, 0, 'glass')    # south and north windows


def _l_recess(b):
    """The glass moves one block in. The wall stays, so each window becomes a little cave of shade."""
    for z0, z1 in FRONT_WIN:
        for z in (z0, z1):
            for y in (1, 2): b.set(LX1, y, z, None); b.set(LX1 - 1, y, z, 'glass')
    for x in END_WIN:
        for y in (1, 2):
            b.set(x, y, LZ1, None); b.set(x, y, LZ1 - 1, 'glass')
            b.set(x, y, 0, None); b.set(x, y, 1, 'glass')


def _l_roof(b):
    """A pitched roof that hangs one block past every wall. Log corners and log beams frame the walls."""
    b.clear(0, 4, 0, LX1, 4, LZ1)
    gable(b, 0, LX1, 0, LZ1, 4, LR, o=1, gable_mat=LW, axis='z')
    for z in range(0, LZ1 + 1):                                                # log beams along the top of the long walls
        b.set(0, 4, z, LF, a='z'); b.set(LX1, 4, z, LF, a='z')
    for y in range(0, 4):
        for (x, z) in ((0, 0), (0, LZ1), (LX1, 0), (LX1, LZ1)): b.set(x, y, z, LF, a='y')


def _l_lights(b):
    for z in (DOOR_Z - 1, DOOR_Z + 1): b.set(LX1 + 1, 3, z, 'lantern', 'lantern', hang=True)   # under the eave, by the door
    for z in (DOOR_Z - 1, DOOR_Z + 1):                                                          # lamps at the end of the path
        b.set(LX1 + 4, 0, z, 'spruce_planks', 'fence'); b.set(LX1 + 4, 1, z, 'lantern', 'lantern')
    for z0, z1 in FRONT_WIN: b.set(LX1, 1, z0 if z0 < DOOR_Z else z1, 'white_candle_lit', 'candle', n=3)   # candles in the windows
    for z in (0, LZ1): b.set(LX1 + 1, 0, z, 'firefly_bush', 'plant')                          # they glow at night


def vibrant_light():
    return _frames([lambda b: (_l_garden(b), _l_box(b)), _l_recess, _l_roof, _l_lights])


FIGURES = {
    'soft-curves': soft_curves,
    'cushion-furniture': cushion_furniture,
    'copper-palette': copper_palette,
    'vibrant-light': vibrant_light,
}

META = {
    'soft-curves': dict(ground='grass_block', time=0.4, view='low'),   # low: the outline shows every rounded edge, top and bottom
    'cushion-furniture': dict(ground='grass_block', time=0.4, view='hero'),
    'copper-palette': dict(ground='grass_block', time=0.4, view='hero'),
    'vibrant-light': dict(ground='grass_block', time=0.28, view='hero'),
}
