"""Original procedural 16x16 textures for ext/tech2026.py (copper, redstone, rails, ocean, workstations).

Every texture is made here from noise and simple shapes, in the same style as textures.py.
Nothing is copied or traced from Mojang's art: only the colour family and the idea of the
pattern (plank lines, mortar, rails on ties, a ring of patina) follow the real block.
Arrays are 16x16x4 floats (RGBA, 0..255), like textures.py. Row index = v (down), column = u.
"""
import math
import numpy as np
import textures as tx
from textures import T, hexrgb, noise, solid, _rng

YY, XX = np.mgrid[0:T, 0:T]
CY, CX = YY + 0.5, XX + 0.5          # pixel centres


def clear():
    return np.zeros((T, T, 4), float)


def col(c):
    return hexrgb(c) if isinstance(c, str) else np.asarray(c, float)


def mix(a, b, t):
    return col(a) * (1 - t) + col(b) * t


def hexs(rgb):
    r, g, b = (int(max(0, min(255, round(v)))) for v in rgb)
    return '#%02x%02x%02x' % (r, g, b)


def rect(img, x0, y0, x1, y1, c, a=255):
    """Fill columns x0..x1-1 and rows y0..y1-1."""
    img[y0:y1, x0:x1, :3] = col(c); img[y0:y1, x0:x1, 3] = a
    return img


def paint(img, mask, c, a=255, amp=0, seed='pt'):
    n = mask.sum()
    if not n: return img
    v = np.tile(col(c), (n, 1))
    if amp: v = v + _rng(seed).normal(0, amp, (n, 1))
    img[mask, :3] = v; img[mask, 3] = a
    return img


def blotch(seed, frac, smooth=2):
    """A soft random mask covering about `frac` of the tile (patina spots, moss)."""
    if frac <= 0: return np.zeros((T, T), bool)
    n = _rng(seed).random((T, T))
    for _ in range(smooth):
        n = (n + np.roll(n, 1, 0) + np.roll(n, -1, 0) + np.roll(n, 1, 1) + np.roll(n, -1, 1)) / 5
    return n >= np.quantile(n, 1 - frac)


def border(img, c, w=1):
    C = col(c)
    img[:w, :, :3] = C; img[-w:, :, :3] = C; img[:, :w, :3] = C; img[:, -w:, :3] = C
    return img


def bevel(img, x0, y0, x1, y1, hi=1.12, lo=0.78):
    """Light top-left edge and dark bottom-right edge on a rectangle (inclusive-exclusive)."""
    img[y0, x0:x1, :3] *= hi; img[y0:y1, x0, :3] *= hi
    img[y1 - 1, x0:x1, :3] *= lo; img[y0:y1, x1 - 1, :3] *= lo
    return img


def transpose(img):
    return np.ascontiguousarray(img.transpose(1, 0, 2))


# ---------------------------------------------------------------- copper family

STAGES = [
    # key prefix, name prefix, base, dark, light, patina spot colour, spot fraction
    ('', '', '#cc6d40', '#93472a', '#ee9e6c', '#5e9e80', 0.0),
    ('exposed_', 'Exposed ', '#a9704f', '#7a4d36', '#cf946f', '#78a68e', 0.12),   # brown-orange, a few green spots
    ('weathered_', 'Weathered ', '#5f9f7b', '#457b5d', '#88c29c', '#a07a58', 0.16),
    ('oxidized_', 'Oxidized ', '#47aa98', '#317f70', '#7cd6c3', '#58a983', 0.22),
]


def stage(i):
    k, n, base, dark, light, spot, frac = STAGES[i]
    return dict(i=i, key=k, name=n, base=base, dark=dark, light=light, spot=spot, frac=frac)


def copper_base(st, seed):
    """Plain metal: low noise, a soft diagonal sheen and patina spots for the stage."""
    img = noise(st['base'], 5, seed)
    img[..., :3] *= (1.06 - 0.10 * (XX + YY) / 30)[..., None]
    r = _rng(seed + 'h')
    for _ in range(6):                         # little hammered dents
        x, y = (int(v) for v in r.integers(1, 14, 2))
        img[y, x, :3] *= 1.12; img[y + 1, x + 1, :3] *= 0.9
    m = blotch(seed + 'p', st['frac'])
    if m.any():
        img[m, :3] = mix(img[m, :3], st['spot'], 0.8)
    return img


def copper_block(st):
    img = copper_base(st, 'cub' + st['key'])
    border(img, st['dark'])
    img[1, 1:15, :3] = mix(img[1, 1:15, :3], st['light'], 0.6); img[1:15, 1, :3] = mix(img[1:15, 1, :3], st['light'], 0.6)
    img[14, 2:15, :3] *= 0.88; img[2:15, 14, :3] *= 0.88
    return img


def cut_copper(st):
    """Four square tiles with grooves between them."""
    img = copper_base(st, 'cut' + st['key'])
    for o in (0, 8):
        img[o, :, :3] = mix(img[o, :, :3], st['light'], 0.55); img[:, o, :3] = mix(img[:, o, :3], st['light'], 0.55)
        img[o + 7, :, :3] = col(st['dark']); img[:, o + 7, :3] = col(st['dark'])
    return img


def chiseled_copper(st):
    """A framed panel with a carved square ring and a raised centre stud."""
    img = copper_base(st, 'chis' + st['key'])
    border(img, st['dark'])
    ring = (np.maximum(abs(CX - 8), abs(CY - 8)) > 4.5) & (np.maximum(abs(CX - 8), abs(CY - 8)) < 5.6)
    img[ring, :3] = col(st['dark'])
    inner = np.maximum(abs(CX - 8), abs(CY - 8)) < 2.6
    img[inner, :3] = mix(img[inner, :3], st['light'], 0.5)
    img[7:9, 7:9, :3] = col(st['dark'])
    bevel(img, 1, 1, 15, 15, 1.1, 0.88)
    return img


