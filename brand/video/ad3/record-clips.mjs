// Klip layar web untuk video ke-3 (Latihan soal), dengan perekam per-frame ../ad2/capture.mjs (30 fps mulus, kursor POV).
//   node ad3/seed-dev.mjs                 siapkan data dev (kampus contoh, soal kampus, Drilling)
//   PACE=0.88 node ad3/record-clips.mjs [nama ...]      CAP_FAST=1 untuk uji alur tanpa menyimpan gambar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../node_modules/playwright/index.mjs';
import { openRecorder } from '../ad2/capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'clips');
const WEB = process.env.WEB_URL || 'http://127.0.0.1:3000';
const API = process.env.PB_URL || 'http://127.0.0.1:8090';
const FAST = process.env.CAP_FAST === '1';
const only = process.argv.slice(2);
const SHOT = 4.95;
const J = { 'Content-Type': 'application/json' };
const login = async (identity, password) => { const r = await fetch(`${API}/api/collections/users/auth-with-password`, { method: 'POST', headers: J, body: JSON.stringify({ identity, password }) }); if (!r.ok) throw new Error(`Login ${identity} gagal`); return r.json(); };
const user = await login('mahasiswa.dev', process.env.MEDCOEL_USER_PW || 'bcgBeAwX');
const api = async (p, o = {}) => (await fetch(`${API}/api/medcoel/${p}`, { ...o, headers: { ...J, Authorization: user.token, ...(o.headers || {}) } })).json();
for (const k of ['fk', 'dokter']) await api('me/tutorial', { method: 'POST', body: JSON.stringify({ key: k, status: 'done' }) });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const rec = (name, auth = user) => openRecorder(browser, { auth, base: WEB, outDir: path.join(OUT, name), fast: FAST });
const chapterWithQuestions = async (slug = 'anatomi', min = 5) => (await api(`subjects/${slug}`)).chapters.find((c) => c.total >= min);
const newAttempt = async (mode, count = 5) => { const ch = await chapterWithQuestions(); const a = await api('attempts/practice', { method: 'POST', body: JSON.stringify({ chapter: ch.id, count, mode }) }); if (!a.attempt) throw new Error('Gagal membuat sesi: ' + JSON.stringify(a).slice(0, 200)); return a.attempt.id; };

