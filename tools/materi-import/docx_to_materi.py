#!/usr/bin/env python3
"""Mengubah dokumen "Catatan Belajar Lengkap" (.docx) menjadi catatan materi per BAB.

Keluaran: satu file Markdown per BAB (format `materi:v2`, lihat docs/CATATAN_MATERI.md)
dan satu `index.json` yang memetakan tiap file ke BAB di web (mata kuliah + judul BAB).

  python3 tools/materi-import/docx_to_materi.py "Anatomi - Catatan Belajar.docx" \\
      --subject anatomi --subject-name Anatomi --report

Tidak ada yang ditulis ke database di sini; migrasi PocketBase (atau
apps/pocketbase/scripts/import-materi.mjs) yang memasukkannya.
"""
import argparse
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import flashcards

import docx
from docx.oxml.ns import qn

MARKER = '<!-- materi:v2 -->'

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CATALOG_MD = os.path.join(ROOT, 'docs', 'MATA_KULIAH.md')


def norm_words(s, keep_paren=False):
    """Kata-kata judul untuk mencocokkan judul di dokumen dengan judul BAB di web."""
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = s.replace('&', ' dan ')
    s = s if keep_paren else re.sub(r'\([^)]*\)', ' ', s)          # keterangan dalam kurung berbeda-beda antar sumber
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    return [w for w in s.split() if w not in ('dan', 'yang', 'dari', 'pada')]


def site_chapters(subject_name):
    """Daftar BAB mata kuliah di web (docs/MATA_KULIAH.md), sesuai urutan di sana."""
    text = open(CATALOG_MD, encoding='utf-8').read()
    m = re.search(r'^## %s\s*$(.*?)(?=^## |\Z)' % re.escape(subject_name), text, re.S | re.M)
    if not m:
        sys.exit(f'Mata kuliah "{subject_name}" tidak ada di docs/MATA_KULIAH.md')
    return [re.sub(r'^\d+\.\s+', '', ln).strip() for ln in m.group(1).splitlines() if re.match(r'^\d+\.\s', ln)]


def title_score(doc_title, site_title):
    """Kemiripan judul (0-1). Keterangan dalam kurung boleh ikut dihitung atau tidak; yang lebih cocok dipakai."""
    best = 0.0
    for keep in (False, True):
        dw, sw = set(norm_words(doc_title, keep)), set(norm_words(site_title, keep))
        best = max(best, len(dw & sw) / max(1, len(dw | sw)))
    return best


def match_titles(doc_titles, site_titles, allow_missing=False):
    """{nomor BAB di dokumen: judul BAB di web}; berhenti bila ada yang tak cocok atau ganda.
    allow_missing: BAB di web yang tidak ada di dokumen (mis. BAB masih kosong) hanya dilaporkan."""
    pairs = []
    for num, dt in doc_titles.items():
        for st in site_titles:
            pairs.append((title_score(dt, st), num, st))
    pairs.sort(reverse=True)
    out, used = {}, set()
    for score, num, st in pairs:
        if num in out or st in used or score < 0.5:
            continue
        out[num] = st
        used.add(st)
    problems = [f'Bab {n} — {t}' for n, t in doc_titles.items() if n not in out]
    left = [s for s in site_titles if s not in used]
    if left and not problems and allow_missing:
        print('** BAB di web tanpa catatan (tidak ada atau masih kosong di dokumen): ' + '; '.join(left))
        return out
    if problems or left:
        sys.exit('Judul BAB tidak cocok.\n  Di dokumen tanpa pasangan: %s\n  Di web tanpa pasangan: %s' % (problems or '-', left or '-'))
    return out


def chapter_words(ch):
    return sum(len(tk.get('text', '').split()) for tk in ch['toks'] if tk['k'] not in ('img',))


def chapter_images(ch):
    return sum(1 for tk in ch['toks'] if tk['k'] == 'img')


def score_of(ch):
    """Versi BAB yang lebih baik: bukan placeholder, lalu lebih banyak gambar (versi tanpa gambar sering hanya memuat keterangannya), lalu lebih panjang."""
    return (not is_placeholder(ch), chapter_images(ch), chapter_words(ch))


def is_placeholder(ch):
    return chapter_words(ch) < 150 or any(re.match(r'^Status\s*:\s*placeholder', tk.get('text', ''), re.I) for tk in ch['toks'])


def select_chapters(chapters, site_titles, skip_unmatched=False):
    """Satu catatan per BAB di web. Dokumen boleh memuat BAB ganda (mis. lampiran) dan BAB kosong ("Status: placeholder"):
    BAB berisi menang atas placeholder; bila dua-duanya berisi, yang gambarnya lebih banyak (lalu yang lebih panjang) dipakai.
    BAB yang judulnya tak cocok dengan mata kuliah ini (milik mata kuliah lain) dilewati hanya dengan --skip-unmatched.
    Mengembalikan (daftar BAB terpilih, catatan untuk laporan)."""
    notes, best = [], {}
    for ch in chapters:
        cand = sorted(((title_score(ch['title'], st), st) for st in site_titles), reverse=True)
        score, st = cand[0] if cand else (0, None)
        if score < 0.5:
            if not skip_unmatched:
                sys.exit(f'BAB "{ch["title"]}" tidak cocok dengan BAB mana pun di web (pakai --skip-unmatched bila memang milik mata kuliah lain).')
            notes.append(f'dilewati (bukan BAB mata kuliah ini): Bab {ch["num"]} — {ch["title"]} ({chapter_words(ch)} kata)')
            continue
        old = best.get(st)
        if old is None or score_of(ch) > score_of(old):
            if old is not None:
                notes.append(f'{"placeholder diganti versi berisi" if is_placeholder(old) else "versi dengan lebih banyak gambar dipakai"}: {st} (Bab {old["num"]}, {chapter_words(old)} kata, {chapter_images(old)} gambar -> Bab {ch["num"]}, {chapter_words(ch)} kata, {chapter_images(ch)} gambar)')
            best[st] = ch
        else:
            notes.append(f'versi ganda tidak dipakai: {st} (Bab {ch["num"]}, {chapter_words(ch)} kata; dipakai Bab {old["num"]}, {chapter_words(old)} kata)' if not is_placeholder(ch)
                         else f'placeholder dilewati: {st} (Bab {ch["num"]})')
    selected = [ch for ch in chapters if best.get(next((st for st in best if best[st] is ch), None)) is ch]
    empty = [ch for ch in selected if is_placeholder(ch)]
    for ch in empty:
        notes.append(f'BAB kosong (hanya judul/placeholder), tidak dimasukkan: Bab {ch["num"]} — {ch["title"]} ({chapter_words(ch)} kata)')
    return [ch for ch in selected if ch not in empty], notes


def ref_names(doc_titles):
    """Nama BAB untuk rujukan silang ("dibahas pada Bab 8"): judul di dokumen tanpa keterangan kurung."""
    out = {}
    for n, t in doc_titles.items():
        t = re.sub(r'\s*\([^)]*\)', '', t).replace(' & ', ' dan ').strip()
        out[n] = t
    return out


URL_LINE = re.compile(r'^https?://lh3\.googleusercontent\.com/d/[\w-]+$')
BAB_H1 = re.compile(r'^Bab\s+(\d+)\s+[—–-]\s+(.+)$')
BULLET = re.compile(r'^[•·]\s+')
NUM_ITEM = re.compile(r'^(\d{1,2})\)\s+')
# "Gambar 6.4. Keterangan" atau (Fisiologi) "Gambar Bab 6 — Keterangan"
CAPTION = re.compile(r'^Gambar\s+(?:Bab\s+)?(\d+(?:\.\d+)?)(?:\.|\s+[—–-])\s+(.*)$', re.S)
H2_NUM = re.compile(r'^(\d{1,2})\.\s+(.*)$')
H2_LETTER = re.compile(r'^([A-F])\.\s+(?![a-z])(.*)$')       # "A. Urinary Tract", bukan "E. coli"

# Baris yang hanya urusan penyusun dokumen (tidak untuk siswa).
INTERNAL_LINE = re.compile(
    r'^(STATUS\s*:|Catatan editorial|MASTER DOCUMENT|Aturan visual|Aturan visual master note|'
    r'Sumber cakupan|PPT dosen khusus|Draft K\d+ terpisah|Sumber utama(?: Drive)?\s*:\s*\S)', re.I)
INTERNAL_ANY = re.compile(r'retrieval|knowledge base|\[CEK\]|master note|PPT dosen|bahan yang tersedia|dokumen master', re.I)

