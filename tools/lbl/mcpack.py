"""Make the Minecraft Bedrock pack with every book build in it (labs).

    $PY tools/lbl/mcpack.py            # writes layer-by-layer-2/dl/layer-by-layer-2.mcpack (+ .json index)
    $PY tools/lbl/mcpack.py --dry      # build and check everything, write nothing

Reads only the exported build files (layer-by-layer-2/data/builds/<slug>.json), so it works for any build.
Run it after export.py. The pack is a behavior pack with one structure per build and tier:
structures/lbl/<name>.mcstructure, loaded in game with /structure load lbl:<name> (needs cheats).
<name> is the slug with '-' turned into '_' (command names stay one plain word), plus _starter, _pro, _legend
for builds with tiers. Bump PACK_VERSION on every release: Minecraft ignores a re-import with the same version.

The .mcstructure format (Bedrock Wiki, https://wiki.bedrock.dev/nbt/mcstructure): uncompressed little-endian
NBT; block_indices = two Int lists in ZYX order (z fastest), layer 2 holds water for waterlogged blocks;
palette "default" with {name, states, version}; block_position_data for block entities (bed and banner colours,
flower pot plants). Empty cells are -1 (structure void) so loading never deletes the player's terrain. The one
exception: a cell a lower tier had and this tier removed is written (air above the grass; the build's ground
block in the ground layer, dirt below that), so loading Pro on top of Starter at the same spot upgrades it cleanly
without leaving holes in the lawn. Cushions are entities in game: they are left out and listed in the index.
Every file is read back with the reader below and compared with what was meant to be written; the reader and
writer re-encode 103 structures exported from the game itself (HoloPrint's tests/sampleStructures) byte for byte.
Blocks that nothing holds up (a hanging lantern with nothing above, a wall torch with no wall) are listed as
warnings: the 3D book draws them, but the game drops them as items.
"""
import io, json, os, struct, sys, zipfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'mc')); sys.path.insert(0, HERE)
import blockmap as bm                                # also loads the registry (lbl)

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BOOK = os.path.join(ROOT, 'layer-by-layer-2')
OUT = os.path.join(BOOK, 'dl', 'layer-by-layer-2.mcpack')
INDEX = os.path.join(BOOK, 'dl', 'layer-by-layer-2.json')
ICON = os.path.join(BOOK, 'icons', 'icon-192.png')

PACK_VERSION = [1, 0, 0]                             # bump on every release
MIN_ENGINE = [1, 26, 50]                             # Bedrock 26.50 (Wilderness Bound), the block list we check against
HEADER_UUID = '817d6f5e-5a70-4468-99a5-ea974788e672'  # fixed forever: the game matches packs by UUID
MODULE_UUID = 'f7c96d09-d3a8-47fc-8935-2b5eb7996e0a'
NAMESPACE = 'lbl'
TIERS = ['starter', 'pro', 'legend']
ANIM_SECONDS = 6
ZIP_TIME = (2026, 1, 1, 0, 0, 0)                     # fixed so the same builds give the same file

# ---------------------------------------------------------------- little-endian NBT
END, BYTE, SHORT, INT, LONG, FLOAT, DOUBLE, BYTES, STRING, LIST, COMPOUND, INTS, LONGS = range(13)
# A value is (tag, payload). LIST payload = (element tag, [payloads]); COMPOUND payload = {name: (tag, payload)}.


def _wstr(out, s):
    b = s.encode('utf8'); out += struct.pack('<H', len(b)); out += b


def _w(out, t, v):
    if t == BYTE: out += struct.pack('<b', v)
    elif t == SHORT: out += struct.pack('<h', v)
    elif t == INT: out += struct.pack('<i', v)
    elif t == LONG: out += struct.pack('<q', v)
    elif t == FLOAT: out += struct.pack('<f', v)
    elif t == DOUBLE: out += struct.pack('<d', v)
    elif t == STRING: _wstr(out, v)
    elif t == LIST:
        et, items = v; out += struct.pack('<bi', et, len(items))
        if et == INT: out += struct.pack(f'<{len(items)}i', *items)
        else:
            for it in items: _w(out, et, it)
    elif t == COMPOUND:
        for k, (tt, vv) in v.items():
            out += struct.pack('<b', tt); _wstr(out, k); _w(out, tt, vv)
        out += b'\x00'
    elif t == BYTES: out += struct.pack('<i', len(v)) + bytes(v)
    elif t in (INTS, LONGS):
        out += struct.pack('<i', len(v)) + struct.pack(f'<{len(v)}{"i" if t == INTS else "q"}', *v)
    else: raise ValueError(t)