def copper_grate(st):
    """A lattice of copper with 2x2 holes (see-through)."""
    img = copper_base(st, 'gr' + st['key'])
    holes = np.zeros((T, T), bool)
    for a in (1, 5, 9, 13):
        for b in (1, 5, 9, 13):
            holes[a:a + 2, b:b + 2] = True
    img[holes, 3] = 0
    # shade bar edges next to holes
    below = np.roll(holes, 1, 0) & ~holes; right = np.roll(holes, 1, 1) & ~holes
    img[below, :3] *= 0.8; img[right, :3] *= 0.85
    border(img, st['dark'])
    return img


def copper_bulb(st, lit):
    img = copper_base(st, 'bulb' + st['key'])
    border(img, st['dark'])
    rect(img, 3, 3, 13, 13, st['dark'])
    if lit:
        g = np.clip(1 - np.hypot(CX - 8, CY - 8) / 7, 0, 1)
        win = (XX >= 4) & (XX < 12) & (YY >= 4) & (YY < 12)
        img[win, :3] = mix('#f6b84a', '#fff6d6', g[win][:, None] ** 0.8)
    else:
        win = (XX >= 4) & (XX < 12) & (YY >= 4) & (YY < 12)
        img[win, :3] = col('#4a362a') + _rng('bulb0').normal(0, 4, (win.sum(), 1))
        img[5, 5:7, :3] = col('#7a6a5a'); img[5:7, 5, :3] = col('#7a6a5a')
    for (x, y) in ((1, 1), (14, 1), (1, 14), (14, 14)):
        img[y, x, :3] = col(st['light'])
    return img


def copper_door(st, upper):
    img = copper_base(st, ('cdu' if upper else 'cdl') + st['key'])
    border(img, st['dark'])
    img[:, 1, :3] *= 1.08; img[:, 14, :3] *= 0.9
    if upper:
        for x0 in (3, 9):
            rect(img, x0, 3, x0 + 4, 10, '#a9c9cf')
            img[3, x0:x0 + 4, :3] = col('#e4f2f4'); img[4:6, x0 + 1, :3] = col('#e4f2f4')
            img[10, x0:x0 + 4, :3] = col(st['dark']) * 0.9
        img[13, 2:14, :3] = col(st['dark'])
    else:
        img[[2, 13], 2:14, :3] = col(st['dark'])
        img[7, 2:14, :3] = col(st['dark']); img[8, 2:14, :3] = mix(img[8, 2:14, :3], st['light'], 0.5)
        for (x, y) in ((3, 4), (12, 4), (3, 11), (12, 11)):
            img[y, x, :3] = col(st['light']); img[y + 1, x, :3] = col(st['dark'])
        rect(img, 11, 6, 13, 10, '#3a3430'); img[6, 11, :3] = col('#6a625a')
    return img


def copper_trapdoor(st):
    img = copper_base(st, 'ctd' + st['key'])
    border(img, st['dark'])
    for x0 in (3, 9):
        for y0 in (3, 9):
            rect(img, x0, y0, x0 + 4, y0 + 4, '#2f2722')
            img[y0 + 3, x0:x0 + 4, :3] = col(st['dark'])
    return img


def copper_chest(st, top=False):
    img = copper_base(st, ('cct' if top else 'ccs') + st['key'])
    border(img, st['dark'])
    if top:
        img[2:14, [2, 13], :3] = col(st['dark']); img[[2, 13], 2:14, :3] = col(st['dark'])
    else:
        img[5, :, :3] = col(st['dark']); img[6, :, :3] = mix(img[6, :, :3], st['dark'], 0.5)
        rect(img, 7, 4, 9, 9, st['light']); img[8, 7:9, :3] = col(st['dark'])
        img[1:5, :, :3] *= 1.05
    return img


def copper_lantern(st, top=False):
    """Copper cage. The side window (columns 6-9, rows 10-14) holds a green flame."""
    img = copper_base(st, 'clt' + st['key'])
    if top:
        rect(img, 6, 6, 10, 10, st['dark']); rect(img, 7, 7, 9, 9, '#2d2d33')
        return img
    img[:, [5, 10], :3] = col(st['dark'])
    img[9, :, :3] = col(st['dark']); img[15, :, :3] = col(st['dark'])
    g = np.clip(1 - np.hypot(CX - 8, CY - 12.5) / 3.2, 0, 1)
    win = (XX >= 6) & (XX < 10) & (YY >= 10) & (YY < 15)
    img[win, :3] = mix('#58c86a', '#eaffdc', g[win][:, None])
    return img


def chain_tex(c, light, dark):
    """Links along a vertical band (columns 6-9) and a horizontal band (rows 6-9). Cutout."""
    img = clear()
    def band(vertical):
        m = np.zeros((T, T), bool); hi = np.zeros((T, T), bool)
        for y0 in (0, 8):
            # a link seen face-on: a ring with a hole
            m[y0, 7:9] = True; m[y0 + 5, 7:9] = True
            m[y0 + 1:y0 + 5, 6] = True; m[y0 + 1:y0 + 5, 9] = True
            hi[y0 + 1:y0 + 5, 6] = True; hi[y0, 7] = True
            # a link seen edge-on, joining to the next ring
            m[y0 + 5:y0 + 8, 7:9] = True
        return (m, hi) if vertical else (m.T, hi.T)
    for v in (True, False):
        m, hi = band(v)
        paint(img, m, c, 255, 6, 'ch')
        img[hi & m, :3] = col(light)
    # dark edge on the right / bottom of solid pixels
    solid_px = img[..., 3] > 0
    edge = solid_px & ~np.roll(solid_px, -1, 1)
    img[edge, :3] = mix(img[edge, :3], dark, 0.5)
    return img


