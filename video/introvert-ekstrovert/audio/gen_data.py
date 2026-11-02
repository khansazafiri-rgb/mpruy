"""Waktu kata per kata untuk takarir dari MP3 narator asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari video/malam-lapar:  python3 audio/gen_data.py     (butuh audio/asr.json dari audio/asr.py)
Waktu kata dari ASR (faster-whisper); ejaan diperbaiki di tabel FIX (mis. 'MedQL' -> 'MEDCOEL', pecahan tanda hubung digabung)."""
import json, subprocess, wave
import numpy as np
SR = 44100
asr = json.load(open('audio/asr.json'))['narator']
# (kata ASR yang digabung ke kata sebelumnya)
JOIN = {'.com'}
import re
# koreksi ejaan hasil ASR -> ejaan baku (kata: pola, pengganti)
FIXES = [(r'^keramayan', 'keramaian'), (r'^[Ee]xtro', 'ekstro'), (r'^extro', 'ekstro'), (r'^merespon$', 'merespons'), (r'^bianggap$', 'dianggap'), (r'^pemprosesan$', 'pemrosesan'),
         (r'^response$', 'respons'), (r'^antisocial', 'antisosial'), (r'^Medcoil\.com\.?$', 'MEDCOEL.com.'), (r'^Medcoil$', 'MEDCOEL'), (r'^extrovert', 'ekstrovert'), (r'^Extrovert', 'Ekstrovert')]
def fix(w):
    for a, b in FIXES: w = re.sub(a, b, w) if a != r'^[Ee]xtro' else re.sub(a, 'ekstro' if w[0] == 'e' else 'Ekstro', w)
    return w
FIX = {}
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
lines = []
for i, s in enumerate(asr):
    ws = []
    for w in s['words']:
        t = w['w']
        if ws and t == 'pengaruhi' and ws[-1]['w'] == 'di':
            ws[-1]['w'] = 'dipengaruhi'; ws[-1]['e'] = w['e']; continue
        if (t in JOIN or t.startswith('.com')) and ws:
            ws[-1]['w'] += t; ws[-1]['e'] = w['e']
        else:
            ws.append({'w': fix(FIX.get(t, t)), 's': round(w['s'], 3), 'e': round(w['e'], 3)})
    # 'memperburu' + 'keluhanmu.' -> 'memperburuk keluhanmu.' (ASR memotong kata)
    for k, w in enumerate(ws):
        if w['w'] == 'MEDCOEL' and k + 1 < len(ws) and ws[k + 1]['w'] == '': pass
    # kata terakhir berakhir di akhir kalimat; kata lain berakhir di awal kata berikutnya (tutup celah < 0,25 dtk)
    for k in range(len(ws) - 1):
        gap = ws[k + 1]['s'] - ws[k]['e']
        if 0 < gap < 0.25: ws[k]['e'] = ws[k + 1]['s']
    lines.append({'id': f'K{i + 1:02d}', 't0': ws[0]['s'], 't1': ws[-1]['e'], 'words': ws})
x = load('audio/narator.mp3'); dur = len(x) / SR
json.dump({'fps': 30, 'dur': round(dur, 3), 'lines': lines}, open('stage/data.json', 'w'), ensure_ascii=False)
w = wave.open('dialog.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('durasi', round(dur, 3), 'kalimat', len(lines))
for l in lines: print(l['id'], ' '.join(w['w'] for w in l['words']))
