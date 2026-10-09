# Redstone Workshop, part A: copper trumpet doorbell, copper bulb switch, hidden 2x2 piston door.
# Each figure is a list of frames, one per state of the gadget (frame 1 = resting).
# Words: tools/lbl/content/redstone/<id>.json. x runs east, z runs south (toward the camera), y is up.
# Every circuit here is wired the way it works in Bedrock (checked on minecraft.wiki, October 2026).
from lbl import *
try:
    from . import redstone_b as _rsb   # registers the rsb_lever and rsb_button shapes used here
except ImportError:
    pass


def _dust(b, cells, on):
    for (x, y, z) in cells:
        b.set(x, y, z, 'redstone_dust' if on else 'redstone_dust_off', 'dust')


# ---------------------------------------------------------------- 1. copper trumpet doorbell
# (block under the note block, button pressed) for: waiting, first press, the copper has aged, fully green
DOORBELL_STAGES = [('copper_block', False), ('copper_block', True), ('weathered_copper', True), ('oxidized_copper', True)]
COTTAGE_WALL = 'white_terracotta'


def _doorbell(copper, on):
    b = Build('Copper Trumpet Doorbell')
    # a tiny cottage: spruce log corners, white walls on a stone brick base, the gable facing you.
    # The walls are 3 blocks tall, so the eave stays above the button and the default camera sees it.
    for x in (0, 3):
        for z in (-2, 0):
            b.fill(x, 0, z, x, 2, z, 'spruce_log', a='y')
    for (x0, z0, x1, z1) in ((1, 0, 2, 0), (1, -2, 2, -2), (0, -1, 0, -1), (3, -1, 3, -1)):
        b.fill(x0, 0, z0, x1, 0, z1, 'stone_bricks'); b.fill(x0, 1, z0, x1, 2, z1, COTTAGE_WALL)
    door(b, 2, 0, 0, 'spruce_door', 'S')                     # the door sits right next to the bell post
    for (x, z) in ((1, 0), (3, -1), (0, -1), (1, -2), (2, -2)): b.set(x, 1, z, 'glass', 'pane')
    gable(b, 0, 3, -2, 0, 3, 'spruce_planks', o=1, gable_mat=COTTAGE_WALL, axis='z')
    # the doorbell: a button on the corner post, wire along a low wall, a note block on copper
    b.set(3, 1, 1, 'stone_button', 'rsb_button', side='N', pressed=on)   # sits lower while pressed
    for x in (4, 5, 6): b.set(x, 0, 0, 'stone_bricks')
    _dust(b, [(4, 1, 0), (5, 1, 0), (6, 1, 0)], on)
    b.set(7, 0, 0, copper)
    b.set(7, 1, 0, 'note_block')                              # nothing above it, or it cannot play
    # garden: a path to the door, flowers in front of the low wall, a bush by the house
    for z in (1, 2): b.set(2, -1, z, 'dirt_path')
    b.set(5, 0, 1, 'golden_dandelion', 'flower'); b.set(6, 0, 1, 'cornflower', 'flower'); b.set(4, 0, 1, 'short_grass', 'tuft')
    b.set(1, 0, 1, 'poppy', 'flower'); b.set(0, 0, 1, 'flowering_azalea', 'plant')
    b.set(7, 0, 1, 'short_grass', 'tuft'); b.set(-1, 0, -2, 'oxeye_daisy', 'flower')
    return b


def copper_doorbell():
    return [_doorbell(c, on) for c, on in DOORBELL_STAGES]


# ---------------------------------------------------------------- 2. copper bulb light switch
# (dust powered, bulb lit) for: resting, first press, button back out, second press
BULB_STAGES = [(False, False), (True, True), (False, True), (True, False)]


def _bulb_switch(on, lit):
    b = Build('Copper Bulb Light Switch')
    # the switch: a dark post, so the grey button stands out
    b.set(0, 0, 0, 'polished_deepslate'); b.set(0, 1, 0, 'polished_deepslate'); b.set(0, 2, 0, 'polished_deepslate', 'slab')
    b.set(0, 1, 1, 'stone_button', 'rsb_button', side='N', pressed=on)   # sits lower while pressed
    # the wire: dust on a low wall
    for x in (1, 2, 3): b.set(x, 0, 0, 'tuff_bricks')
    _dust(b, [(1, 1, 0), (2, 1, 0), (3, 1, 0)], on)
    # the lamp: a copper bulb on a tuff brick post, with a copper trapdoor for a cap
    b.set(4, 0, 0, 'tuff_bricks', 'wall')
    b.set(4, 1, 0, 'copper_bulb_lit' if lit else 'copper_bulb')
    b.set(4, 2, 0, 'copper_trapdoor', 'trapdoor', h='bottom')
    # a hedge behind (the glow shows up against the leaves) and flowers in front
    for x in range(-1, 6): b.set(x, 0, -1, 'oak_leaves')
    for x in (-1, 1, 2, 3, 5): b.set(x, 1, -1, 'oak_leaves')
    b.set(2, 0, 1, 'poppy', 'flower'); b.set(3, 0, 1, 'oxeye_daisy', 'flower'); b.set(1, 0, 1, 'short_grass', 'tuft')
    b.set(5, 0, 0, 'flowering_azalea', 'bush'); b.set(-1, 0, 0, 'azalea', 'bush')
    return b


