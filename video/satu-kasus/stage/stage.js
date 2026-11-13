// "SATU KASUS, BANYAK YANG HARUS NYAMBUNG" (1080 x 1920, 30 fps, durasi = narasi 39,0 dtk). Narasi Google AI Studio dipakai apa adanya (audio/narasi.wav).
// Raka = brand/characters/raka/raka.js (kanonik); Kori/Nilo/Kila = apps/web/src/mascots/*.svg (kanonik). Web MEDCOEL ASLI direkam di panel laptop (rekam/web.cjs).
// Semua waktu diambil dari ../cues.json (juga dibaca audio/audio_mix.py). Tiap bingkai dihitung dari t (detik), jadi deterministik.
import { f1, MC, FONT, clamp, lerp, sm, eo, eio, eob, seg, win } from './core.js';
import { raka, rakaSvg, lerpState, idle, ease as rEase } from '/brand/characters/raka/raka.js';
import { loadMascots, mascot, sweat } from './mascot.js';
import { R, T, pxt, pxBox, pxSpark, ping, confetti, flash, pixelClip, typer } from './fx.js';
import { DESK_Y, RAKA_POS, LAPTOP, SLOT, MESSY, CW, CH, roomBack, deskTop, laptop, card, sheet, note, tab, link, notebook } from './scenes.js';
const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json();
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('400 40px "Press Start 2P"'); await document.fonts.ready; await loadMascots();
export const DUR = C.dur;
const WEB = '/video/satu-kasus/rekam/web';
const W1 = { x: 110, y: 500, w: 860, h: 1080 };       // panel web asli: tinggi 1080 menampilkan ±75% tinggi halaman ponsel pada skala 0,8 (tanpa zoom, tanpa crop horizontal)
const ZS = 1080 / LAPTOP.w, ZOOM_RECT = { x: 0, y: 960 - LAPTOP.h * ZS / 2, w: 1080, h: LAPTOP.h * ZS };
const lerpR = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

// ------------------------------------------------------------------ rekaman web asli: [t0, t1, klip, bingkai0, bingkai1, tampilan0 [cx, cy, zoom], tampilan1]
const VW = [540, 790, 1];
const W = C.web;
const SEG = [
  [W.mk[0], W.mk[1], 'mk', 0, 25, VW, VW],
  [W.bab[0], W.bab[1], 'bab', 0, 31, VW, VW],
  [W.materi[0], W.materi[0] + 0.5, 'materi', 12, 32, VW, VW],                      // ketuk "Belajar materi", halaman terbuka
  [W.materi[0] + 0.5, W.materi[0] + 1.4, 'materi', 32, 80, VW, VW],                // gulir sampai gambar
  [W.materi[0] + 1.4, W.materi[1], 'materi', 80, 108, VW, [540, 860, 1]],          // gambar terlihat jelas
  [W.flash[0], W.flash[0] + 0.4, 'flash', 14, 33, VW, VW],                         // ketuk Flashcard, kartu depan
  [W.flash[0] + 0.4, W.flash[0] + 1.0, 'flash', 33, 66, VW, VW],                   // balik kartu, jawaban
  [W.flash[0] + 1.0, W.flash[1], 'flash', 66, 87, VW, VW],                         // Hafal, kartu berikutnya
  [W.soal[0], W.soal[0] + 0.5, 'soal', 8, 29, VW, VW],                             // ketuk Latihan soal, dialog sesi
  [W.soal[0] + 0.5, W.soal[0] + 1.1, 'soal', 29, 55, VW, [540, 840, 1]],           // mulai, soal tampil
  [W.soal[0] + 1.1, W.soal[0] + 2.2, 'soal', 55, 98, [540, 840, 1], [540, 900, 1]], // jawab, Cek jawaban
  [W.soal[0] + 2.2, W.soal[1], 'soal', 98, 149, [540, 900, 1], [540, 1010, 1]],     // pembahasan
];
const urlOf = (clip, i) => `${WEB}/${clip}/f${String(Math.round(i)).padStart(4, '0')}.jpg`;
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
function webFrame(t) {
  const tt = clamp(t, SEG[0][0], W.soal[1] - 0.001), s = SEG.find((x) => tt >= x[0] && tt < x[1]) || SEG[SEG.length - 1], u = clamp((tt - s[0]) / (s[1] - s[0]));
  return { clip: s[2], i: lerp(s[3], s[4], u), v: [0, 1, 2].map((k) => lerp(s[5][k], s[6][k], sm(u))) };
}
function panelRect(t) {
  if (t < C.panelGrow[0]) return ZOOM_RECT;
  if (t < C.panelGrow[1]) return lerpR(ZOOM_RECT, W1, eio((t - C.panelGrow[0]) / (C.panelGrow[1] - C.panelGrow[0])));
  if (t < C.pixelOut[0] - 0.3) return W1;
  if (t < C.pixelOut[0] + 0.2) return lerpR(W1, ZOOM_RECT, eio((t - (C.pixelOut[0] - 0.3)) / 0.5));
  return ZOOM_RECT;
}
function panelSvg(t, r) {
  const f = webFrame(t), z = f.v[2], sc = (r.w / 1080) * z, x = r.x + r.w / 2 - f.v[0] * sc, y = r.y + r.h / 2 - f.v[1] * sc;
  const rad = lerp(10, 26, clamp((r.w - ZOOM_RECT.w * 0.9) / 60));
  return { rad, svg: `<clipPath id="clipPanel"><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" rx="${f1(rad)}"/></clipPath><g clip-path="url(#clipPanel)"><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" fill="#EAF6F1"/><image href="${urlOf(f.clip, f.i)}" x="${f1(x)}" y="${f1(y)}" width="${f1(1080 * sc)}" height="${f1(1800 * sc)}" preserveAspectRatio="none"/></g>` };
}

