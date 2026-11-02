// Render the demo app screens in screens.html to PNGs at phone resolution (1215x2688).
//   cd tools/demo-screens && node shoot.js            (needs: npm i playwright-core, and a Chromium)
// Writes tools/demo-screens/out/demo-<id>.png; tools/make_app_images.py turns them into site WebPs.
const { chromium } = require('playwright-core');
const EXE = process.env.CHROME || (process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');
(async () => {
  const path = require('path'); const html = path.join(__dirname, 'screens.html'); const out = path.join(__dirname, 'out');
  const b = await chromium.launch({ executablePath: EXE, args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 3 });
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  for (const id of ['films', 'list', 'pantry']) {
    await p.locator('#' + id).screenshot({ path: `${out}/demo-${id}.png` });
    console.log('shot', id);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