def nbt_write(root):
    """root is a COMPOUND payload (dict). Written as an unnamed root compound."""
    out = bytearray(); out += struct.pack('<b', COMPOUND); _wstr(out, ''); _w(out, COMPOUND, root)
    return bytes(out)


def nbt_read(data):
    """Read little-endian NBT back into the same (tag, payload) form nbt_write takes."""
    i = 0
    def u(fmt):
        nonlocal i
        v = struct.unpack_from('<' + fmt, data, i); i += struct.calcsize('<' + fmt); return v
    def s():
        nonlocal i
        n, = u('H'); v = data[i:i + n].decode('utf8'); i += n; return v
    def p(t):
        nonlocal i
        if t == BYTE: return u('b')[0]
        if t == SHORT: return u('h')[0]
        if t == INT: return u('i')[0]
        if t == LONG: return u('q')[0]
        if t == FLOAT: return u('f')[0]
        if t == DOUBLE: return u('d')[0]
        if t == STRING: return s()
        if t == LIST:
            et, n = u('bi')
            return (et, list(u(f'{n}i')) if et == INT else [p(et) for _ in range(n)])
        if t == COMPOUND:
            d = {}
            while True:
                tt, = u('b')
                if tt == END: return d
                k = s(); d[k] = (tt, p(tt))
        if t == BYTES:
            n, = u('i'); v = list(data[i:i + n]); i += n; return v
        if t in (INTS, LONGS):
            n, = u('i'); return list(u(f'{n}{"i" if t == INTS else "q"}'))
        raise ValueError(f'bad tag {t} at {i}')
    t, = u('b'); s()
    if t != COMPOUND: raise ValueError('root is not a compound')
    root = p(COMPOUND)
    if i != len(data): raise ValueError(f'{len(data) - i} bytes left over')
    return root


def state_nbt(name, states):
    out = {}
    for k, v in states.items():
        typ = bm.state_type(k)
        out[k] = (BYTE, int(v)) if typ == 'bool' else (INT, v) if typ == 'int' else (STRING, v)
    return out


def block_nbt(name, states):
    return {'name': (STRING, name), 'states': (COMPOUND, state_nbt(name, states)), 'version': (INT, bm.BLOCK_VERSION)}


def be_nbt(be, pos):
    out = {}
    for k, (typ, v) in be.items():
        if typ == 'string': out[k] = (STRING, v)
        elif typ == 'byte': out[k] = (BYTE, v)
        elif typ == 'int': out[k] = (INT, v)
        elif typ == 'block': out[k] = (COMPOUND, block_nbt(*v))
        else: raise ValueError(typ)
    out['isMovable'] = (BYTE, 1)
    out['x'], out['y'], out['z'] = (INT, pos[0]), (INT, pos[1]), (INT, pos[2])
    return out


# ---------------------------------------------------------------- builds -> structures
def structure_name(slug, t, ntiers):
    base = slug.replace('-', '_')
    if ntiers == 1: return base
    return f'{base}_{TIERS[t - 1] if t <= len(TIERS) else "tier%d" % t}'


def refill(y, ground):
    """What a cell a lower tier used and this tier removed becomes. Above the grass: air. In the ground layer
    (y = -1, where the book's paths and ponds replace the grass): the build's ground block again. Deeper: dirt.
    Air there would leave a hole in the lawn when a kid loads Pro over Starter (or Pro on its own)."""
    if y >= 0: return 'minecraft:air', {}
    r = bm.to_bedrock({'b': ground if y == -1 else 'dirt', 's': 'full'})
    return r['name'], r['states']


