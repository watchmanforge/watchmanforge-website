#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_gallery.py — emits the gallery from tools/gallery_data.py.

  python3 tools/build_gallery.py

Writes:
  gallery.html          the collection statement + five register movements
  gallery/<slug>.html   one page per piece (15)
  sitemap.xml           every page on the site

Run tools/make_gallery_images.py first — this reads assets/gallery/sizes.json
for the intrinsic width/height that goes on every <img>.

DESIGN NOTE — the gallery is deliberately quieter than the rest of the site.
The HUD/neon language (hud-bracket, card-corner, glow, Orbitron) belongs to the
apps side. Here: a system serif for everything editorial, neutral hairlines,
and the register accent used sparingly as the single point of colour. Nothing
is overlaid on the artwork and nothing animates in — structure carries it.

These outputs are GENERATED. Edit the data or the templates here, not the HTML.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gallery_data import (  # noqa: E402
    PIECES, REGISTERS, REGISTER_ORDER, COLLECTION, SITE,
    DEFAULT_SOURCE, HOMEPAGE_FEATURED, in_register,
)
from chrome import NAV as CHROME_NAV, FOOTER as CHROME_FOOTER, block  # noqa: E402
import sync_chrome  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZES = json.load(open(os.path.join(ROOT, "assets", "gallery", "sizes.json")))

ROMAN = ["I", "II", "III", "IV", "V"]

# ── Shared chrome ────────────────────────────────────────────────────────────
# Nav and footer come from tools/chrome.py (the one copy for the whole site).
# The ?v= stamps on main.css / main.js / watchman-fx.js are written by
# tools/sync_chrome.py, which main() runs after the pages are written.
NAV = block("nav", CHROME_NAV)
FOOTER = block("footer", CHROME_FOOTER) + """
<script src="/js/main.js"></script>
<script src="/js/watchman-fx.js"></script>
</body>
</html>"""

# ── Exhibition base ──────────────────────────────────────────────────────────
# Local tokens on purpose. The global --border-* / --text-* tokens in main.css
# are all cyan-tinted (rgba(0,212,255,…)); inheriting them would drag the HUD
# palette back into the gallery. The serif stack is system-resident, so the
# quieter voice costs no extra webfont.
EX_CSS = """  :root{
    --gal-ink:#e9e7e2; --gal-ink-2:#a3a19b; --gal-ink-3:#6f6d69;
    --gal-line:rgba(255,255,255,0.12); --gal-line-soft:rgba(255,255,255,0.055);
    --gal-field:#08080c;
    --gal-serif:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Times New Roman',serif;
    --gal-sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  }
  html{ scroll-behavior:smooth; } @media (prefers-reduced-motion:reduce){ html{ scroll-behavior:auto; } }
  a:focus-visible, .btn:focus-visible, button:focus-visible{ outline:2px solid var(--accent); outline-offset:3px; }
  .ex-wrap{ max-width:1180px; margin:0 auto; padding:0 var(--pad-x); }
  .ex-measure{ max-width:37rem; }
  .ex-label{ font-family:var(--gal-sans); font-size:.66rem; font-weight:500; letter-spacing:.22em;
    text-transform:uppercase; color:var(--gal-ink-3); margin:0; }
  .ex-rule{ height:1px; background:var(--gal-line); border:0; margin:0; }
  .ex-rule-accent{ height:1px; width:52px; background:var(--accent); border:0; margin:0; opacity:.85; }

  /* ── Plate grid ── the image is the image: no overlay, no brackets, caption
     below. Fixed-height field + object-fit keeps every plate on one baseline
     so the collection scans as a hung wall rather than a ragged catalog. ── */
  .ex-grid{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
    gap:clamp(22px,2.6vw,36px) clamp(16px,2vw,30px); }
  @media (max-width:860px){ .ex-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width:480px){ .ex-grid{ grid-template-columns:1fr; } }
  .ex-plate{ display:block; text-decoration:none; }
  .ex-plate-field{ display:flex; align-items:center; justify-content:center;
    height:clamp(178px,18vw,262px); background:var(--gal-field);
    border:1px solid var(--gal-line-soft); transition:border-color .25s ease; }
  .ex-plate-field img{ display:block; max-width:100%; max-height:100%; width:auto; height:auto;
    transition:opacity .25s ease; }
  .ex-plate:hover .ex-plate-field{ border-color:rgba(var(--accent-rgb),0.5); }
  .ex-plate:hover .ex-plate-field img{ opacity:.88; }
  .ex-cap{ display:block; padding:13px 1px 0; }
  .ex-cap-title{ display:block; font-family:var(--gal-serif); font-size:1.02rem; line-height:1.25;
    color:var(--gal-ink); }
  .ex-cap-ref{ display:block; margin-top:5px; font-family:var(--gal-sans); font-size:.62rem;
    letter-spacing:.17em; text-transform:uppercase; color:var(--gal-ink-3); transition:color .25s ease; }
  .ex-plate:hover .ex-cap-ref{ color:rgba(var(--accent-rgb),0.95); }
  .ex-cap-note{ display:block; margin-top:5px; font-family:var(--gal-sans); font-size:.62rem;
    letter-spacing:.17em; text-transform:uppercase; color:var(--gal-ink-3); }"""

