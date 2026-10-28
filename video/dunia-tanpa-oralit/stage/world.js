// Dunia statis dan properti "Dunia tanpa oralit". Satu set lebar 2200 px: ruang tamu (kiri) dan meja makan (kanan).
import { el } from './rig.js';

export const C = {
  wall: '#FAEBD3', wall2: '#F5E0BE', floor: '#E2B885', floorLine: '#D6A66F', base: '#F2D9AE',
  teal: '#00A383', forest: '#0A3830', navy: '#172B38', mint: '#9DE0BD', gold: '#F8C038', coral: '#E8665F',
  water: '#58B9EA', waterD: '#3FA3DB', elec: '#F8C038', elecD: '#EE9A2E', cream: '#FBF3E2',
  sofa: '#4FA89A', sofaD: '#3F978A', sofaL: '#6CBBAD', wood: '#C98F5B', woodL: '#E2AE78', woodD: '#B27843',
};
export const YF = 1250; // garis lantai/dinding
export const SEAT = 1130; // tinggi dudukan sofa dan kursi
export const TABLE = { x0: 1450, x1: 1990, top: 1100 };

const g = (parent, attrs = {}) => el('g', attrs, parent);
const html = (parent, s, attrs = {}) => { const e = el('g', attrs, parent); e.innerHTML = s; return e; };

// ============ latar ============
export function buildBackground(layer) {
  const W = 2200;
  html(layer, `
    <defs>
      <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BDE7F7"/><stop offset="1" stop-color="#E8F7FC"/></linearGradient>
      <linearGradient id="lightG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6D8" stop-opacity=".75"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></linearGradient>
      <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCEFD9"/><stop offset="1" stop-color="#F6E1BF"/></linearGradient>
    </defs>
    <rect x="-200" y="-200" width="${W + 400}" height="${YF + 200}" fill="url(#wallG)"/>
    ${Array.from({ length: 22 }, (_, i) => `<rect x="${i * 110 - 20}" y="-200" width="55" height="${YF + 200}" fill="#F3DDB6" opacity=".32"/>`).join('')}
    <rect x="-200" y="${YF - 22}" width="${W + 400}" height="30" fill="${C.base}"/>
    <rect x="-200" y="${YF + 8}" width="${W + 400}" height="900" fill="${C.floor}"/>
    ${Array.from({ length: 9 }, (_, i) => `<rect x="-200" y="${YF + 70 + i * 82}" width="${W + 400}" height="5" fill="${C.floorLine}" opacity=".5"/>`).join('')}
  `);
  // jendela ruang tamu
  html(layer, `
    <rect x="150" y="250" width="330" height="470" rx="26" fill="#fff"/>
    <rect x="168" y="268" width="294" height="434" rx="16" fill="url(#skyG)"/>
    <rect x="311" y="268" width="8" height="434" fill="#fff"/><rect x="168" y="478" width="294" height="8" fill="#fff"/>
    <ellipse cx="260" cy="360" rx="60" ry="22" fill="#fff" opacity=".9"/><ellipse cx="320" cy="344" rx="42" ry="18" fill="#fff" opacity=".9"/>
    <path d="M110 230Q150 232 170 300Q176 520 150 700Q126 712 110 700Z" fill="#F4B7A8"/>
    <path d="M520 230Q480 232 460 300Q454 520 480 700Q504 712 520 700Z" fill="#F4B7A8"/>
    <rect x="96" y="222" width="440" height="16" rx="8" fill="${C.woodD}"/>
    <path d="M150 700L-60 1180L420 1180L480 700Z" fill="url(#lightG)" opacity=".55"/>
  `);
  // bingkai gambar di atas sofa dan rak tanaman
  html(layer, `
    <rect x="640" y="330" width="170" height="210" rx="14" fill="#fff"/><rect x="654" y="344" width="142" height="182" rx="8" fill="#CDEBDF"/>
    <circle cx="725" cy="420" r="34" fill="${C.gold}"/><path d="M654 526Q690 450 725 490Q765 430 796 526Z" fill="${C.sofa}"/>
    <rect x="840" y="390" width="110" height="140" rx="12" fill="#fff"/><rect x="852" y="402" width="86" height="116" rx="6" fill="#F8D7C9"/>
    <circle cx="895" cy="450" r="22" fill="#fff" opacity=".9"/><path d="M852 518Q880 470 895 490Q915 460 938 518Z" fill="${C.coral}" opacity=".8"/>
  `);
  // dapur/meja makan: rak dinding, jendela, jam
  html(layer, `
    <rect x="1230" y="360" width="440" height="22" rx="10" fill="${C.woodD}"/>
    <rect x="1230" y="560" width="440" height="22" rx="10" fill="${C.woodD}"/>
    <path d="M1260 382V560M1640 382V560" stroke="${C.woodD}" stroke-width="10"/>
    <rect x="1262" y="470" width="60" height="90" rx="12" fill="#BFE7F5"/><rect x="1262" y="470" width="60" height="22" rx="8" fill="#9ED3E8"/>
    <rect x="1340" y="500" width="70" height="60" rx="12" fill="${C.coral}" opacity=".85"/><rect x="1340" y="490" width="70" height="16" rx="8" fill="#F28B82"/>
    <path d="M1480 560q-14-70 22-84 36 14 22 84z" fill="${C.sofaL}"/><path d="M1503 476q-28-40-4-70 22 30 4 70z" fill="${C.sofa}"/>
    <path d="M1560 560q-16-52 16-66 32 14 16 66z" fill="#9DE0BD"/>
    <rect x="1900" y="300" width="250" height="400" rx="24" fill="#fff"/><rect x="1916" y="316" width="218" height="368" rx="14" fill="url(#skyG)"/>
    <rect x="2021" y="316" width="8" height="368" fill="#fff"/><rect x="1916" y="494" width="218" height="8" fill="#fff"/>
    <circle cx="1740" cy="330" r="62" fill="#fff"/><circle cx="1740" cy="330" r="52" fill="#FDF8EC"/>
    <path d="M1740 330V294M1740 330L1764 342" stroke="${C.navy}" stroke-width="7" stroke-linecap="round"/><circle cx="1740" cy="330" r="6" fill="${C.navy}"/>
  `);
}

