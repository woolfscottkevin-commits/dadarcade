"""Volume 2 blocks: wood sets, plants and the 2024-2026 building sets.

Pale Garden (1.21.50), Spring to Life plants (1.21.70), shelves (The Copper Age, 1.21.111),
Golden Dandelion (26.10) and Wilderness Bound (26.50): the poplar set, wool and concrete
stairs and slabs, cushions, straw beds, red shrub and shelf mushroom. Plus missing builder
blocks: acacia, mangrove, bamboo, crimson and warped sets, deepslate tiles, tuff, mud bricks,
granite, diorite, calcite, ice, snow layers, smooth quartz and more.

Every display name was checked against Bedrock's own en_US.lang (bedrock-samples) and minecraft.wiki.
Textures are original (ext/_tex_nature2026.py). The catalogue for build designers is nature2026.md.

New shapes: shelf, cushion, straw_bed, shelf_mushroom, hanging_plant, plant, layers.
Also wraps engine.conn_mask so fences and walls join fence gates (see the end of this file).
"""
from lbl import *
from ext import _tex_nature2026 as nt
import numpy as np

SKIPPED = []          # keys another module registered first (left alone)
ADDED = []            # keys this module registered


def R(key, name, top, side=None, bottom=None, **kw):
    """reg() that never overwrites a block someone else already made."""
    if key in B:
        SKIPPED.append(key); return False
    reg(key, name, top, side, bottom, **kw); ADDED.append(key); return True


def special(key, img):
    """A texture usable as a box override (engine SPECIAL table). Keys start with 'nat_'."""
    SPECIAL[key] = img
    return key


C = nt.hexrgb

# ====================================================================== wood sets

SHELF_NEW = '1.21.111'   # The Copper Age added shelves for every wood that existed then


def shelf_for(k, n, c, new=SHELF_NEW):
    """'<k>_shelf' block + recess texture; the planks block learns its shelf."""
    sk = f'{k}_shelf'
    R(sk, f'{n} Shelf', nt.shelf_board(c, sk), nt.shelf_front(c, sk + 'f'), color=c, is_shelf=True, new=new)
    special('nat_' + sk, B[sk]['side'])
    pk = f'{k}_planks'
    if pk in B:
        B[pk]['shelf_key'] = sk; B[pk]['shelf_item'] = f'{n} Shelf'


def gate_for(k, n, c, new=None):
    extra = {'new': new} if new else {}
    R(f'{k}_fence_gate', f'{n} Fence Gate', tx.planks(c, k + 'gate'), color=c, **extra)


def door_set(k, n, c, new=None, win=True):
    extra = {'new': new} if new else {}
    R(f'{k}_door', f'{n} Door', tx.door(c, win, k + 'd'), tx.door(c, False, k + 'd2'), color=c, **extra)
    R(f'{k}_trapdoor', f'{n} Trapdoor', tx.trapdoor(c, k + 't'), color=c, **extra)


def planks_for(k, n, c, img=None, new=None):
    extra = {'new': new} if new else {}
    R(f'{k}_planks', f'{n} Planks', img if img is not None else tx.planks(c, k),
      color=c, stairs=f'{n} Stairs', slab=f'{n} Slab', fence=f'{n} Fence', **extra)


# ---- Volume 1 woods: the missing fence gates and stripped logs, plus shelves
for k, n, c, strip in [('oak', 'Oak', '#b8945f', '#b99560'), ('spruce', 'Spruce', '#7a5a36', '#76583a'),
                       ('birch', 'Birch', '#d7c68b', '#cdb985'), ('dark_oak', 'Dark Oak', '#4a3219', '#5b3f27'),
                       ('jungle', 'Jungle', '#a8744a', '#ab7f51'), ('cherry', 'Cherry', '#e3b3aa', '#dca39f')]:
    gate_for(k, n, c)
    shelf_for(k, n, c)
    R(f'stripped_{k}_log', f'Stripped {n} Log', nt.stripped_top(strip, k + 'st'), nt.stripped_side(strip, k + 'ss'), color=strip)

R('dark_oak_leaves', 'Dark Oak Leaves', tx.leaves('#3f6b25', 'dol'), color='#3f6b25')
R('jungle_leaves', 'Jungle Leaves', tx.leaves('#4a8f22', 'jul'), color='#4a8f22')

