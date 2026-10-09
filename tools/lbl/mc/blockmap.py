"""Layer by Layer block keys, shapes and states -> Minecraft Bedrock block states.

    $PY tools/lbl/mc/blockmap.py              # map every registry block in every shape it can take, check all
    $PY tools/lbl/mc/blockmap.py --fetch [TAG] # refresh mojang-blocks.min.json from Mojang's bedrock-samples

`to_bedrock(v, at)` turns one book cell (`{'b': key, 's': shape, ...state}`, the palette entry of an exported
build) into one Bedrock block. `check(name, states)` validates a block against Mojang's own list
(mojang-blocks.min.json): the name must exist, every state must belong to that block and have an allowed value,
and states we leave out get a default. Anything unknown raises `Unmapped` or `BadState`, never a silent guess.

Sources (all fetched 2026-10-08):
- Mojang/bedrock-samples, tag v1.26.50.4 (latest non-preview release, 2026-09-16, = Bedrock 26.50):
  https://github.com/Mojang/bedrock-samples/releases/tag/v1.26.50.4
  file metadata/vanilladata_modules/mojang-blocks.json (1463 blocks), trimmed into mojang-blocks.min.json.
- Block "version" int: 18168865 = 1.21.60.33. Bedrock has not bumped its block-state version since then:
  pmmp/BedrockData bedrock-1.26.30 canonical_block_states.nbt stores 18168865 on every state, and the newest
  upgrade schemas (pmmp/BedrockBlockUpgradeSchema 0341_1.26.20_to_1.26.30, 0351_1.26.40_to_1.26.50) still
  target 1.21.60.33. A newer number would be wrong; an older one would run the 1.21.60 upgrader over our states
  (it renames door/gate "direction"), so we write exactly this one.
- Orientation tables come from GeyserMC/mappings (Java -> Bedrock block mappings used by the Geyser proxy:
  blocks.json @ cc3afdc for 1.20.5, blocks.nbt @ 021e450 for Java 26.1 decoded with PrismarineJS
  minecraft-data pc/26.1 blocks.json), the 1.21.60 door/gate rename in pmmp's
  0321_1.21.50.29_beta_to_1.21.60.28_beta.json, and minecraft.wiki block state pages
  (https://minecraft.wiki/w/Oak_Stairs, /w/Straw_Bed, /w/Shelf_Mushroom, /w/Commands/structure).
  Java's state meanings are the well documented ones, so each table below says "Java X -> Bedrock Y".
- Checked against structures exported from the game itself (the test structures in
  github.com/SuperLlama88888/holoprint tests/sampleStructures, read only, nothing copied): the file layout and
  block version match a 26.50 export; wall torches, ladders, levers, buttons, wall banners and item frames point
  the way their supporting block says; banner Base colours run black 0 ... white 15; straw beds point at the head;
  2x2 stair rings get the same minecraft:corner values the game wrote; wall heights and posts match 30 of 30.

Book conventions (tools/lbl/README.md): x east, y up, z south. f on stairs = side of the tall back half.
side = the wall a door, trapdoor, torch, ladder, button, lever, banner or shelf hugs.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LBL = os.path.dirname(HERE)
if LBL not in sys.path: sys.path.insert(0, LBL)
import lbl                                  # noqa: F401  (loads the registry and every ext/ module)
from blocks import B
import engine                               # engine.conn_mask / stair_shape: the same rules as the 3D book
from plans import item_of, banner_tail

MOJANG_TAG = 'v1.26.50.4'
MOJANG_URL = 'https://raw.githubusercontent.com/Mojang/bedrock-samples/{tag}/metadata/vanilladata_modules/mojang-blocks.json'
MOJANG_FILE = os.path.join(HERE, 'mojang-blocks.min.json')
BLOCK_VERSION = 18168865                    # 1.21.60.33, see the notes above


class Unmapped(KeyError):
    """A registry key or shape this file does not know how to turn into a Bedrock block."""


class BadState(ValueError):
    """A Bedrock name or state that Mojang's block list does not allow."""


# ---------------------------------------------------------------- Mojang's block list
_MC = None
def mc():
    global _MC
    if _MC is None:
        with open(MOJANG_FILE) as f: _MC = json.load(f)
    return _MC


def props_of(name):
    blocks = mc()['blocks']
    if name not in blocks: raise BadState(f'{name} is not a Bedrock block (Mojang list {mc()["tag"]})')
    return blocks[name]


DEFAULTS = {'torch_facing_direction': 'top'}   # otherwise the first allowed value (false, 0, south, bottom, none...)


def check(name, states):
    """Validate (name, states) against Mojang's list. Returns the full state dict in Mojang's order:
    every state the block has, ours or the default."""
    allowed = props_of(name); props = mc()['properties']
    extra = sorted(set(states) - set(allowed))
    if extra: raise BadState(f'{name} has no state {extra} (it has {allowed})')
    out = {}
    for p in allowed:
        typ, vals = props[p]
        if p not in states:
            out[p] = DEFAULTS.get(p, vals[0]) if DEFAULTS.get(p) in vals else vals[0]; continue
        v = states[p]
        ok = (isinstance(v, bool) if typ == 'bool' else
              isinstance(v, int) and not isinstance(v, bool) if typ == 'int' else isinstance(v, str))
        if not ok or v not in vals: raise BadState(f'{name}: {p}={v!r} is not allowed ({typ} {vals})')
        out[p] = v
    return out


def state_type(p):
    """'bool' (NBT Byte), 'int' (NBT Int) or 'string' (NBT String)."""
    return mc()['properties'][p][0]


def fetch(tag=MOJANG_TAG):
    """Download mojang-blocks.json for a bedrock-samples tag and keep only block names, states and allowed values."""
    import urllib.request
    url = MOJANG_URL.format(tag=tag)
    with urllib.request.urlopen(url, timeout=120) as r: src = json.loads(r.read().decode('utf8'))
    props = {p['name']: [p['type'], [v['value'] for v in p['values']]] for p in src['block_properties']}
    blocks = {it['name']: sorted(p['name'] for p in it.get('properties', [])) for it in src['data_items']}
    for n, ps in blocks.items():
        for p in ps:
            if p not in props: raise SystemExit(f'{n}: state {p} has no definition in {url}')
    lines = ['{', f'"_source": {json.dumps("Trimmed copy of Mojang bedrock-samples metadata/vanilladata_modules/mojang-blocks.json: block names, their states and allowed values. Made by tools/lbl/mc/blockmap.py --fetch.")},',
             f'"tag": {json.dumps(tag)},', f'"url": {json.dumps(url)},',
             f'"release": {json.dumps("https://github.com/Mojang/bedrock-samples/releases/tag/" + tag)},',
             '"properties": {']
    lines += [f'  {json.dumps(k)}: {json.dumps(v)}' + (',' if i < len(props) - 1 else '') for i, (k, v) in enumerate(sorted(props.items()))]
    lines += ['},', '"blocks": {']
    lines += [f'  {json.dumps(k)}: {json.dumps(v)}' + (',' if i < len(blocks) - 1 else '') for i, (k, v) in enumerate(sorted(blocks.items()))]
    lines += ['}', '}']
    with open(MOJANG_FILE, 'w') as f: f.write('\n'.join(lines) + '\n')
    print(f'{MOJANG_FILE}: {len(blocks)} blocks, {len(props)} states from {tag}')


# ---------------------------------------------------------------- direction tables
WORD = {'N': 'north', 'E': 'east', 'S': 'south', 'W': 'west', 'U': 'up', 'D': 'down'}
OPP = {'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E', 'U': 'D', 'D': 'U'}
CW = {'N': 'E', 'E': 'S', 'S': 'W', 'W': 'N'}
CCW = {'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N'}
# facing_direction (int): Bedrock's Direction order. Java ladder/wall sign/banner/button/dispenser/barrel/hopper
# facing=north -> 2, south -> 3, west -> 4, east -> 5, up -> 1, down -> 0 (Geyser).
FACING6 = {'D': 0, 'U': 1, 'N': 2, 'S': 3, 'W': 4, 'E': 5}
# Pistons and end rods swap the horizontal values: Java piston/end_rod facing=north -> 3, east -> 4,
# south -> 2, west -> 5 (Geyser).
FACING6_FLIP = {'D': 0, 'U': 1, 'N': 3, 'S': 2, 'W': 5, 'E': 4}
# direction (int) on beds, grindstones, looms, beehives: Java facing south -> 0, west -> 1, north -> 2, east -> 3.
DIR4 = {'S': 0, 'W': 1, 'N': 2, 'E': 3}
# weirdo_direction (stairs) and trapdoor direction: Java facing east -> 0, west -> 1, south -> 2, north -> 3.
# minecraft.wiki/w/Oak_Stairs: weirdo_direction is "the direction the stairs' full-block side faces", 0 E 1 W 2 S 3 N.
WEIRDO = {'E': 0, 'W': 1, 'S': 2, 'N': 3}
# coral_direction on wall coral fans: Java facing west -> 0, east -> 1, north -> 2, south -> 3 (Geyser 26.1).
CORAL_DIR = {'W': 0, 'E': 1, 'N': 2, 'S': 3}

COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan',
          'purple', 'blue', 'brown', 'green', 'red', 'black']      # wool order: bed colour = index


def snake(s): return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


# ---------------------------------------------------------------- names
ALIAS = {'cloud': 'white_wool', 'light_blue_wool2': 'light_blue_wool'}   # Volume 1 keys that are plain wool
# Registry key -> Bedrock id where they differ (checked against Mojang's list and Bedrock's en_US.lang).
FULL = {
    'bricks': 'brick_block', 'dirt_path': 'grass_path', 'terracotta': 'hardened_clay', 'melon': 'melon_block',
    'snow_block': 'snow', 'magma_block': 'magma', 'nether_bricks': 'nether_brick', 'end_stone_bricks': 'end_bricks',
    'diamond_ore': 'deepslate_diamond_ore', 'gold_ore': 'deepslate_gold_ore',   # the book calls them Deepslate ... Ore
    'pale_moss': 'pale_moss_block', 'sulfur_block': 'sulfur', 'note_block': 'noteblock', 'jack_o_lantern': 'lit_pumpkin',
    'slime_block': 'slime', 'cobweb': 'web', 'sugar_cane': 'reeds', 'azalea_leaves': 'azalea_leaves_flowered',
    'chain': 'iron_chain', 'lily_pad': 'waterlily', 'waxed_copper_block': 'waxed_copper', 'light_gray_glazed_terracotta': 'silver_glazed_terracotta', 'stonecutter': 'stonecutter_block',
    'item_frame': 'frame', 'glow_item_frame': 'glow_frame', 'redstone_dust': 'redstone_wire', 'redstone_dust_off': 'redstone_wire',
    'redstone_torch_off': 'unlit_redstone_torch', 'powered_rail': 'golden_rail', 'powered_rail_on': 'golden_rail',
    'detector_rail_on': 'detector_rail', 'activator_rail_on': 'activator_rail',
    'repeater': 'unpowered_repeater', 'repeater_on': 'powered_repeater', 'comparator': 'unpowered_comparator',
    'comparator_on': 'powered_comparator', 'comparator_sub': 'unpowered_comparator', 'comparator_sub_on': 'powered_comparator',
    'observer_on': 'observer', 'crafter_on': 'crafter', 'oak_door': 'wooden_door', 'oak_trapdoor': 'trapdoor',
    'oak_fence_gate': 'fence_gate', 'oak_button': 'wooden_button', 'oak_pressure_plate': 'wooden_pressure_plate',
    'oak_sign': 'standing_sign', 'spruce_sign': 'spruce_standing_sign',
    'sea_pickle_2': 'sea_pickle', 'sea_pickle_3': 'sea_pickle', 'sea_pickle_4': 'sea_pickle',
}
# Shaped items whose Bedrock id is not the snake_case item name.
SHAPED = {
    'cobblestone_stairs': 'stone_stairs',            # Bedrock's "stone_stairs" are Cobblestone Stairs
    'stone_stairs': 'normal_stone_stairs', 'stone_slab': 'normal_stone_slab',
    'prismarine_brick_stairs': 'prismarine_bricks_stairs',
    'end_stone_brick_stairs': 'end_brick_stairs', 'end_stone_brick_slab': 'end_stone_brick_slab',
}
WOOD_IDS = {'door': {'oak': 'wooden_door'}, 'trapdoor': {'oak': 'trapdoor'}, 'fence_gate': {'oak': 'fence_gate'},
            'button': {'oak': 'wooden_button'}, 'pressure_plate': {'oak': 'wooden_pressure_plate'},
            'wall_sign': {'oak': 'wall_sign'}}


def mcname(s): return 'minecraft:' + s


def wood_of(key):
    """'spruce' for spruce_planks / spruce_sign / spruce_shelf, None otherwise."""
    m = re.fullmatch(r'(.+?)_(planks|sign|shelf|log|stem|door|trapdoor|fence_gate|button|pressure_plate)', key)
    return m.group(1) if m else None


def wood_block(key, kind):
    """The <wood>_<kind> Bedrock id for a wood-family key (oak exceptions included)."""
    w = wood_of(key)
    if w is None: raise Unmapped(f'{key}: not a wood key, cannot make a {kind}')
    return mcname(WOOD_IDS.get(kind, {}).get(w, f'{w}_{kind}'))


