// Video "Tensi rendah, terutama pada perempuan" (80,6 dtk, 1080x1920, 30 fps). Tokoh: Tala (brand/characters/teman). Jantung: v7. Anatomi lain: skematis.
// Satu peristiwa diikuti kamera: Tala bangkit dari kursi -> darah berkumpul di kaki dan perut -> aliran balik ke jantung berkurang -> aliran ke otak berkurang ->
// sensor tekanan -> jantung lebih cepat dan pembuluh menyempit -> respons terlambat -> penyebab -> kehamilan, haid sangat banyak, anemia != tensi rendah -> tensimeter (4,3 dtk) -> gejala dan penyebab -> kapan ke medis.
import { FONT, MEREK } from '../tokens.mjs';
import { kamera, proyeksi, labelFase } from '../kerangka.mjs';
import { latar, bintang } from '../latar.mjs';
import { f1, clamp, lerp, seg, ease, jendela, kf, mix, B, BLUR_DEFS, mulus } from '../tensi/util.mjs';
import { KALIMAT, M, DURASI, kalimatAktif } from '../tensi/waktu.mjs';
import { negara } from '../tensi/negara.mjs';
import { P, gambarTala, antarKunci, idleTeman, lerpTeman, DUNIA, kek, SKALA, X0, Y0, BOB_DUDUK, MEJA_Y, MEJA_X } from '../tensi/tala.mjs';
import { gambarMeja, gambarKursi, gambarLantai } from '../tensi/ruang.mjs';
import { gambarAnatomi, DEFS_JANTUNG, JANGKAR } from '../tensi/anatomi.mjs';
import * as U from '../tensi/ui.mjs';

export const meta = { id: 'tensi', judul: 'Tensi rendah', sub: 'tekanan darah rendah pada perempuan', organ: 'jantung', durasi: DURASI, fps: 30 };
const GADING = MEREK.gading, EMAS = MEREK.emas, TINTA = MEREK.tinta;

// ------------------------------------------------------------------ kamera
const KAM = [
  // [t, u, v, skala, layarX, layarY]   (u,v = titik pada tokoh yang dijadikan pusat bidikan; area panggung y 380-1540)
  [0, 200, 500, 1.3, 470, 1060], [1.0, 200, 480, 1.3, 470, 1030], [2.1, 200, 262, 1.95, 470, 830], [4.0, 200, 290, 1.7, 470, 840], [5.2, 200, 430, 1.2, 470, 950], [6.8, 200, 440, 1.2, 440, 960],
  [8.6, 200, 440, 1.22, 440, 960], [9.3, 200, 650, 2.5, 420, 950], [11.7, 200, 650, 2.5, 420, 950], [12.3, 195, 540, 2.5, 420, 960], [13.9, 195, 540, 2.5, 420, 960],
  [14.5, 212, 440, 3.0, 420, 950], [16.5, 212, 440, 3.0, 420, 950], [17.2, 200, 270, 2.5, 420, 960], [19.3, 200, 270, 2.5, 420, 960],
  [19.95, 200, 440, 1.22, 440, 960], [22.3, 200, 440, 1.22, 440, 960], [22.95, 205, 320, 3.2, 420, 950], [24.8, 205, 320, 3.2, 420, 950],
  [25.35, 206, 365, 2.2, 420, 950], [26.5, 206, 365, 2.2, 420, 950], [27.1, 200, 540, 1.5, 420, 960], [29.3, 200, 540, 1.5, 420, 960],
  [29.8, 200, 440, 1.22, 440, 960], [30.2, 200, 440, 1.22, 440, 960], [30.85, 200, 300, 2.2, 420, 950], [34.4, 200, 300, 2.2, 420, 950],
  [35.0, 200, 440, 1.22, 440, 960], [39.4, 200, 440, 1.22, 440, 960], [40.3, 200, 600, 2.7, 430, 900], [43.2, 200, 600, 2.7, 430, 900],
  [43.9, 200, 585, 2.2, 420, 790], [48.5, 200, 585, 2.2, 420, 790], [49.0, 200, 540, 1.7, 420, 940], [54.8, 200, 540, 1.7, 420, 940],
  [56.0, 200, 450, 1.22, 440, 960], [63.0, 200, 450, 1.22, 440, 960], [64.0, 200, 520, 1.02, 470, 1040],
  [64.6, 50, 520, 1.3, 520, 1000], [68.2, 50, 520, 1.3, 520, 1000], [69.0, 200, 480, 1.0, 470, 1040], [71.9, 200, 480, 1.0, 470, 1040], [72.7, 200, 470, 0.8, 470, 1090], [80.6, 200, 470, 0.8, 470, 1090],
].map(([t, u, v, s, sx, sy]) => { const P0 = kek(u, v); return { t, x: sx - 540 - (P0[0] - 540) * s, y: sy - 920 - (P0[1] - 920) * s, s }; });

