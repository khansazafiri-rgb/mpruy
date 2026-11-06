// Anatomi tembus pandang di dalam tubuh Tala (tampak depan, satuan tokoh 400 x 800). SKEMATIS, belum diverifikasi atlas.
// Jantung = aset v7 (tidak diubah). Pembuluh, otak, sensor, saraf, rahim digambar di sini dengan bahasa visual sama (cahaya kiri atas, tabung bervolume).
// Arah aliran: arteri meninggalkan jantung (aorta -> kaki, karotis -> otak); vena menuju jantung (kaki -> vena kava bawah, otak -> vena jugularis -> vena kava atas).
import { buildSvg } from '../../v6/heart7.mjs';
import { f1, mulus, poli, clamp, lerp, mix, terang, gelap, B, volum, tumpuk, seg, ease } from './util.mjs';
import { negara, fase } from './negara.mjs';

const H7 = buildSvg({ layers: true, bg: false, id: 'jt' });
export const DEFS_JANTUNG = H7.defs;
export const HK = 0.2, HC = [208, 470], HA = [290, 765];
export const H = (ax, ay) => [HC[0] + (ax - HA[0]) * HK, HC[1] + (ay - HA[1]) * HK];
const TIP = { bct: H(239, 258), lcc: H(336, 237), svc: H(167, 260), ivc: H(139, 1056), arch: H(438, 612) };

export const WARNA = { art: '#E5483F', artT: '#FF9A86', ven: '#4E56D8', venT: '#A9B2FF', saraf: '#F8C038', otak: '#EE98A4', otakLow: '#8D88AA' };

// ---- polilin pembuluh (searah aliran) ----
const V = {
  aorta: { tipe: 'art', w: 7, ch: 'art', pts: [TIP.arch, [238, 470], [237, 510], [230, 548], [220, 572], [214, 586]] },
  artL: { tipe: 'art', w: 5.4, ch: 'art', pts: [[214, 586], [186, 602], [173, 640], [171, 690], [169, 735], [158, 757], [136, 767]] },
  artR: { tipe: 'art', w: 5.4, ch: 'art', pts: [[214, 586], [238, 602], [227, 640], [229, 690], [231, 735], [242, 757], [264, 767]] },
  carR: { tipe: 'art', w: 5.6, ch: 'car', pts: [TIP.bct, [193, 352], [187, 338], [176, 318], [170, 296], [172, 268], [184, 242]] },
  carL: { tipe: 'art', w: 5.6, ch: 'car', pts: [TIP.lcc, [218, 350], [216, 338], [228, 318], [232, 296], [228, 268], [216, 242]] },
  venL: { tipe: 'ven', w: 5.4, ch: 'venKaki', pool: 1, pts: [[144, 767], [153, 757], [153, 735], [154, 690], [156, 640], [170, 606], [190, 596], [194, 592]] },
  venR: { tipe: 'ven', w: 5.4, ch: 'venKaki', pool: 1, pts: [[256, 767], [247, 757], [247, 735], [246, 690], [244, 640], [230, 606], [206, 604], [194, 592]] },
  ivc: { tipe: 'ven', w: 9, ch: 'venIvc', pool: 0.35, pts: [[194, 592], [190, 572], [184, 550], TIP.ivc] },
  jugR: { tipe: 'ven', w: 6, ch: 'jug', pts: [[126, 240], [120, 282], [130, 324], [152, 352], [172, 364], TIP.svc] },
  jugL: { tipe: 'ven', w: 6, ch: 'jug', pts: [[274, 240], [280, 282], [270, 324], [248, 352], [222, 362], [194, 368], TIP.svc] },
};
// jaring pembuluh perut: tiga lengkung usus tipis + cabang kecil (jatuh ke "perut")
const USUS = [
  [[150, 562], [168, 556], [192, 560], [214, 556], [240, 562], [252, 570]],
  [[148, 576], [170, 584], [196, 578], [220, 584], [246, 578]],
  [[158, 592], [178, 598], [200, 592], [222, 598], [242, 592]],
];
const SARAF = {
  sinR: { pts: [[184, 334], [178, 312], [184, 284], [194, 258]], arah: 1 },
  sinL: { pts: [[218, 334], [224, 312], [218, 284], [206, 258]], arah: 1 },
  arkus: { pts: [[236, 398], [232, 372], [226, 332], [214, 292], [204, 260]], arah: 1 },
  jantung: { pts: [[204, 258], [262, 284], [268, 332], [262, 382], [256, 424], [250, 452]], arah: 1 },
  vesL: { pts: [[196, 258], [138, 284], [130, 340], [124, 420], [120, 500], [130, 572], [146, 640], [158, 716]], arah: 1 },
  vesR: { pts: [[262, 384], [274, 454], [278, 524], [270, 592], [256, 652], [246, 716]], arah: 1 },
};
// panjang kumulatif
function ukur(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; }
for (const k of Object.keys(V)) V[k].c = ukur(V[k].pts);
for (const k of Object.keys(SARAF)) SARAF[k].c = ukur(SARAF[k].pts);
function titikPada(pts, c, s) { const L = c[c.length - 1], d = s * L; let i = 1; while (i < c.length - 1 && c[i] < d) i++; const u = (d - c[i - 1]) / (c[i] - c[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; }

export const JANGKAR = {
  otak: [200, 160], batang: [200, 240], sinusR: [186, 335], sinusL: [216, 335], arkus: [236, 398], jantung: [222, 470], ivc: [186, 552], jugular: [250, 300], karotis: [229, 300],
  perut: [252, 572], kaki: [244, 690], betis: [247, 735], rahim: [200, 600], aorta: [238, 500], kakiL: [150, 700], paru: [268, 430],
};

const tabung = (pts, w, base, o = {}) => {
  const d = mulus(pts), dk = gelap(base, 0.5), lt = terang(base, 0.45);
  return `<path d="${d}" fill="none" stroke="${dk}" stroke-width="${f1(w + 2.6)}" stroke-linecap="round" stroke-linejoin="round" opacity="${o.o ?? 0.9}"/><path d="${d}" fill="none" stroke="${base}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round" opacity="${o.o ?? 1}"/><path d="${d}" transform="translate(${f1(-w * 0.14)} ${f1(-w * 0.2)})" fill="none" stroke="${lt}" stroke-width="${f1(Math.max(1, w * 0.3))}" stroke-linecap="round" stroke-linejoin="round" opacity="${f1((o.o ?? 1) * 0.55)}"/>`;
};
const partikel = (p, r, tipe, o = 1) => {
  const c = tipe === 'art' ? WARNA.artT : WARNA.venT, c2 = tipe === 'art' ? '#fff3ea' : '#eef0ff';
  return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r)}" fill="${c}" opacity="${f1(o)}"/><circle cx="${f1(p[0] - r * 0.28)}" cy="${f1(p[1] - r * 0.3)}" r="${f1(r * 0.4)}" fill="${c2}" opacity="${f1(o * 0.9)}"/>`;
};

