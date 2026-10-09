"""Home Screen icons and the share picture for Layer by Layer 2, drawn with our own block engine.

    $PY tools/lbl/make_icons.py

Writes layer-by-layer-2/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lbl import *

OUT = os.path.join(HERE, '..', '..', 'layer-by-layer-2', 'icons')
FONT = os.path.join(HERE, '..', '..', 'layer-by-layer-2', 'fonts', 'lilita-one-latin-400-normal.woff2')

def stack():
    """Three layers, each a 2x2 slab of blocks: grass, oak planks, then the 'next layer' as glass."""
    b = Build('icon')
    b.fill(0, 0, 0, 1, 0, 1, 'grass_block')
    b.fill(0, 1, 0, 1, 1, 1, 'oak_planks')
    b.fill(0, 2, 0, 1, 2, 1, 'light_blue_stained_glass')
    return b

_ttf = None
def lilita(px):
    """Lilita One at px size. Pillow can't read woff2, so convert it once with fontTools."""
    global _ttf
    if _ttf is None:
        import tempfile
        from fontTools.ttLib import TTFont
        t = TTFont(FONT); t.flavor = None
        _ttf = os.path.join(tempfile.gettempdir(), 'lilita-one.ttf'); t.save(_ttf)
    return ImageFont.truetype(_ttf, px)

def icon(size, pad=0.16, bg='#1b2130', radius=0.22, badge=True):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius), fill=bg)
    pic = render(stack(), ground=False, scale=4)
    s = int(size * (1 - 2 * pad))
    k = s / max(pic.width, pic.height)
    pic = pic.resize((max(1, int(pic.width * k)), max(1, int(pic.height * k))), Image.LANCZOS)
    im.alpha_composite(pic, ((size - pic.width) // 2, (size - pic.height) // 2 + int(size * .02)))
    if badge:
        r = int(size * .17); cx, cy = int(size * .78), int(size * .2)
        d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], radius=int(r * .35), fill='#f2c230')
        f = lilita(int(r * 1.55))
        d.text((cx, cy + int(r * .05)), '2', fill='#3a2a00', font=f, anchor='mm')
    return im

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    icon(512).save(os.path.join(OUT, 'icon-512.png'), optimize=True)
    icon(192).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
    icon(512, pad=.26, radius=0, badge=False).save(os.path.join(OUT, 'icon-maskable-512.png'), optimize=True)
    # Apple adds its own rounding: give it a square, full-bleed background
    icon(180, radius=0).save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)
    print('icons written to', os.path.abspath(OUT))
