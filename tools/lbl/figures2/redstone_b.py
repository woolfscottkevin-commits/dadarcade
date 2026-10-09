# Redstone Workshop, part B: Shelf Quick-Swap Armory, Metro Station Stop, Crafter Auto-Baker.
# Each figure is a list of frames, one per state of the gadget (frame 1 = resting, then one frame
# after each tap of the reader's input). Words: tools/lbl/content/redstone/<id>.json
#
# Shapes added here (prefixed rsb_, used only by these figures):
#   rsb_shelf   a shelf showing what it holds: block keys draw as small cubes, 'i:<name>' draws a
#               little item picture (original pixel art, built from tiny boxes). chain='L'/'C'/'R'/'U'
#               draws it powered: no dividers, and joined shelves lose the posts where they meet
#   rsb_lever   a floor lever whose handle leans one way when off and the other way when on
#   rsb_button  a floor button that sits lower while pressed
#   rsb_bread   a crafted loaf of bread lying on the floor (an item that popped out of the crafter)
#   rsb_railcart  a rail with a minecart (a vehicle, not a block) standing on it, in one cell
from lbl import *
import numpy as np
import textures as _tx

# ---------------------------------------------------------------- tiny pictures of items
# Every picture is our own pixel art. One character is one dot; '.' is see-through.
# Pictures stand upright on a shelf. One dot is 0.5 px of a block (a block is 16 px).
PALETTE = {
    'c': '#5fe3d6', 'C': '#2a9f95',              # diamond: light, dark edge
    'i': '#d8d8d8', 'I': '#8e8e8e',              # iron: light, dark
    'h': '#8a5a2b', 'H': '#5a3a1a',              # wood handle: light, dark
    'p': '#b98a4e', 'P': '#7a5530',              # planks (shield face)
    's': '#f2f2f2',                              # bow string, arrow feathers
    'y': '#ffd94a', 'o': '#ff8a1f',              # torch flame
    'r': '#d8262c', 'R': '#8c1418', 'g': '#4f9a2a',   # apple
    'b': '#d9a04a', 'B': '#9c6224', 'l': '#f0c878',   # bread: crust, dark crust, light top
    'm': '#aeb2b7', 'M': '#7c8086', 'n': '#45484d', 'N': '#2a2c30',   # minecart: iron, darker iron, inside, wheels
}

ITEMS = {
    'sword': [
        '....c....',
        '...cCc...',
        '...cCc...',
        '...cCc...',
        '...cCc...',
        '...cCc...',
        '...cCc...',
        '...cCc...',
        '.HHHHHHH.',
        '....h....',
        '....h....',
        '...HHH...',
    ],
    'bow': [
        '...hh....',
        '..h..s...',
        '.h...s...',
        '.h...s...',
        'h....s...',
        'h....s...',
        'h....s...',
        'h....s...',
        '.h...s...',
        '.h...s...',
        '..h..s...',
        '...hh....',
    ],
    'arrow': [
        '....i....',
        '...iii...',
        '..iIiIi..',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '...shs...',
        '..s.h.s..',
        '..s...s..',
    ],
    'shield': [
        'IIIIIIIII',
        'IpPpppPpI',
        'IpPpppPpI',
        'IpPpipPpI',
        'IpPiiiPpI',
        'IpPpipPpI',
        'IpPpppPpI',
        'IpPpppPpI',
        '.IpPpPpI.',
        '..IpppI..',
        '...III...',
    ],
    'pickaxe': [
        '..ccccc..',
        '.cCCCCCc.',
        'cC..h..Cc',
        'c...h...c',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '....H....',
    ],
    'axe': [
        '..iii....',
        '.iiIIh...',
        '.iiIIh...',
        '.iiII h..',
        '..iiIh...',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '....h....',
        '....H....',
    ],
    'torch': [
        '...yyy...',
        '..yyoyy..',
        '..yoooy..',
        '...yyy...',
        '...hHh...',
        '...hHh...',
        '...hHh...',
        '...hHh...',
        '...hHh...',
        '...hHh...',
        '...HHH...',
    ],
    'apple': [
        '....H....',
        '....Hgg..',
        '..rrHrr..',
        '.rrrrrrr.',
        'rrsrrrrrR',
        'rsrrrrrrR',
        'rrrrrrrrR',
        'rrrrrrrrR',
        '.rrrrrrR.',
        '..RrrrR..',
        '...R.R...',
    ],
    'bread': [
        '.........',
        '.........',
        '.........',
        '..llll...',
        '.lbllbll.',
        'bbbbbbbbb',
        'bBbbBbbBb',
        'BBBBBBBBB',
        '.BBBBBBB.',
    ],
}


