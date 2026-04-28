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


def paste_hank_badge(canvas: Image.Image, card_type: str) -> None:
    theme = CLASS_THEMES["hank"]
    src = Image.open(theme["portrait"]).convert("RGB")
    portrait = ImageOps.fit(src, (258, 300), Image.Resampling.LANCZOS, centering=(0.5, 0.34))
    badge = Image.new("RGBA", (306, 348), (0, 0, 0, 0))
    d = ImageDraw.Draw(badge, "RGBA")
    d.rounded_rectangle((0, 0, 305, 347), radius=54, fill=(*TYPE_COLORS.get(card_type, TYPE_COLORS["skill"]), 255))
    d.rounded_rectangle((12, 12, 293, 335), radius=44, fill=(*theme["light"], 255))
    badge.paste(portrait.convert("RGBA"), (24, 24), rounded_mask((258, 300), 36))
    canvas.alpha_composite(badge, (658, 90))


def generate_hank_card(card: Card) -> Image.Image:
    theme = CLASS_THEMES["hank"]
    base = make_gradient((111, 197, 226), (218, 232, 189)).convert("RGBA")
    draw = ImageDraw.Draw(base, "RGBA")
    draw_hank_yard_backdrop(draw, theme, card.card_type)
    draw_type_badge(draw, card.card_type, TYPE_COLORS.get(card.card_type, TYPE_COLORS["skill"]), theme["dark"])
    paste_hank_badge(base, card.card_type)
    draw = ImageDraw.Draw(base, "RGBA")
    draw_hank_feature(draw, card, theme)
    return final_treatment(base, card, theme)


def draw_hank_yard_backdrop(draw: ImageDraw.ImageDraw, theme: dict, card_type: str) -> None:
    type_color = TYPE_COLORS.get(card_type, TYPE_COLORS["skill"])
    draw.rectangle((0, 0, SIZE, 372), fill=(118, 202, 229, 255))
    draw.polygon([(0, 320), (1024, 240), (1024, 440), (0, 450)], fill=(239, 231, 189, 255), outline=theme["dark"])
    draw.rectangle((0, 365, 1024, 470), fill=(196, 166, 106, 255), outline=theme["dark"])
    for x in range(-40, 1060, 86):
        draw.rectangle((x, 368, x + 48, 470), fill=(223, 196, 138, 255), outline=(116, 83, 55, 180))
    draw.rectangle((0, 470, 1024, 1024), fill=(103, 164, 84, 255))
    for x in range(-220, 1200, 86):
        draw.line((x, 1024, x + 660, 458), fill=(69, 132, 67, 135), width=16)
    draw.ellipse((650, -170, 1190, 370), fill=(*type_color, 54))
    draw.ellipse((720, -85, 1080, 275), fill=(*type_color, 76))


