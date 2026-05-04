# Granddad's Attic - Phase 2 Selection Sheet

Phase 2 generation is complete. Pick the strongest MidJourney image index for each asset: `0`, `1`, `2`, or `3`.

Locked style reference:

```text
--sref https://s.mj.run/3rugejTXYQY
```

Selection rule of thumb: prefer consistency with the locked attic style over perfect object detail, except for clue images where readability matters. If an image has important text that MidJourney did not render cleanly, select the best composition and plan to overlay the clue text in HTML/CSS for accessibility.

## Establishing / Navigation Views

| Asset | Target path | MidJourney candidates | Selected index | Notes |
| --- | --- | --- | --- | --- |
| center | `assets/scenes/center.webp` | [open](https://www.midjourney.com/jobs/66599ed9-8ccf-4c56-8592-5d7192810d05?index=0) |  | Main room anchor: window, trunk, desk, coatrack, painting. |
| desk | `assets/scenes/desk.webp` | [open](https://www.midjourney.com/jobs/bb81b1d2-3ac9-4639-8d00-d022757affa4?index=0) |  | Needs readable navigation affordance for radio/diary area. |
| footlocker | `assets/scenes/footlocker.webp` | [open](https://www.midjourney.com/jobs/76ea445f-28ea-49a9-b8df-55b455b29c32?index=0) |  | Footlocker should feel important without being too close. |
| coatrack | `assets/scenes/coatrack.webp` | [open](https://www.midjourney.com/jobs/30fd2a02-943b-4616-9e0f-cfdec241048d?index=0) |  | Uniform and badge pickup area. |
| painting | `assets/scenes/painting.webp` | [open](https://www.midjourney.com/jobs/b38ca414-771c-4e40-91e2-8fae3244ebaa?index=0) |  | Painting should clearly be interactable. |
| window | `assets/scenes/window.webp` | [open](https://www.midjourney.com/jobs/900ae956-d253-44aa-a5d5-27ec5cfa0ceb?index=0) |  | Mood view, avoid any open-wall/exterior-heavy options. |

## Scene State Variants

| Asset | Target path | MidJourney candidates | Selected index | Notes |
| --- | --- | --- | --- | --- |
| footlocker-open | `assets/scenes/footlocker-open.webp` | [open](https://www.midjourney.com/jobs/cb187911-04d9-4e3d-a213-792affb1b535?index=0) |  | Should clearly show diary/key reward. |
| floorboard-reveal | `assets/scenes/floorboard-reveal.webp` | [open](https://www.midjourney.com/jobs/2a96a054-5feb-4931-9e7d-288b08a776bb?index=0) |  | Needs visible loose board and hidden music box. |
| painting-moved | `assets/scenes/painting-moved.webp` | [open](https://www.midjourney.com/jobs/17c4f94b-9f6e-4952-9efa-8298360940ca?index=0) |  | Safe reveal should read immediately. |
| safe-open | `assets/scenes/safe-open.webp` | [open](https://www.midjourney.com/jobs/14f8148e-c7ca-4aa6-97c0-d48df44c3f0e?index=0) |  | Final letter should be visible in the safe. |

## Object Close-Ups

| Asset | Target path | MidJourney candidates | Selected index | Notes |
| --- | --- | --- | --- | --- |
| wedding-photo-front | `assets/closeups/wedding-photo-front.webp` | [open](https://www.midjourney.com/jobs/162d45a5-0455-4433-beeb-d3535581ecb0?index=0) |  | No need for clear faces; mood and prop readability matter. |
| wedding-photo-back | `assets/closeups/wedding-photo-back.webp` | [open](https://www.midjourney.com/jobs/804b2abb-8a73-41d7-87a2-4715ee893078?index=0) |  | If inscription is garbled, use HTML overlay for the clue. |
| footlocker-lock | `assets/closeups/footlocker-lock.webp` | [open](https://www.midjourney.com/jobs/47f7296f-f083-48cf-8609-2c70b3499a21?index=0) |  | Dials should be clean enough for a combination puzzle. |
| diary-locked | `assets/closeups/diary-locked.webp` | [open](https://www.midjourney.com/jobs/808ad5a3-751f-4e86-a775-e5fcc38d0f0c?index=0) |  | `KRQRU` may need HTML overlay if unreadable. |
| diary-front-cover | `assets/closeups/diary-front-cover.webp` | [open](https://www.midjourney.com/jobs/d020ce4b-70f5-4203-be03-b913dc6c46e6?index=0) |  | Note text likely needs HTML overlay for reliability. |
| diary-open | `assets/closeups/diary-open.webp` | [open](https://www.midjourney.com/jobs/de37f832-e756-43b0-8b5a-acb8a89f54e9?index=0) |  | Choose the best diary layout; render exact clues in-game. |
| radio-locked | `assets/closeups/radio-locked.webp` | [open](https://www.midjourney.com/jobs/3faa729e-c86a-442d-a3ec-68800c489216?index=0) |  | Keyhole/panel should be obvious. |
| radio-tuning | `assets/closeups/radio-tuning.webp` | [open](https://www.midjourney.com/jobs/117d9b1e-b3dc-41e9-9701-9ccf5a62c72a?index=0) |  | Dial should support an 88-108 style puzzle UI. |
| music-box-closed | `assets/closeups/music-box-closed.webp` | [open](https://www.midjourney.com/jobs/0f45a3c6-d520-4a94-9635-b81d26a8e45f?index=0) |  | Needs a clear small-object silhouette. |
| music-box-open | `assets/closeups/music-box-open.webp` | [open](https://www.midjourney.com/jobs/9e5a3097-c3fb-4291-85f0-5ef110f555c2?index=0) |  | Mechanism and sheet clue area should be visible. |
| sheet-music | `assets/closeups/sheet-music.webp` | [open](https://www.midjourney.com/jobs/f9a70069-210b-49c1-ae89-c27174e2f5f1?index=0) |  | `Bb - A - D - G - E` likely needs HTML overlay. |
| badge-front | `assets/closeups/badge-front.webp` | [open](https://www.midjourney.com/jobs/03ce3d75-89f3-4158-9281-44856301baec?index=0) |  | Text may be decorative; exact service clue can be rendered in UI. |
| badge-back | `assets/closeups/badge-back.webp` | [open](https://www.midjourney.com/jobs/d73b8324-a56d-484a-8af8-8e395a4ba155?index=0) |  | Polybius grid almost certainly needs HTML overlay for exact letters. |
| safe-lock | `assets/closeups/safe-lock.webp` | [open](https://www.midjourney.com/jobs/8677446a-dcc2-4507-bdc1-1f1ad5b8d401?index=0) |  | Five dials should read clearly; exact letters can be UI controls. |
| final-letter | `assets/closeups/final-letter.webp` | [open](https://www.midjourney.com/jobs/285b271d-0d4e-4c4e-9948-e102981205ba?index=0) |  | Letter body should be rendered in HTML for accessibility. |

## Optional Polish

| Asset | Target path | MidJourney candidates | Selected index | Notes |
| --- | --- | --- | --- | --- |
| center-late | `assets/scenes/center-late.webp` | [open](https://www.midjourney.com/jobs/df59b927-3d1c-4bf3-8b75-5ba3ab8022af?index=0) |  | Late-game mood variant after safe reveal. |
| end | `assets/scenes/end.webp` | [open](https://www.midjourney.com/jobs/bf8df138-8e54-4b3b-9fc7-86619e4df424?index=0) |  | End screen background; softness is acceptable. |

## After Selection

1. Fill in `Selected index` for each row.
2. Download or export the chosen image for each selected job/index.
3. Save each file to its listed target path.
4. Keep exact puzzle/clue text in HTML wherever MidJourney text is even slightly unreliable.
