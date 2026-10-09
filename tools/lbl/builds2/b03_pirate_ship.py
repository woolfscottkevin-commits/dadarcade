"""Layer by Layer 2, big build 9: Pirate Ship with Curved Sails.

The ship points east (+x) with its bow toward the default camera (south-east), so the camera sees
the round, wind-filled side of every sail. The stern with the captain's cabin is at the west end,
the bow and bowsprit at the east end. The sea is the ground (META ground='water', water at y = -1),
so the hull's bottom layer sits in the water at y = -1 and is filled so no water shows inside.

Tiers are three complete models (a sloop, a two-mast ship, a three-mast ship with an island)
merged into one Build: blocks a higher tier does not keep are removed in that tier.
"""
from lbl import *
import math, random

ZC = 5                      # centre line of the ship (z)
HULL = 'dark_oak_planks'
DECK = 'spruce_planks'
TRIM = 'stripped_spruce_log'
SAIL = 'white_wool'
MAST = 'spruce_log'
STEM = 'stripped_dark_oak_log'
FLAG = 'black_wool'


# ---------------------------------------------------------------- shared pieces
def hull_plan(wdeck, layers):
    """wdeck: {x: half width} at full height. layers: {y: (bow_in, stern_in, side_in)}.
    Returns {y: set((x, z))}."""
    plan = {}
    for y, (bow, st, ins) in layers.items():
        cells = set()
        for x in range(min(wdeck) - 4, max(wdeck) + 5):
            a = wdeck.get(x + bow); c = wdeck.get(x - st)
            if a is None or c is None: continue
            w = min(a, c) - ins
            if w < 0: continue
            for z in range(ZC - w, ZC + w + 1): cells.add((x, z))
        plan[y] = cells
    return plan


def is_edge(cells, x, z):
    return any((x + dx, z + dz) not in cells for dx, dz in DIRS.values())


def band_axis(cells, x, z):
    """Which way a log in a trim band should lie, so its end-grain never faces outward:
    along the side ('x'), across the end ('z'), or standing up on a diagonal step ('y')."""
    open_x = (x + 1, z) not in cells or (x - 1, z) not in cells
    open_z = (x, z + 1) not in cells or (x, z - 1) not in cells
    if open_x and open_z: return 'y'
    return 'z' if open_x else 'x'


def hull_shell(b, plan, mat_of, inside_of=None):
    """The hull: the outside skin of every layer, upside-down stairs where a layer hangs over
    the one below (that rounds the bottom), and an optional fill for the inside of a layer.
    mat_of may return round=False in the state to keep a hanging cell a full block."""
    ys = sorted(plan)
    for y in ys:
        cells = plan[y]; below = plan.get(y - 1)
        for (x, z) in cells:
            edge = is_edge(cells, x, z)
            hang = below is not None and (x, z) not in below
            if not edge and not hang:
                m = inside_of(x, y, z) if inside_of else None
                if m: b.set(x, y, z, m)
                continue
            m, st = mat_of(x, y, z)
            st = dict(st); rnd = st.pop('round', True)
            if rnd and hang and y > ys[0] and B[m].get('stairs'):
                best = None
                for d in (('N', 'S') if z != ZC else ()) + ('W', 'E', 'N', 'S'):
                    dx, dz = DIRS[d]
                    if (x + dx, z + dz) in below and (x + dx, z + dz) in cells:
                        best = d; break
                if best:
                    b.set(x, y, z, m, 'stairs', f=best, h='top'); continue
            b.set(x, y, z, m, **st)


def sail(b, xb, y0, y1, z0, z1, bmax=2, mat=SAIL):
    """A billowing square sail. It hangs from a yard at (xb, y1 + 1) and puffs out toward +x
    (the wind blows from the stern). Each row sits min(bmax, rows to the top or bottom edge)
    blocks forward. Wool stairs round off the curve on both faces, so the side of the sail is a
    smooth ')', and the bottom row is a wool slab, a thin hem that curls forward."""
    curved_sheet(b, y0, y1, z0, z1, bmax, mat, lambda u, y, k: (xb + k, y, u), 'W')


