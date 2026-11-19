// Termometer klinis merkuri (satu bentuk untuk tampilan luar dan penampang). Koordinat = koordinat penampang (zoom 1).
// detail 0 = tampilan luar (pelat email di belakang kaca, hanya garis perak tipis tampak); detail 1 = penampang (kaca tembus pandang: wadah, penyempitan, saluran, partikel merkuri).
import { f1, clamp, lerp, C, P, T, R, INK, GOLD, FONT, rndf } from './lib.js';
import { G, xOfT } from './physics.js';
const Y = G.y, SX0 = G.tubeX0, SX1 = G.tubeX1, TH = G.tubeH;
const BX = G.bx, BY = G.by;
// profil setengah tinggi saluran (px): 7 normal, menyempit tajam pada x = neckX
export const capHalf = (x) => 7 - 4.9 * Math.exp(-(((x - G.neckX) / 9) ** 2));
function channelPath(x0, x1, scale = 1) {
  let top = '', bot = ''; for (let x = x0; x <= x1; x += 3) { const h = capHalf(x) * scale; top += `${x === x0 ? 'M' : 'L'}${f1(x)} ${f1(Y - h)}`; bot = `L${f1(x)} ${f1(Y + h)}` + bot; }
  return top + bot + 'Z';
}
export const glassCol = (heat) => `rgb(${Math.round(190 + 65 * heat)},${Math.round(226 - 28 * heat)},${Math.round(236 - 90 * heat)})`;
/** st = keadaan dari physics.sim; o = { detail, t (tn untuk getar), glare (0..1 sapuan kilau), heatShow (tampilkan warna panas), tipMark (alpha penanda ujung) } */
export function thermo(st, o = {}) {
  const d = clamp(o.detail ?? 1), t = o.t ?? 0, heat = clamp((st.Tb - 33) / 5) * (o.heatShow === false ? 0 : 1);
  const colBottom = G.neckX + 2, xb = 255 - st.gap * 0.5;           // permukaan merkuri di wadah (mundur saat celah terbentuk)
  const tip = st.tip;
  let s = `<defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6FAFB"/><stop offset=".45" stop-color="#AEBFCA"/><stop offset="1" stop-color="#7F909C"/></linearGradient>`
    + `<radialGradient id="hg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB16A" stop-opacity=".85"/><stop offset=".55" stop-color="#F8704F" stop-opacity=".35"/><stop offset="1" stop-color="#F8704F" stop-opacity="0"/></radialGradient>`
    + `<clipPath id="tc"><rect x="${SX0}" y="${Y - TH / 2}" width="${SX1 - SX0}" height="${TH}" rx="40"/></clipPath><clipPath id="bc"><ellipse cx="${BX}" cy="${BY}" rx="${G.brx - 4}" ry="${G.bry - 4}"/></clipPath></defs>`;
  // cahaya panas (ilustrasi) di belakang wadah
  if (heat > 0.02) s += `<ellipse cx="${BX}" cy="${BY}" rx="${f1(150 * (0.7 + 0.3 * heat))}" ry="${f1(105 * (0.7 + 0.3 * heat))}" fill="url(#hg)" opacity="${f1(heat * 100) / 100}"/>`;
  // badan kaca (garis tepi dulu, isi kemudian supaya sambungan wadah-saluran mulus)
  const glass = glassCol(heat);
  const body = (fill, stroke, sw) => `<g fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"><ellipse cx="${BX}" cy="${BY}" rx="${G.brx + 8}" ry="${G.bry + 8}"/><rect x="${SX0}" y="${Y - TH / 2}" width="${SX1 - SX0}" height="${TH}" rx="42"/></g>`;
  s += body('none', '#7FC0D2', 9) + body('none', INK, 3).replace('stroke-width="3"', 'stroke-width="2.4" opacity=".55"');
  s += `<g><ellipse cx="${BX}" cy="${BY}" rx="${G.brx + 6}" ry="${G.bry + 6}" fill="${mixGlass(glass, d)}" opacity=".95"/><rect x="${SX0}" y="${Y - TH / 2 + 2}" width="${SX1 - SX0 - 2}" height="${TH - 4}" rx="40" fill="${mixGlass('#CDEBF3', d)}"/></g>`;
  // ---------- interior (penampang)
  let inner = `<ellipse cx="${BX}" cy="${BY}" rx="${G.brx - 6}" ry="${G.bry - 6}" fill="#183B46" opacity=".35"/>`;
  inner += `<path d="${channelPath(G.tubeX0 + 4, G.capX1 + 10)}" fill="#0B2A33" stroke="#2C5560" stroke-width="2"/>`;
  // merkuri di wadah (mundur saat celah)
  const hasGap = st.gap > 0.5;
  inner += `<g clip-path="url(#bc)"><ellipse cx="${BX}" cy="${BY}" rx="${G.brx - 7}" ry="${G.bry - 7}" fill="url(#mg)"/></g>`;
  
  // leher dari wadah ke penyempitan: isi merkuri sampai xb (menyatu) atau terputus
  const neckFill = (x0, x1) => (x1 > x0 ? `<path d="${channelPath(x0, x1, 0.9)}" fill="url(#mg)" stroke="#5B6B77" stroke-width="1.6"/>` : '');
  if (hasGap) {
    // bagian bawah (di wadah) mundur; celah kosong; kolom di atas penyempitan tetap
    inner += `<rect x="${f1(xb - 0)}" y="${Y - 34}" width="${f1(Math.max(0, 255 - xb + 8))}" height="68" fill="#183B46" opacity="0"/>`;
    inner += `<g clip-path="url(#bc)"><rect x="${BX - 90}" y="${BY - 50}" width="${f1(xb - (BX - 90))}" height="100" fill="url(#mg)"/></g>`;
    inner += neckFill(Math.max(xb, 255), xb);   // tidak ada
    inner += neckFill(colBottom, tip);
    // tanda celah (ruang hampa kecil)
    const gx0 = xb, gx1 = colBottom;
    inner += `<g opacity="${f1(clamp(st.gap / 12) * 100) / 100}"><path d="M${f1(gx0)} ${Y - 18}V${Y + 18}M${f1(gx1)} ${Y - 18}V${Y + 18}" stroke="#FFE08A" stroke-width="3" stroke-dasharray="4 4"/></g>`;
  } else {
    inner += neckFill(250, Math.max(250, tip));
  }
  // partikel merkuri di wadah (getar mengikuti suhu)
  const amp = 1.2 + 6.5 * clamp((st.Tb - 30) / 9);
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39996, rr = Math.sqrt((i + 0.5) / 16), px = BX - 6 + Math.cos(a) * rr * (G.brx - 24), py = BY + Math.sin(a) * rr * (G.bry - 18);
    const jx = Math.sin(t * (6 + (i % 5)) + i) * amp, jy = Math.cos(t * (7 + (i % 4)) + i * 1.7) * amp * 0.8;
    if (hasGap && px + jx > xb - 4) continue;
    inner += `<circle cx="${f1(px + jx)}" cy="${f1(py + jy)}" r="6.4" fill="#8E9FAB" stroke="#4A5963" stroke-width="1.6" opacity=".9"/><circle cx="${f1(px + jx - 1.8)}" cy="${f1(py + jy - 2)}" r="2" fill="#fff" opacity=".8"/>`;
  }
  s += `<g opacity="${f1(d * 100) / 100}">${inner}</g>`;
  // ---------- tampilan luar: pelat email + garis perak tipis
  if (d < 0.99) {
    s += `<g opacity="${f1((1 - d) * 100) / 100}"><g clip-path="url(#tc)"><rect x="${SX0}" y="${Y - TH / 2}" width="${SX1 - SX0}" height="${TH}" fill="#F4F1E6"/><rect x="${SX0}" y="${Y - 6}" width="${SX1 - SX0}" height="12" fill="#E3DFCF"/></g>`
      + `<path d="M${G.capX0} ${Y}H${f1(Math.max(tip, G.capX0))}" stroke="${INK}" stroke-width="12" stroke-linecap="round" opacity=".55"/><path d="M${G.capX0} ${Y}H${f1(Math.max(tip, G.capX0))}" stroke="url(#mg)" stroke-width="8" stroke-linecap="round"/></g>`;
  }
  // ---------- skala (di sisi atas, selalu terlihat)
  let sc = '';
  for (let k = 0; k <= 90; k++) {
    const T0 = 35 + k * 0.1, x = xOfT(T0); if (x > G.capX1 + 6) break;
    const big = k % 10 === 0, mid = k % 5 === 0;
    sc += `<path d="M${f1(x)} ${Y - TH / 2 + 3}v${big ? 22 : mid ? 15 : 9}" stroke="${d > 0.5 ? '#EAF6F8' : '#40525C'}" stroke-width="${big ? 3 : 1.8}"/>`;
    if (big) sc += `<text x="${f1(x)}" y="${Y - TH / 2 - 10}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="26" fill="${T0 === 37 ? '#FF8A7A' : '#F7F2E4'}">${Math.round(T0)}</text>`;
  }
  s += `<g>${sc}</g><text x="${f1(xOfT(42) + 44)}" y="${Y - TH / 2 - 10}" text-anchor="start" font-family="${FONT}" font-weight="800" font-size="22" fill="#CFE8E2">°C</text>`;
  // ---------- kilau lensa (sapuan saat termometer diputar)
  s += `<g clip-path="url(#tc)"><rect x="${SX0}" y="${Y - TH / 2}" width="${SX1 - SX0}" height="20" fill="#fff" opacity=".22"/>`
    + (o.glare != null ? `<path d="M${f1(SX0 + 760 * o.glare)} ${Y - TH / 2}l60 0l-70 ${TH}l-60 0z" fill="#fff" opacity=".28"/>` : '') + `</g>`;
  return s;
}
const rgbOf = (c) => (c.startsWith('#') ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).map(Number));
const mixGlass = (g, d) => { const a = rgbOf('#EAF2EE'), b = rgbOf(g); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * d)).join(',')})`; };
