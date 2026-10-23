// Ekspor maskot ke brand/mascots: satu SVG per maskot (siap untuk desain/video)
// dan studio.html untuk melihat ekspresi dan merekam animasi.
// Jalankan: npm run mascots --prefix apps/web
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', 'src');
const out = path.join(here, '..', '..', '..', 'brand', 'mascots');
fs.mkdirSync(out, { recursive: true });

const names = ['kori', 'kila', 'nilo'];
const css = fs.readFileSync(path.join(src, 'styles', 'mascot.css'), 'utf8');
const svgs = Object.fromEntries(names.map((n) => [n, fs.readFileSync(path.join(src, 'mascots', `${n}.svg`), 'utf8').trim()]));

for (const n of names) fs.writeFileSync(path.join(out, `${n}.svg`), `${svgs[n]}\n`);

const moods = ['idle', 'wave', 'think', 'happy', 'talk', 'cheer'];
const studio = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Studio Maskot MEDCOEL</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#f6f3ea;color:#172b38}
header{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:16px 20px;border-bottom:1px solid #e3dccb;background:#fff}
header h1{font-size:18px;margin:0 16px 0 0}
button{font:inherit;border:1.5px solid #17383022;background:#fff;border-radius:999px;padding:7px 14px;cursor:pointer;font-weight:600}
button[aria-pressed=true]{background:#0a3830;color:#f6f3ea;border-color:#0a3830}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;padding:24px}
figure{margin:0;background:var(--stage,#fff);border-radius:24px;padding:24px;display:grid;place-items:center;gap:10px}
figcaption{font-weight:700}
body.green figure{--stage:#0a3830;color:#f6f3ea}
body.clear figure{--stage:transparent}
.size{width:var(--s,220px);height:var(--s,220px)}
${css}
</style></head><body>
<header><h1>Studio Maskot</h1>
<span>Ekspresi:</span>${moods.map((m) => `<button data-mood="${m}" aria-pressed="${m === 'wave'}">${m}</button>`).join('')}
<span style="margin-left:12px">Latar:</span><button data-bg="" aria-pressed="true">putih</button><button data-bg="green" aria-pressed="false">hijau</button><button data-bg="clear" aria-pressed="false">transparan</button>
<span style="margin-left:12px">Ukuran:</span><button data-size="160px">S</button><button data-size="220px">M</button><button data-size="420px">L</button>
</header>
<main>${names.map((n) => `<figure><span class="mc-character mood-wave size">${svgs[n]}</span><figcaption>${n[0].toUpperCase()}${n.slice(1)}</figcaption></figure>`).join('')}</main>
<script>
const set=(sel,attr,fn)=>document.querySelectorAll(sel).forEach(b=>b.onclick=()=>{document.querySelectorAll(sel).forEach(x=>x.setAttribute('aria-pressed',x===b));fn(b.dataset[attr])});
set('[data-mood]','mood',m=>document.querySelectorAll('.mc-character').forEach(c=>c.className='mc-character size mood-'+m));
set('[data-bg]','bg',v=>document.body.className=v);
set('[data-size]','size',v=>document.documentElement.style.setProperty('--s',v));
</script></body></html>
`;
fs.writeFileSync(path.join(out, 'studio.html'), studio);
console.log('maskot diekspor ke', out);
