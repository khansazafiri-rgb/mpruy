// Aset gambar alat GCU elektrokimia GENERIK (bukan model produk tertentu): strip, meter, lancet, tetes darah, label.
// Satuan lokal "su": lebar strip 60, panjang 320; strip dipasang di meter lebar 240. Skala dunia Raka = 0.267 (strip 16 px, meter 64 px).
// Cahaya kunci dari kiri-atas, bayangan jatuh ke kanan-bawah (aturan MEDCOEL). Semua gambar infografis, bukan skala nyata.
import { f1, clamp, lerp, sm, eo, MC, FONT } from './core.js';

export const SW = 60, SL = 320, DEV_TOP = 230, DEV_BOT = 790, U = 0.267;
export const BLOOD = { base: '#C8283C', dark: '#8E1428', light: '#FF8A98' };
export const ANALYT = {
  glukosa: { nama: 'GLUKOSA', warna: '#2BA6C9', gelap: '#17718C' },
  kolesterol: { nama: 'KOLESTEROL TOTAL', warna: '#F2B233', gelap: '#B07A12' },
  urat: { nama: 'ASAM URAT', warna: '#B77AD6', gelap: '#7B49A0' },
};
const STRIP_D = 'M-30 6Q-30 0 -24 0H24Q30 0 30 6V312Q30 320 22 320H-22Q-30 320 -30 312Z';
const CH_D = 'M-6 0V34H-6V76H-17Q-17 76 -17 84V132Q-17 140 -9 140H9Q17 140 17 132V84Q17 76 17 76H6V34H6V0Z';   // lubang masuk + saluran sempit + ruang reaksi
const NOTCH_D = 'M-9 0V16Q-9 22 0 22Q9 22 9 16V0Z';
const CH_BLOOD_D = 'M-6.5 -2V34V76H-18V132Q-18 141 -9 141H9Q18 141 18 132V76H6.5V-2Z';

export function defs() {
  return `<defs>
<linearGradient id="gvStrip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#EEF1EC"/><stop offset="1" stop-color="#C9D2CC"/></linearGradient>
<linearGradient id="gvBase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9EEF0"/><stop offset="1" stop-color="#9CC3C6"/></linearGradient>
<linearGradient id="gvDev" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#EAF0EC"/><stop offset="1" stop-color="#B9C9C2"/></linearGradient>
<linearGradient id="gvDevDk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B6E64"/><stop offset="1" stop-color="#0B3F38"/></linearGradient>
<linearGradient id="gvLcd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8F6E4"/><stop offset="1" stop-color="#B9D8B8"/></linearGradient>
<linearGradient id="gvGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A0"/><stop offset=".5" stop-color="#F8C038"/><stop offset="1" stop-color="#C58A10"/></linearGradient>
<linearGradient id="gvBlood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4505F"/><stop offset=".6" stop-color="#C8283C"/><stop offset="1" stop-color="#8E1428"/></linearGradient>
<linearGradient id="gvPcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14876F"/><stop offset="1" stop-color="#0A4E40"/></linearGradient>
<radialGradient id="gvDrop" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#F26A78"/><stop offset=".55" stop-color="#C8283C"/><stop offset="1" stop-color="#8E1428"/></radialGradient>
<filter id="fvShadow" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="6" dy="10" stdDeviation="7" flood-color="#031815" flood-opacity=".38"/></filter>
<filter id="fvShadowS" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="3" dy="5" stdDeviation="3.5" flood-color="#031815" flood-opacity=".4"/></filter>
<filter id="fvGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="fvGlowS" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2"/></filter>
</defs>`;
}

// denyut sinyal sepanjang path: p = posisi kepala (0..1 dari panjang path), len = panjang ekor
export const pulse = (d, p, o = {}) => {
  if (p <= -0.001 || p >= 1.2) return '';
  const L = (o.len ?? 0.16) * 100, st = p * 100 - L, w = o.w ?? 5, col = o.color ?? '#FFE066';
  const dash = `stroke-dasharray="${f1(L)} 400" stroke-dashoffset="${f1(-st)}" pathLength="100"`;
  return `<g opacity="${o.a ?? 1}"><path d="${d}" fill="none" stroke="${col}" stroke-width="${w * 3.2}" stroke-linecap="round" stroke-linejoin="round" opacity=".38" filter="url(#fvGlowS)" ${dash}/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash}/><path d="${d}" fill="none" stroke="#fff" stroke-width="${w * 0.42}" stroke-linecap="round" stroke-linejoin="round" ${dash}/></g>`;
};

