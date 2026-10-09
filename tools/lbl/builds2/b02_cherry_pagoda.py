# Cherry Blossom Pagoda.
# Starter: a tea house with a curved roof and a little cherry tree. Pro: a pagoda with 3 roofs, pond, bridge
# and cherry garden. Legend: the pagoda grows to 5 roofs, plus a torii-style gate, a ladder to the bell
# and lanterns.
import math, random
from lbl import *

ROOF = 'deepslate_tiles'
POST = 'cherry_log'
WALL = 'cherry_planks'
BASE = 'stone_bricks'
GLASS = 'white_stained_glass'
PINK_POST = 'stripped_cherry_log'

PX, PZ = 19, 7          # pagoda centre (x east, z south)
TX, TZ = 5, 16          # tea house centre
PATH_X = (18, 19, 20)   # the main path runs south from the pagoda steps
BRIDGE_X = range(10, 18)  # the bridge runs west from the path to the tea house
BRIDGE_Z = (15, 16, 17)


def _in(dx, dz, R):
    """the side a ring cell's stair faces so its tall back points at the centre"""
    if dz == R: return 'N'
    if dz == -R: return 'S'
    if dx == R: return 'W'
    return 'E'


def _ring(R):
    if R == 0: return [(0, 0)]
    return [(dx, dz) for dx in range(-R, R + 1) for dz in range(-R, R + 1) if max(abs(dx), abs(dz)) == R]


def _sg(v): return 1 if v > 0 else -1


def curved_roof(b, cx, cz, r_in, E, T, r_body):
    """A roof whose eaves curl up at the corners.
    r_in: ring of the wall above it (-1 for a top roof that closes in the middle).
    E: the eave ring. T: y of the beam it sits on. r_body: ring of the walls under it.
    Returns the y of the top block (for a top roof)."""
    n = E - r_in
    for i in range(1, n + 1):
        R = r_in + i
        for dx, dz in _ring(R):
            x, z = cx + dx, cz + dz
            if R == 0:                              # the peak, on a block that joins it to ring 1
                b.set(x, T + n - 2, z, ROOF); b.set(x, T + n - 3, z, ROOF); continue
            k = R - min(abs(dx), abs(dz))          # 0 at a corner
            f = _in(dx, dz, R)
            if i == n:                              # the eave: low in the middle, rising to the corners
                if k >= 3: b.set(x, T, z, ROOF, 'slab', h='top')
                elif k == 2: b.set(x, T + 1, z, ROOF, 'slab')
                else: b.set(x, T + 1, z, ROOF, 'slab', h='top')
                if k == 0:                          # the corner flares out and hooks up
                    sx, sz = _sg(dx), _sg(dz)
                    b.set(x + sx, T + 1, z, ROOF, 'slab', h='top')
                    b.set(x, T + 1, z + sz, ROOF, 'slab', h='top')
                    b.set(x + sx, T + 1, z + sz, ROOF)          # a full block, so a lantern can hang under it
                    b.set(x + sx, T + 2, z + sz, ROOF, 'stairs', f='S' if dz > 0 else 'N')
            elif i == n - 1:
                if k == 0: b.set(x, T + 1, z, ROOF, 'stairs', f=f)
                else: b.set(x, T + 1, z, ROOF, 'slab')
            else:
                y = T + 1 + (n - 2 - i)
                b.set(x, y, z, ROOF, 'stairs', f=f)
                if R >= r_body:                     # close the gap over the beam
                    for yy in range(T + 1, y): b.set(x, yy, z, ROOF)
                elif k == R:                        # over the hollow: a block under the middle stair joins it to the ring below
                    b.set(x, y - 1, z, ROOF)
    return T + n - 2


def corner_tips(cx, cz, E, T):
    """the cells under each curled corner, where a lantern can hang"""
    return [(cx + sx * (E + 1), T, cz + sz * (E + 1)) for sx in (-1, 1) for sz in (-1, 1)]


