#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_og_image.py — the 1200x630 share card (link previews on iMessage, X, Facebook...).

  python3 tools/make_og_image.py                       # text + brand mark
  python3 tools/make_og_image.py path/to/screen.png    # text + a real app screen in a phone

Writes assets/images/og-image.jpg. Colours match the tokens in css/main.css.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
BG = (10, 10, 11)
TEXT = (243, 239, 232)
TEXT_2 = (179, 173, 164)
BRAND = (226, 180, 92)
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


def phone(screen_path, height):
    shot = Image.open(screen_path).convert("RGB")
    sw = round(height * shot.width / shot.height)
    shot = shot.resize((sw, height), Image.LANCZOS)
    pad, radius = 12, 52
    body = Image.new("RGBA", (sw + pad * 2, height + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle((0, 0, body.width - 1, body.height - 1), radius, fill=(27, 27, 29, 255),
                                           outline=(60, 60, 64, 255), width=2)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, height - 1), radius - pad, fill=255)
    body.paste(shot, (pad, pad), mask)
    return body


def main():
    canvas = Image.new("RGBA", (W, H), BG + (255,))
    glow(canvas, 930, 300, 300, BRAND, 34)

    if len(sys.argv) > 1:
        ph = phone(sys.argv[1], 700)
        canvas.alpha_composite(ph, (W - ph.width - 70, 70))
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
    d.text((76, 286), "Start finishing.", font=big, fill=BRAND)
    sub = font(29, 450)
    d.text((80, 418), "The daily accountability app for people", font=sub, fill=TEXT_2)
    d.text((80, 456), "who keep starting side projects.", font=sub, fill=TEXT_2)
    cta = font(26, 600)
    d.rounded_rectangle((80, 524, 80 + 330, 524 + 56), 12, fill=BRAND)
    d.text((80 + 165, 524 + 28), "Join the waitlist", font=cta, fill=(22, 17, 10), anchor="mm")

    out = os.path.join(ROOT, "assets", "images", "og-image.jpg")
    canvas.convert("RGB").save(out, "JPEG", quality=86, optimize=True, progressive=True)
    print(f"  wrote assets/images/og-image.jpg  {os.path.getsize(out) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
