// Sistem gaya anatomi MEDCOEL (SVG, kode murni; jalan di Chromium/Playwright). Kanvas 1080 x 1920.
// Prinsip: bentuk organ digambar dari path, volume didapat dari (1) gradasi radial/linear, (2) filter pencahayaan SVG (diffuse + specular dari "tinggi" alpha yang diburamkan),
// (3) tabung berlapis untuk pembuluh, (4) tekstur turbulensi halus, (5) bayangan jatuh dan rim light. Cahaya utama selalu dari kiri atas (azimuth 225), rim light dingin dari kanan bawah.
// Warna per organ ada di PAL; sistem tidak memaksa semua organ berwarna sama.
export const W = 1080, H = 1920;
export const f1 = (n) => Math.round(n * 10) / 10;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rng = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mix = (a, b, t) => '#' + hx(a).map((v, i) => Math.round(lerp(v, hx(b)[i], clamp(t, 0, 1))).toString(16).padStart(2, '0')).join('');
export const lighten = (c, t) => mix(c, '#ffffff', t);
export const darken = (c, t) => mix(c, '#000000', t);

// ---------------------------------------------------------------- palet
export const PAL = {
  bg: { top: '#2B1046', mid: '#1B0A30', bot: '#0D0519', glow: '#A0307A', glow2: '#5A2AA0' },
  // jantung dan pembuluh
  myo: '#E02A2E', myoLight: '#FF6A55', myoDark: '#8E0F22', rv: '#E5383A', lv: '#CC1F2B', atrium: '#B5223D', fat: '#FBB63A', fatDark: '#D9781A',
  artery: '#E5342B', arteryDark: '#8A0F1C', arteryLight: '#FF8A72',
  vein: '#4048CC', veinDark: '#1E2380', veinLight: '#8E96F8', pulm: '#3B40C2',
  coronary: '#F0282A', coronaryDark: '#7A0A14',
  // gigi dan jaringan
  enamel: '#E6F1F4', enamelDark: '#B9CFD8', dentin: '#EBCB93', dentinDark: '#C99A55', cementum: '#C79B5C', pulp: '#EF7F86', pulpDark: '#B8454F',
  pdl: '#E9A585', bone: '#E7D3AE', boneDark: '#B99763', boneLight: '#F6EBCF', gum: '#E98C94', gumDark: '#B8535F', gumLight: '#F8BFC0', nerve: '#F4D35E',
  ink: '#07161C', rim: '#FF9AD8', warm: '#FFD9A8',
};