def fore_aft_sail(b, zb, y0, y1, x0, x1, bmax=2, mat=SAIL):
    """The same billowing sail turned to run along the ship (a sloop's mainsail). It spans x0..x1,
    hangs between a boom (y0 - 1) and a gaff (y1 + 1) at z = zb and puffs out toward +z.
    The front edge (x1) is filled back to the centre line so the sail meets the mast."""
    curved_sheet(b, y0, y1, x0, x1, bmax, mat, lambda u, y, k: (u, y, zb + k), 'N')
    for y in range(y0, y1 + 1):
        for k in range(0, min(bmax, y - y0, y1 - y)):
            if (x1, y, zb + k) not in b.c: b.set(x1, y, zb + k, mat)


def curved_sheet(b, y0, y1, u0, u1, bmax, mat, at, back):
    fwd = OPP[back]
    ks = {y: min(bmax, y - y0, y1 - y) for y in range(y0, y1 + 1)}
    for u in range(u0, u1 + 1):
        for y in range(y0, y1 + 1):
            k = ks[y]
            if y == y0: b.set(*at(u, y, k), mat, 'slab', h='top')
            else: b.set(*at(u, y, k), mat)
            up = ks.get(y + 1); dn = ks.get(y - 1)
            if up is not None and up > k and (dn is None or dn <= k):
                b.set(*at(u, y, k + 1), mat, 'stairs', f=back, h='top')      # round side, below the step
                b.set(*at(u, y + 1, k), mat, 'stairs', f=fwd, h='bottom')    # hollow side, above the step
            if dn is not None and dn > k and (up is None or up <= k):
                b.set(*at(u, y, k + 1), mat, 'stairs', f=back, h='bottom')   # round side, above the step
                b.set(*at(u, y - 1, k), mat, 'stairs', f=fwd, h='top')       # hollow side, below the step


def yard(b, x, y, z0, z1, mat=TRIM):
    b.fill(x, y, z0, x, y, z1, mat, a='z')


def mast(b, x, y0, y1, z=ZC, mat=MAST):
    b.fill(x, y0, z, x, y1, z, mat, a='y')


def flag(b, x, top, z=ZC, n=4):
    """A black pirate flag at the masthead: n blocks long and 2 tall, the last block a one-block
    tail. It streams toward the bow (+x), the same way the sails puff."""
    for dx in range(1, n):
        b.set(x + dx, top, z, FLAG); b.set(x + dx, top - 1, z, FLAG)
    b.set(x + n, top, z, FLAG)


def jib(b, x0, x1, top_at, foot, z=ZC):
    """A triangle sail in line with the ship. Column x runs from `foot` (or the first free cell
    above whatever is already there) up to top_at(x); the top cell is a wool stair, so the
    front edge is a smooth slope down to the bowsprit."""
    for x in range(x0, x1 + 1):
        top = top_at(x)
        busy = [yy for yy in range(foot, top + 1) if (x, yy, z) in b.c]
        y = max(busy) + 1 if busy else foot
        for yy in range(y, top + 1):
            if yy == top: b.set(x, yy, z, SAIL, 'stairs', f='W', h='bottom')
            else: b.set(x, yy, z, SAIL)


def lantern_post(b, x, y, z, mat='dark_oak_planks'):
    b.set(x, y, z, mat, 'fence'); b.set(x, y + 1, z, 'lantern', 'lantern')


