// Panggung video "Kenapa dingin bikin pengen pipis?": renderFrame(t) deterministik. a = waktu audio narator asli, t = a + LEAD.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, kf, win, seg, r1, rnd, g, rect, circ, txt, poly, cam } from './lib.js';
import { raka, rakaSvg, lerpState, idle, walkCycle } from '../../../brand/characters/raka/raka.js';
import { orang, orangSvg, LOOKS, idleOrang } from './orang.js';
import { W, H, FLOOR, DESK_Y, HUG, shiver, flake, classroom, studentDesk, rakaSeat, hallway, toiletDoor, acUnit } from './world.js';
import { COL, skinScene, bodyMap, kidneyScene, ICO } from './body.js';

await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const LEAD = DATA.lead, FPS = DATA.fps;
const $ = (id) => document.getElementById(id);
const camEl = $('cam');
const envAt = (t) => DATA.env[clamp(Math.round(t * FPS), 0, DATA.env.length - 1)];
const mixS = (a, b, k) => lerpState(a, b, clamp(k, 0, 1));

// ================================================================ teks layar
const hookHost = $('hook'), chipHost = $('chips');
const mkEl = (host, cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.display = 'none'; host.appendChild(d); return d; };
const IC = {
  ac: `<span class="ic"><svg viewBox="-80 -40 160 120"><rect x="-70" y="-26" width="140" height="52" rx="14" fill="#fff" stroke="#8EBBD0" stroke-width="6"/><rect x="-52" y="8" width="104" height="8" rx="4" fill="#CFE0E8"/></svg></span>`,
  heart: `<span class="ic"><svg viewBox="-70 -70 140 140"><path d="M0 50S-60 12-60 -26q0-30 28-30 22 0 32 22 10-22 32-22 28 0 28 30C60 12 0 50 0 50z" fill="#E24B4B"/></svg></span>`,
  kid: `<span class="ic"><svg viewBox="-60 -60 120 120"><path d="M0 -44C34 -48 56 -20 50 14C44 46 14 56 0 42C-8 34 4 22 -4 12C-14 0 -28 16 -38 8C-52 -4 -40 -40 0 -44Z" fill="#C25A66"/></svg></span>`,
  drop: `<span class="ic"><svg viewBox="-40 -60 80 110"><path d="M0 -50q34 44 0 84q-34 -40 0 -84z" fill="#F6D14A" stroke="#D9AC1E" stroke-width="6"/></svg></span>`,
  snow: `<span class="ic"><svg viewBox="-40 -40 80 80"><g stroke="#2F8FCB" stroke-width="9" stroke-linecap="round"><path d="M0 -30V30"/><path d="M0 -30V30" transform="rotate(60)"/><path d="M0 -30V30" transform="rotate(120)"/></g></svg></span>`,
};
const HOOK = [{ a0: 0.2, a1: 3.85, cls: 'hk red big', html: 'DINGIN = PENGEN PIPIS?' }];
const hookEls = HOOK.map((h) => { const d = mkEl(hookHost, h.cls, h.html); d.style.whiteSpace = 'normal'; return d; });
const CHIPS = [
  { a0: 3.88, a1: 5.85, cls: '', html: `${IC.ac}<span>Kelas ber-AC</span>` },
  { a0: 17.63, a1: 22.6, cls: 'cold', html: `${IC.snow}<span>Tubuh menjaga panas</span>` },
  { a0: 23.04, a1: 27.4, cls: 'big', html: '<span>Penyempitan<br>pembuluh darah</span>' },
  { a0: 27.74, a1: 31.3, cls: 'warn', html: 'Ke mana darahnya pergi?' },
  { a0: 31.7, a1: 34.4, cls: '', html: `${IC.heart}<span>Darah bergeser ke tengah tubuh</span>` },
  { a0: 34.7, a1: 36.6, cls: 'warn', html: 'Tekanan darah bisa meningkat' },
  { a0: 36.82, a1: 40.4, cls: '', html: `${IC.kid}<span>Ginjal ikut terpengaruh</span>` },
  { a0: 40.61, a1: 43.8, cls: '', html: 'Mengatur cairan dan garam' },
  { a0: 44.11, a1: 48.85, cls: 'gold', html: 'Pada kondisi tertentu' },
  { a0: 48.85, a1: 51.2, cls: '', html: `${IC.drop}<span>Lebih banyak urine</span>` },
  { a0: 51.24, a1: 54.2, cls: 'big', html: '<span>DIURESIS<br>AKIBAT <em>DINGIN</em></span>' },
  { a0: 54.2, a1: 60.6, cls: 'small', html: `${IC.drop}<span>Diuresis akibat dingin</span>` },
  { a0: 60.84, a1: 61.5, cls: 'big red', html: 'TAPI TUNGGU!' },
  { a0: 61.67, a1: 65.5, cls: 'warn', html: 'Tidak selalu karena proses ini' },
  { a0: 65.53, a1: 71.5, cls: '', html: 'Faktor lain ikut berpengaruh' },
  { a0: 73.19, a1: 76.1, cls: 'warn', html: 'Sering pipis, bahkan tanpa dingin' },
  { a0: 76.1, a1: 78.0, cls: 'big', html: '<span>Jangan langsung<br>menyalahkan <em>AC</em></span>' },
];
const chipEls = CHIPS.map((c) => mkEl(chipHost, 'chip ' + c.cls, c.html));
function popEls(list, els, a) {
  list.forEach((c, i) => {
    const d = els[i], on = a >= c.a0 && a <= c.a1 + 0.2;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = d.classList.contains('hk') ? 'block' : 'inline-flex';
    const k = backOut(clamp((a - c.a0) / 0.4, 0, 1)), o = clamp((c.a1 + 0.2 - a) / 0.2, 0, 1);
    d.style.opacity = Math.min(1, (a - c.a0) / 0.12) * o;
    d.style.transform = `scale(${lerp(0.75, 1, k).toFixed(3)}) translateY(${lerp(-18, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  });
}
const capBox = $('capbox'); let capIdx = -2;
function updateCaption(a) {
  let idx = -1;
  for (let i = 0; i < DATA.caps.length; i++) if (a >= DATA.caps[i].a0 - 0.04 && a < DATA.caps[i].a1) { idx = i; break; }
  if (idx !== capIdx) { capIdx = idx; if (idx < 0) capBox.style.display = 'none'; else { capBox.style.display = 'block'; capBox.textContent = DATA.caps[idx].text; } }
}

// ================================================================ maskot Kori (satu SVG dipakai dua tempat)
const KORI_SVG = await (await fetch('kori.svg')).text();
function mkKori(host) {
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g'); host.appendChild(wrap);
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g'); wrap.appendChild(inner);
  inner.innerHTML = new DOMParser().parseFromString(KORI_SVG, 'image/svg+xml').documentElement.innerHTML;
  const q = (s) => inner.querySelector(s);
  const K = { float: q('.mc-float'), eN: q('.mc-eyes-normal'), eH: q('.mc-eyes-happy'), mN: q('.mc-mouth-normal'), mH: q('.mc-mouth-happy'), mT: q('.mc-mouth-think'), arm: q('.mc-arm-right'), dots: [...inner.querySelectorAll('.mc-eyes > circle')] };
  return {
    /** x, y = titik tengah kaki; s = skala; rot derajat; o = opacity; mood 'happy' | 'normal' | 'think'; wave = sudut lengan (derajat) */
    set(a, { x = 0, y = 0, s = 1, rot = 0, o = 1, mood = 'happy', wave = 0 } = {}) {
      wrap.setAttribute('transform', `translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${(Math.round(s * 1000) / 1000)}) translate(-160 -290)`);
      wrap.setAttribute('opacity', o);
      K.float.setAttribute('transform', `translate(0 ${(Math.sin(a * 2.6) * 6).toFixed(1)})`);
      const happy = mood === 'happy';
      K.eN.setAttribute('opacity', happy ? 0 : 1); K.eH.setAttribute('opacity', happy ? 1 : 0); K.dots.forEach((c) => c.setAttribute('opacity', happy ? 0 : 1));
      K.mN.setAttribute('opacity', mood === 'normal' ? 1 : 0); K.mH.setAttribute('opacity', happy ? 1 : 0); if (K.mT) K.mT.setAttribute('opacity', mood === 'think' ? 1 : 0);
      if (K.arm) K.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${wave.toFixed(1)}deg)`);
    },
  };
}
const koriMain = mkKori($('koriLayer'));
const koriEnd = (() => { const e = $('endsvg'); e.innerHTML = '<g id="rakaEnd"></g>'; return mkKori(e); })();
const waveAt = (a) => Math.sin(a * 9) * 18 - 14;
function koriShow(a) {
  // masuk (13.94): melompat dari kanan bawah, menyapa, lalu melompat ke perut Raka saat portal membuka (15.9)
  if (a > 13.9 && a < 16.5) {
    const pop = backOut(seg(a, 13.94, 14.5)), jump = ease(seg(a, 15.7, 16.4));
    const x = lerp(lerp(1150, 830, easeOut(seg(a, 13.94, 14.5))), 600, jump), y = lerp(lerp(1500, 1090, easeOut(seg(a, 13.94, 14.5))) - Math.abs(Math.sin(a * 6)) * 24 * (1 - jump), 880, jump);
    koriMain.set(a, { x, y, s: 1.35 * pop * (1 - 0.8 * jump), rot: (1 - pop) * -20 + jump * 30, o: 1 - 0.8 * jump * jump, wave: waveAt(a) });
    return;
  }
  // mengintip saat menuju ginjal
  if (a > 36.8 && a < 39.2) { const p = ease(seg(a, 36.9, 37.5)) * (1 - ease(seg(a, 38.7, 39.2))); koriMain.set(a, { x: 150, y: lerp(1500, 1210, p), s: 0.9, o: p, wave: waveAt(a), mood: 'happy' }); return; }
  // "Tapi tunggu."
  if (a > 60.75 && a < 62.0) { const p = backOut(seg(a, 60.84, 61.2)) * (1 - ease(seg(a, 61.6, 62.0))); koriMain.set(a, { x: 760, y: 1100, s: 1.7 * p, o: Math.min(1, p * 2), wave: -60 + Math.sin(a * 12) * 8, mood: 'normal' }); return; }
  // menunjuk toilet saat Raka tiba
  if (a > 80.5 && a < 82.0) { const p = backOut(seg(a, 80.5, 81.0)) * (1 - ease(seg(a, 81.7, 82.0))); koriMain.set(a, { x: 640, y: 1190 - Math.abs(Math.sin(a * 7)) * 18, s: 1.2 * p, o: Math.min(1, p * 2), wave: waveAt(a) }); return; }
  koriMain.set(a, { o: 0, s: 0.01 });
}

