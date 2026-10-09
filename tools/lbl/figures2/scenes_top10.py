# Top 10 scenes: one small 3D diorama for each item in data/content/top10.json ("scene": "t10-<id>").
# One frame each. No mobs, no people, no logos: where an animal would be, the space is left empty and
# marked with an 'empty' box in META. x runs east, z runs south (toward the camera), y is up.
# Tall things go at the back (low x, low z) so they never hide the scene from the default camera.
# Every scene starts at x = 0, z = 0, so META 'empty' boxes use the same numbers as the b.set calls.
import random
from lbl import *


# ---------------------------------------------------------------- small helpers
def lay(b, W, D, key='grass_block'):
    """The scene's own ground layer (y = -1), so the picture matches the book's ground."""
    b.fill(0, -1, 0, W, -1, D, key)


def clip(b, W, D):
    """Drop anything a canopy pushed outside the scene's footprint."""
    for p in [p for p in b.c if not (0 <= p[0] <= W and 0 <= p[2] <= D)]: del b.c[p]


def put(b, x, y, z, key, shape='full', **st):
    """Set a block only where the cell is still empty."""
    if (x, y, z) not in b.c: b.set(x, y, z, key, shape, **st)


SMALL_FLOWERS = ('poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy')


def dress(b, rng, W, D, n, keys=('short_grass',), on=('grass_block',)):
    """Scatter grass tufts and small flowers on open ground."""
    cells = [(x, z) for x in range(W + 1) for z in range(D + 1)]
    rng.shuffle(cells); k = 0
    for (x, z) in cells:
        if k >= n: break
        if (x, 0, z) in b.c: continue
        under = b.c.get((x, -1, z))
        if not under or under['b'] not in on or under['s'] != 'full': continue
        key = keys[k % len(keys)]
        shape = 'tuft' if key == 'short_grass' else ('flower' if key in SMALL_FLOWERS else 'plant')
        b.set(x, 0, z, key, shape); k += 1


def crown(b, cx, y, cz, layers, key, rng, drop=0.35):
    """Leaf layers (dy, radius) around a trunk top. Rim leaves drop out at random, so the outline is soft."""
    for dy, r in layers:
        for dx, dz in sorted(disc(r)):
            if dx * dx + dz * dz > (r - 1) ** 2 and rng.random() < drop: continue
            put(b, cx + dx, y + dy, cz + dz, key)


def oak(b, x, z, h, rng, log='oak_log', key='oak_leaves', r=2.6):
    """A round oak: a trunk h tall and a soft ball of leaves from h - 2 to h + 2."""
    for y in range(h + 1): b.set(x, y, z, log, a='y')
    crown(b, x, h - 2, z, [(0, r - 0.7), (1, r), (2, r - 0.1), (3, r - 1.1), (4, 0.9)], key, rng)


def cherry(b, x, z, rng, spread=1, r=(2.3, 2.5)):
    """A cherry tree: the trunk forks into two branches, each with a wide, flat pink crown that droops at the rim."""
    for y in range(3): b.set(x, y, z, 'cherry_log', a='y')
    b.set(x - 1, 3, z, 'cherry_log', a='x'); b.set(x + 1, 3, z, 'cherry_log', a='x')
    b.set(x - spread, 4, z, 'cherry_log', a='y'); b.set(x + spread, 4, z, 'cherry_log', a='y'); b.set(x + spread, 5, z, 'cherry_log', a='y')
    for (cx, cy, cz, rr0) in ((x - spread, 5, z, r[0]), (x + spread, 6, z, r[1])):
        for dy, rr in ((0, rr0), (1, rr0 - 0.6), (2, rr0 - 1.6)):
            for dx, dz in sorted(disc(rr)):
                rim = dx * dx + dz * dz > (rr - 1) ** 2
                if rim and dy > 0 and rng.random() < 0.4: continue
                put(b, cx + dx, cy + dy, cz + dz, 'cherry_leaves')
                if dy == 0 and rim and rng.random() < 0.5: put(b, cx + dx, cy - 1, cz + dz, 'cherry_leaves')


def spruce(b, x, z, h, rng):
    """A spruce: a tall trunk and leaf skirts that get smaller toward a pointed top."""
    for y in range(h): b.set(x, y, z, 'spruce_log', a='y')
    y, r = 2, 2.6
    while y < h:
        crown(b, x, y, z, [(0, max(1.0, r)), (1, max(1.0, r - 1.2))], 'spruce_leaves', rng, drop=0.2)
        y += 2; r -= 0.6
    for yy in (h, h + 1): b.set(x, yy, z, 'spruce_leaves')


# ================================================================ 10. Plant a Firefly Garden
def _fireflies(build, p, v):
    """Fireflies (particles in the game, not blocks or mobs): a few tiny glowing dots drifting in the
    air above a Firefly Bush. The cell's block is a lit candle only so the dots glow softly (light 3,
    close to the bush's own light 2); they are named Fireflies."""
    import textures as _tx
    if 't10_firefly' not in SPECIAL: SPECIAL['t10_firefly'] = _tx.solid('#f2f58a')
    rng = random.Random('%d,%d,%d' % p)
    out = []
    for _ in range(v.get('n', 4)):
        x, y, z = rng.uniform(2, 13), rng.uniform(1, 14), rng.uniform(2, 13)
        out.append((u16(x, y, z, x + 1.5, y + 1.5, z + 1.5), 't10_firefly'))
    return out, ['n', v.get('n', 4)]


