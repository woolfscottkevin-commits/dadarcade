import numpy as np, math
from PIL import Image, ImageDraw, ImageFilter
from blocks import B
import textures as tx

SS = 2                      # supersample
A, BH, H = 24 * SS, 12 * SS, 29 * SS
DIRS = {'N': (0, -1), 'E': (1, 0), 'S': (0, 1), 'W': (-1, 0)}
ROT = {'N': 'E', 'E': 'S', 'S': 'W', 'W': 'N'}
OPP = {'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E'}
CCW = {'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N'}

SOLID_SHAPES = {'full'}

# Volume 2: modules can add shapes without editing boxes_for.
# EXTRA_SHAPES[name] = fn(build, p, v) -> (list of (box, override), extra cache-key parts)
# A box is (x0, y0, z0, x1, y1, z1) in 0..1 block units; override is None, 'top', 'side',
# a SPECIAL key or another block key (its top texture is used).
EXTRA_SHAPES = {}
CONNECTABLE = {'fence', 'wall', 'pane', 'gate'}

class Build:
    """A build is a dict of (x, y, z) -> block state. y=0 is the first layer on top of the grass.

    Volume 2 adds tiers: every block belongs to the lowest tier that shows it
    (1 Starter, 2 Pro, 3 Legend). Wrap code in `with b.tier(2):` to tag blocks.
    Higher tiers may also replace a lower tier's block at the same spot; the
    replacement wins in that tier and above.
    """
    def __init__(self, name=''):
        self.name = name; self.c = {}; self._tier = 1; self.up = {}
    def tier(self, t):
        b = self
        class _T:
            def __enter__(s): s.prev = b._tier; b._tier = t
            def __exit__(s, *a): b._tier = s.prev
        return _T()
    def set(self, x, y, z, b, s='full', **kw):
        if b is None:
            if self._tier > 1 and (x, y, z) in self.c:
                # removing a lower-tier block in a higher tier: record as an upgrade to air
                self.up.setdefault((x, y, z), []).append((self._tier, None)); return
            self.c.pop((x, y, z), None); return
        assert b in B, b
        d = dict(b=b, s=s); d.update(kw)
        if self._tier > 1 and 'tier' not in d: d['tier'] = self._tier
        old = self.c.get((x, y, z))
        if old is not None and self._tier > 1 and old.get('tier', 1) < self._tier:
            # a higher tier swaps a lower tier's block: keep both, the export picks per tier
            self.up.setdefault((x, y, z), []).append((self._tier, d)); return
        self.c[(x, y, z)] = d
    def at_tier(self, t):
        """A plain Build with only what tier t shows (upgrades applied)."""
        nb = Build(self.name)
        for p, v in self.c.items():
            if v.get('tier', 1) <= t: nb.c[p] = v
        for p, ups in self.up.items():
            for tt, d in sorted(ups, key=lambda e: e[0]):
                if tt <= t:
                    if d is None: nb.c.pop(p, None)
                    else: nb.c[p] = d
        return nb
    def get(self, x, y, z): return self.c.get((x, y, z))
    def fill(self, x0, y0, z0, x1, y1, z1, b, s='full', **kw):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set(x, y, z, b, s, **kw)
    def clear(self, x0, y0, z0, x1, y1, z1): self.fill(x0, y0, z0, x1, y1, z1, None)
    def walls(self, x0, z0, x1, z1, y0, y1, b, s='full', **kw):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, z0, b, s, **kw); self.set(x, y, z1, b, s, **kw)
            for z in range(z0, z1 + 1):
                self.set(x0, y, z, b, s, **kw); self.set(x1, y, z, b, s, **kw)
    def bounds(self):
        xs = [p[0] for p in self.c]; ys = [p[1] for p in self.c]; zs = [p[2] for p in self.c]
        return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)
    def normalized(self):
        x0, _, _, _, z0, _ = self.bounds(); nb = Build(self.name)
        nb.c = {(x - x0, y, z - z0): dict(v) for (x, y, z), v in self.c.items()}
        return nb
    def rotated(self, k=1):
        b = self.normalized()
        for _ in range(k % 4):
            x0, x1, _, _, z0, z1 = b.bounds(); D = z1
            nb = Build(self.name)
            for (x, y, z), v in b.c.items():
                v = dict(v)
                for key in ('f', 'side'):
                    if key in v and v[key] in ROT: v[key] = ROT[v[key]]
                if 'a' in v and v['a'] in ('x', 'z'): v['a'] = 'z' if v['a'] == 'x' else 'x'
                nb.c[(D - z, y, x)] = v
            b = nb
        return b

