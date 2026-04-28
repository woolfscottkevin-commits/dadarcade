#!/usr/bin/env python3
"""Generate identity-consistent Dad Quest card art.

This pass intentionally avoids stochastic per-card character generation. Every
Hank/Doug/Brenda card is built from that character's locked portrait plus a
card-specific prop motif, so class identity stays consistent across rewards.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CARDS_JS = ROOT / "data" / "cards.js"
SIZE = 1024

TYPE_COLORS = {
    "attack": (210, 67, 56),
    "skill": (39, 126, 162),
    "power": (116, 82, 166),
    "curse": (46, 44, 54),
}

CLASS_THEMES = {
    "hank": {
        "portrait": ROOT / "assets" / "characters" / "char_hank.png",
        "sky": (99, 187, 221),
        "ground": (105, 159, 83),
        "accent": (246, 139, 38),
        "dark": (70, 91, 62),
        "light": (241, 228, 174),
    },
    "doug": {
        "portrait": ROOT / "assets" / "characters" / "char_doug.png",
        "sky": (142, 202, 197),
        "ground": (210, 189, 130),
        "accent": (96, 67, 46),
        "dark": (45, 71, 82),
        "light": (238, 225, 185),
    },
    "brenda": {
        "portrait": ROOT / "assets" / "characters" / "char_brenda.png",
        "sky": (127, 205, 194),
        "ground": (226, 168, 128),
        "accent": (233, 84, 75),
        "dark": (45, 60, 86),
        "light": (247, 224, 195),
    },
    "shared": {
        "sky": (112, 190, 220),
        "ground": (188, 207, 139),
        "accent": (246, 139, 38),
        "dark": (59, 73, 84),
        "light": (243, 231, 199),
    },
}


@dataclass
class Card:
    card_id: str
    name: str
    character: str
    card_type: str
    art: str


def parse_cards() -> list[Card]:
    text = CARDS_JS.read_text()
    cards: list[Card] = []
    for match in re.finditer(r"\{\s*id:\s*\"(?P<id>[^\"]+)\"(?P<body>.*?)\n\s*\},", text, re.S):
        body = match.group("body")
        art = field(body, "art")
        if not art:
            continue
        cards.append(
            Card(
                card_id=match.group("id"),
                name=field(body, "name") or match.group("id"),
                character=field(body, "character") or "shared",
                card_type=field(body, "type") or "skill",
                art=art,
            )
        )
    return cards


def field(body: str, name: str) -> str | None:
    found = re.search(rf"{name}:\s*\"([^\"]+)\"", body)
    return found.group(1) if found else None


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE))
    pix = img.load()
    for y in range(SIZE):
        t = y / (SIZE - 1)
        color = lerp(top, bottom, t)
        for x in range(SIZE):
            pix[x, y] = color
    return img


def draw_background(draw: ImageDraw.ImageDraw, theme: dict, card_type: str, card_id: str) -> None:
    type_color = TYPE_COLORS.get(card_type, TYPE_COLORS["skill"])
    cx, cy = 760, 210
    for radius, alpha in [(520, 38), (390, 46), (265, 58)]:
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(*type_color, alpha))

    stripe_color = tuple(max(0, c - 24) for c in theme["ground"])
    for i in range(-SIZE, SIZE * 2, 95):
        draw.line((i, SIZE, i + 620, 390), fill=stripe_color, width=14)

    if card_id.startswith("card_"):
        pass


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def paste_portrait(canvas: Image.Image, character: str, card_type: str) -> None:
    theme = CLASS_THEMES[character]
    src = Image.open(theme["portrait"]).convert("RGB")
    panel_size = (505, 700)
    portrait = ImageOps.fit(src, panel_size, Image.Resampling.LANCZOS, centering=(0.5, 0.43))
    panel = Image.new("RGBA", panel_size, (*theme["light"], 255))
    panel.alpha_composite(portrait.convert("RGBA"), (0, 0))

    shadow = Image.new("RGBA", (panel_size[0] + 34, panel_size[1] + 34), (0, 0, 0, 0))
    shadow_mask = rounded_mask(panel_size, 58).filter(ImageFilter.GaussianBlur(15))
    shadow.paste(Image.new("RGBA", panel_size, (0, 0, 0, 92)), (17, 17), shadow_mask)
    canvas.alpha_composite(shadow, (451, 154))

    border = Image.new("RGBA", (panel_size[0] + 18, panel_size[1] + 18), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border)
    border_draw.rounded_rectangle((0, 0, panel_size[0] + 17, panel_size[1] + 17), radius=66, fill=(*TYPE_COLORS.get(card_type, TYPE_COLORS["skill"]), 255))
    canvas.alpha_composite(border, (458, 148))
    canvas.paste(panel.convert("RGBA"), (467, 157), rounded_mask(panel_size, 58))


def paste_shared_portraits(canvas: Image.Image) -> None:
    positions = [("hank", (92, 178)), ("doug", (370, 130)), ("brenda", (648, 178))]
    for character, pos in positions:
        src = Image.open(CLASS_THEMES[character]["portrait"]).convert("RGB")
        portrait = ImageOps.fit(src, (260, 300), Image.Resampling.LANCZOS, centering=(0.5, 0.38))
        medallion = Image.new("RGBA", (292, 332), (0, 0, 0, 0))
        med_draw = ImageDraw.Draw(medallion)
        med_draw.rounded_rectangle((0, 0, 291, 331), radius=48, fill=(*CLASS_THEMES[character]["dark"], 255))
        medallion.paste(portrait.convert("RGBA"), (16, 16), rounded_mask((260, 300), 38))
        canvas.alpha_composite(medallion, pos)


def draw_icon(draw: ImageDraw.ImageDraw, card: Card, theme: dict) -> None:
    token = f"{card.card_id} {card.name}".lower()
    color = TYPE_COLORS.get(card.card_type, TYPE_COLORS["skill"])
    dark = theme["dark"]
    accent = theme["accent"]
    light = theme["light"]

    # Motif stage
    draw.rounded_rectangle((72, 602, 420, 880), radius=44, fill=(*light, 226), outline=dark, width=10)

    if any(k in token for k in ["mower", "mow down", "lawn"]):
        draw_mower(draw, color, dark, accent)
    elif any(k in token for k in ["hedge", "whacker", "trim"]):
        draw_shears(draw, color, dark)
    elif "blower" in token:
        draw_blower(draw, color, dark, accent)
    elif any(k in token for k in ["gnome", "suburbanite"]):
        draw_gnome(draw, color, dark, accent)
    elif any(k in token for k in ["sprinkler", "drought", "green thumb", "compost"]):
        draw_lawn(draw, color, dark, accent)
    elif any(k in token for k in ["shed", "workshop", "tinkerer", "tool"]):
        draw_tools(draw, color, dark, accent)
    elif any(k in token for k in ["nap", "snooze", "out of office"]):
        draw_moon(draw, color, dark, accent)
    elif any(k in token for k in ["list", "routine", "defend"]):
        draw_shield(draw, color, dark, accent)
    elif any(k in token for k in ["coffee", "espresso", "caffeine", "mug"]):
        draw_coffee(draw, color, dark, accent)
    elif any(k in token for k in ["email", "inbox", "open floor"]):
        draw_envelope(draw, color, dark, accent)
    elif any(k in token for k in ["spreadsheet", "performance", "bonus", "review"]):
        draw_chart(draw, color, dark, accent)
    elif any(k in token for k in ["stapler", "standing desk", "pivot", "synergy", "quiet quit", "grind"]):
        draw_office(draw, color, dark, accent)
    elif any(k in token for k in ["citation", "violation", "form", "compliance", "bylaws", "bulletin", "letter"]):
        draw_clipboard(draw, color, dark, accent)
    elif any(k in token for k in ["megaphone", "public", "petition", "meeting"]):
        draw_megaphone(draw, color, dark, accent)
    elif any(k in token for k in ["subpoena", "court", "cease", "petty", "treasury", "enforcement"]):
        draw_gavel(draw, color, dark, accent)
    elif any(k in token for k in ["panic", "last stand", "iron will"]):
        draw_shield(draw, color, dark, accent)
    elif any(k in token for k in ["adrenaline", "quick", "reinforcements"]):
        draw_burst(draw, color, dark, accent)
    else:
        draw_star(draw, color, dark, accent)

    draw_type_badge(draw, card.card_type, color, dark)


def draw_type_badge(draw: ImageDraw.ImageDraw, card_type: str, color: tuple[int, int, int], dark: tuple[int, int, int]) -> None:
    draw.ellipse((74, 72, 214, 212), fill=color, outline=dark, width=8)
    if card_type == "attack":
        draw.polygon([(145, 92), (176, 142), (147, 142), (174, 192), (102, 127), (135, 130)], fill=(255, 239, 174), outline=dark)
    elif card_type == "power":
        draw.arc((101, 98, 187, 184), start=10, end=310, fill=(255, 239, 174), width=14)
        draw.ellipse((132, 129, 158, 155), fill=(255, 239, 174), outline=dark, width=4)
    else:
        draw.polygon([(144, 94), (190, 115), (181, 174), (144, 194), (107, 174), (98, 115)], fill=(255, 239, 174), outline=dark)


def draw_mower(draw, color, dark, accent):
    draw.rounded_rectangle((128, 714, 322, 786), radius=22, fill=color, outline=dark, width=9)
    draw.rectangle((279, 676, 348, 733), fill=accent, outline=dark, width=7)
    draw.line((314, 686, 376, 628), fill=dark, width=12)
    draw.ellipse((142, 770, 204, 832), fill=dark)
    draw.ellipse((275, 770, 337, 832), fill=dark)


def draw_shears(draw, color, dark):
    draw.line((150, 805, 340, 650), fill=dark, width=16)
    draw.line((155, 650, 338, 805), fill=dark, width=16)
    draw.line((165, 790, 344, 644), fill=color, width=7)
    draw.line((168, 658, 338, 796), fill=color, width=7)
    draw.ellipse((107, 782, 178, 853), outline=dark, width=12)
    draw.ellipse((313, 782, 384, 853), outline=dark, width=12)


def draw_blower(draw, color, dark, accent):
    draw.rounded_rectangle((116, 695, 284, 790), radius=34, fill=color, outline=dark, width=8)
    draw.polygon([(273, 720), (392, 662), (405, 719), (289, 769)], fill=accent, outline=dark)
    for x in [102, 76, 52]:
        draw.arc((x, 650, x + 96, 766), start=230, end=60, fill=dark, width=8)


def draw_gnome(draw, color, dark, accent):
    draw.polygon([(244, 630), (145, 760), (346, 760)], fill=color, outline=dark)
    draw.ellipse((176, 720, 312, 846), fill=(238, 191, 156), outline=dark, width=8)
    draw.pieslice((178, 742, 314, 872), start=0, end=180, fill=accent, outline=dark, width=7)


def draw_lawn(draw, color, dark, accent):
    for x in range(112, 384, 38):
        draw.polygon([(x, 824), (x + 18, 676), (x + 40, 824)], fill=color, outline=dark)
    draw.ellipse((188, 664, 298, 774), fill=accent, outline=dark, width=7)
    for angle in range(0, 360, 45):
        x = 243 + math.cos(math.radians(angle)) * 95
        y = 719 + math.sin(math.radians(angle)) * 95
        draw.line((243, 719, x, y), fill=accent, width=8)


def draw_tools(draw, color, dark, accent):
    draw.line((145, 818, 340, 642), fill=dark, width=20)
    draw.line((158, 805, 328, 654), fill=accent, width=10)
    draw.polygon([(289, 628), (360, 658), (317, 702)], fill=color, outline=dark)
    draw.rounded_rectangle((129, 664, 218, 725), radius=18, fill=color, outline=dark, width=8)


def draw_moon(draw, color, dark, accent):
    draw.ellipse((154, 665, 318, 829), fill=color, outline=dark, width=9)
    draw.ellipse((209, 626, 362, 792), fill=(241, 228, 174), outline=(241, 228, 174), width=0)
    for x, y in [(130, 640), (350, 690), (320, 842)]:
        draw_star_at(draw, x, y, accent, dark, 22)


def draw_shield(draw, color, dark, accent):
    draw.polygon([(244, 638), (360, 690), (336, 810), (244, 852), (152, 810), (128, 690)], fill=color, outline=dark)
    draw.polygon([(244, 694), (298, 718), (287, 782), (244, 804), (201, 782), (190, 718)], fill=accent, outline=dark)


def draw_coffee(draw, color, dark, accent):
    draw.rounded_rectangle((150, 688, 302, 828), radius=26, fill=(248, 238, 205), outline=dark, width=9)
    draw.arc((282, 720, 370, 800), start=270, end=90, fill=dark, width=12)
    draw.rectangle((144, 666, 309, 704), fill=color, outline=dark, width=8)
    for x in [181, 231, 281]:
        draw.arc((x, 610, x + 42, 676), start=95, end=270, fill=accent, width=8)


def draw_envelope(draw, color, dark, accent):
    draw.rectangle((123, 686, 365, 826), fill=(248, 238, 205), outline=dark, width=9)
    draw.line((123, 686, 244, 774, 365, 686), fill=dark, width=8)
    draw.line((123, 826, 218, 745), fill=dark, width=8)
    draw.line((365, 826, 270, 745), fill=dark, width=8)
    draw.circle = None
    draw.ellipse((319, 632, 386, 699), fill=color, outline=dark, width=7)


def draw_chart(draw, color, dark, accent):
    draw.rectangle((133, 648, 356, 846), fill=(248, 238, 205), outline=dark, width=9)
    for i, h in enumerate([74, 124, 96]):
        x = 174 + i * 55
        draw.rectangle((x, 806 - h, x + 34, 806), fill=[color, accent, dark][i], outline=dark, width=5)
    draw.line((164, 704, 330, 704), fill=dark, width=6)


def draw_office(draw, color, dark, accent):
    draw.rounded_rectangle((136, 680, 350, 820), radius=22, fill=(238, 225, 185), outline=dark, width=9)
    draw.rectangle((165, 716, 322, 790), fill=color, outline=dark, width=7)
    draw.rectangle((198, 642, 286, 704), fill=accent, outline=dark, width=7)
    draw.line((244, 820, 244, 860), fill=dark, width=10)


def draw_clipboard(draw, color, dark, accent):
    draw.rounded_rectangle((143, 642, 344, 854), radius=28, fill=color, outline=dark, width=9)
    draw.rounded_rectangle((187, 620, 300, 676), radius=18, fill=accent, outline=dark, width=7)
    for y in [710, 756, 802]:
        draw.line((183, y, 305, y), fill=(248, 238, 205), width=10)


def draw_megaphone(draw, color, dark, accent):
    draw.polygon([(139, 722), (313, 656), (349, 820), (139, 782)], fill=color, outline=dark)
    draw.rounded_rectangle((111, 720, 174, 786), radius=18, fill=accent, outline=dark, width=8)
    draw.line((189, 786, 222, 854), fill=dark, width=14)
    for r in [38, 70, 104]:
        draw.arc((322, 685 - r, 322 + r, 787 + r), start=280, end=80, fill=dark, width=7)


def draw_gavel(draw, color, dark, accent):
    draw.rotate = None
    draw.rounded_rectangle((154, 670, 298, 736), radius=18, fill=color, outline=dark, width=8)
    draw.rounded_rectangle((280, 696, 354, 759), radius=18, fill=color, outline=dark, width=8)
    draw.line((198, 742, 334, 850), fill=dark, width=18)
    draw.line((207, 748, 328, 842), fill=accent, width=8)


def draw_burst(draw, color, dark, accent):
    points = []
    for i in range(18):
        radius = 128 if i % 2 == 0 else 70
        angle = math.radians(i * 20 - 90)
        points.append((244 + math.cos(angle) * radius, 744 + math.sin(angle) * radius))
    draw.polygon(points, fill=color, outline=dark)
    draw.ellipse((190, 690, 298, 798), fill=accent, outline=dark, width=7)


def draw_star(draw, color, dark, accent):
    draw_star_at(draw, 244, 744, color, dark, 132)
    draw.ellipse((203, 703, 285, 785), fill=accent, outline=dark, width=7)


def draw_star_at(draw, cx, cy, color, dark, radius):
    points = []
    for i in range(10):
        r = radius if i % 2 == 0 else radius * 0.45
        angle = math.radians(i * 36 - 90)
        points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    draw.polygon(points, fill=color, outline=dark)


def final_treatment(canvas: Image.Image, card: Card, theme: dict) -> Image.Image:
    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    border = TYPE_COLORS.get(card.card_type, TYPE_COLORS["skill"])
    d.rounded_rectangle((18, 18, SIZE - 19, SIZE - 19), radius=82, outline=(*theme["dark"], 255), width=18)
    d.rounded_rectangle((42, 42, SIZE - 43, SIZE - 43), radius=64, outline=(*border, 240), width=12)
    d.rectangle((0, SIZE - 120, SIZE, SIZE), fill=(0, 0, 0, 18))
    canvas.alpha_composite(overlay)
    return canvas.convert("RGB")


def generate_card(card: Card) -> Image.Image:
    character = card.character if card.character in CLASS_THEMES else "shared"
    theme = CLASS_THEMES[character]
    base = make_gradient(theme["sky"], theme["ground"]).convert("RGBA")
    draw = ImageDraw.Draw(base, "RGBA")
    draw_background(draw, theme, card.card_type, card.card_id)

    if character == "shared":
        paste_shared_portraits(base)
    else:
        paste_portrait(base, character, card.card_type)

    draw = ImageDraw.Draw(base, "RGBA")
    draw_icon(draw, card, theme)
    return final_treatment(base, card, theme)


def main() -> None:
    cards = parse_cards()
    for card in cards:
        out = ROOT / card.art
        out.parent.mkdir(parents=True, exist_ok=True)
        generate_card(card).save(out, "PNG", optimize=True)
    print(f"Generated {len(cards)} consistent card art files.")


if __name__ == "__main__":
    main()