// ============ ruang tamu ============
export function buildSofa(backLayer, frontLayer) {
  const x0 = 250, x1 = 920;
  html(backLayer, `
    <ellipse cx="585" cy="1330" rx="470" ry="60" fill="#172B38" opacity=".08"/>
    <ellipse cx="585" cy="1450" rx="560" ry="110" fill="#F2B6A6" opacity=".55"/>
    <rect x="${x0 + 20}" y="840" width="${x1 - x0 - 40}" height="330" rx="70" fill="${C.sofaD}"/>
    <rect x="${x0 + 40}" y="860" width="${x1 - x0 - 80}" height="120" rx="50" fill="${C.sofa}"/>
    <rect x="${x0 - 36}" y="960" width="110" height="330" rx="48" fill="${C.sofaD}"/>
    <rect x="${x1 - 74}" y="960" width="110" height="330" rx="48" fill="${C.sofaD}"/>
  `);
  html(frontLayer, `
    <rect x="${x0 + 40}" y="1128" width="${x1 - x0 - 80}" height="170" rx="40" fill="${C.sofa}"/>
    <rect x="${x0 + 40}" y="1128" width="${x1 - x0 - 80}" height="34" rx="17" fill="${C.sofaL}"/>
    <rect x="${x0 - 30}" y="1010" width="98" height="300" rx="44" fill="${C.sofa}"/>
    <rect x="${x1 - 68}" y="1010" width="98" height="300" rx="44" fill="${C.sofa}"/>
    <path d="M${x0 + 100} 1300v40M${x1 - 100} 1300v40" stroke="${C.woodD}" stroke-width="18" stroke-linecap="round"/>
  `);
  // lampu berdiri dan tanaman
  html(backLayer, `
    <rect x="968" y="760" width="10" height="500" rx="5" fill="${C.woodD}"/><ellipse cx="973" cy="1262" rx="48" ry="12" fill="${C.woodD}"/>
    <path d="M920 770L1026 770L1002 690L944 690Z" fill="#FFE9A8"/>
    <path d="M110 1240q-70-60-50-170 52 30 62 100 6 40-12 70z" fill="${C.sofaL}"/><path d="M130 1240q20-120 100-160 6 80-30 140z" fill="${C.sofa}"/>
    <path d="M100 1250h120l-14 100h-92z" fill="${C.coral}"/>
  `);
}

