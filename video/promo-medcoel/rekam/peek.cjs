// Tangkapan layar cepat halaman MEDCOEL asli (akun demo) pada viewport desktop 1408 x 792, skala 2.
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1408, height: 792 }, deviceScaleFactor: 1, locale: 'id-ID' });
  await ctx.addInitScript((a) => { try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {} }, auth);
  const p = await ctx.newPage();
  const CH = 'fw4bpaps0knp7bq';
  for (const [name, url] of [['materi', `/mata-kuliah/anatomi/materi/${CH}`], ['flash', `/mata-kuliah/anatomi/flashcard/${CH}`], ['sub', '/mata-kuliah/anatomi'], ['sim', '/simulasi-dokter']]) {
    await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, p.url());
  }
  await b.close();
})();
