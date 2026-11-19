// Adegan 1 - 4 (hook, struktur, pemuaian, penyempitan, atur ulang). frame(t) di bawah menggabungkan semua adegan (scenes2.js: perbandingan, ringkasan, outro).
import { f1, clamp, lerp, R, C, P, T, G as GG, INK, GOLD, MC, FONT, FOREST, seg, win, eo, eio, sm, pill, pop, rndf, tw, track } from './lib.js';
import { raka, rakaSvg, lerpState, rIdle, solveArm } from './raka.js';
import { G, sim, xOfT, TIP_HOLD } from './physics.js';
import { thermo } from './thermo.js';
import * as TL from './timeline.js';
export const A = TL.A, OFF = TL.OFF;
const U0 = [G.bx, G.by];
// ================================================================ pembantu UI
export const camT = (cx, cy, z, sy = 880) => `translate(${f1(540 - cx * z)} ${f1(sy - cy * z)}) scale(${f1(z * 1000) / 1000})`;
export const proj = (cam, x, y) => [540 + (x - cam.cx) * cam.z, (cam.sy ?? 880) + (y - cam.cy) * cam.z];
export const gOp = (svg, a) => `<g opacity="${f1(clamp(a) * 100) / 100}">${svg}</g>`;
export const kw = (tn, t0, t1, f = 0.22) => clamp((tn - t0) / f) * clamp((t1 - tn) / f);
export function leader(x0, y0, x1, y1, col = GOLD, a = 1) {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${INK}" stroke-width="9" opacity=".5" stroke-linecap="round"/><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>${C(x1, y1, 10, col, `stroke="${INK}" stroke-width="3"`)}</g>`;
}
export const pillAt = (tn, t0, t1, lines, y, o = {}) => { const k = kw(tn, t0, t1, 0.3); return k > 0.01 ? pill(lines, o.cx ?? 540, y + (1 - eo(clamp((tn - t0) / 0.35))) * -44, { a: k, size: o.size ?? 52, bg: o.bg, fg: o.fg }) : ''; };
const wrap = (s, size, maxW) => { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
/** takarir bawah (teks naskah apa adanya) */
export function captions(tn) {
  const c = TL.KAL.find((k) => tn >= k.t0 - 0.02 && tn <= k.t1 + 0.12); if (!c) return '';
  const size = 50, lines = wrap(c.text, size, 830), a = clamp((tn - c.t0 + 0.02) / 0.15) * clamp((c.t1 + 0.12 - tn) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30, y = 1300;
  return `<g opacity="${f1(a * 100) / 100}">${R(100, y + 6, 880, h, 'rgba(0,0,0,.28)', 34)}${R(100, y, 880, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
// ================================================================ HOOK: Raka mengangkat termometer dari area kontak tubuh
const RK = { x: 770, top: 370, s: 1.45 }, ST = 0.36, ZC = [300, 1130];
const loc = (x, y) => [(x - (RK.x - 200 * RK.s)) / RK.s, (y - RK.top) / RK.s];
const hookPose = (tn) => {      // posisi bulb termometer (dunia) dan sudut
  const k = sm((tn + 0.35) / 2.15);
  return { x: lerp(ZC[0], 470, k), y: lerp(ZC[1], 975, k), th: lerp(0, -4, k) };
};
const thermoXf = (p, s, th) => `translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(th)}) scale(${s}) translate(${-U0[0]} ${-U0[1]})`;
const gripLocal = [600, 900];       // titik genggam pada tabung (koordinat penampang)
const gripWorld = (p, s, th) => { const dx = (gripLocal[0] - U0[0]) * s, dy = (gripLocal[1] - U0[1]) * s, a = th * Math.PI / 180; return [p.x + dx * Math.cos(a) - dy * Math.sin(a), p.y + dx * Math.sin(a) + dy * Math.cos(a)]; };
function zoneSvg(k, tn) {     // area kontak tubuh (generik, bukan karakter): bentuk organik hangat
  const glow = 0.5 + 0.5 * Math.sin(tn * 3);
  return `<g transform="translate(${ZC[0]} ${ZC[1]})"><ellipse rx="${f1(190 + 16 * glow * k)}" ry="${f1(130 + 12 * glow * k)}" fill="url(#zg)" opacity="${f1(0.9 * k)}"/><path d="M-150 -30C-135 -100 -30 -122 56 -100C140 -78 172 -14 146 50C122 106 28 124 -64 106C-136 90 -162 30 -150 -30Z" fill="#F3B48D" stroke="#C98862" stroke-width="7"/><path d="M-100 -62C-70 -86 0 -92 52 -72" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".28"/><text x="-4" y="86" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="34" fill="#7A3E24">tubuh</text></g>`;
}
function sceneHook(tn) {
  const p = hookPose(tn), th = p.th, S = sim(tn), grip = gripWorld(p, ST, th);
  // Raka: kepala miring, melihat termometer; lengan kiri (di layar) memegang tabung
  const k = seg(tn, 1.2, 2.2);
  let st = raka('berpikir', 'netral', { yaw: lerp(0.0, -0.3, k), tilt: lerp(0, 9, k), gazeX: -0.5, gazeY: 0.55 });
  st.armL = solveArm(st, 'L', loc(grip[0] + 6, grip[1] + 8), { len: 235, finger: 0, front: 1, bend: 1 });
  st = rIdle(st, tn);
  const cool = sm((tn - 0.5) / 2.2);
  const rk = `<g transform="translate(${f1(RK.x - 200 * RK.s)} ${f1(RK.top)}) scale(${RK.s})">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkH', dark: true })}</g>`;
  const tmark = `<g transform="${thermoXf(p, ST, th)}">${thermo(S, { detail: 0, t: tn, glare: 0.5 })}</g>`;
  // marka "angka tetap": garis putus-putus di ujung kolom
  const tipW = (() => { const a = th * Math.PI / 180, dx = (S.tip - U0[0]) * ST, dy = 0; return [p.x + dx * Math.cos(a), p.y + dx * Math.sin(a)]; })();
  const kk = seg(tn, 1.8, 2.4) * (tn < A.pertama - 0.4 ? 1 : 0);
  const mark = `<g opacity="${f1(kk * 100) / 100}"><path d="M${f1(tipW[0])} ${f1(tipW[1] - 60)}V${f1(tipW[1] - 18)}" stroke="${GOLD}" stroke-width="5" stroke-dasharray="3 8" stroke-linecap="round"/><path d="M${f1(tipW[0] - 14)} ${f1(tipW[1] - 74)}L${f1(tipW[0])} ${f1(tipW[1] - 56)}L${f1(tipW[0] + 14)} ${f1(tipW[1] - 74)}Z" fill="${GOLD}" stroke="${INK}" stroke-width="3"/></g>`;
  // udara sekitar mendingin (biru): selubung + garis sejuk melayang
  let wisps = ''; for (let i = 0; i < 5; i++) { const ph = (tn * 0.4 + i * 0.21) % 1, x = 300 + i * 120, y = 860 - ph * 140; wisps += `<path d="M${f1(x)} ${f1(y)}q14 -22 0 -44t0 -44" fill="none" stroke="#9FD6F2" stroke-width="7" stroke-linecap="round" opacity="${f1(0.55 * cool * Math.sin(ph * Math.PI))}"/>`; }
  const defs = `<defs><radialGradient id="zg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFC27A" stop-opacity=".95"/><stop offset=".6" stop-color="#F8704F" stop-opacity=".35"/><stop offset="1" stop-color="#F8704F" stop-opacity="0"/></radialGradient><linearGradient id="hgA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#103F4A"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>`;
  const bg = `${R(-800, -600, 3000, 3800, 'url(#hgA)')}<ellipse cx="540" cy="900" rx="620" ry="520" fill="#1B6B8A" opacity="${f1(0.25 * cool * 100) / 100}"/>`;
  const table = `${R(-300, 1275, 1700, 900, '#7C5B3C')}${R(-300, 1275, 1700, 26, '#A67C52')}`;
  return { svg: `${defs}${bg}${zoneSvg(1 - cool * 0.6, tn)}${rk}${table}${wisps}${tmark}${mark}`, bulb: p, grip };
}
// kamera hook: dari close-up tangan + termometer -> Raka dan area kontak -> close-up ujung kolom
const camHook = track([[0, 440, 1080, 3.0], [0.9, 450, 1050, 2.7], [2.4, 560, 920, 1.45], [3.9, 560, 920, 1.45], [4.9, 575, 980, 2.3], [A.pertama - 0.55, 575, 980, 2.3]]);

