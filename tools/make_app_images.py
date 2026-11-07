#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_app_images.py — app screens for the homepage that stay images.

  python3 tools/make_app_images.py

The Ledger, the Forge and the Watchman's List are live HTML on the homepage
now (so their dates are always today's), and the Order's hall is built from the
app's own screen by tools/order-hall/make_hall.py, so only these are left:

  films, pantry  demo-data rebuilds rendered by tools/demo-screens/shoot.js;
                 every name and number in those is made up ("Movie One").

Writes assets/app/<name>-<width>.webp at 480 and 960 px wide, plus sizes.json
with the intrinsic size of each so every <img> gets width/height.
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/mnt/c/Users/sirdo/OneDrive/Claude/Website screenshots"
OUT = os.path.join(ROOT, "assets", "app")

# name: (file, (left, top, right, bottom)) in the 1216x2688 originals of the founder's phone
# screenshots (none left: the Order's hall now comes from tools/order-hall/make_hall.py)
CROPS = {}
DEMO = os.path.join(ROOT, "tools", "demo-screens", "out")
DEMO_CROPS = {   # 1215x2688 renders; from the screen title down, past the app header
    "films":  ("demo-films.png",  (0, 290, 1215, 1640)),
    "pantry": ("demo-pantry.png", (0, 290, 1215, 1640)),
}
WIDTHS = (480, 960)


def main():
    os.makedirs(OUT, exist_ok=True)
    sizes = {}
    jobs = [(n, os.path.join(SRC, f), b) for n, (f, b) in CROPS.items()]
    jobs += [(n, os.path.join(DEMO, f), b) for n, (f, b) in DEMO_CROPS.items()]
    for name, src, box in jobs:
        im = Image.open(src).convert("RGB").crop(box)
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