const CLIPS = {
  // Shot 2: halaman depan (tamu)
  async landing(R) {
    await R.goto('/'); await R.warm(0.8);
    await R.cursorAt(300, 120); R.mark('context'); await R.hold(0.5);
    await R.moveTo(180, 420, 0.7); await R.hold(0.3); R.mark('cta');
    await R.reveal('a:has-text("Daftar gratis")', { at: 0.6, sec: 0.6 });
    await R.moveTo(180, 400, 0.5); await R.hold(0.6);
    await R.reveal('text=Tanpa langganan', { at: 0.4, sec: 0.8 }); R.mark('checks'); await R.hold(0.6);
  },
  // Shot 3 dan 5: daftar mata kuliah, pilih satu
  async matkul(R) {
    await R.goto('/mata-kuliah'); await R.warm(0.8);
    await R.cursorAt(300, 180); R.mark('s3'); await R.hold(0.5);
    await R.reveal('a:has-text("BAB") >> nth=0', { at: 0.45, sec: 0.9 }); await R.hold(0.6);
    await R.scrollTo(520, 1.1); await R.hold(0.5); await R.padTo('s3', 4.4); R.mark('s3_end');
    R.mark('s5');
    await R.scrollTo(0, 0.7);
    await R.reveal('a:has-text("BAB") >> nth=0', { at: 0.45, sec: 0.6 });
    await R.moveTo(120, 760, 0.6); await R.hold(0.3);
    await R.click('a:has-text("BAB") >> nth=0', { move: 0.5, after: 0.2 });
    await R.page.waitForURL(/mata-kuliah\/.+/); await R.warm(0.5); await R.hold(0.9); await R.padTo('s5', SHOT); R.mark('s5_end');
  },
  // Shot 6: bagian "Soal kampusmu"
  async kampus(R) {
    await R.goto('/mata-kuliah'); await R.warm(0.8);
    await R.cursorAt(300, 180); R.mark('s6'); await R.hold(0.4);
    await R.reveal('.campus-library', { at: 0.4, sec: 0.8 }); await R.rect('campus', '.campus-library'); await R.hold(0.3);
    await R.click('.campus-library summary', { move: 0.55, after: 0.5 });
    await R.reveal('.campus-library-list a >> nth=0', { at: 0.55, sec: 0.6 });
    await R.moveTo(180, 470, 0.5); await R.hold(0.5); await R.padTo('s6', 5.2); R.mark('s6_end');
  },
  // Shot 7: menu > Drilling
  async drilling(R) {
    await R.goto('/mata-kuliah'); await R.warm(0.8);
    await R.cursorAt(300, 300); R.mark('s7'); await R.hold(0.4);
    await R.click('button[aria-label="Buka menu"]', { move: 0.55, after: 0.5 });
    await R.rect('drawer', '.mobile-drawer');
    await R.click('.mobile-drawer a:has-text("Drilling")', { move: 0.55, after: 0.2 });
    await R.page.waitForURL(/drilling/); await R.warm(0.6); await R.hold(0.5);
    await R.moveTo(180, 620, 0.5); await R.hold(0.4); await R.padTo('s7', 4.8); R.mark('s7_end');
  },
  // Shot 8 dan 9: pilih bab, atur jumlah dan mode
  async bab(R) {
    await R.goto('/mata-kuliah/anatomi'); await R.warm(0.9);
    await R.cursorAt(300, 300); R.mark('s8'); await R.hold(0.5);
    await R.reveal('.chapter-row >> nth=0', { at: 0.45, sec: 0.8 }); await R.rect('chapter', '.chapter-row >> nth=0');
    await R.moveTo(180, 560, 0.5); await R.hold(0.4);
    await R.scrollTo(await R.page.evaluate(() => document.scrollingElement.scrollTop + 260), 1.0); await R.hold(0.5);
    await R.padTo('s8', 4.6); R.mark('s8_end');
    R.mark('s9');
    await R.reveal('.chapter-row >> nth=0', { at: 0.4, sec: 0.5 });
    await R.click('.chapter-row >> nth=0', { move: 0.5, after: 0.5 }); await R.page.waitForSelector('.count-presets');
    await R.rect('presets', '.count-presets');
    await R.click('.count-presets button >> nth=1', { move: 0.45, after: 0.25 });
    await R.click('label.mode-choice:has-text("Mode ujian")', { move: 0.45, after: 0.3 });
    await R.click('label.mode-choice:has-text("Mode Learning")', { move: 0.35, after: 0.3 });
    await R.rect('mode', 'label.mode-choice:has-text("Mode Learning")');
    await R.padTo('s9', 5.0); R.mark('s9_end');
  },
  // Shot 10 dan 11: mode Learning, cek jawaban, pembahasan
  async learn(R) {
    const id = await newAttempt('learning', 5);
    await R.goto(`/kerjakan/${id}`); await R.warm(0.8);
    await R.cursorAt(300, 300); R.mark('s10'); await R.hold(0.5);
    await R.click('.answer-option >> nth=1', { move: 0.6, after: 0.3 }); R.mark('chose');
    await R.click('button:has-text("Cek jawaban")', { move: 0.5, after: 0.5 }); R.mark('checked');
    await R.hold(0.5); await R.padTo('s10', 4.6); R.mark('s10_end');
    R.mark('s11');
    await R.scrollTo(380, 1.0); await R.hold(0.6);
    await R.scrollTo(760, 1.1); R.mark('explain'); await R.hold(0.7);
    await R.scrollTo(1100, 1.0); await R.hold(0.6);
    await R.padTo('s11', 5.0); R.mark('s11_end');
  },
  // Shot 12 dan 13: mode ujian, selesai, hasil dan filter Salah
  async exam(R) {
    const id = await newAttempt('exam', 5);
    await R.goto(`/kerjakan/${id}`); await R.warm(0.8);
    await R.cursorAt(300, 300); R.mark('s12'); await R.hold(0.4);
    for (let i = 0; i < 3; i++) {
      await R.click(`.answer-option >> nth=${i % 2 === 0 ? 0 : 2}`, { move: 0.45, after: 0.15 });
      await R.click('button:has-text("Berikutnya")', { move: 0.4, after: 0.2 });
    }
    await R.padTo('s12', 4.8); R.mark('s12_end');
    R.mark('s13');
    await R.reveal('button:has-text("Selesai")', { at: 0.2, sec: 0.4 });
    await R.click('button:has-text("Selesai")', { move: 0.5, after: 0.3 });
    await R.click('button:has-text("Ya, selesai")', { move: 0.45, after: 0.2 });
    await R.page.waitForSelector('text=Per BAB'); await R.warm(0.8); await R.hold(0.5);
    await R.scrollTo(560, 1.0); await R.hold(0.4);
    const filter = R.page.getByRole('tab', { name: /^Salah/ }).first();
    await R.reveal(filter, { at: 0.35, sec: 0.5 });
    await R.click(filter, { move: 0.5, after: 0.4 });
    await R.padTo('s13', 5.0); R.mark('s13_end');
  },
  // Shot 14: sumber soal "pernah dijawab salah" di Coba Simulasi
  async wrong(R) {
    await R.goto('/mata-kuliah/anatomi'); await R.warm(0.9);
    await R.cursorAt(300, 300); R.mark('s14'); await R.hold(0.4);
    await R.reveal('button:has-text("Coba Simulasi")', { at: 0.5, sec: 0.7 });
    await R.click('button:has-text("Coba Simulasi")', { move: 0.55, after: 0.6 });
    await R.page.waitForSelector('#src');
    await R.click('#src', { move: 0.45, after: 0.1 });
    await R.page.selectOption('#src', 'wrong'); await R.hold(0.8); await R.rect('src', '#src');
    await R.padTo('s14', 4.9); R.mark('s14_end');
  },
  // Shot 15: riwayat
  async history(R) {
    await R.goto('/riwayat'); await R.warm(0.9);
    await R.cursorAt(300, 300); R.mark('s15'); await R.hold(0.5);
    await R.moveTo(180, 520, 0.6); await R.hold(0.3);
    await R.scrollTo(300, 0.9); await R.hold(0.4);
    await R.padTo('s15', 5.0); R.mark('s15_end');
  },
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
  console.log(`${info.duration}s (${((Date.now() - t0) / 1000).toFixed(0)} dtk nyata)`);
  if (!FAST) fs.writeFileSync(path.join(OUT, 'clips.json'), JSON.stringify(index, null, 1));
  await R.close();
}
await browser.close();
