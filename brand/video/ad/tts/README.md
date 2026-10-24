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

## Suara final: ElevenLabs, dibuat sendiri oleh pemilik
Pocket TTS ditolak (robotik), dan alur lewat API/skrip penyintesis dihentikan. Suara final dibuat manual di ElevenLabs (akun berbayar = lisensi komersial) dan **tidak diproses** (tanpa EQ, nada, atau percepatan).

1. `node naskah.mjs` membuat `naskah-elevenlabs.txt` (teks ucapan saja, satu baris per shot, "Med-koel") dan memeriksa tiap kalimat terhadap jendela waktu shotnya. `--rate 13.75` memperkirakan Speed 1.0.
2. Tempel naskah ke ElevenLabs, buat SATU file WAV, kirim lewat Google Drive.
3. `python split.py --wav narasi.wav --out narasi` memotong rekaman per kalimat (hanya dipotong; kebutuhan: `pip install faster-whisper scipy`). Letak kalimat dicari dengan mengenali kata, titik potong di bagian paling sepi.
4. `node ../voice-swap.mjs --lines narasi --check` melaporkan kalimat yang tidak muat sebelum apa pun dibuat. Lalu `node ../voice-swap.mjs --lines narasi` mencampur musik dan efek, lalu mengganti audio pada MP4 V2 dengan `-c:v copy`: web tidak direkam ulang dan frame tidak dirender ulang. Hasil: `out/medcoel-iklan-75s-v2-FINAL.mp4`. Tanpa `--allow-overflow`, shot yang melebihi jendelanya ditolak dan suara tidak dipercepat.

Catatan: takarir (sorotan kata) dan gerak mulut Kori sudah tertanam di video dan mengikuti `base-timeline.json` (lama bicara draf lama). `voice-swap.mjs` memulai tiap shot pada detik yang sama; bila suara baru lebih pendek, sorotan kata di takarir selesai sedikit sesudah suara. Selisihnya ditampilkan per shot.