CALLOUT_RULES = [
    # (regex awalan, jenis, judul). Urutan penting: yang lebih khusus dulu.
    (re.compile(r'^(Clinical anchors?|Clinical correlation|Clinical relation|Clinical orientation|Clinical landmark|'
                r'Clinical reasoning|Clinical pearl|Contoh klinis|Klinis)\s*:\s*', re.I), 'klinis', None),
    (re.compile(r'^(Exam trap|Jebakan penting|Jebakan ujian|Trap(?: utama| ujian)?|Practical trap|Praktikum trap|'
                r'High-yield trap|High-yield correction)\s*:\s*', re.I), 'warning', None),
    # label berdiri sendiri ("PENTING:" lalu butir/paragraf) pada dokumen bergaya huruf besar
    (re.compile(r'^(Penting|Jebakan(?: soal)?)\s*:\s*$', re.I), 'warning', None),
    (re.compile(r'^(Praktikum|Practical clue|Practical rule|Practical emphasis|Shortcut praktikum|Clue(?: terkuat)?)\s*:\s*', re.I), 'praktikum', None),
    (re.compile(r'^(High-yield(?: distinction| principle)?|Konsep high-yield|Poin penting|Konsep penting|Tambahan high-yield(?: [^:]{0,40})?|High-yield clue(?: [^:]{0,30})?|Exam pearl|Poin ujian)\s*:\s*', re.I), 'highyield', None),
    (re.compile(r'^(Mnemonic(?: praktis| visual| relasional| konseptual)?(?: [^:]{0,30})?)\s*:\s*', re.I), 'tip', None),
]

SOURCE_H2 = re.compile(r'^(sumber dan provenance|rujukan dan atribusi gambar|sumber(?: dan atribusi)?|sumber(?: guideline| rujukan)? utama|referensi|daftar pustaka)$', re.I)
DROP_H2 = re.compile(r'retrieval', re.I)


def slug(s, limit=48):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    if len(s) > limit:
        cut = s[:limit]
        s = cut[:cut.rfind('-')] if s[limit] != '-' and '-' in cut else cut   # jangan memotong di tengah kata
    return s.strip('-')


# ----------------------------------------------------------------------------
# 1. Paragraf mentah dari .docx (teks + tautan, tanpa gaya yang bocor)
# ----------------------------------------------------------------------------
class Para:
    __slots__ = ('i', 'lvl', 'text', 'blank_before', 'has_img', 'trail', 'force_h', 'style')

    def __init__(self, i, lvl, text, blank_before, has_img, trail=False, force_h=False, style=''):
        self.i, self.lvl, self.text, self.blank_before, self.has_img, self.trail, self.force_h, self.style = i, lvl, text, blank_before, has_img, trail, force_h, style

    def __repr__(self):
        return f'<P{self.i} L{self.lvl} {self.text[:40]!r}>'


def inline_text(p, rels, keep_drive_links=False):
    """Teks paragraf; tautan web dipertahankan sebagai [teks](url)."""
    out = []
    for child in p._p.iterchildren():
        if child.tag == qn('w:r'):
            out.append(''.join(t.text or '' for t in child.iter(qn('w:t'))))
        elif child.tag == qn('w:hyperlink'):
            txt = ''.join(t.text or '' for t in child.iter(qn('w:t')))
            rid = child.get(qn('r:id'))
            url = rels[rid].target_ref if rid in rels else ''
            if url.startswith('http') and (keep_drive_links or 'drive.google.com' not in url):
                out.append(f'[{txt}]({url})')
            else:
                out.append(txt)
    return ''.join(out)


CORRECTIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'corrections')


def apply_corrections(paras, subject):
    """Koreksi hasil QC (salah ketik, kekeliruan, catatan internal) dari corrections/<mata-kuliah>.json, diterapkan ke teks sumber.
    Tiap aturan: {"find": teks, "replace": teks, "drop": true bila seluruh paragraf dibuang, "all": true bila boleh cocok di banyak tempat,
    "regex": true, "why": alasan}. Aturan yang tidak cocok atau ambigu (cocok > 1 tanpa "all") tidak diterapkan dan dilaporkan.
    Mengembalikan (paragraf, laporan)."""
    path = os.path.join(CORRECTIONS_DIR, f'{subject}.json')
    if not os.path.exists(path):
        return paras, []
    rules = json.load(open(path, encoding='utf-8'))
    notes = []
    for k, r in enumerate(rules):
        rx = re.compile(r['find']) if r.get('regex') else None
        hit = [q for q in paras if (rx.search(q.text) if rx else r['find'] in q.text)]
        if not hit:
            notes.append(f'koreksi #{k + 1} tidak cocok (sudah diperbaiki di dokumen?): {r["find"][:70]}')
            continue
        if len(hit) > 1 and not r.get('all'):
            notes.append(f'koreksi #{k + 1} ambigu ({len(hit)} tempat), tidak diterapkan: {r["find"][:70]}')
            continue
        for q in hit:
            if r.get('drop'):
                q.text = ''
            else:
                q.text = rx.sub(r['replace'], q.text) if rx else q.text.replace(r['find'], r['replace'])
        notes.append(f'koreksi #{k + 1} diterapkan ({len(hit)}x): {r.get("why", "")[:90]}')
    return [q for q in paras if q.text.strip()], notes


def read_paragraphs(path):
    d = docx.Document(path)
    rels = d.part.rels
    out, blank = [], True
    for i, p in enumerate(d.paragraphs):
        raw = inline_text(p, rels).replace('\u00a0', ' ')
        t = raw.strip()
        if t.startswith('• ') and re.search(r'\S• ', t):
            t = '• ' + re.split(r'(?<=\S)• ', t)[-1].strip()   # butir menempel pada butir sebelumnya (ekspor Docs)
        if not t:
            blank = True
            continue
        name = p.style.name
        lvl = int(name[-1]) if name.startswith('Heading') else 0
        out.append(Para(i, lvl, t, blank, False, raw != raw.rstrip(), False, name))
        blank = False
    return out


# ----------------------------------------------------------------------------
# 1b. Dokumen bergaya HURUF BESAR (Genetika, lampiran Biokimia): disamakan dengan gaya "Bab N — Judul" + Heading
# ----------------------------------------------------------------------------
# "BAB 3 — JUDUL", "PARASITOLOGI — BAB 3: JUDUL", "PATOLOGI ANATOMI — BAB 6: JUDUL"
UP_CHAPTER = re.compile(r'^(?:[A-Z][A-Z &]*?\s+[—–-]\s+)?BAB\s+(\d+)\s*[—–:-]\s*(\S.*)$')
RULE_LINE = re.compile(r'^[═━─=_*~\-]{5,}$')
END_MARK = re.compile(r'^SELESAI\s*[—–-]')
UP_LETTER = re.compile(r'^([A-Z]{1,2})\.\s+(\S.*)$')
EMOJI_PREFIX = re.compile(r'^[\u2600-\u27BF\u2B00-\u2BFF\U0001F300-\U0001FAFF\uFE0F]+\s*')
UP_LABELS = {'PENTING', 'HIGH-YIELD', 'BEDAKAN', 'JEBAKAN SOAL', 'JEBAKAN', 'CATATAN', 'CONTOH'}
UP_NUMBERED = re.compile(r'^(\d{1,2}\.\d{1,2})\s+(\S.*)$')
LOWER_WORDS = {'dan', 'atau', 'yang', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'dalam', 'antara', 'sebagai', 'secara', 'oleh', 'bagi', 'vs', 'of', 'the', 'and', 'in', 'to', 'as', 'by'}
CASE_FIX = {'MACCONKEY': 'MacConkey', 'GENEXPERT': 'GeneXpert', 'HBEAG': 'HBeAg', 'HBSAG': 'HBsAg', 'HBCAG': 'HBcAg', 'HDAG': 'HDAg', 'LOWENSTEIN': 'Lowenstein'}
NOT_ACRONYMS = {'GAMBAR', 'VISUAL', 'TABEL', 'BAB', 'CATATAN', 'PENTING', 'CONTOH', 'SUMBER', 'END', 'SELESAI', 'DAN', 'ATAU'}
ROMAN = re.compile(r'^(?:I{1,3}|IV|V|VI{0,3}|IX|X)$')


def upper_ratio(s):
    letters = [c for c in s if c.isalpha()]
    return sum(c.isupper() for c in letters) / len(letters) if letters else 0.0


def doc_acronyms(paras):
    """Singkatan (ATP, CFTR, ...): kata huruf besar di badan teks yang tidak pernah muncul dalam huruf kecil di dokumen.
    (Kata sorotan seperti TIDAK atau DAN juga muncul huruf kecil, jadi bukan singkatan.)"""
    lower_words, upper = set(), set()
    for p in paras:
        if upper_ratio(p.text) >= 0.5:
            continue
        for w in re.findall(r'[^\W\d_]+[\w]*', p.text):
            if any(c.islower() for c in w):
                lower_words.add(w.lower())
            elif len(w) >= 2:
                upper.add(w)
    return {w for w in upper if w.lower() not in lower_words and w not in NOT_ACRONYMS}


_SPECIES = set()         # epitet spesies ("aureus", "coli") yang di badan teks muncul sebagai "S. aureus"; diisi normalize_upper()


def doc_species(paras):
    cnt = {}
    for p in paras:
        for w in re.findall(r'\b[A-Z]\. ([a-z]{4,})\b', p.text):
            cnt[w] = cnt.get(w, 0) + 1
    return {w for w, c in cnt.items() if c >= 2}


