// Merekam semua klip layar aplikasi untuk iklan 75 detik "Kirim PDF soalmu".
// Prasyarat: web (WEB_URL, bawaan http://127.0.0.1:3000) dan PocketBase (PB_URL, bawaan
// http://127.0.0.1:8090) jalan dengan data dev + scripts/seed-demo.mjs sudah dijalankan.
//   MEDCOEL_USER_PW=... MEDCOEL_ADMIN_PW=... node ad/record-clips.mjs [nama-klip ...]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glide, LAUNCH_ARGS, recordClip, wait } from '../src/record.mjs';

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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: LAUNCH_ARGS });

// PDF contoh: lembar "soal lama angkatan" buatan sendiri (bukan soal kampus siapa pun).
const pdf = path.join(ASSETS, 'Soal-UTS-Anatomi-2023.pdf');
if (!fs.existsSync(pdf)) {
  const p = await browser.newPage();
  await p.setContent(`<html><body style="font-family:Georgia,serif;padding:40px"><h2>UTS Anatomi · contoh</h2><ol><li>Otot yang memulai abduksi lengan atas adalah ...</li><li>Saraf yang terkena pada fraktur collum chirurgicum humeri ...</li><li>Struktur pada sulcus nervi radialis ...</li></ol></body></html>`);
  await p.pdf({ path: pdf, format: 'A4' }); await p.close();
}

const clicks = async (page, text, opts = {}) => { const el = page.getByRole('button', { name: text, exact: opts.exact }).first(); await el.scrollIntoViewIfNeeded(); await wait(opts.before ?? 250); await el.tap(); };
// Gulir halus sampai elemen berada `top` piksel dari tepi atas layar.
const scrollTo = async (page, locator, top = 140, ms = 1000) => {
  const y = await locator.first().evaluate((el, t) => el.getBoundingClientRect().top + window.scrollY - t, top);
  await glide(page, Math.max(0, y), ms);
};