# ---------------------------------------------------------------- geometry
def u16(*v): return tuple(t / 16 for t in v)

def is_full(v): return v is not None and v['s'] == 'full' and not B[v['b']]['translucent'] and v['b'] not in ('iron_bars',)

def conn_mask(build, p, v):
    x, y, z = p; out = ''
    for d, (dx, dz) in DIRS.items():
        n = build.get(x + dx, y, z + dz)
        if n is None: continue
        if n['s'] == 'full' and v['s'] in ('fence', 'wall', 'pane') and not (v['s'] == 'fence' and B[n['b']]['translucent']): out += d
        elif v['s'] == 'pane' and n['s'] == 'pane': out += d
        elif v['s'] == 'pane' and n['s'] == 'full': out += d
        elif v['s'] == 'fence' and n['s'] == 'gate': out += d   # a fence always joins its gate (gate keys are e.g. oak_fence_gate)
        elif v['s'] in ('fence',) and n['s'] == 'fence' and ('planks' in n['b']) == ('planks' in v['b']): out += d
        elif v['s'] == 'wall' and n['s'] == 'wall': out += d
    return ''.join(sorted(set(out)))

def stair_shape(build, p, v):
    x, y, z = p; F = v['f']; h = v.get('h', 'bottom')
    def st(d):
        dx, dz = DIRS[d]; n = build.get(x + dx, y, z + dz)
        return n if (n is not None and n['s'] == 'stairs' and n.get('h', 'bottom') == h) else None
    def can_take(face):
        n = st(face); return n is None or n['f'] != F
    behind = st(F)
    if behind is not None:
        d2 = behind['f']
        if d2 not in (F, OPP[F]) and can_take(OPP[d2]): return 'outer', d2
    front = st(OPP[F])
    if front is not None:
        d3 = front['f']
        if d3 not in (F, OPP[F]) and can_take(d3): return 'inner', d3
    return 'straight', None

def half_box(d, y0, y1):
    return {'N': (0, y0, 0, 1, y1, .5), 'S': (0, y0, .5, 1, y1, 1), 'W': (0, y0, 0, .5, y1, 1), 'E': (.5, y0, 0, 1, y1, 1)}[d]

def quarter_box(d1, d2, y0, y1):
    xs = (0, .5) if 'W' in (d1, d2) else (.5, 1); zs = (0, .5) if 'N' in (d1, d2) else (.5, 1)
    return (xs[0], y0, zs[0], xs[1], y1, zs[1])

def side_panel(side, t, y0=0, y1=1, inset=0):
    t = t / 16; i = inset / 16
    return {'N': (i, y0, 0, 1 - i, y1, t), 'S': (i, y0, 1 - t, 1 - i, y1, 1), 'W': (0, y0, i, t, y1, 1 - i), 'E': (1 - t, y0, i, 1, y1, 1 - i)}[side]

