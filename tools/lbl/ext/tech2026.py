"""Volume 2 blocks: copper, redstone, rails, ocean and workstations.

Catalogue for build designers: ext/tech2026.md. Textures: ext/_tex_tech2026.py (all original).

Changes to Volume 1 blocks made here (on purpose):
  chain                    renamed "Iron Chain" (The Copper Age), new link texture, cutout, 'chain' shape
  copper_block, weathered_copper, oxidized_copper
                           retextured so the four copper stages read as one family
  redstone_torch           lit look (red head on a wooden stick), light 7, glow
  lit_furnace              light 13
  lightning_rod            copper texture to match the copper stages
  prismarine, dark_prismarine   stairs / slab (and Prismarine Wall) names added

Also wraps engine.dust_mask so redstone dust joins the new parts (see the end of this file).
"""
from lbl import *
import numpy as np
import textures as _tx
from ext import _tex_tech2026 as X

# ---------------------------------------------------------------- helpers

ORDER = 'NESW'


def sp(name, img):
    """Register a texture usable as a box override (engine SPECIAL table). Keys start with 'tech_'."""
    SPECIAL['tech_' + name] = img
    return 'tech_' + name


def _rot_pt(x, z, k):
    for _ in range(k % 4):
        x, z = 1 - z, x            # a quarter turn clockwise seen from above: N -> E -> S -> W
    return x, z


def rot(box, d, canon='S'):
    """Turn a box drawn for direction `canon` so it points to `d` (N/E/S/W, or U/D for up/down)."""
    x0, y0, z0, x1, y1, z1 = box
    if d in ('U', 'D'):
        if canon != 'S': box = rot(box, 'S', canon); x0, y0, z0, x1, y1, z1 = box
        if d == 'U': a, b = (x0, z0, 1 - y0), (x1, z1, 1 - y1)
        else: a, b = (x0, 1 - z0, y0), (x1, 1 - z1, y1)
    else:
        k = (ORDER.index(d) - ORDER.index(canon)) % 4
        ax, az = _rot_pt(x0, z0, k); bx, bz = _rot_pt(x1, z1, k)
        a, b = (ax, y0, az), (bx, y1, bz)
    lo = [round(min(p, q), 6) for p, q in zip(a, b)]; hi = [round(max(p, q), 6) for p, q in zip(a, b)]
    return (lo[0], lo[1], lo[2], hi[0], hi[1], hi[2])


def name_of(v):
    blk = B[v['b']]
    return blk.get('item') or blk['name']


def same_as(key, src, name, **kw):
    """Register `key` with the textures of `src` and a new display name."""
    s = B[src]
    d = dict(top=s['top'], side=s['side'], bottom=s['bottom'], color=s['color'], translucent=s['translucent'],
             cutout=s['cutout'], glow=s['glow'], front=s['front'])
    for k in ('light', 'back', 'count', 'new', 'plant_h'):
        if k in s: d[k] = s[k]
    d.update(kw)
    reg(key, name, **d)


TECH_KEYS = []        # every key this module adds, for the catalogue and the contact sheet


def add(key, name, top, side=None, bottom=None, **kw):
    reg(key, name, top, side, bottom, **kw)
    TECH_KEYS.append(key)


# ---------------------------------------------------------------- copper

COPPER_AGE = '1.21.111'      # The Copper Age, Bedrock 1.21.111 (30 Sep 2025)
TRICKY = '1.21.0'            # Tricky Trials, Bedrock 1.21.0 (13 Jun 2024)
BULB_LIGHT = [15, 12, 8, 4]
COPPER_FAMILY = []           # (key, waxed key) pairs

