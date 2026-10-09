# Layer by Layer 2: Underground Metro Station (big build) and two minis:
# Camping Tent and Campfire Ring, Dog House with Name Sign.
import random
from lbl import *

# ------------------------------------------------------------------ metro station
# Cutaway diorama. x runs along the track (west end wall at x=0, the east end is cut open).
# z=-1 back wall, z=0..4 platform A, z=5..7 track, z=8 far track wall / Legend platform B edge,
# z=8..10 platform B, z=11 its cut wall. Platforms at y=0, track bed at y=-1, ceiling y=6, street y=7.
# The street only covers the back strip z=-1..3 so the camera can look in from the open south side.

TILE = 'white_concrete'      # wall tiles
WALL = 'tuff_bricks'
TRIM = 'polished_tuff'
FLOOR = 'light_gray_concrete'
COP = 'waxed_cut_copper'     # waxed so the color stays
BENCH = 'spruce_planks'
BARS = 'waxed_copper_bars'
LAMP = 'waxed_copper_lantern'
CEIL, STREET = 6, 7


LINE = 'blue_concrete'       # the metro line's color, a stripe in the tiles (the train is blue too)
STRIPE_Y = 3


def wall_column(b, x, z, top=5, tiles=True):
    """The back wall at one x: tuff brick base, white tiles with a blue line stripe, tuff brick top."""
    for y in range(0, top + 1):
        if tiles and 2 <= y <= 4: b.set(x, y, z, LINE if y == STRIPE_Y else TILE)
        else: b.set(x, y, z, WALL)


def earth(rng, y):
    """One block of the soil around the station: mostly dirt, a bit stonier near the bottom."""
    r = rng.random()
    if y <= 1 and r < 0.30: return 'andesite' if r < 0.15 else 'gravel'
    if r < 0.12: return 'coarse_dirt'
    if r < 0.17: return 'gravel'
    if r < 0.21: return 'andesite'
    return 'dirt'


def pillar(b, x, z=0):
    b.set(x, 1, z, 'chiseled_tuff')
    for y in (2, 3, 4): b.set(x, y, z, TRIM)
    b.set(x, 5, z, 'chiseled_tuff')


def platform_strip(b, x, z0, z1, edge):
    for z in range(z0, z1 + 1): b.set(x, 0, z, TRIM if z == edge else FLOOR)
    b.set(x, 1, edge, 'yellow_carpet', 'carpet')


def track(b, x0, x1, zs=(5, 6, 7), rails=True):
    for x in range(x0, x1 + 1):
        for z in zs:
            if x % 2 == 0: b.set(x, -1, z, 'dark_oak_log', a='z')
            else: b.set(x, -1, z, 'gravel')
        if rails: b.set(x, 0, 6, 'rail', 'rail', a='x')


def street_tree(b, x, y, z, rng, small=False):
    h = 2 if small else 3
    for k in range(h): b.set(x, y + k, z, 'oak_log')
    top = y + h
    for dx in range(-2, 3):
        for dz in range(-2, 3):
            for dy in (-1, 0, 1):
                d = abs(dx) + abs(dz) + (abs(dy) * 1.5 if dy > 0 else abs(dy))
                lim = 2.6 if not small else 1.6
                if dy == -1 and (dx, dz) == (0, 0): continue
                if d <= lim or (d <= lim + 1 and rng.random() < 0.35):
                    p = (x + dx, top + dy, z + dz)
                    if p not in b.c: b.set(*p, 'oak_leaves')
    b.set(x, top, z, 'oak_leaves')


