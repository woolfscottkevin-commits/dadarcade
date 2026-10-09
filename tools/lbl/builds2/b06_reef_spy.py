"""Layer by Layer 2: Glass Reef Base and Secret Spy Base.

Both builds use three tiers (Starter, Pro, Legend). The reef base sits in a box of water: the water
is added last by `flood`, so the cells inside the domes, the airlock and the tunnel stay dry.
"""
import math, random
from lbl import *

# ---------------------------------------------------------------- shared helpers

def ellipsoid(cx, cz, rh, rv, y0=0):
    """Cells of a dome (half ellipsoid) standing on layer y0. Returns (inside, shell)."""
    inside = set(); R = int(rh) + 2
    for dy in range(0, int(rv) + 2):
        for dx in range(-R, R + 1):
            for dz in range(-R, R + 1):
                if (dx * dx + dz * dz) / (rh * rh) + (dy * dy) / (rv * rv) <= 1.02:
                    inside.add((cx + dx, y0 + dy, cz + dz))
    shell = set()
    for (x, y, z) in inside:
        if y == y0: continue
        for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, 0, 1), (0, 0, -1)):
            if (x + d[0], y + d[1], z + d[2]) not in inside:
                shell.add((x, y, z)); break
    return inside, shell


def flood(b, regions, dry):
    """Fill empty cells with water, tier by tier, and return a new Build.

    regions: [(tier, x0, x1, z0, z1, ytop)], water from y=0 up to ytop in that box from that tier on.
    dry(p, t): True when cell p must stay air in tier t (rooms, tunnels, doorways).
    Water goes in first, so later-tier blocks replace it the normal way.
    """
    nb = Build(b.name)
    tiers = sorted({1} | {v.get('tier', 1) for v in b.c.values()} | {t for ups in b.up.values() for t, _ in ups})
    wet = {}
    for t in tiers:
        bt = b.at_tier(t)
        for (rt, x0, x1, z0, z1, ytop) in regions:
            if rt > t: continue
            for x in range(x0, x1 + 1):
                for z in range(z0, z1 + 1):
                    for y in range(0, ytop + 1):
                        p = (x, y, z)
                        free = p not in bt.c and not dry(p, t)
                        if free and p not in wet:
                            wet[p] = t
                            with nb.tier(t): nb.set(x, y, z, 'water')
                        elif p in wet and wet[p] < t and dry(p, t) and p not in bt.c:
                            with nb.tier(t): nb.set(x, y, z, None)
                            wet[p] = 99
    def put(p, v, t):
        kw = {k: w for k, w in v.items() if k not in ('b', 's', 'tier')}
        with nb.tier(t): nb.set(*p, v['b'], v['s'], **kw)
    for p, v in sorted(b.c.items(), key=lambda e: e[1].get('tier', 1)):
        put(p, v, v.get('tier', 1))
    for p, ups in b.up.items():
        for t, d in sorted(ups, key=lambda e: e[0]):
            if d is None:
                with nb.tier(t): nb.set(*p, None)
            else: put(p, d, t)
    return nb


def anchor(b, shell, room, mat):
    """Make a curved shell buildable layer by layer. Where a ring steps in, its blocks touch the ring
    below only at a corner, and the game has nothing to place them against (water does not count).
    For each run of blocks with nothing under it or beside it, put one block in the step underneath,
    inside the shell. shell: the shell cells; room: cells a hidden block may use; mat(p): its block."""
    N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    solid = lambda p: b.get(*p) is not None
    added = []
    for y in sorted({p[1] for p in shell}):
        while True:
            layer = {p for p in shell if p[1] == y}
            seen = {p for p in layer if solid((p[0], y - 1, p[2])) or any(
                solid((p[0] + dx, y, p[2] + dz)) and (p[0] + dx, y, p[2] + dz) not in layer for dx, dz in N4)}
            todo = list(seen)
            while todo:
                x, _, z = todo.pop()
                for dx, dz in N4:
                    q = (x + dx, y, z + dz)
                    if q in layer and q not in seen: seen.add(q); todo.append(q)
            fix = next((q for (x, _, z) in sorted(layer - seen) for q in [(x, y - 1, z)]
                        if q in room and not solid(q) and (solid((x, y - 2, z)) or any(solid((x + dx, y - 1, z + dz)) for dx, dz in N4))), None)
            if fix is None: break
            b.set(*fix, mat(fix)); added.append(fix)
    return added


def toward(dx, dz):
    """The compass side a cell at offset (dx, dz) from a centre points to."""
    if abs(dx) >= abs(dz): return 'E' if dx > 0 else 'W'
    return 'S' if dz > 0 else 'N'


# ================================================================ Glass Reef Base

MAIN_DOME = (5.4, 5.4, 4.4, 4.4, 3.4, 2.4, 1.0)    # circle sizes per layer: 11, 11, 9, 9, 7, 5, plus
SMALL_DOME = (3.4, 3.4, 2.4, 1.4)                  # 7, 7, 5, 3


def dome(b, cx, cz, radii, ribs=4, portholes=True, floor='prismarine_bricks', base='prismarine_bricks'):
    """A glass dome built from stacked circles, on a round prismarine floor.
    ribs: 4 dark ribs (north, south, east, west) or 8 (plus the diagonals).
    portholes: 8 Sea Lanterns in the bottom ring. floor: the block inside the dark edge and cross.
    base: the bottom ring ('glass' makes it glass between the ribs, so you can see in).
    Returns (footprint, dry cells inside, top layer)."""
    inside = set()
    for i, r in enumerate(radii):
        for (dx, dz) in disc(r): inside.add((cx + dx, i + 1, cz + dz))
    shell = set()
    for (x, y, z) in inside:
        for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, 0, 1), (0, 0, -1)):
            if (x + d[0], y + d[1], z + d[2]) not in inside: shell.add((x, y, z)); break
    foot = {(x, z) for (x, y, z) in inside if y == 1}
    for (x, z) in foot:
        dx, dz = x - cx, z - cz
        edge = any((x + ex, z + ez) not in foot for ex, ez in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if edge: b.set(x, 0, z, 'dark_prismarine')
        elif dx == 0 and dz == 0: b.set(x, 0, z, 'sea_lantern')
        elif abs(dx) + abs(dz) == 1: b.set(x, 0, z, 'dark_prismarine')
        else: b.set(x, 0, z, floor)
    top = len(radii)
    for (x, y, z) in shell:
        dx, dz = x - cx, z - cz
        rib = (dx == 0 or dz == 0) if ribs >= 4 else False
        if ribs == 8 and abs(dx) == abs(dz): rib = True
        if y == top: b.set(x, y, z, 'sea_lantern' if dx == 0 and dz == 0 else 'dark_prismarine')
        elif y == 1:
            port = portholes and {abs(dx), abs(dz)} == {3, 4}       # 8 glowing portholes
            b.set(x, y, z, 'sea_lantern' if port else ('dark_prismarine' if rib and base == 'glass' else base))
        elif rib: b.set(x, y, z, 'dark_prismarine')
        else: b.set(x, y, z, 'glass')
    dry = {p for p in inside if p not in shell}
    return foot, dry, top, shell


def skirt(b, foot, cx, cz, mat='prismarine_bricks'):
    """Stairs round the foot of a dome, so it sits down into the sand."""
    ring = set()
    for (x, z) in foot:
        for ex, ez in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + ex, z + ez)
            if q not in foot and b.get(q[0], 0, q[1]) is None: ring.add(q)
    for (x, z) in ring:
        b.set(x, 0, z, mat, 'stairs', f=toward(cx - x, cz - z))
    return ring