def bars_tex(c, light, dark, seed='bars'):
    """Bars for the pane shape: four uprights and three rails. Cutout."""
    img = clear()
    m = np.zeros((T, T), bool)
    m[:, [1, 6, 9, 14]] = True; m[[0, 7, 15], :] = True
    paint(img, m, c, 255, 6, seed)
    img[:, [1, 6, 9, 14], :3] = mix(img[:, [1, 6, 9, 14], :3], light, 0.35)
    img[[8], :, :3] = np.where(m[[8], :, None], img[[8], :, :3], 0)
    img[[7], :, :3] = mix(img[[7], :, :3], dark, 0.35)
    return img


def rod_tex(st):
    img = noise(st['base'], 5, 'rod' + st['key'])
    img[:, 7, :3] = mix(img[:, 7, :3], st['light'], 0.4); img[:, 8, :3] = mix(img[:, 8, :3], st['dark'], 0.3)
    img[:3, :, :3] = mix(img[:3, :, :3], st['light'], 0.3)
    return img


# ---------------------------------------------------------------- torches, flames, small parts

def stick(c='#7a5a36', seed='stick'):
    img = noise(c, 5, seed); img[:, ::3, :3] *= 0.9; return img


def flame(core, edge, seed='fl'):
    img = noise(edge, 8, seed)
    g = np.clip(1 - np.hypot(CX - 8, CY - 8) / 6, 0, 1)
    img[..., :3] = mix(img[..., :3], core, g[..., None])
    return img


def torch_head(c, hi, seed='th'):
    """A torch head: the middle 2x2 pixels are what the small head box shows, so colour them strongly."""
    img = noise(c, 6, seed)
    img[6:8, 7:9, :3] = col(hi)
    img[8:10, 7:9, :3] = mix(c, hi, 0.35)
    return img


def wick():
    return noise('#2a2622', 3, 'wick')


def book():
    img = noise('#6e3b2a', 4, 'book')
    img[:, 7:9, :3] = col('#4a2618')
    img[2:14, 2:7, :3] = col('#efe8d6'); img[2:14, 9:14, :3] = col('#efe8d6')
    for y in (4, 6, 8, 10, 12):
        img[y, 3:6, :3] = col('#9a9286'); img[y, 10:13, :3] = col('#9a9286')
    return img


# ---------------------------------------------------------------- redstone

def rs_dot(on):
    return noise('#ff2c1c' if on else '#5e1712', 8 if on else 5, 'rsd%d' % on)


def dust_off():
    return noise('#6a1611', 8, 'rsoff')


def rs_torch_head(on):
    if on:
        return torch_head('#ff2a1a', '#ff9a7a', 'rth1')
    return torch_head('#5a1812', '#6e2018', 'rth0')


def diode_top(seed):
    img = noise('#a9a9a9', 3, seed)
    border(img, '#8a8a8a'); img[1, 1:15, :3] *= 1.08; return img


def diode_side(seed):
    img = noise('#9c9c9c', 3, seed); img[:6, :, :3] *= 0.92; img[14:, :, :3] *= 0.85; return img


def machine_side(seed='msd'):
    """Furnace-like stone side used by dispensers, droppers and observers."""
    img = tx.stone('#7d7d7d', seed, 9)
    img[[0, 15], :, :3] *= 0.75
    return img


def machine_top(seed='mtp'):
    img = noise('#8a8a8a', 4, seed)
    border(img, '#5f5f5f'); img[1, 1:15, :3] *= 1.1; img[1:15, 1, :3] *= 1.1
    rect(img, 4, 4, 12, 12, '#6f6f6f'); bevel(img, 4, 4, 12, 12, 0.85, 1.12)
    return img


def dispenser_front():
    img = machine_side('dspf')
    d = np.hypot(CX - 8, CY - 8)
    img[(d < 4.6) & (d >= 3.4), :3] = col('#a3a3a3')
    img[d < 3.4, :3] = col('#1e1e20')
    img[(d < 3.4) & (CY < 6.5), :3] = col('#3a3a3e')
    return img


def dropper_front():
    img = machine_side('drpf')
    rect(img, 5, 6, 11, 11, '#a3a3a3'); rect(img, 6, 7, 10, 10, '#1e1e20'); img[7, 6:10, :3] = col('#3a3a3e')
    return img


def observer_front():
    img = noise('#666666', 4, 'obf')
    border(img, '#4a4a4a')
    for y in (3, 7, 11):
        rect(img, 3, y, 13, y + 2, '#232325'); img[y + 2, 3:13, :3] = col('#8a8a8a')
    return img


def observer_side():
    img = machine_side('obs')
    rect(img, 6, 0, 10, 16, '#5c5c5c'); img[:, 6, :3] *= 0.8; img[:, 9, :3] *= 1.1
    return img


def observer_top():
    img = noise('#757575', 4, 'obt')
    rect(img, 6, 0, 10, 16, '#5c5c5c')
    for y in (3, 4, 5): img[y, 7 - (y - 3):9 + (y - 3), :3] = col('#9a9a9a')
    return img


