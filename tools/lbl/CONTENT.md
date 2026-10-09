# Layer by Layer 2: content files

All words in the book live in JSON under `layer-by-layer-2/data/content/`, except each build's own
words, which live next to its code in `tools/lbl/builds2/<file>.py` as `META` (the exporter copies
them into `data/catalog.json`). The web app reads these files; nothing is hard-coded in pages.

## Voice and rules (every file)

- Reader: a kid aged 8 to 11, often reading with a parent. Plain words. Most sentences under 15 words;
  none over 20. Talk to the reader ("you"). Be excited about the game without hype words.
- **No em dashes** (—) anywhere. Use a full stop, comma or colon. En dashes only in number ranges.
- Tip labels are only: `pro` (PRO TIP), `warn` (WATCH OUT), `know` (DID YOU KNOW?), `start` (START HERE).
- Game names exactly as Bedrock shows them (check minecraft.wiki): "Iron Chain" not "Chain",
  "Comparator" not "Redstone Comparator" (renamed in 26.50).
- Every fact about the game, a person, a record or an event needs a source URL in that item's
  `sources`. Prefer minecraft.net and minecraft.wiki; Guinness, official channels and major news next.
  If you cannot verify a fact, cut it.
- Never describe or ask for pictures of mobs, characters, logos, or real people's faces. Name real
  creators only as the makers of a project ("Build The Earth team", "Francisco C.M."). No YouTuber
  likenesses. Links to other sites are fine; the page shows "Ask a grown-up" before each one.
- Gentle tone about danger. No scary or violent detail. Survival advice is about being prepared.
- Dates: write "September 2026", not "9/26". The book is "updated October 2026, game version 26.50".

## data/content/showcase.json

```json
{
  "intro": "One or two sentences for the top of the Showcase.",
  "features": [{
    "id": "movie-build-challenge",
    "kicker": "WORLD NEWS",              // 1-3 words, shown as a small tag
    "headline": "Builders Made It Into a Movie",
    "deck": "One sentence that makes you want to read on.",
    "accent": "#f2c230",                 // a colour for this story
    "stats": [["21,000+", "builders entered"], ["16 x 16 x 32", "blocks per plot"]],
    "body": ["Paragraph.", "Paragraph."],          // 3-6 short paragraphs
    "pull": "A short line in our own words, big type.",
    "record": "Optional world record line.",
    "try_it": {"title": "Your Own 16 x 16 x 32 Challenge", "steps": ["...", "..."]},   // optional
    "links": [["Watch the winners", "https://..."]],   // optional, official pages only
    "sources": ["https://..."],
    "scene": "optional id of a figure or build to show in 3D beside the story"
  }]
}
```

## data/content/top10.json

```json
{
  "intro": "...",
  "items": [{
    "rank": 10, "id": "nautilus", "title": "Ride a Nautilus Underwater",
    "why": "One or two sentences: why this is cool.",
    "danger": 2,                    // 1 totally safe .. 5 very dangerous
    "level": "Beginner",            // Beginner | Explorer | Expert
    "where": "Where to find or do it.",
    "steps": ["...", "..."],        // 3-6 steps, imperative
    "need": ["Pufferfish", "..."],  // item names
    "wow_title": "...", "wow": "...",                 // a DID YOU KNOW? fact
    "note_kind": "warn", "note_title": "...", "note": "...",   // optional
    "sources": ["https://..."],
    "scene": "optional figure id"
  }]
}
```

## data/content/lessons.json (Master Builder Secrets)

Each lesson has a 3D figure (`tools/lbl/figures2/`) with one frame per step.

```json
{
  "intro": "...",
  "lessons": [{
    "id": "soft-curves", "title": "Soft Curves with Wool Stairs",
    "lead": "One or two sentences.",
    "figure": "soft-curves",
    "steps": [{"title": "Start with a box", "text": "..."}],   // steps[k] shows frame k+1
    "body": ["Optional extra paragraphs."],
    "tips": [["pro", "Title", "Text"]],
    "challenge": "A small task to try in the game.",
    "sources": ["https://..."]
  }]
}
```