# ── gallery.html only ────────────────────────────────────────────────────────
INDEX_CSS = """  .ex-masthead{ padding:calc(var(--nav-h,76px) + clamp(56px,9vw,116px)) 0 clamp(48px,7vw,84px); }
  .ex-collection{ font-family:var(--gal-sans); font-size:.68rem; font-weight:500; letter-spacing:.28em;
    text-transform:uppercase; color:var(--gal-ink-3); margin:0 0 26px; }
  .ex-title{ font-family:var(--gal-serif); font-weight:400; font-size:clamp(2.6rem,7vw,4.6rem);
    line-height:1.02; letter-spacing:-.015em; color:var(--gal-ink); margin:0 0 22px; }
  .ex-line{ font-family:var(--gal-serif); font-style:italic; font-size:clamp(1.12rem,2.3vw,1.5rem);
    line-height:1.5; color:var(--gal-ink-2); margin:0 0 clamp(38px,5vw,54px); max-width:44rem; }
  .ex-statement{ max-width:37rem; }
  .ex-statement p{ font-family:var(--gal-serif); font-size:1.03rem; line-height:1.82;
    color:var(--gal-ink-2); margin:0 0 1.25em; }
  .ex-statement p:last-child{ margin-bottom:0; }
  .ex-statement em{ color:var(--gal-ink); font-style:italic; }
  .ex-facts{ display:flex; flex-wrap:wrap; gap:10px 34px; margin:clamp(38px,5vw,54px) 0 0;
    padding-top:22px; border-top:1px solid var(--gal-line-soft); }
  .ex-facts div{ display:block; }
  .ex-facts dt{ font-family:var(--gal-sans); font-size:.6rem; letter-spacing:.2em; text-transform:uppercase;
    color:var(--gal-ink-3); margin:0 0 5px; }
  .ex-facts dd{ font-family:var(--gal-serif); font-size:.95rem; color:var(--gal-ink-2); margin:0; }

  /* ── Movements ── each register introduced as a small series ── */
  .ex-movement{ padding:clamp(44px,5vw,68px) 0; border-top:1px solid var(--gal-line-soft);
    scroll-margin-top:calc(var(--nav-h,76px) + 16px); }
  .ex-mv-head{ display:grid; grid-template-columns:auto 1fr; gap:0 clamp(20px,3vw,40px);
    align-items:start; margin-bottom:clamp(30px,4vw,46px); }
  .ex-numeral{ font-family:var(--gal-serif); font-size:clamp(1.5rem,3vw,2.1rem); line-height:1;
    color:var(--accent); opacity:.9; padding-top:.12em; min-width:1.6em; }
  .ex-mv-meta{ min-width:0; }
  .ex-mv-title{ font-family:var(--gal-serif); font-weight:400; font-size:clamp(1.7rem,3.6vw,2.5rem);
    line-height:1.1; color:var(--gal-ink); margin:9px 0 0; }
  .ex-mv-note{ font-family:var(--gal-serif); font-size:1rem; line-height:1.72; color:var(--gal-ink-2);
    margin:14px 0 0; max-width:34rem; }
  .ex-mv-rule{ height:1px; background:linear-gradient(90deg, rgba(var(--accent-rgb),0.55), transparent 62%);
    border:0; margin:18px 0 0; }

  .ex-colophon{ padding:clamp(56px,7vw,92px) 0 clamp(72px,9vw,120px); border-top:1px solid var(--gal-line-soft); }
  .ex-colophon p{ font-family:var(--gal-serif); font-size:.97rem; line-height:1.8; color:var(--gal-ink-2);
    margin:18px 0 0; max-width:37rem; }
  .ex-colophon a{ color:var(--gal-ink); text-decoration:none; border-bottom:1px solid var(--gal-line); }
  .ex-colophon a:hover{ border-bottom-color:var(--gal-ink); }"""

