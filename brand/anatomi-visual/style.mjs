// Sistem gaya visual anatomi MEDCOEL (dibuat dari kode, SVG murni, tanpa gambar tempel).
// Satu palet dasar dan aturan yang sama dipakai semua organ: cahaya dari kiri atas, gradasi radial untuk permukaan padat,
// gradasi horizontal untuk tabung (pembuluh), garis tepi gelap yang tidak hitam pekat, dan bayangan lembut.
// Setiap organ punya warnanya sendiri di ORGAN; organ baru cukup menambah satu entri tanpa mengubah aturan lain.

export const CANVAS = { w: 1080, h: 1920 };

export const PALETTE = {
  bgTop: '#1C0820', bgMid: '#3A0E3E', bgBottom: '#12041A',
  glow: '#C42A6A', ink: '#FBEFF2', outline: '#2A0A12', shadow: '#080210',
};

// base = warna utama, light = sorotan (kiri atas), dark = bayangan (kanan bawah)
export const ORGAN = {
  muscle: { base: '#D42A35', light: '#FF7C7C', dark: '#6A0E1E', spec: '#FFE6E6' },      // otot jantung (merah cerah, mengilap)
  fat: { base: '#F2C94C', light: '#FFF6C4', dark: '#B5861E' },                          // lemak di alur
  artery: { base: '#D0302E', light: '#FF9488', dark: '#640F14' },                       // arteri (merah)
  pulmArtery: { base: '#4A7FD8', light: '#B8DCFF', dark: '#1B3C72' },                  // arteri paru (biru muda)
  vein: { base: '#3F4FD0', light: '#A2B6FF', dark: '#181E6A' },                        // vena (biru)
  enamel: { base: '#F4F6FA', light: '#FFFFFF', dark: '#C5CAD8' },
  dentin: { base: '#E8B872', light: '#F9E2AE', dark: '#A8743A' },
  pulp: { base: '#D2344C', light: '#FF8C9C', dark: '#5C0F1E' },
  cementum: { base: '#E8D7B4', light: '#F7EEDA', dark: '#B09468' },
  gingiva: { base: '#E06A7C', light: '#FFB6C2', dark: '#8E2A3E' },
  bone: { base: '#E2C9A0', light: '#F5E6C8', dark: '#A88A5C' },
  nerve: { base: '#F2C84A', light: '#FFF4AE', dark: '#A8801A' },
};

export const OUTLINE = { width: 5, color: PALETTE.outline };

// ID gradien dan filter untuk satu gambar (uid unik agar aman bila banyak gambar dalam satu halaman)
export const gid = (uid, key, kind = 'r') => `${uid}-${kind}-${key}`;

/** Definisi gradien dan filter untuk semua organ pada satu uid. */
export function defs(uid) {
  let s = '<defs>';
  for (const [key, c] of Object.entries(ORGAN)) {
    // permukaan padat: radial, sorotan di kiri atas (fx, fy)
    s += `<radialGradient id="${gid(uid, key)}" cx="38%" cy="32%" r="72%" fx="34%" fy="28%">`
      + `<stop offset="0" stop-color="${c.light}"/><stop offset="0.55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>`;
    // tabung (pembuluh): horizontal dalam kotak pembatas, gelap-terang-gelap
    s += `<linearGradient id="${gid(uid, key, 't')}" x1="0" y1="0" x2="1" y2="0">`
      + `<stop offset="0" stop-color="${c.dark}"/><stop offset="0.36" stop-color="${c.base}"/><stop offset="0.52" stop-color="${c.light}"/>`
      + `<stop offset="0.7" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>`;
  }
  // bayangan jatuh lembut dan pemblur untuk kilau
  s += `<filter id="${uid}-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="6" dy="12" stdDeviation="11" flood-color="${PALETTE.shadow}" flood-opacity="0.5"/></filter>`;
  s += `<filter id="${uid}-sheen" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>`;
  s += `<filter id="${uid}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>`;
  s += `<filter id="${uid}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
  return s + '</defs>';
}

/** Latar gelap berlapis: gradien vertikal, cahaya di belakang objek, partikel halus (deterministik), vinyet. */
export function background(uid, { cx = 540, cy = 960, seed = 11, particles = 64 } = {}) {
  let s = `<rect width="${CANVAS.w}" height="${CANVAS.h}" fill="url(#${uid}-bg)"/>`;
  s += `<radialGradient id="${uid}-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${PALETTE.glow}" stop-opacity="0.42"/><stop offset="1" stop-color="${PALETTE.glow}" stop-opacity="0"/></radialGradient>`;
  s += `<radialGradient id="${uid}-vig" cx="50%" cy="48%" r="75%"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient>`;
  s = `<defs><linearGradient id="${uid}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE.bgTop}"/><stop offset="0.5" stop-color="${PALETTE.bgMid}"/><stop offset="1" stop-color="${PALETTE.bgBottom}"/></linearGradient>${s.slice(0, 0)}</defs>` + s;
  s += `<circle cx="${cx}" cy="${cy}" r="640" fill="url(#${uid}-glow)"/>`;
  let r = seed;
  const rnd = () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; };
  for (let i = 0; i < particles; i++) {
    const x = rnd() * CANVAS.w, y = rnd() * CANVAS.h, rad = 1 + rnd() * 3.2, o = 0.08 + rnd() * 0.28;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="${PALETTE.ink}" opacity="${o.toFixed(2)}"/>`;
  }
  s += `<rect width="${CANVAS.w}" height="${CANVAS.h}" fill="url(#${uid}-vig)"/>`;
  return s;
}

