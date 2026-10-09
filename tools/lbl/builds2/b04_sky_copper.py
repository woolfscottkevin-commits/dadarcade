# Layer by Layer 2: Happy Ghast Sky Harbor and Copper Workshop.
# Two big builds with Starter / Pro / Legend tiers. No mobs are drawn: the happy ghast's parking
# spot and the copper golem's spot stay empty and are marked with META 'empty' boxes.
import random
from lbl import *

# ---------------------------------------------------------------- helpers

def ellipse(cx, cz, rx, rz):
    out = set()
    for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
        for z in range(int(cz - rz) - 1, int(cz + rz) + 2):
            if ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1.0: out.add((x, z))
    return out


def put(b, x, y, z, *a, **k):
    """Set a block only if the spot is still empty (so a higher tier never re-places the same block)."""
    if (x, y, z) not in b.c: b.set(x, y, z, *a, **k)


def cloud(b, y0, lobes, keep_out=None, key='cloud', shade='light_gray_wool'):
    """A soft cloud with its underside at y0. lobes: (cx, cz, r, h) round lumps, r wide; h 1.5 or
    less makes a flat cloud, h 2 lets the middle of the lump puff up half a block more.
    The underside is light gray wool, so a shadow line runs round the bottom. Round the outside the
    gray is a top slab, so the bottom edge steps in and looks rounded. The body is white wool slabs on
    top; where a lump puffs up, it is a white block, or a white stair where it drops down one side."""
    import math
    H = {}
    for (cx, cz, r, h) in lobes:
        h = min(h, 2.0)
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            for z in range(int(cz - r) - 1, int(cz + r) + 2):
                d2 = ((x - cx) ** 2 + (z - cz) ** 2) / (r * r)
                if d2 > 1.0: continue
                v = max(1, int(round(h * math.sqrt(1 - d2) * 2)))
                H[(x, z)] = max(H.get((x, z), 0), v)
    foot = set(H)
    out = {}
    for (x, z), v in H.items():
        edge = any((x + dx, z + dz) not in foot for (dx, dz) in DIRS.values())
        out[(x, y0, z)] = (shade, 'slab', {'h': 'top'}) if edge else (shade, 'full', {})
        if v >= 4 and not edge:
            low = [d for d, (dx, dz) in DIRS.items() if H.get((x + dx, z + dz), 0) < 4]
            if len(low) == 1 or (len(low) == 2 and OPP[low[0]] != low[1]):
                out[(x, y0 + 1, z)] = (key, 'stairs', {'f': OPP[low[0]]})
            else:
                out[(x, y0 + 1, z)] = (key, 'full', {})
        else:
            out[(x, y0 + 1, z)] = (key, 'slab', {})
    for p, (k, s, kw) in out.items():
        if p in b.c or (keep_out and keep_out(*p)): continue
        b.set(*p, k, s, **kw)


# ================================================================ HAPPY GHAST SKY HARBOR
# Four legs at x 4/8, z 6/10 round a middle post at (6, 8). Deck at y=7 (x 2..10, z 4..12).
# Ghast parking x 11..14, z 8..11, y 4..7: its top is level with the deck, so you step across.
# Two side piers frame the parking spot with one block of room each side (walkways z 6 and 13).

TX0, TX1, TZ0, TZ1 = 4, 8, 6, 10           # tower legs (Pro fills the walls between them)
DX0, DX1, DZ0, DZ1, DY = 2, 10, 4, 12, 7    # deck
GX, GY, GZ = 11, 4, 8                       # ghast parking, lowest corner (4 x 4 x 4)
HX0, HX1, HZ0, HZ1 = 3, 6, 6, 10            # harbor house on the deck (Pro)
PX1 = GX + 3                                # far end of the side piers
PN, PNR = GZ - 2, GZ - 3                    # north pier: walkway row, railing row
PS, PSR = GZ + 5, GZ + 6                    # south pier: walkway row, railing row
ROOF = 'waxed_weathered_cut_copper'
RAIL = 'pale_oak_planks'


def in_ghast(x, y, z, pad=0):
    return GX - pad <= x <= GX + 3 + pad and GZ - pad <= z <= GZ + 3 + pad and GY - pad <= y <= GY + 3 + pad


def harbor_keep_out(x, y, z):
    # keep the parking box, the step-across gap and the side piers clear of clouds
    if in_ghast(x, y, z, 1): return True
    if x >= DX1 and GZ - 1 <= z <= GZ + 4 and y >= DY - 1: return True
    return x >= DX1 - 1 and PNR <= z <= PSR and y >= DY