EXTRA_SHAPES['t10_fireflies'] = _fireflies
EXTRA_ITEMS['t10_fireflies'] = lambda v: 'Fireflies'


def firefly_garden():
    """A pond at night. Firefly bushes crowd the far banks; the only lantern stands well away from them."""
    b = Build('Firefly Garden'); rng = random.Random(10)
    W, D = 8, 8
    lay(b, W, D)
    rows = {3: (4, 6), 4: (3, 6), 5: (3, 7), 6: (4, 7), 7: (5, 6)}
    pond = {(x, z) for z, (a, c) in rows.items() for x in range(a, c + 1)}
    for (x, z) in pond:
        b.set(x, -1, z, 'water'); b.set(x, -2, z, 'water'); b.set(x, -3, z, 'dirt')
    edge = {(x + dx, z + dz) for (x, z) in pond for dx in (-1, 0, 1) for dz in (-1, 0, 1)} - pond
    for (x, z) in sorted(edge):
        b.set(x, -1, z, rng.choice(('moss_block', 'moss_block', 'coarse_dirt', 'podzol')))
    # an old oak on the back corner, with leaf litter under it
    oak(b, 1, 1, 5, rng, r=2.6)
    for (x, z) in [(0, 3), (2, 3), (3, 1), (1, 4), (3, 0)]: put(b, x, 0, z, 'leaf_litter', 'carpet')
    # firefly bushes in a crescent round the back and west banks
    for (x, z) in [(4, 2), (5, 2), (6, 2), (7, 3), (3, 3), (2, 4), (2, 5), (3, 6), (3, 7)]:
        b.set(x, 0, z, 'firefly_bush', 'plant')
        b.set(x, 1, z, 'yellow_candle_lit', 't10_fireflies', n=4)        # fireflies drift up from each bush
        if (x + z) % 3 == 0: b.set(x, 2, z, 'yellow_candle_lit', 't10_fireflies', n=2)
    # sugar cane on the east bank
    for (x, z, h) in [(8, 4, 3), (8, 3, 2), (8, 5, 2)]:
        for y in range(h): b.set(x, y, z, 'sugar_cane', 'plant')
    # mossy boulders in the far corner
    for (x, y, z, k, sh) in [(7, 0, 0, 'mossy_cobblestone', 'full'), (8, 0, 0, 'mossy_cobblestone', 'full'),
                             (8, 1, 0, 'mossy_cobblestone', 'slab'), (8, 0, 1, 'cobblestone', 'full'),
                             (7, 0, 1, 'mossy_cobblestone', 'slab'), (8, 0, 2, 'cobblestone', 'slab')]:
        b.set(x, y, z, k, sh)
    # a log bench on the near bank, to watch from
    b.set(5, 0, 8, 'oak_log', a='x'); b.set(6, 0, 8, 'oak_log', a='x')
    b.set(4, -1, 8, 'dirt_path')
    # the lantern post: the front-left corner, far from every bush (fireflies need the dark)
    b.set(0, 0, 8, 'mossy_cobblestone', 'wall'); b.set(0, 1, 8, 'oak_planks', 'fence'); b.set(0, 2, 8, 'oak_planks', 'fence')
    b.set(0, 3, 8, 'lantern', 'lantern')
    clip(b, W, D)
    dress(b, rng, W, D, 10, ('short_grass', 'cornflower', 'short_grass', 'oxeye_daisy', 'short_grass'), on=('grass_block', 'moss_block'))
    return [b]


