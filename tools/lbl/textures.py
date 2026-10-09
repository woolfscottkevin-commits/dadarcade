"""Procedural 16x16 block textures (original, generated from noise and patterns)."""
import numpy as np
from functools import lru_cache
import zlib

T = 16

def _rng(seed):
    return np.random.default_rng(zlib.crc32(str(seed).encode()))

def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], float)

def solid(c, a=255):
    img = np.zeros((T, T, 4), float); img[..., :3] = hexrgb(c); img[..., 3] = a; return img

def noise(c, amp=12, seed='n', a=255):
    img = solid(c, a); r = _rng(seed)
    n = r.normal(0, amp, (T, T, 1)); img[..., :3] += n; return img

def shade(img, mask, f):
    img[mask, :3] *= f; return img

def planks(c, seed='p'):
    img = noise(c, 7, seed); r = _rng(seed + 'x')
    for row in (3, 7, 11, 15):
        img[row, :, :3] *= 0.72
    offs = [3, 11, 6, 13]
    for i, o in enumerate(offs):
        y0 = i * 4; img[y0:y0 + 3, o, :3] *= 0.75
    for i in range(4):  # grain
        y = i * 4 + 1; xs = r.integers(0, 16, 3); img[y, xs, :3] *= 0.9
    return img

def log_side(c, seed='l'):
    img = noise(c, 8, seed); r = _rng(seed)
    for x in range(T):
        if r.random() < 0.45:
            ys = slice(r.integers(0, 6), r.integers(9, 16)); img[ys, x, :3] *= 0.78
    img[:, [0, 5, 10], :3] *= 0.85
    return img

def log_top(bark, inner, seed='lt'):
    img = noise(inner, 6, seed)
    yy, xx = np.mgrid[0:T, 0:T]; d = np.maximum(abs(xx - 7.5), abs(yy - 7.5))
    img[(d > 6.5), :3] = hexrgb(bark)
    for ring in (2.5, 4.5):
        img[(abs(d - ring) < 0.5), :3] *= 0.85
    return img

def stone(c, seed='s', amp=10):
    img = noise(c, amp, seed); r = _rng(seed + 'k')
    for _ in range(10):
        x, y = r.integers(0, 15, 2); img[y:y + 2, x:x + r.integers(1, 3), :3] *= r.choice([0.85, 1.1])
    return img

def cobble(c, seed='cb', moss=None):
    r = _rng(seed); pts = r.integers(0, 16, (9, 2))
    yy, xx = np.mgrid[0:T, 0:T]
    d = np.stack([np.minimum(abs(xx - px), 16 - abs(xx - px)) ** 2 + np.minimum(abs(yy - py), 16 - abs(yy - py)) ** 2 for px, py in pts])
    s = np.sort(d, 0); lab = np.argmin(d, 0)
    img = noise(c, 6, seed)
    for i in range(len(pts)):
        img[lab == i, :3] *= 0.85 + 0.3 * r.random()
    edge = (np.sqrt(s[1]) - np.sqrt(s[0])) < 1.0
    img[edge, :3] *= 0.55
    if moss:
        m = r.random((T, T)) < 0.3; img[m & ~edge, :3] = hexrgb(moss) + r.normal(0, 8, (m & ~edge).sum())[:, None]
    return img

