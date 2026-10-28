import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { URL, fileURLToPath } from 'node:url';
import { NOTES_MARK, isNotesV2, objectivesOf, parseNotes, tocOf } from './notesMarkup.js';

const SAMPLE = `${NOTES_MARK}

## Tujuan Belajar {tujuan}

Setelah mempelajari bab ini, mahasiswa diharapkan mampu:

- menjelaskan **posisi anatomis**;
- membedakan bidang dan potongan.

## Konsep Dasar

Paragraf pertama
masih paragraf yang sama.

### Subjudul A

1. satu
2. dua

![Posisi anatomis.](https://lh3.googleusercontent.com/d/ABC123 "Sumber: Wikimedia Commons, CC BY 3.0")

> [!klinis] Clinical anchor
> Dislokasi bahu sering anterior.
>
> - butir dalam kotak

## Clinical Correlations {klinis}

Teks.

## High-Yield {highyield}

- poin satu
- poin dua

# Bagian B: Genitalia

## Setelah bagian

Isi.

## Sumber & Atribusi {sumber}

- Buku A
`;

test('format v2 dikenali lewat penanda di baris pertama', () => {
  assert.equal(isNotesV2(SAMPLE), true);
  assert.equal(isNotesV2(`\n  ${NOTES_MARK}\nteks`), true);
  assert.equal(isNotesV2('**Definisi**: teks biasa'), false);
  assert.equal(isNotesV2(''), false);
  assert.equal(isNotesV2(null), false);
});

test('bagian, jenis, dan penomoran', () => {
  const d = parseNotes(SAMPLE);
  assert.deepEqual(d.sections.map((s) => [s.kind, s.number]), [
    ['tujuan', null], ['isi', 1], ['klinis', 2], ['highyield', null], ['isi', 3], ['sumber', null],
  ]);
  assert.equal(d.items.filter((i) => i.type === 'part').length, 1);
  const part = d.items.find((i) => i.type === 'part');
  assert.equal(part.label, 'Bagian B');
  assert.equal(part.title, 'Genitalia');
  assert.equal(new Set(d.sections.map((s) => s.id)).size, d.sections.length);
});

test('paragraf, subjudul, daftar, gambar, dan kotak sorot', () => {
  const s = parseNotes(SAMPLE).sections[1];
  assert.deepEqual(s.blocks.map((b) => b.type), ['p', 'h3', 'list', 'figure', 'callout']);
  assert.equal(s.blocks[0].text, 'Paragraf pertama\nmasih paragraf yang sama.');
  assert.equal(s.blocks[2].ordered, true);
  assert.deepEqual(s.blocks[2].items, ['satu', 'dua']);
  const fig = s.blocks[3];
  assert.deepEqual([fig.n, fig.caption, fig.url, fig.credit], [1, 'Posisi anatomis.', 'https://lh3.googleusercontent.com/d/ABC123', 'Sumber: Wikimedia Commons, CC BY 3.0']);
  const co = s.blocks[4];
  assert.equal(co.variant, 'klinis');
  assert.equal(co.title, 'Clinical anchor');
  assert.deepEqual(co.blocks.map((b) => b.type), ['p', 'list']);
  assert.equal(s.subs.length, 1);
});

test('tujuan belajar dan daftar isi', () => {
  const d = parseNotes(SAMPLE);
  assert.deepEqual(objectivesOf(d), ['menjelaskan **posisi anatomis**;', 'membedakan bidang dan potongan.']);
  const toc = tocOf(d);
  assert.equal(toc.length, d.items.length);
  assert.equal(toc.find((t) => t.title === 'Konsep Dasar').subs[0].title, 'Subjudul A');
});

test('kata dan menit baca', () => {
  const d = parseNotes(`${NOTES_MARK}\n\n## A\n\n${'kata '.repeat(380)}`);
  assert.ok(d.words >= 380);
  assert.equal(d.minutes, 2);
});

test('teks sebelum bagian pertama dan jenis tak dikenal tidak hilang', () => {
  const d = parseNotes(`${NOTES_MARK}\n\nPembuka.\n\n## Judul {aneh}\n\nIsi.`);
  assert.equal(d.sections[0].kind, 'intro');
  assert.equal(d.sections[0].blocks[0].text, 'Pembuka.');
  assert.equal(d.sections[1].title, 'Judul {aneh}');
  assert.equal(d.sections[1].kind, 'isi');
});

// Semua catatan yang dikirim bersama kode harus terurai utuh.
const root = fileURLToPath(new URL('../../../pocketbase/content/materi/', import.meta.url));
test('catatan di apps/pocketbase/content/materi terurai utuh', { skip: !existsSync(`${root}index.json`) }, () => {
  const index = JSON.parse(readFileSync(`${root}index.json`, 'utf8'));
  assert.ok(index.length > 0);
  const seen = new Set();
  for (const e of index) {
    const key = `${e.subject}/${e.chapter}`;
    assert.ok(!seen.has(key), `BAB ganda: ${key}`);
    seen.add(key);
    const text = readFileSync(`${root}${e.file}`, 'utf8');
    assert.ok(isNotesV2(text), `${e.file}: tanpa penanda`);
    assert.ok(text.length < 200000, `${e.file}: melebihi batas koleksi`);
    const d = parseNotes(text);
    assert.ok(d.sections.length >= 5, `${e.file}: terlalu sedikit bagian`);
    assert.ok(d.words > 1500, `${e.file}: terlalu pendek`);
    assert.equal(d.figures, (text.match(/^!\[/gm) || []).length, `${e.file}: gambar hilang`);
    assert.ok(!/•/.test(text), `${e.file}: sisa butir mentah`);
    for (const s of d.sections) {
      if (s.kind === 'intro') continue;
      assert.ok(s.title.trim(), `${e.file}: bagian tanpa judul`);
      assert.ok(s.blocks.length > 0, `${e.file}: bagian kosong "${s.title}"`);
    }
    for (const s of d.sections) for (const b of s.blocks) {
      if (b.type === 'figure') assert.match(b.url, /^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/, `${e.file}: tautan gambar`);
      if (b.type === 'figure') assert.ok(b.caption, `${e.file}: gambar tanpa keterangan`);
      if (b.type === 'callout') assert.ok(b.blocks.length > 0, `${e.file}: kotak kosong`);
    }
    // Setiap BAB punya tujuan belajar atau ringkasan, kecuali BAB gaya lama yang memang tanpa tujuan.
    assert.ok(d.sections.some((s) => s.kind === 'highyield'), `${e.file}: tanpa ringkasan high-yield`);
  }
  const files = readdirSync(`${root}${index[0].subject}`);
  assert.equal(files.length, index.filter((e) => e.subject === index[0].subject).length, 'file tanpa entri index');
});
