// Latar tambahan "Dok, saya kenapa?": lorong, ruang periksa, tempat bermain. Gambar datar, koordinat kanvas 1080 x 1920.
import { R, C, P, L, T, FONT, HAND, TOP, FRONT } from './world.js';
const W = -260, WW = 1600;

// ------------------------------------------------------------ LORONG
// o.door: 0 tertutup .. 1 terbuka penuh; o.room: fungsi () => svg isi ruangan di balik pintu (opsional)
export const DOOR = { x: 700, y: 440, w: 300, h: 740 };
export function lorongBg(t, o = {}) {
  const d = Math.max(0, Math.min(1, o.door || 0));
  const lamp = (x) => R(x, 70, 230, 34, '#fff', 17) + R(x - 20, 104, 270, 30, 'rgba(255,255,255,.25)', 15);
  const tiles = Array.from({ length: 16 }, (_, i) => R(-260 + i * 120, 1186, 2, 600, '#D6E0E0')).join('') + Array.from({ length: 6 }, (_, i) => R(W, 1186 + i * 100, WW, 2, '#D6E0E0')).join('');
  const leaf = d < 0.995
    ? `<g transform="translate(${DOOR.x + DOOR.w} ${DOOR.y}) scale(${(1 - 0.86 * d).toFixed(3)} 1) translate(${-(DOOR.x + DOOR.w)} ${-DOOR.y})">${R(DOOR.x + 6, DOOR.y + 6, DOOR.w - 12, DOOR.h - 6, '#F3F6F6', 8)}${R(DOOR.x + 6, DOOR.y + 6, DOOR.w - 12, 16, '#E1E9E9', 8)}${R(DOOR.x + 60, DOOR.y + 70, DOOR.w - 120, 230, '#BFE6F2', 14)}${L(`M${DOOR.x + 60} ${DOOR.y + 185}H${DOOR.x + DOOR.w - 60}`, '#fff', 6)}${R(DOOR.x + 24, DOOR.y + 400, 18, 56, '#9FB0B3', 9)}${R(DOOR.x + 30, DOOR.y + 340, DOOR.w - 90, 3, '#D3DDDD')}</g>`
    : '';
  const room = d > 0.01 && o.room ? `<g clip-path="url(#doorClip)">${o.room()}</g>` : '';
  const doorFrame = R(DOOR.x - 16, DOOR.y - 16, DOOR.w + 32, DOOR.h + 16, '#B9CACA', 10) + R(DOOR.x, DOOR.y, DOOR.w, DOOR.h, d > 0.01 ? '#EAF4F2' : '#DDE8E8', 4);
  return R(W, -300, WW, 1500, '#E8F2EF') + R(W, -300, WW, 480, '#F0F6F5') + lamp(60) + lamp(420) + lamp(800)
    + R(W, 880, WW, 306, '#9BCDC2') + R(W, 872, WW, 14, '#C8D3D8', 7) + R(W, 1176, WW, 12, '#7FB3A8') + R(W, 1188, WW, 700, '#EAF0F0') + tiles
    // pintu kiri tertutup + papan
    + R(40, 460, 260, 724, '#C8D8D6', 10) + R(54, 474, 232, 710, '#F3F6F6', 8) + R(100, 540, 140, 190, '#BFE6F2', 14) + R(66, 1060, 208, 6, '#D3DDDD') + R(70, 392, 220, 56, '#0F5F57', 14) + T(180, 432, 'RUANG 2', '#fff', 30, 'letter-spacing="2"')
    // bangku
    // salib hijau + jam dinding
    + `<g transform="translate(540 330)">${R(-34, -34, 68, 68, '#2E9E5B', 14)}${R(-8, -24, 16, 48, '#fff', 4)}${R(-24, -8, 48, 16, '#fff', 4)}</g>`
    + `<g transform="translate(200 290)">${C(0, 6, 62, 'rgba(10,56,48,.14)')}${C(0, 0, 62, '#0A3830')}${C(0, 0, 54, '#fff')}${L('M0 0V-36', '#0A3830', 6)}${L('M0 0L26 16', '#0A3830', 7)}${C(0, 0, 7, '#E8665F')}</g>`
    // papan penunjuk di atas pintu periksa
    + R(DOOR.x - 16, DOOR.y - 98, DOOR.w + 32, 64, '#0F5F57', 16) + T(DOOR.x + DOOR.w / 2, DOOR.y - 54, 'RUANG PERIKSA 1', '#fff', 28, 'letter-spacing="1"')
    + `<defs><clipPath id="doorClip"><rect x="${DOOR.x}" y="${DOOR.y}" width="${DOOR.w}" height="${DOOR.h}"/></clipPath></defs>`
    + doorFrame + room + leaf;
}
export function lorongFg() { return ''; }

