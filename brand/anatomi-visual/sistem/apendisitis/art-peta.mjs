// Peta perut SKEMATIS (tampak depan, sisi kanan pasien di kiri gambar): kerangka usus besar (sekum, kolon asendens/transversum/desendens/sigmoid), usus halus,
// ileum terminal masuk sekum, apendiks keluar dari pangkal sekum. Dunia lokal 1000 x 1300. Cahaya dari kiri atas.
import { f1, lerp, clamp, mulus, poli, volum, tumpuk, B, mix, terang, gelap } from '../tensi/util.mjs';
import { sampel, pita, pitaD, di, normalDi } from './geom.mjs';

export const JANGKAR = { pusat: [500, 700], sekum: [265, 930], apendiks: [335, 1040], apendiksUjung: [392, 1120], kananBawah: [270, 1000], kolonAsenden: [250, 650], ileum: [390, 880], kolonTransversum: [500, 440], rahang: [500, 90] };
const KOLON = sampel([[262, 880], [246, 700], [240, 480], [262, 380], [380, 330], [500, 368], [620, 330], [738, 380], [760, 480], [752, 700], [748, 880], [700, 1000], [600, 1030], [520, 1000], [500, 1090]], 8);
export const APENDIKS = sampel([[296, 972], [330, 1026], [372, 1070], [392, 1124]], 12);