for i in range(4):
    st = X.stage(i); k, n = st['key'], st['name']
    base, dark = st['base'], st['dark']

    def cu(key, name, *tex, **kw):
        add(key, name, *tex, **kw); COPPER_FAMILY.append(key)

    blk = 'copper_block' if i == 0 else k + 'copper'
    cu(blk, 'Block of Copper' if i == 0 else n + 'Copper', X.copper_block(st), color=base)
    cu(k + 'cut_copper', n + 'Cut Copper', X.cut_copper(st), color=base,
       stairs=n + 'Cut Copper Stairs', slab=n + 'Cut Copper Slab')
    cu(k + 'chiseled_copper', n + 'Chiseled Copper', X.chiseled_copper(st), color=base, new=TRICKY)
    cu(k + 'copper_grate', n + 'Copper Grate', X.copper_grate(st), color=base, cutout=True, new=TRICKY)
    cu(k + 'copper_bulb', n + 'Copper Bulb', X.copper_bulb(st, False), color=X.hexs(X.col(dark) * 0.9), new=TRICKY)
    cu(k + 'copper_bulb_lit', n + 'Copper Bulb', X.copper_bulb(st, True), color='#ffd27a', glow=True,
       light=BULB_LIGHT[i], new=TRICKY)
    cu(k + 'copper_door', n + 'Copper Door', X.copper_door(st, True), X.copper_door(st, False), color=base, new=TRICKY)
    cu(k + 'copper_trapdoor', n + 'Copper Trapdoor', X.copper_trapdoor(st), color=base, new=TRICKY)
    cu(k + 'copper_chest', n + 'Copper Chest', X.copper_chest(st, True), X.copper_chest(st), color=base, new=COPPER_AGE)
    cu(k + 'copper_lantern', n + 'Copper Lantern', X.copper_lantern(st, True), X.copper_lantern(st), color=base,
       glow=True, light=15, new=COPPER_AGE)
    cu(k + 'copper_bars', n + 'Copper Bars', X.bars_tex(base, st['light'], dark, 'cbar' + k), color=base,
       cutout=True, item=n + 'Copper Bars', new=COPPER_AGE)
    cu(k + 'copper_chain', n + 'Copper Chain', X.chain_tex(base, st['light'], dark), color=base, cutout=True, new=COPPER_AGE)
    rod = 'lightning_rod' if i == 0 else k + 'lightning_rod'
    if i == 0:
        B['lightning_rod'].update(top=X.rod_tex(st), side=X.rod_tex(st), bottom=X.rod_tex(st), color=base)
        COPPER_FAMILY.append('lightning_rod')
    else:
        cu(rod, n + 'Lightning Rod', X.rod_tex(st), color=base, new=COPPER_AGE)

# Copper Torch does not age. Light 14, green flame.
add('copper_torch', 'Copper Torch', X.torch_head('#5fd45a', '#d8ffc8', 'cut'), X.stick('#7a5a36', 'cust'),
    color='#7fd47a', glow=True, light=14, new=COPPER_AGE)

# Waxed copper looks the same as unwaxed. Same textures, name with "Waxed " in front.
WAXED = []
for key in list(COPPER_FAMILY):
    s = B[key]
    wkey = 'waxed_' + key
    extra = {}
    for f in ('stairs', 'slab', 'item'):
        if s.get(f): extra[f] = 'Waxed ' + s[f]
    if key == 'lightning_rod': extra['new'] = COPPER_AGE      # rods only age (and wax) since The Copper Age
    same_as(wkey, key, 'Waxed ' + s['name'], **extra)
    WAXED.append(wkey)

# ---- Iron Chain (renamed from "Chain" in The Copper Age)
_iron_chain = X.chain_tex('#4b5059', '#8a909a', '#24272c')
B['chain'].update(name='Iron Chain', top=_iron_chain, side=_iron_chain, bottom=_iron_chain, cutout=True, color='#4b5059')


def chain_shape(build, p, v):
    """A chain: two crossed thin plates. a='y' (default, hanging), 'x' or 'z' (lying sideways)."""
    a = v.get('a', 'y')
    if a == 'x': bx = [u16(0, 6, 7.5, 16, 10, 8.5), u16(0, 7.5, 6, 16, 8.5, 10)]
    elif a == 'z': bx = [u16(7.5, 6, 0, 8.5, 10, 16), u16(6, 7.5, 0, 10, 8.5, 16)]
    else: bx = [u16(6, 0, 7.5, 10, 16, 8.5), u16(7.5, 0, 6, 8.5, 16, 10)]
    return [(b, None) for b in bx], [a]


EXTRA_SHAPES['chain'] = chain_shape
EXTRA_ITEMS['chain'] = name_of

# ---------------------------------------------------------------- redstone

STICK = sp('stick', X.stick())
RS_ON = sp('rs_on', X.rs_dot(True))
RS_OFF = sp('rs_off', X.rs_dot(False))
FLAME = sp('flame', X.flame('#fff4c8', '#ffb43a', 'cfl'))
WICK = sp('wick', X.wick())
BOOK = sp('book', X.book())
SAW = sp('saw', X.saw())
P_INNER = sp('piston_inner', X.piston_inner())
P_ARM = sp('piston_arm', X.piston_arm())
P_BASE = sp('piston_base', X.piston_base_side())

