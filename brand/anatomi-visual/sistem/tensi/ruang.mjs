// Ruang (tampak depan, satuan tokoh 400 x 800, lantai v = 778): meja di sisi kiri tokoh, gelas, kursi di belakang, bayangan lantai.
import { f1, B } from './util.mjs';
import { MEJA_X, MEJA_Y } from './tala.mjs';

export function gambarMeja(o = 1) {
  const x1 = MEJA_X, x0 = -520, y = MEJA_Y;
  return `<g opacity="${f1(o)}">
<rect x="${x1 - 30}" y="${y + 14}" width="14" height="${778 - y - 14}" rx="5" fill="#6A4630"/><rect x="${x0 + 30}" y="${y + 14}" width="14" height="${778 - y - 14}" rx="5" fill="#6A4630"/>
<rect x="${x0}" y="${y}" width="${x1 - x0}" height="18" rx="7" fill="#8A5C3A"/>
<rect x="${x0}" y="${y - 7}" width="${x1 - x0}" height="12" rx="6" fill="#C79A68"/><rect x="${x0 + 20}" y="${y - 5}" width="${x1 - x0 - 60}" height="3.5" rx="2" fill="#F0D2A4" opacity=".55"/>
<g transform="translate(-52 ${y - 5})"><path d="M-17 -56H17L14 0H-14Z" fill="#CFE9F0" opacity=".3" stroke="#E8F6FA" stroke-width="2" stroke-opacity=".6"/><path d="M-16 -34H16L14 0H-14Z" fill="#7FD0E8" opacity=".55"/><path d="M-10 -50L-9 -6" stroke="#fff" stroke-width="2.4" opacity=".6" stroke-linecap="round"/></g></g>`;
}
export function gambarKursi(o = 1, geser = 0) {
  return `<g opacity="${f1(o)}" transform="translate(${f1(geser)} 0)">
<rect x="96" y="372" width="208" height="12" rx="6" fill="#8A5C3A"/><rect x="92" y="372" width="14" height="${652 - 372}" rx="6" fill="#8A5C3A"/><rect x="294" y="372" width="14" height="${652 - 372}" rx="6" fill="#8A5C3A"/>
<rect x="106" y="396" width="188" height="150" rx="14" fill="#B88558" opacity=".95"/><rect x="118" y="408" width="164" height="126" rx="10" fill="#C79A68"/>
<rect x="80" y="650" width="240" height="18" rx="9" fill="#8A5C3A"/><rect x="84" y="640" width="232" height="16" rx="8" fill="#007060"/><rect x="100" y="643" width="150" height="4" rx="2" fill="#2DB59C" opacity=".6"/>
<rect x="88" y="668" width="13" height="${778 - 668}" rx="5" fill="#6A4630"/><rect x="299" y="668" width="13" height="${778 - 668}" rx="5" fill="#6A4630"/></g>`;
}
export const gambarLantai = (o = 1) => `<ellipse cx="200" cy="782" rx="330" ry="26" fill="#02100E" opacity="${f1(0.42 * o)}" filter="${B(9)}"/>`;