// ------------------------------------------------------------------ koreografi Tala
const dudukBase = (o = {}) => P({ ekspresi: 'santai', sit: 1, bob: BOB_DUDUK, ...o });
const FASE1 = [
  [0.0, P({ ekspresi: 'heran', sit: 0.8, bob: 50, tilt: 4, lean: -3, kananXY: [286, 604, 334, 520] })],
  [0.55, P({ ekspresi: 'heran', sit: 0.3, bob: 18, lean: 2, tilt: -2, kananXY: [290, 592, 334, 510] })],
  [1.05, P({ ekspresi: 'heran', sit: 0, bob: -4, lean: 0, tilt: 0, lid: 0.15 })],
  [1.8, P({ ekspresi: 'lelah', lean: 3, tilt: -5, lid: 0.7 })],
  [2.7, P({ ekspresi: 'lelah', lean: -5, tilt: 6, lid: 0.88 })],
  [3.6, P({ ekspresi: 'lelah', lean: 5, tilt: -8, blink: 0.85, lid: 0.9 })],
  [4.5, P({ ekspresi: 'heran', lean: -7, tilt: 7, lid: 0.2, kananBebas: 1 })],
  [5.4, P({ ekspresi: 'heran', lean: 7, tilt: -6, kananBebas: 0.8 })],
  [6.2, P({ ekspresi: 'lelah', lean: -3, tilt: 3, kananBebas: 0.3 })],
  [7.0, P({ ekspresi: 'lelah', lean: 0, tilt: 0 })],
];
const EKS = [[0, 'lelah'], [29.6, 'santai'], [31.2, 'lelah'], [34.6, 'santai'], [39.6, 'heran'], [42.8, 'santai'], [48.6, 'lelah'], [55, 'lelah'], [64, 'santai'], [69.7, 'lelah'], [72.0, 'senang']];
function eksNama(T) { let cur = EKS[0][1], prev = cur, tb = 0; for (const [t, n] of EKS) if (T >= t) { prev = cur; cur = n; tb = t; } return { cur, prev, u: seg(T, tb, tb + 0.5) }; }

function talaState(T, S) {
  let s;
  if (T < 7.0) s = antarKunci(T, FASE1);
  else {
    const e = eksNama(T);
    const dasar = lerpTeman(P({ ekspresi: e.prev, sit: 0 }), P({ ekspresi: e.cur, sit: 0 }), e.u);
    const amp = seg(T, 7, 8.2) * (0.7 + 6.5 * clamp((0.86 - S.bf) / 0.6));
    const lemah = 1 - S.bf;
    s = JSON.parse(JSON.stringify(dasar));
    const lean = amp * Math.sin(T * 2.4) * 0.9, tilt = amp * 0.8 * Math.sin(T * 2.4 + 1.2);
    const gelap = T > 31.6 && T < 34.0 ? seg(T, 31.6, 32.6) * (1 - seg(T, 33.4, 34.2)) : 0;
    s.lean = lean; s.tilt = tilt; s.lid = Math.max(s.lid, 0.3 + 0.55 * clamp(lemah * 1.6)); s.blink = Math.max(s.blink, 0.8 * gelap);
    s.armL = P({ ekspresi: 'santai', sit: 0, bob: 0, lean }).armL;
  }
  // kembali duduk (akhir bagian dalam tubuh)
  const dk = seg(T, 62.2, 64.0, ease.inOut);
  if (dk > 0) {
    const duduk = dudukBase({ ekspresi: T > 72.2 ? 'senang' : 'santai' });
    s = lerpTeman(s, duduk, dk);
  }
  return idleTeman(s, T);
}