def draw_hank_feature(draw: ImageDraw.ImageDraw, card: Card, theme: dict) -> None:
    token = f"{card.card_id} {card.name}".lower()
    color = TYPE_COLORS.get(card.card_type, TYPE_COLORS["skill"])
    dark = theme["dark"]
    accent = theme["accent"]
    cream = theme["light"]

    draw.rounded_rectangle((72, 552, 604, 888), radius=52, fill=(*cream, 230), outline=dark, width=12)

    if "strike_hank" in token:
        draw_rake_strike(draw, color, dark, accent)
    elif "mow_down" in token or "riding_mower" in token:
        draw_big_mower(draw, color, dark, accent, riding="riding" in token)
    elif "hedge_trim" in token:
        draw_big_shears(draw, color, dark, accent)
    elif "leaf_blower" in token:
        draw_big_blower(draw, color, dark, accent)
    elif "weed_whacker" in token:
        draw_string_trimmer(draw, color, dark, accent)
    elif "lawn_aerator" in token:
        draw_aerator(draw, color, dark, accent)
    elif "garden_gnome" in token:
        draw_big_gnome(draw, color, dark, accent)
    elif "sprinkler_strike" in token:
        draw_sprinkler(draw, color, dark, accent)
    elif "drought_strike" in token:
        draw_drought(draw, color, dark, accent)
    elif "defend_hank" in token:
        draw_fence_shield(draw, color, dark, accent)
    elif "saturday_routine" in token:
        draw_saturday_chores(draw, color, dark, accent)
    elif "weekend_warrior" in token:
        draw_toolbelt_energy(draw, color, dark, accent)
    elif "compost_pile" in token:
        draw_compost(draw, color, dark, accent)
    elif "power_nap" in token:
        draw_lawn_chair(draw, color, dark, accent)
    elif "tool_shed" in token:
        draw_shed_scene(draw, color, dark, accent)
    elif "garage_workshop" in token:
        draw_workbench(draw, color, dark, accent)
    elif "honey_do_list" in token:
        draw_checklist(draw, color, dark, accent)
    elif "green_thumb" in token:
        draw_green_thumb(draw, color, dark, accent)
    elif "big_box_membership" in token:
        draw_membership_card(draw, color, dark, accent)
    elif "suburbanite" in token:
        draw_suburban_house(draw, color, dark, accent)
    elif "tinkerer" in token:
        draw_tools(draw, color, dark, accent)
    else:
        draw_lawn(draw, color, dark, accent)

    draw_yard_work_hint(draw, token, dark, accent)


def draw_yard_work_hint(draw, token: str, dark, accent) -> None:
    gains = any(k in token for k in ["mow_down", "sprinkler", "saturday", "compost", "green_thumb", "suburbanite"])
    spends = any(k in token for k in ["weed_whacker", "drought", "garage"])
    if not gains and not spends:
        return
    label = "+ Yard Work" if gains else "Uses Yard Work"
    fill = (220, 237, 200, 248) if gains else (255, 223, 132, 248)
    draw.rounded_rectangle((96, 900, 528, 970), radius=28, fill=fill, outline=dark, width=7)
    draw.text((126, 915), label, fill=dark)
    for i in range(3):
        x = 380 + i * 34
        draw.polygon([(x, 954), (x + 13, 914), (x + 29, 954)], fill=(88, 150, 74), outline=dark)
    if spends:
        draw.arc((402, 910, 500, 978), start=190, end=350, fill=accent, width=8)


def draw_rake_strike(draw, color, dark, accent):
    # Readable at card size: a big rake head scraping a leaf pile,
    # not a tiny prop lost in the corner.
    draw.polygon([(108, 840), (548, 840), (528, 888), (130, 888)], fill=(82, 145, 70), outline=dark)
    for x, y in [(132, 734), (190, 708), (246, 756), (314, 722), (380, 760)]:
        draw_leaf(draw, x, y, dark, accent)
    draw.line((184, 814, 486, 606), fill=dark, width=28)
    draw.line((198, 804, 474, 614), fill=(176, 116, 57), width=14)
    draw.line((140, 788, 324, 848), fill=dark, width=20)
    draw.line((150, 786, 314, 840), fill=color, width=10)
    for x in range(152, 318, 28):
        draw.line((x, 792, x - 18, 858), fill=dark, width=8)
        draw.line((x + 2, 796, x - 12, 848), fill=(239, 231, 189), width=4)
    draw.arc((124, 650, 520, 916), start=205, end=332, fill=accent, width=10)


def draw_big_mower(draw, color, dark, accent, riding=False):
    if riding:
        draw.rounded_rectangle((128, 690, 488, 802), radius=32, fill=color, outline=dark, width=12)
        draw.rectangle((316, 610, 460, 710), fill=accent, outline=dark, width=10)
        draw.ellipse((154, 778, 258, 882), fill=dark)
        draw.ellipse((380, 778, 484, 882), fill=dark)
        draw.rectangle((242, 574, 322, 664), fill=(119, 151, 132), outline=dark, width=8)
    else:
        draw.rounded_rectangle((132, 708, 392, 804), radius=28, fill=color, outline=dark, width=12)
        draw.rectangle((330, 650, 460, 734), fill=accent, outline=dark, width=9)
        draw.line((405, 666, 528, 548), fill=dark, width=16)
        draw.ellipse((154, 784, 234, 864), fill=dark)
        draw.ellipse((330, 784, 410, 864), fill=dark)
    for x in range(112, 520, 50):
        draw.polygon([(x, 892), (x + 16, 824), (x + 36, 892)], fill=(83, 144, 74), outline=dark)


