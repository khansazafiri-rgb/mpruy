"""Membuat kartu flashcard dari catatan materi (Markdown `materi:v2`) tanpa menambah isi baru.

Setiap kartu adalah PERTANYAAN yang bisa dipahami tanpa membaca catatan, dengan JAWABAN berupa poin besar/deskripsi yang sudah
ada di catatan:
  - butir/paragraf berlabel tebal  "**Istilah**: penjelasan"   -> "Apa yang dimaksud dengan Istilah?" / "Jelaskan Istilah ..."
                                   "**Indikasi**: ..."          -> "Pada <topik>, apa indikasinya?"   (label sifat)
  - poin high-yield "A → B"        -> "Apa jawaban/kesimpulan untuk petunjuk berikut: A?"
                    "A = B"        -> "Apa yang dimaksud dengan A?"
  - kalimat pengantar berakhiran ":" + daftar butir -> "Sebutkan <pengantar>."
  - kotak sorot (klinis, jebakan, mnemonic, clue praktikum) -> "Apa korelasi klinis dari <topik>?" dst.
  - BAB yang sangat ringkas (kartu di atas < MIN_CARDS): judul bagian + paragraf pertama -> "Jelaskan <judul>."

Format di catatan (bagian terakhir):   ## Flashcard {kartu}
                                       - [Konteks] Pertanyaan :: Jawaban
"""
import re

LIMITS = {'def': 26, 'hy': 22, 'list': 12, 'box': 10, 'head': 20}     # batas per BAB (kartu yang tersisa dibagi rata menurut urutan)
MIN_CARDS = 12      # di bawah ini, judul bagian + paragraf pertamanya ikut dijadikan kartu
GENERIC = {
    'urutan', 'secara umum', 'secara sederhana', 'prinsip', 'prinsip utama', 'implikasi', 'contoh', 'catatan', 'risiko', 'risk',
    'konsekuensi penting', 'ringkasan', 'sebaliknya', 'fungsi', 'fungsi utama', 'sel utama', 'ciri', 'ciri utama', 'ciri penting',
    'komponen', 'komponen utama', 'catatan penting', 'intinya', 'kesimpulan', 'tujuan', 'contoh utama', 'konsep spasial penting',
    'cara pikir ujian', 'cara hafal', 'cara membaca', 'tips', 'tip',
}
# label sifat: "**Indikasi**: ..." paling jelas dibaca sebagai "Pada <topik>, apa indikasinya?"
PROPS = (
    'lokasi', 'letak', 'jalur', 'mekanisme', 'indikasi', 'kontraindikasi', 'efek samping', 'efek', 'dosis', 'antidot', 'tata laksana',
    'penatalaksanaan', 'terapi', 'penyebab', 'etiologi', 'patofisiologi', 'gambaran klinis', 'manifestasi', 'gejala', 'tanda', 'diagnosis',
    'pemeriksaan', 'komplikasi', 'prognosis', 'pencegahan', 'faktor risiko', 'interpretasi', 'rumus', 'nilai normal', 'sediaan',
    'metabolisme', 'ekskresi', 'distribusi', 'absorpsi', 'farmakokinetik', 'farmakodinamik', 'durasi', 'onset', 'waktu paruh',
    'klasifikasi', 'jenis', 'tipe', 'lapisan', 'persarafan', 'vaskularisasi', 'perdarahan', 'origo', 'insersio', 'inervasi', 'fungsi',
    'struktur', 'komposisi', 'innervasi', 'target', 'reseptor', 'spektrum', 'resistensi', 'toksisitas', 'interaksi', 'pola', 'ciri',
    'morfologi', 'histologi', 'epidemiologi', 'definisi', 'batas', 'hubungan', 'peran', 'konsekuensi', 'dampak', 'tujuan', 'syarat',
    'kriteria', 'temuan', 'urutan', 'alur', 'reaksi', 'inti', 'inti bab', 'persamaan', 'inheritance', 'konsep', 'karakter', 'sifat', 'bentuk', 'jumlah', 'gambaran', 'pitfall', 'jebakan umum', 'kesalahan umum', 'enzim', 'substrat', 'produk', 'koenzim', 'kofaktor', 'gen', 'kromosom', 'karyotype', 'pewarisan', 'vektor', 'hospes', 'habitat', 'reservoir', 'transmisi', 'penularan', 'diagnostik', 'stadium', 'regulasi', 'cara kerja', 'cara pemberian', 'rute', 'nilai', 'ambang', 'batas atas', 'manfaat', 'kelebihan', 'kekurangan', 'perbedaan', 'persamaan', 'hasil', 'langkah', 'tindakan', 'pilihan', 'lini pertama', 'lini kedua', 'obat pilihan', 'contoh obat',
)
BOX_TITLE = {
    'klinis': 'Korelasi klinis', 'warning': 'Jebakan ujian', 'tip': 'Mnemonic', 'praktikum': 'Clue praktikum', 'highyield': 'High-yield',
}
GENERIC_BOX = re.compile(r'^(clinical pearl|clinical anchor|exam pearl|exam trap|poin penting|poin ujian|catatan(?: penting)?|korelasi klinis|'
                         r'jebakan(?: ujian| soal)?|mnemonic|high-yield|konsep high-yield|clue praktikum|penting|praktikum|contoh klinis|klinis)s?$', re.I)
