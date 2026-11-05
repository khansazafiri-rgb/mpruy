// Jantung manusia, tampak depan. Koordinat lokal sekitar x 200..830, y 0..940. Hanya JANTUNG (organ lain belum dikerjakan).
// Dasar anatomi, sumber yang diperiksa hanya sebagai ringkasan pencarian (lihat README):
// - RA dan RV di sisi kiri layar; LV dan apeks di kanan bawah.
// - Aorta asendens dari basis; lengkung ke kanan layar dengan tiga cabang besar.
// - Batang pulmonalis dari RV ke atas-kanan, bercabang kiri dan kanan.
// - Vena kava superior (dari atas) dan inferior (dari bawah) masuk RA.
// - Koroner: LM dari sinus aorta kiri -> LAD (alur interventrikular anterior) dan sirkumfleks (alur AV kiri);
//   RCA dari sinus aorta kanan di alur AV kanan. Hanya jalur utama + satu marginal dan satu diagonal.
// Teknik: pembuluh dibentuk sebagai pita meruncing (ribbon) dengan tiga lapis volume; permukaan jantung dengan
// gradien radial dan kilau lembut; lemak sebagai pita kuning di bawah koroner dengan lobulus di sepanjang alur.
import { ORGAN, OUTLINE, gid, solid, lobe, ribbon, specular, catmull } from './style.mjs';

export const HEART_BOX = { x: 200, y: 0, w: 620, h: 940, cx: 510, cy: 470 };

const lcg = (seed) => { let r = seed; return () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; }; };

// siluet jantung: lengkung halus, apeks ke bawah-kanan
const BODY = 'M 292 258 C 226 270 204 364 212 470 C 220 580 292 668 378 742 C 452 806 530 878 592 936 C 690 890 790 806 800 690 C 808 584 790 486 740 412 C 704 358 656 330 618 326 C 556 300 470 300 418 318 C 372 298 330 252 292 258 Z';

export function heartSvg(uid) {
  let s = '';
  const rnd = lcg(42);

  // 1. vena kava (di belakang badan): SVC dari atas, IVC dari bawah
  s += ribbon([[318, 30], [316, 110], [312, 190], [308, 262]], 58, 54, 'vein', uid);
  s += ribbon([[332, 620], [340, 690], [330, 750], [318, 800]], 62, 56, 'vein', uid);

  // 2. aorta asendens + lengkung + arteri brakiosefalika (pangkal tertanam di badan, jadi tampak keluar dari jantung)
  s += ribbon([[452, 380], [450, 270], [444, 170], [442, 108], [456, 40], [560, 16], [652, 66]], 104, 84, 'artery', uid, { per: 14 });
  s += ribbon([[462, 66], [420, 36], [384, 18], [344, 14]], 48, 42, 'artery', uid);

  // 3. batang pulmonalis: dari RV ke atas-kanan, bercabang, cabang kiri dan kanan
  s += ribbon([[440, 430], [482, 364], [540, 320], [606, 288]], 80, 72, 'pulmArtery', uid);
  s += ribbon([[606, 288], [652, 262], [704, 268], [760, 306]], 58, 50, 'pulmArtery', uid);
  s += ribbon([[606, 288], [566, 272], [526, 262], [488, 256]], 50, 44, 'pulmArtery', uid);

  // 4. badan jantung
  s += `<g filter="url(#${uid}-shadow)">${lobe(BODY, 'muscle', uid)}</g>`;
  // gradasi volume: ventrikel kiri terang (kanan bawah), ventrikel kanan sedikit gelap (kiri)
  s += `<path d="M 556 420 C 650 410 760 486 760 620 C 760 770 680 880 592 936 C 572 780 540 600 556 420 Z" fill="${ORGAN.muscle.light}" opacity="0.22" filter="url(#${uid}-soft)"/>`;
  s += `<path d="M 292 420 C 330 380 462 368 520 420 C 560 470 552 640 500 720 C 440 790 320 730 294 630 C 280 560 276 470 292 420 Z" fill="${ORGAN.muscle.dark}" opacity="0.2" filter="url(#${uid}-soft)"/>`;
  // rim light di tepi kanan dan kiri, dan bayangan tepi bawah
  s += `<path d="M 782 470 C 796 560 790 660 760 740" fill="none" stroke="${ORGAN.muscle.light}" stroke-width="11" stroke-linecap="round" opacity="0.35" filter="url(#${uid}-sheen)"/>`;
  s += `<path d="M 230 430 C 220 490 232 560 268 630" fill="none" stroke="${ORGAN.muscle.light}" stroke-width="9" stroke-linecap="round" opacity="0.22" filter="url(#${uid}-sheen)"/>`;

  // 5. atrium kanan (lobus kiri atas) dan auricula kiri (kanan atas), dengan gradien permukaan
  s += lobe('M 236 336 C 226 300 266 282 300 292 C 332 304 338 352 318 382 C 296 404 258 392 236 336 Z', 'muscle', uid);
  s += lobe('M 618 352 C 662 300 738 296 766 336 C 786 368 768 418 734 426 C 698 434 648 410 618 352 Z', 'muscle', uid);
  s += `<path d="M 662 352 C 690 342 720 352 740 374" fill="none" stroke="${OUTLINE.color}" stroke-width="4" opacity="0.45"/>`;

  // 6. lemak di alur: pita kuning lebar + lobulus berderet di sepanjang alur
  const grooveLAD = [[504, 344], [506, 490], [538, 680], [592, 912]];
  const grooveLCx = [[508, 352], [580, 384], [690, 454], [750, 598]];
  const grooveRCA = [[252, 470], [300, 520], [370, 560], [430, 600], [480, 634], [508, 676], [540, 716]];
  for (const g of [grooveLAD, grooveLCx, grooveRCA]) {
    s += ribbon(g, 34, 30, 'fat', uid, { outline: false, per: 14 });
    const c = catmull(g, 10);
    for (let i = 0; i < c.length; i += 6) {
      const [x, y] = c[i];
      s += `<ellipse cx="${(x + (rnd() - 0.5) * 14).toFixed(1)}" cy="${(y + (rnd() - 0.5) * 10).toFixed(1)}" rx="${(13 + rnd() * 7).toFixed(1)}" ry="${(10 + rnd() * 5).toFixed(1)}" fill="${ORGAN.fat.base}" stroke="${ORGAN.fat.dark}" stroke-width="2.5" opacity="0.95"/>`;
    }
  }

  // 7. vena kardiak besar (biru tipis) di samping LAD
  s += ribbon([[528, 360], [550, 500], [584, 690], [640, 902]], 11, 6, 'vein', uid, { outline: false, per: 14 });

  // 8. arteri koroner: LM, LAD, sirkumfleks, RCA (jalur utama) + satu diagonal dan satu marginal
  s += ribbon([[458, 334], [506, 344]], 26, 16, 'artery', uid, { per: 10 });
  s += ribbon(grooveLAD, 16, 7, 'artery', uid);
  s += ribbon(grooveLCx, 13, 7, 'artery', uid);
  s += ribbon(grooveRCA, 14, 8, 'artery', uid);
  s += ribbon([[548, 500], [600, 520], [640, 548], [668, 592]], 9, 5, 'artery', uid, { per: 12 });
  s += ribbon([[430, 600], [452, 660], [470, 720], [486, 780]], 9, 5, 'artery', uid, { per: 12 });

  // 9. kilau permukaan yang lebar dan lembut (bukan titik)
  s += specular(652, 540, 44, 130, 14, uid, 0.2);
  s += specular(372, 500, 32, 96, -8, uid, 0.12);
  return s;
}
