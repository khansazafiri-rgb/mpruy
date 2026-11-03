// Jelajah alur kuis (tanpa merekam bingkai): cetak soal, pilihan, dan jawaban benar untuk satu seed; simpan beberapa tangkapan layar.
const { open, F } = require('./rec.cjs');
const fs = require('fs');
const seed = +process.argv[2] || 12345, out = process.argv[3] || '/tmp/scout';
const region = process.env.REGION || 'Toraks', system = process.env.SYSTEM || 'Rangka';
(async () => {
  const S = await open({ out, seed, frames: false });
  const p = S.p;
  const shot = async (name) => { const r = await S.cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64')); };
  const info = () => p.evaluate(() => { const q = document.querySelector('.library-question'); return q ? q.innerText.replace(/\n+/g, ' | ').slice(0, 300) : '(tidak ada soal)'; });
  await p.getByRole('button', { name: new RegExp(region) }).first().click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: new RegExp(system) }).first().click(); await p.waitForTimeout(500);
  await shot('setup');
  for (const mode of (process.env.MODES || 'Kenali struktur').split(',')) {
    await p.locator('.library-mode-card', { hasText: mode }).click(); await p.waitForTimeout(300);
    await p.getByRole('button', { name: /Mulai kuis/ }).click();
    await S.ready(); await S.step(+process.env.STEPS || 40); await p.waitForTimeout(500);
    console.log('MODE', mode, '=>', await info());
    await shot('q_' + mode.replace(/\W+/g, '_'));
    if (mode.startsWith('Temukan')) { const [fx, fy] = (process.env.FINDXY || '30,30').split(',').map(Number); await p.mouse.move(fx, fy); await p.mouse.down(); await p.mouse.up(); await S.step(12); await p.waitForTimeout(500); }
    else { const n = await p.locator('.library-answer-options button').count(); const k = +(process.env.PICK || 0); await p.locator('.library-answer-options button').nth(k).click(); await S.step(5); await p.waitForTimeout(400); }
    console.log('  sesudah:', await info());
    console.log('  benar idx:', await p.evaluate(() => [...document.querySelectorAll('.library-answer-options button')].findIndex((b) => b.classList.contains('is-correct'))));
    await shot('a_' + mode.replace(/\W+/g, '_'));
    await p.getByRole('button', { name: /Ubah area belajar/ }).click(); await p.waitForTimeout(400);
  }
  await S.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });
