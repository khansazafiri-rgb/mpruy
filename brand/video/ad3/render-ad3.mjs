// Render panggung video ke-3 menjadi MP4 tanpa suara (1080x1920, 30 fps) frame demi frame.
//   node render-ad3.mjs --stills 0.5,4,9.5      -> build/stills/*.png (setengah resolusi)
//   node render-ad3.mjs --sheet                 -> build/sheet/*.png (4 cuplikan per shot)
//   node render-ad3.mjs [--from 0 --to 75 --out video-silent.mp4 --scale 1]
// build/timeline.json (waktu bicara tiap shot, dari suara) dipakai untuk takarir dan mulut Nilo. Bila belum ada, dibuat
// perkiraan dari panjang kalimat supaya tampilan bisa dinilai sebelum suara jadi.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'narasi.json'), 'utf8'));
const BUILD = path.join(HERE, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const tlFile = path.join(BUILD, 'timeline.json');
if (!fs.existsSync(tlFile) || argv.includes('--provisional')) {
  const scenes = Object.keys(spec.shot).sort().map((k) => { const s = spec.shot[k]; const dur = s.teks.join(' ').length / 13.3 + (s.teks.length - 1) * 0.3; return { id: +k, start: s.start, end: s.end, audioStart: s.start + 0.12, audioSec: +dur.toFixed(2) }; });
  fs.writeFileSync(tlFile, JSON.stringify({ fps: spec.fps, total: spec.total, engine: 'perkiraan', scenes }));
  console.log('timeline perkiraan dibuat (belum ada suara)');
}
const timeline = JSON.parse(fs.readFileSync(tlFile, 'utf8'));
const clipsFile = path.join(HERE, 'clips', 'clips.json');
const clips = fs.existsSync(clipsFile) ? JSON.parse(fs.readFileSync(clipsFile, 'utf8')) : {};
for (const [k, c] of Object.entries(clips)) { c.base = 'clips'; c.frames = fs.readdirSync(path.join(HERE, 'clips', c.dir || k)).filter((f) => f.endsWith('.jpg')).length; }
// Klip video ke-2 (menu chat dan simulasi) dipakai ulang untuk montase menu di shot 4: kunci a2_<nama>.
const a2File = path.join(HERE, '..', 'ad2', 'clips', 'clips.json');
if (fs.existsSync(a2File)) for (const [k, c] of Object.entries(JSON.parse(fs.readFileSync(a2File, 'utf8')))) clips[`a2_${k}`] = { ...c, base: '../ad2/clips', dir: c.dir || k, frames: fs.readdirSync(path.join(HERE, '..', 'ad2', 'clips', c.dir || k)).filter((f) => f.endsWith('.jpg')).length };
const mascots = { kila: fs.readFileSync(path.join(REPO, 'apps/web/src/mascots/kila.svg'), 'utf8') };
const logo = pathToFileURL(path.join(REPO, 'apps/web/src/assets/logo-full.webp')).href;
const sprites = pathToFileURL(path.join(REPO, 'apps/web/public/simulasi')).href;
const scale = Number(opt('scale', argv.includes('--stills') || argv.includes('--sheet') ? 0.5 : 1));
const fps = spec.fps;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[halaman] galat:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[konsol]', m.text()); });
await page.goto(pathToFileURL(path.join(HERE, 'stage-ad3.html')).href, { waitUntil: 'load' });
await page.evaluate((d) => window.__init(d), { spec, timeline, mascots, logo, sprites, clips });
await page.evaluate(() => document.fonts.load('800 40px "Plus Jakarta Sans"'));

const draw = async (t) => { await page.evaluate((x) => window.__frame(x), t); };
if (argv.includes('--stills')) {
  fs.mkdirSync(path.join(BUILD, 'stills'), { recursive: true });
  for (const t of opt('stills').split(',').map(Number)) { await draw(t); await page.screenshot({ path: path.join(BUILD, 'stills', `t${String(t).replace('.', '_')}.png`) }); console.log('t', t); }
  await browser.close(); process.exit(0);
}
if (argv.includes('--sheet')) {
  fs.mkdirSync(path.join(BUILD, 'sheet'), { recursive: true });
  for (const k of Object.keys(spec.shot).sort()) { const s = spec.shot[k]; for (const [i, o] of [0.5, 1.5, 2.6, 3.8].entries()) { const t = s.start + Math.min(o, s.end - s.start - 0.05); await draw(t); await page.screenshot({ path: path.join(BUILD, 'sheet', `s${k}_${i}.png`) }); } }
  await browser.close(); console.log('lembar kontak di build/sheet'); process.exit(0);
}

const from = Number(opt('from', 0)); const to = Number(opt('to', spec.total));
const out = path.join(BUILD, opt('out', 'video-silent.mp4'));
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', scale < 1 ? 'veryfast' : 'medium', '-crf', scale < 1 ? '24' : '17', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => { ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`)))); });
const total = Math.round((to - from) * fps); const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await draw(from + f / fps);
  const buf = await page.screenshot({ type: 'jpeg', quality: scale < 1 ? 80 : 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 90 === 0) console.log(`frame ${f}/${total}  (${Math.round((Date.now() - t0) / 1000)} dtk)`);
}
ff.stdin.end(); await done; await browser.close(); console.log('selesai', out);