JUNK_TERM = re.compile(r'^(sumber (?:visual|gambar|ilustrasi)|credit|kredit|penting|catatan|tambahan|practical|ingat|tips?|trap|jebakan|high-yield|clue|shortcut|mnemonic|korelasi|aturan|cara pikir|cara hafal|cara membaca|poin ujian|fokus|bedakan)\b', re.I)
FRAG_END = re.compile(r'\b(sebagai|dengan|oleh|dari|pada|untuk|yang|dan|atau|ke|di|dalam|melalui|menjadi)$', re.I)
FRAG_START = re.compile(r'^(di|pada|dalam|untuk|secara|jika|bila|saat|karena|dengan|dari|ke|oleh|tanpa|setelah|sebelum|selama|ketika|akibat|hasilnya|bila|maka|jadi|artinya|sehingga|namun|tetapi|oleh karena|selain|kemudian|lalu|juga)\b', re.I)
LIST_NOUN = re.compile(r'\b(jenis|tipe|macam|ciri|faktor|penyebab|langkah|urutan|tahap|komponen|contoh|kriteria|indikasi|kontraindikasi|efek|gejala|tanda|'
                       r'komplikasi|manifestasi|fungsi|golongan|kelas|kelompok|klasifikasi|pemeriksaan|temuan|syarat|prinsip|kategori|subtipe|varian|pilihan|'
                       r'mekanisme|cara|metode|bagian|lapisan|struktur|otot|saraf|arteri|vena|cabang|nama|regio|organ|sel|jaringan|zona|fase|stadium|gen|enzim)\b', re.I)
VERBISH = re.compile(r'\b(melakukan|terjadi|menyebabkan|dapat|akan|digunakan|memiliki|menghasilkan|berperan|bekerja|dibuat|menjadi|mengalami|bersifat|ditemukan|muncul|'
                     r'diberikan|dipakai|dipilih|dibedakan|diingat|dihafal|dilakukan|membentuk|mengubah|mengaktifkan|menghambat|menurunkan|meningkatkan|ditentukan|dibagi|diberi|digunakan|dilakukan|diukur|dihitung|dipakai|disebut|dihasilkan|dibentuk|diaktifkan|dihambat|diubah|bukan|hanya|mendapat|mendapatkan|melibatkan|mengandung|mengalir|berasal|bergantung|berhubungan|berkaitan|membutuhkan|memerlukan|menggunakan|mempunyai|terdiri|berupa|tergantung)\b', re.I)