// ============ meja makan ============
export function buildTable(backLayer, frontLayer) {
  const { x0, x1, top } = TABLE;
  html(backLayer, `
    <ellipse cx="${(x0 + x1) / 2 + 40}" cy="1425" rx="440" ry="70" fill="#172B38" opacity=".08"/>
    <rect x="1730" y="1150" width="190" height="30" rx="14" fill="#6F9A9B"/>
    <rect x="1744" y="1180" width="12" height="230" rx="6" fill="#587F80"/><rect x="1894" y="1180" width="12" height="230" rx="6" fill="#587F80"/>
    <rect x="1866" y="880" width="32" height="290" rx="15" fill="#6F9A9B"/>
  `);
  // taplak panjang menutup kolong: tubuh dan kaki anak di baliknya tidak tembus ke depan
  const cx0 = x0 - 26, cx1 = x1 + 26, hem = 1340;
  html(frontLayer, `
    <path d="M${cx0} ${top + 20}L${cx1} ${top + 20}L${cx1} ${hem - 22}${(() => { let d = ''; for (let x = cx1; x > cx0; x -= 46) d += `Q${x - 23} ${hem + 18} ${Math.max(x - 46, cx0)} ${hem - 22}`; return d; })()}Z" fill="#FFF8E8"/>
    <rect x="${cx0}" y="${hem - 74}" width="${cx1 - cx0}" height="20" fill="${C.coral}" opacity=".85"/>
    <rect x="${cx0}" y="${hem - 40}" width="${cx1 - cx0}" height="8" fill="${C.sofaL}" opacity=".9"/>
    <path d="M${cx0 + 10} ${top + 40}L${cx0 + 10} ${hem - 90}" stroke="#F1E2C2" stroke-width="14" stroke-linecap="round" opacity=".7"/>
    <rect x="${x0 - 40}" y="${top}" width="${x1 - x0 + 80}" height="46" rx="23" fill="${C.woodL}"/>
    <rect x="${x0 - 40}" y="${top + 26}" width="${x1 - x0 + 80}" height="20" rx="10" fill="${C.wood}"/>
  `);
}

// ============ properti ============
export function sachetSVG() {
  const w = 86, h = 126, step = 14;
  const xs = []; for (let x = -w; x <= w + 0.1; x += step) xs.push(x);
  let top = '', bot = '';
  xs.forEach((x, i) => { top += `${i ? 'L' : 'M'}${x} ${-h + (i % 2 ? 0 : 8)}`; });
  [...xs].reverse().forEach((x, i) => { bot += `L${x} ${h - (i % 2 ? 0 : 8)}`; });
  return `
    <path d="${top}${bot}Z" fill="${C.teal}"/>
    <rect x="${-w + 14}" y="${-h + 34}" width="${2 * w - 28}" height="${2 * h - 68}" rx="20" fill="#fff"/>
    <path d="M0 -62q26 38 0 56q-26-18 0-56z" fill="${C.water}"/>
    <path d="M38 -32l11 14-11 14-11-14z" fill="${C.elec}"/><path d="M-38 -26l9 11-9 11-9-11z" fill="${C.elec}" opacity=".7"/>
    <text x="0" y="${-h + 28}" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="25" fill="#fff" letter-spacing="1.5">ORALIT</text>
    <rect x="-48" y="22" width="96" height="9" rx="4.5" fill="#C9D6D3"/><rect x="-48" y="42" width="78" height="9" rx="4.5" fill="#DCE5E2"/><rect x="-48" y="62" width="88" height="9" rx="4.5" fill="#DCE5E2"/>`;
}
export function glassSVG() {
  return `<path d="M-30 -64L30 -64L25 0Q25 8 17 8L-17 8Q-25 8 -25 0Z" fill="#E9F7FD" opacity=".92"/>`;
}
export function jugSVG() {
  return `
    <path d="M-42 -120Q-48 -128 -36 -130L36 -130Q48 -128 42 -118L56 0Q57 12 44 12L-44 12Q-57 12 -56 0Z" fill="#CBEAF5" opacity=".95"/>
    <path d="M-54 -50L54 -50L56 0Q57 12 44 12L-44 12Q-57 12 -56 0Z" fill="${C.water}" opacity=".75"/>
    <path d="M52 -100Q92 -100 92 -62Q92 -30 56 -24" fill="none" stroke="#CBEAF5" stroke-width="12" stroke-linecap="round"/>
    <path d="M-30 -112L-26 -20" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/>`;
}

