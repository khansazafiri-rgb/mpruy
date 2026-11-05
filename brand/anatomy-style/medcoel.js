// Sistem visual anatomi MEDCOEL (dipakai bersama oleh gigi, kulit, jantung). Seluruh nilai berasal dari ASET MEREK yang ADA di repo:
//   warna  : apps/web/src/index.css (--brand #007060, --brand-dark #00584E, --gold #F8C038, --ink #172B38, --page #F8F7F3, --academic #255F85, --progress #63579B, --coral #B0444F)
//            brand/video/stage/stage.css (--forest #0A3830, --paper #F6F3EA, --mint #C4E4D2; grid garis hijau di latar kertas)
//   tipografi: Plus Jakarta Sans 600-800 (judul/label), Caveat (catatan tangan), berkas font di video/darah-tinggi/stage/fonts
//   logo   : apps/web/src/assets/logo-full.webp dan logo-mark.webp (huruf C bersudut membulat + bintang empat sudut emas)
//   karakter: brand/characters (Raka, dll) dan brand/mascots (Kori, Kila, Nilo): bentuk datar, kontur tinta tebal, bayangan keras, hijau mint #9DE0BD/#55C79D, bintang emas
// Yang DITURUNKAN (orisinal): latar hijau-hutan berlapis (kolam cahaya teal, kisi garis merek, busur "C" dari bentuk logo, kilau bintang emas), aturan cahaya (kunci kiri-atas azimut 225, pantul mint kanan-bawah,
//   bayangan navy-hijau tinta, kilau tajam emas hanya di beberapa titik), kontur tinta tipis di tepi jaringan, chip label (krem + titik emas), serta pustaka gerak (easing, kamera, tempo).
// Tidak memakai latar ungu-magenta, bokeh, atau komposisi dari gambar acuan pihak lain.
import { W, H, f1, rng, fx, TEMA_MEDCOEL } from './anatomi.js';
export { TEMA_MEDCOEL };
export const MC = { brand: '#007060', brandDark: '#00584E', gold: '#F8C038', ink: '#172B38', ivory: '#F8F7F3', forest: '#0A3830', forest2: '#104C40', paper: '#F6F3EA', mint: '#C4E4D2', mint2: '#9DE0BD', mint3: '#55C79D', academic: '#255F85', progress: '#63579B', coral: '#B0444F' };
export const FONT = "'Plus Jakarta Sans', Inter, system-ui, sans-serif";
const LOGO_FULL = '../../apps/web/src/assets/logo-full.webp', LOGO_MARK = '../../apps/web/src/assets/logo-mark.webp';

