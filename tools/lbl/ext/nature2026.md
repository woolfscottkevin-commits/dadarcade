# nature2026: wood sets, plants and the 2024-2026 building sets

Module: `tools/lbl/ext/nature2026.py` (textures in `ext/_tex_nature2026.py`, all original).
Every display name below was checked against Bedrock's own `en_US.lang` (Mojang bedrock-samples,
26.50 content) and minecraft.wiki. "New" is the Bedrock version that added the block (2024-2026 only).

## New shapes

| shape | state | use it with | notes |
|---|---|---|---|
| `shelf` | `side` = the wall it hangs on (it faces the other way) | any `<wood>_shelf` key, or a planks key (`oak_planks` gives an Oak Shelf too) | Game-accurate boxes: 3 px back, 5 px deep boards top and bottom, 3 cubbies. Put a block behind it. Always use this shape for shelf keys (a `full` shelf looks wrong). |
| `cushion` | none | any wool key (`red_wool`, `cloud`, ...) | Item is "Red Cushion" etc. A 4 px pad on the floor of the cell. **Cushions are entities in game, not blocks**: they need a solid block under them and only players can sit. Exporters to .mcstructure must write these cells as cushion entities. One cushion per cell; it cannot share a cell with a slab or stair. |
| `straw_bed` | `part='foot'/'head'`, `f` = direction the head points | `straw_bed` | Place both halves like a bed: foot at (x,y,z), head one step in direction `f`. Head half is not counted. Single use in game, does not set spawn. |
| `shelf_mushroom` | `side` = the block it grows on; `big=True` for the large one | `shelf_mushroom` | Bracket fungus on the side of a log (poplar trunks). |
| `hanging_plant` | `tip=True` for the shorter bottom piece | `pale_hanging_moss` | Strands hang from the block above (under pale oak leaves). |
| `plant` | none | the plant keys marked `plant` below | Each plant brings its own small model (crossed leafy panels, stems, petals). |
| `layers` | `n` = 1..8 layers (2 px each) | `snow_layer` | Item "Snow" (Bedrock's name for the snow layer). The plan counts 1 item per cell, whatever `n` is. |

Examples:

```python
b.set(3, 1, 4, 'poplar_shelf', 'shelf', side='N')          # on a north wall, facing south
b.set(5, 1, 6, 'red_wool', 'cushion')                       # sits on the block below
b.set(2, 0, 5, 'straw_bed', 'straw_bed', part='foot', f='N'); b.set(2, 0, 4, 'straw_bed', 'straw_bed', part='head', f='N')
b.set(7, 2, 3, 'shelf_mushroom', 'shelf_mushroom', side='W', big=True)   # grows on the log to the west
b.set(1, 4, 1, 'pale_hanging_moss', 'hanging_plant'); b.set(1, 3, 1, 'pale_hanging_moss', 'hanging_plant', tip=True)
b.set(4, 0, 2, 'firefly_bush', 'plant'); b.set(6, 0, 2, 'snow_layer', 'layers', n=3)
b.set(0, 0, 0, 'white_wool', 'stairs', f='N'); b.set(1, 0, 0, 'gray_concrete', 'slab')
```

## Wool and concrete stairs and slabs (26.50)

The 16 `<colour>_wool` and 16 `<colour>_concrete` blocks (and the aliases `cloud`, `light_blue_wool2`) now work
with `stairs` and `slab`: "White Wool Stairs", "White Wool Slab", "Gray Concrete Stairs", "Gray Concrete Slab" and so on.
The blocks themselves are old, so they carry `new_shapes={'stairs': '26.50', 'slab': '26.50'}` instead of `new`.

## Changes to Volume 1 blocks (made from this module, blocks.py untouched)

- `<colour>_wool`, `<colour>_concrete`, `cloud`, `light_blue_wool2`: `stairs=` and `slab=` names set (above).
- `oak_planks`, `spruce_planks`, `birch_planks`, `dark_oak_planks`, `jungle_planks`, `cherry_planks`: gained
  `shelf_key` / `shelf_item`, so the `shelf` shape also works on planks keys.
- `pale_oak_log`, `pale_oak_leaves`, `pale_moss` (Pale Moss Block): tagged `new='1.21.50'`.
- `tuff_bricks`: `wall='Tuff Brick Wall'` and `new='1.21.0'`.
- Not changed: `oak_fence_gate`, `spruce_fence_gate` already existed. `chain` is renamed "Iron Chain" by
  `ext/tech2026.py`, not here.

## Blocks added

Stained glass panes: plain `pane` shape on any stained glass key gives "<Colour> Stained Glass Pane". Volume 1
had 13 colours; gray, light gray and brown are added here, so all 16 work.

| key | Bedrock name | shapes | light | new |
|---|---|---|---|---|
| `oak_shelf` | Oak Shelf | `shelf` |  | 1.21.111 |
| `spruce_shelf` | Spruce Shelf | `shelf` |  | 1.21.111 |
| `birch_fence_gate` | Birch Fence Gate | `gate` |  |  |
| `birch_shelf` | Birch Shelf | `shelf` |  | 1.21.111 |
| `dark_oak_fence_gate` | Dark Oak Fence Gate | `gate` |  |  |
| `dark_oak_shelf` | Dark Oak Shelf | `shelf` |  | 1.21.111 |
| `jungle_fence_gate` | Jungle Fence Gate | `gate` |  |  |
| `jungle_shelf` | Jungle Shelf | `shelf` |  | 1.21.111 |
| `cherry_fence_gate` | Cherry Fence Gate | `gate` |  |  |
| `cherry_shelf` | Cherry Shelf | `shelf` |  | 1.21.111 |
| `stripped_oak_log` | Stripped Oak Log | `full` (a=x/y/z) |  |  |
| `stripped_spruce_log` | Stripped Spruce Log | `full` (a=x/y/z) |  |  |
| `stripped_birch_log` | Stripped Birch Log | `full` (a=x/y/z) |  |  |
| `stripped_dark_oak_log` | Stripped Dark Oak Log | `full` (a=x/y/z) |  |  |
| `stripped_jungle_log` | Stripped Jungle Log | `full` (a=x/y/z) |  |  |
| `stripped_cherry_log` | Stripped Cherry Log | `full` (a=x/y/z) |  |  |
| `dark_oak_leaves` | Dark Oak Leaves | `full` |  |  |
| `jungle_leaves` | Jungle Leaves | `full` |  |  |
| `pale_oak_planks` | Pale Oak Planks | `full`, `stairs` (Pale Oak Stairs), `slab` (Pale Oak Slab), `fence` (Pale Oak Fence) |  | 1.21.50 |
| `pale_oak_door` | Pale Oak Door | `door` |  | 1.21.50 |
| `pale_oak_trapdoor` | Pale Oak Trapdoor | `trapdoor` |  | 1.21.50 |
| `pale_oak_fence_gate` | Pale Oak Fence Gate | `gate` |  | 1.21.50 |
| `pale_oak_shelf` | Pale Oak Shelf | `shelf` |  | 1.21.111 |
| `stripped_pale_oak_log` | Stripped Pale Oak Log | `full` (a=x/y/z) |  | 1.21.50 |
| `pale_moss_carpet` | Pale Moss Carpet | `carpet` |  | 1.21.50 |
| `pale_hanging_moss` | Pale Hanging Moss | `hanging_plant` |  | 1.21.50 |
| `resin_bricks` | Resin Bricks | `full`, `stairs` (Resin Brick Stairs), `slab` (Resin Brick Slab), `wall` (Resin Brick Wall) |  | 1.21.50 |
| `chiseled_resin_bricks` | Chiseled Resin Bricks | `full` |  | 1.21.50 |
| `resin_block` | Block of Resin | `full` |  | 1.21.50 |
| `open_eyeblossom` | Open Eyeblossom | `plant` |  | 1.21.50 |
| `closed_eyeblossom` | Closed Eyeblossom | `plant` |  | 1.21.50 |
| `poplar_planks` | Poplar Planks | `full`, `stairs` (Poplar Stairs), `slab` (Poplar Slab), `fence` (Poplar Fence) |  | 26.50 |
| `poplar_log` | Poplar Log | `full` (a=x/y/z) |  | 26.50 |
| `stripped_poplar_log` | Stripped Poplar Log | `full` (a=x/y/z) |  | 26.50 |
| `poplar_door` | Poplar Door | `door` |  | 26.50 |
| `poplar_trapdoor` | Poplar Trapdoor | `trapdoor` |  | 26.50 |
| `poplar_fence_gate` | Poplar Fence Gate | `gate` |  | 26.50 |
| `poplar_shelf` | Poplar Shelf | `shelf` |  | 26.50 |
| `red_poplar_leaves` | Red Poplar Leaves | `full` |  | 26.50 |
| `orange_poplar_leaves` | Orange Poplar Leaves | `full` |  | 26.50 |
| `yellow_poplar_leaves` | Yellow Poplar Leaves | `full` |  | 26.50 |
| `acacia_planks` | Acacia Planks | `full`, `stairs` (Acacia Stairs), `slab` (Acacia Slab), `fence` (Acacia Fence) |  |  |
| `acacia_log` | Acacia Log | `full` (a=x/y/z) |  |  |
| `stripped_acacia_log` | Stripped Acacia Log | `full` (a=x/y/z) |  |  |
| `acacia_leaves` | Acacia Leaves | `full` |  |  |
| `acacia_door` | Acacia Door | `door` |  |  |
| `acacia_trapdoor` | Acacia Trapdoor | `trapdoor` |  |  |
| `acacia_fence_gate` | Acacia Fence Gate | `gate` |  |  |
| `acacia_shelf` | Acacia Shelf | `shelf` |  | 1.21.111 |
| `mangrove_planks` | Mangrove Planks | `full`, `stairs` (Mangrove Stairs), `slab` (Mangrove Slab), `fence` (Mangrove Fence) |  |  |
| `mangrove_log` | Mangrove Log | `full` (a=x/y/z) |  |  |
| `stripped_mangrove_log` | Stripped Mangrove Log | `full` (a=x/y/z) |  |  |
| `mangrove_leaves` | Mangrove Leaves | `full` |  |  |
| `mangrove_door` | Mangrove Door | `door` |  |  |
| `mangrove_trapdoor` | Mangrove Trapdoor | `trapdoor` |  |  |
| `mangrove_fence_gate` | Mangrove Fence Gate | `gate` |  |  |
| `mangrove_shelf` | Mangrove Shelf | `shelf` |  | 1.21.111 |
| `bamboo_planks` | Bamboo Planks | `full`, `stairs` (Bamboo Stairs), `slab` (Bamboo Slab), `fence` (Bamboo Fence) |  |  |
| `bamboo_mosaic` | Bamboo Mosaic | `full`, `stairs` (Bamboo Mosaic Stairs), `slab` (Bamboo Mosaic Slab) |  |  |
| `bamboo_block` | Block of Bamboo | `full` (a=x/y/z) |  |  |
| `stripped_bamboo_block` | Block of Stripped Bamboo | `full` (a=x/y/z) |  |  |
| `bamboo_door` | Bamboo Door | `door` |  |  |
| `bamboo_trapdoor` | Bamboo Trapdoor | `trapdoor` |  |  |
| `bamboo_fence_gate` | Bamboo Fence Gate | `gate` |  |  |
| `bamboo_shelf` | Bamboo Shelf | `shelf` |  | 1.21.111 |
| `crimson_planks` | Crimson Planks | `full`, `stairs` (Crimson Stairs), `slab` (Crimson Slab), `fence` (Crimson Fence) |  |  |
| `crimson_stem` | Crimson Stem | `full` (a=x/y/z) |  |  |
| `stripped_crimson_stem` | Stripped Crimson Stem | `full` (a=x/y/z) |  |  |
| `crimson_door` | Crimson Door | `door` |  |  |
| `crimson_trapdoor` | Crimson Trapdoor | `trapdoor` |  |  |
| `crimson_fence_gate` | Crimson Fence Gate | `gate` |  |  |
| `crimson_shelf` | Crimson Shelf | `shelf` |  | 1.21.111 |
| `warped_planks` | Warped Planks | `full`, `stairs` (Warped Stairs), `slab` (Warped Slab), `fence` (Warped Fence) |  |  |
| `warped_stem` | Warped Stem | `full` (a=x/y/z) |  |  |
| `stripped_warped_stem` | Stripped Warped Stem | `full` (a=x/y/z) |  |  |
| `warped_door` | Warped Door | `door` |  |  |
| `warped_trapdoor` | Warped Trapdoor | `trapdoor` |  |  |
| `warped_fence_gate` | Warped Fence Gate | `gate` |  |  |
| `warped_shelf` | Warped Shelf | `shelf` |  | 1.21.111 |
| `bush` | Bush | `plant`, `bush` |  | 1.21.70 |
| `firefly_bush` | Firefly Bush | `plant` | 2 | 1.21.70 |
| `leaf_litter` | Leaf Litter | `plant`, `carpet` |  | 1.21.70 |
| `wildflowers` | Wildflowers | `plant`, `carpet` |  | 1.21.70 |
| `cactus_flower` | Cactus Flower | `plant` |  | 1.21.70 |
| `short_dry_grass` | Short Dry Grass | `plant` |  | 1.21.70 |
| `tall_dry_grass` | Tall Dry Grass | `plant` |  | 1.21.70 |
| `golden_dandelion` | Golden Dandelion | `plant`, `flower` |  | 26.10 |
| `red_shrub` | Red Shrub | `plant` |  | 26.50 |
| `shelf_mushroom` | Shelf Mushroom | `shelf_mushroom` |  | 26.50 |
| `straw_bed` | Straw Bed | `straw_bed` |  | 26.50 |
| `azalea` | Azalea | `plant`, `bush` |  |  |
| `flowering_azalea` | Flowering Azalea | `plant`, `bush` |  |  |
| `moss_carpet` | Moss Carpet | `carpet` |  |  |
| `pink_petals` | Pink Petals | `plant`, `carpet` |  |  |
| `sugar_cane` | Sugar Cane | `plant` |  |  |
| `bamboo` | Bamboo | `plant` |  |  |
| `snow_layer` | Snow | `layers` |  |  |
| `ice` | Ice | `full` |  |  |
| `packed_ice` | Packed Ice | `full` |  |  |
| `blue_ice` | Blue Ice | `full` |  |  |
| `deepslate_tiles` | Deepslate Tiles | `full`, `stairs` (Deepslate Tile Stairs), `slab` (Deepslate Tile Slab), `wall` (Deepslate Tile Wall) |  |  |
| `cobbled_deepslate` | Cobbled Deepslate | `full`, `stairs` (Cobbled Deepslate Stairs), `slab` (Cobbled Deepslate Slab), `wall` (Cobbled Deepslate Wall) |  |  |
| `tuff` | Tuff | `full`, `stairs` (Tuff Stairs), `slab` (Tuff Slab), `wall` (Tuff Wall) |  |  |
| `polished_tuff` | Polished Tuff | `full`, `stairs` (Polished Tuff Stairs), `slab` (Polished Tuff Slab), `wall` (Polished Tuff Wall) |  | 1.21.0 |
| `chiseled_tuff` | Chiseled Tuff | `full` |  | 1.21.0 |
| `mud_bricks` | Mud Bricks | `full`, `stairs` (Mud Brick Stairs), `slab` (Mud Brick Slab), `wall` (Mud Brick Wall) |  |  |
| `packed_mud` | Packed Mud | `full` |  |  |
| `calcite` | Calcite | `full` |  |  |
| `dripstone_block` | Dripstone Block | `full` |  |  |
| `granite` | Granite | `full`, `stairs` (Granite Stairs), `slab` (Granite Slab), `wall` (Granite Wall) |  |  |
| `polished_granite` | Polished Granite | `full`, `stairs` (Polished Granite Stairs), `slab` (Polished Granite Slab) |  |  |
| `diorite` | Diorite | `full`, `stairs` (Diorite Stairs), `slab` (Diorite Slab), `wall` (Diorite Wall) |  |  |
| `polished_diorite` | Polished Diorite | `full`, `stairs` (Polished Diorite Stairs), `slab` (Polished Diorite Slab) |  |  |
| `smooth_quartz` | Smooth Quartz Block | `full`, `stairs` (Smooth Quartz Stairs), `slab` (Smooth Quartz Slab) |  |  |
| `gray_stained_glass` | Gray Stained Glass | `full`, `pane` (Gray Stained Glass Pane) |  |  |
| `light_gray_stained_glass` | Light Gray Stained Glass | `full`, `pane` (Light Gray Stained Glass Pane) |  |  |
| `brown_stained_glass` | Brown Stained Glass | `full`, `pane` (Brown Stained Glass Pane) |  |  |

Leaves: the Volume 1 leaves and the new dark oak, jungle, acacia and mangrove leaves are solid; the three poplar
leaves (and azalea, bush and the other plants) are cutout, with small see-through gaps.

Wood sets: every planks key has `stairs`, `slab`, `fence` names. Every wood now has a stripped log (or stem, or
Block of Stripped Bamboo). Doors use `door(b, x, y, z, '<wood>_door', side)`,
trapdoors the `trapdoor` shape, gates the `gate` shape with the `<wood>_fence_gate` key. Logs and stems take `a='x'/'y'/'z'`.
Poplar leaves come in three colours only (red, orange, yellow); there is no plain "Poplar Leaves" block.

## Fences and walls join fence gates (engine patch in this module)

Volume 1's `engine.conn_mask` never joined a fence to a `<wood>_fence_gate` (it only matched keys containing
"planks"). The end of `nature2026.py` wraps `conn_mask` (in both `engine` and `plans`) so a `fence` or `wall`
joins a gate that lines up with it, like the game: a gate with `a='x'` joins on its east and west sides, `a='z'`
on its north and south sides. Put the gate in line with the fence. Integration TODO: move this rule into
`engine.conn_mask` and delete the wrapper.

## Known engine limits (not fixed here, engine.py is shared)

- Box overrides use one texture on every face, so the E/W straw bed uses a turned copy of the straw top
  (`SPECIAL['nat_straw_x']`). Shelves add `SPECIAL['nat_<wood>_shelf']` for planks-keyed shelves. Plant stems use
  `SPECIAL['nat_stem']` and `SPECIAL['nat_twig']`.
