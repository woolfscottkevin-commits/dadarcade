import random
from engine import Build
from helpers import *

def starter_cabin():
    b = Build('Starter Cabin')
    b.fill(0, 0, 0, 6, 0, 6, 'cobblestone')
    b.fill(1, 0, 1, 5, 0, 5, 'spruce_planks')
    b.walls(0, 0, 6, 6, 1, 3, 'oak_planks')
    for x, z in ((0, 0), (6, 0), (0, 6), (6, 6)): b.fill(x, 1, z, x, 3, z, 'spruce_log')
    for x in range(0, 7): b.set(x, 4, 0, 'spruce_log', a='x'); b.set(x, 4, 6, 'spruce_log', a='x')
    for z in range(1, 6): b.set(0, 4, z, 'spruce_log', a='z'); b.set(6, 4, z, 'spruce_log', a='z')
    door(b, 3, 1, 6, 'spruce_door', 'S')
    for (x, z) in ((6, 3), (0, 3)): b.set(x, 2, z, 'glass', 'pane')
    for x in (1, 5): b.set(x, 2, 6, 'glass', 'pane')
    b.set(6, 2, 2, 'glass', 'pane'); b.set(6, 2, 4, 'glass', 'pane')
    # shutters
    for x in (0, 2, 4, 6):
        pass
    b.set(2, 2, 7, 'spruce_trapdoor', 'trapdoor', open=True, side='N') if False else None
    gable(b, 0, 6, 0, 6, 4, 'spruce_planks', o=1, gable_mat='oak_planks', axis='x')
    # front step, lanterns, flowers
    b.fill(0, 0, 7, 6, 0, 7, 'spruce_planks', 'slab')
    b.set(3, 0, 7, 'spruce_planks', 'slab')
    for x in (0, 6): b.fill(x, 1, 7, x, 3, 7, 'spruce_planks', 'fence')
    b.set(2, 3, 7, 'lantern', 'lantern', hang=True); b.set(4, 3, 7, 'lantern', 'lantern', hang=True)
    b.set(3, -1, 8, 'dirt_path'); b.set(3, -1, 9, 'dirt_path'); b.set(3, -1, 10, 'dirt_path')
    for (x, z, f) in ((1, 8, 'poppy'), (5, 8, 'dandelion'), (0, 8, 'short_grass'), (6, 9, 'short_grass')):
        b.set(x, 0, z, f, 'flower' if f != 'short_grass' else 'tuft')
    for (x, z, side) in ((7, 2, 'W'), (7, 4, 'W')):
        b.set(x, 2, z, 'spruce_trapdoor', 'trapdoor', open=True, side=side)
    # interior
    b.set(1, 1, 1, 'red_bed', 'bed', part='head', f='N'); b.set(1, 1, 2, 'red_bed', 'bed', part='foot', f='N')
    b.set(5, 1, 1, 'crafting_table'); b.set(4, 1, 1, 'furnace', f='S'); b.set(3, 1, 1, 'chest', 'chest')
    b.set(5, 1, 5, 'oak_planks', 'fence'); b.set(5, 2, 5, 'oak_pressure_plate', 'plate')
    b.set(1, 3, 3, 'torch', 'torch', side='W')
    for x in (-1, 7):
        pass
    return b

def cozy_cottage():
    b = Build('Cozy Cottage'); rng = random.Random(3)
    W, D = 10, 6  # main house x0..10, z0..6
    b.fill(0, 0, 0, W, 0, D, 'stone_bricks'); b.fill(1, 0, 1, W - 1, 0, D - 1, 'spruce_planks')
    # front wing
    b.fill(5, 0, 7, 9, 0, 10, 'stone_bricks'); b.fill(6, 0, 7, 8, 0, 9, 'spruce_planks')
    b.walls(0, 0, W, D, 1, 1, 'cobblestone'); b.walls(5, 6, 9, 10, 1, 1, 'cobblestone')
    b.walls(0, 0, W, D, 2, 4, 'white_terracotta'); b.walls(5, 6, 9, 10, 2, 4, 'white_terracotta')
    b.fill(6, 1, 6, 8, 4, 6, None)  # open between wing and main
    b.fill(6, 0, 6, 8, 0, 6, 'spruce_planks')
    for x, z in ((0, 0), (W, 0), (0, D), (5, 10), (9, 10), (4, 6), (W, 6), (5, 6), (9, 6)):
        if (x, z) in ((4, 6),): continue
        b.fill(x, 1, z, x, 4, z, 'dark_oak_log')
    b.fill(0, 1, 6, 0, 4, 6, 'dark_oak_log'); b.fill(3, 1, 0, 3, 4, 0, 'dark_oak_log'); b.fill(7, 1, 0, 7, 4, 0, 'dark_oak_log')
    b.fill(2, 1, 6, 2, 4, 6, 'dark_oak_log')
    # beams
    for x in range(0, W + 1): b.set(x, 5, 0, 'dark_oak_log', a='x')
    for x in list(range(0, 6)) + list(range(9, W + 1)): b.set(x, 5, D, 'dark_oak_log', a='x')
    for z in range(1, D): b.set(0, 5, z, 'dark_oak_log', a='z'); b.set(W, 5, z, 'dark_oak_log', a='z')
    for z in range(7, 11): b.set(5, 5, z, 'dark_oak_log', a='z'); b.set(9, 5, z, 'dark_oak_log', a='z')
    for x in range(6, 9): b.set(x, 5, 10, 'dark_oak_log', a='x')
    # windows
    for x in (1, 2, 4, 5, 8, 9):
        pass
    for (x, y, z) in [(1, 3, 6), (3, 3, 6), (7, 3, 10), (1, 3, 0), (5, 3, 0), (9, 3, 0), (W, 3, 2), (W, 3, 4), (9, 3, 8), (5, 3, 8), (0, 3, 3)]:
        b.set(x, y, z, 'glass', 'pane'); b.set(x, y - 1, z, 'glass', 'pane')
    door(b, 7, 1, 10, 'dark_oak_door', 'S')
    # flower boxes under front windows
    for (x, z, side) in [(1, 7, 'N'), (3, 7, 'N'), (10, 8, 'N')]:
        pass
    b.set(1, 1, 7, 'spruce_trapdoor', 'trapdoor', h='top'); b.set(3, 1, 7, 'spruce_trapdoor', 'trapdoor', h='top')
    b.set(1, 2, 7, 'poppy', 'flower'); b.set(3, 2, 7, 'allium', 'flower')
    b.set(6, 3, 11, 'lantern', 'lantern', hang=False) if False else None
    # roofs
    gable(b, 0, W, 0, D, 5, 'dark_oak_planks', o=1, gable_mat='white_terracotta', axis='x')
    gable(b, 5, 9, 7, 10, 5, 'dark_oak_planks', o=1, gable_mat='white_terracotta', axis='z')
    # remove wing roof pieces that poke inside main roof volume
    # chimney
    b.fill(-1, 0, 2, -1, 9, 3, 'bricks'); b.fill(-1, 10, 2, -1, 10, 3, 'brick_wall' if False else 'bricks')
    b.set(-1, 11, 2, 'campfire', 'campfire'); b.set(-1, 11, 3, 'bricks', 'slab')
    # porch lanterns
    b.set(6, 2, 11, 'lantern', 'lantern'); b.set(8, 2, 11, 'lantern', 'lantern')
    b.set(6, 1, 11, 'spruce_planks', 'fence'); b.set(8, 1, 11, 'spruce_planks', 'fence')
    # garden fence
    for x in range(-1, 12):
        if x in (6, 7, 8): continue
        b.set(x, 0, 13, 'spruce_planks', 'fence')
    b.set(7, 0, 13, 'spruce_fence_gate', 'gate', a='x')
    for z in range(11, 13):
        pass
    for z in (11, 12, 13, 14): b.set(7, -1, z, 'dirt_path')
    for x, z in [(0, 11), (1, 12), (2, 11), (3, 12), (4, 11), (10, 12), (11, 11)]:
        b.set(x, 0, z, rng.choice(['poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy']), 'flower')
    b.set(11, 0, 8, 'azalea_leaves'); b.set(11, 1, 8, 'azalea_leaves'); b.set(11, 0, 9, 'azalea_leaves')
    for x in (-1, 12):
        pass
    for z in range(-1, 14):
        b.set(-2, 0, z, 'spruce_planks', 'fence'); b.set(12, 0, z, 'spruce_planks', 'fence')
    for x in range(-2, 13):
        b.set(x, 0, 13, 'spruce_planks', 'fence') if x not in (6, 7, 8) else None
    b.set(6, 0, 13, 'spruce_planks', 'fence'); b.set(8, 0, 13, 'spruce_planks', 'fence')
    # interior
    b.set(9, 1, 1, 'blue_bed', 'bed', part='head', f='N'); b.set(9, 1, 2, 'blue_bed', 'bed', part='foot', f='N')
    b.set(1, 1, 1, 'bookshelf'); b.set(2, 1, 1, 'bookshelf'); b.set(1, 1, 5, 'crafting_table'); b.set(2, 1, 5, 'furnace', f='N')
    b.set(5, 1, 3, 'oak_planks', 'fence'); b.set(5, 2, 3, 'oak_pressure_plate', 'plate')
    b.set(4, 1, 3, 'spruce_planks', 'stairs', f='W'); b.set(6, 1, 3, 'spruce_planks', 'stairs', f='E')
    b.set(5, 4, 3, 'lantern', 'lantern', hang=True)
    return b