# ---- Pale Garden (The Garden Awakens, Bedrock 1.21.50)
PALE = '#e3dad4'
planks_for('pale_oak', 'Pale Oak', PALE, new='1.21.50')
door_set('pale_oak', 'Pale Oak', PALE, new='1.21.50')
gate_for('pale_oak', 'Pale Oak', PALE, new='1.21.50')
shelf_for('pale_oak', 'Pale Oak', '#ddd3cc')
R('stripped_pale_oak_log', 'Stripped Pale Oak Log', nt.stripped_top('#e6ddd7', 'spot'), nt.stripped_side('#e6ddd7', 'spos'),
  color='#e6ddd7', new='1.21.50')
for k in ('pale_oak_log', 'pale_oak_leaves', 'pale_moss'):
    if k in B: B[k].setdefault('new', '1.21.50')          # Volume 1 made these; tag them as new
R('pale_moss_carpet', 'Pale Moss Carpet', B['pale_moss']['top'], color='#8f9a8c', new='1.21.50')
R('pale_hanging_moss', 'Pale Hanging Moss', nt.moss_strands('#939d90', 'phm'), color='#939d90', cutout=True, new='1.21.50')
R('resin_bricks', 'Resin Bricks', nt.resin_bricks(), color='#c45a1c', stairs='Resin Brick Stairs',
  slab='Resin Brick Slab', wall='Resin Brick Wall', new='1.21.50')
R('chiseled_resin_bricks', 'Chiseled Resin Bricks', nt.chiseled_resin(), color='#c45a1c', new='1.21.50')
R('resin_block', 'Block of Resin', nt.resin_block(), color='#d0661f', new='1.21.50')
R('open_eyeblossom', 'Open Eyeblossom', nt.eyeblossom_open(), nt.stem_tex('#5d625a', 'eyos'), color='#f0882a',
  cutout=True, new='1.21.50')
R('closed_eyeblossom', 'Closed Eyeblossom', nt.eyeblossom_closed(), nt.stem_tex('#4b4f49', 'eycs'), color='#8d8a86',
  cutout=True, new='1.21.50')

# ---- Poplar (Wilderness Bound, 26.50): light brown-grey wood, dark bark, red/orange/yellow leaves
POP = '#9d9283'
planks_for('poplar', 'Poplar', POP, new='26.50')
R('poplar_log', 'Poplar Log', tx.log_top('#4b3a2b', '#aaa192', 'popt'),
  nt.bark('#4e3c2c', 'popb', fleck='#857160', nfleck=6, streak='#6b5643'), color='#4b3a2b', new='26.50')
R('stripped_poplar_log', 'Stripped Poplar Log', nt.stripped_top('#aea595', 'sppt'), nt.stripped_side('#aea595', 'spps'),
  color='#aea595', new='26.50')
door_set('poplar', 'Poplar', POP, new='26.50')
gate_for('poplar', 'Poplar', POP, new='26.50')
shelf_for('poplar', 'Poplar', '#a69b8c', new='26.50')
for k, n, c, lt in [('red', 'Red', '#b0332b', '#d65a3c'), ('orange', 'Orange', '#d7731f', '#f0a040'),
                    ('yellow', 'Yellow', '#d9aa24', '#f4d260')]:
    R(f'{k}_poplar_leaves', f'{n} Poplar Leaves', nt.leaves_cut(c, k + 'popl', 0.08, lt), color=c, cutout=True, new='26.50')

# ---- Acacia, Mangrove (Overworld woods missing from Volume 1)
for k, n, c, bark, inner, strip, leaf in [
        ('acacia', 'Acacia', '#b1623a', '#68625a', '#b0613b', '#b4643f', '#6f8f2c'),
        ('mangrove', 'Mangrove', '#7a3a33', '#55432f', '#6e302a', '#7c3b34', '#4f8a2c')]:
    planks_for(k, n, c)
    R(f'{k}_log', f'{n} Log', tx.log_top(bark, inner, k + 'lt'), nt.bark(bark, k + 'lb'), color=bark)
    R(f'stripped_{k}_log', f'Stripped {n} Log', nt.stripped_top(strip, k + 'st'), nt.stripped_side(strip, k + 'ss'), color=strip)
    R(f'{k}_leaves', f'{n} Leaves', tx.leaves(leaf, k + 'lv'), color=leaf)
    door_set(k, n, c)
    gate_for(k, n, c)
    shelf_for(k, n, strip)