add('redstone_dust_off', 'Redstone Dust', X.dust_off(), color='#7a1a14')
B['redstone_torch'].update(top=X.rs_torch_head(True), side=X.stick('#7a5a36', 'rst'), bottom=X.stick('#7a5a36', 'rst'),
                           glow=True, light=7, color='#ff3a24')
add('redstone_torch_off', 'Redstone Torch', X.rs_torch_head(False), X.stick('#7a5a36', 'rst'), color='#6a1a14')

add('repeater', 'Redstone Repeater', X.diode_top('rep'), X.diode_side('reps'), color='#a9a9a9', powered=False)
add('repeater_on', 'Redstone Repeater', X.diode_top('rep'), X.diode_side('reps'), color='#c9a0a0', powered=True)
# "Redstone Comparator" was renamed "Comparator" in Bedrock 26.50.
for key, pw, sub in (('comparator', False, False), ('comparator_on', True, False),
                     ('comparator_sub', False, True), ('comparator_sub_on', True, True)):
    add(key, 'Comparator', X.diode_top('cmp'), X.diode_side('cmps'), color='#c9a0a0' if pw else '#a9a9a9',
        powered=pw, subtract=sub)


def _diode_torch(x, z, on, top=7, base=2):
    """A tiny torch on a repeater or comparator: a stick and a red head (canonical: facing south)."""
    head = (u16(x, max(base, top - 2), z, x + 2, top, z + 2), RS_ON if on else RS_OFF)
    return ([(u16(x, base, z, x + 2, top - 2, z + 2), STICK)] if top - 2 > base else []) + [head]


def repeater_shape(build, p, v):
    """Redstone Repeater. f = the side it sends power out of. delay = 1..4 (moves the back torch)."""
    f = v.get('f', 'S'); d = max(1, min(4, int(v.get('delay', 1)))); on = B[v['b']].get('powered')
    parts = [(u16(0, 0, 0, 16, 2, 16), None), (u16(7, 2, 2, 9, 2.4, 14), RS_ON if on else RS_OFF)]
    parts += _diode_torch(7, 11, on) + _diode_torch(7, 9 - 2 * d, on)
    return [(rot(b, f), o) for b, o in parts], [f, d]


def comparator_shape(build, p, v):
    """Comparator. f = the side it sends power out of. Two back torches light when it gives power;
    the front torch stands up and lights in subtract mode (use the comparator_sub keys)."""
    f = v.get('f', 'S'); blk = B[v['b']]; on = blk.get('powered'); sub = blk.get('subtract')
    parts = [(u16(0, 0, 0, 16, 2, 16), None), (u16(7, 2, 4, 9, 2.4, 11), RS_ON if on else RS_OFF)]
    parts += _diode_torch(3, 2, on) + _diode_torch(11, 2, on)
    parts += _diode_torch(7, 11, sub, top=7 if sub else 4)
    return [(rot(b, f), o) for b, o in parts], [f]


EXTRA_SHAPES['repeater'] = repeater_shape; EXTRA_ITEMS['repeater'] = name_of
EXTRA_SHAPES['comparator'] = comparator_shape; EXTRA_ITEMS['comparator'] = name_of

# Machines with a front face. Use the plain 'full' shape with f='N'/'E'/'S'/'W', or the 'facing' shape
# (below) when the front points up or down, or to show an observer's back light.
add('observer', 'Observer', X.observer_top(), X.observer_side(), X.machine_top('obb'), front=X.observer_front(),
    back=X.observer_back(False), color='#6e6e6e')
add('observer_on', 'Observer', X.observer_top(), X.observer_side(), X.machine_top('obb'), front=X.observer_front(),
    back=X.observer_back(True), color='#8a6a6a')
add('dispenser', 'Dispenser', X.machine_top('dsp'), X.machine_side('dsps'), front=X.dispenser_front(), color='#7d7d7d')
add('dropper', 'Dropper', X.machine_top('drp'), X.machine_side('drps'), front=X.dropper_front(), color='#7d7d7d')
add('crafter', 'Crafter', X.crafter_top(False), X.crafter_side(False), X.machine_top('crb'), front=X.crafter_front(False),
    color='#6f6f6f', new=TRICKY)
add('crafter_on', 'Crafter', X.crafter_top(True), X.crafter_side(True), X.machine_top('crb'), front=X.crafter_front(True),
    color='#8a6f6f', new=TRICKY)
add('slime_block', 'Slime Block', X.slime(), color='#7cc86e', translucent=True)
add('honey_block', 'Honey Block', X.honey(), color='#f2a72e', translucent=True)
add('target', 'Target', X.target(True), X.target(), color='#e6d6b0')


