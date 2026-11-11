// Benda bersama video "Level Up": gerak lari, laptop MEDCOEL (layar + dudukan "save point"). Latar dan HUD ada di pix.js.
import { f1, clamp, MC, FONT } from './core.js';
import { R, T, PX } from './pix.js';

export const MONO = "'DejaVu Sans Mono','Liberation Mono',monospace";
export function runPose(t, sp = 14) { const s = Math.sin(t * sp), c = Math.cos(t * sp * 0.5); return { bob: -Math.abs(s) * 28, rot: s * 5 + 7, sy: 1 + 0.05 * (Math.abs(s) < 0.2 ? -1 : 0.2), sx: 1 - 0.03 * (Math.abs(s) < 0.2 ? -1 : 0.2), arm: -40 + c * 55 }; }
export const LAPTOP = { cx: 770, cy: 1010, w: 520, h: 330 };
export function laptopScreen(t, state) {
  const { cx, cy, w, h } = LAPTOP, x = cx - w / 2, y = cy - h / 2;
  let s = `<g>${R(x - 16, y - 16, w + 32, h + 32, '#1A252E', 22, 'stroke="#3B4D5B" stroke-width="3"')}`;
  if (state === 'off') s += R(x, y, w, h, '#0B1218', 10) + `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="${MONO}" font-size="26" fill="#2C3B46">· · ·</text>`;
  else {
    const g = state === 'prompt' ? 0.7 + 0.3 * Math.sin(t * 7) : 1;
    s += R(x, y, w, h, '#EAF6F1', 10) + `<image href="logo-full.webp" x="${cx - 150}" y="${y + 50}" width="300" height="60" preserveAspectRatio="xMidYMid meet"/>`;
    if (state === 'prompt') s += `<g transform="translate(${cx} ${y + 200}) scale(${f1(1 + 0.04 * Math.sin(t * 7))})">${R(-178, -42, 356, 84, MC.brand, 42, `stroke="${MC.ink}" stroke-width="4"`)}${T(0, 14, 'COBA MEDCOEL', '#fff', 38)}</g>`;
    if (state === 'after') s += `${T(cx, y + 190, '1 BAB DULU', MC.brand, 44)}`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#7CE0B8" stroke-width="${f1(4 * g)}" opacity="${f1(g)}"/>`;
  }
  return s + '</g>';
}
/** laptop di atas "save point" (cincin emas berdenyut di tanah). state: off|on|prompt|after */
export function laptop(t, state, glow = 0) {
  const ring = 0.55 + 0.45 * Math.sin(t * 6) * glow;
  let g = `<g opacity="${f1(clamp(glow * 1.2 + (state === 'off' ? 0 : 0.2), 0, 1))}" shape-rendering="crispEdges">${R(LAPTOP.cx - 300, 1262, 600, 10, MC.gold, 0, `opacity="${f1(ring)}"`)}${R(LAPTOP.cx - 240, 1276, 480, 8, MC.gold, 0, `opacity="${f1(ring * 0.6)}"`)}</g>`;
  g += R(LAPTOP.cx - 36, 1190, 72, 62, '#1A252E') + laptopScreen(t, state);
  g += R(LAPTOP.cx - 330, 1252, 660, 24, '#2A3A46', 8) + R(LAPTOP.cx - 190, 1240, 380, 14, '#1A252E', 6);
  return g;
}
export { PX };