def lighthouse():
    b = Build('Lighthouse'); rng = random.Random(7)
    cx, cz = 7, 7
    for (dx, dz) in disc(6.6):
        mat = rng.choice(['stone', 'andesite', 'cobblestone', 'stone', 'mossy_cobblestone'])
        b.set(cx + dx, 0, cz + dz, mat)
        if dx * dx + dz * dz > 30 and rng.random() < 0.35: b.set(cx + dx, 0, cz + dz, None)
    for (dx, dz) in disc(9.2) - disc(6.6): b.set(cx + dx, -1, cz + dz, 'water')
    for (dx, dz) in disc(5.5): b.set(cx + dx, 1, cz + dz, 'smooth_stone', 'slab')
    top = 18
    for y in range(2, top):
        r = 4.5 if y < 10 else 3.5
        mat = 'red_concrete' if ((y - 2) // 4) % 2 else 'white_concrete'
        for (dx, dz) in thick_ring(r): b.set(cx + dx, y, cz + dz, mat)
        if y == 10:
            for (dx, dz) in disc(4.5) - disc(3.5): b.set(cx + dx, y - 1, cz + dz, mat if False else 'white_concrete', 'full') if False else None
    for (dx, dz) in disc(4.5) - thick_ring(3.5) - disc(2.5): b.set(cx + dx, 10, cz + dz, 'smooth_stone', 'slab')
    for y, (dx, dz) in [(5, (0, 4)), (5, (4, 0)), (8, (-4, 0)), (12, (0, 3)), (14, (3, 0)), (15, (0, -3))]:
        b.set(cx + dx, y, cz + dz, 'glass', 'pane'); b.set(cx + dx, y + 1, cz + dz, 'glass', 'pane')
    door(b, cx, 2, cz + 4, 'spruce_door', 'S')
    b.set(cx, 1, cz + 5, 'smooth_stone', 'slab'); b.set(cx, 1, cz + 6, 'stone_bricks', 'stairs', f='N')
    b.set(cx - 1, 3, cz + 5, 'lantern', 'lantern', hang=False) if False else None
    for (dx, dz) in disc(5.5): b.set(cx + dx, top, cz + dz, 'stone_bricks', 'slab', h='top')
    for (dx, dz) in thick_ring(5.5): b.set(cx + dx, top + 1, cz + dz, 'iron_bars', 'pane')
    for (dx, dz) in thick_ring(2.5):
        b.set(cx + dx, top + 1, cz + dz, 'glass'); b.set(cx + dx, top + 2, cz + dz, 'glass')
    b.set(cx, top + 1, cz, 'sea_lantern'); b.set(cx, top + 2, cz, 'glowstone')
    for (dx, dz) in disc(3.5): b.set(cx + dx, top + 3, cz + dz, 'red_concrete')
    for (dx, dz) in disc(2.5): b.set(cx + dx, top + 4, cz + dz, 'red_concrete')
    for (dx, dz) in disc(1.5): b.set(cx + dx, top + 5, cz + dz, 'red_concrete')
    b.set(cx, top + 6, cz, 'red_concrete'); b.set(cx, top + 7, cz, 'lightning_rod', 'rod')
    for z in range(cz + 7, cz + 11):
        b.set(cx, -1, z, 'water'); b.set(cx, 0, z, 'spruce_planks', 'slab', h='top')
    for x in (cx - 1, cx + 1):
        b.set(x, -1, cz + 10, 'spruce_log'); b.set(x, 0, cz + 10, 'spruce_log'); b.set(x, 1, cz + 10, 'lantern', 'lantern')
    return b

def windmill():
    b = Build('Windmill'); rng = random.Random(11)
    cx, cz = 7, 6
    for (dx, dz) in disc(5.5): b.set(cx + dx, 0, cz + dz, 'cobblestone')
    for y in range(1, 6):
        for (dx, dz) in thick_ring(4.5): b.set(cx + dx, y, cz + dz, rng.choice(['stone_bricks'] * 5 + ['mossy_stone_bricks', 'cobblestone']))
    for (dx, dz) in disc(4.5) - disc(3.5): b.set(cx + dx, 6, cz + dz, 'spruce_planks', 'slab')
    for y in range(6, 15):
        r = 3.5 if y < 10 else 2.5
        for (dx, dz) in thick_ring(r):
            b.set(cx + dx, y, cz + dz, 'dark_oak_log' if abs(dx) == abs(dz) else 'spruce_planks')
    for (dx, dz) in disc(3.5) - disc(2.5): b.set(cx + dx, 10, cz + dz, 'dark_oak_planks', 'slab')
    for i, r in enumerate((3.5, 2.5, 1.5)):
        y = 15 + i; R = thick_ring(r)
        for (dx, dz) in R:
            if abs(dz) >= abs(dx): f = 'S' if dz < 0 else 'N'
            else: f = 'E' if dx < 0 else 'W'
            b.set(cx + dx, y, cz + dz, 'dark_oak_planks', 'stairs', f=f)
        for (dx, dz) in disc(r) - R: b.set(cx + dx, y, cz + dz, 'dark_oak_planks')
    b.set(cx, 18, cz, 'dark_oak_planks', 'slab')
    door(b, cx, 1, cz + 4, 'spruce_door', 'S')
    b.set(cx, 0, cz + 5, 'cobblestone'); b.set(cx, 0, cz + 6, 'cobblestone', 'stairs', f='N')
    b.set(cx - 1, 3, cz + 5, 'lantern', 'lantern') if False else None
    for (x, y, z) in [(cx + 4, 3, cz), (cx - 4, 3, cz), (cx + 3, 8, cz), (cx - 3, 8, cz), (cx + 2, 12, cz), (cx, 8, cz - 3)]:
        b.set(x, y, z, 'glass', 'pane')
    for (x, z) in [(cx + 5, cz - 1), (cx + 5, cz + 1)]: b.set(x, 3, z, 'spruce_trapdoor', 'trapdoor', open=True, side='W')
    hy = 12; sz = cz + 5
    for z in range(cz + 3, sz): b.set(cx, hy, z, 'spruce_log', a='z')
    b.set(cx, hy, sz, 'dark_oak_log', a='z')
    L = 7
    for d in range(1, L + 1):
        for (x, y) in [(cx + d, hy), (cx - d, hy), (cx, hy + d), (cx, hy - d)]:
            b.set(x, y, sz, 'spruce_planks', 'fence')
    for d in range(3, L + 1):
        for (x, y) in [(cx + d, hy - 1), (cx + d, hy - 2), (cx - d, hy + 1), (cx - d, hy + 2), (cx + 1, hy + d), (cx + 2, hy + d), (cx - 1, hy - d), (cx - 2, hy - d)]:
            b.set(x, y, sz, 'white_wool')
    for (x, z) in [(cx + 6, cz + 3), (cx + 6, cz + 4), (cx + 7, cz + 3)]: b.set(x, 0, z, 'hay_block')
    b.set(cx + 6, 1, cz + 3, 'hay_block')
    b.set(cx - 6, 0, cz + 3, 'barrel'); b.set(cx - 6, 0, cz + 4, 'barrel'); b.set(cx - 6, 1, cz + 3, 'barrel')
    for x in range(cx - 7, cx - 2):
        for z in range(cz - 7, cz - 4):
            if (x, z) == (cx - 5, cz - 6): b.set(x, -1, z, 'water')
            else: b.set(x, -1, z, 'farmland'); b.set(x, 0, z, 'wheat', 'crop')
    return b

def treehouse():
    b = Build('Treehouse'); rng = random.Random(5)
    tx0, tz0 = 7, 7
    b.fill(tx0, 0, tz0, tx0 + 1, 18, tz0 + 1, 'oak_log')
    for (x, z) in [(tx0 - 1, tz0), (tx0 + 2, tz0 + 1), (tx0, tz0 + 2), (tx0 + 1, tz0 - 1)]: b.set(x, 0, z, 'oak_log', a='x' if x not in (tx0, tx0 + 1) else 'z')
    # branches
    for p in line3((tx0 + 1, 13, tz0 + 1), (tx0 + 5, 16, tz0 + 3)): b.set(*p, 'oak_log', a='x')
    for p in line3((tx0, 14, tz0), (tx0 - 4, 18, tz0 - 3)): b.set(*p, 'oak_log', a='x')
    for p in line3((tx0, 13, tz0 + 1), (tx0 - 2, 16, tz0 + 5)): b.set(*p, 'oak_log', a='z')
    # platform at y=6
    py = 6
    b.fill(tx0 - 4, py, tz0 - 4, tx0 + 5, py, tz0 + 5, 'spruce_planks')
    for (x, z) in [(tx0 - 4, tz0 - 4), (tx0 + 5, tz0 - 4), (tx0 - 4, tz0 + 5), (tx0 + 5, tz0 + 5)]:
        b.fill(x, py - 1, z, x, py - 1, z, 'spruce_planks', 'fence')
    for x in range(tx0 - 3, tx0 + 5):
        for z in (tz0 - 4, tz0 + 5): b.set(x, py - 1, z, 'spruce_planks', 'stairs', h='top', f='S' if z < tz0 else 'N')
    for z in range(tz0 - 3, tz0 + 5):
        for x in (tx0 - 4, tx0 + 5): b.set(x, py - 1, z, 'spruce_planks', 'stairs', h='top', f='E' if x < tx0 else 'W')
    for p in line3((tx0 - 1, 2, tz0), (tx0 - 3, py - 1, tz0 - 3)): b.set(*p, 'spruce_log')
    for p in line3((tx0 + 2, 2, tz0 + 1), (tx0 + 4, py - 1, tz0 + 4)): b.set(*p, 'spruce_log')
    for (x, z) in [(tx0 - 4, tz0 - 4), (tx0 + 5, tz0 + 5)]:
        pass
    # railing
    for x in range(tx0 - 4, tx0 + 6):
        for z in (tz0 - 4, tz0 + 5): b.set(x, py + 1, z, 'spruce_planks', 'fence')
    for z in range(tz0 - 4, tz0 + 6):
        for x in (tx0 - 4, tx0 + 5): b.set(x, py + 1, z, 'spruce_planks', 'fence')
    b.set(tx0 + 1, py + 1, tz0 + 5, None)  # ladder gap
    # hut on the platform around trunk (west/north half)
    hx0, hz0, hx1, hz1 = tx0 - 3, tz0 - 3, tx0 + 2, tz0 + 2
    b.walls(hx0, hz0, hx1, hz1, py + 1, py + 3, 'birch_planks')
    for (x, z) in [(hx0, hz0), (hx1, hz0), (hx0, hz1), (hx1, hz1)]: b.fill(x, py + 1, z, x, py + 3, z, 'birch_log')
    door(b, hx0 + 2, py + 1, hz1, 'birch_door', 'S')
    b.set(hx1, py + 2, hz0 + 2, 'glass', 'pane'); b.set(hx0 + 4, py + 2, hz1, 'glass', 'pane'); b.set(hx0, py + 2, hz0 + 2, 'glass', 'pane')
    gable(b, hx0, hx1, hz0, hz1, py + 4, 'spruce_planks', o=1, gable_mat='birch_planks', axis='x')
    b.fill(tx0, py + 1, tz0, tx0 + 1, 18, tz0 + 1, 'oak_log')
    # ladder on trunk south face
    for y in range(0, py): b.set(tx0 + 1, y, tz0 + 2, 'ladder', 'ladder', side='N')
    b.set(tx0 + 1, py, tz0 + 2, None); b.set(tx0 + 1, py, tz0 + 2, 'spruce_trapdoor', 'trapdoor', h='top') if False else None
    for y in range(py, py + 1): b.set(tx0 + 1, y, tz0 + 2, 'ladder', 'ladder', side='N')
    b.set(tx0 + 1, py, tz0 + 2, None)
    b.fill(tx0 + 1, py, tz0 + 2, tx0 + 1, py, tz0 + 2, 'ladder', 'ladder', side='N')
    # leaves
    for (cx, cy, cz, r) in [(tx0 + 1, 20, tz0 + 1, 4.0), (tx0 + 5, 17, tz0 + 3, 2.6), (tx0 - 4, 19, tz0 - 3, 2.8), (tx0 - 2, 17, tz0 + 5, 2.4), (tx0 + 3, 18, tz0 - 3, 2.6)]:
        blob(b, cx, cy, cz, r, 'oak_leaves', rng, squash=0.75)
    # lanterns, swing, flowers
    b.set(tx0 + 4, py + 2, tz0 + 4, 'lantern', 'lantern') if False else None
    b.set(tx0 + 5, py + 2, tz0 + 5, 'lantern', 'lantern'); b.set(tx0 - 4, py + 2, tz0 + 5, 'lantern', 'lantern')
    # rope swing under platform
    for y in range(2, py - 1): b.set(tx0 + 4, y, tz0 + 2, 'chain', 'rod')
    b.set(tx0 + 4, 1, tz0 + 2, 'oak_planks', 'slab', h='top')
    for (x, z, f) in [(tx0 - 2, tz0 + 7, 'poppy'), (tx0 + 4, tz0 + 7, 'dandelion'), (tx0 - 5, tz0 + 3, 'cornflower'), (tx0 + 7, tz0 - 1, 'oxeye_daisy')]:
        b.set(x, 0, z, f, 'flower')
    for (x, z) in [(tx0 - 1, tz0 + 6), (tx0 + 6, tz0 + 3), (tx0 + 2, tz0 + 8), (tx0 - 4, tz0 - 5)]: b.set(x, 0, z, 'short_grass', 'tuft')
    return b

def wizard_tower():
    b = Build('Wizard Tower'); rng = random.Random(21)
    cx, cz = 7, 7
    for (dx, dz) in disc(6.5): b.set(cx + dx, 0, cz + dz, rng.choice(['cobblestone', 'mossy_cobblestone', 'gravel', 'andesite']))
    for (dx, dz) in thick_ring(6.5):
        if rng.random() < 0.5: b.set(cx + dx, 0, cz + dz, None)
    H1 = 22
    for y in range(1, H1):
        r = 4.5 if y < 8 else (3.5 if y < 16 else 3.0)
        for (dx, dz) in thick_ring(r):
            mat = 'deepslate_bricks'
            if y in (1, 7, 15): mat = 'polished_deepslate'
            elif rng.random() < 0.12: mat = 'polished_deepslate'
            b.set(cx + dx, y, cz + dz, mat)
    # ledges
    for (dx, dz) in disc(4.5) - disc(3.5): b.set(cx + dx, 8, cz + dz, 'deepslate_bricks', 'slab')
    for (dx, dz) in disc(3.5) - disc(3.0) : b.set(cx + dx, 16, cz + dz, 'deepslate_bricks', 'slab')
    # balcony at y=12 on south-east
    by = 12
    for (dx, dz) in disc(5.5) - disc(3.5):
        if dx + dz >= 1: b.set(cx + dx, by, cz + dz, 'polished_deepslate', 'slab', h='top')
    for (dx, dz) in thick_ring(5.5):
        if dx + dz >= 1: b.set(cx + dx, by + 1, cz + dz, 'dark_oak_planks', 'fence')
    b.set(cx, by + 1, cz + 3, 'dark_oak_door', 'door', side='S', h='lower'); b.set(cx, by + 2, cz + 3, 'dark_oak_door', 'door', side='S', h='upper')
    b.set(cx + 3, by + 1, cz, None); b.set(cx + 3, by + 2, cz, None)
    # windows purple
    for (x, y, z) in [(cx + 4, 4, cz), (cx - 4, 4, cz), (cx, 10, cz + 3), (cx + 3, 10, cz), (cx, 18, cz + 3), (cx + 3, 18, cz), (cx - 3, 18, cz)]:
        b.set(x, y, z, 'purple_stained_glass', 'pane'); b.set(x, y + 1, z, 'purple_stained_glass', 'pane')
    door(b, cx, 1, cz + 4, 'dark_oak_door', 'S')
    b.set(cx, 0, cz + 5, 'polished_deepslate', 'stairs', f='N'); b.set(cx, 0, cz + 6, None)
    b.set(cx - 1, 2, cz + 5, 'soul_lantern', 'lantern') if False else None
    for x in (cx - 1, cx + 1): b.set(x, 3, cz + 5, 'soul_lantern', 'lantern', hang=True) if False else None
    # roof overhang + tall cone
    ry = H1
    for (dx, dz) in disc(4.5): b.set(cx + dx, ry, cz + dz, 'purpur_block', 'slab')
    radii = [3.5, 3.5, 3.0, 2.5, 2.5, 2.0, 1.5, 1.5, 1.0, 1.0, 0.5]
    for i, r in enumerate(radii):
        y = ry + 1 + i
        R = thick_ring(r) if r >= 1.5 else disc(r)
        for (dx, dz) in R:
            b.set(cx + dx, y, cz + dz, 'purple_concrete' if i % 3 else 'magenta_concrete')
    # hat bend: tip leans east
    top = ry + 1 + len(radii)
    b.set(cx, top, cz, 'purple_concrete'); b.set(cx + 1, top + 1, cz, 'purple_concrete'); b.set(cx + 2, top + 1, cz, 'purple_concrete', 'slab'); b.set(cx + 1, top + 2, cz, 'end_rod', 'rod')
    b.set(cx + 2, top + 2, cz, 'gold_block', 'slab') if False else None
    # stars / floating amethyst
    for (x, y, z) in [(cx + 7, 17, cz + 1), (cx - 7, 19, cz + 3), (cx + 2, 28, cz + 7), (cx + 7, 27, cz - 3)]:
        b.set(x, y, z, 'amethyst_block'); b.set(x, y + 1, z, 'end_rod', 'rod')
    # garden: glow mushrooms / cauldron / bookshelves outside
    b.set(cx + 5, 1, cz + 3, 'cauldron', 'cauldron'); b.set(cx + 5, 0, cz + 3, 'campfire', 'campfire') if False else None
    b.set(cx + 4, 1, cz + 5, 'bookshelf'); b.set(cx + 3, 1, cz + 6, 'amethyst_block')
    b.set(cx - 4, 1, cz + 5, 'soul_lantern', 'lantern'); b.set(cx + 4, 2, cz + 5, 'soul_lantern', 'lantern')
    for (x, z) in [(cx - 2, cz + 6), (cx + 6, cz - 2), (cx - 6, cz - 1)]: b.set(x, 1 if b.get(x, 0, z) else 0, z, 'allium', 'flower')
    # interior spiral stairs (visible via windows)
    order = [(1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1)]
    face = {(1, -1): 'S', (1, 0): 'S', (1, 1): 'W', (0, 1): 'W', (-1, 1): 'N', (-1, 0): 'N', (-1, -1): 'E', (0, -1): 'E'}
    for y in range(1, H1 - 1):
        dx, dz = order[(y - 1) % 8]
        b.set(cx + dx * 2, y, cz + dz * 2, 'dark_oak_planks', 'stairs', f=face[(dx, dz)])
    return b

def castle_gatehouse():
    b = Build('Castle Gatehouse'); rng = random.Random(9)
    def sb(): return rng.choice(['stone_bricks'] * 6 + ['mossy_stone_bricks', 'cobblestone', 'andesite'])
    T = 7; H = 15; gap = 9
    towers = [(0, 0), (T + gap, 0)]
    for (tx, tz) in towers:
        for y in range(0, H):
            for x in range(tx, tx + T):
                for z in range(tz, tz + T):
                    if x in (tx, tx + T - 1) or z in (tz, tz + T - 1) or y == 0: b.set(x, y, z, sb())
        # corner chamfer
        for y in range(0, H): pass
        b.fill(tx, H, tz, tx + T - 1, H, tz + T - 1, 'stone_bricks', 'slab')
        for x in range(tx - 1, tx + T + 1):
            for z in (tz - 1, tz + T):
                b.set(x, H, z, 'stone_bricks'); 
                if (x - tx) % 2 == 0: b.set(x, H + 1, z, 'stone_bricks')
        for z in range(tz, tz + T):
            for x in (tx - 1, tx + T):
                b.set(x, H, z, 'stone_bricks')
                if (z - tz) % 2 == 1: b.set(x, H + 1, z, 'stone_bricks')
        for x in range(tx - 1, tx + T + 1):
            b.set(x, H - 1, tz - 1, 'stone_bricks', 'stairs', f='S', h='top'); b.set(x, H - 1, tz + T, 'stone_bricks', 'stairs', f='N', h='top')
        for z in range(tz, tz + T):
            b.set(tx - 1, H - 1, z, 'stone_bricks', 'stairs', f='E', h='top'); b.set(tx + T, H - 1, z, 'stone_bricks', 'stairs', f='W', h='top')
        # pointy roof
        hip(b, tx + 1, tx + T - 2, tz + 1, tz + T - 2, H + 1, 'dark_oak_planks', o=0, top='full')
        cxT, czT = tx + T // 2, tz + T // 2
        b.set(cxT, H + 5, czT, 'dark_oak_planks', 'fence'); b.set(cxT, H + 6, czT, 'dark_oak_planks', 'fence')
        b.set(cxT + 1, H + 6, czT, 'red_wool') if False else None
        # arrow slits
        for y in (4, 9):
            b.set(tx + 3, y, tz + T - 1, 'iron_bars', 'pane'); b.set(tx + 3, y + 1, tz + T - 1, 'iron_bars', 'pane')
            b.set(tx + T - 1, y, tz + 3, 'iron_bars', 'pane'); b.set(tx + T - 1, y + 1, tz + 3, 'iron_bars', 'pane')
        # banners
        for bx in (tx + 1, tx + 5):
            b.set(bx, 12, tz + T, 'red_banner', 'panel', side='N', t=1); b.set(bx, 11, tz + T, 'red_banner', 'panel', side='N', t=1)
            b.set(bx, 10, tz + T, 'red_banner', 'panel', side='N', t=1, y0=6)
        b.set(tx + 3, 7, tz + T, 'lantern', 'lantern') if False else None
    # connecting wall with gate
    x0, x1 = T, T + gap - 1; z0, z1 = 1, 5; WH = 10
    for y in range(0, WH):
        for x in range(x0, x1 + 1):
            for z in range(z0, z1 + 1):
                if z in (z0, z1) or y in (0, WH - 1): b.set(x, y, z, sb())
    # gate opening (arch) on both faces and through
    gx0, gx1 = x0 + 2, x1 - 2
    for x in range(gx0, gx1 + 1):
        for y in range(1, 6):
            for z in range(z0, z1 + 1): b.set(x, y, z, None)
    for z in (z0, z1):
        b.set(gx0, 5, z, 'stone_bricks', 'stairs', f='W', h='top'); b.set(gx1, 5, z, 'stone_bricks', 'stairs', f='E', h='top')
        for x in range(gx0 + 1, gx1): b.set(x, 6, z, 'stone_bricks')
    for x in range(gx0, gx1 + 1):
        for z in range(z0, z1 + 1): b.set(x, 0, z, 'gravel' if False else 'cobblestone')
    # portcullis half down
    for x in range(gx0, gx1 + 1):
        for y in (4, 5): b.set(x, y, z0 + 1, 'iron_bars', 'pane')
    # battlements on wall walk
    for x in range(x0, x1 + 1):
        for z in (z0, z1):
            b.set(x, WH, z, 'stone_bricks')
            if (x - x0) % 2 == 0: b.set(x, WH + 1, z, 'stone_bricks')
        for z in range(z0 + 1, z1): b.set(x, WH - 1, z, 'spruce_planks')
    b.set(gx0 + 2, WH + 1, z1, 'stone_bricks', 'wall') if False else None
    # torches / lanterns at gate
    b.set(gx0 - 1, 4, z1 + 1, 'lantern', 'lantern') if False else None
    b.set(gx0 - 1, 3, z1 + 1, 'torch', 'torch', side='N'); b.set(gx1 + 1, 3, z1 + 1, 'torch', 'torch', side='N')
    # banner over gate
    for (y, y0) in ((8, 0), (7, 6)): b.set((x0 + x1) // 2, y, z1 + 1, 'blue_banner', 'panel', side='N', t=1, y0=y0)
    # moat + bridge
    for x in range(-2, 2 * T + gap + 2):
        for z in range(9, 12): b.set(x, -1, z, 'water')
    for x in range(-2, 2 * T + gap + 2): b.set(x, -1, 8, 'stone_bricks'); b.set(x, -1, 12, 'stone_bricks')
    for z in range(6, 14):
        for x in range(gx0, gx1 + 1): b.set(x, 0 if 8 <= z <= 12 else -1, z, 'spruce_planks', 'slab' if 8 <= z <= 12 else 'full')
    for z in (8, 12):
        b.set(gx0 - 1, 0, z, 'spruce_log'); b.set(gx1 + 1, 0, z, 'spruce_log')
        b.set(gx0 - 1, 1, z, 'lantern', 'lantern'); b.set(gx1 + 1, 1, z, 'lantern', 'lantern')
    for z in range(9, 12): b.set(gx0 - 1, 1, z, 'spruce_planks', 'fence'); b.set(gx1 + 1, 1, z, 'spruce_planks', 'fence')
    for z in range(9, 12): b.set(gx0 - 1, 0, z, 'spruce_planks', 'slab'); b.set(gx1 + 1, 0, z, 'spruce_planks', 'slab')
    for z in range(9, 12): b.set(gx0 - 1, 1, z, None); b.set(gx1 + 1, 1, z, None)
    for z in range(9, 12): b.set(gx0 - 1, 0, z, 'spruce_planks', 'fence'); b.set(gx1 + 1, 0, z, 'spruce_planks', 'fence')
    return b

def modern_house():
    b = Build('Modern House'); rng = random.Random(4)
    # ground floor
    X0, X1, Z0, Z1 = 0, 12, 0, 8
    b.fill(X0, 0, Z0, X1, 0, Z1, 'smooth_stone')
    b.walls(X0, Z0, X1, Z1, 1, 4, 'white_concrete')
    for x in range(X0 + 1, X1):
        for y in range(1, 4): b.set(x, y, Z1, 'glass')
    for x in (4, 8): b.fill(x, 1, Z1, x, 3, Z1, 'black_concrete')
    b.set(10, 1, Z1, None); b.set(10, 2, Z1, None)
    b.set(10, 1, Z1, 'iron_door', 'door', side='S', h='lower'); b.set(10, 2, Z1, 'iron_door', 'door', side='S', h='upper')
    b.set(10, 1, Z1 - 1, 'stone_pressure_plate', 'plate')
    for z in range(Z0 + 2, Z1 - 1): b.set(X1, 2, z, 'glass'); b.set(X1, 3, z, 'glass') if z != 4 else None
    b.fill(X0 - 1, 5, Z0 - 1, X1 + 1, 5, Z1 + 1, 'smooth_stone', 'slab')
    b.fill(X0, 4, Z0, X1, 4, Z1, 'white_concrete')
    for x in range(X0 + 1, X1): b.set(x, 4, Z1, 'white_concrete')
    for (x, z) in [(3, 7), (7, 7), (11, 7)]: b.set(x, 4, z - 2, 'sea_lantern')
    # upper floor, offset and cantilevered east/south
    U0, U1, V0, V1 = 5, 16, -1, 7
    b.fill(U0, 5, V0, U1, 5, V1, 'gray_concrete')
    b.walls(U0, V0, U1, V1, 6, 8, 'gray_concrete')
    for x in range(U0 + 1, U1):
        for y in (6, 7): b.set(x, y, V1, 'light_blue_stained_glass' if False else 'glass')
    for x in (U0 + 4, U0 + 8): b.fill(x, 6, V1, x, 7, V1, 'black_concrete')
    for z in range(V0 + 1, V1):
        for y in (6, 7): b.set(U1, y, z, 'glass')
    b.fill(U0, 9, V0, U1, 9, V1, 'black_concrete')
    for x in range(U0, U1 + 1):
        b.set(x, 10, V0, 'smooth_stone', 'slab'); b.set(x, 10, V1, 'smooth_stone', 'slab')
    for z in range(V0, V1 + 1):
        b.set(U0, 10, z, 'smooth_stone', 'slab'); b.set(U1, 10, z, 'smooth_stone', 'slab')
    # support pillar under cantilever
    b.fill(15, 0, 6, 15, 4, 6, 'black_concrete'); b.fill(15, 0, 0, 15, 4, 0, 'black_concrete')
    b.fill(13, 0, 6, 16, 0, 7, 'smooth_stone') if False else None
    # roof terrace: solar panels (daylight detectors) + plants
    for x in range(U0 + 1, U0 + 7, 2):
        for z in range(V0 + 1, V1 - 1, 2): b.set(x, 10, z, 'daylight_detector', 'detector')
    b.set(U1 - 2, 10, V1 - 2, 'azalea_leaves'); b.set(U1 - 3, 10, V1 - 2, 'moss_block', 'carpet' if False else 'full')
    # balcony on west part of the first floor roof
    for x in range(X0, U0):
        b.set(x, 6, Z0 - 1, 'glass', 'pane'); b.set(x, 6, Z1 + 1, 'glass', 'pane')
    for z in range(Z0, Z1 + 1): b.set(X0 - 1, 6, z, 'glass', 'pane')
    b.set(X0 - 1, 6, Z0 - 1, 'glass', 'pane'); b.set(X0 - 1, 6, Z1 + 1, 'glass', 'pane')
    b.set(1, 6, 2, 'white_wool', 'carpet') if False else None
    b.set(2, 6, 5, 'birch_planks', 'stairs', f='W'); b.set(1, 6, 5, 'birch_planks', 'stairs', f='E') if False else None
    b.set(2, 6, 2, 'flower_pot', 'pot', plant='cornflower')
    # pool deck
    PZ0, PZ1 = 10, 15
    b.fill(-1, -1, PZ0, 16, -1, PZ1 + 1, 'birch_planks')
    b.fill(1, -1, PZ0 + 1, 9, -1, PZ1 - 1, 'water')
    b.fill(1, -2, PZ0 + 1, 9, -2, PZ1 - 1, 'light_blue_concrete') if False else None
    for x in range(0, 11):
        b.set(x, -1, PZ0, 'quartz_block'); b.set(x, -1, PZ1, 'quartz_block')
    for z in range(PZ0, PZ1 + 1): b.set(0, -1, z, 'quartz_block'); b.set(10, -1, z, 'quartz_block')
    b.fill(-1, -1, 9, 16, -1, 9, 'smooth_stone')
    b.fill(11, 1, 8, 11, 3, 8, 'black_concrete'); b.set(11, 2, 9, 'stone_button', 'button', side='N')
    for z in (11, 13): b.set(12, 0, z, 'white_wool', 'slab' if False else 'carpet'); 
    b.set(12, 0, 11, 'white_bed', 'bed', part='foot', f='E') if False else None
    for (x, z) in [(12, 11), (12, 13)]:
        b.set(x, 0, z, 'birch_planks', 'slab'); b.set(x + 1, 0, z, 'birch_planks', 'stairs', f='E')
    b.set(14, 0, 12, 'birch_planks', 'fence') if False else None
    for (x, z) in [(-1, 16), (16, 16), (16, 9)]:
        b.set(x, 0, z, 'flower_pot', 'pot', plant='poppy') if False else None
    for (x, z) in [(-2, 9), (-2, 16), (17, 16)]:
        b.set(x, -1, z, 'moss_block'); b.set(x, 0, z, 'azalea_leaves'); b.set(x, 1, z, 'azalea_leaves')
    for (x, z) in [(3, 9), (7, 9), (13, 9)]: b.set(x, 0, z, 'lantern', 'lantern') if False else None
    # interior bits
    b.set(2, 1, 2, 'gray_wool', 'slab' if False else 'full'); b.set(3, 1, 2, 'gray_wool', 'full') if False else None
    for x in (2, 3, 4): b.set(x, 1, 1, 'quartz_block', 'stairs', f='N') if False else None
    b.set(6, 1, 3, 'birch_planks', 'fence'); b.set(6, 2, 3, 'white_carpet', 'carpet')
    b.set(5, 1, 3, 'quartz_block', 'stairs', f='W'); b.set(7, 1, 3, 'quartz_block', 'stairs', f='E')
    return b

def ferris_wheel():
    b = Build('Ferris Wheel'); rng = random.Random(2)
    R = 10; hx, hy = 13, 13; wz = 3
    import math
    # platform
    b.fill(-1, 0, -2, 27, 0, 12, 'smooth_stone')
    for x in range(-1, 28, 2):
        b.set(x, 0, 12, 'yellow_concrete'); b.set(x + 1, 0, 12, 'black_concrete') if x + 1 <= 27 else None
    # rim: 4-connected pixel circle in x-y plane
    rim = set()
    for a in range(0, 720):
        t = math.radians(a / 2)
        rim.add((round(hx + R * math.cos(t)), round(hy + R * math.sin(t))))
    cols = ['red_concrete', 'yellow_concrete', 'light_blue_concrete', 'lime_concrete']
    for i, (x, y) in enumerate(sorted(rim, key=lambda p: math.atan2(p[1] - hy, p[0] - hx))):
        b.set(x, y, wz, 'white_concrete')
    # lights on rim every 45deg handled by cabins; spokes
    for k in range(8):
        t = math.radians(k * 45)
        for p in line3((hx, hy, wz), (round(hx + (R - 1) * math.cos(t)), round(hy + (R - 1) * math.sin(t)), wz)):
            if p != (hx, hy, wz): b.set(*p, 'light_gray_concrete')
    b.set(hx, hy, wz, 'gold_block'); b.set(hx, hy, wz - 1, 'iron_block'); b.set(hx, hy, wz + 1, 'iron_block')
    # A-frame supports behind and in front
    for zz in (wz - 2, wz + 2):
        for p in line3((hx - 7, 1, zz), (hx, hy - 1, zz)): b.set(*p, 'blue_concrete')
        for p in line3((hx + 7, 1, zz), (hx, hy - 1, zz)): b.set(*p, 'blue_concrete')
        b.set(hx, hy, zz, 'blue_concrete')
        for x in range(hx - 8, hx - 5): b.set(x, 1, zz, 'polished_andesite')
        for x in range(hx + 6, hx + 9): b.set(x, 1, zz, 'polished_andesite')
    for zz in range(wz - 1, wz + 2): b.set(hx, hy, zz, 'iron_block')
    b.set(hx, hy, wz, 'gold_block')
    # cabins hanging from rim at 8 points, in front (z = wz+1..wz+3)?? place on wheel plane side-by-side
    for k in range(8):
        t = math.radians(k * 45 + 22.5)
        px, py = round(hx + R * math.cos(t)), round(hy + R * math.sin(t))
        col = cols[k % 4]
        cy = py - 3
        if cy < 2: continue
        # hanger
        b.set(px, py - 1, wz, 'chain', 'rod')
        for x in range(px - 1, px + 2):
            for z in range(wz - 1, wz + 2):
                b.set(x, cy, z, col, 'slab', h='top') if False else b.set(x, cy - 1, z, col)
                b.set(x, cy + 1, z, col, 'slab')
        for x in (px - 1, px + 1):
            for z in (wz - 1, wz + 1): b.set(x, cy, z, 'iron_bars', 'pane')
        b.set(px, py - 2, wz, 'chain', 'rod')
    # queue fence + ticket booth
    for x in range(2, 10): b.set(x, 1, 9, 'spruce_planks', 'fence')
    for x in range(4, 12): b.set(x, 1, 7, 'spruce_planks', 'fence')
    booth = (19, 7)
    bx, bz = booth
    b.walls(bx, bz, bx + 4, bz + 3, 1, 2, 'white_concrete')
    b.set(bx + 2, 2, bz + 3, 'glass', 'pane') if False else b.set(bx + 2, 2, bz + 3, None)
    b.set(bx + 1, 2, bz + 3, None); b.set(bx + 3, 2, bz + 3, None)
    b.set(bx + 2, 1, bz + 3, 'birch_planks', 'slab', h='top')
    for x in range(bx - 1, bx + 6):
        for z in range(bz - 1, bz + 5):
            b.set(x, 3, z, 'red_wool' if (x - bx) % 2 == 0 else 'white_wool', 'full')
    for x in range(bx - 1, bx + 6): b.set(x, 4, bz + 1, 'red_wool' if (x - bx) % 2 == 0 else 'white_wool'); b.set(x, 4, bz + 2, 'red_wool' if (x - bx) % 2 == 0 else 'white_wool')
    b.set(bx + 5, 1, bz + 4, 'lantern', 'lantern') if False else None
    # lamp posts
    for (x, z) in [(0, 11), (26, 11), (0, -1), (26, -1)]:
        b.fill(x, 1, z, x, 3, z, 'dark_oak_planks', 'fence'); b.set(x, 4, z, 'lantern', 'lantern')
    # flower planters
    for (x, z) in [(3, 11), (10, 11), (16, 11)]:
        b.set(x, 1, z, 'spruce_planks', 'slab'); b.set(x + 1, 1, z, 'spruce_planks', 'slab')
    for (x, z, f) in [(3, 11, 'poppy'), (4, 11, 'dandelion'), (10, 11, 'allium'), (11, 11, 'cornflower'), (16, 11, 'poppy'), (17, 11, 'oxeye_daisy')]:
        b.set(x, 1, z, 'grass_block'); b.set(x, 2, z, f, 'flower')
    return b

def rocket():
    b = Build('Rocket Launch Pad'); rng = random.Random(8)
    cx, cz = 8, 8
    # pad
    for (dx, dz) in disc(8.5): b.set(cx + dx, 0, cz + dz, 'polished_andesite')
    for (dx, dz) in thick_ring(8.5): b.set(cx + dx, 0, cz + dz, 'yellow_concrete' if (dx + dz) % 2 == 0 else 'black_concrete')
    for (dx, dz) in disc(3.5): b.set(cx + dx, 0, cz + dz, 'coal_block' if False else 'gray_concrete')
    # flame grate / engines
    for (dx, dz) in disc(1.5): b.set(cx + dx, 1, cz + dz, 'shroomlight')
    for (dx, dz) in thick_ring(2.5): b.set(cx + dx, 1, cz + dz, 'gray_concrete')
    body_top = 20
    for y in range(2, body_top):
        R = thick_ring(2.5)
        for (dx, dz) in R:
            mat = 'white_concrete'
            if y in (5, 6, 15): mat = 'red_concrete'
            b.set(cx + dx, y, cz + dz, mat)
    # windows (portholes)
    for y in (11, 12): b.set(cx, y, cz + 3, 'light_blue_stained_glass'); b.set(cx + 3, y, cz, 'light_blue_stained_glass')
    b.set(cx, 9, cz + 3, 'light_blue_stained_glass') if False else None
    # nose cone
    for i, r in enumerate((2.5, 2.0, 1.5, 1.5, 1.0, 0.5)):
        y = body_top + i
        pts = thick_ring(r) if r >= 1.5 else disc(r)
        for (dx, dz) in pts: b.set(cx + dx, y, cz + dz, 'red_concrete' if i >= 2 else 'white_concrete')
    b.set(cx, body_top + 6, cz, 'red_concrete'); b.set(cx, body_top + 7, cz, 'end_rod', 'rod')
    # fins
    for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for k in range(1, 3):
            x, z = cx + dx * (3 + k), cz + dz * (3 + k)
            for y in range(2, 7 - k):
                b.set(x, y, z, 'red_concrete')
        x, z = cx + dx * 4, cz + dz * 4
        b.set(x, 6, z, 'red_concrete'); b.set(x, 7, z, 'red_concrete')
    # launch tower (east)
    tx0, tz0 = cx + 6, cz - 2
    for y in range(1, 26):
        for (x, z) in [(tx0, tz0), (tx0 + 2, tz0), (tx0, tz0 + 2), (tx0 + 2, tz0 + 2)]: b.set(x, y, z, 'light_gray_concrete' if y % 4 else 'red_concrete')
        if y % 4 == 0:
            for x in range(tx0, tx0 + 3):
                b.set(x, y, tz0, 'red_concrete'); b.set(x, y, tz0 + 2, 'red_concrete')
            for z in range(tz0, tz0 + 3):
                b.set(tx0, y, z, 'red_concrete'); b.set(tx0 + 2, y, z, 'red_concrete')
        else:
            b.set(tx0 + 1, y, tz0, 'iron_bars', 'pane'); b.set(tx0 + 1, y, tz0 + 2, 'iron_bars', 'pane')
            b.set(tx0, y, tz0 + 1, 'iron_bars', 'pane'); b.set(tx0 + 2, y, tz0 + 1, 'iron_bars', 'pane')
    for y in range(1, 26): b.set(tx0 + 1, y, tz0 + 1, 'ladder', 'ladder', side='E') if False else None
    b.set(tx0 + 1, 26, tz0 + 1, 'lit_redstone_lamp')
    for x in range(tx0, tx0 + 3):
        for z in range(tz0, tz0 + 3): b.set(x, 26, z, 'smooth_stone', 'slab') if (x, z) != (tx0 + 1, tz0 + 1) else None
    # gantry arms to rocket
    for y in (12, 20):
        for x in range(cx + 3, tx0): b.set(x, y, cz, 'iron_block' if False else 'smooth_stone', 'slab')
        for x in range(cx + 3, tx0): b.set(x, y + 1, cz - 1, 'iron_bars', 'pane'); b.set(x, y + 1, cz + 1, 'iron_bars', 'pane')
    # fuel tanks and control building (west)
    for (x, z) in [(cx - 7, cz + 5), (cx - 5, cz + 7)] if False else []:
        pass
    for z in range(cz + 2, cz + 7): b.set(cx + 9, 1, z, 'iron_bars', 'pane') if False else None
    # control bunker
    cb = (cx - 12, cz + 3)
    X, Z = cb
    b.fill(X, 0, Z, X + 5, 0, Z + 4, 'smooth_stone')
    b.walls(X, Z, X + 5, Z + 4, 1, 3, 'light_gray_concrete')
    for x in range(X + 1, X + 5): b.set(x, 2, Z + 4, 'glass')
    b.fill(X - 1, 4, Z - 1, X + 6, 4, Z + 5, 'smooth_stone', 'slab')
    b.set(X + 4, 5, Z + 1, 'daylight_detector', 'detector'); b.set(X + 1, 5, Z + 1, 'lightning_rod', 'rod'); b.set(X + 1, 6, Z + 1, 'lightning_rod', 'rod')
    b.set(X + 2, 1, Z + 4, 'iron_door', 'door', side='S', h='lower'); b.set(X + 2, 2, Z + 4, 'iron_door', 'door', side='S', h='upper')
    b.set(X + 2, 1, Z + 3, 'stone_pressure_plate', 'plate'); b.set(X + 3, 1, Z + 5, 'stone_button', 'button', side='N')
    for x in range(X + 6, cx - 8): b.set(x, -1, Z + 2, 'gray_concrete')
    return b

# ---------------------------------------------------------------- mini builds
def mini_well():
    b = Build('Village Well')
    b.walls(0, 0, 4, 4, 0, 1, 'cobblestone')
    b.fill(1, -1, 1, 3, -1, 3, 'water'); b.fill(1, 0, 1, 3, 0, 3, 'water')
    for (x, z) in ((0, 0), (4, 0), (0, 4), (4, 4)): b.fill(x, 2, z, x, 3, z, 'spruce_planks', 'fence')
    hip(b, 0, 4, 0, 4, 4, 'spruce_planks', o=0, top='slab')
    b.set(2, 3, 2, 'chain', 'rod'); b.set(2, 2, 2, 'chain', 'rod') if False else None
    b.set(2, 2, 2, 'cauldron', 'cauldron') if False else None
    b.set(2, 4, 2, 'chain', 'rod'); b.set(2, 5, 2, 'chain', 'rod')
    b.set(2, 3, 2, 'lantern', 'lantern', hang=True)
    return b

def mini_lamp():
    b = Build('Street Lamp')
    b.set(1, 0, 1, 'stone_bricks', 'wall'); b.fill(1, 1, 1, 1, 3, 1, 'dark_oak_planks', 'fence')
    b.set(1, 4, 1, 'stone_bricks', 'wall')
    for (x, z) in ((0, 1), (2, 1)):
        b.set(x, 4, z, 'dark_oak_planks', 'fence'); b.set(x, 3, z, 'lantern', 'lantern', hang=True)
    b.set(1, 5, 1, 'stone_bricks', 'slab')
    return b

def mini_stall():
    b = Build('Market Stall')
    b.fill(0, 0, 0, 4, 0, 2, 'spruce_planks', 'slab')
    for (x, z) in ((0, 0), (4, 0), (0, 2), (4, 2)): b.fill(x, 1, z, x, 2, z, 'spruce_planks', 'fence')
    for x in range(1, 4): b.set(x, 1, 2, 'barrel') if x != 2 else b.set(x, 1, 2, 'spruce_planks', 'slab', h='top')
    b.set(1, 2, 2, 'pumpkin'); b.set(3, 2, 2, 'melon')
    b.set(2, 2, 2, 'hay_block', 'full') if False else None
    for x in range(-1, 6):
        col = 'red_wool' if x % 2 == 0 else 'white_wool'
        b.set(x, 3, 3, col, 'full'); b.set(x, 3, 2, col); b.set(x, 3, 1, col); b.set(x, 3, 0, col)
        b.set(x, 3, -1, col) if False else None
    for x in range(-1, 6):
        col = 'red_wool' if x % 2 == 0 else 'white_wool'
        b.set(x, 4, 1, col); b.set(x, 4, 0, col)
    b.set(-1, 0, 3, 'barrel') if False else None
    b.set(5, 0, 1, 'chest', 'chest')
    return b

def mini_fountain():
    b = Build('Park Fountain')
    for (dx, dz) in thick_ring(3.5): b.set(3 + dx, 0, 3 + dz, 'stone_bricks', 'slab', h='top')
    for (dx, dz) in disc(3.5) - thick_ring(3.5): b.set(3 + dx, 0, 3 + dz, 'water'); b.set(3 + dx, -1, 3 + dz, 'stone_bricks')
    b.fill(3, 0, 3, 3, 2, 3, 'stone_brick' if False else 'stone_bricks', 'wall')
    for (dx, dz) in disc(1.5):
        if (dx, dz) != (0, 0): b.set(3 + dx, 2, 3 + dz, 'stone_bricks', 'slab')
    b.set(3, 3, 3, 'water'); b.set(3, 2, 3, 'sea_lantern')
    for (x, z, f) in [(-1, 0, 'poppy'), (7, 1, 'cornflower'), (0, 7, 'dandelion'), (7, 6, 'allium')]:
        b.set(x, 0, z, f, 'flower')
    return b
