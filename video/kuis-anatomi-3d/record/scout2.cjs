// Pindai cepat banyak seed: cetak soal Kenali struktur dan Temukan di 3D untuk tiap seed (tanpa menunggu viewer 3D).
const { open } = require('./rec.cjs');
const [,, from, to, region = 'Kepala', system = 'Rangka'] = process.argv;
(async () => {
  for (let seed = +from; seed <= +to; seed++) {
    const S = await open({ out: '/tmp/scout2', seed, frames: false }); const p = S.p;
    try {
      await p.getByRole('button', { name: new RegExp(region) }).first().click(); await p.waitForTimeout(300);
      await p.getByRole('button', { name: new RegExp(system) }).first().click(); await p.waitForTimeout(300);
      const res = [];
      for (const mode of ['Kenali struktur', 'Temukan di 3D']) {
        await p.locator('.library-mode-card', { hasText: mode }).click(); await p.waitForTimeout(150);
        await p.getByRole('button', { name: /Mulai kuis/ }).click(); await p.waitForSelector('.library-question h2', { timeout: 20000 }); await p.waitForTimeout(150);
        res.push(await p.evaluate(() => { const q = document.querySelector('.library-question'); return q.innerText.replace(/\n+/g, ' | ').split(' | Tekan')[0].replace('Apa nama struktur yang disorot? | ', '').slice(0, 170); }));
        await p.getByRole('button', { name: /Ubah area belajar/ }).click(); await p.waitForTimeout(150);
      }
      console.log('seed', seed, '::', res.join('  ##  '));
    } catch (e) { console.log('seed', seed, 'gagal', e.message.split('\n')[0]); }
    await S.close();
  }
})();