// ---------------------------------------------------------------- defs bersama (gradasi dan filter); id dengan awalan p supaya bisa dipakai beberapa gambar
export function defs(p = 'a') {
  const light = '<feDistantLight azimuth="225" elevation="50"/>';
  return `<defs>
<linearGradient id="${p}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAL.bg.top}"/><stop offset=".5" stop-color="${PAL.bg.mid}"/><stop offset="1" stop-color="${PAL.bg.bot}"/></linearGradient>
<radialGradient id="${p}glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${PAL.bg.glow}" stop-opacity=".6"/><stop offset=".55" stop-color="${PAL.bg.glow}" stop-opacity=".16"/><stop offset="1" stop-color="${PAL.bg.glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}vig" cx=".5" cy=".46" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>
<filter id="${p}blur8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="${p}blur20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
<filter id="${p}blur40" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="40"/></filter>
<filter id="${p}blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="${p}blur4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="${p}shadow" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="14" dy="22" stdDeviation="16" flood-color="#000" flood-opacity=".5"/></filter>
<filter id="${p}shadowS" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="6" dy="10" stdDeviation="7" flood-color="#000" flood-opacity=".5"/></filter>
<!-- volume besar: tinggi dari alpha yang diburamkan, diffuse (kali) + specular (tambah); organ terlihat membulat -->
<filter id="${p}vol" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
 <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="b"/>
 <feDiffuseLighting in="b" surfaceScale="11" diffuseConstant="1.05" lighting-color="#ffffff" result="d">${light}</feDiffuseLighting>
 <feSpecularLighting in="b" surfaceScale="11" specularConstant=".75" specularExponent="26" lighting-color="#fff6ea" result="s">${light}</feSpecularLighting>
 <feComposite in="d" in2="SourceAlpha" operator="in" result="d2"/><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
 <feComposite in="SourceGraphic" in2="d2" operator="arithmetic" k1="1.35" k2="0" k3="0" k4="0" result="lit"/>
 <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".5" k4="0"/>
</filter>
<!-- volume sedang: untuk struktur kecil -->
<filter id="${p}volS" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
 <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b"/>
 <feDiffuseLighting in="b" surfaceScale="6" diffuseConstant="1.05" lighting-color="#ffffff" result="d">${light}</feDiffuseLighting>
 <feSpecularLighting in="b" surfaceScale="6" specularConstant=".7" specularExponent="22" lighting-color="#fff6ea" result="s">${light}</feSpecularLighting>
 <feComposite in="d" in2="SourceAlpha" operator="in" result="d2"/><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
 <feComposite in="SourceGraphic" in2="d2" operator="arithmetic" k1="1.35" k2="0" k3="0" k4="0" result="lit"/>
 <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".45" k4="0"/>
</filter>
<filter id="${p}volV" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
 <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b"/>
 <feDiffuseLighting in="b" surfaceScale="10" diffuseConstant="1.05" lighting-color="#ffffff" result="d">${light}</feDiffuseLighting>
 <feSpecularLighting in="b" surfaceScale="10" specularConstant=".8" specularExponent="24" lighting-color="#fff6ea" result="s">${light}</feSpecularLighting>
 <feComposite in="d" in2="SourceAlpha" operator="in" result="d2"/><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
 <feComposite in="SourceGraphic" in2="d2" operator="arithmetic" k1="1.3" k2="0" k3="0" k4="0" result="lit"/>
 <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".55" k4="0"/>
</filter>
<!-- tekstur jaringan: bintik halus + serat -->
<filter id="${p}tex" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
 <feTurbulence type="fractalNoise" baseFrequency=".018 .03" numOctaves="4" seed="7" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 .02  0 0 0 0 .04  0 0 0 1.6 -.55" result="a"/>
 <feComposite in="a" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="${p}texFine" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
 <feTurbulence type="fractalNoise" baseFrequency=".12" numOctaves="2" seed="3" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.2 -.55" result="a"/>
 <feComposite in="a" in2="SourceAlpha" operator="in"/>
</filter>
</defs>`;
}

