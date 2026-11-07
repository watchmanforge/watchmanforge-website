#!/usr/bin/env python3
"""
make_hall.py — the Order of the Watchmen hall on the homepage, built from the app's own screen.

  python3 tools/order-hall/make_hall.py      (needs node + playwright-core, Pillow)

The app's source for that screen sits in OneDrive at Claude/For website/order-screen/
(watchman-forge-live.html + assets/). shoot.js renders it at phone size, the way the app
lays it out there, and keeps only the art: the cathedral plate and the six flanking knights.
The Seneschal is left out of that picture on purpose: on the site he is his own layer, so he
can carry the app's gold aura and wisps (index.html, .hall-fx).

Writes assets/app/order-hall-{600,880,1170}.webp and assets/app/seneschal-330.webp.
The Seneschal's box in index.html (left 36.25%, top 51.65%, width 27.51%) comes from the same
render: if the app moves him, re-measure it from shoot.js.
"""
import os
import shutil
import subprocess
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = "/mnt/c/Users/sirdo/OneDrive/Claude/For website/order-screen"
OUT = os.path.join(ROOT, "assets", "app")


def main():
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copy(os.path.join(SRC, "watchman-forge-live.html"), tmp)
        shutil.copytree(os.path.join(SRC, "assets"), os.path.join(tmp, "assets"))
        subprocess.run(["node", os.path.join(HERE, "shoot.js"), tmp], check=True)
        hall = Image.open(os.path.join(tmp, "hall-nosen.png")).convert("RGB")
    for w in (600, 880, 1170):
        path = os.path.join(OUT, f"order-hall-{w}.webp")
        hall.resize((w, round(hall.height * w / hall.width)), Image.LANCZOS).save(path, "WEBP", quality=76, method=6)
        print(f"  wrote assets/app/order-hall-{w}.webp  {os.path.getsize(path) // 1024} KB")
    sen = Image.open(os.path.join(SRC, "assets", "knights", "seneschal.webp")).convert("RGBA")
    path = os.path.join(OUT, "seneschal-330.webp")
    sen.resize((330, round(sen.height * 330 / sen.width)), Image.LANCZOS).save(path, "WEBP", quality=82, method=6)
    print(f"  wrote assets/app/seneschal-330.webp  {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    main()