// ------------------------------------------------------------------ POV (pandangan dari mata Tala: kabur lalu menggelap)
function pov(T) {
  const a = seg(T, 2.15, 2.45) * (1 - seg(T, 4.05, 4.45));
  if (a < 0.01) return '';
  const swing = Math.sin(T * 3.1) * 3.5 * seg(T, 2.2, 3.0), blur = 6 + 12 * seg(T, 2.3, 3.4);
  const bukaR = 1 - seg(T, 2.5, 3.55, ease.inOut), kembali = seg(T, 3.9, 4.35, ease.inOut);
  const r = lerp(0.04, 0.95, Math.max(bukaR, kembali)) , gel = 0.06 + 0.94 * (1 - Math.max(bukaR, kembali));
  const sc = `<g transform="translate(540 960) rotate(${f1(swing)}) translate(-540 -960)"><g filter="${B(blur)}">
<rect x="-80" y="-80" width="1240" height="2080" fill="#2E5A60"/><rect x="-80" y="-80" width="1240" height="1000" fill="#3B6C70"/>
<rect x="620" y="260" width="380" height="520" rx="20" fill="#FFE9B0"/><rect x="636" y="276" width="170" height="236" fill="#FFF6D8"/>
<path d="M-80 1180C220 1130 700 1130 1160 1180V2000H-80Z" fill="#8A5C3A"/><path d="M-80 1180C220 1130 700 1130 1160 1180V1230C700 1184 220 1184 -80 1230Z" fill="#C79A68"/>
<path d="M300 1190H420L408 1060H312Z" fill="#CFE9F0" opacity=".7"/><path d="M308 1150H414L408 1190H312Z" fill="#7FD0E8"/><rect x="740" y="1120" width="260" height="60" rx="30" fill="#EDE4D2" opacity=".6"/></g></g>`;
  const gr = `<radialGradient id="povG" cx="50%" cy="48%" r="72%"><stop offset="${f1(r * 0.55)}" stop-color="#000" stop-opacity="0"/><stop offset="${f1(Math.min(0.99, r * 0.55 + 0.34))}" stop-color="#000" stop-opacity="${f1(0.55 + 0.45 * gel)}"/><stop offset="1" stop-color="#000" stop-opacity="1"/></radialGradient>`;
  const gelap = `<rect x="-80" y="-80" width="1240" height="2080" fill="#000" opacity="${f1(Math.max(0, gel - 0.5) * 2 * 0.95)}"/>`;
  return `<g opacity="${f1(a)}" clip-path="url(#vp)"><defs>${gr}</defs>${sc}<rect x="-80" y="-80" width="1240" height="2080" fill="url(#povG)"/>${gelap}</g>`;
}

// ------------------------------------------------------------------ bab (chip) dan takarir
const BAB = [
  [0, 7.0, 'Berdiri tiba-tiba'], [7.0, 11.95, 'Darah berkumpul di kaki'], [11.95, 14.3, 'Aliran balik ke jantung turun'], [14.3, 19.4, 'Aliran ke otak berkurang'], [19.4, 22.4, 'Tubuh biasanya mengimbangi'],
  [22.4, 24.9, 'Sensor tekanan'], [24.9, 30.1, 'Jantung dan pembuluh menyesuaikan'], [30.1, 34.6, 'Bila respons terlambat'], [34.6, 39.7, 'Penyebab tekanan turun'], [39.7, 43.3, 'Pada perempuan'],
  [43.3, 48.6, 'Kehamilan'], [48.6, 55.0, 'Haid sangat banyak'], [55.0, 63.6, 'Anemia bukan tensi rendah'], [63.6, 68.7, 'Mengukur tekanan'], [68.7, 72.3, 'Gejala dan penyebab'], [72.3, 78.3, 'Kapan perlu ke medis'],
];

