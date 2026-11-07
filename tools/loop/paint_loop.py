#!/usr/bin/env python3
"""
paint_loop.py — "the loop", for the homepage's struggle section, painted like the watchtower.

  python3 tools/loop/paint_loop.py          (same needs as tools/watchtower/paint.py)

The diagram is carved into the tower's own stone: the old loop is a groove of smouldering embers
that never gets out; the Forge's way out is the tower's teal channel, cut into the stone, leaving
the ring at Stall and rising into the gothic arch round the same lit cross window. Shapes are SVG
(rendered by tools/watchtower/render.js), the light is numpy, as in the watchtower.

Writes assets/images/loop-{700,1000,1500}.webp. index.html lays the words and the moving light
(the spark on the ring, the pulse up the channel) over it in the same 500x380 coordinates, so if
anything here moves, move it there too.
"""
import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "watchtower"))
import paint as P  # noqa: E402  (shared helpers: light, noise, the logo's cross)

OUT = os.path.join(HERE, "out")
SITE = os.path.join(ROOT, "assets", "images")
W, H, S = 500, 380, 3

CX, CY, R = 140, 250, 100          # the loop
STALL = (240, 250)                 # where the Forge catches you
CH = 330                           # the channel's x
HELD, NEXT = (330, 250), (330, 176)
WIN_TOP, WIN_H = 34, 54            # the cross window
APEX = 12
f = P.f


def channel(side):
    """The way out, from Stall to the apex of the arch, round one side of the window."""
    x = CH + side * 28
    return (f"M{STALL[0]} {STALL[1]} H{CH} V132 C{CH} 118 {x} 120 {x} 106 V64 "
            f"C{x} 44 {CH + side * 14} 26 {CH} {APEX}")


def diamond(x, y, r):
    return f"M{f(x)} {f(y - r)}l{f(r)} {f(r)}l{f(-r)} {f(r)}l{f(-r)} {f(-r)}z"


