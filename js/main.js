/* ============================================================
   WATCHMAN FORGE — Main JavaScript
   Nav · mobile menu · scroll reveal · waitlist forms
   ============================================================ */

(function () {
  'use strict';

  /* ── Navigation ─────────────────────────────────────────── */
  const nav       = document.getElementById('nav');
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (hamburger && mobileNav) {
    const setOpen = (open) => {
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      mobileNav.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        const first = mobileNav.querySelector('a');
        if (first) first.focus();
      }
    };
    hamburger.addEventListener('click', () => setOpen(hamburger.getAttribute('aria-expanded') !== 'true'));
    mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileNav.hidden) { setOpen(false); hamburger.focus(); }
    });
    const wide = window.matchMedia('(min-width: 1001px)');
    if (wide.addEventListener) wide.addEventListener('change', (mq) => { if (mq.matches) setOpen(false); });
  }

  /* Active nav link (page links only; the in-page #anchors stay neutral) */
  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href.indexOf('#') !== -1) return;
    if (path === href || path.startsWith(href + '/')) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ── Scroll Reveal ──────────────────────────────────────── */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(el => observer.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('visible'));
    }
  }

  /* ── Waitlist forms ─────────────────────────────────────────
     Plain HTML forms that POST to Buttondown (our email list host).
     With JS we send the same POST in the background and swap in a
     "check your inbox" message; without JS the browser posts the
     form and lands on Buttondown's own confirmation page. Either
     way, nothing but the email address leaves this page. */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  document.querySelectorAll('form[data-waitlist]').forEach(form => {
    const input  = form.querySelector('input[type="email"]');
    const status = form.querySelector('.wl-status');
    const button = form.querySelector('button[type="submit"]');
    const done   = form.parentNode.querySelector('.wl-done');
    if (!input || !button || !window.fetch) return;

    const say = (msg) => { if (status) status.textContent = msg; };
    input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); say(''); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!EMAIL.test(email)) {
        input.setAttribute('aria-invalid', 'true');
        say('That email doesn’t look right. Check it and try again.');
        input.focus();
        return;
      }
      const label = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Sending…';

      fetch(form.action, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(form)) })
        .then(() => {
          form.hidden = true;
          if (done) {
            done.hidden = false;
            done.setAttribute('tabindex', '-1');
            done.focus();
          }
        })
        .catch(() => {
          button.disabled = false;
          button.innerHTML = label;
          say('Couldn’t reach the list just now. Try again, or email watchmanforge@gmail.com.');
        });
    });
  });

})();
