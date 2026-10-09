"""AR models for the web book: one .usdz per build, for AR Quick Look on iPad and iPhone.

    $PY tools/lbl/usdz.py                    # every build in layer-by-layer-2/data/builds
    $PY tools/lbl/usdz.py test-cottage ...   # only these slugs
    $PY tools/lbl/usdz.py --png DIR [slug]   # also render a preview PNG of each model into DIR

Writes layer-by-layer-2/ar/<slug>.usdz: the highest tier of the build standing on a small
diorama base (one layer of the build's ground block with a 1-block margin, dirt under it).
It reads only the exported data (data/blocks.json, data/tiles.png, data/builds/<slug>.json and
data/catalog.json), never the Python build modules, so it works for any exported build.

Faces are culled the same way as the web engine (app/engine/voxels.js), plus two rules that only
matter in AR: a face pressed flat against an opaque face of the next block (or the same see-through
block) is dropped, and water with water on top fills its whole cell, so pools and moats have no
inner surfaces. A see-through ground (a sea) still shows the sea bed and the hull in it.
Faces that fill a whole block side are merged into big quads with repeating UVs; other shapes keep
their own box faces.
1 block = 2.5 cm, so a 20-block build is half a metre on the table. Every file is packaged with
usdzip and must pass `usdchecker --arkit` with no errors, or this script exits with an error.
Needs Apple's USD tools (/usr/bin/usdcat, usdzip, usdchecker, usdrecord).
"""
import json, os, sys, math, shutil, subprocess, tempfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SITE = os.path.join(ROOT, 'layer-by-layer-2')
DATA = os.path.join(SITE, 'data')
OUT = os.path.join(SITE, 'ar')

METERS_PER_BLOCK = 0.025
TEX_SIZE = 128            # 16px tiles blown up with NEAREST so the pixels stay crisp
MARGIN = 1                # grass around the build
FACES = ('top', 'bottom', 'N', 'S', 'E', 'W')
NORMAL = {'top': (0, 1, 0), 'bottom': (0, -1, 0), 'N': (0, 0, -1), 'S': (0, 0, 1), 'E': (1, 0, 0), 'W': (-1, 0, 0)}
BELOW = {'grass_block': 'dirt', 'water': 'sand', 'snow_block': 'dirt', 'podzol': 'dirt', 'moss_block': 'dirt', 'pale_moss_block': 'dirt'}
FULL_MODEL = {'full': 1, 'b': [[0, 0, 0, 16, 16, 16, -1, 0, -3, 0, -2, 0, -2, 0, -2, 0, -2, 0]]}

# Same tables as voxels.js. b = [x0,y0,z0,x1,y1,z1]. Corners run counter-clockwise seen from
# outside (USD's right-handed default). UVs are in image space (v = 0 is the top row of a tile).
CORNERS = {
    'top':    lambda b: [(b[0], b[4], b[5]), (b[3], b[4], b[5]), (b[3], b[4], b[2]), (b[0], b[4], b[2])],
    'bottom': lambda b: [(b[0], b[1], b[2]), (b[3], b[1], b[2]), (b[3], b[1], b[5]), (b[0], b[1], b[5])],
    'S':      lambda b: [(b[0], b[1], b[5]), (b[3], b[1], b[5]), (b[3], b[4], b[5]), (b[0], b[4], b[5])],
    'N':      lambda b: [(b[3], b[1], b[2]), (b[0], b[1], b[2]), (b[0], b[4], b[2]), (b[3], b[4], b[2])],
    'E':      lambda b: [(b[3], b[1], b[5]), (b[3], b[1], b[2]), (b[3], b[4], b[2]), (b[3], b[4], b[5])],
    'W':      lambda b: [(b[0], b[1], b[2]), (b[0], b[1], b[5]), (b[0], b[4], b[5]), (b[0], b[4], b[2])],
}
UVS = {
    'top':    lambda b: [(b[0], b[5]), (b[3], b[5]), (b[3], b[2]), (b[0], b[2])],
    'bottom': lambda b: [(b[0], 1 - b[2]), (b[3], 1 - b[2]), (b[3], 1 - b[5]), (b[0], 1 - b[5])],
    'S':      lambda b: [(b[0], 1 - b[1]), (b[3], 1 - b[1]), (b[3], 1 - b[4]), (b[0], 1 - b[4])],
    'N':      lambda b: [(1 - b[3], 1 - b[1]), (1 - b[0], 1 - b[1]), (1 - b[0], 1 - b[4]), (1 - b[3], 1 - b[4])],
    'E':      lambda b: [(1 - b[5], 1 - b[1]), (1 - b[2], 1 - b[1]), (1 - b[2], 1 - b[4]), (1 - b[5], 1 - b[4])],
    'W':      lambda b: [(b[2], 1 - b[1]), (b[5], 1 - b[1]), (b[5], 1 - b[4]), (b[2], 1 - b[4])],
}
# the box face lies on the cell boundary (in 16ths)
ON_EDGE = {'top': lambda r: r[4] >= 16, 'bottom': lambda r: r[1] <= 0, 'N': lambda r: r[2] <= 0,
           'S': lambda r: r[5] >= 16, 'E': lambda r: r[3] >= 16, 'W': lambda r: r[0] <= 0}
