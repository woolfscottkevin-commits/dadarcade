"""Original procedural 16x16 textures for ext/nature2026.py (woods, plants, 2024-2026 sets).

Every texture is made here from noise and simple patterns, in the same style as textures.py.
Nothing is copied or traced from Mojang's art: only the colour family and the idea of the
pattern (plank lines, brick mortar, rings on a log top) follow the real block.
Arrays are 16x16x4 floats (RGBA, 0..255), like textures.py.
"""
import numpy as np
import textures as tx
from textures import T, hexrgb, noise, solid, _rng

YY, XX = np.mgrid[0:T, 0:T]


def clear():
    return np.zeros((T, T, 4), float)


def put(img, x, y, c, a=255):
    """Set one pixel if it is inside the tile."""
    if 0 <= x < T and 0 <= y < T:
        img[y, x, :3] = hexrgb(c) if isinstance(c, str) else c
        img[y, x, 3] = a


def tint(c, f):
    return hexrgb(c) * f


# ---------------------------------------------------------------- wood

def stripped_side(c, seed='ss'):
    """Bark-free log side: smooth, with long faint vertical grain."""
    img = noise(c, 4, seed); r = _rng(seed + 'g')
    for x in range(T):
        img[:, x, :3] *= 1 + r.normal(0, 0.035)
    for _ in range(6):
        x = int(r.integers(0, 16)); y0 = int(r.integers(0, 9)); n = int(r.integers(5, 12))
        img[y0:y0 + n, x, :3] *= 0.86
    return img


def stripped_top(c, seed='st'):
    """Log end without bark: square growth rings."""
    img = noise(c, 4, seed)
    d = np.maximum(abs(XX - 7.5), abs(YY - 7.5))
    img[d > 6.5, :3] *= 0.84
    for ring in (1.5, 3.5, 5.5):
        img[abs(d - ring) < .5, :3] *= 0.9
    return img


def bark(c, seed='bk', fleck=None, streak=None, nfleck=7):
    """Log side. fleck: small light dashes across the bark. streak: bright vertical lines (nether stems)."""
    img = tx.log_side(c, seed); r = _rng(seed + 'f')
    if fleck:
        F = hexrgb(fleck)
        for _ in range(nfleck):
            x = int(r.integers(0, 15)); y = int(r.integers(0, 16)); w = int(r.integers(1, 3))
            img[y, x:x + w, :3] = F + r.normal(0, 6, 3)
    if streak:
        S = hexrgb(streak)
        for x in r.choice(16, 5, replace=False):
            y0 = int(r.integers(0, 8)); n = int(r.integers(4, 10))
            img[y0:y0 + n, int(x), :3] = S + r.normal(0, 8, (n, 1))[:min(n, 16 - y0)]
    return img


def log_end(bark_c, inner, seed='le', ring='#000000'):
    """Log top: bark rim and rings, like textures.log_top but with a bark rim of 1 px."""
    img = tx.log_top(bark_c, inner, seed)
    return img


def bamboo_planks(seed='bp'):
    img = noise('#c9b04c', 5, seed); r = _rng(seed)
    for x in (0, 4, 8, 12):
        img[:, x, :3] *= 0.74
    for x in (2, 6, 10, 14):
        img[:, x, :3] *= 1.06
    for i, y in enumerate((3, 9, 5, 13)):   # nodes: short lines across each strip
        x0 = i * 4 + 1
        img[y, x0:x0 + 3, :3] *= 0.82
    return img


