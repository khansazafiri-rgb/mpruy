// Jantung manusia, tampak depan (anterior). Koordinat lokal sekitar x 200..830, y 0..930.
// - Ventrikel kanan (RV) dan atrium kanan (RA) di sisi kiri layar (sisi kanan tubuh pasien); ventrikel kiri (LV) dan apeks di kanan bawah.
// - Aorta asendens naik dari basis, lengkung aorta dan arteri brakiosefalika ke kanan layar.
// - Batang pulmonalis dari RV ke atas-kanan, bercabang ke arteri pulmonalis kiri dan kanan.
// - Vena kava superior (dari atas) dan inferior (dari bawah) masuk atrium kanan; vena kardiak besar berjalan di samping LAD.
// - Arteri koroner kiri (LM) ke LAD dan sirkumfleks; arteri koroner kanan (RCA) di alur AV kanan; cabang-cabang kecil dibuat prosedural.
// Penyederhanaan visual, bukan gambar berskala. Status verifikasi anatomi ada di README.
import { ORGAN, OUTLINE, gid, tube, solid, specular, sheen, cap, branches } from './style.mjs';

export const HEART_BOX = { x: 200, y: 0, w: 630, h: 930, cx: 515, cy: 465 };

// generator deterministik (LCG) agar hasil selalu sama tiap render
const lcg = (seed) => { let r = seed; return () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; }; };

