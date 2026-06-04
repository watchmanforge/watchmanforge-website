/* ============================================================
   R33 SKYLINE GTR — Scroll-Reactive Burnout Animation
   Watchman Forge · EZK 33:6
   Pure vanilla JS + HTML5 Canvas
   ============================================================ */

(function () {
  'use strict';

  // ── Colors ─────────────────────────────────────────────────
  const C_BLUE   = '#00d4ff';
  const C_PURPLE = '#9000ff';
  const C_RED    = '#ff2244';
  const C_VOID   = '#010104';

  // ── State machine ──────────────────────────────────────────
  const S = { IDLE: 0, BUILDING: 1, BURNOUT: 2, LAUNCHING: 3, GONE: 4 };

  // ── DOM refs ───────────────────────────────────────────────
  const section = document.getElementById('gtr-section');
  const sticky  = document.getElementById('gtr-sticky');
  const canvas  = document.getElementById('gtr-canvas');
  const verseEl = document.getElementById('gtr-verse');
  const hintEl  = document.getElementById('gtr-hint');
  if (!section || !canvas) return;

  const ctx = canvas.getContext('2d');
  const isMobile = window.innerWidth < 768;

  // ── Dimensions ─────────────────────────────────────────────
  let W, H, groundY;
  const CAR_SCALE = isMobile ? 0.6 : 1.0;
  // R33 canonical half-dimensions (pre-scale)
  const CW  = 460; // car width
  const CH  = 160; // body height above wheel center
  const WR  = 38;  // wheel radius

  // ── Live state ─────────────────────────────────────────────
  let state         = S.IDLE;
  let carX          = 0;       // car center x on canvas
  let tireAngle     = 0;
  let burnoutTime   = 0;       // seconds in burnout
  let launchProgress = 0;
  let launchStartX  = 0;
  let verseShown    = false;
  let hintHidden    = false;

  // Shake
  let shakeX = 0, shakeY = 0;

  // Tire marks
  const marks = [];
  let markOpacity = 1;

  // Smoke particles
  const particles = [];

  // Scroll velocity tracking
  let lastScrollY   = window.scrollY;
  let lastScrollT   = performance.now();
  let rawVelocity   = 0;
  let smoothVelocity = 0;

  // ── Resize ─────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = sticky.clientWidth;
    H = canvas.height = sticky.clientHeight;
    groundY = H * 0.70;
    carX = W * (isMobile ? 0.38 : 0.36);
    launchStartX = carX;
  }

  // ── Scroll depth within section (0→1) ─────────────────────
  function scrollDepth() {
    const top = section.getBoundingClientRect().top;
    const scrollable = section.offsetHeight - H;
    return Math.max(0, Math.min(1, -top / scrollable));
  }

  // ── Scroll velocity tracking ───────────────────────────────
  function trackVelocity() {
    const now = performance.now();
    const dt  = Math.max(now - lastScrollT, 1);
    rawVelocity    = (window.scrollY - lastScrollY) / dt * 16;
    smoothVelocity += (rawVelocity - smoothVelocity) * 0.12;
    lastScrollY    = window.scrollY;
    lastScrollT    = now;
  }

  // ── Particle ───────────────────────────────────────────────
  class Particle {
    constructor(x, y, intensity) {
      this.x = x + (Math.random() - 0.5) * 24;
      this.y = y;
      const speed = (0.6 + Math.random() * 0.8) * Math.max(intensity, 0.3);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.r  = 6 + Math.random() * 10 * intensity;
      this.maxR = this.r * (3 + Math.random() * 3);
      this.life = 1;
      this.decay = 0.006 + Math.random() * 0.009 / Math.max(intensity, 0.2);
      this.grow  = 0.35 + Math.random() * 0.25;
      // color weighted toward dark smoke with neon tints
      const rng = Math.random();
      if (rng < 0.25)       this.type = 'blue';
      else if (rng < 0.40)  this.type = 'purple';
      else                   this.type = 'dark';
    }

    update(dt) {
      this.x  += this.vx * dt;
      this.y  += this.vy * dt;
      this.vy *= 0.978;
      this.vx *= 0.972;
      this.r   = Math.min(this.r + this.grow * dt, this.maxR);
      this.life -= this.decay * dt;
      return this.life > 0;
    }

    draw(ctx) {
      const a = this.life;
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      if (this.type === 'blue') {
        g.addColorStop(0,   `rgba(0,180,255,${a * 0.55})`);
        g.addColorStop(0.5, `rgba(0,80,140,${a * 0.28})`);
        g.addColorStop(1,   'rgba(0,10,30,0)');
      } else if (this.type === 'purple') {
        g.addColorStop(0,   `rgba(140,0,255,${a * 0.45})`);
        g.addColorStop(0.5, `rgba(60,0,100,${a * 0.22})`);
        g.addColorStop(1,   'rgba(5,0,15,0)');
      } else {
        g.addColorStop(0,   `rgba(30,35,55,${a * 0.80})`);
        g.addColorStop(0.6, `rgba(15,18,30,${a * 0.45})`);
        g.addColorStop(1,   'rgba(2,3,8,0)');
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  // ── Emit smoke ─────────────────────────────────────────────
  function emitSmoke(x, y, count, intensity) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, intensity));
    }
    while (particles.length > 700) particles.shift();
  }

  // ── Draw: background ───────────────────────────────────────
  function drawBg() {
    ctx.fillStyle = C_VOID;
    ctx.fillRect(0, 0, W, H);
    // Vignette
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.75);
    vg.addColorStop(0,   'rgba(0,0,0,0)');
    vg.addColorStop(1,   'rgba(0,0,8,0.65)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Draw: road + neon grid ──────────────────────────────────
  function drawRoad(t) {
    // Asphalt
    const asp = ctx.createLinearGradient(0, groundY, 0, H);
    asp.addColorStop(0,   '#09091a');
    asp.addColorStop(0.4, '#05050f');
    asp.addColorStop(1,   '#020208');
    ctx.fillStyle = asp;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Ground glow line
    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = C_BLUE;
    ctx.strokeStyle = 'rgba(0,212,255,0.6)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
    ctx.restore();

    // Perspective grid
    const vx = W * 0.5;
    const vy = groundY;
    ctx.save();

    // Horizontal lines (receding)
    for (let i = 1; i <= 6; i++) {
      const frac  = i / 6;
      const y     = groundY + frac * (H - groundY);
      const alpha = (1 - frac) * 0.18;
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Vertical perspective lines
    const numV = 16;
    for (let i = 0; i <= numV; i++) {
      const frac   = i / numV;
      const xBot   = frac * W;
      const xTop   = vx + (xBot - vx) * 0.04;
      const alpha  = 0.05 + (i % 4 === 0 ? 0.07 : 0);
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(xTop, vy);
      ctx.lineTo(xBot, H);
      ctx.stroke();
    }
    ctx.restore();

    // Ambient reflection under car area
    const refl = ctx.createLinearGradient(0, groundY, 0, groundY + 70);
    refl.addColorStop(0, 'rgba(0,212,255,0.05)');
    refl.addColorStop(1, 'rgba(144,0,255,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(0, groundY, W, 70);
  }

  // ── Draw: tire marks ───────────────────────────────────────
  function drawMarks() {
    if (marks.length < 3) return;
    ctx.save();

    const alpha = markOpacity * 0.65;
    for (const off of [-11, 11]) {
      ctx.beginPath();
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (i === 0) ctx.moveTo(m, groundY + off);
        else         ctx.lineTo(m, groundY + off);
      }
      ctx.strokeStyle = `rgba(15,30,50,${alpha})`;
      ctx.lineWidth   = 16;
      ctx.lineCap     = 'round';
      ctx.stroke();

      // Neon overlay
      ctx.beginPath();
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (i === 0) ctx.moveTo(m, groundY + off);
        else         ctx.lineTo(m, groundY + off);
      }
      ctx.shadowBlur  = 14;
      ctx.shadowColor = C_BLUE;
      ctx.strokeStyle = `rgba(0,212,255,${alpha * 0.28})`;
      ctx.lineWidth   = 18;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Draw: car (R33 GTR side profile) ──────────────────────
  function drawCar(cx, baseY, tireA, shX, shY, intensity, reversing, launch) {
    ctx.save();
    ctx.translate(cx + shX, baseY + shY);
    ctx.scale(CAR_SCALE, CAR_SCALE);

    // Coordinate system: origin = ground level at car center
    // y < 0 = upward, x > 0 = toward front (right), x < 0 = toward rear (left)
    const FWX =  130; // front wheel X
    const RWX = -140; // rear wheel X
    const WCY = -WR;  // wheel center Y (above ground)
    const CLR = WCY - WR + 6; // body clearance (underside)

    // ── Underglow pulse ────────────────────────────────────────
    const t    = Date.now();
    const bPulse = 0.07 + Math.sin(t * 0.003) * 0.04 + intensity * 0.12;
    const pPulse = 0.05 + Math.sin(t * 0.002 + 1.2) * 0.03 + intensity * 0.07;
    const ug = ctx.createRadialGradient(0, CLR, 0, 0, CLR, CW * 0.58);
    ug.addColorStop(0,   `rgba(0,212,255,${bPulse})`);
    ug.addColorStop(0.45, `rgba(144,0,255,${pPulse})`);
    ug.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = ug;
    ctx.beginPath();
    ctx.ellipse(0, CLR + 8, CW * 0.52, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Main body path (R33 side silhouette) ──────────────────
    const roofH  = CH;          // total body height
    const roofY  = CLR - roofH; // roof Y

    // Body gradient — dark steel with blue tint
    const bg = ctx.createLinearGradient(-CW / 2, roofY, CW / 2, CLR);
    bg.addColorStop(0,    '#181828');
    bg.addColorStop(0.35, '#0e0e1e');
    bg.addColorStop(1,    '#060610');

    ctx.beginPath();
    // Starting from front bumper bottom, going clockwise:
    ctx.moveTo(FWX + WR + 8,  -6);           // front bumper base
    ctx.lineTo(FWX + WR + 22, -32);          // front bumper face
    ctx.lineTo(FWX + WR + 26, -52);          // chin / air dam
    ctx.lineTo(FWX + WR + 18, CLR - 20);    // lower bumper body join
    ctx.lineTo(FWX + WR + 12, CLR);         // hood front lower
    ctx.lineTo(FWX + 35,       CLR - 8);    // hood crease
    ctx.lineTo(FWX - 18,       roofY + roofH * 0.45);  // hood peak
    ctx.lineTo(FWX - 55,       roofY + roofH * 0.20);  // windshield base
    ctx.lineTo(FWX - 80,       roofY + 14); // windshield top
    ctx.lineTo(-20,             roofY + 4);  // roof front
    ctx.lineTo(RWX + 95,       roofY);      // roof peak
    ctx.lineTo(RWX + 60,       roofY + 22); // rear roof drop
    ctx.lineTo(RWX + 30,       roofY + 55); // rear window upper
    ctx.lineTo(RWX + 8,        CLR - 30);   // trunk / C-pillar
    ctx.lineTo(RWX - WR - 8,   CLR - 14);  // rear deck
    ctx.lineTo(RWX - WR - 22,  -38);        // rear bumper top
    ctx.lineTo(RWX - WR - 28,  -16);        // rear bumper face
    ctx.lineTo(RWX - WR - 12,  -6);         // rear bumper base
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    // Body outline
    ctx.strokeStyle = 'rgba(0,212,255,0.30)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // ── Side skirt / door panel line ──────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.20)';
    ctx.lineWidth   = 0.8;
    ctx.shadowBlur  = 6;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(RWX - WR, CLR + 2);
    ctx.lineTo(FWX + WR, CLR + 2);
    ctx.stroke();
    ctx.restore();

    // ── Purple accent stripe ───────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(144,0,255,0.5)';
    ctx.lineWidth   = 2.5;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = C_PURPLE;
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 10, CLR - 22);
    ctx.bezierCurveTo(
      RWX + 20, CLR - 30,
      FWX - 30, CLR - 28,
      FWX + WR + 10, CLR - 18
    );
    ctx.stroke();
    ctx.restore();

    // ── Windshield + rear glass ────────────────────────────────
    // Windshield
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(FWX - 55, roofY + roofH * 0.20);
    ctx.lineTo(FWX - 80, roofY + 14);
    ctx.lineTo(-20,       roofY + 4);
    ctx.lineTo(RWX + 95,  roofY);
    ctx.lineTo(RWX + 60,  roofY + 22);
    ctx.lineTo(FWX - 22,  roofY + roofH * 0.22);
    ctx.closePath();
    const wg = ctx.createLinearGradient(RWX + 60, roofY, FWX - 55, roofY + 40);
    wg.addColorStop(0, 'rgba(0,40,90,0.88)');
    wg.addColorStop(1, 'rgba(0,60,120,0.75)');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Cross reflection in windshield
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = C_BLUE;
    ctx.lineWidth   = 2.5;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = C_BLUE;
    ctx.lineCap     = 'round';
    const crX = FWX - 30, crY = roofY + 22;
    ctx.beginPath();
    ctx.moveTo(crX, crY - 16); ctx.lineTo(crX, crY + 16);
    ctx.moveTo(crX - 10, crY - 5); ctx.lineTo(crX + 10, crY - 5);
    ctx.stroke();
    ctx.restore();

    // Rear window
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(RWX + 60, roofY + 22);
    ctx.lineTo(RWX + 30, roofY + 55);
    ctx.lineTo(RWX + 6,  CLR - 30);
    ctx.lineTo(RWX + 20, CLR - 35);
    ctx.lineTo(RWX + 45, roofY + 50);
    ctx.lineTo(RWX + 68, roofY + 28);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,18,40,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.18)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();
    ctx.restore();

    // ── Hood cross (glowing gothic) ────────────────────────────
    ctx.save();
    const hcx = FWX - 5;
    const hcy = CLR - roofH * 0.35;
    const cp  = 0.7 + Math.sin(t * 0.0024) * 0.3;
    ctx.shadowBlur  = 24 * cp;
    ctx.shadowColor = C_BLUE;
    ctx.strokeStyle = `rgba(0,212,255,${0.92 * cp})`;
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = 'round';
    // Vertical bar
    ctx.beginPath();
    ctx.moveTo(hcx, hcy - 26); ctx.lineTo(hcx, hcy + 26);
    ctx.stroke();
    // Crossbar
    ctx.beginPath();
    ctx.moveTo(hcx - 16, hcy - 7); ctx.lineTo(hcx + 16, hcy - 7);
    ctx.stroke();
    // Gothic serifs
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.55 * cp;
    ctx.beginPath();
    const sk = 5;
    ctx.moveTo(hcx - sk, hcy - 26); ctx.lineTo(hcx + sk, hcy - 26);
    ctx.moveTo(hcx - sk, hcy + 26); ctx.lineTo(hcx + sk, hcy + 26);
    ctx.moveTo(hcx - 16, hcy - 7 - sk); ctx.lineTo(hcx - 16, hcy - 7 + sk);
    ctx.moveTo(hcx + 16, hcy - 7 - sk); ctx.lineTo(hcx + 16, hcy - 7 + sk);
    ctx.stroke();
    ctx.restore();

    // ── KING OF KINGS windshield banner ───────────────────────
    ctx.save();
    const bCX = (FWX - 80 + RWX + 95) / 2 + 10;
    const bCY = roofY + 10;
    ctx.font         = `bold 10px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 12;
    ctx.shadowColor  = C_BLUE;
    ctx.fillStyle    = `rgba(0,212,255,0.82)`;
    ctx.fillText('KING OF KINGS', bCX, bCY);
    ctx.restore();

    // ── Headlights ─────────────────────────────────────────────
    ctx.save();
    const hlP = 0.75 + Math.sin(t * 0.0035) * 0.25;
    ctx.shadowBlur  = 30 * hlP;
    ctx.shadowColor = C_BLUE;

    // Main headlight lens
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 22, -38);
    ctx.lineTo(FWX + WR + 4,  -35);
    ctx.lineTo(FWX + WR + 2,  -18);
    ctx.lineTo(FWX + WR + 22, -20);
    ctx.closePath();
    const hl = ctx.createLinearGradient(FWX + WR + 2, -35, FWX + WR + 22, -20);
    hl.addColorStop(0, `rgba(180,240,255,${hlP})`);
    hl.addColorStop(1, `rgba(0,212,255,${0.85 * hlP})`);
    ctx.fillStyle = hl;
    ctx.fill();

    // Headlight beam
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 22, -34);
    ctx.lineTo(FWX + WR + 22 + 90, -44);
    ctx.lineTo(FWX + WR + 22 + 90, -12);
    ctx.lineTo(FWX + WR + 22, -22);
    ctx.closePath();
    const beam = ctx.createLinearGradient(FWX + WR + 22, -28, FWX + WR + 110, -28);
    beam.addColorStop(0, `rgba(0,212,255,0.22)`);
    beam.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = beam;
    ctx.fill();

    // Fog / lower light strip
    ctx.fillStyle = `rgba(0,212,255,${0.6 * hlP})`;
    ctx.fillRect(FWX + WR + 8, -12, 14, 6);
    ctx.restore();

    // ── Tail lights ────────────────────────────────────────────
    ctx.save();
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#ff2244';
    const tl = ctx.createLinearGradient(RWX - WR - 26, -40, RWX - WR - 10, -40);
    tl.addColorStop(0, 'rgba(255,30,60,0.95)');
    tl.addColorStop(1, 'rgba(180,10,30,0.7)');
    ctx.fillStyle = tl;
    ctx.fillRect(RWX - WR - 26, -46, 16, 28);

    // Tail light detail lines
    ctx.strokeStyle = 'rgba(255,80,100,0.5)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(RWX - WR - 22, -46);
    ctx.lineTo(RWX - WR - 22, -18);
    ctx.moveTo(RWX - WR - 18, -46);
    ctx.lineTo(RWX - WR - 18, -18);
    ctx.stroke();
    ctx.restore();

    // ── Reverse lights ─────────────────────────────────────────
    if (reversing) {
      ctx.save();
      ctx.shadowBlur  = 22;
      ctx.shadowColor = '#ff4466';
      ctx.fillStyle   = 'rgba(255,60,80,0.9)';
      ctx.fillRect(RWX - WR - 26, -16, 16, 10);
      ctx.restore();
    }

    // ── Exhaust tips (dual) ────────────────────────────────────
    ctx.save();
    const ep = 0.55 + Math.sin(t * 0.005) * 0.35 + intensity * 0.4;
    for (let i = 0; i < 2; i++) {
      const ey = -8 - i * 14;
      // Tip housing
      ctx.fillStyle = '#141424';
      ctx.fillRect(RWX - WR - 28, ey - 5, 14, 10);
      ctx.strokeStyle = 'rgba(0,212,255,0.3)';
      ctx.lineWidth   = 0.8;
      ctx.strokeRect(RWX - WR - 28, ey - 5, 14, 10);
      // Glow core
      const eg = ctx.createRadialGradient(
        RWX - WR - 28, ey, 0,
        RWX - WR - 28, ey, 10
      );
      eg.addColorStop(0,   `rgba(0,212,255,${ep})`);
      eg.addColorStop(0.5, `rgba(0,100,200,${ep * 0.4})`);
      eg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle   = eg;
      ctx.shadowBlur  = 20 * ep;
      ctx.shadowColor = C_BLUE;
      ctx.beginPath();
      ctx.arc(RWX - WR - 28, ey, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── License plate ──────────────────────────────────────────
    ctx.save();
    const px = RWX - WR + 5;
    const py = -30;
    ctx.fillStyle   = 'rgba(8,8,22,0.95)';
    ctx.strokeStyle = 'rgba(0,212,255,0.55)';
    ctx.lineWidth   = 0.9;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(px - 30, py - 10, 60, 20, 2);
    } else {
      ctx.rect(px - 30, py - 10, 60, 20);
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = C_BLUE;
    ctx.fillStyle   = C_BLUE;
    ctx.font        = `bold 8px 'Orbitron', monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EZK 33:6', px, py);
    ctx.restore();

    // ── Wheels ─────────────────────────────────────────────────
    const wheels = [
      { x: FWX,  spin: tireA, extra: 0 },
      { x: RWX, spin: tireA, extra: state === S.BURNOUT ? Math.sin(t * 0.012) * 0.4 : 0 }
    ];

    for (const w of wheels) {
      ctx.save();
      ctx.translate(w.x, WCY);

      // Wheel arch fill (hide body overlap)
      ctx.beginPath();
      ctx.arc(0, 0, WR + 8, Math.PI, 0);
      ctx.fillStyle = '#030308';
      ctx.fill();

      // Tire
      ctx.beginPath();
      ctx.arc(0, 0, WR, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a10';
      ctx.fill();
      ctx.strokeStyle = '#1a1a28';
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Rim (rotates)
      ctx.save();
      ctx.rotate(w.spin + w.extra);

      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, WR - 5);
      rg.addColorStop(0,    '#252540');
      rg.addColorStop(0.55, '#141428');
      rg.addColorStop(1,    '#0a0a18');
      ctx.beginPath();
      ctx.arc(0, 0, WR - 4, 0, Math.PI * 2);
      ctx.fillStyle = rg;
      ctx.fill();

      // Cross motif spokes
      ctx.shadowBlur  = 12;
      ctx.shadowColor = C_BLUE;
      ctx.strokeStyle = 'rgba(0,212,255,0.80)';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -(WR - 7)); ctx.lineTo(0,  WR - 7);  // vertical
      ctx.moveTo(-(WR - 7), 0); ctx.lineTo(WR - 7, 0);   // horizontal
      ctx.stroke();

      // Diagonal spokes
      ctx.globalAlpha = 0.38;
      ctx.lineWidth   = 1.2;
      const d = (WR - 7) * 0.707;
      ctx.beginPath();
      ctx.moveTo(-d, -d); ctx.lineTo(d, d);
      ctx.moveTo( d, -d); ctx.lineTo(-d, d);
      ctx.stroke();
      ctx.restore(); // rim rotate

      // Hub glow
      ctx.save();
      ctx.shadowBlur  = 18;
      ctx.shadowColor = C_BLUE;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = C_BLUE;
      ctx.fill();
      ctx.restore();

      // Spin glow ring (intensity-driven)
      if (intensity > 0.25) {
        ctx.save();
        ctx.globalAlpha = intensity * 0.35;
        ctx.shadowBlur  = 28 * intensity;
        ctx.shadowColor = C_BLUE;
        ctx.strokeStyle = C_BLUE;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(0, 0, WR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); // wheel translate
    }

    // ── Launch motion blur streaks ─────────────────────────────
    if (launch > 0.05) {
      ctx.save();
      ctx.globalAlpha = launch * 0.4;
      const streakGrad = ctx.createLinearGradient(-CW * 0.6, 0, 0, 0);
      streakGrad.addColorStop(0,   'rgba(0,212,255,0)');
      streakGrad.addColorStop(0.6, `rgba(0,212,255,${launch * 0.35})`);
      streakGrad.addColorStop(1,   `rgba(144,0,255,${launch * 0.5})`);
      ctx.fillStyle = streakGrad;
      for (let s = 0; s < 6; s++) {
        const sy    = (Math.random() - 0.5) * CH;
        const sh    = 2 + Math.random() * 4;
        const sLen  = 80 + Math.random() * 120;
        ctx.fillRect(-CW * 0.55 - sLen, sy - sh / 2, sLen, sh);
      }
      ctx.restore();
    }

    ctx.restore(); // car main
  }

  // ── Burnout smoke cloud (full screen at 40%) ───────────────
  function drawBurnoutCloud(t) {
    if (state !== S.BURNOUT) return;
    const alpha = Math.min(burnoutTime / 1.5, 1) * 0.22;
    const cloud = ctx.createRadialGradient(
      carX * CAR_SCALE, groundY - 60, 0,
      carX * CAR_SCALE, groundY - 80, W * 0.55
    );
    cloud.addColorStop(0,    `rgba(10,20,40,${alpha})`);
    cloud.addColorStop(0.4,  `rgba(0,80,150,${alpha * 0.5})`);
    cloud.addColorStop(0.75, `rgba(40,0,80,${alpha * 0.3})`);
    cloud.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Main animation loop ────────────────────────────────────
  let lastT = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastT) / 16.67, 3);
    lastT = now;

    trackVelocity();

    const depth = scrollDepth();
    const vel   = Math.abs(smoothVelocity);
    const isUp  = smoothVelocity < -0.5;
    const intensity = Math.min(vel / 9, 1);

    // ── Hint text ──────────────────────────────────────────────
    if (!hintHidden && vel > 0.2) {
      hintHidden = true;
      if (hintEl) hintEl.classList.add('hidden');
    }

    // ── State machine ──────────────────────────────────────────
    if (state !== S.LAUNCHING && state !== S.GONE) {
      if (depth >= 0.62) {
        state = S.LAUNCHING;
        launchProgress = 0;
        launchStartX   = carX;
      } else if (depth >= 0.38 && !isMobile) {
        state = S.BURNOUT;
        burnoutTime += dt * 0.016;
      } else if (vel > 0.5) {
        state = S.BUILDING;
        burnoutTime = Math.max(0, burnoutTime - dt * 0.03);
      } else {
        state = S.IDLE;
        burnoutTime = Math.max(0, burnoutTime - dt * 0.02);
      }
    }

    // ── Car movement ───────────────────────────────────────────
    if (state === S.LAUNCHING) {
      launchProgress = Math.min(launchProgress + dt * 0.014, 1);
      const ease = launchProgress * launchProgress * (3 - 2 * launchProgress); // smoothstep
      carX = launchStartX + ease * ease * W * 1.6;
      if (launchProgress >= 1) {
        state = S.GONE;
        if (!verseShown && verseEl) {
          verseEl.classList.add('visible');
          verseShown = true;
        }
        if (hintEl) hintEl.style.display = 'none';
      }
    } else if (state !== S.GONE) {
      // Idle micro-drift
      carX += Math.sin(now * 0.0009) * 0.06;
    }

    // ── Tire spin ──────────────────────────────────────────────
    const spinRate = state === S.IDLE      ? 0.008
                   : state === S.BUILDING  ? 0.02 + intensity * 0.14
                   : state === S.BURNOUT   ? 0.28
                   : state === S.LAUNCHING ? 0.4 * (1 - launchProgress * 0.5)
                   : 0;
    tireAngle += spinRate * dt;

    // ── Shake ──────────────────────────────────────────────────
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

    // ── Tire marks ─────────────────────────────────────────────
    if ((state === S.BURNOUT || (state === S.BUILDING && intensity > 0.55)) && !isMobile) {
      const rwX = carX + CAR_SCALE * (-140 - WR);
      marks.push(rwX);
      if (marks.length > 220) marks.shift();
    }
    if (state === S.GONE) {
      markOpacity = Math.max(0, markOpacity - 0.0008 * dt);
    }

    // ── Smoke emission ─────────────────────────────────────────
    const rwWorldX = carX + CAR_SCALE * (-140 - WR);
    const rwWorldY = groundY - WR * CAR_SCALE;

    if (state === S.IDLE && !isMobile && Math.random() < 0.05) {
      emitSmoke(carX + CAR_SCALE * (-140 - WR - 18), groundY - 20, 1, 0.18);
    } else if (state === S.BUILDING) {
      const n = Math.max(1, Math.floor(intensity * 6));
      emitSmoke(rwWorldX, rwWorldY, n, intensity);
    } else if (state === S.BURNOUT) {
      emitSmoke(rwWorldX, rwWorldY, 18, 1.6);
    } else if (state === S.LAUNCHING) {
      emitSmoke(rwWorldX, rwWorldY, 10, 1.1);
    }

    // ── Render ─────────────────────────────────────────────────
    drawBg();
    drawRoad(now);

    // Smoke particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].update(dt)) particles.splice(i, 1);
      else particles[i].draw(ctx);
    }

    drawMarks();
    drawBurnoutCloud(now);

    if (state !== S.GONE) {
      drawCar(
        carX, groundY,
        tireAngle, shakeX, shakeY,
        intensity, isUp,
        state === S.LAUNCHING ? launchProgress : 0
      );
    }

    // Neon light trail on launch
    if (state === S.LAUNCHING && launchProgress > 0.1) {
      const trailX = carX - W * 0.05;
      const trail  = ctx.createLinearGradient(0, groundY - 40, trailX, groundY - 40);
      trail.addColorStop(0, 'rgba(0,212,255,0)');
      trail.addColorStop(0.7, `rgba(0,212,255,${launchProgress * 0.25})`);
      trail.addColorStop(1, `rgba(144,0,255,${launchProgress * 0.35})`);
      ctx.fillStyle = trail;
      ctx.fillRect(0, groundY - 55, trailX, 30);
    }
  }

  // ── Boot ───────────────────────────────────────────────────
  function init() {
    resize();
    window.addEventListener('resize', () => {
      resize();
      // reset state if window resized significantly
      if (state === S.GONE) {
        // keep verse shown
      }
    });
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
