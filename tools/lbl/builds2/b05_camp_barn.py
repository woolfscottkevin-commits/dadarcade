"""Layer by Layer 2: Autumn Ranger Camp and Baby Animal Rescue Barn.

x runs east, z runs south (toward the viewer), y is up. Fronts face south.
"""
import random
from lbl import *


# ---------------------------------------------------------------- small helpers
def poplar_tree(b, x, z, leaves, rng, trunk='poplar_log', shelf=None):
    """An autumn poplar: one trunk with 3 logs showing, topped by a big round canopy.
    Middle layers are 5x5 with the corners cut; `shelf` = (dx, dz) puts a shelf mushroom on the trunk."""
    TOP = 9                                           # canopy y 3..9, trunk inside it up to y 7
    for y in range(0, 8): b.set(x, y, z, trunk, a='y')
    LAYERS = {3: disc(1.2), 4: disc(2.3), 5: disc(2.3), 6: disc(2.3), 7: disc(1.5), 8: disc(1.2), 9: {(0, 0)}}
    for y, cells in LAYERS.items():
        for (dx, dz) in cells:
            rim = max(abs(dx), abs(dz)) == 2 or (abs(dx) == 1 and abs(dz) == 1 and y in (3, 8))
            if rim and rng.random() < 0.22: continue          # nibble the edge so it is not a box
            p = (x + dx, y, z + dz)
            if p not in b.c: b.set(*p, leaves)
    if shelf:
        dx, dz = shelf
        side = {(1, 0): 'W', (-1, 0): 'E', (0, 1): 'N', (0, -1): 'S'}[(dx, dz)]
        b.set(x + dx, 1, z + dz, 'shelf_mushroom', 'shelf_mushroom', side=side)


def scatter(b, cells, rng, p, key, shape='carpet', box=None):
    for (x, z) in cells:
        if box and not (box[0] <= x <= box[1] and box[2] <= z <= box[3]): continue
        if (x, 0, z) in b.c or (x, -1, z) in b.c or (x, 1, z) in b.c: continue
        if rng.random() < p: b.set(x, 0, z, key, shape)


def near(cx, cz, r):
    return [(cx + dx, cz + dz) for (dx, dz) in disc(r)]


