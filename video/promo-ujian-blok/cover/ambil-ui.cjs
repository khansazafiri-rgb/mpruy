// node video/promo-ujian-blok/cover/ambil-ui.cjs  -> cover/ui-dialog.jpg: cuplikan UI MEDCOEL asli (dialog "Siapkan sesi belajarmu") tanpa kursor, 540 x 900 CSS skala 2.
// Butuh PocketBase (8090, data uji) + Vite (3000): lihat rekam/siapkan.sh
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const auth = await (await fetch('http://127.0.0.1:8090/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 540, height: 900 }, deviceScaleFactor: 2, locale: 'id-ID' });
  await ctx.addInitScript((a) => { try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {} }, auth);
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:3000/mata-kuliah/anatomi', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  await p.locator('.chapter-row', { hasText: 'Ekstremitas Atas' }).click(); await p.waitForSelector('.choice-card'); await p.waitForTimeout(500);
  await p.locator('.choice-card').nth(2).click(); await p.waitForSelector('.mode-choice'); await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(__dirname, 'ui-dialog.jpg'), type: 'jpeg', quality: 90 }); console.log('ok'); await b.close();
})();
