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

  /* ── Scroll-reactive background grid ─────────────────── */
  window.addEventListener('scroll', () => {
    document.documentElement.style.setProperty(
      '--grid-offset', `${window.scrollY * 0.18}px`
    );
  }, { passive: true });

  /* ── Hero GTR Stage Canvas ───────────────────────────── */
  const heroGtrCanvas = document.getElementById('hero-gtr-canvas');
  if (heroGtrCanvas) {
    const gctx  = heroGtrCanvas.getContext('2d');
    let gW, gH, gGround;

    function resizeGtrStage() {
      gW = heroGtrCanvas.width  = heroGtrCanvas.offsetWidth;
      gH = heroGtrCanvas.height = heroGtrCanvas.offsetHeight;
      gGround = gH * 0.68;
    }

    function drawGtrStage(now) {
      requestAnimationFrame(drawGtrStage);
      if (!gW) return;

      // Sky
      const sky = gctx.createLinearGradient(0, 0, 0, gGround);
      sky.addColorStop(0,    '#010104');
      sky.addColorStop(0.55, '#02020a');
      sky.addColorStop(0.88, '#040416');
      sky.addColorStop(1,    '#060622');
      gctx.fillStyle = sky;
      gctx.fillRect(0, 0, gW, gGround + 2);

      // City silhouette
      const bldgs = [
        [0.04,0.09,0.36],[0.12,0.07,0.24],[0.19,0.11,0.44],
        [0.30,0.06,0.20],[0.38,0.09,0.38],[0.51,0.10,0.30],
        [0.62,0.07,0.22],[0.70,0.10,0.42],[0.83,0.08,0.28],
        [0.92,0.06,0.18]
      ];
      gctx.fillStyle = '#010108';
      for (const [bx,bw,bh] of bldgs) {
        gctx.fillRect(bx*gW, gGround - bh*gGround, bw*gW, bh*gGround + 2);
      }

      // Horizon glow
      const hg = gctx.createLinearGradient(0, gGround*0.52, 0, gGround);
      hg.addColorStop(0, 'rgba(0,0,0,0)');
      hg.addColorStop(0.6, 'rgba(0,20,60,0.12)');
      hg.addColorStop(1,   'rgba(0,212,255,0.18)');
      gctx.fillStyle = hg;
      gctx.fillRect(0, gGround*0.52, gW, gGround*0.48);

      // Purple atmospheric glow
      const pg = gctx.createRadialGradient(gW*0.62, gGround*0.28, 0, gW*0.62, gGround*0.28, gW*0.65);
      pg.addColorStop(0,   'rgba(144,0,255,0.07)');
      pg.addColorStop(0.6, 'rgba(80,0,140,0.03)');
      pg.addColorStop(1,   'rgba(0,0,0,0)');
      gctx.fillStyle = pg;
      gctx.fillRect(0, 0, gW, gGround);

      // Ground asphalt
      const asp = gctx.createLinearGradient(0, gGround, 0, gH);
      asp.addColorStop(0,   '#080814');
      asp.addColorStop(0.5, '#050510');
      asp.addColorStop(1,   '#020208');
      gctx.fillStyle = asp;
      gctx.fillRect(0, gGround, gW, gH - gGround);

      // Ground horizon line
      gctx.save();
      gctx.shadowBlur  = 22;
      gctx.shadowColor = '#00d4ff';
      gctx.strokeStyle = 'rgba(0,212,255,0.88)';
      gctx.lineWidth   = 1.8;
      gctx.beginPath();
      gctx.moveTo(0, gGround);
      gctx.lineTo(gW, gGround);
      gctx.stroke();
      gctx.restore();

      // Grid perspective lines on ground
      const vpX = gW * 0.46;
      gctx.save();
      for (let i = 1; i <= 9; i++) {
        const frac = i / 9;
        const y    = gGround + frac * (gH - gGround);
        gctx.strokeStyle = `rgba(0,212,255,${(1 - frac*0.68) * 0.38})`;
        gctx.lineWidth   = frac < 0.25 ? 1.4 : 0.7;
        gctx.beginPath(); gctx.moveTo(0,y); gctx.lineTo(gW,y); gctx.stroke();
      }
      const nV = 12;
      for (let i = 0; i <= nV; i++) {
        const frac = i / nV;
        const xBot = frac * gW;
        const xTop = vpX + (xBot - vpX) * 0.06;
        const isMaj = (i % 3 === 0);
        gctx.strokeStyle = isMaj ? 'rgba(0,212,255,0.28)' : 'rgba(100,0,255,0.10)';
        gctx.lineWidth   = isMaj ? 0.9 : 0.38;
        gctx.beginPath();
        gctx.moveTo(xTop, gGround);
        gctx.lineTo(xBot, gH);
        gctx.stroke();
      }
      gctx.restore();

      // Neon wet-road reflection
      const refl = gctx.createLinearGradient(0, gGround, 0, gGround + 100);
      refl.addColorStop(0,   'rgba(0,212,255,0.22)');
      refl.addColorStop(0.45,'rgba(144,0,255,0.08)');
      refl.addColorStop(1,   'rgba(0,0,0,0)');
      gctx.fillStyle = refl;
      gctx.fillRect(0, gGround, gW, 100);

      // Rain streaks
      gctx.save();
      gctx.lineWidth = 0.55;
      const rT = now * 0.0006;
      for (let i = 0; i < 28; i++) {
        const alpha = 0.04 + Math.abs(Math.sin(i * 7.3)) * 0.04;
        gctx.strokeStyle = `rgba(0,130,220,${alpha})`;
        const rx = ((Math.sin(i*13.7)+1)*0.5*gW + rT*55*(0.6+i*0.01)) % gW;
        const ry = ((Math.cos(i*9.1)+1)*0.5*gGround + rT*120*(0.8+i*0.005)) % gGround;
        gctx.beginPath();
        gctx.moveTo(rx, ry);
        gctx.lineTo(rx-1.5, Math.min(ry+12, gGround-2));
        gctx.stroke();
      }
      gctx.restore();

      // Window lights on buildings
      gctx.save();
      for (const [bx,bw,bh] of bldgs) {
        const cols = Math.floor(bw * 14);
        const rows = Math.floor(bh * 7);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.sin(bx*999+r*17+c*31) < 0.4) continue;
            const isPurp = Math.sin(bx*543+r*11+c*23) > 0.62;
            gctx.fillStyle = isPurp ? 'rgba(144,0,255,0.07)' : 'rgba(0,212,255,0.07)';
            gctx.fillRect(
              bx*gW + c*(bw*gW/cols) + 1,
              gGround - bh*gGround + r*(bh*gGround/rows) + 2,
              2, 2
            );
          }
        }
      }
      gctx.restore();
    }

    window.addEventListener('resize', () => {
      resizeGtrStage();
    });
    resizeGtrStage();
    requestAnimationFrame(drawGtrStage);
  }

})();