def metro_station():
    b = Build('Underground Metro Station')

    # ================= STARTER: one platform and a track (x 12..24)
    S0, S1 = 12, 24
    for x in range(S0, S1 + 1):
        platform_strip(b, x, 0, 4, 4)
        wall_column(b, x, -1, tiles=(x % 4 != 0))
    for x in (12, 16, 20, 24): pillar(b, x)
    for x in range(S0, S1 + 1):            # cornice, with keystones over the bench bays
        if x % 4: b.set(x, 5, 0, TRIM, 'stairs', f='N', h='top')
    for x in (14, 22):                     # a lantern hangs under each keystone
        b.set(x, 5, 0, 'chiseled_tuff'); b.set(x, 4, 0, LAMP, 'lantern', hang=True)
    for x in range(13, 16): b.set(x, 1, 0, BENCH, 'stairs', f='N')    # benches
    for x in range(21, 24): b.set(x, 1, 0, BENCH, 'stairs', f='N')
    for x in range(17, 20): b.set(x, 3, 0, 'spruce_sign', 'panel', side='N', y0=3, y1=13, t=2, inset=0)   # station name
    b.set(18, 1, 0, 'flower_pot', 'pot', plant='azalea')
    track(b, S0, S1)
    for x in (17, 18, 19): b.set(x, 0, 6, 'powered_rail', 'rail', a='x')   # the stop

    # ================= PRO: the whole station: stairs from the street, ticket booth, ceiling
    with b.tier(2):
        for x in range(1, S0):
            platform_strip(b, x, 0, 4, 4)
            wall_column(b, x, -1, tiles=True)
        # west end wall with a tunnel mouth
        for z in range(-1, 9):
            for y in range(0, CEIL + 1):
                if 5 <= z <= 7 and y <= 3: continue
                tile = 2 <= y <= 4 and z <= 3
                b.set(0, y, z, (LINE if y == STRIPE_Y else TILE) if tile else WALL)
            b.set(0, STREET, z, 'grass_block')
        for z in (4, 8):
            for y in range(0, 5): b.set(0, y, z, TRIM)
        for z in range(4, 9): b.set(0, 4, z, TRIM)
        b.set(0, 3, 5, TRIM, 'stairs', f='N', h='top'); b.set(0, 3, 7, TRIM, 'stairs', f='S', h='top')
        for z in (5, 6, 7):                      # a short dark tunnel behind the arch
            b.set(-1, -1, z, 'gravel')
            for y in range(0, 4): b.set(-2, y, z, 'black_concrete')
            b.set(-1, 4, z, WALL)
        b.set(-1, 0, 6, 'rail', 'rail', a='x')
        for z in (4, 8):
            for y in range(0, 4): b.set(-1, y, z, WALL)
        track(b, 0, S0 - 1)
        # the earth around the station: a soil skin on the back and the west end, so the cut
        # sides look like a slice of ground. The tunnel runs on into the hill.
        rng = random.Random(26)
        for x in range(-1, S1 + 1):
            for y in range(0, CEIL + 1): b.set(x, y, -2, earth(rng, y))
            b.set(x, STREET, -2, 'grass_block')
        for z in range(-1, 9):
            for y in range(0, CEIL + 1):
                if 5 <= z <= 7 and y <= 3: continue      # the tunnel itself
                if (-1, y, z) in b.c: continue
                b.set(-1, y, z, WALL if (z in (4, 8) and y == 4) else earth(rng, y))   # lining corners
            b.set(-1, STREET, z, 'grass_block')
        for z in range(4, 9):                    # the hill over the tunnel end; the tunnel's brick
            for y in range(0, CEIL + 1):         # lining shows where the hill is cut
                if 5 <= z <= 7 and y <= 3: continue
                lining = (z in (4, 8) and y <= 4) or y == 4
                b.set(-2, y, z, WALL if lining else earth(rng, y))
            b.set(-2, STREET, z, 'grass_block')
        # ceiling and street
        for x in range(0, S1 + 1):
            for z in range(-1, 4):
                b.set(x, CEIL, z, TRIM)
                b.set(x, STREET, z, 'grass_block')
        for x in (3, 10, 14, 18, 22): b.set(x, CEIL, 2, 'waxed_copper_bulb_lit')
        # stairs down from the street: top step x=8 (y=7), bottom x=2 (y=1); z=2 is the rail side
        for k in range(1, 8):
            x = k + 1
            for z in (0, 1, 2):
                b.set(x, k, z, FLOOR, 'stairs', f='E')
                if k >= 2: b.set(x, k - 1, z, FLOOR, 'stairs', f='W', h='top')
            b.set(x, k + 1, 2, BARS, 'pane')
        for x in range(5, 8):
            for z in (0, 1, 2): b.set(x, STREET, z, None)
        for x in (5, 6):
            for z in (0, 1, 2): b.set(x, CEIL, z, None)
        for x in range(4, 9):
            b.set(x, STREET + 1, -1, BARS, 'pane'); b.set(x, STREET + 1, 3, BARS, 'pane')
        for z in (0, 1, 2): b.set(4, STREET + 1, z, BARS, 'pane')
        # entrance arch with a sign
        for z in (-1, 3):                        # posts with full copper caps, a lantern on each
            b.set(9, STREET + 1, z, TRIM, 'wall'); b.set(9, STREET + 2, z, TRIM, 'wall')
            b.set(9, STREET + 3, z, COP)
            b.set(9, STREET + 4, z, LAMP, 'lantern')
        for z in (0, 1, 2): b.set(9, STREET + 3, z, COP, 'slab')
        for z in (0, 1, 2): b.set(9, STREET + 2, z, 'dark_oak_planks', 'hanging_sign', a='z')
        # ticket booth x 9..11, z 0..1: copper counter, glass all round, copper awning, sign
        for (x, z) in ((9, 1), (10, 1), (11, 1), (9, 0), (11, 0)):
            b.set(x, 1, z, COP)
            for y in (2, 3): b.set(x, y, z, 'glass', 'pane')
        for x in range(9, 12):
            for z in (0, 1): b.set(x, 4, z, FLOOR, 'slab')
        for x in range(8, 13): b.set(x, 4, 2, COP, 'stairs', f='N')
        b.set(8, 4, 1, COP, 'stairs', f='E'); b.set(8, 4, 0, COP, 'stairs', f='E'); b.set(12, 4, 1, COP, 'stairs', f='W')
        b.set(10, 1, 0, 'dark_oak_planks', 'stairs', f='N')
        b.set(10, 3, 0, LAMP, 'lantern', hang=True)
        b.set(10, 3, 2, 'dark_oak_planks', 'hanging_sign', a='x')
        # chains and lamps under the ceiling
        for x in (13, 19):
            b.set(x, 5, 3, 'chain', 'chain'); b.set(x, 4, 3, LAMP, 'lantern', hang=True)
        # far side wall of the track (the tunnel wall, cut low)
        for x in range(1, S1 + 1):
            b.set(x, 0, 8, TRIM if x % 4 == 0 else WALL)
            if x % 4 == 0: b.set(x, 1, 8, TRIM, 'wall')
        # the park on top: a paved plaza at the entrance, a path at the front, trees and lamps
        for x in range(8, 13):
            for z in range(-1, 4):
                if b.c.get((x, STREET, z), {}).get('b') == 'grass_block': b.set(x, STREET, z, 'polished_andesite')
        for x in range(13, S1 + 1): b.set(x, STREET, 2, 'smooth_stone')
        for x in (14, 22):
            b.set(x, STREET + 1, 3, TRIM, 'wall'); b.set(x, STREET + 2, 3, TRIM, 'wall'); b.set(x, STREET + 3, 3, LAMP, 'lantern')
        street_tree(b, 18, STREET + 1, 0, random.Random(5))
        street_tree(b, 0, STREET + 1, 6, random.Random(9), small=True)
        for x in (12, 13):
            for z in (0, 1): b.set(x, STREET, z, 'waxed_copper_grate'); b.set(x, CEIL, z, None)
        for (x, z, f) in ((1, 1, 'poppy'), (2, 0, 'cornflower'), (23, 0, 'dandelion'), (21, 1, 'oxeye_daisy')):
            b.set(x, STREET + 1, z, f, 'flower')
        b.set(20, STREET + 1, 0, 'bush', 'bush'); b.set(16, STREET + 1, 0, 'spruce_planks', 'stairs', f='N')
        b.set(15, STREET + 1, 0, 'spruce_planks', 'stairs', f='N')

    # ================= LEGEND: a second platform and a train
    with b.tier(3):
        for x in range(1, S1 + 1):
            platform_strip(b, x, 8, 10, 8)
            b.set(x, 0, 11, TRIM if x % 4 == 0 else WALL)
            if x % 4 == 0: b.set(x, 1, 11, 'chiseled_tuff')
            else: b.set(x, 1, 11, WALL, 'slab')
        for z in (9, 10, 11):
            for y in range(0, CEIL + 1): b.set(0, y, z, WALL)
            b.set(0, STREET, z, 'grass_block')
        rng = random.Random(27)                  # the soil skin goes on round the new corner
        for z in (9, 10, 11):
            for y in range(0, CEIL + 1): b.set(-1, y, z, earth(rng, y))
            b.set(-1, STREET, z, 'grass_block')
        for x0 in (5, 13, 21):
            for x in (x0, x0 + 1): b.set(x, 1, 10, BENCH, 'stairs', f='S')
        for x in (9, 17):
            for y in (1, 2, 3): b.set(x, y, 10, TRIM, 'wall')
            b.set(x, 4, 10, LAMP, 'lantern')
        # signal light by the tunnel
        b.set(1, 1, 8, TRIM, 'wall'); b.set(1, 2, 8, 'redstone_torch', 'torch')
        # train car x 12..21 on the track
        T0, T1 = 12, 21
        for x in range(T0, T1 + 1):
            for z in (5, 7): b.set(x, 0, z, 'polished_deepslate', 'slab', h='top')
            b.set(x, 1, 6, 'white_concrete')
            for z in (5, 7):
                b.set(x, 1, z, 'blue_concrete')
                for y in (2, 3): b.set(x, y, z, 'glass', 'pane')
                b.set(x, 4, z, 'white_concrete', 'stairs', f='S' if z == 5 else 'N')
            b.set(x, 4, 6, 'white_concrete')          # a full block, so the roof is round on top
        for x in range(14, 20): b.set(x, 5, 6, 'light_gray_concrete', 'slab')   # roof unit
        for x in (T0, T1):
            for z in (5, 6, 7):
                b.set(x, 2, z, 'white_concrete'); b.set(x, 3, z, 'black_stained_glass')   # wide cab window
            b.set(x, 4, 5, 'white_concrete', 'stairs', f='S'); b.set(x, 4, 7, 'white_concrete', 'stairs', f='N')
            b.set(x, 4, 6, 'white_concrete', 'stairs', f='E' if x == T0 else 'W')
            b.set(x, 1, 5, 'waxed_copper_bulb_lit'); b.set(x, 1, 7, 'waxed_copper_bulb_lit')
        for x in (15, 18):
            for z in (5, 7):
                door(b, x, 2, z, 'iron_door', 'S' if z == 7 else 'N')
        for x in (13, 14, 19, 20): b.set(x, 2, 6, 'blue_wool', 'cushion')     # seats inside
    return b


