// Timeline -> MP4. Chromium menggambar tiap frame (animasi CSS dibekukan ke
// waktu frame itu, jadi hasilnya selalu sama), ffmpeg menggabungkan dengan suara.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FORMATS, KIT, REPO } from './lib.mjs';

function loadMascots() {
  const dir = path.join(REPO, 'apps', 'web', 'src', 'mascots');
  const out = {};
  for (const n of ['kori', 'kila', 'nilo']) out[n] = fs.readFileSync(path.join(dir, `${n}.svg`), 'utf8');
  return out;
}

function audioFilter({ music, musicVolume, total }) {
  const norm = 'loudnorm=I=-16:TP=-1.5:LRA=11';
  if (!music) return { inputs: [], graph: `[1:a]${norm}[a]` };
  const T = total.toFixed(3);
  return {
    inputs: ['-stream_loop', '-1', '-i', music],
    graph: `[2:a]atrim=duration=${T},afade=t=in:d=1,afade=t=out:st=${Math.max(0, total - 1.5).toFixed(3)}:d=1.5,volume=${musicVolume}[m];` +
      `[1:a]asplit=2[v1][v2];[m][v1]sidechaincompress=threshold=0.04:ratio=10:attack=30:release=500[duck];` +
      `[duck][v2]amix=inputs=2:duration=longest:normalize=0[mix];[mix]${norm}[a]`,
  };
}

export async function renderVideo({ spec, specDir, timeline, voiceWav, outFile, thumbFile, format = '16:9', fps = 30, draft = false, music = null, musicVolume = 0.2, log = console.log }) {
  const fmt = FORMATS[format];
  if (!fmt) throw new Error(`Format tidak dikenal: ${format} (pilihan: ${Object.keys(FORMATS).join(', ')})`);
  const { chromium } = await import('playwright');
  const launch = {};
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launch);
  const scale = draft ? 0.5 : 1;
  const ctx = await browser.newContext({ viewport: { width: fmt.w, height: fmt.h }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log('  [halaman] galat:', e.message));
  await page.goto(pathToFileURL(path.join(KIT, 'stage', 'stage.html')).href, { waitUntil: 'load' });

  // Gambar relatif di scenes.json (visual.image.src) dibaca dari folder berkas itu.
  const spec2 = JSON.parse(JSON.stringify(spec));
  for (const sc of spec2.scenes) if (sc.visual?.kind === 'image' && sc.visual.src && !/^(https?:|file:|data:)/.test(sc.visual.src)) sc.visual.src = pathToFileURL(path.resolve(specDir, sc.visual.src)).href;
  const logo = pathToFileURL(path.join(REPO, 'apps', 'web', 'src', 'assets', 'logo-full.webp')).href;
  await page.evaluate(([s, m, l, f]) => window.__init(s, m, l, f), [{ spec: spec2, timeline }, loadMascots(), logo, fmt]);
  await page.evaluate(() => Promise.all([document.fonts.load('800 40px "Plus Jakarta Sans"'), document.fonts.load('700 40px "Caveat"')]));

  const audio = audioFilter({ music, musicVolume, total: timeline.total });
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', voiceWav, ...audio.inputs,
    '-filter_complex', audio.graph, '-map', '0:v', '-map', '[a]', '-t', timeline.total.toFixed(3),
    '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-crf', draft ? '26' : '18', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => { ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg berhenti dengan kode ${c}`)))); ff.on('error', rej); });

  const frames = Math.ceil(timeline.total * fps);
  const thumbAt = Math.min(frames - 1, Math.round((spec.thumbnailAt ?? (timeline.scenes[0].start + timeline.scenes[0].lead + Math.min(1.2, timeline.scenes[0].audioSec * 0.5))) * fps));
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.__frame(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: draft ? 80 : 95 });
    if (f === thumbAt && thumbFile) fs.writeFileSync(thumbFile, buf);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % (fps * 2) === 0) log(`  frame ${f}/${frames}  (${Math.round(((Date.now() - t0) / 1000))} dtk)`);
  }
  ff.stdin.end();
  await ffDone;
  await browser.close();
  return { frames, seconds: (Date.now() - t0) / 1000 };
}
