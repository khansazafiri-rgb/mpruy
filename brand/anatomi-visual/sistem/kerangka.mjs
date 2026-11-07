// Kerangka bersama: header seri, kamera, label berpenunjuk, kaki halaman. Semua organ memakainya agar gaya label, kontras, dan tempo sama.
import { KANVAS, FONT, MEREK, TATA, EASE, seg, clamp, lerp, TEMPO } from './tokens.mjs';
import { latar, bintang } from './latar.mjs';

const f = (n) => (Math.round(n * 10) / 10).toString();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Kamera: keyframes [{t, x, y, s}] (dolly/pan, easing inOut antar titik). Mengembalikan atribut transform terhadap pusat panggung. */
export function kamera(t, keys, pusat = TATA.pusat) {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
  const u = a === b ? 1 : EASE.inOut(clamp((t - a.t) / (b.t - a.t)));
  const s = lerp(a.s, b.s, u), x = lerp(a.x, b.x, u), y = lerp(a.y, b.y, u);
  return { s, x, y, tf: `translate(${f(pusat.x + x)} ${f(pusat.y + y)}) scale(${f(s * 1000) / 1000}) translate(${-pusat.x} ${-pusat.y})`, u };
}

/** Proyeksi titik kanvas (sebelum kamera) ke layar sesudah kamera: dipakai agar label di overlay tetap menempel pada struktur. */
export function proyeksi(kam, p, pusat = TATA.pusat) {
  return [pusat.x + kam.x + (p[0] - pusat.x) * kam.s, pusat.y + kam.y + (p[1] - pusat.y) * kam.s];
}