# ================================================================ 9. Golden-Hour Photo Tour
def golden_hour():
    """A cherry cottage at sunset: copper roof, shutters, a little pool and a cherry tree to photograph."""
    b = Build('Golden Hour'); rng = random.Random(9)
    W, D = 13, 9
    lay(b, W, D)
    x0, z0, x1, z1 = 1, 1, 5, 7
    b.walls(x0, z0, x1, z1, 0, 0, 'stone_bricks')
    b.walls(x0, z0, x1, z1, 1, 3, 'cherry_planks')
    for (x, z) in ((x0, z0), (x1, z0), (x0, z1), (x1, z1)):
        b.fill(x, 0, z, x, 3, z, 'stripped_cherry_log', a='y')
    b.fill(x0 + 1, 0, z0 + 1, x1 - 1, 0, z1 - 1, 'cherry_planks')
    # front: a door between two tall windows, a copper hood over the door, a step up
    door(b, 3, 1, z1, 'cherry_door', 'S')
    for x in (2, 4):
        for y in (1, 2): b.set(x, y, z1, 'glass', 'pane')
    for x in (2, 3, 4): b.set(x, 3, z1 + 1, 'cut_copper', 'stairs', f='N')
    b.set(3, 0, z1 + 1, 'stone_bricks', 'stairs', f='N')
    b.set(4, 2, z1 + 1, 'lantern', 'lantern', hang=True)
    # east side faces the pool: a wide window with cherry shutters
    for z in (3, 4, 5):
        for y in (1, 2): b.set(x1, y, z, 'glass', 'pane')
    for z in (2, 6):
        for y in (1, 2): b.set(x1 + 1, y, z, 'cherry_trapdoor', 'trapdoor', open=True, side='W')
    for z in (3, 4, 5): b.set(x1 + 1, 3, z, 'cut_copper', 'stairs', f='W')
    # back and west windows, so the far sides are not blank
    for (x, z) in ((x0, 4), (3, z0)):
        for y in (1, 2): b.set(x, y, z, 'glass', 'pane')
    # a log band where the walls meet the gable, then the copper roof
    for z in range(z0 + 1, z1): b.set(x0, 4, z, 'stripped_cherry_log', a='z'); b.set(x1, 4, z, 'stripped_cherry_log', a='z')
    gable(b, x0, x1, z0, z1, 4, 'cut_copper', o=1, gable_mat='cherry_planks', axis='z', ridge='full')
    for z in (z0, z1): b.set(3, 5, z, 'glass', 'pane')
    b.set(3, 8, z1, 'lightning_rod', 'rod')
    # a stone chimney on the back slope
    b.fill(2, 4, 2, 2, 7, 2, 'stone_bricks'); b.set(2, 8, 2, 'stone_bricks', 'slab')
    # a 3 x 3 pool in a smooth stone rim
    px0, pz0 = 9, 5
    for x in range(px0 - 1, px0 + 4):
        for z in range(pz0 - 1, pz0 + 4):
            if px0 <= x <= px0 + 2 and pz0 <= z <= pz0 + 2:
                b.set(x, -1, z, 'water'); b.set(x, -2, z, 'water'); b.set(x, -3, z, 'sand')
            else:
                b.set(x, -1, z, 'smooth_stone'); b.set(x, 0, z, 'smooth_stone', 'slab')
    # a cherry tree behind the pool, pink petals under it
    cherry(b, 10, 2, rng)
    for (x, z) in [(9, 1), (11, 3), (12, 2), (8, 2), (13, 1), (8, 3), (12, 0), (7, 1), (13, 3), (9, 3), (7, 4)]:
        put(b, x, 0, z, 'pink_petals', 'carpet')
    # a lamp on the pool's far corner, and flowers along the front of the house
    b.set(12, 0, 4, 'cherry_planks', 'fence'); b.set(12, 1, 4, 'cherry_planks', 'fence'); b.set(12, 2, 4, 'lantern', 'lantern')
    for x in (1, 5): b.set(x, 0, z1 + 1, 'flowering_azalea', 'bush')
    b.set(2, 0, z1 + 1, 'allium', 'flower'); b.set(4, 0, z1 + 1, 'pink_petals', 'carpet')
    # a path from the door to the pool
    for z in range(z1 + 2, D + 1): b.set(3, -1, z, 'dirt_path')
    for x in range(4, 8): b.set(x, -1, 9, 'dirt_path')
    b.set(7, -1, 8, 'dirt_path')
    clip(b, W, D)
    dress(b, rng, W, D, 8, ('short_grass', 'allium', 'short_grass', 'poppy'))
    return [b]


# ================================================================ 8. Music Disc Trophy Wall
# A music disc standing on a shelf: our own pixel art of a plain record (a dark disc with a coloured
# label), not the game's disc pictures. One character is one dot; '.' is see-through.
DISC_ROWS = ['...kkk...', '.kkKKkkk.', '.kKkkkkk.', 'kKkkcckkk', 'kkkcHckkk', 'kkkcckkkk', '.kkkkkkK.', '.kkkKKkk.', '...kkk...']
DISC_LABELS = ['#d8402f', '#3aa84a', '#f0a020', '#3a78d8', '#a050c8', '#f2d23a', '#e06aa0', '#40c0c0']


def _flat(hexc):
    """The SPECIAL texture key for a flat colour."""
    import textures as _tx
    k = 't10_' + hexc.lstrip('#')
    if k not in SPECIAL: SPECIAL[k] = _tx.solid(hexc)
    return k


def _disc_shelf(build, p, v):
    """A shelf on a north wall (it faces south) with up to 3 music discs standing in its slots,
    left to right. labels = [colour or None, ...]; None leaves that slot empty."""
    boxes, extra = EXTRA_SHAPES['shelf'](build, p, dict(v, side='N'))
    out, dot = list(boxes), 0.6
    labels = (list(v.get('labels', [])) + [None] * 3)[:3]
    for n, lab in enumerate(labels):
        if not lab: continue
        pal = {'k': '#24242a', 'K': '#5a5a64', 'c': lab, 'H': '#101013'}
        x_left = 16 / 6 * (2 * n + 1) - 9 * dot / 2
        for j, row in enumerate(DISC_ROWS):
            y1 = 10.7 - j * dot; i = 0
            while i < len(row):
                ch = row[i]
                if ch == '.': i += 1; continue
                k = i
                while k + 1 < len(row) and row[k + 1] == ch: k += 1
                out.append((u16(x_left + i * dot, y1 - dot, 3.6, x_left + (k + 1) * dot, y1, 4.4), _flat(pal[ch])))
                i = k + 1
    return out, list(extra) + ['discs'] + [str(c) for c in labels]


