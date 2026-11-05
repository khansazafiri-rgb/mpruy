"""Waktu kata per kata untuk takarir dari narasi asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari video/darah-tinggi:  (cd audio && python3 asr.py narator); python3 audio/gen_data.py
Batas kalimat dan jeda diambil dari ASR (faster-whisper). Karena ASR salah dengar istilah medis (mis. 'darat', 'pemburu', 'si stolik'),
teks takarir memakai naskah yang diberikan pemesan (TEXT di bawah); tiap kata diletakkan di waktu yang sesuai dengan posisi hurufnya di dalam kalimat ASR (jeda koma ikut terjaga)."""
import json, subprocess, wave, re
import numpy as np
SR = 44100
asr = json.load(open('audio/asr.json'))['narator']
TEXT = [
 'Darah tinggi itu sebenarnya kenapa bisa berbahaya? Bukannya cuma angka di alat tensi?',
 'Bayangin, kamu periksa tekanan darah. Angkanya tinggi,',
 'tapi badanmu terasa baik-baik saja. Jadi, apakah kamu perlu khawatir?',
 'Sebelum itu, kenalan dulu dengan angka di alat tensimu.',
 'Tekanan darah orang dewasa yang sering dijadikan acuan adalah sekitar 120/80.',
 'Angka pertama disebut sistolik,',
 'tekanan di pembuluh darah saat jantung memompa darah.',
 'Angka kedua disebut diastolik, tekanan saat jantung berelaksasi di antara detakannya.',
 'Lalu kapan disebut darah tinggi?',
 'Menurut kriteria yang digunakan Kementerian Kesehatan dan WHO,',
 'tekanan sistolik 140 atau lebih dan/atau tekanan diastolik 90 atau lebih perlu diperhatikan.',
 'Tapi satu kali hasil tinggi belum tentu langsung berarti kamu mengalami hipertensi.',
 'Tekanan darah perlu diperiksa kembali oleh tenaga kesehatan.',
 'Nah, sekarang bayangkan, tekanan di dalam pembuluh darahmu terus-menerus tinggi.',
 'Seiring waktu, tekanan ini bisa merusak dinding pembuluh darah dan membuat jantung bekerja lebih keras.',
 'Dampaknya bisa sampai ke beberapa organ.',
 'Di jantung, kerja yang terus meningkat dapat menyebabkan gangguan jantung, termasuk gagal jantung.',
 'Di otak, pembuluh darah bisa tersumbat atau pecah dan menyebabkan stroke.',
 'Di ginjal, pembuluh darah kecil yang membantu menyaring darah juga bisa mengalami kerusakan.',
 'Dan ya, komplikasi darah tinggi bisa menyebabkan kematian.',
 'Yang membuatnya sering terlambat diketahui, darah tinggi sering kali tidak menimbulkan gejala.',
 'Jadi jangan tunggu pusing untuk memeriksa tekanan darahmu.',
 'Cek tekanan darah secara berkala, kurangi konsumsi garam berlebihan, dan tetap aktif bergerak.',
 'Kalau kamu sudah mendapat obat dari dokter, minum sesuai anjuran dan jangan menghentikannya sendiri.',
 'Penasaran dengan cara kerja tubuh lainnya?',
 'Yuk, belajar bersama MEDCOEL. Gratis di medcoel.com!',
]
assert len(TEXT) == len(asr), (len(TEXT), len(asr))
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
clen = lambda w: max(2, len(re.sub(r'[^\w]', '', w)))
lines = []
for i, (s, txt) in enumerate(zip(asr, TEXT)):
    aw = s['words']
    # kurva waktu -> posisi huruf kumulatif dari kata ASR (kata ASR menempati [s,e] dengan bobot huruf)
    pts_t, pts_c = [aw[0]['s']], [0.0]; c = 0.0
    for w in aw:
        if w['s'] > pts_t[-1] + 1e-3: pts_t.append(w['s']); pts_c.append(c)
        c += clen(w['w']); pts_t.append(max(w['e'], pts_t[-1] + 1e-3)); pts_c.append(c)
    tw = txt.split(); tot = sum(clen(w) for w in tw); ws = []; cc = 0.0
    for w in tw:
        a = cc / tot * c; cc += clen(w); b = cc / tot * c
        ts = float(np.interp(a, pts_c, pts_t)); te = float(np.interp(b, pts_c, pts_t))
        ws.append({'w': w, 's': round(ts, 3), 'e': round(max(te, ts + 0.08), 3)})
    for k in range(len(ws) - 1):
        if ws[k]['e'] > ws[k + 1]['s']: ws[k]['e'] = ws[k + 1]['s']
        gap = ws[k + 1]['s'] - ws[k]['e']
        if 0 < gap < 0.25: ws[k]['e'] = ws[k + 1]['s']
    lines.append({'id': f'K{i + 1:02d}', 't0': ws[0]['s'], 't1': ws[-1]['e'], 'words': ws})
x = load('audio/narator.wav'); dur = len(x) / SR
json.dump({'fps': 30, 'dur': round(dur, 3), 'lines': lines}, open('stage/data.json', 'w'), ensure_ascii=False)
w = wave.open('dialog.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('durasi', round(dur, 3), 'kalimat', len(lines))
for l in lines: print(l['id'], f"{l['t0']:.2f}-{l['t1']:.2f}", ' '.join(w['w'] for w in l['words']))
