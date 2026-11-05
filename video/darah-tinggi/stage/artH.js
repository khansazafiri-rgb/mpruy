// Ilustrasi video "Darah tinggi itu sebahaya apa?": alat tensi, grafik tekanan, jantung (potongan 4 ruang), penampang pembuluh bertekanan,
// otak (tersumbat vs pecah), ginjal dan glomerulus, serta properti sehari-hari. Semua skema 2D buatan; skala dan bentuk disederhanakan.
import { R, C, E, P, L, T, f1, clamp } from './art.js';
import { MC, rbc, label } from './artM.js';

export const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const lp = (a, b, t) => a + (b - a) * t;
const pt = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
const SEED = (n) => { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
export const HC = { ox: '#D9483D', oxDk: '#B8322A', deox: '#5B7FC7', deoxDk: '#3F5FA6', myo: '#E39A92', myoDk: '#C0665F', myoEdge: '#A94F4A', teal: '#007060', ink: '#172B38', warn: '#E8665F', ok: '#3DB46E', gold: '#F8C038' };

// ---------------------------------------------------------------- ruangan dan properti
export function stationBg(t = 0) { // ruang pemeriksaan sederhana (klinik / posyandu): dinding, lantai, jendela, poster, tanaman
  let s = R(-100, -100, 1300, 1400, '#E4F1EC') + R(-100, 760, 1300, 470, '#D4E7E0') + R(-100, 1218, 1300, 16, '#B9CEC6') + R(-100, 1234, 1300, 800, '#CDBB9E') + R(-100, 1234, 1300, 10, '#B7A483');
  for (let i = 0; i < 9; i++) s += R(-100 + i * 150, 1244, 4, 700, 'rgba(120,96,60,.12)');
  s += R(60, 330, 250, 300, '#BFE3F2', 22) + R(60, 330, 250, 300, 'none', 22, 'stroke="#fff" stroke-width="14"') + R(180, 330, 10, 300, '#fff') + R(60, 470, 250, 10, '#fff') + C(240, 420, 38, 'rgba(255,255,255,.7)');
  s += `<g transform="translate(770 380)">${R(-110, -80, 220, 250, '#fff', 20)}${R(-110, -80, 220, 250, 'none', 20, 'stroke="#CFE3DC" stroke-width="8"')}<g transform="translate(0 20) scale(.5)">${hHeartIcon()}</g>${T(0, 130, 'CEK RUTIN', HC.teal, 26)}</g>`;
  s += `<g transform="translate(980 1220)">${R(-30, -20, 60, 40, '#B87A4B', 8)}${P('M-6 -20C-60 -90 -44 -150 -8 -170C-30 -110 -14 -70 6 -20Z', '#3DB46E')}${P('M6 -20C60 -80 52 -140 18 -164C34 -110 22 -70 0 -20Z', '#2E9A58')}${P('M0 -20C-10 -70 6 -120 0 -150C20 -110 14 -70 8 -20Z', '#56C985')}</g>`;
  return s;
}
const hHeartIcon = () => `<path d="M0 78C-130 -6 -100 -110 -40 -106C-12 -104 0 -80 0 -66C0 -80 12 -104 40 -106C100 -110 130 -6 0 78Z" fill="${HC.warn}"/><path d="M-70 4H-30L-14 -34L12 40L30 -6H72" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;

export function chair(x, fy, w = 210, a = 1) { // kursi tampak depan: sandaran di belakang punggung, dudukan setinggi pinggul
  return { back: `<g opacity="${a}">${R(x - w * 0.46, fy - 330, w * 0.92, 200, '#7C95B8', 26)}${R(x - w * 0.46, fy - 330, w * 0.92, 14, '#93AACB', 8)}</g>`,
    seat: `<g opacity="${a}">${R(x - w / 2, fy - 126, w, 30, '#5C7699', 14)}${R(x - w / 2 + 10, fy - 96, 14, 96, '#44546B', 5)}${R(x + w / 2 - 24, fy - 96, 14, 96, '#44546B', 5)}</g>` };
}
export function sideTable(x0, x1, topY) { // meja periksa dilihat dari depan
  const w = x1 - x0;
  return `${E((x0 + x1) / 2, topY + 270, w * 0.5, 14, 'rgba(0,0,0,.12)')}${R(x0 + 14, topY + 24, 14, 250, '#8A6440', 4)}${R(x1 - 28, topY + 24, 14, 250, '#8A6440', 4)}${R(x0, topY, w, 26, '#C9A27A', 8)}${R(x0, topY + 20, w, 8, '#A9815A', 4)}`;
}

// alat tensi lengan atas digital. (x,y) = tengah dasar. o: sys, dia, pulse (angka atau null), mode 'idle' | 'ukur' | 'hasil', press 0..1 tombol ditekan, hi true = angka merah
export function tensi(x, y, s = 1, o = {}) {
  const W = 220, H = 150, mode = o.mode ?? 'hasil', hi = !!o.hi;
  const col = hi ? '#FF6B5E' : '#7CF2B7';
  const digit = (v, sz) => T(0, 0, v, col, sz, 'font-family="JetBrains Mono, monospace" letter-spacing="2"');
  let scr = R(-78, -118, 156, 82, '#0C2A28', 12) + R(-78, -118, 156, 82, 'none', 12, 'stroke="#2D4F4B" stroke-width="3"');
  if (mode === 'idle') scr += `<g transform="translate(0 -62)">${digit('--- / --', 24)}</g>`;
  else if (mode === 'ukur') scr += `<g transform="translate(0 -62)">${digit(String(Math.round(o.cur ?? 0)), 40)}</g>`;
  else scr += T(-70, -92, 'SYS', col, 13, '', 'start') + T(-70, -52, 'DIA', col, 13, '', 'start') + `<g transform="translate(24 -80)">${digit(String(o.sys ?? 120), 34)}</g><g transform="translate(24 -40)">${digit(String(o.dia ?? 80), 34)}</g>`;
  const press = o.press ?? 0;
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 4, 118, 10, 'rgba(0,0,0,.18)')}${R(-W / 2, -H, W, H, '#F4F8F7', 26)}${R(-W / 2, -H, W, H, 'none', 26, 'stroke="#C9DAD5" stroke-width="5"')}${R(-W / 2 + 10, -H + 10, W - 20, 12, HC.teal, 6)}${scr}`
    + `<g transform="translate(0 ${press * 4})">${C(0, -18, 15, press > 0.3 ? '#2F9E62' : HC.ok)}${P('M-5 -26L8 -18L-5 -10Z', '#fff')}</g>${C(-70, -18, 7, '#CFDCD8')}${C(70, -18, 7, '#CFDCD8')}${R(W / 2 - 10, -80, 22, 30, '#2C3E50', 8)}${T(-52, -14, 'mmHg', '#6B7780', 13)}</g>`;
}