def full_id(key):
    """(Bedrock id, extra states) for a registry key used as itself (full block, plant, small block)."""
    k = ALIAS.get(key, key); extra = {}
    if k.endswith('_lit') and ('candle' in k or 'copper_bulb' in k): k = k[:-4]; extra['lit'] = True
    return mcname(FULL.get(k, k)), extra


def shaped_id(key, field):
    """Bedrock id of a stairs/slab/fence/wall made from `key`, from the item name in the registry."""
    item = B[key].get(field)
    if not item: raise Unmapped(f'{key} has no {field} in the registry')
    s = snake(item)
    return mcname(SHAPED.get(s, s))


# ---------------------------------------------------------------- neighbours
class _Near:
    """Adapter so engine.conn_mask / stair_shape (which call build.get(x, y, z)) see the cell at (0,0,0)."""
    def __init__(self, at): self.at = at
    def get(self, x, y, z): return self.at(x, y, z)


def _solid(n): return n is not None and n['s'] == 'full' and not B[n['b']]['translucent']


def _is_water(n): return n is not None and n['b'] == 'water'


def _cube(n): return n is not None and n['s'] == 'full' and n['b'] not in ('water', 'lava')   # glass counts


# ---------------------------------------------------------------- shapes
def P(name, **states): return {'name': name, 'states': states}


def sh_full(key, v, at):
    if key in ('water', 'lava'): return P(mcname(key), liquid_depth=0)
    name, st = full_id(key)
    props = props_of(name); f = v.get('f')
    if 'pillar_axis' in props: st['pillar_axis'] = v.get('a', 'y')
    if 'persistent_bit' in props: st['persistent_bit'] = True           # placed leaves never decay
    if 'minecraft:cardinal_direction' in props: st['minecraft:cardinal_direction'] = WORD[f if f in CW else 'S']
    if 'minecraft:facing_direction' in props: st['minecraft:facing_direction'] = WORD[f or 'S']   # observer
    if 'facing_direction' in props:
        st['facing_direction'] = (FACING6_FLIP if name in FLIPPED else FACING6)[f or 'S']
    if 'direction' in props: st['direction'] = DIR4[f if f in CW else 'S']   # beehive, loom
    if 'orientation' in props: st['orientation'] = crafter_orientation(f or 'S')
    st.update(EXTRA.get(key, {}))
    if 'huge_mushroom_bits' in props: st['huge_mushroom_bits'] = 15 if name == 'minecraft:mushroom_stem' else 14
    return P(name, **st)


FLIPPED = {'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:end_rod'}
EXTRA = {'observer_on': {'powered_bit': True}, 'crafter_on': {'triggered_bit': True},
         'farmland': {'moisturized_amount': 7}}


def crafter_orientation(f):
    # Java crafter orientation north_up etc. maps 1:1 (Geyser 26.1); up/down faces use up_north / down_south.
    return {'U': 'up_north', 'D': 'down_south'}.get(f, WORD[f] + '_up')


def sh_slab(key, v, at):
    return P(shaped_id(key, 'slab'), **{'minecraft:vertical_half': 'top' if v.get('h') == 'top' else 'bottom'})


def sh_stairs(key, v, at):
    F = v['f']; shape, d = engine.stair_shape(_Near(at), (0, 0, 0), v)
    # Java StairBlock: outer_left when the stair behind faces CCW(facing), inner_left when the stair in front
    # does. engine.stair_shape is the same rule; Bedrock 26.40+ uses Java's names for minecraft:corner.
    corner = 'none' if shape == 'straight' else f"{shape}_{'left' if d == CCW[F] else 'right'}"
    return P(shaped_id(key, 'stairs'), weirdo_direction=WEIRDO[F], upside_down_bit=v.get('h') == 'top',
             **{'minecraft:corner': corner})


def _conn(at, v):
    return engine.conn_mask(_Near(at), (0, 0, 0), v)


def sh_fence(key, v, at):
    m = _conn(at, v)
    return P(shaped_id(key, 'fence'), **{f'minecraft:connection_{WORD[d]}': d in m for d in 'NESW'})


def sh_pane(key, v, at):
    m = _conn(at, v)
    name = mcname(key) if key.endswith('bars') else mcname(snake(item_of(v)))
    return P(name, **{f'minecraft:connection_{WORD[d]}': d in m for d in 'NESW'})


POST_ABOVE = ('torch', 'lantern', 'panel', 'hanging_sign', 'chain', 'rod', 'button', 'lever')


def sh_wall(key, v, at):
    """Java WallBlock: a side is tall when the block above covers it; the post shows unless the wall runs
    straight through (N+S or E+W only) with both sides tall or nothing on top."""
    m = _conn(at, v); up = at(0, 1, 0)
    up_m = _conn(lambda x, y, z: at(x, y + 1, z), up) if (up and up['s'] == 'wall') else ''
    side = {d: ('none' if d not in m else 'tall' if (_cube(up) or d in up_m) else 'short') for d in 'NESW'}
    straight = set(m) in ({'N', 'S'}, {'E', 'W'})
    if up and up['s'] == 'wall': post = True
    elif not straight: post = True
    elif all(side[d] == 'tall' for d in m): post = False
    else: post = bool(up and (up['s'] in POST_ABOVE or _cube(up)))
    return P(shaped_id(key, 'wall'), wall_post_bit=post, **{f'wall_connection_type_{WORD[d]}': side[d] for d in 'NESW'})


def sh_gate(key, v, at):
    name = mcname(FULL.get(key, key)) if key.endswith('_fence_gate') else wood_block(key, 'fence_gate')
    a = v.get('a', 'x')
    # Java gate facing north/south spans east-west; Bedrock cardinal_direction = Java facing (Geyser 26.1).
    along = 'EW' if a == 'x' else 'NS'
    in_wall = any((at(*{'E': (1, 0, 0), 'W': (-1, 0, 0), 'N': (0, 0, -1), 'S': (0, 0, 1)}[d]) or {}).get('s') == 'wall' for d in along)
    return P(name, open_bit=bool(v.get('open')), in_wall_bit=in_wall,
             **{'minecraft:cardinal_direction': 'south' if a == 'x' else 'east'})


