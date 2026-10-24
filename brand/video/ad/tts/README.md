# Suara Kori dengan Pocket TTS Indonesian

- Model: [anak10thn/pocket-tts-indonesian](https://huggingface.co/anak10thn/pocket-tts-indonesian), model 6 lapis, lisensi **CC-BY-4.0**. Bila dipakai di video yang tayang, cantumkan kredit: "Suara: Pocket TTS Indonesian (anak10thn, berbasis Kyutai Pocket TTS), CC-BY-4.0".
- Contoh suara (prompt): `common_voice_id_20954811` dari Common Voice 22.0 Indonesia, **CC0** (bebas dipakai, tanpa atribusi). Rekaman suara sendiri juga bisa dipakai sebagai prompt.
- Tidak memakai Piper dan eSpeak.

## Pasang dan jalankan
```
python3 -m venv venv && venv/bin/pip install pocket-tts torch faster-whisper scipy \
  --extra-index-url https://download.pytorch.org/whl/cpu
ffmpeg -i voices/common_voice_id_20954811.mp3 -ac 1 -ar 48000 -c:a pcm_s16le voice.wav   # prompt 48 kHz WAV
venv/bin/python pockettts.py --voice voice.wav --out narasi --eos -5.0 --nbest 6 --lines @baris.json
node ../final.mjs --use narasi        # pasang ke video, tanpa merekam ulang web
```
`baris.json` = `{"01": "teks shot 1", ..., "16": "teks shot 16"}`. Angka ditulis dengan kata, dan nama merek dieja (mis. "Med koel"; "Med kul" terdengar lebih jelas pada model ini).

`--nbest N` membuat N kandidat per baris, membacanya kembali dengan Whisper, lalu memilih yang paling cocok dengan teks (kandidat yang terpotong dibuang). Model ini acak, jadi satu kali jalan bisa menghasilkan baris yang terpotong.

## Suara final dengan layanan berlisensi komersial (menggantikan Pocket TTS)
Pocket TTS ditolak (terdengar robotik). Narasi final memakai satu suara perempuan Bahasa Indonesia dari layanan TTS yang izin komersialnya jelas, dan **suaranya tidak diproses** (tanpa EQ, nada, atau percepatan).

1. Teks: `narasi-final.json` (teks V2, hanya tanda baca dan pemenggalan kalimat yang dibenahi; isi dan klaim sama).
2. Suara: `node commercial.mjs --provider google|elevenlabs|azure --voice <suara> --out narasi` (kunci lewat variabel lingkungan, lihat kepala berkasnya).
3. Contoh 12 detik: `node ../voice-swap.mjs --lines narasi --sample 12` (musik dikecilkan).
4. Final: `node ../voice-swap.mjs --lines narasi` mengganti audio pada video V2 yang sudah ada dengan `-c:v copy`: web tidak direkam ulang dan frame tidak dirender ulang. Hasil: `out/medcoel-iklan-75s-v2-FINAL.mp4`.

Catatan: takarir dan gerak mulut Kori sudah tertanam di video dan mengikuti `base-timeline.json`. `voice-swap.mjs` memulai tiap shot pada detik yang sama dan melaporkan selisih lama bicara; shot yang melebihi jendelanya ditolak (suara tidak dipercepat), jadi kalimatnya yang dipendekkan.
