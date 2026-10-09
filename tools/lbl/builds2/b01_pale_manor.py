# Spooky Pale Garden Manor: the October showpiece of Layer by Layer 2.
# A gray-and-white pale oak manor with a deepslate roof, a resin brick chimney,
# eyeblossom gardens and glowing windows. Starter is the small two-storey front house,
# Pro grows it into the manor, Legend adds the witch-hat tower, a hedge maze and more lights.
import random
from lbl import *

# palette
P = 'pale_oak_planks'      # walls
L = 'pale_oak_log'         # dark frame: pillars and beams
SL = 'stripped_pale_oak_log'
R = 'deepslate_tiles'       # roof
BASE = 'polished_deepslate' # plinth
RES = 'resin_bricks'       # trim and chimney
PROF = [0, 2, 3, 4, 5]      # roof steps: steep at the eaves, then 45 degrees
TREE_SEED = 4


class Canvas:
    """Records every set per tier, then writes the Build so higher tiers can replace or remove
    lower-tier blocks cleanly (the order inside one tier always wins, last write wins)."""
    def __init__(self):
        self.ops = {}; self.t = 1; self.roofs = {}
    def tier(self, t):
        c = self
        class _T:
            def __enter__(s): s.prev = c.t; c.t = t
            def __exit__(s, *a): c.t = s.prev
        return _T()
    def set(self, x, y, z, key, s='full', **kw):
        self.ops.setdefault((x, y, z), []).append((self.t, None if key is None else dict(b=key, s=s, **kw)))
    def get(self, x, y, z, t=None):
        t = self.t if t is None else t; st = None
        for tt, d in self.ops.get((x, y, z), []):
            if tt <= t: st = d
        return st
    def fill(self, x0, y0, z0, x1, y1, z1, key, s='full', **kw):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set(x, y, z, key, s, **kw)
    def walls(self, x0, z0, x1, z1, y0, y1, key, s='full', **kw):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, z0, key, s, **kw); self.set(x, y, z1, key, s, **kw)
            for z in range(z0 + 1, z1):
                self.set(x0, y, z, key, s, **kw); self.set(x1, y, z, key, s, **kw)
    def door(self, x, y, z, key, side):
        self.set(x, y, z, key, 'door', side=side, h='lower'); self.set(x, y + 1, z, key, 'door', side=side, h='upper')
    def roof_col(self, x, z, top, low, key, kind, f=None):
        """One column of a roof: full blocks from `low` up to the stair (or slab) on `top`.
        Where two roofs cross, the higher one wins the column; the lower one stays hidden under it."""
        old = self.roofs.get((x, z))
        if old is not None and old == top and kind == 'stairs':
            o = self.get(x, top, z)
            if o is not None and o.get('s') == 'stairs' and o.get('f') != f:
                self.set(x, top, z, key, roof=1)        # where two slopes meet in a valley: a full block, no gap
            return
        if old is not None and old >= top: return
        for y in range(low, top): self.set(x, y, z, key, roof=1)
        if kind == 'slab': self.set(x, top, z, key, 'slab', roof=1)
        else: self.set(x, top, z, key, 'stairs', f=f, roof=1)
        self.roofs[(x, z)] = top
    def roof(self, x, y, z, key, s, **kw):
        self.roof_col(x, z, y, y, key, s, kw.get('f'))
    def build(self, name):
        b = Build(name)
        for p, ops in self.ops.items():
            st = []
            for t in (1, 2, 3):
                cur = None
                for tt, d in ops:
                    if tt <= t: cur = d
                st.append(cur)
            def clean(d):
                if d is None: return None
                d = dict(d); d.pop('roof', None); return d
            s1, s2, s3 = (clean(d) for d in st)
            if s1 is not None:
                b.set(*p, s1['b'], s1['s'], **{k: v for k, v in s1.items() if k not in ('b', 's')})
            if s2 != s1:
                with b.tier(2):
                    if s2 is None: b.set(*p, None)
                    else: b.set(*p, s2['b'], s2['s'], **{k: v for k, v in s2.items() if k not in ('b', 's')})
            if s3 != s2:
                with b.tier(3):
                    if s3 is None: b.set(*p, None)
                    else: b.set(*p, s3['b'], s3['s'], **{k: v for k, v in s3.items() if k not in ('b', 's')})
        return b


def gable_roof(c, x0, x1, z0, z1, yb, axis, mat=R, o=(1, 1, 1, 1), fillmat=P, prof=None):
    """Gable roof over the wall box x0..x1, z0..z1 with the ridge along `axis`.
    o = overhang (west, east, north, south). prof = height of each step from the eave in
    (default 0, 1, 2, ...: a 45 degree roof); a step that rises 2 puts a full block under its stair.
    Returns the ridge height."""
    ow, oe, on, os_ = o
    if axis == 'x':
        lo, hi = z0 - on, z1 + os_; a0, a1 = x0 - ow, x1 + oe; w0, w1 = z0, z1; ends = (x0, x1)
    else:
        lo, hi = x0 - ow, x1 + oe; a0, a1 = z0 - on, z1 + os_; w0, w1 = x0, x1; ends = (z0, z1)
    def H(i):
        if not prof: return yb + i
        return yb + (prof[i] if i < len(prof) else prof[-1] + i - len(prof) + 1)
    cols = {}
    for u in range(lo, hi + 1):
        i = min(u - lo, hi - u); top = H(i); low = H(i - 1) + 1 if i > 0 else top
        if u - lo == hi - u: kind, f = 'slab', None
        elif axis == 'x': kind, f = 'stairs', ('S' if u - lo < hi - u else 'N')
        else: kind, f = 'stairs', ('E' if u - lo < hi - u else 'W')
        cols[u] = (top, low, kind, f)
    for a in range(a0, a1 + 1):
        for u, (top, low, kind, f) in cols.items():
            x, z = (a, u) if axis == 'x' else (u, a)
            c.roof_col(x, z, top, low, mat, kind, f)
    if fillmat:
        for u in range(max(lo, w0), min(hi, w1) + 1):
            top, low, _, _ = cols[u]
            for e in ends:
                for y in range(yb, low):
                    x, z = (e, u) if axis == 'x' else (u, e)
                    c.set(x, y, z, fillmat)
    return max(t for t, _, _, _ in cols.values())