def sh_door(key, v, at):
    name = mcname(FULL.get(key, key)) if key.endswith('_door') else wood_block(key, 'door')
    side = v['side']
    # Java door facing points from the panel into the cell (closed facing=east hugs the west edge), so
    # Java facing = OPP[side]. Bedrock's door cardinal_direction is Java facing turned clockwise: Java north ->
    # east, east -> south, south -> west, west -> north (Geyser 26.1; pmmp 1.21.60 schema maps the old
    # direction 0,1,2,3 = Java east,south,west,north to south,west,north,east). CW[OPP[side]] == CCW[side].
    # Re-checked 2026-10-09: the same pmmp remap turns fence gates' old 0 (= Java south) into "south", so doors
    # really are a quarter turn off from gates; HoloPrint's door model (blockStateDefinitions.json: "west" = no
    # turn, panel on the north edge) agrees. minecraft.wiki/w/Door's Bedrock row reuses the Java wording
    # ("facing east occupies the west part"); for doors that wording is wrong, so do not "fix" this from it.
    # The book draws every door closed on `side`, so the game door is closed too.
    return P(name, upper_block_bit=v.get('h') == 'upper', open_bit=False, door_hinge_bit=_hinge(v, at) == 'right',
             **{'minecraft:cardinal_direction': WORD[CCW[side]]})


def _hinge(v, at):
    """The book has no hinge, so do what the game does when you place a door next to another one (Java
    DoorBlock.getHinge): with the player facing the way the door faces (Java facing = OPP[side]), a door on the
    left gets its hinge on the right, so a double door opens from the middle. Left of OPP[side] is CW[side]."""
    if v.get('hinge') in ('left', 'right'): return v['hinge']
    def door_at(d):
        n = at(*{'E': (1, 0, 0), 'W': (-1, 0, 0), 'N': (0, 0, -1), 'S': (0, 0, 1)}[d])
        return bool(n and n['s'] == 'door' and n.get('side') == v['side'] and n.get('h') == v.get('h'))
    return 'right' if door_at(CW[v['side']]) and not door_at(CCW[v['side']]) else 'left'


def sh_trapdoor(key, v, at):
    name = mcname(FULL.get(key, key)) if key.endswith('_trapdoor') else wood_block(key, 'trapdoor')
    if v.get('open'):
        # Java open trapdoor facing=north hugs the south edge, so Java facing = OPP[side]; Bedrock direction uses
        # the stairs numbering (Java east 0, west 1, south 2, north 3; Geyser).
        return P(name, open_bit=True, upside_down_bit=v.get('h') == 'top', direction=WEIRDO[OPP[v['side']]])
    return P(name, open_bit=False, upside_down_bit=v.get('h') == 'top', direction=0)


def sh_carpet(key, v, at):
    k = ALIAS.get(key, key)
    if k.endswith('_wool'): k = k[:-5] + '_carpet'
    if k in PETALS: return sh_plant(k, v, at)
    return P(*full_id(k)[:1])


PETALS = ('pink_petals', 'wildflowers', 'leaf_litter')


def sh_plate(key, v, at):
    name = mcname(FULL.get(key, key)) if key.endswith('pressure_plate') else wood_block(key, 'pressure_plate')
    return P(name, redstone_signal=0)


def sh_button(key, v, at):
    name = mcname(FULL.get(key, key)) if key.endswith('_button') else wood_block(key, 'button')
    side = v.get('side')
    # Java wall button facing=north (on a south wall) -> facing_direction 2; floor -> 1, ceiling -> 0 (Geyser).
    return P(name, button_pressed_bit=False, facing_direction=FACING6[OPP[side]] if side else 1)


def sh_lever(key, v, at):
    side = v.get('side')
    # Java wall lever facing=north -> lever_direction "north" (the way it sticks out, away from the wall);
    # floor lever along z -> up_north_south (Geyser).
    return P('minecraft:lever', open_bit=False, lever_direction=WORD[OPP[side]] if side else 'up_north_south')


def sh_torch(key, v, at):
    name, _ = full_id(key); side = v.get('side')
    # Java wall_torch facing=north (stuck on the wall to its south) -> torch_facing_direction "south" (Geyser):
    # Bedrock names the wall it is on, which is our `side`.
    return P(name, torch_facing_direction=WORD[side] if side else 'top')


def sh_ladder(key, v, at):
    # Java ladder facing=north (on the wall to its south) -> facing_direction 2 (Geyser), i.e. away from the wall.
    return P('minecraft:ladder', facing_direction=FACING6[OPP[v['side']]])


def sh_lantern(key, v, at): return P(full_id(key)[0], hanging=bool(v.get('hang')))


def sh_bed(key, v, at):
    color = key[:-4]
    if color not in COLORS: raise Unmapped(f'{key}: unknown bed colour')
    # Java bed facing = direction the head points -> Bedrock direction south 0, west 1, north 2, east 3 (Geyser).
    r = P('minecraft:bed', direction=DIR4[v['f']], head_piece_bit=v.get('part') == 'head', occupied_bit=False)
    r['be'] = {'id': ('string', 'Bed'), 'color': ('byte', COLORS.index(color))}
    return r


def sh_straw_bed(key, v, at):
    # minecraft.wiki/w/Straw_Bed: cardinal_direction is "the direction the head of the straw bed is pointing".
    return P('minecraft:straw_bed', head_piece_bit=v.get('part') == 'head', occupied_bit=False,
             **{'minecraft:cardinal_direction': WORD[v.get('f', 'N')]})


def sh_chest(key, v, at):
    f = v.get('f')
    if f not in CW:   # the book's chest has no front: face the first open side, south first (toward the viewer)
        f = next((d for d in 'SENW' if not _solid(at(*{'S': (0, 0, 1), 'E': (1, 0, 0), 'N': (0, 0, -1), 'W': (-1, 0, 0)}[d]))), 'S')
    return P(full_id(key)[0], **{'minecraft:cardinal_direction': WORD[f]})


def sh_hopper(key, v, at): return P('minecraft:hopper', facing_direction=FACING6[v.get('f', 'D')], toggle_bit=False)


def sh_campfire(key, v, at):
    return P(full_id(key)[0], extinguished=v.get('lit') is False, **{'minecraft:cardinal_direction': WORD[v.get('f', 'S')]})


def sh_anvil(key, v, at): return P('minecraft:anvil', **{'minecraft:cardinal_direction': WORD[v.get('f', 'S')]})


def sh_cauldron(key, v, at): return P('minecraft:cauldron', fill_level=6 if v.get('water') else 0, cauldron_liquid='water')   # 6 = full


def sh_bell(key, v, at): return P('minecraft:bell', attachment='standing', direction=0, toggle_bit=False)


def sh_rod(key, v, at):
    name, _ = full_id(key); props = props_of(name)
    if 'pillar_axis' in props: return P(name, pillar_axis=v.get('a', 'y'))      # chains drawn as rods
    st = {'facing_direction': 1}                                                 # the book's rod stands up
    if 'powered_bit' in props: st['powered_bit'] = False
    return P(name, **st)


def sh_chain(key, v, at): return P(full_id(key)[0], pillar_axis=v.get('a', 'y'))