// ================================================================ adegan 1: kelas ber-AC
const focus = (inner, z, fx, fy, sx = 540, sy = 760) => `<g transform="translate(${r1(sx)} ${r1(sy)}) scale(${Math.round(z * 10000) / 10000}) translate(${r1(-fx)} ${r1(-fy)})">${inner}</g>`;
const rd = (x, y, s, inner) => `<g transform="translate(${r1(x - 200 * s)} ${r1(y - 778 * s)}) scale(${s})">${inner}</g>`;
function dosenSvg(a, t) {
  const point = Math.sin(a * 0.9) > 0.1;
  const talk = 0.5 + 0.5 * Math.sin(t * 9);
  const st = idleOrang(orang('fokus', point ? 'tunjuk' : 'jelaskan', { yaw: 0.4, mouth: { w: 12, up: 3, lo: 3 + talk * 12 } }), t, 3);
  return rd(250, 1200, 0.95, orangSvg(st, LOOKS.dosen, { bare: true, shadow: true, uid: 'dosen' }));
}
function rakaClassState(a, t) {
  // dasar: menggigil, memeluk jaket; 2,7 - 3,9 mata membesar dan melirik toilet; 5,9 - 8,1 gelisah; 8,1 - 10: mencari toilet; 10,2 - 13,9: berpikir
  const base = raka('khawatir', null, { ...HUG, browL: { y: 3, rot: 12 }, browR: { y: 3, rot: -12 }, bags: 0.3 });
  const wideLook = raka('kaget', null, { ...HUG, yaw: 1, gazeX: 1, gazeY: 0.1, wide: 1, mouth: { w: 10, up: 1, lo: 8 }, fxBurst: 1 });
  let st = base;
  const look = ease(seg(a, 2.7, 3.2)) * (1 - ease(seg(a, 3.8, 4.2)));
  st = mixS(st, wideLook, look);
  const fid = win(a, 5.9, 8.2, 0.3, 0.3);
  if (fid > 0) { st = JSON.parse(JSON.stringify(st)); st.lean += Math.sin(a * 5.1) * 4 * fid; st.yaw = Math.sin(a * 2.3) * 0.5 * fid; st.gazeX = Math.sin(a * 2.3 + 0.6) * fid; }
  const seek = ease(seg(a, 8.2, 9.3)) * (1 - ease(seg(a, 9.9, 10.3)));
  if (seek > 0) { st = mixS(st, raka('kaget', null, { ...HUG, yaw: 0.9, gazeX: 1, wide: 0.9, mouth: { w: 9, up: 2, lo: 6 }, sweat: 1 }), seek); if (a < 9.3) { st.yaw += Math.sin(a * 9) * 0.3 * (1 - seek); st.gazeX = Math.sin(a * 9) * (1 - seek) + seek; } }
  const think = ease(seg(a, 10.2, 10.7)) * (1 - ease(seg(a, 13.7, 14.0)));
  if (think > 0) st = mixS(st, raka('berpikir', null, { bags: 0.2 }), think);
  return st;
}
function sceneClass(a, t) {
  const k = clamp(kf(a, [[0.2, 1], [5, 1]], (u) => u), 0, 1) * (a < 13.9 ? 1 : 0.6);
  let st = rakaClassState(a, t);
  st = idle(st, t); st = shiver(st, t, a < 10.1 ? 1 : a < 13.9 ? 0.35 : 0.15);
  const dx = a < 10.1 ? Math.sin(t * 61) * 2.2 : 0;
  let s = classroom(t, { cold: 1, door: ease(seg(a, 2.7, 3.3)) * (1 - ease(seg(a, 3.9, 4.2))) + ease(seg(a, 8.6, 9.4)) * (1 - ease(seg(a, 9.9, 10.3))) });
  s += dosenSvg(a, t);
  // gelembung "bla bla" dosen
  s += `<g opacity="${r1(0.9 * win(a, 5.9, 8.2, 0.25, 0.25))}">${g(rect(-90, -50, 180, 80, '#fff', 30) + `<path d="M-40 28L-56 60L-16 28Z" fill="#fff"/>` + txt('bla bla…', 0, 14, { size: 38, fill: '#7C5A9E' }), { x: 330, y: 560 + Math.sin(t * 5) * 4 })}</g>`;
  s += rakaSeat(st, 640, { uid: 'rk', dx }) + studentDesk(640);
  const brr = win(a, 0.3, 3.8, 0.3, 0.4) + win(a, 6.0, 8.0, 0.3, 0.4) * 0.8;
  if (brr > 0.01) s += g(txt('brrr…', 0, 0, { size: 62, fill: '#2F8FCB', extra: 'stroke="#fff" stroke-width="8" paint-order="stroke"' }), { x: 820 + Math.sin(t * 40) * 3, y: 560 + Math.cos(t * 33) * 3, s: Math.min(1, brr), r: -8, o: Math.min(1, brr) });
  // gelembung pikiran 10,2 - 13,9: salju dan tetes dengan tanda tanya
  const q = backOut(seg(a, 10.3, 10.8)) * (1 - ease(seg(a, 13.7, 13.95)));
  if (q > 0.01) s += g(`<path d="M-210 -120Q-210 -200 -130 -200L130 -200Q210 -200 210 -120L210 50Q210 130 130 130L60 130L0 190L-30 130L-130 130Q-210 130 -210 50Z" fill="#fff"/>` + flake(-120, -34, 1.2, 0, 1) + `<path d="M120 -80q40 52 0 100q-40 -48 0 -100z" fill="${COL.urine}" stroke="${COL.urineD}" stroke-width="5"/>` + txt('?', 0, 28, { size: 130, fill: '#E8665F' }), { x: 560, y: 470, s: q * 0.7, o: Math.min(1, q * 1.5) });
  // kamera: lebar -> zoom AC (3,88 - 5,88) -> lebar -> dekat wajah (8,1 - 9,8) -> lebar -> dorongan masuk (13,94 - 16,2)
  const peek = ease(seg(a, 2.55, 2.95)) * (1 - ease(seg(a, 3.7, 3.88)));
  const ac = ease(seg(a, 3.88, 4.3)) * (1 - ease(seg(a, 5.4, 5.88)));
  const face = ease(seg(a, 8.1, 8.6)) * (1 - ease(seg(a, 9.7, 10.2)));
  const mid = ease(seg(a, 10.2, 10.8)) * (1 - ease(seg(a, 13.5, 13.94)));
  const push = ease(seg(a, 13.94, 15.9));
  let z = 1, fx = 540, fy = 760;
  z = lerp(z, 1.7, peek); fx = lerp(fx, 680, peek); fy = lerp(fy, 640, peek);
  z = lerp(z, 2.0, ac); fx = lerp(fx, 830, ac); fy = lerp(fy, 400, ac);
  z = lerp(z, 1.9, face); fx = lerp(fx, 660, face); fy = lerp(fy, 640, face);
  z = lerp(z, 1.15, mid); fx = lerp(fx, 620, mid); fy = lerp(fy, 760, mid);
  z = lerp(z, 1.6, push); fx = lerp(fx, 620, push); fy = lerp(fy, 860, push);
  return focus(s, z, fx, fy);
}

