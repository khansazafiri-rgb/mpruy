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

import docx
from docx.oxml.ns import qn

MARKER = '<!-- materi:v2 -->'

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CATALOG_MD = os.path.join(ROOT, 'docs', 'MATA_KULIAH.md')


def norm_words(s):
    """Kata-kata judul untuk mencocokkan judul di dokumen dengan judul BAB di web."""
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = s.replace('&', ' dan ')
    s = re.sub(r'\([^)]*\)', ' ', s)          # keterangan dalam kurung berbeda-beda antar sumber
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    return [w for w in s.split() if w not in ('dan', 'yang', 'dari', 'pada')]


def site_chapters(subject_name):
    """Daftar BAB mata kuliah di web (docs/MATA_KULIAH.md), sesuai urutan di sana."""
    text = open(CATALOG_MD, encoding='utf-8').read()
    m = re.search(r'^## %s\s*$(.*?)(?=^## |\Z)' % re.escape(subject_name), text, re.S | re.M)
    if not m:
        sys.exit(f'Mata kuliah "{subject_name}" tidak ada di docs/MATA_KULIAH.md')
    return [re.sub(r'^\d+\.\s+', '', ln).strip() for ln in m.group(1).splitlines() if re.match(r'^\d+\.\s', ln)]


def match_titles(doc_titles, site_titles):
    """{nomor BAB di dokumen: judul BAB di web}; berhenti bila ada yang tak cocok atau ganda."""
    pairs = []
    for num, dt in doc_titles.items():
        dw = set(norm_words(dt))
        for st in site_titles:
            sw = set(norm_words(st))
            pairs.append((len(dw & sw) / max(1, len(dw | sw)), num, st))
    pairs.sort(reverse=True)
    out, used = {}, set()
    for score, num, st in pairs:
        if num in out or st in used or score < 0.5:
            continue
        out[num] = st
        used.add(st)
    problems = [f'Bab {n} — {t}' for n, t in doc_titles.items() if n not in out]
    left = [s for s in site_titles if s not in used]
    if problems or left:
        sys.exit('Judul BAB tidak cocok.\n  Di dokumen tanpa pasangan: %s\n  Di web tanpa pasangan: %s' % (problems or '-', left or '-'))
    return out


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
CAPTION = re.compile(r'^Gambar\s+(\d+(?:\.\d+)?)\.\s+(.*)$', re.S)
H2_NUM = re.compile(r'^(\d{1,2})\.\s+(.*)$')
H2_LETTER = re.compile(r'^([A-F])\.\s+(.*)$')

# Baris yang hanya urusan penyusun dokumen (tidak untuk siswa).
INTERNAL_LINE = re.compile(
    r'^(STATUS\s*:|Catatan editorial|MASTER DOCUMENT|Aturan visual|Aturan visual master note|'
    r'Sumber cakupan|PPT dosen khusus|Draft K\d+ terpisah)', re.I)
INTERNAL_ANY = re.compile(r'retrieval|knowledge base|\[CEK\]|master note|PPT dosen|bahan yang tersedia|dokumen master', re.I)

CALLOUT_RULES = [
    # (regex awalan, jenis, judul)
    (re.compile(r'^(Clinical anchors?|Clinical correlation|Clinical relation|Clinical orientation|Clinical landmark|'
                r'Clinical reasoning|Clinical pearl|Contoh klinis|Klinis)\s*:\s*', re.I), 'klinis', None),
    (re.compile(r'^(Exam trap|Jebakan penting|Jebakan ujian)\s*:\s*', re.I), 'warning', None),
    (re.compile(r'^(High-yield(?: distinction| principle)?|Konsep high-yield|Poin penting|Konsep penting)\s*:\s*', re.I), 'highyield', None),
    (re.compile(r'^(Mnemonic(?: praktis)?|Kulit kepala dapat diingat sebagai SCALP)\s*:\s*', re.I), 'tip', None),
]

SOURCE_H2 = re.compile(r'^(sumber dan provenance|rujukan dan atribusi gambar|sumber(?: dan atribusi)?)$', re.I)
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
    __slots__ = ('i', 'lvl', 'text', 'blank_before', 'has_img')

    def __init__(self, i, lvl, text, blank_before, has_img):
        self.i, self.lvl, self.text, self.blank_before, self.has_img = i, lvl, text, blank_before, has_img

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


def read_paragraphs(path):
    d = docx.Document(path)
    rels = d.part.rels
    out, blank = [], True
    for i, p in enumerate(d.paragraphs):
        t = inline_text(p, rels).replace('\u00a0', ' ').strip()
        if t.startswith('• ') and re.search(r'\S• ', t):
            t = '• ' + re.split(r'(?<=\S)• ', t)[-1].strip()   # butir menempel pada butir sebelumnya (ekspor Docs)
        if not t:
            blank = True
            continue
        name = p.style.name
        lvl = int(name[-1]) if name.startswith('Heading') else 0
        out.append(Para(i, lvl, t, blank, False))
        blank = False
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
    if BULLET.match(t) or NUM_ITEM.match(t) or re.search(r'[“”"]', t) or ' — ' in t:
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
        base = {'src': p.i, 'blank_before': p.blank_before}
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
        elif p.lvl == 2 and (H2_LETTER.match(t) or (len(t) < 70 and not t.endswith('.'))) and not t.startswith('http'):
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
            if t.isupper():
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
    if re.search(r'high-yield|jebakan|ringkasan (cepat|integratif)', t):
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


