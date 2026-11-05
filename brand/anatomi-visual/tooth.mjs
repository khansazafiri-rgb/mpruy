// Potongan memanjang gigi molar (bidang sagital): mahkota dengan enamel, dentin bergaris, kamar pulpa dan saluran akar
// yang bercabang dengan pembuluh dan saraf, gingiva di leher gigi, tulang alveolar berongga (trabekula), dan berkas
// saraf-pembuluh di apeks. Koordinat lokal sekitar x 150..850, y 160..940. Konsep visual, bukan skala anatomi; lihat README.
import { ORGAN, OUTLINE, gid, tube, solid, specular, sheen } from './style.mjs';

export const TOOTH_BOX = { x: 150, y: 160, w: 700, h: 780, cx: 500, cy: 550 };
const lcg = (seed) => { let r = seed; return () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; }; };

const CROWN = 'M 252 480 C 222 392 218 296 236 236 C 252 184 300 160 352 170 C 392 180 418 166 470 166 C 522 166 560 180 600 170 C 660 160 722 186 746 236 C 764 296 760 392 736 480 Z';
const DENTIN = 'M 290 446 C 268 380 264 306 278 262 C 294 222 332 208 362 214 C 398 220 422 208 470 208 C 520 208 556 218 592 212 C 632 206 682 224 702 262 C 716 306 712 380 690 446 Z';
const PULP = 'M 338 428 C 326 370 332 298 358 266 Q 402 248 470 258 Q 540 248 582 266 C 608 298 614 370 602 428 Z';
const ROOT_L = 'M 240 474 C 250 580 300 700 350 782 C 362 802 388 802 398 782 C 420 700 430 600 452 474 Z';
const ROOT_R = 'M 548 474 C 562 600 590 700 610 782 C 620 802 646 802 656 782 C 690 700 722 580 742 474 Z';
const CANAL_L = 'M 390 424 C 386 520 382 620 378 722 L 396 724 C 402 620 410 520 414 424 Z';
const CANAL_R = 'M 586 424 C 590 520 604 620 618 722 L 636 718 C 626 620 612 520 606 424 Z';
const GINGIVA = 'M 150 468 C 186 426 232 452 246 476 C 292 502 352 508 430 502 L 562 502 C 642 508 710 502 756 476 C 772 452 812 426 850 468 L 850 548 C 700 556 300 556 150 548 Z';
// tulang alveolar: bentuk membulat di bawah gusi, lalu lubang trabekula di bagian dalam
const BONE = 'M 150 540 L 850 540 L 850 800 C 830 890 720 936 500 936 C 280 936 170 890 150 800 Z';

function inRoot(x, y) {   // area akar dan kanal: lubang tulang tidak digambar di sini
  return (x > 236 && x < 456 && y > 470) || (x > 544 && x < 748 && y > 470);
}