// ------------------------------------------------------------------ label (anchor pada struktur; koordinat tokoh)
function faseLabel(T, ke, cuffA) {
  const A = JANGKAR, L = (teks, a, warna) => ({ teks, a: ke(...a), warna });
  const R = '#E5483F', Bl = '#6C74F0', G = '#F8C038', Pk = '#EE98A4';
  return [
    { t0: 7.6, t1: 11.7, item: [L('Darah di\nperut', A.perut, Bl), L('Darah di\nkaki', A.kaki, Bl)] },
    { t0: 12.1, t1: 13.95, item: [L('Vena kava\nbawah', A.ivc, Bl), L('Jantung', A.jantung, R)] },
    { t0: 14.55, t1: 16.9, item: [L('Tekanan\nturun', A.arkus, R)] },
    { t0: 16.9, t1: 19.4, item: [L('Aliran ke\notak turun', A.karotis, R), L('Otak', A.otak, Pk)] },
    { t0: 19.95, t1: 22.4, item: [L('Tubuh\nmengimbangi', A.jantung, R)] },
    { t0: 22.55, t1: 24.9, item: [L('Sensor\nleher', A.sinusL, G), L('Sensor dekat\njantung', A.arkus, G)] },
    { t0: 25.0, t1: 26.7, item: [L('Pusat\nkendali', A.batang, G), L('Denyut\nlebih cepat', A.jantung, R)] },
    { t0: 26.8, t1: 29.4, item: [L('Pembuluh\nmenyempit', [229, 650], R), L('Tekanan\nterjaga', A.arkus, R)] },
    { t0: 30.4, t1: 34.3, item: [L('Respons\nterlambat', A.sinusL, G), L('Aliran ke\notak turun', A.karotis, R), L('Pusing', [262, 140], G)] },
    { t0: 34.95, t1: 36.0, item: [L('Kurang\ncairan', A.aorta, R)] },
    { t0: 35.95, t1: 36.95, item: [L('Obat\ntertentu', [229, 650], G)] },
    { t0: 36.9, t1: 39.3, item: [L('Kehilangan\ndarah', [231, 700], R)] },
    { t0: 40.7, t1: 43.2, item: [L('Rahim', A.rahim, '#D77A8E')] },
    { t0: 43.7, t1: 48.0, item: [L('Rahim\nhamil', A.rahim, '#D77A8E'), L('Pembuluh\nrileks', [229, 650], R), L('Tekanan\nlebih rendah', A.aorta, R)] },
    { t0: 49.0, t1: 54.4, item: [L('Haid sangat\nbanyak', A.rahim, '#D77A8E'), L('Volume\ndarah turun', A.aorta, R), L('Tekanan\nturun', A.arkus, R)] },
    { t0: 64.7, t1: 68.4, item: [L('Manset', cuffA, G)] },
    { t0: 69.9, t1: 72.2, item: [L('Gejala', [262, 150], G)] },
    { t0: 70.95, t1: 72.2, item: [{ teks: 'Penyebab', a: [418, 470], warna: G }] },
  ];
}