# ---- Bamboo wood
BAM = '#c9b04c'
planks_for('bamboo', 'Bamboo', BAM, img=nt.bamboo_planks())
R('bamboo_mosaic', 'Bamboo Mosaic', nt.bamboo_mosaic(), color='#c4aa48', stairs='Bamboo Mosaic Stairs', slab='Bamboo Mosaic Slab')
R('bamboo_block', 'Block of Bamboo', nt.bamboo_block_top(), nt.bamboo_block_side(), color='#6f9a2a')
R('stripped_bamboo_block', 'Block of Stripped Bamboo', nt.bamboo_block_top('#c2a845', '#e0cc6a', 'sbbt'),
  nt.bamboo_block_side('#c2a845', 'sbbs'), color='#c2a845')
door_set('bamboo', 'Bamboo', BAM)
gate_for('bamboo', 'Bamboo', BAM)
shelf_for('bamboo', 'Bamboo', '#c8ad4a')

# ---- Nether woods: stems instead of logs
for k, n, c, bark, streak, inner, strip in [
        ('crimson', 'Crimson', '#6b344b', '#5a1e2c', '#b8344d', '#7a3550', '#8c3a5a'),
        ('warped', 'Warped', '#2c6b65', '#2f2f48', '#2fae9c', '#2c7a72', '#3a8c84')]:
    planks_for(k, n, c)
    R(f'{k}_stem', f'{n} Stem', tx.log_top(bark, inner, k + 'st'), nt.bark(bark, k + 'sb', streak=streak), color=bark)
    R(f'stripped_{k}_stem', f'Stripped {n} Stem', nt.stripped_top(strip, k + 'sst'), nt.stripped_side(strip, k + 'sss'), color=strip)
    door_set(k, n, c)
    gate_for(k, n, c)
    shelf_for(k, n, strip)

# ====================================================================== wool and concrete stairs, slabs (26.50)
for col in ('white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan',
            'purple', 'blue', 'brown', 'green', 'red', 'black'):
    for k in (f'{col}_wool', f'{col}_concrete'):
        if k in B:
            B[k]['stairs'] = B[k]['name'] + ' Stairs'; B[k]['slab'] = B[k]['name'] + ' Slab'
            B[k]['new_shapes'] = {'stairs': '26.50', 'slab': '26.50'}
for k in ('cloud', 'light_blue_wool2'):      # Volume 1 aliases that are also wool
    if k in B:
        B[k]['stairs'] = B[k]['name'] + ' Stairs'; B[k]['slab'] = B[k]['name'] + ' Slab'
        B[k]['new_shapes'] = {'stairs': '26.50', 'slab': '26.50'}

# ====================================================================== plants and nature

# Every 'plant' block carries its own model: a list of (box in 16ths, override).
STEM = special('nat_stem', nt.stem_tex('#4f7f2f', 'nstem'))
TWIG = special('nat_twig', nt.twig())


def model(key, *boxes):
    B[key]['model'] = [(u16(*b), ov) for b, ov in boxes]


def plus(w, h, t=3, ov=None, h2=None):
    """Two crossing slabs, the box-shaped stand-in for Minecraft's crossed plant planes."""
    a = (16 - w) / 2; m = (16 - t) / 2
    return [((a, 0, m, a + w, h, m + t), ov), ((m, 0, a, m + t, h2 or h, a + w), ov)]


def jag(w, hs, hs2=None, t=2, ov=None):
    """Crossed leafy panels with a ragged top: each panel is cut into pieces of different heights."""
    a = (16 - w) / 2; m = (16 - t) / 2; n = len(hs); seg = w / n; out = []
    for i, h in enumerate(hs):
        out.append(((a + i * seg, 0, m, a + (i + 1) * seg, h, m + t), ov))
    for i, h in enumerate(hs2 or hs[::-1]):
        out.append(((m, 0, a + i * seg, m + t, h, a + (i + 1) * seg), ov))
    return out


# Spring to Life (1.21.70)
R('bush', 'Bush', nt.bush_tex('#55902f', 'bsh', holes=0.17, light='#7cb84a'), color='#55902f', cutout=True, new='1.21.70')
model('bush', *jag(14, [8, 12, 13, 9], [10, 13, 11, 7]))
R('firefly_bush', 'Firefly Bush', nt.bush_tex('#6e6f2f', 'ffb', dots=10, dot_c='#f6f29a', holes=0.16, light='#93913f'),
  color='#6e6f2f', cutout=True, light=2, new='1.21.70')