# ── gallery/<slug>.html only ─────────────────────────────────────────────────
WORK_CSS = """  /* ══════════════════════════════════════════════════════════════════
     BUY BAR — the one commercial element on the page. Fixed under the
     site nav so it is always reachable while scrolling, and identical in
     position on all fifteen pages.

     data-piece / data-collection live on the bar itself. To swap in direct
     checkout later, replace the <a> inside .buybar-act — nothing else on
     the page reads these hooks, so no rebuild of anything else is needed.
     ══════════════════════════════════════════════════════════════════ */
  .buybar{ position:fixed; top:var(--nav-h,76px); left:0; right:0; z-index:900;
    background:rgba(4,4,7,0.88); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
    border-bottom:1px solid var(--gal-line-soft); }
  .buybar-in{ max-width:1180px; margin:0 auto; padding:0 var(--pad-x); height:58px;
    display:flex; align-items:center; justify-content:space-between; gap:18px; }
  .buybar-id{ min-width:0; display:flex; align-items:baseline; gap:14px; }
  .buybar-title{ font-family:var(--gal-serif); font-size:1.02rem; color:var(--gal-ink);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .buybar-ref{ font-family:var(--gal-sans); font-size:.6rem; letter-spacing:.17em; text-transform:uppercase;
    color:var(--gal-ink-3); white-space:nowrap; }
  .buybar-act{ flex:none; }
  .buybar-btn{ display:inline-block; font-family:var(--gal-sans); font-size:.68rem; font-weight:500;
    letter-spacing:.15em; text-transform:uppercase; text-decoration:none; color:var(--accent);
    border:1px solid rgba(var(--accent-rgb),0.45); padding:9px 20px; border-radius:2px;
    transition:background .22s ease, color .22s ease, border-color .22s ease; white-space:nowrap; }
  .buybar-btn:hover{ background:var(--accent); border-color:var(--accent); color:#05050b; }
  .buybar-note{ font-family:var(--gal-sans); font-size:.62rem; letter-spacing:.15em; text-transform:uppercase;
    color:var(--gal-ink-3); }
  @media (max-width:640px){
    .buybar-ref{ display:none; }
    .buybar-in{ height:54px; gap:12px; }
    .buybar-btn{ padding:8px 14px; font-size:.63rem; letter-spacing:.1em; }
  }

  /* Clear the fixed nav + the fixed buy bar. */
  .work{ padding:calc(var(--nav-h,76px) + 58px + clamp(30px,5vw,64px)) 0 0; }
  .work-crumb{ font-family:var(--gal-sans); font-size:.63rem; letter-spacing:.16em; text-transform:uppercase;
    color:var(--gal-ink-3); margin:0 0 clamp(26px,4vw,44px); }
  .work-crumb a{ color:var(--gal-ink-3); text-decoration:none; }
  .work-crumb a:hover{ color:var(--gal-ink-2); }
  .work-crumb span{ opacity:.5; padding:0 9px; }

  /* Artwork unadorned — no frame, no glow, no brackets. The hairline is a mat
     edge, not chrome: these plates are near-black and would otherwise bleed
     into the page background with no defined edge. */
  .work-plate{ margin:0 auto; max-width:880px; }
  .work-plate.is-landscape{ max-width:1060px; }
  /* Height-capped to the viewport (less nav, buy bar and breathing room) so the
     whole work is visible at once rather than scrolled through in bands. */
  .work-plate img{ display:block; width:auto; max-width:100%;
    max-height:calc(100vh - var(--nav-h,76px) - 58px - 130px); margin:0 auto;
    box-shadow:0 0 0 1px rgba(255,255,255,0.07); }

  /* Wall label, under the plate. */
  .work-label{ max-width:880px; margin:clamp(30px,4vw,46px) auto 0; padding-top:clamp(24px,3vw,34px);
    border-top:1px solid var(--gal-line-soft); }
  .work-reg{ font-family:var(--gal-sans); font-size:.63rem; letter-spacing:.2em; text-transform:uppercase;
    color:var(--gal-ink-3); margin:0 0 16px; }
  .work-reg b{ color:var(--accent); font-weight:500; }
  .work-title{ font-family:var(--gal-serif); font-weight:400; font-size:clamp(2.1rem,5vw,3.3rem);
    line-height:1.06; letter-spacing:-.012em; color:var(--gal-ink); margin:0; }
  .work-tag{ font-family:var(--gal-serif); font-style:italic; font-size:clamp(1.02rem,2vw,1.24rem);
    line-height:1.6; color:var(--gal-ink-2); margin:18px 0 0; max-width:34rem; }

  /* Scripture, verbatim. */
  .work-verse{ padding:clamp(56px,7vw,92px) 0; }
  .work-verse-in{ max-width:880px; margin:0 auto; }
  .work-quote{ margin:0; }
  .work-quote p{ font-family:var(--gal-serif); font-size:clamp(1.24rem,2.7vw,1.78rem); line-height:1.62;
    color:var(--gal-ink); margin:0; text-indent:-.42em; }
  .work-cite{ display:block; margin-top:22px; font-family:var(--gal-sans); font-size:.63rem; font-style:normal;
    letter-spacing:.2em; text-transform:uppercase; color:var(--gal-ink-3); }
  .work-cite b{ color:var(--accent); font-weight:500; }

  .work-scene{ padding:0 0 clamp(56px,7vw,92px); }
  .work-scene-in{ max-width:880px; margin:0 auto; }
  .work-body{ max-width:37rem; margin:22px 0 0; }
  .work-body p{ font-family:var(--gal-serif); font-size:1.04rem; line-height:1.84; color:var(--gal-ink-2);
    margin:0 0 1.3em; }
  .work-body p:last-child{ margin-bottom:0; }
  .work-body em{ color:var(--gal-ink); }

  .work-specs{ display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:22px 34px;
    margin:clamp(38px,5vw,56px) 0 0; padding-top:26px; border-top:1px solid var(--gal-line-soft); }
  .work-specs dt{ font-family:var(--gal-sans); font-size:.6rem; letter-spacing:.2em; text-transform:uppercase;
    color:var(--gal-ink-3); margin:0 0 6px; }
  .work-specs dd{ font-family:var(--gal-serif); font-size:.94rem; line-height:1.6; color:var(--gal-ink-2); margin:0; }
  .work-source{ margin:clamp(30px,4vw,42px) 0 0; padding-top:24px; border-top:1px solid var(--gal-line-soft);
    font-family:var(--gal-serif); font-size:.9rem; line-height:1.74; color:var(--gal-ink-3); max-width:37rem; }

  .work-more{ padding:clamp(52px,7vw,88px) 0 clamp(72px,9vw,120px); border-top:1px solid var(--gal-line-soft); }
  .work-more-head{ display:flex; align-items:baseline; justify-content:space-between; gap:20px;
    flex-wrap:wrap; margin-bottom:clamp(26px,3.5vw,40px); }
  .work-more-title{ font-family:var(--gal-serif); font-weight:400; font-size:clamp(1.4rem,3vw,1.95rem);
    color:var(--gal-ink); margin:8px 0 0; }
  .work-back{ font-family:var(--gal-sans); font-size:.64rem; letter-spacing:.16em; text-transform:uppercase;
    color:var(--gal-ink-3); text-decoration:none; border-bottom:1px solid var(--gal-line); padding-bottom:3px; }
  .work-back:hover{ color:var(--gal-ink); border-bottom-color:var(--gal-ink); }
  .work-more .ex-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); max-width:760px; }
  @media (max-width:480px){ .work-more .ex-grid{ grid-template-columns:1fr; } }"""