// ================================================================ adegan 2: di dalam tubuh
function sceneSkin(a, t) {
  const k = kf(a, [[23.2, 0], [26.6, 1]], easeInOut);
  const zoom = kf(a, [[17.6, 1], [20.5, 1], [24.0, 1.55], [27.4, 1.55], [29.5, 1.2], [31.5, 1]], easeInOut);
  let s = skinScene(a, t, { k, leak: 1, qmark: win(a, 27.9, 30.0, 0.3, 0.3) * 0.0 });
  // 27,7 - 31,3: darah tidak bisa lewat di pembuluh sempit; panah mengalihkan darah ke pembuluh yang lebih dalam
  const d = ease(seg(a, 28.6, 29.3)) * (1 - ease(seg(a, 31.0, 31.4)));
  const qm = win(a, 27.8, 30.6, 0.3, 0.3);
  if (d > 0.01) for (let i = 0; i < 3; i++) s += g(`<path d="M-26 -16H6V-34L38 0L6 34V16H-26Z" fill="#fff"/>`, { x: 250 + i * 270, y: 925 + Math.sin(t * 5 + i) * 6, r: 90, s: 1.4 * d, o: 0.9 * d });
  if (qm > 0.01) s += g(txt('?', 0, 0, { size: 240, fill: '#fff', extra: 'stroke="#C9484F" stroke-width="10" paint-order="stroke"' }), { x: 540, y: 590 + Math.sin(t * 4) * 8, s: backOut(qm), o: qm });
  return cam(s, zoom, 540, 840);
}
function sceneCore(a, t) {
  const shift = kf(a, [[31.7, 0], [34.3, 1]], easeInOut), bp = kf(a, [[34.7, 0], [36.4, 1]], easeInOut);
  return bodyMap(a, t, { shift, bp });
}
function sceneKidney(a, t) {
  const dy = kf(a, [[36.82, 1300], [38.9, 0]], easeInOut);
  const rate = kf(a, [[38.9, 0.12], [44.0, 0.2], [44.11, 0.2], [50.0, 1.0]], (u) => u);
  const fill = kf(a, [[38.9, 0.1], [44.11, 0.14], [51.0, 0.78], [54.16, 0.86]], (u) => u);
  const mix = win(a, 40.61, 43.8, 0.4, 0.5);
  const regulate = win(a, 40.8, 43.7, 0.4, 0.4);
  const urge = win(a, 52.4, 54.2, 0.3, 0.2) * 0;
  return kidneyScene(a, t, { rate, fill, mix, regulate, dy });
}