def observer_back(on):
    img = noise('#3f3f42', 4, 'obb')
    border(img, '#2a2a2c')
    rect(img, 5, 5, 11, 11, '#2a2a2c')
    rect(img, 6, 6, 10, 10, '#ff3a26' if on else '#5a1a14')
    if on: img[6:8, 6:8, :3] = col('#ffb09a')
    return img


def crafter_top(on):
    img = noise('#7a7a7a', 4, 'crt')
    border(img, '#5a5a5a')
    for a in (2, 6, 10):
        for b in (2, 6, 10):
            rect(img, a, b, a + 4, b + 4, '#3c3c3e')
            img[b, a:a + 4, :3] = col('#2a2a2c')
    if on:
        for a, b in ((6, 6), (2, 10), (10, 2)):
            rect(img, a + 1, b + 1, a + 3, b + 3, '#ff6a3a')
    return img


def crafter_front(on):
    img = machine_side('crf')
    rect(img, 3, 8, 13, 13, '#2b2b2d'); img[8, 3:13, :3] = col('#151516'); img[13, 3:13, :3] = col('#a0a0a0')
    rect(img, 7, 3, 9, 5, '#ff3a26' if on else '#5a1a14')
    return img


def crafter_side(on):
    img = noise('#6f6f6f', 4, 'crs')
    border(img, '#505050')
    rect(img, 2, 2, 14, 6, '#8a5f33'); img[2, 2:14, :3] *= 1.15; img[5, 2:14, :3] *= 0.8
    rect(img, 7, 9, 9, 13, '#ff3a26' if on else '#5a1a14')
    return img


def piston_inner():
    img = tx.stone('#8a8a8a', 'pin', 8)
    rect(img, 5, 5, 11, 11, '#3a3a3a'); rect(img, 6, 6, 10, 10, '#262626')
    return img


def piston_base_side():
    """The stone sides of an extended piston base (the wooden rim belongs to the head)."""
    img = tx.stone('#8a8a8a', 'pbs', 9); img[[0, 15], :, :3] *= 0.8
    return img


def piston_arm():
    img = tx.planks('#a8743e', 'parm'); return img


def slime():
    img = solid('#7cc86e', 150)
    img[..., :3] += _rng('slime').normal(0, 5, (T, T, 1))
    border(img, '#a6e696'); img[[0, -1], :, 3] = 215; img[:, [0, -1], 3] = 215
    inner = (XX >= 4) & (XX < 12) & (YY >= 4) & (YY < 12)
    img[inner, :3] = col('#5fae55'); img[inner, 3] = 200
    edge = inner & ((XX == 4) | (XX == 11) | (YY == 4) | (YY == 11))
    img[edge, :3] = col('#4a8f42')
    img[5, 5:7, :3] = col('#b8f0a8'); img[5:7, 5, :3] = col('#b8f0a8')
    return img


def honey():
    img = solid('#f2a72e', 175)
    img[..., :3] += _rng('honey').normal(0, 5, (T, T, 1))
    border(img, '#fbc95c'); img[[0, -1], :, 3] = 220; img[:, [0, -1], 3] = 220
    inner = (XX >= 3) & (XX < 13) & (YY >= 3) & (YY < 13)
    img[inner, :3] = col('#e49522'); img[inner, 3] = 205
    img[3, 4:12, :3] = col('#ffd98a'); img[4:12, 3, :3] = col('#ffd98a')
    return img


def target(top=False):
    img = noise('#e6d6b0', 5, 'tgt' + str(top))
    d = np.hypot(CX - 8, CY - 8)
    img[d < 6.6, :3] = col('#c8322a'); img[d < 4.9, :3] = col('#f1ead8'); img[d < 3.1, :3] = col('#c8322a')
    img[d < 1.5, :3] = col('#e04436')
    img[..., :3] += _rng('tgtn').normal(0, 3, (T, T, 1))
    return img


# ---------------------------------------------------------------- rails

RAIL_TIE = '#6b4a2c'


def rail_tex(kind='rail', on=False):
    """Rails run along the texture's columns (north-south). Transposed for east-west."""
    img = clear()
    ties = np.zeros((T, T), bool)
    for y in (1, 5, 9, 13):
        ties[y:y + 2, 1:15] = True
    tie_c = '#4f3d2c' if kind == 'activator' else RAIL_TIE
    paint(img, ties, tie_c, 255, 5, 'tie' + kind)
    img[[2, 6, 10, 14], 1:15, :3] *= 0.78
    if kind in ('powered', 'activator', 'detector'):
        mid = np.zeros((T, T), bool); mid[:, 7:9] = True
        c = ('#ff2c1c' if on else '#5e1712')
        if kind == 'detector':
            mid[:] = False
        paint(img, mid, c, 255, 6 if on else 3, 'mid' + kind + str(on))
    if kind == 'detector':
        rect(img, 5, 5, 11, 11, '#8c8c8c'); bevel(img, 5, 5, 11, 11)
        rect(img, 7, 7, 9, 9, '#ff2c1c' if on else '#5e1712')
    rail_c = '#e0b232' if kind == 'powered' else '#a2a2a6'
    rl = np.zeros((T, T), bool); rl[:, 2:4] = True; rl[:, 12:14] = True
    paint(img, rl, rail_c, 255, 4, 'rail' + kind)
    img[:, [2, 12], :3] = mix(img[:, [2, 12], :3], '#ffffff', 0.3)
    img[:, [3, 13], :3] *= 0.72
    return img