# ---------------------------------------------------------------- Autumn Ranger Camp
def ranger_camp():
    b = Build('Autumn Ranger Camp'); rng = random.Random(26)
    PCX, PCZ = 1, 13                                  # the Legend pond: an oval, 45 water cells
    pond = {(x, z) for x in range(PCX - 5, PCX + 6) for z in range(PCZ - 4, PCZ + 5)
            if ((x - PCX) / 4.3) ** 2 + ((z - PCZ) / 3.3) ** 2 <= 1}

    # ================= STARTER: tent, campfire ring, woodpile, sign =================
    TX, TZ0, TZ1 = 14, 9, 13          # tent: x 14..18, z 9..13, open to the south
    canvas, ridge = 'orange_wool', 'white_wool'
    for z in range(TZ0, TZ1 + 1):
        b.set(TX, 0, z, canvas, 'stairs', f='E'); b.set(TX + 4, 0, z, canvas, 'stairs', f='W')
        b.set(TX + 1, 1, z, canvas, 'stairs', f='E'); b.set(TX + 3, 1, z, canvas, 'stairs', f='W')
        b.set(TX + 2, 2, z, ridge, 'slab')
    for x in (TX + 1, TX + 2, TX + 3): b.set(x, 0, TZ0, canvas)
    b.set(TX + 2, 1, TZ0, canvas)
    for x in (TX + 1, TX + 3):                       # two straw beds, feet at the door
        b.set(x, 0, TZ1 - 1, 'straw_bed', 'straw_bed', part='head', f='N')
        b.set(x, 0, TZ1, 'straw_bed', 'straw_bed', part='foot', f='N')
    b.set(TX + 2, 0, TZ0 + 1, 'barrel')
    b.set(TX + 2, 1, TZ0 + 1, 'lantern', 'lantern', hang=True)      # hangs under the ridge slab, over the barrel
    b.set(13, 0, 14, 'poplar_planks', 'fence'); b.set(13, 1, 14, 'lantern', 'lantern')   # light by the tent, clear of the door

    # campfire ring: stones in the ground, log benches, cushions
    CX, CZ = 9, 12
    b.set(CX, 0, CZ, 'campfire', 'campfire'); b.set(CX, -1, CZ, 'hay_block')   # hay under a campfire: taller smoke
    for (dx, dz) in ring(1.5):
        b.set(CX + dx, -1, CZ + dz, rng.choice(['cobblestone', 'cobblestone', 'mossy_cobblestone']))
    for x in range(CX - 1, CX + 2): b.set(x, 0, CZ - 2, 'poplar_log', a='x')
    for z in range(CZ - 1, CZ + 2): b.set(CX - 2, 0, z, 'poplar_log', a='z')
    b.set(CX - 2, 1, CZ, 'brown_wool', 'cushion'); b.set(CX, 1, CZ - 2, 'brown_wool', 'cushion')
    for (dx, dz), col in zip([(2, -1), (2, 0), (2, 1), (1, 2), (0, 2), (-1, 2)],
                             ['red_wool', 'orange_wool', 'yellow_wool', 'red_wool', 'orange_wool', 'yellow_wool']):
        b.set(CX + dx, 0, CZ + dz, col, 'cushion')

    # woodpile between the fire and the tent
    b.set(12, 0, 10, 'poplar_log', a='z'); b.set(13, 0, 10, 'poplar_log', a='z'); b.set(12, 1, 10, 'poplar_log', a='z')

    # signpost where the trail comes in
    b.fill(12, 0, 17, 12, 1, 17, 'poplar_log', a='y'); b.set(12, 2, 17, 'lantern', 'lantern')
    b.set(13, 1, 17, 'poplar_planks', 'hanging_sign', side='W')
    PATH1 = [(8, 15), (9, 15), (10, 15), (11, 15), (12, 14), (12, 15), (13, 15), (14, 15), (15, 15), (16, 15), (17, 15),
             (11, 16), (11, 17)]
    for (x, z) in PATH1: b.set(x, -1, z, 'dirt_path')

    # fallen log with shelf mushrooms, a poplar with a mushroom on its trunk
    for z in range(10, 14): b.set(20, 0, z, 'poplar_log', a='z')
    b.set(21, 0, 11, 'shelf_mushroom', 'shelf_mushroom', side='W', big=True)
    b.set(21, 0, 13, 'shelf_mushroom', 'shelf_mushroom', side='W')
    poplar_tree(b, 20, 7, 'orange_poplar_leaves', rng, shelf=(1, 0))
    # forest floor: coarse dirt patches, brown mushrooms on podzol (mushrooms only stay in daylight on podzol)
    for (x, z) in [(19, 11), (19, 12), (21, 12), (20, 14), (18, 7)]: b.set(x, -1, z, 'coarse_dirt')
    for (x, z) in [(19, 10), (21, 14), (22, 10)]:
        b.set(x, -1, z, 'podzol'); b.set(x, 0, z, 'brown_mushroom', 'mushroom')

    for (x, z, k) in [(19, 9, 'bush'), (19, 14, 'red_shrub'), (6, 13, 'bush'), (6, 11, 'red_shrub'), (13, 12, 'bush'),
                      (18, 15, 'wildflowers'), (12, 16, 'wildflowers'), (11, 9, 'red_shrub'), (6, 15, 'bush')]:
        b.set(x, 0, z, k, 'plant')
    scatter(b, near(20, 7, 2.6), rng, 0.6, 'leaf_litter', box=(6, 21, 5, 16))
    scatter(b, [(x, z) for x in range(6, 22) for z in range(6, 17)], rng, 0.08, 'leaf_litter')

    # ================= PRO: the ranger cabin =================
    with b.tier(2):
        X0, X1, Z0, Z1 = 0, 8, 0, 5
        b.walls(X0, Z0, X1, Z1, 0, 0, 'cobblestone')
        b.fill(X0 + 1, 0, Z0 + 1, X1 - 1, 0, Z1 - 1, 'spruce_planks')
        for y in range(1, 4):
            for x in range(X0, X1 + 1): b.set(x, y, Z0, 'stripped_poplar_log', a='x'); b.set(x, y, Z1, 'stripped_poplar_log', a='x')
            for z in range(Z0, Z1 + 1): b.set(X0, y, z, 'stripped_poplar_log', a='z'); b.set(X1, y, z, 'stripped_poplar_log', a='z')
        for (x, z) in [(X0, Z0), (4, Z0), (X1, Z0), (X0, Z1), (3, Z1), (5, Z1), (X1, Z1)]:
            b.fill(x, 1, z, x, 3, z, 'poplar_log', a='y')
        PZ = Z1 + 3                                   # porch front; its roof goes on first so the main roof wins
        gable(b, 3, 5, Z1, PZ, 4, 'spruce_planks', o=1, gable_mat='poplar_planks', axis='z')
        gable(b, X0, X1, Z0, Z1, 4, 'spruce_planks', o=1, gable_mat='poplar_planks', axis='x')
        for x in range(X0, X1 + 1): b.set(x, 4, Z0, 'poplar_log', a='x'); b.set(x, 4, Z1, 'poplar_log', a='x')
        for z in range(Z0 + 1, Z1): b.set(X0, 4, z, 'poplar_log', a='z'); b.set(X1, 4, z, 'poplar_log', a='z')
        # door and windows
        door(b, 4, 1, Z1, 'poplar_door', 'S')
        b.set(4, 3, Z1, 'poplar_log', a='x')
        for x in (1, 2, 6, 7):
            b.set(x, 2, Z1, 'glass', 'pane'); b.set(x, 2, Z0, 'glass', 'pane')
        for z in (2, 3): b.set(X1, 5, z, 'glass', 'pane')    # attic window; the west wall has the chimney, the east the woodpile
        for z in (1, 4): b.set(X1 + 1, 5, z, 'poplar_trapdoor', 'trapdoor', open=True, side='W')     # attic shutters
        for x in (0, 3, 5, 8): b.set(x, 2, Z0 - 1, 'poplar_trapdoor', 'trapdoor', open=True, side='S')  # back shutters
        # porch with its own little roof
        b.fill(3, 0, Z1 + 1, 5, 0, PZ, 'spruce_planks', 'slab', h='top')
        for x in (3, 5): b.fill(x, 0, PZ, x, 3, PZ, 'poplar_log', a='y')
        for x in (3, 4, 5): b.set(x, 4, PZ, 'stripped_poplar_log', a='x')
        for z in (Z1 + 1, Z1 + 2): b.set(3, 1, z, 'poplar_planks', 'fence'); b.set(5, 1, z, 'poplar_planks', 'fence')
        b.set(4, 0, PZ + 1, 'poplar_planks', 'stairs', f='N')
        b.set(4, 3, PZ, 'poplar_planks', 'hanging_sign', a='x')
        b.set(3, 2, Z1 + 1, 'poplar_shelf', 'shelf', side='N'); b.set(5, 2, Z1 + 1, 'poplar_shelf', 'shelf', side='N')
        b.set(4, 3, Z1 + 1, 'lantern', 'lantern', hang=True)
        # flower beds in front
        for (x, k) in [(1, 'bush'), (2, 'wildflowers'), (6, 'red_shrub'), (7, 'bush')]: b.set(x, 0, Z1 + 1, k, 'plant')
        # chimney on the west end
        b.fill(X0 - 1, 0, 2, X0 - 1, 8, 3, 'cobblestone')
        b.set(X0 - 1, 9, 2, 'cobblestone', 'wall'); b.set(X0 - 1, 9, 3, 'cobblestone', 'wall')
        # firewood store on the east wall, under a little roof
        for z in (2, 3):
            for y in (0, 1, 2): b.set(X1 + 1, y, z, 'poplar_log', a='x')
        for z in (1, 4): b.fill(X1 + 1, 0, z, X1 + 1, 2, z, 'poplar_planks', 'fence')
        for z in range(1, 5): b.set(X1 + 1, 3, z, 'spruce_planks', 'slab')
        # inside: a campfire hearth by the chimney wall (campfires do not spread fire)
        b.set(1, 1, 2, 'campfire', 'campfire')
        b.set(1, 1, 1, 'poplar_shelf', 'shelf', side='N'); b.set(2, 1, 1, 'poplar_shelf', 'shelf', side='N')
        b.set(7, 1, 1, 'brown_bed', 'bed', part='head', f='N'); b.set(7, 1, 2, 'brown_bed', 'bed', part='foot', f='N')
        b.set(6, 1, 1, 'chest', 'chest')
        b.set(1, 1, 4, 'cartography_table'); b.set(1, 1, 3, 'crafting_table')
        b.set(4, 1, 2, 'poplar_planks', 'fence'); b.set(4, 2, 2, 'oak_pressure_plate', 'plate')
        b.set(3, 1, 2, 'red_wool', 'cushion'); b.set(5, 1, 2, 'yellow_wool', 'cushion')
        b.set(4, 4, 3, 'lantern', 'lantern', hang=True); b.fill(4, 5, 3, 4, 6, 3, 'chain', 'chain')
        b.set(7, 1, 4, 'barrel')
        # trees, paths, lantern post, leaf litter
        poplar_tree(b, -3, 9, 'red_poplar_leaves', rng)
        poplar_tree(b, -3, 17, 'yellow_poplar_leaves', rng)
        for (x, z) in [(4, 10), (5, 10), (6, 10), (7, 10), (7, 9)]: b.set(x, -1, z, 'dirt_path')
        b.set(6, 0, 9, 'poplar_planks', 'fence'); b.set(6, 1, 9, 'lantern', 'lantern')
        for (x, z, k) in [(11, 1, 'red_shrub'), (12, 5, 'bush'), (19, 2, 'red_shrub'), (20, 0, 'bush'), (10, 7, 'red_shrub')]:
            b.set(x, 0, z, k, 'plant')                    # red shrubs: the dappled forest floor
        for (x, z) in [(-2, 10), (-4, 8), (-2, 16), (-4, 18)]: b.set(x, -1, z, 'coarse_dirt')
        scatter(b, [c for c in near(-3, 9, 2.6) + near(-3, 17, 2.6) if c not in pond], rng, 0.6, 'leaf_litter', box=(-5, 21, -1, 19))
        scatter(b, [(x, z) for x in range(-1, 22) for z in range(-1, 17) if (x, z) not in pond], rng, 0.05, 'leaf_litter')

    # ================= LEGEND: lookout tower, pond and canoe dock =================
    with b.tier(3):
        LX0, LX1, LZ0, LZ1 = 14, 17, 0, 3
        DY = 8                                                # deck height: above the cabin ridge and the trees
        posts = [(x, z) for x in (LX0, LX1) for z in (LZ0, LZ1)]
        for (x, z) in posts: b.fill(x, 0, z, x, DY + 4, z, 'poplar_log', a='y')   # up into the roof, so it rests on them
        for yb in (2, 5):
            for x in range(LX0 + 1, LX1):
                for z in (LZ0, LZ1): b.set(x, yb, z, 'poplar_planks', 'fence')
            for z in range(LZ0 + 1, LZ1):
                for x in (LX0, LX1): b.set(x, yb, z, 'poplar_planks', 'fence')
        for x in range(LX0 - 1, LX1 + 2):
            for z in range(LZ0 - 1, LZ1 + 2):
                if (x, z) not in posts: b.set(x, DY, z, 'poplar_planks', 'slab', h='top')
        for y in range(0, DY + 1): b.set(LX0, y, LZ1 + 1, 'ladder', 'ladder', side='N')
        for x in range(LX0 - 1, LX1 + 2):
            for z in range(LZ0 - 1, LZ1 + 2):
                if (x in (LX0 - 1, LX1 + 1) or z in (LZ0 - 1, LZ1 + 1)) and (x, DY + 1, z) not in b.c and (x, z) != (LX0, LZ1 + 1):
                    b.set(x, DY + 1, z, 'poplar_planks', 'fence')
        hip(b, LX0, LX1, LZ0, LZ1, DY + 4, 'spruce_planks', o=1)
        b.set(15, DY + 1, 1, 'cartography_table'); b.set(16, DY + 1, 1, 'barrel')
        b.set(16, DY + 3, 2, 'lantern', 'lantern', hang=True); b.fill(16, DY + 4, 2, 16, DY + 5, 2, 'chain', 'chain')
        # pond
        for (x, z) in pond:
            b.set(x, 0, z, None); b.set(x, -1, z, 'water')
            if ((x - PCX) / 3.0) ** 2 + ((z - PCZ) / 2.0) ** 2 <= 1: b.set(x, -2, z, 'water')
        for (x, z) in [(PCX - 4, PCZ - 3), (PCX - 5, PCZ + 1), (PCX + 4, PCZ + 3), (PCX - 1, PCZ + 4), (PCX, PCZ + 4)]:
            b.set(x, -1, z, 'sand')
        b.set(PCX - 5, 0, PCZ - 1, 'sugar_cane', 'plant'); b.set(PCX - 5, 1, PCZ - 1, 'sugar_cane', 'plant')
        b.set(PCX - 3, 0, PCZ + 3, 'sugar_cane', 'plant')
        b.set(PCX + 4, 0, PCZ + 2, 'firefly_bush', 'plant'); b.set(PCX - 5, 0, PCZ - 3, 'firefly_bush', 'plant')
        # short dock out from the north shore (by the porch path), posts at the end
        for z in range(PCZ - 3, PCZ):
            b.set(PCX + 2, 0, z, 'spruce_planks', 'slab'); b.set(PCX + 3, 0, z, 'spruce_planks', 'slab')
        for x in (PCX + 2, PCX + 3): b.set(x, -1, PCZ, 'poplar_log', a='y'); b.set(x, 0, PCZ, 'poplar_planks', 'fence')
        b.set(PCX + 3, 1, PCZ, 'lantern', 'lantern')
        # canoe tied up beside the dock, in open water. Poplar, like the dock posts: this layer already
        # has 24 kinds of block, the most the plan has letters for
        b.set(PCX, 0, PCZ - 2, 'poplar_planks', 'stairs', f='N'); b.set(PCX, 0, PCZ - 1, 'poplar_planks', 'slab')
        b.set(PCX, 0, PCZ, 'poplar_planks', 'slab'); b.set(PCX, 0, PCZ + 1, 'poplar_planks', 'stairs', f='S')
        # lantern post at the foot of the lookout
        b.set(19, 0, 5, 'poplar_planks', 'fence'); b.set(19, 1, 5, 'lantern', 'lantern')
    return b