def _col(ch):
    """The SPECIAL texture key for one palette colour (a flat tile)."""
    key = 'rsb_' + PALETTE[ch].lstrip('#')
    if key not in SPECIAL:
        SPECIAL[key] = _tx.solid(PALETTE[ch])
    return key


def _picture(rows, cx, y_top, z0, dot=0.5, thick=0.5):
    """Boxes for an upright picture facing south. cx: centre across (px), y_top: top edge (px),
    z0: the back of the picture (px from the north side of the cell). Runs of one colour merge."""
    out = []
    w = max(len(r) for r in rows)
    x_left = cx - w * dot / 2
    for j, row in enumerate(rows):
        y1 = y_top - j * dot; y0 = y1 - dot
        i = 0
        while i < len(row):
            ch = row[i]
            if ch in '. ':
                i += 1; continue
            k = i
            while k + 1 < len(row) and row[k + 1] == ch: k += 1
            x0 = x_left + i * dot; x1 = x_left + (k + 1) * dot
            out.append((u16(x0, y0, z0, x1, y1, z0 + thick), _col(ch)))
            i = k + 1
    return out


# ---------------------------------------------------------------- shapes
TURNS = {'N': 0, 'E': 1, 'S': 2, 'W': 3}


def _turn(boxes, side):
    """Boxes drawn for a north wall, turned to sit on wall `side` (quarter turns clockwise from above)."""
    out = []
    for (x0, y0, z0, x1, y1, z1), ov in boxes:
        for _ in range(TURNS[side]):
            (x0, z0), (x1, z1) = (1 - z0, x0), (1 - z1, x1)
        out.append(((min(x0, x1), y0, min(z0, z1), max(x0, x1), y1, max(z0, z1)), ov))
    return out


def _powered_back(key, chain):
    """The back of a powered shelf. In the game a powered shelf changes its front: the two dividers go,
    so its 3 slots read as one, and up to 3 joined shelves lose the posts where they meet, so they look
    like one long shelf. chain: 'U' alone, or 'L' / 'C' / 'R' (left, middle, right as you face it).
    Made from the shelf's own texture (columns 0-1 and 14-15 are its posts, 5 and 10 its dividers)."""
    sk = f'rsb_pw_{key}_{chain}'
    if sk not in SPECIAL:
        img = np.array(B[key]['side'], dtype=float).copy()
        r = slice(4, 12)
        img[r, 5] = img[r, 6]; img[r, 10] = img[r, 9]          # no dividers
        if chain in ('C', 'R'): img[r, 0:2] = img[r, 2:4]       # open toward the shelf on the left
        if chain in ('L', 'C'): img[r, 14:16] = img[r, 12:14]   # open toward the shelf on the right
        SPECIAL[sk] = img
    return sk


def _shelf(build, p, v):
    """A shelf on wall `side` (it faces the other way) showing up to three things, left to right as
    you face it. show = [thing, thing, thing]; a block key draws a small cube, 'i:<name>' an item.
    chain = 'U' / 'L' / 'C' / 'R' draws it powered (see _powered_back); leave it out for unpowered."""
    side = v.get('side', 'N')
    boxes, extra = EXTRA_SHAPES['shelf'](build, p, v)
    chain = v.get('chain')
    if chain:                                     # the third box is the back of the shelf
        boxes = list(boxes); boxes[2] = (boxes[2][0], _powered_back(v['b'], chain))
    show = (list(v.get('show', [])) + [None] * 3)[:3]
    things = []                                   # drawn for a north wall, then turned
    for n, k in enumerate(show):
        if not k: continue
        cx = 16 / 6 * (2 * n + 1)                 # slot centres at 2.67, 8, 13.33 px
        if k.startswith('i:'):
            things += _picture(ITEMS[k[2:]], cx, 11.7, 3.6, dot=0.56)
        else:
            things.append((u16(cx - 1.8, 4, 3, cx + 1.8, 7.6, 6.6), k))   # sits on the bottom board
    return boxes + _turn(things, side), list(extra) + ['rsb', str(chain)] + [str(k) for k in show]