# ---------------------------------------------------------------- Starter: the sloop
def sloop():
    b = Build('Pirate Sloop')
    # 12 long (x 12..23), 7 wide (z 2..8), bow east. Keel at y = -1, a round bottom of upside-down
    # dark oak stairs at y = 0 (the deck sits inside it), a trim band at y = 1, a rail at y = 2.
    w = {12: 2}
    for x in range(13, 20): w[x] = 3
    w.update({20: 2, 21: 2, 22: 1, 23: 0})
    plan = hull_plan(w, {-1: (1, 1, 1), 0: (0, 0, 0), 1: (0, 0, 0)})

    def mat_of(x, y, z):
        if y == 0 and not is_edge(plan[0], x, z): return DECK, {'round': False}
        if y == 1: return TRIM, dict(a=band_axis(plan[1], x, z))
        return HULL, {}
    hull_shell(b, plan, mat_of, inside_of=lambda x, y, z: {-1: HULL, 0: DECK}.get(y))
    deck = plan[1]
    # rail: slabs in the middle, full blocks at the ends, so the deck line rises to the bow
    for (x, z) in deck:
        if not is_edge(deck, x, z) or x == 23: continue
        b.set(x, 2, z, HULL, 'slab' if 14 <= x <= 19 else 'full')
    for z in (4, 6): b.set(22, 3, z, HULL, 'slab')
    # stem post with a stair cap, and a bowsprit that angles up
    for y in (2, 3): b.set(23, y, ZC, STEM)
    b.set(23, 4, ZC, HULL, 'stairs', f='W')
    b.set(24, 3, ZC, TRIM, a='x')
    b.set(25, 3, ZC, HULL, 'stairs', f='W', h='top')
    b.set(25, 4, ZC, TRIM, a='x')
    # ship's wheel and lanterns at the stern
    b.set(13, 1, ZC, 'grindstone', 'grindstone', f='N')      # a Grindstone makes a good ship's wheel
    for z in (3, 7): b.set(12, 3, z, 'lantern', 'lantern')
    # mast, boom, gaff, one big sail along the ship, a jib to the bowsprit, the flag on top
    mast(b, 17, 1, 13)            # the mast ends at the flag's top row (the flag starts one above the gaff), so no step is a lone mast block
    b.fill(11, 4, ZC, 16, 4, ZC, TRIM, a='x')
    b.fill(11, 11, ZC, 16, 11, ZC, TRIM, a='x')
    fore_aft_sail(b, ZC, 5, 10, 12, 16, bmax=2)
    jib(b, 19, 24, lambda x: 29 - x, 4)
    flag(b, 17, 13)
    # cargo
    b.set(15, 1, 3, 'barrel'); b.set(14, 1, 3, 'chest', 'chest'); b.set(20, 1, 6, 'barrel')
    return b


# ---------------------------------------------------------------- Pro / Legend: the galleon
GAL_W = {1: 4, 2: 4}
for _x in range(3, 25): GAL_W[_x] = 5
GAL_W.update({25: 4, 26: 4, 27: 4, 28: 3, 29: 3, 30: 2, 31: 1, 32: 0})
GAL_LAYERS = {-1: (4, 3, 2), 0: (2, 1, 1), 1: (1, 0, 0), 2: (0, 0, 0), 3: (0, 0, 0)}
PORTS = (6, 9, 12, 15, 18, 21)
CABIN_X1 = 8          # captain's cabin: x 1..8, poop deck on top
FORE_X0 = 24          # forecastle: x 24..32
MAIN_X, FORE_X, MIZ_X = 16, 26, 4
MAIN_TOP, FORE_TOP, MIZ_TOP = 25, 23, 21     # mast tops; the flag's top row is here
BOARD_X = 14          # boarding ladder on the south side, between two gun ports
NEST_Y = 21           # Legend crow's nest floor, on top of the main topsail yard


def inward(cells, x, z):
    """Direction from an edge cell toward the inside of a plan (for stairs that lean in)."""
    for d in (('N', 'S') if z != ZC else ()) + ('W', 'E', 'N', 'S'):
        dx, dz = DIRS[d]
        if (x + dx, z + dz) in cells and (x - dx, z - dz) not in cells: return d
    return None