def sh_plant(key, v, at):
    """Flowers, tufts, crops, bushes and every other small plant: the key's own block, plus growth stage."""
    name, st = full_id(key); props = props_of(name)
    if key in PETALS: st.update(growth=3, **{'minecraft:cardinal_direction': 'south'})   # 4 pieces, like the book
    elif 'growth' in props: st['growth'] = 7 if name == 'minecraft:wheat' else 3 if name == 'minecraft:sweet_berry_bush' else 0
    r = P(name, **st)
    if key in UNDERWATER: r['water'] = True
    return r


UNDERWATER = {'kelp', 'seagrass', 'tube_coral', 'brain_coral', 'bubble_coral', 'fire_coral', 'horn_coral'}


def sh_pot(key, v, at):
    plant = v.get('plant', 'poppy')
    if plant not in B: raise Unmapped(f'flower pot plant {plant!r} is not in the registry')
    pn, pst = full_id(plant)
    # Bedrock FlowerPot block entity keeps the plant as a block state in PlantBlock.
    r = P('minecraft:flower_pot', update_bit=False)
    r['plant'] = (pn, pst)
    return r


def sh_detector(key, v, at): return P(full_id(key)[0], redstone_signal=0)


def sh_table(key, v, at): return sh_full(key, v, at)


def sh_dust(key, v, at): return P('minecraft:redstone_wire', redstone_signal=15 if key == 'redstone_dust' else 0)


BANNER_BASE = {c: 15 - i for i, c in enumerate(COLORS)}   # Bedrock banners count dye colours: black 0 ... white 15


def sh_panel(key, v, at):
    side = v['side']
    if key.endswith('_banner'):
        if banner_tail(_Near(at), (0, 0, 0), v): return {'skip': 'part'}    # lower half of a banner: same block
        color = key[:-7]
        if color not in COLORS: raise Unmapped(f'{key}: unknown banner colour')
        # Java wall_banner facing=north -> facing_direction 2 (Geyser): it faces away from the wall it is on.
        r = P('minecraft:wall_banner', facing_direction=FACING6[OPP[side]])
        r['be'] = {'id': ('string', 'Banner'), 'Base': ('int', BANNER_BASE[color]), 'Type': ('int', 0)}
        return r
    if key.endswith('_sign'):
        return P(wood_block(key, 'wall_sign'), facing_direction=FACING6[OPP[side]])
    raise Unmapped(f'{key}: no Bedrock block for a panel of this key')


def sh_shelf(key, v, at):
    name = mcname(key) if B[key].get('is_shelf') else mcname(B[key].get('shelf_key') or '')
    if name == 'minecraft:': raise Unmapped(f'{key}: no shelf for this key')
    # Java shelf facing = the way its front faces (Geyser 26.1: Java north -> north). Ours hangs on `side`.
    return P(name, powered_bit=False, powered_shelf_type=0, **{'minecraft:cardinal_direction': WORD[OPP[v.get('side', 'N')]]})


def sh_shelf_mushroom(key, v, at):
    # minecraft.wiki/w/Shelf_Mushroom: growth 0 small, 1 large; cardinal_direction is "the direction it is
    # facing". We assume it faces away from the log it grows on, like wall fans. UNCONFIRMED in game.
    return P('minecraft:shelf_mushroom', growth=1 if v.get('big') else 0,
             **{'minecraft:cardinal_direction': WORD[OPP[v.get('side', 'N')]]})


def sh_hanging_plant(key, v, at):
    below = at(0, -1, 0)
    tip = v['tip'] if 'tip' in v else not (below and below['b'] == key)
    return P(full_id(key)[0], tip=bool(tip))


def sh_layers(key, v, at):
    n = max(1, min(8, int(v.get('n', 1))))
    return P('minecraft:snow_layer', height=n - 1, covered_bit=False)


def sh_repeater(key, v, at):
    # Java repeater facing points to its input (the back); Bedrock cardinal_direction = Java facing (Geyser 26.1).
    # Our f is the output side, so the Bedrock value is the opposite.
    d = max(1, min(4, int(v.get('delay', 1))))
    return P(full_id(key)[0], repeater_delay=d - 1, **{'minecraft:cardinal_direction': WORD[OPP[v.get('f', 'S')]]})


def sh_comparator(key, v, at):
    return P(full_id(key)[0], output_subtract_bit='_sub' in key, output_lit_bit=key.endswith('_on'),
             **{'minecraft:cardinal_direction': WORD[OPP[v.get('f', 'S')]]})


def sh_facing(key, v, at): return sh_full(key, v, at)


def sh_piston_base(key, v, at):
    # Written retracted: an extended piston needs a moving-block entity. It pushes out again when powered.
    return P(full_id(key)[0], facing_direction=FACING6_FLIP[v.get('f', 'S')])


def sh_rail(key, v, at):
    name, _ = full_id(key); props = props_of(name)
    f, side = v.get('f'), v.get('side')
    # Java rail shapes -> rail_direction (Geyser): north_south 0, east_west 1, ascending_east 2, ascending_west 3,
    # ascending_north 4, ascending_south 5, south_east 6, south_west 7, north_west 8, north_east 9.
    if f and side and f != side and OPP.get(f) != side:
        corner = ('N' if 'N' in (f, side) else 'S') + ('E' if 'E' in (f, side) else 'W')
        rd = {'SE': 6, 'SW': 7, 'NW': 8, 'NE': 9}[corner]
    elif f in CW: rd = {'E': 2, 'W': 3, 'N': 4, 'S': 5}[f]
    else: rd = 1 if v.get('a', 'z') == 'x' else 0
    st = {'rail_direction': rd}
    if 'rail_data_bit' in props: st['rail_data_bit'] = key.endswith('_on')
    return P(name, **st)


def sh_cross_plant(key, v, at): return sh_plant(key, v, at)


def sh_coral_fan(key, v, at):
    m = re.fullmatch(r'(.+)_coral(_fan)?', key)
    if not m: raise Unmapped(f'{key}: not a coral key, cannot make a coral fan')
    kind, side = m.group(1), v.get('side')
    if not m.group(2) and side not in CW:
        # A coral PLANT key drawn with the fan shape (builds2/b06_reef_spy.py picks key and shape separately). The
        # book's block list names the key ("Bubble Coral"), so the game gets the plant the kid was told to place.
        return sh_plant(key, v, at)
    if side in CW:
        r = P(mcname(f'{kind}_coral_wall_fan'), coral_direction=CORAL_DIR[OPP[side]])
    else:
        r = P(mcname(f'{kind}_coral_fan'), coral_fan_direction=0)
    r['water'] = True
    return r


def _submerged(at):
    """Water above, and water or a full block on all four sides. A waterlogged block is a water source in
    Bedrock, so one on the rim of a pool would leak; only blocks fully under water get water."""
    sides = [at(*d) for d in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1))]
    return _is_water(at(0, 1, 0)) and all(n is not None and n['s'] == 'full' for n in sides)