HEAD_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#05060b">
<meta property="og:title" content="{ogtitle}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="{ogtype}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Watchman Forge">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="{ogimg}">
<meta property="og:image:width" content="{ogw}">
<meta property="og:image:height" content="{ogh}">
<meta property="og:image:alt" content="{ogalt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogtitle}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{ogimg}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/assets/images/icon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">
<link rel="preload" href="/assets/webfonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/main.css">
<style>
  :root{{ --accent:{accent}; --accent-rgb:{accent_rgb}; }}
{css}
</style>
{extra_head}</head>
<body>
"""


def esc_attr(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def plain(s):
    """HTML entities -> plain text, for meta/alt attributes."""
    for a, b in (("&mdash;", "—"), ("&eacute;", "é"), ("&uuml;", "ü"),
                 ("&amp;", "&"), ("&rsquo;", "’"), ("<em>", ""), ("</em>", "")):
        s = s.replace(a, b)
    return s


def art_alt(p):
    reg = REGISTERS[p["register"]]
    return esc_attr(plain(
        f"{p['title']} — dark gothic Christian wall art, {reg['name'].lower()} "
        f"colorway, with {p['ref']} KJV"))


def plate(p):
    """A single work in a grid. Caption below the artwork — never on it."""
    sz = SIZES[p["slug"]]
    note = ('\n        <span class="ex-cap-note">Artwork pending</span>'
            if sz["pending"] else "")
    return f"""      <a class="ex-plate" href="/gallery/{p['slug']}">
        <span class="ex-plate-field">
          <img src="/assets/gallery/{p['slug']}-600.webp" width="{sz['grid'][0]}" height="{sz['grid'][1]}" loading="lazy" decoding="async" alt="{art_alt(p)}">
        </span>
        <span class="ex-cap">
          <span class="ex-cap-title">{p['title']}</span>
          <span class="ex-cap-ref">{plain(p['ref'])}&nbsp;&middot;&nbsp;KJV</span>{note}
        </span>
      </a>"""


# ── gallery.html ─────────────────────────────────────────────────────────────
def build_index():
    hero_piece = next(p for p in PIECES if not SIZES[p["slug"]]["pending"])
    hsz = SIZES[hero_piece["slug"]]
    desc = ("Collection 01: Illuminated Engravings — fifteen dark gothic Christian "
            "prints. Doré and Dürer engravings re-lit from a single source, one "
            "colorway per theological register, with verbatim KJV scripture.")
    head = HEAD_TMPL.format(
        title="Collection 01: Illuminated Engravings &mdash; The Gallery | Watchman Forge",
        desc=esc_attr(desc),
        ogtitle="Collection 01: Illuminated Engravings | Watchman Forge",
        ogtype="website",
        url=f"{SITE}/gallery",
        ogimg=f"{SITE}/assets/gallery/{hero_piece['slug']}-1400.webp",
        ogw=hsz["detail"][0], ogh=hsz["detail"][1],
        ogalt=art_alt(hero_piece),
        # The masthead is deliberately colourless — colour enters with the
        # first register and belongs to the work, not the packaging.
        accent="#8c8a85", accent_rgb="140,138,133",
        css=EX_CSS + "\n" + INDEX_CSS, extra_head="",
    )

    movements = []
    for i, reg_key in enumerate(REGISTER_ORDER):
        reg = REGISTERS[reg_key]
        pieces = in_register(reg_key)
        if not pieces:
            continue
        plates = "\n".join(plate(p) for p in pieces)
        movements.append(f"""  <section class="ex-movement" id="{reg_key}" style="--accent:{reg['accent']};--accent-rgb:{reg['accent_rgb']};" aria-labelledby="mv-{reg_key}">
    <div class="ex-wrap">
      <div class="ex-mv-head">
        <div class="ex-numeral" aria-hidden="true">{ROMAN[i]}</div>
        <div class="ex-mv-meta">
          <p class="ex-label">Register &middot; {plain(reg['theme'])}</p>
          <h2 class="ex-mv-title" id="mv-{reg_key}">{reg['name']}</h2>
          <hr class="ex-mv-rule">
          <p class="ex-mv-note">{reg['blurb']}</p>
        </div>
      </div>
      <div class="ex-grid">
{plates}
      </div>
    </div>
  </section>""")

    body = f"""{NAV}
