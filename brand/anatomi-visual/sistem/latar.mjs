// Latar berlapis khas MEDCOEL (bukan ungu-magenta, tanpa bokeh). Bahasa bentuknya dari logo: siku "C" bersarang yang terbuka ke kanan
// dengan bintang empat sudut emas di bukaannya. Lapisan (belakang ke depan), masing-masing <g id> yang bisa digeser paralaks:
//   L0 gradien vertikal tinta/hijau gelap (warna dasar per organ)
//   L1 tiga siku "C" bersarang (paralaks lambat)
//   L2 penggaris atlas: tanda ukur di tepi kiri dan tanda registrasi di sudut panggung
//   L3 cahaya terarah dari kiri atas (arah cahaya sama dengan organ) + bayangan lantai lembut
//   L4 bintang emas kecil berkelip pelan
//   L5 vinyet
// Pergantian organ cukup mengganti entri LATAR[organ] di tokens.mjs; struktur lapisan tetap, sehingga tetap terasa satu seri.
import { KANVAS, LATAR, TATA } from './tokens.mjs';

const f = (n) => (Math.round(n * 10) / 10).toString();
export const bintang = (x, y, r, fill, o = 1) => `<path transform="translate(${f(x)} ${f(y)})" d="M0 ${-r}C${f(r * 0.14)} ${f(-r * 0.14)} ${f(r * 0.14)} ${f(-r * 0.14)} ${r} 0C${f(r * 0.14)} ${f(r * 0.14)} ${f(r * 0.14)} ${f(r * 0.14)} 0 ${r}C${f(-r * 0.14)} ${f(r * 0.14)} ${f(-r * 0.14)} ${f(r * 0.14)} ${-r} 0C${f(-r * 0.14)} ${f(-r * 0.14)} ${f(-r * 0.14)} ${f(-r * 0.14)} 0 ${-r}Z" fill="${fill}" opacity="${o}"/>`;

function siku(cx, cy, w, h, r, gap) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, xe = x1 - gap;
  return `M${f(xe)} ${f(y0)}H${f(x0 + r)}A${r} ${r} 0 0 0 ${f(x0)} ${f(y0 + r)}V${f(y1 - r)}A${r} ${r} 0 0 0 ${f(x0 + r)} ${f(y1)}H${f(xe)}`;
}

/** t: detik (untuk paralaks/kelip). cx, cy: pusat panggung. */
export function latar(organ, t = 0, { cx = TATA.pusat.x, cy = TATA.pusat.y } = {}) {
  const L = LATAR[organ], W = KANVAS.w, H = KANVAS.h, id = `lt-${organ}`;
  let s = `<defs>
<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.atas}"/><stop offset=".52" stop-color="${L.tengah}"/><stop offset="1" stop-color="${L.bawah}"/></linearGradient>
<radialGradient id="${id}-c" gradientUnits="userSpaceOnUse" cx="${cx - 150}" cy="${cy - 260}" r="640"><stop offset="0" stop-color="${L.cahaya}" stop-opacity=".34"/><stop offset=".55" stop-color="${L.cahaya}" stop-opacity=".1"/><stop offset="1" stop-color="${L.cahaya}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-l" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-v" cx="50%" cy="46%" r="78%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>`;
  s += `<g id="L0"><rect x="-140" y="-140" width="${W + 280}" height="${H + 280}" fill="url(#${id}-g)"/></g>`;
  // L1: siku C bersarang, paralaks berbeda arah
  const p = [Math.sin(t * 0.5) * 7, Math.sin(t * 0.5 + 1.4) * -10, Math.sin(t * 0.5 + 2.6) * 13];
  s += `<g id="L1" fill="none" stroke="${L.rangka}" stroke-linecap="round">`
    + `<path transform="translate(${f(p[0])} 0)" d="${siku(cx, cy + 40, 1000, 1380, 150, 150)}" stroke-width="30" opacity=".26"/>`
    + `<path transform="translate(${f(p[1])} 0)" d="${siku(cx, cy + 40, 868, 1230, 124, 190)}" stroke-width="20" opacity=".2"/>`
    + `<path transform="translate(${f(p[2])} 0)" d="${siku(cx, cy + 40, 738, 1080, 98, 230)}" stroke-width="12" opacity=".16"/></g>`;
  // L2: penggaris atlas
  let rule = '';
  for (let y = TATA.panggung.y, i = 0; y <= TATA.panggung.y + TATA.panggung.h; y += 20, i++) rule += `<path d="M36 ${y}h${i % 5 === 0 ? 30 : 16}" />`;
  const reg = (x, y, sx, sy) => `<path d="M${x} ${y}h${34 * sx}M${x} ${y}v${34 * sy}"/>`;
  const pg = TATA.panggung;
  s += `<g id="L2" stroke="#F8F7F3" stroke-width="2" opacity=".2" fill="none">${rule}${reg(pg.x - 20, pg.y - 14, 1, 1)}${reg(pg.x + pg.w + 20, pg.y - 14, -1, 1)}${reg(pg.x - 20, pg.y + pg.h + 14, 1, -1)}${reg(pg.x + pg.w + 20, pg.y + pg.h + 14, -1, -1)}</g>`;
  // L3: cahaya terarah + bayangan lantai
  s += `<g id="L3"><rect x="-140" y="-140" width="${W + 280}" height="${H + 280}" fill="url(#${id}-c)"/><ellipse cx="${cx}" cy="${pg.y + pg.h + 44}" rx="380" ry="46" fill="url(#${id}-l)"/></g>`;
  // L4: bintang emas (bahasa logo), kelip pelan
  const tw = (k) => 0.55 + 0.35 * Math.sin(t * 1.3 + k);
  s += `<g id="L4">${bintang(930, 410, 30, L.aksen, tw(0))}${bintang(118, 1010, 17, L.aksen, tw(2))}${bintang(968, 1500, 22, L.aksen, tw(4))}${bintang(190, 372, 12, L.aksen, tw(5))}${bintang(880, 1010, 10, L.aksen, tw(1))}</g>`;
  s += `<g id="L5"><rect x="-140" y="-140" width="${W + 280}" height="${H + 280}" fill="url(#${id}-v)"/></g>`;
  return s;
}