def sh_sea_pickle(key, v, at):
    wet = _submerged(at)
    r = P('minecraft:sea_pickle', cluster_count=B[key].get('count', 1) - 1, dead_bit=not wet)
    r['water'] = wet
    return r


def sh_conduit(key, v, at):
    r = P('minecraft:conduit'); r['water'] = _submerged(at); return r


def sh_lectern(key, v, at):
    # Java lectern facing = toward the reader (Geyser: Java north -> north); our f = the side you read from.
    return P('minecraft:lectern', powered_bit=False, **{'minecraft:cardinal_direction': WORD[v.get('f', 'S')]})


def sh_grindstone(key, v, at): return P('minecraft:grindstone', attachment='standing', direction=DIR4[v.get('f', 'S')])


def sh_stonecutter(key, v, at):
    return P('minecraft:stonecutter_block', **{'minecraft:cardinal_direction': WORD[v.get('f', 'S')]})


def sh_decorated_pot(key, v, at): return P('minecraft:decorated_pot', direction=0)


def sh_candle(key, v, at):
    name, st = full_id(key)
    return P(name, candles=max(1, min(4, int(v.get('n', 1)))) - 1, lit=bool(st.get('lit')))


SIGN_ROT = {'S': 0, 'W': 4, 'N': 8, 'E': 12}     # Java hanging sign rotation for a facing (16 steps, 0 = south)


def sh_hanging_sign(key, v, at):
    w = wood_of(key)
    if w is None: raise Unmapped(f'{key}: no wood for a hanging sign')
    name = mcname(f'{w}_hanging_sign'); side = v.get('side')
    if side in CW:
        # Java wall hanging sign: its board sticks out from the wall, and the wall is on facing's clockwise side
        # (WallHangingSignBlock attaches at facing.getClockWise()), so facing = CCW[side]. Geyser: Java wall
        # facing=north -> facing_direction 2, ground_sign_direction 8, attached_bit 1, hanging 0.
        face = CCW[side]
        return P(name, facing_direction=FACING6[face], ground_sign_direction=SIGN_ROT[face], attached_bit=True, hanging=False)
    # Under a block: a='x' board runs east-west = Java rotation 0 (faces south): facing_direction 3, hanging 1.
    face = 'S' if v.get('a', 'x') == 'x' else 'W'
    return P(name, facing_direction=FACING6[face], ground_sign_direction=SIGN_ROT[face], attached_bit=False, hanging=True)


def sh_item_frame(key, v, at):
    side = v.get('side')
    return P(full_id(key)[0], facing_direction=FACING6[OPP[side]] if side else 1,
             item_frame_map_bit=False, item_frame_photo_bit=False)


SHAPES = {
    'full': sh_full, 'slab': sh_slab, 'stairs': sh_stairs, 'fence': sh_fence, 'wall': sh_wall, 'pane': sh_pane,
    'gate': sh_gate, 'door': sh_door, 'trapdoor': sh_trapdoor, 'carpet': sh_carpet, 'plate': sh_plate,
    'detector': sh_detector, 'table': sh_table, 'chest': sh_chest, 'bush': sh_plant, 'campfire': sh_campfire,
    'anvil': sh_anvil, 'cauldron': sh_cauldron, 'bell': sh_bell, 'rod': sh_rod, 'button': sh_button,
    'lever': sh_lever, 'torch': sh_torch, 'ladder': sh_ladder, 'lantern': sh_lantern, 'bed': sh_bed,
    'hopper': sh_hopper, 'flower': sh_plant, 'tuft': sh_plant, 'crop': sh_plant, 'pot': sh_pot, 'panel': sh_panel,
    'dust': sh_dust,
    # ext/nature2026.py
    'shelf': sh_shelf, 'straw_bed': sh_straw_bed, 'shelf_mushroom': sh_shelf_mushroom,
    'hanging_plant': sh_hanging_plant, 'plant': sh_plant, 'layers': sh_layers,
    'cushion': lambda key, v, at: {'skip': 'entity', 'item': item_of(v)},     # cushions are entities in game
    # ext/tech2026.py
    'chain': sh_chain, 'repeater': sh_repeater, 'comparator': sh_comparator, 'facing': sh_facing,
    'piston_base': sh_piston_base, 'piston_head': lambda key, v, at: {'skip': 'part'},
    'lily_pad': lambda key, v, at: P('minecraft:waterlily'), 'mushroom': lambda key, v, at: P('minecraft:' + key),
    'rail': sh_rail, 'cross_plant': sh_cross_plant, 'coral_fan': sh_coral_fan, 'sea_pickle': sh_sea_pickle,
    'conduit': sh_conduit, 'lectern': sh_lectern, 'grindstone': sh_grindstone, 'stonecutter': sh_stonecutter,
    'decorated_pot': sh_decorated_pot, 'candle': sh_candle, 'hanging_sign': sh_hanging_sign,
    'item_frame': sh_item_frame,
}
# Shapes that hold water when the build puts them in water (Bedrock keeps the water in structure layer 2).
WATERLOGGABLE = {'stairs', 'slab', 'fence', 'wall', 'pane', 'gate', 'trapdoor', 'ladder', 'lantern', 'chest', 'chain',
                 'rod', 'hanging_sign', 'panel', 'shelf', 'candle', 'lectern', 'decorated_pot', 'item_frame'}


def to_bedrock(v, at=None):
    """One book cell -> {'name', 'states' (complete, checked), 'be' (block entity fields or None), 'water'}
    or {'skip': 'entity'|'part', 'item': ...} for cells that are not blocks in game.
    v = {'b': key, 's': shape, ...state}; at(dx, dy, dz) returns the neighbouring cell dict or None."""
    at = at or (lambda x, y, z: None)
    key, s = v['b'], v['s']
    if key not in B: raise Unmapped(f'{key!r} is not in the block registry')
    fn = SHAPES.get(s)
    if fn is None: raise Unmapped(f'no Bedrock mapping for shape {s!r} (block {key})')
    try:
        r = fn(key, v, at)
    except (KeyError, TypeError) as e:
        if isinstance(e, (Unmapped, BadState)): raise
        raise Unmapped(f'{key} as {s} with {v}: {type(e).__name__} {e}') from e
    if 'skip' in r: return r
    r['states'] = check(r['name'], r['states'])
    if 'plant' in r:
        pn, pst = r.pop('plant')
        r['be'] = {'id': ('string', 'FlowerPot'), 'PlantBlock': ('block', (pn, check(pn, pst)))}
    r.setdefault('be', None)
    if not r.get('water') and s in WATERLOGGABLE:
        r['water'] = _submerged(at)
    r['water'] = bool(r.get('water'))
    return r