// ------------------------------------------------------------------ Raka (kanonik): kunci ekspresi + pose
const RK = [
  [0.0, 'lega', 'menunjuk', { yaw: 0.3, gazeX: 0.5, gazeY: 0.1 }],                       // yakin: "oke, kasusnya begini..."
  [1.9, 'netral', 'netral', { yaw: 0.6, gazeX: 0.9, gazeY: 0.3 }],                       // menoleh ke lembar kasus yang meluncur
  [3.35, 'waspada', 'netral', { yaw: 0.55, gazeX: 0.9, gazeY: 0.4 }],
  [C.bingung, 'bingung', 'berpikir', { yaw: 0.35, gazeX: 0.6, gazeY: 0.3 }],
  [C.tunggu - 0.15, 'kaget', 'kaget', {}],
  [7.3, 'khawatir', 'pegang_buku', { yaw: 0.55, gazeX: 0.8, gazeY: 0.35 }],
  [9.35, 'melongo', 'pegang_buku', { yaw: 0.5, gazeX: 0.8, gazeY: 0.35 }],
  [11.0, 'khawatir', 'angkat_bahu', { yaw: 0.2, gazeX: 0.4, gazeY: 0.2 }],
  [12.9, 'bingung', 'pegang_buku', { sweat: 0.6 }],
  [C.slump, 'sedih', 'netral', { slump: 1, sweat: 1, yaw: 0, gazeY: 0.5 }],
  [C.recede[0] + 0.1, 'penasaran', 'netral', { yaw: 0.8, gazeX: 1, slump: 0.2 }],
  [C.nilo + 0.9, 'mengerti', 'menunjuk', { yaw: 0.85, gazeX: 1 }],
  [C.zoomIn[1], 'netral', 'netral', { yaw: 0.5, gazeX: 0.8 }],
  [C.tidy[0] - 0.4, 'berpikir', 'berpikir', { yaw: 0.3, gazeX: 0.6, gazeY: 0.4 }],
  [C.connect - 0.2, 'mengerti', 'menunjuk', { yaw: 0.4, gazeX: 0.6, gazeY: 0.5 }],
  [C.relax, 'lega', 'netral', { yaw: 0.2, gazeX: 0.3, gazeY: 0.1 }],
  [33.0, 'senang', 'senang', {}],
  [C.endCard - 0.3, 'senang', 'sapa', {}],
];
const mkR = (k) => raka(k[1], k[2], k[3] || {});
function rakaState(t) {
  let i = 0; while (i + 1 < RK.length && RK[i + 1][0] <= t) i++;
  let st = i === 0 ? mkR(RK[0]) : lerpState(mkR(RK[i - 1]), mkR(RK[i]), rEase((t - RK[i][0]) / 0.45));
  st = idle(st, t);
  if (t >= 13.3 && t < C.slump) { const u = (t - 13.3), env = Math.min(1, u / 0.3); st.yaw = clamp(st.yaw + Math.sin(u * 3.3) * 0.9 * env, -1, 1); st.gazeX = clamp(st.gazeX + Math.sin(u * 3.3) * 0.9 * env, -1, 1); }
  if (t >= C.tidy[0] && t < C.tidy[1]) { const u = (t - C.tidy[0]) / (C.tidy[1] - C.tidy[0]); st.yaw = clamp(0.2 + Math.sin(u * 7) * 0.5, -1, 1); st.gazeX = st.yaw; st.gazeY = 0.45; }
  return st;
}
function rakaG(t) {
  const s = RAKA_POS.s, tx = RAKA_POS.x - 200 * s, ty = DESK_Y - 640 * s;
  const bk = Math.max(win(t, 7.3, 11.0, 0.3), win(t, 12.9, C.slump + 0.2, 0.3));
  return `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${s})">${rakaSvg(rakaState(t), { bare: true, shadow: false, uid: 'rk' })}</g>` + notebook(RAKA_POS.x, ty + 506 * s, bk, Math.sin(t * 3) * 3, 1.15);
}

