"""The share picture (Open Graph, 1200x630) for Layer by Layer 2: the featured build's poster on a
sky, with the title. Run after a full export:

    $PY tools/lbl/make_og.py

Writes layer-by-layer-2/img/og.png
"""
import os, sys, json
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from make_icons import lilita

OUT = os.path.join(HERE, '..', '..', 'layer-by-layer-2')
W, H = 1200, 630

def sky():
    im = Image.new('RGB', (W, H))
    top, mid, bot = (63, 156, 255), (143, 208, 255), (228, 244, 255)
    px = im.load()
    for y in range(H):
        t = y / (H - 1)
        a, b, k = (top, mid, t / .55) if t < .55 else (mid, bot, (t - .55) / .45)
        c = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
        for x in range(W): px[x, y] = c
    return im.convert('RGBA')

def text(d, xy, s, size, fill, stroke=None, shadow=None, anchor='la'):
    f = lilita(size)
    if shadow:
        for dy in range(1, shadow[1] + 1): d.text((xy[0], xy[1] + dy), s, font=f, fill=shadow[0], anchor=anchor, stroke_width=stroke[1] if stroke else 0, stroke_fill=shadow[0])
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke[1] if stroke else 0, stroke_fill=stroke[0] if stroke else None)

def main():
    cat = json.load(open(os.path.join(OUT, 'data', 'catalog.json')))
    builds = cat['builds']
    feature = next((b for b in builds if b.get('featured')), builds[0])
    im = sky()
    poster = Image.open(os.path.join(OUT, 'img', 'posters', feature['slug'] + '.webp')).convert('RGBA')
    poster.thumbnail((700, 560), Image.LANCZOS)
    shadow = Image.new('RGBA', poster.size, (0, 0, 0, 0)); shadow.putalpha(poster.split()[3].point(lambda a: int(a * .25)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    px, py = W - poster.width - 30, H - poster.height - 20
    im.alpha_composite(shadow, (px + 10, py + 16)); im.alpha_composite(poster, (px, py))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([56, 54, 236, 104], radius=12, fill='#f2c230')
    text(d, (146, 80), 'Volume 2', 34, '#3a2a00', anchor='mm')
    green, dark = '#1d5a29', '#143f1d'
    text(d, (52, 118), 'Layer', 132, 'white', stroke=(green, 5), shadow=(dark, 10))
    text(d, (110, 246), 'by', 58, '#f2c230', stroke=('#6b4a00', 4), shadow=('#6b4a00', 5))
    text(d, (92, 302), 'Layer', 132, 'white', stroke=(green, 5), shadow=(dark, 10))
    text(d, (56, 456), 'The Living Build Book', 46, 'white', stroke=('#1b4f8f', 3))
    f = lilita(28); line = 'Watch every build put itself together in 3D'
    w = d.textlength(line, font=f)
    d.rounded_rectangle([56, 528, 56 + w + 40, 580], radius=14, fill=(27, 33, 48, 230))
    d.text((76, 554), line, font=f, fill='white', anchor='lm')
    im.convert('RGB').save(os.path.join(OUT, 'img', 'og.png'), optimize=True)
    print('wrote img/og.png with', feature['slug'])

if __name__ == '__main__':
    main()
