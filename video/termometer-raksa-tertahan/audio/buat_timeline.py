#!/usr/bin/env python3
"""Membuat stage/timeline.json dari naskah (stage/skrip.json).
- Bila ada audio/asr.json hasil ASR dari narasi edukasi yang COCOK dengan naskah (kemiripan kata >= 0,6): waktu diambil dari kata sebenarnya.
- Bila tidak ada / tidak cocok: waktu DIPERKIRAKAN dari naskah (kecepatan bicara dikalibrasi dari dua narasi Google AI Studio sebelumnya: 0,059 dtk per huruf, jeda 0,5 dtk antar-kalimat, 0,9 dtk antar-paragraf) dan 'estimated' = true (hasil render adalah DRAF).
Pemakaian: python3 buat_timeline.py [asr.json] [nama-narasi]"""
import json, os, re, sys, difflib
H = os.path.dirname(os.path.abspath(__file__)); ST = os.path.join(H, '..', 'stage')
sk = json.load(open(os.path.join(ST, 'skrip.json'), encoding='utf-8'))
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
script_words = []   # (kalimat idx, kata mentah, indeks kata dalam kalimat)
for si, k in enumerate(sk['kalimat']):
    for wi, w in enumerate(k['text'].split()): script_words.append((si, w, wi))
est = True; times = None
asr_p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(H, 'asr.json'); name = sys.argv[2] if len(sys.argv) > 2 else 'narasi-edukasi'
if os.path.exists(asr_p):
    d = json.load(open(asr_p)); segs = d.get(name)
    if segs:
        aw = [w for s in segs for w in s['words']]
        a = [norm(w['w']) for w in aw]; b = [norm(w[1]) for w in script_words]
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False); ratio = sm.ratio()
        print(f'kemiripan ASR vs naskah: {ratio:.2f}')
        if ratio >= 0.6:
            times = [None] * len(b)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == 'equal':
                    for k in range(i2 - i1): times[j1 + k] = (aw[i1 + k]['s'], aw[i1 + k]['e'])
            # isi kata yang tidak cocok dengan interpolasi linear
            idx = [i for i, t in enumerate(times) if t]; 
            for i in range(len(times)):
                if times[i] is None:
                    l = max([j for j in idx if j < i], default=None); r = min([j for j in idx if j > i], default=None)
                    if l is None and r is None: raise SystemExit('tidak ada kata cocok')
                    if l is None: times[i] = (times[r][0] - 0.2 * (r - i), times[r][0] - 0.2 * (r - i) + 0.2)
                    elif r is None: times[i] = (times[l][1] + 0.2 * (i - l), times[l][1] + 0.2 * (i - l) + 0.2)
                    else: f = (i - l) / (r - l); t0 = times[l][1] + f * (times[r][0] - times[l][1]); times[i] = (t0, t0 + 0.2)
            est = False
        else: print('ASR TIDAK COCOK dengan naskah: memakai perkiraan waktu dari naskah (DRAF)')
if times is None:
    times = []; t = 0.0; prev_p = 1
    for si, w, wi in script_words:
        k = sk['kalimat'][si]
        if wi == 0 and times: t += 0.9 if k['p'] != prev_p else 0.5
        if wi == 0: prev_p = k['p']
        d = 0.059 * len(re.sub(r"[.,?!:'\"]", "", w)) + 0.04
        # jeda kecil pada koma dan titik dua
        times.append((round(t, 3), round(t + d, 3))); t += d + (0.18 if w.endswith((',', ':')) else 0.0)
words = []; sents = []
for si, k in enumerate(sk['kalimat']):
    ws = [(i, tt) for i, (s2, w, wi) in enumerate(script_words) if s2 == si for tt in [times[i]]]
    sents.append({'id': k['id'], 'p': k['p'], 't0': round(ws[0][1][0], 3), 't1': round(ws[-1][1][1], 3), 'text': k['text']})
anchors = {}
for si, k in enumerate(sk['kalimat']):
    toks = k['text'].split(); firsts = [i for i, (s2, w, wi) in enumerate(script_words) if s2 == si]
    for key, sub in k['anchors'].items():
        st = k['text'].find(sub); assert st >= 0, (key, sub)
        wi = len(k['text'][:st].split()); anchors[key] = round(times[firsts[wi]][0], 3)
out = {'estimated': est, 'edu_end': round(sents[-1]['t1'] + 0.35, 3), 'kalimat': sents, 'anchors': anchors}
json.dump(out, open(os.path.join(ST, 'timeline.json'), 'w'), indent=1, ensure_ascii=False)
print('estimasi' if est else 'dari ASR', '| durasi edukasi', out['edu_end'], 's |', len(sents), 'kalimat |', len(anchors), 'jangkar')
for s in sents: print(f"{s['t0']:6.2f}-{s['t1']:6.2f} {s['text'][:70]}")