def build_svg():
    rnd = random.Random(5)
    band, outer, inner = P.logo_cross()
    stone, carve = [], []

    # the tower's stone: dark courses of ashlar, each block a shade apart, lit from above
    stone.append(f'<rect width="{W}" height="{H}" fill="#080c14"/>')
    joints, tops = [], []
    for row, y in enumerate(range(0, H, 26)):
        x = -32 if row % 2 else 0
        while x < W:
            t = rnd.uniform(-1, 1)
            c = (int(22 + 4 * t), int(30 + 5 * t), int(43 + 6 * t))
            stone.append(f'<rect x="{x}" y="{y}" width="64" height="26" fill="rgb{c}"/>')
            joints.append(f"M{x} {y}v26")
            tops.append(f"M{x + 1} {y + 1.2}h62")
            x += 64
        joints.append(f"M0 {y}H{W}")
    stone.append(f'<path d="{" ".join(joints)}" stroke="#05080d" stroke-width="1.2" opacity=".8"/>')
    stone.append(f'<path d="{" ".join(tops)}" stroke="#223144" stroke-width=".6" opacity=".55"/>')

    # the ring: a groove, its lips, and the coals in it
    carve.append(f'<circle cx="{CX}" cy="{CY}" r="{R}" fill="none" stroke="#020407" stroke-width="12"/>')
    carve.append(f'<circle cx="{CX}" cy="{CY}" r="{R + 6.2}" fill="none" stroke="#1a2635" stroke-width="1"/>')
    carve.append(f'<circle cx="{CX}" cy="{CY}" r="{R - 6.2}" fill="none" stroke="#0d141e" stroke-width="1"/>')
    carve.append(f'<circle class="emit" cx="{CX}" cy="{CY}" r="{R}" fill="none" stroke="#b9481d" stroke-width="4.4" stroke-dasharray="7 6 3 9 10 5 4 11" opacity=".85"/>')
    carve.append(f'<circle class="emit" cx="{CX}" cy="{CY}" r="{R}" fill="none" stroke="#ff9452" stroke-width="2" stroke-dasharray="3 17 2 23 4 19" stroke-linecap="round"/>')
    # sockets at the four steps: Start burns, the rest smoulder; Stall holds the Forge's diamond
    for (x, y), kind in (((CX, CY - R), "lit"), (STALL, "catch"), ((CX, CY + R), ""), ((CX - R, CY), "")):
        carve.append(f'<circle cx="{x}" cy="{y}" r="12.5" fill="#03050a" stroke="#1d2a38" stroke-width="1.8"/>')
        if kind == "lit":
            carve.append(f'<circle class="emit" cx="{x}" cy="{y}" r="7" fill="#e4723c"/><circle class="emit" cx="{x}" cy="{y}" r="3.6" fill="#ffd2a8"/>')
        else:
            carve.append(f'<circle class="emit" cx="{x}" cy="{y}" r="6.4" fill="none" stroke="#e4723c" stroke-width="1.8" stroke-dasharray="2.6 2.4" opacity=".75"/>')

    # the way out: the tower's channel, a groove with a bright core, rising round the window
    trunk = channel(-1)
    for side in (-1, 1):
        carve.append(f'<path d="{channel(side)}" fill="none" stroke="#020407" stroke-width="8.5" stroke-linejoin="round"/>')
    for side in (-1, 1):
        carve.append(f'<path d="{channel(side)}" fill="none" stroke="#10232b" stroke-width="3.6" stroke-linejoin="round"/>')
        carve.append(f'<path class="emit" d="{channel(side)}" fill="none" stroke="url(#rise)" stroke-width="1.7" stroke-linejoin="round"/>')
    for x, y in (STALL, HELD, NEXT, (CH, APEX)):
        carve.append(f'<path d="{diamond(x, y, 7.5)}" fill="#020407" stroke="#1d2a38" stroke-width="1"/>')
        carve.append(f'<path class="emit" d="{diamond(x, y, 3.6)}" fill="#a8f5f2"/>')

    # the window: the logo's cross, sunk in the stone, lit by the lamps inside (as on the tower)
    s = WIN_H / 163.5
    tx, ty = CH - 94.03 * s, WIN_TOP - 12.03 * s
    s2 = s * 1.1
    wcy = WIN_TOP + (94 - 12.03) * s
    carve.append(f'<path transform="translate({f(CH - 94.03 * s2)} {f(wcy - 94 * s2)}) scale({f(s2)})" d="{outer}" fill="#020407"/>')
    lead = "#1a1107"
    carve.append(f'<g transform="translate({f(tx)} {f(ty)}) scale({f(s)})">'
                 f'<path class="emit" d="{band}" fill-rule="evenodd" fill="url(#amber)"/>'
                 f'<path class="emit" d="{inner}" fill="url(#clear)"/>'
                 f'<path d="M94 30V160M58 92H130M76 60H112M80 122H108M84 140H104" stroke="{lead}" stroke-width="2.4" clip-path="url(#pane)"/>'
                 f'<path d="{inner}" fill="none" stroke="{lead}" stroke-width="2.4"/><path d="{outer}" fill="none" stroke="{lead}" stroke-width="3"/></g>')

    defs = f'''<defs>
  <linearGradient id="rise" gradientUnits="userSpaceOnUse" x1="0" y1="{STALL[1]}" x2="0" y2="{APEX}">
    <stop offset="0" stop-color="#6fe0e0" stop-opacity=".55"/><stop offset=".5" stop-color="#7fe8e6"/><stop offset="1" stop-color="#b8f7f4"/></linearGradient>
  <radialGradient id="clear" gradientUnits="userSpaceOnUse" cx="94" cy="100" r="88">
    <stop offset="0" stop-color="#fff2cc"/><stop offset=".4" stop-color="#fbd88a"/><stop offset=".85" stop-color="#f0b350"/><stop offset="1" stop-color="#e09a3c"/></radialGradient>
  <radialGradient id="amber" gradientUnits="userSpaceOnUse" cx="94" cy="92" r="92">
    <stop offset="0" stop-color="#f6c062"/><stop offset=".6" stop-color="#e09a3c"/><stop offset="1" stop-color="#c47a2a"/></radialGradient>
  <clipPath id="pane"><path d="{inner}"/></clipPath>
</defs>'''
    body = (defs + f'\n<g id="stone">{"".join(stone)}</g>\n<g id="carve">{"".join(carve)}</g>')
    return f'''<!doctype html><meta charset="utf-8"><style>
html, body {{ margin: 0; background: transparent; }} svg {{ display: block; }}
html.emitpass body {{ background: #000; }}
html.emitpass svg :not(.emit, .emit *, defs, defs *, g) {{ fill: #000 !important; stroke: #000 !important; }}
</style>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg>'''


def load(name):
    a = np.asarray(Image.open(os.path.join(OUT, name + ".png")).convert("RGBA"), np.float32) / 255.0
    return a[..., :3] ** 2.2, a[..., 3:4]


def dist_to_polyline(X, Y, pts):
    d = np.full(X.shape, 1e9, np.float32)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        vx, vy = x1 - x0, y1 - y0
        t = np.clip(((X - x0) * vx + (Y - y0) * vy) / (vx * vx + vy * vy), 0, 1)
        d = np.minimum(d, np.hypot(X - (x0 + t * vx), Y - (y0 + t * vy)))
    return d