def _lever(build, p, v):
    """A lever. On the floor (no side) the handle leans north when off and south when on.
    On a wall (side = the wall it is fixed to) the handle points up when off and down when on."""
    on = bool(v.get('on')); side = v.get('side')
    if side is None:
        s = 1 if on else -1
        bx = [(u16(5, 0, 4, 11, 3, 12), 'cobblestone')]           # cobblestone base, wooden handle
        for k in range(4):                       # four short pieces make a leaning stick
            z0 = 7 + s * (k + 0.5)
            bx.append((u16(7, 3 + 2.25 * k, z0, 9, 3 + 2.25 * (k + 1), z0 + 2), 'side'))
        return bx, ['floor', 'on' if on else 'off']
    s = -1 if on else 1
    bx = [(u16(5, 4, 0, 11, 12, 3), 'cobblestone')]
    for k in range(4):                           # out from the wall, tilting up (off) or down (on)
        y0 = 7 + s * (k * 1.5)
        bx.append((u16(7, y0, 3 + 2 * k, 9, y0 + 2, 5 + 2 * k), 'side'))
    return _turn(bx, side), [side, 'on' if on else 'off']


def _button(build, p, v):
    """A button on the floor of the cell, or on a wall (side); pressed=True makes it sit lower."""
    t = 1 if v.get('pressed') else 2; side = v.get('side')
    box = {None: u16(5, 0, 6, 11, t, 10), 'N': u16(5, 6, 0, 11, 10, t), 'S': u16(5, 6, 16 - t, 11, 10, 16),
           'W': u16(0, 6, 5, t, 10, 11), 'E': u16(16 - t, 6, 5, 16, 10, 11)}[side]
    return [(box, None)], [side, 'pressed' if v.get('pressed') else 'up']


def _bread(build, p, v):
    """A loaf of bread lying on the floor, the way a crafted item pops out (an item, not a block)."""
    return [(u16(3, 0, 5.5, 13, 2.5, 10.5), _col('B')), (u16(3.5, 2.5, 6, 12.5, 4.5, 10), _col('b')),
            (u16(5, 4.5, 7, 6.5, 5, 9), _col('l')), (u16(7.5, 4.5, 7, 9, 5, 9), _col('l')),
            (u16(10, 4.5, 7, 11.5, 5, 9), _col('l'))], []


def _railcart(build, p, v):
    """A rail with a minecart standing on it: the rail's own flat track plus an open iron tub 1 px
    above it, all inside the rail's cell (the poster renderer clips anything outside a cell).
    The cart runs along x. Our own simple shape, not the game's model."""
    rail, extra = EXTRA_SHAPES['rail'](build, p, v)
    def bx(x0, y0, z0, x1, y1, z1, ch): return (u16(x0, y0, z0, x1, y1, z1), _col(ch))
    cart = [bx(2, 3, 2.5, 14, 4, 13.5, 'n'),                                    # floor of the tub
            bx(1, 3, 1.5, 15, 11, 3, 'm'), bx(1, 3, 13, 15, 11, 14.5, 'm'),     # the long sides
            bx(1, 3, 3, 2.5, 11, 13, 'M'), bx(13.5, 3, 3, 15, 11, 13, 'M'),     # the two ends
            bx(3, 1.5, 2.5, 5, 3, 13.5, 'N'), bx(11, 1.5, 2.5, 13, 3, 13.5, 'N')]   # wheels and axles
    return list(rail) + cart, list(extra) + ['cart']


EXTRA_SHAPES['rsb_shelf'] = _shelf;   EXTRA_ITEMS['rsb_shelf'] = lambda v: EXTRA_ITEMS['shelf'](v)
EXTRA_SHAPES['rsb_lever'] = _lever;   EXTRA_ITEMS['rsb_lever'] = lambda v: 'Lever'
EXTRA_SHAPES['rsb_button'] = _button; EXTRA_ITEMS['rsb_button'] = lambda v: B[v['b']]['name']
EXTRA_SHAPES['rsb_bread'] = _bread;   EXTRA_ITEMS['rsb_bread'] = lambda v: 'Bread'
EXTRA_SHAPES['rsb_railcart'] = _railcart; EXTRA_ITEMS['rsb_railcart'] = lambda v: 'Minecart'

# ---------------------------------------------------------------- 1. Shelf Quick-Swap Armory
GEAR = [['i:sword', 'i:bow', 'i:arrow'], ['i:shield', 'i:pickaxe', 'i:axe'], ['i:torch', 'i:apple', 'i:bread']]
KIT = [['bricks', 'oak_planks', 'glass'], ['stone_bricks', 'white_wool', 'cobblestone'],   # building blocks
       ['spruce_planks', 'sand', 'oak_leaves']]


