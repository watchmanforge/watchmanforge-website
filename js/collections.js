/* ============================================================
   WATCHMAN FORGE — Collections pages
   Fragrances: the atomizer, the assistant's pick, the cut-out slider.
   Games: a guide whose boxes tick on sync; Want to play / Playing / Played.
   Movies & TV: a ranking that re-orders as you score; Up next (three at
   most) from a title's sheet; picks to Want to watch; pick a poster, save.
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
     As in the app: counted at 0.1 ml a spray and 5 sprays a wear. Set
     "How full" by eye now and then, and it learns the sprayer's real
     output: (level then - level now) / sprays counted since. */
  const atom = document.querySelector('[data-atom]');
  if (atom) {
    const SIZE = 100;          // ml in the bottle when full
    const EMPTY_Y = 278;       // the cavity's floor in the SVG; 100 ml fills 172 units above it
    const PER_ML = 1.72;
    const TICK = 28;           // rail px per ml
    const fresh = () => ({ ml: 69, rate: 0.1, spw: 5, learned: false, since: 69, counted: 0, wears: 0 });
    let s = fresh();

    const $ = (sel) => atom.querySelector(sel);
    const out = (name) => $(`[data-out="${name}"]`);
    const svg = $('.atom-svg'), liq = $('.atom-liqg'), ticks = $('.atom-ticks'), bar = $('.ap-bar i');
    const head = $('.atom-head'), mist = $('.atom-mist'), log = $('.atom-log');
    const eye = $('#atom-level'), spw = $('.atom-spw input');

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
      out('eye').textContent = ml.toFixed(1) + ' ml';
      svg.setAttribute('aria-label', `A ${SIZE} ml bottle of Vigil, ${ml.toFixed(1)} ml left`);
    };

    const render = () => {
      const sprays = Math.floor(s.ml / s.rate + 1e-9);
      const wears = Math.floor(sprays / s.spw);
      const pct = Math.round(s.ml / SIZE * 100);
      put(out('ml'), s.ml.toFixed(1));
      put(out('sprays'), sprays);
      put(out('wears'), wears);
      out('pct').textContent = pct + '%';
      out('left').textContent = pct <= 15 ? 'running low' : `~${wears} wears`;
      out('rate-line').innerHTML = s.learned
        ? `Your sprayer puts out about <b>${num(s.rate)}</b> ml a spray, learned from your corrections.`
        : 'Counted at <b>0.1</b> ml a spray; set the fill by eye now and then and it learns this sprayer.';
      eye.value = s.ml;
      level(s.ml);
    };

    eye.addEventListener('input', () => level(Number(eye.value)));
    eye.addEventListener('change', () => {
      const v = Number(eye.value);
      if (s.counted >= 5 && v < s.since) {
        s.rate = Math.min(0.3, Math.max(0.04, (s.since - v) / s.counted));
        s.learned = true;
        say(`Learned from your correction: about ${num(s.rate)} ml a spray.`);
      } else {
        say(`Set to ${v.toFixed(1)} ml.`);
      }
      s.ml = v; s.since = v; s.counted = 0;
      render();
    });

    spw.addEventListener('change', () => {
      s.spw = Math.min(12, Math.max(1, Math.round(Number(spw.value) || 5)));
      spw.value = s.spw;
      render();
      say(`${s.spw} ${s.spw === 1 ? 'spray' : 'sprays'} a wear.`);
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
      say(`Wear ${s.wears} logged: ${s.spw} sprays, ${num(used)} ml.` + (s.wears === 2 && !s.learned ? ' Now set How full by eye.' : ''));
    });

    $('.atom-reset').addEventListener('click', () => {
      s = fresh();
      spw.value = s.spw;
      render();
      say('Each tap is one wear: 5 sprays at 0.1 ml.');
    });

    render();
  }

  /* ── Fragrances: the assistant's pick ─────────────────────
     It leans on the season, so the demo does too: the pick follows the
     visitor's own month (northern seasons). Vigil was worn today, so it
     is never the pick; the app skips it without saying so. */
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
  }

  /* ── Games: a sync ticks the guide's boxes ────────────────
     With Xbox linking, achievements sync every 6 hours and the guide
     ticks off what they cover. Here the sync is a button. */
  document.querySelectorAll('[data-guide]').forEach(g => {
    const btn = g.querySelector('.gd-sync');
    const label = btn && btn.querySelector('span');
    const ach = g.querySelector('[data-g-ach]');
    const gs = g.querySelector('[data-g-gs]');
    const bar = g.querySelector('.ap-bar i');
    const toast = g.querySelector('.gd-toast');
    if (!btn) return;
    const clock = () => 'Synced ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    btn.addEventListener('click', () => {
      const steps = [...g.querySelectorAll('li[data-unlock]:not(.done)')];
      label.textContent = 'Syncing…';
      if (!steps.length) { setTimeout(() => { label.textContent = clock(); }, reduce ? 0 : 700); return; }
      steps.forEach((li, i) => setTimeout(() => {
        li.classList.add('done', 'just');
        li.querySelector('.gd-box').setAttribute('aria-label', 'Done');
        put(ach, Number(ach.textContent) + 1);
        const total = Number(gs.textContent.replace(/,/g, '')) + Number(li.dataset.unlock);
        put(gs, total.toLocaleString('en-US'));
        bar.style.width = (total / 10) + '%';
        if (i === steps.length - 1) {
          label.textContent = clock();
          const names = steps.map(x => x.dataset.name);
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

  /* ── Movies & TV: your ranking re-orders as you score ────
     Scores are out of 100; the poster grid sorts by score, and each
     tile slides from where it was (FLIP). Filters hide and renumber. */
  const rank = document.querySelector('[data-rank]');
  if (rank) {
    const list = rank.querySelector('.mv-grid');
    const me = list.querySelector('.mv-me');
    const input = rank.querySelector('.mv-sheet input');
    const shown = rank.querySelector('.mv-sheet output');
    const tiles = () => [...list.children];
    const score = (li) => Number(li.querySelector('.mv-s').textContent);
    const number = () => {
      let n = 0;
      tiles().forEach(li => { if (!li.hidden) li.querySelector('.mv-n').textContent = ++n; });
      rank.querySelector('[data-count]').textContent = n;
    };
    const reorder = () => {
      const now = tiles();
      const sorted = now.slice().sort((a, b) => score(b) - score(a));
      if (sorted.every((li, i) => li === now[i])) return;
      const before = new Map(now.map(li => [li, li.getBoundingClientRect()]));
      sorted.forEach(li => list.appendChild(li));
      number();
      if (reduce) return;
      tiles().forEach(li => {
        const a = before.get(li), b = li.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (!dx && !dy) return;
        li.style.transition = 'none';
        li.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          li.style.transition = 'transform .5s cubic-bezier(0.22, 1, 0.36, 1)';
          li.style.transform = '';
        }));
      });
    };
    input.addEventListener('input', () => {
      me.querySelector('.mv-s').textContent = input.value;
      shown.textContent = input.value;
      reorder();
    });
    rank.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      rank.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      tiles().forEach(li => { li.hidden = b.dataset.f !== 'all' && li.dataset.type !== b.dataset.f; });
      number();
    }));
  }

  /* ── Movies & TV: Up next holds three at most ────────────
     As in the app, a title moves on and off Up next from its own
     sheet: tap a poster in Want to watch, or a tile in Up next. */
  const un = document.querySelector('[data-upnext]');
  if (un) {
    const slots = un.querySelector('.un-slots');
    const grid = un.querySelector('.un-grid');
    const sheet = un.querySelector('.un-sheet');
    const act = sheet.querySelector('.un-act');
    const msg = un.querySelector('.un-msg');
    const KEYS = ['id', 'name', 'meta', 'art'];
    const filled = () => [...slots.children].filter(li => li.dataset.id);
    let open = null;

    const show = (li, where) => {
      open = { li, where };
      sheet.querySelector('[data-sheet-art]').setAttribute('href', '#' + li.dataset.art);
      sheet.querySelector('[data-sheet-name]').textContent = li.dataset.name;
      sheet.querySelector('[data-sheet-meta]').textContent = li.dataset.meta;
      act.textContent = where === 'want' ? '+ Add to Up next' : 'Take off Up next';
      sheet.hidden = false;
      msg.textContent = '';
    };
    const empty = (slot) => {
      KEYS.forEach(k => { delete slot.dataset[k]; });
      slot.innerHTML = '<span class="un-tile empty">Empty slot</span>';
    };

    un.addEventListener('click', (e) => {
      const poster = e.target.closest('.un-poster');
      const tile = e.target.closest('button.un-tile');
      if (poster) show(poster.closest('li'), 'want');
      else if (tile) show(tile.closest('li'), 'slot');
    });
    act.addEventListener('click', () => {
      if (!open) return;
      const { li, where } = open;
      if (where === 'want') {
        if (filled().length >= 3) { msg.textContent = 'Up next holds three at most. Watch one first, or take one off.'; return; }
        const slot = [...slots.children].find(x => !x.dataset.id);
        KEYS.forEach(k => { slot.dataset[k] = li.dataset[k]; });
        slot.innerHTML = '<button class="un-tile" type="button"><b></b></button>';
        slot.querySelector('b').textContent = li.dataset.name;
        li.remove();
        msg.textContent = `${slot.dataset.name} is up next.`;
      } else {
        const item = document.createElement('li');
        KEYS.forEach(k => { item.dataset[k] = li.dataset[k]; });
        item.innerHTML = `<button class="un-poster" type="button"><span class="pst"><svg viewBox="0 0 40 60" aria-hidden="true"><use href="#${li.dataset.art}" width="40" height="60"/></svg></span><b></b></button>`;
        item.querySelector('b').textContent = li.dataset.name;
        grid.prepend(item);
        msg.textContent = `${li.dataset.name} went back to Want to watch.`;
        slots.appendChild(li);
        empty(li);
      }
      sheet.hidden = true;
      open = null;
    });
  }

  /* ── Movies & TV: a pick goes to Want to watch in one tap ── */
  document.querySelectorAll('.mp-add').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = on ? 'Added' : '+ Want to watch';
  }));

  /* ── Movies & TV: choose a poster ─────────────────────── */
  const ml = document.querySelector('[data-lookup]');
  if (ml) {
    const save = ml.querySelector('.ml-save');
    ml.querySelectorAll('.ml-opts [data-art]').forEach(b => b.addEventListener('click', () => {
      ml.querySelectorAll('.ml-opts [data-art]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      ml.querySelector('[data-ml-art]').setAttribute('href', '#' + b.dataset.art);
      save.textContent = 'Save';
    }));
    save.addEventListener('click', () => { save.textContent = 'Saved'; });
  }

  /* ── Fragrances: just one, or layer two; wearing it today ── */
  document.querySelectorAll('[data-fa]').forEach(panel => {
    const one = panel.querySelector('.fa-a:not(.fa-pair)'), two = panel.querySelector('.fa-pair');
    panel.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      panel.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      one.hidden = b.dataset.mode !== 'one';
      two.hidden = b.dataset.mode === 'one';
    }));
    panel.querySelectorAll('.fa-wear').forEach(b => b.addEventListener('click', () => { b.textContent = 'Worn today ✓'; b.disabled = true; }));
  });

  /* ── Fragrances: your photo against the cut-out ─────────── */
  document.querySelectorAll('[data-cut]').forEach(box => {
    const input = box.querySelector('input');
    const set = () => box.style.setProperty('--cut', input.value + '%');
    input.addEventListener('input', set);
    set();
  });

})();
