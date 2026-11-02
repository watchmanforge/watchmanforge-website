#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_og_image.py — the 1200x630 share card (link previews on iMessage, X, Facebook...).

  python3 tools/make_og_image.py                       # text + brand mark
  python3 tools/make_og_image.py assets/app/checkin-960.webp   # text + a real app screen

Writes assets/images/og-image.jpg. Colours match the tokens in css/main.css.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
BG = (5, 6, 11)
TEXT = (238, 242, 247)
TEXT_2 = (150, 162, 180)
GOLD = (240, 198, 102)
TEAL = (61, 177, 181)
FONT = os.path.join(ROOT, "assets", "webfonts", "inter-latin-var.woff2")


def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_axes([weight])
    except OSError:
        pass
    return f


def glow(canvas, cx, cy, r, colour, alpha):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((cx - r, cy - r, cx + r, cy + r), fill=colour + (alpha,))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r // 2)))


def panel(screen_path, width):
    """A real app screen as a floating rounded panel, like the homepage hero."""
    shot = Image.open(screen_path).convert("RGB")
    shot = shot.resize((width, round(shot.height * width / shot.width)), Image.LANCZOS)
    radius = 30
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, shot.width - 1, shot.height - 1), radius, fill=255)
    out = Image.new("RGBA", (shot.width + 4, shot.height + 4), (0, 0, 0, 0))
    ImageDraw.Draw(out).rounded_rectangle((0, 0, out.width - 1, out.height - 1), radius + 2, fill=(46, 60, 80, 255))
    out.paste(shot, (2, 2), mask)
    return out


def main():
    canvas = Image.new("RGBA", (W, H), BG + (255,))
    glow(canvas, 930, 300, 300, TEAL, 40)

    if len(sys.argv) > 1:
        ph = panel(sys.argv[1], 430)
        canvas.alpha_composite(ph, (W - ph.width - 64, (H - ph.height) // 2))
    else:
        from make_icons import SRC  # the transparent brand mark in the Brain Vault
        mark = Image.open(SRC + ".png").convert("RGBA")
        mark = mark.crop(mark.getbbox()).resize((300, 300), Image.LANCZOS)
        canvas.alpha_composite(mark, (W - 300 - 130, (H - 300) // 2))

    word = Image.open(os.path.join(ROOT, "assets", "images", "wordmark-192.webp")).convert("RGBA")
    word = word.resize((round(word.width * 64 / word.height), 64), Image.LANCZOS)
    canvas.alpha_composite(word, (80, 76))

    d = ImageDraw.Draw(canvas)
    big = font(80, 700)
    d.text((76, 196), "Stop starting.", font=big, fill=TEXT)
    d.text((76, 286), "Start finishing.", font=big, fill=GOLD)
    sub = font(29, 450)
    d.text((80, 418), "The daily accountability app for people", font=sub, fill=TEXT_2)
    d.text((80, 456), "who keep starting side projects.", font=sub, fill=TEXT_2)
    cta = font(26, 600)
    d.rounded_rectangle((80, 524, 80 + 330, 524 + 56), 12, fill=TEAL)
    d.text((80 + 165, 524 + 28), "Join the waitlist", font=cta, fill=(3, 26, 28), anchor="mm")

    out = os.path.join(ROOT, "assets", "images", "og-image.jpg")
    canvas.convert("RGB").save(out, "JPEG", quality=86, optimize=True, progressive=True)
    print(f"  wrote assets/images/og-image.jpg  {os.path.getsize(out) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
