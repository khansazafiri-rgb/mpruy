// Layar terbagi dua: sama-sama hasil urat tinggi, tetapi hanya satu yang memperlihatkan serangan radang sendi. Tidak ada angka; hasil tes tidak ditampilkan sebagai penentu diagnosis.
import { FONT, MEREK } from '../tokens.mjs';
import { f1, clamp, lerp, seg, ease } from '../tensi/util.mjs';
import { C, GADING, EMAS, TINTA, pil, esc } from './bentuk.mjs';
import { sendi } from './sendi.mjs';
import { W as KATA } from './waktu.mjs';

/** Kartu hasil lab: tabung reaksi berisi cairan emas dan batang tanpa angka; tinggi 0..1 */
function kartuLab(x, y, tinggi, redup = 0) {
  const w = 270, h = 440;
  let g = `<g opacity="${f1(1 - 0.55 * redup)}"><rect x="${x}" y="${y + 8}" width="${w}" height="${h}" rx="34" fill="#000" opacity=".3"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="#F6F2E6"/>`;
  // tabung
  const tx = x + 62, ty = y + 40, tw = 64, th = 300, lv = clamp(tinggi);
  g += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="${tw / 2}" fill="#DCEBF0" stroke="#9BB9C4" stroke-width="5"/><rect x="${tx + 8}" y="${f1(ty + th - 14 - (th - 36) * lv)}" width="${tw - 16}" height="${f1(14 + (th - 36) * lv)}" rx="${(tw - 16) / 2}" fill="${C.urat}"/><rect x="${tx - 8}" y="${ty - 10}" width="${tw + 16}" height="16" rx="8" fill="#9BB9C4"/>`;
  g += `<rect x="${tx + 14}" y="${ty + 20}" width="10" height="${th - 70}" rx="5" fill="#fff" opacity=".6"/>`;
  // batang kadar di kanan tabung, tanpa angka
  const bx = x + 170, bw = 64;
  g += `<rect x="${bx}" y="${ty}" width="${bw}" height="${th}" rx="14" fill="#E3DCCB"/><rect x="${bx}" y="${f1(ty + th - th * lv)}" width="${bw}" height="${f1(th * lv)}" rx="14" fill="${C.urat}"/>`;
  g += `<path d="M${x + 36} ${y + 388}H${x + w - 36}" stroke="#C9C0AA" stroke-width="5" stroke-linecap="round"/><path d="M${x + 36} ${y + 412}H${x + w - 100}" stroke="#C9C0AA" stroke-width="5" stroke-linecap="round"/>`;
  return g + `</g>`;
}
export function bagi(T, lbl = true) {
  const o = seg(T, 33.7, 34.3) * (1 - seg(T, 46.0, 46.5)); if (o < 0.01) return '';
  const px = 70, pw = 940, ph = 540, yA = 392, yB = 1036;
  const bar = seg(T, KATA.hasilTes, 36.5, ease.sm);                                // bar naik pada "hasil tes asam urat yang tinggi"
  const redup = seg(T, 41.3, 42.2);                                                // "bukan sekadar angka di hasil lab": kartu angka meredup
  const infl = seg(T, 37.3, 38.9), fokus = seg(T, KATA.reaksi - 0.3, KATA.reaksi + 0.5);
  const pOut = (i) => seg(T, 33.8 + i * 0.2, 34.6 + i * 0.2, ease.out);
  let g = `<g opacity="${f1(o)}">`;
  const panel = (y, i) => {
    const dy = (1 - pOut(i)) * 120 * (i ? 1 : -1);
    let s = `<g transform="translate(0 ${f1(dy)})" opacity="${f1(pOut(i))}"><defs><clipPath id="bg${i}"><rect x="${px}" y="${y}" width="${pw}" height="${ph}" rx="48"/></clipPath></defs>`;
    s += `<rect x="${px}" y="${y + 10}" width="${pw}" height="${ph}" rx="48" fill="#000" opacity=".3"/><rect x="${px}" y="${y}" width="${pw}" height="${ph}" rx="48" fill="#12303A"/>`;
    // sendi mini
    const S = i === 0 ? { T, larut: 1, kristal: 0, sel: 0, infl: 0, bengkak: 0, merah: 0, hangat: 0, nyeri: 0 } : { T, larut: 1, kristal: 1, sel: seg(T, 37.2, 38.6), infl, bengkak: infl, merah: infl, hangat: infl * 0.8, nyeri: infl * 0.7 };
    s += `<g clip-path="url(#bg${i})"><g transform="translate(${px + 590} ${y + ph / 2}) scale(0.92) translate(-590 -960)">${sendi(S, { id: 'bg' + i })}</g></g>`;
    // sorotan pada B saat "reaksi tubuh terhadap kristal"
    if (i === 1 && fokus > 0.01) s += `<circle cx="${px + 590 + (592 - 590) * 0.92}" cy="${y + ph / 2}" r="${f1(150 + 8 * Math.sin(T * 6))}" fill="none" stroke="${EMAS}" stroke-width="8" stroke-dasharray="26 16" opacity="${f1(fokus)}"/>`;
    s += kartuLab(px + 26, y + 60, bar, redup);
    s += `<rect x="${px}" y="${y}" width="${pw}" height="${ph}" rx="48" fill="none" stroke="${GADING}" stroke-opacity=".22" stroke-width="3"/>`;
    return s + `</g>`;
  };
  // panel A (tanpa serangan) redup saat fokus ke B
  g += `<g opacity="${f1(1 - 0.5 * fokus)}">${panel(yA, 0)}</g>${panel(yB, 1)}`;
  if (lbl) {
    const pA = seg(T, KATA.mengalami - 0.2, KATA.mengalami + 0.5, ease.out);
    g += pil('TANPA SERANGAN', 540, yA + ph + 8, pA, { warna: '#7FE0C8', size: 32, anchor: 'middle' });
    g += pil('SERANGAN RADANG SENDI', 540, yB + ph + 10, pA, { warna: C.koral, size: 32, anchor: 'middle' });
    // teks utama
    const pT = seg(T, KATA.tidakOtomatis - 0.1, KATA.tidakOtomatis + 0.5, ease.out);
    if (pT > 0.01) { const t = 'URAT TINGGI ≠ OTOMATIS GOUT', w = 1000; g += `<g opacity="${f1(clamp(pT * 1.5))}" transform="translate(0 ${f1((1 - pT) * 24)})"><rect x="${540 - w / 2}" y="256" width="${w}" height="112" rx="56" fill="#000" opacity=".3" transform="translate(0 8)"/><rect x="${540 - w / 2}" y="256" width="${w}" height="112" rx="56" fill="${EMAS}"/><rect x="${540 - w / 2}" y="256" width="${w}" height="112" rx="56" fill="none" stroke="${TINTA}" stroke-opacity=".5" stroke-width="4"/><text x="540" y="332" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="52" fill="${TINTA}">${esc(t)}</text></g>`; }
  }
  return g + `</g>`;
}