export function toothSvg(uid) {
  let s = '';
  const rnd = lcg(7);
  // 1. tulang alveolar: isi gradien, lalu lubang trabekula (oval gelap dengan tepi terang)
  s += `<path d="${BONE}" fill="url(#${gid(uid, 'bone')})"/>`;
  for (let y = 556; y < 930; y += 24) for (let x = 166; x < 840; x += 30) {
    if (inRoot(x, y) || y > 880 && (x < 240 || x > 760)) continue;
    const jx = x + (rnd() - 0.5) * 12, jy = y + (rnd() - 0.5) * 10, rx = 7 + rnd() * 9, ry = 4 + rnd() * 7;
    s += `<ellipse cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${ORGAN.bone.dark}" opacity="${(0.45 + rnd() * 0.3).toFixed(2)}"/>`;
    s += `<ellipse cx="${(jx + 1.5).toFixed(1)}" cy="${(jy + 1.5).toFixed(1)}" rx="${(rx * 0.7).toFixed(1)}" ry="${(ry * 0.5).toFixed(1)}" fill="none" stroke="${ORGAN.bone.light}" stroke-width="2" opacity="0.5"/>`;
  }
  s += `<path d="${BONE}" fill="none" stroke="${OUTLINE.color}" stroke-width="4" opacity="0.5"/>`;
  // 2. ligamen periodontal: lapisan gelap tipis di sekeliling akar
  s += `<path d="${ROOT_L}" fill="none" stroke="#8A3A3E" stroke-width="20" stroke-linejoin="round" opacity="0.5"/>`;
  s += `<path d="${ROOT_R}" fill="none" stroke="#8A3A3E" stroke-width="20" stroke-linejoin="round" opacity="0.5"/>`;
  // 3. berkas saraf dan pembuluh di apeks
  const bundle = [['artery', 368, 9], ['vein', 380, 9], ['nerve', 392, 7]];
  for (const [k, x, w] of bundle) {
    const d = `M ${x} 800 C ${x - 4} 850 ${x + 6} 890 ${x - 2} 936`;
    s += `<path d="${d}" fill="none" stroke="${OUTLINE.color}" stroke-width="${w + 5}" stroke-linecap="round" opacity="0.5"/>`;
    s += `<path d="${d}" fill="none" stroke="${k === 'nerve' ? ORGAN.nerve.base : ORGAN[k].base}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  // 4. akar: sementum (lapisan luar) dan dentin di dalam
  s += solid(ROOT_L, 'cementum', uid);
  s += solid(ROOT_R, 'cementum', uid);
  s += `<path d="${ROOT_L}" fill="none" stroke="${ORGAN.dentin.base}" stroke-width="16" stroke-linejoin="round" opacity="0.55"/>`;
  s += `<path d="${ROOT_R}" fill="none" stroke="${ORGAN.dentin.base}" stroke-width="16" stroke-linejoin="round" opacity="0.55"/>`;
  // 5. saluran akar (pulpa) dan cabang halus berisi pembuluh dan saraf
  s += solid(CANAL_L, 'pulp', uid, { outline: false });
  s += solid(CANAL_R, 'pulp', uid, { outline: false });
  const canalL = [['artery', 'M 400 430 C 398 520 392 620 388 716', 3.5], ['vein', 'M 404 430 C 404 520 400 620 396 716', 3.5], ['nerve', 'M 396 430 C 394 520 388 620 384 716', 2.5]];
  for (const [k, d, w] of canalL) s += `<path d="${d}" fill="none" stroke="${k === 'nerve' ? ORGAN.nerve.light : ORGAN[k].light}" stroke-width="${w}" stroke-linecap="round" opacity="0.9"/>`;
  const canalR = ['M 598 430 C 602 520 616 620 626 716', 'M 604 430 C 610 520 620 620 630 716', 'M 592 430 C 594 520 608 620 620 716'];
  canalR.forEach((d, i) => { const k = ['artery', 'vein', 'nerve'][i]; s += `<path d="${d}" fill="none" stroke="${k === 'nerve' ? ORGAN.nerve.light : ORGAN[k].light}" stroke-width="${[3.5, 3.5, 2.5][i]}" stroke-linecap="round" opacity="0.9"/>`; });
  // 6. mahkota: enamel (lapisan luar) dengan bayangan, lalu dentin bergaris
  s += `<g filter="url(#${uid}-shadow)">` + solid(CROWN, 'enamel', uid) + `</g>`;
  s += sheen(CROWN, 30, uid, 0.5);
  s += solid(DENTIN, 'dentin', uid, { outline: false });
  for (let i = 0; i < 26; i++) {               // garis dentin (tubuli) dari pulpa ke batas enamel
    const x = 296 + i * 16, yTop = 236 + (i % 4) * 4, yBot = 420 + (i % 3) * 6;
    s += `<path d="M ${x} ${yBot} Q ${x + (i % 2 ? 6 : -6)} ${(yTop + yBot) / 2} ${x + (i < 13 ? -4 : 4)} ${yTop}" fill="none" stroke="${ORGAN.dentin.dark}" stroke-width="2" opacity="0.22"/>`;
  }
  s += `<path d="${DENTIN}" fill="none" stroke="${ORGAN.dentin.dark}" stroke-width="3" opacity="0.6"/>`;
  // 7. kamar pulpa dengan tanduk pulpa (tonjolan ke arah tonjol gigi)
  s += solid(PULP, 'pulp', uid, { outline: false });
  s += `<circle cx="352" cy="262" r="20" fill="url(#${gid(uid, 'pulp')})"/>`;
  s += `<circle cx="590" cy="264" r="22" fill="url(#${gid(uid, 'pulp')})"/>`;
  s += `<path d="M 470 420 C 470 360 462 320 470 274" fill="none" stroke="${ORGAN.artery.light}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`;
  s += `<path d="M 470 420 C 478 350 486 300 470 268" fill="none" stroke="${ORGAN.vein.light}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>`;
  // 8. gingiva di sekitar leher gigi (menutupi tepi bawah mahkota)
  s += `<g filter="url(#${uid}-shadow)">` + solid(GINGIVA, 'gingiva', uid) + `</g>`;
  s += sheen(GINGIVA, 22, uid, 0.4);
  // kilau permukaan
  s += specular(330, 300, 62, 18, -24, uid, 0.34);
  s += specular(300, 390, 14, 50, 6, uid, 0.16);
  return s;
}
