#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_film_posters.py — the real film posters on /collections/movies-tv.

Only films old enough to be public domain in the US get their original
poster; every other title on the site is our own drawn card (titles only).
Each source below is a Wikimedia Commons file marked Public domain, with
the reason recorded on its Commons page.

  python3 tools/make_film_posters.py <dir with the downloaded originals>

Writes assets/images/films/<slug>-<w>.webp at 2:3, trimmed of the scan's
white border. Authoring tool only: nothing here runs on deploy.
"""
import os
import sys

from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "images", "films")
WIDTHS = (96, 192)

POSTERS = {
    # The King of Kings (1927), Cecil B. DeMille. Pathé, 1927; no copyright notice on the poster.
    # https://commons.wikimedia.org/wiki/File:Kingofkings_poster.gif
    "king-of-kings-1927": "kok.gif",
    # Ben-Hur: A Tale of the Christ (1925). MGM, 1925: "Before the chariot race...".
    # https://commons.wikimedia.org/wiki/File:Poster_-_Ben-Hur,_A_Tale_of_the_Christ_02.jpg
    "ben-hur-1925": "bh2.jpg",
}


def trim(im):
    """Cut the paper margin around the printed poster: keep the rows and columns that are
    mostly ink, so specks on the paper don't widen the box."""
    ink = ImageChops.difference(im, Image.new("RGB", im.size, (255, 255, 255))).convert("L").point(lambda v: 255 if v > 48 else 0)
    w, h = ink.size
    px = ink.load()
    cols = [x for x in range(w) if sum(px[x, y] for y in range(0, h, 4)) > 255 * (h // 4) * 0.6]
    rows = [y for y in range(h) if sum(px[x, y] for x in range(0, w, 4)) > 255 * (w // 4) * 0.6]
    if not cols or not rows:
        return im
    return im.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1))


def to_2x3(im):
    w, h = im.size
    if w / h > 2 / 3:
        nw = round(h * 2 / 3)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w * 3 / 2)
    return im.crop((0, 0, w, nh))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(OUT, exist_ok=True)
    for slug, name in POSTERS.items():
        im = to_2x3(trim(Image.open(os.path.join(src, name)).convert("RGB")))
        for w in WIDTHS:
            out = os.path.join(OUT, f"{slug}-{w}.webp")
            im.resize((w, w * 3 // 2), Image.LANCZOS).save(out, "WEBP", quality=86, method=6)
            print(f"  {os.path.relpath(out, ROOT)}  {os.path.getsize(out) // 1024} KB")


if __name__ == "__main__":
    main()