// ------------------------------------------------------------ RUANG PERIKSA (mengisi seluruh layar; Raka duduk di balik meja)
export function periksaBg(t, o = {}) {
  const blind = Array.from({ length: 9 }, (_, i) => R(716, 392 + i * 36, 308, 14, 'rgba(255,255,255,.55)', 6)).join('');
  const mx = 850, my = 340;
  const mh = (t * 4) % 360;
  const hand = (a, len, w) => { const r = (a - 90) * Math.PI / 180; return L(`M${mx} ${my}L${(mx + Math.cos(r) * len).toFixed(1)} ${(my + Math.sin(r) * len).toFixed(1)}`, '#0A3830', w); };
  return R(W, -1300, WW, 2700, '#EAF4F2') + R(W, 1000, WW, 400, '#D3E6E1') + R(W, 996, WW, 8, '#B9D2CB')
    + R(W, -1300, WW, 1520, '#F2F8F7')
    // tirai + rel
    + R(W, 232, WW, 8, '#C8D3D8', 4) + P('M-20 240H190V1000H-20Z', '#B9DCC8') + Array.from({ length: 5 }, (_, i) => R(-4 + i * 42, 240, 16, 760, 'rgba(255,255,255,.28)', 8)).join('')
    // ranjang periksa di belakang
    + `<g transform="translate(60 990)">${R(0, -150, 330, 56, '#fff', 14)}${R(0, -96, 330, 26, '#9DD1C4', 6)}${R(18, -70, 10, 70, '#8FA6A0')}${R(300, -70, 10, 70, '#8FA6A0')}${R(250, -190, 76, 50, '#DDEFEA', 24)}</g>`
    // jendela
    + R(700, 376, 340, 360, '#BFE6F5', 22) + C(980, 450, 30, '#FFE08A') + P('M700 736 Q780 640 860 690 Q940 620 1040 700V736Z', '#7BC98B') + blind + R(692, 368, 356, 14, '#A5B8B3', 7) + R(692, 730, 356, 14, '#A5B8B3', 7)
    // jam
    + C(mx, my + 6, 70, 'rgba(10,56,48,.14)') + C(mx, my, 70, '#0A3830') + C(mx, my, 61, '#fff') + L(`M${mx} ${my - 44}V${my - 54}M${mx + 44} ${my}H${mx + 54}`, '#0A3830', 6) + hand(mh, 46, 6) + hand(mh / 12, 30, 8) + C(mx, my, 7, '#E8665F')
    // rak dan salib
    + `<g transform="translate(60 520)">${R(0, 0, 230, 12, '#B3926A', 5)}${R(14, -64, 40, 64, '#E8665F', 6)}${R(60, -80, 36, 80, '#F8C038', 6)}${R(102, -58, 44, 58, '#5BD0E6', 6)}${C(190, -22, 22, '#3DB46E')}${R(180, -4, 20, 4, '#7A4A2B')}</g>`
    + `<g transform="translate(560 200)">${R(-30, -30, 60, 60, '#2E9E5B', 14)}${R(-7, -22, 14, 44, '#fff', 4)}${R(-22, -7, 44, 14, '#fff', 4)}</g>`;
}
export function periksaTop() {
  return R(W, TOP, WW, FRONT - TOP, '#D8B58C')
    // papan nama "dr. Raka"
    + `<g transform="translate(250 ${TOP})">${R(-92, -50, 184, 50, 'rgba(10,56,48,.2)', 8, 'transform="translate(0 6)"')}${R(-92, -56, 184, 50, '#fff', 8)}${R(-92, -56, 184, 8, '#0F5F57', 4)}<text x="0" y="-18" text-anchor="middle" ${FONT} font-size="26" fill="#0A3830">dr. Raka</text></g>`
    // map status pasien + pulpen
    + `<g transform="translate(130 ${TOP})">${R(-52, -30, 104, 30, '#F8C038', 6)}${R(-46, -40, 88, 14, '#F2A950', 5)}</g>`;
}
export function periksaFg() { return R(W, FRONT, WW, 800, '#C4996B') + R(W, FRONT + 30, WW, 6, '#AE8458') + R(W, FRONT + 130, WW, 6, '#AE8458'); }

