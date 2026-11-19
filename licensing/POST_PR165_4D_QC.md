# QC setelah PR #165 — Anatomy asli tetap, 4D Lab diperbaiki terbatas

Tanggal audit: 10 November 2026. **Draft review only; no merge, public release, or licensing clearance.**

## Yang berubah
- **3D Anatomy**: Tidak disentuh. PR #165 sudah mengembalikan *viewer asli* pada preview lokal di `/anatomy/explore` dan `/anatomy/viewer/`. Viewer biru bukan lagi kandidat utama.
- **4D Lab**: Direction pad yang sebelumnya floating di atas kanvas pasien dipindahkan ke panel di samping kanvas pada viewport desktop. Ini menghilangkan intercept klik kontak kulit di abdomen, yang telah dilaporkan sebagai alasan kegagalan phantom dan Atlas browser test.
- **4D Lab camera**: Preset `setView` kini mengatur jarak berdasarkan rasio lebar/tinggi viewport, sehingga wajah dan tubuh tidak terpotong saat ruang kanvas mengecil karena kontrol dipindah.
- **Camera toolbar**: `view-menu` diberi z-index lebih tinggi dan dibatasi agar tidak meluas melewati panel arah pada desktop; media query mempertahankan kontrol mobile.
- **Tes browser**: `mode-navigation-e2e.mjs` kini memeriksa pad berada *di luar* `#viewport`, dan kamera otomatis menjauh pada viewport sempit. Ini bukan pengganti pemeriksaan visual Safari.

Perubahan UI ini adalah pembetulan **spesifik terhadap interaksi 4D Lab**, bukan redesain besar. Reviewer harus memastikan ukuran kanvas pasien tetap nyaman setelah arah probe dipindah.

## Bukti awal dari investigasi PR #165
- Viewer Anatomy asli: **16/16 Chromium** dengan screenshot evidensi. Safari belum diuji.
- 4D Lab base sebelum fix: phantom **13/14**, atlas **17/18**, UX **7/15**, mode-navigation lulus. Kegagalan phantom/atlas terkait klik kulit yang tertutup direction pad; beberapa UX failures adalah test drift (3 vs 5 tahap tutorial, perubahan navigasi workspace); satu isu kesamaan frame gambar belum dituntaskan.
- Branch historis `claude/4d-lab-ux-followup-fixes` mengandung pendekatan awal CSS & camera (ditinjau kembali terhadap integrasi **setelah** PR #165). Jangan menggabungkan branch lama itu secara langsung karena sudah divergen.
- Lisensi masih **RED**: aplikasi Atlas asli menggunakan CC BY-NC-SA 4.0; enam bundle model dan CT/USG turunannya belum mendapat verifikasi provenance per-asset. Dua gate publik tetap `blocked`.

## Kriteria QC Safari pada Mac
1. Buka `http://127.0.0.1:4173/anatomy/explore`: pastikan **viewer MEDCOEL hijau/asli** dengan top search, pemilih regio, dock bawah. Tidak ada tampilan sidebar biru.
2. Buka `http://127.0.0.1:4173/anatomy/4d-lab/`: pastikan tombol arah probe di samping kanvas desktop, **tidak menutupi pasien**, dan masih dapat diklik/ditekan.
3. Klik area abdomen kiri bawah pasien dalam mode Clinical Probe. Pastikan klik mendarat pada kulit, kontak probe berubah, dan CT/USG merespons.
4. Tutup/buka panel kontrol, ubah kamera dari depan/samping/atas dan kembalikan. Periksa tidak ada pemotongan tubuh yang tidak wajar atau kamera meloncat.
5. Buka Tri-planar CT dan coba scrollbar/monitor fullscreen. Ubah ke Auskultasi; periksa probe dan scan plane tidak mengganggu stetoskop.
6. Ulangi pada jendela Safari sempit dan, jika tersedia, iPad: pastikan direction pad mobile tidak menutupi kontrol penting. Jika menutupi kulit, temukan layout adaptif lain sebelum merge.
7. Uji mode Belajar, fisiologi, patologi dan tutorial lima tahap; jangan mengubah tes menjadi hijau dengan menghilangkan pemeriksaan perilaku yang nyata.

## Tetap belum diverifikasi
- Jalur E2E 4D lengkap setelah patch, terutama kegagalan yang tidak terkait direction pad.
- Safari pada hardware Apple Silicon, responsivitas dan memori 8 GB.
- Keabsahan hak komersial kode dan seluruh aset, termasuk CT/USG.
- Production URLs dan rollback state; branch/PR ini **tidak** menulis server.

## Release gate
Jangan mengubah `licensing/commercial-release.json` atau mengaktifkan rilis hanya karena CI berhasil. Perubahan rute Anatomy publik maupun 4D Lab memerlukan izin, QA dan persetujuan owner atas build yang tepat.