# ---------------------------------------------------------------- self-test over the whole registry
def shapes_for(key):
    """Every shape a registry block can plausibly take in a build (for the self-test)."""
    blk = B[key]; out = [('full', {})]
    for field in ('stairs', 'slab', 'fence', 'wall'):
        if blk.get(field):
            out += {'stairs': [('stairs', {'f': d, 'h': h}) for d in 'NESW' for h in ('bottom', 'top')],
                    'slab': [('slab', {'h': 'bottom'}), ('slab', {'h': 'top'})], 'fence': [('fence', {})],
                    'wall': [('wall', {})]}[field]
    if key.endswith('stained_glass') or key in ('glass', 'iron_bars') or key.endswith('copper_bars'): out = [('pane', {})] + (out if not key.endswith('bars') else [])
    if key.endswith('_door'): out = [('door', {'side': d, 'h': h}) for d in 'NESW' for h in ('lower', 'upper')] + [('door', {'side': 'S', 'h': 'lower', 'hinge': 'right'})]
    if key.endswith('_trapdoor'): out = [('trapdoor', {'h': 'top'}), ('trapdoor', {'open': True, 'side': 'E'})]
    if key.endswith('_fence_gate'): out = [('gate', {'a': 'x'}), ('gate', {'a': 'z'})]
    if key.endswith('_bed') and key != 'straw_bed': out = [('bed', {'f': d, 'part': p}) for d in 'NESW' for p in ('head', 'foot')]
    if key.endswith('_carpet'): out = [('carpet', {})]
    if key.endswith('_banner'): out = [('panel', {'side': d}) for d in 'NESW']
    if key.endswith('_sign'): out = [('panel', {'side': 'N'}), ('hanging_sign', {'a': 'x'}), ('hanging_sign', {'side': 'E'})]
    if key.endswith('_planks'): out += [('hanging_sign', {'a': 'z'}), ('door', {'side': 'S', 'h': 'lower'}),
                                        ('trapdoor', {'h': 'bottom'}), ('button', {'side': 'W'}), ('plate', {})]
    if key.endswith('_shelf') or blk.get('shelf_key'): out += [('shelf', {'side': d}) for d in 'NESW']
    if blk.get('is_shelf'): out = [('shelf', {'side': d}) for d in 'NESW']
    if key.endswith(('_candle', '_candle_lit')) or key in ('candle', 'candle_lit'): out = [('candle', {'n': 3})]
    if key.endswith('_coral_fan'): out = [('coral_fan', {}), ('coral_fan', {'side': 'W'})]
    if key.endswith('_wool') or key in ALIAS: out += [('cushion', {}), ('carpet', {})]
    if key.endswith('_rail') or key.endswith('_rail_on') or key == 'rail':
        out = [('rail', {'a': 'x'}), ('rail', {'f': 'E'})] + ([('rail', {'f': 'S', 'side': 'E'})] if key == 'rail' else [])
    if key.endswith('lightning_rod') or key == 'end_rod': out = [('rod', {})]
    if key.endswith('_chain') or key == 'chain': out = [('chain', {'a': 'x'}), ('rod', {})]
    if (key.endswith('_lantern') and 'copper' in key) or key in ('lantern', 'soul_lantern'): out = [('lantern', {}), ('lantern', {'hang': True})]
    if key.endswith('_chest') or key == 'chest': out = [('chest', {})]
    if key in PLANTS or blk.get('model') or blk.get('plant_h'): out = [('plant', {})]
    if key.endswith('_coral') and key + '_fan' in B: out = [('cross_plant', {}), ('coral_fan', {}), ('coral_fan', {'side': 'N'})]
    return out + [(s, st) for s, st in SPECIAL_SHAPES.get(key, [])]


PLANTS = {'poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy', 'short_grass', 'golden_dandelion', 'wheat',
          'sweet_berry_bush', 'azalea', 'flowering_azalea', 'sugar_cane', 'bamboo', 'pale_hanging_moss', 'red_shrub'}
SPECIAL_SHAPES = {
    'torch': [('torch', {}), ('torch', {'side': 'N'})], 'soul_torch': [('torch', {'side': 'E'})],
    'copper_torch': [('torch', {'side': 'W'})], 'redstone_torch': [('torch', {})], 'redstone_torch_off': [('torch', {'side': 'S'})],
    'ladder': [('ladder', {'side': d}) for d in 'NESW'], 'lever': [('lever', {}), ('lever', {'side': 'E'})],
    'stone_button': [('button', {}), ('button', {'side': 'N'})], 'oak_button': [('button', {'side': 'S'})],
    'oak_pressure_plate': [('plate', {})], 'stone_pressure_plate': [('plate', {})], 'hopper': [('hopper', {'f': 'D'}), ('hopper', {'f': 'E'})],
    'daylight_detector': [('detector', {})], 'campfire': [('campfire', {})], 'soul_campfire': [('campfire', {})],
    'anvil': [('anvil', {})], 'cauldron': [('cauldron', {})], 'bell': [('bell', {})], 'enchanting_table': [('table', {})],
    'flower_pot': [('pot', {'plant': 'poppy'}), ('pot', {'plant': 'cornflower'})], 'redstone_dust': [('dust', {})],
    'redstone_dust_off': [('dust', {})], 'straw_bed': [('straw_bed', {'f': 'N', 'part': 'head'})],
    'shelf_mushroom': [('shelf_mushroom', {'side': 'W', 'big': True})], 'snow_layer': [('layers', {'n': 3})],
    'repeater': [('repeater', {'f': 'E', 'delay': 2})], 'repeater_on': [('repeater', {'f': 'N'})],
    'comparator': [('comparator', {'f': 'S'})], 'comparator_on': [('comparator', {'f': 'W'})],
    'comparator_sub': [('comparator', {})], 'comparator_sub_on': [('comparator', {})],
    'observer': [('facing', {'f': 'U'})], 'observer_on': [('facing', {'f': 'D'})], 'dispenser': [('facing', {'f': 'U'})],
    'dropper': [('facing', {'f': 'W'})], 'crafter': [('facing', {'f': 'U'})], 'crafter_on': [('facing', {'f': 'E'})],
    'furnace': [('facing', {'f': 'E'})], 'piston': [('piston_base', {'f': 'U'}), ('piston_head', {'f': 'U'})],
    'sticky_piston': [('piston_base', {'f': 'W'})], 'sea_pickle': [('sea_pickle', {})], 'sea_pickle_4': [('sea_pickle', {})],
    'conduit': [('conduit', {})], 'lectern': [('lectern', {'f': 'W'})], 'grindstone': [('grindstone', {'f': 'E'})],
    'stonecutter': [('stonecutter', {'f': 'N'})], 'decorated_pot': [('decorated_pot', {})],
    'item_frame': [('item_frame', {'side': 'N'})], 'glow_item_frame': [('item_frame', {})],
    'kelp': [('cross_plant', {})], 'seagrass': [('cross_plant', {})], 'cobweb': [('cross_plant', {})],
    'leaf_litter': [('carpet', {})], 'wildflowers': [('carpet', {})], 'pink_petals': [('carpet', {})],
    'moss_carpet': [('carpet', {})], 'pale_moss_carpet': [('carpet', {})], 'beehive': [('full', {'f': 'W'})],
    'loom': [('full', {'f': 'N'})], 'jack_o_lantern': [('full', {'f': 'E'})], 'carved_pumpkin': [('full', {'f': 'W'})],
    'oak_log': [('full', {'a': 'x'})], 'quartz_pillar': [('full', {'a': 'z'})],
}


