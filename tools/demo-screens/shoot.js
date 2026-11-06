// Render the demo app screens in screens.html to PNGs at phone resolution (1215x2688).
//   cd tools/demo-screens && node shoot.js            (needs: npm i playwright-core, and a Chromium)
// Writes tools/demo-screens/out/demo-<id>.png; tools/make_app_images.py turns them into site WebPs.
//
//   node shoot.js og                                  (needs tools/preview.py running; BASE to override)
// Shoots the homepage's live Ledger for the share card, with the date row hidden: a share card is
// an image, so it can't keep today's date. Writes out/og-ledger.png for tools/make_og_image.py.
const { chromium } = require('playwright-core');
const EXE = process.env.CHROME || (process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
(async () => {
  const path = require('path'); const html = path.join(__dirname, 'screens.html'); const out = path.join(__dirname, 'out');
  const b = await chromium.launch({ executablePath: EXE, args: ['--allow-file-access-from-files'] });
  if (process.argv[2] === 'og') {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    await p.addStyleTag({ content: '.shot-front .app-date { display: none !important; }' });
    await p.waitForTimeout(300);
    await p.locator('.shot-front .app').screenshot({ path: `${out}/og-ledger.png` });
    console.log('shot og-ledger');
  } else {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 3 });
    await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    for (const id of ['films', 'pantry']) {
      await p.locator('#' + id).screenshot({ path: `${out}/demo-${id}.png` });
      console.log('shot', id);
    }
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