# ------------------------------------------------------------------ layout
# Starter house x 5..11, z 7..11 (door faces south). Main range x 0..16, z 1..7.
SX0, SX1, SZ0, SZ1 = 5, 11, 7, 11
MX0, MX1, MZ0, MZ1 = 0, 16, 1, 7
DOOR_X = 8


def frame_walls(c, x0, z0, x1, z1, top, skip=None):
    """Timber-frame walls: dark plinth, white planks, dark log beams at y3 and y`top`."""
    skip = skip or (lambda x, z: False)
    def put(x, y, z, *a, **k):
        if not skip(x, z): c.set(x, y, z, *a, **k)
    for y in range(0, top + 1):
        for x in range(x0, x1 + 1):
            for z in (z0, z1):
                if y == 0: put(x, y, z, BASE)
                elif y in (3, top): put(x, y, z, L, a='x')
                else: put(x, y, z, P)
        for z in range(z0 + 1, z1):
            for x in (x0, x1):
                if y == 0: put(x, y, z, BASE)
                elif y in (3, top): put(x, y, z, L, a='z')
                else: put(x, y, z, P)
    for x in (x0, x1):
        for z in (z0, z1):
            for y in range(0, top + 1): put(x, y, z, L)


def window(c, x, y, z, h=2):
    for yy in range(y, y + h): c.set(x, yy, z, 'glass', 'pane')


def hang(c, x, y, z, key='lantern'):
    """A lantern hanging under the block above. A top slab has no underside to hang from,
    so that one floor block becomes a full block (its top stays level with the floor)."""
    a = c.get(x, y + 1, z)
    if a is not None and a['s'] == 'slab' and a.get('h') == 'top': c.set(x, y + 1, z, a['b'])
    c.set(x, y, z, key, 'lantern', hang=True)


def moss(c, x, y, z, n=2):
    """Pale hanging moss: n blocks long, hanging below (x, y+1, z)."""
    for i in range(n):
        c.set(x, y - i, z, 'pale_hanging_moss', 'hanging_plant', tip=(i == n - 1))


# ------------------------------------------------------------------ Starter: the front house
def starter(c):
    x0, x1, z0, z1 = SX0, SX1, SZ0, SZ1; cx = DOOR_X
    frame_walls(c, x0, z0, x1, z1, 3)
    for y in (4, 5):                      # upper storey planks (top beam comes from the gable)
        for x in range(x0 + 1, x1): c.set(x, y, z0, P); c.set(x, y, z1, P)
        for z in range(z0 + 1, z1): c.set(x0, y, z, P); c.set(x1, y, z, P)
    for x in (x0, x1):
        for z in (z0, z1): c.fill(x, 0, z, x, 5, z, L)
    # front: door in a dark log frame, two windows down, two up
    c.door(cx, 0, z1, 'pale_oak_door', 'S')
    for x in (cx - 1, cx + 1): c.fill(x, 0, z1, x, 2, z1, L)
    for x in (x0 + 1, x1 - 1): window(c, x, 1, z1); window(c, x, 4, z1)
    window(c, cx, 4, z1)
    # sides and back
    for x in (x0, x1): window(c, x, 1, 9); window(c, x, 4, 9)
    window(c, cx, 4, z0)
    # roof: front gable
    top = gable_roof(c, x0, x1, z0, z1, 6, 'z', o=(1, 1, 0, 1), prof=PROF)
    # both gables: a log beam at the foot, a tall window and a resin badge (the back one ends up inside the Pro roof)
    for z in (z0, z1):
        for x in range(x0, x1 + 1): c.set(x, 6, z, L, a='x')
        window(c, cx, 7, z); c.set(cx, 9, z, 'chiseled_resin_bricks')
    c.set(cx, top, z1 + 1, R); c.set(cx, top + 1, z1 + 1, 'lightning_rod', 'rod')
    # hanging moss at the eaves and eyeblossoms by the walls
    moss(c, x0 - 1, 5, z1 + 1); moss(c, x1 + 1, 5, z1 + 1)
    c.set(x0, 0, z1 + 1, 'open_eyeblossom', 'plant'); c.set(x0 - 1, 0, z1 + 1, 'closed_eyeblossom', 'plant')
    c.set(x0 - 1, 0, z1, 'open_eyeblossom', 'plant'); c.set(x1 + 1, 0, z1 - 1, 'open_eyeblossom', 'plant')
    # door hood on the beam line, with hanging lanterns
    for x in range(cx - 1, cx + 2): c.set(x, 3, z1 + 1, R, 'stairs', f='N')
    for x in (cx - 1, cx + 1): hang(c, x, 2, z1 + 1, 'lantern')
    # outer shutters and window sills with potted eyeblossoms
    for x, sx in ((x0 + 1, x0), (x1 - 1, x1)):
        for y in (1, 2): c.set(sx, y, z1 + 1, 'pale_oak_trapdoor', 'trapdoor', open=True, side='N')
        c.set(x, 0, z1 + 1, R, 'stairs', f='N', h='top')
        c.set(x, 1, z1 + 1, 'flower_pot', 'pot', plant='open_eyeblossom')
    # upstairs floor, a ladder up the west wall, and lights so both floors glow at night
    c.fill(x0 + 1, 3, z0 + 1, x1 - 1, 3, z1 - 1, P, 'slab', h='top')
    for y in range(0, 4): c.set(x0 + 1, y, z1 - 1, 'ladder', 'ladder', side='W')
    c.set(cx, 0, z0 + 1, 'lantern', 'lantern')
    c.set(x1 - 1, 4, z0 + 1, 'lantern', 'lantern')
    return top


