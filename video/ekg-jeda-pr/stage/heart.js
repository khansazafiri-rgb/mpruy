// SALINAN dari video/ekg-garis-layar/stage/heart.js (aset jantung dan EKG MEDCOEL) dengan tambahan untuk topik segmen PR: titik impuls yang tertahan di nodus AV, serambi berkontraksi sepanjang PR, bilik terisi darah (o.fill/o.flow). Bentuk, warna, jalur konduksi, ecgSlow dan EV tidak diubah.
// Jantung datar (tampak depan, SATU orientasi: serambi di atas, bilik di bawah, apeks ke bawah-kanan layar), sistem konduksi, dan fungsi bentuk gelombang EKG.
// Semua waktu pada "waktu lambat" s (detik video): urutan peristiwa mengikuti narasi (lihat EV). Warna kode: serambi/P = kuning, bilik depolarisasi/QRS = jingga, pemulihan/T = mint.
import { f1, clamp, lerp, sm, eo, eio, seg } from './lib.js';
export const COL = { rest: '#B95863', restA: '#CB6B72', restV: '#B04C58', line: '#6F2A36', P: '#FFE066', QRS: '#FF8A3D', T: '#4FD6B5', sig: '#FFF3B0', sa: '#FFE066', aorta: '#D7525B', vein: '#5E83D9' };
// peristiwa (waktu lambat, detik video)
export const EV = { sa0: 15.6, leave0: 17.0, leave1: 18.7, atria0: 18.8, atria1: 20.7, av0: 21.9, av1: 23.2, bundle0: 23.3, bundle1: 24.75, qrs0: 24.75, qrs1: 25.85, con0: 25.95, con1: 28.4, rel0: 33.1, rel1: 34.4, rep0: 30.3, rep1: 33.0, fade0: 33.1, fade1: 34.3, t0: 30.7, t1: 33.6, trace0: 16.0, trace1: 34.3 };
export const HP = 'M300 560C130 440 40 330 40 210C40 110 110 52 190 52C245 52 282 78 300 112C318 78 355 52 410 52C490 52 560 110 560 210C560 330 470 440 300 560Z';
const PATHS = {
  intern: ['M150 92C150 160 230 200 296 258', 'M150 92C200 120 262 190 292 252', 'M150 92C250 66 350 66 450 104'],
  his: 'M298 262L304 330',
  lbb: ['M304 330C332 400 360 470 332 520', 'M332 520C420 500 490 420 502 330', 'M346 470C420 450 470 392 482 330'],
  rbb: ['M304 330C272 400 246 470 270 515', 'M270 515C190 490 120 420 100 330', 'M262 460C200 440 140 380 125 300'],
};
const SA = [150, 92], AVN = [298, 262];
// ---------------------------------------------------------------- gelombang EKG
const g = (x, mu, sg) => Math.exp(-0.5 * ((x - mu) / sg) ** 2);
/** gelombang lambat (waktu s): P 18,8-20,9 | PR datar | QRS 24,75-25,85 | ST | T 30,2-33,2 */
export const ecgSlow = (s) => 0.24 * g(s, 19.9, 0.36) - 0.12 * g(s, 24.92, 0.07) + 1.0 * g(s, 25.22, 0.09) - 0.24 * g(s, 25.55, 0.08) + 0.36 * g(s, 32.15, 0.5);
/** satu denyut normal (periode 0,86 dtk; tanpa diagnosis): fase tau 0..1 */
export const ecgNormal = (tau) => { const x = tau * 0.86; return 0.13 * g(x, 0.14, 0.024) - 0.10 * g(x, 0.252, 0.008) + 1.0 * g(x, 0.272, 0.010) - 0.20 * g(x, 0.293, 0.010) + 0.30 * g(x, 0.50, 0.046); };
export const BEAT = 0.86;
export const ecgAt = (t, t0 = 0) => ecgNormal((((t - t0) / BEAT) % 1 + 1) % 1);
/** warna segmen pada waktu lambat s */
export const segCol = (s) => (s >= EV.atria0 - 0.02 && s <= 20.95 ? COL.P : s >= EV.qrs0 - 0.05 && s <= 25.95 ? COL.QRS : s >= EV.t0 && s <= EV.t1 + 0.1 ? COL.T : null);
// ---------------------------------------------------------------- keadaan jantung pada waktu lambat s
export function stateAt(s) {
  const st = {};
  st.saGlow = clamp(seg(s, EV.sa0, EV.sa0 + 0.8) * (1 - seg(s, 17.2, 17.8)));
  st.ra = seg(s, EV.atria0, EV.atria1, (x) => x) * 640; st.aFade = 1 - seg(s, 20.8, 21.9);
  st.leave = seg(s, EV.leave0, 21.0, (x) => x);
  st.av = clamp(seg(s, EV.av0 - 0.2, EV.av0 + 0.3) * (1 - seg(s, EV.av1, EV.av1 + 0.5)));
  st.bundle = seg(s, EV.bundle0, EV.bundle1, (x) => x);
  st.rv = seg(s, EV.qrs0, EV.qrs1, (x) => x) * 400;
  st.rep = seg(s, EV.rep0, EV.rep1, (x) => x) * 640; st.vFade = 1 - seg(s, EV.fade0, EV.fade1);
  st.vAct = s >= EV.qrs0 && s < EV.fade1;
  st.con = eio(seg(s, EV.con0, EV.con1)) * (1 - eio(seg(s, EV.rel0, EV.rel1)));
  st.acon = 0.9 * Math.sin(Math.PI * seg(s, 19.6, 23.9));
  return st;
}
const dot = (path, u, r, o = 1) => `<circle r="${r}" fill="${COL.sig}" stroke="#E0A800" stroke-width="3" opacity="${f1(o * 100) / 100}" class="d" data-p="${path}" data-u="${f1(u * 1000) / 1000}"/>`;
/** titik sepanjang jalur (dihitung lewat DOM path) */
const _pc = new Map();
function ptOn(d, u) {
  let e = _pc.get(d); if (!e) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); e = { p, L: p.getTotalLength() }; _pc.set(d, e); }
  const q = e.p.getPointAtLength(clamp(u) * e.L); return [q.x, q.y];
}
export const ptSA = SA, ptAV = AVN;
/** SVG jantung. o: { uid, x, y, sc, rot, nodes (tampilkan sistem konduksi), o } -- (x,y) = pusat layar jantung, sc = skala, rot derajat */
export function heartSvg(s, o = {}) {
  const { uid = 'h', x = 540, y = 620, sc = 0.85, rot = -10, nodes = true, op = 1 } = o, st = stateAt(s), id = (n) => `${n}${uid}`;
  const atriaR = 'M-10 -10H610V257H300V272H-10Z', ventR = 'M-10 258H610V600H-10Z';
  const cTr = (cx, cy, sx, sy) => `translate(${cx} ${cy}) scale(${f1(sx * 1000) / 1000} ${f1(sy * 1000) / 1000}) translate(${-cx} ${-cy})`;
  let d = `<defs><clipPath id="${id('hp')}"><path d="${HP}"/></clipPath><clipPath id="${id('at')}"><path d="${atriaR}"/></clipPath><clipPath id="${id('vt')}"><path d="${ventR}"/></clipPath></defs>`;
  d += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${sc}) translate(-300 -290)" opacity="${op}">`;
  // pembuluh besar (di belakang)
  d += `<path d="M330 120C330 20 470 -10 520 70L540 150" fill="none" stroke="${COL.aorta}" stroke-width="54" stroke-linecap="round"/><rect x="118" y="-20" width="64" height="120" rx="30" fill="${COL.vein}"/><path d="M262 120C250 50 330 10 400 40" fill="none" stroke="${COL.vein}" stroke-width="40" stroke-linecap="round" opacity=".95"/>`;
  // serambi
  const aq = 1 - 0.05 * st.acon;
  d += `<g clip-path="url(#${id('hp')})"><g clip-path="url(#${id('at')})"><g transform="${cTr(300, 200, aq, aq)}"><rect x="-20" y="-20" width="640" height="300" fill="${COL.restA}"/>`;
  d += `<g clip-path="url(#${id('hp')})"><circle cx="${SA[0]}" cy="${SA[1]}" r="${f1(st.ra)}" fill="${COL.P}" opacity="${f1(0.92 * st.aFade * 100) / 100}"/></g></g></g></g>`;
  // bilik (menyusut saat berkontraksi, SESUDAH QRS)
  const fillK = o.fill ?? 0, cx = 1 - 0.12 * st.con + 0.035 * fillK, cy = 1 - 0.16 * st.con + 0.05 * fillK;
  d += `<g clip-path="url(#${id('hp')})"><g clip-path="url(#${id('vt')})"><g transform="${cTr(300, 290, cx, cy)}"><rect x="-20" y="250" width="640" height="340" fill="${COL.restV}"/>`;
  if (fillK > 0.01) { const top = 600 - 340 * fillK * 0.92; let wv = `M-20 ${f1(top)}`; for (let i = 0; i <= 32; i++) wv += `L${f1(-20 + i * 20)} ${f1(top + 5 * Math.sin(i * 0.9 + s * 6))}`; d += `<path d="${wv}L620 620L-20 620Z" fill="#7E1F2E" opacity=".82"/><path d="${wv}" fill="none" stroke="#C2323F" stroke-width="5" opacity=".9"/>`; }
  if (st.vAct) {
    d += `<circle cx="300" cy="430" r="${f1(st.rv)}" fill="${COL.QRS}" opacity="${f1(0.95 * st.vFade * 100) / 100}"/>`;
    d += `<circle cx="300" cy="545" r="${f1(st.rep)}" fill="${COL.T}" opacity="${f1(0.95 * st.vFade * 100) / 100}"/>`;
  }
  d += `</g></g></g>`;
  // garis sekat dan alur AV, kontur
  d += `<path d="${HP}" fill="none" stroke="${COL.line}" stroke-width="9" stroke-linejoin="round"/><path d="M42 258Q300 276 558 258" fill="none" stroke="${COL.line}" stroke-width="8"/><path d="M300 112V258M306 258C306 360 304 450 300 556" fill="none" stroke="${COL.line}" stroke-width="8"/>`;
  if (nodes) {
    const sw = 'fill="none" stroke="#FFF1C2" stroke-width="3.2" stroke-linecap="round" opacity=".55"';
    for (const p of PATHS.intern) d += `<path d="${p}" ${sw}/>`; d += `<path d="${PATHS.his}" ${sw} stroke-width="5"/>`; for (const p of [...PATHS.lbb, ...PATHS.rbb]) d += `<path d="${p}" ${sw}/>`;
    // sinyal bergerak sepanjang jalur
    const sg = [];
    st.leaveDots = st.leave;
    if (s >= EV.leave0 && s < 21.05) PATHS.intern.forEach((p, i) => { const u = clamp(st.leave * 1.05 - i * 0.05); if (u > 0 && u < 1.02) sg.push(ptOn(p, u)); });
    const hold = s >= 21.0 && s < EV.bundle0 + 0.05;   // impuls TERTAHAN dan berdenyut di nodus AV, lalu melanjutkan ke berkas His
    if (hold) sg.push([AVN[0] + 3 * Math.sin(s * 14), AVN[1] + 3 * Math.cos(s * 11)]);
    if (s >= EV.av0 - 0.5 && s < EV.av1 + 0.3) { /* tertahan di nodus AV: berdenyut */ }
    if (s >= EV.bundle0 - 0.05 && s < EV.qrs1) {
      const b = st.bundle; sg.push(ptOn(PATHS.his, clamp(b * 3)));
      if (b > 0.18) { const u = clamp((b - 0.18) * 1.5); [PATHS.lbb[0], PATHS.rbb[0]].forEach((p) => sg.push(ptOn(p, u))); }
      if (b > 0.7) { const u = clamp((b - 0.7) * 3.4); [PATHS.lbb[1], PATHS.lbb[2], PATHS.rbb[1], PATHS.rbb[2]].forEach((p) => sg.push(ptOn(p, u))); }
    }
    for (const [px, py] of sg) d += `<circle cx="${f1(px)}" cy="${f1(py)}" r="12" fill="${COL.sig}" stroke="#E0A800" stroke-width="4"/>`;
    // nodus: sinus (menyala saat mulai) dan AV (menahan sebentar)
    d += `<circle cx="${SA[0]}" cy="${SA[1]}" r="${f1(14 + 12 * st.saGlow)}" fill="${COL.sa}" stroke="#8A6100" stroke-width="5"/><circle cx="${SA[0]}" cy="${SA[1]}" r="${f1(30 + 26 * st.saGlow)}" fill="none" stroke="${COL.sa}" stroke-width="5" opacity="${f1(0.7 * st.saGlow * 100) / 100}"/>`;
    d += `<circle cx="${AVN[0]}" cy="${AVN[1]}" r="${f1(13 + 8 * st.av + 3 * st.av * Math.sin(s * 9))}" fill="${st.av > 0.05 ? COL.sa : '#F4D6B8'}" stroke="#8A6100" stroke-width="5"/>`; if (st.av > 0.05) { const u = (s * 1.6) % 1; d += `<circle cx="${AVN[0]}" cy="${AVN[1]}" r="${f1(22 + 34 * u)}" fill="none" stroke="${COL.sa}" stroke-width="5" opacity="${f1(st.av * (1 - u) * 0.8 * 100) / 100}"/>`; }
  }
  if ((o.flow ?? 0) > 0.01) for (let i = 0; i < 9; i++) { const u = (((s * 1.1 + i / 9) % 1) + 1) % 1, x = 170 + (i % 3) * 120 + (i > 5 ? 70 : 0) + 20 * Math.sin(i), y = 150 + u * 330; d += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(10 + 3 * Math.sin(i))}" fill="#C2323F" stroke="#5A1520" stroke-width="3.5" opacity="${f1(o.flow * Math.sin(u * Math.PI) * 100) / 100}"/>`; }
  return d + `</g>`;
}
/** titik layar (x, y) untuk koordinat jantung (hx, hy) */
export function heartPt(hx, hy, o = {}) { const { x = 540, y = 620, sc = 0.85, rot = -10 } = o, a = rot * Math.PI / 180, dx = (hx - 300) * sc, dy = (hy - 290) * sc; return [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)]; }
