// Render the app's own nave (the Order of the Watchmen screen) at phone size and shoot its art
// layers only: the cathedral plate and the six flanking knights, without the UI and without the
// Seneschal, who stands on the website as his own layer so he can glow. See make_hall.py.
//   node shoot.js <dir holding watchman-forge-live.html and assets/>      (needs playwright-core)
const { chromium } = require('playwright-core');
const DIR = require('path').resolve(process.argv[2] || '.') + '/';
const EXE = process.env.CHROME || (process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  p.on('pageerror', () => {});
  await p.route(/^https?:\/\//, r => r.abort());     // the app's server isn't here; keep it offline
  await p.goto('file://' + DIR + 'watchman-forge-live.html', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const scene = document.getElementById('scene');
    const keep = el => el.id === 'sen-wrap' || el.classList.contains('kn-side');
    [...scene.children].forEach(el => { if (!keep(el)) el.style.visibility = 'hidden'; });
    const st = document.createElement('style');
    st.textContent = '.scene::after{display:none!important} *{animation:none!important;transition:none!important}';
    document.head.appendChild(st);
    const r = scene.getBoundingClientRect();
    const fig = document.querySelector('#sen-wrap .kn-fig').getBoundingClientRect();
    const img = document.querySelector('#sen-wrap .kn-base').getBoundingClientRect();
    const smoke = document.querySelector('#kn-smoke').getBoundingClientRect();
    return { body: document.body.className, scene: [r.x, r.y, r.width, r.height], fig: [fig.x - r.x, fig.y - r.y, fig.width, fig.height], img: [img.x - r.x, img.y - r.y, img.width, img.height], smoke: [smoke.x - r.x, smoke.y - r.y, smoke.width, smoke.height] };
  });
  console.log(JSON.stringify(info));
  await p.evaluate(() => { document.getElementById('sen-wrap').style.visibility = 'hidden'; });
  await p.locator('#scene').screenshot({ path: DIR + 'hall-nosen.png' });
  await b.close();
})();
