/* ════════════════════════════════════════════════════════════════
   Watchman Forge — watchman-fx.js
   Hidden scripture · The Watch scene (stars)
   The faith is the root, kept deep: nothing here is in the way of a
   first-time visitor. It is there for the ones who look.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var D = document;

  /* ---------- The scripture pool — King James Version, verbatim ---------- */
  var VERSES = [
    ['EZK 33:6',  'But if the watchman see the sword come, and blow not the trumpet, and the people be not warned…'],
    ['EZK 33:7',  'So thou, O son of man, I have set thee a watchman unto the house of Israel.'],
    ['HAB 2:1',   'I will stand upon my watch, and set me upon the tower.'],
    ['ISA 62:6',  'I have set watchmen upon thy walls, O Jerusalem, which shall never hold their peace day nor night.'],
    ['ISA 21:6',  'Go, set a watchman, let him declare what he seeth.'],
    ['PS 121:8',  'The LORD shall preserve thy going out and thy coming in from this time forth, and even for evermore.'],
    ['PS 127:1',  'Except the LORD keep the city, the watchman waketh but in vain.'],
    ['PS 130:6',  'My soul waiteth for the Lord more than they that watch for the morning.'],
    ['PS 119:105','Thy word is a lamp unto my feet, and a light unto my path.'],
    ['PROV 24:16','For a just man falleth seven times, and riseth up again.'],
    ['JN 1:5',    'And the light shineth in darkness; and the darkness comprehended it not.'],
    ['MATT 5:14', 'Ye are the light of the world. A city that is set on an hill cannot be hid.'],
    ['ROM 13:12', 'The night is far spent, the day is at hand: let us therefore cast off the works of darkness, and let us put on the armour of light.'],
    ['EPH 6:11',  'Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.'],
    ['2TIM 1:7',  'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.'],
    ['PROV 4:23', 'Keep thy heart with all diligence; for out of it are the issues of life.'],
    ['MK 13:37',  'And what I say unto you I say unto all, Watch.'],
    ['1TH 5:6',   'Therefore let us not sleep, as do others; but let us watch and be sober.'],
    ['MIC 7:7',   'Therefore I will look unto the LORD; I will wait for the God of my salvation: my God will hear me.']
  ];
  function vByRef(ref){ for (var i=0;i<VERSES.length;i++) if (VERSES[i][0]===ref) return VERSES[i]; return null; }
  function randV(){ return VERSES[(Math.random()*VERSES.length)|0]; }

  /* ---------- 1. Console easter egg (for the devs who look) ---------- */
  try {
    var cv = randV();
    console.log('%c✝ WATCHMAN FORGE %c the watch is never off duty.',
      'background:#00d4ff;color:#010104;font-weight:700;padding:2px 7px;border-radius:3px;',
      'color:#9fb6c9;');
    console.log('%c' + cv[0] + '  %c“' + cv[1] + '”',
      'color:#00d4ff;font-weight:700;', 'color:#7da0b5;font-style:italic;');
  } catch (e) {}

  /* ---------- 2. Hover-reveal scripture on [data-vref] ---------- */
  var tip = null;
  function ensureTip(){ if (!tip){ tip = D.createElement('div'); tip.className = 'wf-verse-tip'; tip.setAttribute('aria-hidden','true'); D.body.appendChild(tip);} return tip; }
  function measureH(t){ t.style.visibility='hidden'; t.classList.add('show'); var h=t.offsetHeight; t.classList.remove('show'); t.style.visibility=''; return h; }
  function showTip(el){
    var v = vByRef(el.getAttribute('data-vref')) || randV();
    var t = ensureTip();
    t.innerHTML = '';
    var ref = D.createElement('span'); ref.className = 'vref'; ref.textContent = v[0];
    t.appendChild(ref); t.appendChild(D.createTextNode('“' + v[1] + '”'));
    var r = el.getBoundingClientRect();
    var left = r.left + r.width/2 - 140;
    left = Math.min(Math.max(12, left), window.innerWidth - 292);
    t.style.left = left + 'px';
    var top = r.top - 12 - measureH(t);
    if (top < 10) top = r.bottom + 12;
    t.style.top = top + 'px';
    requestAnimationFrame(function(){ t.classList.add('show'); });
  }
  function hideTip(){ if (tip) tip.classList.remove('show'); }
  function seedVerses(){
    // Pointer-only: a touch visitor never gets a tooltip they didn't ask for.
    if (!window.matchMedia || !matchMedia('(hover: hover)').matches) return;
    D.querySelectorAll('[data-vref]').forEach(function(el){
      el.classList.add('wf-has-verse');
      el.addEventListener('mouseenter', function(){ showTip(el); });
      el.addEventListener('mouseleave', hideTip);
    });
    window.addEventListener('scroll', hideTip, { passive: true });
  }

  /* ---------- 3. The Watch — stars over the wall ---------- */
  function buildWatch(){
    // Desktop sees the whole wall; phones get a crop on the tower, the Watchman and the road.
    // viewBox is an attribute, not CSS, so it swaps here.
    var svg = D.querySelector('.wt-svg');
    if (svg && window.matchMedia){
      var mq = matchMedia('(max-width: 760px)');
      var frame = function(){ svg.setAttribute('viewBox', mq.matches ? '600 100 540 360' : '0 0 1200 460'); };
      frame();
      if (mq.addEventListener) mq.addEventListener('change', frame);
    }
    var stars = D.getElementById('wt-stars');
    if (!stars) return;
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

  /* ---------- go ---------- */
  function init(){ seedVerses(); buildWatch(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
