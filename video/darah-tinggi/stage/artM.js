// Ilustrasi medis (buatan, skema 2D; skala partikel sengaja tidak nyata) untuk "Lemak jenuh, LDL, dan plak arteri".
// Penampang arteri: lumen, endotel, intima, media (otot polos), adventitia. LDL = partikel lipoprotein (kulit fosfolipid + apoB-100, inti kolesterol ester).
// Plak aterosklerotik: inti lipid (sel busa), tudung fibrosa; pecah -> trombosit + fibrin + eritrosit membentuk trombus di atasnya.
import { R, C, E, P, L, T, f1, clamp, COL } from './art.js';

export const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const SEED = (n) => { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
export const MC = { blood: '#B8322A', bloodLt: '#D9483D', endo: '#F2A6A0', intima: '#FBDDD8', media: '#C96B6B', mediaDk: '#A94F50', adv: '#F5E3C8', advDk: '#D9BE96', core: '#F2D04A', coreDk: '#D4AC1E', cap: '#FDEBD0', ldl: '#F5B027', ldlCore: '#FFE08A', oxldl: '#B7791F', mono: '#9CC9E8', monoNuc: '#4C6E8C', foam: '#F8E187', plt: '#8E5BBF', fib: '#D9C2EC', ink: '#172B38' };
const pt = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
const poly = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';

// ---------------------------------------------------------------- partikel dan sel
export const rbc = (x, y, r = 18, rot = 0, a = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${a}">${E(0, 0, r, r * 0.78, '#C9382E')}${E(0, 0, r * 0.5, r * 0.34, '#A82A22')}</g>`;
// LDL: kulit fosfolipid + apoB-100 (garis gelap), inti kolesterol ester (kuning). detail = gambar besar dengan penanda.
export function ldl(x, y, r = 12, o = {}) {
  const ox = o.oxidized ?? 0, shell = ox > 0.5 ? '#9C6A1C' : MC.ldl, core = ox > 0.5 ? '#C9962E' : MC.ldlCore;
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(o.rot ?? 0)})" opacity="${o.a ?? 1}">${C(0, 0, r, shell)}${C(0, 0, r * 0.72, core)}`;
  if (r >= 16) { g += C(-r * 0.18, -r * 0.1, r * 0.1, shell, 'opacity=".7"') + C(r * 0.2, r * 0.12, r * 0.09, shell, 'opacity=".7"') + C(0, r * 0.3, r * 0.08, shell, 'opacity=".7"'); }
  g += L(`M${f1(-r * 0.9)} ${f1(-r * 0.4)}Q${f1(-r * 0.2)} ${f1(-r * 1.1)} ${f1(r * 0.5)} ${f1(-r * 0.7)}Q${f1(r * 1.05)} ${f1(-r * 0.2)} ${f1(r * 0.8)} ${f1(r * 0.5)}`, '#8A5A00', Math.max(1.5, r * 0.09), 'opacity=".85"');
  return g + '</g>';
}
export const platelet = (x, y, r = 8, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">${E(0, 0, r, r * 0.55, MC.plt)}${C(r * 0.2, 0, r * 0.18, '#6C3D99')}</g>`;
export function monocyte(x, y, r = 22, o = {}) { // monosit (bulat) -> makrofag (membesar, tepi bergelombang)
  const m = o.macro ?? 0, rr = r * (1 + 0.35 * m);
  const pts = Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2, w = 1 + (m ? 0.1 * Math.sin(a * 5 + (o.t ?? 0)) : 0); return pt(0, 0, rr * w, a); });
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(o.rot ?? 0)})" opacity="${o.a ?? 1}"><path d="${poly(pts)}" fill="${MC.mono}" stroke="#5A8DB3" stroke-width="3"/><path d="M${f1(-rr * 0.35)} ${f1(-rr * 0.1)}Q${f1(-rr * 0.1)} ${f1(-rr * 0.5)} ${f1(rr * 0.25)} ${f1(-rr * 0.2)}Q${f1(rr * 0.45)} ${f1(rr * 0.2)} ${f1(rr * 0.1)} ${f1(rr * 0.4)}Q${f1(-rr * 0.2)} ${f1(rr * 0.5)} ${f1(-rr * 0.35)} ${f1(-rr * 0.1)}Z" fill="${MC.monoNuc}"/>${(o.droplets ?? 0) > 0 ? Array.from({ length: Math.round(o.droplets * 9) }, (_, i) => { const a = i * 2.4, d = rr * (0.45 + 0.4 * ((i * 37) % 10) / 10); return C(Math.cos(a) * d * 0.9, Math.sin(a) * d * 0.8, rr * 0.13, '#E9B92D', 'opacity=".95"'); }).join('') : ''}</g>`;
}
export function foamCell(x, y, r = 26, rot = 0) { // sel busa: makrofag penuh tetesan lipid
  const pts = Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2; return pt(0, 0, r * (1 + 0.05 * Math.sin(a * 4)), a); });
  const drops = Array.from({ length: 11 }, (_, i) => { const a = i * 2.2, d = r * (0.2 + 0.55 * ((i * 53) % 10) / 10); return C(Math.cos(a) * d, Math.sin(a) * d, r * 0.2, '#F3CF52', 'stroke="#D4AC1E" stroke-width="1.6"'); }).join('');
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})"><path d="${poly(pts)}" fill="${MC.foam}" stroke="#D4AC1E" stroke-width="3"/>${drops}${C(r * 0.55, -r * 0.4, r * 0.18, MC.monoNuc)}</g>`;
}
export const label = (x, y, tx, ty, txt, o = {}) => { const anchor = o.anchor ?? (tx >= x ? 'start' : 'end'), fs = o.fs ?? 30, c = o.c ?? '#fff'; const w = txt.length * fs * 0.52 + 30, bx = anchor === 'start' ? tx - 12 : tx - w + 12;
  return `<g opacity="${o.a ?? 1}"><line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(tx)}" y2="${f1(ty)}" stroke="${o.line ?? '#fff'}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="7" fill="${o.line ?? '#fff'}"/><rect x="${f1(bx)}" y="${f1(ty - fs * 0.75)}" width="${f1(w)}" height="${f1(fs * 1.5)}" rx="${f1(fs * 0.5)}" fill="rgba(6,28,32,.88)"/>${T(anchor === 'start' ? tx + 4 : tx - 4, ty + fs * 0.35, txt, c, fs, '', anchor)}</g>`; };

// ---------------------------------------------------------------- penampang arteri
// R = jari-jari luar. growth 0..1 (plak), rupture 0..1, thrombus 0..1. angle = arah pusat plak (rad). Mengembalikan svg.
export function artery(cx, cy, Rr, o = {}) {
  const r0 = Rr * 0.55, ri = Rr * 0.66, rm = Rr * 0.86, th = o.angle ?? Math.PI * 0.5, gr = o.growth ?? 0, rup = o.rupture ?? 0, thr = o.thrombus ?? 0;
  let g = `<g>`;
  g += C(cx, cy, Rr, MC.adv) + C(cx, cy, Rr, 'none', `stroke="${MC.advDk}" stroke-width="${f1(Rr * 0.03)}"`);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, p1 = pt(cx, cy, Rr * 0.88, a), p2 = pt(cx, cy, Rr * 0.97, a + 0.16); g += L(`M${f1(p1[0])} ${f1(p1[1])}L${f1(p2[0])} ${f1(p2[1])}`, MC.advDk, Rr * 0.012, 'opacity=".7"'); }
  g += C(cx, cy, rm, MC.media);
  for (let i = 0; i < 38; i++) { const a = i / 38 * Math.PI * 2, rr1 = Rr * (0.69 + 0.15 * ((i * 7) % 5) / 5); g += `<path d="M${f1(cx + Math.cos(a) * rr1)} ${f1(cy + Math.sin(a) * rr1)}A${f1(rr1)} ${f1(rr1)} 0 0 1 ${f1(cx + Math.cos(a + 0.12) * rr1)} ${f1(cy + Math.sin(a + 0.12) * rr1)}" fill="none" stroke="${MC.mediaDk}" stroke-width="${f1(Rr * 0.022)}" stroke-linecap="round"/>`; }
  g += C(cx, cy, ri, MC.intima) + C(cx, cy, ri, 'none', `stroke="#F7F0E6" stroke-width="${f1(Rr * 0.016)}"`);   // intima, lamina elastika interna
  g += C(cx, cy, r0, MC.blood);
  // eritrosit di lumen
  const rnd = SEED(5); for (let i = 0; i < (o.rbc ?? 7); i++) { const a = rnd() * 6.28, d = rnd() * r0 * 0.72; g += rbc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Rr * 0.075, rnd() * 180); }
  if (o.ldlN) { for (let i = 0; i < o.ldlN; i++) { const a = i * 2.39 + 0.5, d = r0 * (0.25 + 0.5 * ((i * 41) % 10) / 10); g += ldl(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Rr * 0.045, { rot: i * 40 }); } }
  // trombus (di lumen; plak digambar di atasnya agar tidak menimpa jaringan)
  if (thr > 0) {
    const pc = pt(cx, cy, r0 * (0.85 - 0.35 * thr), th), tr = r0 * (0.35 + 0.8 * thr);
    g += `<clipPath id="clL${Math.round(cx)}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r0)}"/></clipPath><g clip-path="url(#clL${Math.round(cx)})"><circle cx="${f1(pc[0])}" cy="${f1(pc[1])}" r="${f1(tr)}" fill="#7A1F22"/>`;
    const r2 = SEED(11); for (let i = 0; i < 34; i++) { const a = r2() * 6.28, d = Math.sqrt(r2()) * tr * 0.92, x = pc[0] + Math.cos(a) * d, y = pc[1] + Math.sin(a) * d; g += i % 3 === 0 ? platelet(x, y, Rr * 0.04, r2() * 180) : rbc(x, y, Rr * 0.05, r2() * 180); }
    for (let i = 0; i < 18; i++) { const a = r2() * 6.28, d = r2() * tr * 0.8, x = pc[0] + Math.cos(a) * d, y = pc[1] + Math.sin(a) * d, b = r2() * 3.14; g += L(`M${f1(x - Math.cos(b) * Rr * 0.12)} ${f1(y - Math.sin(b) * Rr * 0.12)}L${f1(x + Math.cos(b) * Rr * 0.12)} ${f1(y + Math.sin(b) * Rr * 0.12)}`, MC.fib, Rr * 0.012, 'opacity=".85"'); }
    g += `</g>`;
  }
  // plak
  if (gr > 0) {
    const half = 0.95, N = 40, outer = [], inner = [], capIn = [];
    for (let i = 0; i <= N; i++) { const u = i / N, a = th - half + 2 * half * u, bump = Math.pow(Math.sin(Math.PI * u), 0.75), rp = r0 - gr * Rr * 0.4 * bump; outer.push(pt(cx, cy, ri, a)); inner.push(pt(cx, cy, Math.min(ri - 1, rp), a)); capIn.push(pt(cx, cy, Math.min(ri - 1, rp) + Rr * 0.05 * Math.min(1, gr * 1.3), a)); }
    g += `<path d="${poly([...outer, ...inner.slice().reverse()])}" fill="${MC.intima}" stroke="#E6C3BE" stroke-width="2"/>`;
    // inti lipid (kuning) di bawah tudung fibrosa
    const core = []; for (let i = 0; i <= N; i++) { const u = i / N, a = th - half * 0.72 + 2 * half * 0.72 * u, bump = Math.pow(Math.sin(Math.PI * u), 0.8); core.push(pt(cx, cy, ri - Rr * 0.025 - Rr * 0.0, a)); }
    const core2 = []; for (let i = N; i >= 0; i--) { const u = i / N, a = th - half * 0.72 + 2 * half * 0.72 * u, bump = Math.pow(Math.sin(Math.PI * u), 0.8), rp = r0 - gr * Rr * 0.4 * Math.pow(Math.sin(Math.PI * (0.14 + 0.72 * u)), 0.75); core2.push(pt(cx, cy, Math.min(ri - Rr * 0.06, rp + Rr * 0.07 * Math.min(1, gr * 1.4) + (1 - bump) * 4), a)); }
    if (gr > 0.25) { g += `<path d="${poly([...core, ...core2])}" fill="${MC.core}" stroke="${MC.coreDk}" stroke-width="3"/>`;
      const rr = SEED(3); for (let i = 0; i < 14; i++) { const u = 0.2 + rr() * 0.6, a = th - half * 0.72 + 2 * half * 0.72 * u, rpp = (ri + (r0 - gr * Rr * 0.4 * Math.pow(Math.sin(Math.PI * u), 0.75))) / 2, p = pt(cx, cy, rpp + (rr() - 0.5) * Rr * 0.05, a); g += `<path d="M${f1(p[0] - Rr * 0.025)} ${f1(p[1])}l${f1(Rr * 0.03)} ${f1(-Rr * 0.04)}l${f1(Rr * 0.03)} ${f1(Rr * 0.04)}z" fill="#fff" opacity=".7"/>`; } }
    // tudung fibrosa (garis tebal pada permukaan plak), dengan celah bila pecah
    const capPts = inner.slice(2, -2), gapC = Math.floor(capPts.length / 2), gapW = Math.round(rup * 4.5);
    if (rup <= 0) g += `<path d="M${capPts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}" fill="none" stroke="${MC.cap}" stroke-width="${f1(Rr * 0.045)}" stroke-linecap="round"/><path d="M${capPts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}" fill="none" stroke="#E3C79A" stroke-width="${f1(Rr * 0.012)}"/>`;
    else {
      const left = capPts.slice(0, gapC - gapW), right = capPts.slice(gapC + gapW);
      for (const part of [left, right]) if (part.length > 1) g += `<path d="M${part.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}" fill="none" stroke="${MC.cap}" stroke-width="${f1(Rr * 0.045)}" stroke-linecap="round"/>`;
      const gp = capPts[gapC]; for (let i = 0; i < 6; i++) g += C(gp[0] + Math.cos(th + 3.1) * Rr * 0.03 * i + (i % 2 ? 6 : -6), gp[1] - Math.sin(th) * Rr * 0.03 * i, Rr * 0.025, MC.core, 'opacity=".9"');
    }
    g += `<g opacity=".0">${C(0, 0, 0, '#000')}</g>`;
  }
  // endotel (cincin tipis) di tepi lumen; terputus di plak
  g += C(cx, cy, r0, 'none', `stroke="${MC.endo}" stroke-width="${f1(Rr * 0.03)}" stroke-dasharray="${f1(Rr * 0.16)} ${f1(Rr * 0.012)}"`);
  return g + '</g>';
}