export function petaPerut({ T = 0, sorot = 0, radang = 0, nyeri = { pusat: 0, kanan: 0 }, kolonSorot = 0, redup = 0 } = {}) {
  let s = '';
  s += '<!--L:badan-->';
  // ---- siluet badan (kulit tembus) ----
  const badan = mulus([[190, 20], [120, 160], [92, 420], [110, 760], [170, 1040], [290, 1230], [500, 1290], [710, 1230], [830, 1040], [890, 760], [908, 420], [880, 160], [810, 20]], true);
  s += `<path d="${badan}" transform="translate(8 14)" fill="#02100E" opacity=".4" filter="${B(14)}"/>`;
  s += volum(badan, [440, 600], '#7A4F3A', { tipis: true }).replace(/opacity=/g, 'opacity=');
  s += `<path d="${badan}" fill="none" stroke="#E8B98E" stroke-width="5" opacity=".6"/>`;
  s += '<!--L:rangka-organ-orientasi-->';
  // tulang iliaka (garis) dan tepi iga
  s += `<g fill="none" stroke="#F0D9B8" stroke-linecap="round" opacity=".28"><path d="M130 980C240 930 340 960 410 1040" stroke-width="12"/><path d="M870 980C760 930 660 960 590 1040" stroke-width="12"/><path d="M140 120C260 200 400 160 500 190C600 160 740 200 860 120" stroke-width="10"/></g>`;
  // hati dan lambung (orientasi), redup
  s += `<path d="${mulus([[170, 200], [300, 140], [480, 170], [520, 270], [420, 360], [250, 360], [170, 300]], true)}" fill="#8A3A32" opacity=".42"/><path d="${mulus([[620, 200], [760, 170], [820, 280], [740, 380], [640, 330]], true)}" fill="#D98A8A" opacity=".34"/>`;
  s += '<!--L:usus-halus-->';
  // ---- usus halus: lengkung-lengkung di tengah ----
  const sb = [[[420, 520], [560, 500], [640, 560], [540, 610], [420, 590], [400, 650]], [[400, 650], [560, 680], [660, 740], [520, 780], [410, 740]], [[410, 740], [560, 800], [650, 860], [520, 900], [420, 860]], [[420, 860], [540, 930], [600, 980], [500, 990], [420, 940]]];
  for (const l of sb) { const d = mulus(l); s += `<path d="${d}" fill="none" stroke="#3A0A14" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" opacity=".28" transform="translate(5 9)" filter="${B(6)}"/><path d="${d}" fill="none" stroke="#D88E86" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#EDB0A6" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity=".7" transform="translate(-6 -8)" filter="${B(4)}"/>`; }
  s += '<!--L:kolon-->';
  // ---- kolon: tabung bersegmen (haustra) ----
  const kd = poli(KOLON);
  s += `<path d="${kd}" fill="none" stroke="#2A0A12" stroke-width="92" stroke-linecap="round" stroke-linejoin="round" opacity=".32" transform="translate(6 10)" filter="${B(8)}"/>`;
  s += `<path d="${kd}" fill="none" stroke="#C99573" stroke-width="86" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${kd}" fill="none" stroke="#E9C4A6" stroke-width="52" stroke-linecap="round" stroke-linejoin="round" opacity=".85" transform="translate(-6 -8)" filter="${B(5)}"/>`;
  s += `<path d="${kd}" fill="none" stroke="#8A5C46" stroke-width="88" stroke-linecap="butt" stroke-dasharray="5 41" opacity=".5"/>`;
  s += `<path d="${kd}" fill="none" stroke="#FFE9A0" stroke-width="${f1(100)}" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(0.18 * kolonSorot)}" filter="${B(14)}"/>`;
  s += '<!--L:sekum-->';
  // sekum: kantong pada ujung bawah kolon asendens
  const cec = mulus([[190, 900], [210, 860], [270, 845], [330, 870], [350, 930], [320, 995], [260, 1010], [205, 975]], true);
  s += `<path d="${cec}" transform="translate(6 10)" fill="#2A0A12" opacity=".35" filter="${B(8)}"/>` + volum(cec, [270, 930], '#CFA07F');
  s += `<path d="M205 900C250 920 300 920 345 900M200 950C250 972 300 972 340 950" fill="none" stroke="#8A5C46" stroke-width="5" opacity=".5"/>`;
  s += '<!--L:ileum-->';
  // ileum terminal menuju sekum
  const il = sampel([[470, 880], [410, 890], [350, 900]], 8);
  s += `<path d="${poli(il)}" fill="none" stroke="#3A0A14" stroke-width="40" stroke-linecap="round" opacity=".28" transform="translate(4 7)" filter="${B(5)}"/><path d="${poli(il)}" fill="none" stroke="#D88E86" stroke-width="36" stroke-linecap="round"/><path d="${poli(il)}" fill="none" stroke="#EDB0A6" stroke-width="16" stroke-linecap="round" opacity=".7" transform="translate(-3 -5)"/>`;
  s += '<!--L:apendiks-->';
  // ---- apendiks: keluar dari pangkal sekum ----
  const apW = (t) => 12 + 9 * radang * Math.sin(Math.min(1, t * 1.1) * Math.PI * 0.9) + 6 * radang * t * t;
  const apD = pitaD(APENDIKS, apW, 'akhir');
  const apC = mix('#E39A92', '#C2243A', radang);
  s += `<path d="${apD}" transform="translate(4 7)" fill="#2A0A12" opacity=".4" filter="${B(4)}"/>` + volum(apD, [350, 1050], apC, { tipis: true });
  // cincin sorot di sekitar apendiks (penunjuk lokasi)
  if (sorot > 0.01) { const r = 78 + 8 * Math.sin(T * 4); s += `<circle cx="335" cy="1042" r="${f1(r)}" fill="none" stroke="#F8C038" stroke-width="6" opacity="${f1(0.9 * sorot)}" stroke-dasharray="14 12"/><circle cx="335" cy="1042" r="${f1(r + 26)}" fill="none" stroke="#F8C038" stroke-width="3" opacity="${f1(0.4 * sorot)}"/>`; }
  s += '<!--L:penanda-->';
  // umbilikus dan garis kuadran (putus-putus)
  s += `<ellipse cx="500" cy="700" rx="13" ry="19" fill="#4A2A1E" opacity=".75"/><ellipse cx="497" cy="696" rx="6" ry="10" fill="#8A5C46" opacity=".6"/>`;
  s += `<g stroke="#F8F7F3" stroke-width="3" stroke-dasharray="3 16" stroke-linecap="round" opacity=".35"><path d="M110 700H890"/><path d="M500 100V1260"/></g>`;
  s += '<!--L:nyeri-->';
  // ---- nyeri: cahaya difus di sekitar pusar, lalu terlokalisasi di kanan bawah ----
  if (nyeri.pusat > 0.01) s += `<circle cx="500" cy="700" r="${f1(150 + 12 * Math.sin(T * 3))}" fill="#FF9A3C" opacity="${f1(0.38 * nyeri.pusat)}" filter="${B(34)}"/><circle cx="500" cy="700" r="${f1(70 + 6 * Math.sin(T * 3))}" fill="#FFD27A" opacity="${f1(0.5 * nyeri.pusat)}" filter="${B(14)}"/>`;
  if (nyeri.kanan > 0.01) s += `<circle cx="300" cy="985" r="${f1(92 + 8 * Math.sin(T * 4))}" fill="#FF4A3C" opacity="${f1(0.5 * nyeri.kanan)}" filter="${B(22)}"/><circle cx="318" cy="1008" r="${f1(46)}" fill="#FFB07A" opacity="${f1(0.55 * nyeri.kanan)}" filter="${B(10)}"/>`;
  return { svg: s, anchor: JANGKAR };
}
