/* ════════════════════════════════════════════════════════════════
   Watchman Forge — watchman-fx.js
   Boot sequence · hidden scripture (everywhere) · The Watch scene
   Reusable across the site. Sound the trumpet.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var D = document, root = D.documentElement;

  /* ---------- The scripture pool (carry this to every page) ---------- */
  var VERSES = [
    ['EZK 33:6',  'If the watchman sees the sword coming and does not blow the trumpet, I will hold the watchman accountable.'],
    ['EZK 33:7',  'Son of man, I have made you a watchman for the house of Israel.'],
    ['HAB 2:1',   'I will stand at my watch and station myself on the ramparts.'],
    ['ISA 62:6',  'I have posted watchmen on your walls, Jerusalem; they will never be silent.'],
    ['ISA 21:6',  'Go, post a lookout and have him report what he sees.'],
    ['PS 121:8',  'The Lord will watch over your coming and going both now and forevermore.'],
    ['PS 127:1',  'Unless the Lord watches over the city, the watchmen stand guard in vain.'],
    ['PS 130:6',  'My soul waits for the Lord more than watchmen wait for the morning.'],
    ['JN 1:5',    'The light shines in the darkness, and the darkness has not overcome it.'],
    ['MATT 5:14', 'You are the light of the world. A city on a hill cannot be hidden.'],
    ['ROM 13:11', 'The hour has already come for you to wake up from your slumber.'],
    ['ROM 13:12', 'The night is nearly over; the day is almost here. Put on the armor of light.'],
    ['EPH 6:11',  'Put on the full armor of God, that you may take your stand.'],
    ['2TIM 1:7',  'God gave us a spirit not of fear, but of power, love and self-discipline.'],
    ['PROV 4:23', 'Above all else, guard your heart, for everything you do flows from it.'],
    ['REV 19:16', 'On his robe and on his thigh he has a name written: KING OF KINGS.'],
    ['MARK 13:37','What I say to you, I say to everyone: Watch!'],
    ['JOSH 1:9',  'Be strong and courageous. The Lord your God will be with you wherever you go.']
  ];
  function vByRef(ref){ for (var i=0;i<VERSES.length;i++) if (VERSES[i][0]===ref) return VERSES[i]; return null; }
  function randV(){ return VERSES[(Math.random()*VERSES.length)|0]; }

  /* ---------- 1. Console easter egg (for the devs who look) ---------- */
  try {
    var cv = randV();
    console.log('%c✝ WATCHMAN FORGE %c the watch is never off duty.',
      'background:#00d4ff;color:#010104;font-weight:700;padding:2px 7px;border-radius:3px;',
      'color:#9fb6c9;');
    console.log('%c' + cv[0] + '  %c\u201C' + cv[1] + '\u201D',
      'color:#00d4ff;font-weight:700;', 'color:#7da0b5;font-style:italic;');
  } catch (e) {}

  /* ---------- 2. Hover-reveal scripture tooltips ---------- */
  var tip = null;
  function ensureTip(){ if (!tip){ tip = D.createElement('div'); tip.className = 'wf-verse-tip'; D.body.appendChild(tip);} return tip; }
  function measureH(t){ t.style.visibility='hidden'; t.classList.add('show'); var h=t.offsetHeight; t.classList.remove('show'); t.style.visibility=''; return h; }
  function showTip(el){
    var v = vByRef(el.getAttribute('data-vref')) || randV();
    var t = ensureTip();
    t.innerHTML = '<span class="vref">' + v[0] + '</span>\u201C' + v[1] + '\u201D';
    var r = el.getBoundingClientRect();
    var left = r.left + r.width/2 - 130;
    left = Math.min(Math.max(12, left), window.innerWidth - 272);
    t.style.left = left + 'px';
    var top = r.top - 12 - measureH(t);
    if (top < 10) top = r.bottom + 12;
    t.style.top = top + 'px';
    requestAnimationFrame(function(){ t.classList.add('show'); });
  }
  function hideTip(){ if (tip) tip.classList.remove('show'); }
  function wireVerse(el, ref){
    if (!el || el.classList.contains('wf-has-verse')) return;
    if (ref) el.setAttribute('data-vref', ref);
    el.classList.add('wf-has-verse');
    el.addEventListener('mouseenter', function(){ showTip(el); });
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('focus', function(){ showTip(el); });
    el.addEventListener('blur', hideTip);
  }
  function seedVerses(){
    // Product cards get thematically-matched verses (Veil, Pathfinder, ChromaForge, Vantage)
    var cardVerses = ['MATT 5:14','PS 121:8','JN 1:5','PROV 4:23'];
    D.querySelectorAll('.products-grid .product-card').forEach(function(c,i){
      wireVerse(c.querySelector('.app-icon-wrap') || c, cardVerses[i % cardVerses.length]);
    });
    // Crosses, stats, the quote mark, and any tagged element get rotating verses
    var pool = ['EZK 33:7','HAB 2:1','PS 127:1','ISA 21:6','ROM 13:12','REV 19:16','JOSH 1:9','MARK 13:37','2TIM 1:7','PS 130:6'], pi = 0;
    D.querySelectorAll('.nav-cross,.footer-cross,.stat-block,.scripture-mark,[data-vref]').forEach(function(el){
      wireVerse(el, el.getAttribute('data-vref') || pool[pi++ % pool.length]);
    });
  }

  /* ---------- 3. Faint cycling corner whisper ---------- */
  function whisper(){
    var w = D.createElement('div'); w.id = 'wf-whisper'; w.setAttribute('aria-hidden','true'); D.body.appendChild(w);
    (function cycle(){
      w.textContent = '> ' + randV()[0];
      w.style.opacity = '0.22';
      setTimeout(function(){ w.style.opacity = '0'; }, 5200);
      setTimeout(cycle, 9200);
    })();
  }

  /* ---------- 4. The Watch — stars + skyline generation ---------- */
  function buildWatch(){
    var stars = D.getElementById('wt-stars');
    if (stars){
      var n = (window.matchMedia && matchMedia('(max-width:760px)').matches) ? 34 : 62;
      var frag = D.createDocumentFragment();
      for (var i=0;i<n;i++){
        var s = D.createElement('span'); s.className = 'wt-star';
        s.style.left = (Math.random()*100) + '%';
        s.style.top  = (Math.random()*60) + '%';
        var sz = (Math.random()*1.6 + 0.6).toFixed(2);
        s.style.width = s.style.height = sz + 'px';
        s.style.animationDelay = (Math.random()*4).toFixed(2) + 's';
        s.style.animationDuration = (2.6 + Math.random()*3).toFixed(2) + 's';
        frag.appendChild(s);
      }
      stars.appendChild(frag);
    }
    var g = D.getElementById('wt-buildings');
    if (g){
      var NS = 'http://www.w3.org/2000/svg', x = 0, seed = 7;
      function rnd(){ seed = (seed*9301 + 49297) % 233280; return seed/233280; }
      while (x < 1200){
        var w = 42 + ((rnd()*72)|0);
        var underTower = (x < 660 && x + w > 558);   // leave a gap for the central watchtower
        if (!underTower){
          var top = 400 + ((rnd()*140)|0);
          var b = D.createElementNS(NS,'rect');
          b.setAttribute('x', x); b.setAttribute('y', top);
          b.setAttribute('width', w - 6); b.setAttribute('height', 600 - top);
          b.setAttribute('fill', '#04050b');
          g.appendChild(b);
          if (rnd() > 0.5){                            // a few window lights
            var dot = D.createElementNS(NS,'rect');
            dot.setAttribute('x', x + (w-6)/2 - 2);
            dot.setAttribute('y', top + 14 + ((rnd()*((600-top)/2))|0));
            dot.setAttribute('width', 3); dot.setAttribute('height', 3);
            dot.setAttribute('fill', rnd() > 0.72 ? '#00d4ff' : '#ffcf8a');
            dot.setAttribute('opacity', '0.5');
            g.appendChild(dot);
          }
        }
        x += w;
      }
    }
  }

  /* ---------- 5. Boot sequence (first visit per session) ---------- */
  function boot(){
    var ov = D.getElementById('wf-boot');
    if (!root.classList.contains('wf-booting') || !ov){ if (ov && ov.parentNode) ov.parentNode.removeChild(ov); return; }
    var log = D.getElementById('wf-boot-log'), done = false;
    var lightRefs = ['JN 1:5','MATT 5:14','ROM 13:12','PS 130:6'];
    var bv = vByRef(lightRefs[(Math.random()*lightRefs.length)|0]);
    var lines = [
      ['> WATCHMAN_FORGE :: GRID OS  v3.3', 'sys'],
      ['> opening uplink to the User ......... ', 'tag', 'LINKED', 'ok'],
      ['> writing identity disc .............. ', 'tag', '"YOU ARE KNOWN"', 'hl'],
      ['> routing light to the dark sectors .. ', 'tag', 'FLOWING', 'ok'],
      ['> derez fear and doubt ............... ', 'tag', 'CLEARED', 'ok'],
      ['> arming the trumpet ................. ', 'tag', 'ARMED', 'ok'],
      ['', 'gap'],
      ['> \u201C' + bv[1] + '\u201D \u2014 ' + bv[0], 'vs'],
      ['', 'gap'],
      ['> PROGRAM:WATCHMAN   STATUS:ONLINE   THE USER IS WATCHING', 'hl2'],
      ['> the hour is late. stand your post.', 'cur']
    ];
    function finish(){
      if (done) return; done = true;
      try { sessionStorage.setItem('wf_booted','1'); } catch (e) {}
      ov.classList.add('wf-done');
      setTimeout(function(){ root.classList.remove('wf-booting'); if (ov.parentNode) ov.parentNode.removeChild(ov); }, 640);
    }
    ['keydown','click','touchstart','wheel'].forEach(function(ev){ window.addEventListener(ev, finish, { once:true, passive:true }); });

    function type(el, text, cb){ var i=0; (function tick(){ el.textContent = text.slice(0, i++); if (i <= text.length) setTimeout(tick, 6 + Math.random()*12); else cb && cb(); })(); }
    var li = 0;
    (function nextLine(){
      if (li >= lines.length){ setTimeout(finish, 900); return; }
      var row = lines[li++], text = row[0], kind = row[1], el = D.createElement('div');
      log.appendChild(el);
      if (kind === 'gap'){ el.innerHTML = '&nbsp;'; setTimeout(nextLine, 60); return; }
      if (kind === 'vs') el.className = 'vs';
      if (kind === 'hl2') el.className = 'hl2';
      type(el, text, function(){
        if (kind === 'tag'){ var t=D.createElement('span'); t.className=row[3]||'ok'; t.textContent=' ['+row[2]+']'; el.appendChild(t); }
        if (kind === 'cur'){ var c=D.createElement('span'); c.className='cursor'; c.textContent='\u2588'; el.appendChild(c); }
        setTimeout(nextLine, kind === 'tag' ? 60 : 110);
      });
    })();
  }

  /* ---------- go ---------- */
  function init(){ boot(); seedVerses(); whisper(); buildWatch(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
