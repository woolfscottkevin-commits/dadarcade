# Granddad's Attic - Locked Visual Style

## Phase 0 Status

Style lock passed on May 3, 2026.

The locked register is Prompt C from Stage 1: Myst-inspired pre-rendered attic realism. It gives the project the best balance of warmth, puzzle-object readability, and navigable game-scene composition.

## Anchor Reference

Selected anchor: Stage 2 wider composition push, top-left.

Anchor job:

```text
36dcf5cf-c23a-4f74-a2d3-1c904a258de2?index=0
```

Midjourney style reference:

```text
--sref https://s.mj.run/3rugejTXYQY
```

Direct anchor image URL:

```text
https://cdn.midjourney.com/36dcf5cf-c23a-4f74-a2d3-1c904a258de2/0_0_640_N.webp
```

Use:

```text
--sw 100
```

for establishing shots. Use:

```text
--sw 50
```

for tight object close-ups if object accuracy starts to drift.

## Master Prompt Template

```text
{SCENE_DESCRIPTION}, pre-rendered 3D scene, warm golden hour lighting, single dormer window casting long light beams, dust motes visible, 1940s era furniture and possessions, wooden floor, exposed rafters, framed photographs, worn wood, old leather, brass details, faded fabric, classic Myst 1993 pre-rendered aesthetic, Cyan Worlds visual style, soft volumetric lighting, painterly textures, warm sepia and amber palette, mysterious contemplative atmosphere, no people, empty room --ar 16:9 --style raw --v 7 --sref https://s.mj.run/3rugejTXYQY --sw 100
```

## Master Prompt - Anchor Example

```text
Pre-rendered 3D scene of an attic interior, warm golden hour lighting, single window casting long light beams, dust motes visible, 1940s era furniture and possessions, wooden trunk, vintage radio, old uniform on coatrack, framed photographs, painting on wall, classic Myst 1993 pre-rendered aesthetic, Cyan Worlds visual style, soft volumetric lighting, painterly textures, warm sepia and amber palette, mysterious contemplative atmosphere, empty room, wider angle showing more of the room, trunk in foreground, window in background, balanced composition --ar 16:9 --style raw --v 7
```

## Locked Palette

Approximate palette from the anchor:

- Warm wood: #7A4F32
- Sun amber: #E2A75D
- Deep shadow: #211A16
- Window glow: #EBCB8B
- Brass: #B38245
- Faded leather: #5B3A28
- Muted uniform green-gray: #3C4740

## Approved Test Angles

Save the selected browser-captured preview references as:

- style-reference/anchor.png
- style-reference/test-angle-1-trunk.png
- style-reference/test-angle-2-desk.png
- style-reference/test-angle-3-coatrack.png
- style-reference/closeup-1-diary.png
- style-reference/closeup-2-radio.png
- style-reference/closeup-3-badge.png

These PNGs are preview captures from the Midjourney web UI. Use the job IDs below as the canonical source for original downloads or future remixing.

Selected Midjourney references:

- Anchor: 36dcf5cf-c23a-4f74-a2d3-1c904a258de2, index 0
- Trunk angle: e0892ffb-c021-449c-830c-7a6667b033a1, index 0
- Desk angle: b08afc3f-b910-41e8-8cc5-c48d58d71105, index 1
- Coatrack angle: 217b61e8-7390-43dd-9c7d-d7d0d02b7318, index 2
- Diary close-up: 44d338a1-3e95-4cea-839a-60d33bed9403, index 0
- Radio close-up: 75f785ff-0b5b-4c80-b152-9f1d7362e90c, index 0
- Badge close-up: 111b66ee-8f36-44e0-9628-191655602567, index 1

## Stage 3 Gate Result

Passed with notes.

The selected trunk, desk, and coatrack variants share the same warm dusty attic, wood tones, rafters, steamer trunks, and golden directional light. Some alternate variants introduced too much exterior scenery through windows. Do not use those as primary references for final scene generation.

## Stage 4 Close-Up Result

Passed.

The diary, radio, and badge close-ups preserve the same warm sepia/amber material world. The close-up prompt should keep `--sw 50` by default so object specificity stays strong.

## Generation Rules for Phase 2

1. Every final generation uses `--sref https://s.mj.run/3rugejTXYQY`.
2. Default to `--sw 100` for establishing scenes.
3. Use `--sw 50` for tight object close-ups.
4. Use `--ar 16:9` for desktop establishing and close-up art.
5. Generate separate `--ar 9:16` mobile variants only after desktop framing is locked.
6. Always include `warm golden hour lighting` or `warm afternoon golden hour light`.
7. Always include `1940s era` for period consistency.
8. Always include `no people`.
9. For attic scenes, prefer `closed dormer window`, `wooden floor`, `exposed rafters`, `framed photographs`, `old leather`, `brass details`, and `faded fabric`.
10. Avoid prompts that create open exterior vistas, ocean views, birds, city skylines, missing walls, or overly clean modern rooms.
11. End every prompt with `--ar 16:9 --style raw --v 7 --sref https://s.mj.run/3rugejTXYQY --sw 100` unless intentionally using close-up `--sw 50`.

## Rejected Directions

- Prompt B, painterly storybook: warm and charming, but too illustrated for the final Myst-style direction.
- Prompt D, photographic documentary: grounded, but flatter and less gameable.
- Open-window/exterior variants from Stage 3: attractive, but they weaken the one-room attic continuity.
- Badge variants that look like sheriff stars or generic medals should not be used for final asset generation.

## Phase 2 Generation List

To be copied in from the Phase 2 asset plan once scene production begins.