def clean_h2(text):
    t = text.strip()
    t = re.sub(r'^Batas Bab \d+$', 'Batas Cakupan Bab', t)
    m = H2_NUM.match(t)
    if m:
        t = m.group(2)
    else:
        m = H2_LETTER.match(t)
        if m:
            t = m.group(2)
    if t.isupper():
        t = t.title()
    return t.strip()


def group_sections(chapter):
    """Pecah token BAB menjadi pembuka (dibuang) + daftar bagian."""
    sections, cur = [], None
    pre = []
    SUMBER_TAIL = re.compile(r'^Sumber( untuk [Bb]ab (\d+|ini))?:?$')
    for tk in chapter['toks']:
        if tk['k'] in ('h3', 'p') and SUMBER_TAIL.match(tk['text']) and cur is not None and cur['kind'] != 'sumber':
            sections.append({'title': 'Sumber', 'raw': tk['text'], 'kind': 'sumber', 'toks': [], 'src': tk['src']})
            cur = sections[-1]
            continue
        if tk['k'] == 'part':
            m = H2_LETTER.match(tk['text'])
            title = clean_h2(tk['text'])
            sections.append({'title': title, 'letter': m.group(1) if m else '', 'raw': tk['text'], 'kind': 'part', 'toks': [], 'src': tk['src']})
            cur = sections[-1]
        elif tk['k'] == 'h2':
            title = clean_h2(tk['text'])
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
        self.fig_map = {}      # label lama ("6.4") -> nomor urut baru
        self.figs = []         # {old, new, url, caption, credit}
        self.dropped = []      # (src, text, alasan) untuk laporan
        self.autoheads = []
        self.last_heading = ''

    def fig_new(self, old):
        if old not in self.fig_map:
            self.fig_map[old] = len(self.fig_map) + 1
        return self.fig_map[old]


def prescan_figures(toks, ctx):
    """Tetapkan nomor gambar baru menurut urutan kemunculan tautan gambar di BAB."""
    for i, tk in enumerate(toks):
        if tk['k'] != 'img':
            continue
        cap = None
        if i + 1 < len(toks) and toks[i + 1]['k'] == 'cap':
            cap = toks[i + 1]
        elif i > 0 and toks[i - 1]['k'] == 'cap':
            cap = toks[i - 1]
        m = CAPTION.match(cap['text']) if cap else None
        ctx.fig_new(m.group(1) if m else f'x{len(ctx.fig_map) + 1}')


def fix_fig_refs(text, ctx):
    def sub(m):
        old = m.group(1)
        return f'Gambar {ctx.fig_map[old]}' if old in ctx.fig_map else m.group(0)
    return re.sub(r'\bGambar (\d+\.\d+)\b', sub, text)