DIRECTION = re.compile(r'^(?:superior|inferior|medial|lateral|anterior|posterior|proksimal|distal|dorsal|ventral|kranial|kaudal)(?: [a-z]+)?$', re.I)
ORDINAL = re.compile(r'^(?:contoh|poin|langkah|tahap|kasus|pola|butir|item|opsi|pilihan|skenario|vignette|soal|bagian|catatan|rumus|gambar|tabel|fase|step)\s*[\dIVX]+[a-z]?\b', re.I)
VAGUE_H3 = re.compile(r'^(?:istilah|bidang|posisi|contoh|poin|ringkasan|catatan|konsep|komponen|ciri|tabel|daftar|bagian|jenis|tipe|klasifikasi|kelompok|golongan|pembagian|pola|urutan|langkah|rangkuman|perbandingan|detail|aplikasi|clinical application)\b', re.I)
GENERIC_LEAD = re.compile(r'\b(wajib|hafal|pasangan|penting|utama|terkait|klasik|high-yield|khas|umum|lain|tambahan|kaya|jangka|konseptual|pola|karakteristik|penanda|clinical use|regulasi|perbedaan|singkat)\b', re.I)
BAD_TERM = re.compile(r'[:;?≠=→]|\.\s|\.$|^\d')
GENERIC_TOPIC = re.compile(r'^(?:peta besar|big picture|ringkasan|sumber|konsep besar|gambaran besar|poin high-yield|pola kasus|jebakan|cara membaca|checklist|memory map|ikhtisar)\b', re.I)
SKIP_SECTIONS = ('tujuan', 'praktikum', 'sumber', 'kartu')
HY_CTX = {'high-yield', 'high yield', 'pola kasus high-yield', 'poin high-yield untuk ujian', 'ringkasan 30 detik', 'poin high-yield'}


def _plain(s):
    return re.sub(r'\*\*|==', '', re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)).strip()


def _short(s, n):
    s = s.strip()
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(' ', 1)[0]
    return cut.rstrip(',;:') + '…'


def _cap(s):
    s = s.strip()
    return s[:1].upper() + s[1:] if s else s


def _low(s):
    """Huruf kecil di awal, kecuali singkatan/nama (ACE-I, DNA, β₂-agonis, Ca²⁺)."""
    s = s.strip()
    if not s:
        return s
    w = s.split(' ', 1)[0]
    if sum(c.isupper() for c in w) >= 2 or any(c.isdigit() for c in w[:3]):
        return s
    return s[0].lower() + s[1:]


def _topic(s):
    """Judul bagian tanpa nomor/huruf awalan ("3. Postrenal AKI" -> "Postrenal AKI")."""
    s = _plain(s)
    s = re.sub(r'^(?:\d+(?:\.\d+)*\.?|[A-F]\.)\s+', '', s)
    return s.strip()


def _ends_q(s):
    return s if s.endswith('?') else s.rstrip('.:;') + '?'


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


# ----------------------------------------------------------------------------
# Pembentuk pertanyaan
# ----------------------------------------------------------------------------
def _is_prop(term):
    t = term.lower().strip()
    n = len(t.split())
    for p in PROPS:
        if t == p or (t.startswith(p + ' ') and n <= len(p.split()) + 1):
            return True
    return n <= 3 and (t.split()[0].endswith('nya') or t.endswith(' clue'))


def _clean_term(term):
    term = re.sub(r'^[-–•]\s+', '', term.strip()).rstrip(':')
    term = re.sub(r'\s+yang\s+(?:disebutkan|dicantumkan|ditekankan|tertulis|dibahas|disebut)(?: (?:dalam|sumber|materi))?$', '', term)
    return re.sub(r'\s+(?:adalah|yaitu|ialah|meliputi|mencakup)$', '', term, flags=re.I)


def q_def(term, back, topic):
    """"**Istilah**: penjelasan"."""
    term = _clean_term(term)
    t_low = term.lower()
    words = len(term.split())
    same = topic and (topic.lower() == t_low or topic.lower() in t_low or t_low in topic.lower())
    if BAD_TERM.search(term) and not (' + ' in term or '→' in term):
        return None
    if re.search(r'\+\s*\+|\+\s*$|^\s*\+', term):
        return None
    if FRAG_START.match(term) or FRAG_END.search(term) or JUNK_TERM.match(term):
        return None          # potongan kalimat atau label sampah, bukan istilah
    if re.search(r'\b(dianggap|disangka|dikira|tertukar|disalahartikan|dibaca sebagai)\b', term, re.I):
        return _ends_q(f'Bagaimana cara menghindari kesalahan berikut: {term}')
    if ' + ' in term or '→' in term:
        return _ends_q(f'Apa jawaban atau kesimpulan untuk petunjuk berikut: {term}')
    if re.search(r'\bdapat (?:diringkas|dibagi|dibedakan|dipahami|dijelaskan|diingat)$', term, re.I):
        return _ends_q(f'Bagaimana {_low(term)}')
    if DIRECTION.match(term) and topic:
        return _ends_q(f'Apa struktur atau batas {_low(term)} pada {topic}')
    if _is_prop(term):
        lab = _low(term)
        lab = lab if lab.endswith('nya') else lab + 'nya'
        if topic and not same:
            return _ends_q(f'Pada {topic}, apa {lab}')
        return _ends_q(f'Apa {lab}')
    if words >= 5 or (words >= 3 and re.search(r'\b(juga|berubah|lebih|tidak|bukan|selalu|sering|hanya|mulai|masih|sudah|akan|dapat)\b', term, re.I)):
        return f'Jelaskan: {term}.'
    if re.match(r'^(adalah|merupakan|ialah|yaitu)\b', back, re.I) or (words <= 2 and topic and not same and len(topic) <= 60):
        return _ends_q(f'Apa yang dimaksud dengan {term}' + (f' pada {topic}' if topic and not same and len(topic) <= 60 else ''))
    if topic and not same and len(topic) <= 70:
        return f'Jelaskan {term} dalam konteks {topic}.'
    return f'Jelaskan {term}.'