// ------------------------------------------------------------------ kartu perempuan
function kartuHamil(T) {
  const a = jendela(T, 44.2, 48.2, 0.5); if (a < 0.01) return '';
  const r = ease.inOut(clamp((T - 44.6) / 1.8)) * (T < 48 ? 1 : 1);
  const x = 64, y = 1130, w = 952, h = 400;
  let s = U.kartu(x, y, w, h, 'Pembuluh darah', a);
  s += `<g opacity="${f1(a)}">${U.penampang(250, y + 230, 120, r, T)}`;
  s += `<text x="250" y="${y + 382}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="30" fill="${GADING}" opacity=".85">${r < 0.5 ? 'tegang' : 'lebih rileks'}</text>`;
  s += U.dial(700, y + 250, 140, 0.5 - 0.15 * r, 1, '');
  s += `<text x="700" y="${y + 330}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="32" fill="${GADING}">Tekanan</text>`;
  s += `<text x="700" y="${y + 366}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="28" fill="${GADING}" opacity=".85">bisa lebih rendah</text>`;
  s += `<path d="M420 ${y + 230}h60m-14 -14l14 14l-14 14" fill="none" stroke="${EMAS}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(seg(T, 45, 45.8))}"/>`;
  return s + `</g>`;
}
function kartuPerbandingan(T) {
  const a = jendela(T, 55.05, 63.6, 0.5); if (a < 0.01) return '';
  const aA = seg(T, 55.3, 56.0), aB = seg(T, 56.9, 57.6), kes = seg(T, 57.2, 58.0, ease.out);
  const haid = seg(T, 59.2, 60.0), kurang = seg(T, 59.4, 62.0, ease.inOut);
  let s = `<rect x="-80" y="-80" width="1240" height="2080" fill="#04141A" opacity="${f1(0.92 * a)}"/>`;
  const xA = 64, yA = 270, w = 952, h = 400, yB = 770;
  s += `<g opacity="${f1(a * aA)}">${U.kartu(xA, yA, w, h, 'Tekanan rendah', 1)}`;
  s += U.pembuluhPanjang(130, yA + 150, 480, 100, { cairan: 0.56, sel: 0.9, T, kec: 0.5 });
  s += U.dial(790, yA + 250, 115, 0.12, 1, '') + `<text x="790" y="${yA + 360}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="${GADING}">Tekanan turun</text>`;
  s += `<text x="130" y="${yA + 330}" font-family="${FONT}" font-weight="700" font-size="31" fill="${GADING}">Volume darah berkurang</text>` + U.ikon.tetes(112, yA + 112, 0.9) + `</g>`;
  s += `<g opacity="${f1(a * kes)}" transform="translate(540 ${(yA + h + yB) / 2}) scale(${f1(0.7 + 0.3 * kes)})"><circle r="46" fill="${EMAS}" stroke="${TINTA}" stroke-width="4"/><path d="M-23 -11H23M-23 11H23M16 -27L-16 27" stroke="${TINTA}" stroke-width="7.5" stroke-linecap="round"/></g>`;
  s += `<g opacity="${f1(a * aB)}">${U.kartu(xA, yB, w, h, 'Anemia', 1)}`;
  s += U.pembuluhPanjang(130, yB + 150, 480, 100, { cairan: 1, sel: 1 - 0.78 * kurang, T, kec: 1, plasma: '#E5483F', pucat: kurang });
  s += U.dial(790, yB + 250, 115, 0.5, 1, '') + `<text x="790" y="${yB + 360}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="${GADING}">Tekanan normal</text>`;
  s += `<text x="130" y="${yB + 330}" font-family="${FONT}" font-weight="700" font-size="31" fill="${GADING}">Sel darah merah berkurang</text>`;
  s += `<g opacity="${f1(haid)}">${U.pil(250, yB + 22, 'Haid banyak berulang', { fill: '#F4C9D2', size: 26, ikonSvg: U.ikon.tetes(276, yB + 22 + 25, 0.5, '#B0444F') })}</g>`;
  s += `</g>`;
  // Tala pusing (tekanan normal): potongan badan atas di ruang bawah kartu
  const pb = a * seg(T, 56.9, 57.6);
  if (pb > 0.01) {
    const e = seg(T, 59.2, 60.0), st = lerpTeman(P({ ekspresi: 'heran', kiriMeja: false }), P({ ekspresi: 'lelah', kiriMeja: false, lid: 0.8, tilt: 5 }), e);
    st.armL = { wx: 96, wy: 556, ex: 90, ey: 488, finger: 0, front: 0 }; st.armR = { wx: 304, wy: 556, ex: 310, ey: 488, finger: 0, front: 0 };
    s += `<g opacity="${f1(pb)}"><clipPath id="bustc"><rect x="0" y="1190" width="1080" height="360"/></clipPath><g clip-path="url(#bustc)"><g transform="translate(540 1228) scale(0.9) translate(-200 -100)">${gambarTala(idleTeman(st, T), { uid: 'bs' })}${U.bintangPusing(T, kurang * 0.9, 200, 96)}</g></g></g>`;
    s += `<g opacity="${f1(a * seg(T, 60.0, 60.7))}">${U.pil(700, 1330, 'Pusing', { fill: GADING, size: 32, ikonSvg: U.ikon.putar(727, 1360, 1.0, '#B0782A') })}</g>`;
  }
  return s;
}