# ------------------------------------------------------------------ mini tent
def mini_tent():
    """A wool stairs tent (x 1..5, z 0..3, door on the south) and a stone ring round a campfire."""
    b = Build('Camping Tent and Campfire Ring')
    C, T = 'orange_wool', 'white_wool'
    for z in range(0, 4):
        m = T if z == 3 else C                           # white seam round the door
        b.set(1, 0, z, m, 'stairs', f='E'); b.set(5, 0, z, m, 'stairs', f='W')
        b.set(2, 1, z, m, 'stairs', f='E'); b.set(4, 1, z, m, 'stairs', f='W')
        b.set(3, 2, z, T, 'slab')
    for x in (2, 3, 4): b.set(x, 0, 0, C)               # back wall of the tent
    b.set(3, 1, 0, C)
    # inside: two straw beds and a lantern
    for x in (2, 4):
        b.set(x, 0, 1, 'straw_bed', 'straw_bed', part='head', f='N'); b.set(x, 0, 2, 'straw_bed', 'straw_bed', part='foot', f='N')
    b.set(3, 1, 2, 'lantern', 'lantern', hang=True)
    # a front fly on two poles: the door flap held up like a porch. You walk in under the slab.
    b.set(2, 0, 4, 'spruce_planks', 'fence'); b.set(4, 0, 4, 'spruce_planks', 'fence')
    b.set(2, 1, 4, C, 'stairs', f='E'); b.set(4, 1, 4, C, 'stairs', f='W')
    b.set(3, 2, 4, T, 'slab')
    # campfire ring
    FX, FZ = 3, 6
    b.set(FX, 0, FZ, 'campfire', 'campfire')
    ring = [(-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0)]
    for i, (dx, dz) in enumerate(ring):
        b.set(FX + dx, 0, FZ + dz, 'mossy_cobblestone' if i % 3 == 1 else 'cobblestone', 'slab')
    # log seats with cushions
    for x in (0, 6):
        b.set(x, 0, FZ, 'stripped_spruce_log', a='z'); b.set(x, 0, FZ + 1, 'stripped_spruce_log', a='z')
    b.set(0, 1, FZ, 'red_wool', 'cushion'); b.set(0, 1, FZ + 1, 'yellow_wool', 'cushion')
    b.set(6, 1, FZ, 'light_blue_wool', 'cushion'); b.set(6, 1, FZ + 1, 'lime_wool', 'cushion')
    # camp things
    b.set(6, 0, 3, 'barrel'); b.set(6, 1, 3, 'lantern', 'lantern')
    b.set(0, 0, 2, 'firefly_bush', 'plant')
    b.set(6, 0, 1, 'red_shrub', 'plant')
    for (x, z) in ((1, 4), (5, 4), (0, 4)): b.set(x, 0, z, 'leaf_litter', 'plant')
    # worn ground where campers walk and sit
    for (x, z) in ((1, 6), (1, 7), (5, 6), (5, 7)): b.set(x, -1, z, 'coarse_dirt')
    b.set(3, -1, 4, 'dirt_path')
    return b


