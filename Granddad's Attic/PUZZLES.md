# Granddad's Attic - Puzzle Source of Truth

## Dependency Graph

```text
START
  -> Center View
  -> Footlocker puzzle: 6 / 14 / 46
  -> Inventory: BRASS_KEY, DIARY
  -> Diary puzzle: KRQRU shifted back three = HONOR
  -> Diary entries reveal date coordinates and Margaret's birthday
  -> Radio puzzle: brass key + tune to 97.0
  -> Radio message reveals music box
  -> Music box puzzle: Bb A D G E = BADGE
  -> Coatrack pocket yields BADGE
  -> Badge back shows Polybius square
  -> Diary coordinates decode to HONOR
  -> Painting reveals safe
  -> Safe puzzle: HONOR
  -> Final letter
  -> End screen
```

## Puzzle 1 - Footlocker

Object: WWII military footlocker.

Clue: Wedding photo inscription, "Hank & Margaret - 6.14.46."

Input: three 0-99 number dials.

Solution: `6`, `14`, `46`.

Reward:

- BRASS_KEY
- locked DIARY

Implementation notes:

- Wrong answer shakes and resets.
- Correct answer opens the lid and adds inventory.
- This puzzle teaches close inspection and numbers-as-clues.

## Puzzle 2 - Diary Lock

Object: leather diary with five letter dials.

Visible clue:

- Spine engraving: `KRQRU`
- Front cover note: "Sworn to silence. So I shifted three to the right. - H.W."

Solution: `HONOR`

Logic:

- KRQRU shifted three letters back becomes HONOR.

Reward:

- Five redacted diary date entries.
- One non-redacted entry naming Margaret's birthday as September 7.

Canonical diary dates:

- `2-3 / Apr 1943`
- `3-4 / May 1943`
- `3-3 / May 1943`
- `3-4 / Jun 1943`
- `4-2 / Jul 1943`

## Puzzle 3 - Radio

Object: vintage 1940s tube radio.

Gate: BRASS_KEY must be in inventory.

Clue:

- Brass key unlocks radio panel.
- Diary says Margaret's birthday is September 7.

Input: tuning dial from 88.0 to 108.0.

Solution: `97.0`

Success condition:

- Frequency held within 0.2 of 97.0 for 1.5 seconds.

Reward:

- Radio message plays.
- Loose floorboard rattles and reveals MUSIC_BOX.

Canonical radio message lives in `assets/text/voiceMessages.json`.

## Puzzle 4 - Music Box

Object: wooden music box.

Input: none. The solve is interpretive.

Melody:

- Bb: 466.16 Hz
- A: 440.00 Hz
- D: 293.66 Hz
- G: 392.00 Hz
- E: 329.63 Hz

Clue:

- Sheet music shows "Bb - A - D - G - E"
- Hint card: "Some words sound like music."

Solution realization: `BADGE`

State flag:

- `hint_badge_realized = true` when player clicks/examines the sheet music.

Reward:

- Coatrack jacket pocket becomes interactive.
- Player finds BADGE.

## Puzzle 5 - Badge / Polybius / Safe

Object: brass military badge.

Gate:

- BADGE must be in inventory.

Badge back:

```text
    1  2  3  4  5
1   A  B  C  D  E
2   F  G  H  I  K
3   L  M  N  O  P
4   Q  R  S  T  U
5   V  W  X  Y  Z
```

Diary coordinates:

```text
2-3, 3-4, 3-3, 3-4, 4-2
```

Decode:

```text
H O N O R
```

Safe input: five letter dials.

Solution: `HONOR`

Reward:

- Final letter.
- End screen with solve time.

## State Flags

- `footlockerUnlocked`
- `diaryUnlocked`
- `radioUnlocked`
- `radioMessageHeard`
- `floorboardRevealed`
- `musicBoxFound`
- `hint_badge_realized`
- `badgeFound`
- `paintingMoved`
- `safeUnlocked`
- `letterRead`

## Inventory Items

- `BRASS_KEY`
- `DIARY`
- `MUSIC_BOX`
- `BADGE`