// ---------------------------------------------------------------- pembuluh memanjang (normal vs menyempit)
export function longVessel(x, y, w, h, o = {}) { // x,y = kiri-atas; h = diameter luar; narrowing 0..1 di sisi bawah dan atas bergantian
  const wall = h * 0.2, lum = h - 2 * wall, nar = o.narrow ?? 0, cxm = x + w * 0.5;
  const prof = (u) => nar * lum * 0.32 * Math.pow(Math.sin(Math.PI * clamp((u - 0.28) / 0.44, 0, 1)), 1.4); // sisi lumen yang menyempit
  let g = R(x, y - h * 0.09, w, h * 1.18, MC.adv, h * 0.1) + R(x, y, w, h, MC.media, h * 0.08);
  const topY = y + wall, botY = y + h - wall;
  const up = [], dn = []; const N = 40; for (let i = 0; i <= N; i++) { const u = i / N; up.push([x + u * w, topY + prof(u) * 0.8]); dn.push([x + u * w, botY - prof(u) * 1.0]); }
  g += `<path d="${poly([...up, ...dn.slice().reverse()])}" fill="${MC.blood}"/>`;
  if (nar > 0) { // plak pada dinding (bawah dan atas), inti lipid kuning
    const plB = [...dn.map((p) => p), [x + w * 0.72, botY + wall * 0.15], [x + w * 0.28, botY + wall * 0.15]]; g += `<path d="${poly(plB)}" fill="${MC.core}" stroke="${MC.coreDk}" stroke-width="3" opacity="${f1(clamp(nar * 3, 0, 1))}"/>`;
    const plT = [...up, [x + w * 0.72, topY - wall * 0.15], [x + w * 0.28, topY - wall * 0.15]]; g += `<path d="${poly(plT)}" fill="${MC.core}" stroke="${MC.coreDk}" stroke-width="3" opacity="${f1(clamp(nar * 3, 0, 1))}"/>`;
    g += `<path d="${poly(dn.map((p) => [p[0], p[1] - 0]))}" fill="none" stroke="${MC.cap}" stroke-width="${f1(h * 0.035)}" stroke-linecap="round"/>`;
  }
  // eritrosit mengalir (o.t = waktu); lebih rapat dan lambat melewati penyempitan
  const rr = SEED(9); for (let i = 0; i < (o.rbc ?? 10); i++) { const sp = 80 + (i % 3) * 20, ph = (o.t ?? 0) * sp + i * w / (o.rbc ?? 10), px = x + (((ph % w) + w) % w), u = (px - x) / w, yy = topY + (botY - topY) * (0.15 + 0.7 * rr()) ; const yTop = topY + prof(u) * 0.8, yBot = botY - prof(u); g += rbc(px, clamp(yy, yTop + h * 0.07, yBot - h * 0.07), h * 0.065, rr() * 60); }
  g += `<g opacity=".95">${[0, 1].map((i) => L(`M${f1(x + 20)} ${f1(y + h * (0.32 + i * 0.36))}h${f1(w * 0.12)}`, 'rgba(255,255,255,.8)', 5)).join('')}</g>`;
  return g;
}