# ------------------------------------------------------------------ Pro: the manor
def wall_gable(c, xa, xb, back=False):
    """A gable that rises straight up from the front (or back) wall, so the long roof is not one big slab."""
    xc = (xa + xb) // 2
    if back:
        zw, zo = MZ0, MZ0 - 1
        gable_roof(c, xa, xb, MZ0, MZ0 + 3, 7, 'z', o=(1, 1, 1, 0), prof=[0, 2, 3, 4], fillmat=None)
    else:
        zw, zo = MZ1, MZ1 + 1
        gable_roof(c, xa, xb, MZ1 - 3, MZ1, 7, 'z', o=(1, 1, 0, 1), prof=[0, 2, 3, 4], fillmat=None)
    for x in range(xa, xb + 1):
        c.set(x, 7, zw, L, a='x')
    for x, top in ((xa + 1, 9), (xc, 10), (xb - 1, 9)):
        for y in range(8, top + 1): c.set(x, y, zw, P)
    window(c, xc, 8, zw); c.set(xc, 10, zw, 'chiseled_resin_bricks')
    c.set(xa - 1, 6, zo, R, 'stairs', f='E', h='top'); c.set(xb + 1, 6, zo, R, 'stairs', f='W', h='top')
    c.set(xc, 11, zo, R); c.set(xc, 12, zo, 'lightning_rod', 'rod')


def main_range(c):
    x0, x1, z0, z1 = MX0, MX1, MZ0, MZ1
    in_starter = lambda x, z: z == z1 and SX0 <= x <= SX1
    frame_walls(c, x0, z0, x1, z1, 6, skip=in_starter)
    # pillars on the long walls
    for x in (4, 8, 12):
        c.fill(x, 0, z0, x, 6, z0, L)
    c.fill(x0, 0, 4, x0, 6, 4, L); c.fill(x1, 0, 4, x1, 6, 4, L)
    # floors: ground (replaces the grass) and upper floor
    c.fill(x0 + 1, -1, z0 + 1, x1 - 1, -1, z1 - 1, P)
    c.fill(SX0 + 1, -1, SZ0, SX1 - 1, -1, SZ1 - 1, P)
    c.fill(x0 + 1, 3, z0 + 1, x1 - 1, 3, z1 - 1, P, 'slab', h='top')   # the front house keeps its own floor and ladder
    # open the starter's back wall into the hall (its log beam stays as the lintel)
    c.fill(SX0 + 2, 0, SZ0, SX1 - 2, 2, SZ0, None)
    c.fill(DOOR_X, 4, SZ0, DOOR_X, 5, SZ0, None)
    # windows and doors
    for x in (2, 6, 10, 14):
        window(c, x, 1, z0); window(c, x, 4, z0)
    c.door(8, 0, z0, 'pale_oak_door', 'N')
    window(c, 8, 4, z0)
    window(c, 2, 4, z1)
    for z in (2, 6):
        window(c, x0, 1, z); window(c, x0, 4, z); window(c, x1, 1, z); window(c, x1, 4, z)
    window(c, 13, 1, z1); window(c, 15, 1, z1); window(c, 13, 4, z1); window(c, 15, 4, z1)
    c.door(14, 0, z1, 'pale_oak_door', 'S'); c.door(14, 4, z1, 'pale_oak_door', 'S')
    # roof and the starter's ridge running into it
    gable_roof(c, x0, x1, z0, z1, 7, 'x', o=(1, 1, 1, 1), prof=PROF)
    # the front gable's ridge runs into the main roof (fillmat=None keeps the Starter's gable face: beam, window, badge)
    gable_roof(c, SX0, SX1, SZ0, SZ1, 6, 'z', o=(1, 1, 3, 1), prof=PROF, fillmat=None)
    for x in (x0, x1):
        c.set(x, 7, z0, L, a='z'); c.set(x, 7, z1, L, a='z')
    window(c, x0, 8, 4); c.set(x0, 10, 4, 'chiseled_resin_bricks')
    c.set(x1, 8, 2, 'glass', 'pane'); c.set(x1, 8, 6, 'glass', 'pane')
    wall_gable(c, 12, 16)
    wall_gable(c, 6, 10, back=True)
    # a ledge of upside-down stairs on the beam line: depth for the back and the gable ends, and sills
    for x in range(x0 - 1, x1 + 2):
        if not 7 <= x <= 9: c.set(x, 3, z0 - 1, R, 'stairs', f='S', h='top')
    for z in range(z0, z1 + 1):
        c.set(x0 - 1, 3, z, R, 'stairs', f='E', h='top')
        if not 3 <= z <= 5: c.set(x1 + 1, 3, z, R, 'stairs', f='W', h='top')