def _armory(on, held):
    """A corner of a base. Three shelves hang on a low stone brick wall. Redstone Dust on top of the
    wall powers the wall blocks, and each powered wall block powers the shelf in front of it. The
    Lever on the wall's right end powers the block it is fixed to, and that block powers the dust."""
    b = Build('Shelf Armory')
    b.fill(-1, -1, -1, 5, -1, 2, 'dark_oak_planks')                      # floor
    # the room wall behind: spruce planks between log posts, one block taller than the dust
    b.fill(0, 0, -1, 4, 2, -1, 'spruce_planks')
    b.fill(0, 3, -1, 4, 3, -1, 'spruce_planks', 'slab')
    for x in (-1, 5):
        b.fill(x, 0, -1, x, 3, -1, 'stripped_spruce_log')
        b.fill(x, 0, 0, x, 2, 0, 'stripped_spruce_log')
        b.set(x, 3, 0, 'lantern', 'lantern')
    # the gadget: a stone brick wall, 5 long and 2 high, dust on top
    b.fill(0, 0, 0, 4, 1, 0, 'stone_bricks')
    for x in range(0, 5):
        b.set(x, 2, 0, 'redstone_dust' if on else 'redstone_dust_off', 'dust')
    for i, x in enumerate((0, 1, 2)):
        if on: b.set(x, 1, 1, 'spruce_shelf', 'rsb_shelf', side='N', show=held[i], chain='LCR'[i])
        else: b.set(x, 1, 1, 'spruce_shelf', 'rsb_shelf', side='N', show=held[i])
    b.set(4, 1, 1, 'lever', 'rsb_lever', side='N', on=on)
    # a rug, a barrel and an anvil
    for x in range(0, 4): b.set(x, 0, 2, 'blue_carpet', 'carpet')
    b.set(-1, 0, 1, 'barrel'); b.set(5, 0, 1, 'anvil', 'anvil')
    return b


def shelf_armory():
    states = [(False, GEAR),    # lever off: three separate shelves full of adventure gear
              (True, GEAR),     # lever on: the three shelves join up
              (True, KIT),      # you use a shelf: all 9 swap with your hotbar
              (True, GEAR)]     # use it again: they swap back
    return [_armory(on, held) for on, held in states]


# ---------------------------------------------------------------- 2. Metro Station Stop
# The end of a metro line, in the same blocks as the Underground Metro Station build.
# x runs along the track. The buffer is at x = 0 (west), the line runs off to the east.
# z = -1 back wall, z = 0 platform, z = 1 platform edge, z = 2 the track. Each stage shows where the
# minecart is, which rail is powered and whether the Copper Bulb is lit.

def _metro(det, lit, go, pressed, cart):
    b = Build('Metro Stop')
    # the track bed: dark oak sleepers and gravel, like the big station
    for x in range(-1, 9):
        b.set(x, -1, 2, 'dark_oak_log', a='z') if x % 2 == 0 else b.set(x, -1, 2, 'gravel')
        b.set(x, -1, 3, 'polished_tuff')
    # the platform: light gray floor, a polished tuff edge with a yellow safety line
    for x in range(-1, 7):
        b.set(x, -1, 0, 'tuff'); b.set(x, -1, 1, 'tuff')
        b.set(x, 0, 0, 'light_gray_concrete')
        b.set(x, 0, 1, 'polished_tuff')
        if x not in (1, 3): b.set(x, 1, 1, 'yellow_carpet', 'carpet')
    # the back wall: tuff bricks, white tiles, a blue line stripe; pillars with copper lanterns
    for x in range(-1, 7):
        b.set(x, -1, -1, 'tuff')
        b.set(x, 0, -1, 'tuff_bricks'); b.set(x, 1, -1, 'tuff_bricks')
        b.set(x, 2, -1, 'white_concrete'); b.set(x, 3, -1, 'blue_concrete'); b.set(x, 4, -1, 'tuff_bricks', 'slab')
    for x in (-1, 6):                                                 # pillars, two blocks deep
        for z in (-1, 0):
            b.set(x, 1, z, 'chiseled_tuff'); b.set(x, 4, z, 'chiseled_tuff')
            for y in (2, 3): b.set(x, y, z, 'polished_tuff')
        b.set(x, 5, 0, 'waxed_copper_lantern', 'lantern')
    b.set(2, 3, 0, 'spruce_planks', 'hanging_sign', side='N')           # the station sign
    for x in (4, 5): b.set(x, 1, 0, 'spruce_planks', 'stairs', f='N')  # a bench to wait on
    b.set(0, 1, 0, 'flower_pot', 'pot', plant='poppy')
    # the gadget
    b.set(0, 0, 2, 'red_concrete')                                     # the buffer at the end of the line
    b.set(3, 0, 1, 'copper_bulb_lit' if lit else 'copper_bulb')        # touching the Detector Rail
    b.set(1, 0, 1, 'smooth_stone')                                     # the button's block, as in the steps
    b.set(1, 1, 1, 'stone_button', 'rsb_button', pressed=pressed)      # on the edge block by the Powered Rail
    track = {1: 'powered_rail_on' if go else 'powered_rail', 3: 'detector_rail_on' if det else 'detector_rail'}
    for x in range(1, 9):                                              # the minecart stands on rail `cart`
        b.set(x, 0, 2, track.get(x, 'rail'), 'rsb_railcart' if x == cart else 'rail', a='x')
    return b