// ------------------------------------------------------------------ benda di meja menurut waktu
const POP = (t, tc, d = 0.9) => clamp((t - tc) / d);
const SPAWN = SLOT.S;
/** pose kartu A/F/P (x, y, rot, k, a, bab) untuk waktu t */
function cardPose(kind, t) {
  const tc = C.cards[kind], M = MESSY[kind], S = SLOT[kind];
  if (t < tc) return null;
  let x, y, rot, k, a = 1, bab = 0;
  const f = eo(clamp((t - tc) / 0.55)), big = 0.55 * (1 - sm((t - tc) / 1.0));          // pop: terbang dari lembar kasus + membesar sebentar
  x = lerp(SPAWN[0], M[0], f); y = lerp(SPAWN[1], M[1], f) - Math.sin(Math.PI * f) * 40; rot = lerp(0, M[2], f); k = (0.3 + 0.7 * eob(clamp((t - tc) / 0.5))) + big;
  const rc0 = C.recede[0], rc1 = C.recede[1], ret = C.ret[0], rd = C.ret[1] - C.ret[0];
  if (t >= rc0) {
    const u = eio(clamp((t - rc0) / (rc1 - rc0)));
    if (kind === 'A') {
      const toLap = eio(clamp((t - C.cardToLaptop[0]) / (C.cardToLaptop[1] - C.cardToLaptop[0])));
      x = lerp(M[0], 540, u); y = lerp(M[1], 1290, u); rot = lerp(M[2], 0, u); k = lerp(1, 1.25, u); bab = u > 0.5 ? 1 : 0;
      if (t >= C.cardToLaptop[0]) { x = lerp(540, LAPTOP.cx, toLap); y = lerp(1290, LAPTOP.cy, toLap); k = lerp(1.25, 0.12, toLap); a = 1 - clamp((toLap - 0.7) / 0.3); }
    } else { y += u * 420; a = 1 - u; }
  }
  if (t >= ret) {                                                                     // kembali ke meja diskusi: terbang dari bawah / dari laptop
    const r = eo(clamp((t - ret) / rd));
    if (kind === 'A') { x = lerp(LAPTOP.cx, M[0], r); y = lerp(LAPTOP.cy, M[1], r); rot = lerp(0, M[2], r); k = lerp(0.12, 1, r); a = r; bab = 0; }
    else { x = M[0]; y = lerp(M[1] + 420, M[1], r); rot = M[2]; k = 1; a = r; }
  }
  const td = eio(clamp((t - C.tidy[0]) / (C.tidy[1] - C.tidy[0])));                  // dirapikan
  if (t >= C.tidy[0]) { x = lerp(x, S[0], td); y = lerp(y, S[1], td); rot = lerp(rot, 0, td); }
  return { x, y, rot, k, a, bab };
}
function sheetPose(t) {
  const [h0, h1] = C.highlight; let x, y, k = 1.9, rot, a = 1;
  if (t < C.sheetLand) { const u = eo(clamp(t / 2.8)); x = lerp(1380, 540, u); y = lerp(1340, 1250, u); rot = lerp(16, -2, u); }
  else if (t < C.sheetToDesk[0]) { x = 540; y = 1250 + Math.sin((t - C.sheetLand) * 5) * 3; rot = -2; }
  else { const u = eio(clamp((t - C.sheetToDesk[0]) / (C.sheetToDesk[1] - C.sheetToDesk[0]))); x = lerp(540, SLOT.S[0], u); y = lerp(1250, SLOT.S[1], u); k = lerp(1.9, 1, u); rot = lerp(-2, -4, u); }
  if (t >= C.recede[0]) { const u = eio(clamp((t - C.recede[0]) / (C.recede[1] - C.recede[0]))); y += u * 420; a = 1 - u; }
  const ret = C.ret[0]; if (t >= ret) { const r = eo(clamp((t - ret) / (C.ret[1] - C.ret[0]))); y = lerp(SLOT.S[1] + 420, SLOT.S[1], r); a = r; }
  if (t >= C.tidy[0]) rot = lerp(-4, 0, eio(clamp((t - C.tidy[0]) / (C.tidy[1] - C.tidy[0]))));
  return { x, y, k, rot, a, hl: clamp((t - h0) / 0.9) };
}
const NOTES = [[240, 1395, 12], [520, 1226, -14], [770, 1404, 9]];
const TABS = [[665, 612, -3], [885, 692, 4], [700, 776, -2], [915, 816, 6]];
function desk(t) {
  let g = '';
  // lembar kasus
  const sp = sheetPose(t); g += sheet(sp.x, sp.y, { ...sp, t });
  // catatan kecil (berantakan) muncul satu per satu, hilang saat dirapikan
  C.notes.forEach((tn, i) => {
    if (t < tn) return; const u = eob(clamp((t - tn) / 0.5)), [x, y, r] = NOTES[i];
    let a = 1, yy = y; if (t >= C.recede[0]) { const v = eio(clamp((t - C.recede[0]) / (C.recede[1] - C.recede[0]))); yy += v * 420; a = 1 - v; }
    const ret = C.ret[0]; if (t >= ret) { const rr = eo(clamp((t - ret) / (C.ret[1] - C.ret[0]))); yy = lerp(y + 420, y, rr); a = rr; }
    const td = clamp((t - C.tidy[0]) / 0.7); a *= 1 - td;
    g += note(x, yy, r, i, a, u * (1 - 0.3 * td));
  });
  // kartu materi
  const P = {}; for (const kd of ['A', 'F', 'P']) { P[kd] = cardPose(kd, t); }
  // garis hubungan: putus-putus -> utuh
  const nodes = [['S', { x: sp.x, y: sp.y - 125 * sp.k + 6, a: sp.a }], ['A', P.A], ['F', P.F], ['P', P.P]];
  const top = (p) => [p.x, p.y - CH / 2 * p.k * 0.98];
  const kLink = seg(t, C.connect, C.connect + 0.7, eio);
  const pairs = [[0, 1, C.cards.A + 0.4], [1, 2, C.cards.F + 0.4], [2, 3, C.cards.P + 0.4]];
  pairs.forEach(([i, j, ts]) => {
    const a = nodes[i][1], b = nodes[j][1]; if (!a || !b || t < ts) return;
    const aa = Math.min(a.a ?? 1, b.a ?? 1) * clamp((t - ts) / 0.4); if (aa <= 0.01) return;
    const pa = i === 0 ? [a.x, a.y] : top(a), pb = top(b);
    g += link(pa, pb, { k: kLink, a: aa, t, lift: 70 + (i === 1 ? 14 : 0) });
  });
  for (const kd of ['A', 'F', 'P']) { const p = P[kd]; if (p) g += card(kd === 'A' && p.bab ? 'BAB' : kd, p.x, p.y, { ...p, t }); }
  // sorot (ping) saat benda muncul
  for (const [kd, tc] of Object.entries(C.cards)) if (t >= tc && t < tc + 0.5) { const p = P[kd]; g += ping(p.x, p.y, t - tc, MC.gold, 120); }
  C.notes.forEach((tn, i) => { if (t >= tn && t < tn + 0.5) g += ping(NOTES[i][0], NOTES[i][1], t - tn, '#E8665F', 80); });
  // tab melayang (di atas papan tulis)
  C.tabs.forEach((tt, i) => {
    if (t < tt) return; const u = eob(clamp((t - tt) / 0.45)); let a = 1, y = TABS[i][1] + Math.sin(t * 1.7 + i) * 4;
    if (t >= C.recede[0]) { const v = eio(clamp((t - C.recede[0]) / (C.recede[1] - C.recede[0]))); y -= v * 120; a = 1 - v; }
    g += tab(TABS[i][0], y, TABS[i][2], i, a, u);
    if (t < tt + 0.5) g += ping(TABS[i][0], TABS[i][1], t - tt, MC.brand, 110);
  });
  return g;
}