def chimney(c):
    """Slim resin brick chimney on the east gable end, with a fireplace inside."""
    x = MX1 + 1
    c.fill(x, 0, 3, x + 1, 2, 5, RES)
    c.set(x + 1, 1, 4, 'chiseled_resin_bricks')
    for z in (3, 4, 5): c.set(x + 1, 3, z, RES, 'stairs', f='W')
    c.fill(x, 3, 3, x, 8, 5, RES)
    c.set(x, 9, 3, RES, 'stairs', f='S'); c.set(x, 9, 5, RES, 'stairs', f='N')
    c.fill(x, 9, 4, x, 13, 4, RES)
    c.set(x, 6, 4, 'chiseled_resin_bricks'); c.set(x, 14, 4, 'chiseled_resin_bricks')
    c.set(x, 15, 4, 'campfire', 'campfire')
    # hearth
    c.set(MX1, 0, 4, 'campfire', 'campfire'); c.set(MX1, 0, 3, RES); c.set(MX1, 0, 5, RES)
    c.fill(MX1, 1, 3, MX1, 2, 5, RES)
    c.set(MX1 - 1, 2, 3, RES, 'slab', h='top'); c.set(MX1 - 1, 2, 5, RES, 'slab', h='top')


def balcony(c):
    """Covered porch on the east front, with a balcony on top."""
    z = MZ1 + 2
    for x in (12, 16): c.fill(x, 0, z, x, 2, z, L)          # dark log posts, like the frame
    c.fill(12, 3, MZ1 + 1, 16, 3, z, P, 'slab', h='top')
    c.fill(12, -1, MZ1 + 1, 16, -1, z, BASE)
    for x in range(12, 17): c.set(x, 4, z, P, 'fence')
    c.set(12, 4, MZ1 + 1, P, 'fence'); c.set(16, 4, MZ1 + 1, P, 'fence')
    c.set(12, 5, z, 'soul_lantern', 'lantern'); c.set(16, 5, z, 'soul_lantern', 'lantern')
    for x in (13, 15): hang(c, x, 2, z, 'lantern')
    c.set(14, 3, z, P); moss(c, 14, 2, z, 1)
    for x in (13, 15): c.set(x, 4, MZ1 + 1, 'pale_moss_carpet', 'carpet')
    c.set(13, 0, MZ1 + 1, P, 'stairs', f='N'); c.set(15, 0, MZ1 + 1, P, 'stairs', f='N')


def bay_window(c):
    z = MZ1 + 1
    c.fill(1, 0, z, 3, 0, z, BASE)
    for y in (1, 2):
        c.set(1, y, z, L); c.set(3, y, z, L); c.set(2, y, z, 'glass', 'pane')
    for x in (1, 2, 3): c.set(x, 3, z, R, 'stairs', f='N')
    c.set(2, 1, MZ1, None); c.set(2, 2, MZ1, None)
    c.set(2, 0, z + 1, R, 'stairs', f='N', h='top'); c.set(2, 1, z + 1, 'flower_pot', 'pot', plant='closed_eyeblossom')