def bamboo_mosaic(seed='bm'):
    """Basket weave: four 8x8 squares, strips running across and down in turn."""
    img = noise('#c9b04c', 4, seed)
    for qy in (0, 8):
        for qx in (0, 8):
            across = ((qx + qy) // 8) % 2 == 0
            for k in (0, 3, 6):
                if across: img[qy + k, qx:qx + 8, :3] *= 0.78
                else: img[qy:qy + 8, qx + k, :3] *= 0.78
            img[qy:qy + 8, qx, :3] *= 0.9; img[qy, qx:qx + 8, :3] *= 0.9
    img[[7, 15], :, :3] *= 0.75; img[:, [7, 15], :3] *= 0.75
    return img


def bamboo_block_side(c='#6f9a2a', seed='bbs'):
    img = noise(c, 6, seed)
    for x in (0, 4, 8, 12):
        img[:, x, :3] *= 0.72
    for i, y in enumerate((2, 7, 12, 4)):
        img[y, i * 4 + 1:i * 4 + 4, :3] *= 0.8
    return img


def bamboo_block_top(c='#6f9a2a', inner='#c9b04c', seed='bbt'):
    img = noise(c, 5, seed)
    for cy in (3, 11):
        for cx in (3, 11):
            img[cy - 2:cy + 2, cx - 2:cx + 2, :3] = hexrgb(inner)
            img[cy - 1:cy + 1, cx - 1:cx + 1, :3] *= 0.8
    return img


# ---------------------------------------------------------------- shelves

def shelf_board(c, seed='sb'):
    """Top of a shelf board: smooth stripped wood with grain running left to right."""
    img = noise(c, 4, seed); r = _rng(seed + 'r')
    for y in range(T):
        img[y, :, :3] *= 1 + r.normal(0, 0.035)
    for _ in range(4):
        y = int(r.integers(0, 16)); x0 = int(r.integers(0, 8))
        img[y, x0:x0 + int(r.integers(4, 9)), :3] *= 0.88
    return img


def shelf_inside(c, seed='si'):
    """The shaded back wall you see between the two shelf boards: three cubbies."""
    img = noise(c, 3, seed); img[..., :3] *= 0.52
    img[4, :, :3] *= 0.72            # shadow under the top board
    img[5, :, :3] *= 0.86
    for x in (5, 10):                # two thin dividers make three spots for items
        img[4:12, x, :3] = hexrgb(c) * 0.8
    img[11, :, :3] *= 1.12
    return img


# ---------------------------------------------------------------- leaves and plants

def leaves_cut(c, seed='lc', holes=0.09, light=None):
    """Leaves with a few see-through holes (register with cutout=True)."""
    img = tx.leaves(c, seed); r = _rng(seed + 'h')
    if light:
        m = r.random((T, T)) < 0.12; img[m, :3] = hexrgb(light) + r.normal(0, 8, (m.sum(), 1))
    m = r.random((T, T)) < holes
    m[0, :] = m[:, 0] = False
    img[m, 3] = 0
    return img


def dotted(img, colour, n, seed, size=1, glow=None):
    """Sprinkle n small dots (fireflies, blossoms)."""
    r = _rng(seed)
    for _ in range(n):
        x = int(r.integers(1, 15 - size)); y = int(r.integers(1, 15 - size))
        img[y:y + size, x:x + size, :3] = hexrgb(colour); img[y:y + size, x:x + size, 3] = 255
        if glow:
            for dx, dy in ((-1, 0), (size, 0), (0, -1), (0, size)):
                if 0 <= x + dx < T and 0 <= y + dy < T and img[y + dy, x + dx, 3] > 0:
                    img[y + dy, x + dx, :3] = img[y + dy, x + dx, :3] * 0.5 + hexrgb(glow) * 0.5
    return img


def petal_mat(petal, centre, seed, dark=None, leaf=None, n=5):
    """Flat flower clusters on a see-through tile (pink petals, wildflowers)."""
    img = clear(); r = _rng(seed)
    if leaf:   # a few small leaves under the flowers
        for _ in range(9):
            x = int(r.integers(0, 15)); y = int(r.integers(0, 15))
            put(img, x, y, leaf); put(img, x + 1, y, leaf)
    spots = [(3, 3), (11, 2), (7, 8), (2, 12), (12, 11), (8, 14)][:n]
    cols = petal if isinstance(petal, (list, tuple)) else [petal]
    for i, (cx, cy) in enumerate(spots):
        cx += int(r.integers(-1, 2)); cy += int(r.integers(-1, 2))
        c = cols[i % len(cols)]
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1)):
            put(img, cx + dx, cy + dy, hexrgb(c) * (0.92 + 0.12 * r.random()))
        if dark:
            put(img, cx + 1, cy + 1, dark)
        put(img, cx, cy, centre)
    return img


