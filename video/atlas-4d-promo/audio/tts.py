"""Narasi bahasa Indonesia dengan Piper TTS (suara id_ID-news_tts-medium, lisensi model: lihat README). Naskah tampilan tetap ejaan asli;
untuk pengucapan dipakai ejaan fonetik (ALIAS) supaya "MEDCOEL" dibaca "Med-koel", "3D" dibaca "tiga de", dst.
Pemakaian:  python3 video/atlas-4d-promo/audio/tts.py <folder-model>   (berisi id_ID-news_tts-medium.onnx + .json; unduh dari huggingface.co/rhasspy/piper-voices/id/id_ID/news_tts/medium)
Hasil: kalimat/k1.wav ... k6.wav (22,05 kHz mono) dan kalimat.json (durasi)."""
import os, sys, json, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig
HERE = os.path.dirname(os.path.abspath(__file__)); M = sys.argv[1]
S = [
 ("Pernah lihat anatomi di gambar, tapi masih susah membayangkan posisi strukturnya?", "Pernah lihat anatomi di gambar, tapi masih susah membayangkan posisi strukturnya?"),
 ("Di Atlas 3D MEDCOEL, kamu bisa memutar tubuh, membuka lapisan, mencari struktur, dan melihat keterangannya.", "Di Atlas tiga de Med koel, kamu bisa memutar tubuh, membuka lapisan, mencari struktur, dan melihat keterangannya."),
 ("Lalu masuk ke Live 4D Lab. Gerakkan probe, amati simulasi USG dan CT, serta bandingkan skenario yang tersedia.", "Lalu masuk ke Laif empat de Lab. Gerakkan prob, amati simulasi U es ge dan Ce Te, serta bandingkan skenario yang tersedia."),
 ("Jadi kamu bisa melihat bentuknya, lalu menyaksikan geraknya.", "Jadi kamu bisa melihat bentuknya, lalu menyaksikan geraknya."),
 ("Belajarnya juga bisa lanjut lewat materi per bab, latihan soal, dan Simulasi Dokter.", "Belajarnya juga bisa lanjut lewat materi per bab, latihan soal, dan Simulasi Dokter."),
 ("Eksplorasi gratis di medcoel.com.", "Eksplorasi gratis di Medkoel dot com."),
]
LS = float(os.environ.get('LS', 1.08))
v = PiperVoice.load(os.path.join(M, 'id_ID-news_tts-medium.onnx')); sr = v.config.sample_rate
os.makedirs(os.path.join(HERE, 'kalimat'), exist_ok=True); out = []
cfg = SynthesisConfig(length_scale=LS, noise_scale=0.62, noise_w_scale=0.7)
for i, (tampil, ucap) in enumerate(S, 1):
    a = np.concatenate([np.frombuffer(c.audio_int16_bytes, dtype=np.int16) for c in v.synthesize(ucap, syn_config=cfg)])
    p = os.path.join(HERE, 'kalimat', f'k{i}.wav'); w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(a.tobytes()); w.close()
    out.append({'i': i, 'tampil': tampil, 'ucap': ucap, 'dur': len(a) / sr}); print(i, round(len(a) / sr, 2), ucap[:50])
json.dump(out, open(os.path.join(HERE, 'kalimat.json'), 'w'), ensure_ascii=False, indent=1)