## data/content/redstone.json (Redstone Workshop)

Each gadget is a figure whose frames are its states (off, on, ...). The reader taps the input.

```json
{
  "intro": "...",
  "gadgets": [{
    "id": "copper-doorbell", "title": "Copper Trumpet Doorbell",
    "lead": "...", "figure": "copper-doorbell",
    "input": "button",                       // what the reader taps: button | lever | plate | ...
    "states": [{"label": "Waiting", "text": "..."}, {"label": "Ding!", "text": "..."}],  // one per frame
    "parts": [["Note Block", 1], ["Block of Copper", 1], ["Stone Button", 1]],
    "steps": ["Place ...", "..."],
    "how": "How it works, 2-4 sentences.",
    "tips": [["warn", "Title", "Text"]],
    "sources": ["https://..."]
  }]
}
```

## data/content/book.json

Front matter, the home page, the For Grown-ups page and small strings.

```json
{
  "title": "Layer by Layer", "volume": "Volume 2", "subtitle": "...", "tagline": "...",
  "edition": "An unofficial guide for Minecraft: Bedrock Edition · Updated October 2026 (game version 26.50)",
  "disclaimer": "...",
  "home": {"hello": "...", "promise": ["...", "..."]},
  "howto": {"title": "How to Use This Book", "steps": [...], "plans": [...]},
  "grownups": {"title": "For Grown-ups", "sections": [{"title": "...", "body": ["..."]}]},
  "parts": [{"key": "builds", "title": "...", "nav": "...", "blurb": "..."}]
}
```

## Build META (in each builds2 module)

```python
META = {'cozy-cottage': dict(
    title='Cozy Cottage', kind='big',         # 'big' or 'mini'
    diff=2, mode='Survival',                  # difficulty 1-3; Survival-friendly or Creative
    pitch='A storybook home with a crossing roof.',            # 12 words max
    blurb='Two or three sentences.',
    tiers=['Starter: ...', 'Pro: ...', 'Legend: ...'],       # one line each (minis: one tier)
    teaches=['Crossing roofs', 'Log corners'],
    tips=[('pro', 'Title', 'Text'), ('know', 'Title', 'Text')],
    challenge='Make it yours: ...',
    dad="Dad's Corner: a question or job for the grown-up.",
    needs='26.50',                            # oldest game version with every block used
    new_blocks=['Poplar Planks'],             # blocks from 2025-2026 updates used here
    sources=['https://minecraft.wiki/w/...'],# for facts in tips
    palette=['Spruce Planks', 'Stone Bricks', 'White Terracotta'],
    time=0.38,                                # best time of day for the hero shot (0.3 morning .. 0.7 evening, 0.9 night)
    empty=[(x, y, z, w, h, d, 'Happy ghast parking')],   # optional dotted boxes for animal spaces, in the
                                              # same coordinates as your b.set calls (x, y, z = lowest corner)
    ground='grass_block',                     # the block around the build: 'grass_block' (default), 'sand',
                                              # 'water' (a sea around a ship), 'snow_block', 'stone', 'podzol'
    order=3,                                  # position in the book (big builds 1-10, minis 1-6)
    featured=False,                           # True for the one build shown live on the home page
)}
```

## Lessons and redstone: one file per item

Write each lesson to `tools/lbl/content/lessons/<id>.json` and each gadget to
`tools/lbl/content/redstone/<id>.json` (the shape of ONE item from the schemas above, plus `"order": n`).
`_intro.json` in each folder holds `{"intro": "..."}`. The exporter merges them into
`data/content/lessons.json` and `data/content/redstone.json`.

## Figure META

A figures2 module may export `META = {'<figure id>': dict(ground='grass_block' | 'sand' | 'stone' | None,
time=0.4, view='hero' | 'front' | 'side' | 'top')}`. `ground=None` means no ground under the figure.