# ---------------------------------------------------------------- Baby Animal Rescue Barn
GAMBREL = [[(0, 'stairs')], [(1, 'full'), (2, 'stairs')], [(3, 'stairs')]]


def gambrel_z(b, x0, x1, z0, z1, yb, mat, gmat, o=1):
    """Barn roof with the ridge running north-south: a steep lower slope, then a gentle top.
    x0..x1, z0..z1 is the wall footprint. The two end walls are filled with `gmat`."""
    xL, xR = x0 - 1, x1 + 1
    low = {}
    for z in range(z0 - o, z1 + o + 1):
        for i, cells in enumerate(GAMBREL):
            for (dy, s) in cells:
                for x, f in ((xL + i, 'E'), (xR - i, 'W')):
                    if s == 'stairs': b.set(x, yb + dy, z, mat, 'stairs', f=f)
                    else: b.set(x, yb + dy, z, mat)
                    low[x] = min(low.get(x, 99), yb + dy)
        for x in range(xL + len(GAMBREL), xR - len(GAMBREL) + 1):
            b.set(x, yb + 4, z, mat, 'slab'); low[x] = yb + 4
    for x in range(x0, x1 + 1):
        for z in (z0, z1):
            for y in range(yb, low[x]): b.set(x, y, z, gmat)