# Blocks the game drops as an item when the block holding them up is missing (README: kids would see floating
# lanterns in the 3D book but loose items in the game). Warnings only: the book may mean it, the game will not.
def support_problems(grid):
    D = {'N': (0, 0, -1), 'S': (0, 0, 1), 'E': (1, 0, 0), 'W': (-1, 0, 0)}
    def has(p, d): return grid.get((p[0] + d[0], p[1] + d[1], p[2] + d[2])) is not None
    out = []
    for p, v in sorted(grid.items()):
        s = v['s']; side = v.get('side')
        if s == 'lantern' and v.get('hang'): need = (0, 1, 0)
        elif s in ('lantern', 'flower', 'tuft', 'crop', 'carpet', 'plate', 'rail', 'dust', 'candle', 'pot', 'bush', 'repeater',
                   'comparator', 'campfire') or (s in ('torch', 'button', 'lever') and not side) or (s == 'door' and v.get('h') == 'lower'):
            need = (0, -1, 0)
        elif s in ('torch', 'ladder', 'button', 'lever', 'item_frame') and side in D: need = D[side]
        elif s == 'panel' and side in D and v['b'].endswith(('_banner', '_sign')): need = D[side]
        else: continue
        if need == (0, -1, 0) and p[1] <= 0: continue             # stands on the world's own grass or dirt
        if not has(p, need): out.append(f"{v['b']} ({s}) at {p} has nothing {'above' if need[1] > 0 else 'below' if need[1] < 0 else 'on its ' + side + ' side'}")
    return out


def make_structure(data, t, problems, ground='grass_block'):
    """One tier of one exported build -> (nbt root payload, report). Unmappable cells go into problems."""
    x0, y0, z0, x1, y1, z1 = data['bounds']; sx, sy, sz = x1 - x0 + 1, y1 - y0 + 1, z1 - z0 + 1
    pal = data['palette']; c = data['cells']
    grid, lower = {}, set()
    for i in range(0, len(c), 6):
        x, y, z, pi, ta, tb = c[i:i + 6]
        if ta <= t < tb: grid[(x, y, z)] = dict(b=pal[pi]['b'], **pal[pi]['st'])
        elif ta < t: lower.add((x, y, z))
    lower -= set(grid)
    palette, pidx, be_data = [], {}, {}
    def pal_of(name, states):
        key = (name, json.dumps(states, sort_keys=True))
        if key not in pidx: pidx[key] = len(palette); palette.append((name, states))
        return pidx[key]
    n = sx * sy * sz
    layer0, layer1 = [-1] * n, [-1] * n
    skipped, placed = {}, 0
    for (x, y, z), v in sorted(grid.items(), key=lambda e: (e[0][0], e[0][1], e[0][2])):
        def at(dx, dy, dz, x=x, y=y, z=z): return grid.get((x + dx, y + dy, z + dz))
        try:
            r = bm.to_bedrock(v, at)
        except (bm.Unmapped, bm.BadState) as e:
            problems.append(f"{data['slug']} tier {t} at {(x, y, z)} {v}: {e}"); continue
        if 'skip' in r:
            if r['skip'] == 'entity': skipped[r['item']] = skipped.get(r['item'], 0) + 1
            continue
        idx = ((x - x0) * sy + (y - y0)) * sz + (z - z0)
        layer0[idx] = pal_of(r['name'], r['states']); placed += 1
        if r['water']: layer1[idx] = pal_of('minecraft:water', bm.check('minecraft:water', {'liquid_depth': 0}))
        if r['be']: be_data[idx] = be_nbt(r['be'], (x - x0, y - y0, z - z0))
    for (x, y, z) in sorted(lower):
        name, states = refill(y, ground)
        layer0[((x - x0) * sy + (y - y0)) * sz + (z - z0)] = pal_of(name, bm.check(name, states))
    # Dug-out rooms (like the spy base's secret room): in a column where the build has blocks below the
    # grass, the empty cells above its lowest block are air, as the web book shows them. Elsewhere empty
    # cells stay structure void, so loading never deletes the player's own terrain.
    low = {}
    for (x, y, z) in grid:
        if y < 0: low[(x, z)] = min(low.get((x, z), 0), y)
    air = None
    for (x, z), ylo in low.items():
        for y in range(ylo + 1, 0):
            if (x, y, z) in grid: continue
            idx = ((x - x0) * sy + (y - y0)) * sz + (z - z0)
            if layer0[idx] != -1: continue
            if air is None: air = pal_of('minecraft:air', bm.check('minecraft:air', {}))
            layer0[idx] = air
    root = {
        'format_version': (INT, 1),
        'size': (LIST, (INT, [sx, sy, sz])),
        'structure': (COMPOUND, {
            'block_indices': (LIST, (LIST, [(INT, layer0), (INT, layer1)])),
            'entities': (LIST, (END, [])),                  # empty list of type End, like the game writes
            'palette': (COMPOUND, {'default': (COMPOUND, {
                'block_palette': (LIST, (COMPOUND, [block_nbt(nm, st) for nm, st in palette])),
                'block_position_data': (COMPOUND, {str(i): (COMPOUND, {'block_entity_data': (COMPOUND, d)})
                                                   for i, d in sorted(be_data.items())}),
            })}),
        }),
        'structure_world_origin': (LIST, (INT, [0, 0, 0])),
    }
    report = dict(size=[sx, sy, sz], blocks=placed, palette=len(palette), air=len(lower), skipped=skipped,
                  water=sum(1 for v in layer1 if v >= 0), entities=len(be_data), support=support_problems(grid))
    return root, report


