<!-- materi:v2 -->

## Big Picture: dari Individu ke Populasi

- Genetika klinis tidak hanya bertanya “gen apa yang bermutasi?”, tetapi juga “seberapa sering alel itu ada di populasi?”, “berapa kemungkinan seseorang menjadi carrier?”, dan “berapa risiko penyakit berulang dalam keluarga?”.
- Population genetics mempelajari distribusi dan perubahan frekuensi alel/genotipe dalam populasi.
- Genetic counseling menerjemahkan informasi genetik menjadi keputusan klinis yang dapat dipahami pasien/keluarga tanpa memaksa pilihan tertentu.
- Dua konsep ini bertemu pada recurrence risk, carrier screening, family history, dan interpretasi hasil tes genetik.

> [!warning] Penting
> - Population frequency ≠ individual risk secara otomatis.
> - Family history dapat menaikkan atau menurunkan prior probability seseorang dibanding angka populasi umum.
> - Genetic test tidak berdiri sendiri: hasil harus dibaca bersama phenotype, pedigree, dan jenis tes yang digunakan.

## Istilah Dasar Population Genetics

- Gene pool = seluruh alel yang terdapat dalam suatu populasi.
- Allele frequency = proporsi suatu alel di antara seluruh alel pada locus tersebut.
- Genotype frequency = proporsi individu dengan genotype tertentu.
- Untuk locus autosomal dengan dua alel A dan a: p = frekuensi alel A.; q = frekuensi alel a.; p + q = 1.
- Jika populasi berada dalam Hardy–Weinberg equilibrium: AA = p².; Aa = 2pq.; aa = q².; p² + 2pq + q² = 1.

> [!highyield] High-yield
> Frekuensi alel dan frekuensi genotype adalah konsep berbeda. Jangan menyamakan q dengan q².

## Hardy–Weinberg Equilibrium

Hardy–Weinberg equilibrium (HWE) adalah model null: bila tidak ada kekuatan evolusioner tertentu, frekuensi alel dan genotype dapat diprediksi dan relatif stabil antar-generasi.

Asumsi ideal HWE:

- Population size sangat besar → genetic drift minimal.
- Random mating.
- Tidak ada migration/gene flow bermakna.
- Tidak ada mutation bermakna.
- Tidak ada natural selection yang membedakan fitness genotype.

