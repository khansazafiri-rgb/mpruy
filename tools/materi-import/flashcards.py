"""Membuat kartu flashcard dari catatan materi (Markdown `materi:v2`) tanpa menambah isi baru.

Setiap kartu memakai kalimat yang sudah ada di catatan:
  - butir/paragraf berlabel tebal  "**Istilah**: penjelasan"        -> depan: Istilah, belakang: penjelasan
  - poin high-yield "A = B" / "A → B" / "A: B"                       -> depan: A, belakang: B
  - kalimat pengantar berakhiran ":" + daftar butir                  -> depan: kalimat pengantar, belakang: daftar
  - kotak sorot (klinis, jebakan, mnemonic, clue praktikum)         -> depan: jenis + topik, belakang: isi kotak

Format di catatan (bagian terakhir):   ## Flashcard {kartu}
                                       - [Konteks] Depan :: Belakang
"""
import re

LIMITS = {'def': 26, 'hy': 22, 'list': 10, 'box': 10}     # batas per BAB (kartu yang tersisa dibagi rata menurut urutan)
GENERIC = {
    'urutan', 'secara umum', 'secara sederhana', 'prinsip', 'prinsip utama', 'implikasi', 'contoh', 'catatan', 'risiko', 'risk',
    'konsekuensi penting', 'ringkasan', 'sebaliknya', 'fungsi', 'fungsi utama', 'sel utama', 'ciri', 'ciri utama', 'ciri penting',
    'komponen', 'komponen utama', 'catatan penting', 'intinya', 'kesimpulan', 'tujuan', 'contoh utama', 'konsep spasial penting',
}
BOX_TITLE = {
    'klinis': 'Korelasi klinis', 'warning': 'Jebakan ujian', 'tip': 'Mnemonic', 'praktikum': 'Clue praktikum', 'highyield': 'High-yield',
}
SKIP_SECTIONS = ('tujuan', 'praktikum', 'sumber', 'kartu')


def _plain(s):
    return re.sub(r'\*\*|==', '', re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)).strip()


def _short(s, n):
    s = s.strip()
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(' ', 1)[0]
    return cut.rstrip(',;:') + '…'


def _parse(md):
    """Daftar elemen: ('h2', judul, kind) ('h3', judul) ('li', teks) ('p', teks) ('box', varian, judul, isi)."""
    out, lines, i = [], md.split('\n'), 0
    while i < len(lines):
        ln = lines[i]
        m = re.match(r'^## (.*?)(?: \{(\w+)\})?\s*$', ln)
        if m and not ln.startswith('### '):
            out.append(('h2', m.group(1), m.group(2) or 'isi'))
        elif ln.startswith('### '):
            out.append(('h3', ln[4:].strip()))
        elif ln.startswith('> [!'):
            hm = re.match(r'^> \[!(\w+)\]\s*(.*)$', ln)
            body = []
            i += 1
            while i < len(lines) and lines[i].startswith('>'):
                body.append(re.sub(r'^>\s?', '', lines[i]))
                i += 1
            out.append(('box', hm.group(1), hm.group(2).strip(), ' '.join(b.lstrip('- ').strip() for b in body if b.strip())))
            continue
        elif re.match(r'^(- |\d+\. )', ln):
            out.append(('li', re.sub(r'^(- |\d+\. )', '', ln).strip()))
        elif ln.strip() and not ln.startswith(('!', '<!--', '#')):
            out.append(('p', ln.strip()))
        i += 1
    return out


def _spread(items, limit):
    if len(items) <= limit:
        return items
    step = len(items) / limit
    return [items[int(k * step)] for k in range(limit)]


def make_cards(md):
    els = _parse(md)
    kind, h2, h3 = 'isi', '', ''
    defs, hys, lists, boxes = [], [], [], []
    for idx, el in enumerate(els):
        t = el[0]
        if t == 'h2':
            h2, kind, h3 = el[1], el[2], ''
            continue
        if t == 'h3':
            h3 = el[1]
            continue
        if kind in SKIP_SECTIONS:
            continue
        ctx = _plain(h3 or h2)
        if t == 'box':
            _, var, title, body = el
            body = _plain(body)
            if len(body) < 30 or len(body) > 320:
                continue
            what = title or BOX_TITLE.get(var, 'Catatan')
            front = what if (len(what.split()) > 3 or ctx.lower() in what.lower()) else f'{what}: {ctx}'
            boxes.append((ctx, _short(front, 110), body))
            continue
        if t not in ('li', 'p'):
            continue
        text = el[1]
        if kind == 'highyield':
            plain = _plain(text).rstrip(';')
            card = None
            for delim in (' = ', ' → ', ': ', ' adalah '):
                if plain.count(delim) != 1:
                    continue
                left, right = plain.split(delim)
                left, right = left.strip(), right.strip().rstrip('.')
                if 3 <= len(left) <= 55 and len(left.split()) <= 7 and len(right) >= 6 and not re.match(r'^(Jangan|Detail|Gambar|Bab|Shortcut|Clue|Practical|Praktikum|Trap|Mnemonic|High-yield|Catatan)\b', left, re.I):
                    card = (left, right)
                    break
            if card:
                hys.append(('High-yield', card[0], card[1]))
            continue
        m = re.match(r'^\*\*(.{2,70}?)\*\*:\s+(.{18,})$', text)
        if m:
            term, back = _plain(m.group(1)), _plain(m.group(2)).rstrip(';')
            if term.lower() in GENERIC or len(back) > 320 or re.match(r'^(Gambar|lihat)\b', back, re.I):
                continue
            defs.append((ctx, term, back))
            continue
        # kalimat pengantar + daftar
        if t == 'p' and text.endswith(':') and 12 <= len(text) <= 130 and text[0].isupper() or (t == 'p' and text.endswith('**:') and len(text) <= 130):
            items = []
            for nxt in els[idx + 1: idx + 12]:
                if nxt[0] != 'li':
                    break
                items.append(_plain(nxt[1]).rstrip(';.'))
            lead = _plain(text).rstrip(':')
            lead = re.split(r'(?<=[.!?])\s+', lead)[-1]          # hanya kalimat terakhir sebagai pertanyaan
            if 2 <= len(items) <= 9 and sum(map(len, items)) <= 420 and len(lead.split()) >= 3 and not re.match(r'^(Setelah|Saat|Jika|Bila|Mereka|Ini|Itu|Keduanya|Hal ini|Selain itu|Berikut)\b', lead):
                lists.append((ctx, _short(lead, 120) + ' …', '\n'.join('• ' + x for x in items)))
    cards = []
    for group, key in ((defs, 'def'), (hys, 'hy'), (lists, 'list'), (boxes, 'box')):
        cards.extend(_spread(group, LIMITS[key]))
    seen, uniq = set(), []
    for ctx, front, back in cards:
        k = (front.lower(), back.lower())
        if k in seen:
            continue
        seen.add(k)
        uniq.append((ctx, front, back))
    return uniq


def cards_md(cards):
    if not cards:
        return ''
    esc = lambda s: s.replace(' :: ', ' : ').replace('\n', '\n  ')
    lines = ['## Flashcard {kartu}', '']
    for ctx, front, back in cards:
        c = f'[{ctx.replace("]", ")").replace("[", "(")}] ' if ctx else ''
        lines.append(f'- {c}{esc(front)} :: {esc(back)}')
    return '\n'.join(lines)