/** Gambar anatomi untuk waktu T. opt.hanya: sebagian lapisan. Mengembalikan { bawah, jantung, atas } agar urutan susun bisa diatur. */
export function gambarAnatomi(T, S = negara(T), opt = {}) {
  const sk = opt.sembunyi || {};
  // ---- latar anatomi: paru, usus, rahim ----
  let bawah = '', bawahLo = '';
  bawah += `<g opacity=".26"><path d="M186 400C160 392 128 410 120 452C114 490 132 520 160 520C176 520 184 500 186 470Z" fill="#E7A0AA"/><path d="M236 398C262 394 290 412 296 452C300 490 282 516 256 516C242 516 236 496 236 470Z" fill="#E7A0AA"/></g>`;
  // usus perut
  const peng = S.pool;
  const warnaUsus = mix('#E8A5A9', '#6C62C8', 0.55 * peng);
  if (!sk.usus) {
    bawahLo += `<g opacity="${f1(0.5 + 0.2 * peng)}" fill="none" stroke-linecap="round">`;
    USUS.forEach((u, i) => { bawahLo += `<path d="${mulus(u)}" stroke="${gelap(warnaUsus, 0.4)}" stroke-width="${f1(13 + 6 * peng)}" opacity=".6"/><path d="${mulus(u)}" stroke="${warnaUsus}" stroke-width="${f1(10 + 6 * peng)}"/>`; });
    bawahLo += `</g>`;
    if (peng > 0.02) bawahLo += `<ellipse cx="200" cy="578" rx="${f1(70 + 14 * peng)}" ry="${f1(26 + 8 * peng)}" fill="#5A52E0" opacity="${f1(0.34 * peng)}" filter="${B(9)}"/>`;
  }
  const rahimSvg = S.rahim > 0.01 && !sk.rahim ? rahim(S) : '';
  // halo darah menumpuk di kaki (vena melebar dan gelap)
  if (peng > 0.02) {
    for (const k of ['venL', 'venR']) { const v = V[k]; bawahLo += `<path d="${mulus(v.pts.slice(1, 6))}" fill="none" stroke="#4A40D8" stroke-width="${f1(15 + 17 * peng)}" stroke-linecap="round" opacity="${f1(0.26 * peng)}" filter="${B(6)}"/>`; }
  }
  // ---- pembuluh (tabung) ----
  let pemb = '', pembLo = '';
  const LOW = new Set(['artL', 'artR', 'venL', 'venR']);
  const lebarArt = (1 - 0.34 * S.vaso + 0.34 * S.dil + 0.26 * S.rileks) * (0.86 + 0.14 * S.vol);
  const lebarVen = (k) => (1 + (V[k].pool || 0) * 0.85 * peng) * (1 - 0.3 * S.vaso) * (0.9 + 0.1 * S.vol);
  const warnaArt = mix(WARNA.art, '#F7A28F', 0.4 * S.dil + 0.3 * S.rileks), warnaVen = mix(WARNA.ven, '#3A2FA0', 0.4 * peng);
  const warnaArtGelap = mix(warnaArt, '#8C4A78', 0.45 * (1 - S.vol));
  for (const k of Object.keys(V)) {
    const v = V[k]; if (sk[k]) continue;
    const w = v.tipe === 'art' ? v.w * lebarArt : v.w * (v.pool != null ? lebarVen(k) : (1 - 0.2 * S.vaso));
    (LOW.has(k) ? (pembLo += tabung(v.pts, w, v.tipe === 'art' ? warnaArtGelap : warnaVen)) : (pemb += tabung(v.pts, w, v.tipe === 'art' ? warnaArtGelap : warnaVen)));
  }
  // sinus karotis (benjolan) + reseptor arkus: tonjolan kecil bersinar saat aktif
  const sens = S.sensor;
  const sinus = (p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${f1(5.6 + 2 * sens)}" fill="${WARNA.art}" opacity=".95"/><circle cx="${p[0] - 1.5}" cy="${p[1] - 1.8}" r="2.2" fill="#FFB3A2" opacity=".8"/>`;
  pemb += sinus(JANGKAR.sinusR) + sinus(JANGKAR.sinusL);
  // partikel aliran
  let par = '', parLo = '';
  const sebar = (k, ch, kep, dens, r = 2.7) => {
    const v = V[k]; if (sk[k]) return;
    const n = Math.max(3, Math.round(v.c[v.c.length - 1] / 15));
    const ph = fase(ch, opt.T ?? T) * 1;
    for (let i = 0; i < n; i++) {
      if (i / n > dens) continue;
      let s = (ph * kep + i / n + (k.charCodeAt(0) % 7) * 0.13) % 1; if (s < 0) s += 1;
      const o = Math.min(1, s * 12, (1 - s) * 12);
      (LOW.has(k) ? (parLo += partikel(titikPada(v.pts, v.c, s), r * (v.tipe === 'ven' && v.pool ? 1 + 0.15 * peng : 1), v.tipe, o)) : (par += partikel(titikPada(v.pts, v.c, s), r * (v.tipe === 'ven' && v.pool ? 1 + 0.15 * peng : 1), v.tipe, o)));
    }
  };
  const dArt = clamp(0.3 + 0.7 * S.tek) * (0.5 + 0.5 * S.vol), dCar = clamp(S.bf * 1.05), dJug = clamp(S.bf * 1.05);
  sebar('aorta', 'art', 1, dArt); sebar('artL', 'art', 0.85, dArt); sebar('artR', 'art', 0.85, dArt);
  sebar('carR', 'car', 1, dCar); sebar('carL', 'car', 1, dCar);
  sebar('jugR', 'jug', 1, dJug); sebar('jugL', 'jug', 1, dJug);
  const dKaki = clamp((0.5 + 0.5 * peng) * (0.6 + 0.4 * S.vol) * (1.02));
  sebar('venL', 'venKaki', 1, dKaki, 2.9); sebar('venR', 'venKaki', 1, dKaki, 2.9);
  sebar('ivc', 'venIvc', 1, clamp(S.vr * 1.05 * (0.5 + 0.5 * S.vol)), 3.2);
  // ---- jantung v7 ----
  const T0 = opt.T ?? 0;
  const psi = fase('denyut', T0), u = psi - Math.floor(psi);
  const sist = Math.exp(-Math.pow((u - 0.22) / 0.13, 2)), isi = 0.35 * Math.exp(-Math.pow((u - 0.06) / 0.07, 2));
  const tw = [350, 600], sy = 1 - 0.045 * sist + 0.01 * isi, sx = 1 - 0.02 * sist + 0.012 * isi;
  const tfBody = `translate(${tw[0]} ${tw[1]}) rotate(${(0.8 * sist).toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-tw[0]} ${-tw[1]})`;
  const jantung = `<g transform="translate(${HC[0]} ${HC[1]}) scale(${HK}) translate(${-HA[0]} ${-HA[1]})"><g>${H7.back}</g><g transform="${tfBody}">${H7.body}</g><g>${H7.trunk}</g><g transform="${tfBody}">${H7.hi}</g></g>`;
  // ---- otak, batang otak, sensor, saraf ----
  let atas = otak(S, T0);
  atas += saraf(S, T0);
  atas += sensor(S, T0);
  return { rahimSvg, bawah, bawahLo, pembuluh: pemb, pembuluhLo: pembLo, partikel: par, partikelLo: parLo, jantung, atas, denyut: sist };
}
let T = 0;

function otak(S, T) {
  const bf = S.bf, wr = mix(WARNA.otakLow, WARNA.otak, clamp((bf - 0.2) / 0.8));
  const d = mulus([[118, 182], [126, 150], [150, 128], [184, 118], [218, 118], [252, 128], [276, 150], [284, 182], [274, 208], [248, 226], [214, 232], [186, 232], [152, 226], [126, 208]], true);
  const c = [200, 176];
  let s = '';
  // halo perfusi
  s += `<ellipse cx="200" cy="176" rx="104" ry="72" fill="${mix('#7C7FA8', '#FF8E7C', bf)}" opacity="${f1(0.16 + 0.34 * bf)}" filter="${B(14)}"/>`;
  s += `<path d="${d}" transform="translate(2 4)" fill="#2A0A18" opacity=".35" filter="${B(4)}"/>`;
  s += volum(d, c, wr);
  // celah dan gyri
  s += `<g fill="none" stroke-linecap="round"><path d="M200 120C196 146 206 168 200 196C196 212 202 222 200 232" stroke="${gelap(wr, 0.5)}" stroke-width="3.4" opacity=".6"/>`
    + `<path d="M138 168C152 150 168 160 176 148M146 198C162 184 176 196 188 180M262 168C248 150 232 160 224 148M254 198C238 184 224 196 212 180M152 140C166 132 182 138 190 130M248 140C234 132 218 138 210 130" stroke="${gelap(wr, 0.42)}" stroke-width="3" opacity=".5"/>`
    + `<path d="M140 166C154 148 170 158 178 146M264 166C250 148 234 158 226 146" transform="translate(-1.5 -1.8)" stroke="${terang(wr, 0.5)}" stroke-width="1.8" opacity=".5"/></g>`;
  // batang otak (pusat kendali)
  const ak = S.aff * 0.7 + S.eff * 0.5, glow = clamp(ak) * (0.7 + 0.3 * Math.sin(T * 9));
  s += `<ellipse cx="200" cy="244" rx="${f1(11 + 6 * glow)}" ry="${f1(15 + 6 * glow)}" fill="#F8C038" opacity="${f1(0.55 * glow)}" filter="${B(6)}"/>`;
  s += volum(mulus([[190, 232], [191, 247], [196, 256], [204, 256], [209, 247], [210, 232]], true), [200, 246], '#C98A9C', { tipis: true });
  return s;
}
function saraf(S, T) {
  let s = '';
  const jalur = (nama, akt, kep, kal = 'saraf') => {
    if (akt < 0.02) return;
    const J = SARAF[nama], d = mulus(J.pts);
    s += `<path d="${d}" fill="none" stroke="#F8C038" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 6" opacity="${f1(0.5 * akt)}"/>`;
    const n = 4, ph = T * kep;
    for (let i = 0; i < n; i++) {
      const ss = (ph + i / n) % 1, o = Math.min(1, ss * 10, (1 - ss) * 10) * akt;
      const p = titikPada(J.pts, J.c, ss);
      s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(6 * 1)}" fill="#F8C038" opacity="${f1(0.32 * o)}" filter="${B(2.5)}"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.2" fill="#FFF3C4" opacity="${f1(o)}"/>`;
    }
  };
  const lam = S.aff > 0 && S.eff < 0.4 && S.sensor < 0.7 ? 0.35 : 1;
  const kep = (T > 30 && T < 35) ? 0.22 : 0.6;
  jalur('sinR', S.aff, kep); jalur('sinL', S.aff, kep); jalur('arkus', S.aff, kep);
  jalur('jantung', S.eff, kep); jalur('vesL', S.eff, kep); jalur('vesR', S.eff, kep);
  return s;
}
function sensor(S, T) {
  const a = S.sensor; if (a < 0.02) return '';
  let s = '';
  const cincin = (p, k) => { for (let i = 0; i < 2; i++) { const u = ((T * 0.9 + i * 0.5 + k) % 1), r = 6 + 20 * u; s += `<circle cx="${p[0]}" cy="${p[1]}" r="${f1(r)}" fill="none" stroke="#F8C038" stroke-width="${f1(3 * (1 - u) + 0.6)}" opacity="${f1(a * (1 - u) * 0.9)}"/>`; } };
  cincin(JANGKAR.sinusR, 0); cincin(JANGKAR.sinusL, 0.3); cincin(JANGKAR.arkus, 0.6);
  return s;
}
/** Rahim + tuba + ovarium (kehamilan: rahim membesar dengan siluet janin sederhana). Tuba dan ovarium tidak ikut membesar. */
function rahim(S) {
  const g = S.hamil, a = S.rahim, haid = S.haid;
  const w = 1 + 1.25 * g, h = 1 + 1.15 * g;
  const xT = 14 + 20 * g, yT = 646 - 62 * h;
  let s = `<g opacity="${f1(a)}">`;
  s += `<path d="M${200 - xT} ${f1(yT + 6)}C${f1(170 - 10 * g)} ${f1(yT - 12)} 150 ${f1(yT - 4)} 140 ${f1(yT + 18)}" fill="none" stroke="#F0AEB4" stroke-width="4.4" stroke-linecap="round"/><path d="M${200 + xT} ${f1(yT + 6)}C${f1(230 + 10 * g)} ${f1(yT - 12)} 250 ${f1(yT - 4)} 260 ${f1(yT + 18)}" fill="none" stroke="#F0AEB4" stroke-width="4.4" stroke-linecap="round"/>`;
  s += `<ellipse cx="136" cy="${f1(yT + 24)}" rx="9" ry="7" fill="#F2C28E"/><ellipse cx="264" cy="${f1(yT + 24)}" rx="9" ry="7" fill="#F2C28E"/>`;
  s += `<g transform="translate(200 646) scale(${f1(w)} ${f1(h)}) translate(-200 -646)">`;
  const d = mulus([[200, 584], [214, 588], [224, 604], [217, 626], [208, 642], [200, 648], [192, 642], [183, 626], [176, 604], [186, 588]], true);
  s += `<g opacity="${f1(0.82 + 0.1 * g)}">` + volum(d, [200, 612], mix('#E58AA0', '#B8506E', 0.4 * haid)) + `</g>`;
  s += `<path d="M200 600C195 609 195 620 200 628C205 620 205 609 200 600Z" fill="#7A1C3A" opacity="${f1(0.5 - 0.3 * g)}"/></g>`;
  if (g > 0.25) { // janin sederhana (siluet melingkar), skematis
    const o = clamp((g - 0.25) / 0.5);
    s += `<g opacity="${f1(o)}" transform="translate(200 ${f1(646 - 30 * h)})"><ellipse cx="-4" cy="-8" rx="14" ry="13" fill="#F4C9A6"/><path d="M-14 0C-30 10 -26 36 -4 40C16 42 24 24 14 8C8 -2 -4 -4 -14 0Z" fill="#F0BC96"/><path d="M-2 6C6 12 6 22 -2 28" fill="none" stroke="#C98D6C" stroke-width="3" stroke-linecap="round"/><circle cx="-9" cy="-9" r="1.8" fill="#6A3E2E"/></g>`;
  }
  return s + '</g>';
}
export { V as VASA, SARAF, titikPada };