EXTRA_SHAPES['t10_disc_shelf'] = _disc_shelf
EXTRA_ITEMS['t10_disc_shelf'] = lambda v: EXTRA_ITEMS['shelf'](v)


def disc_wall():
    b = Build('Disc Wall'); rng = random.Random(8)
    W, D = 8, 4
    # spruce slab floor (upper slabs, so things stand flush on top)
    b.fill(0, -1, 0, W, -1, D, 'spruce_planks', 'slab', h='top')
    # back wall: stripped spruce pillars, light birch bays so the spruce shelves stand out
    b.fill(0, 0, 0, W, 3, 0, 'birch_planks')
    b.fill(0, 0, 0, W, 0, 0, 'spruce_planks')
    for x in (0, 4, W): b.fill(x, 0, 0, x, 4, 0, 'stripped_spruce_log', a='y')
    for x in range(0, W + 1): put(b, x, 4, 0, 'spruce_planks', 'slab')
    # a short side wall with a window
    b.fill(0, 0, 1, 0, 3, 2, 'birch_planks'); b.fill(0, 0, 1, 0, 0, 2, 'spruce_planks')
    b.fill(0, 0, 3, 0, 4, 3, 'stripped_spruce_log', a='y')
    b.set(0, 2, 1, 'glass', 'pane'); b.set(0, 2, 2, 'glass', 'pane')
    b.set(0, 4, 1, 'spruce_planks', 'slab'); b.set(0, 4, 2, 'spruce_planks', 'slab')
    # six shelves in a row, three on each side of the middle pillar, full of discs (3 per shelf).
    # One spot is still empty: the last disc is out there somewhere.
    for i, x in enumerate((1, 2, 3, 5, 6, 7)):
        labels = [DISC_LABELS[(3 * i + k) % len(DISC_LABELS)] for k in range(3)]
        if i == 5: labels[2] = None
        b.set(x, 2, 1, 'spruce_shelf', 't10_disc_shelf', side='N', labels=labels)
    # copper lanterns on top of the two end pillars
    for x in (0, W): b.set(x, 5, 0, 'copper_lantern', 'lantern')
    # a rug and two cushions to sit and listen
    for x in range(2, 7):
        for z in (2, 3):
            if (x, z) not in ((3, 3), (5, 3)): b.set(x, 0, z, 'red_carpet', 'carpet')
    b.set(3, 0, 3, 'blue_wool', 'cushion'); b.set(5, 0, 3, 'yellow_wool', 'cushion')
    b.set(1, 0, 1, 'flower_pot', 'pot', plant='cornflower'); b.set(7, 0, 1, 'flower_pot', 'pot', plant='poppy')
    return [b]


# ================================================================ 7. Copper Trumpet Band
def trumpet_band():
    b = Build('Trumpet Band'); rng = random.Random(7)
    W, D = 10, 9
    lay(b, W, D)
    # the stage
    b.fill(1, 0, 1, 9, 0, 5, 'polished_andesite')
    for x in range(3, 8): b.set(x, 0, 6, 'polished_andesite', 'stairs', f='N')
    for x in (1, 2, 8, 9): b.set(x, 0, 6, 'polished_andesite', 'slab')
    # the band shell behind, trimmed with copper
    b.fill(1, 1, 1, 9, 3, 1, 'polished_andesite')
    for x in (1, 9): b.fill(x, 1, 2, x, 2, 2, 'polished_andesite')
    b.set(1, 3, 2, 'cut_copper', 'stairs', f='N'); b.set(9, 3, 2, 'cut_copper', 'stairs', f='N')
    for x in range(1, 10): b.set(x, 4, 1, 'cut_copper', 'stairs', f='N')
    b.set(1, 4, 1, 'cut_copper', 'stairs', f='W'); b.set(9, 4, 1, 'cut_copper', 'stairs', f='E')
    for x in range(3, 8): b.set(x, 5, 1, 'cut_copper', 'stairs', f='N')
    b.set(2, 5, 1, 'cut_copper', 'stairs', f='W'); b.set(8, 5, 1, 'cut_copper', 'stairs', f='E')
    for x in range(4, 7): b.set(x, 6, 1, 'cut_copper', 'slab')
    for x in (3, 5, 7): b.set(x, 2, 1, 'copper_bulb_lit')
    # four copper stages (waxed, as step 5 says, so the sound never changes), four note blocks, a button on each
    for x, cu in zip((2, 4, 6, 8), ('waxed_copper_block', 'waxed_exposed_copper', 'waxed_weathered_copper', 'waxed_oxidized_copper')):
        b.set(x, 1, 3, cu)
        b.set(x, 2, 3, 'note_block')
        b.set(x, 2, 4, 'stone_button', 'button', side='N')
    # copper lanterns on the front corners
    for x in (1, 9): b.set(x, 1, 5, 'copper_lantern', 'lantern')
    # a path to the stage, and flowers
    for z in range(7, D + 1):
        for x in (4, 5, 6): b.set(x, -1, z, 'dirt_path')
    dress(b, rng, W, D, 8, ('short_grass', 'dandelion', 'short_grass', 'poppy'))
    return [b]