// ================================================================ adegan 3: layar terbagi (memeluk jaket + ginjal)
const panel = (x, y, w, h, inner, tag, col) => `<clipPath id="pc${x}${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="36"/></clipPath><g clip-path="url(#pc${x}${y})">${inner}</g>` + rect(x, y, w, h, 'none', 36, 'stroke="#fff" stroke-width="10"') + g(rect(0, 0, 250, 52, col, 26) + txt(tag, 125, 36, { size: 28, fill: '#fff', ls: 2 }), { x: x + 24, y: y + 20 });
function sceneSplit(a, t) {
  const o = ease(seg(a, 54.16, 54.7));
  let s = rect(-40, -40, 1160, 2000, '#102440');
  // atas: Raka memeluk jaket menggigil di kelas
  const st = shiver(idle(raka('khawatir', null, { ...HUG, browL: { y: 3, rot: 12 }, browR: { y: 3, rot: -12 }, bags: 0.3 }), t), t, 1);
  let top = classroom(t, { cold: 1 }) + rakaSeat(st, 640, { uid: 'sp', dx: Math.sin(t * 61) * 2 }) + studentDesk(640);
  top = rect(0, 360, 870, 380, '#DCEBF2') + `<g transform="translate(${60 + (870 - 1080 * 0.62) / 2} ${360 - 430 * 0.62}) scale(0.62)">${top}</g>`;
  s += panel(60, 360, 870, 380, top, 'DI KELAS', '#2A57B2');
  // bawah: ginjal mengatur cairan dan kandung kemih terisi
  const kid = kidneyScene(a, t, { rate: 0.9, fill: kf(a, [[54.16, 0.86], [60.5, 0.95]], (u) => u), mix: 0.8, regulate: 0, dy: 0 });
  const bot = rect(60, 770, 870, 500, '#23406F') + `<g transform="translate(${60 + (870 - 1080 * 0.6) / 2} ${770 - 380 * 0.6}) scale(0.6)">${kid}</g>`;
  s += panel(60, 770, 870, 500, bot, 'DI DALAM TUBUH', '#C25A66');
  return `<g opacity="${r1(o * 100) / 100}">${s}</g>`;
}