// ------------------------------------------------------------------ strip
export const TRACK_W = 'M-8.5 136V160L-13 190V292';
export const TRACK_C = 'M8.5 136V160L13 190V292';
export const TRACK_W_FULL = 'M-8.5 100V160L-13 190V322';   // untuk denyut sinyal (dari pad elektroda ke pin kontak meter)
export const TRACK_C_FULL = 'M8.5 100V160L13 190V322';
/** o: cover 0..1 (penutup atas buram -> bening), fill 0..1 (darah mengisi), tint (warna reagen), glow 0..1 (penanda infografis reaksi), sig (posisi denyut 0..1 atau -1), tracksLit 0..1, id */
export function stripSvg(o = {}) {
  const cover = o.cover ?? 1, fill = clamp(o.fill ?? 0), tint = o.tint ?? ANALYT.glukosa.warna, id = o.id ?? 'st';
  const rea = `<rect x="-16" y="82" width="32" height="56" rx="7" fill="${tint}" opacity=".78"/><rect x="-16" y="82" width="32" height="56" rx="7" fill="none" stroke="${o.tintDark ?? '#17718C'}" stroke-width="1.2" opacity=".6"/>`;
  const chamberY = 76 + 64;   // dasar ruang
  const yFill = fill <= 0 ? -3 : lerp(-3, 141, fill);
  const bl = fill > 0
    ? `<clipPath id="${id}bcl"><path d="${CH_BLOOD_D}"/></clipPath><g clip-path="url(#${id}bcl)"><rect x="-20" y="-3" width="40" height="${f1(yFill + 3)}" fill="url(#gvBlood)" opacity=".95"/><ellipse cx="0" cy="${f1(yFill)}" rx="${fill < 0.5 ? 6.5 : 17}" ry="3.2" fill="${BLOOD.light}" opacity=".5"/></g>`
    : '';
  const tracks = `<path d="${TRACK_W}" fill="none" stroke="#7E8C98" stroke-width="5.2" stroke-linecap="round"/><path d="${TRACK_C}" fill="none" stroke="#56677A" stroke-width="5.2" stroke-linecap="round"/><path d="${TRACK_W}" fill="none" stroke="#C7D1D9" stroke-width="1.6" stroke-linecap="round" transform="translate(-1 0)" opacity=".8"/><path d="${TRACK_C}" fill="none" stroke="#A9B6C3" stroke-width="1.6" stroke-linecap="round" transform="translate(-1 0)" opacity=".8"/>`;
  const pads = `<rect x="-15" y="86" width="12" height="50" rx="3" fill="#7E8C98"/><rect x="3" y="86" width="12" height="50" rx="3" fill="#56677A"/>`;
  const contacts = `<rect x="-20" y="288" width="14" height="32" rx="2" fill="url(#gvGold)" stroke="#9A6A08" stroke-width=".8"/><rect x="6" y="288" width="14" height="32" rx="2" fill="url(#gvGold)" stroke="#9A6A08" stroke-width=".8"/>`;
  const base = `<path d="${STRIP_D}" fill="url(#gvBase)" opacity="${f1(0.55 + 0.45 * cover)}"/><path d="${STRIP_D}" fill="none" stroke="${MC.ink}" stroke-width="1.6" opacity=".5"/>`;
  // lapisan dalam (terlihat saat penutup bening dan, untuk jendela, selalu)
  const inner = `<g class="gv-inner">${pads}${tracks}${rea}<path d="${CH_D}" fill="#0F2A33" opacity=".78"/>${bl}<path d="${NOTCH_D}" fill="#0F2A33" opacity=".9"/><circle cx="0" cy="146" r="2.4" fill="#0F2A33" opacity=".7"/>${contacts}</g>`;
  // penutup atas: berlubang pada jendela (lubang masuk + saluran + ruang) sehingga darah selalu terlihat
  const cov = `<mask id="${id}cm"><rect x="-40" y="-10" width="80" height="340" fill="#fff"/><path d="${CH_D}" fill="#000"/><path d="${NOTCH_D}" fill="#000"/></mask>`
    + `<g mask="url(#${id}cm)" opacity="${f1(cover)}"><path d="${STRIP_D}" fill="url(#gvStrip)"/>`
    + `<rect x="-30" y="196" width="60" height="22" fill="${tint}" opacity=".9"/><rect x="-30" y="196" width="60" height="22" fill="none" stroke="${MC.ink}" stroke-width=".6" opacity=".3"/>`
    + `<path d="M-23 52l5-5 5 5M-23 62l5-5 5 5M13 52l5-5 5 5M13 62l5-5 5 5" fill="none" stroke="${MC.ink}" stroke-width="1.6" stroke-linecap="round" opacity=".42"/>`
    + `<path d="M-26 10H-14M14 10H26" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`
    + `<g fill="none" stroke="${MC.ink}" stroke-width=".9" opacity=".35"><path d="${CH_D}"/></g></g>`;
  const frame = `<path d="${CH_D}" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="${f1(0.65 * cover)}"/><path d="${STRIP_D}" fill="none" stroke="${MC.ink}" stroke-width="1.8" opacity=".5"/>`;
  const glow = (o.glow ?? 0) > 0.01 ? `<ellipse cx="0" cy="110" rx="26" ry="36" fill="${o.glowColor ?? '#FFF2A8'}" opacity="${f1(0.55 * o.glow)}" filter="url(#fvGlow)"/>` : '';
  const sig = o.sig !== undefined && o.sig >= 0 ? pulse(TRACK_W_FULL, o.sig, { w: 4.2 }) + pulse(TRACK_C_FULL, o.sig, { w: 4.2 }) : '';
  return `<g class="gv-strip" ${o.shadow === false ? '' : 'filter="url(#fvShadowS)"'}>${base}${inner}${cov}${glow}${sig}${frame}</g>`;
}

