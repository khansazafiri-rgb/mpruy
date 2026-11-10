# MEDCOEL — rekonsiliasi hak 3D Anatomy & 4D Lab
**Diperiksa 10 November 2026.** Audit selisih (*gap audit*), bukan audit ulang dari nol dan **bukan sertifikat hukum**.

Repository: [khansazafiri-rgb/mpruy](https://github.com/khansazafiri-rgb/mpruy). Branch integrasi saat diperiksa: `feature/4d-lab-official-logo-guided-tour`. **Tidak ada deploy, perubahan Caddy, penggantian UI, atau perubahan release gate dalam pekerjaan ini.**

## 1. Hasil yang sudah nyata — jangan diulang dari nol

| Pekerjaan | Bukti yang sudah diperiksa | Arti dan batasnya |
| --- | --- | --- |
| Source Anatomy sudah dipublikasikan | Repository GitHub berstatus **public** pada saat pemeriksaan; [`apps/anatomy/SOURCE-PUBLICATION.md`](../apps/anatomy/SOURCE-PUBLICATION.md), [`integration/CLAUDE-ANATOMY-HANDOFF.md`](../integration/CLAUDE-ANATOMY-HANDOFF.md), source aktif di `apps/anatomy/src/` serta branch `handoff/anatomy-visual-learning` | **Publikasi source dibuktikan.** Tidak otomatis menjadi izin komersial atas karya yang kode sumbernya masih CC BY-NC-SA. Ini juga tidak membuktikan setiap commit/versi runtime sudah diumumkan. |
| Anatomy dipisahkan dari frontend utama | `apps/anatomy/package.json`, `apps/web/package.json`, [`apps/anatomy/INTEGRATION.md`](../apps/anatomy/INTEGRATION.md), [`deploy/anatomy.caddy.snippet`](../deploy/anatomy.caddy.snippet), mount persisten `/var/lib/medcoel/anatomy-viewer` | **Aplikasi/build/route dipisahkan.** Belum membuktikan apakah **VPS fisik kedua** yang disebut pemilik masih berjalan, atau bahwa konfigurasi publik terkini identik dengan dokumen. |
| Atribusi dan notice model tersedia | [`apps/anatomy/NOTICE`](../apps/anatomy/NOTICE), `apps/anatomy/public/models/License.txt`, [`apps/4d-lab/public/data/atlas/NOTICE.txt`](../apps/4d-lab/public/data/atlas/NOTICE.txt) | Dokumen atribusi dan perubahan tersedia; keakuratan atas setiap mesh dan salinan yang benar-benar disajikan harus tetap diperiksa. |
| Karantina konten NC/tanpa izin | [`licensing/quarantine-policy.json`](quarantine-policy.json), `scripts/licensing-quarantine.test.mjs`: seluruh `nervous.glb`, ginjal/pelvis renalis dan tulang pendengaran tertentu ditahan; kandidat source saat ini tidak memuat `nervous.glb` | **Kontrol build ada** untuk membatasi materi yang telah diketahui bermasalah; ini tidak memverifikasi semua 2.237 struktur yang tersisa atau menyingkirkan aset dari Git history dan produksi lama. |
| Dataset CT Atlas 4D dibangun ulang | [`anatomy.json`](../apps/4d-lab/public/data/atlas/anatomy.json) mencatat enam input GLB dan SHA-256; [`NOTICE.txt`](../apps/4d-lab/public/data/atlas/NOTICE.txt) mencatat voxelisasi dan input yang dikecualikan | Pekerjaan **rekonstruksi dan pelacakan input** nyata. Hash bukan bukti kepemilikan, hak distribusi, maupun validasi klinis; sumber GLB masih perlu diverifikasi. |
| Kandidat data resmi yang terpisah dari GLB campuran | [`BP3D_OFFICIAL_SOURCE_REPLACEMENT.md`](BP3D_OFFICIAL_SOURCE_REPLACEMENT.md) dan `npm run audit:bodyparts3d -- --download` | Ada alat *intake* untuk sumber asli BodyParts3D 4.0 CC BY 4.0. **Belum merupakan pemetaan geometri atau penggantian CT yang sah dan tervalidasi.** |
| Pemilik telah menerima UX 3D & 4D | Umpan balik pemilik setelah PR #165–#168 | Persetujuan UX **tidak sama** dengan persetujuan hak kekayaan intelektual atau izin deploy. |

Perintah yang dapat dijalankan kapan pun untuk menghindari kesimpulan keliru `0/14 = belum ada pekerjaan`:

```sh
npm run audit:existing-controls
npm run audit:commercial-evidence
node licensing/tools/audit-commercial-evidence.mjs --require-clearance
```

Perintah pertama melaporkan **kontrol repository yang sudah ada** secara terpisah dari **izin yang terverifikasi**. Perintah kedua menguji kelengkapan bentuk register. Perintah ketiga **seharusnya gagal** sampai benar-benar ada bukti hak yang lengkap. Tidak satu pun membuka staging publik.

## 2. Pertanyaan hukum yang masih nyata — jangan dicampur lagi

### A. Source aplikasi Anatomy pihak ketiga — hak berbeda dari kewajiban open source

[`nqwrc/3d-anatomy` LICENSE pada revisi yang dipakai](https://github.com/nqwrc/3d-anatomy/blob/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/LICENSE) mencantumkan **CC BY-NC-SA 4.0** untuk *application source code* (`index.html`, `src/`, `public/styles/`, `tools/`, konfigurasi build), sekalipun beberapa model NC telah dihapus dari kandidat MEDCOEL. `apps/anatomy/package.json` dan `apps/anatomy/public/LICENSE` juga masih menyatakan kondisi tersebut.

**Source sudah dibuka**; itu bukti tindakan keterbukaan kode. Namun membuka source sendiri tidak mencabut klausul NonCommercial pada kode pihak ketiga. Bila MEDCOEL akan didistribusikan dalam konteks komersial, diperlukan (i) grant yang meliputi seluruh kontributor berhak, atau (ii) implementasi independen yang kepemilikan dan sumbernya dapat dibuktikan serta mempertahankan UX yang sudah disetujui. Jangan menghapus tanda NC dari `package.json` sebagai jalan pintas.

### B. Z-Anatomy — ShareAlike telah ditindaklanjuti, tetapi lingkup kewajiban masih perlu pendapat berwenang

[`Z-Anatomy/Models-of-human-anatomy/License.txt`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt) menyatakan konten/code mereka berada di bawah **CC BY-SA 4.0**. Pada [diskusi Juli 2026](https://github.com/Z-Anatomy/Models-of-human-anatomy/issues/6#issuecomment-5020136533) pengelola mengatakan kode keseluruhan aplikasi yang menggunakan model harus terbuka; pada [diskusi Oktober 2026](https://github.com/Z-Anatomy/Models-of-human-anatomy/issues/12#issuecomment-6317595745) mereka mengulangi permintaan kode terbuka. **MEDCOEL telah melakukan publikasi source** dan pemisahan aplikasi; catat sebagai pekerjaan selesai, bukan meniadakannya.

Yang belum dapat dipastikan dari dokumen itu adalah **lingkup ShareAlike menurut lisensi standar terhadap viewer yang independen dan hanya menyajikan model sebagai aset terpisah**, serta apakah ada persyaratan tertulis tambahan yang disepakati. Penerapan ke perangkat lunak terpisah perlu pendapat hukum sesuai karya dan fakta distribusinya. Pernyataan pengelola penting dan harus dihormati dalam korespondensi, namun tidak otomatis membuktikan status hukum seluruh komponen MEDCOEL.

### C. Model anatomi, katalog, thumbnail, dan CT/USG

Enam kelompok model yang masih aktif menggunakan asal **BodyParts3D → Z-Anatomy** yang saat ini dicatat dengan *per-structure-inferred*, bukan verifikasi geometri per mesh. Beberapa kontribusi pihak ketiga dibatasi atau tidak jelas lisensinya. Karena itu pruned GLB, thumbnail, serta CT/labels/skin turunan belum bisa dinyatakan selesai legalitasnya. Source BodyParts3D resmi berlisensi [CC BY 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), tetapi lisensi resmi terbaru **tidak membuktikan byte asal** model campuran lama.

### D. Kode 4D Lab, paket, suara, materi promosional

`apps/4d-lab/package.json` bertanda `UNLICENSED`; ini tidak berarti user kehilangan hak atas kode yang benar-benar mereka miliki, namun riwayat kontribusi, dependensi, dan kemungkinan adaptasi kode NC harus ditelusuri. Phantom/procedural simulation terdokumentasi sebagai pekerjaan MEDCOEL; jalur atlas-derived tetap terkait dengan enam GLB. Audio synthesizer dan media juga punya sumber/hak yang perlu diverifikasi pada kandidat distribusi spesifik.

## 3. Status register yang tepat

[`commercial-rights-evidence.json`](commercial-rights-evidence.json) saat diperiksa mempunyai **14 catatan**:
- **0 verified** untuk persetujuan formal komersial.
- **1 blocked** (`atlas-code`).
- **13 needs-review**, termasuk model, turunan CT, kode 4D, dependensi, dan media.

Angka ini **bukan skor pekerjaan engineering** dan tidak bertentangan dengan adanya source publik, karantina, atribusi, ataupun pipeline. Ini adalah status *evidence acceptance* per pemegang hak/berkas, yang memerlukan bukti, hash spesifik, dan review.

[`commercial-release.json`](commercial-release.json) masih menutup kedua produk (`atlas-viewer` dan `4d-lab`), masing-masing **0 approvedBuilds**.

## 4. Prioritas agar tidak mengulang kerja

| Urutan | Tindakan berikutnya | Kapan boleh ditutup |
| --- | --- | --- |
| P0 | Buktikan status **deployment live** dan potensi distribusi lama berisiko. Audit 9 November menemukan asset NC/tidak jelas masih terlayani pada beberapa URL `medcoel.com`; **tidak boleh menganggap hasil itu masih sama hari ini tanpa memeriksa lagi**. | Bukti HTTP terbaru, identitas release/Caddy aktual, tindak lanjut yang diotorisasi. Tidak menimpa server atau sejarah Git secara otomatis. |
| P1 | Putuskan izin komersial **kode `nqwrc/3d-anatomy`**. Source open sudah dilakukan; sisa isu adalah hak pemegang copyright. | Izin tertulis yang tepat dan mencakup kontributor relevan, atau implementasi independen yang ditinjau; **bukan** perubahan teks LICENSE. |
| P1 | Verifikasi per-mesh enam model atau pindahkan data ke sumber asli resmi yang diverifikasi. | URL & hash sumber, kecocokan identitas/geometri, izin, dan notice per komponen. |
| P1 | Regenerasi thumbnail dan turunan CT/USG berbasis model terverifikasi. | Lineage input-output, pemeriksaan volume/registrasi, tes simulasi dan izin turunan lengkap. |
| P2 | Audit kepemilikan kode 4D Lab, paket exact-version, konten penjelasan, TTS/media. | SBOM, bukti kontribusi/pemegang hak, dan atribusi yang berlaku untuk tiap versi. |
| P3 | Review hukum dan QC final exact build lalu rilis atas izin pemilik. | Catatan 14 komponen diterima berdasarkan bukti; hash build tervalidasi; tidak ada gate yang di-bypass. |

## 5. Hal yang sengaja **belum** diklaim

- Bahwa **VPS kedua** secara fisik aktif saat ini. Dokumentasi membuktikan pemisahan source/build/mount; status VM nyata memerlukan pemeriksaan infrastruktur. Pemilik sebelumnya telah menyampaikan penggunaan server kedua dan temuannya harus direkonsiliasi, bukan dihapus.
- Bahwa seluruh versi source di semua server sama dengan publikasi terbaru.
- Bahwa akses publik ke model yang dikarantina telah berhenti. [`EXPOSURE_AND_ROLLBACK_PLAN.md`](EXPOSURE_AND_ROLLBACK_PLAN.md) adalah catatan **9 November**, bukan monitoring live otomatis.
- Bahwa hak kode NC bisa dibereskan melalui perubahan nama, membuka source, atau memindahkan hosting saja.
- Bahwa 4D Lab sudah pernah diluncurkan ke production, atau CT/USG yang didistribusikan telah memiliki izin lengkap.
- Bahwa aplikasi atau dataset sudah memenuhi standar alat diagnosis.

**Keputusan:** Tidak mengubah UI, melakukan rollback, deploy, menghapus sumber, menerbitkan materi promosi, atau membuka gate apa pun dari laporan ini. Hanya kekurangan **yang masih nyata** yang harus dikerjakan. 