// ------------------------------------------------------------------ tensimeter (hanya 64,2 - 68,5 dtk)
function tensimeter(T, ssT) {
  const a = jendela(T, 64.25, 68.5, 0.35); if (a < 0.01) return { dunia: '', layar: '' };
  const infl = Math.max(0, Math.sin(clamp((T - 64.7) / 1.8) * Math.PI)) * seg(T, 64.6, 64.9) * (T < 66.7 ? 1 : 0);
  const digit = seg(T, 66.0, 66.5);
  const dev = `<g opacity="${f1(a)}" transform="translate(${f1((1 - a) * -30)} 0)"><rect x="-120" y="${MEJA_Y - 80}" width="124" height="84" rx="16" fill="#E9E3D6"/><rect x="-120" y="${MEJA_Y - 80}" width="124" height="84" rx="16" fill="none" stroke="#8A5C3A" stroke-width="3" opacity=".5"/><rect x="-108" y="${MEJA_Y - 70}" width="100" height="42" rx="8" fill="#0F2A2E"/>`
    + `<text x="-58" y="${MEJA_Y - 40}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="21" fill="#9FF0D6" opacity="${f1(digit)}">&lt;90/60</text><text x="-58" y="${MEJA_Y - 42}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="20" fill="#9FF0D6" opacity="${f1(1 - digit)}">···</text>`
    + `<circle cx="-92" cy="${MEJA_Y - 14}" r="7" fill="${EMAS}"/><circle cx="-70" cy="${MEJA_Y - 14}" r="7" fill="#fff" opacity=".6"/>`
    + `<path d="M4 ${MEJA_Y - 40}C40 ${MEJA_Y - 50} 54 ${MEJA_Y - 30} 66 ${MEJA_Y - 54}" fill="none" stroke="#2A3A44" stroke-width="5" stroke-linecap="round"/></g>`;
  // manset di lengan atas kiri layar (kerangka lengan Tala: bahu (104,410), siku/pergelangan dari state)
  const arm = ssT.armL, sx = 104, sy = 410, cx = 2 * arm.ex - (sx + arm.wx) / 2, cy = 2 * arm.ey - (sy + arm.wy) / 2;
  const t = 0.4, u = 1 - t, px = u * u * sx + 2 * u * t * cx + t * t * arm.wx, py = u * u * sy + 2 * u * t * cy + t * t * arm.wy;
  const tx = 2 * u * (cx - sx) + 2 * t * (arm.wx - cx), ty = 2 * u * (cy - sy) + 2 * t * (arm.wy - cy), ang = Math.atan2(ty, tx) * 57.3 - 90;
  const cuff = `<g opacity="${f1(a)}" transform="translate(${f1(px)} ${f1(py)}) rotate(${f1(ang)}) scale(${f1(1 + 0.07 * infl)})"><rect x="-37" y="-17" width="74" height="34" rx="12" fill="#1D9E8C"/><rect x="-37" y="-17" width="74" height="12" rx="6" fill="#4CCDB8" opacity=".55"/><rect x="-37" y="9" width="74" height="8" rx="4" fill="#0E6F63" opacity=".6"/><rect x="-20" y="-4" width="30" height="8" rx="4" fill="#fff" opacity=".35"/></g>`;
  const tube = `<path d="M${f1(px - 14)} ${f1(py + 10)}C${f1(px - 80)} ${f1(py + 60)} 40 ${MEJA_Y - 70} 4 ${MEJA_Y - 44}" fill="none" stroke="#2A3A44" stroke-width="5" stroke-linecap="round" opacity="${f1(a)}"/>`;
  const catatan = U.pil(120, 1480, 'Satu angka belum menentukan penyebab', { fill: GADING, size: 30, p: a * seg(T, 65.6, 66.3) }) ;
  const catatan2 = U.pil(120, 1540, 'atau tingkat keparahan', { fill: GADING, size: 30, p: a * seg(T, 65.8, 66.5) });
  return { dunia: tube + dev, cuff, layar: catatan + catatan2, pos: [px, py] };
}