def walls(b, cx, cz, r, y0, T, posts=(), door_side=None, glass=(), post=POST):
    """walls on ring r from y0 to T-1 and a log beam on top at T.
    posts: offsets along each side that get a log post (corners always do).
    glass: (along, y) pairs that get a window pane on every side."""
    for dx, dz in _ring(r):
        x, z = cx + dx, cz + dz
        corner = abs(dx) == r and abs(dz) == r
        along = dx if abs(dz) == r else dz
        side = 'S' if dz == r else 'N' if dz == -r else 'E' if dx == r else 'W'
        is_post = corner or abs(along) in posts
        for y in range(y0, T):
            if is_post: b.set(x, y, z, post)
            elif door_side == side and along == 0 and y < y0 + 2: pass
            elif (abs(along), y) in glass: b.set(x, y, z, GLASS, 'pane')
            else: b.set(x, y, z, WALL)
        b.set(x, T, z, POST, a='y' if corner else ('x' if abs(dz) == r else 'z'))


def colonnade(b, cx, cz, r, y0, T, open_side='S'):
    """an open porch on ring r: dark logs at the corners, pink posts at +-1, a fence rail between,
    and a log beam on top at T. The middle of open_side is left open as the way in."""
    for dx, dz in _ring(r):
        x, z = cx + dx, cz + dz
        corner = abs(dx) == r and abs(dz) == r
        along = dx if abs(dz) == r else dz
        side = 'S' if dz == r else 'N' if dz == -r else 'E' if dx == r else 'W'
        if corner or abs(along) == 1:
            for y in range(y0, T): b.set(x, y, z, POST if corner else PINK_POST)
        elif not (side == open_side and along == 0):
            b.set(x, y0, z, WALL, 'fence')
        b.set(x, T, z, POST, a='y' if corner else ('x' if abs(dz) == r else 'z'))


def brackets(b, cx, cz, r, T, at):
    """small upside-down stairs under the eave, in line with the posts"""
    R = r + 1
    for dx, dz in _ring(R):
        if abs(dx) == R and abs(dz) == R: continue
        along = dx if abs(dz) == R else dz
        if abs(along) in at:
            b.set(cx + dx, T, cz + dz, WALL, 'stairs', f=_in(dx, dz, R), h='top')


def stone_lantern(b, x, z, tall=False, y=0):
    """a little stone lantern: a stone post, a lantern and a slab hat"""
    b.set(x, y, z, BASE, 'wall'); y += 1
    if tall: b.set(x, y, z, BASE, 'wall'); y += 1
    b.set(x, y, z, 'lantern', 'lantern'); y += 1
    b.set(x, y, z, BASE, 'slab')


