// Intip halaman web asli (mobile 540 x 900): node peek.cjs <url> <keluaran.png> [selector-klik ...]
const { chromium } = require('playwright');
(async () => {
  const [url, out, ...clicks] = process.argv.slice(2);
  const auth = await (await fetch('http://127.0.0.1:8090/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 540, height: 900 }, deviceScaleFactor: 1, locale: 'id-ID' });
  await ctx.addInitScript((a) => { try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {} }, auth);
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  for (const c of clicks) { await p.locator(c).first().click(); await p.waitForTimeout(900); }
  console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button,a')].filter((x) => x.getBoundingClientRect().height > 0).map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)))));
  await p.screenshot({ path: out }); await b.close();
})();