def interior(c):
    # stairs up along the back wall
    for i, x in enumerate((9, 10, 11)):
        c.set(x, i, 2, P, 'stairs', f='E')
    c.fill(9, 3, 2, 11, 3, 2, None)
    c.set(12, 3, 2, P, 'stairs', f='E')        # the last step, so the top is a half step, not a jump
    # ground floor walls: kitchen | hall | parlour, under the attic tie beams, with dark door frames
    for x, dz in ((4, 5), (12, 4)):
        for z in range(2, 7):
            for y in (0, 1, 2): c.set(x, y, z, P)
        for z in (dz - 1, dz + 1): c.fill(x, 0, z, x, 2, z, L)
        c.set(x, 0, dz, None); c.set(x, 1, dz, None); c.set(x, 2, dz, L, a='z')
    c.set(12, 0, 6, 'bookshelf'); c.set(12, 1, 6, 'bookshelf')
    # hall: carpet runner
    for z in range(3, 11): c.set(DOOR_X, 0, z, 'gray_carpet', 'carpet')
    # west room: kitchen and dining
    c.set(1, 0, 2, 'smoker', f='E'); c.set(1, 0, 3, 'barrel'); c.set(1, 0, 6, 'barrel')   # a 2nd barrel, not a crafting table: the plan has only 24 letters per layer
    c.set(2, 0, 4, P, 'fence'); c.set(2, 1, 4, 'oak_pressure_plate', 'plate')
    c.set(2, 0, 3, P, 'stairs', f='N'); c.set(2, 0, 5, P, 'stairs', f='S')
    c.set(1, 2, 4, 'pale_oak_shelf', 'shelf', side='W')
    hang(c, 2, 2, 4, 'lantern')
    # east room: parlour, two chairs facing the fire
    c.set(14, 0, 3, P, 'stairs', f='W'); c.set(14, 0, 5, P, 'stairs', f='W')
    c.set(13, 0, 4, 'gray_carpet', 'carpet'); c.set(14, 0, 4, 'gray_carpet', 'carpet'); c.set(15, 0, 4, 'gray_carpet', 'carpet')
    hang(c, 14, 2, 4, 'lantern')
    hang(c, 6, 2, 4, 'lantern')
    hang(c, DOOR_X, 2, 9, 'lantern')          # the hall lantern; the carpet runner takes the Starter's floor lantern's spot
    # upstairs: two bedrooms and a study
    c.set(1, 4, 2, 'gray_bed', 'bed', part='head', f='W'); c.set(2, 4, 2, 'gray_bed', 'bed', part='foot', f='W')
    c.set(1, 4, 3, 'white_candle_lit', 'candle', n=2)
    c.set(3, 4, 6, 'chest', 'chest')
    c.set(15, 4, 2, 'light_gray_bed', 'bed', part='head', f='E'); c.set(14, 4, 2, 'light_gray_bed', 'bed', part='foot', f='E')
    c.set(15, 4, 3, 'orange_candle_lit', 'candle', n=3)
    c.set(DOOR_X, 4, 10, 'lectern', 'lectern', f='N', book=True)
    for x in range(2, 4):
        for z in range(3, 6): c.set(x, 4, z, 'light_gray_carpet', 'carpet')
    for x in range(13, 15):
        for z in range(3, 6): c.set(x, 4, z, 'gray_carpet', 'carpet')
    for x in range(SX0 + 2, SX1 - 1): c.set(x, 4, 9, 'orange_carpet', 'carpet')
    c.set(SX0 + 1, 4, SZ0 + 1, 'bookshelf'); c.set(SX1 - 1, 4, 10, 'bookshelf')   # the west corner is the ladder hole
    c.set(SX0 + 1, 5, SZ0 + 1, 'white_candle_lit', 'candle', n=3); c.set(SX1 - 1, 5, 10, 'white_candle_lit', 'candle', n=2)
    for x in (4, 12):                         # tie beams in the attic, with lanterns for the bedrooms
        for z in range(2, 7): c.set(x, 6, z, SL, a='z')
        hang(c, x, 5, 4, 'lantern')


def tree(c, x, z, h, rng, lobes=((1, 0, 0), (-2, 1, 1), (0, -2, 1)), ragged=False):
    """A small pale oak: a dark trunk that forks into branches, lumpy flat crowns, hanging moss.
    ragged=True adds a patchy layer under each crown so it looks fuller and rounder."""
    for y in range(0, h): c.set(x, y, z, L)
    leaves = set()
    for bx, bz, up in lobes:
        # branch from the trunk top out to the lobe centre
        steps = max(abs(bx), abs(bz))
        for k in range(1, steps + 1):
            px, pz = x + round(bx * k / steps), z + round(bz * k / steps)
            c.set(px, h - 1 + up, pz, L, a='x' if abs(bx) >= abs(bz) else 'z')
        cy = h + up; r = 1.9 if (bx, bz) != (0, 0) else 2.1
        for dx in range(-3, 4):
            for dz in range(-3, 4):
                d = (dx * dx + dz * dz) ** 0.5
                if d <= r - 0.5 or (d <= r + 0.3 and rng.random() < 0.5): leaves.add((x + bx + dx, cy, z + bz + dz))
                if d <= r - 1.3 or (d <= r - 0.7 and rng.random() < 0.4): leaves.add((x + bx + dx, cy + 1, z + bz + dz))
                if ragged and d <= r - 0.6 and rng.random() < 0.45: leaves.add((x + bx + dx, cy - 1, z + bz + dz))
    c.set(x, h, z, L)
    for p in leaves:
        if c.get(*p) is None: c.set(*p, 'pale_oak_leaves')
    for (lx, ly, lz) in sorted(leaves):
        if (lx, ly - 1, lz) in leaves or c.get(lx, ly - 1, lz) is not None: continue
        if rng.random() < 0.4: moss(c, lx, ly - 1, lz, rng.choice((1, 2, 2, 3)))


def moss_patches(c, rng, spots):
    """Pale moss creeping over the lawn: blobs of moss blocks, some with moss carpet."""
    for cx, cz, r in spots:
        for dx in range(-3, 4):
            for dz in range(-3, 4):
                d = (dx * dx + dz * dz) ** 0.5
                if d > r + 0.5 or (d > r - 0.5 and rng.random() < 0.5): continue
                x, z = cx + dx, cz + dz
                if c.get(x, -1, z) is not None or c.get(x, 0, z) is not None: continue
                c.set(x, -1, z, 'pale_moss')
                if rng.random() < 0.35: c.set(x, 0, z, 'pale_moss_carpet', 'carpet')


