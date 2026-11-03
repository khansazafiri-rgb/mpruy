// Jelajah interaksi model pada mode Temukan di 3D: zoom dengan roda mouse, geser, klik; simpan tangkapan layar tiap langkah.
// Pemakaian: ACTIONS='[["wheel",270,238,-120,6],["shot","a"],["click",270,238],["shot","b"]]' node explore.cjs SEED OUT
const { open, F } = require('./rec.cjs');
const fs = require('fs');
const seed = +process.argv[2] || 19, out = process.argv[3] || '/tmp/explore';
const region = process.env.REGION || 'Toraks', system = process.env.SYSTEM || 'Rangka';
(async () => {
  const S = await open({ out, seed, frames: false }); const p = S.p;
  const shot = async (name) => { const r = await S.cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64')); };
  await p.getByRole('button', { name: new RegExp(region) }).first().click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: new RegExp(system) }).first().click(); await p.waitForTimeout(400);
  await p.locator('.library-mode-card', { hasText: 'Kenali struktur' }).click(); await p.getByRole('button', { name: /Mulai kuis/ }).click();
  await p.waitForSelector('.library-question h2'); await p.waitForTimeout(300);
  await p.getByRole('button', { name: /Ubah area belajar/ }).click(); await p.waitForTimeout(300);
  await p.locator('.library-mode-card', { hasText: 'Temukan di 3D' }).click(); await p.getByRole('button', { name: /Mulai kuis/ }).click();
  await S.ready(); await S.step(30); await p.waitForTimeout(400);
  await p.evaluate(() => { const e = document.querySelector('.library-session-bar'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 14); }); await p.waitForTimeout(300);
  const vr = await p.evaluate(F.viewer); console.log('viewer', JSON.stringify(vr));
  for (const a of JSON.parse(process.env.ACTIONS || '[]')) {
    const [kind, ...r] = a;
    if (kind === 'wheel') { const [fx, fy, dy, n] = r; await p.mouse.move(vr[0] + vr[2] * fx, vr[1] + vr[3] * fy); for (let i = 0; i < n; i++) { await p.mouse.wheel(0, dy); await S.step(6); } await S.step(30); }
    else if (kind === 'drag') { const [fx, fy, dx, dy, shift] = r; const x = vr[0] + vr[2] * fx, y = vr[1] + vr[3] * fy; await p.mouse.move(x, y); if (shift) await p.keyboard.down('Shift'); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(x + dx * i / 12, y + dy * i / 12); await S.step(1); } await p.mouse.up(); if (shift) await p.keyboard.up('Shift'); await S.step(30); }
    else if (kind === 'click') { const [fx, fy] = r; await p.mouse.move(vr[0] + vr[2] * fx, vr[1] + vr[3] * fy); await p.mouse.down(); await p.mouse.up(); await S.step(10); await p.waitForTimeout(500); console.log('klik =>', await p.evaluate(() => document.querySelector('.library-question').innerText.replace(/\n+/g, ' | ').slice(0, 220))); }
    else if (kind === 'shot') { await shot(r[0]); }
  }
  await S.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });
