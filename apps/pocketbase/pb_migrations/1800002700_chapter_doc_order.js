/// <reference path="../pb_data/types.d.ts" />

// Urutan BAB mengikuti Google Doc "Rekap Bab per Mata Kuliah (Topik 1-3)" (docs/MATA_KULIAH.md),
// bukan A-Z: BAB 1 Anatomi = Anatomi Umum & Terminologi Anatomis, dan seterusnya.
// Hanya kolom `order` BAB yang diubah (ID, isi, soal, dan status tampil tidak tersentuh).
// BAB tambahan buatan admin yang tidak ada di dokumen ditaruh setelah BAB dokumen, urutan relatifnya tetap.
migrate((app) => {
  const catalog = [
  {
    "name": "Anatomi",
    "chapters": [
      "Anatomi Umum & Terminologi Anatomis",
      "Osteologi & Artrologi (Sistem Rangka & Sendi)",
      "Miologi (Sistem Otot)",
      "Anatomi Kepala & Leher",
      "Anatomi Cranium & Isi Rongga Tengkorak",
      "Anatomi Toraks (Dinding Toraks, Mediastinum)",
      "Anatomi Jantung & Pembuluh Darah Besar",
      "Anatomi Paru & Saluran Napas",
      "Anatomi Abdomen (Dinding, Rongga Peritoneum)",
      "Anatomi Sistem Digestif (Gaster–Kolon, Hepar, Pankreas, Lien)",
      "Anatomi Pelvis & Perineum",
      "Anatomi Sistem Urogenital",
      "Anatomi Ekstremitas Atas",
      "Anatomi Ekstremitas Bawah",
      "Neuroanatomi: Otak & Batang Otak",
      "Neuroanatomi: Medula Spinalis & Saraf Perifer",
      "Anatomi Sistem Saraf Otonom",
      "Anatomi Panca Indra (Mata, Telinga, Hidung)",
      "Anatomi Sistem Limfatik",
      "Anatomi Perkembangan (Embriologi Dasar)"
    ]
  },
  {
    "name": "Histologi",
    "chapters": [
      "Jaringan Dasar: Epitel",
      "Jaringan Dasar: Ikat, Tulang Rawan, Tulang",
      "Jaringan Dasar: Otot",
      "Jaringan Dasar: Saraf",
      "Histologi Sistem Kardiovaskular",
      "Histologi Sistem Respirasi",
      "Histologi Sistem Digestif & Kelenjar Aksesoris",
      "Histologi Sistem Urinarius",
      "Histologi Sistem Reproduksi Pria & Wanita",
      "Histologi Sistem Endokrin",
      "Histologi Kulit & Adneksa",
      "Histologi Organ Limfoid & Imun"
    ]
  },
  {
    "name": "Embriologi",
    "chapters": [
      "Gametogenesis & Fertilisasi",
      "Pembentukan Blastula & Gastrulasi",
      "Perkembangan Sistem Saraf (Neurulasi)",
      "Perkembangan Jantung & Sistem Kardiovaskular",
      "Perkembangan Wajah & Palatum",
      "Perkembangan Sistem Digestif",
      "Perkembangan Sistem Urogenital",
      "Kelainan Kongenital Umum (Spina Bifida, dll)"
    ]
  },
  {
    "name": "Fisiologi",
    "chapters": [
      "Fisiologi Sel & Membran, Transport Membran",
      "Fisiologi Cairan Tubuh & Elektrolit",
      "Fisiologi Saraf: Potensial Aksi & Sinaps",
      "Fisiologi Otot Rangka, Jantung, Polos",
      "Fisiologi Sistem Saraf Otonom",
      "Fisiologi Kardiovaskular: Siklus Jantung, Curah Jantung",
      "Fisiologi Tekanan Darah & Regulasinya",
      "Fisiologi Respirasi: Ventilasi, Difusi, Transport Gas",
      "Fisiologi Ginjal: Filtrasi, Reabsorpsi, Sekresi",
      "Fisiologi Keseimbangan Asam-Basa",
      "Fisiologi Gastrointestinal: Motilitas, Sekresi, Absorpsi",
      "Fisiologi Endokrin: Hipotalamus-Hipofisis",
      "Fisiologi Tiroid, Paratiroid, Adrenal",
      "Fisiologi Pankreas Endokrin & Regulasi Glukosa",
      "Fisiologi Reproduksi Pria",
      "Fisiologi Reproduksi Wanita & Siklus Menstruasi",
      "Fisiologi Kehamilan & Laktasi",
      "Fisiologi Darah & Hemostasis",
      "Fisiologi Sistem Imun",
      "Fisiologi Sensorik (Penglihatan, Pendengaran, Nyeri)"
    ]
  },
  {
    "name": "Biokimia & Biologi Molekuler",
    "chapters": [
      "Struktur & Fungsi Karbohidrat",
      "Struktur & Fungsi Lipid",
      "Struktur & Fungsi Protein & Asam Amino",
      "Enzim: Kinetika & Regulasi",
      "Bioenergetika & Rantai Transport Elektron",
      "Glikolisis & Glukoneogenesis",
      "Siklus Asam Sitrat (Krebs)",
      "Metabolisme Glikogen",
      "Metabolisme Lipid: Beta-Oksidasi, Sintesis Asam Lemak",
      "Metabolisme Kolesterol & Lipoprotein",
      "Metabolisme Asam Amino & Siklus Urea",
      "Metabolisme Asam Nukleat (Purin, Pirimidin)",
      "Replikasi, Transkripsi, Translasi DNA/RNA",
      "Regulasi Ekspresi Gen",
      "Vitamin Larut Lemak & Larut Air",
      "Mineral & Trace Elements",
      "Biokimia Integrasi Metabolisme (Puasa vs Kenyang)",
      "Biokimia Klinik Dasar (Interpretasi Lab Sederhana)"
    ]
  },
  {
    "name": "Genetika Kedokteran",
    "chapters": [
      "Prinsip Hereditas Mendel",
      "Kelainan Kromosom (Down Syndrome, Turner, Klinefelter)",
      "Penyakit Genetik Autosomal (Dominan & Resesif)",
      "Penyakit Terkait Kromosom X",
      "Genetika Populasi & Konseling Genetik",
      "Dasar Genetika Kanker"
    ]
  },
  {
    "name": "Mikrobiologi",
    "chapters": [
      "Bakteriologi Umum: Struktur & Klasifikasi Bakteri",
      "Bakteri Gram Positif Patogen (Staphylococcus, Streptococcus)",
      "Bakteri Gram Negatif Patogen (E. coli, Salmonella, Shigella)",
      "Mycobacterium & Tuberkulosis",
      "Bakteri Anaerob & Spirochaeta",
      "Virologi Umum: Struktur & Replikasi Virus",
      "Virus Hepatitis (A, B, C, D, E)",
      "HIV & Retrovirus",
      "Virus Respirasi (Influenza, Corona, RSV)",
      "Virus Eksantematous (Campak, Rubella, Varicella)",
      "Mikologi: Jamur Superfisial & Sistemik",
      "Uji Sensitivitas Antibiotik & Resistensi"
    ]
  },
  {
    "name": "Parasitologi",
    "chapters": [
      "Protozoa Usus (Entamoeba, Giardia)",
      "Protozoa Darah & Jaringan (Plasmodium/Malaria, Toxoplasma)",
      "Trypanosoma & Leishmania",
      "Nematoda Usus (Ascaris, Trichuris, Cacing Tambang)",
      "Nematoda Jaringan (Filaria)",
      "Cestoda (Taenia, Echinococcus)",
      "Trematoda (Schistosoma, Fasciola)",
      "Entomologi Kedokteran (Vektor Penyakit)"
    ]
  },
  {
    "name": "Patologi Anatomi",
    "chapters": [
      "Jejas Sel & Adaptasi Sel",
      "Radang Akut & Kronik",
      "Penyembuhan Luka & Regenerasi",
      "Gangguan Hemodinamik (Trombosis, Emboli, Infark)",
      "Neoplasia: Prinsip Umum & Klasifikasi",
      "Patologi Sistem Kardiovaskular",
      "Patologi Sistem Respirasi",
      "Patologi Sistem Digestif & Hepar",
      "Patologi Sistem Urogenital",
      "Patologi Sistem Endokrin",
      "Patologi Payudara & Ginekologi",
      "Patologi Muskuloskeletal",
      "Patologi Sistem Saraf Pusat"
    ]
  },
  {
    "name": "Patologi Klinik",
    "chapters": [
      "Interpretasi Darah Lengkap (Hematologi Dasar)",
      "Interpretasi Fungsi Hati",
      "Interpretasi Fungsi Ginjal",
      "Interpretasi Profil Lipid & Gula Darah",
      "Interpretasi Analisis Urin",
      "Interpretasi Analisis Gas Darah",
      "Interpretasi Kultur & Sensitivitas Mikrobiologi",
      "Dasar Imunoserologi Klinik"
    ]
  },
  {
    "name": "Farmakologi",
    "chapters": [
      "Farmakokinetik: Absorpsi, Distribusi, Metabolisme, Ekskresi",
      "Farmakodinamik: Mekanisme Kerja Obat & Reseptor",
      "Obat Sistem Saraf Otonom (Kolinergik, Adrenergik)",
      "Obat Susunan Saraf Pusat (Anestesi, Analgesik Opioid)",
      "Obat Kardiovaskular: Antihipertensi",
      "Obat Kardiovaskular: Antiaritmia, Antiangina, Diuretik",
      "Obat Antiinflamasi Nonsteroid (NSAID) & Analgesik",
      "Obat Antibiotik: Beta-Laktam, Makrolid, Aminoglikosida",
      "Obat Antivirus, Antifungi, Antiparasit",
      "Obat Sistem Endokrin (Insulin, OAD, Hormon Tiroid)",
      "Obat Sistem Respirasi (Bronkodilator, Antihistamin)",
      "Obat Sistem Gastrointestinal (Antasida, PPI)",
      "Farmakologi Psikiatri (Antipsikotik, Antidepresan, Ansiolitik)",
      "Toksikologi Dasar & Keracunan Obat"
    ]
  },
  {
    "name": "Sistem Saraf",
    "chapters": [
      "Nyeri Kepala Primer (Tension Type, Migren, Cluster)",
      "Nyeri Kepala Sekunder & Red Flags",
      "Vertigo Perifer & Sentral",
      "Stroke Iskemik",
      "Stroke Hemoragik & Perdarahan Intrakranial",
      "Epilepsi & Kejang (termasuk Kejang Demam)",
      "Infeksi SSP: Meningitis",
      "Infeksi SSP: Ensefalitis",
      "Tetanus & Infeksi Neuromuskular",
      "Trauma Kepala & Cedera Medula Spinalis",
      "Gangguan Gerak: Parkinson & Tremor",
      "Penyakit Demielinisasi (Multiple Sclerosis, Guillain-Barré)",
      "Neuropati Perifer",
      "Tumor Sistem Saraf Pusat",
      "Penurunan Kesadaran & Koma",
      "Kelainan Kongenital Saraf (Spina Bifida, Hidrosefalus)"
    ]
  },
  {
    "name": "Psikiatri & Kesehatan Jiwa",
    "chapters": [
      "Delirium & Gangguan Kognitif",
      "Gangguan Penggunaan Zat Psikoaktif (NAPZA, Alkohol)",
      "Skizofrenia & Gangguan Psikotik Lain",
      "Gangguan Waham",
      "Gangguan Mood: Depresi",
      "Gangguan Mood: Bipolar",
      "Gangguan Cemas: Fobia, Panik, GAD",
      "Gangguan Obsesif-Kompulsif",
      "Gangguan Somatoform & Psikosomatik",
      "Gangguan Kepribadian",
      "Gangguan Makan (Anoreksia, Bulimia)",
      "Gangguan Tidur (Insomnia, Parasomnia)",
      "Gangguan Perkembangan Anak (ADHD, Autisme)",
      "Kedaruratan Psikiatri (Risiko Bunuh Diri, Agitasi)"
    ]
  },
  {
    "name": "Sistem Indra: Mata",
    "chapters": [
      "Kelainan Refraksi (Miopia, Hipermetropia, Astigmatisma)",
      "Konjungtivitis & Infeksi Permukaan Mata",
      "Blefaritis & Hordeolum/Kalazion",
      "Keratitis & Ulkus Kornea",
      "Katarak",
      "Glaukoma Akut & Kronik",
      "Retinopati (Diabetik, Hipertensi)",
      "Pterigium & Kelainan Konjungtiva Lain",
      "Trauma Mata",
      "Kelainan Segmen Anterior & Posterior Lain"
    ]
  },
  {
    "name": "Sistem Indra: THT",
    "chapters": [
      "Otitis Eksterna",
      "Otitis Media Akut & Kronik",
      "Mastoiditis",
      "Gangguan Pendengaran & Tuli",
      "Vertigo Perifer (Terkait Telinga Dalam)",
      "Rhinitis Alergi & Non-Alergi",
      "Sinusitis",
      "Epistaksis",
      "Polip Nasi",
      "Faringitis & Tonsilitis",
      "Laringitis",
      "Corpus Alienum THT",
      "Tumor Kepala-Leher Dasar"
    ]
  },
  {
    "name": "Sistem Respirasi",
    "chapters": [
      "Infeksi Saluran Napas Atas (ISPA, Faringitis, Laringitis)",
      "Influenza & Infeksi Virus Respirasi",
      "Pertusis",
      "Pneumonia (Komunitas & Nosokomial)",
      "Tuberkulosis Paru",
      "Bronkitis Akut & Kronik",
      "Asma Bronkial",
      "PPOK (Penyakit Paru Obstruktif Kronik)",
      "Efusi Pleura",
      "Pneumotoraks",
      "ARDS (Acute Respiratory Distress Syndrome)",
      "Emfisema",
      "Edema Paru",
      "Tumor Paru Dasar",
      "Kegawatdaruratan Respirasi (Gagal Napas)"
    ]
  },
  {
    "name": "Sistem Kardiovaskular",
    "chapters": [
      "Hipertensi (Primer & Sekunder)",
      "Penyakit Jantung Koroner: Angina Pektoris",
      "Sindrom Koroner Akut (STEMI, NSTEMI)",
      "Gagal Jantung Akut & Kronik",
      "Aritmia: Fibrilasi Atrial",
      "Aritmia: Takikardi & Bradikardi Lain",
      "Penyakit Jantung Reumatik",
      "Penyakit Jantung Katup",
      "Endokarditis, Miokarditis, Perikarditis",
      "Penyakit Jantung Kongenital (Dasar)",
      "Syok (Hipovolemik, Kardiogenik, Septik, Anafilaktik)",
      "Trombosis Vena Dalam",
      "Varises Vena",
      "Penyakit Arteri Perifer"
    ]
  },
  {
    "name": "Sistem Gastrointestinal, Hepatobilier, Pankreas",
    "chapters": [
      "Kelainan Rongga Mulut (Stomatitis, Kandidiasis Oral)",
      "Kelainan Kelenjar Liur (Parotitis)",
      "Akalasia & Gangguan Motilitas Esofagus",
      "GERD (Gastroesophageal Reflux Disease)",
      "Varises Esofagus",
      "Gastritis",
      "Ulkus Peptikum",
      "Gastroenteritis & Diare Akut",
      "Diare Kronik & Malabsorpsi",
      "Demam Tifoid",
      "Apendisitis",
      "Infestasi Cacing (Askariasis, Taeniasis, Cacing Tambang)",
      "Hepatitis Virus (A, B, C)",
      "Sirosis Hepatis",
      "Gagal Hati Akut & Kronik",
      "Kolelitiasis & Kolesistitis",
      "Pankreatitis Akut & Kronik",
      "Divertikulitis",
      "Kolitis (Ulseratif, Infeksius)",
      "Hemoroid & Fistula Ani",
      "Tumor/Karsinoma Saluran Cerna Dasar"
    ]
  },
  {
    "name": "Sistem Ginjal & Saluran Kemih",
    "chapters": [
      "Infeksi Saluran Kemih (Sistitis, Pielonefritis)",
      "Glomerulonefritis Akut & Kronik",
      "Sindrom Nefrotik",
      "Penyakit Ginjal Kronik & Gagal Ginjal",
      "Batu Saluran Kemih (Urolitiasis)",
      "Hipospadia & Epispadia",
      "Kriptorkidismus",
      "Varikokel & Hidrokel",
      "Fimosis & Parafimosis",
      "Prostatitis",
      "Hiperplasia Prostat Jinak (BPH)",
      "Karsinoma Prostat Dasar",
      "Kegawatan Uro-genital (Retensio Urin, Trauma Genitourinaria)"
    ]
  },
  {
    "name": "Kehamilan & Persalinan",
    "chapters": [
      "Fisiologi & Diagnosis Kehamilan",
      "Antenatal Care & Skrining Kehamilan",
      "Hiperemesis Gravidarum",
      "Anemia dalam Kehamilan",
      "Preeklampsia & Eklampsia",
      "Diabetes Melitus Gestasional",
      "Plasenta Previa",
      "Solusio Plasenta (Abrupsio Plasenta)",
      "Ketuban Pecah Dini",
      "Persalinan Normal (Mekanisme & Kala Persalinan)",
      "Distosia & Persalinan Patologis",
      "Perdarahan Postpartum",
      "Ruptur Uteri",
      "Infeksi Nifas (Endometritis)",
      "Kehamilan Ektopik"
    ]
  },
  {
    "name": "Ginekologi & Payudara",
    "chapters": [
      "Gangguan Siklus Menstruasi",
      "Infeksi Menular Seksual (Sifilis, Gonore, Herpes Genital)",
      "Vulvitis, Vaginitis, Servisitis",
      "Penyakit Radang Panggul (PID)",
      "Mioma Uteri",
      "Endometriosis",
      "Sindrom Ovarium Polikistik (PCOS)",
      "Kista & Tumor Ovarium",
      "Karsinoma Serviks",
      "Kontrasepsi & Keluarga Berencana",
      "Infertilitas",
      "Mastitis",
      "Fibroadenoma Mammae",
      "Karsinoma Payudara Dasar"
    ]
  },
  {
    "name": "Sistem Endokrin, Metabolik & Nutrisi",
    "chapters": [
      "Diabetes Melitus Tipe 1",
      "Diabetes Melitus Tipe 2",
      "Komplikasi Akut Diabetes (Hipoglikemia, KAD, HHS)",
      "Komplikasi Kronik Diabetes",
      "Hipertiroid & Krisis Tiroid",
      "Hipotiroid",
      "Tiroiditis & Goiter",
      "Penyakit Cushing & Hiperkortisolisme",
      "Penyakit Addison & Insufisiensi Adrenal",
      "Gangguan Kelenjar Paratiroid & Kalsium",
      "Obesitas & Sindrom Metabolik",
      "Dislipidemia",
      "Hiperurisemia & Gout",
      "Malnutrisi Energi-Protein",
      "Defisiensi Vitamin & Mineral"
    ]
  },
  {
    "name": "Sistem Hematologi & Imunologi",
    "chapters": [
      "Anemia Defisiensi Besi",
      "Anemia Hemolitik",
      "Anemia Megaloblastik",
      "Anemia Aplastik & Anemia pada Penyakit Kronik",
      "Gangguan Pembekuan Darah (Hemofilia, ITP)",
      "Leukemia",
      "Limfoma",
      "Demam Berdarah Dengue",
      "Malaria",
      "Leptospirosis",
      "Sepsis",
      "Lupus Eritematosus Sistemik",
      "Artritis Reumatoid",
      "Reaksi Alergi & Anafilaksis",
      "Imunodefisiensi (termasuk HIV/AIDS)"
    ]
  },
  {
    "name": "Sistem Muskuloskeletal",
    "chapters": [
      "Osteoartritis",
      "Artritis Reumatoid (Perspektif Ortopedi)",
      "Fraktur: Klasifikasi & Prinsip Tatalaksana",
      "Fraktur Ekstremitas Atas",
      "Fraktur Ekstremitas Bawah",
      "Dislokasi Sendi",
      "Osteoporosis",
      "Skoliosis & Kifosis",
      "Tenosinovitis & Cedera Jaringan Lunak",
      "Osteomielitis",
      "Tumor Tulang Primer & Sekunder",
      "Low Back Pain & Hernia Nukleus Pulposus"
    ]
  },
  {
    "name": "Sistem Integumen (Kulit & Kelamin)",
    "chapters": [
      "Infeksi Bakteri Kulit (Impetigo, Selulitis, Erisipelas)",
      "Infeksi Jamur Kulit (Tinea, Kandidiasis Kutan)",
      "Infeksi Virus Kulit (Herpes, Varicella, Veruka)",
      "Skabies & Infestasi Kulit",
      "Dermatitis Atopik & Kontak",
      "Psoriasis",
      "Urtikaria",
      "Akne Vulgaris",
      "Kelainan Pigmentasi (Vitiligo, Melasma)",
      "Tumor Kulit Jinak & Ganas Dasar",
      "Luka Bakar",
      "Penyakit Menular Seksual dengan Manifestasi Kulit"
    ]
  },
  {
    "name": "Multisistem & Kegawatdaruratan",
    "chapters": [
      "Syok (Semua Jenis) & Resusitasi",
      "Sepsis & Systemic Inflammatory Response Syndrome",
      "Keracunan & Overdosis Obat",
      "Gigitan/Sengatan Hewan Berbisa",
      "Tenggelam & Asfiksia",
      "Trauma Multipel (Politrauma)",
      "Kegawatdaruratan pada Anak",
      "Kegawatdaruratan pada Kehamilan",
      "Resusitasi Jantung Paru (BHD/BHL)",
      "Gangguan Elektrolit & Asam-Basa Berat"
    ]
  },
  {
    "name": "Ilmu Penyakit Dalam (IPD)",
    "chapters": [
      "Pendekatan Klinis Pasien Dewasa Multi-Komorbid",
      "Geriatri: Sindrom Geriatri & Polifarmasi",
      "Penyakit Tropis & Infeksi pada Dewasa",
      "Perawatan Paliatif Dasar"
    ]
  },
  {
    "name": "Ilmu Kesehatan Anak (IKA)",
    "chapters": [
      "Tumbuh Kembang Anak & Skrining",
      "Nutrisi & ASI Eksklusif",
      "Imunisasi Dasar & Lanjutan",
      "Neonatologi: Asfiksia, BBLR, Ikterus Neonatorum",
      "Infeksi pada Anak (Diare, ISPA, Demam Tifoid Anak)",
      "Kejang Demam & Epilepsi Anak",
      "Penyakit Jantung Bawaan",
      "Malnutrisi & Stunting",
      "Kegawatdaruratan Pediatri",
      "Penyakit Genetik & Kongenital pada Anak"
    ]
  },
  {
    "name": "Ilmu Bedah",
    "chapters": [
      "Prinsip Dasar Bedah & Perioperatif",
      "Luka & Penyembuhan Luka",
      "Infeksi Bedah (Abses, Selulitis Berat)",
      "Bedah Digestif (Apendisitis, Hernia, Ileus)",
      "Bedah Onkologi Dasar",
      "Bedah Trauma & Kegawatdaruratan Bedah",
      "Bedah Urologi",
      "Bedah Anak Dasar",
      "Bedah Saraf Dasar",
      "Bedah Plastik & Luka Bakar Dasar",
      "Anestesi & Manajemen Nyeri Perioperatif"
    ]
  },
  {
    "name": "Ilmu Bedah Ortopedi",
    "chapters": [
      "Prinsip Reduksi & Fiksasi Fraktur",
      "Cedera Olahraga",
      "Kelainan Kongenital Ortopedi"
    ]
  },
  {
    "name": "Radiologi Dasar",
    "chapters": [
      "Prinsip Dasar Pencitraan (X-Ray, USG, CT, MRI)",
      "Interpretasi Foto Toraks",
      "Interpretasi Foto Abdomen",
      "Interpretasi Foto Tulang/Fraktur",
      "USG Dasar (Abdomen, Obstetri)"
    ]
  },
  {
    "name": "Anestesiologi Dasar",
    "chapters": [
      "Prinsip Anestesi Umum & Lokal",
      "Manajemen Jalan Napas",
      "Manajemen Nyeri"
    ]
  }
  ];
  const norm = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  const subjects = app.findRecordsByFilter("subjects", "", "", 0, 0);
  catalog.forEach((s) => {
    const subject = subjects.find((r) => norm(r.getString("name")) === norm(s.name));
    if (!subject) return;
    const titles = s.chapters.map(norm);
    const rows = app.findRecordsByFilter("chapters", "subject = {:s} && drilling = false", "order,created", 0, 0, { s: subject.id });
    const rank = (r) => titles.indexOf(norm(r.getString("title")));
    const known = rows.filter((r) => rank(r) >= 0).sort((a, b) => rank(a) - rank(b));
    const extra = rows.filter((r) => rank(r) < 0);
    known.concat(extra).forEach((r, i) => {
      if (r.getInt("order") === i + 1) return;
      r.set("order", i + 1);
      app.save(r);
    });
  });
}, () => {
  // Urutan lama tidak disimpan; mengurutkan ulang BAB tidak menghapus apa pun.
});