def galleon(level):
    b = Build('Pirate Ship')
    plan = hull_plan(GAL_W, GAL_LAYERS)
    full = plan[3]
    ring = sorted(p for p in full if is_edge(full, *p))
    inner = {p for p in full if not is_edge(full, *p)}
    def waist(x): return CABIN_X1 < x < FORE_X0

    def mat_of(x, y, z):
        if y == 2: return TRIM, dict(a=band_axis(plan[2], x, z))
        return HULL, {}

    def inside(x, y, z):
        return DECK if y in (-1, 3) else None      # the floor of the hold keeps the sea out; the main deck
    hull_shell(b, plan, mat_of, inside_of=inside)

    # ---- waist: the sides lean in a little above the deck (tumblehome), then a bulwark and a rail
    for (x, z) in ring:
        if waist(x):
            f = inward(full, x, z)
            if f: b.set(x, 3, z, HULL, 'stairs', f=f)
    for (x, z) in sorted(inner):
        if waist(x) and is_edge(inner, x, z):
            b.set(x, 4, z, HULL)
            b.set(x, 5, z, 'dark_oak_planks', 'fence')

    # ---- gun ports: closed lids on the hull (Pro), open ports with black insides (Legend)
    for x in PORTS:
        for z, side, zo in ((0, 'S', -1), (10, 'N', 11)):
            if level >= 3:
                b.set(x, 1, z, 'black_concrete')
                b.set(x, 1, zo, 'spruce_trapdoor', 'trapdoor', h='top')
            else:
                b.set(x, 1, zo, 'spruce_trapdoor', 'trapdoor', open=True, side=side)

    # ---- boarding ladder on the south side: full blocks behind it, a gate in the rail at the top
    for y in (1, 3): b.set(BOARD_X, y, 10, HULL)
    for y in (1, 2, 3): b.set(BOARD_X, y, 11, 'ladder', 'ladder', side='N')
    b.set(BOARD_X, 4, 9, 'dark_oak_fence_gate', 'gate', a='x')
    b.set(BOARD_X, 5, 9, None)

    # ---- captain's cabin: walls y 4..6, trim y 7, poop deck y 8 with an overhang, rail y 9
    cab = {p for p in full if p[0] <= CABIN_X1}
    for (x, z) in cab:
        if is_edge(full, x, z) or x == CABIN_X1:
            for y in (4, 5, 6): b.set(x, y, z, DECK)
            b.set(x, 7, z, TRIM, a=('z' if x in (1, CABIN_X1) else 'x'))
        b.set(x, 8, z, DECK)
    over = set()
    for (x, z) in cab:
        for d, (dx, dz) in DIRS.items():
            q = (x + dx, z + dz)
            if q not in cab and q[0] <= CABIN_X1 and d != 'E': over.add(q)
    for (x, z) in over:
        f = next(d for d, (dx, dz) in DIRS.items() if (x + dx, z + dz) in cab)
        b.set(x, 8, z, HULL, 'stairs', f=f, h='top')
    deck2 = cab | over
    for (x, z) in deck2:
        if is_edge(deck2, x, z) or x == CABIN_X1:
            b.set(x, 9, z, 'dark_oak_planks', 'fence')
    # pillars on the corners and between the windows
    for (x, z) in [(1, 1), (1, 9), (1, 4), (1, 6), (2, 1), (2, 9), (3, 0), (3, 10), (6, 0), (6, 10),
                   (8, 0), (8, 10), (8, 3), (8, 7)]:
        for y in (4, 5, 6): b.set(x, y, z, 'dark_oak_log')
    # stern windows, side windows, front wall with door and windows
    for z in (2, 3, 5, 7, 8):
        for y in (5, 6): b.set(1, y, z, 'glass', 'pane')
    for x in (4, 5, 7):
        for z in (0, 10):
            for y in (5, 6): b.set(x, y, z, 'glass', 'pane')
    door(b, CABIN_X1, 4, ZC, 'spruce_door', 'E')
    for z in (2, 8): b.set(CABIN_X1, 5, z, 'glass', 'pane')
    for z in (1, 9):
        for y in (4, 5, 6, 7, 8): b.set(CABIN_X1 + 1, y, z, 'ladder', 'ladder', side='W')
        b.set(CABIN_X1, 9, z, None)
    # stern gallery (a little balcony under the windows) and the rudder
    for z in range(2, 9):
        b.set(0, 3, z, HULL, 'stairs', f='E', h='top')
        b.set(0, 4, z, 'dark_oak_planks', 'fence')
    for y in range(-1, 3): b.set(0, y, ZC, HULL)        # rudder, joined to the keel below the stern
    for x in (1, 2, 3): b.set(x, -1, ZC, HULL)
    b.set(1, 0, ZC, HULL)
    # lanterns on the stern rail, ship's wheel and bell on the poop deck
    for z in (1, 9): b.set(0, 10, z, 'lantern', 'lantern')
    for x in (2, 3):
        for z in (4, 5, 6): b.set(x, 8, z, 'glass')
    b.set(0, 10, ZC, 'dark_oak_planks', 'fence'); b.set(0, 11, ZC, 'lantern', 'lantern')
    b.set(7, 9, ZC, 'grindstone', 'grindstone', f='N')       # the ship's wheel, round face fore and aft
    b.set(7, 9, 7, 'bell', 'bell')
    # inside the cabin: map table, treasure chest, bed, lantern
    b.set(4, 4, ZC, 'cartography_table')
    b.set(2, 4, ZC, 'chest', 'chest')
    b.set(3, 4, 2, 'red_bed', 'bed', part='foot', f='W'); b.set(2, 4, 2, 'red_bed', 'bed', part='head', f='W')
    b.set(5, 7, ZC, 'lantern', 'lantern', hang=True)

    # ---- forecastle: walls y 4..5, deck y 6, a fence rail y 7 (slabs on the diagonal steps, where
    # fences would not join)
    fplan = hull_plan(GAL_W, {3: (0, 0, 0), 4: (0, 0, 0), 5: (0, 0, 0), 6: (0, 0, 0)})
    fp = {y: {p for p in c if p[0] >= FORE_X0} for y, c in fplan.items()}
    for y in (4, 5):
        for (x, z) in fp[y]:
            if not (is_edge(fp[y], x, z) or x == FORE_X0): continue
            b.set(x, y, z, DECK if x == FORE_X0 else HULL)
    for (x, z) in fp[6]:
        if x == FORE_X0:
            b.set(x, 6, z, TRIM, a='z'); b.set(x, 7, z, 'dark_oak_planks', 'fence')
        elif is_edge(fp[6], x, z):
            ax = band_axis(fp[6], x, z)
            b.set(x, 6, z, TRIM, a=ax)
            if ax == 'y': b.set(x, 7, z, HULL, 'slab')
            else: b.set(x, 7, z, 'dark_oak_planks', 'fence')
        else:
            b.set(x, 6, z, DECK)
    for z in (0, 3, 7, 10):
        for y in (4, 5): b.set(FORE_X0, y, z, 'dark_oak_log')
    door(b, FORE_X0, 4, ZC, 'spruce_door', 'W')
    for z in (2, 8): b.set(FORE_X0, 5, z, 'glass', 'pane')
    for z in (1, 9):
        for y in (4, 5, 6): b.set(FORE_X0 - 1, y, z, 'ladder', 'ladder', side='E')
        b.set(FORE_X0, 7, z, None)
    for z in (1, 9): b.set(25, 8, z, 'lantern', 'lantern')       # on the rail posts beside the ladders
    # inside the forecastle: the crew's workshop
    b.set(25, 4, 2, 'crafting_table')
    for (x, y, z) in ((29, 4, 3), (29, 5, 3), (29, 4, 7), (28, 4, 7)): b.set(x, y, z, 'barrel')
    b.set(28, 5, ZC, 'lantern', 'lantern', hang=True)
    # bow: a stem post, a bowsprit that angles up, and the jib sail
    for y in range(2, 8): b.set(32, y, ZC, STEM)
    b.set(33, 7, ZC, TRIM, a='x')
    b.set(34, 7, ZC, HULL, 'stairs', f='W', h='top')
    b.set(34, 8, ZC, TRIM, a='x'); b.set(35, 8, ZC, TRIM, a='x')
    b.set(36, 8, ZC, HULL, 'stairs', f='W', h='top')
    b.set(36, 9, ZC, TRIM, a='x')
    jib(b, 30, 35, lambda x: 45 - x, 7)

    # ---- masts, yards and sails (each topsail hangs straight off the yard below it)
    mast(b, MAIN_X, 4, MAIN_TOP)
    yard(b, MAIN_X + 1, 13, 0, 10); sail(b, MAIN_X + 1, 7, 12, 1, 9, bmax=2)
    yard(b, MAIN_X + 1, 20, 1, 9); sail(b, MAIN_X + 1, 14, 19, 2, 8, bmax=1)
    flag(b, MAIN_X, MAIN_TOP)
    mast(b, FORE_X, 4, FORE_TOP)
    yard(b, FORE_X + 1, 13, 0, 10); sail(b, FORE_X + 1, 8, 12, 1, 9, bmax=2)
    yard(b, FORE_X + 1, 19, 1, 9); sail(b, FORE_X + 1, 14, 18, 2, 8, bmax=1)
    flag(b, FORE_X, FORE_TOP)
    # ropes (iron chain) from the yard ends down to the rail
    for z in (0, 10):
        for y in range(4, 13): b.set(MAIN_X + 1, y, z, 'chain', 'chain')
        for y in range(8, 13): b.set(FORE_X + 1, y, z, 'chain', 'chain')

    # ---- main deck: hatch to the hold, barrels, a chest, lanterns on the rail
    for x in (11, 12):
        for z in (4, 5, 6): b.set(x, 3, z, 'spruce_trapdoor', 'trapdoor', h='top')
    for (x, z) in ((15, 4), (15, 6), (21, 2), (22, 2), (21, 8)): b.set(x, 4, z, 'barrel')
    b.set(22, 4, 8, 'chest', 'chest')
    for x in (10, 19, 22):
        for z in (1, 9): b.set(x, 6, z, 'lantern', 'lantern')
    # the hold below deck: a post with a ladder up to the hatch, supplies, treasure and lanterns
    for y in (0, 1, 2): b.set(10, y, ZC, 'dark_oak_log'); b.set(11, y, ZC, 'ladder', 'ladder', side='W')
    for (x, z, k) in ((14, 2, 'barrel'), (15, 2, 'barrel'), (14, 8, 'barrel'), (17, 2, 'chest'), (17, 8, 'chest'), (20, 5, 'barrel')):
        b.set(x, 0, z, k, 'chest' if k == 'chest' else 'full')
    for x in (13, 18, 22): b.set(x, 2, ZC, 'lantern', 'lantern', hang=True)

    if level >= 3:
        legend_extras(b)
    return b


