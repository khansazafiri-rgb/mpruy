// Jalur internal yang aman untuk navigate()/<Link> dari sumber yang bisa
// dikendalikan orang lain (parameter ?lanjut=, tautan notifikasi).
//
// React Router 6.x masih rentan open redirect lewat garis miring terbalik
// ("/\evil.com" dibaca browser sebagai "//evil.com"); perbaikannya baru ada di
// v7 (GHSA-wrjc-x8rr-h8h6). Selama masih di v6, semua jalur dinamis wajib
// lewat fungsi ini: hanya jalur relatif-root biasa yang diterima.
export function safeInternalPath(raw, fallback = '/beranda') {
  if (typeof raw !== 'string') return fallback;
  const p = raw.trim();
  if (!p.startsWith('/')) return fallback;
  // "//host" dan "/\host" sama-sama bisa menjadi alamat situs lain.
  if (p.startsWith('//') || p.startsWith('/\\')) return fallback;
  // Garis miring terbalik, karakter kontrol, dan spasi tidak dipakai di jalur web ini.
  if (p.includes('\\') || /\s/.test(p) || [...p].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)) return fallback;
  // Skema tersembunyi lewat encoding, mis. "/%5Cevil.com" atau "/%2F%2Fevil".
  let decoded = p;
  try { decoded = decodeURIComponent(p); } catch { return fallback; }
  if (decoded.startsWith('//') || decoded.includes('\\') || /^\/[a-z][a-z0-9+.-]*:/i.test(decoded)) return fallback;
  return p;
}