def kelp(b, x, z, h):
    """Kelp growing up from the sand. It stops at anything already there, so it never
    replaces a block and never floats."""
    for y in range(h):
        if b.get(x, y, z) is not None: break
        b.set(x, y, z, 'kelp', 'cross_plant')


def reef(b, rng, blocks, kinds, pickles=(), spread=(), keep=lambda x, z: True):
    """A patch of reef. blocks = [(x, z, height)] coral blocks; each top gets a fan or sea pickles,
    the sides get wall fans, and the sand round it gets small corals and fans.
    Tops are always fans, the same item as the wall fans: the floor layer of the dome is already
    full of kinds of block, and the plan only has 24 letters.
    Coral only stays alive in water, so all of this goes outside the dome."""
    occ = {}
    for i, (x, z, h) in enumerate(blocks):
        k = kinds[i % len(kinds)]
        for y in range(h):
            b.set(x, y, z, k + '_coral_block'); occ[(x, y, z)] = k
        if (x, z) in pickles: b.set(x, h, z, rng.choice(('sea_pickle_3', 'sea_pickle_4')), 'sea_pickle')
        else: b.set(x, h, z, k + '_coral_fan', 'coral_fan')
    for (x, y, z), k in list(occ.items()):
        if y == 0: continue
        for side, (dx, dz) in (('N', (0, 1)), ('W', (1, 0)), ('S', (0, -1)), ('E', (-1, 0))):
            q = (x + dx, y, z + dz)
            if q in occ or b.get(*q) is not None or not keep(q[0], q[2]): continue
            if rng.random() < 0.75: b.set(*q, k + '_coral_fan', 'coral_fan', side=side)
    for (x, z) in spread:
        if b.get(x, 0, z) is None and keep(x, z):
            k = rng.choice(kinds)
            kind = rng.choice(('_coral', '_coral_fan'))           # the picture always matches the name
            b.set(x, 0, z, k + kind, 'cross_plant' if kind == '_coral' else 'coral_fan')


