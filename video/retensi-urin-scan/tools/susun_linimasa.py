"""Menyusun linimasa dari voice-over pemesan (audio/voiceover.wav; SUARA TIDAK DIUBAH). Memotong per kalimat (ASR: audio/voiceover-asr.json), membatasi jeda antarkalimat
menjadi <= 0,26 dtk (agar durasi mendekati 40 dtk), menulis audio/voiceover-susun.wav dan cues.json (semua waktu video).
Dua kalimat yang tersambung tanpa jeda ("...meregang." + "Sekarang, ...") dipotong sebagai satu bagian. Pemakaian: python3 tools/susun_linimasa.py"""
import json, subprocess, numpy as np, os, wave
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); P = lambda *a: os.path.join(H, *a)
sr = 24000
b = subprocess.run(['ffmpeg', '-v', 'error', '-i', P('audio', 'voiceover.wav'), '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
vo = np.frombuffer(b, dtype=np.float32).astype(np.float64)
# (awal, akhir, [(id, awal_kalimat, akhir_kalimat)])
CH = [(0.00, 3.64, [('s1', 0.00, 3.64)]), (3.98, 7.46, [('s2', 3.98, 7.46)]), (8.00, 11.92, [('s3', 8.00, 11.92)]), (12.50, 15.62, [('s4', 12.50, 15.62)]), (16.30, 20.60, [('s5', 16.30, 20.60)]),
      (21.24, 24.62, [('s6', 21.24, 24.62)]), (24.96, 33.06, [('s7', 24.96, 27.74), ('s8', 27.74, 33.06)]), (33.54, 37.28, [('s9', 33.54, 37.28)]), (37.96, 40.60, [('s10', 37.96, 40.60)]), (41.24, 43.40, [('s11', 41.24, 43.40)])]
GAP, LEAD, TAIL = 0.26, 0.10, 0.40
shift = []; place = []; prevE = None
for i, (a, bb, _) in enumerate(CH):
    ns = LEAD if i == 0 else prevE + min(a - CH[i - 1][1], GAP)
    shift.append(ns - a); prevE = ns + (bb - a)
END = prevE + TAIL; N = int(END * sr); out = np.zeros(N)
for i, (a, bb, _) in enumerate(CH):
    pre = 0.12 if i else 0.0; post = 0.14
    seg = vo[int((a - pre) * sr):int((bb + post) * sr)].copy(); f = int(0.012 * sr); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    o = int(round((a + shift[i] - pre) * sr)); out[o:o + len(seg)] += seg[:max(0, N - o)] if o + len(seg) > N else seg
w = wave.open(P('audio', 'voiceover-susun.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
def nt(orig):
    for i, (a, bb, _) in enumerate(CH):
        if a - 0.2 <= orig <= bb + 0.2: return round(orig + shift[i], 3)
    return round(orig + shift[-1], 3)
vo_c = []
for i, (a, bb, ss) in enumerate(CH):
    for sid, sa, sb in ss: vo_c.append({'id': sid, 't': [round(sa + shift[i], 3), round(sb + shift[i], 3)], 'orig': [sa, sb], 'shift': round(shift[i], 3)})
K = {k: nt(v) for k, v in dict(kantong=0.50, gelap=0.92, besar=1.32, panggul=2.04, itu=3.98, kandung=4.50, terisi=5.48, retensi=6.52, penuhSaja=9.60, belumTentu=10.22, sebelum=12.50, menyimpan=14.82, normalnya=16.30, otot=17.02, berkontraksi=18.24, jalan=19.42, membuka=20.16, terhambat=22.18, kontraksi=23.12, tidakKuat=23.78, tertahan=25.80, meregang=27.36, bandingkan=29.16, model=29.72, skenario=30.54, patologinya=30.96, sungguhan=34.24, satuGambar=36.44, simulasi=38.22, explorasi=41.24).items()}
cues = {'dur': round(END, 3), 'vo': vo_c, 'k': K}
json.dump(cues, open(P('cues.json'), 'w'), ensure_ascii=False, indent=1); print('dur', cues['dur']); print(json.dumps(vo_c)); print(K)