/** Menyusun posisi y pil label di kolom: sedekat mungkin dengan y jangkar, dengan jarak minimum, dalam batas [min, max]. */
export function susunLabel(ys, { min = 420, max = 1640, jarak = 128 } = {}) {
  const idx = ys.map((y, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = new Array(ys.length);
  let prev = min - jarak;
  for (const i of idx) { prev = Math.max(clamp(ys[i], min, max), prev + jarak); out[i] = prev; }
  const over = prev - max;
  if (over > 0) for (let n = idx.length - 1, y = max; n >= 0; n--, y -= jarak) out[idx[n]] = Math.min(out[idx[n]], y);
  return out;
}

/**
 * Label berpenunjuk. a = titik jangkar di organ [x,y]; l = posisi pil [x,y] (pusat kiri teks); p = kemajuan 0..1.
 * warna = warna jaringan (penanda kecil); sisi 'kiri'|'kanan' menentukan arah pil.
 */
export function label({ a, l, teks, warna, p, sisi = 'kanan', q = 1 }) {
  if (p <= 0.001 || q <= 0.001) return '';
  const lines = String(teks).split('\n'), n = Math.max(...lines.map((s) => s.length));
  const w = 52 + n * 21.5, h = lines.length > 1 ? 108 : 70;   // huruf 32 px: di lebar 360 px menjadi sekitar 10,7 px
  const x0 = sisi === 'kanan' ? l[0] : l[0] - w, y0 = l[1] - h / 2;
  const pa = EASE.out(clamp(p * 1.35)), pb = EASE.out(clamp((p - 0.25) / 0.75));
  const lx = lerp(a[0], l[0], pa), ly = lerp(a[1], l[1], pa);
  const slide = (1 - pb) * (sisi === 'kanan' ? 22 : -22) + (1 - q) * 12;
  const txt = lines.map((s, i) => `<text x="${f(x0 + 58)}" y="${f(y0 + (lines.length > 1 ? 44 + i * 37 : 46))}" font-family="${FONT}" font-weight="700" font-size="32" fill="${MEREK.tinta}">${esc(s)}</text>`).join('');
  return `<g class="lbl" opacity="${f(pb * q)}">
<path d="M${f(a[0])} ${f(a[1])}L${f(lx)} ${f(ly)}" stroke="#172B38" stroke-width="9" stroke-linecap="round" opacity=".5"/>
<path d="M${f(a[0])} ${f(a[1])}L${f(lx)} ${f(ly)}" stroke="${MEREK.emas}" stroke-width="4.5" stroke-linecap="round"/>
<circle cx="${f(a[0])}" cy="${f(a[1])}" r="9" fill="${MEREK.emas}" stroke="#172B38" stroke-width="3"/>
<g transform="translate(${f(slide)} 0)">
<rect x="${f(x0)}" y="${f(y0 + 5)}" width="${f(w)}" height="${h}" rx="${h > 80 ? 32 : h / 2}" fill="#000" opacity=".28"/>
<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${h}" rx="${h > 80 ? 32 : h / 2}" fill="${MEREK.gading}"/>
<circle cx="${f(x0 + 32)}" cy="${f(l[1])}" r="12" fill="${warna}" stroke="#172B38" stroke-opacity=".35" stroke-width="2"/>
${txt}
</g></g>`;
}

/** Bingkai lengkap satu klip. isi = SVG organ (di dalam grup kamera). bagian:true mengembalikan potongan (untuk transisi antarorgan). */
export function bingkai({ organ, t, judul, sub, isi, kam, overlay = '', catatan, bagian = false }) {
  const W = KANVAS.w, H = KANVAS.h;
  const par = (k) => `translate(${f(-kam.x * k)} ${f(-kam.y * k)})`;
  const h = header(judul, sub);
  const p = { bg: `<g transform="${par(0.35)}">${latar(organ, t)}</g>`, isi: `<g transform="${kam.tf}">${isi}</g>`, overlay: `<g class="lbl-wadah">${overlay}</g>`, tetap: h.tetap, judul: h.judul, footer: footer(catatan) };
  if (bagian) return p;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
<defs><clipPath id="vp"><rect width="${W}" height="${H}"/></clipPath></defs>
<g clip-path="url(#vp)">
${p.bg}${p.isi}${p.overlay}${p.tetap}${p.judul}${p.footer}
</g></svg>`;
}

function header(judul, sub) {
  return {
    tetap: `<g id="header-tetap"><image href="logo-mark.webp" x="64" y="82" width="84" height="84"/><text x="168" y="118" font-family="${FONT}" font-weight="800" font-size="26" letter-spacing="5" fill="${MEREK.emas}">ATLAS ANATOMI</text></g>`,
    judul: `<g id="header-judul"><text x="166" y="184" font-family="${FONT}" font-weight="800" font-size="62" fill="${MEREK.gading}">${esc(judul)}</text><text x="168" y="236" font-family="${FONT}" font-weight="500" font-size="34" fill="${MEREK.gading}" opacity=".78">${esc(sub)}</text></g>`,
  };
}
function footer(catatan) {
  return `<g id="footer"><rect x="64" y="1772" width="952" height="2" fill="${MEREK.gading}" opacity=".22"/>
<text x="64" y="1822" font-family="${FONT}" font-weight="500" font-size="28" fill="${MEREK.gading}" opacity=".72">${esc(catatan || 'Gambar skematis dari kode · belum diverifikasi atlas')}</text>
<text x="1016" y="1872" text-anchor="end" font-family="${FONT}" font-weight="800" font-size="30" letter-spacing="3" fill="${MEREK.gading}" opacity=".9">MEDCOEL</text></g>`;
}

/**
 * Label per FASE: pada satu waktu hanya label fase aktif yang tampak (maksimal 2-3); label lama keluar (0,3 dtk) sebelum fase berikut masuk.
 * fase: [{ t0, t1, item: [{ teks, a: [x,y] titik jangkar di layar, warna }] }]. Posisi pil di kolom kanan disusun dekat y jangkar dengan jarak minimum
 * (garis penunjuk hampir mendatar, urut sehingga tidak saling menyilang). kolom = x kiri pil.
 */
export function labelFase(t, fase, { kolom = 776, jarak = 125, min = 400, max = 1640, masuk = 0.35, keluar = 0.3, jeda = 0.12 } = {}) {
  let s = '';
  for (const F of fase) {
    if (t < F.t0 || t > F.t1 + 0.01) continue;
    const ys = susunLabel(F.item.map((o) => o.a[1]), { min, max, jarak });
    F.item.forEach((o, i) => {
      const t0 = F.t0 + i * jeda, p = seg(t, t0, t0 + masuk), q = 1 - seg(t, F.t1 - keluar, F.t1);
      s += label({ a: o.a, l: [kolom, ys[i]], teks: o.teks, warna: o.warna, p, q });
    });
  }
  return s;
}

/** Garis penunjuk (a -> pil) dan pil sebagai kotak, untuk uji geometri: apakah ada garis yang memotong pil atau garis lain. */
export function gpPil(a, y, teks, kolom = 776) {
  const lines = String(teks).split('\n'), n = Math.max(...lines.map((s) => s.length)), w = 52 + n * 21.5, h = lines.length > 1 ? 108 : 70;
  return { seg: [a, [kolom, y]], kotak: [kolom, y - h / 2, kolom + w, y + h / 2] };
}