def litter(seed='ll'):
    """Fallen leaves: small brown and orange leaf shapes on a see-through tile."""
    img = clear(); r = _rng(seed)
    cols = ['#8a5f34', '#6f4a28', '#9c6a32', '#7a5230', '#a8743a']
    for i in range(14):
        x = int(r.integers(0, 14)); y = int(r.integers(0, 14)); c = hexrgb(cols[i % len(cols)])
        shape = [(0, 0), (1, 0), (0, 1), (1, 1), (2, 1)] if i % 2 else [(0, 0), (1, 0), (1, 1), (2, 1), (1, 2)]
        for dx, dy in shape:
            put(img, x + dx, y + dy, c * (0.9 + 0.2 * r.random()))
        put(img, x, y, c * 0.7)   # leaf stem
    return img


def straw_top(seed='strt'):
    """Straw lying lengthwise: long light and dark fibres."""
    img = noise('#cdb03e', 7, seed); r = _rng(seed)
    for x in range(T):
        img[:, x, :3] *= 1 + r.normal(0, 0.07)
    for _ in range(10):
        x = int(r.integers(0, 16)); y0 = int(r.integers(0, 12))
        img[y0:y0 + int(r.integers(3, 7)), x, :3] *= r.choice([0.75, 1.15])
    return img


def straw_side(seed='strs'):
    """Straw ends seen from the side, with a red tie only on the pillow height (rows 9-11)."""
    img = noise('#b8992c', 8, seed); r = _rng(seed)
    for y in range(T):
        img[y, :, :3] *= 1 + r.normal(0, 0.06)
    img[YY % 3 == 0, :3] *= 0.9
    img[9:12, 7:9, :3] = hexrgb('#a3322a')
    img[9:12, 7, :3] *= 0.85
    return img


def moss_strands(c='#7a8076', seed='hm'):
    img = noise(c, 9, seed); r = _rng(seed)
    for x in range(T):
        img[:, x, :3] *= 1 + r.normal(0, 0.08)
    return img


def shelf_fungus_top(seed='sft'):
    img = noise('#c17f45', 9, seed); r = _rng(seed)
    m = r.random((T, T)) < 0.16; img[m, :3] = hexrgb('#e7b46a')
    img[YY % 5 == 2, :3] *= 0.9
    return img


def shelf_fungus_side(seed='sfs'):
    img = noise('#eccf92', 5, seed)
    img[:3, :, :3] = hexrgb('#b9773f')     # the brown cap edge on top
    img[3, :, :3] *= 0.85
    return img


def stalk(c, joint, seed='stk', joints=(3, 8, 13)):
    """Sugar cane and bamboo stems: green with darker joints."""
    img = noise(c, 6, seed)
    for y in joints:
        img[y, :, :3] = hexrgb(joint)
    img[:, [0, 15], :3] *= 0.85
    return img


def cross_bush(c, seed, light=None, holes=0.14):
    return leaves_cut(c, seed, holes, light)


# ---------------------------------------------------------------- stone, mud, ice

def tiles(c, grout, seed='tl', size=4, amp=6):
    """Small square tiles on a straight grid (deepslate tiles)."""
    img = noise(c, amp, seed); r = _rng(seed)
    for ty in range(0, T, size):
        for tx_ in range(0, T, size):
            img[ty:ty + size, tx_:tx_ + size, :3] *= 0.9 + 0.2 * r.random()
    G = hexrgb(grout)
    img[YY % size == size - 1, :3] = G
    img[XX % size == size - 1, :3] = G
    img[YY % size == 0, :3] *= 1.08
    return img


def speckled(c, specks, seed, amp=8, n=(0.12,)):
    """Stone with coloured specks (granite, diorite, calcite, tuff)."""
    img = noise(c, amp, seed); r = _rng(seed + 'sp')
    for col, frac in zip(specks, n * len(specks) if len(n) == 1 else n):
        m = r.random((T, T)) < frac
        img[m, :3] = hexrgb(col) + r.normal(0, 6, (m.sum(), 1))
    return img


def polished(c, border, seed, amp=4):
    img = tx.panel(c, border, seed, amp)
    img[2:-2, -2, :3] *= 0.94; img[-2, 2:-2, :3] *= 0.94
    return img


def chiseled_tuff(seed='cht'):
    img = polished('#6f716a', '#55574f', seed)
    img[5:11, 2:14, :3] = hexrgb('#5f615a'); img[5, 2:14, :3] *= 0.8; img[10, 2:14, :3] *= 1.15
    img[7:9, 4:12, :3] = hexrgb('#7c7f76')
    return img