def smart_title(text, acr, sentence=False):
    """JUDUL HURUF BESAR -> Judul Huruf Kapital Awal (atau huruf kecil seperti kalimat); singkatan, kata campuran, dan epitet spesies tetap."""
    out, prev = [], ''
    for k, w in enumerate(text.split(' ')):
        pieces = re.split(r'([/\-–])', w)
        for j, piece in enumerate(pieces):
            core = re.sub(r'^\W+|\W+$', '', piece)
            if core in CASE_FIX:                                       # nama dengan huruf besar-kecil khas (MacConkey, HBeAg)
                pieces[j] = piece.replace(core, CASE_FIX[core])
                continue
            if re.match(r'^[A-Z]{2,}[a-z]+$', core):                    # "JEBakan" (salah ketik) -> "Jebakan"
                pieces[j] = piece.replace(core, core.capitalize())
                continue
            wrapped = piece.startswith('(') and piece.endswith(')') and len(core) >= 2 and core.isupper()
            one_letter = len(core) == 1 and core.isupper() and k > 0 and prev.lower() in ('group', 'tipe', 'type', 'vitamin', 'hepatitis', 'kelompok')
            if (not core or piece in '/-–' or not any(c.isalpha() for c in core) or any(c.islower() for c in core) or core in acr or ROMAN.match(core)
                    or (any(c.isdigit() for c in core) and re.match(r'^[0-9]+[A-Z]+$', core)) or wrapped or one_letter):      # "16S", "(GAS)", "Group A" tetap
                continue
            first = k == 0 and j == 0
            low = piece.lower()
            species = (not first and core.lower() in _SPECIES and (re.match(r'^[A-Z]\.$', prev) or re.match(r'^[A-Z][a-z]{4,}$', prev)))
            if not first and (core.lower() in LOWER_WORDS or sentence or species):
                pieces[j] = low
            else:
                m = re.search(r'\w', low)
                pieces[j] = low[:m.start()] + low[m.start()].upper() + low[m.start() + 1:] if m else low
        out.append(''.join(pieces))
        prev = re.sub(r'^\W+|\W+$', '', out[-1]) if not re.match(r'^[A-Z]\.$', out[-1]) else out[-1]
    return ' '.join(out)


def normalize_upper(paras):
    """Paragraf bergaya huruf besar -> bentuk yang dikenali classify(): "Bab N — Judul" (H1), judul bagian (H2), label berhuruf biasa.
    Hanya menyentuh paragraf setelah judul "BAB N — JUDUL" huruf besar pertama; gaya lain dibiarkan."""
    start = next((k for k, p in enumerate(paras) if UP_CHAPTER.match(p.text) and upper_ratio(UP_CHAPTER.match(p.text).group(2)) > 0.8), None)
    if start is None:
        return paras
    acr = doc_acronyms(paras)
    _SPECIES.clear()
    _SPECIES.update(doc_species(paras))
    letters = [chr(65 + k) for k in range(26)] + ['A' + chr(65 + k) for k in range(26)]
    last_letter = None
    skip = set()             # indeks baris yang sudah diproses sebagai butir kotak
    in_numbered = False      # sedang di bawah judul bergaya "N.M JUDUL"
    box_text = None          # None: tidak sedang di isi kotak; False: label kotak baru muncul; Para: paragraf isi yang sedang disambung
    out = list(paras[:start])
    body = paras[start:]
    nonempty_after_heading = 0
    ended = False            # setelah "SELESAI — ... (N BAB RESMI)": materi tambahan di luar BAB resmi dibuang sampai BAB berikutnya
    fig_seq = 0
    chapter_no = 0
    for k, p in enumerate(body):
        t = EMOJI_PREFIX.sub('', p.text)                            # "⚡ HIGH-YIELD RSV" -> "HIGH-YIELD RSV"
        m = UP_CHAPTER.match(t)
        if m and upper_ratio(m.group(2)) > 0.8:
            out.append(Para(p.i, 1, f'Bab {m.group(1)} — {smart_title(m.group(2), acr)}', p.blank_before, False, p.trail))
            nonempty_after_heading = 0
            last_letter = None
            ended = False
            fig_seq = 0
            in_numbered = False
            box_text = None
            chapter_no = int(m.group(1))
            continue
        if END_MARK.match(t):
            ended = True
            continue
        if ended or RULE_LINE.match(t):
            continue
        nonempty_after_heading += 1
        if re.match(r'^END OF (?:[A-Z ]+ )?BAB\s+\d+', t) or (nonempty_after_heading == 1 and not t.startswith(('•', 'http')) and (
                p.style == 'Subtitle' or (' • ' in t and len(t) < 200) or (len(t) < 60 and not UP_LETTER.match(t) and upper_ratio(t) <= 0.8 and not re.search(r'[.:;]$', t)))):
            continue                                              # penutup/subjudul/daftar topik buatan penyusun
        if t.startswith('– '):
            prev = out[-1] if out else None
            if prev is not None and prev.text.startswith('• '):       # rincian butir ("– 50% Aa ...") menyatu dengan butir induknya
                item = t[2:].strip().rstrip('.;')
                head = prev.text.rstrip()
                prev.text = (head + ' ' if head.endswith(':') else head.rstrip('.;') + '; ') + item + '.'
            else:
                out.append(Para(p.i, 0, '• ' + t[2:], p.blank_before, False, p.trail))
            continue
        m = UP_LETTER.match(t) or UP_NUMBERED.match(t)
        mixed_num = UP_NUMBERED.match(t)
        mixed_head = bool(mixed_num and re.match(r'^[A-Z“(]', mixed_num.group(2)) and len(t) < 100 and not re.search(r'[.;:,?!]$', t) and ' → ' not in t
                          and (int(mixed_num.group(1).split('.')[0]) == chapter_no or p.lvl == 2))   # "8.1 Gambaran Besar" (huruf biasa)
        in_seq = bool(m and UP_LETTER.match(t) and last_letter is not None and last_letter + 1 < len(letters) and m.group(1) == letters[last_letter + 1]
                      and len(m.group(2)) <= 40 and not re.search(r'[.;:,]$', t))      # "F. HbA1c" setelah "E. ..."
        if m and len(t) < 110 and (upper_ratio(m.group(2)) > 0.75 or in_seq or mixed_head) and not re.search(r'[.;]$', t):
            in_numbered = bool(UP_NUMBERED.match(t)) and not UP_LETTER.match(t)
            if UP_LETTER.match(t) and m.group(1) in letters:
                last_letter = letters.index(m.group(1))
            out.append(Para(p.i, 2, smart_title(m.group(2), acr) if upper_ratio(m.group(2)) > 0.75 else m.group(2), p.blank_before, False, p.trail, True))
            box_text = None
            continue
        if re.match(r'^GAMBAR\s+\d+(?:\.\d+)?\s*(?:[—–]|-|\.(?=\s))', t):
            out.append(Para(p.i, 0, 'Gambar' + t[6:], p.blank_before, False, p.trail))
            box_text = None
            continue
        m = re.match(r'^\[?(?:GAMBAR|VISUAL|Visual)\s+(?:[A-Z]+\s+)?\d+[A-Z]?\s*(?:[—–]|-|\.(?=\s))\s*(\S.*?)\]?$', t) or re.match(
            r'^Gambar\s+\d+[A-Z]\s*(?:[—–]|-|\.(?=\s))\s*(\S.*?)$', t)          # "Gambar 11A — ..." (label berhuruf)
        if m and not re.match(r'^Gambar\s+\d+(?:\.\d+)?\s*(?:\.|[—–-])', t):
            # "GAMBAR PA 1A — ...", "VISUAL 8B — ...", "[VISUAL 10C — ...]", "Visual 9A. ...": diberi nomor urut per BAB
            fig_seq += 1
            cap = m.group(1)
            out.append(Para(p.i, 0, f'Gambar {chapter_no}.{fig_seq} — {smart_title(cap, acr) if upper_ratio(cap) > 0.8 else cap}', p.blank_before, False, p.trail))
            box_text = None
            continue
        if k in skip:
            continue
        if SOURCE_H2.match(t.strip()) and len(t) < 40 and not t.startswith('•'):         # tanpa titik dua: "Sumber utama:" adalah label isi
            out.append(Para(p.i, 2, t.strip().title(), p.blank_before, False, p.trail, True))      # "Sumber Utama": judul bagian sumber (akan dibuang)
            box_text = None
            continue
        if box_text is not None:                                  # baris menempel setelah label kotak ("PENTING:") jadi isi kotak
            plain = not t.startswith(('•', '– ', 'http', 'Gambar ')) and not t.endswith(':') and not UP_LETTER.match(t) and upper_ratio(t) <= 0.8
            if plain and (box_text is False or not p.blank_before):
                if box_text is False:
                    run, j = [p], k + 1
                    while j < len(body) and not body[j].blank_before and body[j].lvl == 0 and not body[j].text.startswith(('•', '– ', 'http', 'Gambar ')) \
                            and not body[j].text.endswith(':') and not UP_LETTER.match(body[j].text) and upper_ratio(body[j].text) <= 0.8:
                        run.append(body[j])
                        j += 1
                    if len(run) >= 2 and all(len(x.text) <= 110 for x in run):
                        for x in run:                             # beberapa baris pendek ("P = Papillary → ...") menjadi butir daftar
                            out.append(Para(x.i, 0, '• ' + x.text, x.blank_before, False, x.trail))
                        skip.update(range(k, k + len(run)))
                        box_text = None
                    else:
                        box_text = p
                        out.append(p)
                else:
                    box_text.text = box_text.text.rstrip() + ' ' + t
                continue
            box_text = None
        if t.endswith(':') and len(t) <= 80 and upper_ratio(t) <= 0.8 and callout_for(t) and (not callout_for(t)[2] or callout_for(t)[2].endswith(':')):
            out.append(p)                                         # "Mnemonic konsep:" berdiri sendiri: baris menempel berikutnya ikut kotak
            box_text = False
            continue
        if t in UP_LABELS:
            t = t + ':'                                           # "PENTING" tanpa titik dua
        if t.endswith(':') and len(t) <= 60 and upper_ratio(t) > 0.8 and not t.startswith('•'):
            label = t[:-1]
            text = (label if len(label.replace(' ', '')) <= 5 and ' ' not in label else smart_title(label, acr, sentence=True)) + ':'
            out.append(Para(p.i, 0, text, p.blank_before, False, p.trail))
            box_text = False if callout_for(text) else None
            continue
        m = re.match(r'^(\d{1,2})\.\s+(\S.*)$', t)
        if m and len(t) <= 70 and not re.search(r'[.;?!,]$', t):
            nxt = next((q for q in body[k + 1:k + 4] if q.text), None)
            if nxt is not None and (nxt.text.startswith('•') or (not nxt.blank_before and not re.match(r'^\d{1,2}\.\s', nxt.text) and not t.endswith(':'))):
                title = m.group(2).rstrip(':')
                title = smart_title(title, acr) if upper_ratio(title) > 0.9 else title
                out.append(Para(p.i, 3, f'{m.group(1)}. {title}', p.blank_before, False, p.trail))      # "1. Haploinsufficiency" + butir/paragraf = subjudul
                box_text = None
                continue
        nxt_ = next((q for q in body[k + 1:k + 4] if q.text), None)
        if (nxt_ is not None and nxt_.text.startswith('→') and upper_ratio(t) > 0.9 and len(t) < 50 and not t.startswith(('•', 'http'))
                and not re.search(r'[.:;,]$', t) and not UP_LETTER.match(t)):
            out.append(Para(p.i, 0, smart_title(t, acr, sentence=True), p.blank_before, False, p.trail))      # "NORMAL CELL" + "→ ..." = awal alur
            continue
        if nxt_ is not None and UP_CHAPTER.match(nxt_.text) and upper_ratio(t) > 0.9 and len(t) < 80:
            continue                                              # judul dokumen yang tersambung sebelum BAB berikutnya
        words_ = [re.sub(r'^\W+|\W+$', '', w) for w in t.split()]
        acronyms_only = all(w in acr or ROMAN.match(w) or not w for w in words_)          # "CPS I", "OTC": butir daftar, bukan judul
        after_label = bool(out) and out[-1].text.endswith(':')
        if (len(t) < 80 and upper_ratio(t) > 0.9 and not t.startswith(('•', 'http')) and not re.search(r'[.:;,]$', t) and not re.search(r'→|⊣| = | \+ ', t)
                and (len(t.split()) >= 2 or len(t) >= 6) and not acronyms_only and not after_label and len(re.sub(r'[^A-Za-z]', '', t)) >= 6):
            if in_numbered and nxt_ is not None and nxt_.text.startswith('•') and not nxt_.blank_before and not SOURCE_H2.match(t):
                out.append(Para(p.i, 3, smart_title(t, acr), p.blank_before, False, p.trail))      # "INFLUENZA" + butir di bawah "9.5 PERBANDINGAN ..." = subjudul
            else:
                out.append(Para(p.i, 2, smart_title(t, acr), p.blank_before, False, p.trail, True))
                in_numbered = False
            box_text = None
            continue
        if p.lvl in (1, 2):                                       # gaya Heading yang bocor ke butir/kalimat
            p = Para(p.i, 0, p.text, p.blank_before, False, p.trail, False, p.style)
        out.append(p)
    return out