// ---------------------------------------------------------------- latar gelap berlapis + partikel
// o: seed, glow {x,y,r}, tint (warna partikel), cells (jumlah sel darah kabur di latar), vessels (siluet pembuluh kabur di latar)
export function background(p = 'a', o = {}) {
  const r = rng(o.seed ?? 11), g = o.glow ?? { x: 540, y: 820, r: 640 }, tint = o.tint ?? '#9FF0E4';
  let s = `<rect width="${W}" height="${H}" fill="url(#${p}bg)"/>`;
  s += `<ellipse cx="${g.x}" cy="${g.y}" rx="${g.r}" ry="${g.r * 0.95}" fill="url(#${p}glow)"/>`;
  s += `<g filter="url(#${p}blur40)" opacity=".7"><path d="M-100 260C200 120 520 260 1200 60L1200 -100L-100 -100Z" fill="#C0304A" opacity=".45"/><path d="M-100 1700C300 1560 700 1780 1200 1560L1200 2000L-100 2000Z" fill="#6A2AA8" opacity=".5"/></g>`;
  // lapisan jauh: bentuk besar sangat kabur (kedalaman)
  let far = '';
  for (let i = 0; i < 7; i++) { const x = r() * W, y = 200 + r() * 1500, rr = 160 + r() * 280; far += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="${mix(r() > 0.5 ? PAL.bg.glow : PAL.bg.glow2, '#1B0A30', 0.45 + r() * 0.3)}" opacity="${f1(0.16 + r() * 0.14)}"/>`; }
  s += `<g filter="url(#${p}blur40)">${far}</g>`;
  // siluet pembuluh/serat kabur di latar
  if (o.vessels !== false) {
    let v = ''; for (let i = 0; i < 5; i++) { const x0 = r() * W, y0 = r() * H; v += `<path d="M${f1(x0)} ${f1(y0)}C${f1(x0 + 200 - r() * 400)} ${f1(y0 + 200)} ${f1(x0 + 300 - r() * 600)} ${f1(y0 + 500)} ${f1(x0 + 100 - r() * 200)} ${f1(y0 + 900)}" fill="none" stroke="${mix(o.vesselColor ?? '#B23A44', '#1B0A30', 0.55)}" stroke-width="${f1(26 + r() * 40)}" stroke-linecap="round" opacity=".28"/>`; }
    s += `<g filter="url(#${p}blur20)">${v}</g>`;
  }
  // sel darah kabur melayang (konteks)
  let c = '';
  for (let i = 0; i < (o.cells ?? 18); i++) { const x = r() * W, y = r() * H, rr = 16 + r() * 34, a = 0.1 + r() * 0.22; const blue = r() < 0.3; c += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(r() * 180)})" opacity="${f1(a * 1.3)}"><ellipse rx="${f1(rr)}" ry="${f1(rr * 0.78)}" fill="${blue ? '#4A4FD0' : '#D8323C'}"/><ellipse rx="${f1(rr * 0.5)}" ry="${f1(rr * 0.34)}" fill="${blue ? '#262A8A' : '#8E1824'}"/></g>`; }
  s += `<g filter="url(#${p}blur8)">${c}</g>`;
  // partikel halus bercahaya
  let pt = '';
  for (let i = 0; i < (o.particles ?? 70); i++) { const x = r() * W, y = r() * H, rr = 1.2 + r() * 3.4, a = 0.25 + r() * 0.6; pt += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="${tint}" opacity="${f1(a * 0.75)}"/>`; if (rr > 2.8) pt += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr * 3)}" fill="${tint}" opacity="${f1(a * 0.14)}"/>`; }
  s += `<g>${pt}</g>`;
  return s;
}
export const vignette = (p = 'a') => `<rect width="${W}" height="${H}" fill="url(#${p}vig)"/>`;