// ------------------------------------------------------------------ adegan penuh (kamera diterapkan di master)
function koriNiloKila(t) {
  let g = '';
  // Nilo (mewakili "mencoba lagi") masuk dan menunjuk kartu BAB
  const n0 = C.nilo, n1 = C.zoomIn[1] + 0.2;
  if (t >= n0 && t < n1) {
    const u = eo(clamp((t - n0) / 0.7)), out = clamp((t - (C.cardToLaptop[1] + 0.05)) / 0.4);
    g += `<g opacity="${f1(1 - out)}">${mascot('nilo', { x: lerp(1300, 880, u) + out * 200, y: 1318, s: 0.85, flip: -1, bob: Math.sin(t * 6) * 4, arm: -62 + Math.sin(t * 9) * 8, eyes: 'normal', mouth: 'happy', spark: 0.8 })}</g>`;
    if (u > 0.9 && t < C.cardToLaptop[0]) g += pxSpark(640, 1180 + Math.sin(t * 8) * 6, 1.2);
  }
  // Kila: "oh, paham" sesudah hubungan tersusun
  const [k0, k1] = C.kila;
  if (t >= k0 && t < k1) { const a = win(t, k0, k1, 0.35); g += `<g opacity="${f1(a)}">${mascot('kila', { x: 850, y: 800 + (1 - a) * 50, s: 0.6, bob: Math.sin(t * 4) * 8, arm: Math.sin(t * 9) * 20, eyes: 'happy', mouth: 'happy', spark: 0.6 + 0.4 * Math.sin(t * 9) })}</g>` + (t < k0 + 0.8 ? pxSpark(780, 690, 1.3) + confetti(850, 720, t - k0, 14, 3, 220) : ''); }
  // Kori menemani di penutup
  if (t >= 33.0) { const a = eob(clamp((t - 33.0) / 0.5)); g += `<g opacity="${f1(clamp(a))}">${mascot('kori', { x: 535, y: 1196 + (1 - clamp(a)) * 40, s: 0.5, bob: Math.sin(t * 3) * 3, arm: -24 + Math.sin(t * 8) * 12, eyes: 'happy', mouth: 'happy', spark: 1 })}</g>`; }
  return g;
}
function laptopState(t) { return t < C.cardToLaptop[1] ? 'off' : 'on'; }
function scene(t, web = false) {
  let g = roomBack(t);
  g += web ? '' : rakaG(t);
  g += deskTop();
  g += laptop(t, laptopState(t));
  if (!web) g += desk(t) + koriNiloKila(t);
  // kilau layar saat kartu BAB masuk ke laptop
  if (t >= C.cardToLaptop[0] && t < C.pixelIn[1]) g += ping(LAPTOP.cx, LAPTOP.cy, (t - C.cardToLaptop[1]) + 0.0, MC.gold, 150) + pxSpark(LAPTOP.cx + 150, LAPTOP.cy - 100, 1.3);
  return g;
}