// ---------------------------------------------------------------- latar berlapis (id: bg-dasar, bg-grid, bg-busur, bg-kilau, bg-grain); fokus = pusat organ
export function latar(p, o = {}) {
  const r = rng(o.seed ?? 5), f = o.fokus ?? { x: 540, y: 1000 }, t = o.t ?? 0;
  let s = `<defs>
 <radialGradient id="${p}mcGold" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${MC.gold}" stop-opacity=".2"/><stop offset="1" stop-color="${MC.gold}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p}mcMint" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${MC.mint3}" stop-opacity=".28"/><stop offset="1" stop-color="${MC.mint3}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p}mcFade" cx=".5" cy=".5" r=".5"><stop offset=".25" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
 <mask id="${p}mcGridMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><ellipse cx="${f.x}" cy="${f.y}" rx="860" ry="1000" fill="url(#${p}mcFade)"/></mask>
 <filter id="${p}mcGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>
</defs>`;
  // 1. dasar: gradasi hutan + kolam cahaya teal dari kiri-atas (searah cahaya kunci) + pantulan emas hangat samar di kanan-bawah
  s += `<g id="bg-dasar"><rect width="${W}" height="${H}" fill="url(#${p}bg)"/><ellipse cx="${f.x - 220}" cy="${f.y - 380}" rx="780" ry="720" fill="url(#${p}glow)" opacity=".85"/><ellipse cx="${f.x + 260}" cy="${f.y + 520}" rx="620" ry="420" fill="url(#${p}mcGold)"/><ellipse cx="${f.x}" cy="${f.y + 40}" rx="600" ry="620" fill="url(#${p}mcMint)"/></g>`;
  // 2. kisi: garis tipis seperti latar kertas berpetak merek; kisi kecil tiap 90 px, kisi besar tiap 360 px; memudar menjauhi organ
  let g = '';
  for (let x = 0; x <= W; x += 90) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${MC.mint}" stroke-width="${x % 360 ? 1.4 : 2.6}" opacity="${x % 360 ? 0.1 : 0.17}"/>`;
  for (let y = 0; y <= H; y += 90) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${MC.mint}" stroke-width="${y % 360 ? 1.4 : 2.6}" opacity="${y % 360 ? 0.1 : 0.17}"/>`;
  s += `<g id="bg-grid" mask="url(#${p}mcGridMask)">${g}</g>`;
  // 3. busur "C": gema bentuk logo (huruf C bersudut membulat, tepi kanan terbuka), tiga lapis bersarang, sangat samar
  const arc = (x, y, w, h, rx, sw, op, col) => `<path d="M${x + w} ${y}H${x + rx}A${rx} ${rx} 0 0 0 ${x} ${y + rx}V${y + h - rx}A${rx} ${rx} 0 0 0 ${x + rx} ${y + h}H${x + w}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/>`;
  s += `<g id="bg-busur">${arc(f.x - 760, f.y - 820, 1180, 1500, 220, 30, 0.07, MC.brand)}${arc(f.x - 700, f.y - 700, 1000, 1260, 180, 26, 0.09, MC.mint3)}${arc(f.x - 640, f.y - 580, 820, 1020, 140, 22, 0.11, MC.mint)}</g>`;
  // 4. kilau bintang empat sudut (dari logo), jarang, di luar area organ
  const star = (sz) => `M0 ${-sz}C${sz * 0.1} ${-sz * 0.22} ${sz * 0.22} ${-sz * 0.1} ${sz} 0C${sz * 0.22} ${sz * 0.1} ${sz * 0.1} ${sz * 0.22} 0 ${sz}C${-sz * 0.1} ${sz * 0.22} ${-sz * 0.22} ${sz * 0.1} ${-sz} 0C${-sz * 0.22} ${-sz * 0.1} ${-sz * 0.1} ${-sz * 0.22} 0 ${-sz}Z`;
  let k = '';
  const spots = o.kilau ?? [[120, 330, 30], [960, 250, 22], [1000, 1560, 34], [90, 1620, 18], [880, 1810, 16], [240, 1780, 24]];
  spots.forEach(([x, y, sz], i) => { const tw = 0.62 + 0.38 * Math.sin(t * 1.7 + i * 1.9); k += `<g transform="translate(${x} ${y}) scale(${f1(0.9 + 0.12 * tw)})" opacity="${f1(0.55 * tw + 0.3)}"><path d="${star(sz * 1.9)}" fill="${MC.gold}" opacity=".16" filter="url(#${p}blur8)"/><path d="${star(sz)}" fill="${MC.gold}"/></g>`; });
  s += `<g id="bg-kilau">${k}</g>`;
  s += `<rect id="bg-grain" width="${W}" height="${H}" filter="url(#${p}mcGrain)" opacity=".1" style="mix-blend-mode:soft-light"/>`;
  return fx(s);
}
// merek: logo asli (pil krem seperti panggung video) + judul; pada render bersih saja
export function merek(o = {}) {
  const s = `<g id="mc-merek"><rect x="52" y="48" width="${o.lebar ?? 312}" height="76" rx="38" fill="${MC.ivory}" opacity=".96"/><image href="${LOGO_FULL}" x="74" y="61" height="50" preserveAspectRatio="xMinYMid meet"/></g>`;
  const judul = o.judul ? `<g id="mc-judul"><text x="60" y="206" font-family="${FONT}" font-weight="800" font-size="58" fill="${MC.ivory}">${o.judul}</text>${o.sub ? `<text x="60" y="252" font-family="${FONT}" font-weight="600" font-size="32" fill="${MC.mint}">${o.sub}</text>` : ''}<rect x="60" y="274" width="86" height="8" rx="4" fill="${MC.gold}"/></g>` : '';
  return fx(s + judul);
}
export const maskot = (nama, x, y, ukuran = 260) => fx(`<image id="mc-maskot" href="../mascots/${nama}.svg" x="${x}" y="${y}" width="${ukuran}" height="${ukuran}"/>`);

// ---------------------------------------------------------------- label: chip krem + titik emas + garis penuntun emas (huruf 30 px agar terbaca di 360-390 px)
// items: [x, y, sisi (-1 kiri / 1 kanan), teks, {a: 0..1}]; (x,y) = titik pada struktur (koordinat kanvas). Disusun otomatis agar tidak bertumpuk.
export function labels(items, o = {}) {
  const fs = o.fs ?? 32, h = fs * 1.78, gap = h + 14, out = [];
  for (const side of [-1, 1]) {
    let prev = (o.atas ?? 330) - gap;
    for (const [x, y, , txt, op] of items.filter((it) => it[2] === side).sort((a, b) => a[1] - b[1])) {
      const ty = Math.max(y, prev + gap); prev = ty;
      const w = txt.length * fs * 0.6 + 44, cx = side < 0 ? 24 : W - 24 - w, ex = side < 0 ? cx + w : cx, a = op?.a ?? 1;
      if (a <= 0.001) continue;
      out.push(`<g opacity="${f1(a)}"><path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ty)}" stroke="${MC.ink}" stroke-width="7" opacity=".5" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ty)}" stroke="${MC.gold}" stroke-width="3.6" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${MC.ivory}"/><rect x="${f1(cx)}" y="${f1(ty - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="2.5"/><text x="${f1(cx + w / 2)}" y="${f1(ty + fs * 0.35)}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${fs}" fill="${MC.ink}">${txt}</text></g>`);
    }
  }
  return `<g id="mc-label">${out.join('')}</g>`;
}