model('firefly_bush', *jag(14, [11, 16, 14, 12], [13, 15, 16, 10]))
R('leaf_litter', 'Leaf Litter', nt.litter(), color='#8a5f34', cutout=True, new='1.21.70')
model('leaf_litter', ((0, 0, 0, 16, 1, 16), None))
R('wildflowers', 'Wildflowers', nt.petal_mat(['#f5d932', '#f4f4f4'], '#e8a21c', 'wfl', leaf='#5b8f32', n=6),
  color='#f5d932', cutout=True, new='1.21.70')
model('wildflowers', ((0, 0, 0, 16, 1, 16), None))
R('cactus_flower', 'Cactus Flower', nt.petal_head('#f19bb9', '#ffd2e0', 'cfl', ring='#e67aa0', cs=(7, 9)),
  color='#f19bb9', cutout=True, new='1.21.70')
model('cactus_flower', ((6, 0, 6, 10, 4, 10), 'top'), ((2, 0, 6.5, 6, 2, 9.5), 'top'), ((10, 0, 6.5, 14, 2, 9.5), 'top'),
      ((6.5, 0, 2, 9.5, 2, 6), 'top'), ((6.5, 0, 10, 9.5, 2, 14), 'top'), ((3.5, 1, 3.5, 6, 4, 6), 'top'),
      ((10, 1, 10, 12.5, 4, 12.5), 'top'), ((10, 1, 3.5, 12.5, 3, 6), 'top'), ((3.5, 1, 10, 6, 3, 12.5), 'top'))
R('short_dry_grass', 'Short Dry Grass', nt.blades('#cdb98a', 'sdg', tip='#e9dcb4'), color='#cdb98a', new='1.21.70')
model('short_dry_grass', *[((x, 0, z, x + 1, h, z + 1), None) for x, z, h in
                           [(3, 4, 6), (6, 10, 8), (8, 5, 7), (11, 9, 9), (12, 3, 5), (5, 13, 5), (9, 12, 6)]])
R('tall_dry_grass', 'Tall Dry Grass', nt.blades('#d2bf8f', 'tdg', tip='#efe3bd'), color='#d2bf8f', new='1.21.70')
model('tall_dry_grass', *[((x, 0, z, x + 1, h, z + 1), None) for x, z, h in
                          [(2, 5, 11), (5, 10, 15), (7, 3, 13), (9, 8, 16), (12, 11, 12), (11, 4, 14), (4, 13, 10), (13, 7, 9)]])

# Tiny Takeover (26.10) and Wilderness Bound (26.50)
R('golden_dandelion', 'Golden Dandelion', nt.petal_head('#f3c51f', '#c98a12', 'gdd', cs=(7, 9)),
  nt.stem_tex('#4f7f2f', 'gds'), color='#f3c51f', cutout=True, new='26.10')
model('golden_dandelion', ((7.5, 0, 7.5, 8.5, 7, 8.5), 'side'), ((5.5, 6, 5.5, 10.5, 9, 10.5), 'top'),
      ((6.5, 9, 6.5, 9.5, 10, 9.5), 'top'))
R('red_shrub', 'Red Shrub', nt.bush_tex('#a4302a', 'rsh', holes=0.15, light='#cf513b'), color='#a4302a', cutout=True, new='26.50')
model('red_shrub', *jag(14, [9, 13, 11, 7], [8, 12, 13, 9]))
R('shelf_mushroom', 'Shelf Mushroom', nt.shelf_fungus_top(), nt.fungus_side(), color='#c17f45', new='26.50')
R('straw_bed', 'Straw Bed', nt.straw_mat(), nt.straw_roll(), color='#cdb03e', new='26.50')
special('nat_straw_x', nt.straw_mat(rotate=True))

# Pale Garden flowers
model('open_eyeblossom', ((7.5, 0, 7.5, 8.5, 9, 8.5), 'side'), ((4.5, 9, 4.5, 11.5, 10.5, 11.5), 'top'),
      ((7, 10.5, 7, 9, 11.5, 9), 'top'), ((6, 8, 6, 10, 9, 10), 'top'))
model('closed_eyeblossom', ((7.5, 0, 7.5, 8.5, 8, 8.5), 'side'), ((6.5, 7, 6.5, 9.5, 13, 9.5), 'top'))

