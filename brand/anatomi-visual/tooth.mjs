// Potongan memanjang molar bawah (bidang sagital): mahkota dengan dua tonjol bukal, dua akar (mesial dan distal),
// enamel, dentin bergaris, kamar pulpa dengan tanduk pulpa, saluran akar (dua di akar mesial, satu di distal, sesuai pola umum),
// sementum, ligamen periodontal, gingiva dengan papila di antara akar, tulang alveolar berbatas korteks, dan berkas
// saraf-pembuluh yang masuk dari apeks ke pulpa. Konsep visual, bukan skala.
import { ORGAN, OUTLINE, gid, tube, solid, specular, sheen, branches } from './style.mjs';

export const TOOTH_BOX = { x: 150, y: 150, w: 700, h: 800, cx: 500, cy: 540 };
const lcg = (seed) => { let r = seed; return () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; }; };

// mahkota dengan dua tonjol (kiri dan kanan) dan lekuk di tengah
const CROWN = 'M 246 486 C 218 404 214 318 226 258 C 238 204 286 170 336 176 C 368 180 384 196 420 194 C 456 192 474 178 510 178 C 552 178 572 196 606 200 C 662 170 726 194 746 256 C 760 318 756 404 728 486 Z';
// dentin mengikuti kontur mahkota, dengan tonjol yang sama
const DENTIN = 'M 278 462 C 262 396 258 322 270 278 C 282 240 318 226 352 230 C 380 234 396 224 424 224 C 456 224 474 214 508 214 C 540 214 560 226 590 230 C 626 228 668 242 684 278 C 698 322 694 396 676 462 Z';
// kamar pulpa dengan dua tanduk pulpa di bawah tonjol
const PULP = 'M 330 442 C 318 378 324 306 346 278 Q 384 262 430 268 Q 470 262 508 266 Q 556 262 592 278 C 612 306 618 378 606 442 Z';
// akar mesial (kiri, sedikit lebih lebar) dan distal (kanan, lebih ramping)
const ROOT_M = 'M 242 478 C 246 590 282 702 326 790 C 338 812 370 812 380 790 C 402 712 422 610 440 478 Z';
const ROOT_D = 'M 552 478 C 570 610 592 706 606 782 C 614 806 644 806 652 784 C 682 706 716 596 730 478 Z';
// dua saluran di akar mesial, satu di distal (pola umum molar bawah)
const CANAL_M1 = 'M 338 440 C 340 540 350 640 360 748 L 372 748 C 376 640 384 540 392 440 Z';
const CANAL_M2 = 'M 396 440 C 404 540 414 640 420 730 L 432 728 C 430 640 422 540 418 440 Z';
const CANAL_D = 'M 566 440 C 580 560 600 660 614 760 L 628 756 C 620 660 606 560 598 440 Z';
const GINGIVA = 'M 150 470 C 188 428 232 452 248 480 C 296 506 356 512 432 506 C 470 500 492 500 514 506 L 560 506 C 640 512 708 506 752 480 C 768 454 812 428 850 470 L 850 556 C 700 566 300 566 150 556 Z';
const BONE = 'M 150 548 L 850 548 L 850 810 C 828 898 716 944 500 944 C 284 944 172 898 150 810 Z';

function inRoot(x, y) {
  return (x > 236 && x < 448 && y > 470) || (x > 546 && x < 736 && y > 470);
}

