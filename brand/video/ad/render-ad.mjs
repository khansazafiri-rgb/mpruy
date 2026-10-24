// Render panggung iklan.
//   node render-ad.mjs --stills 0.5,4,9.5     -> build/stills/*.png (setengah resolusi, cek cepat)
//   node render-ad.mjs --sheet                -> build/sheet-XX.png (lembar kontak semua shot)
//   node render-ad.mjs                        -> build/video-silent.mp4 (1080x1920, 30 fps, tanpa suara)
//   opsi: --scale 0.5 (default 1) --from 10 --to 20 (detik)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, '..'); const REPO = path.resolve(KIT, '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'ad.json'), 'utf8'));
const timeline = JSON.parse(fs.readFileSync(path.join(HERE, 'build', 'timeline.json'), 'utf8'));
const mascots = Object.fromEntries(['kori', 'kila', 'nilo'].map((n) => [n, fs.readFileSync(path.join(REPO, 'apps/web/src/mascots', `${n}.svg`), 'utf8')]));
const clips = JSON.parse(fs.readFileSync(path.join(HERE, 'clips', 'clips.json'), 'utf8'));
const frames = Object.fromEntries(fs.readdirSync(path.join(HERE, 'build/frames')).map((c) => [c, fs.readdirSync(path.join(HERE, 'build/frames', c)).length]));
const scale = Number(opt('scale', argv.includes('--stills') || argv.includes('--sheet') ? 0.5 : 1));
const fps = spec.fps;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[halaman] galat:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[konsol]', m.text()); });
await page.goto(pathToFileURL(path.join(HERE, 'stage-ad.html')).href, { waitUntil: 'load' });
const logo = pathToFileURL(path.join(REPO, 'apps/web/src/assets/logo-full.webp')).href;
await page.evaluate((d) => window.__init(d), { spec, timeline, mascots, logo, frames, clips });
await page.evaluate(() => Promise.all([document.fonts.load('800 40px "Plus Jakarta Sans"')]));

if (argv.includes('--stills')) {
  fs.mkdirSync(path.join(HERE, 'build/stills'), { recursive: true });
  for (const t of opt('stills').split(',').map(Number)) { await page.evaluate((x) => window.__frame(x), t); await page.screenshot({ path: path.join(HERE, 'build/stills', `t${String(t).replace('.', '_')}.png`) }); console.log('t', t); }
  await browser.close(); process.exit(0);
}
if (argv.includes('--sheet')) {
  fs.mkdirSync(path.join(HERE, 'build/sheet'), { recursive: true });
  const offs = [0.5, 1.6, 2.8, 4.2];
  for (const sc of spec.scenes) for (const [k, o] of offs.entries()) {
    const t = sc.start + Math.min(o, sc.end - sc.start - 0.05); await page.evaluate((x) => window.__frame(x), t);
    await page.screenshot({ path: path.join(HERE, 'build/sheet', `s${String(sc.id).padStart(2, '0')}_${k}.png`) });
  }
  await browser.close(); console.log('lembar kontak di build/sheet'); process.exit(0);
}

const from = Number(opt('from', 0)); const to = Number(opt('to', spec.total));
const out = path.join(HERE, 'build', opt('out', 'video-silent.mp4'));
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', scale < 1 ? 'veryfast' : 'medium', '-crf', scale < 1 ? '24' : '17', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => { ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`)))); });
const total = Math.round((to - from) * fps); const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate((x) => window.__frame(x), from + f / fps);
  const buf = await page.screenshot({ type: 'jpeg', quality: scale < 1 ? 80 : 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(`frame ${f}/${total}  (${Math.round((Date.now() - t0) / 1000)} dtk)`);
}
ff.stdin.end(); await done; await browser.close(); console.log('selesai', out);
