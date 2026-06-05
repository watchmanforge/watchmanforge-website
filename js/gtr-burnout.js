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

  // ── R33 canonical dimensions (pre-scale) ──────────────────
  // Origin: ground level at car center. Y negative = upward.
  const FWX =  120;  // front wheel center X
  const RWX = -145;  // rear wheel center X
  const WR  =   40;  // wheel radius
  const WCY = -WR;   // wheel center Y = -40
  const CLR = WCY - WR + 4;   // sill underside = -76
  const roofH = 162;
  const roofY = CLR - roofH;  // = -238

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

  let lastScrollY    = window.scrollY;
  let lastScrollT    = performance.now();
  let rawVelocity    = 0;
  let smoothVelocity = 0;

  // ── Resize ─────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = sticky.clientWidth;
    H = canvas.height = sticky.clientHeight;
    groundY = H * 0.70;
    carX = W * (isMobile ? 0.38 : 0.36);
    launchStartX = carX;
  }

  // ── Scroll depth (0→1) ─────────────────────────────────────
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
      this.x = x + (Math.random() - 0.5) * 24;
      this.y = y;
      const speed = (0.6 + Math.random() * 0.8) * Math.max(intensity, 0.3);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      this.vx   = Math.cos(angle) * speed;
      this.vy   = Math.sin(angle) * speed;
      this.r    = 6 + Math.random() * 10 * intensity;
      this.maxR = this.r * (3 + Math.random() * 3);
      this.life  = 1;
      this.decay = 0.006 + Math.random() * 0.009 / Math.max(intensity, 0.2);
      this.grow  = 0.35 + Math.random() * 0.25;
      const rng = Math.random();
      if      (rng < 0.25) this.type = 'blue';
      else if (rng < 0.40) this.type = 'purple';
      else                  this.type = 'dark';
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

  function emitSmoke(x, y, count, intensity) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, intensity));
    while (particles.length > 700) particles.shift();
  }

  // ── Background ─────────────────────────────────────────────
  function drawBg() {
    ctx.fillStyle = C_VOID;
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,8,0.68)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Road: gothic stone + neon grid ─────────────────────────
  function drawRoad() {
    // Dark stone base — cool blue-black gradient
    const asp = ctx.createLinearGradient(0, groundY, 0, H);
    asp.addColorStop(0,   '#0d0d20');
    asp.addColorStop(0.4, '#070710');
    asp.addColorStop(1,   '#030309');
    ctx.fillStyle = asp;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Gothic stone cobblestone texture — subtle mortar lines
    ctx.save();
    const rowH = 30;
    const rows = Math.ceil((H - groundY) / rowH);
    for (let r = 1; r < rows; r++) {
      const y    = groundY + r * rowH;
      const fade = 1 - (r / rows) * 0.8;
      ctx.strokeStyle = `rgba(0,212,255,${0.06 * fade})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Staggered vertical joints (every other row offset)
    const colW = 64;
    const cols = Math.ceil(W / colW) + 1;
    for (let r = 0; r < rows; r++) {
      const y0   = groundY + r * rowH;
      const y1   = y0 + rowH;
      const fade = 1 - (r / rows) * 0.9;
      const off  = (r % 2 === 0) ? 0 : colW * 0.5;
      ctx.strokeStyle = `rgba(0,212,255,${0.03 * fade})`;
      ctx.lineWidth = 0.4;
      for (let c = 0; c < cols; c++) {
        const x = c * colW + off;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      }
    }
    ctx.restore();

    // Ground horizon glow line
    ctx.save();
    ctx.shadowBlur  = 24;
    ctx.shadowColor = C_BLUE;
    ctx.strokeStyle = 'rgba(0,212,255,0.80)';
    ctx.lineWidth   = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
    ctx.restore();

    // Perspective neon grid
    const vpX = W * 0.5;
    ctx.save();

    // Horizontal receding lines — much more visible than before
    for (let i = 1; i <= 9; i++) {
      const frac  = i / 9;
      const y     = groundY + frac * (H - groundY);
      const alpha = (1 - frac * 0.65) * 0.42;
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth   = frac < 0.3 ? 1.2 : 0.8;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Converging vertical lines toward horizon
    const numV = 22;
    for (let i = 0; i <= numV; i++) {
      const frac   = i / numV;
      const xBot   = frac * W;
      const xTop   = vpX + (xBot - vpX) * 0.06;
      const isMaj  = (i % 4 === 0);
      ctx.strokeStyle = isMaj
        ? `rgba(0,212,255,0.28)`
        : `rgba(100,0,255,0.10)`;
      ctx.lineWidth = isMaj ? 0.9 : 0.4;
      if (isMaj) { ctx.shadowBlur = 5; ctx.shadowColor = C_BLUE; }
      else        { ctx.shadowBlur = 0; }
      ctx.beginPath();
      ctx.moveTo(xTop, groundY);
      ctx.lineTo(xBot, H);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Underglow reflection pool
    const refl = ctx.createLinearGradient(0, groundY, 0, groundY + 100);
    refl.addColorStop(0, 'rgba(0,212,255,0.07)');
    refl.addColorStop(1, 'rgba(144,0,255,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(0, groundY, W, 100);
  }

  // ── Tire marks ─────────────────────────────────────────────
  function drawMarks() {
    if (marks.length < 3) return;
    ctx.save();
    const alpha = markOpacity * 0.65;
    for (const off of [-12, 12]) {
      ctx.beginPath();
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (i === 0) ctx.moveTo(m, groundY + off);
        else         ctx.lineTo(m, groundY + off);
      }
      ctx.strokeStyle = `rgba(15,30,50,${alpha})`;
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
      ctx.strokeStyle = `rgba(0,212,255,${alpha * 0.30})`;
      ctx.lineWidth   = 20;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Car: R33 Skyline GT-R precise side profile ─────────────
  function drawCar(cx, baseY, tireA, shX, shY, intensity, reversing, launch) {
    ctx.save();
    ctx.translate(cx + shX, baseY + shY);
    ctx.scale(CAR_SCALE, CAR_SCALE);

    const t = Date.now();

    // ── UNDERGLOW POOL ─────────────────────────────────────
    const bP = 0.08 + Math.sin(t * 0.003) * 0.04 + intensity * 0.14;
    const pP = 0.05 + Math.sin(t * 0.002 + 1.2) * 0.03 + intensity * 0.08;
    const ug = ctx.createRadialGradient(-8, CLR + 6, 0, -8, CLR + 16, 275);
    ug.addColorStop(0,    `rgba(0,212,255,${bP})`);
    ug.addColorStop(0.42, `rgba(144,0,255,${pP})`);
    ug.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = ug;
    ctx.beginPath();
    ctx.ellipse(-8, CLR + 16, 260, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── MAIN BODY PATH (R33 GTR clockwise from front-bottom) ─
    const bodyGrad = ctx.createLinearGradient(RWX - 90, roofY, FWX + 90, CLR);
    bodyGrad.addColorStop(0,    '#1e1e38');
    bodyGrad.addColorStop(0.28, '#14142a');
    bodyGrad.addColorStop(0.62, '#0e0e1e');
    bodyGrad.addColorStop(1,    '#080816');

    ctx.beginPath();

    // Front bumper base
    ctx.moveTo(FWX + WR + 20, -5);

    // Chin spoiler — juts forward, R33 characteristic lower air dam
    ctx.bezierCurveTo(
      FWX + WR + 30, -5,
      FWX + WR + 42, -9,
      FWX + WR + 44, -18   // chin tip (extreme front of car)
    );
    ctx.bezierCurveTo(
      FWX + WR + 46, -30,
      FWX + WR + 44, -42,
      FWX + WR + 42, -54   // lower grille zone
    );

    // Bumper face going up (slightly angled inward at top)
    ctx.lineTo(FWX + WR + 40, -72);

    // Bumper top corner — rounded transition to hood underside
    ctx.bezierCurveTo(
      FWX + WR + 36, -80,
      FWX + WR + 22, -82,
      FWX + WR + 12, -82   // bumper/hood seam
    );

    // Hood leading edge — front of hood panel
    ctx.bezierCurveTo(
      FWX + WR + 2,  -80,
      FWX + 26,      -82,
      FWX + 14,      -86   // hood surface starts here
    );

    // Hood surface — R33 has gentle power dome
    ctx.bezierCurveTo(
      FWX - 8,   -92,
      FWX - 32,  -98,
      FWX - 50, -104        // hood mid-crown
    );

    // Hood toward windshield cowl — slight additional rise
    ctx.bezierCurveTo(
      FWX - 64, -110,
      FWX - 76, -120,
      FWX - 84, -128        // cowl / windshield lower front
    );

    // Cowl detail
    ctx.lineTo(FWX - 90, -136);

    // A-pillar — steep (~60° from horizontal), characteristic R33
    ctx.bezierCurveTo(
      FWX -  98, roofY + 82,
      FWX - 112, roofY + 54,
      FWX - 122, roofY + 32
    );
    ctx.lineTo(FWX - 130, roofY + 12);

    // Roof header front edge
    ctx.bezierCurveTo(
      FWX - 140, roofY + 3,
      FWX - 154, roofY,
      -22,        roofY       // roof begins (nearly flat)
    );

    // Roof continues rearward — very slight crown
    ctx.bezierCurveTo(
      RWX + 108, roofY,
      RWX +  88, roofY +  8,
      RWX +  68, roofY + 30   // C-pillar starts
    );

    // Fastback C-pillar — smooth sweep down
    ctx.bezierCurveTo(
      RWX + 48, roofY + 62,
      RWX + 28, roofY + 100,
      RWX + 12, roofY + 130   // trunk lid start
    );

    // Trunk lid (short on R33)
    ctx.bezierCurveTo(
      RWX +  4, CLR - 42,
      RWX -  4, CLR - 38,
      RWX - 12, CLR - 34
    );

    // Ducktail — slight integral uptick (R33 GT-R gurney flap base)
    ctx.lineTo(RWX - 16, CLR - 42);   // kick up
    ctx.lineTo(RWX - 24, CLR - 38);   // ducktail tip
    ctx.lineTo(RWX - 26, CLR - 26);   // back down to rear panel

    // Rear panel (nearly vertical)
    ctx.bezierCurveTo(
      RWX - WR +  2, CLR - 20,
      RWX - WR -  6, CLR - 12,
      RWX - WR - 12, -80          // top of rear bumper
    );

    // Rear bumper — stepped, slight undercut at base
    ctx.bezierCurveTo(
      RWX - WR - 24, -66,
      RWX - WR - 34, -44,
      RWX - WR - 34, -22
    );
    ctx.bezierCurveTo(
      RWX - WR - 34, -12,
      RWX - WR - 24,  -4,
      RWX - WR - 12,  -3   // rear bumper base
    );

    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.35)';
    ctx.lineWidth   = 1.4;
    ctx.stroke();

    // ── WHEEL ARCH CUTOUTS ──────────────────────────────────
    // Overpaint with floor color to create arch openings
    for (const wx of [FWX, RWX]) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(wx, WCY, WR + 13, Math.PI, 0, false);
      ctx.lineTo(wx + WR + 13, CLR + 3);
      ctx.lineTo(wx - WR - 13, CLR + 3);
      ctx.closePath();
      ctx.fillStyle = '#040409';
      ctx.fill();
      ctx.restore();
    }

    // ── FENDER FLARE ARCHES (R33 wide-body) ────────────────
    for (const wx of [FWX, RWX]) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,212,255,0.38)';
      ctx.lineWidth   = 2.2;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = C_BLUE;
      ctx.beginPath();
      ctx.arc(wx, WCY, WR + 13, Math.PI * 1.06, 0, false);
      ctx.stroke();
      ctx.restore();
    }

    // ── SIDE SKIRT ──────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 8,  CLR + 1);
    ctx.bezierCurveTo(RWX + WR, CLR + 5, FWX - WR, CLR + 5, FWX + WR - 8, CLR + 1);
    ctx.lineTo(FWX + WR - 8,  CLR + 13);
    ctx.bezierCurveTo(FWX - WR, CLR + 13, RWX + WR, CLR + 13, RWX - WR + 8, CLR + 13);
    ctx.closePath();
    ctx.fillStyle   = '#09091c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Purple neon skirt strip
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 10, CLR + 7);
    ctx.bezierCurveTo(RWX + WR, CLR + 8, FWX - WR, CLR + 8, FWX + WR - 10, CLR + 7);
    ctx.strokeStyle = `rgba(144,0,255,0.72)`;
    ctx.lineWidth   = 1.8;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = C_PURPLE;
    ctx.stroke();
    ctx.restore();

    // ── BODY CHARACTER LINE (door crease) ───────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 4;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 12, CLR - 50);
    ctx.bezierCurveTo(RWX + 20, CLR - 60, FWX - 18, CLR - 56, FWX + WR + 8, CLR - 44);
    ctx.stroke();
    ctx.restore();

    // Purple lower body accent stripe
    ctx.save();
    ctx.strokeStyle = 'rgba(144,0,255,0.58)';
    ctx.lineWidth   = 2.2;
    ctx.shadowBlur  = 9;
    ctx.shadowColor = C_PURPLE;
    ctx.beginPath();
    ctx.moveTo(RWX - WR + 10, CLR - 16);
    ctx.bezierCurveTo(RWX + 28, CLR - 22, FWX - 22, CLR - 20, FWX + WR + 8, CLR - 12);
    ctx.stroke();
    ctx.restore();

    // ── WINDSHIELD GLASS ────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    // Outer edge follows body path A-pillar
    ctx.moveTo(FWX - 80, -128);
    ctx.lineTo(FWX - 90, -136);
    ctx.bezierCurveTo(
      FWX -  98, roofY + 82,
      FWX - 112, roofY + 54,
      FWX - 122, roofY + 32
    );
    ctx.lineTo(FWX - 130, roofY + 12);
    // Inner return — B-pillar inner edge going back down
    ctx.lineTo(-24, roofY + 4);
    ctx.lineTo(-22, -140);
    ctx.closePath();
    const wsGrad = ctx.createLinearGradient(FWX - 130, roofY + 12, FWX - 80, -128);
    wsGrad.addColorStop(0, 'rgba(0,55,115,0.90)');
    wsGrad.addColorStop(1, 'rgba(0,28,70,0.80)');
    ctx.fillStyle = wsGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // KING OF KINGS windshield visor banner
    const bX = FWX - 116 + 14;
    const bY  = roofY + 52;
    ctx.font         = `bold 9px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 11;
    ctx.shadowColor  = C_BLUE;
    ctx.fillStyle    = 'rgba(0,212,255,0.88)';
    ctx.fillText('KING OF KINGS', bX, bY);

    // Ghost cross reflection
    ctx.globalAlpha  = 0.14;
    ctx.strokeStyle  = C_BLUE;
    ctx.lineWidth    = 2;
    ctx.lineCap      = 'round';
    ctx.beginPath();
    ctx.moveTo(bX, bY + 14); ctx.lineTo(bX, bY + 32);
    ctx.moveTo(bX - 7, bY + 22); ctx.lineTo(bX + 7, bY + 22);
    ctx.stroke();
    ctx.restore();

    // ── REAR WINDOW (fastback glass) ────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-22, roofY + 4);          // B-pillar inner top (matches ws closure)
    ctx.bezierCurveTo(
      RWX + 108, roofY,
      RWX +  88, roofY + 10,
      RWX +  68, roofY + 32
    );
    ctx.bezierCurveTo(
      RWX +  48, roofY + 62,
      RWX +  30, roofY + 98,
      RWX +  18, CLR - 38
    );
    // Return along inside of C-pillar
    ctx.bezierCurveTo(
      RWX +  28, CLR - 36,
      RWX +  44, roofY + 94,
      RWX +  58, roofY + 70
    );
    ctx.bezierCurveTo(
      RWX +  76, roofY + 40,
      RWX +  94, roofY + 16,
      -20, roofY + 2
    );
    ctx.closePath();
    ctx.fillStyle   = 'rgba(0,14,34,0.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();
    ctx.restore();

    // ── HOOD GOTHIC CROSS ───────────────────────────────────
    ctx.save();
    const hcx = FWX + 22;
    const hcy = CLR - 40;
    const cp  = 0.7 + Math.sin(t * 0.0024) * 0.3;
    ctx.shadowBlur  = 26 * cp;
    ctx.shadowColor = C_BLUE;
    ctx.strokeStyle = `rgba(0,212,255,${0.92 * cp})`;
    ctx.lineWidth   = 3.8;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(hcx, hcy - 30); ctx.lineTo(hcx, hcy + 30);
    ctx.moveTo(hcx - 19, hcy - 9); ctx.lineTo(hcx + 19, hcy - 9);
    ctx.stroke();
    // Gothic serifs
    ctx.lineWidth   = 1.6;
    ctx.globalAlpha = 0.55 * cp;
    const sk = 6;
    ctx.beginPath();
    ctx.moveTo(hcx - sk, hcy - 30); ctx.lineTo(hcx + sk, hcy - 30);
    ctx.moveTo(hcx - sk, hcy + 30); ctx.lineTo(hcx + sk, hcy + 30);
    ctx.moveTo(hcx - 19, hcy - 9 - sk); ctx.lineTo(hcx - 19, hcy - 9 + sk);
    ctx.moveTo(hcx + 19, hcy - 9 - sk); ctx.lineTo(hcx + 19, hcy - 9 + sk);
    ctx.stroke();
    ctx.restore();

    // ── HEADLIGHTS (R33 rectangular fixed-mount) ───────────
    ctx.save();
    const hlP = 0.78 + Math.sin(t * 0.0035) * 0.22;
    ctx.shadowBlur  = 28 * hlP;
    ctx.shadowColor = C_BLUE;

    // Housing bezel (dark frame)
    ctx.fillStyle   = '#09091c';
    ctx.strokeStyle = 'rgba(0,212,255,0.50)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 12, -48);
    ctx.lineTo(FWX + WR + 38, -52);
    ctx.lineTo(FWX + WR + 40, -76);
    ctx.lineTo(FWX + WR + 14, -72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lens (bright gradient)
    const hlG = ctx.createLinearGradient(FWX + WR + 14, -72, FWX + WR + 38, -52);
    hlG.addColorStop(0,    `rgba(220,252,255,${hlP * 0.96})`);
    hlG.addColorStop(0.30, `rgba(0,212,255,${hlP * 0.90})`);
    hlG.addColorStop(1,    `rgba(0,130,220,${hlP * 0.65})`);
    ctx.fillStyle = hlG;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 15, -51);
    ctx.lineTo(FWX + WR + 37, -54);
    ctx.lineTo(FWX + WR + 38, -74);
    ctx.lineTo(FWX + WR + 16, -71);
    ctx.closePath();
    ctx.fill();

    // Dual-bulb divider
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = 'rgba(0,20,50,0.9)';
    ctx.lineWidth   = 1.6;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 27, -52);
    ctx.lineTo(FWX + WR + 27, -71);
    ctx.stroke();

    // Light beam projection
    ctx.globalAlpha = hlP * 0.28;
    const beamG = ctx.createLinearGradient(FWX + WR + 40, -62, FWX + WR + 148, -62);
    beamG.addColorStop(0, 'rgba(0,212,255,0.42)');
    beamG.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = beamG;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 40, -76);
    ctx.lineTo(FWX + WR + 148, -88);
    ctx.lineTo(FWX + WR + 148, -44);
    ctx.lineTo(FWX + WR + 40, -50);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Fog/DRL strip (lower bumper)
    ctx.shadowBlur  = 14 * hlP;
    ctx.shadowColor = C_BLUE;
    ctx.fillStyle   = `rgba(0,212,255,${0.72 * hlP})`;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(FWX + WR + 12, -25, 26, 8, 2);
    else                ctx.rect(FWX + WR + 12, -25, 26, 8);
    ctx.fill();
    ctx.restore();

    // ── FRONT BUMPER GRILLE OPENING ─────────────────────────
    ctx.save();
    ctx.fillStyle   = '#010108';
    ctx.strokeStyle = 'rgba(0,212,255,0.28)';
    ctx.lineWidth   = 0.8;
    ctx.shadowBlur  = 5;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(FWX + WR + 14, -32);
    ctx.lineTo(FWX + WR + 40, -35);
    ctx.lineTo(FWX + WR + 42, -56);
    ctx.lineTo(FWX + WR + 16, -53);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Grille bars
    ctx.strokeStyle = 'rgba(0,212,255,0.18)';
    ctx.lineWidth   = 0.6;
    for (let g = 0; g < 5; g++) {
      const gy = -38 - g * 4;
      ctx.beginPath();
      ctx.moveTo(FWX + WR + 15, gy);
      ctx.lineTo(FWX + WR + 40, gy - g * 0.4);
      ctx.stroke();
    }
    ctx.restore();

    // ── TAIL LIGHT CLUSTER (R33: 2×2 round lights) ──────────
    const tlHX = RWX - WR - 30;
    ctx.save();
    ctx.fillStyle   = '#070010';
    ctx.strokeStyle = 'rgba(255,20,50,0.45)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.rect(tlHX, -80, 20, 56);
    ctx.fill();
    ctx.stroke();

    const tlPos = [
      { x: tlHX +  5, y: -70, r: 5 },
      { x: tlHX + 15, y: -70, r: 5 },
      { x: tlHX +  5, y: -52, r: 5 },
      { x: tlHX + 15, y: -52, r: 5 },
    ];
    ctx.shadowBlur  = 16;
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

    // Divider lines in housing
    ctx.strokeStyle = 'rgba(255,30,55,0.30)';
    ctx.lineWidth   = 0.7;
    ctx.shadowBlur  = 0;
    ctx.beginPath();
    ctx.moveTo(tlHX + 10, -80); ctx.lineTo(tlHX + 10, -24);
    ctx.moveTo(tlHX, -61);      ctx.lineTo(tlHX + 20, -61);
    ctx.stroke();
    ctx.restore();

    // ── REVERSE LIGHTS ──────────────────────────────────────
    if (reversing) {
      ctx.save();
      ctx.shadowBlur  = 20;
      ctx.shadowColor = '#ff4466';
      ctx.fillStyle   = 'rgba(255,70,90,0.88)';
      ctx.beginPath();
      ctx.arc(tlHX + 10, -34, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── REAR WING (R33 GT-R signature tall adjustable wing) ──
    // The BCNR33's most recognizable feature after the round tail-lights: a wide
    // blade standing on two uprights well above the bootlid, with a rear endplate.
    ctx.save();
    const deckY   = CLR - 38;     // bootlid surface (~ -114)
    const wingY   = roofY + 64;   // blade height — tall, just below roofline (~ -174)
    const wingFX  = RWX + 24;     // blade front edge (toward cabin)
    const wingRX  = RWX - 64;     // blade rear edge (past the tail)
    const strutFX = RWX + 6;      // front upright
    const strutRX = RWX - 40;     // rear upright

    // Two mounting uprights from deck up to the blade
    ctx.strokeStyle = '#15152a';
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'round';
    ctx.shadowBlur  = 4;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(strutFX, deckY); ctx.lineTo(strutFX - 2, wingY + 7);
    ctx.moveTo(strutRX, deckY); ctx.lineTo(strutRX + 2, wingY + 7);
    ctx.stroke();

    // Wing blade — wide, with a slight downward rake toward the rear
    const wG = ctx.createLinearGradient(wingFX, wingY, wingRX, wingY);
    wG.addColorStop(0,   '#23234a');
    wG.addColorStop(0.5, '#33336a');
    wG.addColorStop(1,   '#1a1a32');
    ctx.fillStyle   = wG;
    ctx.strokeStyle = 'rgba(0,212,255,0.60)';
    ctx.lineWidth   = 1.2;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = C_BLUE;
    ctx.beginPath();
    ctx.moveTo(wingFX, wingY - 6);
    ctx.lineTo(wingRX, wingY + 2);   // top edge rakes down to the rear
    ctx.lineTo(wingRX, wingY + 11);
    ctx.lineTo(wingFX, wingY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neon trailing-edge highlight along the blade underside
    ctx.strokeStyle = 'rgba(0,212,255,0.85)';
    ctx.lineWidth   = 1.6;
    ctx.beginPath();
    ctx.moveTo(wingFX, wingY + 3);
    ctx.lineTo(wingRX, wingY + 11);
    ctx.stroke();

    // Rear endplate
    ctx.strokeStyle = 'rgba(0,212,255,0.55)';
    ctx.lineWidth   = 1.4;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(wingRX - 1, wingY - 7);
    ctx.lineTo(wingRX - 1, wingY + 18);
    ctx.stroke();
    ctx.restore();

    // ── DUAL CENTER EXHAUSTS ────────────────────────────────
    ctx.save();
    const ep    = 0.55 + Math.sin(t * 0.005) * 0.35 + intensity * 0.45;
    const exX   = RWX - WR - 28;
    for (let i = 0; i < 2; i++) {
      const ey = -13 - i * 16;
      ctx.fillStyle = '#141428';
      ctx.beginPath();
      ctx.rect(exX - 2, ey - 5, 18, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,212,255,0.35)';
      ctx.lineWidth   = 0.9;
      ctx.stroke();

      const eg = ctx.createRadialGradient(exX, ey, 0, exX, ey, 13);
      eg.addColorStop(0,   `rgba(0,212,255,${ep})`);
      eg.addColorStop(0.5, `rgba(0,80,200,${ep * 0.4})`);
      eg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle   = eg;
      ctx.shadowBlur  = 20 * ep;
      ctx.shadowColor = C_BLUE;
      ctx.beginPath();
      ctx.arc(exX, ey, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── LICENSE PLATE ───────────────────────────────────────
    ctx.save();
    const px = RWX - WR + 10;
    const py = -44;
    ctx.fillStyle   = 'rgba(5,5,18,0.96)';
    ctx.strokeStyle = 'rgba(0,212,255,0.58)';
    ctx.lineWidth   = 0.9;
    ctx.shadowBlur  = 9;
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

    // ── WHEELS (cross-spoke, glowing hubs) ──────────────────
    const wheels = [
      { x: FWX, spin: tireA,  wobble: 0 },
      { x: RWX, spin: tireA,  wobble: state === S.BURNOUT ? Math.sin(t * 0.012) * 0.4 : 0 }
    ];

    for (const w of wheels) {
      ctx.save();
      ctx.translate(w.x, WCY);

      // Arch shadow fill
      ctx.beginPath();
      ctx.arc(0, 0, WR + 14, Math.PI, 0);
      ctx.lineTo(WR + 14,  CLR - WCY + 3);
      ctx.lineTo(-WR - 14, CLR - WCY + 3);
      ctx.closePath();
      ctx.fillStyle = '#030308';
      ctx.fill();

      // Tire
      ctx.beginPath();
      ctx.arc(0, 0, WR, 0, Math.PI * 2);
      ctx.fillStyle   = '#0d0d14';
      ctx.fill();
      ctx.strokeStyle = '#1e1e2c';
      ctx.lineWidth   = 3.5;
      ctx.stroke();

      // Rim (rotates)
      ctx.save();
      ctx.rotate(w.spin + w.wobble);

      const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, WR - 3);
      rg.addColorStop(0,    '#30305a');
      rg.addColorStop(0.55, '#1c1c3a');
      rg.addColorStop(1,    '#0e0e22');
      ctx.beginPath();
      ctx.arc(0, 0, WR - 2, 0, Math.PI * 2);
      ctx.fillStyle = rg;
      ctx.fill();

      // 5-spoke rim (R33 GT-R signature wheel)
      ctx.shadowBlur  = 12;
      ctx.shadowColor = C_BLUE;
      ctx.strokeStyle = 'rgba(0,212,255,0.88)';
      ctx.lineWidth   = 3.4;
      ctx.lineCap     = 'round';
      for (let sp = 0; sp < 5; sp++) {
        const a = sp * Math.PI * 0.4 - Math.PI / 2;   // 5 evenly spaced, one pointing up
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 6,        Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a) * (WR - 6), Math.sin(a) * (WR - 6));
        ctx.stroke();
      }
      // Outer rim lip
      ctx.globalAlpha = 0.5;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, WR - 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore(); // rim rotation

      // Hub cap glow
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = C_BLUE;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = C_BLUE;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#e8f8ff';
      ctx.fill();
      ctx.restore();

      // Burnout spin ring
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

      ctx.restore(); // wheel translate
    }

    // ── LAUNCH MOTION BLUR ──────────────────────────────────
    if (launch > 0.05) {
      ctx.save();
      ctx.globalAlpha = launch * 0.45;
      const sg = ctx.createLinearGradient(-320, 0, 0, 0);
      sg.addColorStop(0,    'rgba(0,212,255,0)');
      sg.addColorStop(0.55, `rgba(0,212,255,${launch * 0.36})`);
      sg.addColorStop(1,    `rgba(144,0,255,${launch * 0.55})`);
      ctx.fillStyle = sg;
      for (let s = 0; s < 8; s++) {
        const sy   = (Math.random() - 0.5) * 190;
        const sh   = 2 + Math.random() * 5;
        const sLen = 120 + Math.random() * 160;
        ctx.fillRect(-320, sy - sh / 2, sLen, sh);
      }
      ctx.restore();
    }

    ctx.restore(); // car transform
  }

  // ── Burnout cloud overlay ──────────────────────────────────
  function drawBurnoutCloud() {
    if (state !== S.BURNOUT) return;
    const alpha = Math.min(burnoutTime / 1.5, 1) * 0.22;
    const cloud = ctx.createRadialGradient(
      carX * CAR_SCALE, groundY - 65, 0,
      carX * CAR_SCALE, groundY - 85, W * 0.55
    );
    cloud.addColorStop(0,    `rgba(10,20,40,${alpha})`);
    cloud.addColorStop(0.4,  `rgba(0,80,155,${alpha * 0.5})`);
    cloud.addColorStop(0.75, `rgba(40,0,85,${alpha * 0.3})`);
    cloud.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Main animation frame ───────────────────────────────────
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

    // State transitions
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

    // Car movement
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

    // Tire spin rate
    const spinRate = state === S.IDLE      ? 0.008
                   : state === S.BUILDING  ? 0.02 + intensity * 0.14
                   : state === S.BURNOUT   ? 0.28
                   : state === S.LAUNCHING ? 0.4 * (1 - launchProgress * 0.5)
                   : 0;
    tireAngle += spinRate * dt;

    // Camera shake
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
      marks.push(carX + CAR_SCALE * (RWX - WR));
      if (marks.length > 220) marks.shift();
    }
    if (state === S.GONE) markOpacity = Math.max(0, markOpacity - 0.0008 * dt);

    // Smoke from rear wheel contact
    const rwX = carX + CAR_SCALE * (RWX - WR);
    const rwY = groundY - WR * CAR_SCALE;
    if (state === S.IDLE && !isMobile && Math.random() < 0.05) {
      emitSmoke(rwX - 14, groundY - 18, 1, 0.18);
    } else if (state === S.BUILDING) {
      emitSmoke(rwX, rwY, Math.max(1, Math.floor(intensity * 6)), intensity);
    } else if (state === S.BURNOUT) {
      emitSmoke(rwX, rwY, 18, 1.6);
    } else if (state === S.LAUNCHING) {
      emitSmoke(rwX, rwY, 10, 1.1);
    }

    // Render
    drawBg();
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

  // ── Boot ───────────────────────────────────────────────────
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