# ------------------------------------------------------------------ mini dog house
DOG_SPOT = (2, 0, 1, 3, 1, 2)       # x, y, z, w, h, d: the dog's nap spot inside, left empty


def mini_dog_house():
    """A spruce dog house with a soft wool roof, a name sign over the door, a bed inside and a water bowl."""
    b = Build('Dog House with Name Sign')
    W, LOG, R, RIDGE = 'spruce_planks', 'stripped_spruce_log', 'red_wool', 'white_wool'
    X0, X1, Z0, Z1 = 1, 5, 0, 3
    for y in (0, 1):
        for x in range(X0, X1 + 1):
            for z in range(Z0, Z1 + 1):
                if x in (X0, X1) or z in (Z0, Z1):
                    b.set(x, y, z, LOG if (x in (X0, X1) and z in (Z0, Z1)) else W)
    for x in (2, 3, 4): b.set(x, 0, Z1, None)                            # a round-topped door
    b.set(3, 1, Z1, None)
    b.set(2, 1, Z1, W, 'stairs', f='W', h='top'); b.set(4, 1, Z1, W, 'stairs', f='E', h='top')
    # gable ends and the soft wool roof: a shady porch at the front, and low eaves on the sides.
    # The eaves are top slabs, so they flare out and the plank walls still show under them.
    for z in (Z0, Z1):
        for x in (2, 3, 4): b.set(x, 2, z, W)
        b.set(3, 3, z, W)
    for z in range(Z0 - 1, Z1 + 2):
        b.set(X0 - 1, 1, z, R, 'slab', h='top'); b.set(X1 + 1, 1, z, R, 'slab', h='top')
        b.set(X0, 2, z, R, 'stairs', f='E'); b.set(X1, 2, z, R, 'stairs', f='W')
        b.set(X0 + 1, 3, z, R, 'stairs', f='E'); b.set(X1 - 1, 3, z, R, 'stairs', f='W')
        b.set(3, 4, z, RIDGE, 'slab')
    b.set(3, 2, Z1 + 1, 'oak_planks', 'hanging_sign', side='N')        # the name sign, fixed to the gable
    # inside: a soft bed. The dog's spot above it stays empty.
    for x in (2, 3, 4):
        for z in (1, 2): b.set(x, 0, z, 'red_carpet', 'carpet')
    # yard: path, water bowl (a Cauldron, filled with a Water Bucket in game), flowers
    for z in (4, 5, 6): b.set(3, -1, z, 'dirt_path')
    b.set(5, 0, 5, 'cauldron', 'cauldron')
    b.set(0, 0, 1, 'bush', 'bush'); b.set(6, 0, 2, 'cornflower', 'flower'); b.set(6, 0, 0, 'poppy', 'flower')
    b.set(1, 0, 5, 'oxeye_daisy', 'flower'); b.set(0, 0, 3, 'dandelion', 'flower'); b.set(6, 0, 6, 'poppy', 'flower')
    return b