// ============ ikon ============
export const ICONS = {
  cup: `<svg viewBox="0 0 80 80"><path d="M20 18h40l-5 46q-1 6-7 6H32q-6 0-7-6z" fill="#BFE7F5"/><path d="M23 38h34l-2 26q-1 6-7 6H32q-6 0-7-6z" fill="#58B9EA"/></svg>`,
  cupNo: `<svg viewBox="0 0 80 80"><path d="M20 18h40l-5 46q-1 6-7 6H32q-6 0-7-6z" fill="#BFE7F5"/><path d="M23 38h34l-2 26q-1 6-7 6H32q-6 0-7-6z" fill="#58B9EA"/><circle cx="58" cy="58" r="19" fill="#E8665F"/><path d="M50 50l16 16M66 50L50 66" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`,
  tired: `<svg viewBox="0 0 80 80"><circle cx="40" cy="42" r="30" fill="#F0C09A"/><path d="M24 40q7 6 14 0M44 40q7 6 14 0" fill="none" stroke="#1F2430" stroke-width="5" stroke-linecap="round"/><path d="M33 58q7-5 14 0" fill="none" stroke="#8A3F36" stroke-width="5" stroke-linecap="round"/><path d="M62 16h12l-12 12h12M54 6h8l-8 8h8" fill="none" stroke="#4A88C7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  low: `<svg viewBox="0 0 80 80"><rect x="22" y="10" width="36" height="60" rx="14" fill="#fff" stroke="#C9D6D3" stroke-width="5"/><path d="M26 54h28v6q0 6-6 6H32q-6 0-6-6z" fill="#F29B38"/><path d="M40 20v14M34 28l6 8 6-8" fill="none" stroke="#E8665F" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clinic: `<svg viewBox="0 0 80 80"><path d="M10 70V30L40 12l30 18v40z" fill="#fff" stroke="#00A383" stroke-width="5" stroke-linejoin="round"/><rect x="33" y="28" width="14" height="30" rx="4" fill="#00A383"/><rect x="25" y="36" width="30" height="14" rx="4" fill="#00A383"/></svg>`,
  iv: `<svg viewBox="0 0 80 80"><path d="M26 8h28v8l6 8v30q0 8-8 8H28q-8 0-8-8V24l6-8z" fill="#DDF3FA" stroke="#58B9EA" stroke-width="4" stroke-linejoin="round"/><path d="M24 40h32v14q0 6-6 6H30q-6 0-6-6z" fill="#58B9EA" opacity=".85"/><path d="M40 62v8q0 6 6 6h10" fill="none" stroke="#58B9EA" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="30" r="3.5" fill="#58B9EA"/></svg>`,
  check: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#00A383"/><path d="M24 41l11 11 21-24" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cross: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#E8665F"/><path d="M27 27l26 26M53 27L27 53" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>`,
  toilet: `<svg viewBox="0 0 80 80"><rect x="22" y="8" width="36" height="28" rx="8" fill="#fff" stroke="#9AB0B8" stroke-width="4"/><path d="M14 38h52q0 22-16 28v6H30v-6Q14 60 14 38z" fill="#fff" stroke="#9AB0B8" stroke-width="4" stroke-linejoin="round"/></svg>`,
  heart: `<svg viewBox="0 0 80 80"><path d="M40 68S10 48 10 28q0-14 14-14 12 0 16 12 4-12 16-12 14 0 14 14c0 20-30 40-30 40z" fill="#E8665F"/></svg>`,
  drop: `<svg viewBox="0 0 80 80"><path d="M40 8Q66 40 66 54a26 26 0 0 1-52 0Q14 40 40 8z" fill="#58B9EA"/><path d="M26 54q0 12 10 16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/></svg>`,
  diamond: `<svg viewBox="0 0 80 80"><path d="M40 6l28 34-28 34L12 40z" fill="#F8C038"/><path d="M40 6l28 34H12z" fill="#FBD56B"/></svg>`,
};