def q_hy(left, right, delim, topic):
    left_c = left.strip()
    n = len(left_c.split())
    if delim == ' → ':
        if n <= 3:
            return _ends_q(f'Apa yang perlu diingat tentang {left_c}' + (f' pada {topic}' if topic and len(topic) <= 60 else ''))
        return _ends_q(f'Apa jawaban atau kesimpulan untuk petunjuk berikut: {left_c}')
    if delim in (' = ', ' adalah ', ': ') and (BAD_TERM.search(left_c) or re.search(r'\+\s*\+|\+\s*$|^\s*\+', left_c)):
        return None
    if delim in (' = ', ' adalah '):
        return _ends_q(f'Apa yang dimaksud dengan {left_c}' + (f' pada {topic}' if topic and len(topic) <= 60 and len(left_c) <= 30 else ''))
    if n > 5:
        return f'Jelaskan: {left_c}.'
    if FRAG_START.match(left_c) or FRAG_END.search(left_c) or JUNK_TERM.match(left_c):
        return None
    if not _is_prop(left_c):
        return _ends_q(f'Apa yang perlu diketahui tentang {left_c}' + (f' pada {topic}' if topic and len(topic) <= 60 and len(left_c) <= 30 else ''))
    lab = _low(left_c)
    return _ends_q(f'Apa {lab}' + (f' pada {topic}' if topic and topic.lower() not in lab else ''))


LEAD_TAIL = re.compile(r'\s+(?:meliputi|mencakup|antara lain|yaitu|adalah|ialah|terdiri atas|terdiri dari|berupa|sebagai berikut|berikut|dapat berupa|'
                       r'dapat dibagi menjadi|dibagi menjadi|dibagi atas|dibedakan menjadi|digolongkan menjadi|ada|ialah)$', re.I)
LEAD_BAD = re.compile(r'\b(berikut|tersebut|di atas|di bawah|ini|itu|nya)\b|^(Gunakan|Pikirkan|Perhatikan|Pastikan|Ingat|Lihat|Bandingkan|Cocokkan|Tentukan|'
                      r'Jika|Bila|Saat|Pada|Setelah|Sebelum|Karena|Namun|Tetapi|Selain|Dalam|Untuk|Secara|Ketika)\b', re.I)


def q_list(lead, topic):
    lead = lead.strip().rstrip(':').strip()
    core = LEAD_TAIL.sub('', lead).strip()
    core = re.sub(r'\s+yang\s+(?:disebutkan|dicantumkan|ditekankan|dibahas|tertulis)\b.*$', '', core).strip()
    if re.search(r'[=→]|\b(?:sangat|sering|biasanya|umumnya|paling|selalu)\b', core, re.I) and len(core.split()) <= 6 and not LIST_NOUN.search(core):
        return None, False
    if not core or FRAG_START.match(core) or FRAG_END.search(core) or JUNK_TERM.match(core) or VERBISH.search(core):
        return None, False
    if re.search(r'\b(urutan|langkah|algoritma|alur|tahap)\b', core, re.I) and (LEAD_BAD.search(core) or len(core.split()) <= 3):
        return _ends_q(f'Sebutkan urutan atau langkah pada {topic}' if topic else 'Sebutkan urutan atau langkahnya'), True
    if LEAD_BAD.search(core) or len(core.split()) > 12:
        return None, False
    low = _low(core)
    if LIST_NOUN.search(core) or _is_prop(core):
        tail = f' pada {topic}' if topic and topic.lower() not in low and len(topic) <= 60 else ''
        return f'Sebutkan {low}{tail}.', True
    if GENERIC_LEAD.search(core):
        return (f'Sebutkan {low} pada {topic}.', True) if topic and topic.lower() not in low else (None, False)
    if len(core.split()) <= 6 and not BAD_TERM.search(core):
        return f'Sebutkan hal-hal penting tentang {core}.', True
    return None, False