<main>
  <!-- ── COLLECTION STATEMENT ── the work is introduced before it is shown ── -->
  <header class="ex-masthead">
    <div class="ex-wrap">
      <p class="ex-collection">Collection 01</p>
      <h1 class="ex-title">Illuminated Engravings</h1>
      <p class="ex-line">Old plates, struck again &mdash; and nothing added that the passage did not already say.</p>
      <div class="ex-statement">
        <p>Fifteen engravings taken out of the public domain &mdash; Gustave Dor&eacute;&rsquo;s 1866 Bible, and one plate cut by D&uuml;rer in 1513 &mdash; and re-lit. The line work is left exactly where the engraver put it. What changes is the light: each plate is washed down to ash, then lit from a single source, one colour, chosen for the passage it has to carry.</p>
        <p>That colour is the register. Five run through the collection, and each is a claim about the text rather than a decoration &mdash; <em>ember</em> for wrath and judgment, <em>signal</em> for the vigil, <em>verdant</em> for mercy and life, <em>ashen</em> for glory, <em>royal</em> for kingship. Three plates to a register. A piece belongs to one because of what the scene is doing, not because of how it happened to look.</p>
        <p>Every piece carries scripture, set verbatim in the King James Version and cited. Nothing is paraphrased and nothing is trimmed to fit the composition. The display line above the verse is ours. The verse is not.</p>
      </div>
      <dl class="ex-facts">
        <div><dt>Works</dt><dd>Fifteen</dd></div>
        <div><dt>Registers</dt><dd>Five</dd></div>
        <div><dt>Source plates</dt><dd>Dor&eacute; 1866 &middot; D&uuml;rer 1513</dd></div>
        <div><dt>Scripture</dt><dd>King James, verbatim</dd></div>
      </dl>
    </div>
  </header>

