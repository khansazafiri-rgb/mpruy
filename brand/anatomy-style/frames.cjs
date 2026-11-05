// node brand/anatomy-style/frames.cjs <organ> [t1 t2 ...] -> render/frames/<organ>-<t>.png (still pada waktu t dtk dalam klip 5 dtk)
// node brand/anatomy-style/frames.cjs <organ> --klip -> render/frames/<organ>/f0001.png ... (30 fps) untuk dijadikan MP4 (ffmpeg)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const [organ, ...rest] = process.argv.slice(2); const klip = rest.includes('--klip'), labels = rest.includes('--label'), dur = 5, fps = 30, tail = 0.8;
  const times = klip ? Array.from({ length: Math.round((dur + tail) * fps) }, (_, i) => Math.min(dur + tail, i / fps)) : rest.filter((x) => !x.startsWith('--')).map(Number);
  const out = path.join(__dirname, 'render', klip ? `frames/${organ}` : 'frames'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  let n = 0;
  for (const t of times) {
    n++; const name = klip ? `f${String(n).padStart(4, '0')}.png` : `${organ}-t${String(t).replace('.', '_')}.png`;
    await p.goto(`http://127.0.0.1:8128/brand/anatomy-style/render.html?obj=${organ}&anim&t=${t}${labels || klip ? '&labels' : ''}`); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
    await p.screenshot({ path: path.join(out, name) });
  }
  await b.close(); console.log('ok', organ, times.length);
})();
