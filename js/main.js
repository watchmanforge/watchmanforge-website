/* ============================================================
   WATCHMAN OS — Main JavaScript
   ============================================================ */

(function () {
  'use strict';

  /* ── Navigation ─────────────────────────────────────────── */
  const nav       = document.getElementById('nav');
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');

  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    mobileNav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  /* Active nav link */
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (path === href || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });

  /* ── Forge Ember Canvas ──────────────────────────────────── */
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, embers = [], animId;
    const MAX_EMBERS = 110;

    class Ember {
      constructor() { this.spawn(); }

      spawn() {
        this.x  = W * (0.1 + Math.random() * 0.8);
        this.y  = H * (0.5 + Math.random() * 0.5);
        this.vx = (Math.random() - 0.5) * 1.4;
        this.vy = -(0.7 + Math.random() * 2.4);
        this.r  = 1.1 + Math.random() * 2.8;
        this.life = 1;
        this.decay = 0.0025 + Math.random() * 0.0055;
        this.wander = Math.random() * Math.PI * 2;
        this.ws = 0.022 + Math.random() * 0.032; // wander speed
        this.isSpark = Math.random() < 0.09;
        if (this.isSpark) {
          this.r   *= 1.6;
          this.vy  *= 1.9;
          this.vx  *= 1.8;
          this.decay *= 1.3;
        }
      }

      update(dt) {
        this.wander += this.ws * dt;
        this.vx += Math.sin(this.wander) * 0.015 * dt;
        this.vx *= 0.987;
        this.x  += this.vx * dt;
        this.y  += this.vy * dt;
        this.vy += 0.006 * dt; // slight upward deceleration
        this.life -= this.decay * dt;
      }

      draw(ctx) {
        const a    = Math.max(0, this.life);
        const heat = Math.min(a * 2, 1);
        const g    = Math.floor(heat * 168);
        const b    = heat > 0.75 ? Math.floor((heat - 0.75) * 4 * 220) : 0;
        const glow = this.r * (this.isSpark ? 14 : 8) * heat;

        ctx.save();
        ctx.shadowBlur  = glow;
        ctx.shadowColor = `rgba(255,${Math.floor(g * 0.5)},0,${a * 0.75})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(this.r * a, 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${g},${b},${Math.min(a * 1.7, 1)})`;
        ctx.fill();
        ctx.restore();
      }
    }

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function init() {
      resize();
      embers = [];
      for (let i = 0; i < 50; i++) {
        const e = new Ember();
        e.life = Math.random();
        e.y    = H * Math.random();
        embers.push(e);
      }
    }

    let lastT = 0;
    function draw(now) {
      animId = requestAnimationFrame(draw);
      const dt = Math.min((now - lastT) / 16.67, 3);
      lastT = now;

      ctx.clearRect(0, 0, W, H);

      if (embers.length < MAX_EMBERS) {
        const n = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < n; i++) embers.push(new Ember());
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.update(dt);
        if (e.life <= 0 || e.y < -30 || e.x < -40 || e.x > W + 40) {
          embers.splice(i, 1);
        } else {
          e.draw(ctx);
        }
      }
    }

    window.addEventListener('resize', () => {
      cancelAnimationFrame(animId);
      init();
      requestAnimationFrame(draw);
    });

    init();
    requestAnimationFrame(draw);
  }

  /* ── Scroll Reveal ──────────────────────────────────────── */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => observer.observe(el));
  }

  /* ── Contact Form ───────────────────────────────────────── */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn  = contactForm.querySelector('button[type="submit"]');
      const orig = btn.innerHTML;
      btn.innerHTML = 'SENDING...';
      btn.disabled = true;

      setTimeout(() => {
        const success = document.getElementById('form-success');
        if (success) {
          contactForm.style.display  = 'none';
          success.style.display      = 'block';
        } else {
          btn.innerHTML = 'MESSAGE SENT';
          btn.style.background = 'linear-gradient(135deg, #00ff88, #00d4ff)';
        }
      }, 1200);
    });
  }

  /* ── Smooth scroll for anchor links ────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
