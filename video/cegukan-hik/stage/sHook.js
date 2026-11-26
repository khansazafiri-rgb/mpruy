// A. HOOK (0 - 6,3): Raka belajar di meja, cegukan (tersentak), bertanya; kamera mendorong masuk ke Raka lalu ke dadanya (lensa menuju penampang).
import { f1, clamp, lerp, sm, eo, eio, seg, track, R, C, P as PP, T, W, K, CREAM, bgCream, chip, op, armTo, rk, raka, rIdle, lerpState, jolt, hikBubble, camG, ka, FONT } from './common.js';

export const DESK_Y = 1300, RK = { cx: 540, k: 1.45 };
const ty0 = DESK_Y - 580 * RK.k;
/** isi dunia meja: dinding krem, rak buku, lampu, meja, buku terbuka. shake = geseran buku (px) */
export function deskScene(t, o = {}) {
  const { bookJump = 0 } = o;
  let s = bgCream;
  // jendela + rak (latar, krem-kontras)
  s += `<rect x="780" y="520" width="230" height="300" rx="22" fill="#CFE6F0"/><rect x="796" y="536" width="198" height="268" rx="14" fill="#E9F5FA"/><rect x="887" y="536" width="12" height="268" fill="#CFE6F0"/><rect x="796" y="660" width="198" height="12" fill="#CFE6F0"/>`;
  s += `<rect x="40" y="760" width="250" height="14" rx="7" fill="#B98A5A"/>` + [['#E8665F', 60, 700, 38], ['#3E6FB0', 100, 690, 46], ['#F8C038', 150, 710, 36], ['#5FA77F', 188, 696, 44], ['#8E6BB5', 232, 706, 40]].map(([c, x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${774 - y - 14}" rx="5" fill="${c}"/>`).join('');
  s += `<g transform="translate(840 1010)"><rect x="-8" y="0" width="16" height="190" fill="#6B7A8A"/><path d="M-70 -40L70 -40L40 -110L-40 -110Z" fill="#F8C038"/><rect x="-90" y="180" width="180" height="16" rx="8" fill="#6B7A8A"/></g>`;
  return s;
}
export function deskFront(t, o = {}) {
  const j = o.bookJump ?? 0, by = DESK_Y - 8 - j;
  let s = `<rect x="-20" y="${DESK_Y}" width="1120" height="1100" fill="#C98F55"/><rect x="-20" y="${DESK_Y}" width="1120" height="26" fill="#DDA86F"/><rect x="-20" y="${DESK_Y + 26}" width="1120" height="6" fill="#9C6A3C"/>`;
  // buku terbuka (tampak dari depan-atas), garis teks + stabilo
  s += `<g transform="translate(0 ${f1(-j)})"><path d="M330 ${DESK_Y - 4}L540 ${DESK_Y - 16}L750 ${DESK_Y - 4}L790 ${DESK_Y + 104}L540 ${DESK_Y + 118}L290 ${DESK_Y + 104}Z" fill="#fff" stroke="#D9D2C0" stroke-width="5" stroke-linejoin="round"/><path d="M540 ${DESK_Y - 16}L540 ${DESK_Y + 118}" stroke="#D9D2C0" stroke-width="6"/>`;
  for (let i = 0; i < 4; i++) { const y = DESK_Y + 12 + i * 22; s += `<path d="M${f1(360 - i * 6)} ${y}L${f1(515)} ${y - 4}M${f1(565)} ${y - 4}L${f1(720 + i * 6)} ${y}" stroke="${i === 1 ? '#F8C038' : '#B8C2CC'}" stroke-width="${i === 1 ? 10 : 6}" stroke-linecap="round" opacity="${i === 1 ? 0.8 : 1}"/>`; }
  s += `</g>`;
  return s;
}
/** keadaan Raka saat belajar -> cegukan -> bertanya -> menunjuk */
export function hookRaka(t) {
  const study = (tt) => { const w = Math.sin(tt * 17) * 5 + Math.sin(tt * 6.3) * 4; return raka('netral', null, { gazeY: 1, tilt: 0, armR: armTo('R', 262 + w, 548 + Math.abs(w) * 0.3), armL: armTo('L', 140, 552, { front: 1 }), lean: 1 + Math.sin(tt * 2.2) * 0.5 }); };
  const kaget = raka('kaget', 'kaget', { yaw: 0, gazeY: 0, lean: 0 });
  const think = raka('berpikir', 'berpikir', { gazeY: -0.5, gazeX: 0.5 });
  const point = raka('menunjuk', 'menunjuk', { gazeY: 0.1, gazeX: -0.4, yaw: -0.2 });
  let st;
  if (t < 1.5) st = study(t);
  else if (t < 2.85) st = lerpState(study(t), kaget, sm((t - 1.5) / 0.28));       // "Eh, cegukan."
  else if (t < 5.0) st = lerpState(kaget, think, sm((t - 2.85) / 0.45));         // "Kenapa bunyinya bisa..."
  else if (t < 5.55) st = lerpState(think, kaget, sm((t - 5.0) / 0.18));         // hik (narator)
  else st = lerpState(kaget, point, sm((t - 5.55) / 0.35));
  const J = Math.max(jolt(t, 1.47), 0.8 * jolt(t, 2.47), jolt(t, 5.13));
  st = rIdle(st, t);
  st.bob += -22 * J; st.lean += -2.5 * J; st.tilt += -4 * J; st.wide = Math.min(1, st.wide + 0.6 * J);
  st.mouth = { ...st.mouth, lo: lerp(st.mouth.lo, 24, J), up: lerp(st.mouth.up, -2, J) };
  st.fxBurst = Math.max(st.fxBurst, 0.9 * J);
  return { st, J };
}
export function sceneHook(t, out) {
  const { st, J } = hookRaka(t), shake = 7 * J * Math.sin(t * 90);
  // kamera: dorong masuk ke Raka sejak frame 0; lalu masuk ke dada (5,55 - 6,25) menuju lensa penampang
  const zk = track([[0, 1.0, 540, 930], [1.5, 1.07, 540, 920], [5.2, 1.15, 540, 905], [5.55, 1.16, 540, 910], [6.3, 2.6, 540, 1140]])(t);
  const r = rk(st, RK.cx, ty0, RK.k, 'rH');
  const jump = 9 * jolt(t, 1.47) + 6 * jolt(t, 2.47) + 9 * jolt(t, 5.13);
  // pensil di tangan kanan
  const hnd = r.hand('R'), dur = 0.42, q = clamp((t - 1.47) / dur);
  const pencilAt = (x, y, a) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><rect x="-6" y="-170" width="12" height="150" rx="3" fill="#F8C038"/><rect x="-6" y="-170" width="12" height="22" rx="3" fill="#E8665F"/><path d="M-6 -20L0 4L6 -20Z" fill="#F2D2A8"/><path d="M-1.5 -3L0 4L1.5 -3Z" fill="#333"/></g>`;
  const landX = 700, landY = DESK_Y + 62;
  let pencil;
  if (t < 1.47) pencil = pencilAt(hnd[0] - 4, hnd[1] + 4, -62 + Math.sin(t * 17) * 3);
  else if (q < 1) pencil = pencilAt(lerp(hnd[0], landX, q), lerp(hnd[1], landY, q) - Math.sin(Math.PI * q) * 190, lerp(-62, 78, q) + 360 * q);
  else pencil = pencilAt(landX, landY, 78 + 5 * Math.exp(-(t - 1.9) * 6) * Math.sin((t - 1.9) * 30));
  let world = deskScene(t) + deskFront(t, { bookJump: jump }) + `<defs><clipPath id="dkc"><rect x="-300" y="0" width="1700" height="${DESK_Y}"/></clipPath></defs><g clip-path="url(#dkc)">${r.svg}</g>` + (t < 5.0 || t > 5.6 ? '' : '') + (st.armR.front ? pencil : '');
  const camSvg = camG(world, zk[0], zk[1] + shake, zk[2], 540, 960);
  out.A += camSvg;
  // teks: judul besar mulai tepat sebelum "Kenapa"
  out.U += chip(['KENAPA BUNYINYA', '‘HIK’?'], t, 2.9, 6.0, { size: 70, bg: K.red, fg: '#fff' });
  // gelembung hik: efek di cegukan pertama; di cegukan narator tidak menambah suara
  const b1 = jolt(t, 1.47, 0.5), b3 = jolt(t, 5.13, 0.5);
  const sc = (x, y) => [540 + (x - 540) * zk[0], 960 + (y - zk[2]) * zk[0]];
  const head = r.at(300, 130); const hp = sc(head[0] + 130, head[1] - 10);
  out.U += hikBubble(hp[0] + 60, hp[1] - 10, 0.7 + 0.4 * b1, b1 > 0.05 ? Math.min(1, b1 * 1.8) : 0, 'hik!') + hikBubble(hp[0] + 60, hp[1] - 10, 0.7 + 0.4 * b3, b3 > 0.05 ? Math.min(1, b3 * 1.8) : 0, 'hik!');
  return { chest: (() => { const c = r.at(200, 470); return sc(c[0], c[1]); })() };
}
