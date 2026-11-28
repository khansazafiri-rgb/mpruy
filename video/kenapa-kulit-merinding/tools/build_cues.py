"""Membuat cues.json (jadwal bersama stage + audio) dan takarir SRT/VTT.
Waktu kata: bila audio/asr.json ADA (hasil tools/asr.py dari WAV narasi yang benar), kata naskah dipetakan ke kata ASR (difflib) dan waktunya dipakai;
bila TIDAK ada, waktu diperkirakan dari panjang karakter per kalimat (DRAF; harus dijalankan ulang setelah WAV yang benar tersedia).
Takarir memakai ejaan naskah pemesan (ASR sering salah eja). Master outro (16,2 dtk) ditempel utuh sesudah edukasi.
Pemakaian: python3 tools/build_cues.py"""
import difflib, json, os, re
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUTRO_DUR = 16.20
SCRIPT = [
 'Baru kena angin dingin, bulu di lengan langsung berdiri.',
 'Apa yang menariknya?',
 'Kulit mendeteksi perubahan suhu, lalu tubuh mengaktifkan respons terhadap dingin.',
 'Salah satu jalurnya melibatkan saraf simpatik yang mencapai folikel rambut.',
 'Di samping setiap folikel ada otot kecil bernama arrector pili.',
 'Saat mendapat sinyal, otot ini berkontraksi.',
 'Pangkal rambut tertarik, batang rambut menjadi lebih tegak, dan permukaan kulit sedikit terangkat.',
 'Tonjolan-tonjolan kecil itulah yang kita lihat sebagai merinding.',
 'Pada hewan berbulu tebal, rambut yang berdiri dapat membantu menahan lapisan udara dekat kulit.',
 'Manusia masih memiliki respons tersebut, tetapi rambut tubuh kita relatif sedikit, sehingga merinding bukan cara utama kita menjaga kehangatan.',
 'Tubuh juga punya respons lain saat dingin, seperti mengurangi aliran darah ke kulit dan menggigil.',
]
PAUSE = {1: 0.9, 3: 0.7, 4: 0.5, 5: 0.5, 7: 0.7, 8: 0.7, 9: 0.2, 10: 0.7}   # jeda setelah kalimat i (perkiraan, hanya dipakai bila tanpa ASR)
# kata kunci: (nama, indeks kalimat, awalan kata, kemunculan ke-n)
KEYS = [('angin', 0, 'angin', 0), ('berdiri', 0, 'berdiri', 0), ('menariknya', 1, 'menariknya', 0), ('mendeteksi', 2, 'mendeteksi', 0), ('suhu', 2, 'suhu', 0), ('respons1', 2, 'respons', 0), ('dingin1', 2, 'dingin', 0),
        ('simpatik', 3, 'simpatik', 0), ('folikel1', 3, 'folikel', 0), ('samping', 4, 'samping', 0), ('folikel2', 4, 'folikel', 0), ('otot', 4, 'otot', 0), ('arrector', 4, 'arrector', 0),
        ('sinyal', 5, 'sinyal', 0), ('berkontraksi', 5, 'berkontraksi', 0), ('pangkal', 6, 'pangkal', 0), ('tertarik', 6, 'tertarik', 0), ('batang', 6, 'batang', 0), ('tegak', 6, 'tegak', 0), ('permukaan', 6, 'permukaan', 0), ('terangkat', 6, 'terangkat', 0),
        ('tonjolan', 7, 'tonjolan', 0), ('merinding1', 7, 'merinding', 0), ('hewan', 8, 'hewan', 0), ('udara', 8, 'udara', 0), ('menahan', 8, 'menahan', 0),
        ('manusia', 9, 'manusia', 0), ('sedikit', 9, 'sedikit', 0), ('bukan', 9, 'bukan', 0), ('kehangatan', 9, 'kehangatan', 0),
        ('lain', 10, 'lain', 0), ('aliran', 10, 'aliran', 0), ('menggigil', 10, 'menggigil', 0)]
norm = lambda w: re.sub(r'[^a-z]', '', w.lower())
words = []   # (kalimat, kata asli)
for i, s in enumerate(SCRIPT):
    for w in s.split(): words.append((i, w))