// ------------------------------------------------------------ TEMPAT BERMAIN
export function gameBg(t) {
  const road = (() => {
    let s = R(160, 350, 760, 390, '#1B1A3B') + R(160, 350, 760, 190, '#6F5BD6') + R(160, 530, 760, 10, '#9B8CF0');
    s += P('M470 540 L610 540 L880 740 L200 740Z', '#3C3A66');
    for (let i = 0; i < 6; i++) { const y = 560 + ((i * 36 + t * 140) % 200); const k = (y - 540) / 200; s += R(536 - 6 * (0.3 + k), y, 12 * (0.3 + k), 20 * (0.3 + k), '#F8C038'); }
    s += `<g transform="translate(${(540 + Math.sin(t * 1.3) * 90).toFixed(0)} 690)">${R(-36, -26, 72, 40, '#E8665F', 12)}${R(-26, -40, 52, 24, '#fff', 8)}${C(-26, 14, 10, '#111')}${C(26, 14, 10, '#111')}</g>`;
    return s;
  })();
  const neon = (x, y, w, c) => R(x, y, w, 10, c, 5, 'opacity=".95"') + R(x - 4, y - 5, w + 8, 20, c, 10, 'opacity=".22"');
  return R(W, -1300, WW, 2700, '#2E2A5E') + R(W, 1000, WW, 400, '#26224E') + R(W, 996, WW, 8, '#4A4590')
    + neon(40, 250, 360, '#FF6FB5') + neon(680, 250, 360, '#5BD0E6') + neon(40, 290, 160, '#F8C038')
    + R(130, 330, 820, 430, '#10101F', 30) + road + R(130, 330, 820, 430, 'none', 30, 'stroke="#10101F" stroke-width="22"')
    + R(500, 770, 80, 30, '#10101F', 6)
    + `<g transform="translate(70 1010)">${P('M0 0 Q0 -140 120 -150 Q230 -150 240 0Z', '#7E6BE0')}${P('M24 -6 Q40 -100 120 -110', 'none', 'stroke="#9B8CF0" stroke-width="10" stroke-linecap="round"')}</g>`
    + `<g transform="translate(900 1010)">${R(-70, -160, 130, 160, '#3C3A66', 16)}${R(-50, -140, 90, 14, '#F8C038', 7)}${R(-50, -112, 90, 14, '#F8C038', 7)}${C(-5, -60, 26, '#F8C038')}</g>`;
}
export function gameTop() {
  return R(W, TOP, WW, FRONT - TOP, '#3A3570')
    + `<g transform="translate(140 ${TOP})">${P('M-56 0 Q0 24 56 0Z', '#F1E5D2')}${C(-20, -12, 18, '#F2A950')}${C(10, -16, 18, '#E8665F')}${C(32, -8, 16, '#F8C038')}</g>`
    + `<g transform="translate(940 ${TOP})">${R(-18, -58, 36, 58, '#E8665F', 6)}${R(-18, -44, 36, 14, '#fff', 3)}${R(46, -58, 36, 58, '#5BD0E6', 6)}${R(46, -44, 36, 14, '#fff', 3)}</g>`;
}
export function gameFg() { return R(W, FRONT, WW, 800, '#2A2650') + R(W, FRONT, WW, 10, '#FF6FB5') + R(W, FRONT + 10, WW, 18, 'rgba(255,111,181,.25)'); }

// ------------------------------------------------------------ benda genggam tambahan
export function heldObject2(kind, x, y, s = 1) {
  const g = (inner) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})">${inner}</g>`;
  switch (kind) {
    case 'gamepad': return g(P('M-52 -52 Q-70 -52 -76 -28 L-86 14 Q-90 34 -72 34 Q-60 34 -50 12 L50 12 Q60 34 72 34 Q90 34 86 14 L76 -28 Q70 -52 52 -52Z', '#4B4B6B') + R(-46, -40, 22, 8, '#2B2B44', 4) + R(-39, -47, 8, 22, '#2B2B44', 4) + C(40, -32, 7, '#E8665F') + C(58, -20, 7, '#F8C038') + C(42, -10, 7, '#5BD0E6'));
    case 'papan': return g(R(-84, -228, 168, 232, 'rgba(10,56,48,.18)', 14, 'transform="translate(5 7)"') + R(-84, -228, 168, 232, '#B3926A', 14) + R(-72, -210, 144, 206, '#fff', 8) + R(-34, -240, 68, 30, '#8FA6A0', 10)
      + [0, 1, 2, 3, 4].map((i) => `${R(-58, -184 + i * 38, 14, 14, 'none', 3, 'stroke="#0F5F57" stroke-width="4"')}${R(-34, -180 + i * 38, 82 - (i % 3) * 14, 8, '#C8D3D8', 4)}`).join(''));
    default: return '';
  }
}
