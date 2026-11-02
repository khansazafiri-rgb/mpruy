import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const slides = require('../pb_hooks/lib/slides.js');
const LH3 = (id) => 'https://lh3.googleusercontent.com/d/' + id;

test('daftar bernomor dengan anak bertab: nomor, huruf, lalu butir', () => {
  const blocks = slides.parseMarkdown('Pengantar singkat.\n\n1. Langkah satu\n\t- anak a\n\t- anak b\n\t\t1. cucu\n2. Langkah dua\n3. Langkah tiga');
  assert.equal(blocks[0].type, 'paragraph');
  const list = blocks[1];
  assert.equal(list.type, 'list');
  assert.equal(list.style, 'number');
  assert.equal(list.items.length, 3);
  assert.deepEqual(list.items.map((x) => x.text), ['Langkah satu', 'Langkah dua', 'Langkah tiga']);
  const kids = list.items[0].children[0];
  assert.equal(kids.style, 'bullet');
  assert.deepEqual(kids.items.map((x) => x.text), ['anak a', 'anak b']);
  assert.equal(kids.items[1].children[0].style, 'number');
  assert.equal(kids.items[1].children[0].items[0].text, 'cucu');
});

test('spasi dua atau empat sama dengan tab; kembali ke tingkat atas melanjutkan daftar yang sama', () => {
  for (const unit of ['  ', '    ', '\t']) {
    const [list] = slides.parseMarkdown(`- A\n${unit}- A1\n${unit}${unit}- A1a\n${unit}- A2\n- B`);
    assert.equal(list.items.length, 2, JSON.stringify(list));
    assert.equal(list.items[0].children[0].items.length, 2);
    assert.equal(list.items[0].children[0].items[0].children[0].items[0].text, 'A1a');
  }
});

test('baris lanjutan yang menjorok menempel ke butir sebelumnya; emoji dibiarkan', () => {
  const [list] = slides.parseMarkdown('- 🦴 Tulang panjang\n   punya diafisis dan epifisis\n- 💪 Otot');
  assert.equal(list.items[0].text, '🦴 Tulang panjang\npunya diafisis dan epifisis');
  assert.equal(list.items[1].text, '💪 Otot');
});

test('heading, kotak sorot, kutipan, tabel, pemisah, daftar centang', () => {
  const blocks = slides.parseMarkdown([
    '## Fungsi', '', '> [!klinis] Klinis', '> Fraktur kolum femoris.', '> - nyeri', '> - pemendekan', '',
    '> hanya kutipan', '', '| Otot | Aksi |', '|---|---|', '| Biseps | Fleksi |', '', '---', '',
    '- [ ] hafal', '- [x] paham',
  ].join('\n'));
  assert.deepEqual(blocks.map((b) => b.type), ['heading', 'callout', 'quote', 'table', 'divider', 'list']);
  assert.equal(blocks[1].kind, 'klinis');
  assert.equal(blocks[1].blocks[1].type, 'list');
  assert.deepEqual(blocks[3].rows, [['Biseps', 'Fleksi']]);
  assert.equal(blocks[5].style, 'check');
  assert.equal(blocks[5].items[1].checked, true);
});

test('paragraf yang menjorok membawa tingkat jorokan', () => {
  const [a, b, c] = slides.parseMarkdown('Utama\n\n\tMenjorok satu\n\n\t\tMenjorok dua');
  assert.equal(a.indent, undefined);
  assert.equal(b.indent, 1);
  assert.equal(c.indent, 2);
});

test('berkas: teks penjelasan, blok terstruktur, array bersarang, alias, dan tautan Drive', () => {
  const out = slides.parseDeck({
    judul: 'Osteologi 1',
    slides: [
      { gambar: 'https://drive.google.com/file/d/' + 'A'.repeat(30) + '/view', penjelasan: '1. Satu\n2. Dua' },
      { image: LH3('B'.repeat(30)), blocks: [{ type: 'heading', text: 'Judul' }, { type: 'list', style: 'number', items: ['a', ['a1', 'a2'], 'b'] }, { type: 'callout', kind: 'penting', title: 'Ingat', text: 'Isi **tebal**' }] },
      { images: [LH3('C'.repeat(30)), LH3('D'.repeat(30))], explanation: 'dua gambar' },
    ],
  });
  assert.equal(out.ok, true, JSON.stringify(out.items));
  assert.equal(out.deck.title, 'Osteologi 1');
  assert.equal(out.slideCount, 3);
  assert.equal(out.deck.slides[0].images[0], LH3('A'.repeat(30)));
  const list = out.deck.slides[1].blocks[1];
  assert.equal(list.items[0].children[0].style, 'alpha');
  assert.equal(list.items[0].children[0].items.length, 2);
  assert.equal(out.deck.slides[1].blocks[2].kind, 'highyield');
  assert.equal(out.deck.slides[2].images.length, 2);
});

test('galat jelas: gambar bukan lh3, slide kosong, tanpa daftar slide', () => {
  const bad = slides.parseDeck({ slides: [{ image: 'https://evil.example/x.png', explanation: 'x' }, {}] });
  assert.equal(bad.blocked, true);
  assert.equal(bad.items.length, 2);
  assert.match(bad.items[0].errors[0], /lh3/);
  assert.match(bad.items[1].errors[0], /kosong/);
  assert.equal(slides.parseDeck({ nothing: 1 }).blocked, true);
  assert.equal(slides.parseDeck('bukan json {{{').blocked, true);
});

test('array JavaScript longgar diterima seperti format soal', () => {
  const out = slides.parseDeck(`[{ image: '${LH3('E'.repeat(30))}', explanation: 'ok', },]`);
  assert.equal(out.ok, true, JSON.stringify(out.items));
  assert.equal(out.deck.slides.length, 1);
});

test('teks bukan HTML: tag dibiarkan sebagai teks biasa dan tidak mengubah struktur', () => {
  const [p] = slides.parseMarkdown('<img src=x onerror=alert(1)>');
  assert.equal(p.type, 'paragraph');
  assert.equal(p.text, '<img src=x onerror=alert(1)>');
});
