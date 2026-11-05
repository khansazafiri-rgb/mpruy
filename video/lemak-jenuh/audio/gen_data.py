"""Waktu kata per kata untuk takarir dari narasi asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari video/lemak-jenuh:  (cd audio && python3 asr.py narator); python3 audio/gen_data.py
Waktu kata dari ASR (faster-whisper); ejaan dirapikan di tabel FIX dan aturan khusus (ASR salah dengar, mis. 'pembunuh' -> 'pembuluh', 'MedCool' -> 'MEDCOEL')."""
import json, subprocess, wave
import numpy as np
SR = 44100
asr = json.load(open('audio/asr.json'))['narator']
FIX = {'pembunuh': 'pembuluh', 'pembulu': 'pembuluh', 'Kader': 'Kadar', 'wakrul': 'waktu', 'Sering': 'Seiring', 'sekalipakan': 'sekali makan', 'resikonya': 'risikonya', 'jangan': 'jangka', 'sumer': 'sumber', 'sekedar': 'sekadar',
       'Hmm,': None, 'MedCool?': 'MEDCOEL.', 'MedCool': 'MEDCOEL', 'kolesterol.': 'kolesterol.', 'berlemak?': 'berlemak?'}
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
lines = []
for i, s in enumerate(asr):
    ws = []
    for w in s['words']:
        t = w['w']
        if ws and t.startswith('-') and t[1:] in ('hati,', 'sel', 'tahun', 'kacangan,'): ws[-1]['w'] += t; ws[-1]['e'] = w['e']; continue
        if ws and t == '-sel': ws[-1]['w'] += '-sel'; ws[-1]['e'] = w['e']; continue
        if ws and t.startswith('.com'): ws[-1]['w'] = 'medcoel.com'; ws[-1]['e'] = w['e']; continue
        if t in FIX and FIX[t] is None: continue
        ws.append({'w': FIX.get(t, t), 's': round(w['s'], 3), 'e': round(w['e'], 3)})
    if ws:
        if i == 2:  # kutipan peringatan
            ws[0]['w'] = '“' + ws[0]['w']; ws[-1]['w'] = ws[-1]['w'].rstrip('.') + '!”'
        if ws[0]['w'][0].islower(): ws[0]['w'] = ws[0]['w'][0].upper() + ws[0]['w'][1:]
    for k in range(len(ws) - 1):
        gap = ws[k + 1]['s'] - ws[k]['e']
        if 0 < gap < 0.25: ws[k]['e'] = ws[k + 1]['s']
    lines.append({'id': f'K{i + 1:02d}', 't0': ws[0]['s'], 't1': ws[-1]['e'], 'words': ws})
x = load('audio/narator.wav'); dur = len(x) / SR
json.dump({'fps': 30, 'dur': round(dur, 3), 'lines': lines}, open('stage/data.json', 'w'), ensure_ascii=False)
w = wave.open('dialog.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('durasi', round(dur, 3), 'kalimat', len(lines))
for l in lines: print(l['id'], ' '.join(w['w'] for w in l['words']))