# the box face covers the whole 1x1 square of its plane, so it can merge with its neighbours
FILLS = {'top': (0, 2), 'bottom': (0, 2), 'N': (0, 1), 'S': (0, 1), 'E': (2, 1), 'W': (2, 1)}
NAXIS = {'top': 1, 'bottom': 1, 'N': 2, 'S': 2, 'E': 0, 'W': 0}
PLANE = {'top': 4, 'bottom': 1, 'N': 2, 'S': 5, 'E': 3, 'W': 0}
OPPOSITE = {'top': 'bottom', 'bottom': 'top', 'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E'}


def rot_uv(u, v, rot):
    for _ in range(rot % 4):
        u, v = 1 - v, u
    return u, v


def log(*a):
    print(*a, flush=True)


# ---------------------------------------------------------------- the registry
class Reg:
    def __init__(self):
        with open(os.path.join(DATA, 'blocks.json')) as f:
            r = json.load(f)
        self.blocks, self.models = r['blocks'], r['models']
        self.sheet = np.asarray(Image.open(os.path.join(DATA, 'tiles.png')).convert('RGBA'))
        self._opaque = {}
        cat = os.path.join(DATA, 'catalog.json')
        self.catalog = {}
        if os.path.exists(cat):
            with open(cat) as f:
                self.catalog = {b['slug']: b for b in json.load(f).get('builds', [])}

    def tile(self, i):
        r, c = divmod(i, 16)
        return self.sheet[r * 16:r * 16 + 16, c * 16:c * 16 + 16].copy()

    def opaque(self, i):
        if i not in self._opaque:
            self._opaque[i] = bool((self.tile(i)[..., 3] >= 128).all())
        return self._opaque[i]


class Cell:
    __slots__ = ('b', 'model', 'tiles', 'flags', 'ground')

    def __init__(self, b, model, tiles, flags, ground=False):
        self.b, self.model, self.tiles, self.flags, self.ground = b, model, tiles, flags, ground

    @property
    def full(self): return bool(self.model.get('full'))
    @property
    def cover(self): return self.full and not (self.flags & 3)      # an opaque full cube
    @property
    def trans(self): return bool(self.flags & 1)


