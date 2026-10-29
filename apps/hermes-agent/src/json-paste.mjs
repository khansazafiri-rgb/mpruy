// Pembantu murni untuk JSON yang ditempel langsung di chat Telegram (tanpa file).
// Telegram membatasi satu pesan 4096 karakter, jadi JSON panjang datang sebagai beberapa pesan
// yang disambung lagi di sini.

export const TELEGRAM_MESSAGE_LIMIT = 4096;

// "/put KODE isi..." atau "/put isi..." atau "/put@nama_bot KODE\nisi...".
// KODE opsional; bila kosong pemanggil memakai pengajuan yang terakhir diumumkan.
export function parsePut(text) {
  const m = /^\/put(?:@[A-Za-z0-9_]+)?(?=\s|$)([\s\S]*)$/i.exec(String(text || '').trim());
  if (!m) return null;
  let rest = m[1].replace(/^[ \t]+/, '');
  let code = '';
  const c = /^([A-Za-z0-9][A-Za-z0-9_-]{2,39})(?=\s|$)/.exec(rest);
  if (c && !/^(true|false|null)$/i.test(c[1])) {
    code = c[1];
    rest = rest.slice(c[0].length);
  }
  return { code, body: rest.replace(/^\s+/, '') };
}

// Buang pagar kode markdown ```json ... ``` yang kadang ikut tertempel.
export function stripFences(text) {
  let s = String(text || '').trim();
  s = s.replace(/^```[A-Za-z0-9_-]*[ \t]*\r?\n?/, '');
  s = s.replace(/\r?\n?```[ \t]*$/, '');
  return s.trim();
}

// Pesan yang panjangnya mendekati batas Telegram hampir pasti terpotong paksa di tengah isi,
// jadi disambung tanpa pemisah. Pesan yang lebih pendek disambung dengan baris baru.
export function joinChunks(chunks) {
  let out = '';
  chunks.forEach((chunk, i) => {
    const part = stripFences(chunk);
    if (i === 0) { out = part; return; }
    const prev = String(chunks[i - 1] || '');
    out += (prev.length >= TELEGRAM_MESSAGE_LIMIT - 96 ? '' : '\n') + part;
  });
  return out;
}

// Mengembalikan { ok:true, value } atau { ok:false, error, line, column }.
export function tryParse(raw) {
  const text = String(raw || '');
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    const pos = /position (\d+)/i.exec(String(err.message || ''));
    let line = 0;
    let column = 0;
    if (pos) {
      const before = text.slice(0, Number(pos[1]));
      line = before.split('\n').length;
      column = before.length - before.lastIndexOf('\n');
    }
    const error = String(err.message || 'JSON tidak valid').replace(/\s*\(line \d+ column \d+\)\s*$/, '');
    return { ok: false, error, line, column };
  }
}

export function countQuestions(parsed) {
  if (Array.isArray(parsed)) return parsed.length;
  if (Array.isArray(parsed?.questions)) return parsed.questions.length;
  if (Array.isArray(parsed?.items)) return parsed.items.length;
  return 0;
}

// Kode pengajuan yang bentuknya MC + 6 angka + 4 karakter, dicari di teks bebas.
export function findSubmissionCode(text) {
  return /MC\d{6}-[A-Z0-9]{4}/i.exec(String(text || ''))?.[0]?.toUpperCase() || '';
}
