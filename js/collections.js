/* ============================================================
   WATCHMAN FORGE — Collections pages
   Fragrances: the atomizer, the assistant's pick, the cut-out slider.
   Games: a guide whose boxes tick on sync; Want / Playing / Played.
   Everything here is a demo of the app, on made-up data; nothing is
   stored and nothing leaves the page.
   ============================================================ */

(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flash = (el) => { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); };
  const put = (el, text) => {
    text = String(text);
    if (el && el.textContent !== text) { el.textContent = text; flash(el); }
  };

  /* ── Fragrances: the atomizer ─────────────────────────────
     As in the app: a bottle starts at 0.1 ml a spray and 5 sprays a
     wear. Once 10 sprays are counted, setting the level by eye teaches
     it the bottle's real spray: (level then - level now) / sprays. */
  const atom = document.querySelector('[data-atom]');
  if (atom) {
    const SIZE = 100;          // ml in the bottle when full
    const EMPTY_Y = 278;       // the cavity's floor in the SVG; 100 ml fills 172 units above it
    const PER_ML = 1.72;
    const TICK = 28;           // rail px per ml
    const TO_LEARN = 10;       // sprays counted before the level can be set by eye
    const fresh = () => ({ ml: 69, rate: 0.1, spw: 5, learned: false, since: 69, counted: 0, wears: 0 });
    let s = fresh();

    const $ = (sel) => atom.querySelector(sel);
    const out = (name) => $(`[data-out="${name}"]`);
    const svg = $('.atom-svg'), liq = $('.atom-liqg'), ticks = $('.atom-ticks'), bar = $('.ap-bar i');
    const head = $('.atom-head'), mist = $('.atom-mist'), log = $('.atom-log');
    const cal = $('.atom-cal'), eye = $('#atom-level');
    const less = $('[data-step="-1"]'), more = $('[data-step="1"]');

    const frag = document.createDocumentFragment();
    for (let i = 0; i <= SIZE * 2; i++) {
      const t = document.createElement('span');
      t.style.top = (i * TICK / 2) + 'px';
      if (i % 2 === 0) {
        t.className = 'major';
        const b = document.createElement('b');
        b.textContent = SIZE - i / 2;
        t.appendChild(b);
      }
      frag.appendChild(t);
    }
    ticks.appendChild(frag);

    const num = (n) => String(Math.round(n * 100) / 100);
    const say = (text) => { log.textContent = text; };

    const level = (ml) => {
      liq.style.transform = `translateY(${(EMPTY_Y - ml * PER_ML).toFixed(2)}px)`;
      ticks.style.transform = `translateY(${(-(SIZE - ml) * TICK).toFixed(1)}px)`;
      bar.style.width = (ml / SIZE * 100).toFixed(1) + '%';
      out('pct').textContent = Math.round(ml / SIZE * 100) + '%';
      svg.setAttribute('aria-label', `A ${SIZE} ml bottle of Vigil, ${ml.toFixed(1)} ml left`);
    };

    const render = () => {
      const sprays = Math.floor(s.ml / s.rate + 1e-9);
      put(out('ml'), s.ml.toFixed(1));
      put(out('sprays'), sprays);
      put(out('wears'), Math.floor(sprays / s.spw));
      out('rate').textContent = num(s.rate);
      out('rate-note').textContent = s.learned ? 'learned from this bottle' : 'starting guess';
      out('spw').textContent = s.spw;
      less.disabled = s.spw <= 1;
      more.disabled = s.spw >= 12;
      level(s.ml);
    };

    // The level by eye can sit anywhere from 0.04 to 0.3 ml a spray below the starting level.
    const openCal = () => {
      eye.min = Math.max(0, s.since - s.counted * 0.3).toFixed(1);
      eye.max = (s.since - s.counted * 0.04).toFixed(1);
      eye.value = s.ml.toFixed(1);
      out('counted').textContent = s.counted;
      cal.hidden = false;
      onEye();
    };
    const onEye = () => {
      const v = Number(eye.value);
      out('eye').textContent = v.toFixed(1);
      const r = (s.since - v) / s.counted;
      out('math').textContent = Math.abs(r - s.rate) < 0.005
        ? `Same as counted: about ${num(s.rate)} ml a spray.`
        : `${s.since.toFixed(1)} to ${v.toFixed(1)} ml over ${s.counted} sprays: about ${num(r)} ml a spray.`;
      level(v);
    };
    eye.addEventListener('input', onEye);

    $('.atom-cal-save').addEventListener('click', () => {
      const v = Number(eye.value);
      s.rate = Math.min(0.3, Math.max(0.04, (s.since - v) / s.counted));
      s.ml = v; s.since = v; s.counted = 0; s.learned = true;
      cal.hidden = true;
      render();
      say(`Learned: about ${num(s.rate)} ml a spray. Sprays and wears left now use it.`);
    });

    const puff = (n) => {
      if (reduce) return;
      for (let i = 0; i < Math.min(n, 5); i++) {
        setTimeout(() => {
          head.classList.add('press');
          setTimeout(() => head.classList.remove('press'), 110);
          const m = mist.cloneNode(true);
          m.classList.add('go');
          mist.parentNode.appendChild(m);
          setTimeout(() => m.remove(), 1100);
        }, i * 230);
      }
    };

    $('.atom-wore').addEventListener('click', () => {
      if (s.ml <= 0) { say('This bottle is empty. Time to add the next one.'); return; }
      const used = Math.min(s.ml, s.rate * s.spw);
      s.ml = Math.max(0, Math.round((s.ml - used) * 1000) / 1000);
      s.counted += s.spw;
      s.wears += 1;
      puff(s.spw);
      render();
      let text = `Wear ${s.wears} logged: ${s.spw} sprays, ${num(used)} ml.`;
      if (s.counted >= TO_LEARN && s.ml > 0) {
        openCal();
        text += ' Now you can set the level by eye.';
      }
      say(text);
    });

    atom.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
      s.spw = Math.min(12, Math.max(1, s.spw + Number(btn.dataset.step)));
      render();
      if (!cal.hidden) onEye();
      say(`${s.spw} ${s.spw === 1 ? 'spray' : 'sprays'} a wear.`);
    }));

    $('.atom-reset').addEventListener('click', () => {
      s = fresh();
      cal.hidden = true;
      render();
      say('Each tap is one wear: 5 sprays at 0.1 ml.');
    });

    render();
  }

  /* ── Fragrances: the assistant's pick ─────────────────────
     It leans on the season, so the demo does too: the pick follows the
     visitor's own month (northern seasons). Vigil was worn today, so it
     is never the pick. */
  const fa = document.querySelector('[data-fa]');
  if (fa) {
    const PICKS = {
      winter: ['ember',   'Ember Oud',     'Greywatch Parfums', 'Amber and smoke suit winter, and it’s been 23 days since you last wore it.'],
      spring: ['orchard', 'Orchard Psalm', 'House of Vale',     'Pear and green tea suit spring, and it’s been 16 days since you last wore it.'],
      summer: ['harbor',  'Harbor Light',  'House of Vale',     'Sea salt and bergamot suit summer, and at 47 days it’s the bottle you’ve gone longest without.'],
      autumn: ['cedar',   'Cedar Watch',   'Lantern & Oak',     'Cedar and black pepper suit autumn, and it’s been 31 days since you last wore it.'],
    };
    const season = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer',
                    'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][new Date().getMonth()];
    const [id, name, house, why] = PICKS[season];
    fa.querySelector('[data-fa-season]').textContent = season;
    fa.querySelector('[data-fa-name]').textContent = name;
    fa.querySelector('[data-fa-house]').textContent = house;
    fa.querySelector('[data-fa-why]').textContent = why;
    fa.querySelector('[data-fa-img]').setAttribute('href', '#fb-' + id);
    fa.querySelectorAll('[data-b]').forEach(li => li.classList.toggle('is-pick', li.dataset.b === id));
  }

  /* ── Games: a sync ticks the guide's boxes ────────────────
     With Xbox linking, achievements sync every 6 hours and the guide
     ticks off what they cover. Here the sync is a button. */
  document.querySelectorAll('[data-guide]').forEach(g => {
    const btn = g.querySelector('.gd-sync');
    const ach = g.querySelector('[data-g-ach]');
    const gs = g.querySelector('[data-g-gs]');
    const bar = g.querySelector('.ap-bar i');
    const toast = g.querySelector('.gd-toast');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const steps = [...g.querySelectorAll('li[data-unlock]:not(.done)')];
      if (!steps.length) return;
      btn.disabled = true;
      btn.textContent = 'Syncing…';
      steps.forEach((li, i) => setTimeout(() => {
        li.classList.add('done', 'just');
        li.querySelector('.gd-box').setAttribute('aria-label', 'Done');
        put(ach, Number(ach.textContent) + 1);
        const total = Number(gs.textContent.replace(/,/g, '')) + Number(li.dataset.unlock);
        put(gs, total.toLocaleString('en-US'));
        bar.style.width = (total / 10) + '%';
        if (i === steps.length - 1) {
          btn.textContent = 'Synced just now';
          const names = steps.map(s => s.dataset.name);
          toast.textContent = `${names.length} achievements unlocked: ${names.join(' and ')}. Their boxes ticked themselves.`;
        }
      }, reduce ? 0 : 600 + i * 700));
    });
  });

  /* ── Games: Want, Playing, Played ─────────────────────── */
  document.querySelectorAll('.sh-state').forEach(group => group.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    group.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  }));

  /* ── Fragrances: your photo against the cut-out ─────────── */
  document.querySelectorAll('[data-cut]').forEach(box => {
    const input = box.querySelector('input');
    const set = () => box.style.setProperty('--cut', input.value + '%');
    input.addEventListener('input', set);
    set();
  });

})();
