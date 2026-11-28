// B/C. penampang kulit: deteksi dingin -> pusat kontrol -> saraf simpatik -> otot arrector pili memendek -> folikel tertarik -> rambut tegak -> kulit terangkat (satu unit folikel).
import { f1, clamp, lerp, sm, eo, eio, seg, track, T, GOLD, INK, W, chip, tag, callout, op, ka, mixc } from './common.js';
import { SK, TH0, TH1, folF, AP, surfY, skinWorld, coldAir, SENS, BRAIN, symPath, nerveBelly } from './skin.js';
const OX = 540, OY = 840;
const camT = track([[4.8, 1.0, 0, 410], [14.6, 1.0, 0, 410], [16.2, 1.45, 30, 150], [28.5, 1.45, 30, 150], [28.9, 1.45, 30, 150]]);
export const stateAt = (t) => ({ th: lerp(TH0, TH1, eio(seg(t, 22.4, 25.2))), mc: eio(seg(t, 21.6, 22.3)), act: seg(t, 20.4, 21.0) * (1 - 0), bump: 22 * eio(seg(t, 26.4, 27.8)), ghost: seg(t, 23.0, 23.6), cold: seg(t, 5.0, 6.5), sensP: (t - 6.5) / 2.6, symP: (t - 12.3) / 8.1, brain: seg(t, 9.0, 9.6), sym: seg(t, 12.0, 12.4), t });
export function sceneFollicle(t, out) {
  const [z, cx, cy] = camT(t), st = stateAt(t), tr = `translate(${OX} ${OY}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})`, S = (x, y) => [OX + (x - cx) * z, OY + (y - cy) * z];
  const bump = st.bump, wide = z < 1.0;
  out.A += `<g transform="${tr}">${skinWorld(t, st) + coldAir(t, st.cold)}</g>`;
  let u = chip(['KULIT MENDETEKSI', 'DINGIN'], t, 5.0, 8.2, { size: 56, bg: SK.air, fg: INK }) + chip(['RESPONS', 'TERHADAP DINGIN'], t, 8.2, 11.0, { size: 56, bg: '#fff' }) + chip(['SARAF SIMPATIK'], t, 11.0, 15.15, { size: 62, bg: '#FFF2C7', fg: INK })
    + chip(['FOLIKEL RAMBUT'], t, 15.2, 17.15, { size: 62, bg: '#fff' }) + chip(['OTOT KECIL', 'ARRECTOR PILI'], t, 17.15, 21.4, { size: 58, bg: '#FFD9DE', fg: INK })
    + chip(['OTOT KECIL', 'BERKONTRAKSI'], t, 21.4, 22.9, { size: 60, bg: '#FF9BAA', fg: INK }) + chip(['PANGKAL RAMBUT', 'TERTARIK'], t, 22.9, 24.5, { size: 56, bg: '#fff' }) + chip(['BATANG RAMBUT', 'LEBIH TEGAK'], t, 24.5, 26.45, { size: 56, bg: '#fff' }) + chip(['KULIT TERANGKAT'], t, 26.45, 28.95, { size: 60, bg: '#fff' });
  if (wide) {
    const rs = S(-250, 66), br = S(BRAIN[0], BRAIN[1] - 90);
    u += callout('reseptor dingin', 760, 470, rs[0], rs[1], ka(t, 5.4, 8.0, 0.25), { size: 32, col: SK.cold });
    u += tag('sinyal dingin ke otak', 360, 1010, ka(t, 6.7, 9.2, 0.25), { size: 28, bg: SK.air, fg: INK });
    u += tag('PUSAT KONTROL', 540, br[1] - 60, ka(t, 8.4, 15.2, 0.25), { size: 30, bg: '#fff' });
    u += tag('sinyal simpatik ke folikel', 790, 1010, ka(t, 12.2, 15.0, 0.25), { size: 28, bg: '#FFF2C7', fg: INK });
  } else {
    const fl = S(-120, 150), mu = S(90, 130), nbp = nerveBelly(st), nb = S(nbp[0] + 22, nbp[1] + 10), hr = S(150 * Math.sin(st.th) * 0.3, -150);
    u += callout('folikel', 160, 1000, fl[0], fl[1], ka(t, 15.4, 17.15, 0.25), { size: 36, col: SK.sheathD });
    u += callout('otot arrector pili', 800, 470, mu[0] + 40, mu[1] - 6, ka(t, 17.2, 21.4, 0.25), { size: 34, col: SK.muscD });
    u += callout('saraf simpatik', 820, 1120, nb[0], nb[1], ka(t, 18.2, 21.6, 0.25), { size: 32, col: SK.goldD });
    u += tag('sinyal tiba', 780, 940, ka(t, 20.2, 21.6, 0.2), { size: 32, bg: '#FFF2C7', fg: INK });
    u += tag('sebelum', 820, 470, ka(t, 23.6, 28.9, 0.3), { size: 28, bg: '#fff' }) + tag('sesudah', 380, 470, ka(t, 25.4, 28.9, 0.3), { size: 28, bg: '#CFF5E6', fg: '#0A4A3A' });
    u += tag('otot memendek lalu menarik folikel', 540, 1160, ka(t, 21.8, 24.6, 0.3), { size: 28, bg: '#fff' }) + tag('permukaan kulit membentuk tonjolan kecil', 540, 1160, ka(t, 26.5, 28.9, 0.3), { size: 28, bg: '#fff' });
  }
  u += tag('Ilustrasi edukatif', 905, 1262, 1, { size: 24, bg: '#fff' });
  out.U += u;
}