SCRUB = [
    (re.compile(r'\s*agar retrieval MEDCOEL tetap modular'), ''),
    (re.compile(r'Untuk retrieval MEDCOEL, simpan'), 'Untuk belajar, simpan'),
    (re.compile(r'Prinsip retrieval:'), 'Prinsip mengingat:'),
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
            # gambar + keterangan (urutan di dokumen: tautan lalu keterangan; sebagian terbalik)
            img = cap = None
            if k == 'img':
                img = tk
                if i + 1 < n and toks[i + 1]['k'] == 'cap':
                    cap = toks[i + 1]
                    i += 1
            else:
                cap = tk
                if i + 1 < n and toks[i + 1]['k'] == 'img':
                    img = toks[i + 1]
                    i += 1
            m = CAPTION.match(cap['text']) if cap else None
            old = m.group(1) if m else f'x{len(ctx.figs) + 1}'
            new = ctx.fig_new(old)
            cap_text = prose(m.group(2), ctx) if m else (f'Ilustrasi pendukung: {ctx.last_heading}' if ctx.last_heading else 'Ilustrasi pendukung')
            ctx.figs.append({'old': old, 'new': new, 'url': img['url'] if img else '', 'caption': cap_text, 'src': tk['src']})
            if img is None:
                ctx.dropped.append((tk['src'], tk['text'], 'keterangan gambar tanpa tautan'))
            else:
                out.append(('fig', len(ctx.figs) - 1))
            i += 1
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
    return f'![{cap}]({f["url"]}{title})'


def chapter_to_md(ch, subject, report, names):
    ctx = Ctx(ch['num'], subject, names)
    promote_parts(ch)
    pre, sections = group_sections(ch)
    prescan_figures([tk for s in sections if s['kind'] not in ('drop',) for tk in s['toks']], ctx)

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
    for s in sections:
        if s['kind'] == 'drop':
            ctx.dropped.append((s['src'], s['raw'], 'bagian internal (ringkasan untuk AI)'))
            continue
        if s['kind'] == 'sumber':
            continue  # dirakit di akhir
        if s['kind'] == 'part':
            parts.append(f"# Bagian {s['letter']}: {s['title']}")
            continue
        ctx.last_heading = s['title']
        parts.append('## ' + s['title'] + ('' if s['kind'] == 'isi' else ' {' + s['kind'] + '}'))
        blocks = render_blocks(s['toks'], ctx)
        for b in blocks:
            if b[0] == 'fig':
                f = ctx.figs[b[1]]
                head, cr = split_caption_credit(f['caption'])
                f['caption'] = head
                f['credit'] = cr or credits.get(f['old'], '')
                if f['credit']:
                    f['caption'] = re.sub(r'\s*Visual [^.]*(?:\.(?=\d)[^.]*)*\.?$', '', f['caption']).strip()
                if not f['credit'] and ordered and len(ordered) == len(ctx.fig_map):
                    f['credit'] = ordered[f['new'] - 1]
                parts.append(fig_md(f))
            else:
                parts.append(b[1])
    # bagian sumber
    for s in sections:
        if s['kind'] != 'sumber':
            continue
        keep, skip = [], False
        for tk in s['toks']:
            if tk['k'] == 'h3' or re.match(r'^Catatan editorial:?$', tk['text'], re.I):
                skip = bool(re.search(r'catatan editorial', tk['text'], re.I))
                if skip:
                    ctx.dropped.append((tk['src'], tk['text'], 'catatan editorial'))
            if skip:
                if tk['k'] != 'h3':
                    ctx.dropped.append((tk['src'], tk['text'], 'catatan editorial (isi)'))
                continue
            if tk['k'] in ('li', 'nli', 'p') and (INTERNAL_LINE.match(tk['text']) or INTERNAL_ANY.search(tk['text'])):
                ctx.dropped.append((tk['src'], tk['text'], 'baris internal di sumber'))
                continue
            keep.append(tk)
        blocks = render_blocks(keep, ctx, in_sources=True)
        if blocks:
            parts.append('## Sumber & Atribusi {sumber}')
            parts.extend(b[1] for b in blocks if b[0] == 'md')
    md = '\n\n'.join(parts).rstrip() + '\n'
    report[ch['num']] = {'missing': verify_chapter(ch, md, ctx), 'figs': len(ctx.figs), 'dropped': ctx.dropped, 'autoheads': ctx.autoheads,
                         'pre': [t['text'][:90] for t in pre], 'ctx': ctx}
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
    for s in sections:
        if s['kind'] in ('drop', 'part'):
            continue
        for tk in s['toks']:
            if tk['src'] in dropped_src or tk['k'] in ('img', 'cap'):
                continue
            t = tk['text']
            if tk['k'] == 'h2':
                t = clean_h2(t)
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
    ap.add_argument('--report', action='store_true', help='cetak laporan: yang dibuang, subjudul otomatis, gambar tanpa atribusi')
    a = ap.parse_args()
    paras = read_paragraphs(a.docx)
    toks = classify(paras)
    chapters = split_chapters(toks)
    if not chapters:
        sys.exit('Tidak ada judul "Bab N — ..." (Heading 1) di dokumen.')
    doc_titles = {c['num']: c['title'] for c in chapters}
    titles = match_titles(doc_titles, site_chapters(a.subject_name or a.subject.capitalize()))
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
        index.append({'subject': a.subject, 'chapter': titles[ch['num']], 'file': f'{a.subject}/{fname}', 'docBab': ch['num']})
    idx_path = os.path.join(a.out, 'index.json')
    old = []
    if os.path.exists(idx_path):
        old = [e for e in json.load(open(idx_path, encoding='utf-8')) if e['subject'] != a.subject]
    with open(idx_path, 'w', encoding='utf-8') as f:
        json.dump(old + index, f, ensure_ascii=False, indent=2)
        f.write('\n')
    if a.report:
        for num, r in report.items():
            print(f'== Bab {num}: {r["figs"]} gambar; dibuang {len(r["dropped"])}; subjudul otomatis {len(r["autoheads"])}')
            for x in r['pre']:
                print('   pembuka:', x)
            for src, t, why in r['dropped']:
                print(f'   - [{why}] ({src}) {t[:110]}')
            for h in r['autoheads']:
                print('   ~ auto-h3:', h)
            for src_i, t in r['missing']:
                print(f'   ?? hilang ({src_i}): {t}')
            for f in r['ctx'].figs:
                if not f.get('credit'):
                    print(f"   ! gambar {f['new']} (asal {f['old']}) tanpa atribusi: {f['caption'][:70]}")


if __name__ == '__main__':
    main()