// ------------------------------------------------------------------ kamera
function cam(t) {
  const up = sm((t - 2.55) / 0.4), down = sm((t - 3.5) / 0.8), amt = up * (1 - down);
  let S = 1 + 0.3 * amt, fx = lerp(540, 430, amt), fy = lerp(960, 1120, amt);
  const zi = eio(clamp((t - C.zoomIn[0]) / (C.zoomIn[1] - C.zoomIn[0]))), zo = eio(clamp((t - C.zoomOut[0]) / (C.zoomOut[1] - C.zoomOut[0])));
  const z = t < C.zoomOut[0] ? zi : 1 - zo;
  if (z > 0) { S = lerp(S, ZS, z); fx = lerp(fx, LAPTOP.cx, z); fy = lerp(fy, LAPTOP.cy, z); }
  return `translate(${f1(540 - fx * S)} ${f1(960 - fy * S)}) scale(${f1(S * 1000) / 1000})`;
}

// ------------------------------------------------------------------ teks
function captions(t) {
  let g = '';
  const [q0, q1] = C.mulaiDariMana;
  g += typer('MULAI DARI MANA?', t, q0, q1, { fs: 52, cps: 14, px: true });
  g += typer('SATU BAB DULU.', t, 17.15, 19.3, { fs: 52, cps: 14, px: true });
  g += typer('BACA MATERINYA.', t, W.materi[0] + 0.1, W.materi[1] - 0.1, { fs: 44, cps: 18, px: true });
  g += typer('COBA FLASHCARD.', t, W.flash[0] + 0.05, W.flash[1] - 0.05, { fs: 44, cps: 18, px: true });
  g += typer('KERJAKAN SOAL.', t, W.soal[0] + 0.05, W.soal[0] + 1.75, { fs: 44, cps: 18, px: true });
  g += typer('LIHAT PEMBAHASAN.', t, W.soal[0] + 1.85, W.soal[1] - 0.05, { fs: 44, cps: 18, px: true });
  g += typer('MULAI NYAMBUNG.', t, 27.95, 29.6, { fs: 52, cps: 14, px: true });
  g += typer('TIDAK HARUS SEMUANYA SEKALIGUS.', t, 29.75, 32.95, { fs: 42, w: 1010, cps: 26 });
  g += typer('CUKUP TAHU MULAI DARI MANA.', t, 33.05, 35.45, { fs: 44, w: 1010, cps: 26 });
  return g;
}
function endCard(t) {
  const t0 = C.endCard; if (t < t0) return '';
  const a = clamp((t - t0) / 0.3), ul = eob(clamp((t - C.endLogo) / 0.5)), ut = eob(clamp((t - C.endTitle) / 0.5)), uu = eob(clamp((t - C.endUrl) / 0.5)), cx = 770;
  // kartu penutup di sisi kanan supaya Raka (siap lanjut belajar) tetap terlihat di kiri
  let g = `<rect width="1080" height="1920" fill="#2A1A0C" opacity="${f1(0.14 * a)}"/>`;
  g += `<g opacity="${f1(a)}">${pxBox(cx - 255, 330, 510, 590, '#FFFDF6', { sw: 6, n: 12 })}</g>`;
  g += `<g transform="translate(${cx} ${f1(450 + (1 - clamp(ul)) * 30)}) scale(${f1(clamp(ul) * 1000) / 1000})" opacity="${f1(clamp(ul))}"><image href="logo-full.webp" x="-215" y="-55" width="430" height="86" preserveAspectRatio="xMidYMid meet"/></g>`;
  g += `<g transform="translate(${cx} 600) scale(${f1(clamp(ut) * 1000) / 1000})" opacity="${f1(clamp(ut))}">${pxt(0, 0, 'BELAJAR FK', MC.brand, 40, { stroke: false })}${pxt(0, 78, 'GRATIS', '#D2473A', 66, { stroke: false })}</g>`;
  g += `<g transform="translate(${cx} 810) scale(${f1(clamp(uu) * 1000) / 1000})" opacity="${f1(clamp(uu))}">${pxBox(-232, -50, 464, 100, MC.gold, { sw: 6, n: 10 })}${pxt(0, 17, 'MEDCOEL.COM', MC.ink, 38, { stroke: false })}</g>`;
  if (t >= C.endUrl && t < C.endUrl + 0.5) g += ping(cx, 810, t - C.endUrl, MC.gold, 200);
  return g;
}
const vignette = (a) => (a > 0.01 ? `<defs><radialGradient id="vg" cx="50%" cy="58%" r="70%"><stop offset=".45" stop-color="#2A1A0C" stop-opacity="0"/><stop offset="1" stop-color="#2A1A0C" stop-opacity=".62"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#vg)" opacity="${f1(a)}"/>` : '');