export function heartSvg(uid) {
  let s = '';
  const rnd = lcg(42);
  const body = 'M 300 240 C 236 250 206 350 214 460 C 222 570 292 660 372 738 C 446 806 534 880 612 930 C 706 890 796 806 804 690 C 812 580 792 480 738 410 C 702 360 652 334 622 330 C 562 300 470 300 420 318 C 372 300 332 262 300 240 Z';
  // 1. auricula kanan (lobus gelap di kiri atas, di belakang SVC)
  s += solid('M 250 330 C 220 292 256 240 300 252 C 332 262 344 306 322 344 C 300 370 270 360 250 330 Z', 'muscle', uid, { opacity: 0.95 });
  // 2. badan jantung
  s += `<g filter="url(#${uid}-shadow)">${solid(body, 'muscle', uid)}</g>`;
  s += `<path d="M 560 430 C 650 420 748 486 748 616 C 748 764 660 884 626 920 C 566 786 540 600 560 430 Z" fill="${ORGAN.muscle.light}" opacity="0.22"/>`;
  s += `<path d="M 300 430 C 330 380 470 360 540 420 C 590 470 580 640 520 700 C 450 760 330 700 300 610 C 280 540 280 470 300 430 Z" fill="${ORGAN.muscle.dark}" opacity="0.22"/>`;
  // serat otot halus mengikuti dinding
  for (const d of ['M 330 470 C 380 540 390 640 430 700', 'M 450 420 C 470 500 480 600 540 690', 'M 650 470 C 700 560 712 660 670 800', 'M 380 600 C 420 650 470 700 520 760', 'M 560 560 C 610 640 630 720 600 820']) {
    s += `<path d="${d}" fill="none" stroke="${ORGAN.muscle.dark}" stroke-width="7" stroke-linecap="round" opacity="0.16"/>`;
    s += `<path d="${d}" fill="none" stroke="${ORGAN.muscle.light}" stroke-width="2" stroke-linecap="round" opacity="0.12" transform="translate(4 0)"/>`;
  }
  // 3. lemak di alur: pita kuning dan lobulus kecil berderet
  const grooves = [
    { d: 'M 500 340 C 505 490 540 680 625 895', pts: [[505, 350], [510, 430], [525, 520], [545, 610], [575, 700], [605, 800], [622, 880]] },
    { d: 'M 250 468 C 300 520 380 560 440 604 C 490 640 520 680 560 712', pts: [[252, 470], [300, 500], [350, 530], [400, 570], [445, 606], [500, 660], [552, 706]] },
    { d: 'M 505 345 C 580 380 690 450 752 600', pts: [[508, 350], [570, 378], [630, 418], [690, 480], [728, 540], [748, 596]] },
  ];
  for (const g of grooves) s += `<path d="${g.d}" fill="none" stroke="${ORGAN.fat.dark}" stroke-width="34" stroke-linecap="round" opacity="0.6" filter="url(#${uid}-soft)"/>`;
  for (const g of grooves) {
    s += `<path d="${g.d}" fill="none" stroke="${ORGAN.fat.base}" stroke-width="20" stroke-linecap="round"/>`;
    s += `<path d="${g.d}" fill="none" stroke="${ORGAN.fat.light}" stroke-width="6" stroke-linecap="round" opacity="0.7" transform="translate(-4 -2)"/>`;
    for (let i = 0; i < g.pts.length; i++) {
      const [x, y] = g.pts[i];
      s += `<ellipse cx="${x + (rnd() - 0.5) * 8}" cy="${y + (rnd() - 0.5) * 6}" rx="${(12 + rnd() * 6).toFixed(1)}" ry="${(9 + rnd() * 4).toFixed(1)}" fill="${ORGAN.fat.base}" stroke="${ORGAN.fat.dark}" stroke-width="2.5" transform="rotate(${(rnd() * 60 - 30).toFixed(0)} ${x} ${y})"/>`;
    }
  }
  // 4. auricula kiri (menutupi dasar batang pulmonalis di sisi kanan layar)
  s += solid('M 620 360 C 662 298 742 288 772 330 C 792 362 772 412 736 422 C 700 430 650 406 620 360 Z', 'muscle', uid);
  s += `<path d="M 662 352 C 692 340 722 350 742 372" fill="none" stroke="${OUTLINE.color}" stroke-width="4" opacity="0.5"/>`;
  s += specular(700, 360, 30, 12, -20, uid, 0.3);
  // 5. vena: SVC, IVC, vena kardiak besar dan cabangnya
  s += tube('M 320 30 C 318 100 312 180 310 250', 'vein', 60, uid);
  s += sheen('M 320 30 C 318 100 312 180 310 250', 60, uid, 0.35);
  s += cap(320, 30, 60, 0, 'vein', uid);
  s += tube('M 330 610 C 340 670 330 730 318 790', 'vein', 64, uid);
  s += sheen('M 330 610 C 340 670 330 730 318 790', 64, uid, 0.3);
  s += cap(318, 790, 64, 0, 'vein', uid);
  s += tube('M 532 360 C 556 500 590 680 648 890', 'vein', 12, uid, { outline: false, opacity: 0.95 });
  s += branches([[548, 430, 0.4], [566, 520, 0.5], [600, 640, 0.6]], () => 4, 'vein', uid, rnd, { depth: 2, len: 38, spread: 0.6 });
  // 6. arteri paru
  s += tube('M 490 400 C 520 340 560 300 600 270', 'pulmArtery', 76, uid);
  s += tube('M 600 270 C 650 250 700 260 770 300', 'pulmArtery', 58, uid);
  s += tube('M 600 270 C 560 260 520 255 480 250', 'pulmArtery', 52, uid);
  s += sheen('M 490 400 C 520 340 560 300 600 270', 76, uid, 0.4);
  s += sheen('M 600 270 C 650 250 700 260 770 300', 58, uid, 0.4);
  s += cap(770, 300, 58, 20, 'pulmArtery', uid);
  // 7. aorta: asendens, lengkung, arteri brakiosefalika
  s += tube('M 450 340 C 448 260 442 170 440 110', 'artery', 100, uid);
  s += tube('M 440 120 C 450 40 560 20 640 60', 'artery', 88, uid);
  s += tube('M 455 70 C 410 40 370 20 330 12', 'artery', 52, uid);
  s += sheen('M 450 340 C 448 260 442 170 440 110', 100, uid, 0.45);
  s += sheen('M 440 120 C 450 40 560 20 640 60', 88, uid, 0.45);
  s += cap(330, 12, 52, -80, 'artery', uid);
  s += cap(640, 60, 88, 10, 'artery', uid);
  // 8. arteri koroner: LM, LAD, sirkumfleks, RCA, dan cabang pohon
  s += tube('M 455 330 L 500 340', 'artery', 26, uid);
  s += tube('M 500 340 C 505 490 540 680 625 895', 'artery', 22, uid);
  s += tube('M 505 345 C 580 380 690 450 752 600', 'artery', 18, uid);
  s += tube('M 420 350 C 360 392 300 432 250 468 C 310 520 380 560 440 604 C 490 640 520 680 560 712', 'artery', 20, uid);
  s += sheen('M 500 340 C 505 490 540 680 625 895', 22, uid, 0.45);
  s += sheen('M 420 350 C 360 392 300 432 250 468 C 310 520 380 560 440 604 C 490 640 520 680 560 712', 20, uid, 0.4);
  s += branches([[512, 470, 0.18], [528, 580, 0.25], [560, 690, 0.3], [330, 470, 0.9], [392, 560, 0.5]], (i) => [9, 9, 8, 7, 8][i], 'artery', uid, rnd, { depth: 2, len: 50, spread: 0.55 });
  // 9. kilau permukaan
  s += specular(650, 540, 26, 74, 12, uid, 0.26);
  s += specular(380, 440, 24, 60, -20, uid, 0.18);
  return s;
}
