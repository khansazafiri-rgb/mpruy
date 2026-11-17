# Posisi voice-over (rough cut tanpa narator)

Voice-over Google AI Studio **belum ada**, jadi video ini rough cut: visual, teks, musik, dan klik sudah final, narasi belum. Teks di bawah hanya **usulan** untuk dibacakan; kamu bebas mengganti naskahnya, asal tiap kalimat muat di jendelanya (kecepatan baca ±2,8 kata/detik). Versi `_penanda-VO.mp4` menampilkan bilah merah berisi nomor jendela, waktu, dan teks usulan.

| ID | Jendela (dtk) | Visual pada jendela | Teks usulan |
|---|---|---|---|
| vo1 | 0,4–3,3 | citra jantung bergerak + judul | "Jantung masih berdetak, tapi pompanya melemah?" |
| vo2 | 3,8–7,2 | panel Patologi, kartu "Fungsi sistolik LV menurun (pola HFrEF)" disorot | "Di Live 4D Lab MEDCOEL, pilih skenario fungsi sistolik ventrikel kiri menurun, pola HFrEF." |
| vo3 | 7,6–11,2 | sorotan ventrikel kiri (pop-up bawaan aplikasi) + teks "Kontraksi ventrikel kiri menurun" | "Perhatikan ventrikel kiri. Di skenario ini, kontraksinya menurun." |
| vo4 | 11,6–19,4 | tombol "Bandingkan dengan normal" ditekan (klik + ting di 13,2), tabel EF, split NORMAL vs SKENARIO | "Tekan bandingkan dengan normal. EF model sekitar 58 persen, sedangkan skenario sekitar 26 persen. Ini parameter simulasi, bukan angka pasien." |
| vo5 | 19,8–23,4 | teks "Cepat lelah" lalu "Sesak" (muncul 19,95 dan 21,2) | "Pada gagal jantung, rasa cepat lelah dan sesak dapat muncul." |
| vo6 | 23,9–27,8 | tampilan asli Live 4D Lab + "Eksplorasi patologi gratis" + "medcoel.com" | "Eksplorasi patologi gratis di medcoel dot com." |

## Memasang voice-over
1. Simpan WAV di `audio/voiceover.wav` (dimulai dari detik 0 video).
2. Ukur waktu kata (mis. faster-whisper) dan sesuaikan `cues.json`: batas shot (`shots.*.out`), `teks.cepatLelah`, `teks.sesak`, `teks.ef`, `teks.lvRing`, dan `vo`. Jika narasi lebih panjang dari 28 dtk, ubah `dur` dan perpanjang shot terakhir.
3. `python3 audio/audio_mix.py` (musik turun otomatis di bawah suara; target −14 LUFS) lalu render ulang (README).
