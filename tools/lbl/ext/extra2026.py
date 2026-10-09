"""A few blocks the Volume 2 builds asked for that the first two block modules missed:
lily pad, jukebox, red and brown mushrooms, mud. Original procedural textures."""
import numpy as np
from lbl import *

def _lily():
    img = np.zeros((16, 16, 4), float)
    yy, xx = np.mgrid[0:16, 0:16]; d = np.hypot(xx - 7.5, yy - 7.5)
    pad = (d < 7.2) & ~((xx > 7) & (yy < 7) & (abs(xx - 7.5 - (7.5 - yy)) < 2.2))   # a round pad with a notch
    img[pad, :3] = tx.hexrgb('#3f8a2a'); img[pad, 3] = 255
    r = tx._rng('lily'); n = r.normal(0, 10, (16, 16, 1)); img[..., :3] += n * pad[..., None]
    for a in np.linspace(0, 6.0, 7):   # veins
        for t in np.linspace(1.5, 6.5, 6):
            x, y = int(round(7.5 + np.cos(a) * t)), int(round(7.5 + np.sin(a) * t))
            if 0 <= x < 16 and 0 <= y < 16 and pad[y, x]: img[y, x, :3] *= 0.8
    return img

def _jukebox_top():
    img = tx.planks('#7a4f2e', 'jbt')
    yy, xx = np.mgrid[0:16, 0:16]; d = np.hypot(xx - 7.5, yy - 7.5)
    img[d < 5.2, :3] = tx.hexrgb('#2a1a10'); img[(d < 5.2) & (abs(yy - 7.5) < 0.6), :3] = tx.hexrgb('#120a06')
    img[[0, 15], :, :3] = tx.hexrgb('#4a2e1a'); img[:, [0, 15], :3] = tx.hexrgb('#4a2e1a')
    return img

def _jukebox_side():
    img = tx.planks('#7a4f2e', 'jbs')
    img[6:10, 1:15, :3] = tx.hexrgb('#4a2e1a')
    img[[0, 15], :, :3] = tx.hexrgb('#4a2e1a'); img[:, [0, 15], :3] = tx.hexrgb('#4a2e1a')
    return img

def _cap(c, dots):
    img = tx.noise(c, 6, 'cap' + c)
    if dots:
        for x, y in ((3, 3), (11, 4), (6, 10), (12, 12), (2, 12)): img[y:y + 2, x:x + 2, :3] = tx.hexrgb('#f4efe6')
    return img

reg('lily_pad', 'Lily Pad', _lily(), color='#3f8a2a', cutout=True)
reg('jukebox', 'Jukebox', _jukebox_top(), _jukebox_side(), tx.planks('#7a4f2e', 'jbb'), color='#6b4428')
reg('red_mushroom', 'Red Mushroom', _cap('#c8322a', True), tx.noise('#e8e0d0', 4, 'stem'), color='#c8322a')
reg('brown_mushroom', 'Brown Mushroom', _cap('#9a6b45', False), tx.noise('#e8e0d0', 4, 'stem2'), color='#9a6b45')
reg('mud', 'Mud', tx.noise('#3c3532', 9, 'mud'), color='#3c3532')

def lily_pad(build, p, v):
    return [((0, 0, 0, 1, 1 / 32, 1), 'top')], []
def mushroom(build, p, v):
    return [(u16(7, 0, 7, 9, 4, 9), 'side'), (u16(5, 4, 5, 11, 6, 11), 'top'), (u16(6, 6, 6, 10, 7, 10), 'top')], []
EXTRA_SHAPES['lily_pad'] = lily_pad
EXTRA_SHAPES['mushroom'] = mushroom
