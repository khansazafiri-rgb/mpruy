// Dunia di luar web: kamar kos (malam -> pagi) dan lorong kampus. Datar, tanpa garis tepi.
const NS = 'http://www.w3.org/2000/svg';
const g = (html, attrs = {}, parent) => {
  const e = document.createElementNS(NS, 'g');
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  e.innerHTML = html || '';
  if (parent) parent.appendChild(e);
  return e;
};
const mix = (a, b, t) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function buildWorld(svg, fore) {
  svg.innerHTML = `<defs>
    <radialGradient id="lampglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD98A" stop-opacity=".75"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
    <radialGradient id="sunglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient>
  </defs>`;
  // ================= KAMAR KOS =================
  const kos = g('', { id: 'kos' }, svg);
  const wallDay = '#F3DDB8', wallNight = '#244F5A';
  const wall = g(`<rect width="1080" height="1920" fill="${wallNight}" id="kos-wall"/>`, {}, kos);
  // panel dinding bawah (wainscot)
  kos.appendChild(g(`<rect x="0" y="1180" width="1080" height="740" fill="#000" opacity=".07"/><rect x="0" y="1176" width="1080" height="10" fill="#000" opacity=".08"/>`));
  // jendela
  const win = g('', { id: 'kos-window' }, kos);
  win.innerHTML = `<rect x="610" y="120" width="360" height="420" rx="26" fill="#FBF6E6"/>
    <rect x="632" y="142" width="316" height="376" rx="14" id="kos-sky" fill="#16304A"/>
    <g id="kos-stars"><circle cx="672" cy="190" r="4" fill="#fff"/><circle cx="740" cy="236" r="3" fill="#fff"/><circle cx="880" cy="180" r="4" fill="#fff"/><circle cx="906" cy="300" r="3" fill="#fff"/><circle cx="690" cy="330" r="3" fill="#fff"/><circle cx="820" cy="270" r="3" fill="#fff"/></g>
    <circle id="kos-moon" cx="860" cy="250" r="46" fill="#FFF1C2"/>
    <circle id="kos-moon2" cx="880" cy="238" r="40" fill="#16304A"/>
    <g id="kos-sun" opacity="0"><circle cx="800" cy="440" r="120" fill="url(#sunglow)"/><circle cx="800" cy="440" r="48" fill="#FFD66B"/></g>
    <rect x="786" y="142" width="12" height="376" fill="#FBF6E6"/><rect x="632" y="318" width="316" height="12" fill="#FBF6E6"/>
    <rect x="596" y="520" width="388" height="26" rx="10" fill="#E9DCBD"/>`;
  // poster EKG / tulang
  kos.appendChild(g(`<rect x="70" y="150" width="230" height="300" rx="16" fill="#FFF8E6"/>
    <rect x="86" y="166" width="198" height="268" rx="10" fill="#CFF1DF"/>
    <path d="M100 330h40l14-46 22 86 20-62 14 22h56" fill="none" stroke="#007060" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="192" cy="240" r="38" fill="#F28B82"/><path d="M192 262c-30-18-30-44-10-48 10-2 10 6 10 6s0-8 10-6c20 4 20 30 0 48z" fill="#fff"/>`));
  // kalender ujian
  const cal = g(`<rect x="340" y="170" width="230" height="260" rx="16" fill="#fff"/>
    <rect x="340" y="170" width="230" height="58" rx="16" fill="#E8665F"/><rect x="340" y="206" width="230" height="22" fill="#E8665F"/>
    <text x="455" y="210" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="30" fill="#fff">UJIAN</text>
    <g fill="#d5dde0">${[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4, 5, 6].map((c) => `<circle cx="${366 + c * 29}" cy="${256 + r * 32}" r="9"/>`).join('')).join('')}</g>
    <circle cx="395" cy="352" r="19" fill="none" stroke="#E8665F" stroke-width="7"/><circle cx="453" cy="352" r="19" fill="none" stroke="#E8665F" stroke-width="7"/><circle cx="482" cy="352" r="22" fill="#E8665F"/>
    <text x="482" y="360" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="22" fill="#fff">!</text>`, { id: 'kos-cal' }, kos);
  // lampu hias
  kos.appendChild(g(`<path d="M0 60Q270 120 540 60T1080 60" fill="none" stroke="#173B44" stroke-width="5" opacity=".6"/>
    ${[60, 190, 320, 450, 580, 710, 840, 970].map((x, i) => `<circle cx="${x}" cy="${84 + (i % 2 ? 6 : 0) + Math.sin(i) * 8}" r="13" fill="#FFD66B"/>`).join('')}`));
  // rak buku
  kos.appendChild(g(`<rect x="70" y="560" width="480" height="18" rx="8" fill="#B77C4E"/>
    <rect x="96" y="486" width="34" height="74" rx="6" fill="#E8665F"/><rect x="134" y="500" width="30" height="60" rx="6" fill="#F8C038"/><rect x="168" y="478" width="36" height="82" rx="6" fill="#007060"/>
    <rect x="208" y="496" width="30" height="64" rx="6" fill="#69BFD0"/><rect x="242" y="484" width="34" height="76" rx="6" fill="#F7F2E4"/>
    <g transform="translate(450 540)"><path d="M-30 0Q-34 -40 0 -46Q34 -40 30 0Z" fill="#55C79D"/><rect x="-22" y="0" width="44" height="22" rx="8" fill="#E8665F"/></g>`));
  const nightOverlay = g(`<rect width="1080" height="1920" fill="#0B1B2E" opacity="0" id="kos-dim"/>`, {}, kos);

  // meja + laptop (hanya mode penuh)
  const desk = g('', { id: 'desk' }, fore);
  desk.innerHTML = `<ellipse cx="540" cy="1330" rx="640" ry="260" fill="url(#lampglow)" id="lamp-glow" opacity=".6"/>
    <rect x="-20" y="1318" width="1120" height="64" rx="0" fill="#C98A58"/>
    <rect x="-20" y="1378" width="1120" height="560" fill="#A8703F"/>
    <rect x="-20" y="1378" width="1120" height="18" fill="#000" opacity=".1"/>
    <rect x="70" y="1470" width="400" height="300" rx="26" fill="#000" opacity=".1"/><rect x="610" y="1470" width="400" height="300" rx="26" fill="#000" opacity=".1"/>
    <circle cx="270" cy="1620" r="16" fill="#F8C038"/><circle cx="810" cy="1620" r="16" fill="#F8C038"/>`;
  // lampu meja (kanan)
  desk.appendChild(g(`<ellipse cx="982" cy="1316" rx="54" ry="12" fill="#2B4F57"/><rect x="974" y="1200" width="16" height="116" fill="#2B4F57"/><path d="M938 1210Q1000 1120 1060 1210Z" fill="#F8C038"/>`));
  // tumpukan buku + gelas
  desk.appendChild(g(`<rect x="560" y="1262" width="170" height="26" rx="8" fill="#007060"/><rect x="572" y="1236" width="150" height="26" rx="8" fill="#E8665F"/><rect x="566" y="1210" width="158" height="26" rx="8" fill="#F7F2E4"/>
    <g transform="translate(860 1256)"><rect x="-34" y="0" width="68" height="62" rx="12" fill="#fff"/><path d="M34 14h14q14 0 14 16t-14 16h-14" fill="none" stroke="#fff" stroke-width="9"/><rect x="-26" y="8" width="52" height="10" rx="5" fill="#8A5A3C"/>
      <path d="M-14 -10q-8-14 0-26M6 -10q-8-14 0-26M26 -10q-8-14 0-26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/></g>
    <g transform="translate(76 1266) rotate(-6)"><rect width="50" height="52" rx="10" fill="#fff"/><rect x="6" y="8" width="38" height="8" rx="4" fill="#8A5A3C"/></g>`));
  // laptop menghadap penonton
  const lap = g('', { id: 'laptop' }, desk);
  lap.innerHTML = `<g transform="translate(36 1002)">
      <rect x="0" y="0" width="520" height="322" rx="26" fill="#2B3A44"/>
      <rect x="14" y="14" width="492" height="294" rx="14" fill="#F4F7F7"/>
      <rect x="14" y="14" width="492" height="44" rx="14" fill="#D5DEE2"/><rect x="14" y="40" width="492" height="18" fill="#D5DEE2"/>
      <g id="tabs"></g>
      <rect x="26" y="64" width="468" height="26" rx="13" fill="#fff"/>
      <g fill="#C8D3D8"><rect x="30" y="112" width="300" height="14" rx="7"/><rect x="30" y="140" width="420" height="14" rx="7"/><rect x="30" y="168" width="360" height="14" rx="7"/><rect x="30" y="196" width="400" height="14" rx="7"/><rect x="30" y="224" width="240" height="14" rx="7"/></g>
      <rect x="-40" y="316" width="600" height="26" rx="13" fill="#3B4C57"/>
    </g>`;

  // ================= LORONG KAMPUS =================
  const lor = g('', { id: 'lorong' }, svg);
  lor.innerHTML = `<rect width="1080" height="1920" fill="#E1F1EA"/>
    <rect x="0" y="1240" width="1080" height="680" fill="#E8D5AE"/><rect x="0" y="1236" width="1080" height="12" fill="#000" opacity=".08"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 180 - 20}" y="1248" width="4" height="672" fill="#000" opacity=".05"/>`).join('')}
    <rect x="0" y="1100" width="1080" height="140" fill="#B9DCCD"/>
    <!-- jendela besar -->
    <g>${[0, 1, 2].map((i) => `<g transform="translate(${50 + i * 340} 110)"><rect width="300" height="430" rx="22" fill="#FBF6E6"/><rect x="18" y="18" width="264" height="394" rx="12" fill="#BFE6F2"/><rect x="144" y="18" width="12" height="394" fill="#FBF6E6"/><rect x="18" y="210" width="264" height="12" fill="#FBF6E6"/>
      <circle cx="${70 + i * 10}" cy="${120 - i * 6}" r="${34 + i * 4}" fill="#fff" opacity=".7"/></g>`).join('')}</g>
    <rect x="0" y="560" width="1080" height="14" fill="#CBE5DB"/>
    <!-- papan pengumuman & pintu -->
    <g transform="translate(70 620)"><rect width="340" height="250" rx="18" fill="#C78A55"/><rect x="12" y="12" width="316" height="226" rx="10" fill="#E3B27A"/>
      <rect x="34" y="34" width="110" height="136" rx="6" fill="#fff" transform="rotate(-4 90 100)"/><rect x="170" y="40" width="120" height="86" rx="6" fill="#F8C038" transform="rotate(3 230 80)"/><rect x="176" y="140" width="110" height="74" rx="6" fill="#CFF1DF"/>
      <g fill="#d5dde0"><rect x="48" y="56" width="80" height="9" rx="4" transform="rotate(-4 90 100)"/><rect x="48" y="76" width="64" height="9" rx="4" transform="rotate(-4 90 100)"/></g></g>
    <g transform="translate(690 590)"><rect width="300" height="560" rx="18" fill="#2F7B6D"/><rect x="26" y="26" width="248" height="508" rx="10" fill="#3D9585"/>
      <rect x="86" y="70" width="128" height="62" rx="12" fill="#fff"/><text x="150" y="112" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="28" fill="#007060">POLI</text>
      <rect x="130" y="160" width="40" height="40" rx="6" fill="#E8665F"/><rect x="142" y="148" width="16" height="64" rx="4" fill="#fff" opacity="0"/>
      <path d="M150 164v32M134 180h32" stroke="#fff" stroke-width="9" stroke-linecap="round"/></g>
    <!-- tanaman & bangku -->
    <g transform="translate(560 1010)"><rect x="-34" y="60" width="68" height="70" rx="10" fill="#C98A58"/><path d="M0 62Q-60 10 -40 -50Q0 -20 0 62ZM0 62Q60 6 42 -56Q0 -24 0 62ZM0 62Q-8 -28 0 -80Q12 -28 0 62Z" fill="#55C79D"/></g>
    <g transform="translate(560 1330)" id="lor-bench"><rect x="-480" y="0" width="960" height="40" rx="14" fill="#B77C4E"/><rect x="-440" y="40" width="26" height="110" fill="#8A5A3C"/><rect x="414" y="40" width="26" height="110" fill="#8A5A3C"/></g>`;
  lor.setAttribute('opacity', 0);

  const ledge = g(`<rect x="-20" y="1330" width="1120" height="600" fill="#2F7B6D"/><rect x="-20" y="1330" width="1120" height="26" fill="#3D9585"/><rect x="-20" y="1420" width="1120" height="12" fill="#000" opacity=".08"/>
    <g transform="translate(120 1330)"><path d="M0 4Q-56 -44 -36 -100Q0 -70 0 4ZM0 4Q56 -50 40 -110Q0 -76 0 4ZM0 4Q-6 -76 0 -128Q10 -76 0 4Z" fill="#55C79D"/></g>
    <g transform="translate(960 1330)"><path d="M0 4Q-56 -44 -36 -100Q0 -70 0 4ZM0 4Q56 -50 40 -110Q0 -76 0 4ZM0 4Q-6 -76 0 -128Q10 -76 0 4Z" fill="#55C79D"/></g>`, { id: 'ledge' }, fore);
  ledge.setAttribute('opacity', 0);
  const q = (id) => (svg.querySelector('#' + id) || fore.querySelector('#' + id));
  const els = { ledge, wall: q('kos-wall'), sky: q('kos-sky'), stars: q('kos-stars'), moon: q('kos-moon'), moon2: q('kos-moon2'), sun: q('kos-sun'), dim: q('kos-dim'), desk, lor, kos, tabs: q('tabs'), lamp: q('lamp-glow'), laptop: lap, cal: q('kos-cal') };
  const TAB_COLORS = ['#E8665F', '#F8C038', '#007060', '#69BFD0', '#9DE0BD', '#B8A5E8'];
  let lastTabs = -1;
  return {
    update({ t, k, lor: lorOn, night, tabsN, shake }) {
      els.kos.setAttribute('opacity', lorOn ? 0 : 1);
      els.lor.setAttribute('opacity', lorOn ? 1 : 0);
      // malam -> pagi
      const n = clamp(night, 0, 1);
      els.wall.setAttribute('fill', mix('#F3DDB8', '#244F5A', n));
      els.sky.setAttribute('fill', mix('#BFE6F2', '#16304A', n));
      els.stars.setAttribute('opacity', clamp((n - 0.5) * 2, 0, 1));
      els.moon.setAttribute('opacity', clamp((n - 0.4) * 2, 0, 1)); els.moon2.setAttribute('opacity', clamp((n - 0.4) * 2, 0, 1));
      els.moon2.setAttribute('fill', mix('#BFE6F2', '#16304A', n));
      els.sun.setAttribute('opacity', clamp((0.6 - n) * 2, 0, 1));
      els.dim.setAttribute('opacity', (n * 0.18).toFixed(3));
      els.lamp.setAttribute('opacity', (0.15 + n * 0.5).toFixed(3));
      // meja & laptop: tampil penuh saat adegan hook/outro-kos
      const dk = clamp(k, 0, 1);
      els.desk.setAttribute('opacity', lorOn ? 0 : dk);
      els.desk.setAttribute('transform', `translate(0 ${((1 - dk) * 620).toFixed(1)})`);
      els.ledge.setAttribute('opacity', lorOn ? dk : 0);
      els.ledge.setAttribute('transform', `translate(0 ${((1 - dk) * 620).toFixed(1)})`);
      // tab browser (jumlah naik saat "dua puluh")
      const nt = Math.round(tabsN);
      if (nt !== lastTabs) {
        lastTabs = nt;
        const w = 468 / Math.max(nt, 1);
        let h = '';
        for (let i = 0; i < nt; i++) {
          h += `<rect x="${26 + i * w}" y="22" width="${Math.max(6, w - 3)}" height="30" rx="8" fill="${i === nt - 1 ? '#fff' : '#EEF2F4'}"/><rect x="${30 + i * w}" y="31" width="${Math.min(12, w - 10)}" height="12" rx="3" fill="${TAB_COLORS[i % TAB_COLORS.length]}"/>`;
        }
        els.tabs.innerHTML = h;
      }
      els.laptop.setAttribute('transform', `translate(${(shake * Math.sin(t * 40)).toFixed(2)} 0)`);
    },
  };
}
