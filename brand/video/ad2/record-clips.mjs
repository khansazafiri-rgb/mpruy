// Merekam klip layar web untuk video ke-2 (Simulasi Jadi Dokter) dengan perekam per-frame (capture.mjs):
// 30 fps mulus, kursor POV terlihat, kartu web 360x640 utuh (tanpa dipotong).
//   node ad2/record-clips.mjs [nama ...]        (web di WEB_URL, PocketBase di PB_URL; data dev)
//   CAP_FAST=1 node ad2/record-clips.mjs sim     uji alur tanpa menyimpan gambar (lebih cepat)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../node_modules/playwright/index.mjs';
import { BYID, DX } from '../../../apps/web/src/features/simulasi/engine.js';
import { openRecorder } from './capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'clips');
const WEB = process.env.WEB_URL || 'http://127.0.0.1:3000';
const API = process.env.PB_URL || 'http://127.0.0.1:8090';
const FAST = process.env.CAP_FAST === '1';
const only = process.argv.slice(2);
const SHOT = 4.95; // panjang tiap shot simulasi (jendela 5 detik)
const PDF = path.join(HERE, '..', 'ad', 'assets', 'Soal-UTS-Anatomi-2023.pdf');
const J = { 'Content-Type': 'application/json' };

const login = async (identity, password) => {
  const r = await fetch(`${API}/api/collections/users/auth-with-password`, { method: 'POST', headers: J, body: JSON.stringify({ identity, password }) });
  if (!r.ok) throw new Error(`Login ${identity} gagal (${r.status}). Isi MEDCOEL_USER_PW.`);
  return r.json();
};
const user = await login('mahasiswa.dev', process.env.MEDCOEL_USER_PW || 'bcgBeAwX');
const api = async (p, o = {}) => (await fetch(`${API}/api/medcoel/${p}`, { ...o, headers: { ...J, Authorization: user.token, ...(o.headers || {}) } })).json();
for (const k of ['fk', 'dokter']) await api('me/tutorial', { method: 'POST', body: JSON.stringify({ key: k, status: 'done' }) });
const content = await api('doctor-sim/content');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const rec = (name, auth = user) => openRecorder(browser, { auth, base: WEB, outDir: path.join(OUT, name), fast: FAST });
const btn = (page, name, o = {}) => page.getByRole('button', { name, exact: o.exact }).first();

