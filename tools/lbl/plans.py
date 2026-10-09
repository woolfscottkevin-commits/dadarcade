import io, base64
from PIL import Image
from engine import Build, render, conn_mask, dust_mask, DIRS, OPP
from blocks import B

# Volume 2: EXTRA_ITEMS[shape] = fn(v) -> item name or None (None = not counted, like a door's top half)
EXTRA_ITEMS = {}

def item_of(v):
    s, b = v['s'], v['b']; blk = B[b]
    if s in EXTRA_ITEMS: return EXTRA_ITEMS[s](v)
    if blk.get('item'): return blk['item']
    if s == 'door' and v.get('h') == 'upper': return None
    if s == 'bed' and v.get('part') == 'head': return None
    if b == 'water': return 'Water Bucket'
    if s == 'slab': return blk['slab']
    if s == 'stairs': return blk['stairs']
    if s == 'fence': return blk['fence']
    if s == 'wall': return blk['wall']
    if s == 'pane':
        if b == 'iron_bars': return 'Iron Bars'
        return blk['name'] + ' Pane'
    if s == 'crop': return 'Wheat Seeds'
    if s == 'dust': return 'Redstone Dust'
    if s == 'pot': return 'Flower Pot + ' + B[v.get('plant', 'poppy')]['name']
    if s == 'lantern' and v.get('hang'): return blk['name']
    return blk['name']

def icon_cell(v):
    d = dict(v)
    if d['s'] == 'door': return [((0, 0, 0), dict(d, h='lower', side='S')), ((0, 1, 0), dict(d, h='upper', side='S'))]
    if d['s'] == 'stairs': d = dict(d, f='N', h='bottom')
    if d['s'] == 'slab': d = dict(d, h='bottom')
    if d['s'] in ('ladder', 'panel', 'button', 'lever', 'torch'): d['side'] = 'N' if d['s'] in ('ladder', 'panel') else None
    if d['s'] == 'panel': d['y0'] = 0; d['y1'] = 16
    if d['s'] == 'trapdoor': d = dict(d, open=False, h='bottom')
    if d['s'] == 'bed': return [((0, 0, 0), dict(d, part='foot', f='N')), ((0, 0, -1), dict(d, part='head', f='N'))]
    if d['s'] == 'lantern': d.pop('hang', None)
    if d['s'] in ('fence', 'wall', 'pane'): return [((0, 0, 0), d), ((1, 0, 0), d)]
    return [((0, 0, 0), d)]

_icon_cache = {}
def icon_png(v, px=40):
    item = item_of(v)
    if item in _icon_cache: return _icon_cache[item]
    bb = Build()
    for p, d in icon_cell(v): bb.c[p] = d
    img = render(bb, ground=False)
    img.thumbnail((px * 2, px * 2))
    buf = io.BytesIO(); img.save(buf, 'PNG'); uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    _icon_cache[item] = uri
    return uri

def banner_tail(build, p, v):
    if v['s'] != 'panel' or 'banner' not in v['b']: return False
    up = build.get(p[0], p[1] + 1, p[2])
    return bool(up and up['b'] == v['b'] and up['s'] == 'panel')

def materials(build):
    counts = {}; sample = {}
    for p, v in build.c.items():
        if banner_tail(build, p, v): continue
        it = item_of(v)
        if it is None: continue
        counts[it] = counts.get(it, 0) + 1; sample.setdefault(it, v)
    items = sorted(counts.items(), key=lambda kv: -kv[1])
    return [(name, n, sample[name]) for name, n in items]

def stacks(n):
    if n < 64: return ''
    s, r = divmod(n, 64)
    return f"{s} stack{'s' if s > 1 else ''}" + (f" + {r}" if r else '')

def darker(c, f=0.65):
    c = c.lstrip('#'); r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02x%02x%02x' % (int(r * f), int(g * f), int(b * f))

def lighter(c, f=0.5):
    c = c.lstrip('#'); r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02x%02x%02x' % (int(r + (255 - r) * f), int(g + (255 - g) * f), int(b + (255 - b) * f))

def layer_signature(build, y):
    return tuple(sorted((p[0], p[2], item_of(v) or '', v['s'], v.get('f'), v.get('h'), v.get('side'), v.get('a'), v.get('part'), v.get('open'), v.get('hang')) for p, v in build.c.items() if p[1] == y))

