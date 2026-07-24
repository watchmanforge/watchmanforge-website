#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_gallery_images.py — masters -> display-resolution WebP for the site.

  python3 tools/make_gallery_images.py            # only pieces missing output
  python3 tools/make_gallery_images.py --force    # rebuild everything
  python3 tools/make_gallery_images.py he-keeps-the-gate   # one slug

Writes, per piece, into assets/gallery/:
    <slug>-600.webp    grid thumbnail   (600px on the long-ish edge / width)
    <slug>-1400.webp   detail image     (1400px wide)

RESOLUTION IS THE ANTI-THEFT PROTECTION. Nothing print-resolution is ever
written here, and no watermark is applied. Downscale is Pillow/LANCZOS;
encode is cwebp (no ImageMagick on this box).

Pieces whose master has not been located (master=None in gallery_data.py) get
an on-brand PENDING placeholder at the exact same paths, so no page renders a
broken image. Drop the master in, set the path, re-run — the placeholder is
overwritten and no HTML changes.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gallery_data import PIECES, MASTER_ROOT, REGISTERS  # noqa: E402

from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None  # masters are large by design; they are ours

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "gallery")
MANIFEST = os.path.join(OUT_DIR, "sizes.json")

GRID_W = 600
DETAIL_W = 1400
QUALITY = 85

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


def encode_webp(img, dest, quality=QUALITY):
    """LANCZOS-resized RGB image -> WebP via cwebp."""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_png = tmp.name
    try:
        img.save(tmp_png, "PNG")
        subprocess.run(
            ["cwebp", "-quiet", "-q", str(quality), "-m", "6",
             "-sharp_yuv", "-mt", "-metadata", "none", tmp_png, "-o", dest],
            check=True,
        )
    finally:
        os.unlink(tmp_png)


def resize_to_width(img, width):
    w, h = img.size
    if w <= width:
        return img.copy()
    return img.resize((width, round(h * width / w)), Image.LANCZOS)


def placeholder(piece, width):
    """On-brand 4:5 'artwork pending' tile — never mistaken for the real print."""
    reg = REGISTERS[piece["register"]]
    accent = tuple(int(reg["accent"][i:i + 2], 16) for i in (1, 3, 5))
    height = round(width * 5 / 4)
    img = Image.new("RGB", (width, height), (5, 5, 11))
    d = ImageDraw.Draw(img)

    # accent hairline frame + corner brackets, echoing .hud-frame
    pad = round(width * 0.055)
    dim = tuple(int(c * 0.30) for c in accent)
    d.rectangle([pad, pad, width - pad, height - pad], outline=dim, width=1)
    arm = round(width * 0.06)
    for cx, cy, dx, dy in ((pad, pad, 1, 1), (width - pad, pad, -1, 1),
                           (pad, height - pad, 1, -1), (width - pad, height - pad, -1, -1)):
        d.line([cx, cy, cx + arm * dx, cy], fill=accent, width=2)
        d.line([cx, cy, cx, cy + arm * dy], fill=accent, width=2)

    def fit(text, font_path, target_w, cap):
        lo, hi = 8, cap
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if d.textlength(text, font=ImageFont.truetype(font_path, mid)) <= target_w:
                lo = mid
            else:
                hi = mid - 1
        return ImageFont.truetype(font_path, lo)

    inner = width - 2 * pad - round(width * 0.09)
    title = piece["title"].upper()
    f_title = fit(title, SERIF_BOLD, inner, round(width * 0.085))
    f_ref = fit(piece["ref"].upper(), SERIF, inner * 0.55, round(width * 0.042))
    f_note = fit("ARTWORK PENDING", SERIF, inner * 0.5, round(width * 0.034))

    cy = height * 0.44
    d.text((width / 2, cy), title, font=f_title, fill=(198, 208, 224), anchor="mm")
    d.text((width / 2, cy + width * 0.085), piece["ref"].upper(), font=f_ref,
           fill=accent, anchor="mm")
    d.text((width / 2, height * 0.70), "ARTWORK PENDING", font=f_note,
           fill=tuple(int(c * 0.55) for c in accent), anchor="mm")
    return img


def build(piece, force=False):
    slug = piece["slug"]
    grid = os.path.join(OUT_DIR, f"{slug}-{GRID_W}.webp")
    detail = os.path.join(OUT_DIR, f"{slug}-{DETAIL_W}.webp")
    pending = piece.get("master") is None

    if not force and os.path.exists(grid) and os.path.exists(detail):
        with Image.open(grid) as g, Image.open(detail) as dt:
            return slug, g.size, dt.size, pending, True

    if pending:
        g_img = placeholder(piece, GRID_W)
        d_img = placeholder(piece, DETAIL_W)
    else:
        src = os.path.join(MASTER_ROOT, piece["master"])
        if not os.path.exists(src):
            raise SystemExit(f"master not found for {slug}: {src}")
        with Image.open(src) as im:
            im = im.convert("RGB")
            g_img = resize_to_width(im, GRID_W)
            d_img = resize_to_width(im, DETAIL_W)

    encode_webp(g_img, grid)
    encode_webp(d_img, detail)
    return slug, g_img.size, d_img.size, pending, False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*", help="limit to these slugs")
    ap.add_argument("--force", action="store_true", help="rebuild existing output")
    a = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [p for p in PIECES if not a.slugs or p["slug"] in a.slugs]
    if not targets:
        raise SystemExit("no matching slugs")

    sizes, total, pending_n = {}, 0, 0
    for piece in targets:
        slug, gsz, dsz, pending, cached = build(piece, a.force)
        sizes[slug] = {"grid": list(gsz), "detail": list(dsz), "pending": pending}
        gb = os.path.getsize(os.path.join(OUT_DIR, f"{slug}-{GRID_W}.webp"))
        db = os.path.getsize(os.path.join(OUT_DIR, f"{slug}-{DETAIL_W}.webp"))
        total += gb + db
        pending_n += int(pending)
        flag = "PENDING" if pending else ("cached " if cached else "built  ")
        print(f"  {flag} {slug:24s} grid {gsz[0]}x{gsz[1]} {gb/1024:6.1f} KB   "
              f"detail {dsz[0]}x{dsz[1]} {db/1024:7.1f} KB")

    # Merge so a single-slug run does not drop the rest of the manifest.
    merged = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST) as fh:
            merged = json.load(fh)
    merged.update(sizes)
    with open(MANIFEST, "w") as fh:
        json.dump(merged, fh, indent=2, sort_keys=True)
        fh.write("\n")

    grid_total = sum(os.path.getsize(os.path.join(OUT_DIR, f"{s}-{GRID_W}.webp"))
                     for s in merged)
    print(f"\n  {len(targets)} pieces · {pending_n} pending placeholder(s)")
    print(f"  gallery.html image payload (all {len(merged)} grid thumbs): "
          f"{grid_total/1024/1024:.2f} MB")
    print(f"  assets/gallery total on disk: {total/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