# ---------------------------------------------------------------- geometry
def gather(slug, reg):
    """Cells of the highest tier plus the diorama base. Returns (cells, ground, box)."""
    with open(os.path.join(DATA, 'builds', slug + '.json')) as f:
        d = json.load(f)
    T, pal, c = d['ntiers'], d['palette'], d['cells']
    cells = {}
    for i in range(0, len(c), 6):
        x, y, z, p, t0, t1 = c[i:i + 6]
        if not (t0 <= T < t1):
            continue
        pe = pal[p]
        blk = reg.blocks[pe['b']]
        cells.setdefault((x, y, z), []).append(Cell(pe['b'], reg.models[pe['m']], blk['t'], blk.get('f', 0)))
    if not cells:
        raise SystemExit(f'{slug}: no cells in tier {T}')
    # water under water fills its whole cell, as in the game, so a deep pool has no inner surfaces
    for (x, y, z), lst in cells.items():
        above = {o.b for o in cells.get((x, y + 1, z), ())}
        for o in lst:
            bx = o.model['b']
            if o.trans and o.b in above and len(bx) == 1 and bx[0][:3] == [0, 0, 0] and bx[0][3] == bx[0][5] == 16 and bx[0][4] < 16:
                o.model = {'full': 0, 'b': [bx[0][:4] + [16] + bx[0][5:]]}
    xs = [k[0] for k in cells]; ys = [k[1] for k in cells]; zs = [k[2] for k in cells]
    x0, x1 = min(xs) - MARGIN, max(xs) + MARGIN
    z0, z1 = min(zs) - MARGIN, max(zs) + MARGIN
    top = (reg.catalog.get(slug) or {}).get('ground') or 'grass_block'
    if top not in reg.blocks:
        log(f'  ! ground block {top!r} is not in blocks.json, using grass_block'); top = 'grass_block'
    below = BELOW.get(top, top)
    if below not in reg.blocks:
        below = top
    ybot = min(-2, min(ys) - 1)   # one layer of ground, then dirt down to under the deepest dug-out block
    ground = {}
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            for y in range(-1, ybot - 1, -1):
                if (x, y, z) in cells:
                    continue
                g = top if y == -1 else below
                blk = reg.blocks[g]
                ground[(x, y, z)] = Cell(g, FULL_MODEL, blk['t'], blk.get('f', 0), ground=True)
    return cells, ground, (x0, ybot, z0, x1 + 1, max(ys) + 1, z1 + 1)


def hidden(cell, row, pos, face, cells, ground, reg):
    """True when something covers this boundary face. First the voxels.js rules, then one more:
    a face pressed flat against an opaque box face of the neighbour (stairs against stairs, a slab
    on the grass), or against the same see-through block (water next to water), is never seen."""
    n = NORMAL[face]
    q = (pos[0] + n[0], pos[1] + n[1], pos[2] + n[2])
    nb = cells.get(q)
    if not nb:   # the ground hides what touches it, unless it is see-through (a sea) and we are not the same water
        g = ground.get(q)
        return bool(g) and (not g.flags & 3 or g.b == cell.b)
    for o in nb:
        if o.cover:
            return True
        if cell.trans and cell.full and o.trans and o.full and o.b == cell.b:
            return True
    i, j, opp = *FILLS[face], OPPOSITE[face]
    for o in nb:
        clear = cell.trans and o.trans and o.b == cell.b
        if not clear and o.flags & 3:
            continue
        for r in o.model['b']:
            if not ON_EDGE[opp](r) or r[i] > row[i] or r[i + 3] < row[i + 3] or r[j] > row[j] or r[j + 3] < row[j + 3]:
                continue
            ref = r[6 + FACES.index(opp) * 2]
            if clear or reg.opaque(ref if ref >= 0 else o.tiles[-ref - 1]):
                return True
    return False