def cherry_tree(b, x, z, rng, trunk=4, arms=((1, 0, 'ouou'), (-1, 0, 'oou')), r=2.8, ry=1.6, droop=0.5):
    """a cherry tree: a dark trunk, branches that lean out and up, and wide pink crowns.
    arms: (dx, dz, steps) where each step is 'o' (one block out) or 'u' (one block up)."""
    for y in range(trunk): b.set(x, y, z, POST)
    tips = []
    for (ax, az, steps) in arms:
        px, py, pz = x, trunk - 1, z
        for s in steps:
            if s == 'o':
                px += ax; pz += az
                b.set(px, py, pz, POST, a='x' if ax and not az else 'z' if az and not ax else 'y')
            else:
                py += 1; b.set(px, py, pz, POST)
        tips.append((px, py + 1, pz))
    leaves = set()
    for (cx, cy, cz) in tips:                                # a puffy, flattened ball of leaves on each branch
        R = int(r) + 1
        for dy in range(-2, 3):
            for dx in range(-R, R + 1):
                for dz in range(-R, R + 1):
                    d = math.sqrt((dx / r) ** 2 + (dz / r) ** 2 + ((dy - 0.2) / ry) ** 2)
                    if d <= 0.82 or (d <= 1.08 and rng.random() < 0.5):
                        leaves.add((cx + dx, cy + dy, cz + dz))
    for p in sorted(leaves):
        if p not in b.c: b.set(*p, 'cherry_leaves')
    low = {}
    for (px, py, pz) in leaves:
        if (px, pz) not in low or py < low[(px, pz)]: low[(px, pz)] = py
    for (px, pz), py in sorted(low.items()):                 # a few leaves droop under the rim
        nb = sum((px + ddx, pz + ddz) in low for ddx, ddz in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if nb < 4 and rng.random() < droop and (px, py - 1, pz) not in b.c and py - 1 > 0:
            b.set(px, py - 1, pz, 'cherry_leaves')
    return {(px, pz) for (px, py, pz) in leaves}


def petals(b, cells, rng, chance=0.35):
    """pink petals on the grass under a tree"""
    for (x, z) in sorted(cells):
        if any((x, y, z) in b.c for y in (-1, 0)): continue
        if rng.random() < chance: b.set(x, 0, z, 'pink_petals', 'carpet')


# ------------------------------------------------------------------ Starter: the tea house
def tea_house(b, rng):
    cx, cz = TX, TZ
    for dx in range(-3, 4):
        for dz in range(-3, 4):
            b.set(cx + dx, 0, cz + dz, BASE)
    for d in range(-1, 2):
        b.set(cx + 4, 0, cz + d, BASE, 'stairs', f='W')
        for dz in range(-1, 2): b.set(cx + d, 0, cz + dz, 'bamboo_mosaic')   # a woven floor inside
    T = 5
    walls(b, cx, cz, 2, 1, T, door_side='E', glass={(1, 2), (1, 3), (0, 2), (0, 3)})
    door(b, cx + 2, 1, cz, 'cherry_door', 'E')
    brackets(b, cx, cz, 2, T, at=(0,))
    top = curved_roof(b, cx, cz, -1, 4, T, 2)
    b.set(cx, top + 1, cz, ROOF, 'wall')
    for (x, y, z) in corner_tips(cx, cz, 4, T):
        if x > cx: b.set(x, y, z, 'lantern', 'lantern', hang=True)
    # inside: a low table, two cushions facing each other, and a lantern tucked up in the roof
    b.set(cx, 1, cz, 'cherry_trapdoor', 'trapdoor', h='bottom')
    b.set(cx, 1, cz - 1, 'pink_wool', 'cushion'); b.set(cx, 1, cz + 1, 'pink_wool', 'cushion')
    b.set(cx, top - 2, cz, 'lantern', 'lantern', hang=True)
    # outside
    stone_lantern(b, cx + 4, cz - 2); stone_lantern(b, cx + 4, cz + 2)


# ------------------------------------------------------------------ Pro: the pagoda and garden
T1, T2, T3 = 5, 9, 13          # beams of storeys 1-3
T4, T5 = 17, 20                # beams of storeys 4-5 (Legend)


def pagoda_body(b):
    cx, cz = PX, PZ
    for dx in range(-4, 5):
        for dz in range(-4, 5):
            b.set(cx + dx, 0, cz + dz, BASE)
    for dx in range(-1, 2): b.set(cx + dx, 0, cz + 5, BASE, 'stairs', f='N')
    # storey 1: a small room with windows and a door, and a porch of posts all round it
    walls(b, cx, cz, 2, 1, T1, door_side='S', glass={(0, 2), (0, 3)})
    door(b, cx, 1, cz + 2, 'cherry_door', 'S')
    colonnade(b, cx, cz, 3, 1, T1)
    brackets(b, cx, cz, 3, T1, at=(1, 3))
    for dx in range(-2, 3):
        for dz in range(-2, 3): b.set(cx + dx, T1, cz + dz, WALL)          # floor of storey 2
    curved_roof(b, cx, cz, 2, 5, T1, 3)
    # storey 2
    walls(b, cx, cz, 2, T1 + 1, T2, glass={(0, T2 - 2), (0, T2 - 1)}, post=PINK_POST)
    brackets(b, cx, cz, 2, T2, at=(0, 2))
    curved_roof(b, cx, cz, 2, 4, T2, 2)
    # storey 3 and its top roof
    walls(b, cx, cz, 2, T2 + 1, T3, glass={(0, T3 - 2), (0, T3 - 1)}, post=PINK_POST)
    brackets(b, cx, cz, 2, T3, at=(0, 2))
    top = curved_roof(b, cx, cz, -1, 4, T3, 2)
    spire(b, top)
    # inside storey 1: a quiet shrine against the back wall
    b.set(cx, 1, cz - 1, 'decorated_pot', 'decorated_pot')
    b.set(cx - 1, 1, cz - 1, 'white_candle_lit', 'candle', n=1); b.set(cx + 1, 1, cz - 1, 'white_candle_lit', 'candle', n=1)
    b.set(cx, T1 - 1, cz, 'lantern', 'lantern', hang=True)
    # storey 3 gets a floor and a temple bell
    for dx in range(-1, 2):
        for dz in range(-1, 2): b.set(cx + dx, T2, cz + dz, WALL)
    b.set(cx, T2 + 1, cz, 'bell', 'bell')
    return top


def spire(b, top):
    b.set(PX, top + 1, PZ, ROOF, 'wall')
    b.set(PX, top + 2, PZ, 'chain', 'chain')
    b.set(PX, top + 3, PZ, 'lightning_rod', 'rod')


POND_ROWS = {14: (13, 15), 15: (11, 16), 16: (11, 16), 17: (11, 16), 18: (11, 16), 19: (10, 16),
             20: (9, 15), 21: (8, 15), 22: (8, 14), 23: (9, 13), 24: (10, 12)}


def pond_cells():
    return {(x, z) for z, (a, c) in POND_ROWS.items() for x in range(a, c + 1)}


def small_tree(b, x, z):
    """the tea house's little cherry tree: a forked trunk with two pink puffs"""
    for y in range(3): b.set(x, y, z, POST)
    b.set(x + 1, 2, z, POST, a='x'); b.set(x - 1, 2, z, POST, a='x')
    for (cx, cz) in ((x + 1, z), (x - 1, z + 1)):
        for dx, dz in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): b.set(cx + dx, 3, cz + dz, 'cherry_leaves')
        b.set(cx, 4, cz, 'cherry_leaves')