export function toothSvg(uid) {
  let s = '';
  const rnd = lcg(7);
  // 1. tulang alveolar: korteks padat di tepi (lebih gelap) dan trabekula berongga di dalam
  s += `<path d="${BONE}" fill="url(#${gid(uid, 'bone')})"/>`;
  for (let y = 566; y < 930; y += 28) for (let x = 170; x < 840; x += 36) {
    if (inRoot(x, y) || (y > 860 && (x < 260 || x > 740))) continue;
    if (rnd() < 0.3) continue;                                  // pori tidak seragam
    const jx = x + (rnd() - 0.5) * 16, jy = y + (rnd() - 0.5) * 12, rx = 4 + rnd() * 8, ry = 2.5 + rnd() * 5;
    s += `<ellipse cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${ORGAN.bone.dark}" opacity="${(0.25 + rnd() * 0.25).toFixed(2)}"/>`;
  }
  s += `<path d="${BONE}" fill="none" stroke="${ORGAN.bone.dark}" stroke-width="5" opacity="0.45"/>`;
  // 2. ligamen periodontal: lapisan gelap tipis mengikuti akar
  s += `<path d="${ROOT_M}" fill="none" stroke="#8A3A3E" stroke-width="18" stroke-linejoin="round" opacity="0.45"/>`;
  s += `<path d="${ROOT_D}" fill="none" stroke="#8A3A3E" stroke-width="18" stroke-linejoin="round" opacity="0.45"/>`;
  // 3. berkas saraf-pembuluh dari apeks masuk ke saluran (tiga jalur)
  for (const [k, x0, x1, w] of [['artery', 356, 360, 8], ['vein', 372, 372, 8], ['nerve', 384, 382, 6]]) {
    const d = `M ${x0} 800 C ${x0 - 6} 856 ${x1 + 6} 900 ${x1} 948`;
    s += `<path d="${d}" fill="none" stroke="${OUTLINE.color}" stroke-width="${w + 5}" stroke-linecap="round" opacity="0.5"/>`;
    s += `<path d="${d}" fill="none" stroke="${k === 'nerve' ? ORGAN.nerve.base : ORGAN[k].base}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  // 4. akar: sementum (lapisan luar), dentin di bawah
  s += solid(ROOT_M, 'cementum', uid);
  s += solid(ROOT_D, 'cementum', uid);
  s += `<path d="${ROOT_M}" fill="none" stroke="${ORGAN.dentin.base}" stroke-width="14" stroke-linejoin="round" opacity="0.6"/>`;
  s += `<path d="${ROOT_D}" fill="none" stroke="${ORGAN.dentin.base}" stroke-width="14" stroke-linejoin="round" opacity="0.6"/>`;
  // 5. saluran akar (pulpa) berisi cabang pembuluh dan saraf (kuning, biru, merah)
  for (const c of [CANAL_M1, CANAL_M2, CANAL_D]) s += solid(c, 'pulp', uid, { outline: false });
  // 6. mahkota: enamel, lalu dentin dengan garis tubuli dari pulpa ke enamel
  s += `<g filter="url(#${uid}-shadow)">` + solid(CROWN, 'enamel', uid) + `</g>`;
  s += sheen(CROWN, 26, uid, 0.5);
  s += solid(DENTIN, 'dentin', uid, { outline: false });
  for (let i = 0; i < 32; i++) {
    const x = 292 + i * 12.5, yTop = 232 + (i % 5) * 3, yBot = 420 + (i % 4) * 8;
    s += `<path d="M ${x.toFixed(1)} ${yBot} Q ${(x + (i % 2 ? 4 : -4)).toFixed(1)} ${((yTop + yBot) / 2).toFixed(1)} ${(x + (i < 16 ? -3 : 3)).toFixed(1)} ${yTop}" fill="none" stroke="${ORGAN.dentin.dark}" stroke-width="1.6" opacity="0.2"/>`;
  }
  s += `<path d="${DENTIN}" fill="none" stroke="${ORGAN.dentin.dark}" stroke-width="3" opacity="0.55"/>`;
  // 7. kamar pulpa dengan tanduk pulpa di bawah tiap tonjol
  s += solid(PULP, 'pulp', uid, { outline: false });
  s += `<circle cx="368" cy="282" r="22" fill="url(#${gid(uid, 'pulp')})"/>`;
  s += `<circle cx="578" cy="284" r="22" fill="url(#${gid(uid, 'pulp')})"/>`;
  // cabang pembuluh dan saraf di pulpa (dari saluran ke tanduk)
  s += branches([[388, 440, -1.65], [404, 440, -1.5], [592, 440, -1.6], [578, 440, -1.5]], (i) => [4, 3, 4, 3][i], 'artery', uid, rnd, { depth: 2, len: 42, spread: 0.45 });
  for (const [x, y, c] of [[352, 442, 'nerve'], [366, 442, 'vein'], [606, 442, 'nerve'], [600, 442, 'vein']]) {
    s += `<path d="M ${x} ${y} C ${x + (x < 480 ? 6 : -6)} ${y - 60} ${x + (x < 480 ? 10 : -10)} ${y - 110} ${x + (x < 480 ? 14 : -14)} ${y - 150}" fill="none" stroke="${c === 'nerve' ? ORGAN.nerve.light : ORGAN.vein.light}" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>`;
  }
  // 8. gingiva: tepi bebas mengelilingi leher gigi, papila di antara akar
  s += `<g filter="url(#${uid}-shadow)">` + solid(GINGIVA, 'gingiva', uid) + `</g>`;
  s += sheen(GINGIVA, 20, uid, 0.4);
  // kilau permukaan
  s += specular(330, 300, 54, 16, -20, uid, 0.3);
  s += specular(300, 380, 12, 46, 6, uid, 0.14);
  return s;
}
