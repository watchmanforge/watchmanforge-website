/* ============================================================
   R33 SKYLINE GTR — Scroll-Reactive Burnout Animation
   Watchman Forge · EZK 33:6
   Canvas: bg + road + smoke particles (behind PNG car)
   gtr-transparent.png: the car, positioned/animated as DOM element
   ============================================================ */

(function () {
  'use strict';

  const C_BLUE   = '#00d4ff';
  const C_PURPLE = '#9000ff';
  const C_VOID   = '#010104';

  const S = { IDLE: 0, BUILDING: 1, BURNOUT: 2, LAUNCHING: 3, GONE: 4 };

  const section = document.getElementById('gtr-section');
  const sticky  = document.getElementById('gtr-sticky');
  const canvas  = document.getElementById('gtr-canvas');
  const gtrPng  = document.getElementById('gtr-png');
  const verseEl = document.getElementById('gtr-verse');
  const hintEl  = document.getElementById('gtr-hint');
  if (!section || !canvas) return;

  const ctx = canvas.getContext('2d');
  const isMobile = window.innerWidth < 768;

  // Rear wheel offset from car center (for smoke emission alignment)
  // Negative = left of center (rear wheel of a right-facing R33)
  const REAR_WHEEL_OFFSET = -185;
  const CAR_SCALE = isMobile ? 0.58 : 1.0;

  let W, H, groundY;
  let carX = 0;
  let tireAngle = 0;
  let burnoutTime = 0;
  let launchProgress = 0;
  let launchStartX = 0;
  let verseShown = false;
  let hintHidden = false;
  let shakeX = 0, shakeY = 0;
  let state = S.IDLE;

  const marks = [];
  let markOpacity = 1;
  const particles = [];

  let lastScrollY  = window.scrollY;
  let lastScrollT  = performance.now();
  let rawVelocity  = 0;
  let smoothVelocity = 0;

  // ── Resize ─────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = sticky.clientWidth;
    H = canvas.height = sticky.clientHeight;
    groundY  = H * 0.70;
    carX     = W * (isMobile ? 0.38 : 0.36);
    launchStartX = carX;
    positionGtrPng(0, 0);
  }

  // ── GTR PNG positioning ────────────────────────────────────
  function positionGtrPng(deltaX, deltaY) {
    if (!gtrPng) return;
    const imgW = gtrPng.offsetWidth || W * 0.55;
    const left = carX - imgW / 2;
    gtrPng.style.left = left + 'px';
    if (deltaX !== 0 || deltaY !== 0) {
      gtrPng.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px)`;
    }
  }

  function updateGtrPng(dt) {
    if (!gtrPng) return;
    if (state === S.LAUNCHING || state === S.GONE) {
      const delta = carX - launchStartX;
      // Subtle motion blur via CSS filter on launch
      const blur = state === S.LAUNCHING ? Math.min(launchProgress * 6, 5) : 0;
      const blurFilter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : '';
      gtrPng.style.transform = `translateX(${delta}px)`;
      gtrPng.style.filter = blurFilter
        ? `${blurFilter} drop-shadow(0 20px 55px rgba(0,212,255,0.35)) drop-shadow(0 10px 22px rgba(0,0,0,0.9))`
        : 'drop-shadow(0 20px 55px rgba(0,212,255,0.24)) drop-shadow(0 10px 22px rgba(0,0,0,0.9))';
    } else if (state === S.BURNOUT) {
      gtrPng.style.transform = `translateX(${shakeX * 0.6}px) translateY(${shakeY * 0.5}px)`;
    } else {
      const wobble = Math.sin(performance.now() * 0.0009) * 0.5;
      gtrPng.style.transform = `translateX(${wobble}px)`;
      gtrPng.style.filter = 'drop-shadow(0 20px 55px rgba(0,212,255,0.24)) drop-shadow(0 10px 22px rgba(0,0,0,0.9))';
    }
  }

  // ── Scroll depth 0→1 ───────────────────────────────────────
  function scrollDepth() {
    const top      = section.getBoundingClientRect().top;
    const scrollable = section.offsetHeight - H;
    return Math.max(0, Math.min(1, -top / scrollable));
  }

  // ── Scroll velocity ────────────────────────────────────────
  function trackVelocity() {
    const now = performance.now();
    const dt  = Math.max(now - lastScrollT, 1);
    rawVelocity    = (window.scrollY - lastScrollY) / dt * 16;
    smoothVelocity += (rawVelocity - smoothVelocity) * 0.12;
    lastScrollY    = window.scrollY;
    lastScrollT    = now;
  }

  // ── Smoke particle ─────────────────────────────────────────
  class Particle {
    constructor(x, y, intensity) {
      const patchW = 34 + intensity * 20;
      this.x = x + (Math.random() - 0.38) * patchW;
      this.y = y - Math.random() * 10;

      const speed = (0.4 + Math.random() * 1.6) * Math.max(intensity, 0.25);
      const upBias = -Math.PI / 2;
      const spread = (Math.random() - 0.5) * 3.0;
      const angle  = upBias + spread;
      const wind   = -(0.80 + Math.random() * 2.0) * Math.max(intensity * 0.85, 0.50);
      this.vx = Math.cos(angle) * speed + wind;
      this.vy = Math.sin(angle) * speed * 0.76;

      this.isBase = Math.random() < 0.28;
      if (this.isBase) {
        this.r    = 30 + Math.random() * 40 * Math.max(intensity, 0.5);
        this.maxR = this.r * (3.4 + Math.random() * 2.4);
        this.decay = 0.0014 + Math.random() * 0.0020 / Math.max(intensity, 0.2);
        this.grow  = 0.20 + Math.random() * 0.14;
      } else {
        this.r    = 7 + Math.random() * 24 * intensity;
        this.maxR = this.r * (5.0 + Math.random() * 5.5);
        this.decay = 0.0030 + Math.random() * 0.0065 / Math.max(intensity, 0.2);
        this.grow  = 0.48 + Math.random() * 0.40;
      }

      this.life = 1;
      const rng = Math.random();
      this.type = rng < 0.10 ? 'blue' : rng < 0.20 ? 'purple' : 'dark';
    }

    update(dt) {
      this.x  += this.vx * dt;
      this.y  += this.vy * dt;
      this.vy *= 0.983;
      this.vx *= 0.969;
      this.r   = Math.min(this.r + this.grow * dt, this.maxR);
      this.life -= this.decay * dt;
      return this.life > 0;
    }

    draw(ctx) {
      const a = this.life;
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      if (this.type === 'blue') {
        g.addColorStop(0,    `rgba(0,170,255,${a * 0.54})`);
        g.addColorStop(0.45, `rgba(0,55,115,${a * 0.25})`);
        g.addColorStop(1,    'rgba(0,8,25,0)');
      } else if (this.type === 'purple') {
        g.addColorStop(0,    `rgba(115,0,230,${a * 0.46})`);
        g.addColorStop(0.45, `rgba(45,0,85,${a * 0.22})`);
        g.addColorStop(1,    'rgba(4,0,12,0)');
      } else {
        const baseA = this.isBase ? a * 0.75 : a * 0.82;
        g.addColorStop(0,    `rgba(14,16,22,${baseA})`);
        g.addColorStop(0.45, `rgba(6,7,12,${baseA * 0.58})`);
        g.addColorStop(1,    'rgba(1,1,3,0)');
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  function emitSmoke(x, y, count, intensity) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, intensity));
    while (particles.length > 1600) particles.shift();
  }

  // ── Gothic arch silhouette ─────────────────────────────────
  function drawGothicArch(x, baseY, archW, archH, fogAlpha) {
    ctx.save();
    ctx.globalAlpha = fogAlpha;
    ctx.fillStyle = '#010104';
    const halfW = archW * 0.38;
    const pX    = x;
    const topY  = baseY - archH;
    const apexY = topY - archH * 0.28;

    ctx.fillRect(x - archW * 0.5, topY, archW * 0.12, archH);
    ctx.fillRect(x + archW * 0.38, topY, archW * 0.12, archH);

    ctx.beginPath();
    ctx.moveTo(pX - archW * 0.5, baseY);
    ctx.lineTo(pX - archW * 0.5, topY);
    ctx.bezierCurveTo(pX - archW * 0.5, topY - archH * 0.5, pX - halfW * 0.5, apexY, pX, apexY);
    ctx.bezierCurveTo(pX + halfW * 0.5, apexY, pX + archW * 0.38, topY - archH * 0.5, pX + archW * 0.38, topY);
    ctx.lineTo(pX + archW * 0.38, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(0,212,255,${fogAlpha * 0.12})`;
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.moveTo(pX - archW * 0.5, topY);
    ctx.bezierCurveTo(pX - archW * 0.5, topY - archH * 0.5, pX - halfW * 0.5, apexY, pX, apexY);
    ctx.bezierCurveTo(pX + halfW * 0.5, apexY, pX + archW * 0.38, topY - archH * 0.5, pX + archW * 0.38, topY);
    ctx.stroke();
    ctx.restore();
  }

  // ── Dark atmospheric city background ───────────────────────
  function drawAtmosphericBg() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0,    '#010104');
    skyGrad.addColorStop(0.55, '#02020a');
    skyGrad.addColorStop(0.82, '#040414');
    skyGrad.addColorStop(1,    '#06061e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, groundY + 2);

    ctx.fillStyle = '#010108';
    const _bldgs = [
      [0.03, 0.07, 0.22], [0.11, 0.05, 0.16], [0.17, 0.09, 0.34], [0.28, 0.04, 0.18],
      [0.33, 0.11, 0.38], [0.45, 0.06, 0.24], [0.52, 0.08, 0.30], [0.61, 0.05, 0.20],
      [0.67, 0.10, 0.36], [0.78, 0.07, 0.26], [0.86, 0.05, 0.18], [0.92, 0.08, 0.28],
    ];
    for (const [bx, bw, bh] of _bldgs) {
      ctx.fillRect(bx * W, groundY - bh * groundY, bw * W, bh * groundY + 2);
    }

    ctx.save();
    const fogL = ctx.createLinearGradient(0, groundY * 0.4, 0, groundY);
    fogL.addColorStop(0,   'rgba(2,4,14,0)');
    fogL.addColorStop(0.6, 'rgba(2,4,18,0.45)');
    fogL.addColorStop(1,   'rgba(2,4,18,0.7)');
    ctx.fillStyle = fogL;
    ctx.fillRect(0, groundY * 0.4, W, groundY * 0.6);
    ctx.restore();

    drawGothicArch(W * 0.82, groundY, W * 0.12, groundY * 0.52, 0.78);
    drawGothicArch(W * 0.74, groundY, W * 0.09, groundY * 0.42, 0.62);
    drawGothicArch(W * 0.90, groundY, W * 0.10, groundY * 0.45, 0.66);
    drawGothicArch(W * 0.08, groundY, W * 0.10, groundY * 0.48, 0.58);
    drawGothicArch(W * 0.18, groundY, W * 0.09, groundY * 0.38, 0.50);

    ctx.save();
    for (const [bx, bw, bh] of _bldgs) {
      const cols = Math.floor(bw * 18);
      const rows = Math.floor(bh * 8);
      for (let _r = 0; _r < rows; _r++) {
        for (let _c = 0; _c < cols; _c++) {
          const lit = Math.sin(bx * 999 + _r * 17 + _c * 31) > 0.45;
          if (!lit) continue;
          const isPurp = Math.sin(bx * 543 + _r * 11 + _c * 23) > 0.62;
          ctx.fillStyle = isPurp ? 'rgba(144,0,255,0.07)' : 'rgba(0,212,255,0.07)';
          ctx.fillRect(
            bx * W + _c * (bw * W / cols) + 1,
            groundY - bh * groundY + _r * (bh * groundY / rows) + 3,
            2, 2
          );
        }
      }
    }
    ctx.restore();

    const horizGlow = ctx.createLinearGradient(0, groundY * 0.58, 0, groundY);
    horizGlow.addColorStop(0,    'rgba(0,0,0,0)');
    horizGlow.addColorStop(0.55, 'rgba(0,25,72,0.14)');
    horizGlow.addColorStop(1,    'rgba(0,212,255,0.22)');
    ctx.fillStyle = horizGlow;
    ctx.fillRect(0, groundY * 0.58, W, groundY * 0.42);

    const purpGlow = ctx.createRadialGradient(W * 0.62, groundY * 0.28, 0, W * 0.62, groundY * 0.28, W * 0.55);
    purpGlow.addColorStop(0,   'rgba(144,0,255,0.08)');
    purpGlow.addColorStop(0.5, 'rgba(80,0,140,0.04)');
    purpGlow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = purpGlow;
    ctx.fillRect(0, 0, W, groundY);

    ctx.save();
    const fogG = ctx.createLinearGradient(0, groundY - 60, 0, groundY + 40);
    fogG.addColorStop(0,   'rgba(0,4,16,0)');
    fogG.addColorStop(0.5, 'rgba(0,6,24,0.22)');
    fogG.addColorStop(1,   'rgba(0,8,30,0.45)');
    ctx.fillStyle = fogG;
    ctx.fillRect(0, groundY - 60, W, 100);
    ctx.restore();

    // Rain streaks
    ctx.save();
    ctx.lineWidth = 0.7;
    const _rT = Date.now() * 0.0008;
    for (let _ri = 0; _ri < 52; _ri++) {
      const _alpha = 0.05 + Math.abs(Math.sin(_ri * 7.3)) * 0.04;
      ctx.strokeStyle = `rgba(0,110,200,${_alpha})`;
      const _rx = ((Math.sin(_ri * 13.7) + 1) * 0.5 * W + _rT * 80 * (0.6 + _ri * 0.008)) % W;
      const _ry = ((Math.cos(_ri * 9.1) + 1) * 0.5 * groundY + _rT * 160 * (0.8 + _ri * 0.004)) % groundY;
      ctx.beginPath();
      ctx.moveTo(_rx, _ry);
      ctx.lineTo(_rx - 2, Math.min(_ry + 18, groundY - 2));
      ctx.stroke();
    }
    ctx.restore();

    const _vigCX = W * 0.42;
    const vig = ctx.createRadialGradient(_vigCX, groundY * 0.55, 0, _vigCX, groundY * 0.55, W * 0.72);
    vig.addColorStop(0,    'rgba(0,0,0,0)');
    vig.addColorStop(0.52, 'rgba(0,0,8,0.32)');
    vig.addColorStop(1,    'rgba(0,0,12,0.82)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, groundY);
  }

  // ── Road: dark asphalt + perspective neon grid ─────────────
  function drawRoad() {
    const asp = ctx.createLinearGradient(0, groundY, 0, H);
    asp.addColorStop(0,   '#080812');
    asp.addColorStop(0.4, '#050510');
    asp.addColorStop(1,   '#020208');
    ctx.fillStyle = asp;
    ctx.fillRect(0, groundY, W, H - groundY);

    ctx.save();
    ctx.shadowBlur  = 32;
    ctx.shadowColor = C_BLUE;
    ctx.strokeStyle = 'rgba(0,212,255,0.90)';
    ctx.lineWidth   = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
    ctx.restore();

    const vpX = W * 0.42;
    ctx.save();
    for (let i = 1; i <= 12; i++) {
      const frac  = i / 12;
      const y     = groundY + frac * (H - groundY);
      const alpha = (1 - frac * 0.65) * 0.52;
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth   = frac < 0.22 ? 1.6 : 0.9;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const numV = 24;
    for (let i = 0; i <= numV; i++) {
      const frac   = i / numV;
      const xBot   = frac * W;
      const xTop   = vpX + (xBot - vpX) * 0.04;
      const isMaj  = (i % 4 === 0);
      ctx.strokeStyle = isMaj ? 'rgba(0,212,255,0.32)' : 'rgba(100,0,255,0.12)';
      ctx.lineWidth = isMaj ? 1.1 : 0.45;
      if (isMaj) { ctx.shadowBlur = 7; ctx.shadowColor = C_BLUE; }
      else        { ctx.shadowBlur = 0; }
      ctx.beginPath();
      ctx.moveTo(xTop, groundY);
      ctx.lineTo(xBot, H);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Cyan neon wet-asphalt reflection under the car
    const refl = ctx.createLinearGradient(0, groundY, 0, groundY + 220);
    refl.addColorStop(0,    'rgba(0,212,255,0.22)');
    refl.addColorStop(0.30, 'rgba(0,150,255,0.14)');
    refl.addColorStop(0.65, 'rgba(144,0,255,0.06)');
    refl.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(0, groundY, W, 220);

    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let _si = 0; _si < 3; _si++) {
      const _sx = W * (0.22 + _si * 0.26);
      const _sw = W * (0.06 + _si * 0.025);
      const _sg = ctx.createLinearGradient(_sx - _sw, groundY + 8, _sx + _sw, groundY + 8);
      _sg.addColorStop(0,   'rgba(0,212,255,0)');
      _sg.addColorStop(0.5, 'rgba(0,212,255,0.85)');
      _sg.addColorStop(1,   'rgba(0,212,255,0)');
      ctx.fillStyle = _sg;
      ctx.fillRect(_sx - _sw, groundY + 4, _sw * 2, 7);
    }
    ctx.restore();
  }

  // ── Tire marks ─────────────────────────────────────────────
  function drawMarks() {
    if (marks.length < 3) return;
    ctx.save();
    const alpha = markOpacity * 0.65;
    for (const off of [-13, 13]) {
      ctx.beginPath();
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (i === 0) ctx.moveTo(m, groundY + off);
        else         ctx.lineTo(m, groundY + off);
      }
      ctx.strokeStyle = `rgba(12,28,48,${alpha})`;
      ctx.lineWidth = 18;
      ctx.lineCap  = 'round';
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (i === 0) ctx.moveTo(m, groundY + off);
        else         ctx.lineTo(m, groundY + off);
      }
      ctx.shadowBlur  = 14;
      ctx.shadowColor = C_BLUE;
      ctx.strokeStyle = `rgba(0,212,255,${alpha * 0.28})`;
      ctx.lineWidth   = 20;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Burnout cloud overlay ───────────────────────────────────
  function drawBurnoutCloud() {
    if (state !== S.BURNOUT) return;
    const alpha = Math.min(burnoutTime / 1.5, 1) * 0.22;
    const cloud = ctx.createRadialGradient(
      carX * CAR_SCALE, groundY - 70, 0,
      carX * CAR_SCALE, groundY - 90, W * 0.55
    );
    cloud.addColorStop(0,    `rgba(10,20,40,${alpha})`);
    cloud.addColorStop(0.4,  `rgba(0,80,155,${alpha * 0.5})`);
    cloud.addColorStop(0.75, `rgba(40,0,85,${alpha * 0.3})`);
    cloud.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Main animation loop ─────────────────────────────────────
  let lastT = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastT) / 16.67, 3);
    lastT = now;

    trackVelocity();

    const depth     = scrollDepth();
    const vel       = Math.abs(smoothVelocity);
    const isUp      = smoothVelocity < -0.5;
    const intensity = Math.min(vel / 9, 1);

    if (!hintHidden && vel > 0.2) {
      hintHidden = true;
      if (hintEl) hintEl.classList.add('hidden');
    }

    if (state !== S.LAUNCHING && state !== S.GONE) {
      if (depth >= 0.62) {
        state          = S.LAUNCHING;
        launchProgress = 0;
        launchStartX   = carX;
      } else if (depth >= 0.38 && !isMobile) {
        state       = S.BURNOUT;
        burnoutTime += dt * 0.016;
      } else if (vel > 0.5) {
        state       = S.BUILDING;
        burnoutTime = Math.max(0, burnoutTime - dt * 0.03);
      } else {
        state       = S.IDLE;
        burnoutTime = Math.max(0, burnoutTime - dt * 0.02);
      }
    }

    if (state === S.LAUNCHING) {
      launchProgress = Math.min(launchProgress + dt * 0.014, 1);
      const ease = launchProgress * launchProgress * (3 - 2 * launchProgress);
      carX = launchStartX + ease * ease * W * 1.6;
      if (launchProgress >= 1) {
        state = S.GONE;
        if (!verseShown && verseEl) { verseEl.classList.add('visible'); verseShown = true; }
        if (hintEl) hintEl.style.display = 'none';
      }
    } else if (state !== S.GONE) {
      carX += Math.sin(now * 0.0009) * 0.06;
    }

    if (state === S.BURNOUT) {
      shakeX = (Math.random() - 0.5) * 7;
      shakeY = (Math.random() - 0.5) * 5;
    } else if (state === S.BUILDING && intensity > 0.3) {
      shakeX = (Math.random() - 0.5) * intensity * 5;
      shakeY = (Math.random() - 0.5) * intensity * 3.5;
    } else {
      shakeX = Math.sin(now * 0.0018) * 0.6;
      shakeY = Math.sin(now * 0.0025) * 0.9;
    }

    // Tire marks from rear wheel
    if ((state === S.BURNOUT || (state === S.BUILDING && intensity > 0.55)) && !isMobile) {
      marks.push(carX + CAR_SCALE * (REAR_WHEEL_OFFSET - 40));
      if (marks.length > 220) marks.shift();
    }
    if (state === S.GONE) markOpacity = Math.max(0, markOpacity - 0.0008 * dt);

    // Smoke from rear wheel ground contact
    const rwX       = carX + CAR_SCALE * REAR_WHEEL_OFFSET;
    const rwContact = groundY;
    if (state === S.IDLE && !isMobile && Math.random() < 0.04) {
      emitSmoke(rwX, rwContact - 6, 1, 0.15);
    } else if (state === S.BUILDING) {
      emitSmoke(rwX, rwContact - 4, Math.max(2, Math.floor(intensity * 8)), intensity);
    } else if (state === S.BURNOUT) {
      emitSmoke(rwX - 26, rwContact,      8, 3.0);
      emitSmoke(rwX - 10, rwContact - 2,  8, 2.6);
      emitSmoke(rwX +  6, rwContact,      7, 2.3);
      emitSmoke(rwX + 20, rwContact - 4,  5, 2.0);
      if (Math.random() < 0.70) emitSmoke(rwX - 42, rwContact - 20, 4, 1.8);
      if (Math.random() < 0.40) emitSmoke(rwX - 55, rwContact - 40, 2, 1.5);
    } else if (state === S.LAUNCHING) {
      emitSmoke(rwX - 8, rwContact - 2, 8, 1.4);
    }

    // Render — canvas draws everything below the PNG
    drawAtmosphericBg();
    drawRoad();

    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].update(dt)) particles.splice(i, 1);
      else particles[i].draw(ctx);
    }

    drawMarks();
    drawBurnoutCloud();

    // Launch light trail (canvas, behind PNG)
    if (state === S.LAUNCHING && launchProgress > 0.1) {
      const trailX = carX - W * 0.05;
      const trail  = ctx.createLinearGradient(0, groundY - 42, trailX, groundY - 42);
      trail.addColorStop(0,   'rgba(0,212,255,0)');
      trail.addColorStop(0.7, `rgba(0,212,255,${launchProgress * 0.26})`);
      trail.addColorStop(1,   `rgba(144,0,255,${launchProgress * 0.38})`);
      ctx.fillStyle = trail;
      ctx.fillRect(0, groundY - 58, trailX, 32);
    }

    // Update PNG car position (above canvas smoke/effects)
    updateGtrPng(dt);
  }

  // ── Boot ────────────────────────────────────────────────────
  function init() {
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