def facing_shape(build, p, v):
    """Any block with a front (and an optional back), pointing f = N/E/S/W/U/D."""
    f = v.get('f', 'S'); b = v['b']; blk = B[b]
    fk = 'tech_front_' + b; bk = 'tech_back_' + b
    if fk not in SPECIAL: SPECIAL[fk] = blk['front'] if blk['front'] is not None else blk['side']
    if bk not in SPECIAL: SPECIAL[bk] = blk.get('back') if blk.get('back') is not None else blk['side']
    parts = [(u16(0, 0, 1, 16, 16, 15), None), (u16(0, 0, 15, 16, 16, 16), fk), (u16(0, 0, 0, 16, 16, 1), bk)]
    return [(rot(bb, f), o) for bb, o in parts], [f]


EXTRA_SHAPES['facing'] = facing_shape; EXTRA_ITEMS['facing'] = name_of


def piston_head_shape(build, p, v):
    """The pushed-out head of a piston, in the block in front of it. Use the piston's own key
    ('piston' or 'sticky_piston') and the same f as the base. Not counted as an item."""
    f = v.get('f', 'S')
    parts = [(u16(0, 0, 12, 16, 16, 16), 'top'), (u16(6, 6, 0, 10, 10, 12), P_ARM)]
    return [(rot(b, f), o) for b, o in parts], [f]


def piston_base_shape(build, p, v):
    """An extended piston's base: shorter, with the arm showing. Pair it with 'piston_head'."""
    f = v.get('f', 'S')
    parts = [(u16(0, 0, 0, 16, 16, 11.5), P_BASE), (u16(0, 0, 11.5, 16, 16, 12), P_INNER), (u16(6, 6, 12, 10, 10, 16), P_ARM)]
    return [(rot(b, f), o) for b, o in parts], [f]


EXTRA_SHAPES['piston_head'] = piston_head_shape; EXTRA_ITEMS['piston_head'] = lambda v: None
EXTRA_SHAPES['piston_base'] = piston_base_shape; EXTRA_ITEMS['piston_base'] = name_of

# ---------------------------------------------------------------- rails

RAILS = [('rail', 'Rail', 'rail', False, '#8a8a8e'),
         ('powered_rail', 'Powered Rail', 'powered', False, '#c9a23a'),
         ('powered_rail_on', 'Powered Rail', 'powered', True, '#e0b232'),
         ('detector_rail', 'Detector Rail', 'detector', False, '#8a8a8e'),
         ('detector_rail_on', 'Detector Rail', 'detector', True, '#a08080'),
         ('activator_rail', 'Activator Rail', 'activator', False, '#8a6a5a'),
         ('activator_rail_on', 'Activator Rail', 'activator', True, '#a86a5a')]
for key, name, kind, on, c in RAILS:
    t = X.rail_tex(kind, on)
    # top = rails running north-south, side = the same turned to run east-west (used by the rail shape)
    add(key, name, t, X.transpose(t), t, color=c, cutout=True)
for corner in ('SE', 'SW', 'NE', 'NW'):
    sp('rail_curve_' + corner, X.rail_curve(corner))


FLAT = (0, 1 / 16, 0, 1, 1 / 16, 1)


def rail_shape(build, p, v):
    """A flat track lying 1 px above the floor (a flat plane, like the game's rail model).
    a='z' (default) runs north-south, a='x' runs east-west.
    f alone: a ramp going UP toward f (put a block under the high end).
    f and side together (plain Rail only): a curve joining those two sides, e.g. f='S', side='E'."""
    f = v.get('f'); side = v.get('side'); b = v['b']
    if f and side and f != side and OPP.get(f) != side:
        corner = ('N' if 'N' in (f, side) else 'S') + ('E' if 'E' in (f, side) else 'W')
        ov = 'tech_rail_curve_' + corner if b == 'rail' else ('top' if f in 'NS' else 'side')
        return [(FLAT, ov)], ['c', corner]
    if f and f in DIRS:
        ov = 'top' if f in 'NS' else 'side'
        steps = [(u16(0, 2 * i + 1, 2 * i, 16, 2 * i + 1, 2 * i + 2), ov) for i in range(8)]
        return [(rot(bx, f), o) for bx, o in steps], ['up', f]
    a = v.get('a', 'z')
    return [(FLAT, 'side' if a == 'x' else 'top')], [a]


EXTRA_SHAPES['rail'] = rail_shape; EXTRA_ITEMS['rail'] = name_of

# ---------------------------------------------------------------- ocean

