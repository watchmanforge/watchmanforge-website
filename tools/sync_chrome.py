#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_chrome.py — stamp the shared nav/footer into every page and cache-bust assets.

  python3 tools/sync_chrome.py              # rewrite every page in place
  python3 tools/sync_chrome.py index.html   # just the pages named
  python3 tools/sync_chrome.py --check      # exit 1 if any page is out of date

For every *.html in the site (tools/ and assets/ excluded):
  1. replaces the <!-- chrome:nav --> and <!-- chrome:footer --> blocks with
     the copies in tools/chrome.py;
  2. rewrites every /css/*.css and /js/*.js reference to ?v=<content hash>,
     so a changed file always gets a new URL and an unchanged one never does
     (both directories are served with a one-year immutable cache);
  3. fills the waitlist form action from tools/chrome.py.

Run it after editing chrome.py, any CSS/JS file, or after build_gallery.py.
Authoring tool only: nothing here runs on deploy.
"""
import hashlib
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import NAV, FOOTER, WAITLIST_ACTION, BUTTONDOWN_USERNAME, block  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", ".vercel", ".claude", "tools", "assets", "node_modules"}

ASSET_REF = re.compile(r'((?:href|src)="/((?:css|js)/[^"?#]+\.(?:css|js)))(?:\?v=[^"]*)?"')
WAITLIST_FORM = re.compile(r'(<form\b[^>]*\bdata-waitlist\b[^>]*\baction=")[^"]*(")')


def pages():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for fn in sorted(filenames):
            if fn.endswith(".html"):
                yield os.path.join(dirpath, fn)


_hashes = {}


def asset_hash(rel):
    if rel not in _hashes:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            raise SystemExit(f"  missing asset referenced by a page: /{rel}")
        with open(path, "rb") as f:
            _hashes[rel] = hashlib.sha1(f.read()).hexdigest()[:10]
    return _hashes[rel]


def replace_block(html, name, inner, path):
    pat = re.compile(r"<!-- chrome:%s -->.*?<!-- /chrome:%s -->" % (name, name), re.S)
    if not pat.search(html):
        raise SystemExit(f"  {os.path.relpath(path, ROOT)}: no <!-- chrome:{name} --> block")
    return pat.sub(lambda _m: block(name, inner), html, count=1)


def sync(html, path):
    html = replace_block(html, "nav", NAV, path)
    html = replace_block(html, "footer", FOOTER, path)
    html = ASSET_REF.sub(lambda m: f'{m.group(1)}?v={asset_hash(m.group(2))}"', html)
    html = WAITLIST_FORM.sub(lambda m: m.group(1) + WAITLIST_ACTION + m.group(2), html)
    return html


def main():
    check = "--check" in sys.argv
    named = [os.path.abspath(a) for a in sys.argv[1:] if not a.startswith("--")]
    stale = []
    for path in (named or pages()):
        with open(path, encoding="utf-8") as f:
            old = f.read()
        new = sync(old, path)
        if new != old:
            stale.append(os.path.relpath(path, ROOT))
            if not check:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)
    verb = "out of date" if check else "updated"
    print(f"  {len(stale)} page(s) {verb}" + (": " + ", ".join(stale) if stale else ""))
    unwired = [os.path.relpath(p, ROOT) for p in pages() if WAITLIST_FORM.search(open(p, encoding="utf-8").read())]
    if unwired and BUTTONDOWN_USERNAME == "BUTTONDOWN_USERNAME":
        print("  WARNING: waitlist forms still point at the BUTTONDOWN_USERNAME placeholder "
              "(set it in tools/chrome.py). Do not ship like this: " + ", ".join(unwired))
    if check and stale:
        sys.exit(1)


if __name__ == "__main__":
    main()