def merge_image_credits(paras):
    """"Sumber gambar: ..." sesudah keterangan gambar ikut menjadi bagian keterangan ("... Sumber: ...")."""
    out = []
    for p in paras:
        m = re.match(r'^Sumber (?:gambar|visual internet)\s*:\s*(\S.*)$', p.text, re.S) or (
            re.match(r'^Sumber\s*:\s*(\S.*)$', p.text, re.S) if any(q.text.startswith('https://lh3') for q in out[-2:]) else None)
        if m:
            cap = next((q for q in reversed(out[-4:]) if q.text.startswith('Gambar ')), None)
            if cap is not None and 'Sumber:' not in cap.text:
                cap.text = cap.text.rstrip() + ' Sumber: ' + m.group(1).strip()
                continue
        out.append(p)
    return out


# ----------------------------------------------------------------------------
# 2. Klasifikasi paragraf -> token
# ----------------------------------------------------------------------------
def is_label_like(t):
    """Baris pendek bergaya 'Landmark retina penting:' atau 'V — vein' (bukan judul)."""
    return t.endswith(':') or (' — ' in t and len(t) < 40)


def plausible_heading(t, max_len=90):
    if len(t) > max_len or not t or t.startswith('http') or t.startswith('Gambar '):
        return False
    if BULLET.match(t) or NUM_ITEM.match(t) or re.search(r'[“”"]', t) or ' — ' in t or re.search(r'→|⇌| \+ | = ', t):
        return False
    if re.search(r'[.;,!?:]$', t):
        return False
    if t[0].islower():
        return False
    return len(t.split()) <= 14


H3_NUM = re.compile(r'^(\d{1,2})\.(\d{1,2})\s+(\S.*)$')


def classify(paras):
    """Mengembalikan daftar token dict {k, text, lvl?, src}."""
    toks = []
    n = len(paras)
    for idx, p in enumerate(paras):
        t = p.text
        base = {'src': p.i, 'blank_before': p.blank_before, 'trail': p.trail}
        m_h2 = H2_NUM.match(t)
        m_h3 = H3_NUM.match(t)
        m_ln = re.match(r'^\[(\d{1,2})\.\s+(.*)$', t)
        if m_ln:
            toks.append({**base, 'k': 'nli', 'text': '[' + m_ln.group(2)})
            continue
        if t.startswith('□'):
            toks.append({**base, 'k': 'li', 'text': t.lstrip('□ ').strip()})
            continue
        if t.startswith('→') and toks and toks[-1]['k'] == 'p':
            toks[-1]['text'] = toks[-1]['text'].rstrip() + ' ' + t
            continue
        if (toks and toks[-1]['k'] == 'p' and not p.blank_before and p.lvl == 0 and not URL_LINE.match(t) and not CAPTION.match(t)
                and not BULLET.match(t) and not NUM_ITEM.match(t) and not H2_NUM.match(t)
                and (t.startswith('+ ') or toks[-1]['text'].endswith(('→', '=', '+', ';')))):
            # Alur atau rincian yang ditulis per baris tanpa baris kosong ("X →" / "+ Y" / butir berakhiran ";") satu paragraf.
            toks[-1]['text'] = toks[-1]['text'].rstrip() + ' ' + t
            continue
        if URL_LINE.match(t):
            toks.append({**base, 'k': 'img', 'url': t})
        elif CAPTION.match(t):
            toks.append({**base, 'k': 'cap', 'text': t})
        elif BULLET.match(t):
            toks.append({**base, 'k': 'li', 'text': BULLET.sub('', t)})
        elif p.lvl == 1 and BAB_H1.match(t) and len(t) < 130:
            toks.append({**base, 'k': 'h1', 'text': t})
        elif re.match(r'^Tujuan [Bb]elajar$', t):
            toks.append({**base, 'k': 'h2', 'text': t})
        elif m_h3 and len(t) <= 110 and not re.search(r'[.;:]$', t):
            toks.append({**base, 'k': 'h3', 'text': m_h3.group(3), 'numbered': True})
        elif m_h2 and (p.lvl == 2 or p.lvl == 3) and len(t) <= 110 and not re.search(r'[.;]$', t):
            # H2 bernomor; pada BAB berbagian (A–D) yang bernomor adalah H3, dipromosikan nanti.
            toks.append({**base, 'k': 'h2' if p.lvl == 2 else 'h3', 'text': t, 'numbered': True})
        elif p.force_h:
            toks.append({**base, 'k': 'h2', 'text': t, 'force': True})
        elif p.lvl == 2 and (H2_LETTER.match(t) or (len(t) < 70 and not re.search(r'[.:;,]$', t))) and not t.startswith('http'):
            toks.append({**base, 'k': 'h2', 'text': t})
        elif m_h2 and len(t) <= 90 and not re.search(r'[.;:,]$', t) and p.blank_before:
            toks.append({**base, 'k': 'h2', 'text': t, 'numbered': True})
        elif NUM_ITEM.match(t):
            toks.append({**base, 'k': 'nli', 'text': NUM_ITEM.sub('', t)})
        elif m_h2:
            toks.append({**base, 'k': 'nli', 'text': m_h2.group(2)})
        elif p.lvl == 3 and plausible_heading(t):
            toks.append({**base, 'k': 'h3', 'text': t})
        else:
            toks.append({**base, 'k': 'p', 'text': t, 'style_lvl': p.lvl})
    return toks