def rail_curve(corner='SE'):
    """Plain rail curving between two edges. corner = the two sides it joins."""
    img = clear()
    # build for the S-E corner (centre of the curve at the bottom-right corner), then flip
    r = np.hypot(16 - CX, 16 - CY); ang = np.arctan2(16 - CY, 16 - CX)   # 0..pi/2
    tie = np.zeros((T, T), bool)
    for a in np.linspace(0.12, math.pi / 2 - 0.12, 5):
        tie |= (abs(ang - a) < 0.13) & (r > 1.5) & (r < 14.8)
    paint(img, tie, RAIL_TIE, 255, 5, 'ctie')
    rl = (abs(r - 3) < 0.9) | (abs(r - 13) < 0.9)
    paint(img, rl, '#a2a2a6', 255, 4, 'crl')
    img[rl & (r < 3) | rl & (r < 13) & (r > 6), :3] = mix(img[rl & (r < 3) | rl & (r < 13) & (r > 6), :3], '#ffffff', 0.25)
    if 'N' in corner: img = img[::-1]
    if 'W' in corner: img = img[:, ::-1]
    return np.ascontiguousarray(img)


# ---------------------------------------------------------------- ocean

def prismarine_bricks():
    img = tx.bricks('#62ad9d', '#3d7d70', 4, 8, 'pbr', 7)
    img[[0, 4, 8, 12], :, :3] = mix(img[[0, 4, 8, 12], :, :3], '#a4ddd0', 0.35)
    return img


CORAL = {   # key: (name, colour, light, dark)
    'tube': ('Tube', '#3357d0', '#6f8ff0', '#22389a'),
    'brain': ('Brain', '#d2609c', '#f09ac4', '#9c3c70'),
    'bubble': ('Bubble', '#a52fa5', '#d26ad2', '#741f74'),
    'fire': ('Fire', '#c8323a', '#ee6a6e', '#8c1f26'),
    'horn': ('Horn', '#d6c23c', '#f2e27a', '#9e8a22'),
}


def coral_block(kind):
    name, c, lt, dk = CORAL[kind]
    img = noise(c, 9, 'cor' + kind); r = _rng('corp' + kind)
    if kind == 'brain':
        wav = (np.sin(CX * 1.3 + np.sin(CY * 0.9) * 2) > 0.55)
        img[wav, :3] = mix(img[wav, :3], dk, 0.55)
    elif kind == 'bubble':
        for _ in range(9):
            x, y = (int(v) for v in r.integers(0, 15, 2))
            img[y:y + 2, x:x + 2, :3] = col(lt); img[y + 1, x + 1, :3] = col(c)
    elif kind == 'horn':
        img[(XX + YY * 2) % 5 == 0, :3] = mix(img[(XX + YY * 2) % 5 == 0, :3], dk, 0.5)
    for _ in range(14):
        x, y = (int(v) for v in r.integers(0, 16, 2))
        img[y, x, :3] = col(dk) if r.random() < 0.6 else col(lt)
    return img


def coral_fan(kind):
    """A fan of five fingers spreading up from a narrow base (rows 6-15). Cutout."""
    name, c, lt, dk = CORAL[kind]
    img = clear()
    dy = 16 - CY; dx = CX - 8
    ang = np.degrees(np.arctan2(dx, dy)); rad = np.hypot(dx, dy)
    fan = (abs(ang) < 62) & (rad < 10.3)
    gap = (rad > 4.5) & (abs(((ang + 62) % 24.8) - 12.4) > 9.6)        # notches between the fingers
    fan &= ~gap
    paint(img, fan, c, 255, 8, 'fan' + kind)
    vein = fan & (abs(((ang + 62) % 24.8) - 12.4) < 1.0) & (rad > 2)
    img[vein, :3] = col(dk)
    img[fan & (rad > 8.8), :3] = col(lt)
    return img


def line_mask(pts, w=1.0):
    """Pixels within w/2 of a polyline (points in pixel units, (x, y))."""
    m = np.zeros((T, T), bool)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy or 1e-9
        t = np.clip(((CX - x0) * dx + (CY - y0) * dy) / L2, 0, 1)
        m |= np.hypot(CX - (x0 + t * dx), CY - (y0 + t * dy)) <= w / 2 + 0.25
    return m


def coral_plant(kind):
    """A small coral tree: one trunk that splits into upward branches with round tips. Cutout."""
    name, c, lt, dk = CORAL[kind]
    img = clear()
    branches = [[(8, 16), (8, 11), (5, 7), (3.5, 3.5)], [(8, 11), (11, 7), (12.5, 4)],
                [(8, 12), (8.5, 6), (8, 3.5)], [(5.6, 8), (2.5, 6.5)], [(10.6, 8), (13.5, 7)]]
    m = np.zeros((T, T), bool)
    for pts in branches: m |= line_mask(pts, 1.6)
    paint(img, m, c, 255, 7, 'cpl' + kind)
    for (x, y) in ((3.5, 3.5), (12.5, 4), (8, 3.5), (2.5, 6.5), (13.5, 7)):
        tip = np.hypot(CX - x, CY - y) < 1.25
        paint(img, tip, lt, 255)
    img[13:16, 7:9, :3] = col(dk)
    return img