// ---------------------------------------------------------------- tabung (pembuluh): lapisan goresan dengan gradasi silinder, sorotan digeser ke arah cahaya (kiri atas)
// base/dark/light: warna dasar, sisi gelap, sorotan. w = lebar. cap: 'round' | 'butt'. o.shadow: bayangan jatuh. o.hl: kekuatan sorotan
export function tube(d, w, base, o = {}) {
  const dark = o.dark ?? darken(base, 0.45), light = o.light ?? lighten(base, 0.5), cap = o.cap ?? 'round', hl = o.hl ?? 1, p = o.p ?? 'a';
  const st = (ww, c, op = 1, dx = 0, dy = 0, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(ww)}" stroke-linecap="${cap}" stroke-linejoin="round" opacity="${op}" transform="translate(${f1(dx)} ${f1(dy)})" ${extra}/>`;
  const sh = w * 0.1;
  let s = '';
  if (o.shadow !== false) s += `<g filter="url(#${p}shadowS)">${st(w, dark)}</g>`;
  s += st(w + 2, darken(dark, 0.3));
  s += st(w, dark);
  s += st(w * 0.86, mix(dark, base, 0.55), 1, -sh * 0.4, -sh * 0.4);
  s += st(w * 0.66, base, 1, -sh * 0.8, -sh * 0.8);
  s += st(w * 0.4, mix(base, light, 0.45), 0.95 * hl, -sh * 1.1, -sh * 1.1, `filter="url(#${p}blur2)"`);
  s += st(w * 0.14, light, 0.8 * hl, -sh * 1.5, -sh * 1.5, `filter="url(#${p}blur2)"`);
  return s;
}
// goresan rim light dingin di tepi kanan-bawah sebuah path tertutup (dipakai di atas organ)
export const rimLight = (d, w = 6, color = PAL.rim, op = 0.5, p = 'a') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${op}" stroke-linejoin="round" filter="url(#${p}blur4)" clip-path="inset(0)" />`;

// ---------------------------------------------------------------- label (hanya untuk pemeriksaan anatomi; render bersih tidak memakainya)
export function label(x, y, tx, ty, txt, o = {}) {
  const fs = o.fs ?? 26, anchor = o.anchor ?? (tx >= x ? 'start' : 'end'), w = txt.length * fs * 0.54 + 28, bx = anchor === 'start' ? tx - 10 : tx - w + 10;
  return `<g><line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(tx)}" y2="${f1(ty)}" stroke="#fff" stroke-width="3" opacity=".9"/><circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="#fff" stroke="#0A2630" stroke-width="2"/><rect x="${f1(bx)}" y="${f1(ty - fs * 0.8)}" width="${f1(w)}" height="${f1(fs * 1.6)}" rx="${f1(fs * 0.5)}" fill="rgba(5,18,25,.88)"/><text x="${f1(anchor === 'start' ? tx + 4 : tx - 4)}" y="${f1(ty + fs * 0.34)}" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="${fs}" fill="#fff" text-anchor="${anchor}">${txt}</text></g>`;
}
export const svgDoc = (inner, p = 'a') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(p)}${inner}</svg>`;

// ---------------------------------------------------------------- pita meruncing: poligon di sekitar garis tengah (titik [x,y]) dengan lebar berubah dari w0 ke w1 (untuk kanal akar, saraf, pembuluh yang menyempit)
export function ribbon(pts, w0, w1, ease = (t) => t) {
  const n = pts.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = lerp(w0, w1, ease(i / (n - 1))) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rr.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return 'M' + L.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'L' + Rr.reverse().map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
}
// titik pada kurva kubik bersambung (format: x0,y0, c1x,c1y, c2x,c2y, x1,y1, ...)
export function sampleCubic(pts, n = 24) {
  const bz = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d, out = [], segs = (pts.length - 2) / 6;
  for (let s = 0; s < segs; s++) { const o = s * 6; for (let i = 0; i < n; i++) { const t = i / n; out.push([bz(pts[o], pts[o + 2], pts[o + 4], pts[o + 6], t), bz(pts[o + 1], pts[o + 3], pts[o + 5], pts[o + 7], t)]); } }
  out.push([pts[pts.length - 2], pts[pts.length - 1]]); return out;
}
export const cubicD = (pts) => { let d = `M${pts[0]} ${pts[1]}`; for (let i = 2; i < pts.length; i += 6) d += `C${pts.slice(i, i + 6).join(' ')}`; return d; };

// ---------------------------------------------------------------- pembuluh bertaper (poligon dari pita) dengan volume filter, sorotan dan sisi gelap searah cahaya
// pts = titik garis tengah (hasil sampleCubic); w0 -> w1 = lebar awal dan akhir. Mengembalikan svg. o: dark, light, p, shadow
let _vid = 0;
export function vessel(pts, w0, w1, c, o = {}) {
  const p = o.p ?? 'a', dark = o.dark ?? darken(c, 0.5), light = o.light ?? lighten(c, 0.5), id = `${p}vs${_vid++}`;
  const E = o.ease ?? ((t) => t), poly = ribbon(pts, w0, w1, E), sh = (dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
  const wm = (w0 + w1) / 2;
  let s = '';
  if (o.shadow !== false) s += `<g filter="url(#${p}${o.shadowF ?? 'shadowS'})"><path d="${poly}" fill="${dark}"/></g>`;
  s += `<g filter="url(#${p}${o.filter ?? 'volV'})"><path d="${poly}" fill="${c}"/></g>`;
  s += `<clipPath id="${id}"><path d="${poly}"/></clipPath><g clip-path="url(#${id})">`;
  s += `<path d="${ribbon(sh(wm * 0.3, wm * 0.3), w0 * 0.34, w1 * 0.34, E)}" fill="${dark}" opacity=".42" filter="url(#${p}blur4)"/>`;
  s += `<path d="${ribbon(sh(-wm * 0.2, -wm * 0.2), w0 * 0.24, w1 * 0.24, E)}" fill="${light}" opacity=".62" filter="url(#${p}blur4)"/>`;
  s += `<path d="${ribbon(sh(-wm * 0.26, -wm * 0.26), w0 * 0.08, w1 * 0.08, E)}" fill="#fff" opacity=".7" filter="url(#${p}blur2)"/>`;
  s += `</g>`;
  return s;
}
// ujung potong pembuluh: elips lumen tegak lurus arah pembuluh. (x,y) ujung, ang = arah garis tengah di ujung (derajat), w = lebar pembuluh
export function endCap(x, y, ang, w, wall, lumen) {
  const rx = w / 2, ry = w / 2 * 0.36;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang + 90)})"><ellipse rx="${f1(rx)}" ry="${f1(ry)}" fill="${darken(wall, 0.35)}"/><ellipse rx="${f1(rx * 0.88)}" ry="${f1(ry * 0.82)}" fill="${lighten(wall, 0.25)}"/><ellipse rx="${f1(rx * 0.7)}" ry="${f1(ry * 0.6)}" fill="${lumen}"/><ellipse cx="${f1(-rx * 0.22)}" cy="${f1(-ry * 0.2)}" rx="${f1(rx * 0.32)}" ry="${f1(ry * 0.2)}" fill="#fff" opacity=".28"/></g>`;
}
export const tangent = (pts, atEnd = true) => { const n = pts.length, a = atEnd ? pts[n - 3] : pts[2], b = atEnd ? pts[n - 1] : pts[0]; return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; };

