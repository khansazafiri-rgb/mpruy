// Ilustrasi mekanisme berkemih dan retensi urin (SKEMATIK, bukan citra pasien dan bukan rekaman produk): penampang samping sederhana (depan = kiri).
// Kandung kemih (dinding otot detrusor + urin), leher kandung kemih dengan sfingter, dan uretra. Parameter: fill (volume), c (kontraksi otot), open (pembukaan jalan keluar),
// obst (jalan keluar terhambat: penyempitan GENERIK, tanpa menyebut penyebab), flow (aliran urin keluar). Tidak ada prostat, batu, atau penyakit saraf yang digambar.
// Satuan lokal 500 x 600, pusat (250, 300).
import { f1, clamp, lerp, sm } from './core.js';
export const W = 500, H = 600;
/** state: { fill 0..1.3, c 0..1, open 0..1, obst 0..1, flow 0..1, stretch 0..1 } ; t = waktu untuk animasi aliran */
export function bladder(t, st, o = {}) {
  const fill = st.fill, c = st.c, op = st.open, ob = st.obst, fl = st.flow;
  const cx = 255, cy = 230, R = 52 + 52 * fill * (1 - 0.18 * c), rx = R * 0.96, ry = R;
  const th = Math.max(9, 26 - 13 * Math.min(fill, 1.15) + 15 * c);                       // dinding menipis saat meregang, menebal saat berkontraksi
  const neckY = cy + ry, lw = 2 + 12 * op, uw = 11;                                      // lw = setengah lebar lumen uretra
  const yTop = neckY - 2, yBot = 520;
  let s = '';
  // tulang panggul (konteks), di depan (kiri)
  s += `<g opacity=".95"><ellipse cx="70" cy="340" rx="34" ry="86" fill="#EADBC0" transform="rotate(-14 70 340)"/><ellipse cx="60" cy="330" rx="14" ry="58" fill="#F6EBD6" transform="rotate(-14 60 330)" opacity=".7"/></g>`;
  // uretra: tabung dari leher ke bawah
  const urW = lw + uw;
  s += `<path d="M${f1(cx - urW)} ${f1(yTop)}L${f1(cx - urW)} ${yBot}L${f1(cx + urW)} ${yBot}L${f1(cx + urW)} ${f1(yTop)}Z" fill="#D88D82"/>`;
  s += `<path d="M${f1(cx - lw)} ${f1(yTop)}L${f1(cx - lw)} ${yBot}L${f1(cx + lw)} ${yBot}L${f1(cx + lw)} ${f1(yTop)}Z" fill="${op > 0.15 ? '#F6D860' : '#7A3B3B'}" opacity="${f1(0.35 + 0.65 * Math.min(1, op * 1.5))}"/>`;
  // aliran urin keluar (garis putus bergerak) di dalam uretra dan tetesan di bawah
  if (fl > 0.02 && lw > 4) {
    const off = (t * 140) % 30, ww = Math.min(lw - 1, 4 + 3 * fl);
    for (let y = yTop - 30 + off; y < yBot + 52; y += 30) s += `<rect x="${f1(cx - ww)}" y="${f1(y)}" width="${f1(2 * ww)}" height="16" rx="6" fill="#FFE98A" opacity="${f1(fl * (y < yBot ? 0.95 : 0.8))}"/>`;
  }
  // penghalang generik (penyempitan) pada jalan keluar
  if (ob > 0.02) {
    const yb = neckY + 92, gap = lerp(lw, 1.5, ob);
    s += `<g opacity="${f1(Math.min(1, ob * 1.4))}"><path d="M${f1(cx - urW - 12)} ${yb - 20}Q${f1(cx - gap - 4)} ${yb - 10} ${f1(cx - gap)} ${yb}Q${f1(cx - gap - 4)} ${yb + 10} ${f1(cx - urW - 12)} ${yb + 20}Z" fill="#8E97A3"/><path d="M${f1(cx + urW + 12)} ${yb - 20}Q${f1(cx + gap + 4)} ${yb - 10} ${f1(cx + gap)} ${yb}Q${f1(cx + gap + 4)} ${yb + 10} ${f1(cx + urW + 12)} ${yb + 20}Z" fill="#8E97A3"/></g>`;
  }
  // kandung kemih: dinding otot (annulus) + lumen berisi urin
  const E = (rr) => `M${f1(cx - rr * 0.96)} ${f1(cy)}a${f1(rr * 0.96)} ${f1(rr)} 0 1 0 ${f1(2 * rr * 0.96)} 0a${f1(rr * 0.96)} ${f1(rr)} 0 1 0 ${f1(-2 * rr * 0.96)} 0Z`;
  s += `<path d="${E(R + th)}${E(R)}" fill-rule="evenodd" fill="#C9606E"/><path d="${E(R + th)}" fill="none" stroke="#E58A92" stroke-width="3"/>`;
  s += `<defs><radialGradient id="urn" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#FFE98A"/><stop offset="1" stop-color="#F0C94A"/></radialGradient></defs><path d="${E(R)}" fill="url(#urn)"/>`;
  s += `<path d="M${f1(cx - lw)} ${f1(neckY - 4)}L${f1(cx - lw)} ${f1(yTop + 8)}L${f1(cx + lw)} ${f1(yTop + 8)}L${f1(cx + lw)} ${f1(neckY - 4)}Z" fill="#F0C94A"/>`;
  // fibra otot di dinding (garis pendek) agar terbaca sebagai otot
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + 0.15, r0 = R + th * 0.5; s += `<line x1="${f1(cx + Math.cos(a) * r0 * 0.96)}" y1="${f1(cy + Math.sin(a) * r0)}" x2="${f1(cx + Math.cos(a + 0.12) * r0 * 0.96)}" y2="${f1(cy + Math.sin(a + 0.12) * r0)}" stroke="#F2B3B8" stroke-width="3" stroke-linecap="round" opacity=".55"/>`; }
  // sfingter (cincin otot) di leher: rapat saat jalan keluar tertutup, menjauh saat membuka
  const sg = lw + uw + 4;
  s += `<ellipse cx="${f1(cx - sg)}" cy="${f1(neckY + 30)}" rx="13" ry="20" fill="#9B6BB5"/><ellipse cx="${f1(cx + sg)}" cy="${f1(neckY + 30)}" rx="13" ry="20" fill="#9B6BB5"/>`;
  // anak panah: kontraksi (ke dalam, koral) dan peregangan (ke luar, emas); ujung menghadap ke pusat (dalam) atau menjauh (luar)
  const arrow = (x, y, ang, len, col, w, al) => `<g opacity="${f1(al)}" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})"><path d="M0 ${-len}V${len * 0.35}M${-len * 0.4} ${-len * 0.05}L0 ${len * 0.55}L${len * 0.4} ${-len * 0.05}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const ring = (n, extra) => { const out = []; for (let i = 0; i < n; i++) { const a = -Math.PI + (i / (n - 1)) * Math.PI, rr = R + th + extra; out.push([cx + Math.cos(a) * rr * 0.96, cy + Math.sin(a) * rr - 4, a * 180 / Math.PI]); } return out; };
  if (c > 0.05) for (const [px, py, ad] of ring(7, 40)) s += arrow(px, py, ad + 90, 22 * (0.5 + 0.5 * c), '#FF8A7A', 7, c * 0.95);
  if ((st.stretch ?? 0) > 0.05) for (const [px, py, ad] of ring(7, 20)) s += arrow(px, py, ad - 90, 22, '#F8C038', 7, st.stretch * 0.95);
  return s;
}
/** ukuran dinding/lumen (untuk penempatan label), sesuai rumus di atas */
export const dims = (fill, c) => { const R = 52 + 52 * fill * (1 - 0.18 * c), th = Math.max(9, 26 - 13 * Math.min(fill, 1.15) + 15 * c); return { R, th, cx: 255, cy: 230, neckY: 230 + R }; };
/** keadaan normal sepanjang waktu (K = waktu kata dari cues.json) */
export function normalState(t, K) {
  const fill = lerp(0.18, 0.82, sm((t - 12.05) / (K.menyimpan + 0.6 - 12.05))) - 0.22 * sm((t - (K.jalan + 0.3)) / 2.2);
  const c = sm((t - (K.otot - 0.1)) / 1.3), op = sm((t - (K.jalan - 0.1)) / 0.8);
  const flow = op > 0.4 ? clamp((t - (K.jalan + 0.35)) / 0.4) : 0;
  return { fill, c: c * (1 - 0.3 * sm((t - (K.jalan + 1.6)) / 1.2)), open: op, obst: 0, flow, stretch: 0 };
}
/** dua kemungkinan mekanisme: 'A' = aliran keluar terhambat; 'B' = kontraksi kurang kuat */
export function mechState(t, K, which) {
  const s0 = 0.82, st = { fill: s0, c: 0, open: 0, obst: 0, flow: 0, stretch: 0 };
  const retain = sm((t - (K.tertahan - 0.5)) / 1.6), stretch = sm((t - (K.meregang - 0.5)) / 1.3);
  st.fill = s0 + 0.36 * retain; st.stretch = stretch;
  if (which === 'A') {                                  // otot berkontraksi, tetapi jalan keluar menyempit
    st.obst = sm((t - (K.terhambat - 0.3)) / 0.7); st.c = 0.9 * sm((t - (K.terhambat - 0.1)) / 0.9) * (1 - 0.9 * retain); st.open = 0.55 * sm((t - (K.terhambat + 0.4)) / 0.6);
  } else {                                              // jalan keluar membuka, tetapi kontraksi otot lemah
    st.open = sm((t - (K.kontraksi - 0.2)) / 0.6); st.c = 0.18 * sm((t - (K.kontraksi - 0.1)) / 0.6) * (1 - retain); st.flow = 0.18 * sm((t - (K.tidakKuat - 0.2)) / 0.5) * (1 - retain);
  }
  return st;
}