{chr(10).join(movements)}

  <section class="ex-colophon">
    <div class="ex-wrap">
      <p class="ex-label">Colophon</p>
      <p>Source plates are public domain. Treatment, composition, colour and typography are by Watchman Forge, produced with AI-assisted digital work under original creative direction. Every display line is our own language; anything carrying a citation is quoted exactly.</p>
      <p>Collection 02 is on the bench. <a href="/#join">Join the list</a> and you will hear when it lands.</p>
    </div>
  </section>
</main>
{FOOTER}
"""
    write(os.path.join(ROOT, "gallery.html"), head + body)


# ── gallery/<slug>.html ──────────────────────────────────────────────────────
def build_piece(p):
    reg = REGISTERS[p["register"]]
    sz = SIZES[p["slug"]]
    pending = sz["pending"]
    landscape = sz["detail"][0] > sz["detail"][1]
    url = f"{SITE}/gallery/{p['slug']}"
    detail_img = f"{SITE}/assets/gallery/{p['slug']}-1400.webp"

    desc = plain(f"{p['title']} — dark gothic Christian wall art from Collection 01: "
                 f"Illuminated Engravings. {p['tag']} {p['ref']}, King James Version.")
    if len(desc) > 300:
        desc = desc[:297] + "..."

    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "VisualArtwork",
        "name": plain(p["title"]),
        "url": url,
        "image": detail_img,
        "artform": "Digital print",
        "artMedium": "Digital engraving",
        "creator": {"@type": "Organization", "name": "Watchman Forge",
                    "url": SITE + "/"},
        "isPartOf": {"@type": "CreativeWorkSeries",
                     "name": plain(COLLECTION),
                     "url": f"{SITE}/gallery"},
        "description": desc,
        "citation": f"{plain(p['ref'])} (King James Version)",
    }, indent=2)

    head = HEAD_TMPL.format(
        title=f"{p['title']} &mdash; {plain(p['ref'])} | Watchman Forge Gallery",
        desc=esc_attr(desc),
        ogtitle=f"{p['title']} &mdash; {plain(p['ref'])} | Watchman Forge",
        ogtype="article",
        url=url,
        ogimg=detail_img,
        ogw=sz["detail"][0], ogh=sz["detail"][1],
        ogalt=art_alt(p),
        accent=reg["accent"], accent_rgb=reg["accent_rgb"],
        css=EX_CSS + "\n" + WORK_CSS,
        extra_head=f'<script type="application/ld+json">\n{jsonld}\n</script>\n',
    )

    prose = "\n          ".join(f"<p>{para}</p>" for para in p["scene"])
    source = p.get("source", DEFAULT_SOURCE)
    orient = "landscape" if landscape else "portrait"

    siblings = [q for q in in_register(p["register"]) if q["slug"] != p["slug"]]
    sib_plates = "\n".join(plate(q) for q in siblings)

    if pending:
        action = ('<span class="buybar-note">Artwork pending</span>')
    else:
        action = (f'<a class="buybar-btn" href="{p["etsy"]}" target="_blank" '
                  f'rel="noopener">Get the print on Etsy</a>')

    body = f"""{NAV}
