// Latar orisinal MEDCOEL (ink-teal berlapis): gradien, tiga siku "C" bersarang (paralaks), penggaris atlas, cahaya kiri-atas, bintang emas, vinyet. Struktur lapisan sama dengan seri anatomi.
import { f1, MC } from './core.js';
const star = (x, y, r, a) => `<path transform="translate(${f1(x)} ${f1(y)})" d="M0 ${-r}C${f1(r * 0.14)} ${f1(-r * 0.14)} ${f1(r * 0.14)} ${f1(-r * 0.14)} ${r} 0C${f1(r * 0.14)} ${f1(r * 0.14)} ${f1(r * 0.14)} ${f1(r * 0.14)} 0 ${r}C${f1(-r * 0.14)} ${f1(r * 0.14)} ${f1(-r * 0.14)} ${f1(r * 0.14)} ${-r} 0C${f1(-r * 0.14)} ${f1(-r * 0.14)} ${f1(-r * 0.14)} ${f1(-r * 0.14)} 0 ${-r}Z" fill="${MC.gold}" opacity="${f1(a)}"/>`;
const siku = (cx, cy, w, h, r, gap) => { const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, xe = x1 - gap; return `M${f1(xe)} ${f1(y0)}H${f1(x0 + r)}A${r} ${r} 0 0 0 ${f1(x0)} ${f1(y0 + r)}V${f1(y1 - r)}A${r} ${r} 0 0 0 ${f1(x0 + r)} ${f1(y1)}H${f1(xe)}`; };
/** tone: 'ink' (default) | 'teal'. t = detik; cam = {cx, cy} untuk paralaks lambat */
export function bg(t = 0, o = {}) {
  const cx = 540, cy = o.cy ?? 940, p = [Math.sin(t * 0.5) * 7 - (o.px ?? 0) * 0.04, Math.sin(t * 0.5 + 1.4) * -10 - (o.px ?? 0) * 0.07, Math.sin(t * 0.5 + 2.6) * 13 - (o.px ?? 0) * 0.1], dy = -(o.py ?? 0) * 0.05;
  let s = `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#0F4047"/><stop offset=".52" stop-color="#0B2F38"/><stop offset="1" stop-color="#061C24"/></linearGradient><radialGradient id="bgC" gradientUnits="userSpaceOnUse" cx="${cx - 180}" cy="${cy - 420}" r="760"><stop offset="0" stop-color="#2BB8C4" stop-opacity=".30"/><stop offset=".6" stop-color="#2BB8C4" stop-opacity=".06"/><stop offset="1" stop-color="#2BB8C4" stop-opacity="0"/></radialGradient><radialGradient id="bgV" cx="50%" cy="46%" r="78%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>`;
  s += `<rect x="-140" y="-140" width="1360" height="2200" fill="url(#bgG)"/>`;
  s += `<g fill="none" stroke="#1F9C86" stroke-linecap="round"><path transform="translate(${f1(p[0])} ${f1(dy)})" d="${siku(cx, cy + 40, 1000, 1380, 150, 150)}" stroke-width="30" opacity=".22"/><path transform="translate(${f1(p[1])} ${f1(dy * 1.4)})" d="${siku(cx, cy + 40, 868, 1230, 124, 190)}" stroke-width="20" opacity=".17"/><path transform="translate(${f1(p[2])} ${f1(dy * 1.8)})" d="${siku(cx, cy + 40, 738, 1080, 98, 230)}" stroke-width="12" opacity=".14"/></g>`;
  let rule = ''; for (let y = 330, i = 0; y <= 1500; y += 20, i++) rule += `<path d="M36 ${y + ((dy * 3) % 20)}h${i % 5 === 0 ? 30 : 16}"/>`;
  s += `<g stroke="#F8F7F3" stroke-width="2" opacity=".16" fill="none">${rule}</g>`;
  s += `<rect x="-140" y="-140" width="1360" height="2200" fill="url(#bgC)"/>`;
  const tw = (k) => 0.55 + 0.35 * Math.sin(t * 1.3 + k);
  s += `${star(930, 410, 28, tw(0))}${star(118, 1010, 17, tw(2))}${star(968, 1500, 22, tw(4))}${star(190, 372, 12, tw(5))}${star(900, 1010, 10, tw(1))}`;
  s += `<rect x="-140" y="-140" width="1360" height="2200" fill="url(#bgV)"/>`;
  return s;
}