B['prismarine'].update(stairs='Prismarine Stairs', slab='Prismarine Slab', wall='Prismarine Wall')
B['dark_prismarine'].update(stairs='Dark Prismarine Stairs', slab='Dark Prismarine Slab')
add('prismarine_bricks', 'Prismarine Bricks', X.prismarine_bricks(), color='#62ad9d',
    stairs='Prismarine Brick Stairs', slab='Prismarine Brick Slab')

for kind, (nm, c, lt, dk) in X.CORAL.items():
    add(f'{kind}_coral_block', f'{nm} Coral Block', X.coral_block(kind), color=c)
    add(f'{kind}_coral_fan', f'{nm} Coral Fan', X.coral_fan(kind), color=c, cutout=True)
    add(f'{kind}_coral', f'{nm} Coral', X.coral_plant(kind), color=c, cutout=True, plant_h=13)

add('kelp', 'Kelp', X.kelp(), color='#4a8a32', cutout=True)
add('seagrass', 'Seagrass', X.seagrass(), color='#4f9a3a', cutout=True)
add('cobweb', 'Cobweb', X.cobweb(), color='#e8eaec', cutout=True)
for n, light in ((1, 6), (2, 9), (3, 12), (4, 15)):
    add('sea_pickle' if n == 1 else f'sea_pickle_{n}', 'Sea Pickle', X.sea_pickle(True), X.sea_pickle(),
        color='#7d9a32', glow=True, light=light, count=n)
add('conduit', 'Conduit', X.conduit(), color='#a98c5c', glow=True, light=15)
add('sponge', 'Sponge', X.sponge(), color='#cfc24c')
add('wet_sponge', 'Wet Sponge', X.sponge(True), color='#a59b3c')
add('tinted_glass', 'Tinted Glass', X.tinted_glass(), color='#2d2533', translucent=True)


def cross_boxes(h=16):
    """Two crossed flat see-through planes (like the game's X-shaped plants, but square to the grid),
    split in halves so they sort well. Flat planes have no edge faces, so nothing shows at their ends."""
    return [u16(0, 0, 8, 8, h, 8), u16(8, 0, 0, 8, h, 8), u16(8, 0, 8, 16, h, 8), u16(8, 0, 8, 8, h, 16)]


def cross_plant_shape(build, p, v):
    """Kelp, seagrass, coral, cobweb: two crossed plates with a cutout picture."""
    h = B[v['b']].get('plant_h', 16)
    return [(b, None) for b in cross_boxes(h)], [h]


def coral_fan_shape(build, p, v):
    """A coral fan: on the floor (no side), or flat on a wall (side = the wall it is on)."""
    side = v.get('side')
    if side in DIRS:
        return [(rot(u16(0, 3, 1, 16, 13, 1), side, 'N'), None)], [side]
    return [(b, None) for b in cross_boxes(10)], ['floor']


PICKLES = {1: [(6, 6, 6)], 2: [(3, 3, 6), (9, 8, 4)], 3: [(3, 3, 6), (10, 4, 4), (5, 10, 5)],
           4: [(2, 2, 6), (10, 2, 4), (2, 10, 4), (9, 9, 6)]}


def sea_pickle_shape(build, p, v):
    """1 to 4 sea pickles; the count comes from the key (sea_pickle, sea_pickle_2, _3, _4)."""
    n = B[v['b']].get('count', 1)
    return [(u16(x, 0, z, x + 4, h, z + 4), None) for x, z, h in PICKLES[n]], [n]


def conduit_shape(build, p, v):
    return [(u16(5, 5, 5, 11, 11, 11), None)], []


EXTRA_SHAPES['cross_plant'] = cross_plant_shape; EXTRA_ITEMS['cross_plant'] = name_of
EXTRA_SHAPES['coral_fan'] = coral_fan_shape; EXTRA_ITEMS['coral_fan'] = name_of
EXTRA_SHAPES['sea_pickle'] = sea_pickle_shape; EXTRA_ITEMS['sea_pickle'] = name_of
EXTRA_SHAPES['conduit'] = conduit_shape; EXTRA_ITEMS['conduit'] = name_of
for k in ('kelp', 'seagrass', 'cobweb') + tuple(f'{c}_coral' for c in X.CORAL):
    B[k]['model'] = [(b, None) for b in cross_boxes(B[k].get('plant_h', 16))]   # also works with nature's 'plant' shape

# ---------------------------------------------------------------- workstations and decor

add('lectern', 'Lectern', X.lectern_top(), X.lectern_side(), color='#a47c47')
add('cartography_table', 'Cartography Table', X.cartography_top(), X.cartography_side(), X.wood_planks('#4a3219', 'carb'),
    color='#5a4026')