function penyebab(T) {
  const ic = [U.ikon.gelas, U.ikon.pil, (x, y, s) => U.ikon.tetes(x, y, s * 0.9)];
  let s = '';
  ic.forEach((f, i) => { const p = seg(T, 70.95 + i * 0.28, 71.4 + i * 0.28, ease.out) * (1 - seg(T, 72.0, 72.35)); if (p > 0.01) s += `<g opacity="${f1(p)}" transform="translate(${130 + i * 120} 470) scale(${f1(0.7 + 0.3 * p)}) translate(${-(130 + i * 120)} -470)"><circle cx="${130 + i * 120}" cy="470" r="48" fill="${GADING}"/>${f(130 + i * 120, 470, 1.15)}</g>`; });
  return s;
}
// ------------------------------------------------------------------ penutup
function peringatan(T) {
  const it = [[M.s18.pingsan - 0.1, 'Pingsan'], [M.s18.perdarahan - 0.1, 'Perdarahan banyak'], [M.s18.pusing - 0.1, 'Pusing berat dan menetap']];
  let s = '';
  it.forEach(([t0, teks], i) => { const p = seg(T, t0, t0 + 0.45, ease.out); if (p > 0.01) s += U.pil(64, 330 + i * 92, teks, { fill: GADING, size: 36, p, ikonSvg: U.ikon.segitiga(64 + 38, 330 + i * 92 + 34, 0.95) }); });
  const p = seg(T, M.s18.medis - 0.15, M.s18.medis + 0.5, ease.out);
  if (p > 0.01) s += `<g opacity="${f1(p)}" transform="translate(0 ${f1((1 - p) * 20)})"><rect x="64" y="${330 + 3 * 92 + 8 + 6}" width="700" height="112" rx="56" fill="#000" opacity=".3"/><rect x="64" y="${330 + 3 * 92 + 8}" width="700" height="112" rx="56" fill="${EMAS}"/><text x="108" y="${330 + 3 * 92 + 8 + 68}" font-family="${FONT}" font-weight="800" font-size="40" fill="${TINTA}">Segera cari pertolongan medis</text></g>`;
  return s;
}
function kartuAkhir(T) {
  const a = seg(T, 78.35, 78.95); if (a < 0.01) return '';
  return `<g opacity="${f1(a)}"><rect x="-80" y="-80" width="1240" height="2080" fill="#06161A"/><image href="logo-mark.webp" x="400" y="720" width="280" height="280"/>`
    + `<text x="540" y="1100" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="76" letter-spacing="8" fill="${GADING}">MEDCOEL</text>`
    + `<text x="540" y="1170" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="30" fill="${GADING}" opacity=".75">Edukasi umum, bukan pengganti pemeriksaan tenaga kesehatan</text></g>`;
}