def q_box(var, title, ctx):
    what = (title or '').strip()
    topic = ctx
    if what and not GENERIC_BOX.match(what) and len(what.split()) >= 3 and not re.match(r'^(clinical|exam)\b', what, re.I):
        return _ends_q(f'{what}: apa isi atau ringkasannya')
    if var == 'klinis':
        return _ends_q(f'Apa korelasi klinis dari {topic}')
    if var == 'warning':
        return _ends_q(f'Apa jebakan yang sering muncul pada soal tentang {topic}')
    if var == 'tip':
        return _ends_q(f'Bagaimana cara mengingat {topic}')
    if var == 'praktikum':
        return _ends_q(f'Apa clue praktikum untuk {topic}')
    if var == 'highyield':
        return _ends_q(f'Apa poin high-yield (pearl) tentang {topic}')
    return _ends_q(f'Apa catatan penting tentang {topic}')


def make_cards(md, chapter=''):
    els = _parse(md)
    chapter = _topic(chapter)
    kind, h2, h3 = 'isi', '', ''
    defs, hys, lists, boxes, heads = [], [], [], [], []
    first_p = False
    for idx, el in enumerate(els):
        t = el[0]
        if t == 'h2':
            h2, kind, h3 = el[1], el[2], ''
            first_p = kind == 'isi'
            continue
        if t == 'h3':
            h3 = el[1]
            continue
        if kind in SKIP_SECTIONS:
            continue
        sec = _topic(h3 or h2)
        h2t = _topic(h2)
        if h3 and (_is_prop(sec) or sec.lower() in GENERIC or len(sec.split()) > 8 or VAGUE_H3.match(sec)):
            topic = h2t if h2t.lower() not in HY_CTX else chapter           # "Indikasi"/"Istilah utama" saja tidak informatif: pakai judul bagian induknya
        elif h3 and len(sec.split()) <= 3 and h2t and h2t.lower() != sec.lower() and h2t.lower() not in HY_CTX and h2t.lower() != chapter.lower():
            topic = f'{sec} ({h2t})'
        else:
            topic = sec if sec.lower() not in HY_CTX else chapter
        topic = re.sub(r'\s*\([^)]*\)\s*$', '', topic).strip() or topic
        if GENERIC_TOPIC.match(topic) and chapter:
            topic = chapter
        ctx = sec if sec.lower() not in HY_CTX else (chapter or sec)
        if t == 'box':
            _, var, title, body = el
            body = _plain(body)
            if len(body) < 30 or len(body) > 320:
                continue
            boxes.append((ctx, q_box(var, title, topic), _cap(body), topic))
            continue
        if t not in ('li', 'p'):
            continue
        text = el[1]
        if first_p and t == 'p':
            first_p = False
            body = _plain(text)
            if len(body) > 330:
                body = re.split(r'(?<=[a-z]{3}[.!?])\s+(?=[A-Z])', body)[0]      # bukan singkatan seperti "m." atau "n."
            if 40 <= len(body) <= 330 and not body.endswith(':') and not re.match(r'^(Gambar|Lihat)\b', body, re.I):
                heads.append(('', f'Jelaskan {_low(_topic(h2))}.' if len(_topic(h2).split()) > 1 else f'Apa yang dimaksud dengan {_topic(h2)}?', body, _topic(h2)))
        if kind == 'highyield':
            plain = _plain(text).rstrip(';')
            card = None
            for delim in (' = ', ' → ', ': ', ' adalah '):
                if plain.count(delim) != 1:
                    continue
                left, right = plain.split(delim)
                left, right = left.strip(), right.strip().rstrip('.')
                if delim == ': ' and not _is_prop(left) and len(right) < 40:
                    continue                      # "Kanan/kiri: milik pasien" tanpa konteks tidak jadi pertanyaan yang jelas
                if ORDINAL.match(left) or re.match(r'^[“"‘\']', right):
                    continue
                if 3 <= len(left) <= 70 and len(left.split()) <= 9 and len(right) >= 6 and not re.match(r'^(Jangan|Detail|Gambar|Bab|Shortcut|Clue|Practical|Praktikum|Trap|Mnemonic|High-yield|Catatan)\b', left, re.I):
                    card = (left, right, delim)
                    break
            if card:
                qh = q_hy(card[0], card[1], card[2], chapter)
                if qh:
                    hys.append((chapter or ctx, qh, _cap(card[1]), chapter))
            continue
        m = re.match(r'^\*\*(.{2,70}?)\*\*:\s+(.{18,})$', text)
        if m:
            term, back = _plain(m.group(1)), _plain(m.group(2)).rstrip(';')
            if term.lower() in GENERIC or len(back) > 320 or re.match(r'^(Gambar|lihat)\b', back, re.I):
                continue
            if ORDINAL.match(term) or re.match(r'^[“"‘\']', back):
                continue                         # "Contoh 3", jawaban berupa kutipan saja: tidak bisa ditanyakan mandiri
            q = q_def(term, back, topic or chapter)
            if q and not _is_prop(_clean_term(term)) and len(back) < 20:
                q = None                         # istilah non-sifat dengan jawaban sangat pendek terlalu samar
            if q:
                defs.append((ctx, q, _cap(back.rstrip(',;')), topic or chapter))
            continue
        # kalimat pengantar + daftar
        if t == 'p' and text.endswith(':') and 12 <= len(text) <= 130 and text[0].isupper() or (t == 'p' and text.endswith('**:') and len(text) <= 130):
            items = []
            for nxt in els[idx + 1: idx + 12]:
                if nxt[0] != 'li':
                    break
                items.append(_plain(nxt[1]).rstrip(';.,'))
            lead = _plain(text).rstrip(':')
            lead = re.split(r'(?<=[.!?])\s+', lead)[-1]          # hanya kalimat terakhir sebagai pertanyaan
            if 2 <= len(items) <= 9 and sum(map(len, items)) <= 420 and len(lead.split()) >= 2:
                q, ok = q_list(lead, topic or chapter)
                if ok and q:
                    lists.append((ctx, _short(q, 160), '\n'.join('• ' + _cap(x) for x in items), topic or chapter))
    cards = []
    for group, key in ((defs, 'def'), (hys, 'hy'), (lists, 'list'), (boxes, 'box')):
        cards.extend(_spread(group, LIMITS[key]))
    if len(cards) < MIN_CARDS:
        cards.extend(_spread(heads, LIMITS['head']))
    seen, uniq = set(), []
    for ctx, front, back, topic in cards:
        front = front if topic is None else with_context(front, topic, chapter)
        k = front.lower()
        if k in seen:
            continue
        seen.add(k)
        uniq.append((ctx, front, back))
    return uniq


