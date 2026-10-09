"""Export Layer by Layer 2 data for the web book.

    python3 tools/lbl/export.py            # everything
    python3 tools/lbl/export.py cottage    # only builds whose slug contains "cottage"

Writes into layer-by-layer-2/:
  data/blocks.json   block registry, shared shape table (boxes + face textures), tile sheet info
  data/tiles.png     one 16x16 tile per texture (16 per row), loaded into a texture array
  data/icons.png     one 48x48 item icon per item name, used in block lists and plans
  data/builds/<slug>.json
  img/posters/<slug>.webp (and <slug>-t1.webp ... per tier)

The JavaScript engine never decides shapes. Everything about how a block looks (stairs corners,
fence arms, which texture goes on which face) is worked out here, once.
"""
import json, os, sys, hashlib, math, importlib, pkgutil
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lbl  # loads ext/ blocks and shapes
from blocks import B
import engine
from engine import Build, boxes_for, SPECIAL
from plans import item_of, layer_groups, banner_tail

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'layer-by-layer-2')
FACES = ('top', 'bottom', 'N', 'S', 'E', 'W')

# ---------------------------------------------------------------- tiles
tiles, tile_idx = [], {}
def tile(arr):
    a = np.array(arr, dtype=float)
    if a[..., 3].min() > 250:  # the same pixel bevel the print book used
        a[[0, -1], :, :3] *= 0.88; a[1:-1, [0, -1], :3] *= 0.88
    a = np.clip(a, 0, 255).astype(np.uint8)
    h = hashlib.md5(a.tobytes()).hexdigest()
    if h not in tile_idx:
        tile_idx[h] = len(tiles); tiles.append(a)
    return tile_idx[h]

ROLE = {'top': -1, 'side': -2, 'bottom': -3, 'front': -4}

def face_ref(v, face, override):
    """(ref, rot) for one face. ref >= 0 is a tile index, ref < 0 is a role of the cell's own block."""
    blk = B[v['b']]
    if override in SPECIAL: return tile(SPECIAL[override]), 0
    if override in B: return tile(B[override]['top']), 0
    if override == 'top': return ROLE['top'], 0
    if override == 'side': return ROLE['side'], 0
    f = v.get('f'); a = v.get('a', 'y'); s = v['s']
    if blk['front'] is not None and s == 'full' and f and f == face: return ROLE['front'], 0
    if v['b'] in ('piston', 'sticky_piston') and f:
        opp = {'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E', 'U': 'bottom', 'D': 'top'}[f]
        ff = {'U': 'top', 'D': 'bottom'}.get(f, f)
        if face == ff: return ROLE['top'], 0
        if face == opp: return ROLE['bottom'], 0
        if f == 'U': return ROLE['side'], 0
        if f == 'D': return ROLE['side'], 2
        if face in ('top', 'bottom'): return ROLE['side'], {'N': 0, 'S': 2, 'E': 1, 'W': 3}[f]
        order = 'NESW'; rel = (order.index(f) - order.index(face)) % 4
        return ROLE['side'], {1: 1, 3: 3}.get(rel, 0)
    if a == 'y' or s != 'full':
        if face == 'top': return ROLE['top'], 0
        if face == 'bottom': return ROLE['bottom'], 0
        return ROLE['side'], 0
    if a == 'x': return (ROLE['top'], 0) if face in ('E', 'W') else (ROLE['side'], 1)
    if face in ('N', 'S'): return ROLE['top'], 0
    return ROLE['side'], 1 if face in ('E', 'W') else 0