def faces(cells, ground, reg):
    """All visible faces, grouped by material. Returns {matkey: [(corners, uvs, normal), ...]}."""
    merge = {}   # (face, plane16, matkey, rot) -> set of (a, c) cells in the plane
    quads = {}
    stats = {'faces': 0, 'merged_from': 0}
    every = list(cells.items()) + [(k, [g]) for k, g in ground.items()]
    for pos, lst in every:
        x, y, z = pos
        for cell in lst:
            glow = bool(cell.flags & 4)
            for row in cell.model['b']:
                for fi, face in enumerate(FACES):
                    ref, rot = row[6 + fi * 2], row[7 + fi * 2]
                    tile = ref if ref >= 0 else cell.tiles[-ref - 1]
                    edge = ON_EDGE[face](row)
                    if edge and hidden(cell, row, pos, face, cells, ground, reg):
                        continue
                    stats['faces'] += 1
                    key = (tile, cell.trans, glow)
                    i, j = FILLS[face]
                    whole = row[i] == 0 and row[i + 3] == 16 and row[j] == 0 and row[j + 3] == 16
                    if whole:   # also slab tops, carpets... anything filling its plane square
                        plane = pos[NAXIS[face]] * 16 + row[PLANE[face]]
                        merge.setdefault((face, plane, key, rot), set()).add((pos[i], pos[j]))
                        stats['merged_from'] += 1
                    else:
                        b = [v / 16 for v in row[:6]]
                        cs = [(x + p[0], y + p[1], z + p[2]) for p in CORNERS[face](b)]
                        uv = [rot_uv(u, v, rot) for u, v in UVS[face](b)]
                        quads.setdefault(key, []).append((cs, uv, NORMAL[face]))
    nmerged = 0
    for (face, plane, key, rot), cellset in merge.items():
        p = plane / 16
        i, j = FILLS[face]
        for a0, c0, a1, c1 in greedy(cellset):
            b = [0.0] * 6
            ax = NAXIS[face]
            b[ax] = b[ax + 3] = p
            b[i], b[i + 3], b[j], b[j + 3] = a0, a1, c0, c1
            cs = CORNERS[face](b)
            uv = [rot_uv(u, v, rot) for u, v in UVS[face](b)]
            du = math.floor(min(u for u, _ in uv) + 1e-9); dv = math.floor(min(v for _, v in uv) + 1e-9)
            uv = [(u - du, v - dv) for u, v in uv]
            quads.setdefault(key, []).append((cs, uv, NORMAL[face]))
            nmerged += 1
    stats['quads'] = sum(len(v) for v in quads.values())
    stats['merged_quads'] = nmerged
    return quads, stats


def greedy(cellset):
    """Cover a set of (a, c) grid cells with as few rectangles as a simple greedy pass finds."""
    left, rects = set(cellset), []
    for a, c in sorted(cellset, key=lambda p: (p[1], p[0])):
        if (a, c) not in left:
            continue
        a1 = a
        while (a1 + 1, c) in left:
            a1 += 1
        c1 = c
        while all((k, c1 + 1) in left for k in range(a, a1 + 1)):
            c1 += 1
        for k in range(a, a1 + 1):
            for m in range(c, c1 + 1):
                left.discard((k, m))
        rects.append((a, c, a1 + 1, c1 + 1))
    return rects


# ---------------------------------------------------------------- textures and materials
def texture(reg, key, folder):
    """Write the PNG for one material. Returns (file name, mode) with mode opaque/cutout/blend."""
    tile, trans, glow = key
    t = reg.tile(tile).astype(np.float32)
    a = t[..., 3] / 255
    if trans:   # the web shader: drop almost-clear pixels, never fainter than 35%
        a = np.where(a < 0.02, 0, np.where(a < 1, np.maximum(a, 0.35), 1))
        mode = 'blend' if (a < 1).any() else 'opaque'
    else:
        a = np.where(a < 0.5, 0, 1)
        mode = 'cutout' if (a < 1).any() else 'opaque'
    rgb = t[..., :3]
    if mode != 'opaque':
        rgb = bleed(rgb, a > 0)
    name = f't{tile}{"_" + mode if mode != "opaque" else ""}.png'
    path = os.path.join(folder, name)
    if not os.path.exists(path):
        if mode == 'opaque':
            img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
        else:
            arr = np.dstack([rgb, a * 255])
            img = Image.fromarray(np.clip(np.round(arr), 0, 255).astype(np.uint8), 'RGBA')
        img.resize((TEX_SIZE, TEX_SIZE), Image.NEAREST).save(path, optimize=True)
    return name, mode