// Tiap klip: konteks halaman dulu (beberapa detik), baru tombol/area yang penting. rect() menyimpan
// posisi elemen untuk sorotan di panggung. Ukuran layar 360x640 piksel CSS, DPR 3 = 1080x1920.
const CLIPS = {
  async landing({ page, start, mark, rect }) {
    await page.goto(`${WEB}/`); await wait(1300); await start(); mark('context'); await wait(900);
    await rect('kicker', page.getByText('Untuk mahasiswa kedokteran'));
    await wait(1100); await rect('cta', page.getByRole('link', { name: /Daftar gratis/ }));
    mark('cta'); await wait(1200);
    await scrollTo(page, page.getByText('Tanpa langganan'), 260, 1100); mark('checks'); await wait(300);
    await rect('checks', page.getByText('Tanpa langganan')); await wait(1300);
  },
  async subjects({ page, start, mark, rect }) {
    await page.goto(`${WEB}/mata-kuliah`); await wait(1400); await start(); mark('context'); await wait(900);
    await rect('pills', page.getByRole('button', { name: /^Semua/ }));
    await wait(900); await scrollTo(page, page.getByRole('link').filter({ hasText: 'BAB' }).first(), 200, 1100);
    mark('cards'); await wait(300); await rect('card', page.getByRole('link').filter({ hasText: 'BAB' }).first()); await wait(1200);
    await glide(page, 560, 1200); mark('more'); await wait(900);
  },
  async bab({ page, start, mark, rect }) {
    await page.goto(`${WEB}/mata-kuliah/anatomi`); await wait(1500); await start(); mark('context'); await wait(1200);
    await scrollTo(page, page.locator('.chapter-row').first(), 230, 1300); mark('chapters'); await wait(300);
    await rect('chapter', page.locator('.chapter-row').first()); await wait(1500);
    await glide(page, 1200, 1200); mark('more'); await wait(700);
  },
  async sim({ page, start, mark, rect }) {
    await page.goto(`${WEB}/simulasi-dokter`); await wait(1500); await start(); mark('context'); await wait(1300);
    await rect('start', page.getByRole('button', { name: /Mulai pasien baru/ }).or(page.getByRole('link', { name: /Mulai pasien baru/ })));
    mark('start'); await wait(1400);
  },
  async chat({ page, start, mark, rect }) {
    await page.goto(`${WEB}/chat-admin`); await wait(1600); await start(); mark('open'); await wait(1300);
    await rect('chip_upload', page.getByRole('button', { name: /Upload soal PDF/ })); mark('menu'); await wait(900);
    await clicks(page, /Upload soal PDF/); mark('tap_upload'); await wait(1400);
    mark('subject'); await page.getByRole('button', { name: 'Anatomi', exact: true }).scrollIntoViewIfNeeded(); await wait(700); await rect('chip_subject', page.getByRole('button', { name: 'Anatomi', exact: true })); await wait(1000);
    await clicks(page, 'Anatomi', { exact: true }); mark('subject_tap'); await wait(1300);
    mark('haskey'); await clicks(page, /Ya, sudah ada/); await wait(1200);
    mark('language'); await clicks(page, 'Indonesia', { exact: true }); await wait(1300);
    mark('scope'); await wait(500);
    await rect('chip_campus', page.getByRole('button', { name: /Hanya kampus saya/ })); await rect('chip_all', page.getByRole('button', { name: 'Semua kampus', exact: true })); await wait(1900);
    await clicks(page, /Hanya kampus saya|Semua kampus/); mark('scope_done'); await wait(1300);
    mark('count'); await clicks(page, '1', { exact: true }); await wait(1600);
    mark('files'); await rect('drop', page.locator('.chat-drop')); await wait(1300);
    await page.locator('input[type=file]').setInputFiles(pdf); mark('file_picked'); await wait(2200);
    mark('file_added'); await rect('file_row', page.locator('.chat-file').first()); await rect('next', page.getByRole('button', { name: /Lanjut ke ringkasan/ })); await wait(900);
    await clicks(page, /Lanjut ke ringkasan/); await wait(1500); mark('summary');
    await glide(page, 400, 900, '.chat-thread'); await wait(600);
    await page.getByRole('checkbox').check(); await wait(500);
    await clicks(page, /Kirim pengajuan/); await wait(2400); mark('sent'); await page.getByText(/tercatat dengan status/).first().scrollIntoViewIfNeeded(); await wait(700); await rect('sent', page.getByText(/tercatat dengan status/)); await wait(1400);
  },
  async profile({ page, start, mark, rect }) {
    await page.goto(`${WEB}/profil`); await wait(1500); await start(); mark('context'); await wait(900);
    await scrollTo(page, page.getByText('Kampus sekarang'), 150, 1400); await wait(500);
    mark('campus'); await rect('campus_card', page.getByText('Kampus sekarang')); await wait(900);
    await page.locator('#pf-campus').tap(); mark('picker_open'); await wait(1200);
    await rect('picker', page.locator('#pf-campus')); await page.getByLabel('Cari kampus').pressSequentially('Syiah', { delay: 90 }); await wait(1300);
    await page.waitForFunction(() => document.querySelectorAll('[role=option]').length === 1); await wait(400); await rect('option', page.locator('[role=option]').first()); mark('option'); await wait(1200);
  },
  async admin({ page, start, mark, rect }) {
    await page.goto(`${WEB}/admin/pengajuan`); await wait(1800); await start(); mark('context'); await wait(1300);
    const card = page.locator('.card').filter({ hasText: /MC\d+/ }).first();
    await scrollTo(page, card, 120, 1100); await wait(300);
    await rect('card', card); await rect('confirm', card.getByRole('button', { name: /Tandai terkonfirmasi/ })); mark('before_confirm'); await wait(1500);
    await card.getByRole('button', { name: /Tandai terkonfirmasi/ }).tap(); await wait(1500); mark('confirmed');
    await rect('card_after', page.locator('.card').filter({ hasText: /MC\d+/ }).first()); await wait(1000);
  },
  async learn({ page, start, mark, rect }) {
    await page.goto(`${WEB}/mata-kuliah/anatomi`); await wait(1500); await start(); mark('context'); await wait(800);
    await scrollTo(page, page.locator('.chapter-row').first(), 230, 1100); await wait(300); mark('chapters');
    await rect('chapter', page.locator('.chapter-row').first()); await wait(1100);
    await page.locator('.chapter-row').first().tap(); await wait(1300); mark('modal');
    await rect('start', page.getByRole('button', { name: /^Mulai \d+ soal/ })); await wait(800);
    await page.getByRole('button', { name: /^Mulai \d+ soal/ }).tap(); await wait(2300); mark('question');
    await rect('question', page.locator('.answer-option').first()); await wait(500);
    await page.locator('.answer-option').nth(1).tap(); await wait(900); mark('chose');
    await rect('check', page.getByRole('button', { name: /Cek jawaban/ })); await wait(500);
    await page.getByRole('button', { name: /Cek jawaban/ }).tap(); await wait(1700); mark('checked');
    await rect('options', page.getByRole('radiogroup')); await wait(1200);
    await glide(page, 520, 1300); mark('explain'); await rect('options_after', page.getByRole('radiogroup')); await wait(1500);
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
