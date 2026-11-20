// Perekam Live 4D Lab ASLI (apps/4d-lab: build lokal + server statis, WebGL perangkat lunak di Chromium tanpa GPU).
// Satu bingkai video = SATU klik mouse sungguhan pada kontrol asli "Gerakkan probe" (langkah 1 mm atau 1 derajat) atau satu bingkai penahan.
// Setelah klik, perekam menunggu bingkai pencitraan berkualitas penuh dari aplikasi, lalu mengambil piksel dua kanvas ASLI: kanvas pasien 3D (probe di tubuh)
// dan kanvas monitor USG (citra simulasi dengan label "SIMULASI USG EDUKATIF . bukan citra pasien . tidak untuk diagnosis").
// Alasan memakai kanvas, bukan tangkapan layar halaman: pada perangkat lunak tangkapan layar penuh butuh sekitar 12 dtk per bingkai, kanvas sekitar 1,6 dtk.
// Tidak ada UI buatan: tidak ada tombol, citra, atau angka yang digambar ulang. Satu-satunya perubahan pada aplikasi: render adegan 3D dipicu perekam (satu kali per bingkai) agar adegan
// yang tidak berubah tidak digambar berulang oleh perangkat lunak; isi dan logika aplikasi tidak diubah. Jantung dijeda supaya citra berubah HANYA karena gerak probe.
// node lab.cjs <take> <folder-keluaran>   take: hook | akhir | outro | chrome
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.LAB_URL || 'http://127.0.0.1:4190/anatomy/4d-lab/';
const [take, OUT] = process.argv.slice(2);
const W = 1760, H = 950;
// rencana: tombol (data-testid) x jumlah klik. 'pad-left' = Kiri (pasien), 'rot-heelToe-plus' = miring depan-belakang +, 'rot-rock-plus' = miring ke samping +, 'rot-rotate-plus' = putar probe +
const PLAN = {
  hook: { window: 'subxiphoid', warm: ['pad-left', 12], steps: [['pad-left', 58], ['rot-heelToe-plus', 36], ['pad-right', 70], ['rot-rock-plus', 30], ['pad-left', 26]], camZoom: 4 },
  akhir: { window: 'parasternal', warm: ['pad-right', 8], steps: [['pad-right', 40], ['rot-rotate-plus', 40], ['pad-left', 60], ['rot-heelToe-minus', 36], ['pad-right', 30]], camZoom: 4 },
  outro: { window: 'subxiphoid', warm: ['pad-superior', 8], steps: [['pad-superior', 40], ['pad-left', 40], ['rot-heelToe-plus', 30]], camZoom: 4 },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'a'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'm'), { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { for (const k of ['medcoel-4dlab-tour-v2', 'medcoel-4dlab-tour-v3']) localStorage.setItem(k, 'done'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto(URL); await p.waitForFunction(() => window.__lab?.last?.id > 0, null, { timeout: 120000 });
  if (take === 'chrome') {   // satu tangkapan layar halaman asli (untuk potongan header/label UI asli)
    await p.click('[data-testid=mon-us]'); await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, 'halaman.png'), timeout: 120000 }); await b.close(); return;
  }
  const plan = PLAN[take]; if (!plan) throw new Error('take tidak dikenal');
  await p.evaluate(() => { const s = window.__lab.scene, orig = s.render.bind(s); window.__go = true; s.render = (now) => { if (window.__go) { window.__go = false; orig(now); } }; });
  const draw = () => p.evaluate(() => new Promise((r) => { window.__go = true; requestAnimationFrame(() => requestAnimationFrame(r)); }));
  await p.click('[data-testid=mon-us]'); await p.click('[data-testid=play]');
  await p.selectOption('[data-testid=pad-step]', '1'); await p.selectOption('[data-testid=rot-step]', '1');
  if (plan.window) { await p.selectOption('[data-testid=pad-window]', plan.window); await sleep(800); }
  await p.selectOption('[data-testid=pad-step]', '1'); await p.selectOption('[data-testid=rot-step]', '1');
  await p.mouse.move(370, 480); for (let i = 0; i < (plan.camZoom || 0); i++) { await p.mouse.wheel(0, -240); await draw(); }
  const settle = async (after) => { for (let i = 0; i < 400; i++) { const [id, q] = await p.evaluate(() => [window.__lab.last.id, window.__lab.last.quality]); if (id > after && q === 1) return; await sleep(30); } };
  const click = async (tid) => { const id = await p.evaluate(() => window.__lab.last.id); await p.locator(`[data-testid=${tid}]`).first().click({ timeout: 60000 }); await settle(id); };
  for (let i = 0; i < plan.warm[1]; i++) await click(plan.warm[0]);
  let n = 0; const meta = []; const t0 = Date.now();
  const grab = async (tid) => {
    await draw();
    const r = await p.evaluate(() => { const a = document.querySelector('[data-testid=patient-canvas]'), m = document.querySelector('[data-testid=monitor-canvas]'); const S = window.__lab.S; return { A: a.toDataURL('image/jpeg', 0.92), M: m.toDataURL('image/png'), pose: { c: S.contact?.point, a: S.angles } }; });
    const name = `f${String(n).padStart(4, '0')}`;
    fs.writeFileSync(path.join(OUT, 'a', name + '.jpg'), Buffer.from(r.A.split(',')[1], 'base64')); fs.writeFileSync(path.join(OUT, 'm', name + '.png'), Buffer.from(r.M.split(',')[1], 'base64'));
    meta.push({ n, act: tid, pose: r.pose }); n++;
  };
  for (const [tid, count] of plan.steps) for (let i = 0; i < count; i++) { await click(tid); await grab(tid); if (n % 40 === 0) console.log(take, n, ((Date.now() - t0) / 1000).toFixed(0), 's'); }
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));
  console.log(take, n, 'bingkai', ((Date.now() - t0) / 1000).toFixed(0), 's'); await b.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });
