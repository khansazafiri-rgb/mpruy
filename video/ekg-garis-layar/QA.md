# QA — "Bagaimana EKG menghasilkan garis di layar?"
MP4 1080x1920, 30 fps, 59,78 dtk (edukasi 0-44,92 dtk; jeda 0,5 dtk; outro 45,42-59,78 dtk), AAC 48 kHz stereo.

## Penyesuaian terhadap permintaan
- Narasi edukasi yang dilampirkan hanya **44,92 dtk** (perkiraan awal ±55 dtk), sehingga batas adegan mengikuti audio, bukan tabel 0-55 dtk: hook 0-4,7, elektroda 4,7-9, penampang dada 9-13,6, mekanisme 13,4-38,7 (P 18,8-20,7; QRS 24,75-25,85; T 30,7-33,6; pengulangan 33,7-37,3), keluar ke Raka+monitor 38,5-45,4. Suara tidak dipercepat.
- Outro memakai audio outro BARU (10,36 dtk). Rekaman web terlihat 1,0 dtk sebelum suara masuk; logo + "medcoel.com" ditahan sampai akhir (±5 dtk).

## Sinkron P / QRS / T (diverifikasi dari kode + waktu kata ASR)
Jantung dan garis EKG dihitung dari satu fungsi waktu (`heart.js`), jadi terbentuk serentak. Peristiwa vs narasi (detik video): sinyal dari nodus sinus 15,6 ("nodus sinus" 16,0) -> menyebar di serambi 17,0-18,7 ("menyebar ke serambi" 17,4-18,3) -> **P** 18,8-20,7 ("Di layar, muncul gelombang P" 18,9-20,9) -> nodus AV menahan 21,9-23,2 ("nodus AV" 22,1) -> berkas bilik 23,3-24,75 ("menyebar cepat ke bilik" 23,3-24,5) -> **QRS** 24,75-25,85 ("Muncullah kompleks QRS" 24,8-26,4) -> **kontraksi bilik mulai 25,95, penuh 28,4** (sesudah QRS; "berkontraksi" 28,3) -> **T** 30,7-33,6, puncak 32,15 ("muncul gelombang T" 31,6-32,7). Kontraksi tidak pernah mendahului QRS (kode: `con0 = 25,95 > qrs1`). Elektroda ditampilkan menerima sinyal (cincin menuju elektroda); tidak ada panah dari elektroda ke tubuh.

## Pemeriksaan teknis
- 1793 paket video, selisih PTS seragam 0,0333 dtk, tidak ada frame hilang.
- Selama P, QRS, dan T, panel EKG berubah di SETIAP frame (uji selisih piksel pada panel: 0 frame tak berubah). Jantung bergerak halus saat kontraksi/pemulihan; jeda diam terpanjang di bagian animasi <= ~0,9 dtk (diberi denyut/cincin kecil di nodus AV, sapuan cahaya di jejak EKG, dan kamera/objek bergerak halus). Bagian rekaman asli outro yang diam (Atlas 47,0-47,9; dialog Simulasi Dokter 55,3-57,6) mengikuti rekaman.
- Audio (ebur128, MP4 akhir): total -15,7 LUFS; edukasi -15,5, outro -15,9; puncak -0,7 dBFS. Suara outro tidak melonjak (disamakan ke narasi, gain -2,9 dB).
- Sumber medis dibuka dan dicocokkan (OpenStax 19.2, NHLBI heart-tests dan heart-beats).

## Keterbatasan yang jujur
- **Saya tidak dapat mendengarkan audio atau menonton video pada kecepatan normal.** Kelancaran gerak dinilai dari analisis selisih frame penuh dan lembar kontak; kesesuaian suara-visual dari waktu kata ASR dan konstruksi kode, bukan pendengaran manusia. Pelafalan "e-ka-ge", huruf per huruf QRS, "nodus a-ve", dan "MEDCOEL" pada kedua audio tidak dapat saya nilai (ASR mengeja "MedCoal" untuk outro). Mohon dengarkan dan tonton penuh sebelum diunggah.
- Hook: elektroda digambar di atas sweater Raka (aset Raka tidak punya kulit dada); kulit baru ditampilkan di adegan penampang dada. Raka tidak diubah.
- Satu denyut ditampilkan dalam "gerak lambat" (PR/ST jauh lebih panjang daripada aslinya) agar mengikuti narasi; pengulangan 33,7-37,3 dan monitor Raka memakai gelombang bentuk lebih realistis (periode 0,86 dtk). Repolarisasi atrium (tersembunyi di QRS) tidak ditampilkan; arah pemulihan bilik digambar sebagai sapuan dari apeks (penyederhanaan). Besar penyusutan bilik dilebihkan.
- Garis EKG contoh teratur dan tidak mengaitkan diagnosis; laju hanya ditandai, angka per menit tidak ditampilkan.
- Outro: Atlas 3D dan Live 4D Lab diambil dari rekaman layar asli (dipotong, Live 4D Lab = dua area layar ditumpuk); rekaman materi/soal/simulasi lebih lama daripada UI terkini. UI pada rekaman kecil di ponsel (sama dengan outro video lain). Label "Simulasi edukatif, bukan alat diagnosis" ditambahkan di video selain yang ada pada aplikasi.
- Musik/SFX hasil sintesis (CC0) dan belum didengar manusia; bip monitor pada puncak R sengaja pelan.
- Dua putaran koreksi: (1) letak label/QRS dalam panel, tag di adegan akhir, kontras; (2) gelombang T digeser agar muncul saat kata "T", gerak halus nodus AV, sapuan cahaya pada jejak.