def bleed(rgb, solid):
    """Spread colour into clear pixels so filtering at cut edges never pulls in black."""
    if solid.all() or not solid.any():
        return rgb
    rgb, solid = rgb.copy(), solid.copy()
    for _ in range(16):
        if solid.all():
            break
        acc = np.zeros_like(rgb); cnt = np.zeros(solid.shape, np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            s = np.roll(solid, (dy, dx), (0, 1)); r = np.roll(rgb, (dy, dx), (0, 1))
            acc += r * s[..., None]; cnt += s
        grow = ~solid & (cnt > 0)
        rgb[grow] = acc[grow] / cnt[grow][:, None]
        solid = solid | grow
    return rgb


# ---------------------------------------------------------------- USD text
def f(v):
    s = ('%.6f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def vec(t):
    return '(' + ', '.join(f(v) for v in t) + ')'


def arr(items):
    return '[' + ', '.join(items) + ']'


def material_usda(name, tex, mode, glow):
    p = f'/Build/Materials/{name}'
    lines = [f'        def Material "{name}"', '        {',
             f'            token outputs:surface.connect = <{p}/Surface.outputs:surface>', '',
             '            def Shader "Surface"', '            {',
             '                uniform token info:id = "UsdPreviewSurface"',
             f'                color3f inputs:diffuseColor.connect = <{p}/Tex.outputs:rgb>']
    if glow:
        lines.append(f'                color3f inputs:emissiveColor.connect = <{p}/Tex.outputs:rgb>')
    lines += ['                float inputs:metallic = 0', '                float inputs:roughness = 1']
    if mode in ('cutout', 'blend'):
        lines.append(f'                float inputs:opacity.connect = <{p}/Tex.outputs:a>')
    if mode == 'cutout':
        lines.append('                float inputs:opacityThreshold = 0.5')
    lines += ['                token outputs:surface', '            }', '',
              '            def Shader "Tex"', '            {',
              '                uniform token info:id = "UsdUVTexture"',
              f'                asset inputs:file = @textures/{tex}@',
              '                token inputs:sourceColorSpace = "sRGB"',
              f'                float2 inputs:st.connect = <{p}/St.outputs:result>',
              '                token inputs:wrapS = "repeat"', '                token inputs:wrapT = "repeat"',
              '                float3 outputs:rgb']
    if mode in ('cutout', 'blend'):
        lines.append('                float outputs:a')
    lines += ['            }', '',
              '            def Shader "St"', '            {',
              '                uniform token info:id = "UsdPrimvarReader_float2"',
              '                string inputs:varname = "st"',
              '                float2 outputs:result', '            }', '        }']
    return '\n'.join(lines)


def mesh_usda(name, mat, qs):
    pts, uvs, nrm = [], [], []
    for cs, uv, n in qs:
        pts += cs
        uvs += [(u, 1 - v) for u, v in uv]   # USD st has t = 0 at the bottom of the image
        nrm += [n] * 4
    P = np.array(pts, dtype=float)
    lo, hi = P.min(0), P.max(0)
    nq = len(qs)
    return '\n'.join([
        f'        def Mesh "{name}" (', '            prepend apiSchemas = ["MaterialBindingAPI"]', '        )', '        {',
        '            uniform bool doubleSided = 0',
        f'            float3[] extent = [{vec(lo)}, {vec(hi)}]',
        f'            int[] faceVertexCounts = [{", ".join(["4"] * nq)}]',
        f'            int[] faceVertexIndices = [{", ".join(str(k) for k in range(4 * nq))}]',
        f'            rel material:binding = </Build/Materials/{mat}>',
        f'            normal3f[] normals = {arr(vec(v) for v in nrm)} (', '                interpolation = "vertex"', '            )',
        f'            point3f[] points = {arr(vec(v) for v in pts)}',
        f'            texCoord2f[] primvars:st = {arr(vec(v) for v in uvs)} (', '                interpolation = "vertex"', '            )',
        '            uniform token subdivisionScheme = "none"', '        }'])


def write_usda(path, slug, title, quads, box, reg, folder):
    x0, y0, z0, x1, y1, z1 = box
    mats, meshes = [], []
    for key in sorted(quads, key=lambda k: (k[0], k[1], k[2])):
        tile, trans, glow = key
        tex, mode = texture(reg, key, folder)
        name = f't{tile}' + ('_trans' if trans else '') + ('_glow' if glow else '')
        mats.append(material_usda('M_' + name, tex, mode, glow))
        meshes.append(mesh_usda('G_' + name, 'M_' + name, quads[key]))
    tx, tz = -(x0 + x1) / 2, -(z0 + z1) / 2
    head = f'''#usda 1.0
(
    customLayerData = {{
        string creator = "Layer by Layer 2 (tools/lbl/usdz.py)"
    }}
    defaultPrim = "Build"
    doc = "{' '.join(title.replace('"', "'").replace(chr(92), '/').split())}: dadarcade.com/layer-by-layer-2"
    metersPerUnit = {METERS_PER_BLOCK}
    upAxis = "Y"
)

def Xform "Build" (
    assetInfo = {{
        string name = "{slug}"
    }}
    kind = "component"
)
{{
    def Scope "Materials"
    {{
'''
    mid = f'''
    }}

    def Xform "Model"
    {{
        double3 xformOp:translate = ({f(tx)}, {f(-y0)}, {f(tz)})
        uniform token[] xformOpOrder = ["xformOp:translate"]

'''
    with open(path, 'w') as fh:
        fh.write(head + '\n\n'.join(mats) + mid + '\n\n'.join(meshes) + '\n    }\n}\n')
    return len(mats)


# ---------------------------------------------------------------- packaging, checks, previews
def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def check(usdz):
    r = run(['usdchecker', '--arkit', usdz])
    text = (r.stdout + r.stderr).strip()
    errors = [l for l in text.splitlines() if 'error' in l.lower() and 'success' not in l.lower()]
    return r.returncode == 0 and not errors, text


def preview(usdz, png, pts, width=900, back=False):
    """Render the model with usdrecord from the south-east like the posters (or the north-west).
    pts: the model's corner points, as placed (base at y = 0, centred), used to frame it."""
    fwd = -np.array([1.0, 0.8, 1.15]) * (np.array([-1, 1, -1]) if back else 1); fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1, 0]); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    # frame the model's box: aim at the middle of its picture, then back off until it fits
    centre = pts.mean(0)
    for _ in range(4):
        rel = pts - centre
        sx, sy, sz = rel @ right, rel @ up, rel @ fwd
        centre = centre + right * (sx.max() + sx.min()) / 2 + up * (sy.max() + sy.min()) / 2
    rel = pts - centre
    sx, sy, sz = rel @ right, rel @ up, rel @ fwd
    tx, ty = 18 / 50 * 0.92, 12 / 50 * 0.92            # half the field of view (tan), with a small border
    dist = max(np.max(np.abs(sx) / tx - sz), np.max(np.abs(sy) / ty - sz))
    eye = centre - fwd * dist
    m = [list(right) + [0], list(up) + [0], list(-fwd) + [0], list(eye) + [1]]
    rows = ', '.join('(' + ', '.join(f(v) for v in row) + ')' for row in m)
    folder = tempfile.mkdtemp(prefix='lbl-ar-')
    try:
        stage = os.path.join(folder, 'preview.usda')
        with open(stage, 'w') as fh:
            fh.write(f'''#usda 1.0
(
    defaultPrim = "World"
    metersPerUnit = {METERS_PER_BLOCK}
    upAxis = "Y"
)
def Xform "World"
{{
    def Xform "Model" (prepend references = @{os.path.abspath(usdz)}@) {{}}
    def Camera "Cam"
    {{
        float2 clippingRange = ({f(dist * 0.05)}, {f(dist * 4)})
        float focalLength = 50
        float horizontalAperture = 36
        float verticalAperture = 24
        matrix4d xformOp:transform = ({rows})
        uniform token[] xformOpOrder = ["xformOp:transform"]
    }}
    def DistantLight "Sun"
    {{
        float inputs:intensity = 2.4
        float inputs:angle = 1
        float3 xformOp:rotateXYZ = (-52, 28, 0)
        uniform token[] xformOpOrder = ["xformOp:rotateXYZ"]
    }}
    def DomeLight "Sky"
    {{
        float inputs:intensity = 0.75
    }}
}}
''')
        r = run(['usdrecord', '--camera', 'Cam', '--disableCameraLight', '--imageWidth', str(width), stage, os.path.abspath(png)])
        if r.returncode != 0 or not os.path.exists(png):
            log('  ! usdrecord failed:', (r.stdout + r.stderr).strip()[-600:])
            return False
        return True
    finally:
        shutil.rmtree(folder, ignore_errors=True)