add('fletching_table', 'Fletching Table', X.fletching_top(), X.fletching_side(), X.wood_planks('#c9b47c', 'flb'), color='#d6c48a')
add('smithing_table', 'Smithing Table', X.smithing_top(), X.smithing_side(), X.wood_planks('#3e2a18', 'smb'), color='#3a3a40')
add('stonecutter', 'Stonecutter', X.stonecutter_top(), X.stonecutter_side(), color='#8f8f8f', cutout=True)
add('grindstone', 'Grindstone', X.grindstone_top(), X.grindstone_side(), color='#8e8e8e')
add('loom', 'Loom', X.loom_top(), X.loom_side(), front=X.loom_front(), color='#a8834c')
add('composter', 'Composter', X.composter_top(), X.composter_side(), color='#8a6232')
add('beehive', 'Beehive', X.beehive_top(), X.beehive_side(), front=X.beehive_front(), color='#c9a35a')
add('blast_furnace', 'Blast Furnace', X.blast_top(), X.blast_side(), front=X.blast_front(False), color='#6f6f74')
add('lit_blast_furnace', 'Blast Furnace', X.blast_top(), X.blast_side(), front=X.blast_front(True), color='#8a6f60', light=13)
add('smoker', 'Smoker', X.smoker_top(), X.smoker_side(), front=X.smoker_front(False), color='#6a5a48')
add('lit_smoker', 'Smoker', X.smoker_top(), X.smoker_side(), front=X.smoker_front(True), color='#8a6a48', light=13)
B['lit_furnace']['light'] = 13
add('decorated_pot', 'Decorated Pot', X.pot_top(), X.pot_side(), color='#9c5636')
add('jack_o_lantern', "Jack o'Lantern", B['pumpkin']['top'], B['pumpkin']['side'], front=X.jack_face(),
    color='#f0a030', glow=True, light=15)
add('soul_torch', 'Soul Torch', X.torch_head('#3fc6dc', '#d8ffff', 'stf'), X.stick('#6a4e30', 'sts'), color='#63d8e0',
    glow=True, light=10)
add('soul_campfire', 'Soul Campfire', X.flame('#e8ffff', '#4fd2e2', 'scf'), _tx.log_side('#5a4520', 'scamp'),
    color='#4fd2e2', glow=True, light=10)
B['soul_lantern'].setdefault('light', 10)
add('item_frame', 'Item Frame', X.frame_tex('#8a5a32', '#5a3e24'), color='#8a5a32')
add('glow_item_frame', 'Glow Item Frame', X.frame_tex('#4fb8a8', '#2f5e58'), color='#4fb8a8')
add('quartz_bricks', 'Quartz Bricks', X.quartz_bricks(), color='#ece6db')

# Candles: plain and 16 colours, each unlit and lit (key + '_lit'). n = 1..4 candles in one spot.
CANDLES = [('candle', 'Candle', '#e3cf9a')]
for k in ('white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan',
          'purple', 'blue', 'brown', 'green', 'red', 'black'):
    CANDLES.append((f'{k}_candle', B[f'{k}_wool']['name'].replace(' Wool', ' Candle'), B[f'{k}_wool']['color']))
for key, name, c in CANDLES:
    t = X.candle(c, key)
    add(key, name, t, color=c)
    add(key + '_lit', name, t, color=c, glow=True, light=3, lit=True)

# Terracotta: the 16 colours (white, yellow and cyan already exist in Volume 1).
TERRACOTTA = {'orange': '#a15325', 'magenta': '#95576c', 'light_blue': '#706c8a', 'lime': '#677534', 'pink': '#a04d4e',
              'gray': '#392a23', 'light_gray': '#876b62', 'purple': '#7a4958', 'blue': '#4c3e5c', 'brown': '#4c3223',
              'green': '#4c532a', 'red': '#8e3c2e', 'black': '#251610', 'white': '#d1b1a1', 'yellow': '#ba8523',
              'cyan': '#575b5b'}
for k, c in TERRACOTTA.items():
    key = f'{k}_terracotta'
    if key not in B:
        add(key, B[f'{k}_wool']['name'].replace(' Wool', ' Terracotta'), _tx.terracotta(c), color=c)