// manset melingkar di lengan: titik tengah (x,y) lokal, arah lengan (derajat), tebal (lebar manset sepanjang lengan) dan tinggi (melintang lengan), inflate 0..1
export function cuffBand(x, y, ang, len = 56, thick = 74, inflate = 0) {
  const k = 1 + 0.16 * inflate;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})"><rect x="${f1(-len / 2)}" y="${f1(-thick / 2 * k)}" width="${len}" height="${f1(thick * k)}" rx="14" fill="#3C6FB5"/><rect x="${f1(-len / 2 + 6)}" y="${f1(-thick / 2 * k + 6)}" width="${len - 12}" height="${f1(thick * k - 12)}" rx="9" fill="none" stroke="#5F93D6" stroke-width="4"/><rect x="${f1(-len / 2)}" y="${f1(-6)}" width="${len}" height="12" fill="#A9C5EE" opacity=".5"/></g>`;
}

// ---------------------------------------------------------------- grafik tekanan arteri berdenyut (gelombang), 1 denyut = periode detik
// sys/dia dalam mmHg (skala: 60..170 -> tinggi). t = detik; guide: garis putus-putus sistolik/diastolik berlabel.
function pulse(u, sys, dia) { // u 0..1 satu denyut: naik cepat saat sistol, takik dikrotik, turun pelan sampai diastol
  const hiN = 1, lo = 0;
  let v; if (u < 0.14) v = lo + (hiN - lo) * sm(u / 0.14); else if (u < 0.4) v = hiN - (hiN - 0.72) * sm((u - 0.14) / 0.26); else if (u < 0.46) v = 0.72 + 0.08 * Math.sin((u - 0.4) / 0.06 * Math.PI); else v = 0.72 - 0.72 * sm((u - 0.46) / 0.54) * 0.98;
  return dia + (sys - dia) * v;
}
export function bpWave(x, y, w, h, t, o = {}) {
  const sys = o.sys ?? 120, dia = o.dia ?? 80, per = o.per ?? 1.1, lo = 50, hi = 175, col = o.col ?? '#E8665F';
  const Y = (v) => y + h - (v - lo) / (hi - lo) * h;
  let g = R(x, y, w, h, 'rgba(6,28,32,.9)', 24) + R(x, y, w, h, 'none', 24, 'stroke="#fff" stroke-opacity=".5" stroke-width="3"');
  const span = 3 * per; let d = '';
  for (let i = 0; i <= 120; i++) { const tt = t - span + span * i / 120 + 100; const u = ((tt / per) % 1 + 1) % 1; const px = x + 22 + (w - 44) * i / 120; d += (i ? 'L' : 'M') + f1(px) + ' ' + f1(Y(pulse(u, sys, dia))); }
  g += `<clipPath id="bw${Math.round(x)}${Math.round(y)}"><rect x="${x + 8}" y="${y}" width="${w - 16}" height="${h}"/></clipPath><g clip-path="url(#bw${Math.round(x)}${Math.round(y)})"><path d="${d}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const gl = (v, txt, c, a, dy) => `<g opacity="${a}"><line x1="${x + 14}" y1="${f1(Y(v))}" x2="${x + w - 14}" y2="${f1(Y(v))}" stroke="${c}" stroke-width="3" stroke-dasharray="12 10"/>${T(x + w - 20, f1(Y(v) + dy), txt, c, 26, '', 'end')}</g>`;
  g += gl(sys, o.sysLabel ?? `Sistolik ${sys}`, '#FFD27A', o.aSys ?? 1, -10) + gl(dia, o.diaLabel ?? `Diastolik ${dia}`, '#9DE0BD', o.aDia ?? 1, 34);
  return g;
}

// ---------------------------------------------------------------- jantung: potongan 4 ruang (skema). c 0..1 = kontraksi ventrikel (sistol), hyper 0..1 = penebalan dinding ventrikel kiri (bertahap).
// atrium mengembang saat ventrikel mengerut. Koordinat lokal dipusatkan di (cx,cy), s = skala (lebar ±280*s).
export function heartCut(cx, cy, s = 1, o = {}) {
  const c = o.c ?? 0, hy = o.hyper ?? 0, tt = o.t ?? 0;
  const X = (v) => f1(cx + v * s), Y = (v) => f1(cy + v * s);
  const body = `M${X(-20)} ${Y(-230)}C${X(-200)} ${Y(-250)} ${X(-300)} ${Y(-110)} ${X(-268)} ${Y(30)}C${X(-236)} ${Y(160)} ${X(-110)} ${Y(250)} ${X(20)} ${Y(300)}C${X(150)} ${Y(250)} ${X(270 + 18 * hy)} ${Y(150)} ${X(292 + 24 * hy)} ${Y(10)}C${X(312 + 22 * hy)} ${Y(-130)} ${X(220)} ${Y(-250)} ${X(80)} ${Y(-230)}Z`;
  let g = '';
  // pembuluh besar: aorta (dari ventrikel kiri melengkung ke atas) dan arteri pulmonalis
  const flowA = o.flow ?? 1, ao = `M${X(70)} ${Y(-150)}C${X(70)} ${Y(-300)} ${X(120)} ${Y(-380)} ${X(200)} ${Y(-350)}C${X(250)} ${Y(-330)} ${X(262)} ${Y(-260)} ${X(256)} ${Y(-200)}`;
  g += L(ao, HC.oxDk, 70 * s) + L(ao, HC.ox, 50 * s);
  const pa = `M${X(-70)} ${Y(-140)}C${X(-72)} ${Y(-260)} ${X(-110)} ${Y(-330)} ${X(-190)} ${Y(-330)}`;
  g += L(pa, HC.deoxDk, 52 * s) + L(pa, HC.deox, 36 * s);
  g += `<path d="${body}" fill="${HC.myo}" stroke="${HC.myoEdge}" stroke-width="${f1(7 * s)}" stroke-linejoin="round"/>`;
  // ruang jantung. Atrium (atas) membesar sedikit ketika ventrikel berkontraksi
  const atr = 1 + 0.08 * c, vk = 1 - 0.26 * c, lvk = vk * (1 - 0.2 * hy);
  const ell = (x0, y0, rx, ry, rot, f, st) => `<ellipse cx="${X(x0)}" cy="${Y(y0)}" rx="${f1(rx * s)}" ry="${f1(ry * s)}" transform="rotate(${rot} ${X(x0)} ${Y(y0)})" fill="${f}" stroke="${st}" stroke-width="${f1(4 * s)}"/>`;
  g += ell(-150, -120, 82 * atr, 62 * atr, -12, HC.deox, HC.deoxDk) + ell(148, -122, 78 * atr, 58 * atr, 12, HC.ox, HC.oxDk);   // RA, LA
  // ventrikel: bentuk dasar bulat-lonjong yang menciut ke pusatnya saat kontraksi; dinding kiri menebal (hyper) karena ruangnya menyempit
  const vy = 78;
  g += ell(-104, vy + 10, 86 * vk, 150 * vk, 8, HC.deox, HC.deoxDk);                         // RV
  g += ell(112, vy + 6, (96 - 22 * hy) * lvk, (160 - 26 * hy) * lvk, -10, HC.ox, HC.oxDk);   // LV
  // katup (tanda kecil)
  g += R(-28 * s + cx, cy + -24 * s, 56 * s, 12 * s, '#fff', 6 * s, 'opacity=".0"');
  // aliran: panah kecil bergerak di aorta saat sistol
  if (flowA > 0) { const arrows = [0, 1, 2].map((i) => { const u = (((tt * 1.1 + i / 3) % 1) + 1) % 1, a = Math.min(1, u * 4) * (1 - Math.max(0, (u - 0.8) * 5)); const px = lerpBez(ao, s, cx, cy, u); return `<circle cx="${f1(px[0])}" cy="${f1(px[1])}" r="${f1(9 * s)}" fill="#fff" opacity="${f1(0.85 * a * (0.35 + 0.65 * c))}"/>`; }).join(''); g += arrows; }
  return g;
}
function lerpBez(d, s, cx, cy, u) { // titik pada kurva aorta (dua segmen kubik) dalam koordinat kanvas
  const X = (v) => cx + v * s, Y = (v) => cy + v * s;
  const seg = u < 0.5 ? [[70, -150], [70, -300], [120, -380], [200, -350]] : [[200, -350], [250, -330], [262, -260], [256, -200]], k = u < 0.5 ? u * 2 : (u - 0.5) * 2;
  const b = (i) => (1 - k) ** 3 * seg[0][i] + 3 * (1 - k) ** 2 * k * seg[1][i] + 3 * (1 - k) * k * k * seg[2][i] + k ** 3 * seg[3][i];
  return [X(b(0)), Y(b(1))];
}

// ---------------------------------------------------------------- penampang pembuluh arteri dengan tekanan (panah ke luar). pr 0..1 = tekanan; wall 0..1 penebalan dinding (bertahap, seiring waktu)
export function pressVessel(cx, cy, Rr, o = {}) {
  const pr = o.pr ?? 0.4, wl = o.wall ?? 0, tt = o.t ?? 0, beat = 0.5 + 0.5 * Math.sin(tt * 5.2);
  const advR = Rr, medR = Rr * (0.92 - 0.02 * wl), medIn = Rr * (0.62 - 0.12 * wl), lum = medIn * (0.94 - 0.16 * wl) * (1 + (0.02 + 0.05 * pr) * beat);
  let g = C(cx, cy, advR, MC.adv) + C(cx, cy, advR, 'none', `stroke="${MC.advDk}" stroke-width="${f1(Rr * 0.03)}"`);
  g += C(cx, cy, medR, MC.media);
  for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2, r1 = lp(medIn, medR, 0.2 + 0.6 * ((i * 7) % 5) / 5); g += `<path d="M${f1(cx + Math.cos(a) * r1)} ${f1(cy + Math.sin(a) * r1)}A${f1(r1)} ${f1(r1)} 0 0 1 ${f1(cx + Math.cos(a + 0.13) * r1)} ${f1(cy + Math.sin(a + 0.13) * r1)}" fill="none" stroke="${MC.mediaDk}" stroke-width="${f1(Rr * 0.024)}" stroke-linecap="round"/>`; }
  g += C(cx, cy, medIn, MC.intima) + C(cx, cy, medIn, 'none', `stroke="#F7F0E6" stroke-width="${f1(Rr * 0.016)}"`);
  g += C(cx, cy, lum, MC.blood);
  const rnd = SEED(7); for (let i = 0; i < 8; i++) { const a = rnd() * 6.28 + tt * 0.5, d = rnd() * lum * 0.66; g += rbc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Rr * 0.07, rnd() * 180 + tt * 20); }
  g += C(cx, cy, lum, 'none', `stroke="${MC.endo}" stroke-width="${f1(Rr * 0.035)}" stroke-dasharray="${f1(Rr * 0.17)} ${f1(Rr * 0.012)}"`);
  // panah tekanan ke dinding: jumlah tetap, panjang mengikuti tekanan dan denyut
  const N = 12, arr = [];
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + 0.2, len = Rr * (0.1 + 0.26 * pr) * (0.8 + 0.4 * beat), p0 = pt(cx, cy, lum - Rr * 0.14 - len, a), p1 = pt(cx, cy, lum - Rr * 0.09, a), hx = pt(cx, cy, lum - Rr * 0.03, a), hl = pt(cx, cy, lum - Rr * 0.16, a + 0.12), hr = pt(cx, cy, lum - Rr * 0.16, a - 0.12); arr.push(`<path d="M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}" stroke="#FFE08A" stroke-width="${f1(Rr * 0.04)}" stroke-linecap="round"/><path d="M${f1(hl[0])} ${f1(hl[1])}L${f1(hx[0])} ${f1(hx[1])}L${f1(hr[0])} ${f1(hr[1])}" fill="none" stroke="#FFE08A" stroke-width="${f1(Rr * 0.04)}" stroke-linecap="round" stroke-linejoin="round"/>`); }
  g += `<g opacity="${f1(0.35 + 0.65 * pr)}">${arr.join('')}</g>`;
  return g;
}

// ---------------------------------------------------------------- otak: tampak samping dengan cabang arteri. mode 'iskemik' (tersumbat) atau 'hemoragik' (pecah); p 0..1 kemajuan kejadian
export function brainStroke(cx, cy, s, mode, p, t = 0) {
  const X = (v) => f1(cx + v * s), Y = (v) => f1(cy + v * s);
  const cer = `M${X(-250)} ${Y(20)}C${X(-270)} ${Y(-130)} ${X(-170)} ${Y(-220)} ${X(-30)} ${Y(-225)}C${X(130)} ${Y(-232)} ${X(250)} ${Y(-150)} ${X(262)} ${Y(-20)}C${X(272)} ${Y(70)} ${X(210)} ${Y(120)} ${X(120)} ${Y(122)}C${X(60)} ${Y(124)} ${X(30)} ${Y(100)} ${X(-30)} ${Y(112)}C${X(-120)} ${Y(130)} ${X(-240)} ${Y(110)} ${X(-250)} ${Y(20)}Z`;
  let g = `<path d="${cer}" fill="#F2B7B0" stroke="#C5817A" stroke-width="${f1(6 * s)}" stroke-linejoin="round"/>`;
  g += `<path d="M${X(-30)} ${Y(112)}C${X(-10)} ${Y(170)} ${X(20)} ${Y(200)} ${X(50)} ${Y(215)}L${X(86)} ${Y(190)}C${X(70)} ${Y(160)} ${X(70)} ${Y(130)} ${X(80)} ${Y(118)}Z" fill="#E9A39B" stroke="#C5817A" stroke-width="${f1(5 * s)}"/>` + `<path d="M${X(-250)} ${Y(60)}C${X(-200)} ${Y(150)} ${X(-110)} ${Y(170)} ${X(-40)} ${Y(138)}C${X(-90)} ${Y(110)} ${X(-180)} ${Y(100)} ${X(-250)} ${Y(60)}Z" fill="#E4938B" stroke="#C5817A" stroke-width="${f1(5 * s)}"/>`;
  // lekuk otak (gyri): garis lengkung
  const sul = ['M-200 -60C-150 -110 -90 -90 -60 -150', 'M-210 10C-150 -30 -100 -10 -60 -60', 'M-30 -190C0 -140 40 -150 60 -100', 'M20 -60C60 -90 110 -60 140 -110', 'M60 20C110 -20 160 20 200 -30', 'M-100 60C-60 20 -10 40 20 0', 'M110 80C150 50 200 70 230 30'];
  g += sul.map((d) => `<path d="${d.replace(/(-?\d+) (-?\d+)/g, (m, a, b) => `${X(+a)} ${Y(+b)}`)}" fill="none" stroke="#D99A92" stroke-width="${f1(7 * s)}" stroke-linecap="round"/>`).join('');
  // wilayah yang dialiri cabang arteri (kanan atas): daerah cabang
  const territory = `M${X(40)} ${Y(-150)}C${X(110)} ${Y(-170)} ${X(210)} ${Y(-120)} ${X(230)} ${Y(-30)}C${X(200)} ${Y(20)} ${X(120)} ${Y(30)} ${X(60)} ${Y(-10)}C${X(30)} ${Y(-50)} ${X(30)} ${Y(-110)} ${X(40)} ${Y(-150)}Z`;
  const trunk = `M${X(-10)} ${Y(150)}C${X(-10)} ${Y(60)} ${X(10)} ${Y(-20)} ${X(50)} ${Y(-60)}`, br1 = `M${X(50)} ${Y(-60)}C${X(100)} ${Y(-100)} ${X(160)} ${Y(-110)} ${X(215)} ${Y(-70)}`, br2 = `M${X(50)} ${Y(-60)}C${X(80)} ${Y(-20)} ${X(130)} ${Y(-5)} ${X(180)} ${Y(-20)}`, br3 = `M${X(90)} ${Y(-95)}C${X(95)} ${Y(-130)} ${X(110)} ${Y(-150)} ${X(130)} ${Y(-158)}`;
  const vcol = '#B8322A';
  if (mode === 'iskemik') {
    const pa = sm(p);
    g += `<path d="${territory}" fill="#7C8CB0" opacity="${f1(0.62 * pa)}"/>`;
    g += [trunk, br1, br2, br3].map((d, i) => L(d, vcol, (i === 0 ? 14 : 9) * s)).join('');
    // sumbatan (bekuan) pada cabang utama: tumbuh dan menutup; alir putus di hilir
    const k = sm(p * 1.6), bx = 50, by = -60;
    g += `<g transform="translate(${X(bx - 6)} ${Y(by + 4)}) scale(${f1(0.3 + 0.7 * k)})" opacity="${f1(clamp(p * 4, 0, 1))}"><ellipse rx="${f1(26 * s)}" ry="${f1(34 * s)}" fill="#6B1B24" stroke="#3E0E14" stroke-width="${f1(4 * s)}" transform="rotate(-28)"/>${C(-8 * s, -8 * s, 6 * s, '#8E5BBF')}${C(9 * s, 9 * s, 6 * s, '#8E5BBF')}</g>`;
    g += `<g opacity="${f1(pa)}">${[br1, br2, br3].map((d) => L(d, '#3A4468', 4 * s, 'stroke-dasharray="6 10"')).join('')}</g>`;
  } else {
    const pa = sm(p), k = sm(p * 1.3);
    g += [trunk, br1, br2, br3].map((d, i) => L(d, vcol, (i === 0 ? 14 : 9) * s)).join('');
    // pecah: bercak darah meluas di jaringan sekitar titik pecah (cabang atas) dan semburan kecil
    const bx = 150, by = -105, rr = (14 + 62 * k) * s;
    g += `<g opacity="${f1(clamp(p * 3, 0, 1))}"><path d="${blobPath(cx + bx * s, cy + by * s, rr)}" fill="#8E1F26" opacity=".92"/><path d="${blobPath(cx + bx * s, cy + by * s, rr * 0.68)}" fill="#B8322A"/></g>`;
    for (let i = 0; i < 5; i++) { const a = -2.4 + i * 0.5 + Math.sin(t * 6 + i) * 0.08, d = (20 + (((t * 1.2 + i * 0.21) % 1) * 46) * k) * s; g += `<circle cx="${f1(cx + bx * s + Math.cos(a) * d)}" cy="${f1(cy + by * s + Math.sin(a) * d)}" r="${f1((6 - ((t * 1.2 + i * 0.21) % 1) * 3.5) * s)}" fill="#B8322A" opacity="${f1(clamp(p * 3, 0, 1) * (1 - ((t * 1.2 + i * 0.21) % 1)))}"/>`; }
    g += `<g transform="translate(${f1(cx + bx * s)} ${f1(cy + by * s)})" opacity="${f1(clamp(p * 3, 0, 1))}"><path d="M-16 -10L-4 4M16 -10L4 4M0 -22V-6" stroke="#fff" stroke-width="${f1(5 * s)}" stroke-linecap="round" transform="scale(${f1(s * 1.2)})"/></g>`;
  }
  return g;
}
const blobPath = (x, y, r) => { const n = 14; let d = ''; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (1 + 0.14 * Math.sin(i * 2.7) + 0.08 * Math.cos(i * 4.1)); d += (i ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ' ' + f1(y + Math.sin(a) * rr); } return d + 'Z'; };

// ---------------------------------------------------------------- ginjal (tampak depan) dan glomerulus (nefron diperbesar)
export function kidney(cx, cy, s = 1, o = {}) {
  const X = (v) => f1(cx + v * s), Y = (v) => f1(cy + v * s), hi = o.hl ?? 0;
  const body = `M${X(40)} ${Y(-200)}C${X(-120)} ${Y(-210)} ${X(-170)} ${Y(-60)} ${X(-150)} ${Y(60)}C${X(-130)} ${Y(190)} ${X(-40)} ${Y(230)} ${X(50)} ${Y(190)}C${X(20)} ${Y(130)} ${X(20)} ${Y(110)} ${X(60)} ${Y(60)}C${X(10)} ${Y(30)} ${X(10)} ${Y(-40)} ${X(60)} ${Y(-80)}C${X(20)} ${Y(-120)} ${X(10)} ${Y(-160)} ${X(40)} ${Y(-200)}Z`;
  let g = `<path d="${body}" fill="#D9715F" stroke="#A64B3D" stroke-width="${f1(7 * s)}" stroke-linejoin="round"/>`;
  g += `<path d="M${X(34)} ${Y(-170)}C${X(-100)} ${Y(-180)} ${X(-140)} ${Y(-50)} ${X(-122)} ${Y(55)}C${X(-104)} ${Y(165)} ${X(-30)} ${Y(195)} ${X(30)} ${Y(168)}C${X(0)} ${Y(120)} ${X(8)} ${Y(100)} ${X(40)} ${Y(60)}C${X(-14)} ${Y(30)} ${X(-12)} ${Y(-40)} ${X(40)} ${Y(-82)}C${X(8)} ${Y(-116)} ${X(2)} ${Y(-142)} ${X(34)} ${Y(-170)}Z" fill="#B8523F" opacity=".9"/>`;
  for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.5; g += `<path d="M${X(10)} ${Y(10)}L${X(-70 - 10 * Math.cos(a))} ${Y(10 + 100 * Math.sin(a))}L${X(-30 - 10 * Math.cos(a))} ${Y(10 + 110 * Math.sin(a))}Z" fill="#9C3F31" opacity=".8"/>`; }
  g += `<path d="M${X(55)} ${Y(20)}C${X(110)} ${Y(30)} ${X(130)} ${Y(80)} ${X(110)} ${Y(190)}" fill="none" stroke="#F0C27A" stroke-width="${f1(16 * s)}" stroke-linecap="round"/>`;
  g += `<path d="M${X(50)} ${Y(-30)}C${X(120)} ${Y(-40)} ${X(150)} ${Y(-110)} ${X(150)} ${Y(-210)}" fill="none" stroke="#B8322A" stroke-width="${f1(20 * s)}" stroke-linecap="round"/><path d="M${X(54)} ${Y(30)}C${X(150)} ${Y(30)} ${X(190)} ${Y(-60)} ${X(200)} ${Y(-210)}" fill="none" stroke="#5B7FC7" stroke-width="${f1(16 * s)}" stroke-linecap="round"/>`;
  if (hi > 0) g += C(cx - 60 * s, cy - 70 * s, 34 * s, 'none', `stroke="#fff" stroke-width="${f1(7 * s)}" stroke-dasharray="14 10" opacity="${f1(hi)}"`);
  return g;
}
// glomerulus: arteriol aferen -> jumbai kapiler (disaring) -> arteriol eferen; kapsul Bowman; tubulus menerima filtrat. dmg 0..1 = kerusakan bertahap (arteriol menebal-menyempit, jumbai kapiler memucat)
export function glomerulus(cx, cy, s = 1, o = {}) {
  const dmg = o.dmg ?? 0, tt = o.t ?? 0;
  const X = (v) => f1(cx + v * s), Y = (v) => f1(cy + v * s);
  let g = C(cx, cy, 190 * s, '#F7E3D9', `stroke="#D9A992" stroke-width="${f1(10 * s)}"`);   // kapsul Bowman
  g += C(cx, cy, 168 * s, '#FFF4EC');
  // tubulus keluar di kanan-bawah
  g += `<path d="M${X(110)} ${Y(140)}C${X(180)} ${Y(220)} ${X(260)} ${Y(180)} ${X(320)} ${Y(250)}" fill="none" stroke="#D9A992" stroke-width="${f1(70 * s)}" stroke-linecap="round"/><path d="M${X(110)} ${Y(140)}C${X(180)} ${Y(220)} ${X(260)} ${Y(180)} ${X(320)} ${Y(250)}" fill="none" stroke="#FFF1E8" stroke-width="${f1(46 * s)}" stroke-linecap="round"/>`;
  // arteriol aferen (masuk, kiri atas) dan eferen (keluar, kanan atas): dinding menebal dan lumen menyempit seiring kerusakan
  const wallW = (38 + 16 * dmg) * s, lumW = (28 - 12 * dmg) * s;
  const aff = `M${X(-330)} ${Y(-230)}C${X(-220)} ${Y(-200)} ${X(-150)} ${Y(-120)} ${X(-60)} ${Y(-60)}`, eff = `M${X(60)} ${Y(-60)}C${X(130)} ${Y(-150)} ${X(230)} ${Y(-190)} ${X(330)} ${Y(-240)}`;
  g += L(aff, '#A94F50', wallW) + L(aff, MC.blood, lumW) + L(eff, '#A94F50', wallW * 0.8) + L(eff, '#5B7FC7', lumW * 0.8);
  // jumbai kapiler (bergulung) -> pucat bila rusak
  const tuft = lp(0, 1, dmg), colT = tuft < 0.5 ? MC.blood : '#B67C86';
  const loops = 7; for (let i = 0; i < loops; i++) { const a = i / loops * Math.PI * 2 + 0.4; const p0 = pt(cx, cy, 58 * s, a), p1 = pt(cx, cy, 108 * s, a + 0.5), p2 = pt(cx, cy, 52 * s, a + 1.2); g += `<path d="M${f1(p0[0])} ${f1(p0[1])}Q${f1(p1[0])} ${f1(p1[1])} ${f1(p2[0])} ${f1(p2[1])}" fill="none" stroke="${mixC('#B8322A', '#B67C86', dmg)}" stroke-width="${f1((34 - 8 * dmg) * s)}" stroke-linecap="round"/>`; }
  g += C(cx, cy, 34 * s, mixC('#C9382E', '#B67C86', dmg));
  // jaringan parut (kerusakan): bintik pucat di jumbai
  if (dmg > 0.35) for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, d = (40 + (i % 3) * 22) * s; g += C(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 9 * s, '#F3E6E0', `opacity="${f1(0.75 * clamp((dmg - 0.35) / 0.3, 0, 1))}"`); }
  // sel darah bergerak di arteriol aferen
  for (let i = 0; i < 4; i++) { const u = (((tt * (0.5 - 0.22 * dmg) + i / 4) % 1) + 1) % 1; const b = (a, bb, cc, d) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * bb + 3 * (1 - u) * u * u * cc + u ** 3 * d; g += rbc(cx + b(-330, -220, -150, -60) * s, cy + b(-230, -200, -120, -60) * s, 12 * s * (1 - 0.25 * dmg), u * 200); }
  // filtrat: tetesan kecil dari kapiler ke ruang kapsul menuju tubulus (menurun saat rusak)
  const fN = Math.round(6 * (1 - 0.7 * dmg)); for (let i = 0; i < fN; i++) { const u = (((tt * 0.45 + i / fN) % 1) + 1) % 1, a = 0.9 + i * 0.07, p0 = pt(cx, cy, 118 * s, a), x = p0[0] + (X(300) - p0[0]) * u * 0.35 * 1, y = p0[1] + (Y(240) - p0[1]) * u * 0.55; g += C(f1(lp(p0[0], cx + 130 * s + u * 150 * s, u)), f1(lp(p0[1], cy + 150 * s + u * 90 * s, u)), 8 * s, '#9ED8F0', `opacity="${f1(Math.sin(u * Math.PI))}"`); }
  return g;
}
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixC = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(lp(v, hex(b)[i], clamp(t, 0, 1))).toString(16).padStart(2, '0')).join('');

// ---------------------------------------------------------------- properti sehari-hari
export const saltShaker = (x, y, s = 1, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">${P('M-24 -50Q-24 -76 0 -76Q24 -76 24 -50V-40H-24Z', '#C9D4D9')}${[-10, 0, 10].map((q) => C(q, -58, 2.6, '#6B7780')).join('')}${P('M-26 -40H26L32 40Q32 52 20 52H-20Q-32 52 -32 40Z', '#EAF4F8', 'stroke="#C9DAD5" stroke-width="3"')}${R(-18, -14, 36, 30, '#E8665F', 6)}${T(0, 8, 'GARAM', '#fff', 9)}</g>`;
export const pillbox = (x, y, s = 1, open = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-90, -34, 180, 68, '#F4F8F7', 14, 'stroke="#B9CEC6" stroke-width="4"')}${[0, 1, 2, 3, 4, 5, 6].map((i) => R(-82 + i * 24, -26, 20, 52, '#fff', 6, 'stroke="#CFE3DC" stroke-width="2"') + T(-72 + i * 24, 2, 'SMTWTFS'[i], '#6B7780', 14)).join('')}${open > 0 ? C(-82 + 2 * 24 + 10, -4 - 30 * open, 10, '#F8C038', 'stroke="#D4AC1E" stroke-width="2"') : ''}</g>`;
export const pill = (x, y, r = 12, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">${R(-r * 1.4, -r * 0.7, r * 1.4, r * 1.4, '#E8665F', r * 0.7)}${R(0, -r * 0.7, r * 1.4, r * 1.4, '#fff', r * 0.7)}</g>`;
export const glass = (x, y, s = 1, lv = 0.7) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M-26 -70H26L20 40Q20 50 10 50H-10Q-20 50 -20 40Z', 'rgba(220,240,248,.75)', 'stroke="#fff" stroke-width="3"')}${P(`M${f1(-24 + 4 * (1 - lv))} ${f1(40 - 100 * lv)}H${f1(24 - 4 * (1 - lv))}L20 40Q20 50 10 50H-10Q-20 50 -20 40Z`, '#8FD3F0')}</g>`;
export const clipboard = (x, y, s = 1, lines = 4) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-52, -70, 104, 140, '#C9A27A', 12)}${R(-42, -56, 84, 118, '#fff', 8)}${R(-20, -78, 40, 18, '#8A6440', 8)}${Array.from({ length: lines }, (_, i) => R(-30, -38 + i * 24, 60 - (i % 2) * 14, 8, '#B9CEC6', 4)).join('')}</g>`;
export const pan = (x, y, s = 1, steam = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 36, 90, 10, 'rgba(0,0,0,.16)')}${R(-84, -22, 168, 52, '#4A5A66', 18)}${R(-92, -30, 184, 16, '#5E7080', 8)}${R(80, -18, 70, 14, '#3A2F28', 6)}${steam > 0 ? [0, 1, 2].map((i) => L(`M${-30 + i * 30} -40q10 -20 0 -40`, 'rgba(255,255,255,.7)', 6, `opacity="${f1(steam * (1 - (((i * 0.3) + 0) % 1) * 0.3))}"`)).join('') : ''}</g>`;
export const sayurBowl = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 36, 70, 10, 'rgba(0,0,0,.16)')}${P('M-70 0H70Q64 46 24 56H-24Q-64 46 -70 0Z', '#fff')}${C(-28, -8, 24, '#3DB46E')}${C(6, -16, 26, '#56C985')}${C(34, -4, 22, '#F28C4B')}${C(-4, 2, 16, '#E8665F')}</g>`;
export const pathBg = (t = 0) => { // taman pagi untuk jalan santai
  let s = R(-100, -100, 1300, 1400, '#CDEBF5') + C(900, 260, 90, '#FFE9A8') + R(-100, 1050, 1300, 900, '#9AD58B') + R(-100, 1190, 1300, 420, '#C9B28F') + R(-100, 1186, 1300, 10, '#B09A78');
  for (let i = 0; i < 5; i++) { const x = ((i * 300 - t * 22) % 1500 + 1500) % 1500 - 200; s += `<g transform="translate(${f1(x)} 1050)">${R(-14, -150, 28, 160, '#8A6440', 6)}${C(0, -190, 90, '#3DA15E')}${C(-52, -160, 62, '#4DB871')}${C(54, -164, 64, '#2E9A58')}</g>`; }
  return s;
};
export const kitchenBg = () => R(-100, -100, 1300, 1400, '#FBF1DE') + R(-100, 700, 1300, 12, '#E9D8B6') + R(60, 300, 330, 260, '#fff', 18) + R(60, 300, 330, 260, 'none', 18, 'stroke="#E2CFA8" stroke-width="10"') + R(700, 240, 280, 360, '#FFFDF6', 14, 'stroke="#E2CFA8" stroke-width="8"') + [0, 1, 2].map((i) => R(724, 270 + i * 110, 232, 82, '#F4E7C9', 10)).join('') + R(-100, 1218, 1300, 800, '#D8BE94') + R(-100, 1218, 1300, 14, '#BFA173');
export const counter = (x0, x1, topY) => `${R(x0, topY, x1 - x0, 26, '#C9A27A', 8)}${R(x0 + 6, topY + 26, x1 - x0 - 12, 1218 - topY - 26 + 20, '#E9D8B6', 6)}${R(x0 + 6, topY + 26, x1 - x0 - 12, 10, '#D2BE95', 4)}${[0, 1].map((i) => R(x0 + 30 + i * ((x1 - x0) / 2 - 10), topY + 60, (x1 - x0) / 2 - 50, 150, '#F4E7C9', 10, 'stroke="#D2BE95" stroke-width="4"')).join('')}`;
export { label, rbc };
