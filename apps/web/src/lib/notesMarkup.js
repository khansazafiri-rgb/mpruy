// CATATAN MATERI (format "materi:v2") -> struktur bagian, tanpa DOM supaya bisa dites di Node.
//
// Catatan satu BAB ditulis sebagai Markdown ringkas. File pertama baris-nya penanda:
//
//   <!-- materi:v2 -->
//   ## Tujuan Belajar {tujuan}         bagian; {tujuan|klinis|highyield|praktikum|sumber|kartu} opsional
//   # Bagian A: Urinary Tract           pembatas bagian besar (BAB yang sangat panjang)
//   ### Subjudul
//   paragraf biasa (baris berurutan = satu paragraf)
//   - butir   /  1. butir berurut
//   ![Keterangan gambar](https://lh3.googleusercontent.com/d/ID "Sumber: ... lisensi")
//   > [!klinis] Judul kotak           kotak sorot: klinis | warning | highyield | tip | info
//   > isi kotak (paragraf / butir)
//
//   ## Flashcard {kartu}                bagian khusus flashcard (tidak tampil di bacaan):
//   - [Konteks] Depan :: Belakang       satu kartu per butir; "[Konteks] " opsional
//
// Teks di dalam paragraf, butir, dan kotak tetap memakai penanda ringkas
// (**tebal**, *miring*, ==sorotan==, ~sub~, ^sup^, [teks](tautan)) yang dirender oleh
// markup.js. Catatan tanpa penanda dianggap format lama dan ditampilkan apa adanya.

export const NOTES_MARK = '<!-- materi:v2 -->';

export function isNotesV2(text) {
  return String(text || '').trimStart().startsWith(NOTES_MARK);
}

export const SECTION_KINDS = ['tujuan', 'klinis', 'highyield', 'praktikum', 'sumber', 'kartu'];
const CALLOUT_VARIANTS = ['klinis', 'warning', 'highyield', 'tip', 'praktikum', 'info'];
// Jenis bagian yang diberi nomor urut di daftar isi.
const NUMBERED = new Set(['isi', 'klinis']);

const RE_PART = /^#\s+(.*\S)\s*$/;
const RE_SECTION = /^##\s+(.*?)\s*(?:\{(\w+)\})?\s*$/;
const RE_H3 = /^###\s+(.*\S)\s*$/;
const RE_FIGURE = /^!\[(.*)\]\((\S+?)(?:\s+"(.*)")?\)\s*$/;
const RE_LIST = /^(?:-|\d{1,3}\.)\s+(\S.*)$/;
const RE_ORDERED = /^\d{1,3}\.\s/;
const RE_CALLOUT = /^\[!(\w+)\]\s*(.*)$/;

