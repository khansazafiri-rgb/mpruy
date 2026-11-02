// Pembantu murni untuk JSON yang ditempel langsung di chat Telegram (tanpa file).
// Telegram membatasi satu pesan 4096 karakter, jadi JSON panjang datang sebagai beberapa pesan
// yang disambung lagi di sini.

export const TELEGRAM_MESSAGE_LIMIT = 4096;

// "/put KODE isi..." atau "/put isi..." atau "/put@nama_bot KODE\nisi...".
// KODE opsional; bila kosong pemanggil memakai pengajuan yang terakhir diumumkan.
// Setelah KODE boleh ada nomor PDF ("/put KODE 2", "/put KODE #2", "/put KODE pdf 2"): judul di web diambil dari PDF itu.
// Nomornya sama dengan "/files KODE 2". Tanpa nomor: 0.
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
  let pdf = 0;
  if (code) {
    const n = /^[ \t]*(?:#|no\.?[ \t]*|nomor[ \t]*|pdf[ \t]*#?[ \t]*)?(\d{1,2})(?=\s|$)/i.exec(rest);
    if (n) { pdf = Number(n[1]); rest = rest.slice(n[0].length); }
  }
  return { code, pdf, body: rest.replace(/^\s+/, '') };
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

// Jumlah slide pada JSON materi: { slides: [...] }, { materi: { slides } }, atau array slide.
export function countSlides(parsed) {
  if (Array.isArray(parsed?.slides)) return parsed.slides.length;
  if (Array.isArray(parsed?.materi?.slides)) return parsed.materi.slides.length;
  if (Array.isArray(parsed) && looksLikeSlides(parsed)) return parsed.length;
  return 0;
}

const SLIDE_KEYS = ['image', 'gambar', 'images', 'imageUrl', 'lh3', 'explanation', 'penjelasan', 'blocks', 'keterangan'];
const QUESTION_KEYS = ['options', 'opsi', 'statements', 'pernyataan', 'answer', 'jawaban', 'correct', 'type', 'tipe'];
function looksLikeSlides(list) {
  const first = list.find((x) => x && typeof x === 'object');
  return !!first && SLIDE_KEYS.some((k) => k in first) && !QUESTION_KEYS.some((k) => k in first);
}

// Menebak isi JSON: "materi" (slide + penjelasan), "soal", atau "unknown". Dipakai untuk menolak JSON yang salah jalur
// sebelum rencana impor dibuat (server tetap memeriksa lagi).
export function detectKind(parsed) {
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    if (Array.isArray(parsed.slides) || Array.isArray(parsed.materi?.slides)) return 'materi';
    if (Array.isArray(parsed.questions) || Array.isArray(parsed.chapters)) return 'soal';
    return 'unknown';
  }
  if (Array.isArray(parsed) && parsed.length) {
    if (looksLikeSlides(parsed)) return 'materi';
    const first = parsed.find((x) => x && typeof x === 'object');
    if (first && QUESTION_KEYS.some((k) => k in first)) return 'soal';
    if (first && ('text' in first || 'pertanyaan' in first || 'question' in first)) return 'soal';
  }
  return 'unknown';
}

// Nomor PDF dari nama berkas JSON yang meniru nama PDF kiriman Hermes: "MC261029-SGV2_PDF-03-dari-10_nama.json" -> 3.
export function pdfNumberFromName(name) {
  const m = /_PDF-(\d{1,2})-dari-\d{1,2}(?:_|\.|$)/i.exec(String(name || ''));
  return m ? Number(m[1]) : 0;
}

// Judul bagian dari daftar berkas pengajuan (kontrak server: files[{ n, title }]).
// pdf = nomor yang dipilih (0 = belum); satu PDF saja dipakai otomatis.
// Mengembalikan { title, pdf, count, missing } (missing = nomor tidak ada) atau { title: '', pdf: 0, count } bila belum bisa ditentukan.
export function resolvePdf(files, pdf) {
  const list = Array.isArray(files) ? files : [];
  if (pdf) {
    const f = list.find((x) => Number(x.n) === pdf);
    return f ? { title: String(f.title || ''), pdf, count: list.length } : { title: '', pdf, count: list.length, missing: true };
  }
  if (list.length === 1) return { title: String(list[0].title || ''), pdf: 1, count: 1 };
  return { title: '', pdf: 0, count: list.length };
}

// Kode pengajuan yang bentuknya MC + 6 angka + 4 karakter, dicari di teks bebas.
export function findSubmissionCode(text) {
  return /MC\d{6}-[A-Z0-9]{4}/i.exec(String(text || ''))?.[0]?.toUpperCase() || '';
}
