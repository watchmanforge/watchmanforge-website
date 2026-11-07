#!/usr/bin/env python3
"""
paint.py — the homepage's watchtower scene ("Be your own Watchman.").

  python3 tools/watchtower/paint.py          (needs numpy, scipy, Pillow, cwebp; node + playwright-core)

The shapes (towers, wall, the Watchman, the Ranger, the city) are SVG, drawn here and
rendered one layer at a time by render.js. The air between them (sky, haze, the
searchlight beam, the glow off every light) is painted with numpy, then the whole
thing is graded and written out as WebP:

  assets/images/watchtower-{2400,1500}.webp         desktop, the full 1200x460 scene
  assets/images/watchtower-phone-{1100,660}.webp    phones, cropped on the tower (PHONE box)

index.html lays a small SVG over the picture (.wt-fx) for the parts that move: the lens,
the beacon on the far tower, the motes in the beam. It uses this file's coordinates, so if
anything here moves (LENS, POOL, FAR_BEACON...), move it there too.
"""
import math
import os
import random
import re
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "out")
SITE = os.path.join(ROOT, "assets", "images")

W, H = 1200, 460          # the scene, in SVG units
S = 2.5                   # master render scale: 3000 x 1150
HZ = 300                  # horizon = eye level
PHONE = (676, 14, 440, 404)   # x, y, w, h of the phone crop

# The app's palette (css/main.css)
BG = (5, 6, 11)
TEAL = (60, 176, 180)
GOLD = (240, 198, 102)
EMBER = (228, 114, 60)

# Where the light is
TX = 780                              # the tower's axis
PIVOT = (820.0, 104.0)                # the searchlight's yoke
POOL = (1030.0, 333.0)                # where the beam lands: on the Ranger
_d = (POOL[0] - PIVOT[0], POOL[1] - PIVOT[1])
_n = math.hypot(*_d)
DIR = (_d[0] / _n, _d[1] / _n)
LENS = (PIVOT[0] + 10.2 * DIR[0], PIVOT[1] + 10.2 * DIR[1])
FAR_PEAK = (1058.0, 269.0)
FAR_BEACON = (1058.0, 232.6)
RANGER = (1028.0, 333.0)
WINDOW_TOP, WINDOW_H = 192.0, 40.0    # the cross window, on the tower's face
WINDOW = (TX, WINDOW_TOP + (92 - 12.03) * WINDOW_H / 163.5)   # where its arms cross


