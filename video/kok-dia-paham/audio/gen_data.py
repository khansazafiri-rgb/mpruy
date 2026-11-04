"""Waktu kata per kata untuk takarir dari narasi asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari video/kok-dia-paham:  python3 audio/asr.py narator   (di folder audio)  lalu  python3 audio/gen_data.py
Waktu kata dari ASR (faster-whisper); ejaan dirapikan di tabel FIX/MERGE (hasil ASR salah dengar, mis. 'medkool' -> 'MEDCOEL')."""
import json, subprocess, wave
import numpy as np
SR = 44100
asr = json.load(open('audio/asr.json'))['narator']
FIX = {'genius': 'jenius', 'beneran': 'beneran', 'ada.': 'ada?', 'denger': 'dengar', 'dosyen': 'dosen', '3': 'tiga', 'diupkrit.': 'di-upgrade.', 'temenmu': 'temanmu',
       'mengaruhi': 'memengaruhi', 'menyusunya': 'menyusunnya', 'persatu.': 'per satu.', 'medkool.': 'MEDCOEL.', 'medkool': 'MEDCOEL', 'doktor.': 'dokter.', 'Haa,': 'Haa,',
       'penting.': 'penting.', 'bagian': 'bagian'}
MERGE = [('diam', '-diam', 'diam-diam'), ('sini', 'lah', 'sinilah'), ('ke', 'doktoran', 'kedokteran'), ('nggak', 'apa', 'nggak apa-apa')]
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
lines = []
for i, s in enumerate(asr):
    ws = []
    for w in s['words']:
        t = w['w']
        if len(ws) > 1 and t == '-apa.' and ws[-1]['w'] == 'apa' and ws[-2]['w'] == 'nggak': ws.pop(); ws[-1]['w'] = 'nggak apa-apa.'; ws[-1]['e'] = w['e']; continue
        if ws and t.startswith('.com'): ws[-1]['w'] = 'medcoel.com'; ws[-1]['e'] = w['e']; continue
        if ws and t == '-diam': ws[-1]['w'] = 'diam-diam'; ws[-1]['e'] = w['e']; continue
        if ws and ws[-1]['w'] == 'sini' and t == 'lah': ws[-1]['w'] = 'sinilah'; ws[-1]['e'] = w['e']; continue
        if ws and ws[-1]['w'] == 'ke' and t == 'doktoran': ws[-1]['w'] = 'kedokteran'; ws[-1]['e'] = w['e']; continue
        ws.append({'w': FIX.get(t, t), 's': round(w['s'], 3), 'e': round(w['e'], 3)})
    # "nggak" + "apa-apa." sudah digabung; hapus entri 'nggak' tersisa
    ws = [x for x in ws]
    for k in range(len(ws) - 1):
        gap = ws[k + 1]['s'] - ws[k]['e']
        if 0 < gap < 0.25: ws[k]['e'] = ws[k + 1]['s']
    lines.append({'id': f'K{i + 1:02d}', 't0': ws[0]['s'], 't1': ws[-1]['e'], 'words': ws})
x = load('audio/narator.wav'); dur = len(x) / SR
json.dump({'fps': 30, 'dur': round(dur, 3), 'lines': lines}, open('stage/data.json', 'w'), ensure_ascii=False)
w = wave.open('dialog.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('durasi', round(dur, 3), 'kalimat', len(lines))
for l in lines: print(l['id'], ' '.join(w['w'] for w in l['words']))