def legend_extras(b):
    # mizzen mast on the poop deck, with its own sail and flag
    mast(b, MIZ_X, 9, MIZ_TOP)
    yard(b, MIZ_X + 1, 17, 1, 9); sail(b, MIZ_X + 1, 12, 16, 2, 8, bmax=2)
    flag(b, MIZ_X, MIZ_TOP)
    # crow's nest at the top of the main mast: a ladder up the mast and a trapdoor to climb through
    for x in range(MAIN_X - 2, MAIN_X + 3):
        for z in range(ZC - 2, ZC + 3):
            if abs(x - MAIN_X) == 2 and abs(z - ZC) == 2: continue
            if (x, z) == (MAIN_X, ZC): continue
            b.set(x, NEST_Y, z, 'dark_oak_planks', 'slab', h='top')
            if abs(x - MAIN_X) == 2 or abs(z - ZC) == 2: b.set(x, NEST_Y + 1, z, 'dark_oak_planks', 'fence')
    b.set(MAIN_X - 1, NEST_Y, ZC, 'spruce_trapdoor', 'trapdoor', h='top')
    for y in range(4, NEST_Y): b.set(MAIN_X - 1, y, ZC, 'ladder', 'ladder', side='E')
    b.set(MAIN_X - 2, NEST_Y + 2, ZC - 1, 'lantern', 'lantern')
    # gold in the hold
    for (x, y, z) in ((19, 0, 4), (19, 0, 6), (18, 0, 5), (19, 0, 5), (19, 1, 5)): b.set(x, y, z, 'gold_block')   # a heap: the top one sits on the middle one
    island(b)