def metro_stop():
    # (detector rail on?, bulb lit?, stop rail on?, button pressed?, minecart at x)
    states = [(False, False, False, False, None),   # waiting: no cart yet
              (True, True, False, False, 3),        # the cart rolls in over the Detector Rail: bulb on
              (False, True, False, False, 1),       # parked on the unpowered Powered Rail; the bulb stays lit
              (False, True, True, True, 2),         # button: the Powered Rail pushes the cart away from the buffer
              (True, False, False, False, 3)]       # the cart rolls back out over the Detector Rail: bulb off
    return [_metro(*s) for s in states]


# ---------------------------------------------------------------- 3. Crafter Auto-Baker
def _bakery(pressed, busy, bread):
    """A little bakery counter. A chest of Wheat sits on a Hopper that feeds the Crafter from the
    side. Only the Crafter's top row is switched on, so the Hopper fills those 3 slots with Wheat.
    The button on its other side makes it craft once: one loaf of Bread pops out of its front."""
    b = Build('Crafter Baker')
    b.fill(-2, -1, -1, 4, -1, 1, 'spruce_planks')                     # wooden floor
    # the back wall: bricks between stripped oak posts, a striped wool awning on top
    b.fill(-1, 0, -1, 3, 2, -1, 'bricks')
    for x in (-2, 4): b.fill(x, 0, -1, x, 3, -1, 'stripped_oak_log')
    for x in range(-1, 4): b.set(x, 3, -1, 'stripped_oak_log', a='x')
    for x in range(-2, 5):
        b.set(x, 3, 0, 'red_wool' if x % 2 == 0 else 'white_wool', 'stairs', f='N')
    # the gadget
    b.set(1, 0, 0, 'crafter_on' if busy else 'crafter', f='S')        # the front faces you
    b.set(0, 0, 0, 'hopper', 'hopper', f='E')                         # pushes Wheat into the Crafter
    b.set(0, 1, 0, 'chest', 'chest')                                  # the Wheat store
    b.set(2, 0, 0, 'stone_button', 'rsb_button', side='W', pressed=pressed)
    if bread: b.set(1, 0, 1, 'hay_block', 'rsb_bread')
    # hay bales, a barrel, a lantern, flowers
    b.set(-1, 0, 0, 'hay_block'); b.set(-1, 1, 0, 'hay_block'); b.set(-2, 0, 0, 'hay_block')
    b.set(3, 0, 0, 'barrel'); b.set(3, 1, 0, 'lantern', 'lantern')
    b.set(4, 0, 0, 'flower_pot', 'pot', plant='poppy')
    return b


def crafter_baker():
    states = [(False, False, False),   # ready: Wheat waiting in the Crafter's top row
              (True, True, False),     # button pressed: the Crafter is crafting
              (False, False, True)]    # a moment later: one loaf of Bread pops out
    return [_bakery(*s) for s in states]


FIGURES = {'shelf-armory': shelf_armory, 'metro-stop': metro_stop, 'crafter-baker': crafter_baker}

META = {
    'shelf-armory': dict(ground=None, time=0.4, view='hero'),
    'metro-stop': dict(ground='stone', time=0.4, view='hero'),
    'crafter-baker': dict(ground='grass_block', time=0.4, view='hero'),
}