# Orientation rows checked by hand on 2026-10-09 against minecraft.wiki's Bedrock block-state tables (Stairs,
# Trapdoor, Bed, Torch, Ladder, Chest, Furnace, Log, Lantern, Button, Lever), Geyser's Java -> Bedrock mappings and
# HoloPrint's renderer. Door is the one row where the wiki's Bedrock text is wrong (see sh_door). The self-test
# fails if any of these change. (book cell, Bedrock states it must have)
PINNED = [
    (dict(b='oak_planks', s='stairs', f='N'), dict(weirdo_direction=3, upside_down_bit=False)),   # wiki 3 = North
    (dict(b='oak_planks', s='stairs', f='E'), dict(weirdo_direction=0)),                          # 0 = East
    (dict(b='oak_planks', s='stairs', f='S'), dict(weirdo_direction=2)),                          # 2 = South
    (dict(b='oak_planks', s='stairs', f='W', h='top'), dict(weirdo_direction=1, upside_down_bit=True)),
    (dict(b='oak_door', s='door', side='S', h='lower'), {'minecraft:cardinal_direction': 'east', 'upper_block_bit': False}),
    (dict(b='oak_door', s='door', side='N', h='upper'), {'minecraft:cardinal_direction': 'west', 'upper_block_bit': True}),
    (dict(b='oak_door', s='door', side='E', h='lower'), {'minecraft:cardinal_direction': 'north'}),
    (dict(b='oak_door', s='door', side='W', h='lower'), {'minecraft:cardinal_direction': 'south'}),
    (dict(b='oak_trapdoor', s='trapdoor', open=True, side='W'), dict(direction=0, open_bit=True)),  # 0 = on the west side
    (dict(b='oak_trapdoor', s='trapdoor', open=True, side='E'), dict(direction=1)),
    (dict(b='oak_trapdoor', s='trapdoor', open=True, side='N'), dict(direction=2)),
    (dict(b='oak_trapdoor', s='trapdoor', open=True, side='S'), dict(direction=3)),
    (dict(b='oak_trapdoor', s='trapdoor', h='top'), dict(open_bit=False, upside_down_bit=True)),
    (dict(b='red_bed', s='bed', f='N', part='head'), dict(direction=2, head_piece_bit=True)),     # 2 = head north
    (dict(b='red_bed', s='bed', f='S', part='foot'), dict(direction=0, head_piece_bit=False)),
    (dict(b='red_bed', s='bed', f='W', part='foot'), dict(direction=1)),
    (dict(b='red_bed', s='bed', f='E', part='foot'), dict(direction=3)),
    (dict(b='torch', s='torch', side='W'), dict(torch_facing_direction='west')),   # names the face it is stuck to
    (dict(b='torch', s='torch', side='N'), dict(torch_facing_direction='north')),
    (dict(b='torch', s='torch'), dict(torch_facing_direction='top')),
    (dict(b='ladder', s='ladder', side='S'), dict(facing_direction=2)),             # wall to the south: faces north
    (dict(b='ladder', s='ladder', side='N'), dict(facing_direction=3)),
    (dict(b='ladder', s='ladder', side='E'), dict(facing_direction=4)),
    (dict(b='ladder', s='ladder', side='W'), dict(facing_direction=5)),
    (dict(b='chest', s='chest', f='E'), {'minecraft:cardinal_direction': 'east'}),   # the latch side
    (dict(b='furnace', s='facing', f='N'), {'minecraft:cardinal_direction': 'north'}),   # the opening
    (dict(b='oak_log', s='full', a='x'), dict(pillar_axis='x')),
    (dict(b='oak_log', s='full', a='z'), dict(pillar_axis='z')),
    (dict(b='oak_log', s='full'), dict(pillar_axis='y')),
    (dict(b='lantern', s='lantern', hang=True), dict(hanging=True)),
    (dict(b='lantern', s='lantern'), dict(hanging=False)),
    (dict(b='stone_button', s='button', side='S'), dict(facing_direction=2)),       # on a south wall, faces north
    (dict(b='stone_button', s='button', side='W'), dict(facing_direction=5)),
    (dict(b='stone_button', s='button'), dict(facing_direction=1)),                 # on the floor
    (dict(b='lever', s='lever', side='S'), dict(lever_direction='north')),
    (dict(b='white_banner', s='panel', side='N'), dict(facing_direction=3)),
    (dict(b='oak_fence_gate', s='gate', a='x'), {'minecraft:cardinal_direction': 'south'}),
]


def check_pinned():
    out = []
    for v, want in PINNED:
        got = to_bedrock(v)['states']
        bad = {k: (got.get(k), w) for k, w in want.items() if got.get(k) != w}
        if bad: out.append(f'{v}: {bad} (got, want)')
    return out


def selftest(verbose=False):
    """Map every registry key in every shape from shapes_for(). Returns {key: [problems]}."""
    bad, n, names = {}, 0, set()
    for p in check_pinned(): bad.setdefault('PINNED', []).append(p)
    for key in sorted(B):
        for s, st in shapes_for(key):
            v = dict(b=key, s=s, **st)
            try:
                r = to_bedrock(v); n += 1
                if 'skip' not in r: names.add(r['name'])
                if verbose: print(f'{key:34s} {s:14s} {st} -> {r}')
            except (Unmapped, BadState) as e:
                bad.setdefault(key, []).append(f'{s} {st}: {e}')
    return bad, n, names


if __name__ == '__main__':
    if '--fetch' in sys.argv:
        i = sys.argv.index('--fetch')
        fetch(sys.argv[i + 1] if len(sys.argv) > i + 1 else MOJANG_TAG); raise SystemExit
    bad, n, names = selftest('-v' in sys.argv)
    print(f'{n} cells mapped from {len(B)} registry keys into {len(names)} Bedrock blocks (Mojang list {mc()["tag"]})')
    for k, probs in bad.items():
        for p in probs: print(f'  UNMAPPED {k}: {p}')
    raise SystemExit(1 if bad else 0)