def animal_barn(RED='mangrove_planks', WHITE='white_concrete', ROOF='gray_concrete', BASE='cobblestone', SILO=('red_terracotta', 'white_concrete')):
    b = Build('Baby Animal Rescue Barn'); rng = random.Random(6)
    FENCE, GATE = 'birch_planks', 'birch_fence_gate'

    # ================= STARTER: a small red barn =================
    X0, X1, Z0, Z1 = 6, 12, 4, 9          # walls; the big doors face south (z = 9)
    b.walls(X0, Z0, X1, Z1, 0, 0, BASE)
    b.walls(X0, Z0, X1, Z1, 1, 4, RED)
    for x in (X0, X1):
        for z in (Z0, Z1): b.fill(x, 1, z, x, 4, z, WHITE)
    gambrel_z(b, X0, X1, Z0, Z1, 5, ROOF, RED)
    for x in range(X0, X1 + 1): b.set(x, 4, Z0, WHITE)
    for z in range(Z0, Z1 + 1): b.set(X0, 4, z, WHITE); b.set(X1, 4, z, WHITE)
    for (p, v) in list(b.c.items()):
        if p[2] in (Z0 - 1, Z1 + 1) and v['b'] == ROOF:
            b.set(*p, WHITE, v['s'], **{k: v[k] for k in ('f', 'h') if k in v})
    # big doorway with a white beam over it, and the sliding doors pushed open
    for x in (8, 9, 10):
        for y in (0, 1, 2, 3): b.set(x, y, Z1, None)
    for x in (7, 8, 9, 10, 11): b.set(x, 4, Z1, WHITE)
    for x in (7, 11):
        for y in (0, 1, 2, 3): b.set(x, y, Z1 + 1, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
    # hay loft door, shutters and the little hood with a lantern
    b.set(9, 6, Z1, None); b.set(9, 7, Z1, None); b.set(9, 8, Z1, WHITE)
    b.set(8, 6, Z1 + 1, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
    b.set(10, 6, Z1 + 1, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
    for x in (8, 9, 10): b.set(x, 9, Z1 + 2, ROOF, 'slab')
    b.set(9, 8, Z1 + 2, 'chain', 'chain'); b.set(9, 7, Z1 + 2, 'lantern', 'lantern', hang=True)
    # side windows
    for z in (6, 7):
        b.set(X1, 2, z, 'glass', 'pane'); b.set(X0, 2, z, 'glass', 'pane')
    for x in (8, 10): b.set(x, 2, Z0, 'glass', 'pane')
    # inside: two little stalls at the back, hay between them
    for x in (7, 8, 10, 11): b.set(x, 0, 7, FENCE, 'fence')
    b.set(8, 0, 7, GATE, 'gate', a='x'); b.set(10, 0, 7, GATE, 'gate', a='x')
    b.set(9, 0, 5, 'hay_block'); b.set(9, 1, 5, 'hay_block')
    b.set(9, 0, 6, 'hay_block'); b.set(9, 1, 6, 'hay_block')     # 2 high, so a calf cannot hop over
    b.set(9, 0, 7, FENCE, 'fence')
    # front yard: path, lanterns, flowers
    for z in (10, 11, 12): b.set(9, -1, z, 'dirt_path')
    b.set(8, 0, 10, 'lantern', 'lantern'); b.set(10, 0, 10, 'lantern', 'lantern')
    for (x, z, k) in [(5, 9, 'dandelion'), (5, 8, 'poppy'), (13, 12, 'oxeye_daisy')]:
        b.set(x, 0, z, k, 'flower')

    # ================= PRO: stall wing, paddock, planters, loft =================
    with b.tier(2):
        # stall wing (lean-to) on the east side, with its own gentle roof under the barn eaves
        LX, LZ0, LZ1 = X1 + 1, Z0 - 1, Z1 + 1      # x 13..15 (front posts at x = 15), z 3..10
        for z in range(LZ0 - 1, LZ1 + 2):
            b.set(LX, 3, z, ROOF, 'stairs', f='W'); b.set(LX + 1, 3, z, ROOF, 'slab')
            b.set(LX + 2, 2, z, ROOF, 'slab', h='top'); b.set(LX + 3, 2, z, ROOF, 'slab')
        for z in (LZ0, LZ1):
            b.set(LX, 0, z, BASE); b.set(LX + 1, 0, z, BASE)
            b.fill(LX, 1, z, LX, 2, z, RED); b.fill(LX + 1, 1, z, LX + 1, 2, z, RED)
            b.fill(LX + 2, 0, z, LX + 2, 1, z, WHITE)
        b.set(LX + 1, 1, LZ1, 'glass', 'pane')
        for x in (LX, LX + 1, LX + 2):
            for z in range(LZ0 + 1, LZ1): b.set(x, -1, z, 'coarse_dirt')
        b.fill(LX + 2, 0, 6, LX + 2, 1, 6, WHITE)          # middle post
        b.set(LX, 0, 6, 'hay_block'); b.set(LX, 1, 6, 'hay_block'); b.set(LX + 1, 0, 6, FENCE, 'fence')   # 2 high, like the barn stalls
        b.set(LX + 2, 0, 4, FENCE, 'fence'); b.set(LX + 2, 0, 5, GATE, 'gate', a='z')
        b.set(LX + 2, 0, 7, FENCE, 'fence'); b.set(LX + 2, 0, 8, GATE, 'gate', a='z'); b.set(LX + 2, 0, 9, FENCE, 'fence')
        b.set(LX + 3, 1, 6, 'birch_planks', 'hanging_sign', side='W')
        # paddock with white fences
        PX0, PX1, PZ0, PZ1 = LX + 2, LX + 8, Z0 - 2, Z1 + 3
        for x in range(PX0, PX1 + 1): b.set(x, 0, PZ0, FENCE, 'fence'); b.set(x, 0, PZ1, FENCE, 'fence')
        for z in range(PZ0, PZ1 + 1): b.set(PX1, 0, z, FENCE, 'fence')
        for z in list(range(PZ0, LZ0)) + list(range(LZ1 + 1, PZ1 + 1)): b.set(PX0, 0, z, FENCE, 'fence')
        b.set(PX0 + 2, 0, PZ1, GATE, 'gate', a='x')
        b.set(PX0, 1, PZ1, 'lantern', 'lantern'); b.set(PX1, 1, PZ1, 'lantern', 'lantern')
        # water trough and hay feeder, one block in from the fence so nobody can climb out
        b.set(PX1 - 3, 0, PZ1 - 2, 'cauldron', 'cauldron'); b.set(PX1 - 2, 0, PZ1 - 2, 'cauldron', 'cauldron')
        b.set(PX0 + 2, 0, PZ1 - 2, 'hay_block'); b.set(PX0 + 2, 1, PZ1 - 2, 'hay_block')
        # golden dandelion planters by the doors
        for x in (X0, X0 + 1, X1 - 1, X1):
            b.set(x, 0, Z1 + 2, 'dirt'); b.set(x, 0, Z1 + 3, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
            b.set(x, 1, Z1 + 2, 'golden_dandelion', 'plant')
        for (x, side) in ((X0 - 1, 'E'), (X0 + 2, 'W'), (X1 - 2, 'E'), (X1 + 1, 'W')):
            b.set(x, 0, Z1 + 2, 'spruce_trapdoor', 'trapdoor', open=True, side=side)
        b.set(9, 5, Z1 + 1, 'spruce_planks', 'hanging_sign', side='N')
        # window boxes with flower pots, and trapdoor shutters
        for z in (6, 7):
            b.set(X0 - 1, 1, z, 'spruce_planks', 'stairs', f='E', h='top'); b.set(X0 - 1, 2, z, 'flower_pot', 'pot', plant='poppy')
        for z in (5, 8): b.set(X0 - 1, 2, z, 'spruce_trapdoor', 'trapdoor', open=True, side='E')
        for x in (8, 10):
            b.set(x, 1, Z0 - 1, 'spruce_planks', 'stairs', f='S', h='top'); b.set(x, 2, Z0 - 1, 'flower_pot', 'pot', plant='dandelion')
        # a name sign over every stall
        for (x, z, side) in [(7, 5, 'N'), (11, 5, 'N'), (LX, 4, 'N'), (LX, 9, 'S')]:
            b.set(x, 2, z, 'spruce_planks', 'hanging_sign', side=side)
        # soft coarse dirt floors in the barn stalls, like the stall wing
        for x in (7, 8, 10, 11):
            for z in (5, 6): b.set(x, -1, z, 'coarse_dirt')
        # hay loft inside
        for x in range(X0 + 1, X1):
            for z in range(Z0 + 1, Z1):
                if (x, z) != (X0 + 1, Z1 - 1): b.set(x, 5, z, 'spruce_planks', 'slab')   # (7, 8) is the ladder hatch
        for (x, z) in [(7, 5), (8, 5), (10, 5), (11, 5), (8, 6), (11, 6)]: b.set(x, 6, z, 'hay_block')
        b.set(11, 7, 5, 'hay_block')
        b.set(X0 + 1, 0, Z1 - 1, 'hay_block')                            # a soft landing under the hatch
        for y in range(1, 5): b.set(X0 + 1, y, Z1 - 1, 'ladder', 'ladder', side='W')
        b.set(9, 6, Z0, None); b.set(9, 7, Z0, None); b.set(9, 8, Z0, WHITE)  # back loft door with shutters
        b.set(8, 6, Z0 - 1, 'spruce_trapdoor', 'trapdoor', open=True, side='S')
        b.set(10, 6, Z0 - 1, 'spruce_trapdoor', 'trapdoor', open=True, side='S')
        b.set(9, 4, 7, 'lantern', 'lantern', hang=True)
        # a treat shelf on the stall wing
        b.set(LX, 1, LZ1 + 1, 'spruce_shelf', 'shelf', side='N')
        # path to the paddock gate, flowers
        for (x, z) in [(9, 13), (10, 13), (11, 13), (12, 13), (13, 13), (14, 13), (15, 13), (16, 13), (17, 13)]: b.set(x, -1, z, 'dirt_path')
        for (x, z, k) in [(X0 - 1, Z0 + 1, 'bush'), (PX1 - 2, PZ1 + 1, 'flowering_azalea'), (4, 8, 'azalea'), (14, 12, 'bush')]:
            b.set(x, 0, z, k, 'plant')
        play = {(x, z) for x in range(16, 20) for z in range(7, 10)}            # the play paddock stays empty
        scatter(b, [(x, z) for x in range(5, 22) for z in range(1, 14) if (x, z) not in play], rng, 0.10, 'short_grass', 'tuft', box=(5, 21, 1, 13))

    # ================= LEGEND: silo, windpump, chicken coop =================
    with b.tier(3):
        # a cupola on the ridge: white corners, louvers, a little pyramid roof
        for x in (8, 9, 10):
            for z in (5, 6, 7): b.set(x, 9, z, WHITE)
        for (x, z) in [(8, 5), (10, 5), (8, 7), (10, 7)]: b.set(x, 10, z, WHITE)
        for (x, z) in [(9, 5), (9, 7), (8, 6), (10, 6)]: b.set(x, 10, z, 'birch_trapdoor', 'trapdoor', h='top')
        hip(b, 8, 10, 5, 7, 11, ROOF, o=0)
        b.set(9, 11, 6, ROOF)                       # hidden inside the little roof: the top slab sits on it
        SB, SBAND = SILO
        SX, SZ, SH = 2, 4, 14
        RING = thick_ring(2.3)
        for y in range(0, SH):
            mat = BASE if y == 0 else (SBAND if y in (1, 7, SH - 1) else SB)
            for (dx, dz) in RING: b.set(SX + dx, y, SZ + dz, mat)
        def outward(dx, dz): return ('S' if dz < 0 else 'N') if abs(dz) >= abs(dx) else ('E' if dx < 0 else 'W')
        for (dx, dz) in RING: b.set(SX + dx, SH, SZ + dz, ROOF, 'stairs', f=outward(dx, dz))
        for (dx, dz) in disc(1.5) - {(0, 0)}: b.set(SX + dx, SH + 1, SZ + dz, ROOF, 'stairs', f=outward(dx, dz))
        b.set(SX, SH + 1, SZ, ROOF); b.set(SX, SH + 2, SZ, 'lightning_rod', 'rod')
        for y in range(0, SH): b.set(SX - 3, y, SZ, 'ladder', 'ladder', side='E')     # on the west face
        # windpump in the paddock corner
        WX, WZ = PX1 - 2, PZ0 + 2
        b.fill(WX, 0, WZ, WX, 7, WZ, 'stripped_birch_log', a='y')
        for (dx, dz) in ((-1, 0), (1, 0), (0, -1), (0, 1)): b.fill(WX + dx, 0, WZ + dz, WX + dx, 1, WZ + dz, FENCE, 'fence')
        hub = 8
        b.set(WX, hub, WZ, 'stripped_birch_log', a='z'); b.set(WX, hub, WZ + 1, 'iron_block')
        # four long sails, each with a vane at its tip that touches it (a pinwheel), so every blade can be placed
        for (dx, dy) in [(0, 1), (0, 2), (0, -1), (0, -2), (1, 0), (2, 0), (-1, 0), (-2, 0), (1, 1), (1, 2), (-1, 1), (-2, 1), (1, -1), (2, -1), (-1, -1), (-1, -2)]:
            b.set(WX + dx, hub + dy, WZ + 1, 'birch_trapdoor', 'trapdoor', open=True, side='N')
        b.set(WX, hub, WZ - 1, 'chain', 'chain', a='z')
        b.set(WX, hub, WZ - 2, 'birch_trapdoor', 'trapdoor', open=True, side='E'); b.set(WX, hub + 1, WZ - 2, 'birch_trapdoor', 'trapdoor', open=True, side='E')
        # chicken coop on short stilts, out in front, with a ramp
        CX0, CX1, CZ0, CZ1 = -1, 2, 10, 12
        for x in (CX0, CX1):
            for z in (CZ0, CZ1): b.set(x, 0, z, FENCE, 'fence')
        b.fill(CX0, 1, CZ0, CX1, 1, CZ1, 'spruce_planks')
        b.walls(CX0, CZ0, CX1, CZ1, 2, 3, RED)
        for x in (CX0, CX1):
            for z in (CZ0, CZ1): b.fill(x, 2, z, x, 3, z, WHITE)
        gable(b, CX0, CX1, CZ0, CZ1, 4, ROOF, o=1, gable_mat=RED, axis='x')
        b.set(1, 2, CZ1, None); b.set(1, 3, CZ1, None); b.set(0, 3, CZ1, 'glass', 'pane')
        b.set(1, 0, CZ1 + 1, 'spruce_planks'); b.set(1, 1, CZ1 + 1, 'spruce_planks', 'stairs', f='N')
        b.set(1, 0, CZ1 + 2, 'spruce_planks', 'stairs', f='N')
        for (x, z) in [(2, 15), (3, 14), (4, 14), (5, 13)]: b.set(x, -1, z, 'dirt_path')
        for (x, z) in [(3, 11), (-2, 13)]: b.set(x, 0, z, 'golden_dandelion', 'plant')
        for (x, z) in [(3, 12), (4, 13), (-1, 14)]: b.set(x, 0, z, 'pumpkin', f='S')
        b.set(3, 0, 13, 'hay_block')
    return b


BUILDS = {'ranger-camp': ranger_camp, 'animal-barn': animal_barn}

CHANGELOG = 'https://www.minecraft.net/en-us/article/minecraft--bedrock-edition-26-50-changelog'
TINY = 'https://www.minecraft.net/en-us/updates/tiny-takeover-drop'
WIKI = 'https://minecraft.wiki/w/'

META = {
    'ranger-camp': dict(
        title='Autumn Ranger Camp', kind='big', diff=1, mode='Survival',
        pitch='A cozy forest camp with a tent, a campfire and a cabin.',
        blurb=('Pitch a wool tent, light the campfire and pull up a cushion. '
               'Then build a ranger cabin from the new poplar wood. '
               'Finish with a lookout tower and a canoe dock by a tiny pond.'),
        tiers=['Starter: an orange wool tent with two straw beds, and a campfire ring with cushions.',
               'Pro: a poplar ranger cabin with a porch, shelves, a chimney and three autumn trees.',
               'Legend: a lookout tower, plus a tiny pond with a dock and a canoe.'],
        teaches=['Tents from wool stairs', 'Dark log frames with light log walls',
                 'A porch roof that crosses the main roof', 'Autumn trees in three leaf colors'],
        tips=[('know', 'Straw beds are for one night',
               'A Straw Bed lets you sleep, but it does not move your spawn point. '
               'It breaks when you get up, so pack spares. 3 Hay Bales make 4 Straw Beds.'),
              ('warn', 'Cushions need a floor',
               'Cushions are made from 3 matching Wool Slabs. '
               'Break the block under a cushion and the cushion breaks too.'),
              ('pro', 'Make a signal fire',
               'Put a Hay Bale under your Campfire. '
               'The smoke rises 24 blocks instead of about 10. Now your friends can find your camp.'),
              ('know', 'Leaf litter piles up',
               'You can put up to 4 Leaf Litter in one spot. Its color changes with the biome.'),
              ('pro', 'Fill the pond fast',
               'You do not need a Water Bucket for every block. Pour water in every other block, '
               'like a checkerboard. Each gap with water on two sides fills in by itself.')],
        challenge=('Make it yours: Add a second tent in a new color for a friend. '
                   'Then fill the porch shelves with your best finds. Each shelf shows 3 stacks.'),
        dad="Dad's Corner: Plan a pretend camping trip together. What five things would you each pack? Put them in the cabin chest.",
        needs='26.50',
        new_blocks=['Poplar Log', 'Stripped Poplar Log', 'Poplar Planks', 'Poplar Door', 'Poplar Trapdoor', 'Poplar Fence',
                    'Poplar Shelf', 'Poplar Hanging Sign', 'Red Poplar Leaves', 'Orange Poplar Leaves', 'Yellow Poplar Leaves',
                    'Poplar Slab', 'Poplar Stairs', 'Orange Wool Stairs', 'White Wool Slab', 'Red Cushion', 'Orange Cushion',
                    'Yellow Cushion', 'Brown Cushion', 'Straw Bed', 'Shelf Mushroom', 'Red Shrub',
                    'Leaf Litter', 'Bush', 'Wildflowers', 'Firefly Bush'],
        sources=[CHANGELOG, WIKI + 'Straw_Bed', WIKI + 'Cushion', WIKI + 'Hay_Bale', WIKI + 'Leaf_Litter',
                 WIKI + 'Shelf', WIKI + 'Wool_Stairs', WIKI + 'Shelf_Mushroom', WIKI + 'Campfire',
                 WIKI + 'Poplar', WIKI + 'Dappled_Forest', WIKI + 'Brown_Mushroom', WIKI + 'Water'],
        palette=['Poplar Log', 'Stripped Poplar Log', 'Spruce Planks', 'Orange Wool'],
        time=0.66, ground='grass_block', order=4, featured=False,
    ),
    'animal-barn': dict(
        title='Baby Animal Rescue Barn', kind='big', diff=2, mode='Survival',
        pitch='A red barn with cozy stalls for baby animals.',
        blurb=('Build a red and white barn with a curved barn roof and a hay loft. '
               'Every stall is ready for a rescued baby animal. '
               'Grow golden dandelions by the door. Feed one to a baby animal to keep it small.'),
        tiers=['Starter: a small red barn with a curved roof, sliding doors and two stalls.',
               'Pro: a stall wing, a paddock with a water trough, a hay loft and golden dandelion planters.',
               'Legend: a tall silo, a windmill water pump, a cupola and a chicken coop.'],
        teaches=['Barn roofs (gambrel shape) from stairs and slabs', 'White trim on corners and doors',
                 'Lean-to roofs', 'Round towers with a dome'],
        tips=[('know', 'Keep a baby small',
               'Feed a baby animal a Golden Dandelion and it stops growing up. '
               'Feed it another one when you want it to grow.'),
              ('pro', 'Craft a golden dandelion',
               'Put 8 Gold Nuggets around 1 Dandelion. '
               'You can plant golden dandelions on grass or dirt, like in the planters here.'),
              ('pro', 'A soft landing',
               'Falling onto a Hay Bale takes away most of the fall damage. '
               'There is one at the foot of the loft ladder.'),
              ('know', 'Rain fills the trough',
               'An empty Cauldron slowly fills with water when rain falls on it.')],
        challenge='Make it yours: Add a stall for your favorite baby animal. Hang a sign with its name.',
        dad=("Dad's Corner: Pick a name for every baby animal together. "
             'Name Tags can now be crafted from 1 Paper and 1 metal nugget.'),
        needs='26.50',
        new_blocks=['Gray Concrete Stairs', 'Gray Concrete Slab', 'White Concrete Stairs', 'White Concrete Slab',
                    'Golden Dandelion', 'Spruce Shelf', 'Bush'],
        sources=[TINY, WIKI + 'Golden_Dandelion', WIKI + 'Hay_Bale', WIKI + 'Cauldron', WIKI + 'Name_Tag', CHANGELOG],
        palette=['Mangrove Planks', 'White Concrete', 'Gray Concrete', 'Cobblestone'],
        # animal spaces stay empty: (x, y, z, w, h, d, label, tier that adds it)
        # one-word labels: six boxes sit close together, and long labels pile up on top of each other
        empty=[(7, 0, 5, 2, 2, 2, 'Calf', 1), (10, 0, 5, 2, 2, 2, 'Lamb', 1),
               (13, 0, 4, 2, 2, 2, 'Foal', 2), (13, 0, 7, 2, 2, 3, 'Piglets', 2),
               (16, 0, 7, 4, 2, 3, 'Play yard', 2), (0, 2, 11, 2, 2, 1, 'Chicks', 3)],
        time=0.38, ground='grass_block', order=6, featured=False,
    ),
}