def copper_bulb_switch():
    return [_bulb_switch(on, lit) for on, lit in BULB_STAGES]


# ---------------------------------------------------------------- 3. hidden 2x2 piston door
# You look at it from inside the secret base (south). z = 0 holds the pistons and the door,
# z = -1 is the wiring, z = -2 is the bookcase everyone else sees from outside.
WALL = 'polished_deepslate'


def _piston_door(open_):
    b = Build('Hidden Piston Door')
    on = not open_                     # the torch powers the pistons while the lever is off
    # piston layer: two sticky pistons on each side of the 2 x 2 doorway
    b.fill(-1, 0, 0, -1, 2, 0, WALL); b.set(-1, 3, 0, 'lantern', 'lantern'); b.set(6, 0, 0, WALL)
    for y in (0, 1):
        if open_:
            b.set(0, y, 0, 'sticky_piston', f='E'); b.set(5, y, 0, 'sticky_piston', f='W')
            b.set(1, y, 0, 'bookshelf'); b.set(4, y, 0, 'bookshelf')
        else:
            b.set(0, y, 0, 'sticky_piston', 'piston_base', f='E'); b.set(1, y, 0, 'sticky_piston', 'piston_head', f='E')
            b.set(5, y, 0, 'sticky_piston', 'piston_base', f='W'); b.set(4, y, 0, 'sticky_piston', 'piston_head', f='W')
            b.set(2, y, 0, 'bookshelf'); b.set(3, y, 0, 'bookshelf')
    # the right end: a lever on a block with a redstone torch on top (it flips the signal),
    # and one dust that feeds both right pistons
    b.set(7, 0, 0, WALL); b.set(7, 1, 0, 'redstone_torch' if on else 'redstone_torch_off', 'torch')
    b.set(7, 0, 1, 'lever', 'rsb_lever', side='N', on=open_)   # handle up = off, down = on (shape from redstone_b)
    _dust(b, [(6, 1, 0)], on)
    # wiring behind: one line of dust on blocks, stepping up and over the tunnel to the left pistons
    for (x, y) in ((0, 0), (1, 0), (1, 1), (2, 2), (3, 2), (4, 0), (4, 1), (5, 0), (6, 0)):
        b.set(x, y, -1, 'tuff_bricks', rs=(x, y) in ((1, 1), (2, 2), (3, 2), (4, 1)))   # rs: dust climbs onto it
    _dust(b, [(0, 1, -1), (1, 2, -1), (2, 3, -1), (3, 3, -1), (4, 2, -1), (5, 1, -1), (6, 1, -1)], on)
    # the outside: a bookcase taller than the wiring, so nobody sees the dust from the other side
    for x in (-1, 7): b.fill(x, 0, -2, x, 3, -2, 'spruce_log', a='y')
    b.fill(0, 0, -2, 6, 2, -2, 'bookshelf'); b.clear(2, 0, -2, 3, 1, -2)
    b.fill(0, 3, -2, 6, 3, -2, 'spruce_planks', 'slab', h='bottom')
    # base floor, running through the doorway
    b.fill(-1, -1, 1, 7, -1, 2, 'polished_deepslate')
    b.fill(2, -1, -2, 3, -1, 0, 'polished_deepslate')
    return b


def piston_door():
    return [_piston_door(False), _piston_door(True)]


FIGURES = {
    'copper-doorbell': copper_doorbell,
    'copper-bulb-switch': copper_bulb_switch,
    'piston-door': piston_door,
}

META = {
    'copper-doorbell': dict(ground='grass_block', time=0.42, view='hero'),
    'copper-bulb-switch': dict(ground='grass_block', time=0.8, view='hero'),
    'piston-door': dict(ground='stone', time=0.42, view='hero'),
}
