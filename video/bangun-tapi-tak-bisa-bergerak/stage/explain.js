// Visual penjelasan: kesadaran sudah muncul, otot masih "ditahan" fase tidur REM. Gaya datar, tanpa anatomi rumit dan tanpa angka.
import { el, clamp, lerp, ease, easeOutBack, createPerson, posePerson } from './rig.js';
import { kf, win, blinkAt } from './util.js';

const g = (p, a = {}) => el('g', a, p);
const raw = (p, s, a = {}) => { const e = g(p, a); e.innerHTML = s; return e; };
const FONT = `font-family="Plus Jakarta Sans" font-weight="800"`;

export function createExplain(parent, topLayer) {
  const root = g(parent);
  raw(root, `<defs>
    <linearGradient id="exBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2A55"/><stop offset="1" stop-color="#2D4380"/></linearGradient>
    <radialGradient id="exGlow"><stop offset="0" stop-color="#FFD66B" stop-opacity=".85"/><stop offset="1" stop-color="#FFD66B" stop-opacity="0"/></radialGradient>
    <radialGradient id="exDark"><stop offset="0" stop-color="#0A1030" stop-opacity="0"/><stop offset="1" stop-color="#0A1030" stop-opacity=".55"/></radialGradient>
    <linearGradient id="exMoonR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C5D6FF" stop-opacity=".3"/><stop offset="1" stop-color="#C5D6FF" stop-opacity="0"/></linearGradient>
  </defs>
  <rect x="-20" y="-20" width="1120" height="1960" fill="url(#exBg)"/>
  ${Array.from({ length: 10 }, (_, i) => `<circle cx="${(i * 233) % 1080}" cy="${(i * 397) % 1500 + 100}" r="${30 + (i * 17) % 60}" fill="#fff" opacity=".05"/>`).join('')}`);
  // --- sosok terbaring (tampak atas) ---
  const fig = g(root, { transform: 'translate(540 930) scale(1.18) translate(-540 -930)' });
  raw(fig, `<rect x="250" y="330" width="580" height="1130" rx="80" fill="#2F4482" opacity=".7"/>`);
  const legs = raw(fig, `<rect x="400" y="880" width="115" height="520" rx="57" fill="#5B6F9A"/><rect x="565" y="880" width="115" height="520" rx="57" fill="#5B6F9A"/>
     <ellipse cx="457" cy="1410" rx="50" ry="34" fill="#2F3E4D"/><ellipse cx="622" cy="1410" rx="50" ry="34" fill="#2F3E4D"/>`);
  const hero = createPerson('hero'); fig.appendChild(hero.root); fig.appendChild(hero.overlay);
  const glow = el('circle', { cx: 540, cy: 560, r: 250, fill: 'url(#exGlow)', opacity: 0 }, fig);
  fig.insertBefore(glow, hero.root);
  // otot: batang membulat di lengan, badan, kaki
  const bars = [];
  const bar = (x, y, w, h) => { const e = el('rect', { x, y, width: w, height: h, rx: h / 2, fill: '#2EC4A0', opacity: 0.85 }, fig); bars.push(e); return e; };
  [[470, 700], [470, 770], [470, 840]].forEach(([x, y]) => bar(x, y, 140, 34));
  [[405, 960], [405, 1090], [405, 1220], [570, 960], [570, 1090], [570, 1220]].forEach(([x, y]) => bar(x, y, 105, 40));
  [[338, 760], [338, 880], [682, 760], [682, 880]].forEach(([x, y]) => bar(x, y, 58, 36));
  const lock = raw(fig, `<g transform="translate(540 790)"><rect x="-42" y="-8" width="84" height="66" rx="14" fill="#F8C038"/><path d="M-24 -8V-30a24 24 0 0 1 48 0V-8" fill="none" stroke="#F8C038" stroke-width="14" stroke-linecap="round"/><circle cx="0" cy="26" r="9" fill="#7A5A10"/></g>`, { opacity: 0 });
  // awan mimpi dan zzz
  const dream = raw(fig, `<g transform="translate(250 330)"><path d="M0 40Q-40 40 -40 8Q-40 -30 0 -30Q6 -70 52 -70Q92 -70 100 -34Q146 -34 146 6Q146 40 104 40Z" fill="#fff" opacity=".95"/>
     <circle cx="-30" cy="82" r="14" fill="#fff" opacity=".9"/><circle cx="-62" cy="116" r="8" fill="#fff" opacity=".85"/>
     <path d="M30 6a22 22 0 1 0 28 28 18 18 0 0 1-28-28z" fill="#F8C038"/><path d="M92 -16l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#9DE0BD"/></g>`, { opacity: 0 });
  const zz = raw(fig, `<g ${FONT} fill="#fff" font-size="58"><text x="690" y="470" opacity=".9">Z</text><text x="735" y="425" font-size="44" opacity=".8">z</text><text x="772" y="388" font-size="34" opacity=".7">z</text></g>`, { opacity: 0 });
  // label status (kiri: kesadaran, kanan: otot)
  const labL = g(root), labR = g(root);
  const mkLab = (grp, x, y, anchor) => {
    const dot = el('circle', { cx: x, cy: y - 14, r: 14, fill: '#6E7FA8' }, grp);
    const t1 = el('text', { x: x + 28, y, 'font-family': 'Plus Jakarta Sans', 'font-weight': 800, 'font-size': 44, fill: '#fff' }, grp);
    const t2 = el('text', { x: x + 28, y: y + 46, 'font-family': 'Plus Jakarta Sans', 'font-weight': 700, 'font-size': 36, fill: '#C9D6F5' }, grp);
    return { dot, t1, t2 };
  };
  const LL = mkLab(labL, 44, 470), LR = mkLab(labR, 786, 770);
  LL.t1.textContent = 'Kesadaran'; LR.t1.textContent = 'Otot tubuh';
  // pil "bergerak / bicara" dijeda
  const pills = g(root);
  const mkPill = (x, y, w, txt) => { const q = g(pills); q.innerHTML = `<rect x="${x}" y="${y}" width="${w}" height="84" rx="42" fill="#fff"/><g fill="#F29B38"><rect x="${x + 26}" y="${y + 24}" width="9" height="36" rx="4"/><rect x="${x + 43}" y="${y + 24}" width="9" height="36" rx="4"/></g><text x="${x + 72}" y="${y + 56}" ${FONT} font-size="38" fill="#1B2A55">${txt}</text>`; return q; };
  const pillMove = mkPill(84, 1480, 400, 'Bergerak'), pillTalk = mkPill(560, 1480, 360, 'Bicara');
  // judul istilah
  const title = raw(root, `<rect x="90" y="650" width="900" height="520" rx="60" fill="#0A1030" opacity=".86"/>
    <text x="540" y="840" text-anchor="middle" ${FONT} font-size="104" fill="#fff">Sleep paralysis</text>
    <text x="540" y="960" text-anchor="middle" ${FONT} font-size="68" fill="#9DE0BD">kelumpuhan tidur</text>
    <text x="540" y="1060" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="40" fill="#C9D6F5">bisa terjadi saat akan tidur</text><text x="540" y="1112" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="40" fill="#C9D6F5">atau baru bangun</text>`, { opacity: 0 });
  // sebagian orang: empat siluet orang
  const folk = g(root, { opacity: 0 });
  const person = (x, y, dream) => `<g transform="translate(${x} ${y}) scale(1.1)"><circle cx="0" cy="-70" r="62" fill="#D9A27A"/><path d="M-110 120Q-104 -10 0 -10Q104 -10 110 120Z" fill="#7FA7D9"/><path d="M-62 -78Q-60 -138 0 -138Q60 -138 62 -78Q40 -108 0 -106Q-40 -108 -62 -78Z" fill="#1E1B2B"/>
    ${dream ? `<g transform="translate(78 -170) scale(.9)"><path d="M0 34Q-36 34 -36 6Q-36 -26 0 -26Q6 -60 44 -60Q80 -60 86 -30Q124 -30 124 4Q124 34 90 34Z" fill="#fff"/><path d="M26 6a18 18 0 1 0 24 24 15 15 0 0 1-24-24z" fill="#F8C038"/></g>` : ''}</g>`;
  folk.innerHTML = `${person(165, 1010, true)}${person(415, 1010, false)}${person(665, 1010, true)}${person(915, 1010, false)}` + [165, 665].map((x) => `<text x="${x}" y="1200" text-anchor="middle" ${FONT} font-size="32" fill="#F8D98A">sensasi mirip</text><text x="${x}" y="1240" text-anchor="middle" ${FONT} font-size="32" fill="#F8D98A">mimpi masih terbawa</text>`).join('');
  // jendela sudut kamar + persepsi
  const corner = g(root, { opacity: 0, transform: 'translate(540 930) scale(1.14) translate(-540 -930)' });
  raw(corner, `<rect x="120" y="520" width="840" height="780" rx="60" fill="#0A1030" opacity=".4"/>
    <clipPath id="exCorner"><rect x="140" y="540" width="800" height="740" rx="44"/></clipPath>
    <g clip-path="url(#exCorner)">
      <rect x="140" y="540" width="800" height="740" fill="#1C2848"/><rect x="140" y="540" width="330" height="740" fill="#131C38"/><path d="M470 540V1280" stroke="#0D1428" stroke-width="8"/>
      <rect x="140" y="1170" width="800" height="110" fill="#141C34"/>
      <rect x="250" y="900" width="190" height="26" rx="12" fill="#1F2745"/><rect x="262" y="926" width="14" height="250" rx="6" fill="#171E39"/><rect x="414" y="926" width="14" height="250" rx="6" fill="#171E39"/><rect x="254" y="640" width="170" height="260" rx="30" fill="#1B2341"/>
    </g>`);
  const coatC = raw(corner, `<g clip-path="url(#exCorner)"><path d="M226 1190C230 1020 256 930 292 868C278 820 296 760 346 756C398 760 414 820 398 868C434 930 458 1020 456 1190C400 1216 280 1216 226 1190Z" fill="#0A1024"/></g>`);
  const sparkles = raw(corner, `<g fill="#9DE0BD">${Array.from({ length: 9 }, (_, i) => `<path transform="translate(${180 + (i * 97) % 740} ${600 + (i * 131) % 560}) scale(${0.5 + (i % 3) * 0.3})" d="M0 -22l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" opacity=".7"/>`).join('')}</g>`);
  const ring = raw(corner, `<circle cx="340" cy="960" r="300" fill="none" stroke="#9DE0BD" stroke-width="10" stroke-dasharray="18 16" opacity="0"/>`);
  // garis waktu "umumnya singkat"
  const tl = g(root, { opacity: 0 });
  tl.innerHTML = `<rect x="90" y="880" width="900" height="64" rx="32" fill="#3C528F"/><rect x="560" y="880" width="92" height="64" rx="32" fill="#9DE0BD"/>
    <g transform="translate(606 780)"><circle r="62" fill="#fff"/><path d="M0 -38V0L26 14" fill="none" stroke="#1B2A55" stroke-width="9" stroke-linecap="round"/></g>
    <text x="90" y="1030" ${FONT} font-size="40" fill="#C9D6F5">malam</text><text x="990" y="1030" text-anchor="end" ${FONT} font-size="40" fill="#C9D6F5">pagi</text>`;
  const bigQ = raw(topLayer || root, `<text x="540" y="1010" text-anchor="middle" ${FONT} font-size="520" fill="#fff" opacity="0">?</text>`);
  const vign = el('rect', { x: -20, y: -20, width: 1120, height: 1960, fill: 'url(#exDark)', opacity: 0 }, root);
  return {
    root, bigQElement: bigQ,
    update(a, t) {
      const showFig = win(a, 26.7, 47.2, 0.5, 0.5) + win(a, 55.0, 55.1, 0.1, 0.1) * 0; // sosok tampil sampai 47
      fig.setAttribute('opacity', clamp(showFig, 0, 1).toFixed(3));
      // status otot: aktif -> ditahan
      const held = kf(a, [[29.5, 0], [30.6, 1]]);
      bars.forEach((b, i) => { b.setAttribute('fill', held > 0.5 ? '#7D8DB8' : '#2EC4A0'); b.setAttribute('opacity', lerp(0.9, 0.5, held).toFixed(2)); });
      lock.setAttribute('opacity', kf(a, [[30.4, 0], [30.9, 1]]).toFixed(2)); lock.setAttribute('transform', `translate(0 ${(Math.sin(a * 3) * 2).toFixed(1)})`);
      dream.setAttribute('opacity', win(a, 27.2, 32.0, 0.6, 0.6).toFixed(2));
      zz.setAttribute('opacity', (win(a, 27.6, 32.0, 0.6, 0.6) + win(a, 34.9, 38.4, 0.5, 0.5)).toFixed(2));
      zz.setAttribute('transform', `translate(0 ${(Math.sin(a * 2) * 6).toFixed(1)})`);
      const aware = kf(a, [[32.3, 0], [33.0, 1]]);
      glow.setAttribute('opacity', (aware * (0.75 + 0.15 * Math.sin(a * 3))).toFixed(2));
      const eyes = aware > 0.5 ? 'wide' : 'closed';
      posePerson(hero, { x: 540, y: 1080, s: 1.0, t, seated: true, noShadow: true, look: [0, 0.2], blink: aware > 0.5 ? blinkAt(a, 3.2, 0.5) : 0,
        expr: { brow: aware > 0.5 ? 'worry' : 'neutral', eye: eyes, mouth: aware > 0.5 ? 'flat' : 'smallsmile' }, lean: 0,
        armL: { w: [-175, -90], bend: 1, top: true, idle: false }, armR: { w: [175, -90], bend: 1, top: true, idle: false } });
      // label
      const labA = win(a, 29.8, 47.0, 0.4, 0.4);
      labL.setAttribute('opacity', win(a, 32.2, 42.55, 0.4, 0.3).toFixed(2)); labR.setAttribute('opacity', win(a, 29.8, 42.55, 0.4, 0.3).toFixed(2));
      LL.dot.setAttribute('fill', '#F8C038'); LL.t2.textContent = 'aktif';
      LR.dot.setAttribute('fill', '#7D8DB8'); LR.t2.textContent = a < 34.6 ? 'ditahan' : 'masih tidur';
      pillMove.setAttribute('opacity', win(a, 38.9, 42.6, 0.35, 0.3).toFixed(2)); pillTalk.setAttribute('opacity', win(a, 39.8, 42.6, 0.35, 0.3).toFixed(2));
      title.setAttribute('opacity', win(a, 42.75, 47.1, 0.4, 0.5).toFixed(2));
      const tk = kf(a, [[42.7, 1], [43.4, 1]]);
      folk.setAttribute('opacity', win(a, 47.3, 50.8, 0.5, 0.45).toFixed(2));
      folk.setAttribute('transform', `translate(0 ${(lerp(30, 0, ease(clamp((a - 47.3) / 0.6, 0, 1)))).toFixed(1)})`);
      const c = win(a, 50.9, 55.0, 0.5, 0.45);
      corner.setAttribute('opacity', c.toFixed(2));
      coatC.setAttribute('transform', `translate(340 1190) scale(${(1 + Math.sin(a * 1.6) * 0.012).toFixed(4)} ${(1 + Math.sin(a * 1.6) * 0.02).toFixed(4)}) translate(-340 -1190)`);
      sparkles.setAttribute('opacity', (0.6 + 0.4 * Math.sin(a * 3)).toFixed(2));
      ring.firstElementChild && 0;
      tl.setAttribute('opacity', win(a, 55.2, 57.3, 0.35, 0.4).toFixed(2));
      bigQ.firstElementChild.setAttribute('opacity', (win(a, 24.7, 26.9, 0.5, 0.45) * 0.9).toFixed(2));
      bigQ.firstElementChild.setAttribute('transform', `rotate(${(Math.sin(a * 2) * 3).toFixed(1)} 540 800)`);
    },
  };
}
