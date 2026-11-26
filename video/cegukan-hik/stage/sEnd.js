// C. PENYEBAB + RINGKASAN (20,5 - 30,0): kembali ke Raka di meja; dua kartu pemicu ("bisa memicu"), cegukan tanpa sebab jelas, lalu urutan tiga ikon.
import { f1, clamp, lerp, sm, eo, eio, eob, track, R, C, T, W, K, CREAM, chip, tag, op, armTo, rk, raka, rIdle, lerpState, jolt, hikBubble, ka, tw, pill, pop } from './common.js';
import { deskScene, deskFront, DESK_Y } from './sHook.js';
import { larynx, soundArcs, airArrow } from './anat.js';

const RKS = { k: 1.05 }, TY = DESK_Y - 580 * RKS.k;
const sc8 = (cx, cy, inner, k = 0.8) => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${inner}</g>`;
export function endRaka(t) {
  const S = { lapar: raka('lapar'), perut: raka('khawatir', 'pegang_perut'), kaget: raka('kaget', 'kaget'), diam: raka('netral', null, { gazeX: 0.2 }), pikir: raka('berpikir', 'berpikir', { gazeX: 0.4, gazeY: -0.3 }), tunjuk: raka('menunjuk', 'menunjuk', { gazeX: 0.2, gazeY: -0.5 }), lega: raka('lega', 'menunjuk', { gazeY: -0.3 }) };
  let st;
  if (t < 21.9) st = S.lapar;
  else if (t < 24.5) st = lerpState(S.lapar, S.perut, sm((t - 21.9) / 0.35));
  else if (t < 25.0) st = S.perut;
  else if (t < 26.2) st = lerpState(S.perut, S.diam, sm((t - 25.0) / 0.5));              // "Tapi kadang," berhenti sejenak
  else if (t < 26.9) st = lerpState(S.diam, S.kaget, sm((t - 26.25) / 0.2));
  else if (t < 27.5) st = lerpState(S.kaget, S.pikir, sm((t - 26.9) / 0.4));
  else if (t < 29.2) st = lerpState(S.pikir, S.tunjuk, sm((t - 27.5) / 0.4));
  else st = lerpState(S.tunjuk, S.lega, sm((t - 29.2) / 0.4));
  const J = Math.max(jolt(t, 24.12), jolt(t, 26.3));
  st = rIdle(st, t);
  st.bob += -20 * J; st.tilt += -4 * J; st.wide = Math.min(1, st.wide + 0.55 * J); st.mouth = { ...st.mouth, lo: lerp(st.mouth.lo, 22, J), up: lerp(st.mouth.up, -2, J) }; st.fxBurst = Math.max(st.fxBurst, 0.9 * J);
  return { st, J };
}
const card = (x, y, w, h, k, a, inner) => a <= 0.01 || k <= 0.01 ? '' : `<g opacity="${f1(Math.min(1, a) * 100) / 100}" transform="translate(${f1(x + w / 2)} ${f1(y + h / 2)}) scale(${f1(k * 1000) / 1000}) translate(${f1(-(x + w / 2))} ${f1(-(y + h / 2))})"><rect x="${x + 4}" y="${y + 12}" width="${w}" height="${h}" rx="44" fill="rgba(10,56,48,.22)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="#fff"/>${inner}</g>`;
const label = (lines, cx, y, size = 42, col = K.forest) => lines.map((l, i) => T(l, cx, y + i * (size * 1.12), { size, fill: col })).join('');
function iconFast(cx, cy, t, t0) {
  const ph = (t - t0) * 3.1, u = 0.5 + 0.5 * Math.sin(ph * 2 * Math.PI), sx = lerp(cx - 6, cx + 78, u), sy = lerp(cy + 14, cy - 74, u);
  let s = `<path d="M${cx - 112} ${cy + 36}L${cx + 112} ${cy + 36}Q${cx + 104} ${cy + 128} ${cx} ${cy + 134}Q${cx - 104} ${cy + 128} ${cx - 112} ${cy + 36}Z" fill="#E8665F"/><ellipse cx="${cx}" cy="${cy + 36}" rx="112" ry="22" fill="#C9473F"/><path d="M${cx - 96} ${cy + 34}Q${cx} ${cy - 34} ${cx + 96} ${cy + 34}Q${cx} ${cy + 58} ${cx - 96} ${cy + 34}Z" fill="#FFF8EA" stroke="#E7D8B8" stroke-width="4"/>`;
  for (let i = 0; i < 7; i++) s += `<ellipse cx="${cx - 56 + i * 19}" cy="${cy + 22 + (i % 2) * 8}" rx="6" ry="3.5" fill="#E7D8B8"/>`;
  s += `<g transform="translate(${f1(sx)} ${f1(sy)}) rotate(-38)"><rect x="-7" y="-4" width="14" height="118" rx="7" fill="#9AA7B5"/><ellipse cx="0" cy="-8" rx="21" ry="27" fill="#C3CDD8"/><ellipse cx="0" cy="-12" rx="13" ry="17" fill="#FFF8EA"/></g>`;
  const sp = Math.abs(Math.cos(ph * 2 * Math.PI));
  for (let i = 0; i < 3; i++) s += `<path d="M${cx - 150 + i * 6} ${cy - 40 + i * 34}L${cx - 106 + i * 6} ${cy - 40 + i * 34}" stroke="${K.airD}" stroke-width="8" stroke-linecap="round" opacity="${f1(0.3 + 0.6 * sp)}"/>`;
  return s;
}
function iconFull(cx, cy, t, t0) {
  const lv = sm((t - t0) / 1.2), bulge = 1 + 0.07 * lv + 0.01 * Math.sin(t * 9) * lv, id = 'stc';
  const d = `M${cx - 90} ${cy - 20}C${cx - 90} ${cy - 90} ${cx + 10} ${cy - 100} ${cx + 60} ${cy - 70}C${cx + 120} ${cy - 40} ${cx + 130} ${cy + 60} ${cx + 60} ${cy + 100}C${cx - 10} ${cy + 140} ${cx - 110} ${cy + 110} ${cx - 110} ${cy + 30}C${cx - 110} ${cy + 10} ${cx - 95} ${cy - 5} ${cx - 90} ${cy - 20}Z`;
  const top = cy + 130 - 250 * lv;
  let s = `<path d="M${cx - 62} ${cy - 66}C${cx - 66} ${cy - 112} ${cx - 50} ${cy - 134} ${cx - 34} ${cy - 150}" fill="none" stroke="${K.stomachD}" stroke-width="34" stroke-linecap="round"/><path d="M${cx - 62} ${cy - 66}C${cx - 66} ${cy - 112} ${cx - 50} ${cy - 134} ${cx - 34} ${cy - 150}" fill="none" stroke="${K.stomach}" stroke-width="22" stroke-linecap="round"/><path d="M${cx + 58} ${cy + 96}C${cx + 96} ${cy + 114} ${cx + 128} ${cy + 104} ${cx + 156} ${cy + 78}" fill="none" stroke="${K.stomachD}" stroke-width="30" stroke-linecap="round"/><path d="M${cx + 58} ${cy + 96}C${cx + 96} ${cy + 114} ${cx + 128} ${cy + 104} ${cx + 156} ${cy + 78}" fill="none" stroke="${K.stomach}" stroke-width="18" stroke-linecap="round"/><g transform="translate(${cx} ${cy + 20}) scale(${f1(bulge * 1000) / 1000}) translate(${-cx} ${-(cy + 20)})"><clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${K.stomach}" stroke="${K.stomachD}" stroke-width="7" stroke-linejoin="round"/><g clip-path="url(#${id})"><rect x="${cx - 140}" y="${f1(top)}" width="290" height="260" fill="#E7C27A"/><path d="M${cx - 140} ${f1(top)}Q${cx - 70} ${f1(top - 14)} ${cx} ${f1(top)}T${cx + 150} ${f1(top)}" fill="#E7C27A"/>${[[-50, 40], [10, 70], [-20, 0], [50, 30], [-70, 80]].map(([a, b]) => `<circle cx="${cx + a}" cy="${cy + b}" r="9" fill="#C99A4A" opacity="${f1(lv)}"/>`).join('')}</g></g>`;
  const pr = clamp((lv - 0.5) * 2); s += `<g stroke="${K.cord}" stroke-width="8" stroke-linecap="round" opacity="${f1(pr)}"><path d="M${cx + 138} ${cy - 30}L${cx + 164} ${cy - 44}M${cx + 148} ${cy + 20}L${cx + 178} ${cy + 20}M${cx + 130} ${cy + 76}L${cx + 156} ${cy + 94}"/></g>`;
  return s;
}
// ---- ikon ringkasan (kotak lokal 290 x 230)
function icDia(c, gl) {
  const mid = 128 + 50 * c, cy = 2 * mid - 165, bt = (x) => 0;
  const topP = `M8 165Q145 ${f1(cy)} 282 165`, botP = `L282 199Q145 ${f1(cy + 34)} 8 199Z`;
  return `<clipPath id="ic1"><rect x="0" y="0" width="290" height="230"/></clipPath><g clip-path="url(#ic1)"><rect x="0" y="150" width="290" height="90" fill="#FDEBDD"/><path d="M28 175C14 90 50 28 96 34C134 40 138 100 134 175Z" fill="${K.lung}" stroke="${K.lungD}" stroke-width="5"/><path d="M262 175C276 90 240 28 194 34C156 40 152 100 156 175Z" fill="${K.lung}" stroke="${K.lungD}" stroke-width="5"/><path d="${topP}${botP}" fill="${K.gold}" stroke="${K.goldD}" stroke-width="5" stroke-linejoin="round"/>${gl > 0.01 ? `<path d="${topP}${botP}" fill="none" stroke="#fff" stroke-width="6" opacity="${f1(gl)}"/>` : ''}</g>`
    + (c > 0.2 ? `<g opacity="${f1(c)}"><path d="M145 70L145 108" stroke="#B05A00" stroke-width="12" stroke-linecap="round"/><path d="M123 100L145 128L167 100Z" fill="#B05A00" stroke="#B05A00" stroke-width="6" stroke-linejoin="round"/></g>` : '');
}
function icCord(g, gl) {
  return `<clipPath id="ic2"><rect x="0" y="0" width="290" height="230"/></clipPath><g clip-path="url(#ic2)"><g transform="translate(145 118) scale(1.78) translate(-540 -208)">${larynx(g)}</g></g>${gl > 0.01 ? `<rect x="4" y="4" width="282" height="222" rx="26" fill="none" stroke="${K.cord}" stroke-width="6" opacity="${f1(gl)}"/>` : ''}`;
}
function icHik(p, gl) {
  const k = 0.8 + 0.3 * eob(clamp(p));
  return `<g transform="translate(145 120)">${hikBubble(0, 0, k * 1.12, 1, 'HIK!', { size: 74, rot: -6 })}</g><g transform="translate(145 120)" fill="none" stroke="${K.gold}" stroke-width="6" stroke-linecap="round" opacity="${f1(0.4 + 0.5 * Math.sin(p * 9) ** 2)}"><path d="M-128 -60Q-146 -20 -128 20"/><path d="M128 -60Q146 -20 128 20"/></g>`;
}
export function sceneEnd(t, out) {
  const { st, J } = endRaka(t), r = rk(st, 540, TY, RKS.k, 'rE');
  const push = 1 + 0.02 * sm((t - 20.9) / 9);
  let w = deskScene(t) + deskFront(t) + `<defs><clipPath id="dke"><rect x="-300" y="0" width="1700" height="${DESK_Y}"/></clipPath></defs><g clip-path="url(#dke)">${r.svg}</g>`;
  const sh = r.at(200, 150);
  // ---------- kartu pemicu (21,04 - 24,8)
  const fadeC = 1 - sm((t - 24.8) / 0.35);
  if (t < 25.3) {
    w += card(50, 250, 460, 350, pop(t, 21.04, 0.4), fadeC, sc8(280, 385, iconFast(280, 360, t, 21.04)) + label(['MAKAN TERLALU', 'CEPAT'], 280, 546, 38));
    w += card(570, 250, 460, 350, pop(t, 21.95, 0.4), fadeC, sc8(800, 385, iconFull(800, 372, t, 21.95)) + label(['PERUT TERLALU', 'PENUH'], 800, 546, 38));
  }
  out.A += w;
  // pil "BISA MEMICU"
  const pa = ka(t, 23.25, 24.85, 0.25) * 1;
  if (pa > 0.01) { const k = pop(t, 23.25, 0.35); out.U += pill(['BISA MEMICU'], 540, 616, { a: pa, size: 54, bg: K.gold, fg: '#172B38', k }) + `<path d="M514 712L566 712L540 750Z" fill="${K.gold}" opacity="${f1(pa)}"/>`; }
  // gelembung hik (visual saja; narator sudah mengucapkan "cegukan")
  const hb = (t0) => jolt(t, t0, 0.5), hp = [r.at(330, 120)[0] + 60, r.at(330, 120)[1] - 40];
  for (const t0 of [24.12, 26.3]) { const b = hb(t0); out.U += hikBubble(hp[0], hp[1], 0.7 + 0.4 * b, b > 0.05 ? Math.min(1, b * 1.8) : 0, 'hik!'); }
  // tanpa penyebab jelas: tanda tanya + label
  out.U += chip(['KADANG, TANPA', 'PENYEBAB JELAS'], t, 25.1, 27.55, { size: 56 });
  const qa = ka(t, 26.55, 27.55, 0.2);
  if (qa > 0.01) { const hc = r.at(200, 180); [[-210, -70, 0], [215, -90, 1.2], [-20, -190, 2.4]].forEach(([dx, dy, ph], i) => { out.U += `<text x="${f1(hc[0] + dx)}" y="${f1(hc[1] + dy + 8 * Math.sin(t * 6 + ph))}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="${96 - i * 10}" fill="${K.cord}" stroke="#fff" stroke-width="10" paint-order="stroke" opacity="${f1(qa)}">?</text>`; }); }
  // ---------- ringkasan tiga ikon (27,55 - 30,0)
  if (t >= 27.5) {
    const xs = [40, 395, 750], y0 = 380, ts = [27.55, 28.2, 28.85], gl = (a) => clamp((t - a) / 0.12) * (1 - sm((t - a - 0.25) / 0.2));
    const defs = [
      (g0) => icDia(Math.max(0, 1 - Math.abs((t - 27.7) * 3.2)) * (t >= 27.6 ? 1 : 0) + 0 * g0, gl(29.35)), (g0) => icCord(lerp(24, -2, eo(clamp((t - 28.4) / 0.12))) * (t >= 28.4 ? 1 : 1) + 0 * g0 * 0, gl(29.58)), () => icHik(t - 29.0, gl(29.8)),
    ];
    const labs = ['DIAFRAGMA', 'PITA SUARA', 'BUNYI ‘HIK’'], cols = [K.gold, K.cord, K.cord];
    let sv = '';
    for (let i = 0; i < 3; i++) {
      const a = clamp((t - ts[i]) / 0.15), k = pop(t, ts[i], 0.4); if (a <= 0) continue;
      let ic = defs[i]();
      // ikon 2: terbuka dulu, menutup tepat sesudah pop
      if (i === 1) ic = icCord(t < 28.42 ? 24 : lerp(24, -2, eo(clamp((t - 28.42) / 0.1))), gl(29.58));
      if (i === 0) ic = icDia(t < 27.7 ? 0 : (t < 27.8 ? eo((t - 27.7) / 0.1) : Math.max(0, 1 - (t - 27.8) / 0.6)), gl(29.35));
      const inner = `<g transform="translate(${xs[i]} ${y0 + 14})">${ic}</g><circle cx="${xs[i] + 40}" cy="${y0 + 30}" r="26" fill="${cols[i]}" stroke="#fff" stroke-width="5"/><text x="${xs[i] + 40}" y="${y0 + 40}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="30" fill="#172B38">${i + 1}</text>${T(labs[i], xs[i] + 145, y0 + 290, { size: 34, fill: K.forest })}`;
      sv += card(xs[i], y0, 290, 330, k, a, inner);
    }
    for (let i = 0; i < 2; i++) { const a = clamp((t - (ts[i] + 0.38)) / 0.2); if (a > 0) sv += `<g opacity="${f1(a)}"><path d="M${xs[i] + 290 + 8} ${y0 + 165}L${xs[i] + 290 + 40} ${y0 + 165}" stroke="${K.forest}" stroke-width="12" stroke-linecap="round"/><path d="M${xs[i] + 290 + 30} ${y0 + 140}L${xs[i] + 290 + 60} ${y0 + 165}L${xs[i] + 290 + 30} ${y0 + 190}Z" fill="${K.forest}" stroke="${K.forest}" stroke-width="6" stroke-linejoin="round"/></g>`; }
    out.U += op(sm((t - 27.5) / 0.15), sv) + chip('URUTAN CEGUKAN', t, 27.5, 30.2, { size: 60 });
  }
}