const isBlank = (l) => !l.trim();
const isBlockStart = (l) => /^(#{1,3}\s|!\[|>)/.test(l) || RE_LIST.test(l);

/** Teks polos (tanpa penanda) untuk menghitung kata dan membuat id. */
export function stripMarks(s) {
  return String(s || '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|==|[*~^]/g, '')
    .replace(/<[^>]+>/g, ' ');
}

function slugify(s) {
  return stripMarks(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

// Paragraf dan butir saja (isi kotak sorot).
function parseSimple(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (isBlank(lines[i])) { i++; continue; }
    if (RE_LIST.test(lines[i])) {
      const ordered = RE_ORDERED.test(lines[i]);
      const items = [];
      while (i < lines.length && RE_LIST.test(lines[i])) { items.push(lines[i].match(RE_LIST)[1].trim()); i++; }
      out.push({ type: 'list', ordered, items });
      continue;
    }
    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && !RE_LIST.test(lines[i])) { para.push(lines[i].trim()); i++; }
    out.push({ type: 'p', text: para.join('\n') });
  }
  return out;
}

const RE_CARD = /^(?:\[([^\]]+)\](?!\())?\s*([\s\S]+?)\s::\s([\s\S]+)$/;

// Kode pendek stabil dari isi kartu, supaya tanda "hafal" tetap berlaku setelah catatan diperbarui.
export function cardKey(front, back) {
  let h = 5381;
  const s = `${front}\u0001${back}`;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function cardsOf(section) {
  const out = [];
  section.blocks.forEach((b) => {
    if (b.type !== 'list') return;
    b.items.forEach((it) => {
      const m = it.match(RE_CARD);
      if (!m) return;
      const front = m[2].trim();
      const back = m[3].trim();
      out.push({ id: cardKey(front, back), ctx: (m[1] || '').trim(), front, back });
    });
  });
  return out;
}

export function parseNotes(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const doc = { items: [], sections: [], figures: 0, words: 0, minutes: 1, parts: 0, cards: [] };
  let section = null;
  let n = 0; // nomor bagian bernomor
  let secSeq = 0;
  let figSeq = 0;
  const idUsed = new Set();
  const uniq = (base) => {
    let id = base || 'bagian';
    let k = 2;
    while (idUsed.has(id)) id = `${base}-${k++}`;
    idUsed.add(id);
    return id;
  };

  const open = (title, kind) => {
    secSeq++;
    const numbered = NUMBERED.has(kind);
    section = {
      type: 'section', id: uniq(`b${secSeq}`), kind, title, number: numbered ? ++n : null,
      blocks: [], subs: [],
    };
    doc.items.push(section);
    doc.sections.push(section);
  };
  const ensure = () => { if (!section) open('', 'intro'); return section; };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line) || line.trim() === NOTES_MARK) { i++; continue; }

    let m;
    if ((m = line.match(RE_H3))) {
      const sec = ensure();
      const sub = { id: uniq(`${sec.id}-${sec.subs.length + 1}`), title: m[1] };
      sec.subs.push(sub);
      sec.blocks.push({ type: 'h3', id: sub.id, text: m[1] });
      i++;
      continue;
    }
    if ((m = line.match(RE_SECTION)) && line.startsWith('## ')) {
      const kind = SECTION_KINDS.includes(m[2]) ? m[2] : 'isi';
      const title = m[2] && kind === 'isi' ? `${m[1]} {${m[2]}}` : m[1];
      open(title, kind);
      i++;
      continue;
    }
    if ((m = line.match(RE_PART)) && line.startsWith('# ')) {
      const label = m[1].match(/^(Bagian\s+\S+?):\s*(.*)$/);
      const part = { type: 'part', id: uniq(`p${++doc.parts}`), label: label ? label[1] : '', title: label ? label[2] : m[1] };
      doc.items.push(part);
      section = null;
      i++;
      continue;
    }
    if ((m = line.match(RE_FIGURE))) {
      // Beberapa baris gambar berurutan = satu galeri; keterangan ada di baris terakhir.
      const figs = [];
      while (i < lines.length) {
        const f = lines[i].match(RE_FIGURE);
        if (!f) break;
        figs.push(f);
        i++;
      }
      const end = figs[figs.length - 1];
      ensure().blocks.push({ type: 'figure', n: ++figSeq, caption: (end[1] || '').trim(), url: figs[0][2], urls: figs.map((f) => f[2]), credit: (end[3] || '').trim() });
      continue;
    }
    if (line.startsWith('>')) {
      const inner = [];
      while (i < lines.length && lines[i].startsWith('>')) { inner.push(lines[i].replace(/^>\s?/, '')); i++; }
      let variant = 'info';
      let title = '';
      const head = inner[0] && inner[0].match(RE_CALLOUT);
      if (head) {
        variant = CALLOUT_VARIANTS.includes(head[1]) ? head[1] : 'info';
        title = head[2].trim();
        inner.shift();
      }
      ensure().blocks.push({ type: 'callout', variant, title, blocks: parseSimple(inner) });
      continue;
    }
    if (RE_LIST.test(line)) {
      const ordered = RE_ORDERED.test(line);
      const items = [];
      while (i < lines.length && RE_LIST.test(lines[i])) {
        let item = lines[i].match(RE_LIST)[1].trim();
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) { item += `\n${lines[i].trim()}`; i++; } // lanjutan butir
        items.push(item);
      }
      ensure().blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && !isBlockStart(lines[i])) { para.push(lines[i].trim()); i++; }
    if (para.length) ensure().blocks.push({ type: 'p', text: para.join('\n') });
    else i++;
  }

  // Bagian {kartu} dipisahkan dari bacaan: isinya dipakai halaman flashcard.
  doc.cards = [];
  const k = doc.sections.findIndex((x) => x.kind === 'kartu');
  if (k >= 0) {
    doc.cards = cardsOf(doc.sections[k]);
    doc.items = doc.items.filter((x) => x !== doc.sections[k]);
    doc.sections.splice(k, 1);
  }
  doc.figures = figSeq;
  let words = 0;
  const count = (s) => { words += (stripMarks(s).match(/\S+/g) || []).length; };
  const walk = (blocks) => blocks.forEach((b) => {
    if (b.type === 'p' || b.type === 'h3') count(b.text);
    else if (b.type === 'list') b.items.forEach(count);
    else if (b.type === 'callout') walk(b.blocks);
  });
  doc.sections.forEach((s) => { count(s.title); walk(s.blocks); });
  doc.words = words;
  doc.minutes = Math.max(1, Math.round(words / 190));
  return doc;
}

/** Daftar isi: bagian dan subjudulnya, plus pembatas bagian besar. */
export function tocOf(doc) {
  return doc.items.map((it) => (it.type === 'part'
    ? { type: 'part', id: it.id, label: it.label, title: it.title }
    : { type: 'section', id: it.id, kind: it.kind, number: it.number, title: it.title, subs: it.subs }));
}

/** Tujuan belajar (butir daftar pertama) untuk ringkasan di kepala halaman. */
export function objectivesOf(doc) {
  const s = doc.sections.find((x) => x.kind === 'tujuan');
  if (!s) return [];
  const list = s.blocks.find((b) => b.type === 'list');
  return list ? list.items : [];
}

export const slugOf = slugify;