def boxes_for(build, p, v):
    """return list of (box, texkey or dict) and a cache key"""
    s = v['s']; b = v['b']; key = [b, s]
    bx = []
    if s == 'full':
        top = 14 / 16 if (b == 'water' and not (build.get(p[0], p[1] + 1, p[2]) or {}).get('b') == 'water') else 1
        bx = [((0, 0, 0, 1, top, 1), None)]; key += [v.get('a', 'y'), v.get('f', ''), top]
    elif s == 'slab':
        bx = [((0, .5, 0, 1, 1, 1) if v.get('h') == 'top' else (0, 0, 0, 1, .5, 1), None)]; key += [v.get('h', 'bottom')]
    elif s == 'stairs':
        h = v.get('h', 'bottom'); F = v['f']; shape, d2 = stair_shape(build, p, v)
        base = (0, .5, 0, 1, 1, 1) if h == 'top' else (0, 0, 0, 1, .5, 1)
        yr = (0, .5) if h == 'top' else (.5, 1)
        bx = [(base, None)]
        if shape == 'straight': bx.append((half_box(F, *yr), None))
        elif shape == 'outer': bx.append((quarter_box(F, d2, *yr), None))
        else:
            bx.append((half_box(F, *yr), None)); q = quarter_box(OPP[F], d2, *yr); bx.append((q, None))
        key += [h, F, shape, d2]
    elif s in ('fence', 'wall', 'pane'):
        m = conn_mask(build, p, v); key += [m]
        if s == 'fence':
            bx = [(u16(6, 0, 6, 10, 16, 10), None)]
            for d in m:
                for (ya, yb) in ((6, 9), (12, 15)):
                    bx.append(({'N': u16(7, ya, 0, 9, yb, 6), 'S': u16(7, ya, 10, 9, yb, 16), 'W': u16(0, ya, 7, 6, yb, 9), 'E': u16(10, ya, 7, 16, yb, 9)}[d], None))
        elif s == 'wall':
            bx = [(u16(4, 0, 4, 12, 16, 12), None)]
            for d in m:
                bx.append(({'N': u16(5, 0, 0, 11, 14, 4), 'S': u16(5, 0, 12, 11, 14, 16), 'W': u16(0, 0, 5, 4, 14, 11), 'E': u16(12, 0, 5, 16, 14, 11)}[d], None))
        else:
            bx = [(u16(7, 0, 7, 9, 16, 9), None)]
            for d in (m or 'NESW' if not m else m):
                bx.append(({'N': u16(7, 0, 0, 9, 16, 7), 'S': u16(7, 0, 9, 9, 16, 16), 'W': u16(0, 0, 7, 7, 16, 9), 'E': u16(9, 0, 7, 16, 16, 9)}[d], None))
    elif s == 'gate':
        a = v.get('a', 'x'); key += [a]
        if a == 'x': bx = [(u16(0, 5, 7, 2, 16, 9), None), (u16(14, 5, 7, 16, 16, 9), None), (u16(2, 6, 7, 14, 9, 9), None), (u16(2, 12, 7, 14, 15, 9), None)]
        else: bx = [(u16(7, 5, 0, 9, 16, 2), None), (u16(7, 5, 14, 9, 16, 16), None), (u16(7, 6, 2, 9, 9, 14), None), (u16(7, 12, 2, 9, 15, 14), None)]
    elif s == 'door':
        side = v['side']; half = v.get('h', 'lower'); key += [side, half]
        bx = [(side_panel(side, 3), 'top' if half == 'upper' else 'side')]
    elif s == 'trapdoor':
        if v.get('open'): side = v['side']; bx = [(side_panel(side, 3), 'top')]; key += ['open', side]
        else: bx = [((0, 13 / 16, 0, 1, 1, 1) if v.get('h') == 'top' else (0, 0, 0, 1, 3 / 16, 1), 'top')]; key += [v.get('h', 'bottom')]
    elif s == 'carpet': bx = [((0, 0, 0, 1, 1 / 16, 1), None)]
    elif s == 'plate': bx = [(u16(1, 0, 1, 15, 1, 15), None)]
    elif s == 'button':
        side = v.get('side'); key += [side]
        bx = [({'N': u16(5, 6, 0, 11, 10, 2), 'S': u16(5, 6, 14, 11, 10, 16), 'W': u16(0, 6, 5, 2, 10, 11), 'E': u16(14, 6, 5, 16, 10, 11), None: u16(5, 0, 6, 11, 2, 10)}[side], None)]
    elif s == 'lever':
        side = v.get('side'); key += [side]
        if side is None: bx = [(u16(5, 0, 4, 11, 3, 12), None), (u16(7, 3, 7, 9, 12, 9), 'side')]
        else: bx = [(side_panel(side, 3, 4 / 16, 12 / 16, 5), None), ({'N': u16(7, 7, 3, 9, 9, 10), 'S': u16(7, 7, 6, 9, 9, 13), 'W': u16(3, 7, 7, 10, 9, 9), 'E': u16(6, 7, 7, 13, 9, 9)}[side], 'side')]
    elif s == 'lantern':
        if v.get('hang'): bx = [(u16(5, 2, 5, 11, 9, 11), None), (u16(6, 9, 6, 10, 11, 10), 'dark'), (u16(7.5, 11, 7.5, 8.5, 16, 8.5), 'dark')]; key += ['hang']
        else: bx = [(u16(5, 0, 5, 11, 7, 11), None), (u16(6, 7, 6, 10, 9, 10), 'dark')]
    elif s == 'torch':
        side = v.get('side'); key += [side]
        off = {'N': (0, -4), 'S': (0, 4), 'W': (-4, 0), 'E': (4, 0), None: (0, 0)}[side]; yb = 3 if side else 0
        x0 = 7 + off[0]; z0 = 7 + off[1]
        bx = [(u16(x0, yb, z0, x0 + 2, yb + 8, z0 + 2), 'side'), (u16(x0, yb + 8, z0, x0 + 2, yb + 10, z0 + 2), 'top')]
    elif s == 'rod': bx = [(u16(7, 0, 7, 9, 16, 9), None)]
    elif s == 'flower': bx = [(u16(7.5, 0, 7.5, 8.5, 7, 8.5), 'side'), (u16(5.5, 6, 5.5, 10.5, 10, 10.5), 'top'), (u16(7, 7, 7, 9, 9, 9), 'yellowc')]
    elif s == 'tuft': bx = [(u16(3, 0, 4, 4, 6, 5), None), (u16(8, 0, 9, 9, 8, 10), None), (u16(11, 0, 5, 12, 5, 6), None), (u16(6, 0, 12, 7, 6, 13), None), (u16(12, 0, 12, 13, 7, 13), None)]
    elif s == 'crop': bx = [(u16(3, 0, 3, 4, 12, 4), None), (u16(8, 0, 4, 9, 13, 5), None), (u16(12, 0, 7, 13, 11, 8), None), (u16(5, 0, 10, 6, 12, 11), None), (u16(10, 0, 12, 11, 13, 13), None)]
    elif s == 'ladder': side = v['side']; key += [side]; bx = [(side_panel(side, 1), None)]
    elif s == 'panel':  # banners, signs on walls, generic thin panel
        side = v['side']; key += [side, v.get('y0', 0), v.get('y1', 16), v.get('t', 1)]
        bx = [(side_panel(side, v.get('t', 1), v.get('y0', 0) / 16, v.get('y1', 16) / 16, v.get('inset', 1)), None)]
    elif s == 'bed':
        part = v.get('part', 'foot'); F = v['f']; key += [part, F]
        bx = [(u16(0, 3, 0, 16, 9, 16), None)]
        if part == 'head': bx.append((half_box(F, 9 / 16, 11 / 16), 'white'))
        # legs
        bx += [(u16(0, 0, 0, 3, 3, 3), 'side'), (u16(13, 0, 13, 16, 3, 16), 'side'), (u16(0, 0, 13, 3, 3, 16), 'side'), (u16(13, 0, 0, 16, 3, 3), 'side')]
    elif s == 'chest': bx = [(u16(1, 0, 1, 15, 14, 15), None)]
    elif s == 'hopper':
        f = v.get('f', 'D'); key += [f]
        spout = {'D': u16(6, 0, 6, 10, 4, 10), 'N': u16(6, 4, 0, 10, 8, 4), 'S': u16(6, 4, 12, 10, 8, 16), 'W': u16(0, 4, 6, 4, 8, 10), 'E': u16(12, 4, 6, 16, 8, 10)}[f]
        bx = [(u16(0, 10, 0, 16, 16, 16), None), (u16(4, 4, 4, 12, 10, 12), None), (spout, None)]
    elif s == 'detector': bx = [(u16(0, 0, 0, 16, 6, 16), None)]
    elif s == 'dust':
        m = dust_mask(build, p); key += [m]
        bx = [(u16(5, 0, 5, 11, 1, 11), None)]
        for d in m: bx.append(({'N': u16(6, 0, 0, 10, 1, 5), 'S': u16(6, 0, 11, 10, 1, 16), 'W': u16(0, 0, 6, 5, 1, 10), 'E': u16(11, 0, 6, 16, 1, 10)}[d], None))
    elif s == 'campfire': bx = [(u16(1, 0, 3, 15, 4, 6), 'side'), (u16(1, 0, 10, 15, 4, 13), 'side'), (u16(3, 3, 1, 6, 7, 15), 'side'), (u16(10, 3, 1, 13, 7, 15), 'side'), (u16(6, 4, 6, 10, 13, 10), 'top')]
    elif s == 'bush': bx = [(u16(2, 0, 2, 14, 12, 14), None)]
    elif s == 'pot': bx = [(u16(5, 0, 5, 11, 6, 11), None), (u16(7, 6, 7, 9, 11, 9), 'green'), (u16(6, 10, 6, 10, 13, 10), v.get('plant', 'poppy'))]; key += [v.get('plant', 'poppy')]
    elif s == 'anvil': bx = [(u16(2, 0, 2, 14, 4, 14), None), (u16(4, 4, 4, 12, 5, 12), None), (u16(6, 5, 5, 10, 10, 11), None), (u16(3, 10, 0, 13, 16, 16), None)]
    elif s == 'table': bx = [(u16(0, 0, 0, 16, 12, 16), None)]
    elif s == 'cauldron':   # a hollow pot on four feet; water=True fills it
        bx = [(u16(0, 3, 0, 16, 4, 16), None), (u16(0, 4, 0, 2, 16, 16), None), (u16(14, 4, 0, 16, 16, 16), None),
              (u16(2, 4, 0, 14, 16, 2), None), (u16(2, 4, 14, 14, 16, 16), None),
              (u16(0, 0, 0, 4, 3, 4), None), (u16(12, 0, 0, 16, 3, 4), None), (u16(0, 0, 12, 4, 3, 16), None), (u16(12, 0, 12, 16, 3, 16), None)]
        if v.get('water'): bx.append((u16(2, 4, 2, 14, 14, 14), 'cauldron_water')); key += ['water']
    elif s == 'bell': bx = [(u16(5, 4, 5, 11, 11, 11), None), (u16(4, 3, 4, 12, 5, 12), None)]
    elif s in EXTRA_SHAPES:
        bx, extra = EXTRA_SHAPES[s](build, p, v); key += list(extra)
    else: raise ValueError(s)
    return bx, '|'.join(map(str, key))