def merge_fragments(toks):
    """Paragraf yang terbelah oleh blok gambar (ekspor dokumen menyisipkan gambar di tengah kalimat, judul,
    atau keterangan, kadang di tengah kata) disambung lagi; gambarnya tetap di tempatnya."""
    toks = [dict(t) for t in toks]
    drop = set()
    incomplete = lambda t: not re.search(r'[.!?;:)”"\]]$', t['text'])
    for k, b in enumerate(toks):
        if b['k'] not in ('p', 'h2', 'h3') or not re.match(r'^[a-z.,;:)]', b['text']):
            continue
        r = k
        while r > 0 and toks[r - 1]['k'] in ('img', 'cap'):
            r -= 1
        if r == k:
            continue
        target = None
        for q in range(k - 1, r - 1, -1):          # keterangan gambar yang terpotong lebih dekat daripada teks sebelum gambar
            if toks[q]['k'] == 'cap':
                if incomplete(toks[q]):
                    target = q
                break
        if target is None and r > 0 and toks[r - 1]['k'] in ('p', 'h2', 'h3', 'li') and incomplete(toks[r - 1]):
            target = r - 1
        if target is None:
            continue
        a = toks[target]
        a['text'] = a['text'] + (' ' if a.get('trail') else '') + b['text']
        a['trail'] = b.get('trail', False)
        if a['k'] == 'cap' and any(t['k'] == 'img' for t in toks[target + 1:k]):
            toks[k] = a                 # keterangan terpotong oleh gambar: letakkan setelah gambar-gambar itu
            drop.add(target)
        else:
            drop.add(k)
    return [t for i, t in enumerate(toks) if i not in drop]


def auto_headings(toks):
    # Subjudul polos (gaya bocor / tanpa gaya): baris pendek tanpa tanda baca, didahului baris kosong,
    # langsung diikuti butir atau paragraf.
    for j, tk in enumerate(toks):
        if tk['k'] != 'p':
            continue
        t = tk['text']
        nx = toks[j + 1] if j + 1 < len(toks) else None
        pv = toks[j - 1] if j > 0 else None
        if ((tk['blank_before'] or (pv and pv['k'] in ('h2', 'h3', 'part'))) and plausible_heading(t, 80) and not is_label_like(t)
                and nx and nx['k'] in ('li', 'nli', 'p') and not nx['blank_before']):
            tk['k'] = 'h3'
            tk['auto'] = True
            if t.isupper() and not (len(t.split()) == 1 and len(t) <= 6):       # RSV tetap; "SELURUH JUDUL" -> "Seluruh Judul"
                tk['text'] = t.title()
    return toks


# ----------------------------------------------------------------------------
# 3. BAB -> bagian -> blok
# ----------------------------------------------------------------------------
def split_chapters(toks):
    chapters, cur = [], None
    for tk in toks:
        if tk['k'] == 'h1':
            m = BAB_H1.match(tk['text'])
            cur = {'num': int(m.group(1)), 'title': m.group(2).strip(), 'toks': []}
            chapters.append(cur)
        elif cur is not None:
            cur['toks'].append(tk)
    return chapters


def section_kind(title):
    t = title.lower()
    if re.match(r'^tujuan belajar$', t):
        return 'tujuan'
    if DROP_H2.search(t):
        return 'drop'
    if SOURCE_H2.match(t):
        return 'sumber'
    if re.search(r'high-yield|jebakan|ringkasan (cepat|integratif|\d+ detik)', t):
        if re.search(r'^(integrasi klinis|clinical correlations)', t):
            return 'klinis'
        return 'highyield'
    if re.search(r'clinical (correlations|application|anatomy)|korelasi klinis|integrasi klinis', t):
        return 'klinis'
    if re.search(r'checklist identifikasi', t):
        return 'praktikum'
    return 'isi'


def promote_parts(chapter):
    """BAB berbagian (A. ... D.): bagian jadi pembatas, H3 bernomor jadi H2."""
    toks = chapter['toks']
    if not any(t['k'] == 'h2' and H2_LETTER.match(t['text']) for t in toks):
        return
    for t in toks:
        if t['k'] == 'h2' and H2_LETTER.match(t['text']):
            t['k'] = 'part'
        elif t['k'] == 'h3' and t.get('numbered') and H2_NUM.match(t['text']):
            t['k'] = 'h2'


def clean_h2(text, keep_case=False):
    t = text.strip()
    t = re.sub(r'^Batas Bab \d+$', 'Batas Cakupan Bab', t)
    m = H2_NUM.match(t)
    if m:
        t = m.group(2)
    else:
        m = H2_LETTER.match(t)
        if m:
            t = m.group(2)
    if t.isupper() and not keep_case and not (len(t.split()) == 1 and len(t) <= 6):       # judul H2 huruf besar dari dokumen lama
        t = t.title()
    return t.strip()


def group_sections(chapter):
    """Pecah token BAB menjadi pembuka (dibuang) + daftar bagian."""
    sections, cur = [], None
    pre = []
    SUMBER_TAIL = re.compile(r'^Sumber( untuk [Bb]ab (\d+|ini))?:?$')
    for tk in chapter['toks']:
        if tk['k'] in ('h3', 'p') and SUMBER_TAIL.match(tk['text']) and tk['text'] != 'Sumber:' and cur is not None and cur['kind'] != 'sumber':
            sections.append({'title': 'Sumber', 'raw': tk['text'], 'kind': 'sumber', 'toks': [], 'src': tk['src']})
            cur = sections[-1]
            continue
        if tk['k'] == 'part':
            m = H2_LETTER.match(tk['text'])
            title = clean_h2(tk['text'], tk.get('force'))
            sections.append({'title': title, 'letter': m.group(1) if m else '', 'raw': tk['text'], 'kind': 'part', 'toks': [], 'src': tk['src']})
            cur = sections[-1]
        elif tk['k'] == 'h2':
            title = clean_h2(tk['text'], tk.get('force'))
            cur = {'title': title, 'raw': tk['text'], 'kind': section_kind(title), 'toks': [], 'src': tk['src']}
            sections.append(cur)
        elif cur is None:
            pre.append(tk)
        else:
            cur['toks'].append(tk)
    return pre, sections


# ----------------------------------------------------------------------------
# 4. Teks: rujukan silang, label tebal, callout
# ----------------------------------------------------------------------------
def rewrite_refs(text, num, names):

    def sub(m):
        n = int(m.group(1))
        start = m.start() == 0 or text[max(0, m.start() - 2):m.start()] in ('. ', '• ')
        if n == num:
            return 'Bab ini' if start else 'bab ini'
        if n in names:
            name = names[n]
            paren = (m.group(2) or '').strip(' ()')
            if paren and paren.lower() not in name.lower():
                name = f'{name} ({paren})'
            return ('Bab ' if start else 'bab ') + name
        return m.group(0)
    return re.sub(r'\bBab (\d{1,2})(\s+\([^)]{1,60}\))?(?![–\d-])', sub, text)


def lead_label(t, max_len=45, max_words=4):
    """'Label: isi' -> ('Label', 'isi') bila awalan layak dijadikan label tebal."""
    m = re.match(r'^([^:\n]{2,%d}):\s+(\S.*)$' % max_len, t, re.S)
    if not m:
        return None
    label = m.group(1).strip()
    if len(label.split()) > max_words or re.search(r'[.;,?!“”]', label) or label.endswith(('(', '/')):
        return None
    if label.count('(') != label.count(')'):
        return None
    if re.match(r'^(https?|Gambar|Bab)\b', label):
        return None
    return label, m.group(2)


def callout_for(t):
    for rx, kind, _ in CALLOUT_RULES:
        m = rx.match(t)
        if m:
            return kind, m.group(1).strip(), t[m.end():].strip()
    return None


class Ctx:
    def __init__(self, num, subject, names):
        self.num, self.subject, self.names = num, subject, names
        self.fig_map = {}      # label lama ("6.4") -> nomor urut baru (kemunculan pertama bila label ganda)
        self.pre_count = 0     # jumlah gambar menurut pemindaian awal
        self.render_n = 0
        self.figs = []         # {old, new, urls, caption, credit}
        self.dropped = []      # (src, text, alasan) untuk laporan
        self.autoheads = []
        self.last_heading = ''


def figure_groups(run):
    """Satu rangkaian tautan gambar + keterangan -> daftar gambar.

    Dokumen menaruh beberapa gambar berurutan lalu keterangannya. Sebanyak gambar = sebanyak keterangan: berpasangan
    berurutan. Satu keterangan untuk beberapa gambar: satu galeri. Keterangan sebelum gambar (urutan terbalik) ikut
    gambar sesudahnya."""
    segs, imgs, caps = [], [], []
    for tk in run:
        if tk['k'] == 'img':
            if caps and imgs:
                segs.append((imgs, caps))
                imgs, caps = [], []
            imgs.append(tk)
        else:
            caps.append(tk)
    if imgs or caps:
        segs.append((imgs, caps))
    out = []
    for imgs, caps in segs:
        if not imgs:
            out.extend({'imgs': [], 'cap': c, 'warn': ''} for c in caps)
        elif len(caps) == len(imgs):
            out.extend({'imgs': [im], 'cap': c, 'warn': ''} for im, c in zip(imgs, caps))
        else:
            warn = f'{len(imgs)} gambar dengan {len(caps)} keterangan' if len(caps) > 1 else ''
            out.append({'imgs': imgs, 'cap': caps[0] if caps else None, 'warn': warn})
    return out


def runs_in(toks):
    i, n = 0, len(toks)
    while i < n:
        if toks[i]['k'] in ('img', 'cap'):
            j = i
            while j < n and toks[j]['k'] in ('img', 'cap'):
                j += 1
            yield i, j
            i = j
        else:
            i += 1


def prescan_figures(toks, ctx):
    """Nomor gambar baru menurut urutan kemunculan; rujukan "Gambar 6.4" di teks dipetakan ke nomor baru."""
    for i, j in runs_in(toks):
        for fg in figure_groups(toks[i:j]):
            if not fg['imgs']:
                continue
            ctx.pre_count += 1
            m = CAPTION.match(fg['cap']['text']) if fg['cap'] else None
            ctx.fig_map.setdefault(m.group(1) if m else f'x{ctx.pre_count}', ctx.pre_count)


def fix_fig_refs(text, ctx):
    def sub(m):
        old = m.group(1)
        return f'Gambar {ctx.fig_map[old]}' if old in ctx.fig_map else m.group(0)
    return re.sub(r'\bGambar (\d+\.\d+)\b', sub, text)


SCRUB = [
    # Catatan asal-usul penyusun dokumen Mikrobiologi ("sumber UTB/IUP", "materi sumber", "bank soal"): bukan isi pelajaran.
    (re.compile(r'^(?:Sumber|Materi)(?: bank soal| soal| sumber| panduan)?(?: (?:IUP|UTB)(?:/(?:IUP|UTB))?)? menekankan(?=:)'), 'Poin yang ditekankan'),
    (re.compile(r'^Materi sumber menekankan beberapa jalur(?=:)'), 'Beberapa jalur yang ditekankan'),
    (re.compile(r'^Materi panduan menyebut(?=:)'), 'Poin yang disebutkan'),
    (re.compile(r'^Sumber IUP mencatat(?=:)'), 'Catatan'),
    (re.compile(r'^Sumber UTB membedakan(?=:)'), 'Pembeda'),
    (re.compile(r'^Sumber UTB memasangkan toksin'), 'Pasangan toksin'),
    (re.compile(r'^Sumber UTB(?=:)'), 'Poin penting'),
    (re.compile(r'^Sesuai (?:soal |tabel )?UTB(?=:)'), 'Poin penting'),
    (re.compile(r'^Sesuai koreksi eksplisit pada panduan sumber(?=:)'), 'Poin penting'),
    (re.compile(r'^Clue UTB(?=:)'), 'Clue'),
    (re.compile(r'^Ciri kasus UTB(?=:)'), 'Ciri kasus'),
    (re.compile(r'^Shortcut utama sumber UTB(?=:)'), 'Shortcut utama'),
    (re.compile(r'^HIGH-YIELD dari sumber UTB/IUP(?=:)'), 'High-yield'),
    (re.compile(r'^Clue klinis yang sering muncul di bank soal(?=:)'), 'Clue klinis yang sering muncul'),
    (re.compile(r'^Clostridium klasik pada materi UTB(?=:)'), 'Clostridium klasik'),
    (re.compile(r'^Tambahan pembelajaran untuk menjelaskan stem soal UTB(?=:)'), 'Tambahan pembelajaran'),
    (re.compile(r'^Materi inti UTB/IUP pada bab ini menekankan dua kelompok besar(?=:)'), 'Dua kelompok besar pada bab ini'),
    (re.compile(r'^UTB menekankan tiga antigen(?=:)'), 'Tiga antigen yang ditekankan'),
    (re.compile(r'^Sumber soal menekankan bahwa klasifikasi'), 'Klasifikasi'),
    (re.compile(r'^Menurut materi UTB yang dikoreksi di panduan: '), 'Famili: '),
    (re.compile(r'^Materi UTB menempatkan B\. fragilis sebagai'), 'B. fragilis adalah'),
    (re.compile(r'^UTB menempatkan Shigella sekitar'), 'Shigella sekitar'),
    (re.compile(r'^Sumber UTB menekankan fluorochrome sebagai alternatif'), 'Fluorochrome menjadi alternatif'),
    (re.compile(r'^UTB menekankan dark-field microscopy dan silver impregnation untuk visualisasi\.'), 'Dark-field microscopy dan silver impregnation dipakai untuk visualisasi.'),
    (re.compile(r'; UTB juga menekankan serologi serta immunofluorescence'), '; serologi dan immunofluorescence juga dipakai'),
    (re.compile(r'^Dalam bank soal materi, pembentukan'), 'Pembentukan'),
    (re.compile(r'^Pada materi UTB, shift'), 'Shift'),
    (re.compile(r'; materi sumber menekankan tidak ada antivirus'), '; tidak ada antivirus'),
    (re.compile(r'(?:,| )?\b(?:pada|dalam) (?:sumber UTB/Jawetz|sumber UTB|tabel (?:komparatif|pembanding) UTB|materi sumber|materi slide|materi UTB|pola soal UTB|pola kasus bayi UTB)(?=[.:;,]|$)'), ''),
    (re.compile(r'\bmenurut koreksi panduan\b,? ?'), ''),
    (re.compile(r'(?:, )?\btetapi sumber praktikum menekankan\b'), ', tetapi'),
    (re.compile(r'\bsumber praktikum menekankan\b ?'), ''),
    (re.compile(r'\bPada pola kasus bayi UTB\b'), 'Pada pola kasus bayi'),
    (re.compile(r'\bpada pola kasus bayi UTB\b'), 'pada pola kasus bayi'),
    (re.compile(r'\bdalam sumber UTB:'), ':'),
    (re.compile(r' pada tabel pembanding UTB\b'), ''),
    (re.compile(r' dalam tabel komparatif UTB\b'), ''),
    (re.compile(r'(Jebakan Soal) UTB\b', re.I), r'\1'),
    (re.compile(r'\s*(?:—\s*)?(?:dari )?Rangkuman UTB\b', re.I), ''),
    (re.compile(r'(Posisi dalam Materi) UTB\b', re.I), r'\1'),
    (re.compile(r' pada rangkuman UTB menjadi pembeda'), ' — pembeda'),
    (re.compile(r'; bagian ini mempertahankan framing materi UTB/PPT12 untuk kebutuhan ujian'), ''),
    (re.compile(r'\bBayi \+ wheezing(.*) pada pola soal UTB\.'), r'Bayi + wheezing\1.'),
    (re.compile(r'\s*agar retrieval MEDCOEL tetap modular'), ''),
    (re.compile(r'Untuk retrieval MEDCOEL, simpan'), 'Untuk belajar, simpan'),
    (re.compile(r'Prinsip retrieval:'), 'Prinsip mengingat:'),
    (re.compile(r'\bSumber Drive\b'), 'Sumber'),
    (re.compile(r'\bmaster note ini\b'), 'catatan ini'),
    (re.compile(r'\bmaster note\b'), 'catatan'),
]


def prose(text, ctx):
    t = text
    for rx, rep_ in SCRUB:
        t = rx.sub(rep_, t)
    t = rewrite_refs(t, ctx.num, ctx.names)
    t = fix_fig_refs(t, ctx)
    return t.strip()


def esc_title(s):
    return s.replace('"', '”')


def cap_first(s):
    m = re.match(r'^([a-z]{3,})\b', s)
    return s[0].upper() + s[1:] if m else s


def para_to_md(t, ctx):
    t = prose(t, ctx)
    co = callout_for(t)
    if co:
        kind, label, rest = co
        return ('callout', kind, label, cap_first(rest))
    m = re.match(r'^(Kulit kepala dapat diingat sebagai SCALP)\s*:\s*(.*)$', t, re.S)
    if m:
        return ('callout', 'tip', 'Mnemonic', f'{m.group(1)}: {m.group(2)}')
    m = re.match(r'^(Contoh \d+)\s+—\s+(.*)$', t, re.S)
    if m:
        return ('p', f'**{m.group(1)}**: {m.group(2)}')
    lab = lead_label(t)
    if lab:
        return ('p', f'**{lab[0]}**: {lab[1]}')
    return ('p', t)