// ================================================================ DUNIA TERMOMETER (B): tampilan luar -> penampang
const W = [[A.pertama - 0.6, 548, 900, 0.95], [A.wadah - 1.0, 548, 900, 1.0], [A.wadah + 0.4, 420, 900, 1.35], [A.panas - 0.7, 330, 900, 1.2],
  [A.naik + 1.0, 330, 900, 1.2], [A.semakinTinggi - 0.2, 330, 900, 1.2], [A.semakinTinggi + 0.8, 548, 900, 1.0], [A.angkaKaca + 0.4, 548, 900, 1.08], [A.satuBagian + 0.5, 410, 900, 1.45], [A.penyempitan + 0.9, 300, 900, 3.4],
  [A.membaca - 0.2, 300, 900, 3.4], [A.membaca + 0.9, 548, 900, 1.0], [A.diatur, 548, 900, 1.0], [A.digital - 0.2, 548, 900, 1.0]];
const camBase = track(W);
export const camB = (tn) => { const [cx, cy, z] = camBase(tn); const S = sim(tn); let cx2 = cx, z2 = z; if (S.mode === 'heat' && tn > A.memuai && tn < A.semakinTinggi + 0.7) { const u = clamp((S.tip - G.capX0) / (TIP_HOLD - G.capX0)); const w = sm(clamp((tn - A.memuai) / 1.5)) * (1 - sm(clamp((tn - (A.semakinTinggi - 0.2)) / 0.9))); cx2 = lerp(cx, Math.max(330, S.tip - 130), w * u); z2 = lerp(z, 1.55, w * u); } return [cx2, cy, z2]; };
function warmZoneB(S) {     // area kontak tubuh di sisi kiri wadah; menempel saat dipanaskan
  if (S.zone < 0.01) return '';
  const dx = lerp(-170, 0, sm(S.zone));
  let arrows = '';
  for (let i = 0; i < 3; i++) { const y = 872 + i * 28, ph = (performance_t() * 0.9 + i * 0.33) % 1; arrows += `<g opacity="${f1(S.zone * 0.9 * 100) / 100}" transform="translate(${f1(20 + ph * 40)} ${y})"><path d="M0 0H44M32 -11L44 0L32 11" stroke="#FF7A45" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`; }
  return `<g opacity="${f1(clamp(S.zone * 1.4) * 100) / 100}"><g transform="translate(${f1(dx)} 0)"><path d="M-300 770C-220 745 -40 765 36 825C84 865 84 935 36 975C-40 1035 -220 1055 -300 1030Z" fill="#F3B48D" stroke="#C98862" stroke-width="8"/><path d="M-230 800C-170 782 -90 792 -30 830" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".3"/><text x="-110" y="1005" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="34" fill="#7A3E24">tubuh</text></g></g>${arrows}`;
}
let _pt = 0; const performance_t = () => _pt;
function ghostCol(tn) {
  const k = kw(tn, A.semakinTinggi + 0.2, A.angkaKaca + 0.4, 0.35); if (k < 0.01) return '';
  const x1 = xOfT(39.5), x0 = xOfT(37.6);
  return `<g opacity="${f1(k * 100) / 100}"><path d="M${x0} ${G.y}H${x1}" stroke="#E8F6FA" stroke-width="11" stroke-dasharray="3 14" stroke-linecap="round"/><circle cx="${x1}" cy="${G.y}" r="9" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M${x1 + 2} ${G.y + 42}l0 -26M${x1 - 10} ${G.y + 28}l12 -14l12 14" stroke="${GOLD}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
function sceneB(tn) {
  _pt = tn;
  const S = sim(tn), detail = seg(tn, A.wadah - 0.8, A.wadah + 0.9), roll = clamp((tn - (A.pertama - 0.2)) / Math.max(0.1, (A.wadah - 0.8) - (A.pertama - 0.2)));
  const glare = tn < A.wadah ? (0.1 + 0.9 * roll) : null;
  // tabung berputar pelan sebelum masuk penampang: kemiringan kecil + kilau menyapu
  const rot = tn < A.wadah ? Math.sin(roll * Math.PI * 2) * 3.2 * (1 - detail) : 0;
  let s = `<g transform="rotate(${f1(rot)} 548 900)">${warmZoneB(S)}${ghostCol(tn)}${thermo(S, { detail, t: tn, glare })}</g>`;
  const kf = kw(tn, A.penyempitan + 0.1, A.dilepas - 0.2, 0.3) * (S.mode === 'heat' ? 1 : 0);
  if (kf > 0.01) { let f = ''; for (let i = 0; i < 6; i++) { const ph = (tn * 0.7 + i / 6) % 1, x = 215 + ph * 150; f += `<circle cx="${f1(x)}" cy="${G.y}" r="${f1(4 + 2 * Math.sin(ph * Math.PI))}" fill="#E8F0F4" stroke="#5B6B77" stroke-width="1.5" opacity="${f1(kf * Math.sin(ph * Math.PI))}"/>`; } s += `<g>${f}<path d="M215 ${G.y - 26}H300M284 ${G.y - 36}L300 ${G.y - 26}L284 ${G.y - 16}" stroke="${GOLD}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(kf)}"/></g>`; }
  return { svg: s, S, detail };
}
function uiB(tn, cam) {
  let u = '';
  const p = (x, y) => proj(cam, x, y), S = sim(tn);
  const tag = kw(tn, A.pertama - 0.3, A.panas - 0.3, 0.3);
  if (tag > 0.01) u += pill(['Dari awal: belum dipakai'], 540, 345, { a: tag, size: 34, bg: GOLD, fg: INK });
  // merkuri: logam cair (tetesan perak)
  const km = kw(tn, A.merkuri - 0.1, A.wadah - 0.3, 0.3);
  if (km > 0.01) {
    const wob = Math.sin(tn * 5) * 4;
    u += `<g opacity="${f1(km * 100) / 100}" transform="translate(800 520)"><path d="M0 -70C34 -30 54 -4 50 24C44 62 14 78 -4 76C-34 72 -52 44 -48 14C-44 -14 -24 -34 0 -70Z" fill="#B9C7D0" stroke="${INK}" stroke-width="6" transform="scale(${f1(1 + wob / 60)} ${f1(1 - wob / 60)})"/><path d="M-18 -4C-16 -22 -2 -34 8 -40" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".8"/>${T('Hg', 0, 40, { size: 36, fill: INK })}${pill(['merkuri: logam cair', 'pada suhu ruang'], 0, 108, { size: 34 })}</g>`;
  }
  // label wadah dan saluran
  const kb = kw(tn, A.wadah, A.panas - 0.3, 0.25), kc = kw(tn, A.saluran, A.panas - 0.3, 0.25);
  const bulb = p(170, 860), cap = p(560, 893);
  if (kb > 0.01) { u += leader(bulb[0], bulb[1] - 20, 260, 560, '#FFB47A', kb); u += pill(['wadah merkuri'], 260, 500, { a: kb, size: 44, bg: '#fff' }); }
  if (kc > 0.01) { u += leader(cap[0], cap[1] - 10, 800, 680, GOLD, kc); u += pill(['saluran sempit'], 790, 620, { a: kc, size: 44, bg: '#fff' }); }
  // rantai sebab-akibat (pemanasan): Panas -> merkuri memuai -> kolom naik
  const chain = [[A.panas, 'PANAS', '#F8704F', '#fff'], [A.memuai, 'MERKURI MEMUAI', GOLD, INK], [A.naik, 'KOLOM NAIK', '#00A383', '#fff']], cEnd = A.angkaKaca - 0.1;
  let xx = 30;
  chain.forEach(([t0, txt, bg, fg], i) => { const k = kw(tn, t0, cEnd, 0.28), w = tw(txt, 40) + 56; if (k > 0.01) { u += `<g opacity="${f1(k * 100) / 100}" transform="translate(${f1(xx)} ${f1(250 + (1 - eo(clamp((tn - t0) / 0.3))) * -40)})">${R(0, 8, w, 80, 'rgba(0,0,0,.28)', 40)}${R(0, 0, w, 80, bg, 40)}${T(txt, w / 2, 56, { size: 40, fill: fg })}${i < 2 ? T('→', w + 22, 58, { size: 48, fill: '#fff' }) : ''}</g>`; } xx += w + 46; });
  // volume bertambah (panah mengembang di wadah)
  const kv = kw(tn, A.volume, A.mendorong + 1.2, 0.3);
  if (kv > 0.01) { const b = p(170, 900), r = 120 + Math.sin(tn * 6) * 10; u += `<g opacity="${f1(kv * 0.9 * 100) / 100}">${[0, 90, 180, 270].map((a) => `<path transform="translate(${f1(b[0])} ${f1(b[1])}) rotate(${a}) translate(${f1(r * cam.z * 0.4)} 0)" d="M0 0h36M24 -10l12 10l-12 10" stroke="${GOLD}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>`; u += pill(['volume bertambah'], 300, 1090, { a: kv, size: 40, bg: GOLD, fg: INK }); }
  // ghost: suhu lebih tinggi -> garis lebih jauh
  const kg = kw(tn, A.semakinTinggi + 0.2, A.angkaKaca + 0.3, 0.3);
  if (kg > 0.01) u += pill(['suhu lebih tinggi', '→ garis lebih jauh'], 540, 560, { a: kg, size: 42, bg: '#fff' });
  // angka = posisi ujung garis
  const ka = kw(tn, A.angkaKaca, A.satuBagian + 0.2, 0.3), tipS = p(S.tip, 900);
  if (ka > 0.01) { u += leader(tipS[0], tipS[1] - 40, clamp(tipS[0], 160, 920), 640, GOLD, ka); u += pill(['angka = posisi', 'ujung garis'], clamp(tipS[0], 220, 860), 560, { a: ka, size: 40, bg: '#fff' }); }
  // penyempitan di atas wadah
  const kn = kw(tn, A.penyempitan, A.dilepas + 0.2, 0.25), neck = p(G.neckX, 900);
  if (kn > 0.01) { u += leader(neck[0], neck[1] - 34, 540, 560, '#FF8A7A', kn); u += pill(['penyempitan saluran'], 540, 500, { a: kn, size: 44, bg: '#FF8A7A', fg: '#fff' }); }
  u += pillAt(tn, A.satuBagian, A.penyempitan, ['Bagian kecil yang', 'menahan hasil'], 250, { bg: '#fff' });
  const kfl = kw(tn, A.penyempitan + 0.4, A.dilepas - 0.2, 0.3); if (kfl > 0.01 && S.mode === 'heat') u += pill(['saat hangat, merkuri', 'masih terdorong lewat'], 540, 250, { a: kfl, size: 44, bg: '#fff' });
  // dilepas: wadah dingin (meter suhu wadah) + kolom tertahan + celah
  const kd = kw(tn, A.dilepas, A.membaca + 0.6, 0.3);
  if (kd > 0.01) {
    const h = clamp((S.Tb - 31) / 6.6), col = h > 0.5 ? '#F8704F' : '#7FC0D2';
    u += `<g opacity="${f1(kd * 100) / 100}">${R(36, 640, 92, 380, 'rgba(8,18,30,.92)', 26)}${R(60, 664, 44, 300, 'rgba(255,255,255,.1)', 14)}${R(60, 664 + 300 * (1 - h), 44, 300 * h, col, 14)}${T('wadah', 82, 1000, { size: 26, fill: '#fff' })}${T(h > 0.5 ? 'panas' : 'dingin', 82, 1030, { size: 24, fill: '#CFE8E2', w: 700 })}</g>`;
    u += pillAt(tn, A.dilepas, A.menahan, ['dilepas → wadah mendingin'], 250, { bg: '#fff', size: 46 });
  }
  const kh = kw(tn, A.menahan, A.membaca, 0.3);
  if (kh > 0.01) { u += pill(['kolom tertahan,', 'merkuri di wadah menyusut'], 540, 250, { a: kh, size: 46, bg: '#00A383', fg: '#fff' }); const gx = p(G.neckX - 10 - S.gap * 0.25, 900); u += leader(gx[0], gx[1] + 36, 540, 1130, '#FFE08A', kh * clamp(S.gap / 20)); u += pill(['putus di penyempitan'], 540, 1100, { a: kh * clamp(S.gap / 20), size: 38, bg: '#FFE08A', fg: INK }); }
  const kr = kw(tn, A.membaca, A.diatur - 0.2, 0.3);
  if (kr > 0.01) { u += leader(tipS[0], tipS[1] - 40, clamp(tipS[0], 200, 880), 600, GOLD, kr); u += pill(['suhu tertinggi tetap', 'bisa dibaca: 37,6 °C'], clamp(tipS[0], 300, 800), 500, { a: kr, size: 42, bg: '#fff' }); }
  // atur ulang
  const kt = kw(tn, A.diatur, A.digital - 0.3, 0.3);
  if (kt > 0.01) { u += pill(['Perlu diatur ulang'], 540, 250, { a: kt, size: 54, bg: GOLD, fg: INK }); u += T('ilustrasi alat historis', 540, 1130, { size: 30, fill: '#CFE8E2', w: 700, e: `opacity="${f1(kt * 100) / 100}"` }); u += `<g opacity="${f1(kt * 0.9 * 100) / 100}">${(() => { const a = p(xOfT(37.6) - 40, 900); return `<path d="M${f1(a[0])} ${f1(a[1] + 70)}H${f1(a[0] - 150)}M${f1(a[0] - 134)} ${f1(a[1] + 58)}L${f1(a[0] - 150)} ${f1(a[1] + 70)}L${f1(a[0] - 134)} ${f1(a[1] + 82)}" stroke="${GOLD}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; })()}</g>`; }
  return u;
}

// ================================================================ komposisi per bingkai
import * as S2 from './scenes2.js';
const bgB = `<defs><linearGradient id="bgb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E3A45"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#bgb)')}`;
export async function frame(t) {
  const tn = t - OFF; let A_ = '', B = '', U = '', web = null;
  const E = TL.EDU_END;
  if (tn < A.pertama - 0.05) {
    const h = sceneHook(tn), [cx, cy, z] = camHook(tn), a = 1 - seg(tn, A.pertama - 0.45, A.pertama - 0.05);
    A_ += gOp(`<g transform="${camT(cx, cy, z)}">${h.svg}</g>`, a);
    const kPill = kw(tn, 1.0, A.pertama - 0.3, 0.35);
    if (kPill > 0.01) U += pill(['SUDAH DILEPAS,', 'KOK ANGKANYA TETAP?'], 540, 250 + (1 - eo(clamp((tn - 1.0) / 0.4))) * -40, { a: kPill, size: 54, bg: '#D9382F', fg: '#fff' });
  }
  if (tn >= A.pertama - 0.65 && tn < A.digital + 0.3) {
    const [cx, cy, z] = camB(tn), a = seg(tn, A.pertama - 0.6, A.pertama - 0.1) * (1 - seg(tn, A.digital - 0.2, A.digital + 0.25)), cam = { cx, cy, z, sy: 880 };
    const b = sceneB(tn);
    B += gOp(`${bgB}<g transform="${camT(cx, cy, z)}">${b.svg}</g>`, a);
    U += gOp(uiB(tn, cam), a);
  }
  if (tn >= A.digital - 0.35 && tn < A.jadi) { const o = S2.sceneCompare(tn); A_ += o.A; U += o.U; }
  if (tn >= A.jadi - 0.35 && tn < E + 0.5) { const o = S2.sceneSummary(tn); A_ += o.A; U += o.U; }
  if (tn < E + 0.2) U += captions(tn);
  if (t >= TL.O0 - 0.25) {
    const o = S2.outroState(t), ui = S2.outroUI(t), a = seg(t, TL.O0 - 0.25, TL.O0 + 0.05);
    A_ = t < TL.O0 + 0.1 ? gOp(A_, 1 - a) : '';
    B = ''; U = (t < TL.O0 + 0.05 ? gOp(U, 1 - a) : '') + ui.u;
    A_ = ui.bg + A_;
    web = { frame: o.frame, rect: o.rect, a };
  }
  return { A: A_, B, U, web };
}

// ================================================================ sampul vertikal (?cover=1)
export function coverFrame() {
  const S = sim(A.membaca + 0.5), z = 1.0, cx = 560, cy = 900, sy = 1010;
  const B = `${bgB}<g transform="${camT(cx, cy, z, sy)}">${thermo(S, { detail: 1, t: 1, heatShow: false })}</g>`;
  let U = `${R(80, 250, 920, 330, 'rgba(0,0,0,.28)', 44)}${R(70, 240, 920, 330, '#fff', 44)}${T('Kenapa angka termometer', 530, 350, { size: 70, fill: FOREST })}${T('air raksa tidak', 530, 440, { size: 76, fill: FOREST })}${T('langsung turun?', 530, 535, { size: 88, fill: '#D9382F' })}`;
  U += pill(['wadah memuai → kolom naik → tertahan'], 540, 640, { size: 36, bg: GOLD, fg: INK });
  U += `${R(150, 1440, 780, 120, GOLD, 60)}${T('belajar FK gratis di medcoel.com', 540, 1518, { size: 46, fill: INK })}`;
  return { B, U };
}