BUILDS = {'metro-station': metro_station, 'mini-tent': mini_tent, 'mini-dog-house': mini_dog_house}

CHANGELOG = 'https://www.minecraft.net/en-us/article/minecraft--bedrock-edition-26-50-changelog'

META = {
    'metro-station': dict(
        title='Underground Metro Station', kind='big', diff=2, mode='Creative',
        pitch='A subway stop under a park, with a train and ticket booth.',
        blurb=('Go underground! This station is built like a cutaway model, so you can see inside. '
               'Walk down the stairs from the park and pass the ticket booth. '
               'Then wait on the platform for your train.'),
        tiers=['Starter: a platform with benches, lamps, a name sign and a track.',
               'Pro: the whole station under a little park, with stairs, a ticket booth and a tunnel.',
               'Legend: a second platform across the track and a train car made of blocks.'],
        teaches=['Building a cutaway', 'Stairs with a sloped underside', 'Depth with pillars and tiles',
                 'Rails with a stop'],
        tips=[('know', 'Concrete stairs are new',
               'Concrete Stairs and Concrete Slabs came in Wilderness Bound, game version 26.50. '
               'They come in all 16 colors. The steps down to this platform are Light Gray Concrete Stairs.'),
              ('pro', 'A rail that brakes',
               'A Powered Rail with no power works like a brake. Your minecart slows down and stops. '
               'Power it with a Lever or Redstone Torch next to it, and it speeds carts up.'),
              ('pro', 'Lights that remember',
               'A Copper Bulb turns on or off each time it gets a redstone pulse. '
               'It does not need power to stay lit, so one press of a button is enough.'),
              ('pro', 'Keep the copper shiny',
               'Copper slowly turns green. Use Honeycomb on it to wax it and keep its color. '
               'In Creative, you can pick the Waxed blocks right away.')],
        challenge=('Make it yours: Write your station name on the sign. Then dig the tunnel longer '
                   'and build a second station for your minecart to visit.'),
        dad="Dad's Corner: How many steps go down from the street to the platform? Count them together, then check the layer plan.",
        needs='26.50',
        new_blocks=['Light Gray Concrete Stairs', 'Light Gray Concrete Slab', 'White Concrete Stairs',
                    'Waxed Copper Bars', 'Waxed Copper Lantern', 'Blue Cushion', 'Bush'],
        palette=['Tuff Bricks', 'Polished Tuff', 'White Concrete', 'Light Gray Concrete', 'Waxed Cut Copper'],
        time=0.7, ground='grass_block', order=8,
        sources=[CHANGELOG,
                 'https://minecraft.wiki/w/Bedrock_Edition_26.50',
                 'https://minecraft.wiki/w/Powered_Rail',
                 'https://minecraft.wiki/w/Lever',
                 'https://minecraft.wiki/w/Copper_Bulb',
                 'https://minecraft.wiki/w/Oxidation',
                 'https://minecraft.wiki/w/Honeycomb',
                 'https://minecraft.wiki/w/Creative_inventory'],
    ),
    'mini-tent': dict(
        title='Camping Tent and Campfire Ring', kind='mini', diff=1, mode='Survival',
        pitch='A soft wool tent and a cozy ring around the campfire.',
        blurb=('Camp out under the stars! The tent sides are Wool Stairs, so they slope like real cloth. '
               'Sleep on Straw Beds, then sit on cushions by the fire.'),
        teaches=['Sloped walls with Wool Stairs', 'Seats with cushions'],
        tips=[('warn', 'Straw beds get used up',
               'A Straw Bed lets you sleep through the night. It does not change your spawn point. '
               'It breaks after you use it once.'),
              ('know', 'Four beds from three bales',
               'Craft 3 Hay Bales together and you get 4 Straw Beds.'),
              ('pro', 'Cushions need something under them',
               'Cushions are made from Wool Slabs. A cushion breaks if the block under it is removed. '
               'Put it on a log, a slab or a stair.'),
              ('warn', 'Mind the fire',
               'A lit Campfire hurts you if you stand on it. Use a shovel on it to put it out.')],
        challenge='Make it yours: Build a second tent in another color. Then hang lanterns on fence posts around the camp.',
        dad="Dad's Corner: Plan a camp-out night in the game. Who will collect the Hay Bales for the Straw Beds?",
        needs='26.50',
        new_blocks=['Orange Wool Stairs', 'White Wool Stairs', 'White Wool Slab', 'Straw Bed', 'Red Cushion',
                    'Yellow Cushion', 'Light Blue Cushion', 'Lime Cushion', 'Red Shrub', 'Firefly Bush',
                    'Leaf Litter'],
        palette=['Orange Wool Stairs', 'White Wool Stairs', 'Cobblestone Slab', 'Stripped Spruce Log'],
        time=0.8, ground='grass_block', order=1,
        sources=[CHANGELOG,
                 'https://minecraft.wiki/w/Bedrock_Edition_26.50',
                 'https://minecraft.wiki/w/Straw_Bed',
                 'https://minecraft.wiki/w/Cushion',
                 'https://minecraft.wiki/w/Campfire'],
    ),
    'mini-dog-house': dict(
        title='Dog House with Name Sign', kind='mini', diff=1, mode='Survival',
        pitch="A cozy home for your dog, with its name over the door.",
        blurb=('Every good dog needs a house. It has a soft wool roof, a red carpet bed '
               'and a water bowl by the door. Fill the Cauldron with a Water Bucket. '
               'Write your dog\'s name on the hanging sign.'),
        teaches=['A round-topped door', 'Soft roofs with Wool Stairs'],
        tips=[('know', 'Make your own name tag',
               'You can now craft a Name Tag from Paper and a nugget. Rename it on an Anvil, '
               'then use it on your dog so it matches the sign.'),
              ('pro', 'Make the name glow',
               'Use a Glow Ink Sac on the hanging sign. The name will glow, even at night.'),
              ('pro', 'Sit, good dog!',
               'Use your tamed wolf to make it sit. It stays in its house and does not follow you '
               'until you use it again.')],
        challenge="Make it yours: Change the roof to your dog's favorite color. Or build a bigger house for two dogs.",
        dad="Dad's Corner: Help choose a name for the sign. What would you call a Minecraft dog?",
        needs='26.50',
        new_blocks=['Red Wool Stairs', 'Red Wool Slab', 'White Wool Slab', 'Bush'],
        palette=['Spruce Planks', 'Stripped Spruce Log', 'Red Wool Stairs', 'White Wool Slab'],
        time=0.4, ground='grass_block', order=2,
        empty=[DOG_SPOT + ('Dog nap spot',)],
        sources=['https://minecraft.wiki/w/Name_Tag',
                 'https://www.minecraft.net/en-us/updates/tiny-takeover-drop',
                 'https://minecraft.wiki/w/Hanging_Sign',
                 'https://minecraft.wiki/w/Wolf',
                 'https://minecraft.wiki/w/Cauldron'],
    ),
}