def kelp():
    img = clear(); r = _rng('kelp')
    for y in range(T):
        x = int(round(7 + 1.4 * math.sin(y / 2.4)))
        img[y, x:x + 2, :3] = col('#3f7a2c'); img[y, x:x + 2, 3] = 255
        if y % 4 == 1:
            side = 1 if (y // 4) % 2 else -1
            for k in range(1, 5):
                xx = x + (1 + k if side > 0 else -k); yy = y - (k // 2)
                if 0 <= xx < T and 0 <= yy < T:
                    img[yy, xx, :3] = col('#5b9a3a') * (0.95 + 0.1 * r.random()); img[yy, xx, 3] = 255
    return img


def seagrass():
    img = clear()
    for x, h, lean in ((2, 9, 1), (5, 13, -1), (8, 11, 1), (11, 14, -1), (13, 8, 1)):
        for i in range(h):
            xx = x + (lean if i > h * 0.6 else 0); y = 15 - i
            img[y, xx, :3] = col('#4f9a3a') * (1.15 if i % 3 == 0 else 1); img[y, xx, 3] = 255
    return img


def sea_pickle(top=False):
    if top:
        img = noise('#7d9a32', 6, 'spt'); d = np.hypot(CX - 8, CY - 8)
        img[d < 2.2, :3] = col('#d8f2a6'); img[(d >= 2.2) & (d < 3.2), :3] = col('#5a7a22')
        return img
    img = noise('#6a8a2a', 6, 'sps'); img[:, ::2, :3] *= 0.88
    img[:2, :, :3] = mix(img[:2, :, :3], '#c8e890', 0.4)
    return img


def conduit():
    img = noise('#a98c5c', 6, 'cond')
    rect(img, 6, 6, 10, 10, '#2f4f6e'); d = np.hypot(CX - 8, CY - 8)
    img[d < 1.6, :3] = col('#bff2ff'); img[(d >= 1.6) & (d < 2.2), :3] = col('#5fb6d8')
    img[[5, 10], 5:11, :3] = col('#7a6040'); img[5:11, [5, 10], :3] = col('#7a6040')
    return img


def sponge(wet=False):
    base, pore, lt = ('#a59b3c', '#6c6424', '#c2b65a') if wet else ('#cfc24c', '#958a2a', '#e8dc72')
    img = noise(base, 6, 'spg%d' % wet); r = _rng('spgp%d' % wet)
    for _ in range(18 if wet else 13):
        x, y = (int(v) for v in r.integers(0, 15, 2)); w = int(r.integers(1, 3))
        img[y:y + w, x:x + w, :3] = col(pore); img[y + w if y + w < T else y, x, :3] = col(lt)
    if wet:
        m = blotch('wets', 0.15); img[m, :3] = mix(img[m, :3], '#6f8a8a', 0.35)
    return img


def tinted_glass():
    img = solid('#2d2533', 200)
    img[..., :3] += _rng('tint').normal(0, 4, (T, T, 1))
    border(img, '#4a3d56'); img[[0, -1], :, 3] = 235; img[:, [0, -1], 3] = 235
    r = _rng('tints')
    for _ in range(9):
        x, y = (int(v) for v in r.integers(1, 15, 2)); img[y, x, :3] = col('#6a5a7a')
    img[3:6, 10, :3] = col('#5e4e6e'); img[4, 9:12, :3] = col('#5e4e6e')
    return img


# ---------------------------------------------------------------- workstations

def wood_planks(c, seed):
    return tx.planks(c, seed)


def lectern_top():
    img = tx.planks('#a47c47', 'lect'); border(img, '#6b4c28'); return img


def lectern_side():
    img = tx.planks('#a47c47', 'lecs'); img[:, [0, 15], :3] *= 0.75; return img


def cartography_top():
    img = noise('#4a3219', 4, 'cartt')
    rect(img, 2, 2, 14, 14, '#e6d8b4')
    paint(img, (XX >= 2) & (XX < 14) & (YY >= 2) & (YY < 14) & (_rng('cmap').random((T, T)) < 0.12), '#cdbb90')
    for (x0, y0, x1, y1) in ((3, 9, 9, 10), (8, 4, 9, 10), (8, 4, 13, 5), (5, 6, 6, 9), (10, 7, 13, 8)):
        rect(img, x0, y0, x1, y1, '#8a6a42')
    rect(img, 11, 10, 13, 12, '#c84a3a')
    return img


def cartography_side():
    img = tx.planks('#4a3219', 'carts')
    rect(img, 3, 3, 13, 9, '#e6d8b4'); img[5, 4:12, :3] = col('#a88c5e'); img[7, 4:10, :3] = col('#a88c5e')
    rect(img, 2, 11, 14, 13, '#2c1e10')
    return img


def fletching_top():
    img = tx.planks('#d6c48a', 'flt'); border(img, '#a8955e')
    for x0, y0 in ((3, 3), (9, 8)):
        for i in range(5):
            img[y0 + i, x0 + i, :3] = col('#5a4024')
            if i < 4: img[y0 + i, x0 + i + 1, :3] = col('#f4f2ea'); img[y0 + i + 1, x0 + i, :3] = col('#cfcac0')
    return img


def fletching_side():
    img = tx.planks('#c9b47c', 'fls'); img[:2, :, :3] = col('#8a7444'); img[14:, :, :3] = col('#8a7444')
    for x in (4, 10):
        img[4:11, x, :3] = col('#5a4024'); img[4:7, x - 1, :3] = col('#f4f2ea'); img[4:7, x + 1, :3] = col('#dedad0')
    return img


def smithing_top():
    img = noise('#3a3a40', 4, 'smt'); border(img, '#25252a')
    rect(img, 3, 3, 13, 13, '#4f4f57'); bevel(img, 3, 3, 13, 13, 1.2, 0.8)
    return img


def smithing_side():
    img = tx.planks('#3e2a18', 'sms'); rect(img, 0, 0, 16, 4, '#5a5a62'); img[4, :, :3] = col('#2a2a2e')
    rect(img, 6, 6, 10, 10, '#7a7a82'); bevel(img, 6, 6, 10, 10)
    return img


def stonecutter_top():
    img = noise('#8f8f8f', 4, 'sct'); border(img, '#6a6a6a')
    rect(img, 1, 7, 15, 9, '#3a3a3a')
    return img


def stonecutter_side():
    """The base is 9 px tall, so only rows 7-15 show: a dark rim on top, stone below."""
    img = tx.stone('#8a8a8a', 'scs', 8)
    rect(img, 0, 7, 16, 9, '#5f5f5f'); img[9, :, :3] *= 1.12
    img[13:, :, :3] *= 0.88
    return img


def saw():
    """Round blade, top half visible above the stonecutter (rows 0-8). Cutout."""
    img = clear()
    d = np.hypot(CX - 8, CY - 8.5); ang = np.degrees(np.arctan2(CY - 8.5, CX - 8))
    blade = (d < 7.6) & (CY < 8.6)
    teeth_gap = (d > 6.6) & ((ang // 18) % 2 == 0)
    blade &= ~teeth_gap
    paint(img, blade, '#8e8e96', 255, 3, 'saw')
    rim = blade & (d > 5.4)
    img[rim, :3] = col('#dcdce2')
    img[blade & (d < 2.6), :3] = col('#55555c')
    img[blade & (d < 1.2), :3] = col('#2e2e33')
    return img


def grindstone_side():
    """The round face of the wheel: a dark rim, a light stone ring and a wooden axle."""
    img = noise('#9c9c9c', 5, 'grs')
    d = np.hypot(CX - 8, CY - 8)
    img[d >= 6.6, :3] = col('#6e6e6e')
    img[(d > 3.6) & (d < 4.4), :3] = col('#7a7a7a')
    img[d < 2.2, :3] = col('#5a4024'); img[d < 1.1, :3] = col('#3a2a16')
    img[d >= 7.6, :3] = col('#5a5a5a')
    return img


def grindstone_top():
    """The wheel's rim: grip lines across it."""
    img = noise('#8e8e8e', 4, 'grt')
    img[::2, :, :3] *= 0.84
    img[:, [0, 15], :3] *= 0.8
    return img


def loom_front():
    img = tx.planks('#a8834c', 'lmf'); border(img, '#6a4a26')
    rect(img, 3, 2, 13, 13, '#d9cfb8')
    img[2:13, 3:13:2, :3] = col('#f4efe2')
    rect(img, 3, 9, 13, 13, '#b8342e'); img[9, 3:13, :3] = col('#8a221e')
    rect(img, 2, 13, 14, 15, '#6a4a26')
    return img


def loom_top():
    img = tx.planks('#a8834c', 'lmt'); border(img, '#6a4a26')
    rect(img, 3, 6, 13, 10, '#e8e0cc'); img[6:10, 3:13:3, :3] = col('#c4b89a')
    rect(img, 6, 6, 10, 10, '#c9453a')
    return img


def loom_side():
    img = tx.planks('#a8834c', 'lms'); img[:, [0, 15], :3] *= 0.7; img[[0, 15], :, :3] *= 0.7
    rect(img, 4, 4, 12, 8, '#e8e0cc'); img[4:8, 4:12:2, :3] = col('#c4b89a')
    return img


def composter_top():
    img = tx.planks('#8a6232', 'cmt'); rect(img, 2, 2, 14, 14, '#4a3820')
    m = (XX >= 2) & (XX < 14) & (YY >= 2) & (YY < 14) & (_rng('cmp').random((T, T)) < 0.25)
    paint(img, m, '#6a8a3a', 255, 8, 'cmpg')
    img[2, 2:14, :3] *= 0.6; img[2:14, 2, :3] *= 0.6
    return img


def composter_side():
    img = tx.planks('#8a6232', 'cms')
    img[:, [0, 15], :3] = col('#5c3f1e'); img[[0, 15], :, :3] = col('#5c3f1e')
    img[:, 5:11:5, :3] *= 0.8
    return img


def beehive_side():
    img = noise('#c9a35a', 5, 'bhs')
    for y in (0, 5, 10, 15): img[y, :, :3] = col('#8f6c32')
    img[1:5, :, :3] *= 1.05; img[:, [0, 15], :3] *= 0.85
    return img


def beehive_front():
    img = beehive_side().copy()
    rect(img, 5, 9, 11, 13, '#2a1e10'); img[9, 5:11, :3] = col('#16100a')
    rect(img, 4, 13, 12, 14, '#e8b84a')
    return img


def beehive_top():
    img = noise('#d2ad62', 5, 'bht'); border(img, '#8f6c32')
    d = np.maximum(abs(CX - 8), abs(CY - 8))
    img[(d > 3.5) & (d < 4.5), :3] = col('#a8843e'); img[d < 1.6, :3] = col('#a8843e')
    return img


def blast_front(lit):
    img = tx.stone('#6f6f74', 'blf', 7)
    rect(img, 0, 0, 16, 3, '#9a9aa2'); img[3, :, :3] = col('#4a4a50')
    rect(img, 3, 6, 13, 14, '#f59e2b' if lit else '#1e1e20')
    if lit: img[10:14, 4:12, :3] = col('#ffd36a')
    img[6:14, [5, 8, 10], :3] = col('#4a4a50')
    return img


def blast_side():
    img = tx.stone('#6f6f74', 'bls', 7)
    rect(img, 0, 0, 16, 3, '#9a9aa2'); img[3, :, :3] = col('#4a4a50')
    rect(img, 0, 13, 16, 16, '#5a5a60')
    img[6:12, [3, 12], :3] = col('#55555b')
    return img


def blast_top():
    img = noise('#7a7a80', 4, 'blt'); border(img, '#4a4a50')
    rect(img, 3, 3, 13, 13, '#9a9aa2'); rect(img, 5, 5, 11, 11, '#55555b')
    return img


def smoker_front(lit):
    img = tx.stone('#7a7a7a', 'smf', 8)
    rect(img, 0, 0, 16, 4, '#5a4026'); img[4, :, :3] = col('#3a2a18')
    rect(img, 3, 7, 13, 14, '#f59e2b' if lit else '#1e1e1e')
    if lit: img[11:14, 4:12, :3] = col('#ffd36a')
    img[7, 2:14, :3] = col('#3a3a3a'); img[7:14, [2, 13], :3] = col('#3a3a3a')
    return img


def smoker_side():
    img = tx.stone('#7a7a7a', 'sms2', 8)
    rect(img, 0, 0, 16, 4, '#5a4026'); img[4, :, :3] = col('#3a2a18')
    img[:4, ::4, :3] *= 0.8
    return img


def smoker_top():
    img = tx.log_top('#4a3520', '#6e5232', 'smt')
    rect(img, 5, 5, 11, 11, '#2a2a2a')
    return img


def pot_side():
    img = noise('#9c5636', 6, 'pots')
    img[[2, 3], :, :3] = col('#7a3e24'); img[12, :, :3] = col('#7a3e24')
    img[6:9, 2:14:4, :3] = col('#c27a52'); img[7, 3:14:4, :3] = col('#c27a52')
    return img


def pot_top():
    img = noise('#a05a3a', 6, 'pott'); d = np.maximum(abs(CX - 8), abs(CY - 8))
    img[d < 3.2, :3] = col('#2e1a10'); img[(d >= 3.2) & (d < 4.2), :3] = col('#7a3e24')
    return img


def candle(c, seed):
    img = noise(c, 4, seed); img[:, 7, :3] *= 1.08; img[:, 8, :3] *= 0.92
    return img


def frame_tex(rim, inner):
    img = noise(inner, 4, 'frm' + rim)
    ring = (XX >= 2) & (XX < 14) & (YY >= 2) & (YY < 14) & ~((XX >= 4) & (XX < 12) & (YY >= 4) & (YY < 12))
    img[ring, :3] = col(rim) + _rng('frmr' + rim).normal(0, 6, (ring.sum(), 1))
    img[2, 2:14, :3] *= 1.15; img[13, 2:14, :3] *= 0.8
    img[4, 4:12, :3] *= 0.75; img[4:12, 4, :3] *= 0.8
    return img


def jack_face():
    """Carved face glowing from inside (our own design: round eyes, a wide grin)."""
    img = tx.pumpkin_side().copy()
    glow, deep = col('#ffd84a'), col('#f59a22')
    for cx in (4.5, 11.5):
        d = np.hypot(CX - cx, CY - 5.5); img[d < 1.9, :3] = glow
        img[(d < 1.9) & (CY < 5), :3] = deep
    mouth = (YY >= 9) & (YY <= 11) & (XX >= 3) & (XX <= 12)
    img[mouth, :3] = glow
    img[12, 5:11, :3] = glow
    img[9, [5, 10], :3] = col('#c9791a'); img[11, 7:9, :3] = col('#c9791a')
    img[9, 3:13, :3] = np.where(mouth[9, 3:13, None], deep, img[9, 3:13, :3])
    return img


def glazed(c, light, dark, variant=0):
    """Glazed terracotta: a four-fold tile motif in three tones (our own design)."""
    img = noise(c, 3, 'gl' + c)
    u = np.minimum(XX, 15 - XX); v = np.minimum(YY, 15 - YY)       # 0..7 from each edge
    if variant == 0:
        img[(u + v == 7) | (u + v == 8), :3] = col(light)
        img[(u < 2) & (v < 2), :3] = col(dark)
        img[np.hypot(u - 4.5, v - 4.5) < 1.3, :3] = col(dark)
        img[(u == 7) & (v == 7), :3] = col(light)
    elif variant == 1:
        img[((u == 1) | (v == 1)) & (u <= 6) & (v <= 6), :3] = col(dark)
        img[(abs(u - v) <= 0) & (u >= 3), :3] = col(light)
        img[(u >= 5) & (v >= 5), :3] = col(light)
        img[(u == 7) & (v == 7), :3] = col(dark)
    else:
        d = np.hypot(u - 7.5, v - 7.5)
        img[d < 3.4, :3] = col(light)
        img[d < 1.6, :3] = col(dark)
        img[(u < 3) & (v < 3) & ((u + v) % 2 == 0), :3] = col(dark)
        img[((u == 3) | (v == 3)) & (np.minimum(u, v) <= 3), :3] = col(light)
    return img


def quartz_bricks():
    img = tx.bricks('#ece6db', '#cfc5b3', 8, 8, 'qbr', 3)
    img[[0, 8], :, :3] = mix(img[[0, 8], :, :3], '#ffffff', 0.4)
    return img


def cobweb():
    img = clear()
    m = np.zeros((T, T), bool)
    for i in range(T):
        m[i, i] = True; m[i, 15 - i] = True
    m[7:9, :] = False; m[:, 7:9] = False
    m[7, 1:15] = True; m[1:15, 8] = True
    d = np.maximum(abs(CX - 8), abs(CY - 8))
    m |= (abs(d - 3.5) < 0.5) | (abs(d - 6.5) < 0.5)
    m &= _rng('web').random((T, T)) < 0.85
    paint(img, m, '#eef0f2', 230)
    return img
