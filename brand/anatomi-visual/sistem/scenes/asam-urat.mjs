// Video "Kenapa asam urat bisa bikin sendi sakit banget?" (51,76 dtk, 1080x1920, 30 fps). Narasi WAV pemesan 51,16 dtk (tidak diubah) + ekor 0,6 dtk. Tokoh: Raka (raka.js, tampil tegak; tidak memakai varian berbaring).
// Urutan: hook (Raka terbangun, sendi pangkal ibu jari merah dan bengkak, kamera masuk) -> purin dari sel tubuh dan makanan menjadi urat larut -> ginjal membuang urat lewat urin; urat menumpuk di darah (grafik tanpa angka)
// -> sendi MTP pertama: urat larut vs kristal jarum, sel pertahanan, nyeri, bengkak, merah, hangat -> gout -> sendi lain -> layar terbagi (urat tinggi tidak otomatis gout) -> Raka, logo.
import { FONT, MEREK } from '../tokens.mjs';
import { latar } from '../latar.mjs';
import { f1, clamp, lerp, seg, ease, BLUR_DEFS } from '../tensi/util.mjs';
import { KALIMAT, K, W, ADEGAN, DURASI, NARASI_DTK, LOGO } from '../asam-urat/waktu.mjs';
import { C, GADING, EMAS, TINTA, pil, lebarPil, garis, esc, urat } from '../asam-urat/bentuk.mjs';
import { kamar, MTP } from '../asam-urat/kamar.mjs';
import { sendi, JANGKAR } from '../asam-urat/sendi.mjs';
import { adeganPurin, adeganGinjal, adeganKadar, pembuluh } from '../asam-urat/tubuh.mjs';
import { lokasi } from '../asam-urat/lokasi.mjs';
import { bagi } from '../asam-urat/bagi.mjs';

export const meta = { id: 'asam-urat', judul: 'Kenapa asam urat bisa bikin sendi sakit banget?', sub: 'purin, urat, ginjal, kristal, peradangan', organ: 'sendi', durasi: DURASI, fps: 30 };
const vis = (T, a, b, m = 0.4) => seg(T, a, a + m, ease.lin) * (1 - seg(T, b - m, b, ease.lin));
const ZS = 1.9;                                            // pembesaran penampang sendi
const Z = (p) => [540 + ZS * (p[0] - 580), 960 + ZS * (p[1] - 960)];

// ---------------------------------------------------------------- lencana gejala (ikon + kata, muncul tepat saat disebut)
function lencana(jenis, teks, x, y, p) {
  if (p < 0.01) return '';
  const ik = {
    nyeri: `<path d="M0 -20L10 -3L1 -2L11 17L-8 -1L0 -2Z" fill="${C.uratT}" stroke="#7A4F0B" stroke-width="2.4" stroke-linejoin="round"/>`,
    bengkak: `<circle r="8" fill="${C.koral}"/><path d="M-20 -20L-9 -9M20 -20L9 -9M-20 20L-9 9M20 20L9 9" stroke="${C.koral}" stroke-width="5" stroke-linecap="round"/>`,
    merah: `<path d="M0 -20C10 -6 15 2 15 8C15 17 8 21 0 21C-8 21 -15 17 -15 8C-15 2 -10 -6 0 -20Z" fill="#E2493F"/><ellipse cx="-5" cy="6" rx="3" ry="6" fill="#fff" opacity=".5"/>`,
    hangat: `<path d="M-12 18q-8 -12 0 -24t0 -24M0 18q-8 -12 0 -24t0 -24M12 18q-8 -12 0 -24t0 -24" fill="none" stroke="${C.hangat}" stroke-width="5" stroke-linecap="round" transform="translate(0 6)"/>`,
  }[jenis];
  const w = 110 + teks.length * 27, h = 84, dx = (1 - ease.out(p)) * -40;
  return `<g opacity="${f1(clamp(p * 1.6))}" transform="translate(${f1(dx)} 0)"><rect x="${x}" y="${y + 6}" width="${w}" height="${h}" rx="42" fill="#000" opacity=".3"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="42" fill="${GADING}"/><circle cx="${x + 44}" cy="${y + 42}" r="30" fill="#14343F"/><g transform="translate(${x + 44} ${y + 42}) scale(.95)">${ik}</g><text x="${x + 88}" y="${y + 56}" font-family="${FONT}" font-weight="800" font-size="36" fill="${TINTA}">${esc(teks)}</text></g>`;
}
const GEJALA = [['nyeri', 'NYERI', W.nyeri], ['bengkak', 'BENGKAK', W.bengkak], ['merah', 'MERAH', W.merah], ['hangat', 'HANGAT', W.hangat]];
function barisGejala(T, tampil) {
  if (tampil < 0.01) return '';
  return `<g opacity="${f1(tampil)}">${GEJALA.map(([j, t, w], i) => lencana(j, t, 44, 430 + i * 104, seg(T, w - 0.1, w + 0.35, ease.out) * (T < 24.6 ? 1 : 1))).join('')}</g>`;
}
// ---------------------------------------------------------------- keadaan sendi menurut kalimat
function keadaanSendi(T) {
  return {
    T, larut: seg(T, 14.75, 15.2), kristal: seg(T, 15.25, 17.0, ease.sm), sel: seg(T, 17.35, 19.6, ease.sm), infl: seg(T, 19.7, 21.5),
    nyeri: seg(T, W.nyeri - 0.2, W.nyeri + 0.3), bengkak: seg(T, W.bengkak - 0.05, W.bengkak + 0.7), merah: seg(T, W.merah - 0.05, W.merah + 0.6), hangat: seg(T, W.hangat - 0.2, W.hangat + 0.6),
  };
}