# ================================================================ 6. Watch the Pale Garden Wake Up
def pale_oak(b, x, z, h, rng, r):
    """A pale oak: a 2 x 2 dark trunk with roots and branch stubs, and a wide, flat, layered canopy."""
    b.fill(x, 0, z, x + 1, h - 1, z + 1, 'pale_oak_log', a='y')
    for (px, pz, a) in ((x - 1, z, 'x'), (x + 2, z + 1, 'x'), (x + 1, z + 2, 'z')):
        b.set(px, 0, pz, 'pale_oak_log', a=a)                      # roots
    for (px, pz, a) in ((x - 1, z + 1, 'x'), (x + 2, z, 'x'), (x, z - 1, 'z'), (x + 1, z + 2, 'z')):
        b.set(px, h - 1, pz, 'pale_oak_log', a=a)                  # branches
    for dy, rr, drop in ((0, r - 0.4, 0.45), (1, r, 0.3), (2, r - 0.9, 0.35), (3, r - 2.1, 0.2)):
        for dx, dz in sorted(disc_even(rr)):
            if (dx + 0.5) ** 2 + (dz + 0.5) ** 2 > (rr - 1) ** 2 and rng.random() < drop: continue
            put(b, x + 1 + dx, h + dy, z + 1 + dz, 'pale_oak_leaves')


def hang_moss(b, rng, n, lowest=1):
    """Pale hanging moss under the canopy: strands 1 to 3 blocks long."""
    spots = sorted((x, y, z) for (x, y, z), v in b.c.items() if v['b'] == 'pale_oak_leaves' and (x, y - 1, z) not in b.c)
    rng.shuffle(spots); k = 0
    for (x, y, z) in spots:
        if k >= n: break
        L = rng.choice((1, 2, 2, 3))
        cells = [(x, y - i, z) for i in range(1, L + 1)]
        if any(c in b.c or c[1] < lowest for c in cells): continue
        for i, c in enumerate(cells):
            b.set(*c, 'pale_hanging_moss', 'hanging_plant', **({'tip': True} if i == L - 1 else {}))
        k += 1


def pale_garden_night():
    """A corner of pale garden at night: open eyeblossoms, hanging moss, and a tiny glass hut to watch from."""
    b = Build('Pale Garden'); rng = random.Random(6)
    W, D = 11, 11
    lay(b, W, D, 'pale_moss')
    pale_oak(b, 1, 1, 5, rng, 3.4)
    pale_oak(b, 8, 2, 4, rng, 2.8)
    clip(b, W, D)
    hang_moss(b, rng, 22, lowest=2)
    # the tiny glass hut: a resin brick base, glass walls, white posts and a pale oak roof
    hx0, hz0, hx1, hz1 = 1, 7, 4, 10
    b.walls(hx0, hz0, hx1, hz1, 0, 0, 'resin_bricks')
    b.fill(hx0 + 1, 0, hz0 + 1, hx1 - 1, 0, hz1 - 1, 'pale_oak_planks')
    b.walls(hx0, hz0, hx1, hz1, 1, 2, 'glass', 'pane')
    for (x, z) in ((hx0, hz0), (hx1, hz0), (hx0, hz1), (hx1, hz1)):
        b.fill(x, 0, z, x, 2, z, 'stripped_pale_oak_log', a='y')
    door(b, hx1, 1, 9, 'pale_oak_door', 'E')
    b.set(hx1 + 1, 0, 9, 'resin_bricks', 'slab')
    b.walls(hx0, hz0, hx1, hz1, 3, 3, 'stripped_pale_oak_log', a='x')
    for x in (hx0, hx1):
        for z in range(hz0 + 1, hz1): b.set(x, 3, z, 'stripped_pale_oak_log', a='z')
    hip(b, hx0, hx1, hz0, hz1, 4, 'pale_oak_planks', o=1)
    b.set(2, 1, 8, 'lantern', 'lantern')
    b.set(3, 1, 9, 'pale_oak_planks', 'stairs', f='E')
    # open eyeblossoms all over the open ground, with pale moss carpet between them
    for x in range(0, W + 1):
        for z in range(0, D + 1):
            if (x, 0, z) in b.c or (x, -1, z) not in b.c: continue
            near_hut = hx0 - 1 <= x <= hx1 + 1 and hz0 - 1 <= z <= hz1 + 1
            if near_hut: continue
            r = rng.random(); dense = x + z >= 10 and x >= 5      # the open patch fills the front-right
            if r < (0.6 if dense else 0.18): b.set(x, 0, z, 'open_eyeblossom', 'plant')
            elif r < (0.75 if dense else 0.4): b.set(x, 0, z, 'pale_moss_carpet', 'carpet')
    return [b]


