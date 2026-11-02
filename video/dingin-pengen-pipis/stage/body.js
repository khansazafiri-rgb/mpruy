// Dunia dalam tubuh: penampang kulit (pembuluh menyempit), peta tubuh (darah bergeser ke tengah), ginjal dan kandung kemih (urine), ikon faktor.
// Penyederhanaan visual (bukan anatomi realistis). Semua fungsi murni: waktu -> string SVG.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, seg, win, kf, r1, rnd, g, rect, circ, txt, poly } from './lib.js';
import { flake } from './world.js';

export const COL = { blood: '#E24B4B', bloodD: '#B83434', wall: '#C9484F', heat: '#FFB347', heatD: '#FF8A2A', water: '#58B9EA', waterD: '#2F8FCB', salt: '#F3F6F8', saltD: '#9AA9B3', urine: '#F6D14A', urineD: '#D9AC1E', cold: '#8ED3FF', kid: '#C25A66', kidD: '#A5434F', kidL: '#E58791', skin: '#F7D5B9' };
const along = (pts, u) => {   // titik pada poliline dengan parameter u 0..1
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = clamp(u, 0, 1) * L[L.length - 1];
  for (let i = 1; i < pts.length; i++) if (d <= L[i]) { const k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; }
  return pts[pts.length - 1];
};
const rbc = (x, y, sx = 1, sy = 1, r = 0, o = 1) => g(`<ellipse rx="40" ry="28" fill="${COL.blood}"/><ellipse rx="19" ry="12" fill="${COL.bloodD}" opacity=".7"/>`, { x, y, sx, sy, r, o });
const bgInner = () => `<defs><linearGradient id="ibg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A4B7C"/><stop offset="1" stop-color="#1B3158"/></linearGradient></defs>` + rect(-40, -40, 1160, 2000, 'url(#ibg)');