def reef_base():
    b = Build('Glass Reef Base'); rng = random.Random(7)
    CX, CZ = 7, 7
    # ---- Starter: the main dome, its floor, the airlock and a cosy bed
    foot, dry, top, shell = dome(b, CX, CZ, MAIN_DOME)
    # airlock: a short tunnel on the south side with a copper door at the end
    b.fill(CX - 1, 0, 13, CX + 1, 0, 15, 'dark_prismarine')
    for x in (CX - 1, CX + 1):
        b.fill(x, 1, 13, x, 2, 14, 'prismarine_bricks'); b.set(x, 1, 15, 'dark_prismarine'); b.set(x, 2, 15, 'sea_lantern')
    for z in (12, 13, 14, 15):
        b.set(CX - 1, 3, z, 'prismarine_bricks', 'stairs', f='E'); b.set(CX + 1, 3, z, 'prismarine_bricks', 'stairs', f='W')
        b.set(CX, 3, z, 'dark_prismarine')
    for z in (12, 13, 14):
        for y in (1, 2): b.set(CX, y, z, None); dry.add((CX, y, z))
    door(b, CX, 1, 15, 'oxidized_copper_door', 'S')
    b.set(CX, 4, 15, 'sea_lantern')
    # each smaller circle rests on the one below (never above the chest, so it still opens)
    rib = lambda p: 'dark_prismarine' if p[0] == CX or p[2] == CZ else 'glass'
    dry -= set(anchor(b, shell, dry - {(3, 2, 6)}, rib))
    # furniture stands one block in from the wall, so the bottom ring stays whole
    b.set(4, 1, 4, 'cyan_bed', 'bed', part='head', f='N'); b.set(4, 1, 5, 'cyan_bed', 'bed', part='foot', f='N')
    b.set(3, 1, 6, 'chest', 'chest'); b.set(10, 1, 4, 'crafting_table')
    kelp(b, 1, 4, 5); kelp(b, 12, 2, 4)
    for (x, z) in ((3, 2), (11, 2), (12, 11)): b.set(x, 0, z, 'seagrass', 'cross_plant')

    # ---- Pro: skirt, nautilus bay, coral garden, kelp forest, a lived-in room
    with b.tier(2):
        skirt(b, foot, CX, CZ)
        # nautilus bay, front left: a roofed stall open to the south
        b.fill(0, 0, 12, 4, 0, 16, 'dark_prismarine'); b.fill(1, 0, 13, 3, 0, 15, 'prismarine')
        b.fill(1, 1, 12, 3, 3, 12, 'prismarine_bricks'); b.set(2, 2, 12, 'sea_lantern')
        for x in (0, 4):
            b.fill(x, 1, 12, x, 3, 12, 'dark_prismarine'); b.fill(x, 1, 16, x, 3, 16, 'dark_prismarine')
            for z in (13, 14, 15): b.set(x, 1, z, 'prismarine', 'wall')
        for x in range(0, 5):
            for z in range(12, 17): b.set(x, 4, z, 'prismarine_bricks', 'slab')
            b.set(x, 4, 16, 'prismarine_bricks', 'stairs', f='N')
        b.set(2, 4, 16, 'sea_lantern')
        b.set(1, 3, 16, 'prismarine_bricks', 'stairs', f='W', h='top')   # an arched mouth for the bay
        b.set(3, 3, 16, 'prismarine_bricks', 'stairs', f='E', h='top')
        for (x, z, k) in ((1, 13, 'sea_pickle_3'), (3, 14, 'sea_pickle_2')):   # pickles need a full block under them
            b.set(x, 4, z, 'prismarine_bricks'); b.set(x, 5, z, k, 'sea_pickle')
        # porch lights by the airlock door
        for x in (CX - 2, CX + 2):
            b.set(x, 0, 15, 'prismarine', 'wall'); b.set(x, 1, 15, 'prismarine', 'wall'); b.set(x, 2, 15, 'sea_lantern')
        # coral garden
        keep = lambda x, z: 1 <= x <= 15 and 1 <= z <= 15 and not (CX - 1 <= x <= CX + 1 and z >= 12) and not (x <= 4 and z >= 11)
        # the front reef runs right up to the edge of the water, like a slice through the sea
        front = lambda x, z: 1 <= x <= 16 and 1 <= z <= 16 and not (CX - 1 <= x <= CX + 1 and z >= 12) and not (x <= 4 and z >= 11)
        reef(b, rng, [(11, 14, 1), (12, 14, 2), (12, 15, 2), (13, 15, 1), (13, 14, 2), (14, 13, 1), (14, 14, 1), (12, 16, 1),
                      (13, 16, 2), (14, 16, 1), (15, 16, 1), (16, 15, 1), (16, 14, 2), (16, 13, 1), (15, 15, 3), (15, 12, 1), (16, 11, 1), (11, 16, 1)],
             ('brain', 'horn', 'fire', 'tube', 'bubble'), pickles={(12, 14), (16, 13), (13, 16)},
             spread=[(10, 14), (10, 15), (11, 15), (10, 16), (14, 15), (15, 14), (15, 13), (14, 12), (13, 13), (16, 12), (15, 11), (13, 12), (9, 15), (16, 10)],
             keep=front)
        # the back reefs keep clear of the Starter kelp, so it still stands on the sand
        reef(b, rng, [(13, 2, 2), (13, 3, 1), (14, 3, 2), (12, 1, 1), (14, 2, 1)], ('tube', 'brain', 'bubble', 'fire'),
             pickles={(13, 3)}, spread=[(11, 1), (11, 2), (15, 2), (15, 3), (14, 4), (13, 4), (15, 1)], keep=keep)
        reef(b, rng, [(3, 1, 1), (2, 1, 2), (1, 3, 1)], ('horn', 'brain', 'fire'), pickles={(3, 1)},
             spread=[(4, 1), (1, 4), (3, 3), (1, 2)], keep=keep)
        reef(b, rng, [(1, 8, 1), (1, 9, 2), (2, 10, 1)], ('fire', 'bubble'), pickles={(1, 8)}, spread=[(1, 10), (2, 11), (1, 7)], keep=keep)
        # the kelp forest stands clear of the stair skirt round the dome
        for (x, z, h) in ((1, 1, 3), (5, 0, 5), (8, 0, 6), (10, 1, 4), (0, 5, 5), (0, 7, 3), (15, 0, 6),
                          (15, 4, 4), (15, 10, 5)):
            kelp(b, x, z, h)
        for (x, z) in ((1, 1), (5, 0), (8, 0), (0, 5), (0, 7), (2, 1), (6, 1), (15, 10), (15, 11), (14, 15)):
            b.set(x, -1, z, 'gravel')                   # gravel patches in the sand round the kelp
        for _ in range(16):
            x, z = rng.randint(1, 15), rng.randint(1, 15)
            if b.get(x, 0, z) is None and (x, 1, z) not in dry and keep(x, z) and not (13 <= x and 5 <= z <= 9):
                b.set(x, 0, z, 'seagrass', 'cross_plant')
        # inside: a lectern, storage, plants and a rug (few kinds of block: this floor layer also
        # holds the coral garden, and the plan only has 24 letters)
        b.set(11, 1, 6, 'barrel'); b.set(11, 1, 8, 'lectern', 'lectern', f='W', book=True)
        b.set(3, 1, 7, 'barrel'); b.set(3, 1, 8, 'barrel')
        b.set(9, 1, 3, 'flower_pot', 'pot', plant='cornflower'); b.set(10, 1, 10, 'flower_pot', 'pot', plant='cornflower')
        b.set(4, 1, 10, 'flower_pot', 'pot', plant='cornflower')
        for x in (6, 7, 8):
            for z in (6, 7, 8):
                if (x, z) != (7, 7): b.set(x, 1, z, 'light_blue_carpet', 'carpet')

    # ---- Legend: a glass tunnel to a second dome, and a conduit ring
    dry3 = set()
    with b.tier(3):
        C2 = 19
        foot2, d2, top2, shell2 = dome(b, C2, CZ, SMALL_DOME, ribs=4, portholes=False, floor='moss_block', base='glass')
        dry3 |= d2
        skirt(b, foot2, C2, CZ)
        # tunnel from x 13 to 15 at z 7: glass sides, a lit ring in the middle
        for x in range(12, 17):
            b.set(x, 0, 6, 'dark_prismarine'); b.set(x, 0, 7, 'prismarine_bricks'); b.set(x, 0, 8, 'dark_prismarine')
        for x in (13, 14, 15):
            ring = x == 14
            for y in (1, 2):
                b.set(x, y, 6, 'prismarine_bricks' if ring else 'glass'); b.set(x, y, 8, 'prismarine_bricks' if ring else 'glass')
            b.set(x, 3, 7, 'sea_lantern' if ring else 'glass')
            b.set(x, 3, 6, 'prismarine_bricks', 'slab'); b.set(x, 3, 8, 'prismarine_bricks', 'slab')
        for x in range(12, 17):
            for y in (1, 2):
                if b.get(x, y, 7) is not None: b.set(x, y, 7, None)
                dry3.add((x, y, 7))
        dry3 -= set(anchor(b, shell2, d2, lambda p: 'dark_prismarine' if p[0] == C2 or p[2] == CZ else 'glass'))
        # the small dome is a garden room on a moss floor: azalea bushes and pink petals only, because
        # this layer already holds the coral garden and the plan has just 24 letters
        for (x, z) in ((C2 - 1, 5), (C2 + 1, 5), (C2 + 1, 9)):
            b.set(x, 1, z, 'flowering_azalea', 'bush')
        for (x, z) in ((C2 + 2, 6), (C2 - 2, 8), (C2, 9), (C2 - 2, 6), (C2 + 2, 8), (C2, 5)):
            b.set(x, 1, z, 'pink_petals', 'plant')
        b.set(C2 + 2, 1, 7, 'barrel'); b.set(C2 - 1, 1, 9, 'barrel')
        # conduit crown: four legs hold a ring of 16 prismarine blocks above the small dome,
        # with the conduit in the middle of the water
        for (x, z) in ((C2 - 2, CZ - 2), (C2 + 2, CZ - 2), (C2 - 2, CZ + 2), (C2 + 2, CZ + 2)):
            b.fill(x, 1, z, x, 2, z, 'dark_prismarine'); b.fill(x, 3, z, x, 5, z, 'prismarine', 'wall')
        for x in range(C2 - 2, C2 + 3):
            for z in range(CZ - 2, CZ + 3):
                if x in (C2 - 2, C2 + 2) or z in (CZ - 2, CZ + 2):
                    corner = x in (C2 - 2, C2 + 2) and z in (CZ - 2, CZ + 2)
                    b.set(x, 6, z, 'sea_lantern' if corner else 'prismarine_bricks')
        b.set(C2, 6, CZ, 'conduit', 'conduit')
        # more reef round the second dome
        keep3 = lambda x, z: 1 <= z <= 15 and x <= 22
        edge3 = lambda x, z: 1 <= z <= 16 and x <= 23
        reef(b, rng, [(17, 14, 1), (18, 14, 2), (19, 15, 1), (18, 15, 1), (20, 14, 1), (21, 13, 1), (17, 16, 1), (18, 16, 2),
                      (19, 16, 1), (20, 16, 1), (21, 16, 1), (22, 15, 1), (23, 14, 2), (23, 13, 1), (23, 15, 1), (22, 16, 1), (23, 11, 1)],
             ('horn', 'brain', 'tube', 'fire', 'bubble'), pickles={(19, 15), (21, 13), (23, 13)},
             spread=[(16, 15), (17, 15), (20, 15), (21, 14), (22, 13), (22, 14), (21, 15), (23, 12), (16, 16), (22, 12), (23, 10)], keep=edge3)
        reef(b, rng, [(21, 2, 1), (22, 3, 2), (20, 2, 1), (17, 2, 1)], ('tube', 'fire', 'horn'), pickles={(20, 2)},
             spread=[(19, 2), (22, 2), (21, 3), (18, 2), (22, 4)], keep=keep3)
        for (x, z, h) in ((22, 1, 6), (22, 10, 4), (17, 1, 5), (16, 1, 3), (23, 5, 5)):
            kelp(b, x, z, h)

    regions = [(1, 1, 13, 1, 15, top), (2, 0, 16, 0, 16, top), (3, 0, 23, 0, 16, top)]
    return flood(b, regions, lambda p, t: p in dry or (t >= 3 and p in dry3))