// ------------------------------------------------------------------ meter
// tata letak (su): celah strip y 230-242, kontak y ~290-320 (di dalam), chip pembaca y 392-452, layar y 470-640, tombol y 692, dasar y 790
export const BODY_D = 'M-84 230H84Q120 230 120 266V754Q120 790 84 790H-84Q-120 790 -120 754V266Q-120 230 -84 230Z';
export const TR_L = 'M-13 322V352H-62V394';
export const TR_R = 'M13 322V352H62V394';
export const TR_OUT = 'M0 452V486';
export const LCD = { x: -92, y: 482, w: 184, h: 146 };
/** o: cut 0..1 (cangkang bening, isi terlihat), screen {text, unit, tag, a, dash}, sig (denyut jalur kiri/kanan 0..1), sig2 (jalur keluar), chip 0..1 (cahaya chip), id */
export function meterSvg(o = {}) {
  const cut = clamp(o.cut ?? 0), sc = o.screen, id = o.id ?? 'mt', ext = 1 - cut;
  const shell = `<g ${o.shadow === false ? '' : 'filter="url(#fvShadow)"'}><path d="${BODY_D}" fill="url(#gvDev)" opacity="${f1(1 - 0.8 * cut)}"/></g><path d="${BODY_D}" fill="none" stroke="${MC.ink}" stroke-width="2.4" opacity="${f1(0.45 + 0.2 * cut)}"/>`;
  const shine = `<path d="M-100 272Q-100 248 -78 246" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="${f1(0.8 * ext)}"/><path d="M-112 330V700" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="${f1(0.45 * ext)}"/>`;
  const slot = `<rect x="-36" y="226" width="72" height="16" rx="5" fill="#16262E" opacity="${f1(ext)}"/>`;
  const accent = `<rect x="-120" y="330" width="240" height="44" fill="url(#gvDevDk)" opacity="${f1(ext)}"/><text x="0" y="362" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="${MC.ivory}" opacity="${f1(0.92 * ext)}" letter-spacing="6">GCU</text><path d="M-86 410H86M-86 428H86" stroke="${MC.ink}" stroke-width="3" stroke-linecap="round" opacity="${f1(0.12 * ext)}"/>`;
  const btn = `<circle cx="-50" cy="692" r="23" fill="url(#gvGold)" stroke="#9A6A08" stroke-width="2" opacity="${f1(ext)}"/><circle cx="50" cy="692" r="23" fill="url(#gvGold)" stroke="#9A6A08" stroke-width="2" opacity="${f1(ext)}"/>`;
  const pcb = cut > 0.01 ? `<g opacity="${f1(cut)}"><rect x="-106" y="250" width="212" height="522" rx="24" fill="url(#gvPcb)" stroke="#073A30" stroke-width="2"/>`
    + `<g fill="none" stroke="#6FD6B4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".6"><path d="${TR_L}"/><path d="${TR_R}"/><path d="${TR_OUT}"/></g>`
    + `<rect x="-44" y="392" width="88" height="60" rx="8" fill="#1B2832" stroke="#0A141A" stroke-width="2"/><g stroke="#9AA8B3" stroke-width="3" stroke-linecap="round">${[-30, -10, 10, 30].map((x) => `<path d="M${x} 392v-9M${x} 452v9"/>`).join('')}</g><rect x="-30" y="405" width="60" height="34" rx="5" fill="#26394A"/>`
    + `<path d="M-13 296V322M13 296V322" stroke="url(#gvGold)" stroke-width="8" stroke-linecap="round"/><circle cx="-13" cy="293" r="6" fill="#F8C038" stroke="#9A6A08" stroke-width="1.6"/><circle cx="13" cy="293" r="6" fill="#F8C038" stroke="#9A6A08" stroke-width="1.6"/></g>` : '';
  const lcdA = sc ? (sc.a ?? 1) : 1;
  const lcd = `<rect x="-104" y="470" width="208" height="170" rx="16" fill="#16262E"/><rect x="${LCD.x}" y="${LCD.y}" width="${LCD.w}" height="${LCD.h}" rx="9" fill="url(#gvLcd)"/>`
    + (sc && sc.text ? `<text x="${sc.tag ? 10 : 0}" y="584" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${sc.fs ?? 84}" fill="#1B3B34" opacity="${f1(lcdA)}" letter-spacing="-2">${sc.text}</text><text x="56" y="618" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="22" fill="#1B3B34" opacity="${f1(0.75 * lcdA)}">${sc.unit ?? 'mg/dL'}</text>` : `<text x="0" y="574" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="70" fill="#1B3B34" opacity="${f1(sc ? 0.4 * (sc.dash ?? 1) : 0)}" letter-spacing="6">- - -</text>`)
    + (sc && sc.tag ? `<text x="-82" y="512" font-family="${FONT}" font-weight="800" font-size="19" fill="#1B3B34" opacity="${f1(0.8 * (sc.tagA ?? 1))}">${sc.tag}</text>` : '')
    + `<path d="M-86 494Q-86 488 -78 488H20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".65"/>`;
  const on = cut > 0.3 ? 1 : 0;
  const sig = on && o.sig !== undefined && o.sig >= 0 ? pulse(TR_L, o.sig, { w: 5 }) + pulse(TR_R, o.sig, { w: 5 }) : '';
  const sig2 = on && o.sig2 !== undefined && o.sig2 >= 0 ? pulse(TR_OUT, o.sig2, { w: 5 }) : '';
  const chipGlow = on && (o.chip ?? 0) > 0.01 ? `<rect x="-44" y="392" width="88" height="60" rx="8" fill="#FFE066" opacity="${f1(0.6 * o.chip)}" filter="url(#fvGlow)"/>` : '';
  return `<g class="gv-meter">${shell}${slot}${pcb}${accent}${btn}${shine}${chipGlow}${sig}${sig2}${lcd}</g>`;
}

