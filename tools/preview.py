#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preview.py — serve the site locally the way Vercel serves it.

  python3 tools/preview.py            # http://localhost:8000
  python3 tools/preview.py 8080

Plain `python3 -m http.server` gets three things wrong for this site, so this
reads vercel.json and applies them:
  - cleanUrls: /about serves about.html, and /about.html redirects to /about;
  - redirects: e.g. /products/* -> /;
  - headers: so the Content-Security-Policy is exercised before it ships.
Unknown paths get 404.html with a 404 status, as on Vercel.
"""
import http.server
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = json.load(open(os.path.join(ROOT, "vercel.json")))


def pattern(source):
    """vercel.json path pattern -> compiled regex (supports :param and :param*)."""
    rx = re.sub(r":(\w+)\*", r"(?P<\1>.*)", source)
    rx = re.sub(r":(\w+)", r"(?P<\1>[^/]+)", rx)
    rx = rx.replace("(.*)", "(?:.*)")
    return re.compile("^" + rx + "$")


REDIRECTS = [(pattern(r["source"]), r["destination"], 308 if r.get("permanent") else 307)
             for r in CONFIG.get("redirects", [])]
HEADERS = [(pattern(h["source"]), h["headers"]) for h in CONFIG.get("headers", [])]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        for rx, headers in HEADERS:
            if rx.match(path):
                for h in headers:
                    self.send_header(h["key"], h["value"])
        super().end_headers()

    def redirect(self, location, code):
        self.send_response(code)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path, _, query = self.path.partition("?")
        for rx, dest, code in REDIRECTS:
            if rx.match(path):
                return self.redirect(dest, code)
        if path.endswith(".html"):
            clean = path[:-5]
            clean = "/" if clean.endswith("/index") else clean
            return self.redirect(clean + ("?" + query if query else ""), 308)
        if len(path) > 1 and path.endswith("/"):
            return self.redirect(path.rstrip("/"), 308)
        fs = os.path.join(ROOT, path.lstrip("/"))
        if path != "/" and not os.path.isfile(fs) and os.path.isfile(fs + ".html"):
            self.path = path + ".html" + ("?" + query if query else "")
        elif path != "/" and not os.path.exists(fs):
            return self.not_found()
        return super().do_GET()

    def not_found(self):
        body = open(os.path.join(ROOT, "404.html"), "rb").read()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = next((int(a) for a in sys.argv[1:] if a.isdigit()), 8000)
    print(f"  Watchman Forge preview on http://localhost:{port}  (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