# ================================================================ Secret Spy Base

def tudor_walls(b, x0, z0, x1, z1, skip=()):
    """Cottage walls, y 1 to 3: spruce log corners, a cobblestone bottom row, birch planks above."""
    for y in (1, 2, 3):
        for x in range(x0, x1 + 1):
            for z in range(z0, z1 + 1):
                if x not in (x0, x1) and z not in (z0, z1): continue
                if (x, z) in skip: continue
                corner = x in (x0, x1) and z in (z0, z1)
                b.set(x, y, z, 'spruce_log' if corner else ('cobblestone' if y == 1 else 'birch_planks'))


def beams(b, x0, z0, x1, z1, y=4):
    for x in range(x0, x1 + 1):
        b.set(x, y, z0, 'spruce_log', a='x'); b.set(x, y, z1, 'spruce_log', a='x')
    for z in range(z0 + 1, z1):
        b.set(x0, y, z, 'spruce_log', a='z'); b.set(x1, y, z, 'spruce_log', a='z')


def window(b, x, y, z, out, shutters=True, box=None):
    """A glass pane window with open trapdoor shutters on the outside (out = the side facing out)."""
    b.set(x, y, z, 'glass', 'pane')
    dx, dz = DIRS[out]
    if shutters:
        for s in (-1, 1):
            sx, sz = (x + s, z + dz) if dz else (x + dx, z + s)
            b.set(sx, y, sz, 'spruce_trapdoor', 'trapdoor', open=True, side=OPP[out])
    if box:
        bx, bz = x + dx, z + dz
        b.set(bx, y - 1, bz, 'moss_block'); b.set(bx, y, bz, box, 'flower')
        b.set(bx + dx, y - 1, bz + dz, 'spruce_trapdoor', 'trapdoor', open=True, side=OPP[out])


def spy_room(b, x0, z0, x1, z1, floor='deepslate_tiles', wall='polished_deepslate', skip=()):
    """A dug-out room: floor at y -3, walls at y -2 and -1, air inside. Its ceiling is whatever
    stands on y 0 above it (a cottage floor or a garden). No floor under the walls: they stand
    on the ground."""
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            edge = x in (x0, x1) or z in (z0, z1)
            if not edge: b.set(x, -3, z, floor)        # the walls stand on the ground itself
            for y in (-2, -1):
                if edge and (x, z) not in skip: b.set(x, y, z, wall)
                elif not edge: b.set(x, y, z, None)


def tree_crown(b, lobes, rng, low):
    """A wide, low crown from leaf lobes [(x, y, z, rx, ry, rz)], oak leaves mixed with the
    Flowering Azalea Leaves of the hedges. low(x, z) is the lowest layer leaves may hang to there.
    Leaves never replace a block that is already there (logs, the deck, lanterns)."""
    cells = set()
    for (cx, cy, cz, rx, ry, rz) in lobes:
        R = int(max(rx, ry, rz)) + 1
        for dx in range(-R, R + 1):
            for dy in range(-R, R + 1):
                for dz in range(-R, R + 1):
                    d = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2
                    if d <= 0.75 or (d <= 1.2 and rng.random() < 0.45): cells.add((cx + dx, cy + dy, cz + dz))
    put = [(x, y, z) for (x, y, z) in sorted(cells) if y >= low(x, z) and b.get(x, y, z) is None]
    near = set(put) | set(b.c)
    for (x, y, z) in put:
        k = 'azalea_leaves' if rng.random() < 0.3 else 'oak_leaves'
        if any((x + d[0], y + d[1], z + d[2]) in near for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))):
            b.set(x, y, z, k)                   # a leaf with nothing beside it would float on its own