const CLIPS = {
  // Shot 2: halaman depan (tamu), tombol Daftar gratis disorot.
  async landing(R) {
    await R.goto('/'); await R.warm(0.8);
    await R.cursorAt(300, 120); R.mark('context'); await R.hold(0.5);
    await R.rect('kicker', 'text=Untuk mahasiswa kedokteran');
    await R.moveTo(180, 420, 0.7); await R.hold(0.3);
    await R.rect('cta', 'a:has-text("Daftar gratis")'); R.mark('cta');
    await R.reveal('a:has-text("Daftar gratis")', { at: 0.6, sec: 0.6 });
    await R.moveTo(180, 400, 0.5); await R.hold(0.6);
    await R.reveal('text=Tanpa langganan', { at: 0.4, sec: 0.8 }); R.mark('checks'); await R.hold(0.6);
  },
  // Shot 3: daftar mata kuliah lalu BAB.
  async subjects(R) {
    await R.goto('/mata-kuliah'); await R.warm(0.8);
    await R.cursorAt(300, 180); R.mark('context'); await R.hold(0.6);
    await R.reveal('a:has-text("BAB") >> nth=0', { at: 0.45, sec: 0.8 }); R.mark('cards'); await R.hold(0.3);
    await R.rect('card', 'a:has-text("BAB") >> nth=0');
    await R.click('a:has-text("BAB") >> nth=0', { move: 0.6, after: 0.2 });
    await R.page.waitForURL(/mata-kuliah\/.+/); await R.warm(0.6); R.mark('bab');
    await R.hold(0.5); await R.reveal('.chapter-row >> nth=0', { at: 0.4, sec: 0.8 });
    await R.rect('chapter', '.chapter-row >> nth=0'); await R.hold(0.9);
  },
  // Shot 4: latihan soal dengan pembahasan tiap pilihan.
  async practice(R) {
    const sub = await api('subjects/anatomi'); const ch = sub.chapters.find((c) => c.total >= 5);
    const att = await api('attempts/practice', { method: 'POST', body: JSON.stringify({ chapter: ch.id, count: 5, mode: 'learning' }) });
    await R.goto(`/kerjakan/${att.attempt.id}`); await R.warm(0.8);
    await R.cursorAt(300, 300); R.mark('question'); await R.hold(0.5);
    await R.rect('options', '[role=radiogroup]');
    await R.click('.answer-option >> nth=1', { move: 0.6, after: 0.3 }); R.mark('chose');
    await R.rect('check', 'button:has-text("Cek jawaban")');
    await R.click('button:has-text("Cek jawaban")', { move: 0.5, after: 0.5 }); R.mark('checked');
    await R.rect('options_after', '[role=radiogroup]');
    await R.scrollTo(520, 1.0); R.mark('explain'); await R.hold(0.7);
  },
  // Shot 5: kirim PDF lewat Chat Admin.
  async chat(R) {
    await R.goto('/chat-admin'); await R.warm(1.0);
    await R.cursorAt(300, 400); R.mark('open'); await R.hold(0.5);
    await R.rect('chip_upload', 'button:has-text("Upload soal PDF")');
    await R.click('button:has-text("Upload soal PDF")', { move: 0.55, after: 0.8 }); R.mark('tap_upload');
    await R.reveal('button:has-text("Anatomi")', { at: 0.6, sec: 0.6, container: '.chat-thread' });
    await R.rect('chip_subject', 'button:has-text("Anatomi")');
    await R.click('button:has-text("Anatomi")', { move: 0.55, after: 0.8 }); R.mark('subject_tap');
    await R.click('button:has-text("Ya, sudah ada")', { move: 0.5, after: 0.8 });
    await R.click('button:has-text("Indonesia")', { move: 0.5, after: 0.8 });
    await R.click('button:has-text("General")', { move: 0.5, after: 0.8 }); R.mark('scope_done');
    await R.click('.chat-chips button:text-is("1")', { move: 0.5, after: 0.9 }); R.mark('files');
    await R.reveal('.chat-drop', { at: 0.55, sec: 0.5, container: '.chat-thread' }); await R.rect('drop', '.chat-drop'); await R.hold(0.4);
    await R.moveTo(180, 330, 0.5);
    await R.page.locator('input[type=file]').setInputFiles(PDF); R.mark('file_picked'); await R.hold(1.0);
    await R.rect('file_row', '.chat-file >> nth=0'); await R.rect('next', 'button:has-text("Lanjut ke ringkasan")'); R.mark('file_added');
    await R.click('button:has-text("Lanjut ke ringkasan")', { move: 0.5, after: 0.9 }); R.mark('summary');
  },
  // Shot 6: leaderboard.
  async leaderboard(R) {
    await R.goto('/leaderboard'); await R.warm(1.0);
    await R.cursorAt(300, 200); R.mark('context'); await R.hold(0.7);
    await R.moveTo(160, 330, 0.7); await R.hold(0.5);
    await R.scrollTo(260, 1.1); R.mark('list'); await R.hold(0.9);
    await R.scrollTo(520, 1.0); await R.hold(0.5);
  },
};

