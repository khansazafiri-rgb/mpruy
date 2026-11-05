// Potongan mesiodistal (sagital) gigi MOLAR PERTAMA RAHANG BAWAH permanen (gigi 36/46) dengan jaringan penyangga dan kanal mandibula. Kode murni (SVG + filter), 1080 x 1920. Revisi 4 ("geometri dulu").
// JENIS GIGI : molar pertama mandibula (dua akar: mesial dan distal).
// BIDANG POTONG: mesiodistal (sagital) melalui sumbu panjang gigi, tepat di antara sisi bukal dan lingual; MESIAL di KIRI layar, DISTAL di KANAN, oklusal di atas. Gigi tetangga tidak digambar.
// Struktur DI BIDANG: email, dentin, ruang pulpa dengan dua tanduk, kanal mesiobukal (MB) di akar mesial, kanal distal di akar distal, sementum, ligamen periodontal, lamina dura, tulang alveolar, gusi.
// Struktur DI LUAR BIDANG yang digambar TEMBUS/SAMAR: kanal mesiolingual (ML) -- terletak lingual terhadap MB sehingga di bidang ini hanya terlihat sebagai bayangan samar yang menyatu dengan MB di sepertiga apikal (tipe II Vertucci).
//   Kanal mandibula + berkas saraf-pembuluh alveolar inferior dan cabang dental: letaknya di sisi lingual/inferior, jadi diproyeksikan ke bidang ini hanya sebagai KONTEKS (berkas keluar apeks harus berujung di suatu tempat).
// Skala: sekitar 44 px per mm. Tinggi mahkota 7,5 mm (330 px), lebar mesiodistal mahkota 11 mm (484 px), leher (CEJ) 9 mm (396 px), panjang akar ~14 mm (±620 px), furkasi 3 mm di bawah CEJ,
//   puncak tulang alveolar 1,5 mm di bawah CEJ, tepi gusi bebas 1 mm di atas CEJ (sulkus ~1 mm, epitel penyatu ~1 mm), kanal mandibula ~6,3 mm di bawah apeks.
// Layer animasi (id grup): #g-tulang, #g-lig-periodontal, #g-dentin, #g-sementum, #g-email, #g-pulpa, #g-pulpa-aliran, #g-saraf-pembuluh, #g-kanal-mandibula, #g-gusi, #g-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, background, vignette, label, ribbon, sampleCubic, cubicD, fx } from './anatomi.js';
export const P = 'g';
export const FLAT = { gEn: '#E8EAF8', gDen: '#F0B472', gPulp: '#D8344E', gBone: '#F2BE7A', gGum: '#E8506C' };