// ---------------------------------------------------------------- bingkai
export function frame(T, opt = {}) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><clipPath id="vp"><rect width="1080" height="1920"/></clipPath></defs>${BLUR_DEFS}<g clip-path="url(#vp)">`;
  svg += latar('sendi', T);
  const lbl = !opt.tanpaLabel;
  // ---- 1. hook
  const vH = 1 - seg(T, 3.2, 3.75, ease.lin);
  if (vH > 0.01) {
    const u = clamp(T / 3.35), z = 1 + 4.5 * Math.pow(u, 2.1), e = ease.sm(u), F = [MTP.x, MTP.y], P = [lerp(540, F[0], e), lerp(960, F[1], e)];
    const jit = T < 0.9 ? Math.sin(T * 38) * 4 * (1 - T / 0.9) : 0;
    svg += `<g opacity="${f1(vH)}"><g transform="translate(${f1(540 + jit)} ${f1(960)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-P[0])} ${f1(-P[1])})">${kamar(T, { infl: 1, bangun: seg(T, 0.25, 0.9) })}</g>`;
    if (lbl) { const p = seg(T, 0.15, 0.6, ease.out) * (1 - seg(T, 3.0, 3.3)); if (p > 0.01) { const t = 'KENAPA BISA SESAKIT INI?', w = 960; svg += `<g opacity="${f1(clamp(p * 1.5))}" transform="translate(0 ${f1((1 - p) * 26)})"><rect x="${540 - w / 2}" y="${236 + 8}" width="${w}" height="116" rx="58" fill="#000" opacity=".32"/><rect x="${540 - w / 2}" y="236" width="${w}" height="116" rx="58" fill="${EMAS}"/><rect x="${540 - w / 2}" y="236" width="${w}" height="116" rx="58" fill="none" stroke="${TINTA}" stroke-opacity=".5" stroke-width="4"/><text x="540" y="${236 + 78}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="62" fill="${TINTA}">${t}</text></g>`; } }
    svg += `</g>`;
  }
  // ---- 2. purin
  const vP = vis(T, 3.35, 9.75, 0.45);
  if (vP > 0.01) svg += `<g opacity="${f1(vP)}" transform="translate(540 960) scale(${f1(lerp(1.14, 1, ease.out(seg(T, 3.35, 4.2))) * 1000) / 1000}) translate(-540 -960)">${adeganPurin(T, lbl)}</g>`;
  // ---- 3. ginjal + kadar
  const vG = vis(T, 9.3, 15.0, 0.45);
  if (vG > 0.01) {
    svg += `<g opacity="${f1(vG)}">${adeganGinjal(T, lbl)}`;
    const naik = seg(T, W.kadar, 14.5, ease.sm), pk = seg(T, 12.1, 12.8) * (1 - seg(T, 14.6, 15.0));
    if (pk > 0.01) svg += `<g opacity="${f1(pk)}">${pembuluh(T, 1250, 170, 0.18 + 0.82 * naik, { kec: 120 })}</g>`;
    svg += adeganKadar(T, lbl) + `</g>`;
  }
  // ---- 4. sendi MTP pertama
  const vS = vis(T, 14.65, 25.1, 0.5);
  if (vS > 0.01) {
    const zIn = lerp(1.15, 1, ease.out(seg(T, 14.65, 15.4))) * lerp(1, 0.55, ease.in(seg(T, 24.5, 25.1)));
    svg += `<g opacity="${f1(vS)}"><g transform="translate(540 960) scale(${f1(zIn * 1000) / 1000}) translate(-540 -960)"><g transform="translate(540 960) scale(${ZS}) translate(-580 -960)">${sendi(keadaanSendi(T))}</g></g>`;
    if (lbl) {
      const pL = seg(T, 14.85, 15.35, ease.out) * (1 - seg(T, 17.3, 17.7)), pK = seg(T, W.kristal1, W.kristal1 + 0.5, ease.out), pS = seg(T, W.bereaksi, W.bereaksi + 0.5, ease.out) * (1 - seg(T, 19.5, 19.9));
      svg += pil('URAT LARUT', 60, 290, pL, { warna: C.urat, size: 34 }) + garis([196, 380], Z([596, 940]), pL);
      svg += pil('KRISTAL URAT', 400, 290, pK, { warna: '#CFE8F2', size: 34 }) + garis([520, 380], Z([552, 930]), pK);
      svg += pil('SEL PERTAHANAN', 540, 1500, pS, { warna: C.sel, size: 34, anchor: 'middle' }) + garis([540, 1500], Z([592, 1000]), pS);
      svg += barisGejala(T, 1);
    }
    svg += `</g>`;
  }
  // ---- 5. gout (kembali ke luar: kaki bengkak dan merah)
  const vO = vis(T, 24.65, 29.95, 0.5);
  if (vO > 0.01) {
    const zz = lerp(1.0, 1.1, seg(T, 24.65, 29.95, ease.lin));
    svg += `<g opacity="${f1(vO)}"><g transform="translate(540 1150) scale(${f1(zz * 1000) / 1000}) translate(-540 -1150)">${kamar(T, { infl: 1, bangun: 1 })}</g>`;
    if (lbl) {
      svg += barisGejala(T, 1);
      const pG = seg(T, W.gout - 0.1, W.gout + 0.4, ease.out), pA = seg(T, W.asamurat - 0.1, W.asamurat + 0.4, ease.out);
      svg += pil('GOUT', 500, 236, pG, { warna: C.koral, size: 50, anchor: 'end' });
      if (pA > 0.01) svg += `<text x="540" y="${236 + 66}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="54" fill="${GADING}" stroke="#06161A" stroke-width="8" paint-order="stroke" opacity="${f1(pA)}">=</text>`;
      svg += pil('ASAM URAT', 578, 236, pA, { warna: C.urat, size: 50, anchor: 'start' });
    }
    svg += `</g>`;
  }
  // ---- 6. lokasi sendi, layar terbagi
  svg += lokasi(T, lbl) + bagi(T, lbl);
  // ---- 7. Raka kembali, lalu logo
  const vR = seg(T, 45.95, 46.5, ease.lin);
  if (vR > 0.01) { const zz = lerp(1.0, 1.05, seg(T, 46.3, DURASI, ease.lin)); svg += `<g opacity="${f1(vR)}"><g transform="translate(540 1000) scale(${f1(zz * 1000) / 1000}) translate(-540 -1000)">${kamar(T, { infl: 0, pagi: true, bangun: 1 })}</g></g>`; }
  const kt = seg(T, LOGO[0], LOGO[0] + 0.45, ease.lin);
  if (kt > 0.01) {
    const u = ease.out(seg(T, LOGO[0] + 0.1, LOGO[0] + 0.85));
    svg += `<g opacity="${f1(kt)}"><rect x="-80" y="-80" width="1240" height="2080" fill="#06161A"/><image href="logo-mark.webp" x="400" y="${f1(560 + (1 - u) * 24)}" width="280" height="280"/>`
      + `<text x="540" y="940" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="76" letter-spacing="8" fill="${GADING}">MEDCOEL</text>`
      + `<text x="540" y="1070" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="52" fill="${EMAS}">Belajar cara kerja tubuh gratis di</text><text x="540" y="1152" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="66" fill="${GADING}">medcoel.com</text>`
      + `<text x="540" y="1270" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="28" fill="${GADING}" opacity=".7">Animasi skematis, bukan pengganti pemeriksaan tenaga kesehatan</text></g>`;
  }
  // ---- bloom hangat saat kamera menembus kulit (hook -> dalam tubuh)
  const bl = Math.max(0, 1 - Math.abs(T - 3.45) / 0.35); if (bl > 0.01) svg += `<rect width="1080" height="1920" fill="#FFE2C0" opacity="${f1(0.85 * bl)}"/>`;
  return svg + `</g></svg>`;
}