ISLE = (9, 19)        # island centre (x, z): south of the ship, toward the stern


def island(b):
    """A sand island with a palm tree, beside the ship on the camera side, and a dock along the hull.
    X marks the spot: a chest is buried one block under the middle of the red carpet X."""
    cx, cz = ISLE
    top = {}                               # height of the sand at each (x, z)
    for dx, dz in disc(5.6): top[(cx + dx, cz + dz)] = -1
    for dx, dz in disc(4.4): top[(cx + dx, cz + dz)] = 0
    px, pz = cx - 2, cz + 1                # a dune under the palm, on the west side of the island
    for dx, dz in disc(1.6): top[(px + dx, pz + dz)] = 1
    for (x, z), h in top.items():
        for y in range(-1, h + 1): b.set(x, y, z, 'sand')
    def on_sand(x, z, key, shape='full', **st): b.set(x, top[(x, z)] + 1, z, key, shape, **st)
    # palm trunk: jungle logs that curve out west over the water, every step joined face to face,
    # so the crown hangs clear of the ship
    trunk = [(0, 2), (0, 3), (0, 4), (-1, 4), (-1, 5), (-1, 6), (-2, 6), (-2, 7), (-2, 8), (-3, 8), (-3, 9)]
    for dx, y in trunk: b.set(px + dx, y, pz, 'jungle_log')
    tx_, ty, tz = px + trunk[-1][0], trunk[-1][1], pz
    L = 'jungle_leaves'
    for dx in (-1, 0, 1):                  # the crown, with a tuft on top
        for dz in (-1, 0, 1): b.set(tx_ + dx, ty + 1, tz + dz, L)
    b.set(tx_, ty + 2, tz, L)
    for dx, dz in DIRS.values():           # four long fronds that droop at the tips
        for (d, dy) in ((2, 1), (3, 1), (3, 0), (4, 0), (4, -1)):
            b.set(tx_ + d * dx, ty + dy, tz + d * dz, L)
    for sx in (-1, 1):                     # four short ones between them, joined to the crown's side
        for sz in (-1, 1):
            for (ax, az, dy) in ((2, 1, 1), (2, 2, 1), (2, 2, 0)):
                b.set(tx_ + ax * sx, ty + dy, tz + az * sz, L)
    # beach: a barrel, a campfire, dry grass, and sugar cane where the sand touches the water
    on_sand(cx + 3, cz - 2, 'barrel')
    on_sand(cx, cz + 3, 'campfire', 'campfire')
    for (x, z, k) in ((cx + 1, cz - 3, 'short_dry_grass'), (cx - 3, cz + 3, 'tall_dry_grass'),
                      (cx + 4, cz + 1, 'short_dry_grass'), (cx - 1, cz - 2, 'tall_dry_grass'),
                      (cx - 4, cz - 1, 'short_dry_grass'), (cx + 1, cz + 4, 'short_dry_grass')):
        on_sand(x, z, k, 'plant')
    for (x, z, n) in ((cx + 5, cz + 1, 2), (cx + 4, cz + 3, 3), (cx + 2, cz + 5, 2)):
        assert top[(x, z)] == -1 and any(q not in top for q in ((x + 1, z), (x - 1, z), (x, z + 1), (x, z - 1)))
        for y in range(n): b.set(x, y, z, 'sugar_cane', 'plant')
    # X marks the spot: red carpet on the sand, a chest one block down under the middle
    xc, zc = cx + 2, cz + 1
    for dx, dz in ((0, 0), (1, 1), (-1, 1), (1, -1), (-1, -1)):
        assert top[(xc + dx, zc + dz)] == 0
        on_sand(xc + dx, zc + dz, 'red_carpet', 'carpet')
    b.set(xc, -1, zc, 'chest', 'chest')
    # dock along the hull, on log posts, joined to the beach; the boarding ladder is at BOARD_X
    for x in range(cx - 2, 21):
        for z in (12, 13): b.set(x, 0, z, DECK, 'slab')
    for x in (cx - 2, 16, 20):
        b.set(x, -1, 13, 'spruce_log'); b.set(x, -1, 12, 'spruce_log')
    for x in (12, 18):                     # posts stick up through the dock and carry lanterns
        b.set(x, -1, 13, 'spruce_log'); b.set(x, 0, 13, 'spruce_log')
        lantern_post(b, x, 1, 13, 'spruce_planks')