def placed(quads, box):
    """Every corner point once, moved the way the Model xform moves it."""
    P = np.unique(np.array([c for qs in quads.values() for q in qs for c in q[0]], dtype=float), axis=0)
    return P - np.array([(box[0] + box[3]) / 2, box[1], (box[2] + box[5]) / 2])


def make(slug, reg, png_dir=None):
    log(f'{slug}')
    cells, ground, box = gather(slug, reg)
    quads, st = faces(cells, ground, reg)
    title = (reg.catalog.get(slug) or {}).get('title') or slug
    folder = tempfile.mkdtemp(prefix='lbl-usdz-')
    try:
        os.makedirs(os.path.join(folder, 'textures'))
        usda = os.path.join(folder, 'model.usda')
        nmat = write_usda(usda, slug, title, quads, box, reg, os.path.join(folder, 'textures'))
        usdc = os.path.join(folder, slug + '.usdc')
        r = run(['usdcat', usda, '-o', usdc])
        if r.returncode != 0:
            raise SystemExit(f'{slug}: usdcat failed\n{r.stdout}{r.stderr}')
        os.makedirs(OUT, exist_ok=True)
        dest = os.path.join(OUT, slug + '.usdz')
        tmp = os.path.join(folder, slug + '.usdz')
        texs = sorted(os.listdir(os.path.join(folder, 'textures')))
        r = run(['usdzip', tmp, slug + '.usdc'] + ['textures/' + t for t in texs], cwd=folder)
        if r.returncode != 0 or not os.path.exists(tmp):
            raise SystemExit(f'{slug}: usdzip failed\n{r.stdout}{r.stderr}')
        ok, text = check(tmp)
        if not ok:
            raise SystemExit(f'{slug}: usdchecker --arkit failed\n{text}')
        shutil.move(tmp, dest)
    finally:
        shutil.rmtree(folder, ignore_errors=True)
    size = os.path.getsize(dest)
    w, h, d = box[3] - box[0], box[4] - box[1], box[5] - box[2]
    log(f'  {st["faces"]} visible faces -> {st["quads"]} quads ({st["merged_from"]} whole faces merged into '
        f'{st["merged_quads"]}), {nmat} materials')
    log(f'  {w} x {h} x {d} blocks = {w * METERS_PER_BLOCK * 100:.0f} x {h * METERS_PER_BLOCK * 100:.0f} x '
        f'{d * METERS_PER_BLOCK * 100:.0f} cm, {size / 1024:.0f} KB, usdchecker --arkit: {text.splitlines()[-1] if text else "ok"}')
    if size > 4 * 1024 * 1024:
        log(f'  ! {slug}.usdz is over 4 MB')
    if png_dir:
        os.makedirs(png_dir, exist_ok=True)
        for back in (False, True):
            png = os.path.join(png_dir, slug + ('-back' if back else '') + '.png')
            if preview(dest, png, placed(quads, box), back=back):
                log(f'  preview {png}')
    return dest, size


def main(argv):
    png_dir = None
    if '--png' in argv:
        k = argv.index('--png'); png_dir = argv[k + 1]; argv = argv[:k] + argv[k + 2:]
    for tool in ('usdcat', 'usdzip', 'usdchecker'):
        if not shutil.which(tool):
            raise SystemExit(f'{tool} not found: this needs Apple\'s USD tools (macOS)')
    reg = Reg()
    folder = os.path.join(DATA, 'builds')
    slugs = argv or sorted(n[:-5] for n in os.listdir(folder) if n.endswith('.json'))
    for slug in slugs:
        make(slug, reg, png_dir)


if __name__ == '__main__':
    main(sys.argv[1:])
