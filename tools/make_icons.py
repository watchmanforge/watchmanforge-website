#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_icons.py — browser-tab and home-screen icons from the brand mark.

  python3 tools/make_icons.py

Source: the brushed-metal cross-in-circle in the Brain Vault (OneDrive):
  Logos/Watchman Forge/watchman-forge-logo-metal.png  (1500px, transparent)
  Logos/Watchman Forge/watchman-forge-logo-metal.svg

Writes:
  favicon.ico                         16/32/48, at the site root (browsers ask for it)
  assets/images/icon.svg              the vector mark, for modern browsers
  assets/images/favicon-32.png
  assets/images/favicon-16.png
  assets/images/apple-touch-icon.png  180px on the site background (iOS ignores alpha)
"""
import os
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ("/mnt/c/Users/sirdo/OneDrive/Claude/Brain Vault/Logos/Watchman Forge/"
       "watchman-forge-logo-metal")
BG = (5, 6, 11, 255)   # --bg in css/main.css


def main():
    mark = Image.open(SRC + ".png").convert("RGBA")
    box = mark.getbbox()
    mark = mark.crop(box)
    side = max(mark.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))

    img = os.path.join(ROOT, "assets", "images")
    sq.resize((32, 32), Image.LANCZOS).save(os.path.join(img, "favicon-32.png"), optimize=True)
    sq.resize((16, 16), Image.LANCZOS).save(os.path.join(img, "favicon-16.png"), optimize=True)
    sq.save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

    touch = Image.new("RGBA", (180, 180), BG)
    inner = sq.resize((148, 148), Image.LANCZOS)
    touch.alpha_composite(inner, (16, 16))
    touch.convert("RGB").save(os.path.join(img, "apple-touch-icon.png"), optimize=True)

    shutil.copyfile(SRC + ".svg", os.path.join(img, "icon.svg"))
    for f in ("favicon.ico", "assets/images/icon.svg", "assets/images/favicon-32.png",
              "assets/images/favicon-16.png", "assets/images/apple-touch-icon.png"):
        print(f"  wrote {f:38s} {os.path.getsize(os.path.join(ROOT, f)) / 1024:6.1f} KB")


if __name__ == "__main__":
    main()
