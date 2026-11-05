// Jantung manusia, tampak depan. Koordinat lokal sekitar x 200..820, y 0..940.
// Dasar anatomi (lihat README, bagian sumber):
// - RA dan RV di sisi kiri layar (sisi kanan tubuh pasien); LV dan apeks ke kanan bawah.
// - Aorta asendens keluar dari RV/atrium-basis, lengkungnya ke kanan layar dengan tiga cabang besar (brakiosefalika, karotis kiri, subklavia kiri).
// - Batang pulmonalis keluar dari RV ke atas-kanan, bercabang ke kiri dan kanan.
// - Vena kava superior dari atas, inferior dari bawah, keduanya masuk RA.
// - Arteri koroner kiri (LM) dari sinus aorta kiri, bercabang ke LAD dan sirkumfleks; arteri koroner kanan dari sinus aorta kanan, di alur AV kanan.
// Ini visual konseptual, bukan gambar berskala.
import { ORGAN, OUTLINE, gid, tube, solid, specular, sheen, cap } from './style.mjs';

export const HEART_BOX = { x: 200, y: 0, w: 620, h: 940, cx: 510, cy: 470 };

export function heartSvg(uid) {
  let s = '';
  // 1. vena kava, dibawah badan (di belakang jantung): dari atas dan bawah
  s += tube('M 318 40 C 316 110 310 190 306 262', 'vein', 58, uid);
  s += sheen('M 318 40 C 316 110 310 190 306 262', 58, uid, 0.32);
  s += cap(318, 40, 58, 0, 'vein', uid);
  s += tube('M 330 620 C 340 680 332 740 318 800', 'vein', 62, uid);
  s += sheen('M 330 620 C 340 680 332 740 318 800', 62, uid, 0.3);
  s += cap(318, 800, 62, 0, 'vein', uid);
  // 2. aorta: asendens di belakang batang pulmonalis; lengkung ke kanan layar dengan tiga cabang
  s += tube('M 452 350 C 450 260 444 170 442 100', 'artery', 100, uid);
  s += tube('M 442 110 C 452 36 566 14 652 60', 'artery', 86, uid);
  s += tube('M 462 62 C 420 30 384 14 344 14', 'artery', 46, uid);
  s += tube('M 548 36 C 560 6 600 -4 624 -8', 'artery', 36, uid);
  s += sheen('M 452 350 C 450 260 444 170 442 100', 100, uid, 0.42);
  s += sheen('M 442 110 C 452 36 566 14 652 60', 86, uid, 0.42);
  s += cap(344, 14, 46, -82, 'artery', uid);
  // 3. arteri paru: dari RV ke atas-kanan, bercabang kiri dan kanan (di depan aorta)
  s += tube('M 440 420 C 480 360 540 318 606 286', 'pulmArtery', 74, uid);
  s += tube('M 606 286 C 652 262 704 268 760 304', 'pulmArtery', 56, uid);
  s += tube('M 606 286 C 566 270 526 262 486 256', 'pulmArtery', 48, uid);
  s += sheen('M 440 420 C 480 360 540 318 606 286', 74, uid, 0.4);
  s += cap(760, 304, 56, 18, 'pulmArtery', uid);
  // 4. badan jantung: siluet membulat, apeks ke bawah-kanan
  const body = 'M 292 258 C 226 270 204 364 212 470 C 220 580 292 668 378 742 C 452 806 530 878 592 936 C 690 890 790 806 800 690 C 808 584 790 486 740 412 C 704 358 656 330 618 326 C 556 300 470 300 418 318 C 372 298 330 252 292 258 Z';
  s += `<g filter="url(#${uid}-shadow)">${solid(body, 'muscle', uid)}</g>`;
  // gradasi volume: ventrikel kiri lebih terang (kanan bawah), ventrikel kanan sedikit lebih gelap (kiri)
  s += `<path d="M 556 420 C 650 410 760 486 760 620 C 760 770 680 880 592 936 C 572 780 540 600 556 420 Z" fill="${ORGAN.muscle.light}" opacity="0.2"/>`;
  s += `<path d="M 292 420 C 330 380 462 368 520 420 C 560 470 552 640 500 720 C 440 790 320 730 294 630 C 280 560 276 470 292 420 Z" fill="${ORGAN.muscle.dark}" opacity="0.18"/>`;
  // rim light di tepi kanan dan kiri (pantulan, halus)
  s += `<path d="M 780 470 C 796 560 790 660 760 740" fill="none" stroke="${ORGAN.muscle.light}" stroke-width="10" stroke-linecap="round" opacity="0.35"/>`;
  s += `<path d="M 232 420 C 222 480 232 560 268 630" fill="none" stroke="${ORGAN.muscle.light}" stroke-width="8" stroke-linecap="round" opacity="0.22"/>`;
  // 5. atrium kanan: lobus lembut di kiri atas (di atas RV), dan auricula kiri di kanan atas
  s += solid('M 236 336 C 226 300 266 282 300 292 C 332 304 338 352 318 382 C 296 404 258 392 236 336 Z', 'muscle', uid, { opacity: 0.96 });
  s += solid('M 618 352 C 662 300 738 296 766 336 C 786 368 768 418 734 426 C 698 434 648 410 618 352 Z', 'muscle', uid);
  s += `<path d="M 662 350 C 690 340 720 350 740 372" fill="none" stroke="${OUTLINE.color}" stroke-width="4" opacity="0.45"/>`;
  // 6. alur lemak dan koroner: lemak di bawah, arteri di atas
  const grooves = [
    'M 502 344 C 504 490 538 680 590 912',                       // LAD (alur interventrikular anterior)
    'M 506 350 C 580 382 690 452 748 596',                         // sirkumfleks (alur AV kiri)
    'M 252 470 C 300 520 370 560 430 600 C 480 634 508 676 540 716', // RCA (alur AV kanan)
  ];
  for (const d of grooves) s += `<path d="${d}" fill="none" stroke="${ORGAN.fat.dark}" stroke-width="44" stroke-linecap="round" opacity="0.28" filter="url(#${uid}-soft)"/>`;
  for (const d of grooves) s += `<path d="${d}" fill="none" stroke="${ORGAN.fat.base}" stroke-width="36" stroke-linecap="round"/>`;
  for (const d of grooves) s += `<path d="${d}" fill="none" stroke="${ORGAN.fat.light}" stroke-width="5" stroke-linecap="round" opacity="0.6" transform="translate(-3 -2)"/>`;
  // 7. vena kardiak besar (biru tipis) di samping LAD, dan arteri koroner di atas lemak
  s += tube('M 530 360 C 552 500 586 690 640 900', 'vein', 11, uid, { outline: false, opacity: 0.95 });
  s += tube('M 502 344 C 504 490 538 680 590 912', 'artery', 13, uid);
  s += tube('M 506 350 C 580 382 690 452 748 596', 'artery', 11, uid);
  s += tube('M 252 470 C 300 520 370 560 430 600 C 480 634 508 676 540 716', 'artery', 12, uid);
  s += tube('M 462 332 L 506 344', 'artery', 24, uid);
  // cabang utama saja (satu diagonal dari LAD, satu marginal dari RCA), tanpa cabang acak
  s += tube('M 548 500 C 600 520 640 548 668 592', 'artery', 9, uid, { outline: false });
  s += tube('M 430 600 C 450 660 470 720 486 780', 'artery', 9, uid, { outline: false });
  s += sheen('M 502 344 C 504 490 538 680 590 912', 13, uid, 0.42);
  s += sheen('M 252 470 C 300 520 370 560 430 600 C 480 634 508 676 540 716', 12, uid, 0.4);
  // 8. kilau permukaan: lebar, lembut, mengikuti volume (bukan titik-titik)
  s += specular(650, 540, 46, 130, 16, uid, 0.22);
  s += specular(360, 500, 34, 90, -10, uid, 0.12);
  return s;
}
