// Identifiable structures for the anatomy-assistance overlay, hover identification and learning tasks.
// A structure is a set of TISSUE LABEL IDs from the dataset's label map (anatomy.json labels). Identification
// is only as specific as the label map: e.g. all skeletal muscle is one label, so the overlay says
// "otot rangka (kelompok)" and never names an individual muscle it cannot know.
//
// Content status: DRAFT written for MEDCOEL by the engineering team from the cited textbooks/guidelines.
// Every card is marked `review: 'draf'` until a clinical educator signs it off (MEDICAL_REVIEW_CHECKLIST.md).

export const SYSTEMS = {
  digestive: 'Sistem pencernaan', cardiovascular: 'Sistem kardiovaskular', respiratory: 'Sistem pernapasan',
  urinary: 'Sistem urinaria', musculoskeletal: 'Sistem muskuloskeletal', nervous: 'Sistem saraf', lymphatic: 'Sistem limfatik',
  endocrine: 'Sistem endokrin', integument: 'Integumen', pathology: 'Lapisan patologi (model)',
};

/**
 * key -> { labels, nameId, nameEn, ta (Latin, Terminologia Anatomica), system, color, kind, atlas (3D link names), card }
 * kind: 'organ' (a specific organ/space), 'group' (a tissue class covering many structures), 'pathology' (model layer)
 */
