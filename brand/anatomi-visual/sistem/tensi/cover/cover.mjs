// Cover "Tensi rendah pada perempuan" (1080 x 1920). Gaya seri: latar hijau tua, judul tebal berkontur, medali ilustrasi, pil logo MEDCOEL, lantai krem.
// Tokoh: Tala (brand/characters/teman). Jantung: v7 (tidak diubah). Area aman profil Instagram (crop tengah 3:4): y 240-1680.
import { buildSvg } from '../../../v6/heart7.mjs';
import { P, gambarTala } from '../tala.mjs';
import { gambarMeja, gambarKursi } from '../ruang.mjs';
import { BLUR_DEFS, f1, mulus, volum, B } from '../util.mjs';
import { bintang } from '../../latar.mjs';
import { FONT } from '../../tokens.mjs';

const T = (x, y, s, fill, size, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" letter-spacing="-2" fill="${fill}" ${extra}>${s}</text>`;
const ST = 'stroke="#0A1A2E" stroke-width="18" paint-order="stroke" stroke-linejoin="round"';

export function svgCover({ guide = false, logo = '/apps/web/src/assets/logo-full.webp' } = {}) {
  const H7 = buildSvg({ layers: true, bg: false, id: 'cv' });
  const bg = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F6B63"/><stop offset="1" stop-color="#0E3B3F"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#cg)"/><circle cx="140" cy="560" r="420" fill="#2A7A70" opacity=".35"/><circle cx="1000" cy="1100" r="520" fill="#0E3B3F" opacity=".35"/>`;
  const title = `${T(540, 372, 'TENSI RENDAH', '#fff', 118, ST)}${T(540, 480, 'PADA PEREMPUAN', '#fff', 98, ST)}${T(540, 620, 'KOK PUSING?', '#F8C038', 126, ST.replace('18', '22'))}`;
  // medali kiri: otak dengan aliran menurun; kanan: jantung v7
  const otak = (cx, cy) => {
    const d = mulus([[-92, 10], [-84, -26], [-58, -52], [-20, -62], [20, -62], [58, -52], [84, -26], [92, 10], [82, 38], [54, 56], [16, 62], [-16, 62], [-54, 56], [-82, 38]], true);
    const wr = '#9C93B4';
    return `<g transform="translate(${cx} ${cy}) scale(1.35)"><path d="${d}" transform="translate(2 5)" fill="#10202A" opacity=".4" filter="${B(4)}"/>${volum(d, [0, 0], wr)}<g fill="none" stroke="#5C5478" stroke-linecap="round" opacity=".6"><path d="M0 -62C-4 -30 6 -4 0 24C-3 42 2 54 0 62" stroke-width="4"/><path d="M-56 -10C-40 -30 -24 -20 -14 -34M-48 22C-30 8 -18 20 -8 6M56 -10C40 -30 24 -20 14 -34M48 22C30 8 18 20 8 6" stroke-width="3.6"/></g></g>`;
  };
  const medali = `<circle cx="255" cy="850" r="150" fill="rgba(0,0,0,.18)"/>${otak(255, 850)}`
    + `<circle cx="850" cy="850" r="150" fill="rgba(0,0,0,.14)"/><g transform="translate(850 862) scale(0.3) translate(-290 -765)"><defs>${H7.defs}</defs><g>${H7.back}</g><g>${H7.body}</g><g>${H7.trunk}</g><g>${H7.hi}</g></g>`;
  const pill = (cx, y, teks) => { const w = teks.length * 17.5 + 44; return `<rect x="${cx - w / 2}" y="${y + 6}" width="${w}" height="54" rx="27" fill="#000" opacity=".3"/><rect x="${cx - w / 2}" y="${y}" width="${w}" height="54" rx="27" fill="#F8F7F3"/><text x="${cx}" y="${y + 38}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="29" fill="#172B38">${teks}</text>`; };
  const cap = pill(255, 1018, 'Aliran ke otak turun') + pill(850, 1018, 'Jantung');
  const panah = `<path d="M425 850H615" stroke="#F8C038" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 22" fill="none"/>${T(540, 800, 'tekanan ↓', '#F8C038', 40, 'stroke="#0A1A2E" stroke-width="8" paint-order="stroke" letter-spacing="0"')}`;
  // ruang: lantai krem, kursi di belakang, meja di kiri, Tala berdiri goyah memegang meja
  const K = 0.9, FY = 1536, AX = 600;
  const tf = `translate(${f1(AX - 200 * K)} ${f1(FY - 778 * K)}) scale(${K})`;
  const st = P({ ekspresi: 'heran', sit: 0, bob: -2, lean: 5, tilt: -7, lid: 0.55, kananBebas: 0.9 });
  const lantai = `<rect x="-100" y="${FY + 6}" width="1300" height="400" fill="#CDBB9E"/><rect x="-100" y="${FY + 6}" width="1300" height="12" fill="#B7A483"/>`;
  const pusing = `<g transform="${tf}">${bintang(66, 120, 24, '#F8C038', 1)}${bintang(338, 96, 28, '#F8C038', 1)}${bintang(118, 56, 15, '#FFF3C4', 1)}${bintang(300, 52, 17, '#FFF3C4', 1)}${bintang(372, 170, 14, '#FFF3C4', 1)}</g>`;
  const tokoh = `<g transform="${tf}">${gambarKursi(1)}<g>${gambarTala(st, { uid: 'cvt' })}</g>${gambarMeja(1)}</g>`;
  const lw = 400, lh = lw * 0.31;
  const lg = `<g transform="translate(540 1612)"><rect x="${-lw / 2}" y="${-lh / 2 + 8}" width="${lw}" height="${lh}" rx="${lh / 2}" fill="rgba(0,0,0,.35)"/><rect x="${-lw / 2}" y="${-lh / 2}" width="${lw}" height="${lh}" rx="${lh / 2}" fill="#fff"/><image href="${logo}" x="${-lw / 2 + 36}" y="${-lh / 2 + 14}" width="${lw - 72}" height="${lh - 28}" preserveAspectRatio="xMidYMid meet"/></g>`;
  const g = guide ? `<rect x="0" y="0" width="1080" height="240" fill="rgba(255,0,0,.35)"/><rect x="0" y="1680" width="1080" height="240" fill="rgba(255,0,0,.35)"/><rect x="0" y="240" width="1080" height="1440" fill="none" stroke="#0f0" stroke-width="4"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" font-family="${FONT}">${BLUR_DEFS}${bg}${medali}${panah}${cap}${lantai}${tokoh}${pusing}${title}${lg}${g}</svg>`;
}