def paint():
    ph, pw = H * S, W * S
    Y, X = np.mgrid[0:ph, 0:pw].astype(np.float32) / S
    rgb, al = load("stone")
    # the stone sits in the dark; the coals, the channel and the window are what show it
    ring = np.abs(np.hypot(X - CX, Y - CY) - R)
    path = [STALL, (CH, STALL[1]), (CH, 118), (CH, APEX)]
    ch = dist_to_polyline(X, Y, path)
    wd = np.hypot(X - CH, (Y - (WIN_TOP + WIN_H / 2)) * 0.8)
    l_ember = np.exp(-(ring / 20) ** 2) * 1.1 + np.exp(-(ring / 60) ** 2) * 0.45
    l_teal = np.exp(-(ch / 14) ** 2) * 0.8 + np.exp(-(ch / 44) ** 2) * 0.3
    l_gold = np.exp(-(wd / 36) ** 2) * 1.8 + np.exp(-(wd / 96) ** 2) * 0.6
    tint = lambda c: (np.asarray(c, np.float32) / 255.0) / (np.asarray(c, np.float32).max() / 255.0)
    light = (0.17 + l_ember[..., None] * tint(P.EMBER) * 2.4 + l_teal[..., None] * tint(P.TEAL) * 1.7
             + l_gold[..., None] * tint(P.GOLD) * 2.8)
    img = rgb * light
    # and the air in front of them glows a little
    img = img + (np.exp(-(ring / 16) ** 2) * 0.03)[..., None] * P.lin(P.EMBER)
    img = img + (np.exp(-(ch / 10) ** 2) * 0.02)[..., None] * P.lin(P.TEAL)
    img = img + (np.exp(-(wd / 30) ** 2) * 0.07 + np.exp(-(wd / 80) ** 2) * 0.02)[..., None] * P.lin(P.GOLD)
    rgb, al = load("carve")
    img = P.over(img, rgb, al)
    # a breath of haze low down, as in the valley under the tower
    haze = P.noise((ph, pw), 160, 3, 3, stretch=(3, 0.6))
    hz = P.smoothstep(240, 380, Y) * (0.5 + 0.5 * haze) * 0.18
    img = P.over(img, P.lin((14, 26, 38)) * np.ones_like(img), hz[..., None])
    # bloom off everything that shines
    em = (np.asarray(Image.open(os.path.join(OUT, "emit.png")).convert("RGB"), np.float32) / 255.0) ** 2.2
    img = img + P.blur(em, 1.0 * S) * 0.8 + P.blur(em, 3.5 * S) * 0.6 + P.blur(em, 10 * S) * 0.4 + P.blur(em, 26 * S) * 0.25
    img = 1 - np.exp(-img * 1.2)
    img = np.clip(img, 0, 1) ** (1 / 2.2)
    # feather into the page: no hard rectangle round the carving
    bg = np.asarray(P.BG, np.float32) / 255.0
    ex = np.minimum(X, W - X) / 60
    ey = np.minimum(Y, H - Y) / 50
    edge = 1 - P.smoothstep(0, 1, np.minimum(ex, ey))
    oval = ((X - W * 0.52) / (W * 0.6)) ** 2 + ((Y - H * 0.5) / (H * 0.62)) ** 2   # a pool of light on the wall
    edge = np.maximum(edge, P.smoothstep(0.45, 1.0, oval))
    img = img * (1 - edge[..., None]) + bg * edge[..., None]
    img += (np.random.default_rng(1).random(img.shape, np.float32) - 0.5) / 255.0 * 1.5
    return Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))


def main():
    os.makedirs(OUT, exist_ok=True)
    html = os.path.join(OUT, "scene.html")
    with open(html, "w") as fh:
        fh.write(build_svg())
    subprocess.run(["node", os.path.join(ROOT, "tools", "watchtower", "render.js"), html, OUT, str(S), str(W), str(H)], check=True)
    im = paint()
    im.save(os.path.join(OUT, "master.png"))
    if "--preview" in sys.argv:
        return
    for w in (700, 1000, 1500):
        tmp = os.path.join(OUT, f"loop-{w}.png")
        im.resize((w, round(H * w / W)), Image.LANCZOS).save(tmp)
        dst = os.path.join(SITE, f"loop-{w}.webp")
        subprocess.run(["cwebp", "-quiet", "-q", "88", "-m", "6", "-sharp_yuv", tmp, "-o", dst], check=True)
        print(f"  loop-{w}.webp  {os.path.getsize(dst) // 1024} KB")


if __name__ == "__main__":
    main()