![Hubungan p, q, p², 2pq, dan q² pada Hardy–Weinberg equilibrium](https://lh3.googleusercontent.com/d/112-Zfl8Ua3DoDLPTGJYE3LbpiUBGzXGc)

Interpretasi grafik:

- Saat q rendah, q² jauh lebih kecil daripada q.
- Heterozygote 2pq mencapai maksimum ketika p dan q mendekati 0,5.
- Untuk penyakit autosomal recessive langka, jumlah carrier biasanya jauh lebih besar daripada jumlah affected.

## Menghitung Carrier Frequency pada Autosomal Recessive

Jika insidensi penyakit autosomal recessive = q²:

1. Hitung q = √q².
2. Hitung p = 1 − q.
3. Carrier frequency = 2pq.

Contoh klasik:

- Penyakit AR terjadi pada 1 dari 10.000 individu.
- q² = 1/10.000 = 0,0001.
- q = 0,01 = 1/100.
- p ≈ 0,99.
- 2pq ≈ 2 × 0,99 × 0,01 ≈ 0,0198 ≈ 1/50.

Jadi penyakitnya hanya sekitar 1/10.000, tetapi carrier sekitar 1/50.

## High-Yield Shortcut {highyield}

- Untuk alel recessive yang sangat jarang, p ≈ 1 sehingga carrier frequency ≈ 2q.

## X-Linked dan Population Frequency

Untuk alel recessive X-linked dengan frekuensi q:

- Laki-laki hanya punya satu kromosom X → frekuensi laki-laki affected kira-kira q.
- Perempuan affected ≈ q².
- Perempuan heterozygous carrier ≈ 2pq.

Implikasi:

- X-linked recessive jauh lebih mudah tampak pada laki-laki dibanding perempuan.
- Frekuensi affected male dapat langsung memberi estimasi kasar frekuensi alel mutant dalam populasi.

## Faktor yang Mengubah Allele Frequency

### 1. Mutation

- Mutation menciptakan alel baru.
- Mutation rate per generation biasanya kecil, tetapi penting dalam jangka panjang atau pada penyakit dengan de novo mutation tinggi.

### 2. Natural Selection

- Genotype dengan reproductive fitness berbeda akan menghasilkan kontribusi keturunan berbeda.
- Negative selection menurunkan frekuensi alel yang mengurangi fitness.
- Positive selection meningkatkan alel yang memberi keuntungan reproduktif/survival.

### 3. Heterozygote Advantage

- Heterozygote memiliki fitness lebih tinggi dibanding kedua homozygote pada lingkungan tertentu.
- Ini dapat mempertahankan alel penyakit dalam populasi meskipun homozygous disease merugikan.

### 4. Gene Flow / Migration

- Perpindahan individu antar-populasi membawa alel masuk atau keluar sehingga mengubah allele frequency.

### 5. Genetic Drift

- Perubahan allele frequency akibat chance/random sampling.
- Paling kuat pada populasi kecil.
- Dapat menyebabkan alel menjadi fixed atau hilang tanpa selection.

## Founder Effect dan Population Bottleneck

Founder effect:

- Populasi baru dibentuk oleh sedikit individu dari populasi asal.
- Alel yang kebetulan dibawa founders dapat menjadi jauh lebih sering daripada di populasi asal.

Population bottleneck:

- Populasi mengalami penurunan drastis ukuran.
- Survivors mungkin membawa subset alel yang tidak merepresentasikan populasi awal.

![Founder effect dan genetic drift: random sampling dapat menggeser allele frequency antargenerasi](https://lh3.googleusercontent.com/d/1KbEkO7iVghqUVlupAwfGskDW_1eYWE0v)

> [!warning] Penting
> Founder effect dan bottleneck adalah bentuk genetic drift. Keduanya tidak membutuhkan keuntungan biologis alel tertentu.

## Nonrandom Mating, Consanguinity, dan Inbreeding

- Consanguinity = pasangan biologis memiliki common ancestor relatif dekat.
- Hal ini meningkatkan peluang kedua orang membawa alel recessive yang sama dari leluhur bersama.
- Dampak utama adalah peningkatan homozygosity, bukan otomatis peningkatan mutation rate.
- Karena itu risiko penyakit autosomal recessive tertentu dapat meningkat.

Inbreeding coefficient (F):

- Menggambarkan probabilitas dua alel pada suatu locus identik karena berasal dari ancestor yang sama (identical by descent).
- Semakin dekat hubungan biologis orang tua, semakin tinggi F keturunannya.

> [!warning] Jebakan soal
> Consanguinity tidak membuat alel recessive baru; ia meningkatkan kemungkinan dua copy alel recessive yang sudah ada bertemu pada anak.

## Linkage Disequilibrium

- Linkage disequilibrium (LD) = kombinasi alel pada dua locus ditemukan bersama lebih sering daripada yang diprediksi dari frekuensi masing-masing.
- LD dapat terjadi karena lokasi genom berdekatan, founder effect, selection, admixture, atau sejarah populasi.
- LD penting dalam genome-wide association studies (GWAS) karena marker variant dapat “menandai” causal variant di dekatnya.

> [!warning] Penting
> Association ≠ causation. SNP yang berasosiasi dengan penyakit belum tentu merupakan variant kausal.

## Polygenic dan Multifactorial Inheritance

Tidak semua penyakit mengikuti satu gen Mendelian.

- Polygenic trait dipengaruhi banyak gen.
- Multifactorial trait dipengaruhi kombinasi banyak gen + environment.
- Contoh umum konsep: tinggi badan, tekanan darah, obesitas, dan banyak penyakit common complex.

Threshold model:

- Liability adalah kecenderungan total dari faktor genetik + lingkungan.
- Penyakit muncul ketika liability melewati threshold tertentu.
- Risiko recurrence biasanya lebih tinggi bila: lebih banyak anggota keluarga affected,.; phenotype pada proband lebih berat,.; hubungan kerabat lebih dekat,.; penyakit terjadi pada sex yang lebih jarang terkena untuk trait tertentu.

## Heritability

- Heritability mengukur proporsi variasi phenotype dalam suatu populasi yang berkaitan dengan variasi genetik pada lingkungan tertentu.
- Heritability tinggi TIDAK berarti phenotype seseorang “ditentukan gen”.
- Heritability adalah statistik populasi, bukan persentase penyebab pada satu individu.
- Nilainya dapat berubah bila lingkungan atau komposisi populasi berubah.

> [!warning] Jebakan soal
> Heritability 80% tidak berarti “80% penyakit pasien disebabkan gen dan 20% lingkungan”.

## Genetic Counseling — Tujuan Utama

Genetic counseling bertujuan membantu individu/keluarga:

- memahami diagnosis atau kemungkinan diagnosis genetik,
- memahami pola inheritance,
- memperkirakan recurrence risk,
- memahami pilihan testing,
- memahami potensi hasil dan keterbatasan tes,
- membuat keputusan yang sesuai nilai dan preferensi mereka,
- mempersiapkan dampak medis, reproduktif, dan psikososial.

Prinsip inti:

- autonomy,
- informed consent,
- confidentiality,
- nondirectiveness,
- respect terhadap nilai pasien,
- komunikasi risiko yang jelas,
- dukungan psikososial.

## Siapa yang Memerlukan Genetic Counseling?

Indikasi umum:

- kelainan kongenital atau developmental disorder yang dicurigai genetik,
- penyakit onset dini atau familial,
- beberapa anggota keluarga dengan kondisi sama,
- recurrent pregnancy loss tertentu,
- infertilitas dengan dugaan faktor kromosomal/genetik,
- riwayat anak dengan kelainan kromosom/genetik,
- pasangan dengan carrier status,
- consanguinity,
- abnormal prenatal screening,
- hasil genetic test yang perlu interpretasi,
- inherited cancer predisposition,
- pertimbangan predictive/presymptomatic testing.

## Langkah Praktis Genetic Counseling

1. Tentukan pertanyaan klinis.
2. Ambil personal medical history dan family history.
3. Buat pedigree minimal beberapa generasi bila relevan.
4. Identifikasi inheritance pattern yang paling mungkin.
5. Estimasi prior risk.
6. Pilih tes yang sesuai.
7. Lakukan pre-test counseling dan informed consent.
8. Interpretasikan hasil dalam konteks phenotype + pedigree.
9. Post-test counseling.
10. Diskusikan implikasi untuk anggota keluarga dan follow-up.

![Pedigree sebagai alat utama genetic counseling untuk memetakan affected, unaffected, dan hubungan keluarga](https://lh3.googleusercontent.com/d/1qw4n4oQnLH_i4Bk8OFIcfQMl_nr_g8Ni)

## Pedigree dalam Konseling Genetik

Pedigree membantu:

- mengidentifikasi AD, AR, X-linked, mitochondrial, atau pola lain,
- memperkirakan obligate carrier,
- melihat age of onset,
- mengenali variable expressivity,
- mengenali reduced penetrance,
- menentukan kerabat yang mungkin memperoleh manfaat dari testing.

Informasi penting pada pedigree:

- sex,
- affected/unaffected,
- usia sekarang atau usia meninggal,
- diagnosis spesifik,
- age at diagnosis,
- hasil tes genetik bila ada,
- pregnancy loss,
- consanguinity,
- ancestry yang relevan terhadap diagnosis tertentu.

## Recurrence Risk: Empiric vs Mendelian

Mendelian risk:

- Dihitung dari genotype dan pola inheritance.
- Contoh carrier AR × carrier AR → 25% affected per pregnancy.

Empiric risk:

- Dipakai bila mekanisme tidak sederhana atau genotype belum diketahui.
- Berdasarkan data observasi populasi/family studies.

> [!warning] Penting
> Setiap pregnancy merupakan event independen. Jika pasangan carrier AR sudah punya satu anak affected, risiko anak berikutnya tetap 25%, bukan “sudah terpakai”.

## Bayesian Thinking dalam Genetika

Genetic counseling sering memerlukan update probabilitas.

**Kerangka dasar**: Posterior risk ∝ Prior risk × Evidence dari hasil tes/family history.

Contoh konsep:

- Seseorang punya prior carrier risk dari pedigree.
- Tes carrier negatif menurunkan risiko, tetapi tidak selalu menjadi nol karena tes mungkin tidak mendeteksi seluruh pathogenic variant.
- Residual risk bergantung pada detection rate tes dan prior probability.

> [!warning] Jebakan soal
> “Negative test” tidak selalu berarti “bukan carrier”.

## Jenis Genetic Testing Berdasarkan Tujuan

### 1. Diagnostic testing

- Untuk pasien yang sudah memiliki tanda/gejala.

### 2. Carrier testing

- Menilai apakah individu membawa pathogenic variant recessive tertentu.

### 3. Predictive / presymptomatic testing

- Pada individu belum bergejala tetapi berisiko penyakit onset kemudian.

### 4. Prenatal diagnostic testing

- Menilai fetal genetic condition menggunakan sampel diagnostik.

### 5. Preimplantation genetic testing (PGT)

- Testing embryo dalam konteks assisted reproduction untuk kondisi tertentu.

### 6. Newborn screening

- Screening populasi neonatal untuk kondisi yang memenuhi kriteria program.

### 7. Population/carrier screening

- Menawarkan screening pada kelompok tertentu atau populasi luas sesuai konteks klinis.

## Screening vs Diagnostic Testing

Screening:

- Tujuannya mengidentifikasi individu berisiko tinggi.
- Biasanya digunakan pada populasi tanpa diagnosis definitif.
- Positive screen perlu evaluasi/confirmatory diagnostic test.

Diagnostic testing:

- Bertujuan memastikan atau menyingkirkan diagnosis dengan tingkat kepastian lebih tinggi.

> [!highyield] High-yield
> SCREEN POSITIVE ≠ DIAGNOSIS.

SCREEN NEGATIVE ≠ RISK ZERO.

## Sensitivity, Specificity, PPV, NPV dalam Genetic Screening

- Sensitivity = kemampuan tes menangkap individu yang benar-benar memiliki kondisi.
- Specificity = kemampuan tes mengenali individu yang benar-benar tidak memiliki kondisi.
- Positive predictive value (PPV) = probabilitas kondisi benar-benar ada jika hasil tes positif.
- Negative predictive value (NPV) = probabilitas kondisi benar-benar tidak ada jika hasil tes negatif.

> [!warning] Penting
> PPV dan NPV dipengaruhi prevalence/pre-test probability.
>
> - Pada kondisi sangat jarang, false positive dapat tetap menjadi masalah meski specificity tinggi.
> - Family history kuat menaikkan pre-test probability dan dapat mengubah interpretasi hasil.

## Variant Classification dan Konseling

Hasil molecular genetic test sering diklasifikasikan sebagai:

- pathogenic,
- likely pathogenic,
- variant of uncertain significance (VUS),
- likely benign,
- benign.

VUS:

- bukti belum cukup untuk menentukan apakah variant menyebabkan penyakit.
- TIDAK boleh diperlakukan sama dengan pathogenic variant.
- Dapat berubah klasifikasi seiring munculnya bukti baru.

> [!warning] Jebakan soal
> VUS ≠ diagnosis molekuler definitif.

## Cascade Testing

Cascade testing = menawarkan targeted genetic testing kepada kerabat biologis yang berisiko setelah pathogenic/likely pathogenic familial variant ditemukan.

Keuntungan:

- testing lebih terarah,
- dapat menemukan kerabat asymptomatic yang membutuhkan surveillance/prevention,
- membantu reproductive planning.

> [!warning] Penting
> Targeted familial variant testing biasanya berbeda dari mengulang seluruh panel pada setiap anggota keluarga.

## Pre-Test Counseling

Hal yang perlu dipahami sebelum tes:

- apa tujuan tes,
- kondisi apa yang dapat dan tidak dapat dideteksi,
- kemungkinan hasil,
- kemungkinan VUS,
- keterbatasan analytic/clinical sensitivity,
- kemungkinan incidental/secondary findings tergantung jenis tes,
- implikasi untuk anggota keluarga,
- konsekuensi psikologis dan reproduktif,
- confidentiality dan consent.

## Post-Test Counseling

Setelah hasil keluar:

- jelaskan hasil dalam bahasa yang jelas,
- kaitkan dengan phenotype dan pedigree,
- jelaskan residual uncertainty,
- susun medical follow-up bila relevan,
- diskusikan siapa dalam keluarga yang mungkin berisiko,
- dokumentasikan hasil dan rekomendasi,
- pertimbangkan re-evaluation jika variant classification berubah atau phenotype berkembang.

## Ethical Principles dalam Genetic Counseling

### 1. Autonomy

- Pasien berhak menerima atau menolak testing setelah mendapat informasi yang memadai.

### 2. Informed Consent

- Consent bukan sekadar tanda tangan; pasien harus memahami tujuan, manfaat, keterbatasan, dan konsekuensi tes.

### 3. Confidentiality

- Genetic information dapat relevan untuk keluarga, tetapi tetap merupakan informasi medis pasien yang harus dikelola secara hati-hati.

### 4. Nondirectiveness

- Konselor memberi informasi dan membantu proses keputusan tanpa memaksa pilihan reproduktif/medis tertentu.

### 5. Uncertainty

- Hasil genetik tidak selalu binary. Penetrance, expressivity, VUS, mosaicism, dan faktor lingkungan dapat membuat prediksi tidak sempurna.

## Reproductive Options — Konsep Dasar

Bila pasangan memiliki risiko genetic disorder, opsi yang dapat dibahas secara nondirective meliputi:

- natural conception dengan atau tanpa prenatal testing,
- assisted reproduction dengan PGT pada kondisi tertentu,
- donor gamete,
- adoption,
- memilih tidak memiliki anak biologis,
- atau opsi lain sesuai konteks pasien dan layanan tersedia.

> [!warning] Penting
> Peran counseling adalah menjelaskan risiko dan pilihan, bukan menentukan pilihan mana yang “benar”.

## Clinical Pattern Recognition

**Kasus 1**: Penyakit AR 1/10.000 di populasi.

- q² = 1/10.000
- q = 1/100
- carrier ≈ 2q = 1/50

**Kasus 2**: Dua orang carrier confirmed untuk penyakit AR yang sama.

- 25% affected
- 50% carrier
- 25% unaffected non-carrier

per pregnancy.

**Kasus 3**: Pasien sehat memiliki pathogenic familial variant untuk penyakit AD dengan age-dependent penetrance.

- Genetic result tidak otomatis menentukan kapan/berapa berat penyakit akan muncul.
- Perlu disease-specific surveillance dan counseling.

**Kasus 4**: Screening prenatal positif.

- Ini meningkatkan risk estimate tetapi bukan diagnosis.
- Perlu counseling mengenai diagnostic confirmation.

**Kasus 5**: Panel genetik menemukan VUS yang sesuai gene kandidat.

- Jangan langsung menyatakan penyebab penyakit.
- Evaluasi segregation, phenotype fit, database/evidence, dan kemungkinan reclassification.

## High-Yield Traps {highyield}

- q ≠ q².
- Untuk AR langka, carrier ≈ 2q, bukan q².
- Hardy–Weinberg adalah model populasi, bukan hukum bahwa semua populasi selalu equilibrium.
- Genetic drift paling kuat pada populasi kecil.
- Founder effect ≠ natural selection.
- Consanguinity meningkatkan homozygosity, bukan mutation rate.
- Heritability adalah parameter populasi, bukan persentase penyebab penyakit pada individu.
- Screening positif ≠ diagnosis.
- Negative genetic test ≠ risk zero.
- VUS ≠ pathogenic variant.
- Genetic counseling harus menghormati autonomy dan bersifat nondirective.
- Recurrence risk dihitung per pregnancy; kelahiran sebelumnya tidak “menghabiskan” probabilitas.

## Ringkasan 30 Detik {highyield}

- HWE: p + q = 1; p² + 2pq + q² = 1.
- AR affected = q²; carrier = 2pq ≈ 2q bila alel langka.
- X-linked recessive: affected male ≈ q.
- Drift = perubahan acak; founder effect dan bottleneck adalah bentuk drift.
- Gene flow, mutation, selection, drift, dan nonrandom mating dapat mengubah struktur genetik populasi.
- Consanguinity → homozygosity ↑ → risiko AR tertentu ↑.
- Genetic counseling = phenotype + pedigree + inheritance + risk + testing + patient values.
- Screening ≠ diagnostic testing.
- PPV dipengaruhi prevalence/pre-test probability.
- VUS bukan hasil diagnostik definitif.
- Negative test dapat menyisakan residual risk.
- Counseling harus informed, confidential, autonomy-respecting, dan nondirective.

## Flashcard {kartu}

- [Bayesian Thinking dalam Genetika] Kerangka dasar :: Posterior risk ∝ Prior risk × Evidence dari hasil tes/family history.
- [Clinical Pattern Recognition] Kasus 1 :: Penyakit AR 1/10.000 di populasi.
- [Clinical Pattern Recognition] Kasus 2 :: Dua orang carrier confirmed untuk penyakit AR yang sama.
- [Clinical Pattern Recognition] Kasus 3 :: Pasien sehat memiliki pathogenic familial variant untuk penyakit AD dengan age-dependent penetrance.
- [Clinical Pattern Recognition] Kasus 4 :: Screening prenatal positif.
- [Clinical Pattern Recognition] Kasus 5 :: Panel genetik menemukan VUS yang sesuai gene kandidat.
- [High-yield] Hardy–Weinberg :: model populasi, bukan hukum bahwa semua populasi selalu equilibrium
- [High-yield] Heritability :: parameter populasi, bukan persentase penyebab penyakit pada individu
- [High-yield] HWE :: p + q = 1; p² + 2pq + q² = 1
- [High-yield] X-linked recessive :: affected male ≈ q
- [High-yield] Drift :: perubahan acak; founder effect dan bottleneck adalah bentuk drift
- [High-yield] Genetic counseling :: phenotype + pedigree + inheritance + risk + testing + patient values
- [Hardy–Weinberg Equilibrium] Asumsi ideal HWE … :: • Population size sangat besar → genetic drift minimal
  • Random mating
  • Tidak ada migration/gene flow bermakna
  • Tidak ada mutation bermakna
  • Tidak ada natural selection yang membedakan fitness genotype
- [X-Linked dan Population Frequency] Untuk alel recessive X-linked dengan frekuensi q … :: • Laki-laki hanya punya satu kromosom X → frekuensi laki-laki affected kira-kira q
  • Perempuan affected ≈ q²
  • Perempuan heterozygous carrier ≈ 2pq
- [Nonrandom Mating, Consanguinity, dan Inbreeding] Inbreeding coefficient (F) … :: • Menggambarkan probabilitas dua alel pada suatu locus identik karena berasal dari ancestor yang sama (identical by descent)
  • Semakin dekat hubungan biologis orang tua, semakin tinggi F keturunannya
- [Genetic Counseling — Tujuan Utama] Genetic counseling bertujuan membantu individu/keluarga … :: • memahami diagnosis atau kemungkinan diagnosis genetik,
  • memahami pola inheritance,
  • memperkirakan recurrence risk,
  • memahami pilihan testing,
  • memahami potensi hasil dan keterbatasan tes,
  • membuat keputusan yang sesuai nilai dan preferensi mereka,
  • mempersiapkan dampak medis, reproduktif, dan psikososial
- [Pedigree dalam Konseling Genetik] Informasi penting pada pedigree … :: • sex,
  • affected/unaffected,
  • usia sekarang atau usia meninggal,
  • diagnosis spesifik,
  • age at diagnosis,
  • hasil tes genetik bila ada,
  • pregnancy loss,
  • consanguinity,
  • ancestry yang relevan terhadap diagnosis tertentu
- [Variant Classification dan Konseling] Hasil molecular genetic test sering diklasifikasikan sebagai … :: • pathogenic,
  • likely pathogenic,
  • variant of uncertain significance (VUS),
  • likely benign,
  • benign
- [Pre-Test Counseling] Hal yang perlu dipahami sebelum tes … :: • apa tujuan tes,
  • kondisi apa yang dapat dan tidak dapat dideteksi,
  • kemungkinan hasil,
  • kemungkinan VUS,
  • keterbatasan analytic/clinical sensitivity,
  • kemungkinan incidental/secondary findings tergantung jenis tes,
  • implikasi untuk anggota keluarga,
  • konsekuensi psikologis dan reproduktif,
  • confidentiality dan consent
- [Big Picture: dari Individu ke Populasi] Penting: Big Picture: dari Individu ke Populasi :: Population frequency ≠ individual risk secara otomatis. Family history dapat menaikkan atau menurunkan prior probability seseorang dibanding angka populasi umum. Genetic test tidak berdiri sendiri: hasil harus dibaca bersama phenotype, pedigree, dan jenis tes yang digunakan.
- [Istilah Dasar Population Genetics] High-yield: Istilah Dasar Population Genetics :: Frekuensi alel dan frekuensi genotype adalah konsep berbeda. Jangan menyamakan q dengan q².
- [Founder Effect dan Population Bottleneck] Penting: Founder Effect dan Population Bottleneck :: Founder effect dan bottleneck adalah bentuk genetic drift. Keduanya tidak membutuhkan keuntungan biologis alel tertentu.
- [Nonrandom Mating, Consanguinity, dan Inbreeding] Jebakan soal: Nonrandom Mating, Consanguinity, dan Inbreeding :: Consanguinity tidak membuat alel recessive baru; ia meningkatkan kemungkinan dua copy alel recessive yang sudah ada bertemu pada anak.
- [Linkage Disequilibrium] Penting: Linkage Disequilibrium :: Association ≠ causation. SNP yang berasosiasi dengan penyakit belum tentu merupakan variant kausal.
- [Recurrence Risk: Empiric vs Mendelian] Penting: Recurrence Risk: Empiric vs Mendelian :: Setiap pregnancy merupakan event independen. Jika pasangan carrier AR sudah punya satu anak affected, risiko anak berikutnya tetap 25%, bukan “sudah terpakai”.
- [Bayesian Thinking dalam Genetika] Jebakan soal: Bayesian Thinking dalam Genetika :: “Negative test” tidak selalu berarti “bukan carrier”.
- [Sensitivity, Specificity, PPV, NPV dalam Genetic Screening] Penting: Sensitivity, Specificity, PPV, NPV dalam Genetic Screening :: PPV dan NPV dipengaruhi prevalence/pre-test probability. Pada kondisi sangat jarang, false positive dapat tetap menjadi masalah meski specificity tinggi. Family history kuat menaikkan pre-test probability dan dapat mengubah interpretasi hasil.
- [Variant Classification dan Konseling] Jebakan soal: Variant Classification dan Konseling :: VUS ≠ diagnosis molekuler definitif.
- [Cascade Testing] Penting: Cascade Testing :: Targeted familial variant testing biasanya berbeda dari mengulang seluruh panel pada setiap anggota keluarga.