def sky_harbor():
    b = Build('Happy Ghast Sky Harbor')
    cx, cz = 6, 8

    # ---------------- Starter: a lookout deck on four tall legs, side piers, on a little island
    for (x, z) in ellipse(cx, cz + 0.3, 3.1, 3.1):
        b.set(x, -1, z, 'grass_block')
    for z in range(TZ1 + 2, TZ1 + 5): b.set(cx, -1, z, 'dirt_path')
    for (x, z) in ellipse(cx - 0.3, cz + 0.2, 4.6, 4.4): put(b, x, -1, z, 'grass_block')
    for (x, z) in ellipse(cx, cz + 0.3, 6.2, 6.0): put(b, x, -1, z, 'sand')
    for (x, z) in ((TX0, TZ0), (TX1, TZ0), (TX0, TZ1), (TX1, TZ1)):
        for y in range(0, DY): b.set(x, y, z, 'spruce_log')
    # cross rails between the legs (Pro fills these in with stone)
    for x in range(TX0 + 1, TX1):
        b.set(x, 3, TZ0, 'spruce_planks', 'fence'); b.set(x, 3, TZ1, 'spruce_planks', 'fence')
    for z in range(TZ0 + 1, TZ1):
        b.set(TX0, 3, z, 'spruce_planks', 'fence'); b.set(TX1, 3, z, 'spruce_planks', 'fence')
    # middle post with a ladder up to a hatch
    for y in range(0, DY):
        b.set(cx, y, cz, 'stripped_spruce_log')
        b.set(cx + 1, y, cz, 'ladder', 'ladder', side='W')
    # knee braces under the deck
    for (x, z) in ((TX0, TZ0), (TX1, TZ0), (TX0, TZ1), (TX1, TZ1)):
        sx = -1 if x == TX0 else 1; sz = -1 if z == TZ0 else 1
        b.set(x + sx, DY - 1, z, 'spruce_planks', 'stairs', f=('E' if sx < 0 else 'W'), h='top')
        b.set(x, DY - 1, z + sz, 'spruce_planks', 'stairs', f=('S' if sz < 0 else 'N'), h='top')
    # deck: a stripped log frame with planks inside
    for x in range(DX0, DX1 + 1):
        for z in range(DZ0, DZ1 + 1):
            ex = x in (DX0, DX1); ez = z in (DZ0, DZ1)
            if ex and ez: b.set(x, DY, z, 'spruce_log')
            elif ez: b.set(x, DY, z, 'stripped_spruce_log', a='x')
            elif ex: b.set(x, DY, z, 'stripped_spruce_log', a='z')
            else: b.set(x, DY, z, 'spruce_planks')
    b.set(cx + 1, DY, cz, 'spruce_trapdoor', 'trapdoor', h='top')
    # railing, open on the east side from the north pier to the south pier
    for x in range(DX0, DX1 + 1):
        b.set(x, DY + 1, DZ0, RAIL, 'fence')
        if x != DX1: b.set(x, DY + 1, DZ1, RAIL, 'fence')
    for z in range(DZ0, DZ1 + 1):
        b.set(DX0, DY + 1, z, RAIL, 'fence')
        if z < PN: b.set(DX1, DY + 1, z, RAIL, 'fence')
    # side piers: a walkway and a railing either side of the parking spot
    for x in range(DX1 + 1, PX1 + 1):
        for z in (PN, PNR): b.set(x, DY, z, 'spruce_planks', 'slab', h='top')
        b.set(x, DY + 1, PNR, RAIL, 'fence')
    for x in range(DX1 - 1, PX1 + 1):
        for z in (PS, PSR): b.set(x, DY, z, 'spruce_planks', 'slab', h='top')
        b.set(x, DY + 1, PSR, RAIL, 'fence')
    b.set(DX1 - 1, DY + 1, PS, RAIL, 'fence')
    # hitching posts at the far ends: tall posts with arms, copper lanterns on copper chains
    for zr, zw in ((PNR, PN), (PSR, PS)):
        for y in range(DY + 2, DY + 5): b.set(PX1, y, zr, 'spruce_planks', 'fence')
        b.set(PX1, DY + 4, zw, 'spruce_planks', 'fence')
        b.set(PX1, DY + 3, zw, 'copper_chain', 'chain')
        b.set(PX1, DY + 2, zw, 'copper_lantern', 'lantern', hang=True)
    b.set(DX0, DY + 2, DZ1, 'copper_lantern', 'lantern')
    b.set(DX0, DY + 2, DZ0, 'copper_lantern', 'lantern')
    b.set(DX1, DY + 2, PNR, 'copper_lantern', 'lantern')
    b.set(DX1 - 1, DY + 2, PSR, 'copper_lantern', 'lantern')
    # supplies: a barrel and a chest by the ladder, barrels and hay in the north-east corner
    b.set(DX0 + 1, DY + 1, DZ1 - 1, 'barrel'); b.set(DX0 + 2, DY + 1, DZ1 - 1, 'chest', 'chest')
    b.set(9, DY + 1, DZ0 + 1, 'barrel'); b.set(8, DY + 1, DZ0 + 1, 'barrel'); b.set(9, DY + 2, DZ0 + 1, 'barrel')
    b.set(8, DY + 1, DZ0 + 2, 'hay_block')
    b.set(9, DY + 3, DZ0 + 1, 'flower_pot', 'pot', plant='poppy')
    # a pennant flag on the north-east corner post: orange over white, with a pointed tail
    for y in range(DY + 2, DY + 7): b.set(DX1, y, DZ0, 'spruce_planks', 'fence')
    for (dx, y, k) in ((1, DY + 6, 'orange_wool'), (2, DY + 6, 'orange_wool'), (1, DY + 5, 'white_wool'), (2, DY + 5, 'white_wool')):
        b.set(DX1 + dx, y, DZ0, k)
    b.set(DX1 + 3, DY + 6, DZ0, 'orange_wool', 'stairs', f='W', h='top')
    b.set(DX1 + 3, DY + 5, DZ0, 'white_wool', 'stairs', f='W')
    # two small clouds hugging the deck
    cloud(b, DY - 2, [(DX0 - 0.4, DZ1 - 0.4, 2.0, 2.0), (DX0 + 1.4, DZ1 + 1.4, 1.4, 1.2)], harbor_keep_out)
    cloud(b, DY - 2, [(DX1 + 1.2, DZ0 + 0.4, 1.9, 2.0), (DX1 - 0.8, DZ0 - 0.6, 1.3, 1.2)], harbor_keep_out)

    # ---------------- Pro: a tower round the legs, harbor house, storage, rocks, cloud bank
    with b.tier(2):
        for y in range(0, DY):
            for x in range(TX0 + 1, TX1):
                for z in (TZ0, TZ1):
                    if not (x == cx and z == TZ1 and y < 2): b.set(x, y, z, 'stone_bricks')
            for z in range(TZ0 + 1, TZ1):
                for x in (TX0, TX1): b.set(x, y, z, 'stone_bricks')
        for (x, y, z) in ((TX0 + 1, 1, TZ0), (TX1, 0, TZ0 + 2), (TX0, 1, TZ1 - 1), (cx + 1, 0, TZ1), (TX1, 2, cz + 1), (cx - 1, 1, TZ1)):
            b.set(x, y, z, 'mossy_stone_bricks')
        door(b, cx, 0, TZ1, 'spruce_door', 'S')
        for (x, z) in ((cx, TZ1), (TX1, cz), (cx, TZ0), (TX0, cz)):
            b.set(x, 4, z, 'glass', 'pane')
        b.set(cx - 1, 4, TZ1 + 1, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
        b.set(cx + 1, 4, TZ1 + 1, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
        b.set(TX1 + 1, 4, cz - 1, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
        b.set(TX1 + 1, 4, cz + 1, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
        # stone plinth
        for x in range(TX0 - 1, TX1 + 2):
            b.set(x, 0, TZ0 - 1, 'stone_bricks', 'stairs', f='S')
            if x != cx: b.set(x, 0, TZ1 + 1, 'stone_bricks', 'stairs', f='N')
        for z in range(TZ0, TZ1 + 1):
            b.set(TX0 - 1, 0, z, 'stone_bricks', 'stairs', f='E')
            b.set(TX1 + 1, 0, z, 'stone_bricks', 'stairs', f='W')
        # cornice under the deck
        for x in range(TX0, TX1 + 1):
            put(b, x, DY - 1, TZ0 - 1, 'spruce_planks', 'stairs', f='S', h='top')
            put(b, x, DY - 1, TZ1 + 1, 'spruce_planks', 'stairs', f='N', h='top')
        for z in range(TZ0, TZ1 + 1):
            put(b, TX0 - 1, DY - 1, z, 'spruce_planks', 'stairs', f='E', h='top')
            put(b, TX1 + 1, DY - 1, z, 'spruce_planks', 'stairs', f='W', h='top')

        # harbor house with a copper gable roof; the gable end faces the piers
        y0 = DY + 1
        for y in range(y0, y0 + 3):
            for x in range(HX0, HX1 + 1):
                for z in (HZ0, HZ1): b.set(x, y, z, 'white_wool')
            for z in range(HZ0, HZ1 + 1):
                for x in (HX0, HX1): b.set(x, y, z, 'white_wool')
            for (x, z) in ((HX0, HZ0), (HX1, HZ0), (HX0, HZ1), (HX1, HZ1)):
                b.set(x, y, z, 'stripped_spruce_log')
        door(b, HX1, y0, cz, 'spruce_door', 'E')
        for (x, z) in ((HX1, cz - 1), (HX1, cz + 1), (HX0, cz), (4, HZ0), (5, HZ0)):
            b.set(x, y0 + 1, z, 'glass', 'pane')
        gable(b, HX0, HX1, HZ0, HZ1, y0 + 3, ROOF, o=1, gable_mat='spruce_planks', axis='x')
        b.set(HX1, y0 + 4, cz, 'stripped_spruce_log', a='x'); b.set(HX0, y0 + 4, cz, 'stripped_spruce_log', a='x')
        b.set(HX1 + 1, y0 + 3, cz, 'spruce_planks', 'fence')
        b.set(HX1 + 1, y0 + 2, cz, 'copper_lantern', 'lantern', hang=True)
        # storage nook under the south eave: shelves, barrels, a chest
        b.set(4, y0 + 1, HZ1 + 1, 'spruce_shelf', 'shelf', side='N')
        b.set(5, y0 + 1, HZ1 + 1, 'spruce_shelf', 'shelf', side='N')
        put(b, 3, y0, HZ1 + 1, 'barrel'); put(b, 4, y0, HZ1 + 1, 'chest', 'chest'); put(b, 5, y0, HZ1 + 1, 'barrel')
        b.set(DX1, DY - 1, DZ1, 'copper_chain', 'chain'); b.set(DX1, DY - 2, DZ1, 'copper_lantern', 'lantern', hang=True)
        # inside the harbor house: a map table, a logbook and shelves for harnesses and leads
        b.set(4, y0, HZ0 + 1, 'cartography_table'); b.set(5, y0, HZ0 + 1, 'barrel')
        b.set(4, y0 + 1, HZ1 - 1, 'spruce_shelf', 'shelf', side='S'); b.set(5, y0 + 1, HZ1 - 1, 'spruce_shelf', 'shelf', side='S')
        b.set(4, y0, HZ1 - 1, 'lectern', 'lectern', f='E', book=True)
        b.set(3, y0 + 1, HZ1 + 1, 'flower_pot', 'pot', plant='dandelion')

        # island: rocks and flowers
        for (x, z) in ((2, 11), (10, 5)):
            b.set(x, 0, z, 'mossy_cobblestone')
        b.set(3, 0, 12, 'cobblestone', 'slab'); b.set(10, 0, 6, 'stone', 'slab')
        for (x, z, k) in ((3, 9, 'poppy'), (9, 9, 'dandelion'), (4, 12, 'oxeye_daisy'), (2, 6, 'cornflower'), (2, 7, 'allium')):
            if (x, 0, z) not in b.c: b.set(x, 0, z, k, 'flower')
        for (x, z) in ((5, 12), (8, 12), (2, 9), (10, 8)):
            if (x, 0, z) not in b.c: b.set(x, 0, z, 'short_grass', 'tuft')

        # cloud bank round the tower, just under the deck
        cloud(b, 4, [(-1.2, 7.6, 1.8, 2.0), (-0.4, 5.8, 1.2, 1.0)], harbor_keep_out)
        cloud(b, 4, [(6.8, 0.6, 1.9, 2.0), (4.6, 1.6, 1.2, 1.0)], harbor_keep_out)

    # ---------------- Legend: a lookout tower with a crow's nest deck, flags, a pier, a tree
    with b.tier(3):
        LX0, LX1, LZ0, LZ1, LTOP = 0, 2, 1, 3, 14       # lookout walls, crow's nest floor
        lx, lz = 1, 2
        for (x, z) in ellipse(1.2, 2.4, 2.2, 2.0): put(b, x, -1, z, 'grass_block')
        for (x, z) in ellipse(1.0, 2.0, 3.0, 2.6) | ellipse(3.0, 4.0, 2.2, 2.2): put(b, x, -1, z, 'sand')
        for y in range(0, LTOP):
            for x in range(LX0, LX1 + 1):
                for z in range(LZ0, LZ1 + 1):
                    if x in (LX0, LX1) or z in (LZ0, LZ1):
                        corner = x in (LX0, LX1) and z in (LZ0, LZ1)
                        if corner: b.set(x, y, z, 'spruce_log')
                        elif y == 6: b.set(x, y, z, 'stripped_spruce_log', a=('x' if z in (LZ0, LZ1) else 'z'))
                        else: b.set(x, y, z, 'stone_bricks' if y < 6 else 'white_wool')
            b.set(lx, y, lz, 'ladder', 'ladder', side='W')
        door(b, lx, 0, LZ1, 'spruce_door', 'S')
        door(b, LX1, DY + 1, lz, 'spruce_door', 'E')
        # windows (none on the west wall: the ladder hangs on it)
        for (x, y, z) in ((lx, 4, LZ1), (LX1, 11, lz), (LX1, 4, lz), (lx, 11, LZ0), (lx, 4, LZ0)):
            b.set(x, y, z, 'glass', 'pane')
        b.set(LX0, 1, LZ1 - 1, 'mossy_stone_bricks'); b.set(LX1, 2, LZ0 + 1, 'mossy_stone_bricks')
        # a little landing from the lookout door to the deck, with a railing
        for x in (LX1 + 1, LX1 + 2):
            for z in range(LZ0, LZ1 + 1): b.set(x, DY, z, 'spruce_planks')
        for z in range(LZ0, LZ1 + 1): b.set(LX1 + 2, DY + 1, z, RAIL, 'fence')
        b.set(LX1 + 1, DY + 1, LZ0, RAIL, 'fence')
        b.set(LX1 + 1, DY + 1, DZ0, None)
        # crow's nest: a second deck with a railing, a little copper roof and a flag
        for x in range(LX0 - 1, LX1 + 2):
            for z in range(LZ0 - 1, LZ1 + 2):
                ex = x in (LX0 - 1, LX1 + 1); ez = z in (LZ0 - 1, LZ1 + 1)
                b.set(x, LTOP, z, 'stripped_spruce_log' if (ex or ez) else 'spruce_planks',
                      a=('y' if ex and ez else ('x' if ez else 'z')))
                if ex or ez:
                    b.set(x, LTOP + 1, z, RAIL, 'fence')
        b.set(lx, LTOP, lz, 'spruce_trapdoor', 'trapdoor', h='top')
        for (x, z) in ((LX0 - 1, LZ0 - 1), (LX1 + 1, LZ0 - 1), (LX0 - 1, LZ1 + 1), (LX1 + 1, LZ1 + 1)):
            b.set(x, LTOP + 2, z, RAIL, 'fence')
        hip(b, LX0, LX1, LZ0, LZ1, LTOP + 3, ROOF, o=1)
        b.fill(LX0, LTOP + 3, LZ0, LX1, LTOP + 3, LZ1, 'spruce_planks')   # a ceiling the roof's upper ring sits on
        b.set(lx, LTOP + 4, lz, 'spruce_planks')           # holds the flag pole, hidden inside the roof
        for y in range(LTOP + 5, LTOP + 9): b.set(lx, y, lz, 'spruce_planks', 'fence')
        # a pennant flag: orange over white, with a pointed tail
        for (dx, dy, k) in ((1, 8, 'orange_wool'), (2, 8, 'orange_wool'), (1, 7, 'white_wool'), (2, 7, 'white_wool')):
            b.set(lx + dx, LTOP + dy, lz, k)
        b.set(lx + 3, LTOP + 8, lz, 'orange_wool', 'stairs', f='W', h='top')
        b.set(lx + 3, LTOP + 7, lz, 'white_wool', 'stairs', f='W')
        b.set(lx, LTOP - 2, LZ1 + 1, 'blue_banner', 'panel', side='N')
        b.set(lx, LTOP - 3, LZ1 + 1, 'blue_banner', 'panel', side='N')

        # copper lightning rod on the house roof, on a chiseled copper block at the ridge
        b.set(HX1, DY + 7, cz, 'waxed_weathered_chiseled_copper')
        b.set(HX1, DY + 8, cz, 'waxed_lightning_rod', 'rod')
        # pier with a lamp
        pz = max(z for (x, y, z) in b.c if x == cx and y == -1) + 1
        for z in range(pz, pz + 3): b.set(cx, -1, z, 'spruce_planks')
        b.set(cx - 1, -1, pz + 2, 'spruce_log'); b.set(cx + 1, -1, pz + 2, 'spruce_log')
        b.set(cx + 1, 0, pz + 2, RAIL, 'fence'); b.set(cx + 1, 1, pz + 2, 'copper_lantern', 'lantern')
        b.set(cx - 1, 0, pz + 2, RAIL, 'fence')
        # a small tree and bushes
        b.set(2, 0, 10, 'azalea', 'plant')
        b.set(10, 0, 9, 'flowering_azalea', 'plant')
        # high clouds drifting by
        cloud(b, 11, [(16.2, 1.0, 1.9, 2.0), (14.6, 1.6, 1.3, 1.0)], harbor_keep_out)
        cloud(b, 12, [(-1.8, 8.8, 1.7, 2.0), (-0.6, 10.4, 1.2, 1.0)], harbor_keep_out)
    return b


# ================================================================ COPPER WORKSHOP
# A T-shaped workshop. Shed (Starter): walls x 4..8, z 4..9, steep roof, door to the south.
# Hall (Pro): walls x 0..12, z 0..4 behind it, with a low roof. Walls rise from orange to teal:
# the four copper stages, waxed so the colours stay. The golem's spot is beside the shed.
# Chests that touch join into one big chest, so every sorting chest has a block between it and the next.

STAGES = ['waxed_copper_block', 'waxed_exposed_copper', 'waxed_weathered_copper', 'waxed_oxidized_copper']
CUT = 'waxed_cut_copper'
CUTS = ['waxed_cut_copper', 'waxed_exposed_cut_copper', 'waxed_weathered_cut_copper', 'waxed_oxidized_cut_copper']
PIL = 'tuff_bricks'
WSX0, WSX1, WSZ0, WSZ1 = 4, 8, 4, 9          # shed walls
WHX0, WHX1, WHZ0, WHZ1 = 0, 12, 0, 4         # hall walls
GOLEM = (10, 0, 6)                       # the copper golem's spot, by the sorting row


def cu_wall(b, x, y, z):
    b.set(x, y, z, STAGES[min(3, max(0, y - 1))])


def wall_ring(b, x0, z0, x1, z1, y, fn):
    for x in range(x0, x1 + 1):
        for z in (z0, z1): fn(x, y, z)
    for z in range(z0 + 1, z1):
        for x in (x0, x1): fn(x, y, z)


def copper_workshop():
    b = Build('Copper Workshop')

    # ---------------- Starter: a small copper shed with a sorting corner
    b.fill(WSX0, 0, WSZ0, WSX1, 0, WSZ1, 'polished_tuff')
    for y in range(1, 5):
        wall_ring(b, WSX0, WSZ0, WSX1, WSZ1, y, lambda x, y, z: cu_wall(b, x, y, z))
        for (x, z) in ((WSX0, WSZ0), (WSX1, WSZ0), (WSX0, WSZ1), (WSX1, WSZ1)): b.set(x, y, z, PIL)
    # steep roof, ridge north-south, overhang to the sides and the front
    for i, (y, xa, xb) in enumerate(((5, WSX0 - 1, WSX1 + 1), (6, WSX0, WSX1), (7, WSX0 + 1, WSX1 - 1))):
        for z in range(WSZ0, WSZ1 + 2):
            b.set(xa, y, z, CUTS[i], 'stairs', f='E'); b.set(xb, y, z, CUTS[i], 'stairs', f='W')
        for z in (WSZ0, WSZ1):
            for x in range(xa + 1, xb): b.set(x, y, z, PIL if i == 0 else CUTS[i])
    for z in range(WSZ0, WSZ1 + 1): b.set(6, 8, z, CUTS[3], 'slab')
    b.set(6, 8, WSZ1 + 1, 'waxed_oxidized_chiseled_copper')        # a finial for the lightning rod
    # plinth (the east side is the sorting row)
    for x in range(WSX0 - 1, WSX1 + 2):
        if x != 6: b.set(x, 0, WSZ1 + 1, 'polished_tuff', 'slab')
    for z in range(WSZ0, WSZ1 + 1):
        b.set(WSX0 - 1, 0, z, 'polished_tuff', 'slab')
    # front: copper door under a little canopy, two bulbs, chiseled copper sign, grate window up in the gable
    door(b, 6, 1, WSZ1, 'waxed_copper_door', 'S')
    b.set(5, 3, WSZ1, 'waxed_copper_bulb_lit'); b.set(7, 3, WSZ1, 'waxed_copper_bulb_lit')
    b.set(6, 5, WSZ1, 'waxed_chiseled_copper')
    for x in (5, 6, 7): b.set(x, 4, WSZ1 + 1, 'waxed_copper_trapdoor', 'trapdoor', h='top')
    b.set(6, 6, WSZ1, 'waxed_copper_grate')
    # east side: a grate window
    for z in (6, 7):
        for y in (2, 3): b.set(WSX1, y, z, 'waxed_copper_grate')
    # sorting row on the east side, under a copper awning. Drop loot in the copper chest at the front.
    # The golem carries it to the chest that already holds the same thing. A bulb sits between each
    # pair of chests so they never join up; the item frames are labels for you.
    for z in range(WSZ0, WSZ1 + 1): b.set(WSX1 + 1, 3, z, 'waxed_copper_trapdoor', 'trapdoor', h='top')
    b.set(WSX1 + 1, 0, WSZ1, 'waxed_copper_chest', 'chest')
    for z, item in ((WSZ0, 'iron_block'), (WSZ0 + 2, 'gold_block'), (WSZ0 + 4, 'diamond_block')):
        b.set(WSX1 + 1, 0, z, 'chest', 'chest')
        b.set(WSX1 + 1, 1, z, 'item_frame', 'item_frame', side='W', show=item)
    for z in (WSZ0 + 1, WSZ0 + 3): b.set(WSX1 + 1, 0, z, 'waxed_copper_bulb_lit')
    # inside: a workbench corner
    b.set(WSX0 + 1, 1, WSZ0 + 1, 'crafting_table'); b.set(WSX1 - 1, 1, WSZ0 + 1, 'barrel')
    b.set(WSX0 + 1, 3, 6, 'oak_shelf', 'shelf', side='W'); b.set(WSX0 + 1, 3, 7, 'oak_shelf', 'shelf', side='W')
    b.set(WSX1 - 1, 1, WSZ1 - 1, 'waxed_copper_chest', 'chest')
    b.set(6, 0, WSZ1 + 1, 'polished_tuff', 'stairs', f='N')
    b.set(6, 9, WSZ1 + 1, 'waxed_lightning_rod', 'rod')
    # a tuff path, a flowering bush and two flowers
    for z in range(WSZ1 + 1, WSZ1 + 4): b.set(6, -1, z, 'polished_tuff')
    b.set(4, 0, WSZ1 + 2, 'flowering_azalea', 'plant')
    b.set(8, 0, WSZ1 + 2, 'oxeye_daisy', 'flower'); b.set(10, 0, WSZ1, 'cornflower', 'flower')

    # ---------------- Pro: the long hall behind, a yard and workbenches
    with b.tier(2):
        for x in range(WHX0, WHX1 + 1):
            for z in range(WHZ0, WHZ1 + 1): put(b, x, 0, z, 'polished_tuff')
        for y in range(1, 5):
            wall_ring(b, WHX0, WHZ0, WHX1, WHZ1, y, lambda x, y, z: None if (x, y, z) in b.c else cu_wall(b, x, y, z))
            for (x, z) in ((WHX0, WHZ0), (WHX1, WHZ0), (WHX0, WHZ1), (WHX1, WHZ1)): b.set(x, y, z, PIL)
        # low roof: stairs and top slabs, half a block per step
        def skip(x, z): return WSX0 - 1 <= x <= WSX1 + 1 and z >= WSZ0
        prof = [(-1, 5, 'stairs', 'S', 0), (0, 5, 'top', None, 1), (1, 6, 'stairs', 'S', 2), (2, 6, 'top', None, 3),
                (3, 6, 'stairs', 'N', 2), (4, 5, 'top', None, 1), (5, 5, 'stairs', 'N', 0)]
        for (z, y, kind, f, st) in prof:
            for x in range(WHX0 - 1, WHX1 + 2):
                if skip(x, z) or (x, y, z) in b.c: continue
                if x in (WHX0, WHX1) and kind == 'top': b.set(x, y, z, CUTS[st])
                elif kind == 'stairs': b.set(x, y, z, CUTS[st], 'stairs', f=f)
                else: b.set(x, y, z, CUTS[st], 'slab', h='top')
        for x in (WHX0, WHX1):
            for z in range(WHZ0 + 1, WHZ1): b.set(x, 5, z, PIL)
        # two little dormers with grate windows on the front of the roof
        for dx in (2, 10):
            b.set(dx, 6, WHZ1, 'waxed_exposed_copper_grate')
            b.set(dx - 1, 6, WHZ1, CUTS[1], 'stairs', f='E'); b.set(dx + 1, 6, WHZ1, CUTS[1], 'stairs', f='W')
            b.set(dx, 7, WHZ1, CUTS[2], 'slab')
            b.set(dx, 6, WHZ1 - 1, CUTS[2]); b.set(dx, 7, WHZ1 - 1, CUTS[3], 'slab')
        # plinth round the hall
        for x in range(WHX0 - 1, WHX1 + 2):
            b.set(x, 0, WHZ0 - 1, 'polished_tuff', 'slab')
            if not (WSX0 - 1 <= x <= WSX1 + 1): b.set(x, 0, WHZ1 + 1, 'polished_tuff', 'slab')
        for z in range(WHZ0, WHZ1 + 1):
            b.set(WHX0 - 1, 0, z, 'polished_tuff', 'slab'); b.set(WHX1 + 1, 0, z, 'polished_tuff', 'slab')
        # pilasters that stand out from the long back wall, with lanterns between them
        for x in (4, 8):
            for y in range(0, 5): b.set(x, y, WHZ0 - 1, PIL)
            for y in range(1, 5): b.set(x, y, WHZ0, PIL)
        for x in (2, 6, 10):
            b.set(x, 4, WHZ0 - 1, 'waxed_copper_lantern', 'lantern', hang=True)
        # south front of the hall: windows of copper bars, with copper trapdoor hoods
        for x in (1, 2, 10, 11):
            for y in (2, 3): b.set(x, y, WHZ1, 'waxed_copper_bars', 'pane')
            b.set(x, 4, WHZ1 + 1, 'waxed_copper_trapdoor', 'trapdoor', h='top')
        for z in (1, 2, 3):
            for y in (2, 3): b.set(WHX1, y, z, 'waxed_copper_bars', 'pane') if z != 2 else b.set(WHX1, y, z, 'waxed_copper_grate')
        # inside: two more sorting rows (a bulb between the chests), copper chests, shelves, workbench
        for x, item in ((1, 'cobblestone'), (3, 'iron_block'), (9, 'redstone_block'), (11, 'coal_block')):
            b.set(x, 1, WHZ0 + 1, 'chest', 'chest')
            b.set(x, 2, WHZ0 + 1, 'item_frame', 'item_frame', side='N', show=item)
        for x in (2, 10): b.set(x, 1, WHZ0 + 1, 'waxed_copper_bulb_lit')
        b.set(4, 1, 1, 'waxed_copper_chest', 'chest'); b.set(8, 1, 1, 'waxed_exposed_copper_chest', 'chest')
        for x in (5, 6, 7): b.set(x, 2, WHZ0 + 1, 'oak_shelf', 'shelf', side='N')
        b.set(1, 1, 3, 'lit_blast_furnace', f='E'); b.set(11, 1, 3, 'smithing_table')
        b.set(11, 1, 2, 'anvil', 'anvil'); b.set(1, 1, 2, 'crafting_table')
        # door from the shed into the hall
        b.set(6, 1, WSZ0, None); b.set(6, 2, WSZ0, None)
        # yard: barrels, a grindstone corner, flowers
        b.set(12, 0, 5, 'barrel'); b.set(12, 1, 5, 'barrel'); b.set(12, 0, 6, 'barrel')
        # flower boxes under the west windows of the hall
        for x in (1, 2):
            b.set(x, 1, WHZ1 + 1, 'moss_block')
            b.set(x, 1, WHZ1 + 2, 'waxed_copper_trapdoor', 'trapdoor', open=True, side='N')
        for (x, k) in ((1, 'poppy'), (2, 'dandelion')):
            b.set(x, 2, WHZ1 + 1, k, 'flower')
        b.set(1, 0, 8, 'grindstone', 'grindstone', f='S'); b.set(2, 0, 8, 'stonecutter', 'stonecutter', f='S')
        b.set(0, 0, 8, 'anvil', 'anvil')
        for (x, y, z) in ((1, -1, 7), (2, -1, 7), (0, -1, 7), (1, -1, 9), (2, -1, 9), (0, -1, 9), (3, -1, 8), (3, -1, 7)):
            b.set(x, y, z, 'polished_tuff')
        for (x, z, k) in ((0, 6, 'poppy'), (2, 10, 'dandelion'), (11, 8, 'allium')):
            b.set(x, 0, z, k, 'flower')
        b.set(1, 0, 6, 'azalea', 'plant'); b.set(2, 0, 6, 'short_grass', 'tuft')
        # chimney over the blast furnace, with a campfire for smoke
        for y in range(5, 8): b.set(1, y, 3, PIL)
        b.set(1, 8, 3, 'campfire', 'campfire')

    # ---------------- Legend: a clock tower, a crest of lightning rods, lamps and a yard fence
    with b.tier(3):
        # the tower stands on the two back pilasters, so from behind it rises from the ground
        KX0, KX1, KZ0, KZ1, KY0, KY1 = 4, 8, -1, 3, 5, 12
        for y in range(KY0, KY1 + 1):
            for x in range(KX0, KX1 + 1):
                for z in range(KZ0, KZ1 + 1):
                    if x in (KX0, KX1) or z in (KZ0, KZ1):
                        corner = x in (KX0, KX1) and z in (KZ0, KZ1)
                        b.set(x, y, z, PIL if corner or y == KY0 else 'waxed_oxidized_copper')
                    else:
                        b.set(x, y, z, None)
        # clock faces (south and east): lit copper bulbs at 12, 3, 6 and 9 o'clock round a clock
        # in a glow item frame, with chiseled copper between them
        def face(cx, cy, cz, side):
            for du in (-1, 0, 1):
                for dv in (-1, 0, 1):
                    p = (cx + du, cy + dv, cz) if side in ('N', 'S') else (cx, cy + dv, cz + du)
                    lit = (du == 0) != (dv == 0)
                    b.set(*p, 'waxed_oxidized_copper_bulb_lit' if lit else 'waxed_oxidized_chiseled_copper')
            dx, dz = DIRS[side]
            b.set(cx + dx, cy, cz + dz, 'glow_item_frame', 'item_frame', side=OPP[side], show='gold_block')
        face(6, 10, KZ1, 'S'); face(KX1, 10, 1, 'E')
        # tall windows of copper bars on the north and west sides, with a chiseled copper sill
        for y in (9, 10, 11):
            b.set(6, y, KZ0, 'waxed_oxidized_copper_bars', 'pane'); b.set(KX0, y, 1, 'waxed_oxidized_copper_bars', 'pane')
        b.set(6, 8, KZ0, 'waxed_oxidized_chiseled_copper'); b.set(KX0, 8, 1, 'waxed_oxidized_chiseled_copper')
        # belfry trim and a copper pyramid roof with a lightning rod spire
        for x in range(KX0 - 1, KX1 + 2):
            b.set(x, KY1, KZ0 - 1, PIL, 'stairs', f='S', h='top'); b.set(x, KY1, KZ1 + 1, PIL, 'stairs', f='N', h='top')
        for z in range(KZ0, KZ1 + 1):
            b.set(KX0 - 1, KY1, z, PIL, 'stairs', f='E', h='top'); b.set(KX1 + 1, KY1, z, PIL, 'stairs', f='W', h='top')
        for i, y in enumerate((KY1 + 1, KY1 + 2, KY1 + 3)):
            X0, X1, Z0, Z1 = KX0 - 1 + i, KX1 + 1 - i, KZ0 - 1 + i, KZ1 + 1 - i
            st = CUTS[1 + i]
            for x in range(X0, X1 + 1):
                b.set(x, y, Z0, st, 'stairs', f='S'); b.set(x, y, Z1, st, 'stairs', f='N')
            for z in range(Z0 + 1, Z1):
                b.set(X0, y, z, st, 'stairs', f='E'); b.set(X1, y, z, st, 'stairs', f='W')
            if i:   # a full block under each upper ring, so it sits on something, not on air
                for x in range(X0, X1 + 1):
                    for z in range(Z0, Z1 + 1):
                        if x in (X0, X1) or z in (Z0, Z1): b.set(x, y - 1, z, st)
        b.set(6, KY1 + 3, 1, CUTS[3])
        b.set(6, KY1 + 4, 1, 'waxed_oxidized_chiseled_copper')
        b.set(6, KY1 + 5, 1, 'waxed_lightning_rod', 'rod')
        # lightning rod crest along the hall ridge
        for x in (1, 11):
            b.set(x, 7, 2, 'waxed_lightning_rod', 'rod')
        # a low tuff brick wall round the front yard, with a gate gap for the path and two lamp posts
        FZ, FX0, FX1 = WSZ1 + 3, WHX0 - 1, WHX1 + 1
        for x in range(FX0, FX1 + 1):
            if not 5 <= x <= 7: b.set(x, 0, FZ, PIL, 'wall')
        for z in range(WHZ1 + 2, FZ):
            b.set(FX0, 0, z, PIL, 'wall'); b.set(FX1, 0, z, PIL, 'wall')
        for x in (4, 8):
            b.set(x, 1, FZ, PIL, 'wall'); b.set(x, 2, FZ, 'waxed_copper_lantern', 'lantern')
        for (x, z, k) in ((5, FZ - 1, 'allium'), (7, FZ - 1, 'poppy'), (12, 10, 'poppy')):
            b.set(x, 0, z, k, 'flower')
        b.set(2, 0, FZ - 1, 'wildflowers', 'plant'); b.set(11, 0, FZ - 1, 'wildflowers', 'plant')
    return b


BUILDS = {'happy-ghast-harbor': sky_harbor, 'copper-workshop': copper_workshop}
WIKI = 'https://minecraft.wiki/w/'
CHANGELOG = 'https://www.minecraft.net/en-us/article/minecraft--bedrock-edition-26-50-changelog'

META = {
    'happy-ghast-harbor': dict(
        title='Happy Ghast Sky Harbor', kind='big', diff=2, mode='Survival',
        pitch='A dock up in the clouds where your happy ghast can park.',
        blurb=('Build a harbor in the sky for your happy ghast. '
               'Climb the ladder to a deck with copper lanterns and soft wool clouds. '
               'Your ghast parks in the empty 4 by 4 by 4 spot between the two piers. '
               'Then you step across onto its back.'),
        tiers=['Starter: a deck on tall legs, two piers, a flag and a little island.',
               'Pro: a stone tower round the legs. Add a harbor house with a copper roof, shelves and a cloud bank.',
               "Legend: a lookout tower with a crow's nest. Add another flag, a banner, a pier and drifting clouds."],
        teaches=['Soft clouds with a gray wool underside', 'A deck with a log frame', 'Gable and hip roofs',
                 'Leaving the right space for a big mob'],
        tips=[('start', 'Get a happy ghast',
               'Find a Dried Ghast in a Soul Sand Valley. Put it in water. '
               'After about 20 minutes, a baby ghast comes out. It grows into a happy ghast.'),
              ('pro', 'Make a Harness',
               'Craft a Harness from leather, glass and wool. Put it on a grown-up happy ghast so you can ride it.'),
              ('pro', 'Tie it up',
               'Use a lead on your happy ghast, then use the lead on a fence post. Now it waits by the dock.'),
              ('pro', 'Floating clouds',
               'A new block must touch a block that is already there. '
               'So build a dirt bridge out to where each cloud goes. '
               'Place the cloud against the dirt, then break the dirt away.'),
              ('know', 'It holds still',
               'When someone stands on top of a happy ghast, it stops moving. Up to four players can ride one.'),
              ('know', 'Rain and clouds help',
               'A happy ghast heals faster in rain or snow, or up high between Y 187 and 196. '
               'It must see the sky, so keep its spot open.')],
        challenge='Make it yours: Tint the clouds with Pink Wool Slabs for a sunset. Or paint the flags your colors.',
        dad=("Dad's Corner: Measure the parking spot together. Is it 4 blocks wide, 4 deep and 4 tall? "
             'Check that nothing pokes into it, then ride over and park.'),
        needs='26.50',
        new_blocks=['White Wool Slab', 'White Wool Stairs', 'Light Gray Wool Slab', 'Orange Wool Stairs',
                    'Copper Lantern', 'Copper Chain', 'Spruce Shelf'],
        palette=['Spruce Planks', 'Stone Bricks', 'White Wool Slab', 'Waxed Weathered Cut Copper Stairs', 'Pale Oak Fence'],
        time=0.42,
        empty=[(GX, GY, GZ, 4, 4, 4, 'Happy ghast parking')],
        ground='water',
        order=2,
        sources=[WIKI + 'Dried_Ghast', WIKI + 'Happy_Ghast', WIKI + 'Harness', WIKI + 'Lead', CHANGELOG,
                 WIKI + 'The_Copper_Age', WIKI + 'Opacity/Placement', WIKI + 'Sneaking'],
    ),
    'copper-workshop': dict(
        title='Copper Workshop', kind='big', diff=2, mode='Creative',
        pitch='A clanky copper workshop where a golem sorts your loot.',
        blurb=('Copper changes color as it ages, from shiny orange to sea green. '
               'This workshop shows all four colors on purpose: orange at the bottom, green at the top. '
               'Put one item in each chest first. Then drop loot in the Copper Chest. '
               'A copper golem carries each thing to the chest that already holds it. '
               'The frames are labels for you.'),
        tiers=['Starter: a little copper shed with a steep roof. Add glowing bulbs, a row of sorting chests and a path.',
               'Pro: a long hall with copper bar windows, roof windows, a workbench, a chimney and flower boxes.',
               'Legend: a clock tower with a lightning rod spire. A low wall with lamp posts goes round the yard.'],
        teaches=['Color gradients with the four copper stages', 'Waxing copper so it keeps its color',
                 'A low roof from stairs and slabs', 'Labels with item frames'],
        tips=[('start', 'Make a copper golem',
               'Place a Block of Copper and put a Carved Pumpkin on top. '
               'A golem pops out, and the copper turns into a Copper Chest.'),
              ('know', 'How it sorts',
               'The golem takes up to 16 items from a Copper Chest. '
               'It puts them in a plain chest that is empty or already holds the same thing.'),
              ('warn', 'Chests join up',
               'Two chests side by side join into one big chest. '
               'So leave a block between them, like a copper bulb. Then each chest keeps its own things.'),
              ('pro', 'Wax it',
               'Use honeycomb on copper to wax it. Waxed copper never changes color, so your stripes stay put.'),
              ('warn', 'Wax your golem too',
               'A copper golem slowly turns green. Soon after it is all green, it turns into a statue. '
               'Use honeycomb on it so it never stops.'),
              ('pro', 'Light the bulbs',
               'A bulb starts dark. Put a button on it and press once. It stays lit.'),
              ('know', 'Bulbs get dimmer',
               'A lit Copper Bulb gives light level 15. As it turns green, that drops to 12, then 8, then 4.'),
              ('pro', 'Tell the time',
               'Put a Clock in the Glow Item Frame. It shows the time of day in your world.')],
        challenge=('Make it yours: Add more chests to the sorting row, with a block between each. '
                   'Put a different item in each chest, and the same item in its frame.'),
        dad=("Dad's Corner: Hand your builder a pile of mixed loot. "
             'Guess together which chest the golem will pick for each thing, then watch it work.'),
        needs='1.21.111',
        new_blocks=['Waxed Copper Chest', 'Waxed Copper Bars', 'Waxed Copper Lantern', 'Oak Shelf', 'Waxed Lightning Rod'],
        palette=['Tuff Bricks', 'Waxed Block of Copper', 'Waxed Oxidized Copper', 'Waxed Cut Copper Stairs'],
        time=0.4,
        empty=[(GOLEM[0], GOLEM[1], GOLEM[2], 1, 2, 1, 'Copper golem spot')],
        ground='grass_block',
        order=5,
        sources=[WIKI + 'Copper_Golem', WIKI + 'Chest', WIKI + 'Block_of_Copper', WIKI + 'Copper_Bulb', WIKI + 'Clock',
                 WIKI + 'The_Copper_Age'],
    ),
}