# Lush caves and older plants that builders keep asking for
R('azalea', 'Azalea', nt.leaves_cut('#5f8f34', 'azb', 0.05), nt.leaves_cut('#5a8a32', 'azs', 0.18), color='#5f8f34', cutout=True)
model('azalea', ((0, 8, 0, 16, 16, 16), None), ((7, 0, 3, 9, 8, 13), TWIG), ((3, 0, 7, 13, 8, 9), TWIG))
fl = nt.dotted(nt.leaves_cut('#5f8f34', 'fazb', 0.05), '#d77ad0', 7, 'fazd', size=2)
R('flowering_azalea', 'Flowering Azalea', fl, nt.dotted(nt.leaves_cut('#5a8a32', 'fazs', 0.18), '#d77ad0', 4, 'fazd2'),
  color='#b06ab8', cutout=True)
B['flowering_azalea']['model'] = B['azalea']['model']
R('moss_carpet', 'Moss Carpet', B['moss_block']['top'], color='#5b7f2c')
R('pink_petals', 'Pink Petals', nt.petal_mat('#f2a5c4', '#f6d24a', 'ppt', dark='#d97aa0', leaf='#5f8f32', n=6),
  color='#f2a5c4', cutout=True)
model('pink_petals', ((0, 0, 0, 16, 1, 16), None))
R('sugar_cane', 'Sugar Cane', tx.noise('#8cbf5a', 6, 'sct'), nt.stalk('#8cbf5a', '#6a9a3c', 'scs'), color='#8cbf5a', cutout=True)
model('sugar_cane', ((2, 0, 3, 4, 16, 5), None), ((7, 0, 10, 9, 16, 12), None), ((11, 0, 5, 13, 16, 7), None),
      ((5, 0, 7, 6, 12, 8), None))
R('bamboo', 'Bamboo', nt.leaves_cut('#5f9a2a', 'bml', 0.12), nt.stalk('#6f9a2a', '#4d7420', 'bms', joints=(5, 13)),
  color='#6f9a2a', cutout=True)
model('bamboo', ((6.5, 0, 6.5, 9.5, 16, 9.5), 'side'), ((1, 12, 6, 6.5, 13, 10), 'top'), ((9.5, 9, 7, 14, 10, 12), 'top'))
R('snow_layer', 'Snow', tx.snow(), color='#f4f8fa')
R('ice', 'Ice', nt.ice(), color='#9dc3f5', translucent=True)
R('packed_ice', 'Packed Ice', nt.packed_ice(), color='#9dbcf0')
R('blue_ice', 'Blue Ice', nt.packed_ice('#74a2ef', '#c3dafc', 'bice'), color='#74a2ef')

# ====================================================================== stone, mud, quartz

R('deepslate_tiles', 'Deepslate Tiles', nt.tiles('#404046', '#27272c', 'dst'), color='#404046',
  stairs='Deepslate Tile Stairs', slab='Deepslate Tile Slab', wall='Deepslate Tile Wall')
R('cobbled_deepslate', 'Cobbled Deepslate', tx.cobble('#55555b', 'cbds'), color='#55555b',
  stairs='Cobbled Deepslate Stairs', slab='Cobbled Deepslate Slab', wall='Cobbled Deepslate Wall')
R('tuff', 'Tuff', nt.stone_speck('#6c6d66', ['#83847b', '#5a5b54'], 'tuf', 8, 0.1), color='#6c6d66',
  stairs='Tuff Stairs', slab='Tuff Slab', wall='Tuff Wall')
R('polished_tuff', 'Polished Tuff', nt.polished('#71736b', '#575951', 'ptf'), color='#71736b',
  stairs='Polished Tuff Stairs', slab='Polished Tuff Slab', wall='Polished Tuff Wall', new='1.21.0')
R('chiseled_tuff', 'Chiseled Tuff', nt.chiseled_tuff(), color='#6f716a', new='1.21.0')
if 'tuff_bricks' in B:                         # Volume 1 block: the wall exists in game too
    B['tuff_bricks'].setdefault('wall', 'Tuff Brick Wall'); B['tuff_bricks'].setdefault('new', '1.21.0')
    if B['tuff_bricks']['wall'] is None: B['tuff_bricks']['wall'] = 'Tuff Brick Wall'
R('mud_bricks', 'Mud Bricks', nt.mud_bricks(), color='#8f6c4c', stairs='Mud Brick Stairs', slab='Mud Brick Slab',
  wall='Mud Brick Wall')