def garden(c, rng):
    zf = 17                               # front fence line
    # winding path from the gate to the door, with a branch to the porch
    path = [(8, 12), (8, 13), (7, 13), (7, 14), (6, 14), (6, 15), (6, 16), (6, 17),
            (9, 12), (10, 12), (11, 12), (12, 11), (13, 11), (14, 10)]
    for x, z in path: c.set(x, -1, z, 'dirt_path')
    for x, z in [(5, 15), (7, 15), (5, 16), (7, 16), (9, 13), (7, 12), (13, 10)]: c.set(x, -1, z, 'coarse_dirt')
    # fence with a gate and lamp posts
    for x in range(-2, 20):
        if x == 6: continue
        c.set(x, 0, zf, P, 'fence')
    for z in range(9, zf): c.set(-2, 0, z, P, 'fence'); c.set(19, 0, z, P, 'fence')
    c.set(6, 0, zf, 'pale_oak_fence_gate', 'gate', a='x')
    for x in (5, 7): c.set(x, 0, zf, RES, 'wall'); c.set(x, 1, zf, RES, 'wall'); c.set(x, 2, zf, 'soul_lantern', 'lantern')
    for x in (-2, 19): c.set(x, 1, zf, 'lantern', 'lantern')
    # eyeblossom beds on pale moss
    beds = [(x, z) for x in range(0, 5) for z in (10, 11)] + [(x, z) for x in range(17, 19) for z in (9, 10, 11)] + \
           [(x, z) for x in range(9, 11) for z in (14, 15, 16)] + [(x, z) for x in range(1, 5) for z in (15, 16)]
    for x, z in beds:
        if c.get(x, -1, z) is not None: continue
        c.set(x, -1, z, 'pale_moss')
        k = rng.random()
        if k < 0.5: c.set(x, 0, z, 'open_eyeblossom', 'plant')
        elif k < 0.8: c.set(x, 0, z, 'closed_eyeblossom', 'plant')
        elif k < 0.9: c.set(x, 0, z, 'firefly_bush', 'plant')
        else: c.set(x, 0, z, 'pale_moss_carpet', 'carpet')
    # pumpkins by the door
    c.set(5, 0, 13, 'pumpkin'); c.set(11, 0, 13, 'carved_pumpkin', f='S')
    c.set(11, 0, 14, P, 'fence'); c.set(11, 1, 14, P, 'fence'); c.set(11, 2, 14, 'soul_lantern', 'lantern')
    # moss carpet patches and a pale oak tree
    c.fill(-1, 0, 14, 0, 4, 15, L)        # a thick 2x2 trunk, like a real pale oak, with roots
    for x, z, a in ((1, 14, 'x'), (-1, 16, 'z'), (0, 13, 'z')): c.set(x, 0, z, L, a=a)
    tree(c, -1, 14, 5, random.Random(TREE_SEED), lobes=((0, 0, 0), (2, 2, 0), (-1, -2, 1), (2, -1, 1)), ragged=True)
    moss_patches(c, rng, [(0, 12, 1.6), (2, 14, 1.2), (13, 15, 1.4), (16, 13, 1.8), (18, 15, 1.2), (-1, 9, 1.0),
                          (10, 10, 0.8), (16, 9, 0.8)])
    # hanging moss under the eaves
    for x, n in ((-1, 2), (0, 1), (4, 1), (5, 2), (11, 2), (12, 1), (17, 2)):
        if c.get(x, 7, MZ1 + 1) is not None and c.get(x, 6, MZ1 + 1) is None: moss(c, x, 6, MZ1 + 1, n)
    for x in (1, 3, 13, 15): moss(c, x, 6, MZ0 - 1, 2)
    for z in (9, 11): moss(c, SX0 - 1, 5, z, 1 + z % 2); moss(c, SX1 + 1, 5, z, 1)
    moss(c, MX0 - 1, 9, 2, 2); moss(c, MX1 + 1, 9, 2, 2); moss(c, MX1 + 1, 9, 6, 1)
    # back door: a dark frame, a hood on the beam line, and a path out to the pumpkin patch and the flower bed
    for x in (7, 9): c.fill(x, 0, MZ0, x, 2, MZ0, L)
    for x in (7, 8, 9): c.set(x, 3, MZ0 - 1, R, 'stairs', f='S')
    for x in (7, 9): hang(c, x, 2, MZ0 - 1, 'lantern')
    c.set(8, -1, MZ0 - 1, BASE)
    for x, z in ((8, -1), (8, -2), (7, -2), (6, -2), (9, -2), (10, -2), (8, -3)): c.set(x, -1, z, 'dirt_path')
    for x, z in ((6, -2), (9, -2)): c.set(x, -1, z, 'coarse_dirt')
    for x in range(1, 6):
        for z in (-3, -2):
            c.set(x, -1, z, 'podzol')
            if (x + z) % 2 == 0: c.set(x, 0, z, 'pumpkin')
            elif rng.random() < 0.5: c.set(x, 0, z, 'leaf_litter', 'carpet')
    for x in range(11, 16):
        for z in (-3, -2):
            c.set(x, -1, z, 'pale_moss')
            k = rng.random()
            c.set(x, 0, z, 'open_eyeblossom' if k < 0.5 else 'closed_eyeblossom' if k < 0.85 else 'firefly_bush', 'plant')