// ================================================================ adegan 4: faktor lain
function card(x, y, w, h, inner, o, fill = '#fff') { return o > 0.01 ? g(rect(0, 0, w, h, fill, 38, 'stroke="#D6E3EA" stroke-width="4"') + inner, { x: x + w / 2, y: y + h / 2, s: backOut(o), o: Math.min(1, o * 1.6), ox: w / 2, oy: h / 2 }) : ''; }
function sceneFactors(a, t) {
  let s = rect(-40, -40, 1160, 2000, '#DCEBF5') + circ(940, 220, 240, '#C9E0EE') + circ(80, 1180, 260, '#C9E0EE');
  // produksi urine meningkat BUKAN selalu sama dengan rasa ingin pipis
  const e = backOut(seg(a, 61.75, 62.3));
  s += card(60, 330, 870, 300, ICO.bladder(200, 120, 1.6, 0.9) + txt('Produksi urine naik', 200, 252, { size: 34, fill: '#0A3830' }) + g(txt('≠', 0, 0, { size: 170, fill: '#E8665F' }), { x: 435, y: 170 })
    + g(rect(-7, -60, 14, 62, '#F2735E', 7) + circ(0, 28, 9, '#F2735E'), { x: 600, y: 50, s: 1.3 }) + ICO.bladder(670, 120, 1.6, 0.35) + txt('Rasa ingin pipis', 670, 252, { size: 34, fill: '#0A3830' }), e);
  const lab = ease(seg(a, 64.1, 64.6));
  s += g(txt('tidak selalu sama', 0, 0, { size: 38, fill: '#4d6b66', weight: 700 }), { x: 495, y: 680, o: lab });
  const F = [[65.53, 60, 730, 'cup', 'Banyak minum'], [67.09, 505, 730, 'thermo', 'Seberapa dingin'], [67.9, 60, 1000, 'clock', 'Lama terpapar'], [68.78, 505, 1000, 'bladder', 'Kondisi kandung kemih']];
  F.forEach(([t0, x, y, ic, lb]) => {
    const o = seg(a, t0, t0 + 0.45);
    s += card(x, y, 425, 240, ICO[ic](212, 98, 1.25) + txt(lb, 212, 214, { size: 35, fill: '#0A3830' }), o);
  });
  return s;
}

