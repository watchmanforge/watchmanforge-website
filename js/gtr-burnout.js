/* ============================================================
   R33 SKYLINE GTR — Scroll-Reactive Burnout Animation
   Watchman Forge · EZK 33:6 · The Mascot
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

  // ── R33 canonical dimensions ───────────────────────────────
  // Origin: ground level at car centre-X. Y negative = upward.
  const FWX =  150;   // front wheel centre X
  const RWX = -185;   // rear wheel centre X
  const WR  =   40;   // wheel radius
  const WCY = -WR;    // wheel centre Y = -40

  const CLR   = WCY - WR + 4;   // sill underside  = -76
  const roofH = 102;
  const roofY = CLR - roofH;    // roofline        = -178
  const deckY = CLR - 36;       // rear deck lid   = -112

  // GT wing — struts rise from deck, blade sits at roofline height
  const wingY  = deckY - 62;    // wing blade centre = -174 (≈ roofline)
  const wingFX = RWX + 28;      // wing forward edge
  const wingRX = RWX - 66;      // wing rearward edge (past bumper)
  const strutFX = RWX + 8;
  const strutRX = RWX - 42;

  // ── Scale & layout ─────────────────────────────────────────
  let W, H, groundY;
  const CAR_SCALE = isMobile ? 0.58 : 1.0;

  // ── Live state ─────────────────────────────────────────────
  let state          = S.IDLE;
  let carX           = 0;
  let tireAngle      = 0;
  let burnoutTime    = 0;
  let launchProgress = 0;
  let launchStartX   = 0;
  let verseShown     = false;
  let hintHidden     = false;

  let shakeX = 0, shakeY = 0;

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
      const wind   = -(0.55 + Math.random() * 1.4) * Math.max(intensity * 0.72, 0.38);
      this.vx = Math.cos(angle) * speed + wind;
      this.vy = Math.sin(angle) * speed * 0.76;

      this.isBase = Math.random() < 0.28;
      if (this.isBase) {
        this.r    = 22 + Math.random() * 26 * Math.max(intensity, 0.5);
        this.maxR = this.r * (2.5 + Math.random() * 1.8);
        this.decay = 0.0020 + Math.random() * 0.0028 / Math.max(intensity, 0.2);
        this.grow  = 0.14 + Math.random() * 0.10;
      } else {
        this.r    = 5 + Math.random() * 15 * intensity;
        this.maxR = this.r * (3.8 + Math.random() * 4);
        this.decay = 0.0042 + Math.random() * 0.008 / Math.max(intensity, 0.2);
        this.grow  = 0.36 + Math.random() * 0.30;
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
        const baseA = this.isBase ? a * 0.62 : a * 0.70;
        g.addColorStop(0,    `rgba(28,32,48,${baseA})`);
        g.addColorStop(0.5,  `rgba(10,12,22,${baseA * 0.50})`);
        g.addColorStop(1,    'rgba(2,2,6,0)');
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  function emitSmoke(x, y, count, intensity) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, intensity));
    while (particles.length > 950) particles.shift();
  }

  // ── Dark stone wall background ─────────────────────────────
  function drawStoneBg() {
    // Base fill
    const wallGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    wallGrad.addColorStop(0,   '#040408');
    wallGrad.addColorStop(0.5, '#06060e');
    wallGrad.addColorStop(1,   '#0a0a16');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, groundY + 2);

    // Stone block grid — irregular gothic masonry
    ctx.save();
    const BW = 88;   // block width
    const BH = 44;   // block height
    const M  = 2;    // mortar thickness

    for (let row = 0; row * BH < groundY + BH; row++) {
      const rowOff = (row % 2) * (BW * 0.5);
      for (let col = -1; col * BW < W + BW; col++) {
        const bx = col * BW + rowOff;
        const by = row * BH;
        const v  = (Math.sin(row * 5.7 + col * 3.1) * 0.5 + 0.5) * 10;
        const b  = 7 + v | 0;
        ctx.fillStyle = `rgb(${b},${b},${b + 6})`;
        ctx.fillRect(bx + M, by + M, BW - M * 2, BH - M * 2);
      }
    }

    // Mortar hairlines — neon blue ghost traces
    ctx.lineWidth = 0.6;

    // Horizontal courses
    for (let row = 1; row * BH < groundY; row++) {
      const y    = row * BH;
      const neon = (row % 3 === 0);
      ctx.strokeStyle = neon ? 'rgba(0,212,255,0.18)' : 'rgba(0,212,255,0.06)';
      if (neon) { ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,212,255,0.4)'; }
      else      { ctx.shadowBlur = 0; }
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Vertical joints (staggered per course)
    ctx.strokeStyle = 'rgba(0,212,255,0.05)';
    for (let row = 0; row * BH < groundY + BH; row++) {
      const rowOff = (row % 2) * (BW * 0.5);
      for (let col = -1; col * BW < W + BW; col++) {
        const x = col * BW + rowOff;
        ctx.beginPath();
        ctx.moveTo(x, row * BH);
        ctx.lineTo(x, row * BH + BH);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Dark vignette / spotlight — draws attention to car centre
    const cx  = W * 0.42;
    const vig = ctx.createRadialGradient(cx, groundY * 0.55, 0, cx, groundY * 0.55, W * 0.72);
    vig.addColorStop(0,    'rgba(0,0,0,0)');
    vig.addColorStop(0.55, 'rgba(0,0,6,0.35)');
    vig.addColorStop(1,    'rgba(0,0,10,0.78)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, groundY);

    // Subtle purple atmospheric haze — lower third of wall
    const haze = ctx.createLinearGradient(0, groundY * 0.55, 0, groundY);
    haze.addColorStop(0, 'rgba(144,0,255,0)');
    haze.addColorStop(1, 'rgba(144,0,255,0.06)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, groundY * 0.55, W, groundY * 0.45);
  }

  // ── Road: dark asphalt + perspective neon grid ─────────────
  function drawRoad() {
    // Asphalt base
    const asp = ctx.createLinearGradient(0, groundY, 0, H);
    asp.addColorStop(0,   '#080812');
    asp.addColorStop(0.4, '#050510');
    asp.addColorStop(1,   '#020208');
    ctx.fillStyle = asp;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Ground horizon glow
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

    // Perspective neon grid — vanishing point at car position
    const vpX = W * 0.42;
    ctx.save();

    // Horizontal receding lines
    for (let i = 1; i <= 12; i++) {
      const frac  = i / 12;
      const y     = groundY + frac * (H - groundY);
      const alpha = (1 - frac * 0.65) * 0.52;
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth   = frac < 0.22 ? 1.6 : 0.9;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Converging verticals toward vanishing point
    const numV = 24;
    for (let i = 0; i <= numV; i++) {
      const frac   = i / numV;
      const xBot   = frac * W;
      const xTop   = vpX + (xBot - vpX) * 0.04;
      const isMaj  = (i % 4 === 0);
      ctx.strokeStyle = isMaj
        ? 'rgba(0,212,255,0.32)'
        : 'rgba(100,0,255,0.12)';
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

    // Asphalt underglow — neon blue reflection
    const refl = ctx.createLinearGradient(0, groundY, 0, groundY + 130);
    refl.addColorStop(0, 'rgba(0,212,255,0.10)');
    refl.addColorStop(1, 'rgba(144,0,255,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(0, groundY, W, 130);
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

  // ── Car: R33 GTR with corrected proportions ─────────────────
  // Key fixes vs. previous build:
  //   • Wing struts now rise 62px above deck lid (previously sat below deck)
  //   • Hood extended — A-pillar moved rearward 18px for R33's long-nose look
  //   • C-pillar fastback is more dramatic
  function drawCar(cx, baseY, tireA, shX, shY, intensity, reversing, launch) {
    ctx.save();
    ctx.translate(cx + shX, baseY + shY);
    ctx.scale(CAR_SCALE, CAR_SCALE);

    const t = Date.now();

    // ── UNDERGLOW POOL ───────────────────────────────────────
    const bP = 0.18 + Math.sin(t * 0.003) * 0.07 + intensity * 0.24;
    const pP = 0.10 + Math.sin(t * 0.002 + 1.2) * 0.04 + intensity * 0.14;
    const ug = ctx.createRadialGradient(-8, CLR + 6, 0, -8, CLR + 22, 320);
    ug.addColorStop(0,    `rgba(0,212,255,${bP})`);
    ug.addColorStop(0.42, `rgba(144,0,255,${pP})`);
    ug.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = ug;
    ctx.beginPath();
    ctx.ellipse(-8, CLR + 20, 300, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── MAIN BODY — R33 silhouette ───────────────────────────
    // Long hood, compact greenhouse, sweeping fastback
    const bodyGrad = ctx.createLinearGradient(RWX - 90, roofY, FWX + 90, CLR);
    bodyGrad.addColorStop(0,    '#0e0e0e');
    bodyGrad.addColorStop(0.28, '#090909');
    bodyGrad.addColorStop(0.62, '#050505');
    bodyGrad.addColorStop(1,    '#030303');

    ctx.beginPath();

    // Front bumper lower-right
    ctx.moveTo(FWX + WR + 20, -5);

    // Chin spoiler — deep splitter
    ctx.bezierCurveTo(
      FWX + WR + 32, -5,
      FWX + WR + 46, -10,
      FWX + WR + 48, -22
    );
    ctx.bezierCurveTo(
      FWX + WR + 50, -34,
      FWX + WR + 47, -46,
      FWX + WR + 45, -58
    );

    // Bumper face — squared-off R33 style
    ctx.lineTo(FWX + WR + 42, -76);
    ctx.bezierCurveTo(
      FWX + WR + 38, -84,
      FWX + WR + 24, -86,
      FWX + WR + 12, -86
    );

    // Hood leading edge — wide, flat, R33 power bulge
    ctx.bezierCurveTo(
      FWX + WR +  2, -84,
      FWX + 28,      -86,
      FWX + 14,      -90
    );

    // Hood surface — long gradual power dome (extended for R33 long-nose)
    ctx.bezierCurveTo(
      FWX -  4,  -96,
      FWX - 36, -102,
      FWX - 68, -106
    );

    // Continued hood — gradual rise toward windshield
    ctx.bezierCurveTo(
      FWX - 88, -108,
      FWX - 100, -118,
      FWX - 110, -128
    );

    // Windshield cowl — long hood, pushed back
    ctx.lineTo(FWX - 116, -138);

    // A-pillar — steep, R33 characteristic raked angle
    ctx.bezierCurveTo(
      FWX - 124, roofY + 76,
      FWX - 136, roofY + 48,
      FWX - 146, roofY + 26
    );
    ctx.lineTo(FWX - 152, roofY + 8);

    // Roof front header — compact greenhouse
    ctx.bezierCurveTo(
      FWX - 162, roofY + 2,
      FWX - 174, roofY,
      -18,        roofY
    );

    // Roof crown — subtle arc rearward
    ctx.bezierCurveTo(
      RWX + 112, roofY,
      RWX +  92, roofY + 10,
      RWX +  72, roofY + 34
    );

    // C-pillar fastback — dramatic sweeping slope (R33 signature)
    ctx.bezierCurveTo(
      RWX + 50, roofY + 72,
      RWX + 28, roofY + 112,
      RWX + 10, roofY + 148
    );

    // Short trunk lid — R33's stubby deck
    ctx.bezierCurveTo(
      RWX +  2, deckY - 38,
      RWX -  6, deckY - 34,
      RWX - 14, deckY - 30
    );

    // Ducktail uptick — characteristic R33 lip
    ctx.lineTo(RWX - 18, deckY - 40);
    ctx.lineTo(RWX - 26, deckY - 36);
    ctx.lineTo(RWX - 28, deckY - 22);

    // Rear panel
    ctx.bezierCurveTo(
      RWX - WR +  2, CLR - 18,
      RWX - WR -  8, CLR - 10,
      RWX - WR - 14, -82
    );

    // Rear bumper — full square R33 rear
    ctx.bezierCurveTo(
      RWX - WR - 26, -68,
      RWX - WR - 36, -46,
      RWX - WR - 36, -24
    );
    ctx.bezierCurveTo(
      RWX - WR - 36, -12,
      RWX - WR - 26,  -4,
      RWX - WR - 14,  -3
    );

    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.50)';
    ctx.lineWidth   = 1.6;
    ctx.stroke();

    // ── WHEEL ARCH CUTOUTS — wide-body ───────────────────────
    for (const wx of [FWX, RWX]) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(wx, WCY, WR + 16, Math.PI, 0, false);
      ctx.lineTo(wx + WR + 16, CLR + 3);
      ctx.lineTo(wx - WR - 16, CLR + 3);
      ctx.closePath();
      ctx.fillStyle = '#030307';
      ctx.fill();
      ctx.restore();
    }

    // ── FENDER FLARE ARCHES ──────────────────────────────────
    for (const wx of [FWX, RWX]) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,212,255,0.44)';
      ctx.lineWidth   = 3.0;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = C_BLUE;
      ctx.beginPath();
      ctx.arc(wx, WCY, WR + 16, Math.PI * 1.06, 0, false);
      ctx.stroke();
      ctx.restore();
    }

    // ── SIDE SKIRT ───────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 8,  CLR + 1);
    ctx.bezierCurveTo(RWX + WR, CLR + 5, FWX - WR, CLR + 5, FWX + WR - 8, CLR + 1);
    ctx.lineTo(FWX + WR - 8,  CLR + 13);
    ctx.bezierCurveTo(FWX - WR, CLR + 13, RWX + WR, CLR + 13, RWX - WR + 8, CLR + 13);
    ctx.closePath();
    ctx.fillStyle   = '#06061a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Neon sill strip
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 10, CLR + 7);
    ctx.bezierCurveTo(RWX + WR, CLR + 8, FWX - WR, CLR + 8, FWX + WR - 10, CLR + 7);
    ctx.strokeStyle = `rgba(0,212,255,0.84)`;
    ctx.lineWidth   = 1.8;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = C_BLUE;
    ctx.stroke();
    ctx.restore();

    // ── WATCHMAN DOOR SILL INSCRIPTION ──────────────────────
    ctx.save();
    ctx.font         = `bold 8px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 10;
    ctx.shadowColor  = C_BLUE;
    ctx.fillStyle    = 'rgba(0,212,255,0.72)';
    ctx.fillText('WATCHMAN', (FWX + RWX) / 2, CLR + 7);
    ctx.restore();

    // ── BODY CHARACTER LINE ──────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 4;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 12, CLR - 52);
    ctx.bezierCurveTo(RWX + 20, CLR - 62, FWX - 18, CLR - 58, FWX + WR + 8, CLR - 46);
    ctx.stroke();
    ctx.restore();

    // Purple lower body accent stripe
    ctx.save();
    ctx.strokeStyle = 'rgba(144,0,255,0.58)';
    ctx.lineWidth   = 2.2;
    ctx.shadowBlur  = 9;
    ctx.shadowColor = C_PURPLE;
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 10, CLR - 18);
    ctx.bezierCurveTo(RWX + 28, CLR - 24, FWX - 22, CLR - 22, FWX + WR + 8, CLR - 14);
    ctx.stroke();
    ctx.restore();

    // ── WINDSHIELD — steeply raked R33 glass ─────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(FWX - 110, -130);
    ctx.lineTo(FWX - 116, -138);
    ctx.bezierCurveTo(
      FWX - 124, roofY + 76,
      FWX - 136, roofY + 48,
      FWX - 146, roofY + 26
    );
    ctx.lineTo(FWX - 152, roofY + 8);
    ctx.lineTo(-20, roofY + 4);
    ctx.lineTo(-18, roofY + 26);
    ctx.lineTo(-16, -142);
    ctx.closePath();
    const wsGrad = ctx.createLinearGradient(FWX - 152, roofY + 8, FWX - 110, -130);
    wsGrad.addColorStop(0, 'rgba(0,8,22,0.97)');
    wsGrad.addColorStop(1, 'rgba(0,5,14,0.97)');
    ctx.fillStyle = wsGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // KING OF KINGS windshield visor
    const bX = FWX - 136 + 18;
    const bY  = roofY + 56;
    ctx.font         = `bold 9px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 12;
    ctx.shadowColor  = C_BLUE;
    ctx.fillStyle    = 'rgba(0,212,255,0.90)';
    ctx.fillText('KING OF KINGS', bX, bY);

    // Ghost cross in glass
    ctx.globalAlpha  = 0.10;
    ctx.strokeStyle  = C_BLUE;
    ctx.lineWidth    = 2;
    ctx.lineCap      = 'round';
    ctx.shadowBlur   = 6;
    ctx.beginPath();
    ctx.moveTo(bX, bY + 14); ctx.lineTo(bX, bY + 32);
    ctx.moveTo(bX - 7, bY + 22); ctx.lineTo(bX + 7, bY + 22);
    ctx.stroke();
    ctx.restore();

    // ── REAR WINDOW — fastback dark glass ────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-18, roofY + 4);
    ctx.bezierCurveTo(
      RWX + 112, roofY,
      RWX +  92, roofY + 12,
      RWX +  72, roofY + 36
    );
    ctx.bezierCurveTo(
      RWX + 50, roofY + 72,
      RWX + 30, roofY + 108,
      RWX + 16, deckY - 24
    );
    ctx.bezierCurveTo(
      RWX + 28, deckY - 22,
      RWX + 46, roofY + 100,
      RWX + 62, roofY + 74
    );
    ctx.bezierCurveTo(
      RWX + 80, roofY + 44,
      RWX + 98, roofY + 18,
      -16, roofY + 2
    );
    ctx.closePath();
    ctx.fillStyle   = 'rgba(0,5,16,0.97)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();
    ctx.restore();

    // ── HOOD GOTHIC CROSS ────────────────────────────────────
    ctx.save();
    const hcx = FWX - 30;
    const hcy = -103;
    const cp  = 0.75 + Math.sin(t * 0.0024) * 0.25;

    ctx.shadowBlur  = 44 * cp;
    ctx.shadowColor = C_BLUE;
    ctx.strokeStyle = `rgba(0,212,255,${0.95 * cp})`;
    ctx.lineWidth   = 4.2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(hcx, hcy - 26); ctx.lineTo(hcx, hcy + 26);
    ctx.moveTo(hcx - 17, hcy - 10); ctx.lineTo(hcx + 17, hcy - 10);
    ctx.stroke();

    ctx.shadowBlur  = 20 * cp;
    ctx.strokeStyle = `rgba(180,242,255,${0.72 * cp})`;
    ctx.lineWidth   = 1.8;
    ctx.beginPath();
    ctx.moveTo(hcx, hcy - 26); ctx.lineTo(hcx, hcy + 26);
    ctx.moveTo(hcx - 17, hcy - 10); ctx.lineTo(hcx + 17, hcy - 10);
    ctx.stroke();

    ctx.lineWidth   = 1.8;
    ctx.globalAlpha = 0.62 * cp;
    ctx.strokeStyle = `rgba(0,212,255,${0.88 * cp})`;
    ctx.shadowBlur  = 12 * cp;
    const sk = 7;
    ctx.beginPath();
    ctx.moveTo(hcx - sk, hcy - 26); ctx.lineTo(hcx + sk, hcy - 26);
    ctx.moveTo(hcx - sk, hcy + 26); ctx.lineTo(hcx + sk, hcy + 26);
    ctx.moveTo(hcx - 17, hcy - 10 - sk); ctx.lineTo(hcx - 17, hcy - 10 + sk);
    ctx.moveTo(hcx + 17, hcy - 10 - sk); ctx.lineTo(hcx + 17, hcy - 10 + sk);
    ctx.stroke();
    ctx.restore();

    // ── HEADLIGHTS ───────────────────────────────────────────
    ctx.save();
    const hlP = 0.78 + Math.sin(t * 0.0035) * 0.22;
    ctx.shadowBlur  = 28 * hlP;
    ctx.shadowColor = C_BLUE;

    ctx.fillStyle   = '#07071a';
    ctx.strokeStyle = 'rgba(0,212,255,0.52)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 14, -50);
    ctx.lineTo(FWX + WR + 40, -54);
    ctx.lineTo(FWX + WR + 43, -78);
    ctx.lineTo(FWX + WR + 16, -74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const hlG = ctx.createLinearGradient(FWX + WR + 16, -74, FWX + WR + 40, -54);
    hlG.addColorStop(0,    `rgba(220,252,255,${hlP * 0.96})`);
    hlG.addColorStop(0.30, `rgba(0,212,255,${hlP * 0.90})`);
    hlG.addColorStop(1,    `rgba(0,130,220,${hlP * 0.65})`);
    ctx.fillStyle = hlG;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 15, -52);
    ctx.lineTo(FWX + WR + 39, -56);
    ctx.lineTo(FWX + WR + 41, -76);
    ctx.lineTo(FWX + WR + 17, -72);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = 'rgba(0,20,50,0.9)';
    ctx.lineWidth   = 1.6;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 28, -54);
    ctx.lineTo(FWX + WR + 28, -73);
    ctx.stroke();

    // Headlight beam
    ctx.globalAlpha = hlP * 0.28;
    const beamG = ctx.createLinearGradient(FWX + WR + 43, -64, FWX + WR + 150, -64);
    beamG.addColorStop(0, 'rgba(0,212,255,0.44)');
    beamG.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = beamG;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 43, -78);
    ctx.lineTo(FWX + WR + 150, -92);
    ctx.lineTo(FWX + WR + 150, -46);
    ctx.lineTo(FWX + WR + 43, -52);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // DRL strip
    ctx.shadowBlur  = 14 * hlP;
    ctx.shadowColor = C_BLUE;
    ctx.fillStyle   = `rgba(0,212,255,${0.72 * hlP})`;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(FWX + WR + 14, -27, 28, 8, 2);
    else                ctx.rect(FWX + WR + 14, -27, 28, 8);
    ctx.fill();
    ctx.restore();

    // ── FRONT BUMPER GRILLE ──────────────────────────────────
    ctx.save();
    ctx.fillStyle   = '#010108';
    ctx.strokeStyle = 'rgba(0,212,255,0.28)';
    ctx.lineWidth   = 0.8;
    ctx.shadowBlur  = 5;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 16, -34);
    ctx.lineTo(FWX + WR + 42, -37);
    ctx.lineTo(FWX + WR + 44, -58);
    ctx.lineTo(FWX + WR + 18, -55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,212,255,0.18)';
    ctx.lineWidth   = 0.6;
    for (let g = 0; g < 5; g++) {
      const gy = -40 - g * 4;
      ctx.beginPath();
      ctx.moveTo(FWX + WR + 17, gy);
      ctx.lineTo(FWX + WR + 42, gy - g * 0.4);
      ctx.stroke();
    }
    ctx.restore();

    // ── TAIL LIGHT CLUSTER — R33: 2×2 round lights ───────────
    const tlHX = RWX - WR - 32;
    ctx.save();
    ctx.fillStyle   = '#070010';
    ctx.strokeStyle = 'rgba(255,20,50,0.45)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.rect(tlHX, -82, 20, 60);
    ctx.fill();
    ctx.stroke();

    const tlPos = [
      { x: tlHX +  5, y: -72, r: 5.5 },
      { x: tlHX + 15, y: -72, r: 5.5 },
      { x: tlHX +  5, y: -52, r: 5.5 },
      { x: tlHX + 15, y: -52, r: 5.5 },
    ];
    ctx.shadowBlur  = 18;
    ctx.shadowColor = C_RED;
    for (const tl of tlPos) {
      const g = ctx.createRadialGradient(tl.x, tl.y, 0, tl.x, tl.y, tl.r);
      g.addColorStop(0,   'rgba(255,220,220,0.96)');
      g.addColorStop(0.4, 'rgba(255,28,55,0.92)');
      g.addColorStop(1,   'rgba(160,0,25,0.55)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(tl.x, tl.y, tl.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,30,55,0.30)';
    ctx.lineWidth   = 0.7;
    ctx.shadowBlur  = 0;
    ctx.beginPath();
    ctx.moveTo(tlHX + 10, -82); ctx.lineTo(tlHX + 10, -22);
    ctx.moveTo(tlHX, -62);      ctx.lineTo(tlHX + 20, -62);
    ctx.stroke();
    ctx.restore();

    if (reversing) {
      ctx.save();
      ctx.shadowBlur  = 20;
      ctx.shadowColor = '#ff4466';
      ctx.fillStyle   = 'rgba(255,70,90,0.88)';
      ctx.beginPath();
      ctx.arc(tlHX + 10, -36, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── REAR WING — tall R33 GT-R signature ──────────────────
    // Struts rise 62px above deck to reach roofline height
    ctx.save();

    // Wing struts
    ctx.strokeStyle = '#10102a';
    ctx.lineWidth   = 6.5;
    ctx.lineCap     = 'round';
    ctx.shadowBlur  = 5;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(strutFX, deckY);    ctx.lineTo(strutFX - 3, wingY + 8);
    ctx.moveTo(strutRX, deckY);    ctx.lineTo(strutRX + 3, wingY + 8);
    ctx.stroke();

    // Wing blade — long, wide, slightly angled
    const wG = ctx.createLinearGradient(wingFX, wingY, wingRX, wingY);
    wG.addColorStop(0,   '#1c1c3e');
    wG.addColorStop(0.5, '#2a2a5e');
    wG.addColorStop(1,   '#141428');
    ctx.fillStyle   = wG;
    ctx.strokeStyle = 'rgba(0,212,255,0.68)';
    ctx.lineWidth   = 1.6;
    ctx.shadowBlur  = 18;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(wingFX, wingY - 6);
    ctx.lineTo(wingRX, wingY + 4);
    ctx.lineTo(wingRX, wingY + 14);
    ctx.lineTo(wingFX, wingY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neon trailing-edge underside
    ctx.strokeStyle = 'rgba(0,212,255,0.92)';
    ctx.lineWidth   = 2.0;
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.moveTo(wingFX, wingY + 4);
    ctx.lineTo(wingRX, wingY + 14);
    ctx.stroke();

    // End plates
    for (const ex of [wingFX, wingRX]) {
      ctx.strokeStyle = 'rgba(0,212,255,0.55)';
      ctx.lineWidth   = 1.4;
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.moveTo(ex, wingY - 8);
      ctx.lineTo(ex, wingY + 20);
      ctx.stroke();
    }
    ctx.restore();

    // ── TWIN NEON EXHAUST TIPS ───────────────────────────────
    ctx.save();
    const ep  = 0.62 + Math.sin(t * 0.005) * 0.35 + intensity * 0.52;
    const exX = RWX - WR - 28;
    for (let i = 0; i < 2; i++) {
      const ey = -16 - i * 20;
      ctx.fillStyle = '#0a0a1e';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(exX - 4, ey - 7, 22, 14, 3);
      else                ctx.rect(exX - 4, ey - 7, 22, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,212,255,0.58)';
      ctx.lineWidth   = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#040410';
      ctx.beginPath();
      ctx.arc(exX + 4, ey, 5.5, 0, Math.PI * 2);
      ctx.fill();

      const eg = ctx.createRadialGradient(exX + 4, ey, 0, exX + 4, ey, 26);
      eg.addColorStop(0,    `rgba(0,212,255,${ep})`);
      eg.addColorStop(0.35, `rgba(0,140,255,${ep * 0.54})`);
      eg.addColorStop(0.7,  `rgba(0,40,100,${ep * 0.22})`);
      eg.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle   = eg;
      ctx.shadowBlur  = 34 * ep;
      ctx.shadowColor = C_BLUE;
      ctx.beginPath();
      ctx.arc(exX + 4, ey, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── LICENSE PLATE — EZK 33:6 ─────────────────────────────
    ctx.save();
    const px = RWX - WR + 10;
    const py = -46;
    ctx.fillStyle   = 'rgba(4,4,16,0.98)';
    ctx.strokeStyle = 'rgba(0,212,255,0.68)';
    ctx.lineWidth   = 1.0;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px - 28, py - 10, 56, 20, 2);
    else                ctx.rect(px - 28, py - 10, 56, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle    = C_BLUE;
    ctx.font         = `bold 8px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EZK 33:6', px, py);
    ctx.restore();

    // ── DEEP-DISH 5-SPOKE WHEELS ─────────────────────────────
    const wheels = [
      { x: FWX, spin: tireA,  wobble: 0 },
      { x: RWX, spin: tireA,  wobble: state === S.BURNOUT ? Math.sin(t * 0.012) * 0.4 : 0 }
    ];

    for (const w of wheels) {
      ctx.save();
      ctx.translate(w.x, WCY);

      ctx.beginPath();
      ctx.arc(0, 0, WR + 17, Math.PI, 0);
      ctx.lineTo(WR + 17,  CLR - WCY + 3);
      ctx.lineTo(-WR - 17, CLR - WCY + 3);
      ctx.closePath();
      ctx.fillStyle = '#020206';
      ctx.fill();

      // Tire
      ctx.beginPath();
      ctx.arc(0, 0, WR, 0, Math.PI * 2);
      ctx.fillStyle   = '#0a0a12';
      ctx.fill();
      ctx.strokeStyle = '#181826';
      ctx.lineWidth   = 4;
      ctx.stroke();

      ctx.save();
      ctx.rotate(w.spin + w.wobble);

      const barrelG = ctx.createRadialGradient(0, 0, WR - 12, 0, 0, WR - 1);
      barrelG.addColorStop(0, 'rgba(0,30,60,0.75)');
      barrelG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(0, 0, WR - 1, 0, Math.PI * 2);
      ctx.fillStyle = barrelG;
      ctx.fill();

      const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, WR - 3);
      rg.addColorStop(0,    '#282852');
      rg.addColorStop(0.55, '#18183a');
      rg.addColorStop(1,    '#0c0c20');
      ctx.beginPath();
      ctx.arc(0, 0, WR - 4, 0, Math.PI * 2);
      ctx.fillStyle = rg;
      ctx.fill();

      ctx.globalAlpha = 0.60;
      ctx.strokeStyle = 'rgba(0,212,255,0.52)';
      ctx.lineWidth   = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, WR - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 5-spoke design
      ctx.shadowBlur  = 14;
      ctx.shadowColor = C_BLUE;
      ctx.strokeStyle = 'rgba(0,212,255,0.92)';
      ctx.lineWidth   = 3.6;
      ctx.lineCap     = 'round';
      for (let sp = 0; sp < 5; sp++) {
        const a = sp * Math.PI * 0.4 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 7,        Math.sin(a) * 7);
        ctx.lineTo(Math.cos(a) * (WR - 7), Math.sin(a) * (WR - 7));
        ctx.stroke();
      }

      ctx.globalAlpha = 0.55;
      ctx.lineWidth   = 1.8;
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(0, 0, WR - 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Gothic cross center cap
      ctx.save();
      ctx.shadowBlur  = 20;
      ctx.shadowColor = C_BLUE;
      ctx.strokeStyle = 'rgba(0,212,255,0.97)';
      ctx.lineWidth   = 2.0;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -7);  ctx.lineTo(0, 7);
      ctx.moveTo(-5, -2); ctx.lineTo(5, -2);
      ctx.stroke();
      ctx.lineWidth   = 1.2;
      ctx.globalAlpha = 0.65;
      const hs = 2.5;
      ctx.beginPath();
      ctx.moveTo(-hs, -7);  ctx.lineTo(hs, -7);
      ctx.moveTo(-hs,  7);  ctx.lineTo(hs,  7);
      ctx.moveTo(-5, -2 - hs); ctx.lineTo(-5, -2 + hs);
      ctx.moveTo( 5, -2 - hs); ctx.lineTo( 5, -2 + hs);
      ctx.stroke();
      ctx.restore();

      if (intensity > 0.2) {
        ctx.save();
        ctx.globalAlpha = intensity * 0.42;
        ctx.shadowBlur  = 28 * intensity;
        ctx.shadowColor = C_BLUE;
        ctx.strokeStyle = C_BLUE;
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, WR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    // ── LAUNCH MOTION BLUR ───────────────────────────────────
    if (launch > 0.05) {
      ctx.save();
      ctx.globalAlpha = launch * 0.45;
      const sg = ctx.createLinearGradient(-320, 0, 0, 0);
      sg.addColorStop(0,    'rgba(0,212,255,0)');
      sg.addColorStop(0.55, `rgba(0,212,255,${launch * 0.36})`);
      sg.addColorStop(1,    `rgba(144,0,255,${launch * 0.55})`);
      ctx.fillStyle = sg;
      for (let s = 0; s < 8; s++) {
        const sy   = (Math.random() - 0.5) * 200;
        const sh   = 2 + Math.random() * 5;
        const sLen = 120 + Math.random() * 170;
        ctx.fillRect(-320, sy - sh / 2, sLen, sh);
      }
      ctx.restore();
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
        state         = S.LAUNCHING;
        launchProgress = 0;
        launchStartX  = carX;
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

    const spinRate = state === S.IDLE      ? 0.008
                   : state === S.BUILDING  ? 0.02 + intensity * 0.14
                   : state === S.BURNOUT   ? 0.28
                   : state === S.LAUNCHING ? 0.4 * (1 - launchProgress * 0.5)
                   : 0;
    tireAngle += spinRate * dt;

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

    // Tire marks from rear wheel only
    if ((state === S.BURNOUT || (state === S.BUILDING && intensity > 0.55)) && !isMobile) {
      marks.push(carX + CAR_SCALE * (RWX - WR));
      if (marks.length > 220) marks.shift();
    }
    if (state === S.GONE) markOpacity = Math.max(0, markOpacity - 0.0008 * dt);

    // Smoke from rear tire ground contact only
    const rwX       = carX + CAR_SCALE * RWX;
    const rwContact = groundY;
    if (state === S.IDLE && !isMobile && Math.random() < 0.04) {
      emitSmoke(rwX, rwContact - 6, 1, 0.15);
    } else if (state === S.BUILDING) {
      emitSmoke(rwX, rwContact - 4, Math.max(2, Math.floor(intensity * 8)), intensity);
    } else if (state === S.BURNOUT) {
      emitSmoke(rwX - 18, rwContact - 2, 7, 2.0);
      emitSmoke(rwX,      rwContact,     5, 1.8);
      emitSmoke(rwX + 12, rwContact - 4, 3, 1.6);
    } else if (state === S.LAUNCHING) {
      emitSmoke(rwX - 8, rwContact - 2, 8, 1.4);
    }

    // Render
    drawStoneBg();
    drawRoad();

    for (let i = particles.length - 1; i >= 0; i--) {
      if (!particles[i].update(dt)) particles.splice(i, 1);
      else particles[i].draw(ctx);
    }

    drawMarks();
    drawBurnoutCloud();

    if (state !== S.GONE) {
      drawCar(carX, groundY, tireAngle, shakeX, shakeY, intensity, isUp,
              state === S.LAUNCHING ? launchProgress : 0);
    }

    // Launch light trail
    if (state === S.LAUNCHING && launchProgress > 0.1) {
      const trailX = carX - W * 0.05;
      const trail  = ctx.createLinearGradient(0, groundY - 42, trailX, groundY - 42);
      trail.addColorStop(0,   'rgba(0,212,255,0)');
      trail.addColorStop(0.7, `rgba(0,212,255,${launchProgress * 0.26})`);
      trail.addColorStop(1,   `rgba(144,0,255,${launchProgress * 0.38})`);
      ctx.fillStyle = trail;
      ctx.fillRect(0, groundY - 58, trailX, 32);
    }
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
