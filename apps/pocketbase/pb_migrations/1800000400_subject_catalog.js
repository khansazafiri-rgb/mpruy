/// <reference path="../pb_data/types.d.ts" />

// Source: Rekap Bab per Mata Kuliah (Topik 1-3), Google Doc linked in docs/MATA_KULIAH.md.
// The detailed headings contain 32 subjects and 384 chapters. No topic groups are added.
// Preserve existing subject IDs, user selections, uploads, hidden state and question links.
migrate((app) => {
  const catalog = [
  {
    "name": "Anatomi",
    "slug": "anatomi",
    "illustrationKey": "anatomi",
    "aliases": [],
    "description": "",
    "chapters": [
      "Anatomi Abdomen (Dinding, Rongga Peritoneum)",
      "Anatomi Cranium & Isi Rongga Tengkorak",
      "Anatomi Ekstremitas Atas",
      "Anatomi Ekstremitas Bawah",
      "Anatomi Jantung & Pembuluh Darah Besar",
      "Anatomi Kepala & Leher",
      "Anatomi Panca Indra (Mata, Telinga, Hidung)",
      "Anatomi Paru & Saluran Napas",
      "Anatomi Pelvis & Perineum",
      "Anatomi Perkembangan (Embriologi Dasar)",
      "Anatomi Sistem Digestif (Gaster–Kolon, Hepar, Pankreas, Lien)",
      "Anatomi Sistem Limfatik",
      "Anatomi Sistem Saraf Otonom",
      "Anatomi Sistem Urogenital",
      "Anatomi Toraks (Dinding Toraks, Mediastinum)",
      "Anatomi Umum & Terminologi Anatomis",
      "Miologi (Sistem Otot)",
      "Neuroanatomi: Medula Spinalis & Saraf Perifer",
      "Neuroanatomi: Otak & Batang Otak",
      "Osteologi & Artrologi (Sistem Rangka & Sendi)"
    ]
  },
  {
    "name": "Anestesiologi Dasar",
    "slug": "anestesiologi-dasar",
    "illustrationKey": "anestesiologi-dasar",
    "aliases": [],
    "description": "Anestesi, jalan napas, dan manajemen nyeri.",
    "chapters": [
      "Manajemen Jalan Napas",
      "Manajemen Nyeri",
      "Prinsip Anestesi Umum & Lokal"
    ]
  },
  {
    "name": "Biokimia & Biologi Molekuler",
    "slug": "biokimia",
    "illustrationKey": "biokimia",
    "aliases": [],
    "description": "",
    "chapters": [
      "Bioenergetika & Rantai Transport Elektron",
      "Biokimia Integrasi Metabolisme (Puasa vs Kenyang)",
      "Biokimia Klinik Dasar (Interpretasi Lab Sederhana)",
      "Enzim: Kinetika & Regulasi",
      "Glikolisis & Glukoneogenesis",
      "Metabolisme Asam Amino & Siklus Urea",
      "Metabolisme Asam Nukleat (Purin, Pirimidin)",
      "Metabolisme Glikogen",
      "Metabolisme Kolesterol & Lipoprotein",
      "Metabolisme Lipid: Beta-Oksidasi, Sintesis Asam Lemak",
      "Mineral & Trace Elements",
      "Regulasi Ekspresi Gen",
      "Replikasi, Transkripsi, Translasi DNA/RNA",
      "Siklus Asam Sitrat (Krebs)",
      "Struktur & Fungsi Karbohidrat",
      "Struktur & Fungsi Lipid",
      "Struktur & Fungsi Protein & Asam Amino",
      "Vitamin Larut Lemak & Larut Air"
    ]
  },
  {
    "name": "Embriologi",
    "slug": "embriologi",
    "illustrationKey": "embriologi",
    "aliases": [],
    "description": "Perkembangan manusia sejak fertilisasi dan pembentukan organ.",
    "chapters": [
      "Gametogenesis & Fertilisasi",
      "Kelainan Kongenital Umum (Spina Bifida, dll)",
      "Pembentukan Blastula & Gastrulasi",
      "Perkembangan Jantung & Sistem Kardiovaskular",
      "Perkembangan Sistem Digestif",
      "Perkembangan Sistem Saraf (Neurulasi)",
      "Perkembangan Sistem Urogenital",
      "Perkembangan Wajah & Palatum"
    ]
  },
  {
    "name": "Farmakologi",
    "slug": "farmakologi",
    "illustrationKey": "farmakologi",
    "aliases": [],
    "description": "",
    "chapters": [
      "Farmakodinamik: Mekanisme Kerja Obat & Reseptor",
      "Farmakokinetik: Absorpsi, Distribusi, Metabolisme, Ekskresi",
      "Farmakologi Psikiatri (Antipsikotik, Antidepresan, Ansiolitik)",
      "Obat Antibiotik: Beta-Laktam, Makrolid, Aminoglikosida",
      "Obat Antiinflamasi Nonsteroid (NSAID) & Analgesik",
      "Obat Antivirus, Antifungi, Antiparasit",
      "Obat Kardiovaskular: Antiaritmia, Antiangina, Diuretik",
      "Obat Kardiovaskular: Antihipertensi",
      "Obat Sistem Endokrin (Insulin, OAD, Hormon Tiroid)",
      "Obat Sistem Gastrointestinal (Antasida, PPI)",
      "Obat Sistem Respirasi (Bronkodilator, Antihistamin)",
      "Obat Sistem Saraf Otonom (Kolinergik, Adrenergik)",
      "Obat Susunan Saraf Pusat (Anestesi, Analgesik Opioid)",
      "Toksikologi Dasar & Keracunan Obat"
    ]
  },
  {
    "name": "Fisiologi",
    "slug": "fisiologi",
    "illustrationKey": "fisiologi",
    "aliases": [],
    "description": "",
    "chapters": [
      "Fisiologi Cairan Tubuh & Elektrolit",
      "Fisiologi Darah & Hemostasis",
      "Fisiologi Endokrin: Hipotalamus-Hipofisis",
      "Fisiologi Gastrointestinal: Motilitas, Sekresi, Absorpsi",
      "Fisiologi Ginjal: Filtrasi, Reabsorpsi, Sekresi",
      "Fisiologi Kardiovaskular: Siklus Jantung, Curah Jantung",
      "Fisiologi Kehamilan & Laktasi",
      "Fisiologi Keseimbangan Asam-Basa",
      "Fisiologi Otot Rangka, Jantung, Polos",
      "Fisiologi Pankreas Endokrin & Regulasi Glukosa",
      "Fisiologi Reproduksi Pria",
      "Fisiologi Reproduksi Wanita & Siklus Menstruasi",
      "Fisiologi Respirasi: Ventilasi, Difusi, Transport Gas",
      "Fisiologi Saraf: Potensial Aksi & Sinaps",
      "Fisiologi Sel & Membran, Transport Membran",
      "Fisiologi Sensorik (Penglihatan, Pendengaran, Nyeri)",
      "Fisiologi Sistem Imun",
      "Fisiologi Sistem Saraf Otonom",
      "Fisiologi Tekanan Darah & Regulasinya",
      "Fisiologi Tiroid, Paratiroid, Adrenal"
    ]
  },
  {
    "name": "Genetika Kedokteran",
    "slug": "genetika-kedokteran",
    "illustrationKey": "genetika",
    "aliases": [
      "genetika"
    ],
    "description": "Pewarisan sifat, kelainan genetik, dan konseling genetik.",
    "chapters": [
      "Dasar Genetika Kanker",
      "Genetika Populasi & Konseling Genetik",
      "Kelainan Kromosom (Down Syndrome, Turner, Klinefelter)",
      "Penyakit Genetik Autosomal (Dominan & Resesif)",
      "Penyakit Terkait Kromosom X",
      "Prinsip Hereditas Mendel"
    ]
  },
  {
    "name": "Ginekologi & Payudara",
    "slug": "ginekologi-payudara",
    "illustrationKey": "ginekologi-payudara",
    "aliases": [],
    "description": "Kesehatan reproduksi, ginekologi, dan payudara.",
    "chapters": [
      "Endometriosis",
      "Fibroadenoma Mammae",
      "Gangguan Siklus Menstruasi",
      "Infeksi Menular Seksual (Sifilis, Gonore, Herpes Genital)",
      "Infertilitas",
      "Karsinoma Payudara Dasar",
      "Karsinoma Serviks",
      "Kista & Tumor Ovarium",
      "Kontrasepsi & Keluarga Berencana",
      "Mastitis",
      "Mioma Uteri",
      "Penyakit Radang Panggul (PID)",
      "Sindrom Ovarium Polikistik (PCOS)",
      "Vulvitis, Vaginitis, Servisitis"
    ]
  },
  {
    "name": "Histologi",
    "slug": "histologi",
    "illustrationKey": "histologi",
    "aliases": [],
    "description": "",
    "chapters": [
      "Histologi Kulit & Adneksa",
      "Histologi Organ Limfoid & Imun",
      "Histologi Sistem Digestif & Kelenjar Aksesoris",
      "Histologi Sistem Endokrin",
      "Histologi Sistem Kardiovaskular",
      "Histologi Sistem Reproduksi Pria & Wanita",
      "Histologi Sistem Respirasi",
      "Histologi Sistem Urinarius",
      "Jaringan Dasar: Epitel",
      "Jaringan Dasar: Ikat, Tulang Rawan, Tulang",
      "Jaringan Dasar: Otot",
      "Jaringan Dasar: Saraf"
    ]
  },
  {
    "name": "Ilmu Bedah",
    "slug": "ilmu-bedah",
    "illustrationKey": "ilmu-bedah",
    "aliases": [],
    "description": "Prinsip bedah, perawatan luka, dan tindakan perioperatif.",
    "chapters": [
      "Anestesi & Manajemen Nyeri Perioperatif",
      "Bedah Anak Dasar",
      "Bedah Digestif (Apendisitis, Hernia, Ileus)",
      "Bedah Onkologi Dasar",
      "Bedah Plastik & Luka Bakar Dasar",
      "Bedah Saraf Dasar",
      "Bedah Trauma & Kegawatdaruratan Bedah",
      "Bedah Urologi",
      "Infeksi Bedah (Abses, Selulitis Berat)",
      "Luka & Penyembuhan Luka",
      "Prinsip Dasar Bedah & Perioperatif"
    ]
  },
  {
    "name": "Ilmu Bedah Ortopedi",
    "slug": "ilmu-bedah-ortopedi",
    "illustrationKey": "ilmu-bedah-ortopedi",
    "aliases": [],
    "description": "Penerapan muskuloskeletal: fraktur, cedera olahraga, dan kelainan ortopedi.",
    "chapters": [
      "Cedera Olahraga",
      "Kelainan Kongenital Ortopedi",
      "Prinsip Reduksi & Fiksasi Fraktur"
    ]
  },
  {
    "name": "Ilmu Kesehatan Anak (IKA)",
    "slug": "ilmu-kesehatan-anak",
    "illustrationKey": "ilmu-kesehatan-anak",
    "aliases": [],
    "description": "Tumbuh kembang, kesehatan, dan penyakit pada anak.",
    "chapters": [
      "Imunisasi Dasar & Lanjutan",
      "Infeksi pada Anak (Diare, ISPA, Demam Tifoid Anak)",
      "Kegawatdaruratan Pediatri",
      "Kejang Demam & Epilepsi Anak",
      "Malnutrisi & Stunting",
      "Neonatologi: Asfiksia, BBLR, Ikterus Neonatorum",
      "Nutrisi & ASI Eksklusif",
      "Penyakit Genetik & Kongenital pada Anak",
      "Penyakit Jantung Bawaan",
      "Tumbuh Kembang Anak & Skrining"
    ]
  },
  {
    "name": "Ilmu Penyakit Dalam (IPD)",
    "slug": "ilmu-penyakit-dalam",
    "illustrationKey": "ilmu-penyakit-dalam",
    "aliases": [],
    "description": "Integrasi lintas sistem dewasa, geriatri, dan perawatan paliatif.",
    "chapters": [
      "Geriatri: Sindrom Geriatri & Polifarmasi",
      "Pendekatan Klinis Pasien Dewasa Multi-Komorbid",
      "Penyakit Tropis & Infeksi pada Dewasa",
      "Perawatan Paliatif Dasar"
    ]
  },
  {
    "name": "Kehamilan & Persalinan",
    "slug": "kehamilan-persalinan",
    "illustrationKey": "kehamilan-persalinan",
    "aliases": [],
    "description": "Kehamilan, persalinan, dan masa nifas.",
    "chapters": [
      "Anemia dalam Kehamilan",
      "Antenatal Care & Skrining Kehamilan",
      "Diabetes Melitus Gestasional",
      "Distosia & Persalinan Patologis",
      "Fisiologi & Diagnosis Kehamilan",
      "Hiperemesis Gravidarum",
      "Infeksi Nifas (Endometritis)",
      "Kehamilan Ektopik",
      "Ketuban Pecah Dini",
      "Perdarahan Postpartum",
      "Persalinan Normal (Mekanisme & Kala Persalinan)",
      "Plasenta Previa",
      "Preeklampsia & Eklampsia",
      "Ruptur Uteri",
      "Solusio Plasenta (Abrupsio Plasenta)"
    ]
  },
  {
    "name": "Mikrobiologi",
    "slug": "mikrobiologi",
    "illustrationKey": "mikrobiologi",
    "aliases": [],
    "description": "",
    "chapters": [
      "Bakteri Anaerob & Spirochaeta",
      "Bakteri Gram Negatif Patogen (E. coli, Salmonella, Shigella)",
      "Bakteri Gram Positif Patogen (Staphylococcus, Streptococcus)",
      "Bakteriologi Umum: Struktur & Klasifikasi Bakteri",
      "HIV & Retrovirus",
      "Mikologi: Jamur Superfisial & Sistemik",
      "Mycobacterium & Tuberkulosis",
      "Uji Sensitivitas Antibiotik & Resistensi",
      "Virologi Umum: Struktur & Replikasi Virus",
      "Virus Eksantematous (Campak, Rubella, Varicella)",
      "Virus Hepatitis (A, B, C, D, E)",
      "Virus Respirasi (Influenza, Corona, RSV)"
    ]
  },
  {
    "name": "Multisistem & Kegawatdaruratan",
    "slug": "multisistem-kegawatdaruratan",
    "illustrationKey": "multisistem-kegawatdaruratan",
    "aliases": [],
    "description": "Pendekatan multisistem, resusitasi, dan kegawatdaruratan.",
    "chapters": [
      "Gangguan Elektrolit & Asam-Basa Berat",
      "Gigitan/Sengatan Hewan Berbisa",
      "Kegawatdaruratan pada Anak",
      "Kegawatdaruratan pada Kehamilan",
      "Keracunan & Overdosis Obat",
      "Resusitasi Jantung Paru (BHD/BHL)",
      "Sepsis & Systemic Inflammatory Response Syndrome",
      "Syok (Semua Jenis) & Resusitasi",
      "Tenggelam & Asfiksia",
      "Trauma Multipel (Politrauma)"
    ]
  },
  {
    "name": "Parasitologi",
    "slug": "parasitologi",
    "illustrationKey": "parasitologi",
    "aliases": [],
    "description": "",
    "chapters": [
      "Cestoda (Taenia, Echinococcus)",
      "Entomologi Kedokteran (Vektor Penyakit)",
      "Nematoda Jaringan (Filaria)",
      "Nematoda Usus (Ascaris, Trichuris, Cacing Tambang)",
      "Protozoa Darah & Jaringan (Plasmodium/Malaria, Toxoplasma)",
      "Protozoa Usus (Entamoeba, Giardia)",
      "Trematoda (Schistosoma, Fasciola)",
      "Trypanosoma & Leishmania"
    ]
  },
  {
    "name": "Patologi Anatomi",
    "slug": "patologi-anatomi",
    "illustrationKey": "patologi",
    "aliases": [
      "patologi"
    ],
    "description": "Perubahan sel, jaringan, dan organ pada penyakit.",
    "chapters": [
      "Gangguan Hemodinamik (Trombosis, Emboli, Infark)",
      "Jejas Sel & Adaptasi Sel",
      "Neoplasia: Prinsip Umum & Klasifikasi",
      "Patologi Muskuloskeletal",
      "Patologi Payudara & Ginekologi",
      "Patologi Sistem Digestif & Hepar",
      "Patologi Sistem Endokrin",
      "Patologi Sistem Kardiovaskular",
      "Patologi Sistem Respirasi",
      "Patologi Sistem Saraf Pusat",
      "Patologi Sistem Urogenital",
      "Penyembuhan Luka & Regenerasi",
      "Radang Akut & Kronik"
    ]
  },
  {
    "name": "Patologi Klinik",
    "slug": "patologi-klinik",
    "illustrationKey": "patologi-klinik",
    "aliases": [],
    "description": "Interpretasi pemeriksaan laboratorium klinik.",
    "chapters": [
      "Dasar Imunoserologi Klinik",
      "Interpretasi Analisis Gas Darah",
      "Interpretasi Analisis Urin",
      "Interpretasi Darah Lengkap (Hematologi Dasar)",
      "Interpretasi Fungsi Ginjal",
      "Interpretasi Fungsi Hati",
      "Interpretasi Kultur & Sensitivitas Mikrobiologi",
      "Interpretasi Profil Lipid & Gula Darah"
    ]
  },
  {
    "name": "Psikiatri & Kesehatan Jiwa",
    "slug": "psikiatri-kesehatan-jiwa",
    "illustrationKey": "psikiatri-kesehatan-jiwa",
    "aliases": [],
    "description": "Gangguan jiwa, kesehatan mental, dan kedaruratan psikiatri.",
    "chapters": [
      "Delirium & Gangguan Kognitif",
      "Gangguan Cemas: Fobia, Panik, GAD",
      "Gangguan Kepribadian",
      "Gangguan Makan (Anoreksia, Bulimia)",
      "Gangguan Mood: Bipolar",
      "Gangguan Mood: Depresi",
      "Gangguan Obsesif-Kompulsif",
      "Gangguan Penggunaan Zat Psikoaktif (NAPZA, Alkohol)",
      "Gangguan Perkembangan Anak (ADHD, Autisme)",
      "Gangguan Somatoform & Psikosomatik",
      "Gangguan Tidur (Insomnia, Parasomnia)",
      "Gangguan Waham",
      "Kedaruratan Psikiatri (Risiko Bunuh Diri, Agitasi)",
      "Skizofrenia & Gangguan Psikotik Lain"
    ]
  },
  {
    "name": "Radiologi Dasar",
    "slug": "radiologi-dasar",
    "illustrationKey": "radiologi-dasar",
    "aliases": [],
    "description": "Dasar pencitraan dan interpretasi radiologi.",
    "chapters": [
      "Interpretasi Foto Abdomen",
      "Interpretasi Foto Toraks",
      "Interpretasi Foto Tulang/Fraktur",
      "Prinsip Dasar Pencitraan (X-Ray, USG, CT, MRI)",
      "USG Dasar (Abdomen, Obstetri)"
    ]
  },
  {
    "name": "Sistem Endokrin, Metabolik & Nutrisi",
    "slug": "sistem-endokrin-metabolik-nutrisi",
    "illustrationKey": "sistem-endokrin-metabolik-nutrisi",
    "aliases": [],
    "description": "Hormon, metabolisme, dan gangguan nutrisi.",
    "chapters": [
      "Defisiensi Vitamin & Mineral",
      "Diabetes Melitus Tipe 1",
      "Diabetes Melitus Tipe 2",
      "Dislipidemia",
      "Gangguan Kelenjar Paratiroid & Kalsium",
      "Hipertiroid & Krisis Tiroid",
      "Hiperurisemia & Gout",
      "Hipotiroid",
      "Komplikasi Akut Diabetes (Hipoglikemia, KAD, HHS)",
      "Komplikasi Kronik Diabetes",
      "Malnutrisi Energi-Protein",
      "Obesitas & Sindrom Metabolik",
      "Penyakit Addison & Insufisiensi Adrenal",
      "Penyakit Cushing & Hiperkortisolisme",
      "Tiroiditis & Goiter"
    ]
  },
  {
    "name": "Sistem Gastrointestinal, Hepatobilier, Pankreas",
    "slug": "sistem-gastrointestinal-hepatobilier-pankreas",
    "illustrationKey": "sistem-gastrointestinal-hepatobilier-pankreas",
    "aliases": [],
    "description": "Saluran cerna, hati, empedu, dan pankreas.",
    "chapters": [
      "Akalasia & Gangguan Motilitas Esofagus",
      "Apendisitis",
      "Demam Tifoid",
      "Diare Kronik & Malabsorpsi",
      "Divertikulitis",
      "Gagal Hati Akut & Kronik",
      "Gastritis",
      "Gastroenteritis & Diare Akut",
      "GERD (Gastroesophageal Reflux Disease)",
      "Hemoroid & Fistula Ani",
      "Hepatitis Virus (A, B, C)",
      "Infestasi Cacing (Askariasis, Taeniasis, Cacing Tambang)",
      "Kelainan Kelenjar Liur (Parotitis)",
      "Kelainan Rongga Mulut (Stomatitis, Kandidiasis Oral)",
      "Kolelitiasis & Kolesistitis",
      "Kolitis (Ulseratif, Infeksius)",
      "Pankreatitis Akut & Kronik",
      "Sirosis Hepatis",
      "Tumor/Karsinoma Saluran Cerna Dasar",
      "Ulkus Peptikum",
      "Varises Esofagus"
    ]
  },
  {
    "name": "Sistem Ginjal & Saluran Kemih",
    "slug": "sistem-ginjal-saluran-kemih",
    "illustrationKey": "sistem-ginjal-saluran-kemih",
    "aliases": [],
    "description": "Ginjal, saluran kemih, dan gangguan urogenital.",
    "chapters": [
      "Batu Saluran Kemih (Urolitiasis)",
      "Fimosis & Parafimosis",
      "Glomerulonefritis Akut & Kronik",
      "Hiperplasia Prostat Jinak (BPH)",
      "Hipospadia & Epispadia",
      "Infeksi Saluran Kemih (Sistitis, Pielonefritis)",
      "Karsinoma Prostat Dasar",
      "Kegawatan Uro-genital (Retensio Urin, Trauma Genitourinaria)",
      "Kriptorkidismus",
      "Penyakit Ginjal Kronik & Gagal Ginjal",
      "Prostatitis",
      "Sindrom Nefrotik",
      "Varikokel & Hidrokel"
    ]
  },
  {
    "name": "Sistem Hematologi & Imunologi",
    "slug": "sistem-hematologi-imunologi",
    "illustrationKey": "sistem-hematologi-imunologi",
    "aliases": [],
    "description": "Darah, imunitas, dan gangguan hematologi.",
    "chapters": [
      "Anemia Aplastik & Anemia pada Penyakit Kronik",
      "Anemia Defisiensi Besi",
      "Anemia Hemolitik",
      "Anemia Megaloblastik",
      "Artritis Reumatoid",
      "Demam Berdarah Dengue",
      "Gangguan Pembekuan Darah (Hemofilia, ITP)",
      "Imunodefisiensi (termasuk HIV/AIDS)",
      "Leptospirosis",
      "Leukemia",
      "Limfoma",
      "Lupus Eritematosus Sistemik",
      "Malaria",
      "Reaksi Alergi & Anafilaksis",
      "Sepsis"
    ]
  },
  {
    "name": "Sistem Indra: Mata",
    "slug": "sistem-indra-mata",
    "illustrationKey": "sistem-indra-mata",
    "aliases": [],
    "description": "Mata, penglihatan, dan gangguan oftalmologi.",
    "chapters": [
      "Blefaritis & Hordeolum/Kalazion",
      "Glaukoma Akut & Kronik",
      "Katarak",
      "Kelainan Refraksi (Miopia, Hipermetropia, Astigmatisma)",
      "Kelainan Segmen Anterior & Posterior Lain",
      "Keratitis & Ulkus Kornea",
      "Konjungtivitis & Infeksi Permukaan Mata",
      "Pterigium & Kelainan Konjungtiva Lain",
      "Retinopati (Diabetik, Hipertensi)",
      "Trauma Mata"
    ]
  },
  {
    "name": "Sistem Indra: THT",
    "slug": "sistem-indra-tht",
    "illustrationKey": "sistem-indra-tht",
    "aliases": [],
    "description": "Telinga, hidung, tenggorok, dan pendengaran.",
    "chapters": [
      "Corpus Alienum THT",
      "Epistaksis",
      "Faringitis & Tonsilitis",
      "Gangguan Pendengaran & Tuli",
      "Laringitis",
      "Mastoiditis",
      "Otitis Eksterna",
      "Otitis Media Akut & Kronik",
      "Polip Nasi",
      "Rhinitis Alergi & Non-Alergi",
      "Sinusitis",
      "Tumor Kepala-Leher Dasar",
      "Vertigo Perifer (Terkait Telinga Dalam)"
    ]
  },
  {
    "name": "Sistem Integumen (Kulit & Kelamin)",
    "slug": "sistem-integumen-kulit-kelamin",
    "illustrationKey": "sistem-integumen-kulit-kelamin",
    "aliases": [],
    "description": "Kulit, adneksa, dan penyakit kulit serta kelamin.",
    "chapters": [
      "Akne Vulgaris",
      "Dermatitis Atopik & Kontak",
      "Infeksi Bakteri Kulit (Impetigo, Selulitis, Erisipelas)",
      "Infeksi Jamur Kulit (Tinea, Kandidiasis Kutan)",
      "Infeksi Virus Kulit (Herpes, Varicella, Veruka)",
      "Kelainan Pigmentasi (Vitiligo, Melasma)",
      "Luka Bakar",
      "Penyakit Menular Seksual dengan Manifestasi Kulit",
      "Psoriasis",
      "Skabies & Infestasi Kulit",
      "Tumor Kulit Jinak & Ganas Dasar",
      "Urtikaria"
    ]
  },
  {
    "name": "Sistem Kardiovaskular",
    "slug": "sistem-kardiovaskular",
    "illustrationKey": "sistem-kardiovaskular",
    "aliases": [],
    "description": "Jantung, pembuluh darah, dan gangguan sirkulasi.",
    "chapters": [
      "Aritmia: Fibrilasi Atrial",
      "Aritmia: Takikardi & Bradikardi Lain",
      "Endokarditis, Miokarditis, Perikarditis",
      "Gagal Jantung Akut & Kronik",
      "Hipertensi (Primer & Sekunder)",
      "Penyakit Arteri Perifer",
      "Penyakit Jantung Katup",
      "Penyakit Jantung Kongenital (Dasar)",
      "Penyakit Jantung Koroner: Angina Pektoris",
      "Penyakit Jantung Reumatik",
      "Sindrom Koroner Akut (STEMI, NSTEMI)",
      "Syok (Hipovolemik, Kardiogenik, Septik, Anafilaktik)",
      "Trombosis Vena Dalam",
      "Varises Vena"
    ]
  },
  {
    "name": "Sistem Muskuloskeletal",
    "slug": "sistem-muskuloskeletal",
    "illustrationKey": "sistem-muskuloskeletal",
    "aliases": [],
    "description": "Tulang, sendi, otot, dan gangguan gerak.",
    "chapters": [
      "Artritis Reumatoid (Perspektif Ortopedi)",
      "Dislokasi Sendi",
      "Fraktur Ekstremitas Atas",
      "Fraktur Ekstremitas Bawah",
      "Fraktur: Klasifikasi & Prinsip Tatalaksana",
      "Low Back Pain & Hernia Nukleus Pulposus",
      "Osteoartritis",
      "Osteomielitis",
      "Osteoporosis",
      "Skoliosis & Kifosis",
      "Tenosinovitis & Cedera Jaringan Lunak",
      "Tumor Tulang Primer & Sekunder"
    ]
  },
  {
    "name": "Sistem Respirasi",
    "slug": "sistem-respirasi",
    "illustrationKey": "sistem-respirasi",
    "aliases": [],
    "description": "Saluran napas, paru, dan gangguan pernapasan.",
    "chapters": [
      "ARDS (Acute Respiratory Distress Syndrome)",
      "Asma Bronkial",
      "Bronkitis Akut & Kronik",
      "Edema Paru",
      "Efusi Pleura",
      "Emfisema",
      "Infeksi Saluran Napas Atas (ISPA, Faringitis, Laringitis)",
      "Influenza & Infeksi Virus Respirasi",
      "Kegawatdaruratan Respirasi (Gagal Napas)",
      "Pertusis",
      "Pneumonia (Komunitas & Nosokomial)",
      "Pneumotoraks",
      "PPOK (Penyakit Paru Obstruktif Kronik)",
      "Tuberkulosis Paru",
      "Tumor Paru Dasar"
    ]
  },
  {
    "name": "Sistem Saraf",
    "slug": "sistem-saraf",
    "illustrationKey": "sistem-saraf",
    "aliases": [],
    "description": "Sistem saraf, neurologi, dan gangguan neuromuskular.",
    "chapters": [
      "Epilepsi & Kejang (termasuk Kejang Demam)",
      "Gangguan Gerak: Parkinson & Tremor",
      "Infeksi SSP: Ensefalitis",
      "Infeksi SSP: Meningitis",
      "Kelainan Kongenital Saraf (Spina Bifida, Hidrosefalus)",
      "Neuropati Perifer",
      "Nyeri Kepala Primer (Tension Type, Migren, Cluster)",
      "Nyeri Kepala Sekunder & Red Flags",
      "Penurunan Kesadaran & Koma",
      "Penyakit Demielinisasi (Multiple Sclerosis, Guillain-Barré)",
      "Stroke Hemoragik & Perdarahan Intrakranial",
      "Stroke Iskemik",
      "Tetanus & Infeksi Neuromuskular",
      "Trauma Kepala & Cedera Medula Spinalis",
      "Tumor Sistem Saraf Pusat",
      "Vertigo Perifer & Sentral"
    ]
  }
];
  const subjects = app.findCollectionByNameOrId("subjects");
  const illustration = subjects.fields.getByName("illustrationKey");
  const keys = illustration.values.slice();
  catalog.forEach((s) => { if (keys.indexOf(s.illustrationKey) < 0) keys.push(s.illustrationKey); });
  illustration.values = keys;
  app.save(subjects);
  const chapters = app.findCollectionByNameOrId("chapters");
  const existing = app.findRecordsByFilter("subjects", "", "", 0, 0);
  const norm = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  catalog.forEach((s, i) => {
    const slugs = [s.slug].concat(s.aliases || []);
    let subject = existing.find((r) => slugs.indexOf(r.getString("slug")) >= 0 || norm(r.getString("name")) === norm(s.name));
    if (!subject) {
      subject = new Record(subjects);
      subject.set("slug", s.slug);
      subject.set("hidden", false);
      existing.push(subject);
    }
    subject.set("name", s.name);
    subject.set("illustrationKey", s.illustrationKey);
    subject.set("order", i + 1);
    if (!subject.getString("description") && s.description) subject.set("description", s.description);
    app.save(subject);
    const current = app.findRecordsByFilter("chapters", "subject = {:s}", "", 0, 0, { s: subject.id });
    s.chapters.forEach((title, j) => {
      let chapter = current.find((r) => norm(r.getString("title")) === norm(title));
      if (!chapter) {
        chapter = new Record(chapters);
        chapter.set("subject", subject.id);
        chapter.set("hidden", false);
        current.push(chapter);
      }
      chapter.set("title", title);
      chapter.set("order", j + 1);
      app.save(chapter);
    });
  });
}, () => {
  // Catalog content is retained on rollback: removing it could cascade-delete
  // questions and user progress. Reapplying is idempotent, including after rollback.
});