// ================================================================ adegan 5: peringatan (lebih serius)
function sceneSerious(a, t) {
  let s = classroom(t, { cold: 0.4, slide: false, door: 0 });
  const st = idle(raka('netral', null, { browL: { y: 3, rot: -8 }, browR: { y: 3, rot: 8 }, mouth: { w: 12, up: 6, lo: 5 }, ...HUG }), t);
  s += rect(0, 0, W, H, '#12243A', 0, `opacity="0.35"`);
  s += rakaSeat(st, 540, { uid: 'sr', s: 1.45 }) + studentDesk(540);
  const o1 = backOut(seg(a, 72.3, 72.9)), o2 = backOut(seg(a, 74.79, 75.4)), o3 = backOut(seg(a, 76.1, 76.7));
  s += card(60, 830, 270, 230, ICO.bladder(135, 95, 1.2, 0.8) + txt('Sering pipis', 135, 200, { size: 30, fill: '#0A3830' }), o1);
  s += card(345, 830, 270, 230, ICO.bladder(120, 95, 1.1, 0.8) + ICO.pain(190, 60, 1.4) + txt('+ nyeri', 135, 200, { size: 30, fill: '#0A3830' }), o2, '#FFF1DA');
  s += card(630, 830, 270, 230, ICO.ac(135, 80, 1.05) + txt('bukan selalu AC', 135, 200, { size: 28, fill: '#0A3830' }), o3);
  return s;
}