# ------------------------------------------------------------------ Legend: tower, maze, lights
def pyramid_roof(c, x0, x1, z0, z1, yb, prof, mat=R, o=1):
    """Rings of stairs stepping in to a point. prof works like gable_roof's."""
    X0, X1, Z0, Z1 = x0 - o, x1 + o, z0 - o, z1 + o; i = 0; prev = None
    while X0 <= X1 and Z0 <= Z1:
        top = yb + (prof[i] if i < len(prof) else prof[-1] + i - len(prof) + 1)
        low = top if prev is None else prev      # from the ring below's level, so each ring sits on a block, not on air
        if X0 == X1 or Z0 == Z1:
            for x in range(X0, X1 + 1):
                for z in range(Z0, Z1 + 1):
                    for y in range(low, top + 1): c.set(x, y, z, mat)
            return top
        ring = [(x, Z0, 'S') for x in range(X0, X1 + 1)] + [(x, Z1, 'N') for x in range(X0, X1 + 1)] + \
               [(X0, z, 'E') for z in range(Z0 + 1, Z1)] + [(X1, z, 'W') for z in range(Z0 + 1, Z1)]
        for x, z, f in ring:
            for y in range(low, top): c.set(x, y, z, mat)
            c.set(x, top, z, mat, 'stairs', f=f)
        prev = top; X0 += 1; X1 -= 1; Z0 += 1; Z1 -= 1; i += 1
    return prev


TX0, TX1, TZ0, TZ1 = -4, 0, 4, 8          # tower box (an octagon: the four corners are cut off)


def tower(c):
    """Witch-hat tower at the west end: three rooms, an open bell room and a steep spire."""
    corners = {(TX0, TZ0), (TX1, TZ0), (TX0, TZ1), (TX1, TZ1)}
    ring = [(x, z) for x in range(TX0, TX1 + 1) for z in range(TZ0, TZ1 + 1)
            if (x in (TX0, TX1) or z in (TZ0, TZ1)) and (x, z) not in corners]
    inside = [(x, z) for x in range(TX0 + 1, TX1) for z in range(TZ0 + 1, TZ1)]
    tcx, tcz = (TX0 + TX1) // 2, (TZ0 + TZ1) // 2
    # make room: the main roof's west end goes where the tower stands
    for x, z in ring + inside:
        c.fill(x, -1, z, x, 15, z, None)
    pillars = {(x, z) for (x, z) in ring if (abs(x - tcx) == 1 and z in (TZ0, TZ1)) or (abs(z - tcz) == 1 and x in (TX0, TX1))}
    for x, z in ring:
        a = 'x' if z in (TZ0, TZ1) else 'z'
        for y in range(0, 14):
            if (x, z) in pillars and y not in (0, 3, 6, 10, 13): c.set(x, y, z, SL)   # the plinth stays deepslate
            elif y == 0: c.set(x, y, z, BASE)
            elif y in (3, 6, 10, 13): c.set(x, y, z, L, a=a)
            else: c.set(x, y, z, P)
    for x, z in inside:
        c.set(x, -1, z, BASE)
        for y in (3, 6, 10): c.set(x, y, z, P, 'slab', h='top')
    # windows on the south and west faces, doors into the house
    for (x, z) in ((tcx, TZ1), (TX0, tcz), (tcx, TZ0)):
        window(c, x, 1, z); window(c, x, 4, z); window(c, x, 7, z, 3)
    for y in (0, 1, 4, 5): c.set(TX1, y, tcz, None)
    # bell room: an open lookout. Each side is open above a railing, with dark posts in the corners
    for (x, z) in [(tcx, TZ0), (tcx, TZ1), (TX0, tcz), (TX1, tcz)] + sorted(pillars):
        c.set(x, 11, z, P, 'fence'); c.set(x, 12, z, None)
    for x, z in corners: c.fill(x, 10, z, x, 12, z, L)
    c.set(tcx, 11, TZ1, L); c.set(tcx, 12, TZ1, 'bell', 'bell')   # the bell stands in the front opening, so you can see it
    for x, z in inside: c.set(x, 14, z, P)
    hang(c, tcx - 1, 13, tcz - 1, 'soul_lantern')
    # spire: a witch hat. A wide brim, a steep point, and a tip that bends forward
    for x, z in corners: c.set(x, 13, z, L, a='x'); c.set(x, 14, z, R)
    top = pyramid_roof(c, TX0, TX1, TZ0, TZ1, 14, [0, 1, 4, 7])
    c.set(tcx, top, tcz, None)                 # the top block steps forward, so the point bends
    c.set(tcx, top - 1, tcz + 1, R, 'stairs', f='N', h='top')   # an upside-down stair curves under the bend
    c.set(tcx, top, tcz + 1, R); c.set(tcx, top + 1, tcz + 1, R, 'wall')
    # ladder and lights inside
    for y in range(0, 11): c.set(tcx - 1, y, TZ0 + 1, 'ladder', 'ladder', side='N')
    hang(c, tcx, 2, tcz, 'soul_lantern')
    hang(c, tcx, 5, tcz, 'soul_lantern')
    hang(c, tcx, 9, tcz, 'soul_lantern')
    c.set(TX0 + 1, 4, TZ1 - 1, 'chest', 'chest'); c.set(TX1 - 1, 4, TZ0 + 1, 'bookshelf')   # chest upstairs: fewer kinds of block on the busy ground layer
    c.set(TX1 - 1, 7, TZ1 - 1, 'cobweb', 'cross_plant')
    c.set(TX1 - 1, 7, TZ0 + 1, 'white_candle_lit', 'candle', n=3)
    for x, z, n in ((TX0 - 1, TZ1 + 1, 2), (TX1 + 1, TZ1 + 1, 3), (TX0 - 1, TZ0 - 1, 2), (TX0 - 1, tcz, 1)):
        moss(c, x, 13, z, n)