// ---------------------------------------------------------------- dinding arteri diperbesar: LDL masuk, peradangan, sel busa, plak
// p 0..1 (bertahap). lebar w, lumen di atas; mengembalikan svg dalam koordinat kanvas (x,y = kiri-atas).
export function wallSection(x, y, w, h, p, t = 0) {
  const ly = h * 0.22, ey = h * 0.27, iy = h * 0.74;     // dasar lumen, endotel, dasar intima
  const wid = 'ws' + Math.round(x);
  let g = `<clipPath id="${wid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26"/></clipPath><g clip-path="url(#${wid})">`;
  g += R(x, y, w, h, MC.intima) + R(x, y, w, ly, MC.blood) + R(x, y + iy, w, h - iy, MC.media);
  for (let i = 0; i < 9; i++) g += E(x + (i + 0.5) * w / 9, y + iy + (h - iy) * 0.5, w / 22, (h - iy) * 0.3, MC.mediaDk, 'opacity=".8"');
  g += R(x, y + iy - 5, w, 8, '#F7F0E6');   // lamina elastika interna
  // eritrosit mengalir di lumen
  for (let i = 0; i < 7; i++) g += rbc(x + (((i * w / 7 + t * 60) % w) + w) % w, y + ly * (0.3 + 0.4 * ((i * 37) % 10) / 10), 22, i * 30);
  // endotel: sel pipih berderet
  const nEnd = 8; for (let i = 0; i < nEnd; i++) g += E(x + (i + 0.5) * w / nEnd, y + ey, w / nEnd * 0.46, h * 0.028, MC.endo, 'stroke="#D98880" stroke-width="2"');
  // LDL di darah (jumlah menaik dengan kadar), lalu masuk ke intima dan tertahan
  const nBlood = Math.round(6 + 8 * clamp(p / 0.2, 0, 1)), rr = SEED(21);
  for (let i = 0; i < nBlood; i++) g += ldl(x + (((i * w / nBlood + t * 25) % w) + w) % w, y + ly * (0.28 + 0.5 * rr()), 13, { rot: i * 50 });
  const nIn = Math.round(16 * sm((p - 0.12) / 0.3));
  for (let i = 0; i < nIn; i++) { const r2 = SEED(40 + i), px = x + w * (0.12 + 0.76 * r2()), py = y + ey + h * (0.05 + 0.33 * r2()), ox = sm((p - 0.3) / 0.25); g += ldl(px, py, 12, { oxidized: ox, rot: i * 30 }); }
  // monosit menempel, masuk, menjadi makrofag
  const mA = sm((p - 0.34) / 0.2), mB = sm((p - 0.5) / 0.25);
  if (p > 0.34) { for (let i = 0; i < 2; i++) { const bx = x + w * (0.25 + 0.4 * i), by0 = y + ey - h * 0.07, by1 = y + ey + h * (0.12 + 0.02 * i); g += monocyte(bx, lerpN(by0, by1, mB), 26, { macro: mB, a: mA, droplets: sm((p - 0.58) / 0.22) * 0.8 }); } }
  // sel busa menumpuk, plak (tonjolan + tudung fibrosa) pada tahap akhir
  const fA = sm((p - 0.68) / 0.18);
  for (let i = 0; i < 5; i++) { const r2 = SEED(70 + i); if (fA * 5 > i) g += foamCell(x + w * (0.2 + 0.15 * i + 0.05 * r2()), y + ey + h * (0.14 + 0.2 * r2()), 30, i * 20); }
  const cA = sm((p - 0.84) / 0.16);
  if (cA > 0) g += `<path d="M${x + w * 0.1} ${y + ey + h * 0.06}Q${x + w * 0.5} ${y + ey - h * 0.07 * cA} ${x + w * 0.9} ${y + ey + h * 0.06}" fill="none" stroke="${MC.cap}" stroke-width="12" stroke-linecap="round" opacity="${cA}"/>`;
  g += `</g>${R(x, y, w, h, 'none', 26, 'stroke="#fff" stroke-width="6" opacity=".8"')}`;
  return g;
}
const lerpN = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- jantung (tampak depan) dengan arteri koroner di permukaan
// s = skala (1 -> lebar sekitar 560). occl 0..1 menutup LAD; isk 0..1 menggelapkan otot hilir (iskemia).
export function heart(cx, cy, s = 1, o = {}) {
  const k = s, X = (v) => cx + v * k, Y = (v) => cy + v * k;
  const body = `M${X(-20)} ${Y(-250)}C${X(-200)} ${Y(-270)} ${X(-300)} ${Y(-120)} ${X(-270)} ${Y(20)}C${X(-240)} ${Y(150)} ${X(-110)} ${Y(250)} ${X(20)} ${Y(300)}C${X(140)} ${Y(250)} ${X(270)} ${Y(150)} ${X(290)} ${Y(10)}C${X(310)} ${Y(-130)} ${X(220)} ${Y(-270)} ${X(80)} ${Y(-250)}Z`;
  let g = `<path d="${body}" fill="#E8A29A" stroke="#B9625A" stroke-width="${f1(7 * k)}" stroke-linejoin="round"/>`;
  // lemak epikardium dan atrium (kontur samar), ruang jantung ditandai lembut
  g += `<path d="M${X(-20)} ${Y(-250)}C${X(-190)} ${Y(-262)} ${X(-290)} ${Y(-130)} ${X(-262)} ${Y(-20)}C${X(-200)} ${Y(-70)} ${X(-110)} ${Y(-170)} ${X(-20)} ${Y(-250)}Z" fill="#D88A84" opacity=".75"/>`;   // atrium kanan
  g += `<path d="M${X(80)} ${Y(-250)}C${X(200)} ${Y(-262)} ${X(298)} ${Y(-130)} ${X(270)} ${Y(-40)}C${X(210)} ${Y(-90)} ${X(150)} ${Y(-190)} ${X(80)} ${Y(-250)}Z" fill="#D88A84" opacity=".75"/>`;   // atrium kiri
  // iskemia: otot hilir LAD (dinding depan ventrikel kiri dan apeks) menggelap
  const isk = o.isk ?? 0;
  if (isk > 0) g += `<path d="M${X(40)} ${Y(-170)}C${X(150)} ${Y(-110)} ${X(250)} ${Y(-20)} ${X(240)} ${Y(80)}C${X(220)} ${Y(170)} ${X(120)} ${Y(250)} ${X(20)} ${Y(290)}C${X(10)} ${Y(170)} ${X(20)} ${Y(40)} ${X(40)} ${Y(-170)}Z" fill="#6E2A58" opacity="${f1(0.62 * isk)}"/>` + (isk > 0.2 ? `<path d="M${X(70)} ${Y(-60)}l${f1(60 * k)} ${f1(40 * k)}M${X(60)} ${Y(10)}l${f1(70 * k)} ${f1(46 * k)}M${X(60)} ${Y(80)}l${f1(70 * k)} ${f1(46 * k)}" stroke="#fff" stroke-width="${f1(5 * k)}" opacity="${f1(0.55 * isk)}" stroke-linecap="round"/>` : '');
  // pembuluh besar di pangkal: aorta dan batang pulmonal
  g += `<path d="M${X(10)} ${Y(-246)}C${X(10)} ${Y(-330)} ${X(70)} ${Y(-380)} ${X(140)} ${Y(-360)}L${X(150)} ${Y(-320)}C${X(100)} ${Y(-320)} ${X(70)} ${Y(-290)} ${X(70)} ${Y(-246)}Z" fill="#C0463E" stroke="#8E2F29" stroke-width="${f1(5 * k)}"/>`;
  g += `<path d="M${X(-60)} ${Y(-250)}C${X(-60)} ${Y(-320)} ${X(-110)} ${Y(-350)} ${X(-170)} ${Y(-330)}L${X(-160)} ${Y(-295)}C${X(-120)} ${Y(-290)} ${X(-105)} ${Y(-270)} ${X(-110)} ${Y(-250)}Z" fill="#8FB9E3" stroke="#5E8DB8" stroke-width="${f1(5 * k)}"/>`;
  // arteri koroner (merah terang di permukaan): kiri-utama -> LAD turun ke apeks, sirkumfleks melingkar, RCA di sisi kanan jantung (kiri layar)
  const art = (d, w = 11) => `<path d="${d}" fill="none" stroke="#7A1410" stroke-width="${f1((w + 6) * k)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#E5382E" stroke-width="${f1(w * k)}" stroke-linecap="round"/>`;
  const lad = `M${X(75)} ${Y(-240)}C${X(70)} ${Y(-190)} ${X(52)} ${Y(-90)} ${X(48)} ${Y(10)}C${X(46)} ${Y(110)} ${X(36)} ${Y(210)} ${X(24)} ${Y(284)}`;
  g += art(lad, 12) + art(`M${X(80)} ${Y(-236)}C${X(150)} ${Y(-230)} ${X(210)} ${Y(-170)} ${X(240)} ${Y(-80)}`, 9);               // sirkumfleks
  g += art(`M${X(-70)} ${Y(-246)}C${X(-170)} ${Y(-230)} ${X(-248)} ${Y(-130)} ${X(-250)} ${Y(-10)}C${X(-248)} ${Y(70)} ${X(-200)} ${Y(140)} ${X(-130)} ${Y(190)}`, 11);   // RCA
  g += art(`M${X(48)} ${Y(-120)}C${X(100)} ${Y(-110)} ${X(150)} ${Y(-90)} ${X(176)} ${Y(-40)}`, 6) + art(`M${X(46)} ${Y(30)}C${X(100)} ${Y(50)} ${X(150)} ${Y(60)} ${X(186)} ${Y(110)}`, 6);
  // sumbatan pada LAD proksimal-tengah
  const oc = o.occl ?? 0;
  if (oc > 0) { const ox = X(50), oy = Y(-60); g += `<g transform="translate(${f1(ox)} ${f1(oy)}) scale(${f1(0.6 + 0.4 * oc)})" opacity="${f1(clamp(oc * 2, 0, 1))}"><ellipse cx="0" cy="0" rx="${f1(26 * k)}" ry="${f1(38 * k)}" fill="#6B1B24" stroke="#3E0E14" stroke-width="${f1(4 * k)}"/>${C(-8 * k, -10 * k, 6 * k, '#8E5BBF')}${C(10 * k, 8 * k, 6 * k, '#8E5BBF')}${L(`M${f1(-14 * k)} ${f1(14 * k)}L${f1(14 * k)} ${f1(-14 * k)}`, '#D9C2EC', 4 * k)}</g>`; }
  return g;
}