def dust_mask(build, p):
    x, y, z = p; m = ''
    for d, (dx, dz) in DIRS.items():
        n = build.get(x + dx, y, z + dz)
        if n and (n['s'] in ('dust',) or n['b'] in ('redstone_torch', 'lever', 'stone_button', 'oak_button', 'redstone_lamp', 'lit_redstone_lamp', 'note_block', 'sticky_piston', 'piston', 'iron_door', 'redstone_block', 'daylight_detector', 'hopper') or n.get('rs')):
            m += d
    if len(m) == 1: m += OPP[m]
    return m

# ---------------------------------------------------------------- sprite rendering
def proj(x, y, z):
    return (A + (x - z) * A, (x + z) * BH + (1 - y) * H)

_tex_cache = {}
def tex_img(arr, key):
    if key not in _tex_cache:
        arr = arr.copy()
        if arr[..., 3].min() > 250:
            arr[[0, -1], :, :3] *= 0.88; arr[1:-1, [0, -1], :3] *= 0.88
        a = np.clip(arr, 0, 255).astype(np.uint8); _tex_cache[key] = Image.fromarray(a, 'RGBA')
    return _tex_cache[key]

SPECIAL = {'dark': tx.solid('#2d2d33'), 'white': tx.wool('#f4f4f4', 'pil'), 'green': tx.solid('#3f7a2a'), 'yellowc': tx.solid('#f5d932'),
           'cauldron_water': tx.noise('#3f76e4', 9, 'cwat')}

