// Merekam alur kuis anatomi 3D MEDCOEL asli mengikuti waktu narasi (waktu audio). Pemakaian: node record.cjs OUT [seed] [frames=1]
// Alur: pilih regio -> pilih sistem -> pilih cara bermain (Kenali struktur) -> jawab benar -> mode Temukan di 3D (klik struktur di model)
//       -> daftar mode (Tebak sistem, Tebak regio) -> jawaban salah dan jawaban yang benar ditampilkan -> Soal berikutnya.
const { open, F } = require('./rec.cjs');
const fs = require('fs');
const ease2 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const OUT = process.argv[2] || '/tmp/kuis/quiz', SEED = +process.argv[3] || 28, FRAMES = process.argv[4] !== '0';
const CFG = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));   // regio, sistem, indeks jawaban, titik klik pada model
const T = CFG.times;
(async () => {
  const S = await open({ out: OUT, seed: SEED, frames: FRAMES, a0: CFG.a0 });
  const p = S.p, marks = {};
  const mark = (k) => { marks[k] = S.n; };
  const top = (fn, arg) => p.evaluate(fn, arg);
  const scrollTop = async (selOrText, y, k = 22) => {
    // geser halaman supaya elemen (h2 berisi teks) berada pada y piksel CSS dari atas jendela
    const cur = await p.evaluate((t) => { const e = [...document.querySelectorAll('h2,.library-session-bar,.library-quiz-viewer')].find((x) => x.textContent.includes(t) || x.className.includes(t)); return e ? e.getBoundingClientRect().top : null; }, selOrText);
    if (cur == null) throw new Error('judul tidak ketemu: ' + selOrText);
    await S.scrollBy(cur - y, k);
  };
  const wait = async () => { await p.waitForTimeout(450); };
  const clickEl = async (finder, arg, travel = 20) => { const c = await S.center(finder, arg); await S.moveTo(c[0], c[1], travel); await S.click(); };
  const waitReady = async () => { const n = await S.ready(); return n; };

  // ---- mulai: halaman kuis, bagian "Pilih bagian tubuh" di dekat bagian atas
  await p.evaluate(() => { const e = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('Pilih bagian tubuh')); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70); });
  await p.mouse.move(S.cx, S.cy); await wait();
  mark('mulai');
  await S.until(T.regionMove);
  const reg = await S.center((t) => { const e = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t) && x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, CFG.region);
  await S.moveTo(reg[0], reg[1], 22);
  await S.until(T.regionClick); await S.click(2); mark('regio');
  await wait();
  // langkah 02: sistem
  await S.until(T.systemScroll); await scrollTop('Pilih sistem anatomi', 70, 24);
  const sys = await S.center((t) => { const e = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t) && /struktur/.test(x.textContent) && x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, CFG.system);
  await S.moveTo(sys[0], sys[1], 18);
  await S.until(T.systemClick); await S.click(2); mark('sistem');
  await wait();
  // langkah 03: cara bermain
  await S.until(T.modeScroll); await scrollTop('Pilih cara bermain', 70, 24);
  const m1 = await S.center(F.mode, 'Kenali struktur'); await S.moveTo(m1[0], m1[1], 16);
  await S.until(T.modeClick); await S.click(2); mark('mode');
  await S.until(T.startMove);
  const st = await S.center(F.btn, 'Mulai kuis'); await S.moveTo(st[0], st[1], 14);
  await S.until(T.startClick); await S.click(1); mark('mulai_kuis');
  // viewer memuat (dilewati tanpa bingkai agar tidak membuang waktu narasi): beberapa bingkai "Menyiapkan struktur", lalu langsung hasil
  await S.hold(4); await waitReady(); await p.waitForTimeout(500);
  await p.evaluate(() => { const e = document.querySelector('.library-session-bar'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 14); });
  await S.until(T.quizShown); mark('soal1');
  await S.hold(2);
  // jawab (benar)
  await S.until(T.answerMove);
  const o1 = await S.center(F.opt, CFG.identify.correct); await S.moveTo(o1[0], o1[1], 22);
  await S.until(T.answerClick); await S.click(3); mark('jawab1');
  // tunjukkan umpan balik (geser sedikit)
  await p.waitForTimeout(300);
  await S.scrollBy(await p.evaluate(() => { const e = document.querySelector('.library-answer-feedback'); if (!e) return 0; const r = e.getBoundingClientRect(); return Math.max(0, r.bottom - 930); }), 16);
  mark('umpan1');

  // ---- Temukan di 3D
  await S.until(T.changeMove);
  await p.evaluate(() => window.scrollTo(0, 0)); await S.hold(1);
  const ch = await S.center(F.btn, 'Ubah area belajar'); await S.moveTo(ch[0], ch[1], 18);
  await S.until(T.changeClick); await S.click(2); mark('ubah1'); await wait();
  await S.until(T.findModeScroll); await scrollTop('Pilih cara bermain', 70, 20);
  const m2 = await S.center(F.mode, 'Temukan di 3D'); await S.moveTo(m2[0], m2[1], 16);
  await S.until(T.findModeClick); await S.click(2); mark('mode_find');
  const st2 = await S.center(F.btn, 'Mulai kuis'); await S.moveTo(st2[0], st2[1], 12);
  await S.until(T.findStartClick); await S.click(1); mark('mulai_find');
  await S.hold(3); await waitReady(); await p.waitForTimeout(500);
  await p.evaluate(() => { const e = document.querySelector('.library-session-bar'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 14); });
  await S.until(T.findShown); mark('soal2');
  // zoom (roda mouse), geser (Shift + seret), lalu klik struktur pada model 3D
  await S.until(T.pickMove);
  const vr = await p.evaluate(F.viewer);
  const at = (fx, fy) => [vr[0] + vr[2] * fx, vr[1] + vr[3] * fy];
  const zc = at(CFG.find.zoomX, CFG.find.zoomY); await S.moveTo(zc[0], zc[1], 14);
  for (let i = 0; i < CFG.find.wheelN; i++) { await p.mouse.wheel(0, CFG.find.wheelDy); await S.hold(2); }
  await S.hold(4);
  const dc = at(0.5, 0.5); await S.moveTo(dc[0], dc[1], 8);
  await p.keyboard.down('Shift'); await p.mouse.down(); S.down = true;
  for (let i = 1; i <= 10; i++) { S.cy = dc[1] + CFG.find.panDy * ease2(i / 10); await p.mouse.move(S.cx, S.cy); await S.frame(); }
  await p.mouse.up(); S.down = false; await p.keyboard.up('Shift'); await S.hold(6);
  const pc = at(CFG.find.fx, CFG.find.fy); await S.moveTo(pc[0], pc[1], 10);
  await S.until(T.pickClick); await S.click(4); mark('klik_model');
  await S.hold(8); await waitReady(); await p.waitForTimeout(400); await S.hold(2);
  await S.until(T.pickFeedback); mark('umpan2');
  await S.scrollBy(await p.evaluate(() => { const e = document.querySelector('.library-answer-feedback'); if (!e) return 0; const r = e.getBoundingClientRect(); return Math.max(0, r.bottom - 930); }), 16);

  // ---- daftar mode: Tebak sistem dan Tebak regio, lalu soal Tebak sistem
  await S.until(T.change2Move);
  await p.evaluate(() => window.scrollTo(0, 0)); await S.hold(1);
  const ch2 = await S.center(F.btn, 'Ubah area belajar'); await S.moveTo(ch2[0], ch2[1], 16);
  await S.until(T.change2Click); await S.click(2); mark('ubah2'); await wait();
  await S.until(T.modes2Scroll); await scrollTop('Pilih cara bermain', 70, 18);
  const m3 = await S.center(F.mode, 'Tebak sistem'); await S.moveTo(m3[0], m3[1], 14);
  await S.until(T.sysClick); await S.click(2); mark('mode_sistem');
  const m4 = await S.center(F.mode, 'Tebak regio'); await S.moveTo(m4[0], m4[1], 18);
  await S.until(T.regHover); await S.hold(6); mark('hover_regio');
  const m3b = await S.center(F.mode, 'Tebak sistem'); await S.moveTo(m3b[0], m3b[1], 10); await S.click(1);
  const st3 = await S.center(F.btn, 'Mulai kuis'); await S.moveTo(st3[0], st3[1], 10);
  await S.until(T.sysStartClick); await S.click(1); mark('mulai_sistem');
  await S.hold(3); await waitReady(); await p.waitForTimeout(500);
  await p.evaluate(() => { const e = document.querySelector('.library-session-bar'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 14); });
  await S.until(T.sysShown); mark('soal3');
  // jawaban salah
  await S.until(T.wrongMove);
  const ow = await S.center(F.opt, CFG.sistemQ.wrong); await S.moveTo(ow[0], ow[1], 20);
  await S.until(T.wrongClick); await S.click(3); mark('salah');
  await p.waitForTimeout(300);
  await S.scrollBy(await p.evaluate(() => { const e = document.querySelector('.library-answer-feedback'); if (!e) return 0; const r = e.getBoundingClientRect(); return Math.max(0, r.bottom - 930); }), 20);
  mark('umpan3');
  // soal berikutnya
  await S.until(T.nextMove);
  const nx = await S.center(F.btn, 'Soal berikutnya'); await S.moveTo(nx[0], nx[1], 20);
  await S.until(T.nextClick); await S.click(1); mark('berikutnya');
  await S.hold(3); await waitReady(); await p.waitForTimeout(500);
  await p.evaluate(() => { const e = document.querySelector('.library-session-bar'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 14); });
  await S.until(T.end);
  mark('selesai');
  console.log('bingkai', S.n, 'audio', S.audioT().toFixed(2), JSON.stringify(marks));
  fs.writeFileSync(OUT + '/marks.json', JSON.stringify(marks));
  await S.close();
})().catch((e) => { console.log('GAGAL', e.stack.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
