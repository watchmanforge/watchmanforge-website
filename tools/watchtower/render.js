// Render the watchtower scene's SVG layers to transparent PNGs, for tools/watchtower/paint.py.
//   node render.js <scene.html> <outdir> <scale>     (needs: npm i playwright-core, and a Chromium)
// One PNG per top-level <g id> in the SVG, plus emit.png: the whole scene with everything that
// doesn't give off light painted black, so the glow pass knows what shines and what blocks it.
const { chromium } = require('playwright-core');
const EXE = process.env.CHROME || (process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');
(async () => {
  const [html, out, scale] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: EXE, args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 460 }, deviceScaleFactor: Number(scale) || 2.5 });
  await p.goto('file://' + require('path').resolve(html));
  const ids = await p.evaluate(() => [...document.querySelectorAll('svg > g[id]')].map(g => g.id));
  for (const id of ids) {
    await p.evaluate(id => document.querySelectorAll('svg > g[id]').forEach(g => { g.style.display = g.id === id ? '' : 'none'; }), id);
    await p.screenshot({ path: `${out}/${id}.png`, omitBackground: true });
  }
  await p.evaluate(() => {
    document.querySelectorAll('svg > g[id]').forEach(g => { g.style.display = ''; });
    document.documentElement.classList.add('emitpass');
  });
  await p.screenshot({ path: `${out}/emit.png` });
  console.log('rendered', ids.join(' '), 'emit');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