def bricks(c, mortar, h=4, w=8, seed='b', amp=8):
    img = noise(c, amp, seed); r = _rng(seed)
    M = hexrgb(mortar)
    for row in range(0, T, h):
        img[row + h - 1, :, :3] = M
        off = 0 if (row // h) % 2 == 0 else w // 2
        for x in range(off, T + w, w):
            if 0 <= x < T: img[row:row + h, x, :3] = M
        for x in range(off - w, T, w):  # brick tone variety
            f = 0.9 + 0.2 * r.random(); xs = slice(max(0, x + 1), min(T, x + w)); img[row:row + h - 1, xs, :3] *= f
    return img

def glass(tint='#cfe8f0', a=70, frame='#e8f3f6'):
    img = solid(tint, a)
    F = hexrgb(frame)
    img[0, :, :3] = F; img[-1, :, :3] = F; img[:, 0, :3] = F; img[:, -1, :3] = F
    img[0, :, 3] = img[-1, :, 3] = img[:, 0, 3] = img[:, -1, 3] = 220
    for i in range(3, 8):
        img[i, 12 - i, :3] = 255; img[i, 12 - i, 3] = 170
    img[10, 10, :3] = 255; img[10, 10, 3] = 150; img[11, 9, :3] = 255; img[11, 9, 3] = 150
    return img

def leaves(c, seed='lv'):
    img = noise(c, 18, seed); r = _rng(seed)
    m = r.random((T, T)) < 0.22; img[m, :3] *= 0.6
    m2 = r.random((T, T)) < 0.1; img[m2, :3] *= 1.25
    return img

def wool(c, seed='w'):
    img = noise(c, 5, seed)
    yy, xx = np.mgrid[0:T, 0:T]; img[((xx + yy) % 4 == 0), :3] *= 0.93
    return img

def concrete(c, seed='c'):
    return noise(c, 3, seed)

def panel(c, border, seed='pn', amp=4):
    img = noise(c, amp, seed); B = hexrgb(border)
    img[0, :, :3] = B; img[-1, :, :3] = B; img[:, 0, :3] = B; img[:, -1, :3] = B
    img[1, 1:-1, :3] *= 1.12; img[1:-1, 1, :3] *= 1.12
    return img

def grass_top(c='#6aa84f', seed='gt'):
    img = noise(c, 14, seed); r = _rng(seed); m = r.random((T, T)) < 0.15; img[m, :3] *= 0.82; return img

def dirt(c='#8a5f3c', seed='d'):
    img = noise(c, 12, seed); r = _rng(seed + 'd')
    for _ in range(14):
        x, y = r.integers(0, 16, 2); img[y, x, :3] *= r.choice([0.7, 1.2])
    return img

def grass_side(seed='gs'):
    img = dirt(seed=seed); r = _rng(seed); G = grass_top(seed=seed + 't')
    for x in range(T):
        h = 3 + (r.random() < 0.5) + (r.random() < 0.3)
        img[:h, x] = G[:h, x]
    return img

def water():
    img = solid('#3f76e4', 175); r = _rng('wt')
    for y in (3, 9, 14):
        xs = (np.arange(5) + r.integers(0, 16)) % 16; img[y, xs, :3] = hexrgb('#6f9cf0')
    return img

def bookshelf_side(seed='bk'):
    img = planks('#a07a45', seed)
    cols = ['#8b2e2e', '#2e5c8b', '#3f7a3a', '#c9a13a', '#6b3f8b', '#8b5a2e', '#2e7b7b']
    r = _rng(seed)
    for band in ((2, 7), (9, 14)):
        x = 1
        while x < 15:
            w = int(r.integers(1, 3)); h0 = band[0] + int(r.integers(0, 2))
            img[h0:band[1], x:x + w, :3] = hexrgb(cols[int(r.integers(0, len(cols)))]); x += w
    return img

def hay_side():
    img = noise('#c9a227', 10, 'hay'); img[:, ::2, :3] *= 0.9
    for y in (3, 4, 11, 12): img[y, :, :3] = hexrgb('#7a4f1f')
    return img

def ore_blocks(c, border):
    return panel(c, border, amp=5)

def lamp(lit=False):
    if lit:
        img = noise('#f6c85f', 10, 'lamp1'); img[[0, -1], :, :3] = hexrgb('#8a4f21'); img[:, [0, -1], :3] = hexrgb('#8a4f21')
        img[[5, 10], :, :3] *= 0.8; img[:, [5, 10], :3] *= 0.8
    else:
        img = noise('#6e3b1f', 8, 'lamp0'); img[[0, -1], :, :3] = hexrgb('#3e2212'); img[:, [0, -1], :3] = hexrgb('#3e2212')
        img[[5, 10], :, :3] *= 0.7; img[:, [5, 10], :3] *= 0.7
    return img

def glowstone():
    img = noise('#e3b75a', 20, 'glow'); r = _rng('glow')
    m = r.random((T, T)) < 0.3; img[m, :3] = hexrgb('#fff0a8'); return img

def obsidian():
    img = noise('#1a1325', 6, 'obs'); r = _rng('obs'); m = r.random((T, T)) < 0.08; img[m, :3] = hexrgb('#4b2e7a'); return img

def amethyst():
    img = noise('#8c5fc7', 16, 'am'); yy, xx = np.mgrid[0:T, 0:T]; img[((xx - yy) % 5 == 0), :3] *= 1.25; return img

def iron_bars():
    img = np.zeros((T, T, 4)); 
    for x in (1, 5, 10, 14): img[:, x, :3] = hexrgb('#6f6f6f'); img[:, x, 3] = 255
    for y in (0, 15): img[y, :, :3] = hexrgb('#5a5a5a'); img[y, :, 3] = 255
    return img

def ladder():
    img = np.zeros((T, T, 4)); W = hexrgb('#9c7440')
    img[:, [2, 3, 12, 13], :3] = W; img[:, [2, 3, 12, 13], 3] = 255
    for y in (1, 5, 9, 13): img[y:y + 2, 2:14, :3] = W * 0.95; img[y:y + 2, 2:14, 3] = 255
    return img

def door(c, window=True, seed='door'):
    img = planks(c, seed)
    img[:, [0, 15], :3] *= 0.7
    if window:
        img[3:9, 3:13, :3] = hexrgb('#bcd9e3'); img[3:9, 7:9, :3] = hexrgb(c) * 0.8; img[5:7, 3:13, :3] = hexrgb(c) * 0.8
    return img

def trapdoor(c, seed='td'):
    img = planks(c, seed); img[[0, 15], :, :3] *= 0.7; img[:, [0, 15], :3] *= 0.7
    img[4:6, 3:13, :3] *= 0.6; img[10:12, 3:13, :3] *= 0.6; return img

def chest_side():
    img = planks('#b07a2e', 'chest'); img[[0, -1], :, :3] *= 0.6; img[:, [0, -1], :3] *= 0.6
    img[5:7, :, :3] = hexrgb('#3b2a14'); img[5:9, 7:9, :3] = hexrgb('#d9d9d9'); return img

def furnace_front(lit=False):
    img = stone('#7d7d7d', 'fur'); img[9:14, 4:12, :3] = hexrgb('#f59e2b' if lit else '#1e1e1e'); img[[0, -1], :, :3] *= 0.7; return img

def crafting_side():
    img = planks('#a8743e', 'craft'); img[:3, :, :3] = hexrgb('#6b4423'); img[5:12, 3:6, :3] = hexrgb('#8f8f8f'); img[6:12, 10:13, :3] = hexrgb('#5b3b1f'); return img

def note_block():
    img = planks('#6d4527', 'note'); img[3:13, 3:13, :3] *= 0.75; img[5:11, 7:9, :3] = hexrgb('#2a1a0e'); img[9:11, 5:9, :3] = hexrgb('#2a1a0e'); return img

def piston_side():
    img = stone('#8a8a8a', 'pis'); img[:4, :, :3] = planks('#a8743e', 'pisw')[:4, :, :3]; img[[4], :, :3] *= 0.7; return img

def piston_face(sticky=False):
    img = planks('#a8743e', 'pisf'); img[[0, -1], :, :3] *= 0.7; img[:, [0, -1], :3] *= 0.7
    img[6:10, 6:10, :3] = hexrgb('#7d7d7d')
    if sticky: img[3:13, 3:13, :3] = hexrgb('#79c05a'); img[5:11, 5:11, :3] = hexrgb('#95d66f')
    return img

def daylight_top():
    img = noise('#d8c9a3', 4, 'dl'); img[1:15, 1:15, :3] = hexrgb('#9fc3d6')
    img[[1, 5, 10, 14], 1:15, :3] = hexrgb('#5e5e5e'); img[1:15, [1, 5, 10, 14], :3] = hexrgb('#5e5e5e'); return img

def hopper_tex():
    img = noise('#4a4a4a', 5, 'hop'); img[[0, -1], :, :3] *= 0.6; img[:, [0, -1], :3] *= 0.6; img[3:13, 3:13, :3] *= 0.7; return img

def tnt_side():
    img = noise('#d63c2f', 8, 'tnt'); img[6:10, :, :3] = hexrgb('#f2f2f2'); img[7:9, 3:13, :3] = hexrgb('#222222'); return img

def redstone_tex(on=True):
    return noise('#e02020' if on else '#8a1010', 10, 'rs')

def gold_tex(): return panel('#f2c230', '#c9901c', 'gold', 6)
def iron_tex(): return panel('#dcdcdc', '#a9a9a9', 'iron', 4)
def diamond_tex(): return panel('#6fe0d6', '#2fa7a0', 'dia', 6)
def sea_lantern():
    img = noise('#cfe8e0', 10, 'sea'); img[[0, -1], :, :3] = hexrgb('#9cc9bc'); img[:, [0, -1], :3] = hexrgb('#9cc9bc'); img[6:10, 6:10, :3] = hexrgb('#ffffff'); return img
def lantern_tex():
    img = solid('#2d2d33'); img[3:13, 3:13, :3] = hexrgb('#ffcf5a'); img[6:10, 6:10, :3] = hexrgb('#fff3c4'); return img
def quartz(): return panel('#ece6dc', '#d6cec0', 'qz', 3)
def quartz_pillar():
    img = noise('#ece6dc', 3, 'qzp'); img[:, [0, 15], :3] = hexrgb('#d2c9b9'); img[:, [4, 11], :3] *= 0.95; return img
def sandstone_side():
    img = noise('#e0cf95', 6, 'ss'); img[:3, :, :3] *= 1.05; img[12:, :, :3] *= 0.92; img[[3, 12], :, :3] *= 0.85; return img
def sand(): return noise('#e3d49f', 9, 'sand')
def path_top(): return noise('#b08a52', 9, 'path')
def gravel():
    img = noise('#8c8480', 18, 'grav'); return img
def snow(): return noise('#f4f8fa', 3, 'snow')
def terracotta(c): return noise(c, 5, 'tc' + c)
def smooth_stone():
    img = noise('#a4a4a4', 3, 'sms'); img[[0, -1], :, :3] *= 0.85; img[:, [0, -1], :3] *= 0.85; return img
def bed_top():
    img = wool('#b02e26', 'bed'); return img
def pumpkin_side():
    img = noise('#d9861c', 8, 'pk'); img[:, [3, 8, 12], :3] *= 0.8; return img
def melon_side():
    img = noise('#6f9a2c', 10, 'ml'); img[:, ::3, :3] *= 0.8; return img
def barrel_side():
    img = planks('#8a5f33', 'barrel'); img[:, [3, 12], :3] = hexrgb('#4a4a4a'); return img
def barrel_top():
    img = planks('#8a5f33', 'barrel2'); img[[0, -1], :, :3] *= 0.6; img[:, [0, -1], :3] *= 0.6; img[6:10, 6:10, :3] = hexrgb('#3a2a1a'); return img
def bell_tex(): return panel('#f2c230', '#b58416', 'bell', 5)
def honey(): return noise('#f2a93b', 8, 'hon')
def mossy_stone_bricks():
    img = bricks('#8c8c8c', '#5f5f5f', 8, 16, 'msb', 9); r = _rng('msb2'); m = r.random((T, T)) < 0.25; img[m, :3] = hexrgb('#5f7f3a'); return img
def cracked(c):
    return bricks(c, '#555555', 8, 16, 'crk', 10)
def dripstone(): return noise('#86644f', 10, 'drip')
def clay(): return noise('#a1a7b3', 5, 'clay')
def target_tex(): return noise('#e8d5c0', 6, 'tgt')
def emerald_tex(): return panel('#41c46b', '#1f8a42', 'em', 6)
def copper_tex(): return panel('#c26b43', '#9a4f2d', 'cu', 8)
def lapis_tex(): return panel('#2f56b0', '#1d3a82', 'lp', 6)
def moss(): return noise('#5b7f2c', 14, 'moss')
def flower_tex(c): return solid(c)
