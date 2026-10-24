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