def arrow(cx, cy, d, size, hollow=False):
    pts = {'N': [(0, -1), (0.8, 0.6), (-0.8, 0.6)], 'S': [(0, 1), (0.8, -0.6), (-0.8, -0.6)],
           'E': [(1, 0), (-0.6, 0.8), (-0.6, -0.8)], 'W': [(-1, 0), (0.6, 0.8), (0.6, -0.8)]}[d]
    ps = ' '.join(f'{cx + px * size:.1f},{cy + py * size:.1f}' for px, py in pts)
    if hollow: return f'<polygon points="{ps}" fill="none" stroke="#fff" stroke-width="{size*0.35:.1f}" stroke-linejoin="round"/>'
    return f'<polygon points="{ps}" fill="#fff" stroke="#000" stroke-opacity=".35" stroke-width="{size*0.15:.1f}"/>'

def side_rect(x, y, cs, side, t):
    t = cs * t
    return {'N': (x, y, cs, t), 'S': (x, y + cs - t, cs, t), 'W': (x, y, t, cs), 'E': (x + cs - t, y, t, cs)}[side]

def cell_svg(build, p, v, X, Y, cs):
    c = B[v['b']]['color']; dk = darker(c); s = v['s']; out = []
    cx, cy = X + cs / 2, Y + cs / 2
    R = lambda x, y, w, h, fill, extra='': out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" {extra}/>')
    stroke = f'stroke="{dk}" stroke-width="1"'
    if s == 'full':
        R(X + .5, Y + .5, cs - 1, cs - 1, c, stroke)
        if B[v['b']]['translucent'] and v['b'] != 'water':
            out.append(f'<line x1="{X+cs*.25:.1f}" y1="{Y+cs*.7:.1f}" x2="{X+cs*.7:.1f}" y2="{Y+cs*.25:.1f}" stroke="#fff" stroke-width="{cs*.1:.1f}"/>')
        if v.get('a') in ('x', 'z'):
            if v['a'] == 'x': out.append(f'<line x1="{X+2}" y1="{cy}" x2="{X+cs-2}" y2="{cy}" stroke="{dk}" stroke-width="{cs*.12:.1f}"/>')
            else: out.append(f'<line x1="{cx}" y1="{Y+2}" x2="{cx}" y2="{Y+cs-2}" stroke="{dk}" stroke-width="{cs*.12:.1f}"/>')
        if 'leaves' in v['b']:
            for dx, dy in ((.3, .3), (.7, .45), (.4, .72)): out.append(f'<circle cx="{X+cs*dx:.1f}" cy="{Y+cs*dy:.1f}" r="{cs*.08:.1f}" fill="{dk}"/>')
        if v['b'] in ('chest', 'barrel'): R(X + cs * .15, cy - cs * .06, cs * .7, cs * .12, dk)
        if v['b'] == 'hopper': R(X + cs * .3, Y + cs * .3, cs * .4, cs * .4, '#222')
        if B[v['b']]['front'] is not None and v.get('f'):
            R(*side_rect(X + 1, Y + 1, cs - 2, v['f'], .22), '#222')
        if v['b'] in ('piston', 'sticky_piston') and v.get('f') in DIRS:
            R(*side_rect(X + 1, Y + 1, cs - 2, v['f'], .3), '#79c05a' if 'sticky' in v['b'] else '#d9b36a')
    elif s == 'slab':
        R(X + .5, Y + .5, cs - 1, cs - 1, lighter(c, .55), stroke)
        if v.get('h') == 'top': R(X + .5, Y + .5, cs - 1, (cs - 1) / 2, c)
        else: R(X + .5, Y + cs / 2, cs - 1, (cs - 1) / 2, c)
    elif s == 'stairs':
        R(X + .5, Y + .5, cs - 1, cs - 1, c, stroke)
        out.append(arrow(cx, cy, v['f'], cs * .32, hollow=v.get('h') == 'top'))
    elif s in ('fence', 'wall', 'pane'):
        m = conn_mask(build, p, v); w = {'fence': .16, 'wall': .3, 'pane': .14}[s]
        col = c if s != 'pane' else ('#7fb8cc' if v['b'] != 'iron_bars' else '#555')
        for d in (m if (m or s != 'pane') else 'NESW'):
            dx, dz = DIRS[d]
            out.append(f'<line x1="{cx}" y1="{cy}" x2="{cx+dx*cs/2:.1f}" y2="{cy+dz*cs/2:.1f}" stroke="{col}" stroke-width="{cs*w:.1f}"/>')
        if s != 'pane': R(cx - cs * .22, cy - cs * .22, cs * .44, cs * .44, c, stroke)
        else: out.append(f'<circle cx="{cx}" cy="{cy}" r="{cs*.12:.1f}" fill="{col}"/>')
    elif s == 'gate':
        if v.get('a', 'x') == 'x': R(X + 1, cy - cs * .1, cs - 2, cs * .2, c, stroke)
        else: R(cx - cs * .1, Y + 1, cs * .2, cs - 2, c, stroke)
    elif s == 'door':
        op = '1' if v.get('h') != 'upper' else '.45'
        R(*side_rect(X, Y, cs, v['side'], .3), c, stroke + f' opacity="{op}"')
    elif s == 'trapdoor':
        if v.get('open'): R(*side_rect(X, Y, cs, v['side'], .22), c, stroke)
        else:
            R(X + .5, Y + .5, cs - 1, cs - 1, lighter(c, .3), stroke)
            out.append(f'<path d="M{X+cs*.2},{Y+cs*.35}H{X+cs*.8}M{X+cs*.2},{Y+cs*.65}H{X+cs*.8}" stroke="{dk}" stroke-width="{cs*.08:.1f}"/>')
    elif s == 'hopper':
        R(X + .5, Y + .5, cs - 1, cs - 1, c, stroke); R(X + cs * .3, Y + cs * .3, cs * .4, cs * .4, '#222')
        if v.get('f', 'D') in DIRS: out.append(arrow(cx, cy, v['f'], cs * .3))
    elif s in ('carpet', 'plate', 'detector'):
        R(X + cs * .12, Y + cs * .12, cs * .76, cs * .76, c, stroke + ' rx="2"')
        if s == 'detector': out.append(f'<path d="M{cx},{Y+cs*.15}V{Y+cs*.85}M{X+cs*.15},{cy}H{X+cs*.85}" stroke="#555" stroke-width="1"/>')
    elif s in ('button', 'lever'):
        sd = v.get('side')
        if sd: R(*side_rect(X + cs * .3, Y + cs * .3, cs * .4, sd, .5), c, stroke)
        else: R(X + cs * .35, Y + cs * .35, cs * .3, cs * .3, c, stroke)
        if s == 'lever': out.append(f'<circle cx="{cx}" cy="{cy}" r="{cs*.08:.1f}" fill="#7a5a36"/>')
    elif s in ('lantern', 'torch', 'campfire', 'bell', 'rod'):
        r = {'lantern': .22, 'torch': .16, 'campfire': .3, 'bell': .22, 'rod': .1}[s]
        ox, oy = 0, 0
        if s == 'torch' and v.get('side'): ox, oy = DIRS[v['side']]; ox *= cs * .25; oy *= cs * .25
        out.append(f'<circle cx="{cx+ox:.1f}" cy="{cy+oy:.1f}" r="{cs*r:.1f}" fill="{c}" stroke="#333" stroke-width="1"/>')
        if v.get('hang'): out.append(f'<circle cx="{cx}" cy="{cy}" r="{cs*.36:.1f}" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="2,2"/>')
    elif s in ('flower', 'pot'):
        col = B[v.get('plant', v['b'])]['color'] if s == 'pot' else c
        if s == 'pot': R(X + cs * .3, Y + cs * .3, cs * .4, cs * .4, '#8a4a2a')
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{cs*.2:.1f}" fill="{col}" stroke="#2f5a1f" stroke-width="1.5"/>')
    elif s in ('tuft', 'crop', 'bush'):
        if s == 'bush': out.append(f'<circle cx="{cx}" cy="{cy}" r="{cs*.36:.1f}" fill="{c}" stroke="{dk}"/>')
        else:
            for dx, dy in ((.3, .35), (.6, .6), (.7, .3), (.35, .7)):
                out.append(f'<line x1="{X+cs*dx:.1f}" y1="{Y+cs*(dy+.12):.1f}" x2="{X+cs*dx:.1f}" y2="{Y+cs*(dy-.12):.1f}" stroke="{dk if s=="tuft" else "#b09a2a"}" stroke-width="1.5"/>')
    elif s in ('ladder', 'panel'):
        R(*side_rect(X, Y, cs, v['side'], .2), c, stroke + (' opacity=".35"' if banner_tail(build, p, v) else ''))
    elif s == 'bed':
        R(X + .5, Y + .5, cs - 1, cs - 1, c, stroke)
        if v.get('part') == 'head': R(*side_rect(X + cs * .15, Y + cs * .15, cs * .7, v['f'], .4), '#f4f4f4')
    elif s == 'dust':
        m = dust_mask(build, p)
        for d in m:
            dx, dz = DIRS[d]; out.append(f'<line x1="{cx}" y1="{cy}" x2="{cx+dx*cs/2:.1f}" y2="{cy+dz*cs/2:.1f}" stroke="#d01818" stroke-width="{cs*.18:.1f}"/>')
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{cs*.15:.1f}" fill="#d01818"/>')
    else:
        R(X + cs * .1, Y + cs * .1, cs * .8, cs * .8, c, stroke)
    return ''.join(out)