def draw_big_shears(draw, color, dark, accent):
    draw.line((150, 812, 518, 610), fill=dark, width=24)
    draw.line((150, 612, 518, 814), fill=dark, width=24)
    draw.line((168, 798, 500, 622), fill=color, width=11)
    draw.line((168, 626, 500, 800), fill=color, width=11)
    draw.ellipse((104, 760, 210, 866), outline=accent, width=18)
    draw.ellipse((448, 760, 554, 866), outline=accent, width=18)
    draw.rounded_rectangle((98, 570, 550, 625), radius=22, fill=(75, 133, 64), outline=dark, width=8)


def draw_big_blower(draw, color, dark, accent):
    draw.rounded_rectangle((126, 695, 340, 820), radius=38, fill=color, outline=dark, width=12)
    draw.polygon([(322, 718), (542, 628), (566, 714), (342, 786)], fill=accent, outline=dark)
    draw.arc((60, 612, 220, 820), start=235, end=70, fill=dark, width=10)
    draw.arc((30, 570, 260, 850), start=235, end=70, fill=(93, 153, 79), width=9)
    for x, y in [(180, 628), (108, 704), (238, 845)]:
        draw_leaf(draw, x, y, dark, accent)


def draw_string_trimmer(draw, color, dark, accent):
    draw.line((154, 824, 506, 608), fill=dark, width=22)
    draw.line((174, 812, 486, 620), fill=accent, width=10)
    draw.rounded_rectangle((438, 570, 548, 662), radius=32, fill=color, outline=dark, width=9)
    draw.ellipse((112, 798, 244, 900), outline=color, width=16)
    draw.arc((92, 778, 264, 920), start=200, end=20, fill=dark, width=9)


def draw_aerator(draw, color, dark, accent):
    draw.rounded_rectangle((126, 632, 512, 768), radius=32, fill=color, outline=dark, width=12)
    for x in range(160, 500, 60):
        draw.polygon([(x, 764), (x + 28, 862), (x + 56, 764)], fill=accent, outline=dark)
    draw.line((446, 638, 540, 560), fill=dark, width=16)
    draw.line((90, 880, 560, 880), fill=(80, 135, 65), width=14)


def draw_big_gnome(draw, color, dark, accent):
    draw.polygon([(312, 580), (142, 798), (492, 798)], fill=color, outline=dark)
    draw.ellipse((186, 718, 438, 904), fill=(238, 191, 156), outline=dark, width=11)
    draw.pieslice((174, 730, 450, 980), start=0, end=180, fill=accent, outline=dark, width=10)
    draw.ellipse((230, 778, 258, 806), fill=dark)
    draw.ellipse((360, 778, 388, 806), fill=dark)