# ── SVG helpers ──────────────────────────────────────────────────────────────
def f(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def poly(pts, close=True):
    d = "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts)
    return d + ("Z" if close else "")


def smooth(pts, close=False, t=0.5):
    """Catmull-Rom through the points, as cubic Béziers."""
    d = f"M{f(pts[0][0])} {f(pts[0][1])}"
    n = len(pts)
    for i in range(n - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3)
        d += f" C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
    return d + ("Z" if close else "")


def r_shaft(y):
    return 34 + (y - 162) * (41 - 34) / (392 - 162)


def ry(y, r):
    """Half-height of a ring of radius r at height y: above the eye they bow up, below they bow down."""
    return r * (HZ - y) * 0.0011


def ring(y, r, a0=0.0, a1=math.pi, n=48):
    """Front arc of a horizontal ring, right (a=0) to left (a=pi)."""
    return [(TX + r * math.cos(a0 + (a1 - a0) * i / n),
             y - ry(y, r) * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


CHANNEL_A = 0.484          # the channels sit this far round from the front (radians)
RING_Y, ARCH_Y, APEX_Y = 266.0, 208.0, 181.0


def channel_x(side, y):
    return TX + side * r_shaft(y) * math.sin(CHANNEL_A)


def channel(side):
    """One channel of light, from behind the wall up round the window and into the crown."""
    x0, xa = channel_x(side, 392), channel_x(side, ARCH_Y)
    return (f"M{f(x0)} 392 L{f(xa)} {f(ARCH_Y)} C{f(xa)} {f(ARCH_Y - 12)} {f(TX + side * 7)} {f(APEX_Y + 6)} "
            f"{TX} {f(APEX_Y)} L{TX} 141")


def rot(pt, deg, origin):
    a = math.radians(deg)
    x, y = pt
    return (origin[0] + x * math.cos(a) - y * math.sin(a), origin[1] + x * math.sin(a) + y * math.cos(a))


# ── The scene, as SVG layers ─────────────────────────────────────────────────
def far_layer(rnd):
    g = []
    # two ranges of far mountains, the farther one paler
    far2 = [(300, 296), (360, 283), (420, 289), (470, 276), (520, 284), (590, 272), (640, 281),
            (700, 288), (760, 279), (820, 290), (900, 284), (960, 294), (1010, 299)]
    g.append(f'<path d="{poly(far2 + [(1010, 330), (300, 330)])}" fill="#0f1d2c"/>')
    far1 = [(0, 287), (50, 281), (110, 285), (180, 271), (230, 278), (300, 268), (350, 279),
            (420, 285), (480, 280), (540, 290), (600, 284), (660, 292), (730, 287), (800, 295),
            (870, 291), (940, 298), (990, 301)]
    g.append(f'<path d="{poly(far1 + [(990, 330), (0, 330)])}" fill="#0c1726"/>')

    # the city on the horizon: spires, slabs, and the odd light left on
    bld, lights = [], []
    x = 928.0
    while x < 1206:
        near_core = math.exp(-((x - 1112) / 70) ** 2)
        w = rnd.uniform(5, 12) if rnd.random() < 0.7 else rnd.uniform(12, 22)
        h = rnd.uniform(6, 16) + near_core * rnd.uniform(14, 40)
        top = 302 - h
        kind = rnd.random()
        if kind < 0.28:          # a spire
            sp = rnd.uniform(6, 16) * (0.5 + near_core)
            bld.append(poly([(x, 304), (x, top), (x + w / 2, top - sp), (x + w, top), (x + w, 304)]))
        elif kind < 0.42:        # a stepped tower with a mast
            bld.append(poly([(x, 304), (x, top + 6), (x + w * 0.2, top + 6), (x + w * 0.2, top),
                             (x + w * 0.8, top), (x + w * 0.8, top + 6), (x + w, top + 6), (x + w, 304)]))
            bld.append(f"M{f(x + w / 2 - 0.35)} {f(top)}h0.7v{f(-rnd.uniform(5, 14))}h-0.7z")
        else:
            bld.append(poly([(x, 304), (x, top), (x + w, top), (x + w, 304)]))
        # windows: few, small, mostly teal
        for _ in range(int(w * h / 26)):
            if rnd.random() < 0.55:
                continue
            lx, ly = x + rnd.uniform(1, w - 1.6), rnd.uniform(top + 2, 302)
            c = "#7fe3e3" if rnd.random() < 0.8 else "#f6d58e"
            lights.append(f'<rect class="emit" x="{f(lx)}" y="{f(ly)}" width="0.8" height="0.6" fill="{c}" opacity="{f(rnd.uniform(.35, .9))}"/>')
        x += w + rnd.uniform(-2, 3)
    g.append(f'<path d="{" ".join(bld)}" fill="#0d1a28"/>')
    g += lights
    # aircraft lights on the tallest masts
    g.append('<circle class="emit" cx="1121" cy="244" r="0.7" fill="#e4723c"/>')
    g.append('<circle class="emit" cx="1084" cy="259" r="0.6" fill="#e4723c"/>')

    # the far ridge, and the other Watchman's tower on its peak
    ridge = [(930, 305), (962, 300), (990, 293), (1012, 286), (1032, 279), (1046, 273), (FAR_PEAK[0], FAR_PEAK[1]),
             (1068, 272), (1080, 279), (1098, 286), (1122, 291), (1160, 294), (1206, 297)]
    g.append(f'<path d="{smooth(ridge, t=0.35)} L1206 330 L930 330Z" fill="#0a1320"/>')
    px, py = FAR_PEAK
    g.append(f'<path d="{poly([(px - 3.6, py + 2), (px - 3.2, 240), (px + 3.2, 240), (px + 3.6, py + 2)])}" fill="#0a1320"/>')
    g.append(f'<path d="{poly([(px - 5, 240.6), (px - 5, 236.4), (px + 5, 236.4), (px + 5, 240.6)])}" fill="#0a1320"/>')
    g.append(f'<path d="M{f(px - 5)} 236.4h2.2v-2.4h-2.2zM{f(px - 1.1)} 236.4h2.2v-2.4h-2.2zM{f(px + 2.8)} 236.4h2.2v-2.4h-2.2z" fill="#0a1320"/>')
    g.append(f'<path class="emit" d="M{f(px)} 241.5v27" stroke="#3cb0b4" stroke-width="0.45" opacity="0.6"/>')
    g.append(f'<circle class="emit" cx="{f(FAR_BEACON[0])}" cy="{f(FAR_BEACON[1])}" r="1.5" fill="#fff0c8"/>')
    return g


def mid_layer(rnd):
    g = []
    a = [(-6, 309), (90, 305), (180, 311), (260, 306), (360, 312), (450, 307), (560, 313), (650, 309),
         (720, 314), (800, 311), (880, 315), (960, 309), (1040, 313), (1120, 307), (1206, 311)]
    g.append(f'<path d="{smooth(a)} L1206 460 L-6 460Z" fill="#09111c"/>')
    b = [(-6, 331), (110, 322), (250, 329), (380, 320), (520, 330), (640, 325), (760, 336), (860, 342),
         (960, 338), (1060, 344), (1140, 336), (1206, 340)]
    g.append(f'<path d="{smooth(b)} L1206 460 L-6 460Z" fill="#070d17"/>')

    # the road home, from the city gate to the wall
    c = [(986, 305), (1004, 309), (1030, 315), (1046, 321), (1042, 327), (1030, 332.5), (1012, 340),
         (980, 351), (940, 363), (900, 375), (870, 386)]
    left, right = [], []
    for i, (x, y) in enumerate(c):
        x2, y2 = c[min(i + 1, len(c) - 1)]
        x1, y1 = c[max(i - 1, 0)]
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy) or 1
        wdt = 0.7 + (y - 305) * 0.12
        nx, ny = -dy / n * wdt, dx / n * wdt * 0.35
        left.append((x + nx, y + ny))
        right.append((x - nx, y - ny))
    g.append(f'<path d="{smooth(left)} L{f(right[-1][0])} {f(right[-1][1])} {smooth(right[::-1])[1:]}Z" fill="#131e2a"/>')

    # pines on the near hills, smaller with distance
    def pine(x, y, h):
        w = h * 0.36
        return poly([(x - w * 0.12, y), (x - w * 0.12, y - h * 0.12), (x - w, y - h * 0.12), (x - w * 0.45, y - h * 0.45),
                     (x - w * 0.75, y - h * 0.45), (x - w * 0.3, y - h * 0.75), (x - w * 0.5, y - h * 0.75), (x, y - h),
                     (x + w * 0.5, y - h * 0.75), (x + w * 0.3, y - h * 0.75), (x + w * 0.75, y - h * 0.45),
                     (x + w * 0.45, y - h * 0.45), (x + w, y - h * 0.12), (x + w * 0.12, y - h * 0.12), (x + w * 0.12, y)])
    trees = []
    for x0, x1, base, hmin, hmax, n in ((560, 720, 329, 5, 11, 15), (690, 760, 334, 6, 12, 6),
                                        (1086, 1190, 340, 6, 13, 12), (940, 990, 338, 4, 8, 6)):
        for _ in range(n):
            x = rnd.uniform(x0, x1)
            trees.append(pine(x, base + rnd.uniform(-2, 2.5), rnd.uniform(hmin, hmax)))
    g.append(f'<path d="{" ".join(trees)}" fill="#060b14"/>')

    # the Ranger, walking home with a torch, and the shadow the searchlight throws
    rx, ry_ = RANGER
    g.append(f'<path d="M{f(rx + 1)} {f(ry_ + 0.3)} L{f(rx + 21)} {f(ry_ - 2.6)} L{f(rx + 20)} {f(ry_ - 0.6)} L{f(rx + 0.5)} {f(ry_ + 1.1)}Z" fill="#05080e" opacity="0.85"/>')
    ranger = ("M{0} {1} C{2} {3} {4} {5} {6} {7} L{8} {9} C{10} {11} {12} {13} {14} {15} "
              "C{16} {17} {18} {19} {20} {21} L{22} {23} C{24} {25} {26} {27} {28} {29}Z")
    pts = [(rx - 2.6, ry_ + 0.4), (rx - 2.4, ry_ - 3), (rx - 2.2, ry_ - 6.4), (rx - 1.6, ry_ - 8.6), (rx - 1.5, ry_ - 9.6),
           (rx - 1.6, ry_ - 10.8), (rx - 0.6, ry_ - 12), (rx + 0.6, ry_ - 12.1), (rx + 1.3, ry_ - 11.2),
           (rx + 1.4, ry_ - 9.8), (rx + 1.1, ry_ - 9.2), (rx + 2.2, ry_ - 8.4), (rx + 2.4, ry_ - 5), (rx + 3, ry_ - 1.5),
           (rx + 3.4, ry_ + 0.4)]
    flat = []
    for p in pts:
        flat += [f(p[0]), f(p[1])]
    g.append(f'<path d="{ranger.format(*flat)}" fill="#04070c"/>')
    g.append(f'<path d="M{f(rx - 1.2)} {f(ry_ - 7)} L{f(rx - 4.4)} {f(ry_ - 9.8)}" stroke="#04070c" stroke-width="0.9" stroke-linecap="round"/>')
    g.append(f'<circle class="emit" cx="{f(rx - 4.7)}" cy="{f(ry_ - 10.4)}" r="0.95" fill="#ffc38a"/>')
    g.append(f'<path d="M{f(rx + 0.4)} {f(ry_ - 11.9)} C{f(rx + 1.4)} {f(ry_ - 11.4)} {f(rx + 2.1)} {f(ry_ - 8)} {f(rx + 3.1)} {f(ry_ - 1.4)}" stroke="#f0c666" stroke-width="0.35" fill="none" opacity="0.7"/>')
    return g


def logo_cross():
    """The cross from the logo mark (assets/images/icon.svg), in its 188x188 units, as
    (band, outer, inner): the logo draws only its band of metal, one contour that runs round the
    outside, up a hairline slit at the foot, round the inside and back down. The slit's straight
    runs split it into the outer and inner outlines."""
    with open(os.path.join(SITE, "icon.svg")) as fh:
        band = re.search(r'<path[^>]*\sd="([^"]+)"', fh.read()).group(1)
    toks = re.findall(r"[MCLZ]|-?\d+\.?\d*", band)
    segs, i = [], 0
    while i < len(toks):
        n = {"M": 2, "L": 2, "C": 6, "Z": 0}[toks[i]]
        segs.append((toks[i], toks[i + 1:i + 1 + n]))
        i += 1 + n
    slit = [k for k, (c, p) in enumerate(segs) if c == "L" and abs(float(p[0]) - 94) < 1.5 and float(p[1]) > 150]
    gap = next(j for j in range(1, len(slit)) if slit[j] != slit[j - 1] + 1)
    first, last = slit[:gap], slit[gap:]                     # the climb up the slit, the way back down
    path = lambda a, b: " ".join(c + " " + " ".join(p) for c, p in segs[a:b])
    outer = path(0, first[0]) + " Z"
    inner = "M" + " ".join(segs[first[-1]][1]) + " " + path(first[-1] + 1, last[0]) + " Z"
    return band, outer, inner


def tower_layer(rnd):
    g = []
    defs = []
    # cylinder shading: dark on the left, the city's teal on the right edge
    defs.append(f'''<linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="{TX - 47}" y1="0" x2="{TX + 47}" y2="0">
      <stop offset="0" stop-color="#05080e"/><stop offset=".32" stop-color="#070c15"/><stop offset=".6" stop-color="#0a121c"/>
      <stop offset=".8" stop-color="#0d1922"/><stop offset=".93" stop-color="#12252f"/><stop offset="1" stop-color="#1d3f48"/></linearGradient>''')
    defs.append(f'''<linearGradient id="lines" gradientUnits="userSpaceOnUse" x1="{TX - 42}" y1="0" x2="{TX + 42}" y2="0">
      <stop offset="0" stop-color="#7fb8c8" stop-opacity="0"/><stop offset=".45" stop-color="#7fb8c8" stop-opacity=".05"/>
      <stop offset="1" stop-color="#8fd0d8" stop-opacity=".2"/></linearGradient>''')
    defs.append(f'''<linearGradient id="neon" gradientUnits="userSpaceOnUse" x1="{TX - 47}" y1="0" x2="{TX + 47}" y2="0">
      <stop offset="0" stop-color="#3cb0b4" stop-opacity=".15"/><stop offset=".5" stop-color="#5fd0d2" stop-opacity=".95"/>
      <stop offset="1" stop-color="#3cb0b4" stop-opacity=".35"/></linearGradient>''')
    g.append("<defs>" + "".join(defs) + "</defs>")

    # the shaft
    top, bot = 160, 392
    shaft = [(TX - r_shaft(top), top), (TX - r_shaft(bot), bot), (TX + r_shaft(bot), bot), (TX + r_shaft(top), top)]
    g.append(f'<path d="{poly(shaft)}" fill="url(#shade)"/>')
    # stone courses and joints, catching the light on the lit side only
    lines = []
    ys = list(range(172, 392, 11))
    for k, y in enumerate(ys):
        r = r_shaft(y)
        lines.append(smooth(ring(y, r, 0.05, math.pi - 0.05, 30)))
        if k + 1 < len(ys):
            y2 = ys[k + 1]
            off = 0.21 if k % 2 else 0.0
            a = 0.18 + off
            while a < math.pi - 0.15:
                xj = TX + r * math.cos(a)
                lines.append(f"M{f(xj)} {f(y - ry(y, r) * math.sin(a))} L{f(TX + r_shaft(y2) * math.cos(a))} {f(y2 - ry(y2, r_shaft(y2)) * math.sin(a))}")
                a += 0.42
    g.append(f'<path d="{" ".join(lines)}" stroke="url(#lines)" stroke-width="0.45" fill="none"/>')
    # rim light from the city, down the right edge
    g.append(f'<path d="M{f(TX + r_shaft(top) - 0.3)} {top} L{f(TX + r_shaft(bot) - 0.3)} {bot}" stroke="#5fc2c6" stroke-width="0.6" opacity="0.4"/>')

    # tech: channels of light cut into the stone, not stuck on it. Two rise from the wall, part around
    # the cross window as a pointed arch, meet above it and run up into the crown where he stands.
    # A ring ties them together at mid-tower.
    g.append('<defs><linearGradient id="rise" gradientUnits="userSpaceOnUse" x1="0" y1="392" x2="0" y2="141">'
             '<stop offset="0" stop-color="#6fe0e0" stop-opacity=".18"/><stop offset=".45" stop-color="#6fe0e0" stop-opacity=".75"/>'
             '<stop offset=".7" stop-color="#7fe8e6"/><stop offset="1" stop-color="#a8f5f2"/></linearGradient></defs>')
    groove = lambda d, core: (f'<path d="{d}" stroke="#020407" stroke-width="2.1" fill="none" stroke-linejoin="round"/>'
                              f'<path d="{d}" stroke="#0f2229" stroke-width="1.3" fill="none" stroke-linejoin="round"/>'
                              f'<path class="emit" d="{d}" stroke="{core}" stroke-width="0.62" fill="none" stroke-linejoin="round"/>')
    yr = RING_Y
    ring_d = smooth(ring(yr, r_shaft(yr) + 0.05, 0.06, math.pi - 0.06, 40))
    g.append(groove(ring_d, "url(#neon)"))
    for side in (-1, 1):
        g.append(groove(channel(side), "url(#rise)"))
    nodes = [(channel_x(side, yr), yr - ry(yr, r_shaft(yr)) * math.cos(CHANNEL_A)) for side in (-1, 1)]
    nodes += [(channel_x(side, ARCH_Y), ARCH_Y) for side in (-1, 1)] + [(TX, APEX_Y), (TX, 158.5)]
    for x, y in nodes:
        g.append(f'<path d="M{f(x)} {f(y - 2.2)}l2.2 2.2l-2.2 2.2l-2.2 -2.2z" fill="#020407"/>')
        g.append(f'<path class="emit" d="M{f(x)} {f(y - 1.2)}l1.2 1.2l-1.2 1.2l-1.2 -1.2z" fill="#a8f5f2"/>')

    # a window in the shape of the logo's cross, lit by the lamps inside: the logo's band of metal is
    # amber glass, its middle clear glass, leaded between. It is the tower's one lit window.
    band, outer, inner = logo_cross()
    s = WINDOW_H / 163.5                             # the logo cross is 163.5 tall in icon.svg
    lead = "#1a1107"
    g.append(f'<g transform="translate({f(TX - 94.03 * s)} {f(WINDOW_TOP - 12.03 * s)}) scale({f(s)})">'
             '<defs><radialGradient id="clear" gradientUnits="userSpaceOnUse" cx="94" cy="100" r="88">'
             '<stop offset="0" stop-color="#fff2cc"/><stop offset=".4" stop-color="#fbd88a"/>'
             '<stop offset=".85" stop-color="#f0b350"/><stop offset="1" stop-color="#e09a3c"/></radialGradient>'
             '<radialGradient id="amber" gradientUnits="userSpaceOnUse" cx="94" cy="92" r="92">'
             '<stop offset="0" stop-color="#f6c062"/><stop offset=".6" stop-color="#e09a3c"/><stop offset="1" stop-color="#c47a2a"/></radialGradient>'
             f'<clipPath id="pane"><path d="{inner}"/></clipPath></defs>'
             f'<path class="emit" d="{band}" fill-rule="evenodd" fill="url(#amber)"/>'
             f'<path class="emit" d="{inner}" fill="url(#clear)"/>'
             f'<path d="M94 30V160M58 92H130M76 60H112M80 122H108M84 140H104" stroke="{lead}" stroke-width="1.9" clip-path="url(#pane)"/>'
             f'<path d="{inner}" fill="none" stroke="{lead}" stroke-width="1.9"/>'
             f'<path d="{outer}" fill="none" stroke="{lead}" stroke-width="2.6"/>'
             '</g>')

    # corbels under the crown
    rc, yc0, yc1 = 47, 148, 162
    under = ring(yc0, rc, 0, math.pi, 40) + ring(yc1, r_shaft(yc1), 0, math.pi, 40)[::-1]
    g.append(f'<path d="{poly(under)}" fill="#04070c"/>')
    corbels = []
    for i in range(12):
        a = (i + 0.5) * math.pi / 12
        s = math.sin(a)
        w = 7.2 * s
        xt = TX + rc * math.cos(a)
        xb = TX + (r_shaft(yc1) + 1) * math.cos(a)
        yt = yc0 - ry(yc0, rc) * s
        yb = yc1 - ry(yc1, r_shaft(yc1)) * s
        corbels.append(poly([(xt - w / 2, yt), (xt + w / 2, yt), (xt + w * 0.42, yt + 4.5), (xb + w * 0.3, yt + 5),
                             (xb + w * 0.22, yb), (xb - w * 0.22, yb), (xb - w * 0.3, yt + 5), (xt - w * 0.42, yt + 4.5)]))
    g.append(f'<path d="{" ".join(corbels)}" fill="url(#shade)"/>')

    # behind the parapet: the mast, its pennant, the guy wire
    ma = 2.35
    mx = TX + rc * math.cos(ma)
    g.append(f'<path d="M{f(mx - 1.3)} 124 L{f(mx - 0.5)} 52 L{f(mx + 0.5)} 52 L{f(mx + 1.3)} 124Z" fill="#070b12"/>')
    g.append(f'<path d="M{f(mx - 6)} 72h12M{f(mx - 8)} 86h16M{f(mx + 8)} 86v-9" stroke="#070b12" stroke-width="1.1"/>')
    g.append(f'<path d="M{f(mx)} 52v-14" stroke="#0a0f18" stroke-width="0.6"/>')
    g.append(f'<path d="M{f(mx + 1)} 98 c4 -2 7 -1.5 8 2 c-3 1.4 -6 1 -8 -2z" fill="#070b12"/>')
    g.append(f'<path d="M{f(mx)} 54 L{TX - 47} 126" stroke="#0e1520" stroke-width="0.35"/>')
    g.append(f'<path d="M{f(mx)} 56 C{f(mx - 14)} 53 {f(mx - 26)} 60 {f(mx - 44)} 58.4 L{f(mx - 39)} 61.6 '
             f'L{f(mx - 45)} 65.2 C{f(mx - 28)} 65.6 {f(mx - 14)} 60.8 {f(mx)} 63.4Z" fill="#070b12"/>')
    g.append(f'<circle class="emit" cx="{f(mx)}" cy="51" r="1" fill="#ff9a62"/>')
    g.append(f'<rect class="emit" x="{f(mx - 0.6)}" y="78" width="1.2" height="1.6" fill="#7fe3e3"/>')

    # the Watchman, standing in the embrasure, hand on the searchlight. Only a shadow.
    ox, oy = 792, 117
    fig = ("M-8.5 -19 C-10.5 -24 -10 -31 -6 -35 C-3.5 -37.2 1 -37.6 4 -35.6 C6.2 -34 7.6 -31.4 8.3 -29.2 "
           "L6.8 -28.6 C6.2 -27 6.4 -24.8 7.2 -23.3 C8.6 -21.8 10.6 -21 12.2 -20.2 "
           "C14.6 -19.4 16.4 -17.6 17.4 -15.4 L18.4 -18.2 C18.8 -20.2 20.6 -21.8 22.4 -21.4 "
           "C23.6 -21 24 -19.6 23.4 -18.4 C22.6 -17 21.6 -16.2 20.6 -15.6 L18.6 -11.2 "
           "C17.8 -9.8 15.8 -10 14.8 -11.4 L12 -14 C11.8 -10 11.2 -5 10.8 0 L10.8 8 L-17 8 "
           "L-20.6 2 C-19.8 -2 -21.4 -5 -24.4 -6.8 C-21.6 -8 -19.8 -9.2 -18.8 -11 L-21.8 -12 "
           "C-18.4 -13.6 -15.8 -16 -14.4 -18.2 Z")
    hilt = ("M-9.8 -24.6 L-14.8 -33.6 L-16.2 -32.8 L-11.2 -23.8Z M-6.6 -26.8 L-14.2 -22.8 L-14.8 -24 L-7.2 -28Z")
    pauldron = ("M-15.8 -19.4 C-15.8 -22.6 -12.8 -24.4 -9.6 -23.4 L-8.4 -20.6 C-11 -21.2 -13.6 -20.8 -15.8 -19.4Z "
                "M-16.8 -17 C-16.6 -19.2 -14 -20.4 -11 -20.2 L-10.8 -18.6 C-12.8 -18.6 -15 -18 -16.8 -17Z")
    g.append(f'<g transform="translate({ox} {oy})">'
             f'<path d="{fig}" fill="#03050a"/><path d="{hilt}" fill="#03050a"/>'
             f'<circle cx="-15.9" cy="-34.6" r="1.6" fill="#03050a"/>'
             f'<path d="{pauldron}" fill="#05080e" stroke="#03050a" stroke-width="0.4"/>'
             # gold from the lamp along the front edges, a seam of teal in the armour
             f'<path class="emit" d="M4 -35.6 C6.2 -34 7.6 -31.4 8.3 -29.2" stroke="#f7d896" stroke-width="0.55" fill="none" opacity="0.9"/>'
             f'<path class="emit" d="M7.2 -23.3 C8.6 -21.8 10.6 -21 12.2 -20.2 C14.6 -19.4 16.4 -17.6 17.4 -15.4" stroke="#f7d896" stroke-width="0.5" fill="none" opacity="0.75"/>'
             f'<path class="emit" d="M18.8 -20.2 C19.6 -21.6 21.4 -22 22.6 -21.2" stroke="#fff0c8" stroke-width="0.5" fill="none" opacity="0.9"/>'
             f'<path class="emit" d="M12 -14 C11.8 -10 11.2 -5 10.8 0" stroke="#f0c666" stroke-width="0.4" fill="none" opacity="0.45"/>'
             f'<path class="emit" d="M-15.4 -20.2 C-13.6 -21.4 -11.2 -21.7 -9 -21" stroke="#5fd0d2" stroke-width="0.4" fill="none" opacity="0.85"/>'
             f'<path d="M-6 -35 C-3.5 -37.2 1 -37.6 4 -35.6" stroke="#4aa6ad" stroke-width="0.4" fill="none" opacity="0.35"/>'
             "</g>")

    # the parapet and its merlons, in front of him
    rp, yp0, yp1 = 47, 126, 148
    par = ring(yp0, rp, 0, math.pi, 48) + ring(yp1, rp, 0, math.pi, 48)[::-1]
    g.append(f'<path d="{poly(par)}" fill="url(#shade)"/>')
    merlons = []
    gap = 1.313   # the embrasure he stands in
    for k in range(-3, 4):
        a = gap + 0.26 + k * 0.52
        if a <= 0.12 or a >= math.pi - 0.12:
            continue
        a0, a1 = a - 0.15, a + 0.15
        top_arc = ring(yp0 - 11, rp, a0, a1, 6)
        base_arc = ring(yp0, rp, a0, a1, 6)[::-1]
        merlons.append(poly(top_arc + base_arc))
    g.append(f'<path d="{" ".join(merlons)}" fill="url(#shade)"/>')
    # coping lines and the crown's ring of light
    g.append(f'<path d="{smooth(ring(yp0, rp, 0.02, math.pi - 0.02, 30))}" stroke="url(#lines)" stroke-width="0.6" fill="none"/>')
    g.append(f'<path class="emit" d="{smooth(ring(yp1 - 0.6, rp - 0.1, 0.06, math.pi - 0.06, 40))}" stroke="url(#neon)" stroke-width="1.1" fill="none"/>')
    for k in range(7):
        a = 0.35 + k * 0.4
        x, y = TX + rp * math.cos(a), (yp0 + 6) - ry(yp0 + 6, rp) * math.sin(a)
        g.append(f'<rect class="emit" x="{f(x - 0.5)}" y="{f(y)}" width="1" height="1" fill="#7fe3e3" opacity="0.7"/>')

    # the searchlight, on the merlon by his hand, aimed down the road
    deg = math.degrees(math.atan2(DIR[1], DIR[0]))
    px, py = PIVOT
    g.append(f'<path d="M{f(px - 5)} 112.2h11v-2.2h-11z" fill="#070b12"/>')
    g.append(f'<path d="M{f(px)} {f(py)} L{f(px + 0.6)} 110.4" stroke="#070b12" stroke-width="2.8"/>')
    g.append(f'<g transform="translate({f(px)} {f(py)}) rotate({f(deg)})">'
             '<rect x="-9" y="-5.6" width="16.4" height="11.2" rx="1.4" fill="#0a111a"/>'
             '<path d="M-8 -5.6v11.2M-6.2 -5.6v11.2M-4.4 -5.6v11.2" stroke="#05080d" stroke-width="0.7"/>'
             '<path d="M-9 -5.6 H7.4" stroke="#2c4f58" stroke-width="0.5"/>'
             '<rect x="7" y="-6.9" width="3.2" height="13.8" rx="0.9" fill="#111b26"/>'
             '<path d="M-9 1 L-12.4 1.4 L-12.6 3.4 L-9 3" fill="#070b12"/>'
             '<circle cx="0" cy="0" r="2.4" fill="#0e1722" stroke="#05080d" stroke-width="0.6"/>'
             '<circle class="emit" cx="-2.6" cy="-5.6" r="0.55" fill="#7fe3e3"/>'
             '<ellipse class="emit" cx="10.3" cy="0" rx="1.5" ry="5.9" fill="#fff6dc"/>'
             '</g>')
    return g


def wall_layer(rnd):
    g = []
    defs = ['''<linearGradient id="wallface" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b111b"/><stop offset=".5" stop-color="#070b12"/><stop offset="1" stop-color="#05060b"/></linearGradient>''',
            '''<linearGradient id="strip" gradientUnits="userSpaceOnUse" x1="380" y1="0" x2="1200" y2="0">
      <stop offset="0" stop-color="#3cb0b4" stop-opacity="0"/><stop offset=".45" stop-color="#5fd0d2" stop-opacity=".85"/>
      <stop offset=".62" stop-color="#5fd0d2" stop-opacity=".85"/><stop offset="1" stop-color="#3cb0b4" stop-opacity=".1"/></linearGradient>''']
    g.append("<defs>" + "".join(defs) + "</defs>")

    def top_y(x):
        return 377 + (TX - x) / TX * 15 if x < TX else 377 + (x - TX) / (W - TX) * 9

    def near(x):
        return 1 + abs(TX - x) / TX * 1.25 if x < TX else 1 + (x - TX) / (W - TX) * 0.6

    pts = [(-6, top_y(-6)), (TX, top_y(TX)), (W + 6, top_y(W + 6))]
    g.append(f'<path d="{poly(pts + [(W + 6, 460), (-6, 460)])}" fill="url(#wallface)"/>')
    # merlons, growing as the wall comes toward us
    mer = []
    for side in (-1, 1):
        x = TX + side * 6
        while -40 < x < W + 40:
            n = near(x)
            w, h, gp = 13 * n, 9 * n, 9 * n
            x0, x1 = (x, x + w) if side > 0 else (x - w, x)
            y0, y1 = top_y(x0), top_y(x1)
            mer.append(poly([(x0, y0), (x0, y0 - h), (x1, y1 - h), (x1, y1)]))
            x += side * (w + gp)
    g.append(f'<path d="{" ".join(mer)}" fill="#0a1019"/>')
    # coping, panel joints, and the strip of light along the wall
    g.append(f'<path d="{poly(pts, close=False)}" stroke="#1b2735" stroke-width="0.8" fill="none"/>')
    joints = []
    for dy in (14, 31):
        joints.append(poly([(x, top_y(x) + dy * near(x) * 0.8) for x in (-6, TX, W + 6)], close=False))
    x = -6.0
    while x < W:
        n = near(x)
        joints.append(f"M{f(x)} {f(top_y(x) + 1)} L{f(x)} {f(top_y(x) + 14 * n * 0.8)}")
        joints.append(f"M{f(x + 18 * n)} {f(top_y(x) + 14 * n * 0.8)} L{f(x + 18 * n)} {f(top_y(x) + 31 * n * 0.8)}")
        x += 36 * n
    g.append(f'<path d="{" ".join(joints)}" stroke="#0d1520" stroke-width="0.7" fill="none"/>')
    strip = [(x, top_y(x) + 4.5 * near(x)) for x in (380, TX, W + 6)]
    g.append(f'<path class="emit" d="{poly(strip, close=False)}" stroke="url(#strip)" stroke-width="0.9" fill="none" stroke-dasharray="26 3"/>')
    return g


def build_svg():
    rnd = random.Random(7)
    layers = [("far", far_layer(rnd)), ("mid", mid_layer(rnd)), ("tower", tower_layer(rnd)), ("wall", wall_layer(rnd))]
    body = "\n".join(f'<g id="{name}">\n' + "\n".join(parts) + "\n</g>" for name, parts in layers)
    return f'''<!doctype html><meta charset="utf-8"><style>
html, body {{ margin: 0; background: transparent; }} svg {{ display: block; }}
html.emitpass body {{ background: #000; }}
html.emitpass svg :not(.emit, .emit *, defs, defs *, g) {{ fill: #000 !important; stroke: #000 !important; }}
</style>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
{body}
</svg>'''


# ── Paint ────────────────────────────────────────────────────────────────────
def lin(c):
    return (np.asarray(c, np.float32) / 255.0) ** 2.2


def load(name):
    a = np.asarray(Image.open(os.path.join(OUT, name + ".png")).convert("RGBA"), np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3:4]
    return rgb ** 2.2, al


def over(base, rgb, al):
    return base * (1 - al) + rgb * al


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def noise(shape, cell, seed, octaves=3, stretch=(1.0, 1.0)):
    """Smooth value noise in 0..1; cell is the feature size in pixels."""
    rng = np.random.default_rng(seed)
    out = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cy = max(2, int(shape[0] / (cell * stretch[1]) * 2 ** o) + 3)
        cx = max(2, int(shape[1] / (cell * stretch[0]) * 2 ** o) + 3)
        g = rng.random((cy, cx)).astype(np.float32)
        z = ndimage.zoom(g, (shape[0] / (cy - 2), shape[1] / (cx - 2)), order=3)[: shape[0], : shape[1]]
        out += amp * z
        tot += amp
        amp *= 0.5
    return np.clip(out / tot, 0, 1)


def blur(img, sigma_px):
    return ndimage.gaussian_filter(img, sigma=(sigma_px, sigma_px, 0) if img.ndim == 3 else sigma_px, mode="nearest")


def paint():
    ph, pw = int(H * S), int(W * S)
    Y, X = np.mgrid[0:ph, 0:pw].astype(np.float32) / S
    X += 0.5 / S
    Y += 0.5 / S

    # sky: navy-black overhead, lifting toward the horizon
    stops = [(0, (4, 5, 10)), (110, (5, 7, 13)), (210, (8, 13, 24)), (275, (12, 22, 35)), (304, (16, 31, 44)), (460, (16, 31, 44))]
    ys = np.array([s[0] for s in stops], np.float32)
    cols = np.array([lin(s[1]) for s in stops], np.float32)
    sky = np.stack([np.interp(Y[:, 0], ys, cols[:, c]) for c in range(3)], -1)[:, None, :] * np.ones((1, pw, 1), np.float32)

    # the city's glow on the low sky, and the searchlight lighting the air around the crown
    city = np.exp(-(((X - 1108) / 230) ** 2 + ((Y - 304) / 80) ** 2))[..., None]
    sky += city * lin(TEAL) * 0.16
    lamp_air = np.exp(-(((X - LENS[0]) ** 2 + (Y - LENS[1]) ** 2) / 62 ** 2))[..., None]
    sky += lamp_air * lin(GOLD) * 0.05

    # soft cloud banks to the right, lit from below by the city and the lamp
    cl = noise((ph, pw), 260, 11, 3, stretch=(2.6, 0.7))
    band = smoothstep(560, 900, X) * (smoothstep(30, 120, Y) * (1 - smoothstep(200, 262, Y)))
    dens = smoothstep(0.5, 0.72, cl) * band
    under = np.clip(dens - np.roll(dens, int(6 * S), axis=0), 0, 1)
    cloud = lin((11, 18, 30)) * np.ones_like(sky)
    lightc = (city * 1.8 + 0.25)[..., 0:1] * lin(TEAL) * 0.25 + lamp_air * lin(GOLD) * 0.35
    sky = over(sky, cloud + lightc * 0.6, dens[..., None] * 0.9)
    sky += under[..., None] * lightc * 0.9

    # stars, in the clear sky
    rng = np.random.default_rng(3)
    stars = np.zeros((ph, pw), np.float32)
    for _ in range(420):
        x, y = rng.uniform(0, W), rng.uniform(0, 250) ** 1.08 * 0.9
        if rng.random() < smoothstep(500, 1100, x) * 0.7:
            continue
        b = rng.uniform(0.15, 0.9) ** 2
        ix, iy = int(x * S), int(y * S)
        if 1 <= ix < pw - 1 and 1 <= iy < ph - 1:
            stars[iy, ix] += b
    stars = ndimage.gaussian_filter(stars, 0.55) * 6
    stars *= (1 - dens) * (1 - smoothstep(200, 280, Y))
    sky += stars[..., None] * lin((225, 235, 245))

    img = sky
    # the far ranges, the city and the ridge
    rgb, al = load("far")
    img = over(img, rgb, al)
    haze = noise((ph, pw), 300, 5, 2, stretch=(3, 0.5))
    hz = np.exp(-((Y - 302) / 10) ** 2) * (0.55 + 0.45 * haze) * 0.55
    img = over(img, lin((18, 38, 52)) + city * lin(TEAL) * 0.12, hz[..., None])

    # the valley, with the searchlight's pool on the road
    rgb, al = load("mid")
    dx, dy = (X - POOL[0]) / 40, (Y - POOL[1] - 1) / 8
    pool = np.exp(-(dx * dx + dy * dy) * 1.6)[..., None]
    luma = rgb.mean(-1, keepdims=True)
    rgb = rgb + pool * lin(GOLD) * (0.04 + luma * 9) * 1.4
    img = over(img, rgb, al)
    fog = noise((ph, pw), 180, 9, 3, stretch=(3.2, 0.6))
    fv = smoothstep(308, 322, Y) * (1 - smoothstep(352, 376, Y))
    fogc = lin((16, 30, 42)) * np.ones_like(img) + city * lin(TEAL) * 0.05 + pool * lin(GOLD) * 0.25
    img = over(img, fogc, (fv * smoothstep(0.35, 0.8, fog) * 0.32)[..., None])

    # the beam: a cone of light from the lens to the road
    vx, vy = X - LENS[0], Y - LENS[1]
    t = vx * DIR[0] + vy * DIR[1]
    s = np.abs(vx * DIR[1] - vy * DIR[0])
    length = math.hypot(POOL[0] - LENS[0], POOL[1] - LENS[1])
    wid = 4.8 + np.clip(t, 0, None) * math.tan(math.radians(5.2))
    core = np.exp(-((s / wid) ** 2) * 2.4) * (t > 0)
    wide = np.exp(-((s / (wid * 2.3)) ** 2) * 2) * (t > 0)
    along = 1 / (1 + np.clip(t, 0, None) / 95) * (1 - smoothstep(length - 20, length + 14, t))
    beam_noise = 0.82 + 0.18 * noise((ph, pw), 40, 21, 2)
    beam = (core * 0.34 + wide * 0.07) * along * beam_noise
    img += beam[..., None] * lin((255, 232, 180))

    # the tower, a breath of haze at its foot, then the wall
    rgb, al = load("tower")
    # the lamps behind the cross window light the stone around it
    d2 = ((X - WINDOW[0]) / 24) ** 2 + ((Y - WINDOW[1]) / 30) ** 2
    rgb = rgb + (np.exp(-d2) * 0.05 + np.exp(-d2 / 5) * 0.012)[..., None] * lin(GOLD)
    img = over(img, rgb, al)
    img += (np.exp(-d2 * 9) * 0.08)[..., None] * lin(GOLD)      # and the air just in front of it
    foot = smoothstep(330, 378, Y) * 0.35
    img = over(img, lin((12, 22, 32)) * np.ones_like(img), (foot * al[..., 0])[..., None])
    rgb, al = load("wall")
    img = over(img, rgb, al)

    # glow off everything that shines
    em = np.asarray(Image.open(os.path.join(OUT, "emit.png")).convert("RGB"), np.float32) / 255.0
    em = em ** 2.2
    glow = blur(em, 1.0 * S) * 0.9 + blur(em, 3.5 * S) * 0.7 + blur(em, 12 * S) * 0.45 + blur(em, 34 * S) * 0.3
    img += glow
    # the lens and the far beacon: a hot point and a long low streak, like a camera lens sees them
    for (cx, cy), k in ((LENS, 1.0), (FAR_BEACON, 0.35)):
        d2 = (X - cx) ** 2 + (Y - cy) ** 2
        img += (np.exp(-d2 / 2.5 ** 2) * 1.2 + np.exp(-d2 / 9 ** 2) * 0.3)[..., None] * lin((255, 240, 205)) * k
        streak = np.exp(-((Y - cy) / 0.7) ** 2) * np.exp(-np.abs(X - cx) / 24)
        img += streak[..., None] * lin((150, 225, 230)) * 0.12 * k

    # grade: soft shoulder on the highlights, back to sRGB
    img = 1 - np.exp(-img * 1.15)
    img = np.clip(img, 0, 1) ** (1 / 2.2)
    return img, X, Y


def finish(img, X, Y, box, fade_left):
    x0, y0, w, h = box
    sl = (slice(int(round(y0 * S)), int(round((y0 + h) * S))), slice(int(round(x0 * S)), int(round((x0 + w) * S))))
    im, xx, yy = img[sl].copy(), X[sl], Y[sl]
    bg = np.asarray(BG, np.float32) / 255.0
    edge = smoothstep(y0 + h - 40, y0 + h - 1, yy)                        # into the next section
    if y0 == 0:
        edge = np.maximum(edge, 1 - smoothstep(0, 46, yy))                 # out of the section above
    if fade_left:
        edge = np.maximum(edge, (1 - smoothstep(120, 620, xx)) * 0.55)    # quiet behind the copy
    im = im * (1 - edge[..., None]) + bg * edge[..., None]
    im += (np.random.default_rng(1).random(im.shape, np.float32) - 0.5) / 255.0 * 1.5   # dither against banding
    return Image.fromarray((np.clip(im, 0, 1) * 255 + 0.5).astype(np.uint8))


def webp(im, width, name, q=90):
    h = round(im.height * width / im.width)
    tmp = os.path.join(OUT, name + ".png")
    im.resize((width, h), Image.LANCZOS).save(tmp)
    dst = os.path.join(SITE, name + ".webp")
    subprocess.run(["cwebp", "-quiet", "-q", str(q), "-m", "6", "-sharp_yuv", "-af", tmp, "-o", dst], check=True)
    print(f"  {name}.webp  {width}x{h}  {os.path.getsize(dst) // 1024} KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    html = os.path.join(OUT, "scene.html")
    with open(html, "w") as fh:
        fh.write(build_svg())
    if "--svg" in sys.argv:
        print("wrote", html)
        return
    subprocess.run(["node", os.path.join(HERE, "render.js"), html, OUT, str(S)], check=True)
    img, X, Y = paint()
    desk = finish(img, X, Y, (0, 0, W, H), fade_left=True)
    phone = finish(img, X, Y, PHONE, fade_left=False)
    desk.save(os.path.join(OUT, "master-desktop.png"))
    phone.save(os.path.join(OUT, "master-phone.png"))
    if "--preview" in sys.argv:
        return
    for wdt in (2400, 1500):
        webp(desk, wdt, f"watchtower-{wdt}")
    for wdt in (1100, 660):
        webp(phone, wdt, f"watchtower-phone-{wdt}")


if __name__ == "__main__":
    main()