/** Tabung: satu jalur (d) dengan garis tepi gelap lalu isi gradien tabung. w = lebar isi (px dalam koordinat lokal). */
export function tube(d, key, w, uid, { outline = true, opacity = 1 } = {}) {
  const c = ORGAN[key];
  let s = '';
  if (outline) s += `<path d="${d}" fill="none" stroke="${OUTLINE.color}" stroke-width="${w + 7}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity * 0.9}"/>`;
  s += `<path d="${d}" fill="none" stroke="url(#${gid(uid, key, 't')})" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
  return s;
}

/** Tepi gelap untuk bentuk tertutup (isi radial + garis luar). */
export function solid(d, key, uid, { outline = true, opacity = 1, extra = '' } = {}) {
  let s = '';
  if (outline) s += `<path d="${d}" fill="none" stroke="${OUTLINE.color}" stroke-width="${OUTLINE.width}" stroke-linejoin="round" opacity="${opacity}"/>`;
  s += `<path d="${d}" fill="url(#${gid(uid, key)})" opacity="${opacity}" ${extra}/>`;
  return s;
}

/** Sorotan kilau lembut (elips putih, kabur). */
export function specular(cx, cy, rx, ry, rot, uid, o = 0.22) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#FFFFFF" opacity="${o}" filter="url(#${uid}-soft)"/>`;
}

/** Kilau memanjang di sisi kiri tabung (membuat pembuluh tampak mengilap). */
export function sheen(d, w, uid, o = 0.42) {
  return `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${Math.max(2, w * 0.16).toFixed(1)}" stroke-linecap="round" opacity="${o}" transform="translate(${(-w * 0.2).toFixed(1)} 0)" filter="url(#${uid}-sheen)"/>`;
}

/** Ujung tabung yang terpotong: cincin terang dan lubang gelap (tampak seperti pipa berongga). */
export function cap(x, y, w, ang, key, uid) {
  const c = ORGAN[key];
  return `<g transform="translate(${x} ${y}) rotate(${ang})">`
    + `<ellipse cx="0" cy="0" rx="${(w / 2).toFixed(1)}" ry="${(w * 0.22).toFixed(1)}" fill="${c.light}" stroke="${OUTLINE.color}" stroke-width="3"/>`
    + `<ellipse cx="0" cy="0" rx="${(w * 0.34).toFixed(1)}" ry="${(w * 0.1).toFixed(1)}" fill="${c.dark}" opacity="0.9"/></g>`;
}

/** Cabang pohon deterministik (untuk pembuluh koroner dan kapiler). rnd = fungsi acak deterministik. */
export function branches(pts, widthAt, key, uid, rnd, { depth = 2, spread = 0.7, len = 46, outline = false } = {}) {
  let s = '';
  const walk = (x, y, ang, L, w, d) => {
    if (d <= 0 || L < 8) return;
    const bend = (rnd() - 0.5) * 0.6;
    const x2 = x + Math.cos(ang) * L, y2 = y + Math.sin(ang) * L;
    const cx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * (rnd() - 0.5) * L * 0.35, cy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * (rnd() - 0.5) * L * 0.35;
    const d1 = `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    s += tube(d1, key, Math.max(1.5, w), uid, { outline });
    if (d > 1) {
      walk(x2, y2, ang + spread * (0.7 + rnd() * 0.5) + bend, L * 0.72, w * 0.62, d - 1);
      walk(x2, y2, ang - spread * (0.7 + rnd() * 0.5) + bend, L * 0.68, w * 0.62, d - 1);
    }
  };
  for (let i = 0; i < pts.length; i++) {
    const [x, y, ang] = pts[i];
    walk(x, y, ang, len * (0.7 + rnd() * 0.4), widthAt(i), depth);
  }
  return s;
}
