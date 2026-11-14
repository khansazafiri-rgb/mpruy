// Penampang bantalan ujung jari (ilustrasi): air, kulit (epidermis, dermis), jaringan di bawah kulit (sel lemak), tulang, saraf simpatik, pembuluh darah kecil.
// Semua tahap dihitung dari t (detik) agar sinkron dengan narasi dan deterministik. Bukan citra medis pasien.
import { f1, clamp, lerp, sm } from './core.js';
import { K, pill, win } from './ui.js';
const X0 = 30, X1 = 1050, PY0 = 292, PY1 = 1196;       // panel
const SURF = 566;                                       // permukaan kulit rata-rata (awal)
const BONE = 1076;
const rnd = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
const g = (x, k, ph, p) => Math.pow(1 - Math.abs(Math.sin(x * k + ph)), p);
const groove = (x) => 0.95 * g(x, 0.0285, 0.6, 4) + 0.8 * g(x, 0.0183, 2.0, 5) + 0.3 * g(x, 0.036, 4.2, 5);   // alur sempit, punggung lebar
const xs = []; for (let x = X0 - 8; x <= X1 + 8; x += 6) xs.push(x);
const poly = (top, bot) => 'M' + top.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'L' + bot.slice().reverse().map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
const lineP = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');
export const SEC = { SURF, BONE };
/** keadaan animasi penampang pada waktu t */
export function secState(t) {
  return {
    constrict: sm((t - 16.9) / 2.9), volume: sm((t - 18.3) / 2.7), fold: sm((t - 20.8) / 2.8),
    reveal: sm((t - 7.96) / 0.9), pulseOn: t >= 14.76 && t < 18.2,
  };
}
export function section(t, st = secState(t), o = {}) {
  const pt = o.pt ?? t, { constrict, volume, fold, reveal } = st, A = 54 * fold, drop = 40 * volume, y0 = SURF + drop;
  const top = xs.map((x) => [x, y0 + A * groove(x)]);
  const sc = xs.map((x, i) => [x, top[i][1] + 12]);
  const epi = xs.map((x, i) => [x, top[i][1] + 52 + 2 * Math.sin(x * 0.2)]);                    // sambungan epidermis-dermis (papila kecil)
  const derm = xs.map((x, i) => [x, y0 + 214 + 0.34 * A * groove(x) - 0.2 * drop]);
  const id = o.id ?? 'sec';
  let s = `<defs><clipPath id="${id}Clip"><rect x="${X0}" y="${PY0}" width="${X1 - X0}" height="${PY1 - PY0}" rx="38"/></clipPath>
  <linearGradient id="${id}W" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A9CC4" stop-opacity=".78"/><stop offset="1" stop-color="#1B7FAA" stop-opacity=".92"/></linearGradient>
  <linearGradient id="${id}Epi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7D3B4"/><stop offset="1" stop-color="#EFB38E"/></linearGradient>
  <linearGradient id="${id}Der" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E69A8E"/><stop offset="1" stop-color="#D9807C"/></linearGradient>
  <radialGradient id="${id}Glow"><stop offset="0" stop-color="#FFE9A0" stop-opacity=".95"/><stop offset="1" stop-color="#F8C038" stop-opacity="0"/></radialGradient></defs>`;
  s += `<rect x="${X0}" y="${PY0}" width="${X1 - X0}" height="${PY1 - PY0}" rx="38" fill="#0F2E37"/><g clip-path="url(#${id}Clip)">`;
  // air di atas permukaan
  s += `<rect x="${X0}" y="${PY0}" width="${X1 - X0}" height="${f1(y0 - PY0 + 60)}" fill="url(#${id}W)"/>`;
  for (let i = 0; i < 7; i++) s += `<path d="M${X0} ${PY0 + 40 + i * 34}Q${X0 + 260} ${PY0 + 24 + i * 34 + 10 * Math.sin(t * 1.3 + i)} ${X0 + 520} ${PY0 + 40 + i * 34}T${X1} ${PY0 + 40 + i * 34}" fill="none" stroke="rgba(255,255,255,${f1(0.1 - i * 0.008)})" stroke-width="3"/>`;
  // jaringan di bawah kulit: sel lemak (menyusut saat volume berkurang) + tulang
  const rr = rnd(5), cells = [];
  for (let j = 0; j < 11; j++) for (let i = 0; i < 17; i++) { const cx = X0 + 30 + i * 62 + (j % 2) * 31 + (rr() - 0.5) * 14, cy = 760 + j * 31 + (rr() - 0.5) * 10; if (cy < BONE - 8) cells.push([cx, cy, 22 + rr() * 7]); }
  s += `<rect x="${X0}" y="${y0 + 190}" width="${X1 - X0}" height="${BONE - y0 - 130}" fill="#F3DAB4"/>`;
  const shrink = 1 - 0.22 * volume;
  s += cells.map(([cx, cy, r]) => `<ellipse cx="${f1(cx)}" cy="${f1(lerp(cy, BONE - 130 + (cy - 760) * 0.78 + 100, 0.0) - drop * 0.35 * ((BONE - cy) / 330))}" rx="${f1(r * shrink)}" ry="${f1(r * 0.82 * shrink)}" fill="#F9E8C6" stroke="#E0BE86" stroke-width="2"/>`).join('');
  s += `<path d="M${X0 + 150} ${BONE + 8}Q${X0 + 150} ${BONE - 26} ${X0 + 330} ${BONE - 34}L${X1 - 330} ${BONE - 34}Q${X1 - 150} ${BONE - 26} ${X1 - 150} ${BONE + 8}L${X1 - 150} ${PY1}L${X0 + 150} ${PY1}Z" fill="#EDE5D0" stroke="#C9BC9C" stroke-width="3"/><path d="M${X0 + 380} ${BONE + 40}q40 -16 90 0M${X0 + 560} ${BONE + 70}q50 -14 100 0" stroke="#D5C9AA" stroke-width="4" fill="none"/>`;
  // dermis, epidermis, stratum korneum
  s += `<path d="${poly(epi, derm)}" fill="url(#${id}Der)"/>`;
  // serat dermis halus
  s += Array.from({ length: 9 }, (_, i) => `<path d="${lineP(xs.filter((_, k) => k % 3 === 0).map((x) => [x, y0 + 90 + i * 12 + 0.6 * A * groove(x) * (1 - i / 12) + 5 * Math.sin(x * 0.05 + i)]))}" fill="none" stroke="rgba(255,225,215,.16)" stroke-width="2"/>`).join('');
  s += `<path d="${poly(top, epi)}" fill="url(#${id}Epi)"/><path d="${poly(top, sc)}" fill="#FBE6CF"/><path d="${lineP(top)}" fill="none" stroke="#F8F0E4" stroke-width="3"/>`;
  s += `<path d="${lineP(epi)}" fill="none" stroke="rgba(150,70,60,.35)" stroke-width="2.5"/>`;
  // kapiler kecil di papila dermis
  for (let i = 0; i < 8; i++) { const cx = 90 + i * 128, yTop = (xs.find((x) => x >= cx) ? top[xs.findIndex((x) => x >= cx)][1] : y0) + 74; s += `<path d="M${cx - 6} ${f1(yTop + 70)}L${cx - 6} ${f1(yTop)}Q${cx} ${f1(yTop - 14)} ${cx + 6} ${f1(yTop)}L${cx + 6} ${f1(yTop + 70)}" fill="none" stroke="rgba(210,60,60,${f1(0.78 - 0.18 * constrict)})" stroke-width="${f1(7 - 2 * constrict)}" stroke-linecap="round"/>`; }
  // pembuluh darah kecil + saraf simpatik (muncul saat tubuh "ikut merespons")
  const yv = 868 + drop * 0.55, r0 = 28, r = lerp(r0, 11, constrict);
  const nerve = []; for (let u = 0; u <= 1.0001; u += 1 / 70) { const x = lerp(X0 - 10, 640, u), y = lerp(1030, yv + r0 + 18, sm(u)) - 38 * Math.sin(Math.PI * u) * 0.9; nerve.push([x, y + drop * 0.5 * sm(u)]); }
  const vesHL = win(t, 15.16, 17.4, 0.4), nerveHL = win(t, 14.0, 16.4, 0.4);
  const rv = reveal;
  if (rv > 0.01) {
    s += `<g opacity="${f1(rv)}">`;
    // pembuluh
    if (constrict > 0.02) s += `<ellipse cx="0" cy="0" rx="0" ry="0"/><rect x="${X0 - 10}" y="${f1(yv - r0)}" width="${X1 - X0 + 20}" height="${r0 * 2}" fill="none" stroke="rgba(255,255,255,${f1(0.5 * constrict * (1 - constrict * 0.4))})" stroke-width="3" stroke-dasharray="12 10" rx="${r0}"/>`;
    s += `<rect x="${X0 - 10}" y="${f1(yv - r - 6)}" width="${X1 - X0 + 20}" height="${f1(2 * r + 12)}" fill="#8E2B33"/><rect x="${X0 - 10}" y="${f1(yv - r)}" width="${X1 - X0 + 20}" height="${f1(2 * r)}" fill="#D8444A"/><rect x="${X0 - 10}" y="${f1(yv - r * 0.55)}" width="${X1 - X0 + 20}" height="${f1(r * 0.28)}" fill="rgba(255,190,180,.5)"/>`;
    if (vesHL > 0.01) s += `<rect x="${X0 - 10}" y="${f1(yv - r - 14)}" width="${X1 - X0 + 20}" height="${f1(2 * r + 28)}" fill="none" stroke="rgba(255,138,122,${f1(0.85 * vesHL)})" stroke-width="5"/>`;
    const sp = 120 * (0.3 + 0.7 * r / r0); const nb = 20; for (let i = 0; i < nb; i++) { const x = X0 - 10 + (((i * 53.7 + t * sp) % (X1 - X0 + 40)) + (X1 - X0 + 40)) % (X1 - X0 + 40); const rc = Math.min(8.5, r * 0.5), yy = yv + Math.sin(i * 2.3) * (r - rc - 2) * 0.6; s += `<ellipse cx="${f1(x)}" cy="${f1(yy)}" rx="${f1(rc * 1.05)}" ry="${f1(rc * 0.82)}" fill="#A41F2C"/><ellipse cx="${f1(x - 1)}" cy="${f1(yy - 1)}" rx="${f1(rc * 0.45)}" ry="${f1(rc * 0.3)}" fill="rgba(255,150,140,.7)"/>`; }
    // saraf simpatik: serabut dengan manik, bercabang ke dinding pembuluh
    const nd = lineP(nerve);
    s += `<path d="${nd}" fill="none" stroke="#B88A12" stroke-width="12" stroke-linecap="round"/><path d="${nd}" fill="none" stroke="#F8C038" stroke-width="7" stroke-linecap="round"/>`;
    if (nerveHL > 0.01) s += `<path d="${nd}" fill="none" stroke="rgba(255,236,160,${f1(0.7 * nerveHL)})" stroke-width="20" stroke-linecap="round" opacity=".6"/>`;
    const last = nerve[nerve.length - 1], ends = [[-110, 0], [-40, -4], [50, -6], [130, -2]];
    ends.forEach(([dx, dy], i) => { const ex = last[0] + dx, ey = yv + r + 8 + dy * 0, mx = lerp(last[0], ex, 0.5); s += `<path d="M${f1(last[0])} ${f1(last[1])}Q${f1(mx)} ${f1(last[1] - 8)} ${f1(ex)} ${f1(ey + 4)}" fill="none" stroke="#F8C038" stroke-width="5" stroke-linecap="round"/><circle cx="${f1(ex)}" cy="${f1(ey + 4)}" r="8.5" fill="#FFE28A" stroke="#B88A12" stroke-width="3"/>`; });
    for (let i = 2; i < nerve.length - 2; i += 6) s += `<circle cx="${f1(nerve[i][0])}" cy="${f1(nerve[i][1])}" r="4.2" fill="#FFF2B8"/>`;
    // sinyal (denyut) menjalar dari saraf ke pembuluh
    if (st.pulseOn) for (let k = 0; k < 4; k++) { const u = ((pt - 14.76 - k * 0.78) / 1.35); if (u < 0 || u > 1.15) continue; const idx = Math.min(nerve.length - 1, Math.floor(clamp(u) * (nerve.length - 1))), p = nerve[idx], arrive = clamp((u - 0.98) / 0.17);
      s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(26 + 5 * Math.sin(t * 14))}" fill="url(#${id}Glow)"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="8.5" fill="#FFF7D0"/>`;
      if (arrive > 0) ends.forEach(([dx], i) => { const ex = last[0] + dx, ey = yv + r + 12; s += `<circle cx="${f1(ex)}" cy="${f1(ey)}" r="${f1(14 + 34 * arrive)}" fill="none" stroke="rgba(255,226,138,${f1(0.9 * (1 - arrive))})" stroke-width="5"/>`; }); }
    s += '</g>';
  }
  // butir air di atas kulit: dugaan umum "kulit menyerap air" (hanya ilustrasi gagasan, diberi tanda tanya)
  const q = o.noLabels ? 0 : win(t, 4.9, 7.7, 0.4);
  if (q > 0.01) { for (let i = 0; i < 9; i++) { const x = 90 + i * 112 + 10 * Math.sin(i * 3.1), yb = y0 - 22 - 6 * Math.sin(t * 2 + i), dn = (t * 18 + i * 29) % 70; s += `<g opacity="${f1(q)}"><ellipse cx="${f1(x)}" cy="${f1(top[Math.floor((x - X0) / 6)][1] - 10)}" rx="16" ry="11" fill="rgba(210,240,255,.75)" stroke="rgba(255,255,255,.9)" stroke-width="2"/><path d="M${f1(x)} ${f1(yb - 70 + dn * 0.25)}l0 28m-8 -8l8 8l8 -8" stroke="rgba(255,255,255,.55)" stroke-width="3" fill="none" stroke-linecap="round"/></g>`; } }
  s += '</g>';
  s += `<rect x="${X0}" y="${PY0}" width="${X1 - X0}" height="${PY1 - PY0}" rx="38" fill="none" stroke="${K.line}" stroke-width="3"/>`;
  // label dan penjelasan singkat
  const L = (a, b, txt, ty, c, tg, tx = 1030, anc = 'r') => { const al = win(t, a, b, 0.35); if (al <= 0.01) return ''; const w = txt.length * 27 * 0.645 + 36, lx = anc === 'l' ? tx + w : tx - w;
    return (tg ? `<g opacity="${f1(al)}"><path d="M${f1(lx)} ${f1(ty - 6)}L${f1(tg[0])} ${f1(tg[1])}" stroke="${c}" stroke-width="3.5" stroke-linecap="round" opacity=".9"/><circle cx="${f1(tg[0])}" cy="${f1(tg[1])}" r="8" fill="${c}" stroke="#06222B" stroke-width="3"/></g>` : '') + pill(tx, ty, txt, { fs: 27, c, a: al, anchor: anc }); };
  const lab = [];
  lab.push(L(5.7, 7.8, 'EPIDERMIS', y0 - 84, '#F7D3B4', [930, y0 + 30]), L(6.2, 7.8, 'DERMIS', y0 + 280, '#E69A8E', [900, y0 + 150]));
  lab.push(L(8.3, 10.7, 'JARINGAN DI BAWAH KULIT', 1010, '#F9E8C6', [850, 960]));
  lab.push(L(8.9, 10.7, 'SARAF', 1112, K.gold, [330, 972]), L(9.2, 10.7, 'PEMBULUH DARAH KECIL', yv - 70, K.coral, [900, yv - 8]));
  lab.push(L(13.9, 16.9, 'SARAF SIMPATIK', 1112, K.gold, [330, 972]), L(15.3, 17.9, 'PEMBULUH DARAH KECIL', yv - 70, K.coral, [900, yv - 8]));
  lab.push(L(17.2, 19.9, 'MENYEMPIT', yv + 150, K.coral, [820, yv + 4]));
  lab.push(L(18.6, 21.2, 'VOLUME BERKURANG', 1010, '#F9E8C6', [330, 985], 70, 'l'), L(21.5, 23.6, 'LIPATAN-LIPATAN KECIL', y0 - 84, '#F7D3B4', [760, y0 + 24]));
  if (!o.noLabels) s += lab.join('');
  if (o.noLabels) return s;
  if (win(t, 4.9, 7.7, 0.4) > 0.01) s += pill(540, 400, 'kulit menyerap air?', { fs: 40, c: K.cyan, a: win(t, 4.95, 7.7, 0.4), px: 56 });
  if (win(t, 8.0, 10.6, 0.4) > 0.01) s += pill(540, 400, 'tubuh juga ikut merespons', { fs: 40, c: K.gold, a: win(t, 8.0, 10.6, 0.4), px: 56 });
  if (win(t, 11.9, 14.0, 0.4) > 0.01) s += pill(540, 400, 'ujung jari lama terendam', { fs: 40, c: K.cyan, a: win(t, 11.9, 14.0, 0.4), px: 56 });
  // panah volume turun
  if (win(t, 18.5, 21.2, 0.4) > 0.01) { const a = win(t, 18.5, 21.2, 0.4); s += `<g opacity="${f1(a)}"><path d="M120 ${y0 + 262}L120 ${y0 + 262 + 70 * volume}m-16 -18l16 18l16 -18" stroke="#FFF1CF" stroke-width="6" fill="none" stroke-linecap="round"/></g>`; }
  return s;
}