// ------------------------------------------------------------------ tetes darah, lancet
export function dropSvg(cx, cy, r, o = {}) {   // tetes menggantung dengan puncak lancip ke atas (rot 0); o.rot derajat, o.sx lebar
  const rot = o.rot ?? 0, sx = o.sx ?? 1, a = o.a ?? 1;
  return `<g transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f1(rot)}) scale(${sx.toFixed(3)} 1)" opacity="${a}"><path d="M0 ${-r * 1.55}C${r * 0.28} ${-r * 0.78} ${r} ${-r * 0.5} ${r} ${r * 0.18}A${r} ${r} 0 0 1 ${-r} ${r * 0.18}C${-r} ${-r * 0.5} ${-r * 0.28} ${-r * 0.78} 0 ${-r * 1.55}Z" fill="url(#gvDrop)"/><ellipse cx="${-r * 0.34}" cy="${-r * 0.02}" rx="${r * 0.2}" ry="${r * 0.34}" fill="#fff" opacity=".55" transform="rotate(18 ${-r * 0.34} 0)"/></g>`;
}
export function blobSvg(cx, cy, r, o = {}) {   // tetes bulat menempel (setengah bola) pada jari
  return `<g transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f1(o.rot ?? 0)})" opacity="${o.a ?? 1}"><ellipse rx="${f1(r * (o.sx ?? 1))}" ry="${f1(r * (o.sy ?? 1))}" fill="url(#gvDrop)"/><ellipse cx="${f1(-r * 0.32)}" cy="${f1(-r * 0.3)}" rx="${f1(r * 0.22)}" ry="${f1(r * 0.34)}" fill="#fff" opacity=".6" transform="rotate(28 ${f1(-r * 0.32)} ${f1(-r * 0.3)})"/></g>`;
}
/** lancet pen: berarah ke KIRI (ujung di x=0, badan memanjang ke +x). len ~ 62 */
export function lancetSvg(o = {}) {
  const needle = o.needle ?? 0;
  return `<g filter="url(#fvShadowS)"><path d="M0 -4L16 -9V9L0 4Z" fill="#D8E4EC" stroke="${MC.ink}" stroke-width="1.4" opacity=".95"/><rect x="16" y="-10" width="36" height="20" rx="4" fill="url(#gvDev)" stroke="${MC.ink}" stroke-width="1.4"/><rect x="26" y="-10" width="8" height="20" fill="url(#gvGold)" stroke="#9A6A08" stroke-width="1"/><rect x="52" y="-8" width="22" height="16" rx="5" fill="url(#gvDevDk)" stroke="${MC.ink}" stroke-width="1.4"/></g>${needle > 0 ? `<path d="M${-needle * 10} 0H3" stroke="#E8EEF2" stroke-width="2.2" stroke-linecap="round"/>` : ''}`;
}