MAZE = ["#E#####",
        "#...#.#",
        "###.#.#",
        "#G....#",
        "#######"]


def maze(c):
    """A little hedge maze of pale oak leaves with a glowing pumpkin in the middle."""
    x0, z0 = 12, 12
    for j, row in enumerate(MAZE):
        for i, ch in enumerate(row):
            x, z = x0 + i, z0 + j
            for y in (-1, 0, 1, 2): c.set(x, y, z, None)
            if ch == '#':                     # hedges 2 high, too tall to jump over
                c.set(x, 0, z, 'pale_oak_leaves'); c.set(x, 1, z, 'pale_oak_leaves')
            elif ch == 'G':                   # the prize: a glowing pumpkin on a plinth, high enough to see over the hedges
                c.set(x, -1, z, BASE); c.set(x, 0, z, RES); c.set(x, 1, z, 'chiseled_resin_bricks')
                c.set(x, 2, z, 'jack_o_lantern', f='S')
            else: c.set(x, -1, z, 'dirt_path' if (i + j) % 3 else 'coarse_dirt')
    for x, z in ((12, 12), (18, 12), (12, 16)):
        c.set(x, 0, z, RES, 'wall'); c.set(x, 1, z, RES, 'wall'); c.set(x, 2, z, 'soul_lantern', 'lantern')


def cresting(c):
    """Iron cresting along the main ridge, the classic trim on a haunted manor's roof.
    Bars cannot sit on a half slab without a gap, so the ridge under them becomes full blocks."""
    for x in range(MX0 + 1, MX1):
        r = c.get(x, 12, 4)
        if r is not None and r['b'] == R and r['s'] == 'slab': c.set(x, 12, 4, R)
        if c.get(x, 13, 4) is None: c.set(x, 13, 4, 'iron_bars', 'pane')


def more_lights(c):
    for x, z in ((3, 13),):
        c.set(x, 0, z, P, 'fence'); c.set(x, 1, z, P, 'fence'); c.set(x, 2, z, 'soul_lantern', 'lantern')
    c.set(5, 0, 13, 'jack_o_lantern', f='S'); c.set(11, 0, 13, 'jack_o_lantern', f='S')
    for x in (2, 14):
        hang(c, x, 6, MZ1 + 1, 'soul_lantern')


def manor():
    rng = random.Random(1031)
    c = Canvas()
    starter(c)
    with c.tier(2):
        main_range(c)
        chimney(c)
        balcony(c)
        bay_window(c)
        interior(c)
        garden(c, rng)
    with c.tier(3):
        tower(c)
        cresting(c)
        maze(c)
        more_lights(c)
    return c.build('Spooky Pale Garden Manor')


BUILDS = {'pale-garden-manor': manor}

META = {'pale-garden-manor': dict(
    title='Spooky Pale Garden Manor', kind='big', diff=2, mode='Creative',
    pitch='A spooky pale oak manor where the flowers open at night.',
    blurb=('A gray and white manor where the garden wakes up at night. '
           'Grow a tall little house into a manor with three gables and an orange chimney. '
           'After dark the windows glow and the eyeblossoms open.'),
    tiers=['Starter: a tall pale oak house with two floors, a pointy gable and shutters.',
           'Pro: the full manor, with a balcony, rooms inside and an eyeblossom garden.',
           'Legend: a witch-hat tower with a bell, a hedge maze, a glowing pumpkin and more lights.'],
    teaches=['Timber frame walls with dark log beams', 'Steep roofs that meet in valleys',
             'Small gables that break up a long roof', 'A tower with a pointy hat', 'Lighting a build for the night'],
    tips=[('know', 'Flowers that wake up',
           'Eyeblossoms close in the day and open at night. Their orange eyes glow in the dark, '
           'but they do not light up the garden.'),
          ('know', 'Orange bricks',
           'Smelt a Resin Clump in a furnace to get a Resin Brick. Four of them in a square make a Resin Bricks block.'),
          ('pro', 'Longer moss',
           'Use Bone Meal on Pale Hanging Moss to make it one block longer. It never grows on its own.'),
          ('pro', 'Gold light and blue light',
           'A Lantern gives light level 15, the brightest there is. A Soul Lantern gives 10, so put soul lanterns closer together.')],
    challenge=('Make it yours: Plant an eyeblossom on grass and use Bone Meal on it. '
               'More eyeblossoms pop up on the grass around it. Or hang lanterns along the fence.'),
    dad="Dad's Corner: Wait for night in your world and walk the garden together. How many eyeblossoms open? Which window glows the brightest?",
    needs='1.21.111',
    new_blocks=['Pale Oak Shelf', 'Firefly Bush', 'Leaf Litter'],
    palette=['Pale Oak Planks', 'Pale Oak Log', 'Deepslate Tiles', 'Resin Bricks'],
    time=0.72,
    ground='grass_block',
    order=1,
    featured=True,
    sources=['https://minecraft.wiki/w/Eyeblossom',
             'https://minecraft.wiki/w/Resin_Brick',
             'https://minecraft.wiki/w/Resin_Bricks',
             'https://minecraft.wiki/w/Pale_Hanging_Moss',
             'https://minecraft.wiki/w/Lantern',
             'https://minecraft.wiki/w/Soul_Lantern',
             'https://minecraft.wiki/w/The_Garden_Awakens'],
)}