def verify(raw, root, data, t, ground='grass_block'):
    """Read the file back: same NBT, and every cell decodes to the block the mapper chose."""
    back = nbt_read(raw)
    if back != root: raise AssertionError('NBT read back differs from what was written')
    st = back['structure'][1]
    sx, sy, sz = back['size'][1][1]
    l0, l1 = (lst for _, lst in st['block_indices'][1][1])
    if not (len(l0) == len(l1) == sx * sy * sz): raise AssertionError('block_indices lengths')
    pal = [(e['name'][1], {k: v for k, (_, v) in e['states'][1].items()}, e['version'][1])
           for e in st['palette'][1]['default'][1]['block_palette'][1][1]]
    if any(i >= len(pal) or i < -1 for i in l0 + l1): raise AssertionError('palette index out of range')
    for name, states, ver in pal:                       # every palette entry is a real Bedrock state
        full = bm.check(name, {k: (bool(v) if bm.state_type(k) == 'bool' else v) for k, v in states.items()})
        if list(full) != list(states) or ver != bm.BLOCK_VERSION: raise AssertionError(f'{name} states incomplete')
    x0, y0, z0 = data['bounds'][:3]; c = data['cells']; want = 0
    here = {tuple(c[i:i + 3]) for i in range(0, len(c), 6) if c[i + 4] <= t < c[i + 5]}
    for i in range(0, len(c), 6):                       # a cell a lower tier had and this one removed is written
        x, y, z, pi, ta, tb = c[i:i + 6]
        if ta < t and not ta <= t < tb and (x, y, z) not in here:
            k = l0[((x - x0) * sy + (y - y0)) * sz + (z - z0)]
            got = pal[k][0] if k >= 0 else None
            if got != refill(y, ground)[0]: raise AssertionError(f'removed cell {(x, y, z)} is {got}')
    for i in range(0, len(c), 6):
        x, y, z, pi, ta, tb = c[i:i + 6]
        if not ta <= t < tb: continue
        idx = ((x - x0) * sy + (y - y0)) * sz + (z - z0)
        if data['palette'][pi]['st']['s'] in ('cushion', 'piston_head'): continue
        if data['palette'][pi]['st']['s'] == 'panel' and l0[idx] == -1: continue      # banner tails
        if l0[idx] < 0 or pal[l0[idx]][0] == 'minecraft:air': raise AssertionError(f'cell {(x, y, z)} lost')
        want += 1
    return want, pal


def manifest():
    return {
        'format_version': 2,
        'header': {
            'name': 'Layer by Layer 2 Builds',
            'description': 'Unofficial fan-made pack with the builds from the free Layer by Layer 2 book on Dad Arcade. '
                           'Load one with /structure load lbl:<name>. '
                           'NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.',
            'uuid': HEADER_UUID, 'version': PACK_VERSION, 'min_engine_version': MIN_ENGINE},
        'modules': [{'type': 'data', 'uuid': MODULE_UUID, 'version': PACK_VERSION}],
    }


def command(sid, y0):
    """The /structure load line a kid types. ~1 ~ ~1 puts the build's north-west corner one block south-east of
    the player (so they are not inside it); the y offset sinks the ground layer (paths, ponds) into the grass."""
    return f'/structure load {NAMESPACE}:{sid} ~1 ~{y0 if y0 else ""} ~1 0_degrees none layer_by_layer {ANIM_SECONDS}'