def packed_mud(seed='pmud'):
    img = noise('#8e6b4f', 7, seed); r = _rng(seed)
    for _ in range(9):   # dried straw bits
        x = int(r.integers(0, 14)); y = int(r.integers(0, 16))
        img[y, x:x + 3, :3] = hexrgb('#b39566')
    return img


def ice(seed='ice', c='#9dc3f5', a=165):
    img = solid(c, a); r = _rng(seed)
    img[..., :3] += r.normal(0, 4, (T, T, 1))
    for i in range(3, 9):
        put(img, 13 - i, i, '#eaf4ff', 210)
    put(img, 4, 11, '#eaf4ff', 200); put(img, 5, 12, '#eaf4ff', 200)
    img[0, :, 3] = img[:, 0, 3] = 200
    return img


def packed_ice(c='#9dbcf0', streak='#d8e8ff', seed='pice'):
    img = noise(c, 5, seed); r = _rng(seed)
    for _ in range(6):   # white frozen streaks
        x = int(r.integers(0, 12)); y = int(r.integers(0, 16)); n = int(r.integers(3, 6))
        for k in range(n):
            put(img, x + k, y - k // 2, streak)
    return img


def dripstone_tex(seed='drp'):
    img = noise('#86644f', 7, seed)
    wav = (YY + (np.sin(XX * 0.8) * 1.2).astype(int)) % 5
    img[wav == 0, :3] *= 0.82; img[wav == 2, :3] *= 1.08
    return img


# ---------------------------------------------------------------- resin

def resin_bricks(seed='rsb'):
    img = tx.bricks('#c45a1c', '#7a2c0c', 4, 8, seed, 8); r = _rng(seed + 'g')
    for row in range(0, T, 4):   # a glossy highlight near the top of each brick
        off = 0 if (row // 4) % 2 == 0 else 4
        for x in range(off + 2, T, 8):
            img[row, min(x, 15), :3] = hexrgb('#f0a050')
    return img


def chiseled_resin(seed='crs'):
    img = tx.panel('#c45a1c', '#7a2c0c', seed, 6)
    img[1, 1:15, :3] = hexrgb('#e08436'); img[1:15, 1, :3] = hexrgb('#e08436')
    d = abs(XX - 7.5) + abs(YY - 7.5)
    img[(d > 3.5) & (d < 5), :3] = hexrgb('#8a320e')
    img[d < 2.2, :3] = hexrgb('#f0a050')
    return img


def resin_block(seed='rblk'):
    img = noise('#d0661f', 9, seed); r = _rng(seed)
    for _ in range(5):
        x = int(r.integers(1, 13)); y = int(r.integers(1, 13))
        img[y:y + 2, x:x + 3, :3] = hexrgb('#f09a40'); put(img, x, y, '#ffd08a')
    m = r.random((T, T)) < 0.06; img[m, :3] = hexrgb('#9a3e10')
    return img


# ---------------------------------------------------------------- shelves (front) and straw beds

def shelf_front(c, seed='sf'):
    """Front of a wall shelf: wood frame, dark recess, two thin dividers make three cubbies.
    Rows 0-3 and 12-15 are the top and bottom boards, columns 0-1 and 14-15 the side posts."""
    img = noise(c, 4, seed); r = _rng(seed + 'g')
    for y in range(T):
        img[y, :, :3] *= 1 + r.normal(0, 0.03)
    C = hexrgb(c)
    rec = noise(c, 3, seed + 'r')[4:12, 2:14, :3] * 0.40
    img[4:12, 2:14, :3] = rec
    img[4, 2:14, :3] *= 0.7                 # shadow under the top board
    img[11, 2:14, :3] *= 1.25               # light catching the bottom board's lip
    for x in (5, 10):                       # dividers
        img[4:12, x, :3] = C * 0.82
    img[3, :, :3] *= 0.82                   # edge of the top board
    img[12, :, :3] *= 1.08                  # top edge of the bottom board
    img[:, 1, :3] *= 0.9; img[:, 14, :3] *= 0.9
    return img


def straw_mat(seed='strm', rotate=False):
    """Top of a straw bed: long fibres and one red tie across the middle."""
    img = noise('#d1b43f', 7, seed); r = _rng(seed)
    for x in range(T):
        img[:, x, :3] *= 1 + r.normal(0, 0.07)
    for _ in range(12):
        x = int(r.integers(0, 16)); y0 = int(r.integers(0, 13))
        img[y0:y0 + int(r.integers(3, 7)), x, :3] *= r.choice([0.74, 1.14])
    img[7:9, :, :3] = hexrgb('#a8352c'); img[8, :, :3] *= 0.8
    img[[0, 15], :, :3] *= 0.85
    return np.rot90(img).copy() if rotate else img


def straw_roll(seed='strr'):
    """Side of the straw bundles: fibres lying across."""
    img = noise('#c2a335', 8, seed); r = _rng(seed)
    for y in range(T):
        img[y, :, :3] *= 1 + r.normal(0, 0.07)
    img[YY % 3 == 0, :3] *= 0.88
    return img


# ---------------------------------------------------------------- small plants

def fungus_side(seed='sfs2'):
    """Rim of a shelf mushroom. Every third row is the brown cap edge, so any 3 px slice
    shows a brown top line over the pale underside."""
    img = noise('#ead09a', 5, seed)
    img[YY % 3 == 0, :3] = hexrgb('#a96a35') + _rng(seed).normal(0, 5, ((YY % 3 == 0).sum(), 1))
    return img


def petal_head(petal, centre, seed, ring=None, cs=(6, 10)):
    """Flower head seen from any side: petals with a coloured middle."""
    img = noise(petal, 7, seed)
    a, b = cs
    if ring:
        img[a - 1:b + 1, a - 1:b + 1, :3] = hexrgb(ring)
    img[a:b, a:b, :3] = hexrgb(centre)
    img[a, a:b, :3] *= 1.15
    return img


def stem_tex(c='#4f7f2f', seed='stm'):
    img = noise(c, 6, seed)
    img[:, ::3, :3] *= 0.9
    return img


def blades(c, seed='bl', tip=None):
    """Grass blades: vertical streaks, lighter tips at the top."""
    img = noise(c, 6, seed); r = _rng(seed)
    for x in range(T):
        img[:, x, :3] *= 1 + r.normal(0, 0.08)
    if tip:
        img[:4, :, :3] = img[:4, :, :3] * 0.4 + hexrgb(tip) * 0.6
    return img


def bush_tex(c, seed, dots=None, dot_c=None, holes=0.12, light=None):
    img = leaves_cut(c, seed, holes, light)
    if dots:
        dotted(img, dot_c, dots, seed + 'd')
    return img


def eyeblossom_open(seed='eyo'):
    """Open eyeblossom head: pale grey-white petals around a bright orange middle."""
    img = noise('#e6e2da', 6, seed)
    img[5:11, 5:11, :3] = hexrgb('#c9c3b8')
    img[6:10, 6:10, :3] = hexrgb('#f0882a')
    img[7:9, 7:9, :3] = hexrgb('#ffc061')
    return img


def eyeblossom_closed(seed='eyc'):
    """Closed eyeblossom bud: folded grey petals with dark lines."""
    img = noise('#8d8a86', 6, seed)
    img[:, [4, 8, 12], :3] *= 0.72
    img[:3, :, :3] *= 1.12
    return img


def twig(seed='twg'):
    img = noise('#5a5a2c', 7, seed)
    img[:, ::4, :3] *= 0.8
    return img


# ---------------------------------------------------------------- stone

def stone_speck(c, specks, seed, amp=9, frac=0.14, size=1):
    """Natural stone with small specks in other colours (granite, diorite, tuff, calcite)."""
    img = tx.stone(c, seed, amp); r = _rng(seed + 'x')
    for col in specks:
        m = r.random((T, T)) < frac
        if size > 1:
            m = m | np.roll(m, 1, 1)
        img[m, :3] = hexrgb(col) + r.normal(0, 7, (m.sum(), 1))
    return img


def mud_bricks(seed='mdb'):
    img = tx.bricks('#8f6c4c', '#6b4c33', 4, 8, seed, 6)
    img[YY % 4 == 0, :3] *= 1.07           # a light top edge on each row of bricks
    return img
