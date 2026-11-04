// Membuat tiga gambar slide contoh (skema buatan, bukan gambar buku/atlas) untuk video: slide-1.png ... slide-3.png (1600 x 900).
// node bikin-slide.cjs   -> rekam/slide/slide-N.png
const { chromium } = require('playwright'); const path = require('path');
const font = "font-family:'Arial',sans-serif";
const bar = (title, n) => `<rect width="1600" height="900" fill="#fff"/><rect width="1600" height="150" fill="#0B4A8F"/><text x="60" y="95" fill="#fff" font-size="58" font-weight="700" style="${font}">${title}</text><text x="1540" y="885" fill="#8A97A3" font-size="26" text-anchor="end" style="${font}">Anatomi Sistem Muskuloskeletal · ${n}</text>`;
const lab = (x, y, tx, ty, txt, c = '#C0392B') => `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="${c}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="8" fill="${c}"/><text x="${tx + (tx > x ? 10 : -10)}" y="${ty + 10}" fill="#1B2733" font-size="34" font-weight="700" text-anchor="${tx > x ? 'start' : 'end'}" style="${font}">${txt}</text>`;
const rl = (fx, fy, y, txt, c = '#C0392B') => `<line x1="${fx}" y1="${fy}" x2="790" y2="${y}" stroke="${c}" stroke-width="4"/><circle cx="${fx}" cy="${fy}" r="8" fill="${c}"/><text x="802" y="${y + 11}" fill="#1B2733" font-size="34" font-weight="700" style="${font}">${txt}</text>`;
const col = (title, items) => `<g transform="translate(1190 230)"><text x="0" y="40" fill="#0B4A8F" font-size="40" font-weight="700" style="${font}">${title}</text>${items.map((t, k) => `<text x="0" y="${110 + k * 60}" fill="#1B2733" font-size="34" style="${font}">• ${t}</text>`).join('')}</g>`;
const slides = [
`${bar('Articulatio Glenohumeralis', 1)}
 <path d="M190 400 Q170 290 260 230 L440 230 Q530 250 540 350 L560 420 Q520 530 430 560 Q270 590 190 400Z" fill="#E8DCC8" stroke="#8A7A5C" stroke-width="5"/>
 <path d="M380 200 Q500 170 620 215 L620 260 Q500 235 390 255Z" fill="#E8DCC8" stroke="#8A7A5C" stroke-width="5"/>
 <path d="M548 360 Q580 430 548 500" fill="none" stroke="#2E86C1" stroke-width="16" stroke-linecap="round"/>
 <circle cx="650" cy="440" r="95" fill="#F3E6CF" stroke="#8A7A5C" stroke-width="5"/>
 <path d="M590 530 Q620 650 600 840 L720 840 Q710 650 710 530Z" fill="#F3E6CF" stroke="#8A7A5C" stroke-width="5"/>
 <path d="M520 330 Q640 270 740 340" fill="none" stroke="#7D6608" stroke-width="5" stroke-dasharray="14 10"/>
 ${rl(560, 222, 200, 'Acromion')}${rl(700, 306, 290, 'Capsula articularis', '#7D6608')}${rl(690, 440, 380, 'Caput humeri', '#1F618D')}${rl(548, 400, 470, 'Fossa glenoidalis')}${rl(552, 470, 560, 'Labrum glenoidale', '#2E86C1')}
 ${col('Istilah penting', ['Ball-and-socket joint', 'Lig. glenohumerale', 'Bursa subacromialis', 'Mobilitas > stabilitas'])}`,
`${bar('Rotator Cuff (SITS)', 2)}
 <circle cx="500" cy="500" r="170" fill="#F3E6CF" stroke="#8A7A5C" stroke-width="5"/>
 <path d="M340 380 Q500 250 670 380 L630 420 Q500 330 380 420Z" fill="#E67E22" opacity=".9"/>
 <path d="M330 450 Q290 540 350 640 L395 615 Q355 540 375 470Z" fill="#27AE60" opacity=".9"/>
 <path d="M660 450 Q710 540 650 640 L605 615 Q645 540 625 470Z" fill="#8E44AD" opacity=".9"/>
 <ellipse cx="500" cy="510" rx="95" ry="120" fill="#2E86C1" opacity=".85"/>
 ${rl(500, 300, 200, 'Supraspinatus', '#E67E22')}${rl(335, 560, 290, 'Infraspinatus', '#27AE60')}${rl(650, 560, 380, 'Teres minor', '#8E44AD')}${rl(520, 510, 470, 'Subscapularis', '#2E86C1')}
 ${col('Rotator cuff', ['S: Supraspinatus', 'I: Infraspinatus', 'T: Teres minor', 'S: Subscapularis'])}`,
`${bar('Gerakan Sendi Bahu', 3)}
 <circle cx="460" cy="520" r="52" fill="#F3E6CF" stroke="#8A7A5C" stroke-width="5"/>
 <path d="M460 520 L460 260" stroke="#27AE60" stroke-width="14" stroke-linecap="round"/><path d="M460 520 L720 520" stroke="#E67E22" stroke-width="14" stroke-linecap="round"/><path d="M460 520 L460 780" stroke="#2E86C1" stroke-width="14" stroke-linecap="round"/><path d="M460 520 L200 520" stroke="#8E44AD" stroke-width="14" stroke-linecap="round"/>
 <text x="460" y="232" fill="#1B2733" font-size="34" font-weight="700" text-anchor="middle" style="${font}">Abduksi</text><text x="490" y="470" fill="#1B2733" font-size="30" style="${font}" opacity="0">.</text><text x="740" y="532" fill="#1B2733" font-size="34" font-weight="700" style="${font}">Fleksi</text><text x="460" y="830" fill="#1B2733" font-size="34" font-weight="700" text-anchor="middle" style="${font}">Adduksi</text><text x="180" y="532" fill="#1B2733" font-size="34" font-weight="700" text-anchor="end" style="${font}">Ekstensi</text>
 ${col('Gerakan', ['Rotasi medial', 'Rotasi lateral', 'Sirkumduksi'])}`,
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  for (let i = 0; i < slides.length; i++) { await p.setContent(`<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">${slides[i]}</svg>`); await p.screenshot({ path: path.join(__dirname, 'slide', `slide-${i + 1}.png`) }); }
  await b.close();
})();