# Glazed terracotta in all 16 colours (our own motif, three variants).
from plans import lighter, darker
for j, (k, c) in enumerate((k, B[f'{k}_concrete']['color']) for k in TERRACOTTA):
    pale = sum(X.col(c)) / 3 > 200                     # white: draw the light lines darker so they show
    add(f'{k}_glazed_terracotta', B[f'{k}_wool']['name'].replace(' Wool', ' Glazed Terracotta'),
        X.glazed(c, darker(c, .8) if pale else lighter(c, .45), '#5a7fa8' if pale else darker(c, .6), j % 3), color=c)


def lectern_shape(build, p, v):
    """Lectern. f = the side you stand on to read. book=True puts an open book on it."""
    f = v.get('f', 'S')
    parts = [(u16(0, 0, 0, 16, 2, 16), None), (u16(4, 2, 4, 12, 13, 12), 'side'),
             (u16(0, 12, 8, 16, 14, 16), None), (u16(0, 13, 0, 16, 15, 8), None)]
    if v.get('book'):   # an open book on the two steps of the top, kept inside the cell
        parts += [(u16(3, 14, 9, 13, 15, 15), BOOK), (u16(3, 15, 1, 13, 16, 7), BOOK)]
    return [(rot(b, f), o) for b, o in parts], [f, bool(v.get('book'))]


def grindstone_shape(build, p, v):
    """Grindstone on the floor. f = N/S: the wheel turns toward north-south; E/W: east-west."""
    f = v.get('f', 'S'); g = 'S' if f in 'NS' else 'E'
    parts = [(u16(2, 0, 6, 4, 7, 10), 'dark_oak_planks'), (u16(12, 0, 6, 14, 7, 10), 'dark_oak_planks'),
             (u16(2, 7, 5, 4, 13, 11), 'dark_oak_planks'), (u16(12, 7, 5, 14, 13, 11), 'dark_oak_planks'),
             (u16(4, 4, 2, 12, 16, 14), None)]
    return [(rot(b, g), o) for b, o in parts], [g]


def stonecutter_shape(build, p, v):
    """Stonecutter: a 9 px base and a round saw. f = N/S: blade runs east-west; E/W: north-south."""
    f = v.get('f', 'S'); g = 'S' if f in 'NS' else 'E'
    parts = [(u16(0, 0, 0, 16, 9, 16), None), (u16(0, 8, 8, 16, 16, 8), SAW)]
    return [(rot(b, g), o) for b, o in parts], [g]


def decorated_pot_shape(build, p, v):
    return [(u16(1, 0, 1, 15, 12, 15), None), (u16(4, 12, 4, 12, 14, 12), None), (u16(3, 14, 3, 13, 16, 13), None)], []


CANDLE_SPOTS = {1: [(7, 7, 6)], 2: [(5, 7, 6), (9, 6, 5)], 3: [(5, 7, 6), (9, 6, 5), (7, 9, 4)],
                4: [(5, 5, 6), (9, 5, 5), (5, 9, 5), (8, 8, 4)]}


def candle_shape(build, p, v):
    """1 to 4 candles (n). Lit keys end in '_lit' and show a flame."""
    n = max(1, min(4, int(v.get('n', 1)))); lit = B[v['b']].get('lit')
    out = []
    for x, z, h in CANDLE_SPOTS[n]:
        out += [(u16(x, 0, z, x + 2, h, z + 2), None), (u16(x + .5, h, z + .5, x + 1.5, h + 1, z + 1.5), WICK)]
        if lit: out.append((u16(x + .5, h + 1, z + .5, x + 1.5, h + 2.5, z + 1.5), FLAME))
    return out, [n]


def hanging_sign_shape(build, p, v):
    """Hanging sign, made with any planks key (oak_planks -> Oak Hanging Sign).
    Under a block: a='x' (board runs east-west, default) or 'z'.
    On a wall: side = the wall it is fixed to; a bracket sticks out and the board hangs under it."""
    side = v.get('side')
    if side in DIRS:
        parts = [(u16(7, 14, 0, 9, 16, 16), None), (u16(7, 0, 1, 9, 10, 15), None),
                 (u16(7.5, 10, 3, 8.5, 14, 4), 'dark'), (u16(7.5, 10, 12, 8.5, 14, 13), 'dark')]
        return [(rot(b, side, 'N'), o) for b, o in parts], ['wall', side]
    a = v.get('a', 'x')
    parts = [(u16(1, 0, 7, 15, 10, 9), None), (u16(2.5, 10, 7.5, 3.5, 16, 8.5), 'dark'), (u16(12.5, 10, 7.5, 13.5, 16, 8.5), 'dark')]
    if a == 'z': parts = [(rot(b, 'E'), o) for b, o in parts]
    return parts, ['ceil', a]