<!-- ── BUY BAR ── data-piece / data-collection are the swap hooks; replace the
     control inside .buybar-act to move to direct checkout. ── -->
<div class="buybar" data-piece="{p['slug']}" data-collection="c01-illuminated-engravings">
  <div class="buybar-in">
    <div class="buybar-id">
      <span class="buybar-title">{p['title']}</span>
      <span class="buybar-ref">{plain(p['ref'])}&nbsp;&middot;&nbsp;KJV</span>
    </div>
    <div class="buybar-act">{action}</div>
  </div>
</div>
<main>
  <article class="work">
    <div class="ex-wrap">
      <nav class="work-crumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><a href="/gallery">The Gallery</a><span>/</span>{p['title']}
      </nav>

      <figure class="work-plate{' is-landscape' if landscape else ''}">
        <img src="/assets/gallery/{p['slug']}-1400.webp" width="{sz['detail'][0]}" height="{sz['detail'][1]}" decoding="async" alt="{art_alt(p)}">
      </figure>

      <div class="work-label">
        <p class="work-reg">Collection 01 &middot; <b>{reg['name']}</b> &middot; {plain(reg['theme'])}</p>
        <h1 class="work-title">{p['title']}</h1>
        <p class="work-tag">{p['tag']}</p>
      </div>
    </div>
  </article>

  <section class="work-verse">
    <div class="ex-wrap">
      <div class="work-verse-in">
        <blockquote class="work-quote">
          <p>&ldquo;{p['verse']}&rdquo;</p>
          <cite class="work-cite"><b>{plain(p['ref'])}</b> &middot; King James Version, quoted verbatim</cite>
        </blockquote>
      </div>
    </div>
  </section>

  <section class="work-scene">
    <div class="ex-wrap">
      <div class="work-scene-in">
        <p class="ex-label">The Scene</p>
        <div class="work-body">
          {prose}
        </div>

        <dl class="work-specs">
          <div><dt>File</dt><dd>One high-resolution {orient} file, 300&nbsp;DPI</dd></div>
          <div><dt>Sizing</dt><dd>Clean at 8&times;10 and 11&times;14; holds at 16&times;20</dd></div>
          <div><dt>Delivery</dt><dd>Instant digital download &mdash; no physical item ships</dd></div>
          <div><dt>License</dt><dd>Personal use; the file may not be resold or redistributed</dd></div>
        </dl>

        <p class="work-source">Source plate: {source}. Treatment, composition, colour and typography by Watchman Forge. The display line is our own language; anything carrying a citation is quoted exactly.</p>
      </div>
    </div>
  </section>

  <section class="work-more" style="--accent:{reg['accent']};--accent-rgb:{reg['accent_rgb']};">
    <div class="ex-wrap">
      <div class="work-more-head">
        <div>
          <p class="ex-label">{reg['name']} Register &middot; {plain(reg['theme'])}</p>
          <h2 class="work-more-title">The other two plates</h2>
        </div>
        <a class="work-back" href="/gallery">All fifteen works</a>
      </div>
      <div class="ex-grid">
{sib_plates}
      </div>
    </div>
  </section>