# ---------------------------------------------------------------- shape table
models, model_idx = [], {}
def model_for(build, p, v):
    bx, _ = boxes_for(build, p, v)
    boxes = []
    for (x0, y0, z0, x1, y1, z1), ov in bx:
        row = [round(c * 16, 3) for c in (x0, y0, z0, x1, y1, z1)]
        for face in FACES:
            ref, rot = face_ref(v, face, ov)
            row += [ref, rot]
        boxes.append(row)
    full = 1 if (v['s'] == 'full' and len(bx) == 1 and tuple(bx[0][0]) == (0, 0, 0, 1, 1, 1)) else 0
    key = json.dumps([boxes, full])
    if key not in model_idx:
        model_idx[key] = len(models); models.append(dict(b=boxes, full=full))
    return model_idx[key]

# ---------------------------------------------------------------- icons
ICON = 48
icons, icon_idx = [], {}
def icon_for(v):
    from plans import icon_cell
    item = item_of(v)
    if item is None: return None
    if item in icon_idx: return icon_idx[item]
    bb = Build()
    for p, d in icon_cell(v): bb.c[p] = d
    img = engine.render(bb, ground=False)
    img.thumbnail((ICON, ICON), Image.LANCZOS)
    cv = Image.new('RGBA', (ICON, ICON), (0, 0, 0, 0))
    cv.alpha_composite(img, ((ICON - img.width) // 2, (ICON - img.height) // 2))
    icon_idx[item] = len(icons); icons.append(cv)
    return icon_idx[item]

def display_item(v):
    """The name a kid sees when they tap the block. Upper door halves and bed heads use the item name too."""
    it = item_of(v)
    if it: return it
    d = dict(v)
    if v['s'] == 'door': d['h'] = 'lower'
    if v['s'] == 'bed': d['part'] = 'foot'
    return item_of(d) or B[v['b']]['name']

STATE_KEYS = ('s', 'f', 'h', 'side', 'a', 'part', 'open', 'hang', 'plant', 'rs', 'lit', 'n', 'big', 'tip', 'delay', 'book', 'show', 'mode', 'hinge')

# ---------------------------------------------------------------- builds
def _register_block_tiles():
    for k, blk in B.items():
        for f in ('top', 'side', 'bottom'): tile(blk[f])
        if blk['front'] is not None: tile(blk['front'])
    for t in SPECIAL.values(): tile(t)

def discover(attr='BUILDS', folder='builds2'):
    """Every build function in tools/lbl/<folder>/*.py. A module exports BUILDS = {slug: function}
    (or FIGURES = {id: function returning a list of frames})."""
    out = {}
    pkg = os.path.join(HERE, folder)
    if not os.path.isdir(pkg): return out
    for m in sorted(pkgutil.iter_modules([pkg]), key=lambda m: m.name):
        if m.name.startswith('_'): continue
        try:
            mod = importlib.import_module(folder + '.' + m.name)
        except Exception as e:   # someone else's file may be half-written; don't take everyone down
            print(f'!! skipped {folder}/{m.name}.py: {type(e).__name__}: {e}', file=sys.stderr); continue
        for slug, fn in getattr(mod, attr, {}).items(): out[slug] = (fn, mod)
    return out

def env_keys(meta):
    """Blocks that are scenery, not things to place (the sea around an underwater base). They still
    show in 3D but never count in block lists, layer steps or plan letters. META env=[...] sets them;
    builds on a sand or water ground treat water as scenery by default."""
    meta = meta or {}
    if 'env' in meta: return set(meta['env'])
    return {'water'} if meta.get('ground') in ('sand', 'water') else set()

def export_build(slug, fn, posters=True, meta=None):
    full = fn()
    if not isinstance(full, Build): raise TypeError(slug + ' did not return a Build')
    used = [1] + [v.get('tier', 1) for v in full.c.values()] + [t for ups in full.up.values() for t, _ in ups]
    frames = [full.at_tier(t) for t in range(1, max(used) + 1)]
    # posters stand on the build's own ground, like the 3D view (the pirate ship floats on water);
    # no ground key means grass, ground=None means no ground at all (as for figures)
    return export_frames(slug, full.name, frames, 'builds', posters, env=env_keys(meta),
                         ground=(meta or {}).get('ground', 'grass_block'))

def export_figure(fid, fn, posters=True, meta=None):
    """A figure (lesson, redstone gadget or showcase scene) is a list of frames. They are stored like
    tiers: frame k shows when the player's tier value is k. META[fid] (optional, in the same module)
    can set ground ('grass_block', 'sand', 'stone', ... or None for no ground), time (0..1), view."""
    frames = fn()
    if isinstance(frames, Build): frames = [frames]
    # the poster uses the figure's ground too (None = no ground: an indoor wall, a room underwater)
    g = (meta or {}).get('ground', 'grass_block')
    return export_frames(fid, fid, list(frames), 'figures', posters, meta=meta, ground=g)

def export_frames(slug, name, tb, kind, posters=True, meta=None, env=(), ground='grass_block'):
    ntiers = len(tb)
    allp = [p for b in tb for p in b.c]
    x0 = min(p[0] for p in allp); z0 = min(p[2] for p in allp)
    tb = [shift(b, -x0, -z0) for b in tb]
    # per position, per tier: palette index
    pal, pal_idx = [], {}
    def pal_for(b, p, v):
        mid = model_for(b, p, v)
        st = {k: v[k] for k in STATE_KEYS if k in v}
        key = (v['b'], mid, json.dumps(st, sort_keys=True))
        if key not in pal_idx:
            pal_idx[key] = len(pal)
            pal.append(dict(b=v['b'], m=mid, i=display_item(v), st=st, ic=icon_for(v) if item_of(v) else icon_for(dict(v, h='lower', part='foot'))))
            if v['b'] in env: pal[-1]['env'] = 1
        return pal_idx[key]
    positions = sorted(set(p for b in tb for p in b.c), key=lambda p: (p[1], p[2], p[0]))
    # one entry per (position, run of tiers with the same look): x, y, z, palette, first tier, last tier + 1
    flat = []
    for p in positions:
        run = None
        for t, b in enumerate(tb, start=1):
            v = b.c.get(p)
            pi = pal_for(b, p, v) if v is not None else None
            if run is not None and run[0] == pi:
                run[2] = t + 1; continue
            if run is not None and run[0] is not None: flat += [p[0], p[1], p[2], run[0], run[1], run[2]]
            run = [pi, t, t + 1]
        if run is not None and run[0] is not None: flat += [p[0], p[1], p[2], run[0], run[1], run[2]]
    b_all = [p for b in tb for p in b.c]
    bounds = [min(p[0] for p in b_all), min(p[1] for p in b_all), min(p[2] for p in b_all),
              max(p[0] for p in b_all), max(p[1] for p in b_all), max(p[2] for p in b_all)]
    tiers = []
    for t, b in enumerate(tb, start=1):
        if env:   # scenery never counts as blocks to place or as a layer step
            b = Build(b.name); b.c = {p: v for p, v in tb[t - 1].c.items() if v['b'] not in env}
        groups = []
        for g in layer_groups(b):
            mats = {}
            for p, v in b.c.items():
                if p[1] != g['y0'] or banner_tail(b, p, v): continue
                it = item_of(v)
                if it: mats[it] = mats.get(it, 0) + 1
            groups.append(dict(y0=g['y0'], y1=g['y1'], n=g['n'], m=sorted(([k, n] for k, n in mats.items()), key=lambda e: -e[1])))
            if len(mats) > 24:   # the plan has 24 single letters (no I or O); past that it uses AA, AB...
                print(f'note: {slug} {"tier" if kind == "builds" else "frame"} {t} y={g["y0"]}: {len(mats)} kinds of block, '
                      f'so the plan needs two-letter codes', file=sys.stderr)
        totals = {}
        for g in groups:
            for k, n in g['m']: totals[k] = totals.get(k, 0) + n * (g['y1'] - g['y0'] + 1)
        # the space this tier takes (wide x deep x tall), so a Starter card can say how big Starter is
        tp = list(tb[t - 1].c)
        size = [max(p[0] for p in tp) - min(p[0] for p in tp) + 1, max(p[2] for p in tp) - min(p[2] for p in tp) + 1,
                max(p[1] for p in tp) - min(p[1] for p in tp) + 1] if tp else [0, 0, 0]
        tiers.append(dict(layers=groups, mats=sorted(([k, n] for k, n in totals.items()), key=lambda e: -e[1]),
                          blocks=sum(n for _, n in totals.items()), size=size))
    data = dict(slug=slug, name=name, bounds=bounds, ntiers=ntiers, palette=pal, cells=flat, tiers=tiers, shift=[-x0, -z0])
    if meta: data['meta'] = meta
    os.makedirs(os.path.join(OUT, 'data', kind), exist_ok=True)
    with open(os.path.join(OUT, 'data', kind, slug + '.json'), 'w') as f: json.dump(data, f, separators=(',', ':'))
    if posters:
        pdir = 'posters' if kind == 'builds' else 'figures'
        os.makedirs(os.path.join(OUT, 'img', pdir), exist_ok=True)
        for t, b in enumerate(tb, start=1):
            if kind == 'figures' and t not in (1, ntiers): continue
            img = engine.render(b, ground=ground is not None, ground_block=ground or 'grass_block',
                                ground_margin=2 if kind == 'builds' else 1)
            img.thumbnail((1200, 1200), Image.LANCZOS)
            name = slug if t == ntiers else f'{slug}-t{t}'
            img.save(os.path.join(OUT, 'img', pdir, name + '.webp'), 'WEBP', quality=86, method=6)
    return data

def shift(b, dx, dz):
    nb = Build(b.name); nb.c = {(x + dx, y, z + dz): v for (x, y, z), v in b.c.items()}; return nb

# ---------------------------------------------------------------- registry
def write_registry():
    reg = {}
    for k, blk in B.items():
        e = dict(n=blk['name'], t=[tile(blk['top']), tile(blk['side']), tile(blk['bottom']),
                                   tile(blk['front']) if blk['front'] is not None else tile(blk['side'])], c=blk['color'])
        fl = (1 if blk['translucent'] else 0) | (2 if blk['cutout'] else 0) | (4 if blk['glow'] else 0)
        if fl: e['f'] = fl
        lum = blk.get('light')
        if lum is None and blk['glow']:
            lum = {'torch': 14, 'end_rod': 14, 'soul_lantern': 10, 'soul_torch': 10, 'magma_block': 3, 'redstone_torch': 7}.get(k, 15)
        if lum: e['l'] = lum
        reg[k] = e
    for t in SPECIAL.values(): tile(t)
    cols = 16; rows = (len(tiles) + cols - 1) // cols
    img = Image.new('RGBA', (cols * 16, rows * 16), (0, 0, 0, 0))
    for i, a in enumerate(tiles): img.paste(Image.fromarray(a, 'RGBA'), ((i % cols) * 16, (i // cols) * 16))
    img.save(os.path.join(OUT, 'data', 'tiles.png'), optimize=True)
    icols = 16; irows = max(1, (len(icons) + icols - 1) // icols)
    sheet = Image.new('RGBA', (icols * ICON, irows * ICON), (0, 0, 0, 0))
    for i, im in enumerate(icons): sheet.alpha_composite(im, ((i % icols) * ICON, (i // icols) * ICON))
    sheet.save(os.path.join(OUT, 'data', 'icons.webp'), 'WEBP', quality=88, method=6, alpha_quality=90)
    old_png = os.path.join(OUT, 'data', 'icons.png')
    if os.path.exists(old_png): os.remove(old_png)
    with open(os.path.join(OUT, 'data', 'blocks.json'), 'w') as f:
        json.dump(dict(tiles=dict(cols=cols, count=len(tiles)), icons=dict(cols=icols, size=ICON, items=list(icon_idx)),
                       blocks=reg, models=models), f, separators=(',', ':'))

def minutes(n):
    """Rough Creative-mode build time for a kid: about 12 blocks a minute, rounded to 5."""
    return max(5, int(round(n / 12 / 5.0)) * 5)

def write_catalog(results):
    """data/catalog.json: every build's words (META) plus measured stats per tier."""
    out = []
    for slug, (data, mod) in results.items():
        meta = dict(getattr(mod, 'META', {}).get(slug, {}))
        tiers = []
        for t, td in enumerate(data['tiers'], start=1):
            tiers.append(dict(blocks=td['blocks'], layers=len(td['layers']), minutes=minutes(td['blocks']), size=td['size']))
        x0, y0, z0, x1, y1, z1 = data['bounds']
        # blocks from 2024-2026 updates; wool/concrete stairs and slabs are old blocks in new shapes (26.50)
        newb = set()
        for pe in data['palette']:
            blk = B[pe['b']]
            if blk.get('new'): newb.add(pe['i'] or blk['name'])
            elif blk.get('new_shapes') and pe['st'].get('s') in ('stairs', 'slab'): newb.add(pe['i'])
        newb = sorted(n for n in newb if n)
        entry = dict(slug=slug, title=meta.get('title', data['name']), kind=meta.get('kind', 'big'), size=[x1 - x0 + 1, z1 - z0 + 1, y1 - y0 + 1],
                     ntiers=data['ntiers'], tiers_stats=tiers, auto_new=newb)
        meta.pop('title', None); meta.pop('kind', None)
        for k, v in meta.items():
            if k == 'tips': v = [list(t) for t in v]
            if k == 'empty':   # authored in build coordinates; the export moved the build by data['shift']
                sx, sz = data.get('shift', [0, 0])
                v = [[t[0] + sx, t[1], t[2] + sz] + list(t[3:]) for t in v]
            entry[k] = v
        out.append(entry)
    order = {'big': 0, 'mini': 1}
    out.sort(key=lambda e: (order.get(e['kind'], 2), e.get('order', 99), e.get('diff', 2), e['slug']))
    with open(os.path.join(OUT, 'data', 'catalog.json'), 'w') as f: json.dump(dict(builds=out), f, separators=(',', ':'), ensure_ascii=False)

def merge_content():
    """Lessons and redstone gadgets are written one file per item (tools/lbl/content/<section>/<id>.json,
    plus _intro.json) so several people can work at once. Merge them into data/content/<section>.json."""
    for section, key in (('lessons', 'lessons'), ('redstone', 'gadgets')):
        d = os.path.join(HERE, 'content', section)
        if not os.path.isdir(d): continue
        items, intro = [], {}
        for f in sorted(os.listdir(d)):
            if not f.endswith('.json'): continue
            with open(os.path.join(d, f)) as fh: obj = json.load(fh)
            if f == '_intro.json': intro = obj; continue
            items.append(obj)
        if not items: continue
        items.sort(key=lambda o: (o.get('order', 99), o.get('id', '')))
        out = dict(intro); out[key] = items
        with open(os.path.join(OUT, 'data', 'content', section + '.json'), 'w') as fh: json.dump(out, fh, ensure_ascii=False, indent=1)
        print(f'content {section}: {len(items)} items')

def write_files_list():
    """data/files.json: everything the book needs offline (the "Save the whole book" button)."""
    files = []
    for top in ('app', 'data', 'img', 'fonts', 'icons'):
        base = os.path.join(OUT, top)
        for dp, dn, fn in os.walk(base):
            for f in fn:
                if f.startswith('.') or f.startswith('_') or f.endswith('.md'): continue
                files.append(os.path.relpath(os.path.join(dp, f), OUT).replace(os.sep, '/'))
    files.sort()
    h = hashlib.md5(''.join(files).encode()).hexdigest()[:10]
    with open(os.path.join(OUT, 'data', 'files.json'), 'w') as f:
        json.dump(dict(version=h, files=['./'] + files + ['manifest.webmanifest']), f, separators=(',', ':'))

def preview(name, out_dir):
    """Render pictures of one build or figure without writing any book data.
    Safe to run while other people export. Prints a summary and the image paths."""
    builds = discover(); figs = discover('FIGURES', 'figures2')
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    meta = {}
    if name in builds:
        meta = getattr(builds[name][1], 'META', {}).get(name) or {}
        full = builds[name][0]()
        used = [1] + [v.get('tier', 1) for v in full.c.values()] + [t for ups in full.up.values() for t, _ in ups]
        frames = [full.at_tier(t) for t in range(1, max(used) + 1)]
        label = 'tier'
    elif name in figs:
        meta = getattr(figs[name][1], 'META', {}).get(name) or {}
        frames = figs[name][0]()
        frames = [frames] if isinstance(frames, Build) else list(frames)
        label = 'frame'
    else:
        raise SystemExit(f'no build or figure called {name!r}. Builds: {sorted(builds)} Figures: {sorted(figs)}')
    for t, b in enumerate(frames, start=1):
        n = sum(1 for p, v in b.c.items() if item_of(v))
        x0, x1, y0, y1, z0, z1 = b.bounds()
        print(f'{label} {t}: {n} blocks, {x1-x0+1} wide (x) by {z1-z0+1} deep (z) by {y1-y0+1} tall (y {y0}..{y1}), layers {len(layer_groups(b.normalized()))}')
        for rot in (0, 2) if t == len(frames) else (0,):
            g = meta.get('ground', 'grass_block')
            img = engine.render(b, rot=rot, ground_margin=2, ground=g is not None, ground_block=g or 'grass_block')
            path = os.path.join(out_dir, f'{name}-{label}{t}-view{rot}.png'); img.save(path); paths.append(path)
    # one cutaway per finished build: everything up to half height, so the inside shows
    b = frames[-1]; x0, x1, y0, y1, z0, z1 = b.bounds(); mid = (y0 + y1) // 2
    g = meta.get('ground', 'grass_block')
    img = engine.render(b, ground_margin=1, max_y=mid, ground=g is not None, ground_block=g or 'grass_block')
    path = os.path.join(out_dir, f'{name}-cutaway-y{mid}.png'); img.save(path); paths.append(path)
    for p in paths: print(p)

if __name__ == '__main__':
    if '--preview' in sys.argv:
        i = sys.argv.index('--preview')
        out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(HERE, '_preview')
        preview(sys.argv[i + 1], out); raise SystemExit
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    only = only[0] if only else None
    # Always export every build and figure so shared tables (shapes, icons) stay consistent.
    # A name on the command line only limits which posters get re-rendered.
    _register_block_tiles()
    results = {}
    for slug, (fn, mod) in discover().items():
        try:
            d = export_build(slug, fn, posters=('--no-posters' not in sys.argv) and (not only or only in slug), meta=getattr(mod, 'META', {}).get(slug))
        except Exception as e:
            import traceback; traceback.print_exc()
            print(f'!! {slug}: {type(e).__name__}: {e}'); continue
        results[slug] = (d, mod)
        print(f"{slug:28s} tiers={d['ntiers']} cells={len(d['cells'])//6:5d} blocks/tier={[t['blocks'] for t in d['tiers']]}")
    write_catalog(results)
    for fid, (fn, mod) in discover('FIGURES', 'figures2').items():
        try:
            d = export_figure(fid, fn, posters=('--no-posters' not in sys.argv) and (not only or only in fid), meta=getattr(mod, 'META', {}).get(fid))
        except Exception as e:
            print(f'!! figure {fid}: {type(e).__name__}: {e}'); continue
        print(f"figure {fid:21s} frames={d['ntiers']} cells={len(d['cells'])//6:5d}")
    write_registry()
    merge_content()
    write_files_list()
    print('tiles', len(tiles), 'models', len(models), 'icons', len(icons))
