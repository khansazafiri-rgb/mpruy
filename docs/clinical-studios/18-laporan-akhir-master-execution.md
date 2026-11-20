# Laporan Akhir — MEDCOEL Master Execution Directive (Clinical Studios)

Tanggal: 20 November 2026. Semua angka di bawah diukur di sesi ini; tidak ada status hijau palsu.
**Tidak ada yang dirilis, dideploy, atau disetujui atas namamu.** Tidak ada studio yang terbuka untuk siswa.

## 1. PR dan SHA
| PR | Isi | Status |
|---|---|---|
| [#234](https://github.com/khansazafiri-rgb/mpruy/pull/234) | Seluruh pekerjaan master execution (13 commit, head `27abde7`) | **Sudah kamu merge** ke `claude/focused-wozniak-1ayrxa` (merge `c6452f9`, 20 Nov 10:30 UTC) |
| [#235](https://github.com/khansazafiri-rgb/mpruy/pull/235) | Perbaikan guard CI integrasi (`1cd9cc8`) + laporan ini | Draft, belum di-merge |

Commit utama #234: `b1b00b2` lineage + reproducibility · `f75a0a8` alur review · `a3aac88` progres belajar · `e658899` e2e full-stack ·
`1fbf1d6` akuisisi PTX-498/HC18/AMOS · `a86ba8b` registrasi sumber baru · `32cae87` LPBA40 BLOCKED · `0386236` paket legal ·
`f973d40` dependensi studios · `48d772d` status 24 studio + preview reviewer · `c2533cb` dokumen · `b18f32f`/`27abde7` palet spine.

## 2. Fitur yang selesai
- Provenance lengkap + `npm run studios:reproduce` (bukti byte-identik).
- Alur review manusia (medis/privasi/terminologi) terikat SHA-256: tanda tangan HMAC, revoke, invalidasi otomatis bila byte berubah, kaskade penolakan dari data induk, deteksi edit manual.
- Paket review privat per studio + pemindai privasi otomatis + draf terminologi (status `proposed`).
- Progres belajar siswa: koleksi `studio_progress` (migrasi aditif `1800003300`), skor ditulis server (jawaban pertama yang dihitung), Guided dicatat sebagai *self-reported*, tab Explore/Guided/Challenge + panel "Progres Anda" di halaman studio, ringkasan admin per studio/kampus.
- E2E full-stack: login → hub → iframe studio → Explore → Guided → Challenge → progres → masuk ulang → revoke (7/7).
- Preview reviewer privat (token, 127.0.0.1, banner permanen, kunci jawaban tidak pernah dikirim, tanpa receipt palsu).
- Status 24 studio yang dihitung otomatis (`studio-status.v1.json`, dicek di CI).
- Palet overlay Spine MRI lebih mudah dibaca (warna selang-seling antar level).

## 3. Pemulihan 35 aset lama
Semua 35 aset ada, cocok dengan registry, dan **dibuat ulang identik byte-per-byte** dari arsip resmi. Sekarang terdaftar dengan sumber asli dan commit pemrosesan nyata.

## 4. Akuisisi baru (subset kecil, privat, HTTP Range + CRC)
| Studio | Dataset | Lisensi | Isi |
|---|---|---|---|
| chest-xray | PTX-498 (Zenodo 8266529) | CC BY 4.0 | 4 radiograf (3 RS) + masker pneumotoraks → poligon |
| pelvis-ultrasound | HC18 (Zenodo 1327317) | CC BY 4.0 | 4 USG kepala janin, kalibrasi mm (**obstetri saja**) |
| abdomen-ct | AMOS 2022 kasus 0004 (Zenodo 7262581) | **Tidak konsisten**: CC BY 4.0 vs CC-BY-SA 4.0 | CT kontras + 13 organ (ginjal disembunyikan) |
Validasi: luas kontur HC18 cocok dengan lingkar kepala referensi; lateralitas AMOS dicek di 8 kasus; field `descrip` AMOS berisi jam akuisisi dan sudah dihapus.

## 5. Matriks 24 studio (dihitung otomatis)
FUNCTIONAL_PRIVATE_REVIEW **5** (ecg, chest-ct, spine-mri, chest-xray, pelvis-ultrasound) ·
FUNCTIONAL_WITH_PENDING_CLEARANCE **11** (9 anatomi BodyParts3D, brain-mri, abdomen-ct) ·
TECHNICAL_FIXTURE_ONLY **7** (brain-ct, lung-ultrasound, cardiac-echo, abdomen-ultrasound, fast-ultrasound, msk-xray, knee-mri) ·
BLOCKED **1** (cardiac-ct) · RELEASE_ELIGIBLE **0**.

## 6. Hasil legal BodyParts3D & LPBA40
- **BodyParts3D**: halaman lisensi DBCLS (diperbarui 27-02-2025) menyatakan CC BY 4.0; file Release 4.0 (2013) masih bertulisan CC BY-SA 2.1 JP. Belum pasti apakah lisensi baru berlaku untuk file lama → perlu konfirmasi tertulis DBCLS (draf email siap).
- **LPBA40**: lisensi LONI = "non-commercial research purposes only" → label LPBA40 di Brain MRI dicatat **BLOCKED**. AAL tidak dipakai.

## 7. Paket review
16 paket privat (13 lama + 3 baru) di `local-data/studio-resources/review-packages/`. Pemindai privasi otomatis: 0 temuan pada semua build privat (bukan pengganti review manusia; penanda "R" di radiograf masuk checklist).

## 8. Provenance
Registry: 8 sumber, **46 file sumber resmi** (URL, member, SHA-256), **54 aset turunan** dengan `dependsOn`, digest tool, dan commit pemrosesan `b18f32f`. Reproduksi: 46/46 + 54/54 identik.

## 9. Blocker
Lisensi BodyParts3D (9 studio) · LPBA40 (brain-mri) · lisensi AMOS · data cardiac-ct (CTACardio terbatas) · 7 studio belum punya data nyata ber-lisensi terbuka · belum ada reviewer medis/privasi/terminologi · Safari/iPad/GPU nyata belum diuji.

## 10. Status staging
Tidak ada staging terisolasi yang bisa kuakses; server/VPS/DNS tidak disentuh. Yang tersedia: stack lokal ber-layout produksi, preview reviewer privat, dan runbook (`17-staging-qa-security.md`).

## 11. Hasil CI & browser
- CI #234: `test` (pull_request) ✅, 4D UX base ✅ dan integrated ✅ (job "Compare 4D failures" ✅ = tidak ada kegagalan baru vs baseline), `catalog` ✅.
- `24 studios — integration` ❌ di #234 → penyebab: referensi dasar CI salah; **diperbaiki di #235** (lokal 8/8 dalam dua mode).
- Run push pada `1cd9cc8`: CI ✅.
- Lokal: web 168, PocketBase 84+7, test:studios 81, test:licensing 40, final integration 8/8, studios unit 16, PB secure 12/12, Challenge+progres 10/10, smoke 24/24, full-stack 7/7, anatomy integration/Vitest, 4D unit, Hermes — semua lulus.
- 4D UX lokal: 14 lulus / 2 gagal. "Layout phone" gagal karena batas waktu 30 menit dariku; "auskultasi" gagal di sesi panjang tapi normal di sesi baru (sisa kondisi langkah sebelumnya, kode 4D tidak diubah). Kamera pixel-hash **lulus**; tri-planar, patologi, keyboard yang dulu gagal kini lulus.
- Hanya Chromium (SwiftShader). Firefox/WebKit tidak tersedia di lingkungan ini.

## 12. Performa
Build privat: abdomen-ct 19,2 MB, chest-xray 3,1 MB, pelvis-ultrasound 0,8 MB; GLB anatomi 1,4–11,4 MB (kompresi mesh belum). Reproduksi penuh ≈ 20 detik.

## 13. Keamanan
Kunci jawaban (`server/`) tidak pernah dikirim; file anotasi per citra disembunyikan saat Challenge; progres hanya ditulis server, tanpa akses koleksi langsung; keputusan review ditandatangani kunci di luar repo. npm: `apps/studios` 0 advisory (vite 6.4.6, fflate 0.8.3, tanpa `--force`); react-router (butuh upgrade major) dan tooling lama hanya diklasifikasikan.

## 14. Regresi aplikasi lama
Atlas, 4D Lab, Lab Hub, Study/Exam Planner, CBT/bank soal, Hermes, admin: semua test lulus; tidak ada record hak legacy yang diubah; tidak ada migrasi lama yang diubah (guard memastikan).

## 15. Checklist kesiapan rilis
- [ ] Hak/lisensi terverifikasi per sumber · [ ] Reviewer terdaftar · [ ] Review medis/privasi/terminologi pada byte persis
- [ ] Receipt + atestasi per rilis · [ ] Staging terisolasi + uji Safari/iPad · [ ] Izin deploy darimu
- [x] Pipeline aman, provenance, reproducibility, progres, e2e full-stack

## 16. Keputusan yang perlu darimu
1. Merge #235 (perbaikan CI). 2. Kirim draf email DBCLS/LONI/AMOS (dokumen 16). 3. LPBA40: minta izin / buang label / ganti.
4. Pelvis USG: terima cakupan obstetri? 5. Label ginjal AMOS: buka atau tetap disembunyikan? 6. Tunjuk reviewer nyata.
7. Upgrade react-router (major) & tooling lama? 8. Origin studio terpisah (butuh DNS/Caddy)? 9. Izin staging/deploy.

## 17. Sisa pekerjaan yang tepat
- Setelah jawaban rights holder: perbarui status sumber di registry → jalankan ulang `register-studio-resources.mjs` + `studios:reproduce`.
- Setelah reviewer ada: `studio-review.mjs decide` per aset → `apply` → `verify`; lengkapi pack terminologi ID/Latin.
- Data nyata untuk 7 studio fixture (USG paru/abdomen/FAST, echo, MSK X-ray, knee MRI, brain CT) + video/cine USG, DICOM X-ray.
- Kompresi mesh/LOD anatomi; uji e2e host untuk mesin volume/image2d/ecg; Safari/iPad/GPU nyata.
- Stabilkan urutan langkah e2e 4D (auskultasi setelah patologi) tanpa menghapus assertion.