def face_tex(v, face, override):
    blk = B[v['b']]
    if override in SPECIAL: return SPECIAL[override], override, 0
    if override in B: return B[override]['top'], override + 'top', 0
    if override == 'top': return blk['top'], v['b'] + 'top', 0
    if override == 'side': return blk['side'], v['b'] + 'side', 0
    a = v.get('a', 'y'); f = v.get('f')
    if blk['front'] is not None and f in ('S', 'E') and v['s'] == 'full':
        if (face == 'south' and f == 'S') or (face == 'east' and f == 'E'): return blk['front'], v['b'] + 'front', 0
    if v['b'] in ('piston', 'sticky_piston') and f:
        facedir = {'south': 'S', 'east': 'E', 'top': 'U'}[face]
        if f == facedir: return blk['top'], v['b'] + 'top', 0
        if f == 'U': return (blk['top'], v['b'] + 'top', 0) if face == 'top' else (blk['side'], v['b'] + 'side', 0)
        if f == 'D': return (blk['bottom'], v['b'] + 'bot', 0) if face == 'top' else (blk['side'], v['b'] + 'side', 2)
        if face == 'top': return blk['side'], v['b'] + 'side', {'N': 0, 'S': 2, 'E': 3, 'W': 1}[f]
        if face == 'south': return blk['side'], v['b'] + 'side', {'E': 3, 'W': 1, 'N': 0}.get(f, 0)
        if face == 'east': return blk['side'], v['b'] + 'side', {'S': 1, 'N': 3, 'W': 0}.get(f, 0)
    if a == 'y' or v['s'] != 'full':
        if face == 'top': return blk['top'], v['b'] + 'top', 0
        return blk['side'], v['b'] + 'side', 0
    if a == 'x':
        if face == 'east': return blk['top'], v['b'] + 'top', 0
        return blk['side'], v['b'] + 'side', 1
    if a == 'z':
        if face == 'south': return blk['top'], v['b'] + 'top', 0
        return blk['side'], v['b'] + 'side', 1 if face == 'east' else 0

SHADE = {'top': 1.0, 'south': 0.80, 'east': 0.62}

def draw_face(canvas, corners_world, uv, tex, rot, shade, glow):
    """corners_world: origin, U end, V end (3D). uv: (u0,v0,u1,v1) in texture pixels"""
    O, PU, PV = [np.array(proj(*c)) for c in corners_world]
    dU = PU - O; dV = PV - O
    M = np.array([[dU[0], dV[0]], [dU[1], dV[1]]])
    if abs(np.linalg.det(M)) < 1e-6: return
    Mi = np.linalg.inv(M)
    u0, v0, u1, v1 = uv
    # q -> (a,b) = Mi (q - O); tx = u0 + a (u1-u0); ty = v0 + b (v1-v0)
    ax, ay, ac = Mi[0, 0], Mi[0, 1], -(Mi[0, 0] * O[0] + Mi[0, 1] * O[1])
    bx_, by, bc = Mi[1, 0], Mi[1, 1], -(Mi[1, 0] * O[0] + Mi[1, 1] * O[1])
    su, sv = (u1 - u0), (v1 - v0)
    coeffs = (ax * su, ay * su, ac * su + u0, bx_ * sv, by * sv, bc * sv + v0)
    t = tex
    if rot: t = t.rotate(-90 * rot)
    if shade != 1.0 and not glow:
        arr = np.asarray(t).astype(float); arr[..., :3] *= shade; t = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')
    elif glow and shade != 1.0:
        arr = np.asarray(t).astype(float); arr[..., :3] *= (0.85 + 0.15 * shade); t = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')
    warped = t.transform(canvas.size, Image.AFFINE, coeffs, resample=Image.NEAREST)
    mask = Image.new('L', canvas.size, 0)
    poly = [tuple(O), tuple(PU), tuple(PU + dV), tuple(PV)]
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    mask = mask.filter(ImageFilter.MaxFilter(3))
    wa = np.asarray(warped).copy(); ma = np.asarray(mask)
    wa[..., 3] = (wa[..., 3].astype(int) * ma // 255).astype(np.uint8)
    canvas.alpha_composite(Image.fromarray(wa, 'RGBA'))

_sprite_cache = {}
def sprite(build, p, v, facemask='tse'):
    bx, key = boxes_for(build, p, v)
    key = key + '|' + facemask
    if key in _sprite_cache: return _sprite_cache[key]
    W, Hh = 2 * A + 2, 2 * BH + H + 2
    cv = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    blk = B[v['b']]
    bx = sorted(bx, key=lambda e: (e[0][0] + e[0][3]) + (e[0][2] + e[0][5]) + (e[0][1] + e[0][4]))
    for (x0, y0, z0, x1, y1, z1), ov in bx:
        for face in ('top', 'south', 'east'):
            if face[0] not in facemask: continue
            t, tk, rot = face_tex(v, face, ov)
            ti = tex_img(t, tk)
            if face == 'top':
                corners = [(x0, y1, z0), (x1, y1, z0), (x0, y1, z1)]; uv = (x0 * 16, z0 * 16, x1 * 16, z1 * 16)
            elif face == 'south':
                corners = [(x0, y1, z1), (x1, y1, z1), (x0, y0, z1)]; uv = (x0 * 16, (1 - y1) * 16, x1 * 16, (1 - y0) * 16)
            else:
                corners = [(x1, y1, z1), (x1, y1, z0), (x1, y0, z1)]; uv = ((1 - z1) * 16, (1 - y1) * 16, (1 - z0) * 16, (1 - y0) * 16)
            draw_face(cv, corners, uv, ti, rot, SHADE[face], blk['glow'])
    _sprite_cache[key] = cv
    return cv

def facemask_for(build, p, v):
    blk = B[v['b']]
    if not (blk['translucent'] and v['s'] == 'full'): return 'tse'
    x, y, z = p; m = ''
    for ch, q in (('t', (x, y + 1, z)), ('s', (x, y, z + 1)), ('e', (x + 1, y, z))):
        n = build.get(*q)
        if n is not None and n['b'] == v['b'] and n['s'] == 'full': continue
        if v['b'] != 'water' and n is not None and is_full(n): continue
        m += ch
    return m or '-'

def render(build, rot=0, ground=True, ground_margin=1, max_y=None, scale=1.0, ground_block='grass_block', cut=None, locate=False):
    b = build.rotated(rot) if rot else build.normalized()
    if ground:
        x0, x1, y0, y1, z0, z1 = b.bounds()
        gy = -1
        for x in range(x0 - ground_margin, x1 + ground_margin + 1):
            for z in range(z0 - ground_margin, z1 + ground_margin + 1):
                if (x, gy, z) not in b.c: b.c[(x, gy, z)] = dict(b=ground_block, s='full')
    cells = [(p, v) for p, v in b.c.items() if (max_y is None or p[1] <= max_y) and (cut is None or cut(p))]
    if max_y is not None:
        vis = Build(); vis.c = {p: v for p, v in cells}
    else: vis = b
    cells.sort(key=lambda e: (e[0][0] + e[0][1] + e[0][2], e[0][1], e[0][0]))
    xs = [proj(*p)[0] for p, _ in cells]; ys = [proj(*p)[1] for p, _ in cells]
    minx, maxx = min(xs) - A, max(xs) + A * 2 + 4; miny, maxy = min(ys) - 2 * BH - H, max(ys) + 2 * BH + H + 4
    W, Hh = int(maxx - minx), int(maxy - miny)
    cv = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    for p, v in cells:
        fm = facemask_for(vis, p, v)
        if fm == '-': continue
        sp = sprite(vis, p, v, fm)
        sx, sy = proj(*p); ox, oy = proj(0, 0, 0)
        # sprite drawn with cell origin at (0,0,0) -> offset
        dx = int(round(sx - ox - minx)); dy = int(round(sy - oy - miny))
        cv.alpha_composite(sp, (dx, dy))
    bbox = cv.getbbox(); cv = cv.crop(bbox)
    out = cv.resize((max(1, int(cv.width / SS * scale)), max(1, int(cv.height / SS * scale))), Image.LANCZOS)
    if locate:
        ox, oy = proj(0, 0, 0)
        shift = (0, 0)
        if not rot:
            xs0 = min(p[0] for p in build.c); zs0 = min(p[2] for p in build.c); shift = (xs0, zs0)
        def loc(x, y, z, top=True):
            x -= shift[0]; z -= shift[1]
            sx, sy = proj(x + .5, y + (1 if top else .5), z + .5)
            px = (sx - minx - bbox[0]) / SS * scale; py = (sy - miny - bbox[1]) / SS * scale
            return px / out.width, py / out.height
        return out, loc
    return out
