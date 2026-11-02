#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_app_images.py — real app screens for the homepage, cut from the founder's
phone screenshots in OneDrive (Claude/Website screenshots).

  python3 tools/make_app_images.py

Only clean regions are used. The screenshots are of a real account, so these
crops deliberately leave out: the phone's status bar (notifications), the
"Today's orders" list (internal to-dos), journal text inside replays, and the
screens that show a restaurant's address, brand-name products or film posters.

Writes assets/app/<name>-<width>.webp at 480 and 960 px wide, plus sizes.json
with the intrinsic size of each so every <img> gets width/height.
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/mnt/c/Users/sirdo/OneDrive/Claude/Website screenshots"
OUT = os.path.join(ROOT, "assets", "app")

# name: (file, (left, top, right, bottom)) in the 1216x2688 originals
CROPS = {
    # The Ledger: date, today's watch dots, days unbroken / points / this week
    "checkin": ("Screenshot_20261101_211504.jpg", (0, 118, 1216, 1204)),
    # The Forge: tonight's replay, two scored days (no journal text)
    "replays": ("Screenshot_20261101_211506.jpg", (0, 118, 1216, 1890)),
    # Order of the Watchmen: the cathedral and the knights, nothing else
    "order":   ("Screenshot_20261101_211528.jpg", (0, 700, 1216, 2075)),
}
WIDTHS = (480, 960)


def main():
    os.makedirs(OUT, exist_ok=True)
    sizes = {}
    for name, (fn, box) in CROPS.items():
        im = Image.open(os.path.join(SRC, fn)).convert("RGB").crop(box)
        sizes[name] = {}
        for w in WIDTHS:
            h = round(im.height * w / im.width)
            path = os.path.join(OUT, f"{name}-{w}.webp")
            im.resize((w, h), Image.LANCZOS).save(path, "WEBP", quality=82, method=6)
            sizes[name][w] = [w, h]
            print(f"  wrote assets/app/{name}-{w}.webp  {w}x{h}  {os.path.getsize(path) / 1024:5.1f} KB")
    with open(os.path.join(OUT, "sizes.json"), "w") as f:
        json.dump(sizes, f, indent=2)


if __name__ == "__main__":
    main()