</main>
{FOOTER}
"""
    write(os.path.join(ROOT, "gallery", f"{p['slug']}.html"), head + body)


# ── sitemap.xml ──────────────────────────────────────────────────────────────
def build_sitemap():
    static = [
        ("/", "1.0", "weekly"),
        ("/gallery", "0.9", "weekly"),
        ("/about", "0.7", "monthly"),
        ("/contact", "0.5", "monthly"),
        ("/privacy-policy", "0.3", "yearly"),
        ("/terms-of-service", "0.3", "yearly"),
    ]
    rows = "".join(
        f"  <url>\n    <loc>{SITE}{path}</loc>\n"
        f"    <changefreq>{freq}</changefreq>\n"
        f"    <priority>{pri}</priority>\n  </url>\n"
        for path, pri, freq in static)
    rows += "".join(
        f"  <url>\n    <loc>{SITE}/gallery/{p['slug']}</loc>\n"
        f"    <changefreq>monthly</changefreq>\n"
        f"    <priority>0.8</priority>\n"
        f"    <image:image>\n"
        f"      <image:loc>{SITE}/assets/gallery/{p['slug']}-1400.webp</image:loc>\n"
        f"      <image:title>{plain(p['title'])} — {plain(p['ref'])}</image:title>\n"
        f"    </image:image>\n  </url>\n"
        for p in PIECES)
    write(os.path.join(ROOT, "sitemap.xml"),
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
          '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
          f"{rows}</urlset>\n")


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(f"  wrote {os.path.relpath(path, ROOT):44s} {len(text)/1024:6.1f} KB")


def main():
    build_index()
    for p in PIECES:
        build_piece(p)
    build_sitemap()
    print(f"\n  {len(PIECES)} piece pages + gallery.html + sitemap.xml")
    sync_chrome.main()
    missing = [p["slug"] for p in PIECES if SIZES[p["slug"]]["pending"]]
    if missing:
        print(f"  artwork pending: {', '.join(missing)}")
    # A live listing is /listing/<digits>/<handle>. Validating the shape catches
    # both unreplaced placeholders and malformed URLs.
    unset = [p["slug"] for p in PIECES
             if not re.search(r"^https://www\.etsy\.com/listing/\d+/", p["etsy"])]
    if unset:
        print(f"  etsy URL not a live listing on {len(unset)} piece(s): "
              f"{', '.join(unset)}")


if __name__ == "__main__":
    main()
