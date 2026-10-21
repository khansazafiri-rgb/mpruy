// TEKS SOAL -> HTML (bagian murni, tanpa DOM, supaya bisa dites di Node)
//
// Satu bidang teks boleh berisi:
// - HTML sederhana seperti di web lama (<b>, <sub>, <table>, <img>, ...);
// - penanda ringkas: **tebal**, *miring*, ~subskrip~, ^superskrip^,
//   ==sorotan==, [teks](https://tautan);
// - tautan gambar Google Drive/lh3 yang berdiri sendiri, ditampilkan sebagai
//   gambar (perilaku web lama);
// - Enter biasa, ditampilkan sebagai pindah baris.
// Hasilnya selalu disaring lagi oleh sanitize() di content.js sebelum tampil.

const LH3 = 'https://lh3.googleusercontent.com/d/';

export function driveToLh3(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.startsWith('https://lh3.googleusercontent.com/')) return s;
  const m =
    s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/) ||
    s.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/) ||
    s.match(/docs\.google\.com\/[^?]*[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return LH3 + m[1];
  return s;
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const HAS_HTML = /<\/?(?:p|div|br|b|strong|i|em|u|s|sub|sup|mark|span|ul|ol|li|table|thead|tbody|tr|td|th|img|a|h[1-6]|small|code|blockquote|hr)\b[^>]*>/i;

const IMAGE_LINK = /(https?:\/\/lh3\.googleusercontent\.com\/[^\s<>"')\]]+|https?:\/\/drive\.google\.com\/(?:file\/d\/[\w-]{10,}[^\s<>"')\]]*|(?:open|uc)\?[^\s<>"')\]]*))/g;

function imageTag(url) {
  const src = driveToLh3(url.replace(/[.,;:!?]+$/, ''));
  if (!src.startsWith(LH3) && !src.startsWith('https://lh3.googleusercontent.com/')) return escapeHtml(url);
  return `<img src="${escapeHtml(src)}" alt="Gambar" loading="lazy" class="rich-img">`;
}

// Penanda ringkas pada teks yang sudah di-escape.
function inlineMarks(s) {
  return s
    .replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`)
    .replace(/\*\*(?=\S)([^*\n]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(>])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?=$|[\s.,;:!?)<])/g, '$1<em>$2</em>')
    .replace(/==(?=\S)([^=\n]*?\S)==/g, '<mark>$1</mark>')
    .replace(/~(?=[^\s~])([^~\n]{1,40}?)~/g, '<sub>$1</sub>')
    .replace(/\^(?=[^\s^])([^^\n]{1,40}?)\^/g, '<sup>$1</sup>');
}

const TAG_BLOK = /^(p|div|br|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|h[1-6]|blockquote|pre|hr|img|figure|figcaption|section)$/i;

// Enter -> <br>, kecuali yang menempel pada tag blok (port dari web lama).
function newlines(html) {
  const s = String(html).replace(/\r\n?/g, '\n');
  if (!s.includes('\n')) return s;
  const lines = s.split('\n');
  const endsBlock = (t) => { const m = /<\/?([a-zA-Z0-9]+)[^>]*>\s*$/.exec(t); return !!(m && TAG_BLOK.test(m[1])); };
  const startsBlock = (t) => { const m = /^\s*<\/?([a-zA-Z0-9]+)[^>]*>/.exec(t); return !!(m && TAG_BLOK.test(m[1])); };
  let out = lines[0];
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const cur = lines[i];
    const empty = !cur.trim() || !prev.trim();
    out += (!empty && (endsBlock(prev) || startsBlock(cur)) ? '\n' : '<br>') + cur;
  }
  return out;
}

export function markupToHtml(text) {
  const raw = String(text ?? '');
  if (!raw) return '';
  if (HAS_HTML.test(raw)) {
    // HTML lama: tautan gambar telanjang di antara tag tetap jadi gambar.
    const parts = raw.split(/(<[^>]*>)/);
    let inTag = 0;
    const html = parts.map((p) => {
      if (p.startsWith('<')) {
        if (/^<a[\s>]/i.test(p)) inTag++;
        else if (/^<\/a>/i.test(p)) inTag = Math.max(0, inTag - 1);
        return p;
      }
      return inTag ? p : p.replace(IMAGE_LINK, (u) => {
        const link = u.replace(/[.,;:!?]+$/, '');
        return imageTag(link) + u.slice(link.length);
      });
    }).join('');
    return newlines(html);
  }
  let out = '';
  let last = 0;
  for (const m of raw.matchAll(IMAGE_LINK)) {
    const link = m[0].replace(/[.,;:!?]+$/, '');
    out += inlineMarks(escapeHtml(raw.slice(last, m.index)));
    out += imageTag(link);
    last = m.index + link.length;
  }
  out += inlineMarks(escapeHtml(raw.slice(last)));
  return newlines(out);
}

// Teks polos untuk ringkasan (daftar soal admin, pencarian).
export function plainText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!Array.isArray(content)) return '';
  return content.map((b) => {
    if (b.type === 'list') return b.items.map(plainText).join(' ');
    if (b.type === 'table') return b.rows.map((r) => r.map((c) => plainText(c.text)).join(' ')).join(' ');
    if (b.type === 'note') return plainText(b.content);
    return plainText(b.text || b.caption || '');
  }).join(' ').trim();
}
