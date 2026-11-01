# -*- coding: utf-8 -*-
"""
chrome.py — the one copy of the site nav, mobile menu and footer.

Every page carries these blocks between marker comments:

    <!-- chrome:nav -->     ... <!-- /chrome:nav -->
    <!-- chrome:footer -->  ... <!-- /chrome:footer -->

Edit them HERE, then run:

    python3 tools/build_gallery.py   # gallery pages pick them up directly
    python3 tools/sync_chrome.py     # stamps them into every other page + bumps ?v=

Nothing here ships — tools/ is in .vercelignore. The stamped HTML is what ships.
"""

# Waitlist form endpoint. Buttondown's embed-subscribe URL for the account.
# Until the account exists this stays a placeholder; sync_chrome.py warns while it does.
BUTTONDOWN_USERNAME = "BUTTONDOWN_USERNAME"
WAITLIST_ACTION = f"https://buttondown.com/api/emails/embed-subscribe/{BUTTONDOWN_USERNAME}"

NAV = """<a class="skip-link" href="#main">Skip to content</a>
<nav id="nav" aria-label="Main">
  <div class="nav-inner">
    <a href="/" class="nav-logo" aria-label="Watchman Forge home">
      <img src="/assets/images/wordmark-96.webp" alt="Watchman Forge" class="nav-wordmark" width="330" height="96">
    </a>
    <ul class="nav-links">
      <li><a href="/#how">How it works</a></li>
      <li><a href="/#order">The Order</a></li>
      <li><a href="/#privacy">Privacy</a></li>
      <li><a href="/about">Why Watchman</a></li>
      <li><a href="/gallery">Gallery</a></li>
    </ul>
    <div class="nav-right">
      <a href="/#join" class="btn btn-primary btn-sm nav-cta">Join<span class="nav-cta-more"> the waitlist</span></a>
      <button class="hamburger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>
<div class="mobile-nav" id="mobile-nav" hidden>
  <a href="/#how">How it works</a>
  <a href="/#order">The Order</a>
  <a href="/#privacy">Privacy</a>
  <a href="/about">Why Watchman</a>
  <a href="/gallery">The Gallery</a>
  <a href="/contact">Contact</a>
  <a href="/#join" class="btn btn-primary mobile-nav-cta">Join the waitlist</a>
</div>"""

FOOTER = """<footer id="footer">
  <div class="footer-main">
    <div class="footer-brand">
      <a href="/" class="footer-logo" aria-label="Watchman Forge home">
        <img src="/assets/images/wordmark-96.webp" alt="Watchman Forge" width="330" height="96" loading="lazy">
      </a>
      <p class="footer-motto">Keep watch. Forge yourself. Finish the work.</p>
      <p>A daily accountability app for people who keep starting things and want to finish them.</p>
      <a class="footer-email" href="mailto:watchmanforge@gmail.com">watchmanforge@gmail.com</a>
    </div>
    <div class="footer-col"><h2>The app</h2><ul>
      <li><a href="/#how">How it works</a></li>
      <li><a href="/#order">The Order</a></li>
      <li><a href="/#privacy">Privacy</a></li>
      <li><a href="/#join">Join the waitlist</a></li>
    </ul></div>
    <div class="footer-col"><h2>The Forge</h2><ul>
      <li><a href="/about">Why Watchman</a></li>
      <li><a href="/gallery">The Gallery</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul></div>
    <div class="footer-col"><h2>Legal</h2><ul>
      <li><a href="/privacy-policy">Privacy policy</a></li>
      <li><a href="/terms-of-service">Terms of service</a></li>
    </ul></div>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2026 Watchman Forge &middot; Forged in Faith. Built for the Future.</p>
    <img src="/assets/images/cross-transparent.webp" alt="" class="footer-cross" width="128" height="128" loading="lazy" data-vref="PS 127:1">
  </div>
</footer>"""


def block(name, inner):
    """Wrap a chrome block in its marker comments."""
    return f"<!-- chrome:{name} -->\n{inner}\n<!-- /chrome:{name} -->"