# ---------------------------------------------------------------- tiers
def merge(name, models):
    """models[t-1] is the complete build for tier t. Returns one Build with tiers and upgrades."""
    out = Build(name)
    allp = set()
    for m in models: allp |= set(m.c)
    for p in allp:
        seq = [m.c.get(p) for m in models]
        first = next(i for i, v in enumerate(seq) if v is not None)
        out.c[p] = dict(seq[first]) if first == 0 else dict(seq[first], tier=first + 1)
        prev = seq[first]
        for t in range(first + 1, len(models)):
            v = seq[t]
            if v == prev: continue
            out.up.setdefault(p, []).append((t + 1, None if v is None else dict(v, tier=t + 1)))
            prev = v
    return out


def pirate_ship():
    return merge('Pirate Ship with Curved Sails', [sloop(), galleon(2), galleon(3)])


BUILDS = {'pirate-ship': pirate_ship}

CHANGELOG = 'https://www.minecraft.net/en-us/article/minecraft--bedrock-edition-26-50-changelog'

META = {'pirate-ship': dict(
    title='Pirate Ship with Curved Sails', kind='big', diff=3, mode='Creative',
    pitch='A pirate galleon with puffy sails made from wool stairs.',
    blurb=('Set sail on a pirate ship with big white sails that look full of wind. '
           'Wool stairs and slabs let you bend each sail into a soft curve. '
           "Then fit out the captain's cabin, the treasure hold and a crow's nest."),
    tiers=["Starter: a little sloop with a curved sail, a ship's wheel and a black pirate flag.",
           "Pro: a two-mast ship with a captain's cabin, a treasure hold and a big jib sail.",
           "Legend: three masts, a crow's nest and gold in the hold. Add a palm tree island with a dock and a buried secret."],
    teaches=['Curved sails with wool stairs and slabs', 'A round hull with upside-down stairs',
             'Overhangs that add shadow', 'Trim bands that run around a build'],
    tips=[('know', 'Brand new shapes',
           'Wool Stairs and Wool Slabs came in Wilderness Bound (26.50). They come in all 16 wool colors.'),
          ('pro', 'Puff out the sails',
           'Start under the yard, the pole the sail hangs from. Move each row one block forward until the middle. '
           'Then step back in toward the bottom. Put a wool stair on each step. Put one inside the step too.'),
          ('warn', 'Keep the sea out',
           'Water spreads into any empty space next to it. Fill the whole bottom layer of the hull. '
           'If water still gets in, place a dry Sponge in it to soak it up.'),
          ('pro', "A wheel for the captain",
           "A Grindstone looks just like a ship's wheel on a stand. Put it on the deck near the back of the ship. "
           'In Bedrock it breaks if nothing holds it up.'),
          ('warn', 'Beach plants only',
           "You can't plant Short Grass or a Bush on sand. Short Dry Grass and Tall Dry Grass work. "
           'Sugar Cane works too, if the sand is next to water.')],
    challenge='Make it yours: Give the sails red stripes with Red Wool Stairs. Or design your own flag on a Loom.',
    dad=("Dad's Corner: Ask your builder which way the wind is blowing. "
         'Then walk around the ship together. Do all the sails puff out the same way?'),
    needs='26.50',
    new_blocks=['White Wool Stairs', 'White Wool Slab', 'Short Dry Grass', 'Tall Dry Grass'],
    palette=['Dark Oak Planks', 'Spruce Planks', 'Stripped Spruce Log', 'White Wool Stairs'],
    time=0.38,
    ground='water',
    order=9,
    sources=[CHANGELOG, 'https://minecraft.wiki/w/Wool_Stairs', 'https://minecraft.wiki/w/Water',
             'https://minecraft.wiki/w/Sponge', 'https://minecraft.wiki/w/Loom',
             'https://minecraft.wiki/w/Grindstone', 'https://minecraft.wiki/w/Short_Grass',
             'https://minecraft.wiki/w/Bush', 'https://minecraft.wiki/w/Short_Dry_Grass',
             'https://minecraft.wiki/w/Tall_Dry_Grass', 'https://minecraft.wiki/w/Sugar_Cane'],
)}