R('packed_mud', 'Packed Mud', nt.packed_mud(), color='#8e6b4f')
R('calcite', 'Calcite', nt.stone_speck('#dfe0db', ['#c7c9c3'], 'calc', 5, 0.16), color='#dfe0db')
R('dripstone_block', 'Dripstone Block', nt.dripstone_tex(), color='#86644f')
R('granite', 'Granite', nt.stone_speck('#9a6a56', ['#c08c78', '#6f4a3c'], 'gran', 8, 0.13), color='#9a6a56',
  stairs='Granite Stairs', slab='Granite Slab', wall='Granite Wall')
R('polished_granite', 'Polished Granite', nt.polished('#9c6b57', '#7d523f', 'pgran', 6), color='#9c6b57',
  stairs='Polished Granite Stairs', slab='Polished Granite Slab')
R('diorite', 'Diorite', nt.stone_speck('#c9c9c6', ['#8d8d8a', '#e8e8e6'], 'dior', 7, 0.12), color='#c9c9c6',
  stairs='Diorite Stairs', slab='Diorite Slab', wall='Diorite Wall')
R('polished_diorite', 'Polished Diorite', nt.polished('#cdcdca', '#a9a9a6', 'pdior', 5), color='#cdcdca',
  stairs='Polished Diorite Stairs', slab='Polished Diorite Slab')
R('smooth_quartz', 'Smooth Quartz Block', tx.noise('#ebe5da', 2, 'smq'), color='#ebe5da',
  stairs='Smooth Quartz Stairs', slab='Smooth Quartz Slab')

# stained glass colours Volume 1 left out (panes work through the 'pane' shape: "<name> Pane")
for k, n, c in [('gray', 'Gray', '#5a5a5a'), ('light_gray', 'Light Gray', '#a0a0a0'), ('brown', 'Brown', '#73553a')]:
    R(f'{k}_stained_glass', f'{n} Stained Glass', tx.glass(c, 120, c), color=c, translucent=True)

# ====================================================================== shapes


def wall_box(side, a0, a1, depth, y0, y1):
    """A box against wall `side` (N/E/S/W): a0..a1 along the wall, `depth` px out from it, y0..y1 high."""
    return u16(*{'N': (a0, y0, 0, a1, y1, depth), 'S': (a0, y0, 16 - depth, a1, y1, 16),
                 'W': (0, y0, a0, depth, y1, a1), 'E': (16 - depth, y0, a0, 16, y1, a1)}[side])


def shelf_shape(build, p, v):
    """A wall shelf. `side` is the wall it hangs on (it faces the other way). Same boxes as the game:
    a 3 px back with 5 px deep boards at the top and bottom (4 px tall each)."""
    side = v.get('side', 'N'); blk = B[v['b']]
    if blk.get('is_shelf'): board, back = 'top', 'side'
    elif blk.get('shelf_key'): board, back = blk['shelf_key'], 'nat_' + blk['shelf_key']
    else: board, back = None, 'dark'
    return [(side_panel(side, 5, 0, 4 / 16), board), (side_panel(side, 5, 12 / 16, 1), board),
            (side_panel(side, 3, 4 / 16, 12 / 16), back)], [side]


def shelf_item(v):
    blk = B[v['b']]
    if blk.get('shelf_item'): return blk['shelf_item']
    return blk['name'] if blk['name'].endswith('Shelf') else blk['name'] + ' Shelf'


def cushion_shape(build, p, v):
    """A cushion (an entity in game): a soft pad 4 px tall on the floor of the cell, almost a full block wide."""
    return [(u16(0.5, 0, 0.5, 15.5, 3, 15.5), None), (u16(2, 3, 2, 14, 4, 14), None)], []


def cushion_item(v):
    n = B[v['b']]['name']
    return n.replace(' Wool', ' Cushion') if n.endswith(' Wool') else n + ' Cushion'


def straw_bed_shape(build, p, v):
    """Two cells like a bed: part='foot'/'head', f = the way the head points. A low straw mat,
    with a rolled straw pillow at the head end."""
    part = v.get('part', 'foot'); F = v.get('f', 'N')
    along_z = F in ('N', 'S')
    mat = u16(1, 0, 0, 15, 3, 16) if along_z else u16(0, 0, 1, 16, 3, 15)
    bx = [(mat, None if along_z else 'nat_straw_x')]
    if part == 'head':
        bx.append(({'N': u16(1.5, 3, 1, 14.5, 6, 5), 'S': u16(1.5, 3, 11, 14.5, 6, 15),
                    'W': u16(1, 3, 1.5, 5, 6, 14.5), 'E': u16(11, 3, 1.5, 15, 6, 14.5)}[F], 'side'))
    return bx, [part, F]


