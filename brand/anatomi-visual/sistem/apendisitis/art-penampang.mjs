// Potongan memanjang apendiks SKEMATIS yang tersambung ke sekum (ostium), dengan empat lapis dinding (serosa/peritoneum, muskularis, submukosa dengan folikel limfoid, mukosa),
// lumen, mesoapendiks dengan arteri/vena apendikularis dan cabang ke dinding, lendir, penyumbat (tinja mengeras atau jaringan limfoid membengkak), tekanan, iskemia, radang, bakteri.
// Dunia lokal 1000 x 1400, cahaya dari kiri atas. Semua parameter dinamis diberikan oleh pemanggil (fungsi waktu), sehingga bisa digerakkan konsisten.
import { f1, lerp, clamp, mulus, poli, volum, tumpuk, B, mix, terang, gelap, seg, ease } from '../tensi/util.mjs';
import { sampel, pita, pitaD, di, normalDi } from './geom.mjs';

export const PC = sampel([[500, 330], [512, 520], [540, 760], [570, 1000], [566, 1210]], 12);
export const JANGKAR = { ostium: [500, 345], pangkal: [505, 430], tengah: [545, 770], ujung: [566, 1240], sekum: [330, 120], arteri: [330, 560], meso: [300, 800] };
const LAP = { serosa: '#F4D9D2', otot: '#CA6470', sub: '#EDB4AD', mukosa: '#DD8D95', lumen: '#2B1822', lendir: '#E7D79A', bakteri: '#8CD64A' };

