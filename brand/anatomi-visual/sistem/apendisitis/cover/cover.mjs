// Cover "Kenapa usus buntu diangkat?" (1080 x 1920). Visual utama: pandangan laparoskopi (skematis) ke apendiks meradang di pangkal sekum.
// Aman dari UI TikTok/Reels: konten di x 64-920 dan y 250-1510; logo di atas (bukan di dasar); area aman profil IG (crop tengah 3:4) y 240-1680.
import { lapDunia } from '../art-lap.mjs';
import { BLUR_DEFS, f1 } from '../../tensi/util.mjs';
import { FONT } from '../../tokens.mjs';
import { bintang } from '../../latar.mjs';

const T = (x, y, s, fill, size, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" letter-spacing="-2" fill="${fill}" ${extra}>${s}</text>`;
const ST = 'stroke="#0A1A2E" stroke-width="18" paint-order="stroke" stroke-linejoin="round"';

export function svgCover({ guide = false, logo = '/apps/web/src/assets/logo-full.webp' } = {}) {
  const L = lapDunia({ infl: 1, alat: { u: 0.97, buka: 0.4 } });
  const CX = 540, CY = 1150, R = 366, S = 0.62, FX = 1010, FY = 1060;
  const bg = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F6B63"/><stop offset="1" stop-color="#0E3B3F"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#cg)"/><circle cx="140" cy="640" r="430" fill="#2A7A70" opacity=".33"/><circle cx="1000" cy="1250" r="520" fill="#0E3B3F" opacity=".4"/>`;
  const title = `${T(540, 468, 'KENAPA', '#fff', 104, ST)}${T(540, 596, 'USUS BUNTU', '#fff', 134, ST)}${T(540, 744, 'DIANGKAT?', '#F8C038', 138, ST.replace('18', '22'))}`;
  const lw = 330, lh = 92;
  const lg = `<g transform="translate(${64 + lw / 2} 292)"><rect x="${-lw / 2}" y="${-lh / 2 + 7}" width="${lw}" height="${lh}" rx="${lh / 2}" fill="rgba(0,0,0,.35)"/><rect x="${-lw / 2}" y="${-lh / 2}" width="${lw}" height="${lh}" rx="${lh / 2}" fill="#fff"/><image href="${logo}" x="${-lw / 2 + 30}" y="${-lh / 2 + 12}" width="${lw - 60}" height="${lh - 24}" preserveAspectRatio="xMidYMid meet"/></g>`;
  // lingkaran skop
  const scope = `<circle cx="${CX}" cy="${CY}" r="${R + 34}" fill="#05090C" opacity=".55"/><clipPath id="cvC"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>`
    + `<g clip-path="url(#cvC)"><g transform="translate(${CX} ${CY}) scale(${S}) translate(${-FX} ${-FY})">${L.svg}</g><radialGradient id="cvV" cx="50%" cy="50%" r="50%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient><circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#cvV)"/></g>`
    + `<circle cx="${CX}" cy="${CY}" r="${R + 8}" fill="none" stroke="#3A444E" stroke-width="18"/><circle cx="${CX}" cy="${CY}" r="${R + 19}" fill="none" stroke="#9AA5B1" stroke-width="3" opacity=".75"/>`;
  // sorot apendiks (cincin putus-putus) di pangkal sekum dan penunjuk
  const ax = CX + (1090 - FX) * S, ay = CY + (1090 - FY) * S;
  const ring = `<circle cx="${f1(ax)}" cy="${f1(ay)}" r="128" fill="none" stroke="#F8C038" stroke-width="9" stroke-dasharray="26 18"/>`;
  const pill = (cx, y, teks, w) => `<rect x="${cx - w / 2}" y="${y + 6}" width="${w}" height="60" rx="30" fill="#000" opacity=".3"/><rect x="${cx - w / 2}" y="${y}" width="${w}" height="60" rx="30" fill="#F8F7F3"/><circle cx="${cx - w / 2 + 34}" cy="${y + 30}" r="12" fill="#D94A55" stroke="#172B38" stroke-opacity=".35" stroke-width="2"/><text x="${cx - w / 2 + 58}" y="${y + 42}" font-family="${FONT}" font-weight="800" font-size="32" fill="#172B38">${teks}</text>`;
  const lab = `<path d="M${f1(ax - 40)} ${f1(ay + 110)}L250 1430" stroke="#172B38" stroke-width="9" stroke-linecap="round" opacity=".5"/><path d="M${f1(ax - 40)} ${f1(ay + 110)}L250 1430" stroke="#F8C038" stroke-width="4.5" stroke-linecap="round"/><circle cx="${f1(ax - 40)}" cy="${f1(ay + 110)}" r="9" fill="#F8C038" stroke="#172B38" stroke-width="3"/>${pill(330, 1412, 'Apendiks meradang', 470)}`;
  const kam = `<g transform="translate(730 830)"><rect x="-190" y="-32" width="380" height="64" rx="32" fill="#0A1A2E" opacity=".88"/><text x="0" y="11" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="29" fill="#F8F7F3">pandangan laparoskopi</text></g><g transform="translate(730 1450)"><rect x="-150" y="-26" width="300" height="52" rx="26" fill="#0A1A2E" opacity=".8"/><text x="0" y="9" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="25" fill="#F8F7F3">ilustrasi skematis</text></g>`;
  const star = `${bintang(890, 700, 26, '#F8C038', 0.9)}${bintang(170, 880, 15, '#FFF3C4', 0.8)}`;
  const g = guide ? `<rect x="0" y="0" width="1080" height="240" fill="rgba(255,0,0,.35)"/><rect x="0" y="1680" width="1080" height="240" fill="rgba(255,0,0,.35)"/><rect x="0" y="240" width="1080" height="1440" fill="none" stroke="#0f0" stroke-width="4"/><rect x="940" y="1000" width="140" height="680" fill="rgba(255,160,0,.35)"/><rect x="0" y="1510" width="940" height="170" fill="rgba(255,160,0,.28)"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" font-family="${FONT}">${BLUR_DEFS}${bg}${star}${scope}${ring}${lab}${kam}${title}${lg}${g}</svg>`;
}