def hanging_sign_item(v):
    blk = B[v['b']]
    if blk.get('hanging_sign'): return blk['hanging_sign']
    n = blk['name']
    for suf in (' Planks', ' Sign', ' Log', ' Stem'):
        if n.endswith(suf): return n[:-len(suf)] + ' Hanging Sign'
    return n + ' Hanging Sign'


def item_frame_shape(build, p, v):
    """Item frame on a wall (side) or lying on the floor (no side). show='<block key>' puts a small
    picture of that block in the frame."""
    side = v.get('side'); show = v.get('show')
    if side in DIRS:
        parts = [(u16(2, 2, 0, 14, 14, 1), None)]
        if show in B: parts.append((u16(5, 5, 1, 11, 11, 2), show))
        parts = [(rot(b, side, 'N'), o) for b, o in parts]
    else:
        parts = [(u16(2, 0, 2, 14, 1, 14), None)]
        if show in B: parts.append((u16(5, 1, 5, 11, 2, 11), show))
    return parts, [side, show]


EXTRA_SHAPES['lectern'] = lectern_shape; EXTRA_ITEMS['lectern'] = name_of
EXTRA_SHAPES['grindstone'] = grindstone_shape; EXTRA_ITEMS['grindstone'] = name_of
EXTRA_SHAPES['stonecutter'] = stonecutter_shape; EXTRA_ITEMS['stonecutter'] = name_of
EXTRA_SHAPES['decorated_pot'] = decorated_pot_shape; EXTRA_ITEMS['decorated_pot'] = name_of
EXTRA_SHAPES['candle'] = candle_shape; EXTRA_ITEMS['candle'] = name_of
EXTRA_SHAPES['hanging_sign'] = hanging_sign_shape; EXTRA_ITEMS['hanging_sign'] = hanging_sign_item
EXTRA_SHAPES['item_frame'] = item_frame_shape; EXTRA_ITEMS['item_frame'] = name_of

TECH_SHAPES = ['chain', 'repeater', 'comparator', 'facing', 'piston_head', 'piston_base', 'rail', 'cross_plant',
               'coral_fan', 'sea_pickle', 'conduit', 'lectern', 'grindstone', 'stonecutter', 'decorated_pot',
               'candle', 'hanging_sign', 'item_frame']
TECH_KEYS += WAXED

# ---------------------------------------------------------------- redstone dust joins the new parts
# Volume 1's engine.dust_mask only knows a fixed list of Volume 1 keys (plus cells with rs=True). The new
# parts carry dust_link=True on the block, so dust points at them without rs=True (rs=True still works).
# TODO for integration: move the dust_link check into engine.dust_mask itself and delete this block.
import engine as _engine
import plans as _plans

# dust_link: True = joins from any side; 'axis' = only in front of or behind it (repeater, comparator);
# 'back' = only at its back, where it sends power out (observer).
DUST_LINK = ['redstone_torch_off', 'target', 'dispenser', 'dropper', 'detector_rail', 'detector_rail_on', 'crafter', 'crafter_on']
DUST_LINK += [k for k in B if k.endswith(('copper_bulb', 'copper_bulb_lit'))]
for _k in DUST_LINK:
    B[_k]['dust_link'] = True
for _k in [k for k in B if k.startswith(('repeater', 'comparator'))]:
    B[_k]['dust_link'] = 'axis'
for _k in ('observer', 'observer_on'):
    B[_k]['dust_link'] = 'back'

_V1_DUST = ('redstone_torch', 'lever', 'stone_button', 'oak_button', 'redstone_lamp', 'lit_redstone_lamp', 'note_block',
            'sticky_piston', 'piston', 'iron_door', 'redstone_block', 'daylight_detector', 'hopper')


def _dust_mask_with_links(build, p):
    """Same rule as Volume 1's engine.dust_mask, plus any block with dust_link=True."""
    x, y, z = p; m = ''
    for d, (dx, dz) in DIRS.items():
        n = build.get(x + dx, y, z + dz)
        if not n: continue
        link = B[n['b']].get('dust_link'); f = n.get('f', 'S')
        if link == 'axis': link = d in (f, OPP.get(f))
        elif link == 'back': link = d == f
        if n['s'] in ('dust',) or n['b'] in _V1_DUST or n.get('rs') or link:
            m += d
    if len(m) == 1: m += OPP[m]
    return m


if not getattr(_engine.dust_mask, 'links_new_parts', False):
    _dust_mask_with_links.links_new_parts = True
    _engine.dust_mask = _dust_mask_with_links
    _plans.dust_mask = _dust_mask_with_links