# ================================================================ 5. Camp Out Under the Stars
def wool_tent(b, x0, x1, z0, wool='white_wool'):
    """An A-frame tent of wool stairs, 5 wide (z0..z0+4), closed at the back (x0) and open at the front (x1, east)."""
    for x in range(x0, x1 + 1):
        b.set(x, 0, z0, wool, 'stairs', f='S'); b.set(x, 0, z0 + 4, wool, 'stairs', f='N')
        b.set(x, 1, z0 + 1, wool, 'stairs', f='S'); b.set(x, 1, z0 + 3, wool, 'stairs', f='N')
        b.set(x, 2, z0 + 2, wool, 'slab')
    for z in range(z0 + 1, z0 + 4): b.set(x0, 0, z, wool)
    b.set(x0, 1, z0 + 2, wool)


def camp_out():
    """A campfire at night, four cushions round it, and two straw beds in a wool tent."""
    b = Build('Camp Out'); rng = random.Random(5)
    W, D = 10, 9
    lay(b, W, D)
    # the fire pit
    cx, cz = 6, 5
    for dx, dz in disc(2.2): b.set(cx + dx, -1, cz + dz, 'dirt_path')
    for dx, dz in disc(1.1): b.set(cx + dx, -1, cz + dz, 'coarse_dirt')
    b.set(cx, 0, cz, 'campfire', 'campfire')
    # four cushions on oak slab stools
    for (dx, dz), wool in zip(((0, -2), (2, 0), (0, 2), (-2, 0)), ('red_wool', 'yellow_wool', 'light_blue_wool', 'lime_wool')):
        b.set(cx + dx, 0, cz + dz, 'oak_planks', 'slab', h='top')
        b.set(cx + dx, 1, cz + dz, wool, 'cushion')
    # the tent, open toward the fire, with two straw beds inside
    wool_tent(b, 0, 2, 0)
    for z in (1, 3):
        b.set(2, 0, z, 'straw_bed', 'straw_bed', part='foot', f='W'); b.set(1, 0, z, 'straw_bed', 'straw_bed', part='head', f='W')
    b.set(1, 0, 2, 'lantern', 'lantern')
    b.set(3, -1, 2, 'dirt_path')
    # a small woodpile at the front
    for x in (1, 2, 3): b.set(x, 0, 8, 'spruce_log', a='z')
    b.set(2, 1, 8, 'spruce_log', a='z')
    # supplies by the tree
    b.set(10, 0, 4, 'barrel'); b.set(10, 0, 5, 'barrel'); b.set(10, 1, 4, 'lantern', 'lantern')
    # a tall spruce behind the camp
    spruce(b, 8, 1, 8, rng)
    clip(b, W, D)
    dress(b, rng, W, D, 10, ('short_grass', 'short_grass', 'cornflower', 'short_grass', 'bush'))
    return [b]


# ================================================================ 4. Follow the Camp Map Trail
def camp_maps():
    b = Build('Camp Maps'); rng = random.Random(4)
    W, D = 11, 10
    lay(b, W, D)
    for x in range(0, 8):
        for z in range(0, 8):
            if rng.random() < 0.45: b.set(x, -1, z, rng.choice(('gravel', 'coarse_dirt', 'gravel')))
    # a white wool tent roof held up on four spruce fence poles
    for (x, z) in ((1, 1), (5, 1), (1, 3), (5, 3)):
        b.fill(x, 0, z, x, 1, z, 'spruce_planks', 'fence')
    gable(b, 1, 5, 1, 3, 2, 'white_wool', o=1, axis='x')
    b.set(2, 0, 2, 'straw_bed', 'straw_bed', part='foot', f='E'); b.set(3, 0, 2, 'straw_bed', 'straw_bed', part='head', f='E')
    b.set(4, 0, 2, 'barrel')
    # what the campers left: a map table, barrels and a chest
    b.set(1, 0, 5, 'barrel'); b.set(1, 1, 5, 'barrel'); b.set(2, 0, 6, 'cartography_table'); b.set(1, 0, 6, 'chest', 'chest')
    # the trail out of camp
    for (x, z) in [(3, 4), (3, 5), (4, 5), (4, 6), (5, 6), (5, 7), (6, 7), (6, 8), (7, 8), (7, 9), (8, 9), (8, 10), (9, 10)]:
        b.set(x, -1, z, 'dirt_path')
    # the old copper chest, half dug out of a heap of coarse dirt beside the trail
    for dx, dz in disc(1.5): b.set(9 + dx, -1, 6 + dz, 'coarse_dirt')
    b.set(9, 0, 6, 'oxidized_copper_chest', 'chest')
    for (x, z, k) in [(8, 6, 'coarse_dirt'), (8, 5, 'coarse_dirt'), (9, 5, 'coarse_dirt'), (10, 5, 'gravel'), (8, 7, 'gravel')]:
        b.set(x, 0, z, k)
    b.set(8, 1, 5, 'coarse_dirt'); b.set(9, 1, 5, 'gravel')
    oak(b, 9, 2, 5, rng, log='birch_log', key='birch_leaves')
    # sweet berry bushes and a log seat at the edge of camp
    for (x, z) in [(0, 9), (1, 9), (0, 8), (11, 3)]: b.set(x, 0, z, 'sweet_berry_bush', 'bush')
    b.set(2, 0, 9, 'spruce_log', a='x'); b.set(3, 0, 9, 'spruce_log', a='x')
    clip(b, W, D)
    dress(b, rng, W, D, 9, ('short_grass', 'short_grass', 'bush', 'short_grass'))
    return [b]