def draw_sprinkler(draw, color, dark, accent):
    draw.rectangle((272, 778, 382, 872), fill=color, outline=dark, width=10)
    draw.rectangle((310, 700, 348, 790), fill=accent, outline=dark, width=8)
    for w, h in [(420, 280), (330, 220), (250, 170)]:
        draw.arc((320 - w // 2, 540, 320 + w // 2, 540 + h), start=200, end=340, fill=(50, 135, 198), width=9)
    for x in [126, 184, 454, 512]:
        draw.ellipse((x, 776, x + 22, 798), fill=(50, 135, 198))


def draw_drought(draw, color, dark, accent):
    draw.ellipse((118, 585, 286, 753), fill=accent, outline=dark, width=10)
    for angle in range(0, 360, 30):
        x = 202 + math.cos(math.radians(angle)) * 126
        y = 669 + math.sin(math.radians(angle)) * 126
        draw.line((202, 669, x, y), fill=accent, width=9)
    draw.rectangle((98, 808, 548, 878), fill=(176, 142, 83), outline=dark, width=8)
    for x in range(124, 530, 62):
        draw.line((x, 810, x + 36, 876), fill=dark, width=8)
        draw.line((x + 44, 812, x + 12, 876), fill=dark, width=6)


def draw_fence_shield(draw, color, dark, accent):
    for x in range(110, 560, 76):
        draw.rectangle((x, 620, x + 44, 872), fill=(223, 196, 138), outline=dark, width=6)
        draw.polygon([(x, 620), (x + 22, 574), (x + 44, 620)], fill=(223, 196, 138), outline=dark)
    draw.rounded_rectangle((98, 690, 580, 740), radius=16, fill=(196, 166, 106), outline=dark, width=7)
    draw.polygon([(342, 638), (496, 710), (462, 840), (342, 904), (222, 840), (188, 710)], fill=color, outline=dark)
    draw.polygon([(342, 700), (406, 728), (392, 804), (342, 832), (292, 804), (278, 728)], fill=accent, outline=dark)


def draw_saturday_chores(draw, color, dark, accent):
    draw_checklist(draw, color, dark, accent)
    draw.line((406, 840, 540, 650), fill=dark, width=18)
    draw.line((416, 830, 530, 660), fill=accent, width=8)
    draw.rounded_rectangle((420, 626, 568, 700), radius=20, fill=color, outline=dark, width=8)


def draw_toolbelt_energy(draw, color, dark, accent):
    draw.rounded_rectangle((150, 682, 496, 806), radius=42, fill=(116, 83, 55), outline=dark, width=10)
    for x in [190, 302, 414]:
        draw.rounded_rectangle((x, 708, x + 70, 820), radius=18, fill=accent, outline=dark, width=7)
    draw_burst_at(draw, 326, 636, color, dark, 92)


def draw_compost(draw, color, dark, accent):
    draw.pieslice((130, 650, 530, 960), start=180, end=360, fill=(116, 83, 55), outline=dark, width=10)
    for x, y in [(194, 716), (288, 662), (398, 724), (456, 802), (230, 832)]:
        draw_leaf(draw, x, y, dark, accent)
    draw.arc((146, 610, 300, 730), start=250, end=80, fill=(82, 146, 70), width=10)


def draw_lawn_chair(draw, color, dark, accent):
    draw.line((170, 852, 298, 650), fill=dark, width=16)
    draw.line((410, 852, 298, 650), fill=dark, width=16)
    draw.rounded_rectangle((206, 650, 442, 778), radius=22, fill=color, outline=dark, width=10)
    draw.rectangle((222, 666, 426, 762), fill=(240, 226, 178), outline=dark, width=7)
    draw.ellipse((470, 586, 560, 676), fill=accent, outline=dark, width=8)


def draw_shed_scene(draw, color, dark, accent):
    draw.rectangle((142, 658, 512, 880), fill=(142, 94, 58), outline=dark, width=10)
    draw.polygon([(116, 660), (328, 540), (540, 660)], fill=color, outline=dark)
    draw.rectangle((260, 742, 386, 880), fill=(84, 59, 43), outline=dark, width=8)
    draw_tools(draw, color, dark, accent)


def draw_workbench(draw, color, dark, accent):
    draw.rectangle((120, 760, 540, 846), fill=(142, 94, 58), outline=dark, width=10)
    draw.rectangle((150, 612, 506, 760), fill=(223, 196, 138), outline=dark, width=9)
    for x in [200, 310, 420]:
        draw.line((x, 640, x, 724), fill=dark, width=9)
        draw.ellipse((x - 18, 622, x + 18, 658), fill=color, outline=dark, width=5)
    draw.line((170, 848, 150, 920), fill=dark, width=10)
    draw.line((492, 848, 522, 920), fill=dark, width=10)


def draw_checklist(draw, color, dark, accent):
    draw.rounded_rectangle((168, 586, 484, 884), radius=28, fill=(248, 238, 205), outline=dark, width=10)
    draw.rounded_rectangle((238, 560, 414, 626), radius=20, fill=accent, outline=dark, width=8)
    for y in [674, 746, 818]:
        draw.rectangle((210, y - 18, 248, y + 20), fill=color, outline=dark, width=5)
        draw.line((270, y, 430, y), fill=dark, width=7)
        draw.line((216, y, 228, y + 12), fill=dark, width=5)
        draw.line((228, y + 12, 250, y - 18), fill=dark, width=5)


def draw_green_thumb(draw, color, dark, accent):
    # Avoid the literal "thumb" gag. This card is about nurturing a lawn engine:
    # a gloved hand planting a sprout in rich soil.
    draw.ellipse((128, 728, 534, 910), fill=(101, 77, 46), outline=dark, width=10)
    draw.ellipse((152, 700, 508, 820), fill=(126, 91, 54), outline=dark, width=7)
    draw.line((340, 804, 340, 602), fill=(65, 132, 67), width=20)
    draw.line((340, 804, 286, 646), fill=(65, 132, 67), width=12)
    draw.line((340, 804, 404, 644), fill=(65, 132, 67), width=12)
    draw.ellipse((204, 612, 340, 728), fill=color, outline=dark, width=8)
    draw.ellipse((346, 584, 526, 710), fill=(82, 166, 76), outline=dark, width=8)
    draw.ellipse((262, 552, 424, 658), fill=(110, 184, 86), outline=dark, width=8)

    glove = (238, 191, 156)
    draw.rounded_rectangle((132, 752, 314, 846), radius=38, fill=glove, outline=dark, width=9)
    for x in [164, 204, 244]:
        draw.rounded_rectangle((x, 688, x + 42, 778), radius=20, fill=glove, outline=dark, width=7)
    draw.rounded_rectangle((286, 728, 392, 790), radius=26, fill=glove, outline=dark, width=7)
    draw.line((132, 846, 316, 846), fill=accent, width=12)
    for x, y in [(430, 760), (462, 812), (206, 840)]:
        draw_leaf(draw, x, y, dark, accent)


def draw_membership_card(draw, color, dark, accent):
    draw.rounded_rectangle((120, 646, 540, 842), radius=36, fill=color, outline=dark, width=12)
    draw.rounded_rectangle((158, 700, 306, 754), radius=12, fill=accent, outline=dark, width=6)
    draw.line((336, 714, 498, 714), fill=(248, 238, 205), width=12)
    draw.line((158, 794, 502, 794), fill=(248, 238, 205), width=12)
    draw_star_at(draw, 226, 776, accent, dark, 38)


def draw_suburban_house(draw, color, dark, accent):
    draw.rectangle((142, 688, 504, 874), fill=(239, 231, 189), outline=dark, width=10)
    draw.polygon([(110, 692), (323, 552), (538, 692)], fill=color, outline=dark)
    draw.rectangle((198, 754, 288, 874), fill=accent, outline=dark, width=8)
    draw.rectangle((348, 736, 458, 814), fill=(127, 205, 194), outline=dark, width=8)
    draw.line((100, 902, 548, 902), fill=(83, 144, 74), width=16)

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


def draw_burst_at(draw, cx, cy, color, dark, radius):
    points = []
    for i in range(18):
        r = radius if i % 2 == 0 else radius * 0.45
        angle = math.radians(i * 20 - 90)
        points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    draw.polygon(points, fill=color, outline=dark)


def draw_leaf(draw, x, y, dark, accent):
    draw.ellipse((x, y, x + 72, y + 36), fill=(102, 157, 74), outline=dark, width=5)
    draw.line((x + 12, y + 28, x + 64, y + 8), fill=accent, width=5)


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
    if character == "hank":
        return generate_hank_card(card)
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
