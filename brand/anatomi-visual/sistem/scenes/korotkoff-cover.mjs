// Cover vertikal 1080x1920 "BUNYI TENSI DARI MANA?": judul besar di area aman, penampang lengan pada momen ketukan pertama, pengukur dengan dua penanda, pil logo.
// Area aman profil 3:4 (crop tengah y 240-1680): semua teks dan unsur penting di dalamnya.
import { FONT, MEREK } from '../tokens.mjs';
import { latar, bintang } from '../latar.mjs';
import { f1, BLUR_DEFS } from '../tensi/util.mjs';
import * as L from '../korotkoff/lengan.mjs';
import * as A from '../korotkoff/alat.mjs';
export const meta = { id: 'korotkoff-cover', judul: 'Cover Korotkoff', sub: '', organ: 'arteri', durasi: 1, fps: 30 };
const GADING = MEREK.gading, EMAS = MEREK.emas, TINTA = MEREK.tinta;
export function frame(T, opt = {}) {
  const Tk = 24.04, pen = L.penampang(Tk);     // momen ketukan pertama: arteri terbuka di tepi manset, getaran ke diafragma
  const info = { diafragma: 1 };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><clipPath id="vp"><rect width="1080" height="1920"/></clipPath></defs>${BLUR_DEFS}<defs>${A.DEFS_JANTUNG}</defs>${A.defsPengukur('pg')}<g clip-path="url(#vp)">`;
  svg += latar('jantung', 0);
  const w = (t, y, size, fill, sw = 14) => `<text x="540" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" fill="${fill}" stroke="#06161A" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke" letter-spacing="2">${t}</text>`;
  svg += w('BUNYI TENSI', 420, 124, GADING) + w('DARI MANA?', 570, 150, EMAS, 16);
  svg += bintang(910, 330, 30, EMAS, 0.9) + bintang(150, 612, 18, EMAS, 0.7);
  // penampang (digeser turun 74 px agar di tengah area aman)
  svg += `<g transform="translate(0 76)"><rect x="0" y="${L.YT - 54}" width="1080" height="${L.H + 108}" fill="#06161A" opacity=".35"/>${pen.svg}${L.mansetPenampang(pen.S)}<path d="M702 540C702 470 822 486 1002 500S1142 560 1210 556" fill="none" stroke="${L.WARNA.tabung}" stroke-width="15" stroke-linecap="round"/>`
    + `<g>${(() => { const x = L.STET.x, y = L.YT; return `<rect x="${x - 10}" y="${y - 70}" width="20" height="40" rx="7" fill="${L.WARNA.perakG}"/><rect x="${x - 54}" y="${y - 36}" width="108" height="34" rx="15" fill="${L.WARNA.perak}"/><rect x="${x - 54}" y="${y - 36}" width="108" height="12" rx="6" fill="#fff" opacity=".45"/>` + [0, 1, 2].map((j) => { const r = 44 + j * 26; return `<path d="M${x - r} ${y - 36}A${r} ${r} 0 0 1 ${x + r} ${y - 36}" transform="translate(0 ${-2 - j * 4})" fill="none" stroke="${EMAS}" stroke-width="${f1(7 - j * 1.4)}" stroke-linecap="round" stroke-opacity="${f1(0.95 - j * 0.28)}"/>`; }).join(''); })()}</g></g>`;
  // pengukur dengan dua penanda
  svg += A.pengukur(540, 1330, 190, 118, { s: 1, d: 1, uid: 'pg' });
  // pil logo (di dalam area aman, y < 1640)
  svg += `<g><rect x="190" y="1566" width="700" height="96" rx="48" fill="#000" opacity=".3" transform="translate(0 6)"/><rect x="190" y="1566" width="700" height="96" rx="48" fill="${GADING}"/><image href="logo-mark.webp" x="214" y="1580" width="68" height="68"/><text x="300" y="1630" font-family="${FONT}" font-weight="800" font-size="46" letter-spacing="5" fill="${TINTA}">MEDCOEL</text><text x="872" y="1626" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="28" fill="#1D7B75">belajar FK gratis</text></g>`;
  return svg + `</g></svg>`;
}