asr_path = os.path.join(H, 'audio', 'asr.json')
tw = [None] * len(words); mode = 'perkiraan'
if os.path.exists(asr_path):
    asr = [w for seg in json.load(open(asr_path)) for w in seg['words']]
    sm = difflib.SequenceMatcher(None, [norm(w) for _, w in words], [norm(w['w']) for w in asr], autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): tw[blk.a + k] = (asr[blk.b + k]['s'], asr[blk.b + k]['e'])
    ok = sum(x is not None for x in tw)
    if ok >= 0.6 * len(words): mode = 'asr'
    else: tw = [None] * len(words)
if mode == 'perkiraan':
    t = 0.0
    for i, s in enumerate(SCRIPT):
        idx = [k for k, (j, _) in enumerate(words) if j == i]; ch = [len(words[k][1]) + 1.5 for k in idx]; dur = 0.42 * len(idx) + 0.05 * sum(len(words[k][1]) for k in idx) / max(1, len(idx)) * 0 + 0.25
        acc = 0.0
        for k, c in zip(idx, ch): tw[k] = (round(t + dur * acc / sum(ch), 2), round(t + dur * (acc + c) / sum(ch) - 0.04, 2)); acc += c
        t += dur + PAUSE.get(i, 0.5)
else:   # isi kata yang tidak cocok dengan interpolasi linear
    for k in range(len(tw)):
        if tw[k] is None:
            a = next((j for j in range(k - 1, -1, -1) if tw[j]), None); b = next((j for j in range(k + 1, len(tw)) if tw[j]), None)
            if a is not None and b is not None: f = (k - a) / (b - a); tw[k] = (round(lerp := tw[a][1] + (tw[b][0] - tw[a][1]) * f, 2), round(lerp + 0.25, 2))
            elif a is not None: tw[k] = (tw[a][1] + 0.3 * (k - a), tw[a][1] + 0.3 * (k - a) + 0.25)
            else: tw[k] = (max(0.0, tw[b][0] - 0.3 * (b - k)), max(0.0, tw[b][0] - 0.3 * (b - k)) + 0.25)
EDU_DUR = round(max(e for _, e in tw) + 0.35, 2)
if mode == 'asr' and os.path.exists(os.path.join(H, 'audio', 'narasi-edukasi.wav')):
    import wave; w = wave.open(os.path.join(H, 'audio', 'narasi-edukasi.wav')); EDU_DUR = round(w.getnframes() / w.getframerate(), 2)
sent = {}
for k, (i, _) in enumerate(words): sent.setdefault(i, [tw[k][0], tw[k][1]]); sent[i][1] = tw[k][1]
W = {}
for name, si, pre, nth in KEYS:
    ks = [k for k, (i, w) in enumerate(words) if i == si and norm(w).startswith(pre)]
    W[name] = tw[ks[nth]][0]
# takarir: bungkus kata per kalimat menjadi baris <= 31 karakter, waktu dari kata pertama sampai kata terakhir tiap baris
cap = []
for i, s in enumerate(SCRIPT):
    ks = [k for k, (j, _) in enumerate(words) if j == i]; line = []; lines = []
    for k in ks:
        if line and len(' '.join(words[x][1] for x in line + [k])) > 31: lines.append(line); line = []
        line.append(k)
    lines.append(line)
    for n, ln in enumerate(lines):
        a = tw[ln[0]][0]; b = tw[ln[-1]][1] + (0.12 if ln is lines[-1] else 0.0)
        cap.append([round(a, 2), round(b, 2), ' '.join(words[x][1] for x in ln)])
for n in range(len(cap) - 1):
    if cap[n][1] > cap[n + 1][0] - 0.02: cap[n][1] = round(cap[n + 1][0] - 0.02, 2)
cues = {'dur': round(EDU_DUR + OUTRO_DUR, 2), 'edu_dur': EDU_DUR, 'outro_dur': OUTRO_DUR, 'mode': mode, 'sent': {f's{i + 1}': v for i, v in sent.items()}, 'w': {k: round(v, 2) for k, v in W.items()}, 'cap': cap}
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(cap, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in cap: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('mode', mode, 'edu', EDU_DUR, 'cap', len(cap)); print({k: round(v, 1) for k, v in W.items()})