// ================================================================ penampang kulit
/** k = 0..1 seberapa menyempit pembuluh dekat permukaan (0 = lebar). heat = 0..1 kehilangan panas. */
export function skinScene(a, t, { k = 0, leak = 1, qmark = 0 } = {}) {
  const R = lerp(66, 24, ease(k)), speed = lerp(260, 140, ease(k));
  let s = rect(-40, -40, 1160, 700, '#CFEAFB') + rect(-40, 360, 1160, 300, '#B5DDF6', 0, 'opacity=".6"');
  // udara dingin: garis angin dan kristal salju
  for (let i = 0; i < 5; i++) { const x = ((t * 120 + i * 310) % 1500) - 200; s += `<path d="M${r1(x)} ${340 + i * 52}q60 -26 120 0t120 0" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".65"/>`; }
  for (let i = 0; i < 6; i++) s += flake(120 + i * 170 + Math.sin(t + i) * 20, 330 + ((t * 40 + i * 70) % 260), 0.7, t * 30 + i * 20, 0.9);
  // lapisan kulit
  s += rect(-40, 600, 1160, 80, '#F5C79F') + rect(-40, 668, 1160, 24, '#E9B085', 0, 'opacity=".7"') + rect(-40, 680, 1160, 480, '#F3A89F') + rect(-40, 1160, 1160, 900, '#F7E0A9');
  for (let i = 0; i < 16; i++) s += circ(40 + rnd(i) * 1000, 720 + rnd(i + 7) * 400, 18 + rnd(i + 3) * 30, '#F7BDB5', 'opacity=".55"') + circ(60 + rnd(i + 20) * 1000, 1200 + rnd(i + 9) * 300, 40 + rnd(i + 5) * 50, '#F2CF86', 'opacity=".7"');
  for (let x = 30; x < 1100; x += 90) s += `<path d="M${x} 600q${6 + rnd(x) * 10} -34 ${14} -${40 + rnd(x + 1) * 20}" stroke="#2A2230" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  // pembuluh dekat permukaan (menyempit) dan pembuluh yang lebih dalam (tetap)
  const vy = 810, dy = 1040;
  s += `<path d="M-60 ${vy}H1140" stroke="${COL.wall}" stroke-width="${r1(2 * R + 16)}" stroke-linecap="round"/><path d="M-60 ${vy}H1140" stroke="#F06B6B" stroke-width="${r1(2 * R)}"/>`;
  s += `<path d="M-60 ${dy}H1140" stroke="${COL.wall}" stroke-width="124"/><path d="M-60 ${dy}H1140" stroke="#F06B6B" stroke-width="108"/>`;
  for (let i = 0; i < 7; i++) { const x = (((i * 190 + t * speed) % 1400) + 1400) % 1400 - 160; s += rbc(x, vy + Math.sin(i * 2.1) * Math.max(0, R - 30), 0.9 * Math.min(1, R / 40 + 0.35), 0.4 + 0.5 * Math.min(1, R / 60), Math.sin(t + i) * 6); }
  for (let i = 0; i < 6; i++) { const x = (((i * 230 + t * 220) % 1400) + 1400) % 1400 - 160; s += rbc(x, dy + Math.sin(i * 1.7) * 26, 1.15, 1.1, Math.sin(t + i) * 8); }
  // panas (titik jingga) dari pembuluh dekat kulit menuju permukaan; berkurang saat menyempit
  const hp = lerp(1, 0.28, ease(k)) * leak;
  for (let i = 0; i < 16; i++) {
    const u = ((t * 0.5 + i * 0.19) % 1), x = 60 + ((i * 71) % 960) + Math.sin(u * 7 + i) * 16, y = vy - R - 10 - u * (vy - R - 60 - 330);
    const keep = (i / 16) < hp ? 1 : 0;
    if (keep) s += circ(x, y, 12 + 4 * Math.sin(i), COL.heat, `opacity="${r1(0.85 * Math.sin(u * Math.PI))}"`) + circ(x, y, 22, COL.heat, `opacity="${r1(0.25 * Math.sin(u * Math.PI))}"`);
  }
  // panas tetap di dalam saat menyempit
  if (k > 0.05) for (let i = 0; i < 6; i++) s += circ(100 + i * 160 + Math.sin(t * 2 + i) * 14, vy + 90 + Math.sin(t * 1.5 + i) * 10, 14, COL.heat, `opacity="${r1(0.7 * ease(k))}"`);
  if (qmark > 0.01) s += g(txt('?', 0, 0, { size: 260, fill: '#fff' }), { x: 540, y: 960, s: backOut(qmark), o: qmark });
  return s;
}

// ================================================================ peta tubuh: darah bergeser ke tengah
const LIMB = {
  armL: [[330, 1060], [350, 930], [420, 800], [500, 800]], armR: [[750, 1060], [730, 930], [660, 800], [580, 800]],
  legL: [[500, 1300], [510, 1180], [520, 1040], [535, 900]], legR: [[580, 1300], [570, 1180], [560, 1040], [545, 900]],
};
export function bodyMap(a, t, { shift = 0, bp = 0, cold = 1, ring = 0 } = {}) {
  let s = bgInner() + `<g transform="translate(540 975) scale(1.3) translate(-540 -900)">`;
  // siluet datar: kepala, leher, badan, lengan, kaki
  const sil = COL.skin;
  s += `<g opacity=".95">${rect(300, 1010, 70, 120, sil, 36, 'transform="rotate(8 335 1010)"')}${rect(710, 1010, 70, 120, sil, 36, 'transform="rotate(-8 745 1010)"')}`;
  s += `<path d="M392 760Q330 880 318 1060" stroke="${sil}" stroke-width="82" stroke-linecap="round" fill="none"/><path d="M688 760Q750 880 762 1060" stroke="${sil}" stroke-width="82" stroke-linecap="round" fill="none"/>`;
  s += rect(450, 1100, 84, 230, sil, 40) + rect(546, 1100, 84, 230, sil, 40) + rect(396, 720, 288, 460, sil, 110) + rect(498, 650, 84, 100, sil, 30) + circ(540, 600, 96, sil) + '</g>';
  s += rect(396, 720, 288, 460, '#9AD3F5', 110, `opacity="${r1(0.08 * cold)}"`);
  // pembuluh anggota gerak (menyempit, kebiruan) dan pembuluh inti (tebal, merah)
  const thin = lerp(16, 8, ease(shift));
  for (const k of Object.keys(LIMB)) s += `<path d="${LIMB[k].map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('')}" stroke="${shift > 0.1 ? '#7BA7D8' : '#E86C6C'}" stroke-width="${r1(thin)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const core = lerp(26, 44, ease(shift));
  s += `<path d="M540 800V1000M540 900Q470 930 450 1000M540 900Q610 930 630 1000" stroke="${COL.bloodD}" stroke-width="${r1(core + 8)}" fill="none" stroke-linecap="round"/><path d="M540 800V1000M540 900Q470 930 450 1000M540 900Q610 930 630 1000" stroke="${COL.blood}" stroke-width="${r1(core)}" fill="none" stroke-linecap="round"/>`;
  // inti membesar karena lebih banyak darah
  if (shift > 0.02) s += circ(540, 930, 120 * ease(shift), COL.blood, `opacity="${r1(0.22 * ease(shift))}"`);
  // jantung
  const beat = 1 + 0.07 * Math.sin(t * (7 + 3 * bp)) * (1 + bp);
  s += g(`<path d="M0 40S-56 6-56 -26q0-26 24-26 20 0 32 20 12-20 32-20 24 0 24 26C56 6 0 40 0 40z" fill="${COL.blood}"/>`, { x: 575, y: 820, s: 1.0 * beat });
  // partikel darah bergeser dari anggota gerak ke tengah
  const amt = ease(shift);
  Object.keys(LIMB).forEach((k, ki) => {
    for (let i = 0; i < 6; i++) { const u = ((t * 0.45 + i / 6 + ki * 0.13) % 1); if (i / 6 > amt + 0.15) continue; const [x, y] = along(LIMB[k], 1 - u); s += circ(x, y, 9, '#FFD3D3', `opacity="${r1(0.9 * Math.sin(u * Math.PI))}"`); }
  });
  // panah-panah besar ke tengah
  if (shift > 0.05) for (const [x, y, rot] of [[390, 880, 40], [690, 880, -40], [510, 1170, -80], [570, 1170, 80]]) s += g(`<path d="M-24 -14H8V-30L38 0L8 30V14H-24Z" fill="#fff" opacity=".85"/>`, { x, y, r: rot + 0, s: 0.8 * ease(shift), o: 0.8 * Math.abs(Math.sin(t * 4)) + 0.2 });
  s += '</g>';
  // dial tekanan darah (di luar skala badan)
  if (bp > 0) s += bpDial(540, 450, bp, t);
  if (ring > 0) s += circ(540, 900, 1200 * (1 - ring), 'none', `stroke="#fff" stroke-width="30" opacity="${r1(ring)}"`);
  return s;
}
function bpDial(x, y, v, t) {
  const ang = lerp(-150, -30, ease(v)) + Math.sin(t * 12) * 2 * ease(v);
  let s = `<path d="M${x - 110} ${y}A110 110 0 0 1 ${x + 110} ${y}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="22" stroke-linecap="round"/>`
    + `<path d="M${x - 110} ${y}A110 110 0 0 1 ${x + 110 * Math.cos(((ang + 150) / 120 * 180 - 180) * Math.PI / 180)} ${y + 110 * Math.sin(((ang + 150) / 120 * 180 - 180) * Math.PI / 180)}" fill="none" stroke="${v > 0.6 ? '#F2735E' : '#F8C038'}" stroke-width="22" stroke-linecap="round"/>`;
  s += `<g transform="translate(${x} ${y}) rotate(${r1(ang + 90)})"><path d="M0 0V-96" stroke="#fff" stroke-width="10" stroke-linecap="round"/></g>` + circ(x, y, 16, '#fff');
  return s;
}