const h = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function penampang(p = {}) {
  const { T = 0, d = 0, radang = 0, iskemia = 0, tekanan = 0, aliran = 1, ph = 0, fase = 0, bakteri = 0, muc = 0, mucT0 = 0, mucT1 = 1, sumbat = null, sorot = {} } = p;
  // sumbat: { kind: 'tinja'|'limfoid', k: 0..1 (kemunculan) }
  const edema = 0.5 * radang * (1 - 0.6 * d);
  const lumW = (t) => 38 + 74 * d * (0.5 + 0.5 * Math.pow(t, 0.6));
  const wall = (t) => (42 - 15 * d) * (1 + edema);
  const outer = (t) => lumW(t) + wall(t);
  const lay = (f) => (t) => lumW(t) + wall(t) * f;
  let s = '';
  s += '<!--L:mesoapendiks-->';
  // ================= mesoapendiks (di belakang), tepi kiri =================
  const ML = [], MO = [], n = PC.length;
  for (let i = 3; i < n - 6; i++) { const t = i / (n - 1), nm = normalDi(PC, i), tp = (i - 3) / (n - 9); const w = 80 + 250 * Math.sin(Math.PI * Math.pow(tp, 0.7)) * (1 - 0.35 * tp); ML.push([PC[i][0] - Math.abs(nm[0]) * (outer(t) * 0.7), PC[i][1] - 0]); MO.push([PC[i][0] - w - 40, PC[i][1] + 10 * Math.sin(i)]); }
  const meso = mulus([...ML, ...MO.slice().reverse()], true);
  s += `<path d="${meso}" transform="translate(10 14)" fill="#2A0A12" opacity=".35" filter="${B(10)}"/><path d="${meso}" fill="#F0C2AA" opacity=".95"/>`;
  s += `<clipPath id="pmso"><path d="${meso}"/></clipPath><g clip-path="url(#pmso)"><path d="${meso}" transform="translate(-14 -18)" fill="#FBE0CC" opacity=".6" filter="${B(14)}"/>`;
  for (let i = 0; i < 18; i++) { const t = 0.08 + i * 0.05, dd = di(PC, t), r = 20 + (i % 3) * 8, ox = -(120 + (i % 4) * 46); s += `<ellipse cx="${f1(dd.p[0] + ox)}" cy="${f1(dd.p[1] + (h(i) - 0.5) * 30)}" rx="${r * 1.6}" ry="${r}" fill="#F2C65A" opacity=".75" filter="${B(2.5)}" transform="rotate(${f1(h(i + 3) * 60)} ${f1(dd.p[0] + ox)} ${f1(dd.p[1])})"/>`; }
  s += `</g>`;
  s += '<!--L:sekum-->';
  // ================= sekum (atas) =================
  const cecO = mulus(Array.from({ length: 22 }, (_, k) => { const th = Math.PI * (0.02 + 0.96 * k / 21); const sc = 1 + 0.025 * Math.cos(th * 7); return [500 + Math.cos(th) * 450 * sc * -1, 20 + Math.sin(th) * 360 * sc]; }), false).replace(/^M/, 'M1100 -300L-100 -300L');
  const cecPts = (rx, ry, cy = 20) => [[-100, -300], ...Array.from({ length: 22 }, (_, k) => { const th = Math.PI * (k / 21); return [500 - Math.cos(th) * rx, cy + Math.sin(th) * ry]; }), [1100, -300]];
  const outerC = mulus(cecPts(450, 360), true), innerC = mulus(cecPts(392, 304), true);
  s += `<path d="${outerC}" transform="translate(10 16)" fill="#2A0A12" opacity=".35" filter="${B(12)}"/>`;
  s += `<path d="${outerC}" fill="${LAP.serosa}"/><path d="${outerC}" transform="translate(-6 -8)" fill="#fff" opacity=".25" filter="${B(6)}"/>`;
  s += `<path d="${mulus(cecPts(430, 340), true)}" fill="${LAP.otot}"/><path d="${mulus(cecPts(412, 322), true)}" fill="${LAP.sub}"/><path d="${innerC}" fill="${LAP.mukosa}"/>`;
  s += '<!--L:dinding-apendiks-->';
  // ================= dinding apendiks (serosa -> mukosa) =================
  const apLayer = (f, col, o = 1) => `<path d="${pitaD(PC, f, 'akhir')}" fill="${col}" opacity="${o}"/>`;
  const iskCol = (c, k) => mix(c, '#7E6C8E', clamp(k));
  s += `<path d="${pitaD(PC, outer, 'akhir')}" transform="translate(10 16)" fill="#2A0A12" opacity=".4" filter="${B(10)}"/>`;
  s += apLayer(outer, iskCol(LAP.serosa, iskemia * 0.5));
  s += apLayer(lay(0.9), iskCol(mix(LAP.otot, '#8E1F33', radang * 0.7), iskemia * 0.6));
  s += apLayer(lay(0.52), iskCol(mix(LAP.sub, '#D9707A', radang * 0.6), iskemia * 0.7));
  s += apLayer(lay(0.28), iskCol(mix(LAP.mukosa, '#C2434F', radang * 0.7), iskemia * 0.7));
  // kilau serosa (kiri atas) + regangan
  const klp = pitaD(PC, outer, 'akhir');
  s += `<clipPath id="pkl"><path d="${klp}"/></clipPath><g clip-path="url(#pkl)">`;
  s += `<path d="${poli(sampel(PC.map((q, i) => [q[0] - outer(i / (PC.length - 1)) * 0.7, q[1]]), 4))}" fill="none" stroke="#fff" stroke-width="${f1(7 + 8 * tekanan)}" stroke-linecap="round" opacity="${f1(0.45 + 0.2 * tekanan)}" filter="${B(2.5)}"/>`;
  // folikel limfoid di submukosa (titik pucat), makin banyak terlihat saat radang
  for (let i = 0; i < 26; i++) { const t = 0.06 + h(i) * 0.9, dd = di(PC, t), side = i % 2 ? 1 : -1, off = (lumW(t) + wall(t) * 0.42) * side; s += `<circle cx="${f1(dd.p[0] + dd.n[0] * off)}" cy="${f1(dd.p[1] + dd.n[1] * off)}" r="${f1(4 + 3 * h(i + 5))}" fill="#F6E3F0" opacity="${f1(0.6 - 0.3 * iskemia)}"/>`; }
  // iskemia: gelap kebiruan mulai dari ujung (distal) ke proksimal
  if (iskemia > 0.01) { const gy = 330 + (1 - iskemia) * 900; s += `<defs><linearGradient id="isk" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(gy - 160)}" x2="0" y2="${f1(Math.min(1300, gy + 80))}"><stop offset="0" stop-color="#4A3A6A" stop-opacity="0"/><stop offset="1" stop-color="#3C2E5C" stop-opacity="${f1(0.7 * Math.min(1, iskemia * 1.1))}"/></linearGradient></defs><rect x="0" y="0" width="1000" height="1400" fill="url(#isk)"/>`; }
  s += `</g>`;
  // sel imun/ fibrin saat radang
  if (radang > 0.05) { s += `<g clip-path="url(#pkl)" opacity="${f1(clamp(radang * 1.2))}">`; for (let i = 0; i < 30; i++) { const t = 0.1 + h(i + 40) * 0.85, dd = di(PC, t), side = i % 2 ? 1 : -1, off = (lumW(t) + wall(t) * (0.35 + 0.5 * h(i + 7))) * side; s += `<circle cx="${f1(dd.p[0] + dd.n[0] * off + Math.sin(T * 2 + i) * 2)}" cy="${f1(dd.p[1] + dd.n[1] * off)}" r="${f1(3.4 + 1.6 * h(i + 9))}" fill="#F4F0FF" opacity=".85"/>`; } s += `</g>`; }
  s += '<!--L:lumen-->';
  // ================= lumen =================
  const lumD = pitaD(PC, lumW, 'akhir');
  const cecL = mulus(cecPts(392, 304), true);
  s += `<path d="${cecL}" fill="#3A2A20"/>`;
  // isi sekum: tinja berbutir
  s += `<clipPath id="pcl"><path d="${cecL}"/></clipPath><g clip-path="url(#pcl)">`;
  for (let i = 0; i < 26; i++) { const x = 160 + h(i) * 680, y = -100 + h(i + 11) * 400, r = 16 + h(i + 2) * 26; s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * 1.3)}" ry="${f1(r)}" fill="${i % 3 ? '#8A5C34' : '#B07C46'}" opacity=".9" transform="rotate(${f1(h(i + 4) * 90)} ${f1(x)} ${f1(y)})"/><ellipse cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.3)}" rx="${f1(r * 0.5)}" ry="${f1(r * 0.3)}" fill="#D3A76A" opacity=".5"/>`; }
  s += `</g>`;
  s += `<path d="${lumD}" fill="${LAP.lumen}"/>`;
  // ostium: cincin sorot
  s += `<path d="M${f1(500 - lumW(0) - 6)} 332Q500 ${f1(322 - 6)} ${f1(500 + lumW(0) + 6)} 332" fill="none" stroke="#FFE08A" stroke-width="5" stroke-linecap="round" opacity="${f1(0.3 + 0.7 * (sorot.ostium || 0))}"/>`;
  s += '<!--L:isi-lumen-->';
  // ================= isi lumen: lendir, bakteri, penyumbat =================
  s += `<clipPath id="plm"><path d="${lumD}"/></clipPath><g clip-path="url(#plm)">`;
  const blokK = sumbat ? sumbat.k : 0;
  const frontT = sumbat ? 0.16 : 0;   // posisi penyumbat (fraksi sepanjang apendiks)
  // gel lendir mengisi lumen (opasitas naik seiring penumpukan)
  s += `<path d="${lumD}" fill="${LAP.lendir}" opacity="${f1(0.58 * clamp(muc))}"/>`;
  if (muc > 0.05) s += `<path d="${lumD}" transform="translate(-9 -12)" fill="#FFF6C8" opacity="${f1(0.3 * clamp(muc))}" filter="${B(6)}"/>`;
  // tetesan lendir keluar dari dinding mukosa (sekresi berlanjut), melayang ke tengah lalu menumpuk
  const nDrop = 34;
  for (let i = 0; i < nDrop; i++) {
    const t0 = mucT0 + (mucT1 - mucT0) * (i / nDrop), age = (T - t0);
    if (age < 0) continue;
    const t = 0.12 + h(i + 70) * 0.84, dd = di(PC, t), side = i % 2 ? 1 : -1, wl = lumW(t);
    const u = ease.out(clamp(age / 0.9)), r = (5 + 5 * h(i + 3)) * (0.4 + 0.6 * u);
    const x = dd.p[0] + dd.n[0] * side * wl * (0.95 - 0.8 * u * (0.4 + 0.6 * h(i + 8))) + Math.sin(T * 1.6 + i) * 1.5, y = dd.p[1] + dd.n[1] * side * wl * 0.9 * (1 - u) + (h(i + 9) - 0.5) * 20 * u;
    const o = Math.min(1, age * 4);
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#F3E7A8" opacity="${f1(0.9 * o)}" stroke="#B8A55C" stroke-width="1.4"/><circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.3)}" r="${f1(r * 0.3)}" fill="#fff" opacity="${f1(0.7 * o)}"/>`;
  }
  // aliran lendir normal menuju sekum (sebelum tersumbat): panah kecil di tengah lumen
  const drain = sorot.drain || 0;
  if (drain > 0.02) for (let i = 0; i < 7; i++) { const u = ((fase * 0.35 + i / 7) % 1), dd = di(PC, 0.9 - u * 0.8); s += `<circle cx="${f1(dd.p[0])}" cy="${f1(dd.p[1])}" r="6" fill="#F3E7A8" opacity="${f1(drain * Math.min(1, u * 8, (1 - u) * 8))}"/>`; }
  // bakteri (batang kecil hijau) bertambah
  const nB = Math.round(120 * bakteri);
  for (let i = 0; i < nB; i++) { const t = 0.1 + h(i + 120) * 0.86, dd = di(PC, t), wl = lumW(t), off = (h(i + 130) - 0.5) * 1.7 * wl, x = dd.p[0] + dd.n[0] * off, y = dd.p[1] + dd.n[1] * off + Math.sin(T * 2 + i) * 2; s += `<rect x="${f1(x - 8)}" y="${f1(y - 3)}" width="16" height="6" rx="3" fill="${LAP.bakteri}" stroke="#3E7A16" stroke-width="1" transform="rotate(${f1(h(i + 140) * 180)} ${f1(x)} ${f1(y)})"/>`; }
  s += `</g>`;
  s += '<!--L:penyumbat-->';
  // penyumbat
  if (sumbat && sumbat.kind === 'tinja' && blokK > 0.01) {
    const k = ease.inOut(blokK), dd = di(PC, lerp(-0.16, frontT, k)), r = 50;
    s += `<g transform="translate(${f1(dd.p[0])} ${f1(dd.p[1])}) rotate(${f1(18)})"><ellipse cx="3" cy="6" rx="${r + 4}" ry="${r - 8}" fill="#1A0C06" opacity=".5" filter="${B(4)}"/>`
      + `<ellipse rx="${r}" ry="${r - 10}" fill="#4B2D18"/><ellipse rx="${r * 0.78}" ry="${r * 0.55}" fill="#6B4224"/><ellipse rx="${r * 0.5}" ry="${r * 0.32}" fill="#8A5C34"/><ellipse cx="-12" cy="-10" rx="${r * 0.28}" ry="${r * 0.14}" fill="#C79A66" opacity=".7"/></g>`;
  }
  if (sumbat && sumbat.kind === 'limfoid' && blokK > 0.01) {
    const k = ease.inOut(blokK);
    for (const side of [-1, 1]) { const dd = di(PC, 0.1), w = lumW(0.1), rr = 14 + 0.95 * w * k, cxx = dd.p[0] + dd.n[0] * side * (w + 6 - 0.9 * w * k); s += `<g><ellipse cx="${f1(cxx)}" cy="${f1(dd.p[1] + (side > 0 ? 8 : -8))}" rx="${f1(rr)}" ry="${f1(rr * 1.15)}" fill="#E3B6D2"/><ellipse cx="${f1(cxx - 4)}" cy="${f1(dd.p[1] - 8)}" rx="${f1(rr * 0.45)}" ry="${f1(rr * 0.4)}" fill="#F6DCEA" opacity=".8"/></g>`; }
  }
  s += '<!--L:pembuluh-->';
  // ================= pembuluh: arteri/vena apendikularis di mesoapendiks + cabang ke dinding =================
  const KA = []; for (let i = 4; i < n - 3; i += 2) { const t = i / (n - 1), dd = normalDi(PC, i); KA.push([PC[i][0] - 140 - 90 * (1 - t) + Math.sin(i * 1.3) * 10, PC[i][1] + Math.cos(i * 1.3) * 8]); }
  const KV = KA.map((q) => [q[0] + 26, q[1] + 14]);
  const colA = mix('#D6303C', '#6C5A8E', iskemia * 0.8), colV = mix('#4D55D6', '#4C4672', iskemia * 0.5);
  const tub = (pts, w, c) => `<path d="${mulus(pts)}" fill="none" stroke="${gelap(c, 0.5)}" stroke-width="${f1(w + 3)}" stroke-linecap="round" opacity=".8"/><path d="${mulus(pts)}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round"/><path d="${mulus(pts)}" transform="translate(-1.5 -2)" fill="none" stroke="${terang(c, 0.5)}" stroke-width="${f1(w * 0.3)}" stroke-linecap="round" opacity=".6"/>`;
  s += tub(KV, 9, colV) + tub(KA, 11, colA);
  // masuk dari kiri atas (arteri ileokolika)
  s += tub([[60, 150], [160, 260], KA[0]], 11, colA) + tub([KV[0], [190, 300], [90, 190]], 9, colV);
  // cabang menembus dinding: bagian dinding berlapis
  [2, 5, 8, 11, 14].forEach((k, j) => { if (k >= KA.length) return; const t = (4 + k * 2) / (n - 1), dd = di(PC, t), a = KA[k], wallPt = [dd.p[0] - (lumW(t) + wall(t) * 0.5), dd.p[1]], w = 6 - j * 0.5; s += `<path d="M${f1(a[0])} ${f1(a[1])}C${f1(a[0] + 50)} ${f1(a[1] - 10)} ${f1(wallPt[0] - 40)} ${f1(wallPt[1] + 6)} ${f1(wallPt[0])} ${f1(wallPt[1])}" fill="none" stroke="${colA}" stroke-width="${f1(w)}" stroke-linecap="round"/>`; });
  // pembuluh di dalam dinding (kedua sisi) memanjang ke ujung
  for (const side of [-1, 1]) { const pts = []; for (let i = 4; i < n - 2; i += 2) { const t = i / (n - 1), dd = normalDi(PC, i); pts.push([PC[i][0] + dd[0] * side * (lumW(t) + wall(t) * 0.55), PC[i][1] + dd[1] * side * (lumW(t) + wall(t) * 0.55)]); } s += `<path d="${mulus(pts)}" fill="none" stroke="${colA}" stroke-width="${f1(3.2 * (0.6 + 0.4 * aliran))}" stroke-linecap="round" opacity=".9"/>`; }
  // partikel aliran darah (kecepatan/kerapatan dari aliran)
  const dens = clamp(aliran), nP = 26;
  for (let i = 0; i < nP; i++) { if (i / nP > dens) continue; const u = (ph * 0.5 + i / nP) % 1, a = di(sampel(KA, 6), u); s += `<circle cx="${f1(a.p[0])}" cy="${f1(a.p[1])}" r="4.2" fill="#FFB199" opacity="${f1(Math.min(1, u * 10, (1 - u) * 10))}"/>`; const b = di(sampel(KV, 6), 1 - u); s += `<circle cx="${f1(b.p[0])}" cy="${f1(b.p[1])}" r="3.6" fill="#B8C0FF" opacity="${f1(Math.min(1, u * 10, (1 - u) * 10) * 0.9)}"/>`; }
  return { svg: s, anchor: JANGKAR, lumW, outer };
}