// ================================================================ adegan 6: lari kecil ke toilet
function sceneWalk(a, t) {
  const u = seg(a, 78.29, 81.5), door = ease(seg(a, 80.4, 81.6));
  let s = hallway(t, { door: ease(seg(a, 78.5, 79.4)), open: ease(seg(a, 81.0, 81.7)) });
  const x = lerp(110, 850, easeInOut(u)), ph = (t * 3.2) % 1;
  const st = idle(raka('kaget', 'jalan', { ...walkCycle(ph, { dir: 1, run: true }), yaw: 0.35, gazeX: 0.8, sweat: 1, mouth: { w: 10, up: 3, lo: 6 } }), t);
  const into = ease(seg(a, 81.4, 82.0));
  s += `<g opacity="${r1(1 - into)}" transform="translate(${r1(x - 200 * 1.0)} ${r1(1180 - 778 * 1.0 - Math.abs(Math.sin(t * 9.6)) * 6)}) scale(1)">${rakaSvg(st, { bare: true, shadow: true, uid: 'wk', outfit: 'jaket' })}</g>`;
  return s;
}

// ================================================================ kartu akhir
const popCss = (d, k, dy = 24) => { const kk = backOut(k); d.style.opacity = clamp(k * 4, 0, 1); d.style.transform = `scale(${lerp(0.85, 1, kk).toFixed(3)}) translateY(${lerp(dy, 0, clamp(kk, 0, 1)).toFixed(1)}px)`; };
$('er1').textContent = 'Belajar bareng MEDCOEL'; $('er3').textContent = 'Gratis di medcoel.com';
$('esrc').innerHTML = '<b>Sumber</b> Rintamäki H. Human responses to cold. Alaska Med 2007;49(2 Suppl):29-31. PubMed 17929604.<br>Atterhög JH dkk. Cardiovascular and renal responses to acute cold exposure in water-loaded man. Scand J Clin Lab Invest 1975;35(4):311-7. PubMed 1188288.';
function updateEnd(a, t) {
  const endK = ease(seg(a, 81.9, 82.4));
  $('end').style.opacity = endK.toFixed(3);
  if (endK <= 0) return;
  const lk = backOut(seg(a, 82.0, 82.6)); const lg = $('elogo'); lg.style.transform = `scale(${lerp(0.7, 1, lk).toFixed(3)})`; lg.style.opacity = clamp((a - 81.95) / 0.3, 0, 1);
  popCss($('er1'), seg(a, 82.45, 82.9), 24); popCss($('er3'), seg(a, 83.15, 83.6), 24);
  $('esrc').style.opacity = ease(seg(a, 83.6, 84.3));
  const rk = clamp((a - 82.4) / 0.5, 0, 1);
  const rs = idle(raka('senang', 'sapa'), t); rs.armR = { ...rs.armR, wx: rs.armR.wx + Math.sin(a * 8) * 10 };
  $('rakaEnd').innerHTML = `<g transform="translate(300 1590) scale(${(0.72 * backOut(rk)).toFixed(3)}) translate(-200 -778)" opacity="${rk}">${rakaSvg(rs, { bare: true, shadow: true, uid: 'endraka', outfit: 'jaket' })}</g>`;
  const kr = backOut(clamp((a - 82.7) / 0.5, 0, 1));
  koriEnd.set(a, { x: 700, y: 1590, s: 1.6 * kr, o: kr, mood: 'happy', wave: waveAt(a) });
}