def plan_svg(build, y, cs=18, ghost=True, max_px=None):
    x0, x1, y0, y1, z0, z1 = build.bounds()
    nx, nz = x1 - x0 + 1, z1 - z0 + 1
    if max_px: cs = min(cs, max_px / (nx + 1.6))
    pad = cs * 1.3
    W, Hh = pad + nx * cs + 4, pad + nz * cs + 4
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {Hh:.0f}" class="plan">']
    o.append(f'<rect x="{pad}" y="{pad}" width="{nx*cs}" height="{nz*cs}" fill="#fbfaf5"/>')
    if ghost:
        for p, v in build.c.items():
            if p[1] == y - 1 and v['s'] in ('full', 'slab', 'stairs'):
                o.append(f'<rect x="{pad+(p[0]-x0)*cs}" y="{pad+(p[2]-z0)*cs}" width="{cs}" height="{cs}" fill="#9aa3ad" opacity=".22"/>')
    for i in range(nx + 1):
        sw = 1.1 if i % 5 == 0 else .5
        o.append(f'<line x1="{pad+i*cs}" y1="{pad}" x2="{pad+i*cs}" y2="{pad+nz*cs}" stroke="#b9c0c8" stroke-width="{sw}"/>')
    for j in range(nz + 1):
        sw = 1.1 if j % 5 == 0 else .5
        o.append(f'<line x1="{pad}" y1="{pad+j*cs}" x2="{pad+nx*cs}" y2="{pad+j*cs}" stroke="#b9c0c8" stroke-width="{sw}"/>')
    fs = max(6, cs * .55)
    for i in range(nx):
        if nx <= 16 or (i + 1) % 2 == 1 or i + 1 == nx:
            o.append(f'<text x="{pad+(i+.5)*cs:.1f}" y="{pad-cs*.35:.1f}" font-size="{fs:.1f}" text-anchor="middle" fill="#5b6570" font-family="Nunito" font-weight="800">{i+1}</text>')
    for j in range(nz):
        if nz <= 16 or (j + 1) % 2 == 1 or j + 1 == nz:
            o.append(f'<text x="{pad-cs*.3:.1f}" y="{pad+(j+.5)*cs+fs*.35:.1f}" font-size="{fs:.1f}" text-anchor="end" fill="#5b6570" font-family="Nunito" font-weight="800">{j+1}</text>')
    items = sorted(((p, v) for p, v in build.c.items() if p[1] == y), key=lambda e: 0 if e[1]['s'] in ('full', 'slab', 'stairs') else 1)
    for p, v in items:
        o.append(cell_svg(build, p, v, pad + (p[0] - x0) * cs, pad + (p[2] - z0) * cs, cs))
    o.append('</svg>')
    return ''.join(o)

def layer_groups(build):
    x0, x1, y0, y1, z0, z1 = build.bounds()
    groups = []
    for y in range(y0, y1 + 1):
        sig = layer_signature(build, y)
        if not sig: continue
        if groups and groups[-1]['sig'] == sig and groups[-1]['y1'] == y - 1:
            groups[-1]['y1'] = y
        else:
            groups.append(dict(y0=y, y1=y, sig=sig, n=len([1 for p, v in build.c.items() if p[1] == y and item_of(v) and not banner_tail(build, p, v)])))
    return groups

def img_uri(img, fmt='PNG'):
    """Data URI for an image. Big block renders are stored as 256-color PNGs, which look the same and are about 3 times smaller."""
    if fmt == 'PNG' and img.width * img.height > 120000:
        img = img.convert('RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    buf = io.BytesIO(); img.save(buf, fmt, optimize=True); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(buf.getvalue()).decode()