// ------------------------------------------------------------------ label (pil gading, titik dan garis emas); gaya MEDCOEL
export function chipSvg(x, y, txt, o = {}) {   // (x, y) = titik jangkar; chip berpusat di (cx, cy); teks dengan "\n" atau lebar > maxw dibagi dua baris
  const fs = o.fs ?? 32, a = o.a ?? 1; if (a <= 0.003) return '';
  let lines = txt.split('\n');
  if (lines.length === 1 && o.maxw && lines[0].length * fs * 0.6 + 44 > o.maxw && lines[0].includes(' ')) { const w = lines[0].split(' '), mid = Math.ceil(w.length / 2); lines = [w.slice(0, mid).join(' '), w.slice(mid).join(' ')]; }
  const w = Math.max(...lines.map((l) => l.length * fs * 0.6 + 44)), h = lines.length === 1 ? fs * 1.78 : fs * 2.55, cx = o.cx, cy = o.cy ?? y;
  const left = cx - w / 2, right = cx + w / 2;
  const ex = x < left ? left : x > right ? right : x, ey = x >= left && x <= right ? (y < cy ? cy - h / 2 : cy + h / 2) : cy;
  const txts = lines.map((l, i) => `<text x="${f1(cx)}" y="${f1(cy + (lines.length === 1 ? fs * 0.35 : (i === 0 ? -fs * 0.22 : fs * 0.98)))}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${fs}" fill="${MC.ink}">${l}</text>`).join('');
  return `<g opacity="${f1(a)}"><path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${MC.ink}" stroke-width="7" opacity=".5" stroke-linecap="round"/><path d="M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}" stroke="${MC.gold}" stroke-width="3.6" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${MC.ivory}"/><rect x="${f1(left)}" y="${f1(cy - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(Math.min(h / 2, 40))}" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="2.5"/>${txts}</g>`;
}
export const chipW = (txt, fs = 32) => txt.length * fs * 0.6 + 44;
export const tag = (cx, cy, txt, o = {}) => { const fs = o.fs ?? 30, w = chipW(txt, fs), h = fs * 1.7; return `<g opacity="${f1(o.a ?? 1)}"><rect x="${f1(cx - w / 2)}" y="${f1(cy - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${o.bg ?? MC.ink}" stroke="${o.stroke ?? MC.gold}" stroke-width="3"/><text x="${f1(cx)}" y="${f1(cy + fs * 0.35)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" fill="${o.fg ?? MC.ivory}">${txt}</text></g>`; };

// rakitan strip + meter: strip masuk ke celah meter (bagian di dalam disembunyikan) kecuali saat cangkang bening (cut > 0)
export function assemblySvg(o = {}) {
  const cut = clamp(o.cut ?? 0), id = o.id ?? 'as';
  const clip = `<clipPath id="${id}sc"><rect x="-200" y="-400" width="400" height="${f1(640 + 4000 * cut)}"/></clipPath>`;
  return `<g class="gv-asm">${meterSvg({ ...(o.meter || {}), cut, id: id + 'm' })}${clip}<g clip-path="url(#${id}sc)">${stripSvg({ ...(o.strip || {}), id: id + 's' })}</g></g>`;
}
