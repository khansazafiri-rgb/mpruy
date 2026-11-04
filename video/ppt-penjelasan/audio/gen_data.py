"""Waktu kata per kata untuk takarir dari narasi asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari video/ppt-penjelasan:  python3 audio/asr.py narator   (di folder audio)  lalu  python3 audio/gen_data.py
Waktu kata dari ASR (faster-whisper); ejaan dirapikan di tabel FIX/MERGE (hasil ASR salah dengar, mis. 'medkool' -> 'MEDCOEL')."""
import json, subprocess, wave
import numpy as np
SR = 44100
asr = json.load(open('audio/asr.json'))['narator']
FIX = {'Dapet': 'Dapat', 'sendiri.': 'sendiri?', 'slat': 'slide', 'bacai': 'baca', 'membuat': 'bikin', 'paham?': 'paham!', 'ini': 'ini', 'MedCool': 'MEDCOEL', 'Haa,': None}
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
lines = []
for i, s in enumerate(asr):
    ws = []
    for w in s['words']:
        t = w['w']
        if ws and t == '-mu': ws[-1]['w'] += '-mu'; ws[-1]['e'] = w['e']; continue
        if ws and t.startswith('Cool') and ws[-1]['w'] == 'Mad': ws[-1]['w'] = 'MEDCOEL' + ('!' if t.endswith('.') else ''); ws[-1]['e'] = w['e']; continue
        if ws and t.startswith('.com'): ws[-1]['w'] = 'medcoel.com'; ws[-1]['e'] = w['e']; continue
        if t in FIX and FIX[t] is None: continue
        if ws and ws[-1]['w'] == 'mikir,' and t == 'ini': t = '“Ini'
        elif t == 'apa?' and s['words'][-1]['w'] == 'apa?': t = 'apa?”'
        ws.append({'w': FIX.get(t, t), 's': round(w['s'], 3), 'e': round(w['e'], 3)})
    if ws and ws[0]['w'][0].islower(): ws[0]['w'] = ws[0]['w'][0].upper() + ws[0]['w'][1:]
    for q in range(len(ws) - 1):
        if ws[q]['w'] == 'MEDCOEL' and ws[q + 1]['w'] == 'kunjungi': ws[q]['w'] = 'MEDCOEL!'; ws[q + 1]['w'] = 'Kunjungi'
    for k in range(len(ws) - 1):
        gap = ws[k + 1]['s'] - ws[k]['e']
        if 0 < gap < 0.25: ws[k]['e'] = ws[k + 1]['s']
    lines.append({'id': f'K{i + 1:02d}', 't0': ws[0]['s'], 't1': ws[-1]['e'], 'words': ws})
x = load('audio/narator.wav'); dur = len(x) / SR
json.dump({'fps': 30, 'dur': round(dur, 3), 'lines': lines}, open('stage/data.json', 'w'), ensure_ascii=False)
w = wave.open('dialog.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('durasi', round(dur, 3), 'kalimat', len(lines))
for l in lines: print(l['id'], ' '.join(w['w'] for w in l['words']))
