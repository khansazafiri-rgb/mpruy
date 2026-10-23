// Rekam layar aplikasi MEDCOEL yang sungguhan (Chromium + CDP screencast) menjadi klip MP4
// 30 fps. Dipakai untuk bahan iklan: tiap klip membawa "tanda" waktu (marks) supaya
// adegan bisa memotong tepat di bagian yang dibutuhkan.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const PHONE = { width: 390, height: 844, scale: 2 };

// Dipasang ke tiap halaman: riak sentuhan + menyembunyikan angka uji coba di DB dev
// (mis. "0/6 soal") supaya tidak bertabrakan dengan klaim di iklan.
const INJECT = `(() => {
  const boot = () => {
    if (window.__adInjected) return; window.__adInjected = true;
    const st = document.createElement('style');
    st.textContent = '.ad-tap{position:fixed;z-index:2147483647;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;pointer-events:none;background:rgba(255,196,60,.55);border:3px solid #E8A91A;animation:adtap .55s ease-out forwards}@keyframes adtap{from{transform:scale(.3);opacity:1}to{transform:scale(1.35);opacity:0}}';
    document.documentElement.appendChild(st);
    const tap = (e) => { const d = document.createElement('div'); d.className = 'ad-tap'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; document.documentElement.appendChild(d); setTimeout(() => d.remove(), 650); };
    addEventListener('pointerdown', tap, true);
    setInterval(() => {
      for (const el of document.querySelectorAll('span,p,div,dd,output,b')) {
        const t = (el.textContent || '').trim();
        if (t.length < 30 && el.querySelectorAll('*').length <= 3 && /^\\d+\\s*\\/\\s*\\d+(\\s*soal( dikerjakan)?)?$/.test(t)) el.style.visibility = 'hidden';
      }
    }, 120);
  };
  if (document.documentElement) boot(); else addEventListener('DOMContentLoaded', boot);
})();`;

export async function newPhone(browser, { auth, base }) {
  const ctx = await browser.newContext({ viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: PHONE.scale, isMobile: true, hasTouch: true, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
  await ctx.addInitScript(INJECT);
  if (auth) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['pocketbase_auth', JSON.stringify({ token: auth.token, record: auth.record })]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  return { ctx, page, base };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Gulir halus (px, durasi ms) di elemen/halaman, supaya terlihat seperti jari. */
export async function glide(page, to, ms = 900, selector = null) {
  await page.evaluate(([to2, ms2, sel]) => new Promise((res) => {
    const el = sel ? document.querySelector(sel) : (document.scrollingElement || document.documentElement);
    const from = el.scrollTop; const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms2); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = from + (to2 - from) * e; k < 1 ? requestAnimationFrame(step) : res(); };
    requestAnimationFrame(step);
  }), [to, ms, selector]);
}

/**
 * Merekam `run({ page, mark })` menjadi out/<name>.mp4 dan mengembalikan { duration, marks }.
 * mark('nama') mencatat detik ke-berapa di klip.
 */
export async function recordClip(browser, { name, auth, base, outDir, run }) {
  fs.mkdirSync(outDir, { recursive: true });
  const work = path.join(outDir, `.${name}-frames`);
  fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
  const { ctx, page } = await newPhone(browser, { auth, base });
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const i = frames.length; fs.writeFileSync(path.join(work, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
    frames.push(metadata.timestamp);
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const marks = {};
  const nowSec = () => Date.now() / 1000;
  await run({
    page, ctx,
    start: async () => { await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: PHONE.width * PHONE.scale, maxHeight: PHONE.height * PHONE.scale, everyNthFrame: 1 }) },
    mark: (n) => { marks[n] = nowSec(); },
  });
  const endWall = nowSec();
  await cdp.send('Page.stopScreencast').catch(() => {});
  await ctx.close();
  if (!frames.length) throw new Error(`Klip ${name}: tidak ada frame`);
  // Tabel durasi: tiap frame ditahan sampai frame berikutnya (frame terakhir sampai selesai).
  const t0 = frames[0];
  const lines = [];
  frames.forEach((t, i) => {
    const next = i + 1 < frames.length ? frames[i + 1] : Math.max(t + 0.1, endWall);
    lines.push(`file 'f${String(i).padStart(5, '0')}.jpg'`, `duration ${Math.max(0.001, next - t).toFixed(4)}`);
  });
  lines.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  fs.writeFileSync(path.join(work, 'list.txt'), lines.join('\n'));
  const out = path.join(outDir, `${name}.mp4`);
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'), '-vf', `fps=30,scale=${PHONE.width * PHONE.scale}:${PHONE.height * PHONE.scale}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-movflags', '+faststart', out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
  fs.rmSync(work, { recursive: true, force: true });
  for (const k of Object.keys(marks)) marks[k] = +Math.max(0, marks[k] - t0).toFixed(2);
  const dur = +(Math.max(frames.at(-1) + 0.1, endWall) - t0).toFixed(2);
  return { name, file: `${name}.mp4`, duration: dur, marks };
}