// Shot 7-14: satu sesi simulasi tanpa putus. Kasusnya diundi (biji acak tetap) dari poli umum; langkahnya diambil dari
// data kasus itu sendiri, jadi tiap pilihan (pertanyaan, pemeriksaan, penunjang, rencana, diagnosis) memang sesuai kasus.
CLIPS.sim = async (R) => {
  const page = R.page;
  const sheet = page.locator('.sim-sheet');
  let sheets = 0;
  // Lembar alasan: pilih alasan yang benar (diagnosis kerja kasus ini); bila belum tepat, coba pilihan berikutnya.
  const answerSheet = async (dxName, ddxNames = []) => {
    if (!(await sheet.isVisible().catch(() => false))) return false;
    R.mark(`sheet${++sheets}`);
    await R.hold(0.35);
    const isDdx = /Diagnosis banding/.test(await page.locator('#sim-sheet-title').innerText());
    const prefer = isDdx ? ddxNames : [dxName, ...ddxNames];
    for (let guard = 0; guard < 8 && (await sheet.isVisible().catch(() => false)); guard++) {
      const opts = await page.locator('.sim-sheet-opts button:not([disabled])').all();
      const texts = await Promise.all(opts.map((o) => o.innerText()));
      let idx = -1;
      for (const want of prefer) { idx = texts.findIndex((t) => t.includes(want)); if (idx >= 0) break; }
      if (idx < 0) idx = texts.findIndex((t) => !/Tidak ada/.test(t));
      if (idx < 0) idx = 0;
      await R.click(opts[idx], { move: 0.45, after: 0.2 });
      await R.hold(0.1);
    }
    return true;
  };

  // --- Shot 7: layar awal, pilih poli dan mode
  await R.goto('/simulasi-dokter'); await R.warm(1.0);
  await R.cursorAt(300, 330); R.mark('s7'); await R.hold(0.5);
  await R.rect('poli', '.sim-start button:has-text("Umum") >> nth=0').catch(() => {});
  const poliBtn = page.getByRole('button', { name: /^Umum/ }).first();
  await R.reveal(poliBtn, { at: 0.45, sec: 0.5 });
  await R.click(poliBtn, { move: 0.55, after: 0.35 });
  const berwaktu = page.getByRole('button', { name: /Berwaktu/ }).first();
  await R.reveal(berwaktu, { at: 0.55, sec: 0.5 });
  await R.rect('mode', page.getByRole('button', { name: /Santai/ }).first());
  await R.click(berwaktu, { move: 0.5, after: 0.3 });
  await R.click(page.getByRole('button', { name: /Santai/ }).first(), { move: 0.4, after: 0.3 });
  const start = page.getByRole('button', { name: /Mulai/ }).first();
  await R.reveal(start, { at: 0.6, sec: 0.5 }); await R.rect('start', start);
  await R.click(start, { move: 0.5, after: 0.2 }); await R.padTo('s7', SHOT); R.mark('s7_end');
  // Kasus diundi acak oleh aplikasi; supaya rekaman selalu memakai kasus pilihan, buka kasusnya langsung (mode dev: ?kasus=).
  const caseKey = process.env.CASE || 'dbd';
  await R.goto(`/simulasi-dokter?kasus=${caseKey}`); await page.waitForSelector('.sim-dialog'); await R.warm(0.4);
  const C = content.cases[caseKey];
  const dxName = DX[C.dxOk]?.[0] || content.dx?.[C.dxOk]?.[0] || '';
  const ddxNames = (C.ddx || []).filter((k) => k !== C.dxOk).map((k) => DX[k]?.[0] || content.dx?.[k]?.[0]).filter(Boolean);
  const dxAll = { ...(content.dx || {}) };
  const keyIds = String(C.K).split(/\s+/).filter(Boolean).map((id) => BYID[id]).filter(Boolean);
  const useIds = String(C.U || '').split(/\s+/).filter(Boolean).map((id) => BYID[id]).filter(Boolean);
  const byTab = (tab) => [...keyIds, ...useIds].filter((it) => it.tab === tab);
  const prefer = (list, ...ids) => { for (const id of ids) { const f = list.find((it) => it.id === id); if (f) return f; } return list[0]; };
  console.log('kasus:', caseKey, '|', C.title, '| dx:', dxName, '| ddx:', ddxNames.join(', '));
  const pickByLabel = async (it) => {
    // cari lewat kotak pencarian bila belum terlihat
    const row = page.locator('.sim-opt').filter({ hasText: it.label.replace(/^“|”$/g, '') }).first();
    if (!(await row.isVisible().catch(() => false))) {
      const word = (it.label.match(/[A-Za-zÀ-ÿ]{5,}/g) || [it.label]).sort((a, b) => b.length - a.length)[0];
      await R.reveal('.sim-search input', { at: 0.3, sec: 0.6 });
      await R.click('.sim-search input', { move: 0.45, after: 0.1 });
      await R.type('.sim-search input', word, 12);
    }
    return page.locator('.sim-opt').filter({ hasText: it.label.replace(/^“|”$/g, '') }).first();
  };
  // Jelajah area -> sistem sampai butir ditemukan (area pertama dulu), lalu pilih dan jawab alasan.
  const viaAreas = async (it) => {
    const want = page.locator('.sim-opt').filter({ hasText: it.label }).first();
    const areas = page.locator('.sim-area');
    const n = await areas.count();
    for (let i = 0; i < n; i++) {
      await R.reveal('.sim-areas', { at: 0.3, sec: 0.3 });
      await R.click(areas.nth(i), { move: 0.4, after: 0.15 });
      const sysBtns = page.locator('.sim-sys button'); const ns = await sysBtns.count();
      for (let j = 0; j < Math.max(1, ns); j++) {
        if (ns) await R.click(sysBtns.nth(j), { move: 0.3, after: 0.1 });
        if (await want.isVisible().catch(() => false)) return want;
      }
      await R.click('.sim-back', { move: 0.35, after: 0.1 });
    }
    throw new Error(`butir tidak ditemukan lewat area: ${it.label}`);
  };
  const doItem = async (it) => {
    const row = await pickByLabel(it);
    await R.reveal(row, { at: 0.4, sec: 0.5 });
    await R.click(row, { move: 0.45, after: 0.2 });
    await answerSheet(dxName, ddxNames);
    await R.hold(0.2);
  };

  // --- Shot 8: anamnesis (POV: ketuk dialog, ke panel, ketik pencarian, pilih, jawab alasan, kembali ke dialog)
  R.mark('s8'); R.setPace(0.68);
  const dialog = page.locator('.sim-dialog');
  await R.reveal(dialog, { at: 0.3, sec: 0.3 });
  await R.click(dialog, { move: 0.45, after: 0.2 });          // ketuk lanjut
  await doItem(prefer(byTab('anam').filter((it) => it.kind === 'pas'), 'demam', 'sakit_kepala', 'onset'));
  await R.reveal(dialog, { at: 0.3, sec: 0.7 });                // kembali ke dialog: jawaban pasien
  await R.hold(0.7); await R.padTo('s8', SHOT); R.mark('s8_end'); R.setPace(Number(process.env.PACE || 1));

  // --- Shot 9: pemeriksaan fisik
  R.mark('s9');
  await R.reveal('.sim-steps', { at: 0.25, sec: 0.4 });
  await R.click('.sim-steps li:nth-child(2) button', { move: 0.45, after: 0.15 });
  const fis = prefer(byTab('fisik'), 'vital', 'kulit', 'ku_gcs');
  const frow = await viaAreas(fis);
  await R.reveal(frow, { at: 0.4, sec: 0.35 }); await R.click(frow, { move: 0.45, after: 0.2 });
  await answerSheet(dxName, ddxNames);
  await R.reveal('.sim-dialog', { at: 0.3, sec: 0.6 }); await R.hold(0.7); await R.padTo('s9', SHOT); R.mark('s9_end');

  // --- Shot 10: penunjang yang relevan (satu saja, bukan semua tes)
  R.mark('s10');
  await R.reveal('.sim-steps', { at: 0.25, sec: 0.4 });
  await R.click('.sim-steps li:nth-child(3) button', { move: 0.45, after: 0.15 });
  const pen = prefer(byTab('penunjang'), 'dl', 'ns1', 'ronsen');
  if (!pen) throw new Error(`kasus ${caseKey} tidak punya penunjang yang relevan`);
  console.log('penunjang:', pen.id, '|', pen.label);
  const prow = await viaAreas(pen);
  await R.reveal(prow, { at: 0.4, sec: 0.35 }); await R.click(prow, { move: 0.45, after: 0.2 });
  await answerSheet(dxName, ddxNames);
  await R.reveal('.sim-dialog', { at: 0.3, sec: 0.6 }); await R.hold(0.7); await R.padTo('s10', SHOT); R.mark('s10_end');

  // --- Shot 11: rencana dan diagnosis
  R.mark('s11');
  await R.reveal('.sim-steps', { at: 0.25, sec: 0.4 });
  await R.click('.sim-steps li:nth-child(4) button', { move: 0.45, after: 0.2 });
  await R.rect('plan', '.sim-areas');
  await R.hold(0.5);
  await R.click('.sim-steps li:nth-child(5) button', { move: 0.45, after: 0.15 });
  await R.reveal('#sim-dx-sel', { at: 0.4, sec: 0.4 });
  await R.click('#sim-dx-sel', { move: 0.45, after: 0.05 });
  await page.selectOption('#sim-dx-sel', C.dxOk); await R.hold(0.35);
  await R.click('.sim-dx-form button[type=submit]', { move: 0.4, after: 0.15 });
  await answerSheet(dxName, ddxNames);                           // "diagnosis banding apa yang masih perlu disingkirkan?"
  await R.rect('dx', '.sim-dx-set'); await R.hold(0.4); await R.padTo('s11', SHOT); R.mark('s11_end');

  // --- Shot 12: catatan SOAP terisi otomatis
  R.mark('s12');
  const notesHead = page.locator('.sim-notes-head');
  await R.reveal(notesHead, { at: 0.2, sec: 0.7 });
  if ((await notesHead.getAttribute('aria-expanded')) !== 'true') await R.click(notesHead, { move: 0.5, after: 0.5 });
  await R.reveal('.sim-soap', { at: 0.3, sec: 0.5 }); await R.rect('soap', '.sim-soap');
  await R.hold(0.8);
  await R.scrollTo(await page.evaluate(() => document.scrollingElement.scrollTop + 260), 0.9); await R.hold(0.5); await R.padTo('s12', SHOT); R.mark('s12_end');

  // --- Shot 13: akhiri konsultasi lalu laporan
  R.mark('s13');
  await R.reveal('.sim-finish', { at: 0.5, sec: 0.6 });
  await R.click('.sim-finish', { move: 0.5, after: 0.3 });
  await answerSheet(dxName, ddxNames);
  await page.waitForSelector('.sim-report'); await R.warm(0.4);
  await R.reveal('.sim-report', { at: 0.05, sec: 0.7 }); await R.rect('report', '.sim-report');
  await R.hold(0.9); await R.scrollTo(await page.evaluate(() => document.scrollingElement.scrollTop + 520), 1.1); await R.hold(0.5); await R.padTo('s13', SHOT); R.mark('s13_end');

  // --- Shot 14: coba lagi / pasien berikutnya
  R.mark('s14');
  await R.reveal('.sim-report-btns', { at: 0.6, sec: 0.9 });
  await R.rect('retry', 'button:has-text("Ulangi kasus ini")'); await R.rect('next', 'button:has-text("Pasien berikutnya")');
  await R.hold(0.5);
  await R.click('button:has-text("Pasien berikutnya")', { move: 0.55, after: 0.2 });
  await page.waitForSelector('.sim-dialog'); await R.warm(0.4);
  await R.hold(1.6); await R.padTo('s14', SHOT); R.mark('s14_end');
};

const index = fs.existsSync(path.join(OUT, 'clips.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'clips.json'), 'utf8')) : {};
fs.mkdirSync(OUT, { recursive: true });
for (const [name, run] of Object.entries(CLIPS)) {
  if (only.length && !only.includes(name)) continue;
  process.stdout.write(`rekam ${name} ... `);
  const t0 = Date.now();
  const R = await rec(name, name === 'landing' ? null : user);
  try { await run(R); } catch (e) { console.log('\nGAGAL:', e.message.split('\n')[0], '\n', (e.stack || '').split('\n').slice(1, 4).join('\n')); await R.page.screenshot({ path: path.join(OUT, `gagal-${name}.png`) }); await R.close(); process.exitCode = 1; continue; }
  const info = R.result(name); index[name] = info;
  console.log(`${info.duration}s (${((Date.now() - t0) / 1000).toFixed(0)} dtk nyata)`, JSON.stringify(info.marks));
  if (!FAST) fs.writeFileSync(path.join(OUT, 'clips.json'), JSON.stringify(index, null, 1));
  await R.close();
}
await browser.close();
