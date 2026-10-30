// ---------- Simulasi Dokter asli: poli -> anamnesis -> pemeriksaan (alasan salah lalu benar) -> diagnosis -> laporan -> ulangi ----------
await p.goto(APP + '/simulasi-dokter'); await p.waitForSelector('text=Mau jaga di poli apa'); await sleep(1200);
await p.evaluate(() => window.__curMove(430, 560, 1)); await sleep(200);
T0 = performance.now(); wall0 = Date.now() / 1000;
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1000, maxHeight: 1300, everyNthFrame: 1 });
const start = performance.now();
mark('mulai rekam');
const R = (dt) => now() + dt;                       // waktu relatif
const wait = async (dt) => { await at(R(dt)); };
try {
  await tap(p.getByRole('button', { name: /Umum/ }).first(), R(1.2), { dur: 0.7 }); mark('poli umum');
  await tap(p.getByRole('button', { name: /Mulai di/ }), R(1.5), { dur: 0.8 });
  await p.waitForSelector('.sim-dialog'); await sleep(600); mark('pasien masuk');
  const hdr = await p.evaluate(() => (document.body.innerText.match(/(Pak|Bu|Nn|Ny|An|Tn)\.? [A-Za-z]+, \d+ tahun/) || [])[0]);
  const kasus = simCases.find((c) => hdr && c.title.startsWith(hdr));
  console.log('pasien:', hdr, '→ dx', kasus && kasus.dxOk, 'ddx', kasus && kasus.data.ddx);
  await wait(1.0);
  await tap(p.locator('.sim-dialog'), R(0.9), { dur: 0.5 }); mark('dialog lanjut');
  await wait(1.5);
  await smooth(430, R(0.1), 800); await wait(0.9);
  await tap(p.getByText('Keluhan utama', { exact: true }), R(1.2), { dur: 0.8 }); mark('area keluhan utama');
  await tap(p.locator('.sim-opt').nth(0), R(1.3), { dur: 0.8 }); mark('pertanyaan 1');
  await smooth(0, R(0.4), 700); await wait(2.0);
  await smooth(430, R(0.1), 700);
  await tap(p.locator('.sim-opt').nth(1), R(1.2), { dur: 0.7 }); mark('pertanyaan 2');
  await smooth(0, R(0.4), 700); await wait(2.0);
  await smooth(430, R(0.1), 700); await wait(0.5);
  // ---- pemeriksaan fisik: alasan salah dulu, lalu benar
  await tap(p.getByRole('button', { name: /2\s*Fisik/ }), R(1.2), { dur: 0.7 });
  await tap(p.getByText('Pemeriksaan umum', { exact: true }), R(1.2), { dur: 0.7 });
  const reasonLoop = async (order) => {
    let accepted = false, sawWrong = false;
    for (const act of order) {
      if (accepted) break;
      await tap(act, R(1.2), { dur: 0.7 });
      if (!(await p.waitForSelector('.sim-sheet', { timeout: 1500 }).then(() => true).catch(() => false))) { accepted = true; break; }
      mark('lembar alasan'); await wait(1.0);
      await tap(p.locator('.sim-sheet-opts button', { hasText: 'Tidak ada' }), R(1.0), { dur: 0.7 }); await sleep(900); mark('alasan salah (umpan balik)'); sawWrong = true;
      await wait(1.8);
      const labels = await p.locator('.sim-sheet-opts button:not(.is-none)').allInnerTexts();
      for (let i = 0; i < labels.length && (await p.locator('.sim-sheet').count()); i++) {
        const b2 = p.locator('.sim-sheet-opts button:not(.is-none):not(.is-wrong)').first();
        if (!(await b2.count())) break;
        await tap(b2, R(1.0), { dur: 0.6, click: false }); await b2.click(); await sleep(900);
        if (!(await p.locator('.sim-sheet').count())) { accepted = true; mark('alasan diterima'); break; }
      }
      if (!accepted && (await p.locator('.sim-sheet').count())) { await p.getByRole('button', { name: 'Batal' }).click().catch(() => {}); await sleep(500); }
    }
    return { accepted, sawWrong };
  };
  await reasonLoop([p.locator('.sim-opt', { hasText: 'Tanda vital' })]);
  await wait(1.0);
  await tap(p.getByRole('button', { name: /3\s*Penunjang/ }), R(1.2), { dur: 0.7 });
  await tap(p.locator('.sim-area').first(), R(1.2), { dur: 0.7 });
  const pr = await reasonLoop([p.locator('.sim-opt').nth(0), p.locator('.sim-opt').nth(1), p.locator('.sim-opt').nth(2), p.locator('.sim-opt').nth(3)]);
  console.log('penunjang:', pr);
  await wait(2.0);
  // ---- diagnosis: sengaja pilih diagnosis banding dulu
  await tap(p.getByRole('button', { name: /5\s*Diagnosis/ }), R(1.2), { dur: 0.7 });
  const sel = p.locator('select', { hasText: 'Pilih diagnosis' });
  await tap(sel, R(1.2), { dur: 0.7, click: false });
  await p.evaluate(() => window.__curFx());
  const ddxPick = kasus ? (kasus.data.ddx || []).find((k) => k !== kasus.dxOk) : null;
  if (ddxPick) await sel.selectOption(ddxPick).catch((e) => console.log('selectOption gagal', e.message));
  await wait(0.8);
  await tap(p.getByRole('button', { name: 'Tetapkan' }), R(1.0), { dur: 0.7 }); mark('diagnosis ditetapkan');
  await p.waitForSelector('.sim-sheet-opts button').catch(() => {});
  await wait(1.6);
  await tap(p.locator('.sim-sheet-opts button').first(), R(1.2), { dur: 0.7 }); await sleep(600);
  await wait(1.2);
  await tap(p.getByRole('button', { name: /Akhiri konsultasi/ }), R(1.2), { dur: 0.8 }); mark('akhiri konsultasi');
  await p.waitForSelector('text=Laporan konsultasi', { timeout: 10000 }).catch(() => console.log('laporan belum muncul')); mark('laporan');
  await wait(1.8);
  const sy = await p.evaluate(() => window.scrollY);
  await smooth(sy + 380, R(0.2), 1400); await wait(2.4);
  await smooth(sy + 900, R(0.2), 1500); await wait(2.6);
  await smooth(sy + 1500, R(0.2), 1500); await wait(2.6);
  await tap(p.getByRole('button', { name: /Ulangi kasus ini/ }), R(1.4), { dur: 0.9 }); mark('ulangi kasus');
  await wait(2.6);
} catch (e) { console.log('GAGAL di', now().toFixed(2), e.message.split('\n')[0]); try { await p.screenshot({ path: OUT + '/fail.png' }); console.log(await p.evaluate(() => document.body.innerText.slice(0, 400))); } catch (e2) {} }
await cdp.send('Page.stopScreencast');
await sleep(300);
fs.writeFileSync(OUT + '/frames.json', JSON.stringify({ wall0, tstart: TSTART, tend: now(), frames, marks }));
console.log('frame:', frames.length, 'durasi rekam', (performance.now() - start) / 1000);
await browser.close();
