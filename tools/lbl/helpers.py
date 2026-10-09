import math, random
from engine import Build, DIRS, OPP

def gable(b, x0, x1, z0, z1, ybase, mat, o=1, gable_mat=None, axis='x', ridge='slab', eave_under=True):
    """Gable roof with ridge along `axis`. x0..x1, z0..z1 = wall footprint (inclusive)."""
    if axis == 'x':
        lo, hi = z0 - o, z1 + o; a0, a1 = x0 - o, x1 + o
    else:
        lo, hi = x0 - o, x1 + o; a0, a1 = z0 - o, z1 + o
    i = 0
    while lo + i <= hi - i:
        y = ybase + i; p, q = lo + i, hi - i
        for a in range(a0, a1 + 1):
            if p == q:
                if ridge == 'slab': put(b, axis, a, y, p, mat, 'slab')
                else: put(b, axis, a, y, p, mat, 'full')
            else:
                put(b, axis, a, y, p, mat, 'stairs', f=('S' if axis == 'x' else 'E'))
                put(b, axis, a, y, q, mat, 'stairs', f=('N' if axis == 'x' else 'W'))
        if gable_mat:
            gl, gh = max(p + 1, z0 if axis == 'x' else x0), min(q - 1, z1 if axis == 'x' else x1)
            for c in range(gl, gh + 1):
                for a in ((x0, x1) if axis == 'x' else (z0, z1)):
                    put(b, axis, a, y, c, gable_mat, 'full')
        i += 1
    return ybase + i - 1

def put(b, axis, a, y, c, mat, s, **kw):
    if axis == 'x': b.set(a, y, c, mat, s, **kw)
    else: b.set(c, y, a, mat, s, **kw)

def hip(b, x0, x1, z0, z1, ybase, mat, o=1, top='slab'):
    """Pyramid/hip roof over rectangle, stairs face inward."""
    X0, X1, Z0, Z1 = x0 - o, x1 + o, z0 - o, z1 + o; y = ybase
    while X0 <= X1 and Z0 <= Z1:
        if X0 == X1 or Z0 == Z1:
            for x in range(X0, X1 + 1):
                for z in range(Z0, Z1 + 1): b.set(x, y, z, mat, top)
            return y
        for x in range(X0, X1 + 1):
            b.set(x, y, Z0, mat, 'stairs', f='S'); b.set(x, y, Z1, mat, 'stairs', f='N')
        for z in range(Z0 + 1, Z1):
            b.set(X0, y, z, mat, 'stairs', f='E'); b.set(X1, y, z, mat, 'stairs', f='W')
        X0 += 1; X1 -= 1; Z0 += 1; Z1 -= 1; y += 1
    return y - 1

def disc(r):
    pts = set(); R = int(math.ceil(r)) + 1
    for dx in range(-R, R + 1):
        for dz in range(-R, R + 1):
            if dx * dx + dz * dz <= r * r + 0.3: pts.add((dx, dz))
    return pts

def ring(r, th=1):
    outer = disc(r); inner = disc(r - th) if r - th > 0 else set()
    return outer - inner

def disc_even(r):
    """circle centred on a block corner (even diameter)"""
    pts = set(); R = int(math.ceil(r)) + 1
    for dx in range(-R, R):
        for dz in range(-R, R):
            cx, cz = dx + .5, dz + .5
            if cx * cx + cz * cz <= r * r: pts.add((dx, dz))
    return pts

def line3(p0, p1):
    x0, y0, z0 = p0; x1, y1, z1 = p1; n = max(abs(x1 - x0), abs(y1 - y0), abs(z1 - z0))
    out = []
    for i in range(n + 1):
        t = i / n if n else 0
        out.append((round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), round(z0 + (z1 - z0) * t)))
    return out

def blob(b, cx, cy, cz, r, mat, rng, keep=True, squash=1.0):
    R = int(r) + 1
    for dx in range(-R, R + 1):
        for dy in range(-R, R + 1):
            for dz in range(-R, R + 1):
                d = math.sqrt(dx * dx + (dy / squash) ** 2 + dz * dz)
                if d <= r - 0.3 or (d <= r + 0.4 and rng.random() < 0.45):
                    p = (cx + dx, cy + dy, cz + dz)
                    if keep and p in b.c: continue
                    b.set(*p, mat)

def door(b, x, y, z, mat, side):
    b.set(x, y, z, mat, 'door', side=side, h='lower'); b.set(x, y + 1, z, mat, 'door', side=side, h='upper')

def thick_ring(r):
    D = disc(r); out = set()
    for (x, z) in D:
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                if (x + dx, z + dz) not in D: out.add((x, z))
    return out