def icon_png():
    im = Image.open(ICON).convert('RGBA').resize((128, 128), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True); return buf.getvalue()


def main(dry=False):
    bdir = os.path.join(BOOK, 'data', 'builds')
    order, grounds = [], {}
    cat = os.path.join(BOOK, 'data', 'catalog.json')
    if os.path.exists(cat):
        with open(cat) as f: builds = json.load(f).get('builds', [])
        order = [b['slug'] for b in builds]
        grounds = {b['slug']: b['ground'] for b in builds if b.get('ground') in bm.B}
    slugs = sorted((f[:-5] for f in os.listdir(bdir) if f.endswith('.json')), key=lambda s: (s not in order, order.index(s) if s in order else 0, s))
    files, index, problems, lines, warns = {}, {}, [], [], []
    for slug in slugs:
        with open(os.path.join(bdir, slug + '.json')) as f: data = json.load(f)
        entry = dict(name=data.get('name', slug), y0=data['bounds'][1], tiers=[])
        ground = grounds.get(slug, 'grass_block')
        for t in range(1, data['ntiers'] + 1):
            sid = structure_name(slug, t, data['ntiers'])
            root, rep = make_structure(data, t, problems, ground)
            raw = nbt_write(root)
            want, pal = verify(raw, root, data, t, ground)
            warns += [f'{NAMESPACE}:{sid}: {w}' for w in rep['support']]
            files[f'structures/{NAMESPACE}/{sid}.mcstructure'] = raw
            entry['tiers'].append(dict(id=f'{NAMESPACE}:{sid}', cmd=command(sid, data['bounds'][1]), blocks=rep['blocks'],
                                       size=rep['size'], skipped=rep['skipped']))
            lines.append(f"{NAMESPACE + ':' + sid:34s} {'x'.join(map(str, rep['size'])):9s} blocks {rep['blocks']:5d} "
                         f"palette {rep['palette']:3d} water {rep['water']:3d} block-entities {rep['entities']:2d} "
                         f"removed {rep['air']:3d} {len(raw):7,d} bytes  read back OK ({want} cells)"
                         + (f"  left out: {rep['skipped']}" if rep['skipped'] else ''))
        index[slug] = entry
    print('\n'.join(lines))
    if warns:
        print(f'\n{len(warns)} blocks the game will drop (nothing holds them up; fix the build, the pack is still written):')
        print('\n'.join('  ' + w for w in warns))
    if problems:
        print(f'\n{len(problems)} cells could not be mapped:'); print('\n'.join('  ' + p for p in problems))
        keys = sorted({p.split("'b': '")[1].split("'")[0] for p in problems if "'b': '" in p})
        raise SystemExit(f'Unmapped block keys: {keys}. Add them to tools/lbl/mc/blockmap.py. No pack written.')
    files['manifest.json'] = (json.dumps(manifest(), indent=2) + '\n').encode()
    files['pack_icon.png'] = icon_png()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in sorted(files, key=lambda n: (n.startswith('structures/'), n)):
            zi = zipfile.ZipInfo(name, ZIP_TIME); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
            z.writestr(zi, files[name])
    pack = buf.getvalue()
    with zipfile.ZipFile(io.BytesIO(pack)) as z:                 # the zip itself reads back byte for byte
        bad = z.testzip()
        if bad or any(z.read(n) != files[n] for n in files): raise SystemExit(f'zip check failed ({bad})')
        for n in files:
            if n.endswith('.mcstructure'): nbt_read(z.read(n))
    idx = dict(pack='dl/layer-by-layer-2.mcpack', version='.'.join(map(str, PACK_VERSION)),
               game='.'.join(map(str, MIN_ENGINE[1:])), mojang_blocks=bm.mc()['tag'], builds=index)
    print(f"\n{len(files) - 2} structures, pack {len(pack):,d} bytes ({len(pack) / 1024:.1f} KB), version {idx['version']}")
    if dry: print('(dry run, nothing written)'); return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f: f.write(pack)
    with open(INDEX, 'w') as f: json.dump(idx, f, separators=(',', ':'), ensure_ascii=False)
    print(f'wrote {OUT}\nwrote {INDEX}')


if __name__ == '__main__':
    main(dry='--dry' in sys.argv)
