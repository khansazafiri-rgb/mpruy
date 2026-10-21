// Nada warna per mata kuliah, supaya kartu dan stiker mudah dibedakan.
// Nada diturunkan dari slug/illustrationKey (stabil antar halaman).
export const TONES = ['mint', 'sky', 'lilac', 'peach', 'sun', 'rose'];

export function toneOf(key) {
  const s = String(key || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

export const toneClass = (key) => `tone-${toneOf(key)}`;