export const STRUCTURES = {
  liver: {
    labels: [17], nameId: 'Hati', nameEn: 'Liver', ta: 'Hepar', system: 'digestive', color: '#c0613f', kind: 'organ', atlas: ['Liver'],
    card: {
      lokasi: 'Kuadran kanan atas, di bawah kubah diafragma kanan, sebagian besar terlindung iga VII–XI.',
      hubungan: 'Superior: diafragma. Posteroinferior: ginjal kanan (resesus hepatorenal/Morison). Medial: lambung, duodenum, VCI. Inferior: kandung empedu di fossa vesicae biliaris.',
      ct: 'Parenkim homogen. Pada CT dengan kontras fase vena portal biasanya ~100–110 HU; dataset ini memakai nilai buku teks tunggal sehingga tidak ada pembuluh hepatik atau segmen yang terlihat.',
      usg: 'Ekotekstur halus homogen; secara klinis dibandingkan dengan korteks ginjal kanan. Simulator hanya meniru speckle umum, bukan triad porta atau vena hepatika.',
      fisiologi: 'Bergeser kaudal dan sedikit anterior saat inspirasi bersama diafragma — gerak ini dimodelkan secara prosedural.',
      klinis: 'Jendela RUQ/interkostal kanan; resesus Morison adalah lokasi cairan bebas yang dicari pada pemeriksaan trauma (FAST).',
      jebakan: 'Bayangan iga dapat menyerupai lesi; ubah sudut probe ke ruang interkostal.',
      refs: ['G1', 'T4'],
    },
  },
  gallbladder: {
    labels: [18], nameId: 'Kandung empedu', nameEn: 'Gallbladder', ta: 'Vesica biliaris', system: 'digestive', color: '#5f9a48', kind: 'organ', atlas: ['Gallbladder'],
    card: {
      lokasi: 'Permukaan visceral hati, setinggi ujung kartilago kosta IX kanan pada garis midklavikula.',
      hubungan: 'Superior: hati. Inferior/medial: duodenum dan kolon transversum.',
      ct: 'Isi empedu berdensitas cairan (~0–20 HU).',
      usg: 'Lumen anekoik dengan peningkatan akustik posterior — fenomena ini DIMODELKAN di simulator.',
      fisiologi: 'Tidak dianimasikan secara khusus selain ikut gerak napas hati.',
      klinis: 'Pemeriksaan RUQ untuk batu empedu atau kolesistitis (tidak dimodelkan).',
      jebakan: 'Lipatan leher kandung empedu dapat tampak seperti septum.',
      refs: ['G1', 'T4'],
    },
  },
  spleen: {
    labels: [19], nameId: 'Limpa', nameEn: 'Spleen', ta: 'Splen (Lien)', system: 'lymphatic', color: '#8c3e72', kind: 'organ', atlas: ['Spleen'],
    card: {
      lokasi: 'Kuadran kiri atas, posterolateral, sejajar iga IX–XI kiri.',
      hubungan: 'Diafragma (superolateral), lambung (anterior), ginjal kiri (inferomedial), fleksura kolon kiri.',
      ct: 'Parenkim homogen pada fase vena portal.',
      usg: 'Homogen, biasanya sedikit lebih ekogenik dari hati (simulator: skala hamburan relatif).',
      fisiologi: 'Ikut turun saat inspirasi.',
      klinis: 'Jendela LUQ/perisplenik dalam FAST.',
      jebakan: 'Bayangan iga dan udara paru di atasnya.',
      refs: ['G1'],
    },
  },
  kidney: {
    labels: [20, 21], nameId: 'Ginjal', nameEn: 'Kidney', ta: 'Ren', system: 'urinary', color: '#b5624e', kind: 'organ', atlas: ['Kidney.l', 'Kidney.r', 'Renal pelvis.l', 'Renal pelvis.r'],
    card: {
      lokasi: 'Retroperitoneal, setinggi T12–L3; ginjal kanan biasanya sedikit lebih rendah karena hati.',
      hubungan: 'Kanan: hati (anterosuperior), duodenum. Kiri: limpa, pankreas, lambung. Posterior: diafragma, m. psoas, m. quadratus lumborum.',
      ct: 'Parenkim dan sinus renal (lemak, pelvis) dibedakan; dataset ini memberi pelvis renal densitas lemak sinus.',
      usg: 'Korteks hipoekoik relatif, sinus renal hiperekoik. Simulator membedakan parenkim dan sinus secara kasar.',
      fisiologi: 'Bergeser kaudal beberapa sentimeter saat inspirasi dalam (dimodelkan prosedural).',
      klinis: 'Jendela RUQ/LUQ dan flank; hidronefrosis tidak dimodelkan.',
      jebakan: 'Ginjal kiri tertutup gas usus/lambung dari anterior; gunakan pendekatan posterolateral.',
      refs: ['G1', 'T4'],
    },
  },
  stomach: {
    labels: [22, 23], nameId: 'Lambung', nameEn: 'Stomach', ta: 'Gaster', system: 'digestive', color: '#e08a72', kind: 'organ', atlas: ['Stomach'],
    card: {
      lokasi: 'Kuadran kiri atas–epigastrium; fundus di bawah kubah diafragma kiri, antrum menyeberang garis tengah ke pilorus.',
      hubungan: 'Anterior: lobus kiri hati, dinding abdomen. Posterior: pankreas, ginjal dan adrenal kiri, limpa (bursa omentalis).',
      ct: 'Dinding berdensitas jaringan lunak; isi tergantung keadaan (dataset: cairan + tudung gas di fundus — ASUMSI).',
      usg: 'Antrum terisi cairan tampak anekoik dengan dinding berlapis; simulator tidak meniru 5 lapisan dinding.',
      fisiologi: 'Gelombang peristaltik antrum ±3/menit (dimodelkan prosedural; frekuensi dan amplitudo dapat diubah).',
      klinis: 'Ultrasonografi antrum dipakai dalam riset/klinis untuk motilitas dan volume isi lambung.',
      jebakan: 'Gas di lambung memantulkan USG (reverberasi) dan menutupi struktur di belakangnya.',
      refs: ['G1', 'R9', 'R10', 'P1'],
    },
  },
  gas: {
    labels: [24], nameId: 'Gas lumen', nameEn: 'Intraluminal gas', ta: '—', system: 'digestive', color: '#7a7a7a', kind: 'group', atlas: [],
    card: { lokasi: 'Tudung gas lambung dan bagian nondependen kolon (ASUMSI dataset).', ct: '≈ −1000 HU.', usg: 'Pantulan hampir total dengan reverberasi/bayangan kotor — dimodelkan sederhana.', jebakan: 'Gas usus adalah penghalang utama USG abdomen.', refs: ['T4'] },
  },
  bowel: {
    labels: [25, 26], nameId: 'Duodenum & jejunum', nameEn: 'Duodenum & jejunum', ta: 'Duodenum, Jejunum', system: 'digestive', color: '#e7a68f', kind: 'organ', atlas: ['Duodenum', 'Jejunum'],
    card: { lokasi: 'Duodenum melingkari kaput pankreas; jejunum di kuadran kiri atas–tengah.', ct: 'Dinding + isi cairan (ASUMSI). Ileum tidak tersedia di atlas.', usg: 'Lengkung usus dengan isi cairan; peristaltik usus halus tidak dianimasikan.', jebakan: 'Atlas tidak memiliki ileum dan sekum: abdomen bawah berisi jaringan lunak tanpa label.', refs: ['G1'] },
  },
  colon: {
    labels: [27, 28], nameId: 'Kolon', nameEn: 'Colon', ta: 'Colon', system: 'digestive', color: '#a8795c', kind: 'organ', atlas: ['Ascending colon', 'Transverse colon', 'Descending colon', 'Sigmoid colon', 'Vermiform appendix'],
    card: { lokasi: 'Bingkai abdomen: asendens (kanan), transversum, desendens (kiri), sigmoid (pelvis).', ct: 'Dinding + isi feses/gas (ASUMSI).', usg: 'Sering tertutup gas.', jebakan: 'Rektum dan sekum tidak ada di atlas.', refs: ['G1'] },
  },
  pancreas: {
    labels: [29], nameId: 'Pankreas', nameEn: 'Pancreas', ta: 'Pancreas', system: 'digestive', color: '#d7b26a', kind: 'organ', atlas: ['Pancreas'],
    card: { lokasi: 'Retroperitoneal, melintang setinggi L1–L2; kaput di lengkung duodenum, kauda ke hilus limpa.', hubungan: 'Posterior: vena splenika, VCI, aorta, ginjal kiri. Anterior: lambung (bursa omentalis).', ct: 'Jaringan lunak; duktus tidak divokselisasi.', usg: 'Sering terhalang gas lambung/usus; pendekatan epigastrik.', jebakan: 'Vena splenika adalah penanda batas posterior pankreas (pembuluh ini tidak dilabeli di dataset).', refs: ['G1'] },
  },
  bladder: {
    labels: [30, 43], nameId: 'Kandung kemih', nameEn: 'Urinary bladder', ta: 'Vesica urinaria', system: 'urinary', color: '#d4c35a', kind: 'organ', atlas: ['Urinary bladder'],
    card: { lokasi: 'Pelvis, di belakang simfisis pubis; naik ke abdomen bila terisi.', ct: 'Urin berdensitas cairan; dinding dilabeli terpisah.', usg: 'Urin anekoik dengan peningkatan akustik posterior — DIMODELKAN. Atlas: kandung kemih hampir kosong (~32 mL) dengan dinding tebal.', klinis: 'Jendela suprapubik untuk volume urin/retensi.', jebakan: 'Simfisis pubis membayangi bila probe terlalu kaudal.', refs: ['G1', 'T4'] },
  },
  lung_r: {
    labels: [7], nameId: 'Paru kanan', nameEn: 'Right lung', ta: 'Pulmo dexter', system: 'respiratory', color: '#e59ab0', kind: 'organ', atlas: ['Superior lobe of right lung', 'Middle lobe of right lung', 'Inferior lobe of right lung'],
    card: LUNG_CARD('kanan', 'tiga lobus (superior, medius, inferior)'),
  },
  lung_l: {
    labels: [8], nameId: 'Paru kiri', nameEn: 'Left lung', ta: 'Pulmo sinister', system: 'respiratory', color: '#eaa7be', kind: 'organ', atlas: ['Superior lobe of left lung', 'Inferior lobe of left lung'],
    card: LUNG_CARD('kiri', 'dua lobus dengan lingula dan incisura cardiaca'),
  },
  airway: {
    labels: [40], nameId: 'Trakea & bronkus', nameEn: 'Trachea & bronchi', ta: 'Trachea, Bronchi', system: 'respiratory', color: '#8fa6b2', kind: 'organ', atlas: ['Trachea', 'Right main bronchus', 'Left main bronchus'],
    card: { lokasi: 'Trakea di mediastinum superior, bercabang di karina (±T4–T5).', ct: 'Udara ≈ −1000 HU.', usg: 'Udara memantulkan USG; trakea servikal hanya dinding anteriornya yang tampak.', refs: ['G1'] },
  },
  myocardium: {
    labels: [9], nameId: 'Miokardium & katup', nameEn: 'Myocardium & valves', ta: 'Myocardium', system: 'cardiovascular', color: '#b3343d', kind: 'organ', atlas: ['Left ventricle', 'Right ventricle', 'Left atrium', 'Right atrium'],
    card: { lokasi: 'Dinding keempat ruang jantung; daun katup dilabeli bersama.', ct: 'Miokardium lebih gelap dari kolam darah berkontras.', usg: 'Miokardium ekogenik dibanding darah anekoik — DIMODELKAN.', fisiologi: 'Menebal saat sistol (model radial-longitudinal prosedural).', jebakan: 'Pada voxel 2,5 mm dinding atrium/RV tampak lebih tebal dari aslinya.', refs: ['G1', 'R3'] },
  },
  lv: { labels: [10], nameId: 'Ventrikel kiri (rongga)', nameEn: 'Left ventricle', ta: 'Ventriculus sinister', system: 'cardiovascular', color: '#e05a5a', kind: 'organ', atlas: ['Left ventricle'], card: HEART_CARD('kiri', 'Memompa ke aorta; ejeksi tampak sebagai mengecilnya rongga saat sistol. EF model normal ≈58 %; volume LV atlas kecil (EDV ≈77 mL).') },
  rv: { labels: [11], nameId: 'Ventrikel kanan (rongga)', nameEn: 'Right ventricle', ta: 'Ventriculus dexter', system: 'cardiovascular', color: '#5b6fd6', kind: 'organ', atlas: ['Right ventricle'], card: HEART_CARD('kanan', 'Ruang paling anterior jantung, di belakang sternum; memompa ke trunkus pulmonalis.') },
  la: { labels: [12], nameId: 'Atrium kiri (rongga)', nameEn: 'Left atrium', ta: 'Atrium sinistrum', system: 'cardiovascular', color: '#e88b8b', kind: 'organ', atlas: ['Left atrium'], card: HEART_CARD('kiri', 'Ruang paling posterior jantung, di depan esofagus; menerima vena pulmonalis.') },
  ra: { labels: [13], nameId: 'Atrium kanan (rongga)', nameEn: 'Right atrium', ta: 'Atrium dextrum', system: 'cardiovascular', color: '#7d8be0', kind: 'organ', atlas: ['Right atrium'], card: HEART_CARD('kanan', 'Membentuk batas kanan jantung; menerima vena kava superior dan inferior.') },
  aorta: {
    labels: [14], nameId: 'Aorta & a. iliaka komunis', nameEn: 'Aorta', ta: 'Aorta', system: 'cardiovascular', color: '#d23c3c', kind: 'organ', atlas: ['Ascending aorta', 'Aortic arch', 'Thoracic aorta', 'Abdominal aorta'],
    card: { lokasi: 'Aorta abdominal di kiri garis tengah, anterior korpus vertebra, bercabang setinggi L4.', hubungan: 'VCI di sebelah kanannya; vena renal kiri melintas di depannya.', ct: 'Lumen terang pada CT berkontras (dataset: ~220 HU).', usg: 'Tubular anekoik berdinding ekogenik; pulsatil di klinik (pulsasi tidak dimodelkan).', klinis: 'Skrining aneurisma aorta abdominal (tidak dimodelkan).', refs: ['G1'] },
  },
  vena_cava: {
    labels: [15], nameId: 'Vena besar (kava, brakiosefalika, iliaka, pulmonalis)', nameEn: 'Great veins', ta: 'Vena cava superior/inferior', system: 'cardiovascular', color: '#3d5a98', kind: 'group', atlas: ['Superior vena cava', 'Inferior vena cava (thoracic part)', 'Inferior vena cava (abdominal part)'],
    card: { lokasi: 'VCI di kanan garis tengah, masuk ke atrium kanan melalui diafragma (T8).', ct: 'Kontras vena (dataset: ~170 HU).', usg: 'VCI tampak dari subxifoid; variasi diameter dengan napas TIDAK dimodelkan.', jebakan: 'Label ini juga mencakup vena pulmonalis dan iliaka (satu kelas jaringan).', refs: ['G1'] },
  },
  pulmonary_artery: { labels: [16], nameId: 'Trunkus & a. pulmonalis', nameEn: 'Pulmonary trunk', ta: 'Truncus pulmonalis', system: 'cardiovascular', color: '#7a5fc0', kind: 'organ', atlas: ['Pulmonary trunk', 'Left pulmonary artery', 'Right pulmonary artery'], card: { lokasi: 'Keluar dari ventrikel kanan, di kiri aorta asendens, bercabang di bawah arkus aorta.', ct: 'Lumen berkontras.', refs: ['G1'] } },
  diaphragm: {
    labels: [31], nameId: 'Diafragma', nameEn: 'Diaphragm', ta: 'Diaphragma', system: 'respiratory', color: '#c4705e', kind: 'organ', atlas: ['Diaphragm'],
    card: { lokasi: 'Kubah memisahkan toraks dan abdomen; kubah kanan lebih tinggi (dataset atlas: kanan 40 mm, kiri 22,5 mm di atas ujung xifoid).', usg: 'Garis ekogenik terang di atas hati/limpa.', fisiologi: 'Otot inspirasi utama: turun saat inspirasi (ekskursi napas tenang ±1–2 cm; dimodelkan 16 mm bawaan).', klinis: 'Penanda batas efusi pleura (cairan di atas diafragma).', refs: ['G1', 'P2'] },
  },
  esophagus: { labels: [37], nameId: 'Esofagus', nameEn: 'Oesophagus', ta: 'Oesophagus', system: 'digestive', color: '#cf8a7d', kind: 'organ', atlas: ['Oesophagus'], card: { lokasi: 'Mediastinum posterior, di belakang atrium kiri, menembus diafragma setinggi T10.', refs: ['G1'] } },
  cord: { labels: [35], nameId: 'Medula spinalis', nameEn: 'Spinal cord', ta: 'Medulla spinalis', system: 'nervous', color: '#e9dfb8', kind: 'organ', atlas: [], card: { lokasi: 'Kanalis vertebralis; berakhir sekitar L1–L2 (konus).', usg: 'Tidak terlihat pada dewasa karena lengkung vertebra membayangi.', refs: ['G1'] } },
  disc: { labels: [36], nameId: 'Diskus intervertebralis', nameEn: 'Intervertebral disc', ta: 'Discus intervertebralis', system: 'musculoskeletal', color: '#9fc4d6', kind: 'group', atlas: [], card: { ct: 'Densitas lebih rendah dari tulang.', refs: ['G1'] } },
  bone: { labels: [4, 5], nameId: 'Tulang (kelompok)', nameEn: 'Bone', ta: 'Os / ossa', system: 'musculoskeletal', color: '#ece2c8', kind: 'group', atlas: [], card: { ct: 'Korteks sangat terang (dataset ~900 HU), medula lebih rendah.', usg: 'Permukaan tulang memantulkan kuat dan menimbulkan bayangan akustik — DIMODELKAN.', jebakan: 'Label ini tidak membedakan tulang mana; gunakan atlas 3D untuk nama iga/vertebra.', refs: ['T4'] } },
  cartilage: { labels: [6], nameId: 'Kartilago kosta / simfisis', nameEn: 'Costal cartilage', ta: 'Cartilago costalis', system: 'musculoskeletal', color: '#bcd9e2', kind: 'group', atlas: [], card: { usg: 'Kartilago kosta meneruskan USG lebih baik daripada tulang — itulah sebabnya jendela parasternal memungkinkan.', refs: ['G1'] } },
  muscle: { labels: [3], nameId: 'Otot rangka (kelompok)', nameEn: 'Skeletal muscle', ta: 'Musculi', system: 'musculoskeletal', color: '#b56a5c', kind: 'group', atlas: [], card: { usg: 'Otot hipoekoik dengan serat ekogenik di klinik; simulator memakai speckle umum.', jebakan: 'Satu label untuk semua otot: overlay tidak dapat menyebut nama otot individual.', refs: ['T4'] } },
  gland: { labels: [42], nameId: 'Jaringan kelenjar (tiroid, adrenal, prostat)', nameEn: 'Glandular tissue', ta: '—', system: 'endocrine', color: '#c7aa79', kind: 'group', atlas: [], card: { jebakan: 'Satu label mencakup beberapa kelenjar berbeda.', refs: ['G1'] } },
  pleural_fluid: { labels: [39], nameId: 'Cairan pleura (lapisan patologi)', nameEn: 'Pleural fluid', ta: 'Liquor pleurae (patologis)', system: 'pathology', color: '#4aa3ff', kind: 'pathology', atlas: [], card: { lokasi: 'Bagian dependen rongga pleura kanan (posterior-basal pada pasien terlentang) — dimodelkan.', ct: 'Densitas cairan.', usg: 'Ruang anekoik di atas diafragma dengan paru kolaps — DIMODELKAN; artefak cermin tidak dimodelkan.', refs: ['R5', 'R6'] } },
  atelectasis: { labels: [41], nameId: 'Paru kolaps (lapisan patologi)', nameEn: 'Compressive atelectasis', ta: 'Atelectasis', system: 'pathology', color: '#c86478', kind: 'pathology', atlas: [], card: { usg: 'Paru tanpa udara tampak seperti jaringan padat yang mengapung dalam efusi.', refs: ['R6'] } },
  pericardial_fluid: { labels: [44], nameId: 'Cairan perikardial (lapisan patologi)', nameEn: 'Pericardial effusion', ta: 'Liquor pericardii (patologis)', system: 'pathology', color: '#38bdf8', kind: 'pathology', atlas: [], card: { lokasi: 'Ruang perikardial di sekeliling jantung — lapisan model setebal ±9 mm.', usg: 'Pita anekoik di antara perikardium dan miokardium, paling jelas dari subxifoid — DIMODELKAN. Kolaps ruang jantung (tamponade) TIDAK dimodelkan.', ct: 'Cincin berdensitas cairan di sekitar jantung.', refs: ['R11'] } },
  free_fluid: { labels: [45], nameId: 'Cairan bebas peritoneal (lapisan patologi)', nameEn: 'Free intraperitoneal fluid', ta: 'Ascites', system: 'pathology', color: '#22d3ee', kind: 'pathology', atlas: [], card: { lokasi: 'Di sepanjang permukaan inferior-posterior hati (abdomen atas dependen) — lapisan model ±10 mm.', usg: 'Garis anekoik yang membingkai tepi hati — DIMODELKAN. Septa/debris tidak dimodelkan.', ct: 'Cairan berdensitas air di sekitar hati.', jebakan: 'Ginjal tidak tersedia di dataset atlas, sehingga resesus hepatorenal (Morison) sendiri tidak dapat ditampilkan.', refs: ['R12'] } },
};

