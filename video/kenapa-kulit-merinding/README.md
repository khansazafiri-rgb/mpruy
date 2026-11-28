# Kenapa kulit merinding saat dingin? — KERANGKA (menunggu audio)
**Belum ada video.** Brief meminta narasi Google AI Studio tentang merinding (arrector pili), tetapi empat unggahan `Generated_Audio_November_28_2026 - 7_12PM/7_28PM.wav` ternyata berkas yang sama (checksum identik, 47,74 dtk) dan berisi narasi KAKI KESEMUTAN. Audio itu tidak dipakai dan tidak diganti TTS.

Isi folder ini baru perkakas:
- `tools/asr.py` — ASR kata-demi-kata dari `audio/narasi-edukasi.wav` -> `audio/asr.json`.
- `tools/build_cues.py` — memetakan naskah merinding ke waktu kata ASR dan membuat `cues.json` + takarir. Tanpa `asr.json` ia memakai PERKIRAAN (`cues.json` dan `takarir.*` saat ini hanyalah draf perkiraan; jalankan ulang setelah WAV yang benar ada).
- `stage/` (pembantu umum), `render.mjs`, `encode.sh`, `audio/audio_mix.py`, `cover/` — infrastruktur render yang sama dengan video MEDCOEL lain; `stage/scenes.js` (adegan) belum dibuat.

Lanjut setelah WAV merinding yang benar tersedia: salin ke `audio/narasi-edukasi.wav`, `python3 tools/asr.py && python3 tools/build_cues.py`, lalu bangun adegan (hook lengan -> deteksi dingin -> unit folikel + otot arrector pili memendek tepat pada "berkontraksi" -> kulit luar -> hewan berbulu tebal vs manusia -> respons lain -> Raka) dan render.
