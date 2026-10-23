// Merekam semua klip layar aplikasi untuk iklan 75 detik "Kirim PDF soalmu".
// Prasyarat: web (WEB_URL, bawaan http://127.0.0.1:3000) dan PocketBase (PB_URL, bawaan
// http://127.0.0.1:8090) jalan dengan data dev + scripts/seed-demo.mjs sudah dijalankan.
//   MEDCOEL_USER_PW=... MEDCOEL_ADMIN_PW=... node ad/record-clips.mjs [nama-klip ...]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glide, recordClip, wait } from '../src/record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'clips');
const ASSETS = path.join(HERE, 'assets');
const WEB = process.env.WEB_URL || 'http://127.0.0.1:3000';
const API = process.env.PB_URL || 'http://127.0.0.1:8090';
const only = process.argv.slice(2);

const login = async (identity, password) => {
  const r = await fetch(`${API}/api/collections/users/auth-with-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity, password }) });
  if (!r.ok) throw new Error(`Login ${identity} gagal (${r.status}). Isi MEDCOEL_USER_PW / MEDCOEL_ADMIN_PW.`);
  return r.json();
};
const user = await login('mahasiswa.dev', process.env.MEDCOEL_USER_PW);
const admin = await login('admin.dev', process.env.MEDCOEL_ADMIN_PW);
for (const k of ['fk', 'dokter']) await fetch(`${API}/api/medcoel/me/tutorial`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: user.token }, body: JSON.stringify({ key: k, status: 'done' }) });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// PDF contoh: lembar "soal lama angkatan" buatan sendiri (bukan soal kampus siapa pun).
const pdf = path.join(ASSETS, 'Soal-UTS-Anatomi-2023.pdf');
if (!fs.existsSync(pdf)) {
  const p = await browser.newPage();
  await p.setContent(`<html><body style="font-family:Georgia,serif;padding:40px"><h2>UTS Anatomi · contoh</h2><ol><li>Otot yang memulai abduksi lengan atas adalah ...</li><li>Saraf yang terkena pada fraktur collum chirurgicum humeri ...</li><li>Struktur pada sulcus nervi radialis ...</li></ol></body></html>`);
  await p.pdf({ path: pdf, format: 'A4' }); await p.close();
}

const clicks = async (page, text, opts = {}) => { const el = page.getByRole('button', { name: text, exact: opts.exact }).first(); await el.scrollIntoViewIfNeeded(); await wait(opts.before ?? 250); await el.tap(); };

const CLIPS = {
  async landing({ page, start, mark }) {
    await page.goto(`${WEB}/`); await wait(1200); await start(); mark('top'); await wait(1500);
    await glide(page, 620, 1800); mark('mid'); await wait(900); await glide(page, 0, 1100); await wait(500);
  },
  async subjects({ page, start, mark }) {
    await page.goto(`${WEB}/mata-kuliah`); await wait(1400); await start(); mark('top'); await wait(1200);
    await glide(page, 520, 1800); mark('scrolled'); await wait(1000);
  },
  async bab({ page, start, mark }) {
    await page.goto(`${WEB}/mata-kuliah/anatomi`); await wait(1400); await start(); mark('top'); await wait(1000);
    await glide(page, 760, 1900); mark('bab'); await wait(1000); await glide(page, 1500, 1800); mark('bab2'); await wait(800);
  },
  async home({ page, start, mark }) {
    await page.goto(`${WEB}/beranda`); await wait(1400); await start(); mark('top'); await wait(1200);
    await glide(page, 480, 1600); await wait(700);
  },
  async sim({ page, start, mark }) {
    await page.goto(`${WEB}/simulasi-dokter`); await wait(1500); await start(); mark('top'); await wait(1500);
    await glide(page, 420, 1500); await wait(700);
  },
  async chat({ page, start, mark }) {
    await page.goto(`${WEB}/chat-admin`); await wait(1500); await start(); mark('open'); await wait(1400);
    mark('menu'); await clicks(page, /Upload soal PDF/); mark('tap_upload'); await wait(1300);
    mark('subject'); await clicks(page, 'Anatomi', { exact: true }); await wait(1300);
    mark('haskey'); await clicks(page, /Ya, sudah ada/); await wait(1300);
    mark('language'); await clicks(page, 'Indonesia', { exact: true }); await wait(1300);
    mark('scope'); await wait(1000); await clicks(page, /Hanya kampus saya|Semua kampus/); mark('scope_done'); await wait(1300);
    mark('count'); await clicks(page, '1', { exact: true }); await wait(1600);
    mark('files'); await wait(1200);
    await page.locator('input[type=file]').setInputFiles(pdf); mark('file_picked'); await wait(2200);
    mark('file_added'); await clicks(page, /Lanjut ke ringkasan/); await wait(1500); mark('summary');
    await glide(page, 400, 900, '.chat-thread'); await wait(600);
    await page.getByRole('checkbox').check(); await wait(500);
    await clicks(page, /Kirim pengajuan/); await wait(1800); mark('sent'); await wait(1200);
  },
  async admin({ page, start, mark }) {
    await page.goto(`${WEB}/admin/pengajuan`); await wait(1800); await start(); mark('list'); await wait(1400);
    mark('before_confirm'); await clicks(page, /Tandai terkonfirmasi/); await wait(1400); mark('confirmed'); await wait(900);
  },
  async learn({ page, start, mark }) {
    await page.goto(`${WEB}/mata-kuliah/anatomi`); await wait(1400); await start(); mark('top');
    await glide(page, 700, 1100); await wait(500); mark('chapters');
    await page.locator('.chapter-row').first().tap(); await wait(1200); mark('modal');
    await page.getByRole('button', { name: /^Mulai \d+ soal/ }).tap(); await wait(2200); mark('question');
    await page.locator('.answer-option').nth(1).tap(); await wait(900); mark('chose');
    await page.getByRole('button', { name: /Cek jawaban/ }).tap(); await wait(1600); mark('checked');
    await glide(page, 520, 1300); mark('explain'); await wait(1400);
  },
};

const index = fs.existsSync(path.join(OUT, 'clips.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'clips.json'), 'utf8')) : {};
fs.mkdirSync(OUT, { recursive: true });
for (const [name, run] of Object.entries(CLIPS)) {
  if (only.length && !only.includes(name)) continue;
  const auth = name === 'landing' ? null : name === 'admin' ? admin : user;
  process.stdout.write(`rekam ${name} ... `);
  const info = await recordClip(browser, { name, auth, base: WEB, outDir: OUT, run });
  index[name] = info;
  console.log(`${info.duration}s`, JSON.stringify(info.marks));
  fs.writeFileSync(path.join(OUT, 'clips.json'), JSON.stringify(index, null, 1));
}
await browser.close();