function LUNG_CARD(side, lobes) {
  return {
    lokasi: `Rongga pleura ${side}; ${lobes}.`,
    hubungan: 'Medial: mediastinum dan jantung. Inferior: kubah diafragma. Margo anterior menutupi sebagian jantung.',
    ct: 'Parenkim beraerasi ≈ −850 HU pada dataset; tampak hitam pada jendela jaringan lunak — gunakan jendela paru.',
    usg: 'Udara memantulkan hampir semua energi: hanya garis pleura dan reverberasi (garis A) — DIMODELKAN sederhana. Sliding paru tidak dimodelkan.',
    fisiologi: 'Mengembang ke kaudal saat inspirasi (dimodelkan prosedural).',
    klinis: 'Zona pemeriksaan USG paru anterior, lateral dan posterior; efusi dicari di basal posterolateral.',
    jebakan: 'Pada tubuh atlas ini, margo anterior dan lingula menutupi apeks jantung sehingga jendela apikal terhalang.',
    refs: ['G1', 'R6'],
  };
}
function HEART_CARD(side, specific) {
  return {
    lokasi: `Rongga darah jantung ${side}. ${specific}`,
    ct: 'Kolam darah terang seperti CT berkontras (dataset 185–200 HU).',
    usg: 'Darah anekoik dibanding miokardium ekogenik — DIMODELKAN. Doppler tidak dimodelkan.',
    fisiologi: 'Volume berubah sepanjang siklus jantung (model prosedural yang sama dengan gerak 3D).',
    klinis: 'Jendela subxifoid, parasternal dan apikal; pada tubuh atlas ini jendela apikal terhalang paru.',
    refs: ['G1', 'R3'],
  };
}

