// Maskot MEDCOEL ASLI (apps/web/src/mascots/*.svg, panduan docs/MASKOT.md) dipasang apa adanya; hanya lapisan resminya yang digerakkan lewat transformasi
// (.mc-float badan, .mc-arm-right lengan, .mc-eyes-*, .mc-mouth-*, .mc-spark). Bentuk, warna, dan wajah tidak digambar ulang.
// Overlay ekspresi (keringat, tanda tanya, kelopak lelah) digambar DI ATAS maskot, tidak mengubah SVG aslinya.
import { f1, clamp } from './core.js';
const BASE = '/apps/web/src/mascots/';
const cache = {};
export async function loadMascots() { for (const n of ['kori', 'kila', 'nilo']) { const t = await (await fetch(BASE + n + '.svg')).text(); cache[n] = t.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); } }
const EYE = { kori: '#172B38', kila: '#172B38', nilo: '#FFFFFF' };
/**
 * mascot(nama, { x, y, s, rot, flip, bob, sx, sy, arm, eyes, mouth, spark, over })
 * (x, y) = titik tengah kaki (dasar maskot); s = skala (1 = 320 px). eyes: 'normal' | 'happy' | 'blink' | 'tired'. mouth: 'normal' | 'happy' | 'think'.
 * arm = derajat putar lengan kanan. over: gambar tambahan di koordinat maskot (0-320).
 */
export function mascot(name, o = {}) {
  const { x = 540, y = 1000, s = 1, rot = 0, flip = 1, bob = 0, sx = 1, sy = 1, arm = 0, eyes = 'normal', mouth = 'normal', spark = 0.8, over = '', a = 1 } = o;
  let m = cache[name];
  const op = (v) => f1(v);
  m = m.replace('<g class="mc-float">', `<g transform="translate(160 286) rotate(${f1(rot)}) scale(${f1(sx * 1000) / 1000} ${f1(sy * 1000) / 1000}) translate(-160 -286) translate(0 ${f1(bob)})">`);
  m = m.replace(/<g class="mc-wave mc-arm-right">/, `<g transform="rotate(${f1(arm)} 236 182)">`);
  const happyEyes = eyes === 'happy', hide = eyes === 'happy' || eyes === 'blink';
  m = m.replace(/<g class="mc-eyes-normal"/, `<g opacity="${hide ? 0 : 1}"`);
  m = m.replace(/class="mc-eyes-happy"([^>]*?)opacity="0"/, `$1opacity="${happyEyes ? 1 : 0}"`);
  m = m.replace(/<circle([^>]*?)r="2.5" fill="#fff"\/>/g, (s0, g) => `<circle${g}r="2.5" fill="#fff" opacity="${hide ? 0 : 1}"/>`);
  m = m.replace(/<path class="mc-mouth-normal"/, `<path opacity="${mouth === 'normal' ? 1 : 0}"`);
  m = m.replace(/class="mc-mouth-happy"([^>]*?)opacity="0"/, `$1opacity="${mouth === 'happy' ? 1 : 0}"`);
  m = m.replace(/class="mc-mouth-think"([^>]*?)opacity="0"/, `$1opacity="${mouth === 'think' ? 1 : 0}"`);
  m = m.replace(/<(g|circle) class="mc-spark"/, `<$1 opacity="${op(clamp(spark))}"`);
  const ec = EYE[name];
  const extra = (eyes === 'blink' ? `<path d="M119 162h26M176 162h26" stroke="${ec}" stroke-width="7" stroke-linecap="round" fill="none"/>` : '')
    + (eyes === 'tired' ? `<path d="M116 150h32M173 150h32" stroke="${name === 'nilo' ? '#315F73' : '#00584E'}" stroke-width="12" stroke-linecap="round" opacity=".92"/>` : '') + over;
  return `<g opacity="${f1(a)}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s * flip * 1000) / 1000} ${f1(s * 1000) / 1000}) translate(-160 -286)">${m}<g transform="translate(0 ${f1(bob)})">${extra}</g></g>`;
}
// overlay ekspresi
export const sweat = (k = 1) => `<path d="M236 112q12 18 0 28q-12-10 0-28z" fill="#9FD6F2" stroke="#6FB1D6" stroke-width="3" opacity="${f1(clamp(k))}"/>`;
export const qmarks = (t, c = '#F8C038') => [0, 1, 2].map((i) => { const bob = Math.sin(t * 5 + i * 1.8) * 6; return `<text x="${60 + i * 100}" y="${30 + (i % 2) * 24 + bob}" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="64" fill="${c}" stroke="#172B38" stroke-width="6" paint-order="stroke" text-anchor="middle">?</text>`; }).join('');
export const swirl = (t) => `<g transform="translate(160 40) rotate(${f1(t * 300)})" fill="none" stroke="#F8C038" stroke-width="7" stroke-linecap="round"><path d="M0 0m-4 0a4 4 0 1 1 4 4a9 9 0 1 1 -9 -9a15 15 0 1 1 15 15"/></g>`;