# ================================================================ 3. Keep a Baby Animal Tiny Forever
def tiny_forever():
    b = Build('Tiny Forever'); rng = random.Random(3)
    W, D = 12, 9
    lay(b, W, D)
    oak(b, 2, 2, 4, rng)
    x0, z0, x1, z1 = 4, 1, 10, 6
    b.walls(x0, z0, x1, z1, 0, 0, 'oak_planks', 'fence')
    b.set(7, 0, z1, 'oak_fence_gate', 'gate', a='x')
    # a little shelter in the back corner over the hay
    for (x, z) in ((x1 - 2, z0), (x1, z0), (x1 - 2, z0 + 2), (x1, z0 + 2)):
        b.fill(x, 0, z, x, 1, z, 'oak_planks', 'fence')
    b.fill(x1 - 2, 2, z0, x1, 2, z0 + 2, 'spruce_planks', 'slab')
    b.set(x1 - 1, 0, z0 + 1, 'hay_block')
    b.set(x0 + 1, 0, z0 + 1, 'cauldron', 'cauldron')
    b.set(x0, 1, z1, 'lantern', 'lantern')
    # two raised planters of golden dandelions, one each side of the path to the gate.
    # Each is a row of podzol with open spruce trapdoors on its four sides.
    for (pa, pb) in ((3, 5), (9, 11)):
        for x in range(pa, pb + 1):
            b.set(x, 0, 8, 'podzol'); b.set(x, 1, 8, 'golden_dandelion', 'plant')
            b.set(x, 0, 7, 'spruce_trapdoor', 'trapdoor', open=True, side='S')
            b.set(x, 0, 9, 'spruce_trapdoor', 'trapdoor', open=True, side='N')
        b.set(pa - 1, 0, 8, 'spruce_trapdoor', 'trapdoor', open=True, side='E')
        b.set(pb + 1, 0, 8, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
    for z in range(z1 + 1, D + 1): b.set(7, -1, z, 'dirt_path')
    clip(b, W, D)
    dress(b, rng, W, D, 7, ('short_grass', 'poppy', 'short_grass', 'cornflower'))
    return [b]


# ================================================================ 2. Tame a Zombie Horse (the yard, no horse)
def zombie_horse():
    b = Build('Jousting Yard'); rng = random.Random(2)
    W, D = 12, 10
    lay(b, W, D)
    # the riding lane, split down the middle by a fence rail
    for x in range(0, W + 1):
        for z in range(6, 10): b.set(x, -1, z, 'dirt_path')
    for x in range(2, W - 1): b.set(x, 0, 8, 'oak_planks', 'fence')
    # red and white posts at each end
    for x in (0, W):
        for y, k in ((0, 'red_wool'), (1, 'white_wool'), (2, 'red_wool')): b.set(x, y, 8, k)
        b.set(x, 3, 8, 'white_wool', 'slab')
    # the stable: two stalls under a spruce roof
    sx0, sx1 = 2, 8
    b.fill(sx0, 0, 0, sx1, 2, 0, 'spruce_planks')
    for x in (sx0, sx1): b.fill(x, 0, 1, x, 2, 3, 'spruce_planks')
    for x in (sx0, sx1):
        for z in (0, 3): b.fill(x, 0, z, x, 2, z, 'spruce_log', a='y')
    b.fill(5, 0, 0, 5, 2, 0, 'spruce_log', a='y')
    b.fill(5, 0, 1, 5, 0, 3, 'spruce_planks', 'fence')
    # the right-hand stall is shut with gates; the left one stands open and empty for your horse
    for x in (6, 7): b.set(x, 0, 3, 'spruce_fence_gate', 'gate', a='x')
    gable(b, sx0, sx1, 0, 3, 3, 'spruce_planks', o=1, gable_mat='spruce_planks', axis='x')
    b.set(3, 0, 1, 'hay_block'); b.set(6, 0, 1, 'hay_block'); b.set(7, 0, 1, 'cauldron', 'cauldron')
    b.set(5, 2, 4, 'lantern', 'lantern', hang=True)
    # spare hay by the lane
    b.set(10, 0, 4, 'hay_block'); b.set(11, 0, 4, 'hay_block'); b.set(10, 1, 4, 'hay_block')
    for x in (sx0, sx1):
        b.set(x, 2, 4, 'red_banner', 'panel', side='N', t=1); b.set(x, 1, 4, 'red_banner', 'panel', side='N', t=1, y0=6)
    clip(b, W, D)
    dress(b, rng, W, D, 7, ('short_grass', 'short_grass', 'oxeye_daisy'))
    return [b]


# ================================================================ 1. Ride a Nautilus Underwater
def nautilus():
    """A seafloor tank. Kelp lines the two back edges, and the coral reef steps down from the back corner,
    so every plant has blocks behind it and the water never shows seams around them."""
    b = Build('Nautilus Reef'); rng = random.Random(1)
    # H = water layers. Kelp and reef plants stop one layer below the surface, so nothing pokes out of the water.
    W, D, H, KELP = 9, 8, 5, 4
    for x in range(W + 1):
        for z in range(D + 1):
            b.set(x, -1, z, 'gravel' if rng.random() < 0.2 else 'sand')
    # kelp curtain along the back edges, up to one block under the surface
    for x in range(W + 1):
        for y in range(KELP): b.set(x, y, 0, 'kelp', 'cross_plant')
    for z in range(1, D + 1):
        for y in range(KELP): b.set(0, y, z, 'kelp', 'cross_plant')
    # a coral reef in five colours that steps down from the back corner, plants on every step
    coral = ('tube', 'brain', 'horn', 'fire', 'bubble')
    for x in range(1, 5):
        for z in range(1, 5):
            d = (x - 1) + (z - 1)
            top = 2 - d
            c = coral[(x + 2 * z) % 5]
            for y in range(0, top + 1): b.set(x, y, z, c + '_coral_block')
            if d <= 3:
                c2 = coral[(x + 2 * z + 2) % 5]   # a different colour on top, so each step stands out
                k = (c2 + '_coral', 'cross_plant') if (x + z) % 2 else (c2 + '_coral_fan', 'coral_fan')
                if d == 3: k = (('sea_pickle_3', 'sea_pickle'), ('seagrass', 'cross_plant'), ('sea_pickle_2', 'sea_pickle'), ('fire_coral_fan', 'coral_fan'))[x - 1]
                b.set(x, top + 1, z, *k)
    # a small prismarine arch at the back right, with sea lantern keystones
    for x in (6, 9):
        b.fill(x, 0, 1, x, 2, 1, 'prismarine_bricks'); b.set(x, 0, 1, 'dark_prismarine')
    b.fill(6, 3, 1, 9, 3, 1, 'prismarine_bricks')
    b.set(7, 2, 1, 'prismarine_bricks', 'stairs', f='W', h='top'); b.set(8, 2, 1, 'prismarine_bricks', 'stairs', f='E', h='top')
    b.set(7, 3, 1, 'sea_lantern'); b.set(8, 3, 1, 'sea_lantern')
    # fallen prismarine blocks at the front, with glowing sea pickles tucked in the corner
    b.set(7, 0, 6, 'dark_prismarine'); b.set(8, 0, 6, 'prismarine'); b.set(7, 0, 7, 'prismarine_bricks'); b.set(7, 1, 6, 'prismarine')
    b.set(8, 0, 7, 'sea_pickle_4', 'sea_pickle')
    # clear water over everything
    for x in range(W + 1):
        for z in range(D + 1):
            for y in range(H): put(b, x, y, z, 'water')
    return [b]


FIGURES = {
    't10-firefly-garden': firefly_garden,
    't10-golden-hour': golden_hour,
    't10-disc-wall': disc_wall,
    't10-trumpet-band': trumpet_band,
    't10-pale-garden-night': pale_garden_night,
    't10-camp-out': camp_out,
    't10-camp-maps': camp_maps,
    't10-tiny-forever': tiny_forever,
    't10-zombie-horse': zombie_horse,
    't10-nautilus': nautilus,
}

# ground: the block around the scene (None = no ground). time: 0.39 day, 0.715 sunset, 0.93 night.
# empty: dotted boxes (x, y, z, w, h, d, label) where an animal would be. Nothing is drawn there.
META = {
    't10-firefly-garden': dict(ground='grass_block', time=0.9, view='hero'),
    't10-golden-hour': dict(ground='grass_block', time=0.72, view='hero'),
    't10-disc-wall': dict(ground=None, time=0.4, view='hero'),
    't10-trumpet-band': dict(ground='grass_block', time=0.4, view='hero'),
    't10-pale-garden-night': dict(ground='pale_moss', time=0.93, view='hero'),
    't10-camp-out': dict(ground='grass_block', time=0.9, view='hero'),
    't10-camp-maps': dict(ground='grass_block', time=0.4, view='hero'),
    't10-tiny-forever': dict(ground='grass_block', time=0.4, view='hero',
                             empty=[(6, 0, 3, 2, 1, 2, 'Baby animal spot')]),
    't10-zombie-horse': dict(ground='grass_block', time=0.45, view='hero',
                             empty=[(3, 0, 2, 2, 2, 2, 'Zombie horse stall')]),
    't10-nautilus': dict(ground='sand', time=0.45, view='hero',
                         empty=[(5, 1, 3, 2, 2, 2, 'Nautilus swims here')]),
}