def render_blocks(toks, ctx, in_sources=False):
    """Token bagian -> daftar baris Markdown (blok dipisah baris kosong)."""
    out = []
    i, n = 0, len(toks)
    while i < n:
        tk = toks[i]
        k = tk['k']
        if k in ('img', 'cap'):
            j = i
            while j < n and toks[j]['k'] in ('img', 'cap'):
                j += 1
            for fg in figure_groups(toks[i:j]):
                if not fg['imgs']:
                    ctx.dropped.append((fg['cap']['src'], fg['cap']['text'], 'keterangan gambar tanpa tautan'))
                    continue
                m = CAPTION.match(fg['cap']['text']) if fg['cap'] else None
                ctx.render_n += 1
                old = m.group(1) if m else f'x{ctx.render_n}'
                cap_text = prose(m.group(2), ctx) if m else (f'Ilustrasi pendukung: {ctx.last_heading}' if ctx.last_heading else 'Ilustrasi pendukung')
                ctx.figs.append({'old': old, 'new': ctx.render_n, 'urls': [im['url'] for im in fg['imgs']], 'caption': cap_text, 'src': fg['imgs'][0]['src'], 'warn': fg['warn']})
                out.append(('fig', len(ctx.figs) - 1))
            i = j
            continue
        if k == 'li' or k == 'nli':
            items = []
            while i < n and toks[i]['k'] == k:
                items.append(toks[i])
                i += 1
            bodies = []
            for it in items:
                body = prose(it['text'], ctx)
                if INTERNAL_LINE.match(body) and not in_sources:
                    ctx.dropped.append((it['src'], body, 'baris internal'))
                    continue
                bodies.append(body)
            strict = [lead_label(b, 40, 5) for b in bodies]
            relaxed = [lead_label(b, 70, 9) for b in bodies]
            lines = []
            # Label tebal dipasang pada seluruh butir daftar hanya bila sebagian besar butirnya berlabel.
            use_labels = (not in_sources and k == 'li' and bodies
                          and sum(1 for s in strict if s) >= max(2, 0.5 * len(bodies)))
            for j, body in enumerate(bodies):
                lab = relaxed[j] if use_labels else None
                if lab:
                    body = f'**{lab[0]}**: {lab[1]}'
                lines.append(('- ' if k == 'li' else f'{len(lines) + 1}. ') + body)
            if lines:
                out.append(('md', '\n'.join(lines)))
            continue
        if k == 'h3':
            ctx.last_heading = tk['text']
            if tk.get('auto'):
                ctx.autoheads.append(tk['text'])
            out.append(('md', '### ' + prose(tk['text'], ctx)))
            i += 1
            continue
        if k == 'p':
            body = tk['text']
            if INTERNAL_LINE.match(body) and not in_sources:
                ctx.dropped.append((tk['src'], body, 'baris internal'))
                i += 1
                continue
            # "Label:" lalu satu paragraf isi -> satu paragraf ("**Label**: isi")
            if (body.endswith(':') and len(body) <= 160 and i + 1 < n and toks[i + 1]['k'] == 'p'
                    and not toks[i + 1]['text'].endswith(':') and not callout_for(body) and not callout_for(toks[i + 1]['text'])
                    and not (len(body) <= 32 and ' — ' in body)):
                body = body + ' ' + toks[i + 1]['text']
                i += 1
            # baris pendek berurutan tanpa jeda ("V — vein", "A — artery") jadi satu blok
            if len(body) <= 32 and ' — ' in body:
                grp = [body]
                while i + 1 < n and toks[i + 1]['k'] == 'p' and not toks[i + 1]['blank_before'] and len(toks[i + 1]['text']) <= 32 and ' — ' in toks[i + 1]['text']:
                    i += 1
                    grp.append(toks[i]['text'])
                out.append(('md', '\n'.join(re.sub(r'^([A-Z]) — ', r'**\1** — ', g) for g in grp)))
                i += 1
                continue
            kind = para_to_md(body, ctx)
            if kind[0] == 'callout':
                _, ctype, label, rest = kind
                inner = []
                if rest:
                    inner.append(rest)
                i += 1
                # label tanpa isi: paragraf berikutnya jadi isi kotak
                if not rest and i < n and toks[i]['k'] == 'p' and not callout_for(toks[i]['text']):
                    inner.append(cap_first(prose(toks[i]['text'], ctx)))
                    i += 1

                # label berakhir ':' dan diikuti butir -> butir ikut masuk kotak
                if (not rest) or rest.endswith(':'):
                    items = []
                    while i < n and toks[i]['k'] == 'li':
                        items.append('- ' + prose(toks[i]['text'], ctx))
                        i += 1
                    if items:
                        inner.append('\n'.join(items))
                if not inner:
                    inner.append('')
                lines = [f'> [!{ctype}] {label}']
                for bi, block in enumerate(inner):
                    if bi:
                        lines.append('>')
                    lines.extend('> ' + ln if ln else '>' for ln in block.split('\n'))
                out.append(('md', '\n'.join(lines)))
                continue
            out.append(('md', kind[1]))
            i += 1
            continue
        i += 1
    return out


# ----------------------------------------------------------------------------
# 5. Atribusi gambar
# ----------------------------------------------------------------------------
# Atribusi yang di dokumen tercantum tanpa nomor gambar; dipasangkan manual dengan keterangan gambarnya.
CREDIT_OVERRIDES = {
    ('anatomi', 6, '6.1'): 'Materi OER anatomi berbasis OpenStax (orientasi sternum dan iga)',
    ('anatomi', 6, '6.2'): '“Gray530.png”, Gray’s Anatomy plate, Wikimedia Commons, public domain',
    ('anatomi', 6, '6.3'): '“Compartments of the mediastinum.png”, Wikimedia Commons, CC BY-SA 3.0',
}

CREDIT_LI = re.compile(r'^Gambar\s+(\d+(?:\.\d+)?)\s*[—–:-]\s*(.+)$', re.S)


def collect_credits(sec_toks):
    """Daftar 'Sumber visual' di akhir BAB -> {label lama: teks atribusi} + daftar berurut tanpa label."""
    by_label, ordered = {}, []
    in_visual = False
    for tk in sec_toks:
        if tk['k'] == 'h3' or (tk['k'] == 'p' and len(tk['text']) < 40):
            if tk['k'] == 'h3' or re.search(r'sumber visual|visual provenance', tk['text'], re.I) or tk['text'].endswith(':'):
                in_visual = bool(re.search(r'sumber visual|visual provenance', tk['text'], re.I))
                continue
        if tk['k'] == 'li' and in_visual:
            m = CREDIT_LI.match(tk['text'])
            if m:
                by_label[m.group(1)] = m.group(2).strip().rstrip('.')
            elif tk['text'].startswith('“') or tk['text'].startswith('"'):
                ordered.append(tk['text'].strip().rstrip('.'))
    return by_label, ordered


def split_caption_credit(cap):
    m_tail = re.search(r'\s+((?:OpenStax|Wikimedia|NCBI|Gray)[^()]*\([^)]*\))\.?$', cap.strip())
    if m_tail and not re.search(r'Sumber', cap):
        return cap[:m_tail.start()].strip(), m_tail.group(1).strip()
    cap = re.sub(r'\s*Visual open-license[^.]*\.?', '', cap).strip()
    cap = re.sub(r'\s*Visual internet[^.]*\.?', '', cap).strip()
    cap = re.sub(r'\s*Sumber visual internet\s*:\s*rincian atribusi dan lisensi terdapat pada bagian Sumber visual\.?', '', cap).strip()
    m = re.search(r'\s*Sumber(?: visual)?\s*:\s*(.+)$', cap, re.S)
    if not m:
        return cap.strip(), ''
    credit = m.group(1).strip()
    head = cap[:m.start()].strip()
    if re.match(r'internet\s*:\s*rincian atribusi', credit, re.I):
        return head, ''
    return head, credit.rstrip('.')


# ----------------------------------------------------------------------------
# 6. Satu BAB -> Markdown
# ----------------------------------------------------------------------------
def fig_md(f):
    cap = f['caption'].replace('[', '(').replace(']', ')')
    title = f' "{esc_title(f["credit"])}"' if f.get('credit') else ''
    lines = [f'![]({u})' for u in f['urls'][:-1]]      # galeri: gambar tanpa keterangan, yang terakhir membawa keterangan
    lines.append(f'![{cap}]({f["urls"][-1]}{title})')
    return '\n'.join(lines)


def figure_md_part(b, ctx, credits, ordered):
    """Blok gambar -> Markdown; keterangan dan atribusi dipisah ("Sumber: ..." di keterangan atau dari daftar sumber)."""
    f = ctx.figs[b[1]]
    head, cr = split_caption_credit(f['caption'])
    f['caption'] = head
    f['credit'] = cr or credits.get(f['old'], '')
    if f['credit']:
        f['caption'] = re.sub(r'\s*Visual [^.]*(?:\.(?=\d)[^.]*)*\.?$', '', f['caption']).strip()
    if not f['credit'] and ordered and len(ordered) == ctx.pre_count:
        f['credit'] = ordered[f['new'] - 1]
    return fig_md(f)