// ================================================================ ginjal, ureter, kandung kemih
/** amount: laju urine 0..1 (jumlah tetes), fill: isi kandung kemih 0..1, mix: aliran air+garam masuk 0..1, drops: tampilkan tetes. */
export function kidneyScene(a, t, { rate = 0, fill = 0.12, mix = 0, urge = 0, regulate = 0, dy = 0 } = {}) {
  let s = bgInner();
  s += `<g transform="translate(0 ${r1(dy)})">`;
  // arteri masuk (merah) dan vena keluar (biru) menuju hilus ginjal (sisi kiri bentuk kacang)
  s += `<path d="M110 330C300 330 380 470 450 590" stroke="${COL.bloodD}" stroke-width="70" fill="none" stroke-linecap="round"/><path d="M110 330C300 330 380 470 450 590" stroke="${COL.blood}" stroke-width="52" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M960 300C760 300 560 380 470 540" stroke="#2B5FA8" stroke-width="60" fill="none" stroke-linecap="round"/><path d="M960 300C760 300 560 380 470 540" stroke="#4E86D6" stroke-width="42" fill="none" stroke-linecap="round"/>`;
  // ginjal: bentuk kacang dengan penampang (korteks, piramida)
  const KID = (sc, fill) => `<path transform="translate(560 610) scale(${sc}) translate(-560 -610)" d="M560 375C700 375 775 490 775 610C775 740 680 845 560 845C470 845 400 800 375 735C360 690 430 660 430 610C430 560 360 530 375 485C400 420 470 375 560 375Z" fill="${fill}"/>`;
  s += KID(1.04, COL.kidD) + KID(0.97, COL.kid);
  for (const [px, py, r] of [[690, 480, 20], [730, 610, 8], [690, 740, -20], [560, 790, -10], [560, 440, 20]]) s += `<path d="M${px} ${py}l-46 20l20 -60z" fill="${COL.kidL}" opacity=".85" transform="rotate(${r} ${px} ${py})"/>`;
  s += circ(600, 610, 62, COL.kidL, 'opacity=".55"');
  // ureter turun dari hilus ke kandung kemih
  const bx = 540, by = 1150;
  const ur = [[430, 690], [440, 800], [520, 900], [bx, by - 190]];
  s += `<path d="${ur.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('')}" stroke="#5B7FB5" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${ur.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('')}" stroke="${COL.urine}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${r1(0.35 + 0.6 * rate)}"/>`;
  const nDrops = Math.round(2 + 10 * rate);
  for (let i = 0; i < nDrops; i++) { const u = ((t * (0.35 + 0.7 * rate) + i / nDrops) % 1), [x, y] = along(ur, u); s += `<path d="M${r1(x)} ${r1(y - 14)}q10 14 0 24q-10 -10 0 -24z" fill="${COL.urine}" stroke="${COL.urineD}" stroke-width="3"/>`; }
  // kandung kemih (balon) dengan isi urine
  const bw = 175, bh = 190, top = by - bh;
  s += `<path d="M${bx - bw} ${by - 20}C${bx - bw} ${top + 20} ${bx - 70} ${top - 36} ${bx} ${top - 36}C${bx + 70} ${top - 36} ${bx + bw} ${top + 20} ${bx + bw} ${by - 20}C${bx + bw} ${by + 70} ${bx - bw} ${by + 70} ${bx - bw} ${by - 20}Z" fill="#E7A0A8"/>`;
  const lvl = lerp(by + 54, top + 4, clamp(fill, 0, 1));
  s += `<clipPath id="bcl"><path d="M${bx - bw + 16} ${by - 20}C${bx - bw + 16} ${top + 30} ${bx - 70} ${top - 18} ${bx} ${top - 18}C${bx + 70} ${top - 18} ${bx + bw - 16} ${top + 30} ${bx + bw - 16} ${by - 20}C${bx + bw - 16} ${by + 54} ${bx - bw + 16} ${by + 54} ${bx - bw + 16} ${by - 20}Z"/></clipPath>`
    + `<g clip-path="url(#bcl)">${rect(bx - bw, lvl + 4, bw * 2, 300, COL.urine)}<path d="M${bx - bw} ${r1(lvl + 4)}q${bw / 2} ${r1(-14 + 10 * Math.sin(t * 3))} ${bw} 0t${bw} 0" fill="${COL.urine}"/></g>`;
  // masuknya air dan garam bersama darah (40.6 - 43.7): titik biru dan kubus putih mengalir di arteri, sebagian kembali lewat vena
  if (mix > 0.01) {
    const art = [[110, 330], [300, 340], [380, 470], [450, 590]], vein = [[470, 540], [560, 390], [760, 305], [960, 300]];
    for (let i = 0; i < 8; i++) {
      const u = ((t * 0.4 + i / 8) % 1), [x, y] = along(art, u), o = mix * Math.sin(u * Math.PI);
      s += i % 2 ? `<path d="M${r1(x)} ${r1(y - 12)}q10 14 0 24q-10 -10 0 -24z" fill="${COL.water}" opacity="${r1(o)}" transform="scale(1.4) translate(${r1(-x * 0.286)} ${r1(-y * 0.286)})"/>` : rect(x - 9, y - 9, 18, 18, COL.salt, 4, `opacity="${r1(o)}" stroke="${COL.saltD}" stroke-width="2"`);
    }
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.4 + 0.5 + i / 6) % 1), [x, y] = along(vein, u), o = mix * Math.sin(u * Math.PI);
      s += i % 2 ? `<path d="M${r1(x)} ${r1(y - 12)}q10 14 0 24q-10 -10 0 -24z" fill="${COL.water}" opacity="${r1(o)}" transform="scale(1.4) translate(${r1(-x * 0.286)} ${r1(-y * 0.286)})"/>` : rect(x - 9, y - 9, 18, 18, COL.salt, 4, `opacity="${r1(o)}" stroke="${COL.saltD}" stroke-width="2"`);
    }
  }
  if (regulate > 0.01) {   // keseimbangan: dua penanda "cairan" dan "garam" di sisi kiri atas
    s += g(`<path d="M0 -34q26 34 0 56q-26 -22 0 -56z" fill="${COL.water}"/>` + txt('cairan', 0, 64, { size: 28, fill: '#fff' }), { x: 150, y: 540, s: backOut(regulate), o: regulate });
    s += g(rect(-22, -22, 44, 44, COL.salt, 8, `stroke="${COL.saltD}" stroke-width="3"`) + txt('garam', 0, 64, { size: 28, fill: '#fff' }), { x: 270, y: 540, s: backOut(regulate), o: regulate });
  }
  if (urge > 0.01) s += g(rect(-8, -50, 16, 60, '#F2735E', 8) + circ(0, 34, 9, '#F2735E'), { x: bx + 190, y: by - 150, s: backOut(urge) * 1.3, o: urge });
  return s + '</g>';
}