def rake_trim(b, cells, mat='spruce_planks'):
    """Swap the roof blocks at the gable ends for wood, so the roof gets a neat wooden edge."""
    for (x, y, z) in cells:
        v = b.get(x, y, z)
        if v and v['b'] == 'deepslate_tiles':
            kw = {k: w for k, w in v.items() if k not in ('b', 's', 'tier')}
            b.set(x, y, z, mat, v['s'], **kw)


def spy_base():
    b = Build('Secret Spy Base'); rng = random.Random(10)
    # ---- Starter: a little cottage with a trapdoor in the floor and a hidden room under it
    X0, Z0, X1, Z1 = 6, 3, 12, 7                      # cottage walls
    b.fill(X0, 0, Z0, X1, 0, Z1, 'cobblestone')
    b.fill(X0 + 1, 0, Z0 + 1, X1 - 1, 0, Z1 - 1, 'spruce_planks')
    spy_room(b, X0, Z0, X1, Z1)
    tudor_walls(b, X0, Z0, X1, Z1)
    gable(b, X0, X1, Z0, Z1, 4, 'deepslate_tiles', o=1, gable_mat='birch_planks', axis='x')
    rake_trim(b, [(x, y, z) for x in (X0 - 1, X1 + 1) for y in range(4, 8) for z in range(Z0 - 1, Z1 + 2)])
    beams(b, X0, Z0, X1, Z1)
    for x in (8, 10):                                 # log posts beside the front door
        b.fill(x, 1, Z1, x, 3, Z1, 'spruce_log')
    door(b, 9, 1, Z1, 'spruce_door', 'S')
    b.set(9, 3, Z1 + 1, 'lantern', 'lantern', hang=True)
    window(b, 7, 2, Z1, 'S', shutters=False, box='poppy'); window(b, 11, 2, Z1, 'S', shutters=False, box='cornflower')
    window(b, 8, 2, Z0, 'N', shutters=False); window(b, 10, 2, Z0, 'N', shutters=False)
    window(b, X1, 2, 5, 'E'); window(b, X0, 2, 5, 'W')
    window(b, X1, 5, 5, 'E', shutters=False)
    # inside the cottage: nothing to see here
    b.set(7, 1, 4, 'red_bed', 'bed', part='head', f='N'); b.set(7, 1, 5, 'red_bed', 'bed', part='foot', f='N')
    b.set(10, 1, 6, 'crafting_table'); b.set(9, 1, 4, 'furnace', f='S')
    b.set(11, 0, 4, 'spruce_trapdoor', 'trapdoor', h='top')         # the secret way down
    # the hidden room: a ladder down, two lamps on a lever, a desk and a map table
    for y in (-2, -1): b.set(11, y, 4, 'ladder', 'ladder', side='N')
    b.set(8, -1, Z0, 'lit_redstone_lamp'); b.set(10, -1, Z0, 'lit_redstone_lamp')
    b.set(9, -1, Z0 + 1, 'lever', 'lever', side='N')
    b.set(9, -2, 5, 'spruce_planks', 'stairs', f='S')
    b.set(8, -2, 4, 'cartography_table'); b.set(9, -2, 4, 'dark_oak_planks', 'slab', h='top'); b.set(10, -2, 4, 'dark_oak_planks', 'slab', h='top')
    b.set(7, -2, 6, 'chest', 'chest'); b.set(7, -2, 5, 'barrel'); b.set(10, -2, 6, 'lectern', 'lectern', f='N', book=True)
    b.set(9, -2, 6, 'gray_carpet', 'carpet'); b.set(8, -2, 6, 'gray_carpet', 'carpet')
    # a few flowers
    for x, z, f in ((6, 8, 'dandelion'), (12, 8, 'oxeye_daisy'), (13, 7, 'poppy'), (13, 3, 'cornflower'), (5, 4, 'allium')):
        b.set(x, 0, z, f, 'flower')
    for z in (8, 9, 10): b.set(9, -1, z, 'dirt_path')

    # ---- Pro: the west wing with the bookcase door, the spy HQ, the armory and the periscope
    with b.tier(2):
        b.set(5, 0, 4, None); b.set(5, 2, 4, None); b.set(5, 2, 6, None)   # the flower and shutters on the west side go
        W0, WZ0, W1, WZ1 = 0, 1, 6, 10              # wing walls
        b.fill(W0, 0, WZ0, W1, 0, WZ1, 'cobblestone')
        b.fill(W0 + 1, 0, WZ0 + 1, W1 - 1, 0, WZ1 - 1, 'spruce_planks')
        spy_room(b, W0, WZ0, W1, WZ1, skip={(6, z) for z in range(3, 8)})
        tudor_walls(b, W0, WZ0, W1, WZ1, skip={(6, z) for z in range(3, 8)})
        for y in range(4, 8):                       # the old west gable and eave give way to the wing
            for z in range(2, 9):
                for x in (5, 6):
                    if b.get(x, y, z) is not None: b.set(x, y, z, None)
        gable(b, W0, W1, WZ0, WZ1, 4, 'deepslate_tiles', o=1, gable_mat='birch_planks', axis='z')
        rake_trim(b, [(x, y, z) for z in (WZ0 - 1, WZ1 + 1) for y in range(4, 9) for x in range(W0 - 1, W1 + 2)])
        beams(b, W0, WZ0, W1, WZ1)
        # where the two roofs cross: put back the cottage roof above the wing's slope, and its top beams
        b.set(6, 6, 4, 'deepslate_tiles', 'stairs', f='S'); b.set(6, 6, 6, 'deepslate_tiles', 'stairs', f='N')
        b.set(6, 7, 5, 'deepslate_tiles', 'slab'); b.set(5, 7, 5, 'deepslate_tiles', 'slab')
        for z in (3, 7): b.set(7, 4, z, 'spruce_log', a='x')
        for z in (4, 5, 6): b.set(7, 4, z, None)                       # no eave stairs inside the attic
        b.set(6, 1, 5, None); b.set(6, 2, 5, None)                     # doorway into the first room
        window(b, 2, 2, WZ1, 'S', shutters=False, box='allium'); window(b, 4, 2, WZ1, 'S', shutters=False, box='poppy')
        window(b, 3, 5, WZ1, 'S', shutters=False); window(b, 3, 6, WZ1, 'S', shutters=False)
        window(b, 6, 2, 9, 'E', shutters=False); window(b, 5, 2, WZ0, 'N', shutters=False)
        # the bookcase with the hidden 2 by 2 piston door (the Redstone Workshop door, turned to face east)
        # a bookcase 3 high, with a plank lintel over the doorway, a crown on top and a lid behind it,
        # so no redstone shows from the library
        for z in (2, 9): b.fill(3, 1, z, 3, 3, z, 'spruce_log')
        for z in (3, 4, 7, 8): b.fill(3, 1, z, 3, 3, z, 'bookshelf')
        for z in (5, 6): b.set(3, 3, z, 'spruce_planks')
        for z in range(2, 10):
            b.set(3, 4, z, 'spruce_planks', 'stairs', f='W', h='top')
            for x in (1, 2): b.set(x, 5, z, 'spruce_planks', 'slab')
        b.set(2, 1, 2, 'spruce_planks'); b.set(2, 1, 9, 'spruce_planks'); b.set(2, 2, 9, 'spruce_planks')
        b.fill(2, 3, 2, 2, 3, 9, 'spruce_planks')
        for y in (1, 2):
            b.set(2, y, 3, 'sticky_piston', 'piston_base', f='S'); b.set(2, y, 4, 'sticky_piston', 'piston_head', f='S')
            b.set(2, y, 8, 'sticky_piston', 'piston_base', f='N'); b.set(2, y, 7, 'sticky_piston', 'piston_head', f='N')
            b.set(2, y, 5, 'bookshelf'); b.set(2, y, 6, 'bookshelf')
        # the switch sits at the north end, by the reading chairs, away from the windows
        b.set(2, 2, 2, 'redstone_torch', 'torch', side='E')
        b.set(4, 2, 2, 'lever', 'lever', side='W')
        for (y, z) in ((1, 2), (1, 3), (1, 4), (2, 4), (3, 5), (3, 6), (1, 7), (2, 7), (1, 8)):
            b.set(1, y, z, 'polished_andesite')
        for (y, z) in ((2, 2), (2, 3), (3, 4), (4, 5), (4, 6), (3, 7), (2, 8)):
            b.set(1, y, z, 'redstone_dust', 'dust')
        for z in (5, 6):                                               # behind the door: ladders down
            for y in (-2, -1, 0): b.set(1, y, z, 'ladder', 'ladder', side='W')
        b.set(5, 1, 2, 'spruce_planks', 'stairs', f='E'); b.set(5, 1, 3, 'spruce_planks', 'stairs', f='E')
        b.set(5, 1, 9, 'barrel'); b.set(5, 1, 8, 'flower_pot', 'pot', plant='cornflower')
        # HQ: a computer wall of lamps and targets, lit by Blocks of Redstone hidden behind it
        screen = [('lit_redstone_lamp', 'target', 'lit_redstone_lamp', 'redstone_lamp', 'lit_redstone_lamp'),
                  ('target', 'lit_redstone_lamp', 'tinted_glass', 'lit_redstone_lamp', 'target')]
        for i, x in enumerate(range(1, 6)):
            for row, y in ((0, -1), (1, -2)):
                k = screen[row][i]; b.set(x, y, WZ0, k)
                if k == 'lit_redstone_lamp':               # hidden in the ground behind or under the lamp
                    if row == 0: b.set(x, -1, WZ0 - 1, 'redstone_block')
                    else: b.set(x, -3, WZ0, 'redstone_block')
        for x in range(W0, W1 + 1): b.set(x, 0, WZ0 - 1, 'azalea_leaves')   # a hedge on top hides them
        for x in (2, 3, 4): b.set(x, -2, 2, 'polished_deepslate', 'slab', h='top')
        b.set(3, -1, 2, 'daylight_detector', 'detector')
        b.set(3, -2, 3, 'spruce_planks', 'stairs', f='S')
        # armory: three shelves on Blocks of Redstone, so they are always powered for quick-swap
        for x in (2, 3, 4):
            b.set(x, -1, WZ1, 'redstone_block'); b.set(x, -1, WZ1 - 1, 'dark_oak_shelf', 'shelf', side='S')
        b.set(1, -2, 9, 'smithing_table'); b.set(5, -2, 9, 'copper_chest', 'chest'); b.set(5, -2, 8, 'grindstone', 'grindstone', f='E')
        b.set(5, -2, 2, 'chest', 'chest'); b.set(1, -2, 2, 'barrel')
        for (x, z) in ((2, 5), (3, 5), (4, 5), (2, 6), (3, 6), (4, 6), (2, 7), (3, 7), (4, 7)):
            b.set(x, -2, z, 'black_carpet', 'carpet')
        b.set(3, -1, 6, 'lantern', 'lantern', hang=True); b.set(3, -1, 8, 'lantern', 'lantern', hang=True)
        b.set(6, -2, 4, None); b.set(6, -1, 4, None)                   # doorway to the first room
        b.set(6, -3, 4, 'deepslate_tiles')                                # with a floor under it
        # periscope: a slim chimney with a ladder inside, from the hidden room to a dark glass lookout
        for y in range(-2, 10):
            b.set(13, y, 5, 'polished_deepslate' if y < 0 else ('mossy_cobblestone' if y % 4 == 1 else 'cobblestone'))
        for y in range(-2, 9):
            if y <= 7: b.set(12, y, 5, 'ladder', 'ladder', side='E')
            else: b.set(12, y, 5, None)
            if y >= 1: b.set(11, y, 5, 'bricks' if y <= 3 else 'cobblestone')
        b.set(11, 0, 5, 'spruce_planks')
        for (x, z) in ((12, 4), (12, 6), (11, 5)):
            b.set(x, 7, z, 'cobblestone'); b.set(x, 8, z, 'tinted_glass'); b.set(x, 9, z, 'cobblestone')
        b.set(12, 9, 5, 'cobblestone'); b.set(12, 10, 5, 'stone_bricks'); b.set(12, 11, 5, 'lightning_rod', 'rod')   # a spy antenna
        for (x, z) in ((12, 4), (12, 6), (11, 5)): b.set(x, 10, z, 'stone_bricks', 'slab')
        b.set(13, 10, 5, 'campfire', 'campfire')
        b.set(13, 2, 4, None); b.set(13, 2, 6, None)                  # the east shutters make way
        # garden: picket fence and gate, the path, flowers, bushes
        for x in range(7, 17):
            if x != 9: b.set(x, 0, 12, 'spruce_planks', 'fence')
        b.set(9, 0, 12, 'spruce_fence_gate', 'gate', a='x')
        for z in range(9, 12): b.set(16, 0, z, 'spruce_planks', 'fence')
        for z in (11, 12): b.set(9, -1, z, 'dirt_path')
        for (x, z) in ((7, 9), (8, 10), (7, 11), (10, 10), (11, 11), (12, 10), (13, 11), (14, 10), (15, 11), (1, 11), (3, 11), (5, 11)):
            b.set(x, 0, z, rng.choice(['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium']), 'flower')
        for (x, z, k) in ((-1, 3, 'azalea'), (-1, 8, 'flowering_azalea'), (7, 1, 'azalea'), (11, 2, 'flowering_azalea'), (15, 9, 'azalea')):
            b.set(x, 0, z, k, 'bush')

    # ---- Legend: an escape tunnel under a garden walk to a hollow tree with a lookout deck
    with b.tier(3):
        T0, TZ0 = 18, 1                                 # trunk 3 by 3, shaft in the middle
        SX, SZ = T0 + 1, TZ0 + 1
        tun = [(7, 3)] + [(x, 2) for x in range(7, SX)]
        for (x, z) in tun:
            b.set(x, -3, z, 'deepslate_tiles')
            for y in (-2, -1): b.set(x, y, z, None)
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, z + dz)
                if q in tun or q == (SX, SZ) or (X0 < q[0] < X1 and Z0 < q[1] < Z1): continue
                for y in (-2, -1):
                    if b.get(q[0], y, q[1]) is None: b.set(q[0], y, q[1], 'polished_deepslate')
        # the roof of the tunnel is a stone garden walk along the back of the house, with a low hedge
        for x in range(7, SX - 1):
            b.set(x, 0, 2, 'mossy_stone_bricks' if x % 3 == 0 else 'stone_bricks', 'slab')
            b.set(x, 0, 1, 'azalea_leaves')
            if x >= 13: b.set(x, 0, 3, 'azalea_leaves')
        for x in range(8, SX - 1, 3): b.set(x, 1, 1, 'azalea_leaves')
        # the tree: a hollow trunk with a ladder up to the deck
        for y in range(-3, 9):
            for x in range(T0, T0 + 3):
                for z in range(TZ0, TZ0 + 3):
                    centre = (x, z) == (SX, SZ)
                    if y < 0:
                        if centre or (x, z) == (SX - 1, SZ): b.set(x, y, z, 'deepslate_tiles' if y == -3 else None)
                        elif y > -3: b.set(x, y, z, 'polished_deepslate')
                    elif centre: continue
                    else: b.set(x, y, z, 'oak_log')
        # tunnel walls at ground level only where something covers them (after the trunk is in)
        for (x, z) in tun:
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, -1, z + dz); v = b.get(*q)
                if v and v['b'] == 'polished_deepslate' and b.get(q[0], 0, q[2]) is None: b.set(*q, None)
        for x in (12, 16): b.set(x, -1, 1, 'sea_lantern')                # always-on lights, under the hedge
        for y in range(-2, 8): b.set(SX, y, SZ, 'ladder', 'ladder', side='N')
        b.set(SX, 7, SZ + 1, None); b.set(SX, 8, SZ + 1, None)            # the way out onto the deck
        b.set(SX, 8, SZ, 'oak_planks', 'slab', h='top')
        for y in range(9, 12): b.set(SX, y, SZ, 'oak_log')
        # roots, and branches that reach out past the leaves: west over the garden walk,
        # south toward you past the deck, and a short one east
        for (x, y, z, a) in ((T0 - 1, 0, SZ, 'x'), (T0 + 3, 0, SZ, 'x'), (SX, 0, TZ0 - 1, 'z'), (SX, 0, TZ0 + 3, 'z'),
                             (T0 - 1, 0, SZ + 1, 'x'), (T0 + 3, 0, SZ - 1, 'x'), (SX + 1, 0, TZ0 + 3, 'z'), (SX - 1, 0, TZ0 - 1, 'z'),
                             (T0 + 3, 1, SZ, 'y'), (SX, 1, TZ0 + 3, 'y'), (T0 - 1, 1, SZ + 1, 'y'),
                             (T0 - 1, 9, SZ, 'x'), (T0 - 2, 9, SZ, 'x'), (T0 - 3, 10, SZ, 'x'), (T0 - 4, 10, SZ, 'x'),
                             (SX, 9, TZ0 + 3, 'z'), (SX, 10, TZ0 + 4, 'z'), (SX + 1, 10, TZ0 + 5, 'z'), (SX + 1, 10, TZ0 + 6, 'z'),
                             (T0 + 3, 9, SZ, 'x'), (T0 + 4, 10, SZ, 'x'), (SX, 10, TZ0 - 1, 'z')):
            b.set(x, y, z, 'oak_log', a=a)
        for (x, z) in ((T0 - 1, TZ0 + 4), (T0 + 4, SZ), (SX + 1, TZ0 + 4), (T0 - 1, TZ0 + 3), (T0 + 3, TZ0 + 3)):
            b.set(x, 0, z, 'moss_carpet', 'carpet')
        # lookout deck at y 6 with a fence rail
        for x in range(T0 - 2, T0 + 5):
            for z in range(TZ0 - 2, TZ0 + 5):
                if T0 <= x <= T0 + 2 and TZ0 <= z <= TZ0 + 2: continue
                b.set(x, 6, z, 'spruce_planks', 'slab', h='top')
                if x in (T0 - 2, T0 + 4) or z in (TZ0 - 2, TZ0 + 4): b.set(x, 7, z, 'spruce_planks', 'fence')
        for (x, z, f) in ((T0 - 1, SZ, 'E'), (T0 + 3, SZ, 'W'), (SX, TZ0 + 3, 'N'), (SX, TZ0 - 1, 'S')):
            b.set(x, 5, z, 'spruce_planks', 'stairs', f=f, h='top')
        b.set(T0 + 4, 8, TZ0 + 4, 'lantern', 'lantern'); b.set(T0 - 2, 8, TZ0 + 4, 'lantern', 'lantern')
        b.set(T0 + 3, 7, TZ0 - 1, 'barrel'); b.set(T0 - 1, 7, TZ0 + 3, 'lectern', 'lectern', f='N', book=True)
        # the crown hangs low round the deck, but leaves 2 blocks of head room over it
        on_deck = lambda x, z: T0 - 2 <= x <= T0 + 4 and TZ0 - 2 <= z <= TZ0 + 4
        tree_crown(b, [(SX, 10, SZ, 4.1, 1.6, 4.1), (SX, 12, SZ, 2.6, 1.2, 2.6),
                       (SX - 2, 11, SZ - 2, 2.0, 1.1, 2.0), (SX + 2, 11, SZ + 1, 2.0, 1.1, 2.0),
                       (T0 - 5, 10, SZ, 1.8, 1.3, 1.8), (SX + 1, 10, TZ0 + 8, 1.8, 1.3, 1.8)],
                   random.Random(4), lambda x, z: 9 if on_deck(x, z) else 8)
        b.set(T0 + 4, 0, TZ0 + 4, 'firefly_bush', 'plant'); b.set(T0 - 2, 0, TZ0 + 3, 'bush', 'bush')
        # a bench and a lamp in the front garden
        b.set(13, 0, 10, 'spruce_planks', 'stairs', f='N'); b.set(14, 0, 10, 'spruce_planks', 'stairs', f='N')
        b.set(12, 0, 10, 'spruce_trapdoor', 'trapdoor', open=True, side='E'); b.set(15, 0, 10, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
        b.fill(15, 0, 8, 15, 1, 8, 'spruce_planks', 'fence'); b.set(15, 2, 8, 'lantern', 'lantern')
    return b


BUILDS = {'reef-base': reef_base, 'spy-base': spy_base}

META = {
    'reef-base': dict(
        title='Glass Reef Base', kind='big', diff=3, mode='Creative',
        pitch='A glass dome on the sea floor with a coral garden.',
        blurb=('Live under the sea in a glass dome lit by Sea Lanterns. Swim out through the airlock '
               'into a coral garden with glowing Sea Pickles. Your nautilus even gets its own parking bay.'),
        tiers=['Starter: a glass dome made of stacked circles, with an airlock and a bed.',
               'Pro: a coral garden, a kelp forest, porch lights and a nautilus parking bay.',
               'Legend: a glass tunnel to a garden dome with a glowing Conduit on top.'],
        teaches=['Domes from stacked circles', 'Building underwater', 'Coral gardens'],
        tips=[('know', 'Coral needs water',
               'Coral only stays alive in water. Out of water, coral blocks turn gray in about 2 seconds. '
               'Coral fans turn gray at once. Keep your coral garden outside the dome.'),
              ('pro', 'Dry out the dome',
               'Build the glass shell first. Then place Sponges inside to soak up the water. '
               'Dry a Wet Sponge in a furnace and use it again.'),
              ('warn', 'Dry the doorway first',
               'In Bedrock, a door placed in water stays full of water. '
               'Soak up the doorway with a Sponge first. Then place the door.'),
              ('know', 'Tame a nautilus',
               'Feed a nautilus pufferfish. Each one has a 1 in 3 chance to tame it. '
               'Put a saddle on it, and your air bar stops going down while you ride.'),
              ('pro', 'Breathe with a Conduit',
               'Put a Conduit in open water. Build a 5 by 5 ring of 16 prismarine blocks around it, '
               'at the same height. Sea Lanterns count. Slabs, stairs and walls do not. '
               'Then you can breathe underwater near it.'),
              ('know', 'Pickles that glow',
               'Sea Pickles glow only underwater. Put up to 4 in one spot. '
               'Four glow as bright as a Sea Lantern.')],
        challenge=('Make it yours: Add a third dome. Or plant a reef with all five kinds of coral. '
                   'Can you light the whole sea floor with Sea Pickles?'),
        dad="Dad's Corner: Building underwater is a team job. One of you lays the glass. The other follows with Sponges to dry it out.",
        needs='1.21.0',
        new_blocks=[],
        palette=['Prismarine Bricks', 'Dark Prismarine', 'Glass', 'Sea Lantern'],
        time=0.45,
        empty=[(1, 1, 13, 3, 3, 3, 'Nautilus bay', 2)],      # the bay comes with Pro
        ground='sand',
        pack_note='Stand on the sea floor in a deep ocean before you load it. On land, the water spills out.',
        order=7,
        sources=['https://minecraft.wiki/w/Coral_Block',
                 'https://minecraft.wiki/w/Sponge',
                 'https://minecraft.wiki/w/Nautilus',
                 'https://www.minecraft.net/en-us/updates/mounts-of-mayhem-drop',
                 'https://minecraft.wiki/w/Conduit',
                 'https://minecraft.wiki/w/Sea_Pickle',
                 'https://minecraft.wiki/w/Coral_Fan',
                 'https://minecraft.wiki/w/Door',
                 'https://minecraft.wiki/w/Sea_Lantern'],
    ),
    'spy-base': dict(
        title='Secret Spy Base', kind='big', diff=3, mode='Creative',
        pitch='A sweet little cottage with a secret spy base underneath.',
        blurb=('From the garden it looks like a cozy cottage. Flip a lever and a bookcase slides open. '
               'Climb down to a hidden base with a computer wall and a quick-swap armory. '
               'The chimney is really a periscope.'),
        tiers=['Starter: a cozy cottage with a trapdoor in the floor and one hidden room.',
               'Pro: a new wing with a sliding bookcase door, a spy HQ and a periscope chimney.',
               'Legend: an escape tunnel under the garden path to a hollow tree with a lookout deck.'],
        teaches=['Hidden piston doors', 'Rooms under the ground', 'Crossing roofs'],
        tips=[('pro', 'How the bookcase slides',
               'A Sticky Piston pulls its block back when its power turns off. '
               'Flip the lever, and four of them pull the bookshelves aside.'),
              ('know', 'Swap your whole hotbar',
               'Three powered shelves in a row join up. Use one, and all 9 items swap with your hotbar at once.'),
              ('pro', 'Power that never stops',
               'A Block of Redstone is always on. Hide one behind a lamp or a shelf to keep it powered.'),
              ('know', 'A dark spy window',
               'Tinted Glass is see-through, but it blocks light. That makes a dark lookout window for spying.')],
        challenge='Make it yours: Move the lever somewhere sneaky. Then add a second secret exit that only you know about.',
        dad="Dad's Corner: Redstone is easier with two. One of you reads the steps out loud while the other builds the bookcase door.",
        needs='1.21.111',
        new_blocks=['Dark Oak Shelf', 'Copper Chest', 'Firefly Bush', 'Bush'],
        palette=['Birch Planks', 'Spruce Log', 'Deepslate Tiles', 'Cobblestone'],
        time=0.4,
        ground='grass_block',
        order=10,
        sources=['https://minecraft.wiki/w/Sticky_Piston',
                 'https://minecraft.wiki/w/Shelf',
                 'https://minecraft.wiki/w/Block_of_Redstone',
                 'https://minecraft.wiki/w/Tinted_Glass'],
    ),
}
