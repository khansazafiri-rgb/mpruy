"""Cek kejernihan narator di speaker ponsel: selisih suara vs latar (musik + ambien) pada pita 300-4000 Hz, per jendela 0,5 dtk saat narator aktif.
Pemakaian: python3 check_mix.py voice.wav music.wav sfx.wav"""
import sys, subprocess, numpy as np
def rd(f, filt):
    return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-af',filt,'-f','f32le','-ac','1','-ar','44100','-'],capture_output=True).stdout, dtype=np.float32)
phone = 'highpass=f=300,lowpass=f=4000'
vo, mu, sf = sys.argv[1:4]
bedf = '/tmp/_bed.wav'
subprocess.run(['ffmpeg','-v','error','-y','-i',vo,'-i',mu,'-i',sf,'-filter_complex','[0:a]aformat=channel_layouts=stereo[vs];[1:a]volume=0.17[m];[m][vs]sidechaincompress=threshold=0.015:ratio=9:attack=30:release=450:makeup=1[md];[2:a]volume=0.34[sx];[md][sx]amix=inputs=2:normalize=0:duration=first[bed]','-map','[bed]','-ac','1',bedf],check=True)
v = rd(vo, phone); b = rd(bedf, phone); n = min(len(v), len(b)); v = v[:n]; b = b[:n]
w = 22050; rows = []
for i in range(0, n - w, w):
    rv = np.sqrt((v[i:i+w] ** 2).mean()); rb = np.sqrt((b[i:i+w] ** 2).mean())
    if rv > 0.02: rows.append((20 * np.log10(rv / (rb + 1e-9)), i / 44100))
rows.sort()
print('jendela 0,5 dtk saat narator aktif:', len(rows)); print('selisih rata-rata (dB):', round(float(np.mean([r[0] for r in rows])), 1))
print('terburuk 6 (dB, detik video):', [(round(float(x), 1), round(t, 1)) for x, t in rows[:6]])