// ---- geometri (koordinat dasar; seluruh gambar diskalakan K di sekitar (540, 1100))
// kontur luar mahkota dari CEJ kiri (mesial) ke CEJ kanan (distal): tonjol kontak, rigi marginal, dua puncak tonjol, alur sentral
const CROWN = [342, 850, 316, 800, 298, 742, 298, 692, 298, 652, 310, 618, 338, 598, 366, 590, 410, 518, 448, 516, 482, 514, 506, 590, 540, 624, 574, 590, 600, 516, 640, 522, 680, 528, 716, 582, 742, 606, 768, 622, 782, 660, 782, 700, 782, 760, 766, 810, 738, 850];
// batas email-dentin (DEJ): email tebal di puncak tonjol (~2,2 mm), menipis ke leher
const CROWN_IN = [346, 850, 324, 806, 318, 750, 336, 696, 338, 664, 348, 640, 372, 630, 398, 626, 426, 612, 450, 610, 476, 610, 504, 692, 540, 700, 576, 692, 604, 612, 632, 612, 660, 614, 690, 628, 714, 640, 734, 650, 746, 672, 746, 700, 746, 760, 738, 812, 734, 850];
// kontur akar dari CEJ kiri: sisi mesial akar mesial -> apeks -> sisi distal akar mesial -> furkasi -> akar distal -> CEJ kanan
const ROOT = [342, 850, 334, 930, 334, 1060, 338, 1180, 350, 1290, 384, 1390, 420, 1440, 432, 1466, 462, 1472, 480, 1446, 500, 1380, 528, 1250, 534, 1100, 536, 1040, 538, 1010, 540, 984, 544, 1010, 552, 1050, 578, 1160, 600, 1270, 650, 1370, 690, 1424, 702, 1452, 728, 1462, 744, 1430, 752, 1370, 754, 1260, 748, 1150, 746, 1050, 742, 940, 738, 850];
// kanal (garis tengah): MB, ML (samar), distal -- foramen apikal 0,5-1 mm di atas apeks anatomis
const CAN_MB = [466, 930, 458, 975, 440, 1040, 436, 1130, 432, 1220, 436, 1300, 444, 1370, 450, 1410, 452, 1430, 452, 1446];
const CAN_ML = [480, 900, 478, 960, 460, 1040, 452, 1130, 446, 1220, 446, 1300, 446, 1352, 448, 1380, 450, 1396, 452, 1410];
const CAN_D = [616, 930, 630, 985, 646, 1050, 652, 1130, 658, 1220, 672, 1300, 684, 1360, 690, 1395, 700, 1420, 712, 1438];
const CHAMBER = 'M430 900C424 830 424 750 436 690C441 664 454 646 460 662C476 704 504 748 540 748C576 748 604 704 620 662C626 646 639 664 644 690C656 750 656 830 650 900C640 925 628 938 612 942C586 934 566 924 540 924C514 924 494 934 468 942C452 938 440 925 430 900Z';
const rev = (a) => { const pts = []; for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]); return pts.reverse().flat(); };
const ROOT_OPEN = cubicD(ROOT), CROWN_OPEN = cubicD(CROWN);
const INREV = `L${CROWN_IN[CROWN_IN.length - 2]} ${CROWN_IN[CROWN_IN.length - 1]}${cubicD(rev(CROWN_IN)).replace(/^M[^C]*/, '')}Z`;
const DENTIN_D = `${ROOT_OPEN}${INREV}`;   // satu bentuk dentin (mahkota + akar), tanpa garis sambung
const ENAMEL_D = `${CROWN_OPEN}${INREV}`;   // cincin email
const CX = 540, CY = 1100, K = 1.1;
const DY = -60;   // geser seluruh adegan ke atas agar kanal mandibula terlihat utuh
const tf = (x, y) => [CX + (x - CX) * K, CY + DY + (y - CY) * K];
const offs = (Sm, d) => Sm.map((p, i) => { const a = Sm[Math.max(0, i - 1)], b = Sm[Math.min(Sm.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * d, p[1] + dx / l * d]; });
const pl = (Sm) => 'M' + Sm.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');
const CREST_Y = 916;

export function gigi(o = {}) {
  const p = 'g', labels = !!o.labels, t = o.t ?? 0, r = rng(9);
  let s = background(p, { seed: 8, glow: { x: 540, y: 1040, r: 780 }, tint: '#FFD6C0', vesselColor: '#B23A5A', cells: 16, particles: 90 });
  s += `<defs>
  <linearGradient id="gEn" gradientUnits="userSpaceOnUse" x1="330" y1="510" x2="760" y2="860"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#E6E6FB"/><stop offset="1" stop-color="#B9BEEC"/></linearGradient>
  <radialGradient id="gDen" gradientUnits="userSpaceOnUse" cx="500" cy="760" r="760"><stop offset="0" stop-color="#FFE3B6"/><stop offset=".5" stop-color="#F6B878"/><stop offset="1" stop-color="#C9783A"/></radialGradient>
  <radialGradient id="gPulp" gradientUnits="userSpaceOnUse" cx="520" cy="780" r="420"><stop offset="0" stop-color="#FF6B78"/><stop offset=".5" stop-color="#E03850"/><stop offset="1" stop-color="#8A1030"/></radialGradient>
  <radialGradient id="gBone" gradientUnits="userSpaceOnUse" cx="540" cy="1160" r="1000"><stop offset="0" stop-color="#FFE9B8"/><stop offset=".55" stop-color="#F4BC74"/><stop offset="1" stop-color="#B9672E"/></radialGradient>
  <linearGradient id="gGum" gradientUnits="userSpaceOnUse" x1="0" y1="790" x2="0" y2="930"><stop offset="0" stop-color="#FF8FA0"/><stop offset=".45" stop-color="#EC3F5E"/><stop offset="1" stop-color="#A5123A"/></linearGradient>
  <clipPath id="gClipDen"><path d="${DENTIN_D}"/></clipPath>
  <clipPath id="gClipEn"><path d="${ENAMEL_D}"/></clipPath>
  <mask id="gMask" maskUnits="userSpaceOnUse" x="-400" y="860" width="1900" height="1200"><rect x="-400" y="860" width="1900" height="1200" fill="#000"/><ellipse cx="540" cy="1400" rx="820" ry="560" fill="#fff" filter="url(#${p}blur40)"/></mask>
  </defs>`;
  s += `<g transform="translate(${CX} ${CY + DY}) scale(${K}) translate(${-CX} ${-CY})">`;

  // ---- tulang alveolar: korteks tipis di puncak (CREST_Y), trabekula di bawahnya; memudar ke bawah (awan) pada versi final
  const BONE = `M-140 ${CREST_Y}L1220 ${CREST_Y}L1220 1980L-140 1980Z`;
  s += `<g id="g-tulang"><g mask="url(#gMask)"><g filter="url(#${p}shadow)"><path d="${BONE}" fill="url(#gBone)"/></g>`;
  let pores = '';
  const grid = new Map(), cell = 40;
  for (let i = 0; i < 4000; i++) {
    const x = -120 + r() * 1320, y = CREST_Y + 24 + r() * 1000, rr = (5 + 15 * r() * r()) * (Math.abs(x - 540) < 280 && y < 1500 ? 0.62 : 1);
    let ok = true; const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let a = gx - 1; a <= gx + 1 && ok; a++) for (let b = gy - 1; b <= gy + 1 && ok; b++) for (const q of (grid.get(`${a},${b}`) || [])) if (Math.hypot(q[0] - x, q[1] - y) < q[2] + rr + 5) { ok = false; break; }
    if (!ok) continue; const k = `${gx},${gy}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push([x, y, rr]);
    const ry = rr * (0.62 + 0.5 * r()), rot = r() * 180;
    pores += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})"><ellipse rx="${f1(rr + 3)}" ry="${f1(ry + 3)}" fill="#FFEBC2" opacity=".6" transform="translate(-1.6 -1.6)"/><ellipse rx="${f1(rr)}" ry="${f1(ry)}" fill="#CC8440"/><ellipse rx="${f1(rr * 0.72)}" ry="${f1(ry * 0.7)}" cx="${f1(rr * 0.14)}" cy="${f1(ry * 0.14)}" fill="#A9602C" opacity=".85"/></g>`;
  }
  s += fx(`<g filter="url(#${p}blur2)">${pores}</g>`);
  s += `</g>`;
  s += `<path d="M-140 ${CREST_Y}L1220 ${CREST_Y}" fill="none" stroke="#FFF1CC" stroke-width="12" stroke-linecap="round"/>`;   // korteks puncak alveolar
  s += `</g>`;

  // ---- kanal mandibula (konteks): selubung kortikal, berkas n. alveolaris inferior + a. + v. alveolaris inferior, cabang dental naik ke foramen apikal kedua akar
  const CAN_AXIS = sampleCubic([-140, 1752, 100, 1744, 400, 1738, 640, 1746, 880, 1754, 1060, 1760, 1220, 1756], 26);
  const tubeAt = (dy, w0, w1) => ribbon(CAN_AXIS.map(([x, y]) => [x, y + dy]), w0, w1);
  s += `<g id="g-kanal-mandibula" class="nos">`;
  s += `<path d="${tubeAt(0, 146, 146)}" fill="#FFF1CC"/><path d="${tubeAt(0, 128, 128)}" fill="#F7C9B4"/>`;
  s += fx(`<path d="${tubeAt(0, 128, 128)}" fill="none" stroke="#7A3A20" stroke-width="10" opacity=".35" filter="url(#${p}blur8)" transform="translate(4 8)"/>`);
  const nerveAxis = CAN_AXIS.map(([x, y]) => [x, y + 8]);
  s += `<path d="${ribbon(nerveAxis, 68, 68)}" fill="#C79A18"/><path d="${ribbon(nerveAxis, 60, 60)}" fill="#F2C23E"/>`;
  s += fx(`<g fill="none" stroke="#B8860B" stroke-width="2.4" opacity=".5">${[-22, -10, 2, 14, 24].map((q) => `<path d="${pl(nerveAxis.map(([x, y]) => [x, y + q]))}"/>`).join('')}</g><path d="${pl(nerveAxis.map(([x, y]) => [x, y - 22]))}" fill="none" stroke="#FFF3B0" stroke-width="7" opacity=".6" stroke-linecap="round" filter="url(#${p}blur2)"/>`);
  s += `<path d="${ribbon(CAN_AXIS.map(([x, y]) => [x, y - 46]), 22, 22)}" fill="#5A0610"/><path d="${ribbon(CAN_AXIS.map(([x, y]) => [x, y - 46]), 16, 16)}" fill="#F0282A"/>`;
  s += `<path d="${ribbon(CAN_AXIS.map(([x, y]) => [x, y + 48]), 30, 30)}" fill="#141860"/><path d="${ribbon(CAN_AXIS.map(([x, y]) => [x, y + 48]), 24, 24)}" fill="#4A56E0"/>`;
  s += `</g>`;

  // ---- ligamen periodontal (lebar sekitar 0,2 mm) + lamina dura, mengikuti seluruh kontur akar termasuk furkasi
  s += `<g id="g-lig-periodontal"><path d="${ROOT_OPEN}" fill="none" stroke="#FFF1CC" stroke-width="32" stroke-linejoin="round" stroke-linecap="round"/><path d="${ROOT_OPEN}" fill="none" stroke="#E8967C" stroke-width="19" stroke-linejoin="round" stroke-linecap="round"/>`;
  let fib = '';
  sampleCubic(ROOT, 16).forEach(([x, y], i) => { if (i % 2 || y < CREST_Y + 6) return; const sx = x < 540 ? -1 : 1; fib += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * 11)} ${f1(y < 1040 ? -8 : 7)}" stroke="#B5532E" stroke-width="2" opacity=".6" stroke-linecap="round"/>`; });
  s += fx(fib) + `</g>`;

  // ---- dentin (mahkota + akar sebagai SATU bentuk) dengan tubulus radial
  s += `<g id="g-dentin"><g filter="url(#${p}shadow)"><g filter="url(#${p}volS)"><path d="${DENTIN_D}" fill="url(#gDen)"/></g></g>`;
  let tub = '';
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2, cx = 540, cy = 790, rr0 = 120, rr1 = 360 + Math.sin(a * 2) * 40; tub += `<path d="M${f1(cx + Math.cos(a) * rr0)} ${f1(cy + Math.sin(a) * rr0 * 1.1)}L${f1(cx + Math.cos(a) * rr1)} ${f1(cy + Math.sin(a) * rr1 * 0.95)}" stroke="#B5702E" stroke-width="1.6" opacity=".2"/>`; }
  s += fx(`<g clip-path="url(#gClipDen)">${tub}<path d="${CHAMBER}" fill="none" stroke="#B5602A" stroke-width="50" opacity=".3" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_MB)}" fill="none" stroke="#B5602A" stroke-width="44" opacity=".25" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_D)}" fill="none" stroke="#B5602A" stroke-width="48" opacity=".25" filter="url(#${p}blur20)"/><path d="${ROOT_OPEN}" fill="none" stroke="#fff" stroke-width="24" opacity=".2" filter="url(#${p}blur8)" transform="translate(11 4)"/><path d="${ROOT_OPEN}" fill="none" stroke="#6A2A0A" stroke-width="30" opacity=".24" filter="url(#${p}blur8)" transform="translate(-11 -4)"/></g>`);
  s += `</g>`;
  // ---- sementum: lapisan tipis (lebih tebal di sepertiga apikal dan furkasi)
  s += `<g id="g-sementum"><path d="${ROOT_OPEN}" fill="none" stroke="${PAL.cementum}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += fx(`<path d="${ROOT_OPEN}" fill="none" stroke="#F0CE90" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" opacity=".8" transform="translate(-1 -1)"/>`);
  for (const [ax, ay] of [[452, 1462], [716, 1452]]) s += `<ellipse cx="${ax}" cy="${ay}" rx="28" ry="14" fill="${PAL.cementum}" opacity=".7" class="nos"/>`;
  s += `</g>`;

  // ---- pulpa: ruang pulpa dengan dua tanduk, kanal MB (dan ML samar di luar bidang) di akar mesial, kanal tunggal di akar distal
  const cm = sampleCubic(CAN_MB, 14), cml = sampleCubic(CAN_ML, 14), cd = sampleCubic(CAN_D, 14);
  const eMB = (u) => 1 - Math.pow(1 - u, 2.2), RB = ribbon(cm, 44, 10, eMB), RD = ribbon(cd, 50, 12, eMB);
  s += `<g id="g-pulpa" class="nos"><path d="${ribbon(cml, 36, 8, eMB)}" fill="#B02040" opacity=".5"/>`;
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><path d="${CHAMBER}" fill="url(#gPulp)"/><path d="${RB}" fill="url(#gPulp)"/><path d="${RD}" fill="url(#gPulp)"/></g></g>`;
  s += fx(`<clipPath id="gClipP"><path d="${CHAMBER}"/><path d="${RB}"/><path d="${RD}"/></clipPath><g clip-path="url(#gClipP)"><path d="${CHAMBER}" fill="none" stroke="#5A0A22" stroke-width="30" opacity=".5" filter="url(#${p}blur8)" transform="translate(7 9)"/><path d="${RB}" fill="none" stroke="#5A0A22" stroke-width="14" opacity=".35" filter="url(#${p}blur4)" transform="translate(5 0)"/><path d="M440 700C434 760 436 830 444 884" fill="none" stroke="#fff" stroke-width="9" opacity=".32" stroke-linecap="round" filter="url(#${p}blur4)"/></g>`);
  s += `</g>`;

  // ---- saraf (kuning), arteriol (merah), venula (biru): berkas masuk lewat foramen apikal, naik lewat kanal, bercabang ke tanduk pulpa;
  //      di luar apeks berkas turun lewat saluran tulang dan bersambung ke berkas alveolar inferior di kanal mandibula (konteks)
  const COLS = [[PAL.nerve, '#7A5A08'], ['#F0282A', '#5A0610'], ['#4A56E0', '#141860']];
  const strand = (d, w, c, dk) => `<path d="${d}" fill="none" stroke="${dk}" stroke-width="${f1(w + 1.8)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<g id="g-saraf-pembuluh">`;
  const FM = [452, 1446], FD = [712, 1438], JM = [484, 1706], JD = [676, 1708];
  const branch = (F, J) => sampleCubic([F[0], F[1], F[0] - 4, F[1] + 110, J[0] + 6, J[1] - 120, J[0], J[1]], 28);
  for (const [F, J, c0] of [[FM, JM, cm], [FD, JD, cd]]) {
    const br = branch(F, J);
    s += `<path d="${pl(br)}" fill="none" stroke="#FFE9C8" stroke-width="34" stroke-linecap="round" opacity=".85"/><path d="${pl(br)}" fill="none" stroke="#E7A98C" stroke-width="24" stroke-linecap="round"/>`;   // saluran tulang + selubung berkas
    COLS.forEach(([c, dk], i) => { s += strand(pl(offs(br, (i - 1) * 7.5)), 5, c, dk) + strand(pl(offs(c0, (i - 1) * 3.2)), 2.4, c, dk); });
  }
  const fan = (x0, y0, targets) => targets.map(([tx, ty], i) => { const [c, dk] = COLS[i % 3]; return strand(`M${x0} ${y0}C${x0 + (tx - x0) * 0.15} ${y0 - 60} ${tx + (x0 - tx) * 0.05} ${ty + 80} ${tx} ${ty}`, 2.4, c, dk); }).join('');
  s += fx(fan(470, 930, [[446, 690], [452, 700], [430, 750], [478, 780]]) + fan(612, 930, [[634, 690], [628, 702], [650, 750], [602, 784]]));
  s += `</g>`;

  // ---- email: cincin tembus cahaya; tebal di puncak tonjol, menipis ke leher
  s += `<g id="g-email"><g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${ENAMEL_D}" fill="url(#gEn)"/></g></g>`;
  s += fx(`<path d="${cubicD(CROWN_IN)}" fill="none" stroke="#A9A2E4" stroke-width="3.4" opacity=".7" stroke-dasharray="26 4 12 4"/>`);
  s += fx(`<g clip-path="url(#gClipEn)"><g fill="none" stroke="#8C94E0" stroke-width="2" opacity=".26"><path d="M308 790C294 730 306 660 346 612"/><path d="M322 800C308 740 322 672 358 628"/><path d="M772 790C786 730 774 660 734 612"/><path d="M758 800C770 740 756 672 722 628"/></g><path d="M318 700C322 628 366 572 420 548" fill="none" stroke="#fff" stroke-width="22" opacity=".42" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M372 560C398 536 430 530 452 538" fill="none" stroke="#fff" stroke-width="7" opacity=".7" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="M768 700C772 640 744 600 712 586" fill="none" stroke="#4A3A9A" stroke-width="22" opacity=".2" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="${CROWN_OPEN}" fill="none" stroke="${PAL.rim}" stroke-width="7" opacity=".4" filter="url(#${p}blur2)" transform="translate(2 2)"/></g>`);
  s += `</g>`;

  // ---- gusi: tepi bebas setajam pisau 1 mm di atas CEJ; sulkus ~1 mm, epitel penyatu ~1 mm (sampai CEJ), serat jaringan ikat ke sementum sampai puncak tulang; permukaan turun ke kol (papila) lalu mendatar
  const gum = (m) => {
    const X = (x) => (m ? 1080 - x : x);
    const d = `M${X(313)} 788C${X(296)} 810 ${X(276)} 824 ${X(244)} 832C${X(160)} 848 ${X(60)} 854 ${X(-140)} 860L${X(-140)} ${CREST_Y + 4}L${X(334)} ${CREST_Y + 4}C${X(336)} 900 ${X(340)} 872 ${X(342)} 850C${X(332)} 830 ${X(320)} 804 ${X(313)} 788Z`;
    let g = `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${d}" fill="url(#gGum)"/></g></g>`;
    g += fx(`<path d="M${X(-130)} 868C${X(60)} 862 ${X(160)} 856 ${X(244)} 840C${X(276)} 832 ${X(296)} 818 ${X(312)} 800" fill="none" stroke="#FFD0D6" stroke-width="9" opacity=".6" stroke-linecap="round" filter="url(#${p}blur2)"/>`);
    g += `<path d="M${X(314)} 792C${X(322)} 812 ${X(334)} 832 ${X(342)} 850" fill="none" stroke="#4A0818" stroke-width="3.2" opacity=".55" stroke-linecap="round"/>`;   // sulkus
    g += `<path d="M${X(342)} 850C${X(340)} 866 ${X(338)} 888 ${X(335)} ${CREST_Y}" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".75" stroke-linecap="round"/>`;   // epitel penyatu + perlekatan jaringan ikat ke puncak
    g += fx([0, 1, 2, 3, 4, 5].map((i) => `<path d="M${X(338 - i * 3)} ${CREST_Y - 6 - i * 3}C${X(300 - i * 36)} ${CREST_Y - 30 - i * 6} ${X(260 - i * 40)} ${CREST_Y - 50 - i * 4} ${X(220 - i * 40)} ${CREST_Y - 62 - i * 3}" fill="none" stroke="#B80F34" stroke-width="2.2" opacity=".16"/>`).join(''));
    return g;
  };
  s += `<g id="g-gusi">${gum(0)}${gum(1)}</g>`;
  let fl = '';
  for (const c of [cm, cd]) for (let i = 0; i < 4; i++) { const u = (((t * 0.4 + i / 4) % 1) + 1) % 1, [x, y] = c[Math.floor((1 - u) * (c.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.6" fill="#FFE6E0" opacity="${f1(0.7 * Math.sin(u * Math.PI))}"/>`; }
  s += fx(`<g id="g-pulpa-aliran" filter="url(#${p}blur2)">${fl}</g>`);
  s += `</g>`;
  s += vignette(p);
  if (labels) s += `<g id="g-label">${lblLayout().map(([X, Y, left, ty, txt]) => label(X, Y, left ? 28 : 1052, ty, txt, { fs: 23, anchor: left ? 'start' : 'end' })).join('')}${label(60, 170, 28, 170, 'MESIAL (kiri layar)', { fs: 23, anchor: 'start' })}${label(1020, 170, 1052, 170, 'DISTAL (kanan layar)', { fs: 23, anchor: 'end' })}${label(60, 215, 28, 215, 'Molar 1 rahang bawah, potongan mesiodistal', { fs: 21, anchor: 'start' })}</g>`;
  return s;
}
// label pemeriksaan: [x, y pada struktur (koordinat dasar), sisi (-1 kiri / 1 kanan), teks]; posisi y teks dihitung otomatis (sejajar titik, jarak minimal agar tidak bertumpuk)
const LBL = [
  [372, 590, -1, 'Email (enamel)'], [326, 740, -1, 'Dentin mahkota'], [316, 800, -1, 'Tepi gusi + sulkus'], [200, 862, -1, 'Gusi cekat'],
  [290, 916, -1, 'Puncak alveolar'], [338, 880, -1, 'Epitel penyatu'], [334, 1060, -1, 'Sementum + PDL'], [270, 1150, -1, 'Tulang alveolar'],
  [436, 1130, -1, 'Kanal MB'], [345, 1300, -1, 'Akar mesial'], [452, 1446, -1, 'Foramen apikal'], [470, 1580, -1, 'Cabang dental IAN'], [290, 1752, -1, 'Kanal mandibula'],
  [642, 676, 1, 'Ruang pulpa + tanduk'], [572, 924, 1, 'Lantai ruang pulpa'], [540, 1010, 1, 'Furkasi'], [468, 1070, 1, 'Kanal ML (samar)'],
  [655, 1150, 1, 'Kanal akar distal'], [754, 1300, 1, 'Akar distal'], [900, 846, 1, 'Gusi + papila'], [900, 1752, 1, 'Berkas n.-a.-v. IAN'],
];

function lblLayout() {
  const out = [];
  for (const side of [-1, 1]) {
    let prev = 250;
    for (const [x, y, sd, txt] of LBL.filter((l) => l[2] === side).map(([x, y, sd, txt]) => { const [X, Y] = tf(x, y); return [X, Y, sd, txt]; }).sort((a, b) => a[1] - b[1])) {
      const ty = Math.max(Y_(y), prev + 64); prev = ty; out.push([x, y, side < 0, ty, txt]);
    }
  }
  return out;
}
const Y_ = (y) => y;