def bridge(b):
    """an arched bridge: slabs and stairs climb to the middle, a pink log beam runs along each side
    of the high part, and fences make the rails"""
    prof = {10: (0, 'slab', None), 11: (0, 'stairs', 'E'), 12: (1, 'slab', None), 13: (1, 'stairs', 'E'),
            14: (1, 'stairs', 'W'), 15: (1, 'slab', None), 16: (0, 'stairs', 'W'), 17: (0, 'slab', None)}
    for x, (y, s, f) in prof.items():
        for z in BRIDGE_Z:
            if y == 1 and z != BRIDGE_Z[1]: b.set(x, y, z, PINK_POST, a='x')   # the side beams
            elif s == 'stairs': b.set(x, y, z, WALL, 'stairs', f=f)
            else: b.set(x, y, z, WALL, 'slab')
        for z in (BRIDGE_Z[0], BRIDGE_Z[-1]):
            if 11 <= x <= 16: b.set(x, y + 1, z, WALL, 'fence')


def garden(b, rng):
    pond = pond_cells()
    for (x, z) in sorted(pond):                    # the pond
        b.set(x, -1, z, 'water')
    edge = set()
    for (x, z) in pond:
        for ddx in (-1, 0, 1):
            for ddz in (-1, 0, 1):
                q = (x + ddx, z + ddz)
                if q not in pond and q[0] not in PATH_X and not (q[0] in BRIDGE_X and q[1] in BRIDGE_Z): edge.add(q)
    reeds = [(x, z) for (x, z) in ((7, 21), (16, 21), (14, 23), (9, 24))     # sugar cane grows right next to water
             if any((x + ddx, z + ddz) in pond for ddx, ddz in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for (x, z) in reeds:
        b.set(x, 0, z, 'sugar_cane', 'plant'); b.set(x, 1, z, 'sugar_cane', 'plant')
    for (x, z) in sorted(edge):                    # rocks round the edge
        if (x, 0, z) in b.c or (x, -1, z) in b.c: continue
        r = rng.random()
        if r < 0.45: b.set(x, -1, z, rng.choice(['cobblestone', 'mossy_cobblestone', 'andesite']))
        elif r < 0.55: b.set(x, 0, z, rng.choice(['mossy_cobblestone', 'andesite']), 'slab')
        elif r < 0.6: b.set(x, 0, z, 'mossy_cobblestone')
    # the main path, from the pagoda steps to the front edge
    for z in range(PZ + 6, 26):
        for x in PATH_X:
            b.set(x, -1, z, 'polished_andesite' if x == PATH_X[1] else BASE)
    bridge(b)
    # stone lanterns along the path
    for (x, z, tall) in ((17, 13, True), (21, 13, True), (21, 17, False), (17, 20, False), (21, 21, False)):
        stone_lantern(b, x, z, tall)
    # petals blown across the lawn
    for (x, z) in ((11, 12), (12, 11), (13, 14), (17, 16), (21, 19), (22, 24), (6, 12), (3, 21), (1, 18), (10, 25), (14, 25), (22, 12)):
        if (x, -1, z) not in b.c and (x, 0, z) not in b.c: b.set(x, 0, z, 'pink_petals', 'carpet')
    # a big cherry tree behind the tea house
    t1 = cherry_tree(b, 7, 4, random.Random(21), trunk=4, arms=((1, 0, 'ouou'), (-1, 0, 'ouo'), (0, -1, 'uo')), r=3.0)
    petals(b, t1, rng, 0.35)
    # bamboo and bushes on the east side
    for (x, z, h) in ((25, 18, 5), (24, 19, 4), (25, 20, 6), (24, 22, 5), (25, 23, 4)):
        for y in range(h): b.set(x, y, z, 'bamboo', 'plant')
    for (x, z, k) in ((14, 10, 'flowering_azalea'), (24, 10, 'azalea'), (14, 4, 'azalea'), (24, 3, 'flowering_azalea'),
                      (23, 15, 'azalea'), (23, 21, 'flowering_azalea'), (10, 12, 'azalea')):
        b.set(x, 0, z, k, 'bush')


def torii(b):
    """a torii-style gate: two red posts, a red tie beam, and a black top beam with lifted ends"""
    z, top = 25, 5                                                        # top: the y of the red top beam
    for x in (17, 21):
        b.set(x, 0, z, 'polished_deepslate')
        for y in range(1, top + 1): b.set(x, y, z, 'red_concrete')
    for x in range(16, 23):
        if x not in (17, 21): b.set(x, top - 2, z, 'red_concrete')      # the tie beam pokes out past the posts
    b.set(19, top - 1, z, 'red_concrete')                                 # a short post in the middle
    for x in range(15, 24):
        if x not in (17, 21): b.set(x, top, z, 'red_concrete', 'slab', h='top')
        if x in (15, 23): b.set(x, top + 1, z, ROOF, 'stairs', f='W' if x == 15 else 'E')
        else: b.set(x, top + 1, z, ROOF, 'slab')


def pagoda():
    b = Build('Cherry Blossom Pagoda')
    rng = random.Random(11)

    # ---------------- Starter: the tea house and its little tree
    tea_house(b, rng)
    small_tree(b, 4, 23)
    for (x, z) in ((3, 25), (6, 22), (5, 25)): b.set(x, 0, z, 'pink_petals', 'carpet')

    # ---------------- Pro: a pagoda with three roofs, and the garden
    with b.tier(2):
        top = pagoda_body(b)
        garden(b, rng)
        for (x, y, z) in corner_tips(PX, PZ, 5, T1) + corner_tips(PX, PZ, 4, T2):
            b.set(x, y, z, 'lantern', 'lantern', hang=True)

    # ---------------- Legend: two more roofs, a gate, a ladder to the bell and lanterns
    with b.tier(3):
        # lift off the middle of the top roof and the spire: storey 4 stands there now
        for y in range(top - 1, top + 4): b.set(PX, y, PZ, None)
        walls(b, PX, PZ, 1, T3 + 1, T4, glass={(0, T4 - 2), (0, T4 - 1)}, post=PINK_POST)
        brackets(b, PX, PZ, 1, T4, at=(0, 1))
        curved_roof(b, PX, PZ, 1, 3, T4, 1)
        walls(b, PX, PZ, 1, T4 + 1, T5, post=PINK_POST)
        brackets(b, PX, PZ, 1, T5, at=(0, 1))
        spire(b, curved_roof(b, PX, PZ, -1, 3, T5, 1))
        for (x, y, z) in corner_tips(PX, PZ, 4, T3) + corner_tips(PX, PZ, 3, T4):
            b.set(x, y, z, 'lantern', 'lantern', hang=True)
        # a secret ladder up the west wall, through two floors, to the bell
        for y in range(1, T2 + 1): b.set(PX - 1, y, PZ + 1, 'ladder', 'ladder', side='W')
        torii(b)
        for x in (16, 22): stone_lantern(b, x, 23, True)
        for x in (11, 16):
            for z in (BRIDGE_Z[0], BRIDGE_Z[-1]): b.set(x, 2, z, 'lantern', 'lantern')
        b.set(9, -1, 21, 'mossy_cobblestone'); b.set(9, 0, 21, 'mossy_cobblestone')   # a rock in the pond
        stone_lantern(b, 9, 21, y=1)                                                 # with a lantern on it
        # no second cherry tree here: its crown ran into the big tree's, and from behind the pink blob on
        # two dark trunks looked like an animal. One tree with one trunk reads as a tree.

    return b


BUILDS = {'cherry-pagoda': pagoda}

META = {'cherry-pagoda': dict(
    title='Cherry Blossom Pagoda', kind='big', diff=3, mode='Creative',
    pitch='A pink pagoda with curly roofs, a pond and a bridge.',
    blurb=('Start with a little tea house and a cherry tree. Then stack a pagoda beside it, one roof at a time. '
           'Every roof curls up at the corners, and lanterns hang from the tips.'),
    tiers=['Starter: a tea house with a curly roof, two stone lanterns and a little cherry tree.',
           'Pro: a pagoda with three roofs, a pond, an arched bridge and a big cherry tree.',
           'Legend: the pagoda grows to five roofs. Add a red gate, a secret ladder to the bell and more lanterns.'],
    teaches=['Curly roof corners with stairs and slabs', 'Roofs that get smaller as they stack',
             'An arched bridge', 'Cherry trees shaped by hand'],
    tips=[('pro', 'The curly corner trick',
           'Along each roof edge, the middle blocks are top slabs. Near a corner, step up: a bottom slab, '
           'then top slabs one block higher. End each corner with a full block and a stair on top, tall side out. '
           'To place a top slab, aim at the top half of a block\'s side.'),
          ('warn', 'Cushions need a floor',
           'A cushion breaks soon after you break the block under it. Lay the floor first, then add cushions.'),
          ('warn', 'Lanterns need a full block',
           'Aim at the bottom of a block to hang a lantern. It won\'t hang under a top slab, so use a full block. '
           'A lantern gives light level 15.'),
          ('know', 'Petal power',
           'Up to four pink petals fit on one block. Each time you use Bone Meal on them, you get one more.'),
          ('pro', 'Endless water for the pond',
           'The pond takes lots of Water Buckets. Dig a 2 by 2 hole and pour water into two opposite corners. '
           'The other two corners fill up by themselves. Now you can fill your bucket there again and again.')],
    challenge='Make it yours: Build a second tea house across the pond. Or try your roofs in a new color.',
    dad="Dad's Corner: Build the tea house roof together, one corner each. Do all four corners curl up the same way?",
    needs='26.50',
    new_blocks=['Pink Cushion', 'Red Concrete Slab'],
    palette=['Cherry Planks', 'Cherry Log', 'Deepslate Tiles', 'Stone Bricks'],
    time=0.66,
    ground='grass_block',
    order=3,
    featured=False,
    sources=['https://minecraft.wiki/w/Cushion',
             'https://minecraft.wiki/w/Lantern',
             'https://minecraft.wiki/w/Slab',
             'https://minecraft.wiki/w/Pink_Petals',
             'https://minecraft.wiki/w/Water',
             'https://www.minecraft.net/en-us/article/minecraft--bedrock-edition-26-50-changelog'],
)}
