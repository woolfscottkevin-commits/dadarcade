# Granddad's Attic - Phase 2 Asset List

All final image generations use:

```text
--sref https://s.mj.run/3rugejTXYQY
```

Default establishing suffix:

```text
--ar 16:9 --style raw --v 7 --sref https://s.mj.run/3rugejTXYQY --sw 100
```

Default close-up suffix:

```text
--ar 16:9 --style raw --v 7 --sref https://s.mj.run/3rugejTXYQY --sw 50
```

## Establishing / Navigation Views

1. `assets/scenes/center.webp`
   Prompt: Attic center view facing a closed dormer window, old steamer trunk in foreground, antique desk to the left with vintage radio, coatrack with faded WWII Navy uniform jacket to the right, crooked painting on far wall, framed sepia family photographs, worn wood floor, exposed rafters, warm golden hour light, dust motes, no people.

2. `assets/scenes/desk.webp`
   Prompt: Attic desk view, antique wooden writing desk in foreground, vintage 1940s tube radio with brass dial, leather diary space on desk, lamp, paper scraps, brass key detail, same closed dormer window light, same warm dusty attic, no people.

3. `assets/scenes/footlocker.webp`
   Prompt: Footlocker/trunk view, WWII military footlocker in foreground with brass clasps and combination lock, worn leather suitcase beside it, same attic walls and rafters, framed photos in background, warm golden hour light, no people.

4. `assets/scenes/coatrack.webp`
   Prompt: Coatrack/uniform view, wooden coatrack holding faded olive-green WWII Navy uniform jacket with brass buttons, sailor cap, shelf with old boxes, framed sepia photo on wall, same warm attic light, no people.

5. `assets/scenes/painting.webp`
   Prompt: Painting/safe wall view, crooked framed landscape painting on attic wall, subtle marks where it has moved, steamer trunk and desk details in peripheral shadow, closed dormer window glow, warm dust, no people.

6. `assets/scenes/window.webp`
   Prompt: Quiet attic window view, closed dormer window with warm golden hour light, dust in beams, rooftops only faintly visible through old glass, worn wood sill with small family photograph, no people.

## Scene State Variants

7. `assets/scenes/footlocker-open.webp`
   Footlocker open with diary and brass radio key visible inside, folded uniform fabric, warm dust, no people.

8. `assets/scenes/floorboard-reveal.webp`
   Desk-side attic floor with loose wooden floorboard raised, small wooden music box hidden underneath, radio nearby in soft focus, no people.

9. `assets/scenes/painting-moved.webp`
   Crooked painting slid aside revealing small wall safe, warm attic shadows, no people.

10. `assets/scenes/safe-open.webp`
    Small wall safe open behind painting, folded letter inside, warm light and dust, no people.

## Object Close-Ups

11. `assets/closeups/wedding-photo-front.webp`
    Framed 1940s wedding photo on wooden attic surface, no readable faces required, warm light, brass frame.

12. `assets/closeups/wedding-photo-back.webp`
    Back of framed wedding photo with inscription "Hank & Margaret - 6.14.46" clearly readable.

13. `assets/closeups/footlocker-lock.webp`
    Brass 3-number footlocker combination lock, dials readable, worn metal, old wood, warm light.

14. `assets/closeups/diary-locked.webp`
    Old leather-bound diary with small brass five-letter lock, spine/cover engraving KRQRU visible.

15. `assets/closeups/diary-front-cover.webp`
    Diary inside front cover with note "Sworn to silence. So I shifted three to the right. - H.W." clearly readable.

16. `assets/closeups/diary-open.webp`
    Open diary pages with redacted entries and visible date coordinates, warm desk light.

17. `assets/closeups/radio-locked.webp`
    Vintage tube radio rear/key panel with brass keyhole, dusty desk.

18. `assets/closeups/radio-tuning.webp`
    Vintage tube radio front, frequency dial 88-108 readable, warm illuminated dial.

19. `assets/closeups/music-box-closed.webp`
    Small wooden music box on attic floor or desk, closed lid, worn brass hinge.

20. `assets/closeups/music-box-open.webp`
    Music box open with mechanism visible, warm light.

21. `assets/closeups/sheet-music.webp`
    Sheet music card inside lid with "Bb - A - D - G - E" clearly readable.

22. `assets/closeups/badge-front.webp`
    Tarnished brass military badge, engraved "H. WALSH, USNR - FRUMEL 1942-1945" if possible.

23. `assets/closeups/badge-back.webp`
    Back of badge with 5x5 Polybius grid clearly readable.

24. `assets/closeups/safe-lock.webp`
    Wall safe close-up with five letter dials, brass/steel worn surface.

25. `assets/closeups/final-letter.webp`
    Folded letter on safe shelf, readable opening line optional; final text is rendered in HTML for accessibility.

## Optional Polish

26. `assets/scenes/center-late.webp`
    Warmer late-game version of center view after safe reveal.

27. `assets/scenes/end.webp`
    Soft-focus attic scene for end screen background.

## Generation Warnings

- Reject open-wall or large exterior-view images.
- Reject images with people, hands, pets, birds, modern objects, or clean modern renovation.
- Reject unreadable text for clues that must be readable; regenerate those until text is usable, or plan to overlay HTML text.
- Keep all final gameplay clue text accessible in HTML even when included in art.