export function master(t) {
  let g = '';
  const web = t >= C.panelGrow[0] && t < C.pixelOut[0];
  if (!web) g += `<g transform="${cam(t)}">${scene(t)}</g>`;
  else g += scene(t, true) + R(0, 0, 1080, 1920, '#2A1A0C', 0, 'opacity=".5"');
  g += vignette(sm((t - C.recede[0]) / 0.5) * (1 - sm((t - C.cardToLaptop[1]) / 0.6)) * 0.9);
  // transisi pixel singkat dan panel web asli
  const pIn = seg(t, C.pixelIn[0], C.pixelIn[1], sm), pOut = 1 - seg(t, C.pixelOut[0], C.pixelOut[1], sm);
  if (t >= C.pixelIn[0] && t < C.pixelOut[1]) {
    const r = panelRect(t), p = t < C.panelGrow[0] ? pIn : t >= C.pixelOut[0] ? pOut : 1;
    const px = pixelClip('clipPix', p, ZOOM_RECT, 3, 36), pn = panelSvg(t, r);
    if (!web) g += px.clip + `<g clip-path="url(#clipPix)">${pn.svg}</g>${px.edge}`;
    else g += `<rect x="${f1(r.x - 6)}" y="${f1(r.y - 6)}" width="${f1(r.w + 12)}" height="${f1(r.h + 12)}" rx="${f1(pn.rad + 6)}" fill="#141D26" stroke="${MC.gold}" stroke-width="4"/>` + pn.svg;
  }
  g += captions(t) + endCard(t);
  if (t >= C.connect - 0.02 && t < C.connect + 0.15) g += flash(0.35 * (1 - (t - C.connect) / 0.15), '#FFF6D6');
  return g;
}
async function renderFrame(t) {
  if (t >= C.pixelIn[0] - 0.1 && t < C.pixelOut[1]) { const f = webFrame(t); await load(urlOf(f.clip, f.i)); }
  $('scene').innerHTML = master(t); await new Promise((r) => requestAnimationFrame(() => r()));
}
window.renderFrame = renderFrame; await renderFrame(+(q.get('t') ?? 0)); window.__ready = true;