def with_context(front, topic, chapter):
    """Pertanyaan harus bisa dipahami tanpa membaca catatan: sebut topik bagiannya, dan judul BAB (dalam kurung) bila topiknya pendek/umum."""
    topic = (topic or '').strip()
    low = front.lower()
    in_text = bool(topic) and topic.lower() in low
    short_topic = len(topic.split()) <= 2 or bool(GENERIC_TOPIC.match(topic)) or not topic
    need_topic = bool(topic) and not in_text and len(topic) <= 80
    need_chapter = bool(chapter) and chapter.lower() not in low and chapter.lower() != topic.lower() and (short_topic or not (need_topic or in_text) or len(front.split()) < 7)
    if not need_topic and not need_chapter:
        return front
    end = front[-1] if front[-1] in '.?' else ''
    base = front[:-1] if end else front
    if need_topic:
        base += f' pada {topic}'
    if need_chapter:
        base += f' ({chapter})'
    return base + end


def cards_md(cards):
    if not cards:
        return ''
    esc = lambda s: s.replace(' :: ', ' : ').replace('\n', '\n  ')
    lines = ['## Flashcard {kartu}', '']
    for ctx, front, back in cards:
        c = f'[{ctx.replace("]", ")").replace("[", "(")}] ' if ctx else ''
        lines.append(f'- {c}{esc(front)} :: {esc(back)}')
    return '\n'.join(lines)