// ================================================================ ikon faktor
export const ICO = {
  cup: (x, y, s = 1) => g(`<path d="M-46 -60H46L34 56H-34Z" fill="#CFEAFB" stroke="#58B9EA" stroke-width="6" stroke-linejoin="round"/><path d="M-41 -20H41L34 56H-34Z" fill="${COL.water}"/><path d="M14 -80L30 -58" stroke="#E8665F" stroke-width="8" stroke-linecap="round"/>`, { x, y, s }),
  thermo: (x, y, s = 1) => g(`${rect(-14, -68, 28, 100, '#fff', 14, 'stroke="#58B9EA" stroke-width="6"')}${circ(0, 50, 30, '#fff', 'stroke="#58B9EA" stroke-width="6"')}${circ(0, 50, 18, '#58B9EA')}${rect(-6, -10, 12, 60, '#58B9EA', 6)}${flake(54, -30, 0.7)}`, { x, y, s }),
  clock: (x, y, s = 1) => g(`${circ(0, 0, 56, '#fff', 'stroke="#F8C038" stroke-width="10"')}<path d="M0 -30V0L22 14" fill="none" stroke="#0A3830" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`, { x, y, s }),
  bladder: (x, y, s = 1, lv = 0.6) => { const id = 'bl' + Math.round(x * 7 + y * 3 + lv * 100); return g(`<clipPath id="${id}"><path d="M-48 8C-48 -42 -20 -60 0 -60C20 -60 48 -42 48 8C48 52 -48 52 -48 8Z"/></clipPath><path d="M-54 8C-54 -48 -22 -68 0 -68C22 -68 54 -48 54 8C54 60 -54 60 -54 8Z" fill="#E7A0A8"/><g clip-path="url(#${id})">${rect(-60, lerp(52, -60, lv), 120, 130, COL.urine)}</g><path d="M0 -68V-84" stroke="#C98089" stroke-width="12" stroke-linecap="round"/>`, { x, y, s }); },
  pain: (x, y, s = 1) => g(`<path d="M-30 -40L-6 -4L-26 -2L6 44L0 8L24 6Z" fill="#F2735E"/>`, { x, y, s }),
  ac: (x, y, s = 1) => g(`${rect(-70, -26, 140, 52, '#fff', 14, 'stroke="#C9D8DF" stroke-width="5"')}${rect(-52, 8, 104, 8, '#CFE0E8', 4)}${flake(-30, 62, 0.45)}${flake(30, 62, 0.45)}`, { x, y, s }),
};