// ---------------------------------------------------------------- pustaka gerak bersama
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const E = {
  lin: (t) => t, out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, soft: (t) => t * t * (3 - 2 * t),
  inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2), back: (t) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
};
export const seg = (t, a, b, ease = E.soft) => ease(clamp01((t - a) / (b - a)));
// tempo bersama: klip 5,0 dtk, 30 fps; 0,0-0,5 dtk menetap, tahan 0,8 dtk di akhir; label masuk 0,35 dtk
export const KLIP = { fps: 30, durasi: 5, tahan: 0.8, push: 0.045, labelMasuk: 0.35 };
// kamera bersama: dorong pelan (push-in) 4,5% dengan easing lembut; gerak organ berbeda-beda, kamera sama
export function kamera(t, o = {}) {
  const u = E.soft(clamp01(t / KLIP.durasi)), sc = 1 + KLIP.push * u, cx = o.cx ?? 540, cy = o.cy ?? 960;
  return `translate(${f1(cx + (o.dx ?? 0) * u)} ${f1(cy + (o.dy ?? 0) * u)}) scale(${sc.toFixed(4)}) translate(${-cx} ${-cy})`;
}
// aturan cahaya (dokumentasi dalam kode): kunci dari kiri-atas (feDistantLight azimut 225, elevasi 50) di semua filter vol*; bayangan jatuh ke kanan-bawah (dx 14, dy 22) berwarna navy-hijau tinta;
// pantul mint di tepi kanan-bawah; kilau tajam hanya di beberapa titik (emas-putih); kontur tinta 2,5 px pada tepi jaringan
export const KONTUR = { warna: MC.ink, lebar: 2.5, opasitas: 0.55 };
export const rim = (d, p, o = {}) => fx(`<path d="${d}" fill="none" stroke="${MC.mint2}" stroke-width="${o.w ?? 8}" opacity="${o.op ?? 0.4}" stroke-linejoin="round" filter="url(#${p}blur4)" transform="translate(${o.dx ?? 3} ${o.dy ?? 3})"/>`);

// ---------------------------------------------------------------- sel Voronoi (dipakai untuk rongga sumsum tulang, lobulus lemak, sel epidermis): dinding antar-sel bertebal bervariasi, sudut dibulatkan
// seeds: [[x,y],...]; o.R radius pencarian tetangga; o.tebal(i,j) = tebal dinding antar sel i dan j (px); hasil: [{i, poly, c:[x,y], luas}] hanya sel tertutup
export function selVoronoi(seeds, o = {}) {
  const R = o.R ?? 90, cell = R, grid = new Map(), key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  seeds.forEach(([x, y], i) => { const k = key(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const clip = (poly, nx, ny, c) => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], da = a[0] * nx + a[1] * ny - c, db = b[0] * nx + b[1] * ny - c; if (da <= 0) out.push(a); if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; };
  const res = [];
  seeds.forEach(([x, y], i) => {
    let poly = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; poly.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); }
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let a = gx - 2; a <= gx + 2 && poly.length; a++) for (let b = gy - 2; b <= gy + 2 && poly.length; b++) for (const j of (grid.get(`${a},${b}`) || [])) {
      if (j === i) continue; const [x2, y2] = seeds[j], dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy); if (d > 2 * R || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, half = (o.tebal ? o.tebal(i, j) : 8) / 2; poly = clip(poly, nx, ny, d / 2 - half + nx * x + ny * y);
    }
    if (poly.length < 3) return;
    if (poly.some((p) => Math.hypot(p[0] - x, p[1] - y) > R * 0.97)) return;   // sel terbuka -> dilewati
    res.push({ i, poly, c: [x, y] });
  });
  return res;
}
export function halus(poly, iter = 3) {   // Chaikin tertutup -> sudut membulat
  let p = poly;
  for (let k = 0; k < iter; k++) { const q = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } p = q; }
  return 'M' + p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'Z';
}

// kamera dengan konversi titik (agar label mengikuti organ saat kamera bergerak)
export function kam(t, o = {}) {
  const u = E.soft(clamp01(t / KLIP.durasi)), sc = 1 + KLIP.push * u, cx = o.cx ?? 540, cy = o.cy ?? 960, dx = (o.dx ?? 0) * u, dy = (o.dy ?? 0) * u;
  return { tf: `translate(${f1(cx + dx)} ${f1(cy + dy)}) scale(${sc.toFixed(4)}) translate(${-cx} ${-cy})`, pt: (x, y) => [cx + dx + (x - cx) * sc, cy + dy + (y - cy) * sc], sc };
}
