// Rekam layar aplikasi MEDCOEL yang sungguhan (Chromium + CDP screencast) menjadi klip MP4
// 30 fps. Dipakai untuk bahan iklan: tiap klip membawa "tanda" waktu (marks) supaya
// adegan bisa memotong tepat di bagian yang dibutuhkan.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 360x640 piksel CSS x 3 = tepat 1080x1920 (kanvas iklan vertikal), jadi tangkapan layar
// tidak perlu diperbesar atau dipotong.
export const PHONE = { width: 360, height: 640, scale: 3 };
// Chromium harus dijalankan dengan args ini supaya screencast memakai skala 3 (1080x1920 asli, bukan 360x640 yang diperbesar).
export const LAUNCH_ARGS = [`--force-device-scale-factor=${PHONE.scale}`];

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
    // Angka uji coba di database dev ("3/6 soal dikerjakan", "1 siap dikerjakan") tidak boleh
    // bertabrakan dengan klaim iklan, jadi elemen itu disembunyikan (layout tetap, hanya tak terlihat).
    const rules = [
      /^\\d+\\s*\\/\\s*\\d+(\\s*soal)?(\\s*dikerjakan)?$/i,
      /^\\d+\\s*\\/\\s*\\d+\\s*soal/i,
      /^\\d+ siap dikerjakan/i,
      /^(Siap|Soal) dikerjakan\\s*\\d+(\\s*\\/\\s*\\d+)?$/i,
    ];
    setInterval(() => {
      for (const el of document.querySelectorAll('span,p,div,dd,output,b,li')) {
        const t = (el.textContent || '').trim();
        if (t.length < 70 && el.querySelectorAll('*').length <= 5 && rules.some((r) => r.test(t))) el.style.visibility = 'hidden';
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
  // Screencast hanya menangkap area jendela. Jendela headless bawaan menyisakan 553 px CSS (bukan 640),
  // sehingga bagian bawah terpotong dan klip terentang; jendela dibuat cukup tinggi (640 + 87 px bingkai).
  const bs = await browser.newBrowserCDPSession();
  const { windowId } = await (await ctx.newCDPSession(page)).send('Browser.getWindowForTarget');
  await bs.send('Browser.setWindowBounds', { windowId, bounds: { width: PHONE.width, height: PHONE.height + 87 } });
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
  // Frame pertama screencast kadang berukuran kecil (mis. 360x553). ffmpeg lalu menyeragamkan seluruh
  // klip ke ukuran itu sehingga hasilnya buram dan terentang; hanya frame berukuran penuh yang dipakai.
  const jpegWidth = (b) => { for (let i = 2; i < b.length - 9;) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xC3) return b.readUInt16BE(i + 7); i += 2 + b.readUInt16BE(i + 2); } return 0; };
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    const buf = Buffer.from(data, 'base64');
    if (jpegWidth(buf) !== PHONE.width * PHONE.scale) return;
    const i = frames.length; fs.writeFileSync(path.join(work, `f${String(i).padStart(5, '0')}.jpg`), buf);
    frames.push(metadata.timestamp);
  });
  const marks = {};
  const rects = {};
  const nowSec = () => Date.now() / 1000;
  await run({
    page, ctx,
    start: async () => {
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: PHONE.width * PHONE.scale, maxHeight: PHONE.height * PHONE.scale, everyNthFrame: 1 });
      // Screencast hanya mengirim frame saat tampilan berubah, jadi halaman diam perlu "dicolek" sampai frame penuh pertama tiba.
      for (let i = 0; i < 40 && !frames.length; i++) {
        await page.evaluate((k) => { document.body.style.opacity = k ? '0.999' : ''; }, i % 2 === 0);
        await new Promise((r) => setTimeout(r, 100));
      }
      await page.evaluate(() => { document.body.style.opacity = ''; });
      if (!frames.length) throw new Error(`Klip ${name}: frame penuh tidak pernah tiba`);
    },
    mark: (n) => { marks[n] = nowSec(); },
    // Simpan posisi elemen (piksel CSS) pada saat ini; panggung memakainya untuk menyorot tombol/area.
    rect: async (n, locator) => {
      // getBoundingClientRect dipakai langsung: boundingBox() Playwright kadang null untuk elemen
      // di dalam daftar yang baru muncul, padahal terlihat.
      // Tunggu sampai posisinya stabil (halaman bisa masih menggulir) supaya sorotan tepat di elemen.
      const read = () => locator.first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      let b = await read(); let calm = 0;
      for (let i = 0; i < 30 && calm < 4; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const c = await read();
        const same = Math.abs(c.x - b.x) < .5 && Math.abs(c.y - b.y) < .5 && Math.abs(c.w - b.w) < .5 && Math.abs(c.h - b.h) < .5;
        calm = same ? calm + 1 : 0; b = c;
      }
      if (!(b.w > 0 && b.h > 0)) throw new Error(`rect ${n}: elemen tidak terlihat`);
      rects[n] = { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.w.toFixed(1), h: +b.h.toFixed(1), at: nowSec() };
    },
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
  for (const k of Object.keys(rects)) { rects[k].t = +Math.max(0, rects[k].at - t0).toFixed(2); delete rects[k].at; }
  const dur = +(Math.max(frames.at(-1) + 0.1, endWall) - t0).toFixed(2);
  return { name, file: `${name}.mp4`, duration: dur, marks, rects, viewport: { w: PHONE.width, h: PHONE.height, scale: PHONE.scale } };
}