/** Pixels with these labels are "not identified" (shown as unknown, never named as an organ). */
export const UNIDENTIFIED = {
  0: 'Udara / di luar tubuh', 1: 'Kulit (cangkang ilustratif)', 2: 'Jaringan lunak tanpa label (tidak teridentifikasi)', 38: 'Meja CT (bukan anatomi)',
  32: 'Otak', 33: 'Cairan serebrospinal', 34: 'Bola mata',
};

export const PALETTE = ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#da77f2', '#ff922b', '#20c997', '#f783ac', '#a9e34b', '#91a7ff', '#e599f7', '#ffa94d', '#66d9e8', '#fcc419'];
/** Fixed order of systems in the structure list (stable while anatomy moves). */
export const SYSTEM_ORDER = ['cardiovascular', 'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine', 'musculoskeletal', 'nervous', 'integument', 'pathology'];
/** Group lookup for a dataset: label id -> group index (1-based), plus the ordered group keys. */
export function buildGroups(anatomyLabels) {
  // Labels flagged `available: false` (licence quarantine: kidney, renal pelvis, spinal cord in the atlas dataset)
  // have no voxels and are never offered as identifiable structures.
  const present = new Set((anatomyLabels || []).filter((l) => l.available !== false).map((l) => l.id));
  if (present.size) for (const id of [44, 45]) present.add(id); // MEDCOEL model pathology layers (sim/pathology.js LAYER_LABELS)
  const keys = Object.keys(STRUCTURES).filter((k) => STRUCTURES[k].labels.some((id) => present.has(id)));
  const lut = new Uint8Array(256);
  keys.forEach((k, i) => { for (const id of STRUCTURES[k].labels) if (present.has(id)) lut[id] = i + 1; });
  // display colours: a curated high-contrast palette (distinct on the dark monitor), pathology layers keep their own
  const colour = keys.map((k, i) => (STRUCTURES[k].kind === 'pathology' ? STRUCTURES[k].color : PALETTE[i % PALETTE.length]));
  return { keys, lut, colorOf: (g) => (g > 0 ? colour[g - 1] : '#ffffff'), byIndex: (g) => (g > 0 ? STRUCTURES[keys[g - 1]] : null), keyOf: (g) => (g > 0 ? keys[g - 1] : null), indexOf: (k) => keys.indexOf(k) + 1 };
}

