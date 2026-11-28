// Adegan Raka: hook (0 - 4,4), berpikir (15,0 - 19,1), bukti pada Raka (33,3 - 38,2), jenis bius (38,0 - 54,2) dan ringkasan (54,0 - 59,5).
// Tata letak tetap: Raka di KIRI layar, lengan kanan Raka menjulur ke kanan (area kulit yang dibahas), sudut sama dengan model saraf (kulit di kanan, sinyal ke kiri/badan).
import { f1, clamp, lerp, sm, eo, eio, seg, pop, track, R, C, P as PP, T, GOLD, INK, rndf, W, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, ka, camG, mixc } from './common.js';
import { armShape } from '../../../brand/characters/raka/raka.js';
import { NK, probe, drugMol } from './nerve.js';

export const RK = { cx: 320, ty: 440, k: 1.5 };
const ARM = { hx: 440, hy: 462, ex: 352, ey: 536 };
// keadaan Raka dengan lengan kanan menjulur ke kanan (lengan bawah hampir horizontal)
export function rakaArm(t, expr = 'netral', o = {}) {
  const a = armTo('R', ARM.hx, ARM.hy, { ex: ARM.ex, ey: ARM.ey });
  const st = rIdle(raka(expr, 'netral', { armR: a, armL: armTo('L', 92, 556), lean: 2 * Math.sin(t * 1.7), tilt: 2.2 * Math.sin(t * 1.25), ...o }), t);
  const r = rk(st, RK.cx, RK.ty, RK.k, o.uid || 'rA');
  const dots = armShape('R', st.armR).dots.map((p) => r.at(p[0], p[1]));
  const arm = (u) => { const i = clamp(u) * (dots.length - 1), k = Math.floor(i), f = i - k, A = dots[k], B = dots[Math.min(dots.length - 1, k + 1)]; return [lerp(A[0], B[0], f), lerp(A[1], B[1], f)]; };
  const hand = r.hand('R');
  return { r, dots, arm, touch: hand, shoulder: arm(0), hand };
}
function bgRoom() { return bgCream.replace(/#EADFC4/g, '#E3EAF1'); }
// denyut di bawah kulit: titik teal bergerak dari titik sentuh menuju bahu (arah menuju badan/sumsum tulang belakang)
function pulseAlong(t, ra, t0, stopU = 0, a = 1) {
  const u = clamp((t - t0) / 1.2); if (u <= 0 || u >= 1.02) return '';
  const k = lerp(1.0, stopU, eio(u)), p = k >= 0.995 ? ra.hand : ra.arm(k);
  const fade = stopU > 0.01 ? 1 - clamp((u - 0.35) / 0.5) : 1 - clamp((u - 0.85) / 0.15);
  return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="34" fill="${NK.wave}" opacity="${f1(0.35 * fade * a)}"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="17" fill="${NK.wave}" stroke="${NK.waveD}" stroke-width="5" opacity="${f1(fade * a)}"/>`;
}
export function sceneHook(t, out) {
  const tap = (t % 1.5) < 0.3 ? Math.sin(Math.PI * (t % 1.5) / 0.3) : 0, react = clamp(tap * 1.4);
  const ra = rakaArm(t, react > 0.3 ? 'kaget' : 'netral', { yaw: 0.5, gazeX: 0.9, gazeY: 0.6, wide: 0.2 * react });
  const tc = ra.touch;
  let w = bgRoom() + ra.r.svg + probe(tc[0] - 6, tc[1] - 22, tap) + `<circle cx="${f1(tc[0])}" cy="${f1(tc[1])}" r="${f1(26 + 14 * tap)}" fill="none" stroke="${NK.wave}" stroke-width="7" opacity="${f1(0.5 + 0.4 * tap)}"/>`;
  for (let i = 0; i < 4; i++) w += pulseAlong(t, ra, 0.12 + i * 1.5 - (i ? 0 : 0.12), 0.0);
  const zk = track([[0, 540, 960, 0], [2.2, 540, 960, 0], [4.2, tc[0] + 40, tc[1] - 40, Math.log(2.6)], [4.5, tc[0] + 40, tc[1] - 40, Math.log(2.6)]])(t);
  out.A += camG(w, Math.exp(zk[2]), zk[0], zk[1], 540, lerp(960, 820, sm((t - 2.2) / 2.0)));
  out.U += chip(['KOK BIUS LOKAL', 'BIKIN KEBAS?'], t, -0.4, 4.45, { size: 64, bg: '#D9382F', fg: '#fff' });
}

// ---------------------------------------------------------------- pembantu area kebas / suntik / krim
const patch = (c, r, a, t, lab) => `<g opacity="${f1(a)}"><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="${NK.drug}" opacity=".18"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="none" stroke="${NK.drug}" stroke-width="6" stroke-dasharray="14 10" transform="rotate(${f1(t * 12)} ${f1(c[0])} ${f1(c[1])})"/></g>`;
const syr = (x, y, rot, a = 1, s = 1, push = 0) => `<g opacity="${f1(a)}" transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 0L0 -80" stroke="#9AA9B8" stroke-width="6"/><rect x="-26" y="-220" width="52" height="142" rx="11" fill="#F4F8FB" stroke="#9AA9B8" stroke-width="6"/><rect x="-26" y="-150" width="52" height="26" fill="${NK.drug}" opacity=".85"/><rect x="-38" y="-230" width="76" height="12" rx="6" fill="#9AA9B8"/><g transform="translate(0 ${f1(34 * push)})"><rect x="-5" y="-300" width="10" height="74" rx="5" fill="#9AA9B8"/><rect x="-34" y="-308" width="68" height="12" rx="6" fill="#7C8CA0"/></g></g>`;
const tube = (x, y, a = 1) => `<g opacity="${f1(a)}" transform="translate(${f1(x)} ${f1(y)}) rotate(40)"><rect x="-30" y="-130" width="60" height="150" rx="16" fill="#F4F8FB" stroke="#9AA9B8" stroke-width="6"/><rect x="-30" y="-130" width="60" height="50" rx="16" fill="${NK.drug}" opacity=".85"/><rect x="-18" y="20" width="36" height="34" rx="6" fill="#9AA9B8"/></g>`;
export function sceneThink(t, out) {
  const st = rIdle(raka('berpikir', 'berpikir', { yaw: 0.4, gazeX: 0.8, tilt: 3 * Math.sin(t * 1.5), lean: 2 * Math.sin(t * 1.1) }), t);
  const r = rk(st, RK.cx, RK.ty, RK.k, 'rT');
  let w = bgRoom() + r.svg;
  const cx = 800, cy = 700, rr = 235, tt = (t - 15.0) % 2.3, a = pop(t, 15.2, 0.4);
  const nv = nerveWorldIn(tt);
  w += `<g transform="translate(${cx} ${cy}) scale(${f1(a)}) translate(${-cx} ${-cy})" opacity="${clamp(a)}"><circle cx="${cx}" cy="${cy}" r="${rr + 12}" fill="rgba(0,0,0,.2)" transform="translate(0 8)"/><defs><clipPath id="clT"><circle cx="${cx}" cy="${cy}" r="${rr}"/></clipPath></defs><g clip-path="url(#clT)"><g transform="translate(${cx} ${cy}) scale(0.5) translate(0 -20)">${nv}</g></g><circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#fff" stroke-width="12"/></g>`;
  // molekul obat melayang di dekat inset (setelah kata "obat bius lokal")
  for (let i = 0; i < 5; i++) { const u = clamp((t - W.obat1 - i * 0.12) / 0.5); if (u > 0) w += drugMol(cx - 150 + i * 80 + 6 * Math.sin(t * 2 + i), cy - rr - 55 + 8 * Math.cos(t * 2.3 + i), u, 1.2, 25 * i); }
  out.A += w;
  const q = clamp((t - 15.4) / 0.3); out.U += chip(['BAGAIMANA BIUS LOKAL', 'MENGHENTIKAN NYERI?'], t, 15.0, 19.15, { size: 54, bg: '#fff' }) + `<g opacity="${f1(q)}">${T('?', 580, 540 + 10 * Math.sin(t * 3), { size: 150, fill: '#D9382F' })}</g>`;
}
import { nerveWorld } from './nerve.js';
const nerveWorldIn = (tt) => nerveWorld(tt, { waves: [{ t0: 0.2, x0: 700, v: 480 }] });
export function sceneEvidence(t, out) {
  const talk = Math.max(0, Math.sin(t * 9)) * (t > 35.3 ? 1 : 0.5);
  const ra = rakaArm(t, 'netral', { yaw: 0.45, gazeX: 0.9, gazeY: 0.5, mouth: { w: 14 + 5 * talk, up: 9, lo: 9 + 14 * talk }, uid: 'rE' });
  const tc = ra.hand, tap = (t % 1.5) < 0.3 ? Math.sin(Math.PI * (t % 1.5) / 0.3) : 0, np = clamp((t - 33.4) / 0.5);
  let w = bgRoom() + ra.r.svg + patch(tc, 66, np, t) + probe(tc[0] - 4, tc[1] - 20, tap) + `<circle cx="${f1(tc[0])}" cy="${f1(tc[1])}" r="${f1(24 + 10 * tap)}" fill="none" stroke="${NK.wave}" stroke-width="6" opacity="${f1(0.25 + 0.3 * tap)}"/>`;
  // denyut dari titik sentuh memudar di batas area kebas (tidak mencapai bahu)
  for (let i = 0; i < 3; i++) { const u = clamp(((t - 33.4 + i * 0) % 1.5) / 0.9); w += (u > 0 && u < 1) ? `<circle cx="${f1(lerp(tc[0], ra.arm(0.88)[0], u * 0.7))}" cy="${f1(lerp(tc[1], ra.arm(0.88)[1], u * 0.7))}" r="16" fill="${NK.wave}" opacity="${f1((1 - u) * 0.8 * (t % 1.5 < 0.9 ? 1 : 0))}"/>` : ''; }
  out.A += w;
  const bub = ka(t, 36.1, 38.2, 0.25), hd = ra.r.at(200, 100);
  let u = chip(['AREA KECIL KEBAS'], t, 33.45, 36.0, { size: 58, bg: '#F8D3EC', fg: INK }) + chip(['TETAP SADAR'], t, 36.0, 38.3, { size: 64, bg: '#CFF5E6', fg: '#0A4A3A' });
  u += callout('area kebas', 760, 1050, tc[0] + 30, tc[1] + 30, ka(t, 34.0, 36.0, 0.25), { size: 34, col: NK.drug });
  u += `<g opacity="${f1(bub)}"><rect x="130" y="330" width="400" height="86" rx="43" fill="#fff" stroke="#9AA9B8" stroke-width="5"/>${T('Aku sadar kok.', 330, 386, { size: 40, fill: INK })}<path d="M300 416L330 462L350 416Z" fill="#fff" stroke="#9AA9B8" stroke-width="5" stroke-linejoin="round"/></g>`;
  u += tag('bisa melihat dan berbicara', 540, 1245, ka(t, 36.5, 38.3, 0.3), { size: 30, bg: '#fff' });
  out.U += u;
}
export function sceneLocal(t, out) {
  const tap = (t % 1.5) < 0.3 ? Math.sin(Math.PI * (t % 1.5) / 0.3) : 0;
  const ra = rakaArm(t, 'netral', { yaw: 0.45, gazeX: 0.9, gazeY: 0.5, uid: 'rL' }), tc = ra.hand;
  let w = bgRoom() + ra.r.svg + patch(tc, 66, 1, t);
  const g1 = ka(t, 38.9, 40.1, 0.2), g2 = ka(t, 40.1, 42.15, 0.2);
  // krim/gel di permukaan kulit
  w += tube(tc[0] + 150, tc[1] - 180, g1) + `<g opacity="${f1(g1)}"><ellipse cx="${f1(tc[0] + 6)}" cy="${f1(tc[1] - 6)}" rx="34" ry="22" fill="#F7F3E6" stroke="#D8CFB6" stroke-width="4"/>${[0, 1, 2, 3].map((i) => drugMol(tc[0] - 14 + i * 12, tc[1] + 8 + 4 * Math.sin(t * 3 + i), 0.9, 0.5, 30 * i)).join('')}</g>`;
  // suntikan kecil di sekitar area
  const push = 0.5 + 0.5 * Math.sin(t * 2.6);
  w += syr(tc[0] + 44, tc[1] - 36, 38, g2, 0.9, push) + [0, 1, 2, 3].map((i) => { const u = (t * 1.2 + i / 4) % 1; return drugMol(lerp(tc[0] + 36, tc[0] + 4, u), lerp(tc[1] - 24, tc[1] - 2, u), g2 * Math.sin(Math.PI * u), 0.55, 40 * i); }).join('') + `<g opacity="${f1(g2)}">${[0, 1, 2, 3, 4, 5].map((i) => drugMol(tc[0] + 52 * Math.cos(i * 1.05 + t), tc[1] + 52 * Math.sin(i * 1.05 + t), 0.85, 0.55, i * 50)).join('')}</g>`;
  out.A += w;
  let u = chip(['BIUS LOKAL'], t, 38.1, 42.15, { size: 70, bg: '#F8D3EC', fg: INK });
  u += tag('krim atau gel di permukaan kulit', 540, 1150, g1, { size: 30, bg: '#fff' }) + tag('suntikan di sekitar area tindakan', 540, 1150, g2, { size: 30, bg: '#fff' });
  u += tag('AREA KECIL', 760, 700, ka(t, 38.3, 42.1, 0.3), { size: 32, bg: '#F8D3EC', fg: INK });
  out.U += u;
}
export function sceneRegional(t, out) {
  const ra = rakaArm(t, 'netral', { yaw: 0.45, gazeX: 0.9, gazeY: 0.3, uid: 'rG' }), sh = ra.arm(0.08), tc = ra.hand;
  const g = seg(t, 43.2, 44.6), sy = ka(t, 42.3, 45.3, 0.25);
  let w = bgRoom();
  // area yang dilayani saraf (lengan + tangan) diberi warna lebih luas
  let d = ra.dots.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
  w += ra.r.svg + `<path d="${d}" fill="none" stroke="${NK.drug}" stroke-width="86" stroke-linecap="round" opacity="${f1(0.22 * seg(t, 44.0, 45.3))}"/><circle cx="${f1(tc[0])}" cy="${f1(tc[1])}" r="52" fill="${NK.drug}" opacity="${f1(0.22 * seg(t, 44.0, 45.3))}"/>`;
  // saraf utama yang melayani lengan (garis ungu putus-putus dari leher/bahu ke tangan) dan suntikan di dekat saraf itu
  w += `<path d="${d}" fill="none" stroke="${NK.mem}" stroke-width="12" stroke-dasharray="4 18" stroke-dashoffset="${f1(-t * 40)}" stroke-linecap="round" opacity="${f1(g)}"/>` + [0, 1, 2, 3, 4].map((i) => { const u = ((t - 43.4) * 0.3 + i / 5) % 1, p = ra.arm(clamp(u)); return t > 43.4 ? drugMol(p[0], p[1], Math.sin(Math.PI * u) * g, 0.6, 50 * i) : ''; }).join('') + syr(sh[0] - 20, sh[1] - 70, 28, sy, 0.95, 0.5 + 0.5 * Math.sin(t * 2.4)) + `<g opacity="${f1(sy)}">${[0, 1, 2, 3].map((i) => drugMol(sh[0] - 10 + 40 * Math.cos(i * 1.6 + t * 1.3), sh[1] - 60 + 36 * Math.sin(i * 1.6 + t * 1.3), 0.9, 0.6, i * 60)).join('')}</g>`;
  out.A += w;
  let u = chip(['AREA LEBIH LUAS'], t, 42.2, 45.75, { size: 62, bg: '#F8D3EC', fg: INK }) + chip(['BIUS REGIONAL'], t, 45.75, 48.65, { size: 66, bg: '#F8D3EC', fg: INK });
  u += callout('saraf yang melayani lengan', 800, 960, ra.arm(0.5)[0] + 20, ra.arm(0.5)[1] + 20, ka(t, 43.4, 45.75, 0.25), { size: 30, col: NK.mem });
  u += tag('area lebih luas kebas', 700, 1180, seg(t, 44.8, 45.3) * ka(t, 44.4, 48.6, 0.3), { size: 30, bg: '#fff' }) + tag('lokasi pemberian dan cakupan blok berbeda', 540, 1250, ka(t, 46.4, 48.6, 0.3), { size: 26, bg: '#fff' });
  out.U += u;
}
export function sceneTotal(t, out) {
  const k = 1.08, cx = 540, by = 870;
  const st = raka('pingsan', 'berbaring', {});
  const lyw = 800 * k, lyh = 440 * k;
  const inner = rakaSvg(st, { bare: true, uid: 'rTot', shadow: false, rebah: true, rebahTilt: -4 });
  let w = bgRoom();
  // tempat tidur
  w += `<rect x="70" y="${by + lyh * 0.62}" width="940" height="70" rx="30" fill="#8FA6BF"/><rect x="100" y="${by + lyh * 0.62 + 66}" width="30" height="170" rx="10" fill="#6E86A3"/><rect x="950" y="${by + lyh * 0.62 + 66}" width="30" height="170" rx="10" fill="#6E86A3"/><rect x="70" y="${by + lyh * 0.5}" width="940" height="60" rx="26" fill="#DCE7F2"/>`;
  w += `<g transform="translate(${cx - lyw / 2} ${f1(by - 10 + lyh * 0.55 * (1 - (1 + 0.012 * Math.sin(t * 1.6))))}) scale(${k} ${f1(k * (1 + 0.012 * Math.sin(t * 1.6)) * 1000) / 1000})">${inner}</g>`;
  // monitor pemantauan (garis hijau bergerak) dan tenaga anestesi (ikon sederhana)
  const mx = 850, my = 450, mon = ka(t, 51.0, 54.3, 0.3) * 0 + 1;
  let ecg = ''; for (let x = 0; x <= 200; x += 5) { const ph = ((x - t * 90) % 120 + 120) % 120, y = ph < 60 ? 0 : (ph < 70 ? -46 : (ph < 76 ? 40 : 0)); ecg += `${x ? 'L' : 'M'}${f1(mx - 100 + x)} ${f1(my + 70 - y * 0.8)}`; }
  w += `<g opacity="${f1(ka(t, 48.8, 54.3, 0.3))}"><rect x="${mx - 140}" y="${my - 20}" width="280" height="200" rx="26" fill="#1A2A3A" stroke="#9AA9B8" stroke-width="8"/><path d="${ecg}" fill="none" stroke="#3CE8A0" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${mx - 100}" cy="${my + 140}" r="9" fill="#3CE8A0"/><rect x="${mx - 70}" y="${my + 134}" width="120" height="12" rx="6" fill="#5C7A96"/></g>`;
  const sx = 160, sy = 560, sa = ka(t, 52.9, 54.3, 0.3);
  w += `<g opacity="${f1(sa)}"><circle cx="${sx}" cy="${sy}" r="70" fill="#F7BC8E" stroke="#E2A06E" stroke-width="5"/><path d="M${sx - 72} ${sy - 12}A72 72 0 0 1 ${sx + 72} ${sy - 12}L${sx + 72} ${sy - 36}A72 58 0 0 0 ${sx - 72} ${sy - 36}Z" fill="#3FA8D6"/><rect x="${sx - 42}" y="${sy + 10}" width="84" height="40" rx="18" fill="#E9F4FA" stroke="#9AA9B8" stroke-width="4"/><circle cx="${sx - 24}" cy="${sy - 14}" r="6" fill="#172B38"/><circle cx="${sx + 24}" cy="${sy - 14}" r="6" fill="#172B38"/><rect x="${sx - 62}" y="${sy + 78}" width="124" height="130" rx="40" fill="#3FA8D6"/></g>`;
  // otak: sistem saraf pusat menyala ungu (obat bekerja di sini)
  const bx = 480, byy = 610, bl = ka(t, 50.0, 54.3, 0.3);
  w += `<g opacity="${f1(bl)}" transform="translate(${bx} ${byy}) scale(0.92)"><circle cx="0" cy="0" r="${f1(210 + 22 * Math.sin(t * 3))}" fill="${NK.drug}" opacity="${f1(0.22 * seg(t, 50.2, 51.2))}"/><circle cx="0" cy="0" r="${f1(150 + 90 * ((t * 0.6) % 1))}" fill="none" stroke="${NK.drug}" stroke-width="6" opacity="${f1(0.5 * (1 - (t * 0.6) % 1) * seg(t, 50.2, 51.2))}"/><path d="M-150 20C-170 -90 -80 -170 30 -165C140 -160 190 -80 170 10C150 80 80 110 20 100L-20 100C-100 100 -140 80 -150 20Z" fill="${mixc('#F4B8C1', '#E9A0D0', seg(t, 50.2, 51.4))}" stroke="#D98B99" stroke-width="6" stroke-linejoin="round"/><path d="M-90 -90C-40 -130 40 -140 100 -100M-120 -20C-60 -60 20 -70 80 -30M-30 10C20 -20 80 -10 120 30" fill="none" stroke="#E69AA7" stroke-width="7" stroke-linecap="round"/><path d="M10 96L40 96L50 210L22 210Z" fill="#EDA8B3" stroke="#D98B99" stroke-width="6"/>${[0, 1, 2, 3, 4, 5].map((i) => drugMol(-110 + 44 * i + 26 * Math.sin(t * 2.4 + i), -80 + 60 * Math.cos(t * 1.9 + i * 1.3), seg(t, 50.4, 51.2), 0.8, i * 50)).join('')}</g>`;
  out.A += w;
  let u = chip(['BIUS TOTAL'], t, 48.5, 50.0, { size: 70, bg: '#F8D3EC', fg: INK }) + chip(['SISTEM SARAF', 'PUSAT'], t, 50.0, 52.3, { size: 58, bg: '#F8D3EC', fg: INK }) + chip(['TIDAK SADAR'], t, 52.3, 54.25, { size: 66, bg: '#E7DDFF', fg: INK });
  u += tag('dipantau tenaga anestesi', 540, 1270, ka(t, 52.9, 54.25, 0.3), { size: 30, bg: '#fff' });
  out.U += u;
}
const icon = (i, x, y, t) => {
  if (i === 0) return `<g transform="translate(${x} ${y})"><circle r="44" fill="${NK.drug}" opacity="${f1(0.18 + 0.1 * Math.sin(t * 3))}"/><circle r="44" fill="none" stroke="${NK.drug}" stroke-width="7" stroke-dasharray="16 11" transform="rotate(${f1(t * 40)})"/></g>`;
  if (i === 1) return `<g transform="translate(${x} ${y})"><path d="M-62 28Q-10 -50 62 -18" fill="none" stroke="${NK.drug}" stroke-width="${f1(40 + 8 * Math.sin(t * 3))}" stroke-linecap="round" opacity=".35"/><path d="M-62 28Q-10 -50 62 -18" fill="none" stroke="${NK.mem}" stroke-width="9" stroke-dasharray="3 16" stroke-dashoffset="${f1(-t * 36)}" stroke-linecap="round"/></g>`;
  return `<g transform="translate(${x} ${y}) scale(.34)"><circle r="${f1(150 + 20 * Math.sin(t * 3))}" fill="${NK.drug}" opacity=".22"/><path d="M-150 20C-170 -90 -80 -170 30 -165C140 -160 190 -80 170 10C150 80 80 110 20 100L-20 100C-100 100 -140 80 -150 20Z" fill="#E9A0D0" stroke="#D98B99" stroke-width="10"/></g>`;
};
export function sceneSummary(t, out) {
  const rows = [['BIUS LOKAL', 'area kecil', 'tetap sadar', '#F8D3EC', 54.0], ['BIUS REGIONAL', 'area yang dilayani saraf', 'tetap sadar', '#F8D3EC', 54.55], ['BIUS TOTAL', 'sistem saraf pusat', 'tidak sadar', '#E7DDFF', 55.1]];
  let w = bgRoom(), u = chip(['PERBEDAAN INTI'], t, 54.0, 59.55, { size: 62, bg: '#fff' });
  const ca = pop(t, 56.4, 0.35), cb = pop(t, 57.7, 0.35);
  u += tag('AREA KERJA', 420, 400, clamp(ca), { size: 30, bg: '#F8D3EC', fg: INK }) + tag('KESADARAN', 830, 400, clamp(cb), { size: 30, bg: '#CFF5E6', fg: '#0A4A3A' });
  rows.forEach(([ttl, area, sad, col, t0], i) => {
    const p = pop(t, t0, 0.4), y = 470 + i * 250; if (p < 0.01) return;
    const hl = (i === 0 && t > 56.4 && t < 57.0) ? 1 : 0;
    u += `<g opacity="${f1(clamp(p))}" transform="translate(0 ${f1(7 * Math.sin(t * 2.2 + i * 1.3))}) translate(540 ${y + 100}) scale(${f1(Math.min(1.03, p) * (1 + 0.012 * Math.sin(t * 2.2 + i * 1.3)))}) translate(-540 ${-(y + 100)})"><rect x="46" y="${y + 6}" width="988" height="206" rx="38" fill="rgba(0,0,0,.18)"/><rect x="40" y="${y}" width="988" height="206" rx="38" fill="#fff" stroke="${col}" stroke-width="8"/>${T(ttl, 70, y + 62, { size: 46, anchor: 'start', fill: INK })}<g opacity="${f1(clamp(ca))}">${T(area, 70, y + 130, { size: 40, anchor: 'start', fill: '#8F1F66', w: 700 })}</g><g opacity="${f1(clamp(cb))}">${T(sad, 70, y + 184, { size: 40, anchor: 'start', fill: sad === 'tidak sadar' ? '#4B3AA8' : '#0A4A3A', w: 800 })}</g>${icon(i, 900, y + 100, t)}</g>`;
  });
  out.A += w; out.U += u;
}
import { rakaSvg } from '../../../brand/characters/raka/raka.js';
