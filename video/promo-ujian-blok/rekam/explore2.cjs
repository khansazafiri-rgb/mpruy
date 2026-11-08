const { chromium } = require('playwright'); const S = process.argv[2];
(async () => {
  const auth = await (await fetch('http://127.0.0.1:8090/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 540, height: 900 }, deviceScaleFactor: 1, locale: 'id-ID' });
  await ctx.addInitScript((a) => { try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {} }, auth);
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message));
  const names = async () => JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button,a,label')].filter((x) => x.getBoundingClientRect().height > 0).map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean)));
  let n = 10; const shot = async (t) => { await p.waitForTimeout(700); await p.screenshot({ path: `${S}/ex${++n}.png` }); console.log(n, t, p.url().replace('http://127.0.0.1:3000', ''), (await names()).slice(0, 500)); };
  await p.goto('http://127.0.0.1:3000/mata-kuliah/anatomi', { waitUntil: 'networkidle' });
  await p.locator('.chapter-row', { hasText: 'Ekstremitas Atas' }).click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /Latihan soal/ }).first().click(); await p.waitForTimeout(600);
  await p.locator('.mode-choice', { hasText: 'Mode ujian' }).click(); await shot('practice-ujian');
  await p.getByRole('button', { name: /Mulai/ }).first().click(); await p.waitForTimeout(900); await shot('runner-ujian');
  await p.locator('label,button', { hasText: /^A/ }).first().click().catch(() => {}); await shot('dijawab');
  await p.getByRole('button', { name: /Selesai/ }).first().click(); await shot('klik-selesai');
  await b.close();
})();