def chapter_to_md(ch, subject, report, names):
    ctx = Ctx(ch['num'], subject, names)
    promote_parts(ch)
    pre, sections = group_sections(ch)
    # Gambar (mis. Fisiologi: satu gambar per BAB di bawah judul BAB) dan paragraf pengantar sebelum bagian pertama tampil sebagai pembuka.
    intro = [tk for tk in pre if tk['k'] in ('img', 'cap') or (tk['k'] in ('p', 'li', 'nli', 'h3') and not INTERNAL_LINE.match(tk['text'])
                                                                 and not re.match(r'^Status\s*:', tk['text'], re.I))]
    prescan_figures(intro + [tk for s in sections if s['kind'] not in ('drop',) for tk in s['toks']], ctx)

    # atribusi: dari bagian sumber (Gambar X.Y — ...) atau dari keterangan ("Sumber: ...")
    credits, ordered = {}, []
    for s in sections:
        if s['kind'] == 'sumber':
            c, o = collect_credits(s['toks'])
            credits.update(c)
            ordered += o
    for (sj, n, old), text in CREDIT_OVERRIDES.items():
        if sj == subject and n == ch['num']:
            credits[old] = text
    for old in list(credits):
        if '.' not in old:
            credits.setdefault(f"{ch['num']}.{old}", credits[old])
    for old in credits:
        credits[old] = re.sub(r';\s*digunakan untuk.*$', '', credits[old]).strip()

    parts = [MARKER]
    fig_seq = 0
    figure_part = lambda b: figure_md_part(b, ctx, credits, ordered)
    if intro:
        ctx.last_heading = ch['title']
        for b in render_blocks(intro, ctx):
            parts.append(figure_part(b) if b[0] == 'fig' else b[1])
    for s in sections:
        if s['kind'] == 'drop':
            ctx.dropped.append((s['src'], s['raw'], 'bagian internal (ringkasan untuk AI)'))
            continue
        if s['kind'] == 'sumber':
            continue
        if s['kind'] == 'part':
            parts.append(f"# Bagian {s['letter']}: {s['title']}")
            continue
        s['title'] = prose(s['title'], ctx)
        ctx.last_heading = s['title']
        parts.append('## ' + s['title'] + ('' if s['kind'] == 'isi' else ' {' + s['kind'] + '}'))
        toks_ = s['toks']
        if s['kind'] == 'highyield':
            # Ringkasan yang ditulis sebagai kalimat-kalimat pendek terpisah dijadikan daftar (bisa dicentang siswa).
            toks_ = [dict(t, k='li') if (t['k'] == 'p' and len(t['text']) <= 240 and not t['text'].endswith(':')
                                         and not callout_for(t['text'])
                                         and not (q and toks_[q - 1]['k'] == 'p' and toks_[q - 1]['text'].endswith(':')))
                     else t for q, t in enumerate(toks_)]
        blocks = render_blocks(toks_, ctx)
        for b in blocks:
            parts.append(figure_part(b) if b[0] == 'fig' else b[1])
    # Bagian "Sumber & atribusi" di akhir BAB tidak dimasukkan: atribusi tiap gambar sudah tampil di bawah gambarnya.
    for s in sections:
        if s['kind'] == 'sumber':
            ctx.dropped.append((s['src'], s['raw'], 'bagian sumber & atribusi (atribusi ada di tiap gambar)'))
    md = '\n\n'.join(parts).rstrip() + '\n'
    cards = flashcards.make_cards(md)
    if cards:
        md += '\n' + flashcards.cards_md(cards) + '\n'
    ctx.n_cards = len(cards)
    report[ch['num']] = {'missing': verify_chapter(ch, md, ctx), 'figs': len(ctx.figs), 'dropped': ctx.dropped, 'autoheads': ctx.autoheads,
                         'pre': [t['text'][:90] for t in pre if t['k'] not in ('img', 'cap')], 'ctx': ctx}
    return md


def _norm(s):
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)          # tautan/gambar -> teks
    s = re.sub(r'\[!\w+\]', '', s)
    s = re.sub(r'[*>#`_:—]|^- |^\d+\. ', '', s, flags=re.M)
    s = s.replace('\u00a0', ' ')
    return re.sub(r'\s+', ' ', s).strip().lower().rstrip(':')


def verify_chapter(ch, md, ctx):
    """Setiap paragraf sumber yang tidak sengaja dibuang harus ada di keluaran."""
    promote_parts(ch)
    pre, sections = group_sections(ch)
    dropped_src = {d[0] for d in ctx.dropped}
    body = _norm(md)
    missing = []
    for tk in pre:                                      # teks sebelum bagian pertama harus ikut masuk (sebagai pembuka)
        if tk['k'] in ('img', 'cap') or tk['src'] in dropped_src or INTERNAL_LINE.match(tk['text']) or re.match(r'^Status\s*:', tk['text'], re.I):
            continue
        t = prose(tk['text'], ctx)
        if _norm(t) and _norm(t) not in body:
            missing.append((tk['src'], t[:100]))
    for s in sections:
        if s['kind'] in ('drop', 'part', 'sumber'):
            continue
        for tk in s['toks']:
            if tk['src'] in dropped_src or tk['k'] in ('img', 'cap'):
                continue
            t = tk['text']
            if tk['k'] == 'h2':
                t = clean_h2(t, tk.get('force'))
            t = prose(t, ctx)
            if not _norm(t) or _norm(t) in body:
                continue
            missing.append((tk['src'], t[:100]))
    return missing


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('docx')
    ap.add_argument('--subject', default='anatomi', help='slug mata kuliah di web (anatomi, biokimia, ...)')
    ap.add_argument('--subject-name', help='nama mata kuliah di docs/MATA_KULIAH.md (bawaan: slug dengan huruf awal besar)')
    ap.add_argument('--out', default=os.path.join('apps', 'pocketbase', 'content', 'materi'))
    ap.add_argument('--skip-unmatched', action='store_true', help='lewati BAB di dokumen yang bukan milik mata kuliah ini (mis. BAB Genetika di dokumen Biokimia)')
    ap.add_argument('--allow-missing', action='store_true', help='BAB di web yang kosong/tidak ada di dokumen hanya dilaporkan (tidak menghentikan konversi)')
    ap.add_argument('--report', action='store_true', help='cetak laporan: yang dibuang, subjudul otomatis, gambar tanpa atribusi')
    a = ap.parse_args()
    paras, correction_notes = apply_corrections(read_paragraphs(a.docx), a.subject)
    paras = merge_image_credits(normalize_upper(paras))
    toks = auto_headings(merge_fragments(classify(paras)))
    chapters = split_chapters(toks)
    if not chapters:
        sys.exit('Tidak ada judul "Bab N — ..." (Heading 1) di dokumen.')
    site = site_chapters(a.subject_name or a.subject.capitalize())
    chapters, select_notes = select_chapters(chapters, site, a.skip_unmatched)
    nums = [c['num'] for c in chapters]
    if len(nums) != len(set(nums)):
        sys.exit(f'Nomor BAB ganda setelah pemilihan: {sorted(n for n in nums if nums.count(n) > 1)}')
    doc_titles = {c['num']: c['title'] for c in chapters}
    titles = match_titles(doc_titles, site, a.allow_missing)
    names = ref_names(doc_titles)
    report, index = {}, []
    outdir = os.path.join(a.out, a.subject)
    os.makedirs(outdir, exist_ok=True)
    for old_file in os.listdir(outdir):          # folder ini sepenuhnya hasil konverter; buang berkas usang
        if old_file.endswith('.md'):
            os.remove(os.path.join(outdir, old_file))
    for ch in chapters:
        md = chapter_to_md(ch, a.subject, report, names)
        fname = f'bab-{ch["num"]:02d}-{slug(titles[ch["num"]])}.md'
        with open(os.path.join(outdir, fname), 'w', encoding='utf-8') as f:
            f.write(md)
        index.append({'subject': a.subject, 'subjectName': a.subject_name or a.subject.capitalize(), 'chapter': titles[ch['num']],
                      'file': f'{a.subject}/{fname}', 'docBab': ch['num']})
    idx_path = os.path.join(a.out, 'index.json')
    old = []
    if os.path.exists(idx_path):
        old = [e for e in json.load(open(idx_path, encoding='utf-8')) if e['subject'] != a.subject]
    with open(idx_path, 'w', encoding='utf-8') as f:
        json.dump(old + index, f, ensure_ascii=False, indent=2)
        f.write('\n')
    if a.report:
        for note in select_notes:
            print('** ' + note)
        for note in correction_notes:
            print('>> ' + note)
        for num, r in report.items():
            print(f'== Bab {num}: {r["figs"]} gambar; {r["ctx"].n_cards} kartu; dibuang {len(r["dropped"])}; subjudul otomatis {len(r["autoheads"])}')
            for x in r['pre']:
                print('   pembuka:', x)
            for src, t, why in r['dropped']:
                print(f'   - [{why}] ({src}) {t[:110]}')
            for h in r['autoheads']:
                print('   ~ auto-h3:', h)
            for src_i, t in r['missing']:
                print(f'   ?? hilang ({src_i}): {t}')
            for f in r['ctx'].figs:
                if f.get('warn'):
                    print(f"   ? gambar {f['new']}: {f['warn']}")
                if not f.get('credit'):
                    print(f"   ! gambar {f['new']} (asal {f['old']}) tanpa atribusi: {f['caption'][:70]}")


if __name__ == '__main__':
    main()