def shelf_mushroom_shape(build, p, v):
    """Shelf fungus growing out of the side of a log. `side` = the block it grows on; big=True for the large one."""
    side = v.get('side', 'N')
    if v.get('big'):
        return [(wall_box(side, 1, 15, 8, 4, 7), None), (wall_box(side, 4, 12, 5, 10, 13), None)], [side, 'big']
    return [(wall_box(side, 3, 13, 6, 7, 10), None)], [side]


STRANDS = [(2, 3, 12), (6, 9, 16), (10, 4, 10), (4, 12, 14), (12, 11, 8), (8, 1, 7), (13, 6, 13)]


def hanging_shape(build, p, v):
    """Strands hanging from the block above (pale hanging moss). tip=True for the shorter bottom piece."""
    f = 0.55 if v.get('tip') else 1.0
    return [(u16(x, 16 - max(2, round(L * f)), z, x + 2, 16, z + 2), None) for x, z, L in STRANDS], ['tip' if v.get('tip') else '']


DEFAULT_PLANT = [(u16(3, 0, 4, 4, 6, 5), None), (u16(8, 0, 9, 9, 8, 10), None), (u16(11, 0, 5, 12, 5, 6), None),
                 (u16(6, 0, 12, 7, 6, 13), None)]


def plant_shape(build, p, v):
    """Small plants. Each plant block brings its own boxes (B[key]['model'])."""
    return list(B[v['b']].get('model') or DEFAULT_PLANT), []


def layers_shape(build, p, v):
    """Snow layers: n = 1..8, each layer is 2 px."""
    n = max(1, min(8, int(v.get('n', 1))))
    return [((0, 0, 0, 1, n * 2 / 16, 1), None)], [n]


def name_of(v):
    blk = B[v['b']]; return blk.get('item') or blk['name']


EXTRA_SHAPES['shelf'] = shelf_shape;                 EXTRA_ITEMS['shelf'] = shelf_item
EXTRA_SHAPES['cushion'] = cushion_shape;             EXTRA_ITEMS['cushion'] = cushion_item
EXTRA_SHAPES['straw_bed'] = straw_bed_shape
EXTRA_ITEMS['straw_bed'] = lambda v: None if v.get('part') == 'head' else name_of(v)
EXTRA_SHAPES['shelf_mushroom'] = shelf_mushroom_shape; EXTRA_ITEMS['shelf_mushroom'] = name_of
EXTRA_SHAPES['hanging_plant'] = hanging_shape;       EXTRA_ITEMS['hanging_plant'] = name_of
EXTRA_SHAPES['plant'] = plant_shape;                 EXTRA_ITEMS['plant'] = name_of
EXTRA_SHAPES['layers'] = layers_shape;               EXTRA_ITEMS['layers'] = name_of


# ====================================================================== fences and walls join fence gates
# Volume 1's engine.conn_mask only joins a fence to a gate whose key contains "planks", and gate keys are
# '<wood>_fence_gate', so fence arms never reached a gate. In the game a fence or wall joins a fence gate
# that lines up with it: a gate with a='x' (spanning east-west) joins on its E and W sides, a='z' on N and S.
# This wraps conn_mask for the 3D models (engine) and the layer plans (plans). TODO for integration:
# move this rule into engine.conn_mask itself and delete this block.
import engine as _engine
import plans as _plans


def _conn_mask_with_gates(build, p, v, _base=_engine.conn_mask):
    m = _base(build, p, v)
    if v['s'] not in ('fence', 'wall'): return m
    x, y, z = p
    for d, (dx, dz) in DIRS.items():
        n = build.get(x + dx, y, z + dz)
        if n is not None and n['s'] == 'gate' and (n.get('a', 'x') == 'x') == (d in 'EW'):
            m += d
    return ''.join(sorted(set(m)))


if not getattr(_engine.conn_mask, 'joins_gates', False):
    _conn_mask_with_gates.joins_gates = True
    _engine.conn_mask = _conn_mask_with_gates
    _plans.conn_mask = _conn_mask_with_gates