// ---------------------------------------------------------------- relief dari peta tinggi: alpha sebuah gambar SVG (koordinat kanvas) dianggap tinggi permukaan, lalu diterangi (diffuse x warna + specular).
// Memungkinkan beberapa gundukan terpisah (mis. ventrikel kanan dan kiri dengan alur di antaranya) yang tidak bisa didapat dari relief siluet tunggal.
// heightInner = isi SVG peta tinggi (bentuk putih dengan alpha = tinggi). Gunakan mound() untuk gundukan lembut. o: scale (skala tinggi), blur, elev (sudut cahaya), k (gain diffuse), spec, specExp.
export const mound = (cx, cy, rx, ry, a = 1, rot = 0) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#mnd)" opacity="${a}" transform="rotate(${rot} ${f1(cx)} ${f1(cy)})"/>`;
export const MOUND_DEFS = '<defs><radialGradient id="mnd"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".55" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
export function reliefFilter(id, heightInner, o = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${MOUND_DEFS}${heightInner}</svg>`;
  const href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), S = o.scale ?? 200, el = o.elev ?? 52, bl = o.blur ?? 6, k = o.k ?? 1.3, sp = o.spec ?? 0.55, se = o.specExp ?? 20;
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
 <feImage href="${href}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" result="hm0"/>
 <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="nz"/>
 <feColorMatrix in="nz" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.02 0" result="nza"/>
 <feComposite in="hm0" in2="nza" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.01" result="hm"/>
 <feGaussianBlur in="hm" stdDeviation="${bl}" result="hb"/>
 <feDiffuseLighting in="hb" surfaceScale="${S}" diffuseConstant="1.05" lighting-color="#ffffff" result="d"><feDistantLight azimuth="225" elevation="${el}"/></feDiffuseLighting>
 <feSpecularLighting in="hb" surfaceScale="${S}" specularConstant="${sp}" specularExponent="${se}" lighting-color="#fff4ea" result="s"><feDistantLight azimuth="225" elevation="${el}"/></feSpecularLighting>
 <feComposite in="d" in2="SourceAlpha" operator="in" result="d2"/><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
 <feComposite in="SourceGraphic" in2="d2" operator="arithmetic" k1="${k}" k2="0" k3="0" k4="0" result="lit"/>
 <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0"/>
</filter>`;
}
