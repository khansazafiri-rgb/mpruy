// A. hook (0 - 5,3): Raka di kabin pesawat yang turun, memegang telinga. B2. menelan/menguap (18,55 - 20,85). B3. lega setelah pop (27,0 - 28,4).
import { f1, clamp, lerp, sm, eo, eio, seg, pop, track, R, C, P as PP, T, GOLD, INK, rndf, K, W, CREAM, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, ka, camG } from './common.js';

const SEAT = '#3C5A84', SEATD = '#2A4467';
// kabin: dinding, jendela oval dengan langit/awan yang bergerak naik (pesawat turun) dan tanah yang mendekat
function cabin(t, o = {}) {
  const wx = 830, wy = 640, rx = 165, ry = 235, rise = lerp(0, 1, clamp(t / 5.3));
  let w = `<rect x="-200" y="-200" width="1500" height="2400" fill="#E6EDF3"/><rect x="-200" y="1000" width="1500" height="1000" fill="#D7E1EA"/>`;
  w += `<defs><clipPath id="win"><ellipse cx="${wx}" cy="${wy}" rx="${rx}" ry="${ry}"/></clipPath></defs><ellipse cx="${wx}" cy="${wy}" rx="${rx + 26}" ry="${ry + 26}" fill="#C3CFDA"/><ellipse cx="${wx}" cy="${wy}" rx="${rx}" ry="${ry}" fill="#7FCBF0"/>`;
  let g = `<rect x="${wx - rx}" y="${wy - ry}" width="${rx * 2}" height="${ry * 2}" fill="#9BD9F5"/>`;
  for (let i = 0; i < 5; i++) { const y = wy + ry + 80 - ((t * 190 + i * 170) % 840), x = wx - 110 + rndf(i + 4) * 220; g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(70 + 30 * rndf(i))}" ry="28" fill="#fff" opacity=".92"/><ellipse cx="${f1(x - 40)}" cy="${f1(y + 8)}" rx="44" ry="22" fill="#fff" opacity=".92"/>`; }
  const gy = wy + ry - 40 - 120 * rise; g += `<rect x="${wx - rx}" y="${f1(gy)}" width="${rx * 2}" height="400" fill="#7BC47F"/>` + Array.from({ length: 5 }, (_, i) => `<rect x="${f1(wx - rx + i * 80 - 20)}" y="${f1(gy + 24 + i * 6)}" width="60" height="${f1(18 + 10 * rise)}" fill="#68B26E"/>`).join('');
  g += `<path d="M${wx - rx - 10} ${wy + ry - 80}L${wx - 20} ${wy + ry - 150}L${wx + 10} ${wy + ry - 128}L${wx - rx - 10} ${wy + ry - 30}Z" fill="#F5F7FA" stroke="#C3CFDA" stroke-width="5"/>`;
  w += `<g clip-path="url(#win)">${g}</g><ellipse cx="${wx}" cy="${wy}" rx="${rx}" ry="${ry}" fill="none" stroke="#B2C0CE" stroke-width="8"/>`;
  return w;
}
export const RA = { cx: 395, ty: 400, k: 1.55 };
function seatBack() { return `<rect x="120" y="560" width="560" height="1300" rx="120" fill="${SEAT}"/><rect x="170" y="520" width="460" height="260" rx="90" fill="${SEATD}"/>`; }
export function sceneA(t, out) {
  const { cx, ty, k } = RA, ear = [322, 226];
  const hand = 0.65 + 0.35 * seg(t, 0.0, 0.4);
  const st = rIdle(raka('khawatir', 'netral', { armR: armTo('R', lerp(330, ear[0], hand), lerp(560, ear[1], hand)), armL: armTo('L', 92, 556), tilt: 4 * hand, browL: { y: 3, rot: 12 }, browR: { y: 3, rot: -12 } }), t);
  const r = rk(st, cx, ty, k, 'rA');
  let w = cabin(t) + seatBack() + r.svg + `<rect x="100" y="1380" width="620" height="260" rx="60" fill="${SEATD}"/>`;
  // gelombang suara teredam di dekat telinga
  const e = r.at(ear[0] + 12, ear[1] + 6);
  for (let i = 0; i < 3; i++) { const ph = ((t * 0.9 + i / 3) % 1); w += `<path d="M${f1(e[0] + 40 + 30 * ph)} ${f1(e[1] - 40 - 10 * ph)}q${f1(26 + 10 * ph)} ${f1(40 + 10 * ph)} 0 ${f1(80 + 20 * ph)}" fill="none" stroke="#7C8CA0" stroke-width="9" stroke-linecap="round" opacity="${f1((1 - ph) * 0.65 * (1 - 0.5 * seg(t, 2, 4)))}"/>`; }
  // letusan kecil "pop" saat narasi menyebut pop (hanya visual; efek bunyi baru pada saat tekanan seimbang)
  const pp = (t - W.pop1) / 0.7; if (pp > 0 && pp < 1) { for (let i = 0; i < 8; i++) { const a = i * 0.785; w += `<path d="M${f1(e[0] + Math.cos(a) * (50 + 30 * pp))} ${f1(e[1] + Math.sin(a) * (50 + 30 * pp))}l${f1(Math.cos(a) * 22)} ${f1(Math.sin(a) * 22)}" stroke="${GOLD}" stroke-width="9" stroke-linecap="round" opacity="${f1(1 - pp)}"/>`; } }
  const zk = track([[0, 540, 960, 0], [2.2, 540, 960, 0], [3.6, e[0] + 20, e[1] + 20, Math.log(2.3)], [5.4, e[0] + 20, e[1] + 20, Math.log(2.3)]])(t);
  out.A += camG(w, Math.exp(zk[2]), zk[0], zk[1], 540, lerp(960, 880, sm((t - 2.2) / 1.4)));
  // indikator ketinggian turun
  const fade = 1 - clamp((t - 2.6) / 0.5), lv = lerp(0.82, 0.3, clamp(t / 5.3));
  let u = chip(['KOK TELINGA', 'TIBA-TIBA PENUH?'], t, -0.4, 5.35, { size: 62, bg: '#D9382F', fg: '#fff' });
  u += `<g opacity="${f1(fade)}"><rect x="40" y="520" width="46" height="400" rx="23" fill="#fff" stroke="#B2C0CE" stroke-width="5"/><rect x="46" y="${f1(520 + 400 - 8 - 384 * lv)}" width="34" height="${f1(384 * lv)}" rx="17" fill="#3FA8D6"/></g>` + tag('KETINGGIAN ↓', 120, 470, fade, { size: 26 }) + tag('pesawat turun', 850, 960, fade * ka(t, 0.3, 5.0, 0.3), { size: 30, bg: '#fff' });
  out.U += u;
}
export function sceneSwallow(t, out) {
  const sw = seg(t, 19.05, 19.35) * (1 - seg(t, 19.6, 19.85)), yw = seg(t, 19.9, 20.2) * (1 - seg(t, 20.55, 20.85));
  const st = rIdle(raka('netral', 'netral', { armR: armTo('R', 330, 556), armL: armTo('L', 70, 556), happyEyes: 0.8 * yw, wide: 0, mouth: { w: lerp(lerp(14, 11, sw), 22, yw), up: lerp(lerp(9, 3, sw), -6, yw), lo: lerp(lerp(9, 6, sw), 58, yw) }, tilt: -3 * yw, bob: 8 * Math.sin(Math.PI * (t - 19.05) / 0.8) * sw }), t);
  const r = rk(st, 540, 400, 1.35, 'rB');
  let w = bgCream.replace(/#EADFC4/g, '#E3EAF1') + r.svg;
  // benjolan di leher saat menelan (naik-turun)
  const n = r.at(200, 322 + 26 * Math.sin(Math.PI * clamp((t - 19.05) / 0.7)) ), kk = 1.35;
  if (sw > 0.02) w += `<ellipse cx="${f1(n[0])}" cy="${f1(n[1])}" rx="${f1(15 * kk)}" ry="${f1(11 * kk)}" fill="#D98E6C" opacity="${f1(0.9 * sw)}"/>`;
  out.A += w;
  out.U += chip(['MENELAN'], t, 18.9, 19.85, { size: 66, bg: '#fff' }) + chip(['MENGUAP'], t, 19.85, 20.9, { size: 66, bg: '#fff' });
}
export function sceneRelief(t, out) {
  const e = clamp((t - 27.0) / 0.3);
  const st = rIdle(raka('lega', 'netral', { armR: armTo('R', lerp(322, 330, sm(e)), lerp(226, 560, sm(e))), armL: armTo('L', 92, 556), tilt: 2.5 * Math.sin(t * 2.4), lean: 1.5 * Math.sin(t * 1.6) }), t);
  const r = rk(st, 540, 420, 1.5, 'rC');
  let w = bgCream.replace(/#EADFC4/g, '#E3EAF1') + r.svg;
  const ec = r.at(322, 226); const p = clamp((t - 27.0) / 0.9);
  for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; w += `<path d="M${f1(ec[0] + Math.cos(a) * (60 + 40 * p))} ${f1(ec[1] + Math.sin(a) * (60 + 40 * p))}l${f1(Math.cos(a) * 24)} ${f1(Math.sin(a) * 24)}" stroke="#2DD4BF" stroke-width="9" stroke-linecap="round" opacity="${f1(1 - p)}"/>`; }
  out.A += w;
  out.U += chip(['LEGA: TEKANAN SEIMBANG'], t, 27.1, 28.45, { size: 54, bg: '#CFF5E6', fg: '#0A4A3A' });
}