/** Where a label came from, for the hover tooltip ("provenance"). */
export function provenance(dataset) {
  if (dataset === 'atlas') return { short: 'Segmentasi sintetis atlas', long: 'Label diturunkan dari mesh Atlas MEDCOEL (BodyParts3D/Z-Anatomy) yang divokselisasi pada 2,5 mm — sintetis, bukan segmentasi citra pasien.', level: 'synthetic-atlas' };
  if (dataset === 'phantom') return { short: 'Label phantom prosedural', long: 'Label berasal dari geometri prosedural phantom MEDCOEL — sintetis.', level: 'synthetic-phantom' };
  return { short: 'Label map lokal (belum diverifikasi)', long: 'Label map yang dimuat pengguna; ketepatan dan registrasinya tidak diverifikasi oleh MEDCOEL.', level: 'local-unverified' };
}

/**
 * Structures the dataset declares unavailable (e.g. withheld by the licence quarantine). Returned so the UI can
 * say so explicitly instead of silently omitting them or substituting other anatomy.
 * @returns [{key, nameId, reason}]
 */
export function unavailableStructures(anatomy) {
  const off = new Map((anatomy?.labels || []).filter((l) => l.available === false).map((l) => [l.id, l.unavailableReason || 'Tidak tersedia di dataset ini.']));
  return Object.entries(STRUCTURES).filter(([, st]) => st.labels.length && st.labels.every((id) => off.has(id)))
    .map(([key, st]) => ({ key, nameId: st.nameId, reason: off.get(st.labels[0]) }));
}