// ================================================================ render utama
const SCENES = [
  { a0: -1, a1: 17.2, fn: sceneClass },
  { a0: 16.2, a1: 31.9, fn: sceneSkin },
  { a0: 31.3, a1: 37.4, fn: sceneCore },
  { a0: 36.6, a1: 54.6, fn: sceneKidney },
  { a0: 54.0, a1: 61.0, fn: sceneSplit },
  { a0: 60.6, a1: 72.4, fn: sceneFactors },
  { a0: 71.5, a1: 78.6, fn: sceneSerious },
  { a0: 78.0, a1: 82.6, fn: sceneWalk },
];
const FADE = { 1: [16.2, 16.9], 2: [31.4, 31.9], 3: [36.6, 37.1], 4: [54.1, 54.6], 5: [60.6, 61.0], 6: [71.5, 72.0], 7: [78.0, 78.5] };
window.renderFrame = function (t) {
  const a = t - LEAD;
  let svg = '';
  SCENES.forEach((sc, i) => {
    if (a < sc.a0 || a > sc.a1) return;
    const f = FADE[i], o = f ? ease(seg(a, f[0], f[1])) : 1;
    if (o <= 0.002) return;
    svg += o < 0.999 ? `<g opacity="${o.toFixed(3)}">${sc.fn(a, t)}</g>` : sc.fn(a, t);
  });
  // portal putih saat Kori mengajak masuk ke tubuh (15,9 - 16,9)
  const pr = seg(a, 15.9, 16.6);
  if (pr > 0 && a < 17.0) svg += circ(620, 900, 1500 * easeOut(pr), '#EAF6FF', `opacity="${r1(a < 16.6 ? 1 : 1 - seg(a, 16.6, 17.0))}"`);
  camEl.innerHTML = svg;
  koriShow(a);
  popEls(HOOK, hookEls, a); popEls(CHIPS, chipEls, a);
  updateCaption(a); updateEnd(a, t);
  $('fade').style.opacity = '0';
  window.__t = t;
};
window.__ready = true;