// ------------------------------------------------------------------ bingkai
export function frame(T, opt = {}) {
  const S = negara(T), kam = kamera(T, KAM);
  const ke = (u, v) => proyeksi(kam, kek(u, v));
  const ss = talaState(T, S);
  const tembus = S.tembus;
  const A = tembus > 0.01 ? gambarAnatomi(T, S, { T }) : null;
  const body = `translate(0 ${f1(ss.bob)}) rotate(${f1(ss.lean)} 200 580)`;
  const dizzy = (T > 69.7 && T < 72.4) ? 0.85 * jendela(T, 69.8, 72.4, 0.4) : T < 7 ? seg(T, 1.6, 2.4) * (1 - seg(T, 6.0, 7.0)) * (T > 3.6 ? 1 : 0.6) : clamp((0.75 - S.bf) / 0.45);
  const tm = tensimeter(T, ss);
  const cuffA = tm.pos ? [tm.pos[0], tm.pos[1] + ss.bob] : [86, 540];
  // dunia
  let w = `<g transform="${DUNIA}">`;
  w += gambarLantai(1) + gambarKursi(1 - 0.72 * tembus);
  w += `<g opacity="${f1(1 - 0.74 * tembus)}">${gambarTala(ss, { uid: 'tl' })}</g>`;
  if (A) {
    w += `<g opacity="${f1(tembus)}">`;
    w += `${A.bawahLo}<g opacity="${f1(1 - 0.62 * S.rahim)}">${A.pembuluhLo}${A.partikelLo}</g>${A.rahimSvg}`;
    w += `<g transform="${body}">${A.bawah}${A.pembuluh}${A.partikel}${A.jantung}${A.atas}`;
    w += bocoran(T, S) + `</g></g>`;
  }
  w += gambarMeja(1 - 0.6 * tembus);
  if (tm.cuff) w += `<g transform="${body}">${tm.cuff}</g>`;
  w += tm.dunia;
  w += `<g transform="${body}">${U.bintangPusing(T, dizzy)}</g>`;
  w += `</g>`;
  // lapisan
  const par = (k) => `translate(${f1(-kam.x * k)} ${f1(-kam.y * k)})`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1920" width="1080" height="1920" font-family="${FONT}">`;
  svg += `<defs><clipPath id="vp"><rect width="1080" height="1920"/></clipPath></defs>${BLUR_DEFS}<defs>${DEFS_JANTUNG}</defs><g clip-path="url(#vp)">`;
  svg += `<g transform="${par(0.35)}">${latar('jantung', T)}</g>`;
  svg += `<g transform="${kam.tf}">${w}</g>`;
  svg += pov(T);
  svg += kartuHamil(T) + kartuPerbandingan(T);
  // indikator
  const hud = jendela(T, 8.0, 54.9, 0.5);
  if (hud > 0.01) {
    svg += U.batang(196, 'Tekanan', S.tek, hud) + U.batang(256, 'Aliran ke otak', S.bf, hud);
    const pv = Math.max(jendela(T, 34.5, 39.9, 0.4), jendela(T, 48.6, 55.4, 0.4));
    svg += U.batang(316, 'Volume darah', S.vol, pv * hud);
  }
  if (!opt.tanpaLabel) {
    svg += `<g class="lbl-wadah">${labelFase(T, faseLabel(T, ke, cuffA), { kolom: 716, min: 420, max: 1480, jarak: 130 })}</g>`;
  }
  svg += panahGravitasi(T);
  svg += penyebab(T);
  svg += tm.layar;
  const sg = T > 72.2 && T < 78.4 ? peringatan(T) : '';
  svg += sg;
  const bab = BAB.find(([a, b]) => T >= a && T < b);
  if (bab) svg += U.chip(bab[2], jendela(T, bab[0] + 0.05, bab[1], 0.3));
  const k = kalimatAktif(T);
  if (k && T < 78.4) svg += U.takarir(k.teks, seg(T, k.t0 - 0.05, k.t0 + 0.2) * (1 - seg(T, k.t1 + 0.1, k.t1 + 0.35)));
  svg += U.catatan();
  svg += kartuAkhir(T);
  svg += `</g></svg>`;
  return svg;
}

function panahGravitasi(T) {
  const a = jendela(T, 7.5, 11.9, 0.5); if (a < 0.01) return '';
  let s = `<g opacity="${f1(a)}">${U.pil(64, 590, 'Gravitasi', { fill: GADING, size: 30 })}`;
  for (let i = 0; i < 3; i++) { const u = ((T * 0.5 + i / 3) % 1), y = 690 + u * 220, o = Math.min(1, u * 5, (1 - u) * 5); s += `<path d="M70 ${f1(y)}l30 30l30 -30" fill="none" stroke="${EMAS}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(o)}"/>`; }
  return s + `</g>`;
}
// tetes darah keluar (kehilangan darah umum 36,9-39 dan haid sangat banyak 48,9-54,2)
function bocoran(T, S) {
  let s = '';
  const a1 = jendela(T, M.s10.darah, 39.2, 0.3);
  if (a1 > 0.02) for (let i = 0; i < 3; i++) { const u = ((T * 0.7 + i / 3) % 1), x = 236 + u * 10, y = 704 + u * 54, o = Math.min(1, u * 6, (1 - u) * 3) * a1; s += U.ikon.tetes(x, y, 0.36, '#E5483F', o); }
  if (a1 > 0.02) s += `<path d="M228 700l7 5l-7 5" fill="none" stroke="#FFD0C6" stroke-width="3" stroke-linecap="round" opacity="${f1(a1)}"/>`;
  const a2 = S.haid;
  if (a2 > 0.02) for (let i = 0; i < 5; i++) { const u = ((T * 0.6 + i / 5) % 1), x = 200 + Math.sin(i * 2 + u * 6) * 3, y = 646 + u * 100, o = Math.min(1, u * 6, (1 - u) * 3) * a2; s += U.ikon.tetes(x, y, 0.36, '#B0183A', o); }
  return s;
}
