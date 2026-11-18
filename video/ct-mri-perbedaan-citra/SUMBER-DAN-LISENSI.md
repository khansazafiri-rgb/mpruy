# Sumber dan lisensi video CT–MRI MEDCOEL

## Citra asli

- **CT of a normal brain, axial 18.png** — Mikael Häggström, M.D.; [sumber Wikimedia Commons](https://commons.wikimedia.org/wiki/File:CT_of_a_normal_brain,_axial_18.png); [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), penggunaan komersial diperbolehkan. Deskripsi sumber menegaskan CT kepala tanpa kontras IV, aksial, irisan 4 mm. Crop mengambil panel aksial saja; inset sagital dan metadata dibuang. Tidak mengubah window, kontras, anatomi atau orientasi.
- **Brain-T2-axial.png** — Sean Novak; [sumber Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brain-T2-axial.png); [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), boleh digunakan untuk promosi dengan atribusi dan share-alike. Sumber menegaskan MRI otak aksial T2. Crop hanya mengurangi margin hitam dan metadata dibuang. Penanda/teks adalah lapisan terpisah. Citra dan adaptasi visualnya tetap di bawah CC BY-SA 4.0.

Keduanya berasal dari orang berbeda dan berada pada ketinggian ventrikel lateral yang kira-kira sebanding. Label contoh tidak menyiratkan satu pasien atau satu pemeriksaan; tidak ada registrasi pixel, morph CT→MRI, rotasi dramatis, pewarnaan citra, atau klaim identitas pasien. Kredit singkat ditampilkan di video/cover; tautan lengkap ada di berkas ini dan SOURCES.json.

## Rekaman website dan merek

- `assets/materi-soal.mp4`: rekaman MEDCOEL asli dari `video/masih-dua-minggu/rekam/rekaman-web.mp4`. Data fixture lokal; tidak dipromosikan sebagai jumlah soal atau kemajuan akun publik. Dipakai pada kecepatan 1× tanpa audio sumber.
- `assets/live-4d-lab.mp4`: rekaman baru dari build aplikasi asli `apps/4d-lab/` pada commit `36f2d0a78d8497515e567c1b8be12ce5db4273ae`. UI ponsel 480×590 CSS pada DPR 2. Video browser native ditangkap dalam waktu nyata; padding recorder dibuang, konten 480×590 di-resample Lanczos ke 960×1180 dan di-encode 30 fps. Waktu dan kecepatan 1× dipertahankan. Perubahan tampilan CT → USG benar-benar dilakukan pada aplikasi; cuplikan akhir menekankan dua mode tersebut. Rincian `lab-recording.json`.
- **Live 4D Lab menyediakan simulasi CT dan USG. Tidak ada fitur MRI yang diklaim atau ditampilkan sebagai fitur MEDCOEL.** Dataset atlas sintetis, bukan citra pemeriksaan pasien. Label “Simulasi edukatif, bukan alat diagnosis” tampil selama bagian lab.
- Cuplikan visual atlas adalah adaptasi **CC BY-SA 4.0**. Atribusi: “BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan”, [sumber](https://lifesciencedb.jp/bp3d/), [lisensi](https://creativecommons.org/licenses/by-sa/2.1/jp/); “Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0”, [sumber](https://www.z-anatomy.com/), [lisensi](https://creativecommons.org/licenses/by-sa/4.0/). Hanya build yang sudah melewati quarantine lisensi repo yang direkam; aset nervous/kidney/ossicles yang ditahan tidak dipakai.
- Logo asli `apps/web/src/assets/logo-full.webp`. Hak merek MEDCOEL tetap pada pemiliknya; pemakaian aset merek mengikuti permintaan pemilik proyek, bukan pemberian hak merek kepada pihak lain.

## Audio

Satu sumber: `Generated Audio November 18, 2026 - 2_17PM.wav`, narasi Google AI Studio yang diberikan langsung oleh pengguna (66,76 detik). File asli dan master linimasa 76,3 detik disertakan. Hanya jeda hening yang ditambahkan; semua sampel ucapan dipertahankan berurutan dan identik pada 1×. Tidak ada musik, SFX, bunyi scanner pihak ketiga, audio rekaman web, atau audio iklan lama.

## Sumber ilmiah yang dibaca sebelum visual dibuat

[RadiologyInfo: sinar-X](https://www.radiologyinfo.org/en/info/xray), [MRI](https://www.radiologyinfo.org/en/info/mr), [head CT](https://www.radiologyinfo.org/en/info/headct), dan [ACR High Yield Guide, MRI basics dan T1/T2/FLAIR](https://cs.acr.org/-/media/ACR/Files/Member-Resources/Med-Students/MESO_High-Yield-Guides_Design_v3.pdf). Fakta diparafrasekan sesuai narasi; tidak menyalin ilustrasi berhak cipta dari panduan tersebut.
