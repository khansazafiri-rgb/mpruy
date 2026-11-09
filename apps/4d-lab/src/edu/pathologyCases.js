// Structured pathology teaching cases layered on the existing parameterised scenarios (sim/pathology.js).
// Findings are tagged by fidelity: 'model' = produced by the simulator; 'illustrative' = described only;
// 'absent' = expected clinically but NOT simulated. Status: draft for clinical review.
export const CASES = {
  hfref: {
    context: 'Kasus ilustratif (bukan pasien nyata): laki-laki 62 tahun, sesak saat aktivitas dan bengkak tungkai.',
    anatomy: ['lv', 'myocardium', 'la', 'rv'],
    baseline: 'Model normal: EF parameter ≈58 % (terukur pada LV atlas 55,9 %); dinding LV menebal dan rongga mengecil saat sistol.',
    mechanism: 'Kontraktilitas miokard menurun → volume akhir sistolik meningkat → dilatasi LV kompensatorik. Tekanan pengisian yang tinggi dapat disertai S3 pada awal diastol.',
    findings: [
      ['model', 'Rongga LV lebih besar saat end-diastole dan hanya sedikit mengecil saat sistol (jendela subxifoid pada tubuh atlas).'],
      ['model', 'Pergeseran bidang atrioventrikular ke apeks berkurang (dasar konsep MAPSE).'],
      ['model', 'EF parameter ≈26 %; EF terukur dari deformasi LV atlas ≈19 % — angka layar adalah nilai model.'],
      ['model', 'S3 sintetis, paling jelas dengan bell di area mitral (diputar 180 ms setelah S2 di simulator).'],
      ['absent', 'Doppler/regurgitasi mitral, kongesti paru (garis B), efusi pleura, pelebaran VCI, kelainan EKG tidak disimulasikan.'],
    ],
    differentials: ['HFmrEF (EF 41–49 %) dan HFpEF (EF ≥50 %) menurut ESC 2021.', 'Etiologi (iskemik, kardiomiopati dilatasi, katup, hipertensif) tidak dapat dibedakan oleh simulasi ini.'],
    limitations: ['Model deformasi ellipsoid prosedural, bukan ekokardiografi terukur.', 'Diagnosis HF memerlukan gejala, tanda dan pemeriksaan obyektif.'],
    refs: ['R1', 'R2', 'R3', 'R4'],
  },
  effusion: {
    context: 'Kasus ilustratif: perempuan 55 tahun, sesak bertahap dan nyeri pleuritik dada kanan.',
    anatomy: ['pleural_fluid', 'atelectasis', 'lung_r', 'diaphragm', 'liver'],
    baseline: 'Normal: paru beraerasi di atas kubah diafragma kanan; pada USG hanya garis pleura dan reverberasi.',
    mechanism: 'Cairan berkumpul di rongga pleura; pada pasien terlentang cairan bebas menempati bagian dependen (posterior-basal) dan menekan paru di dekatnya (atelektasis kompresif).',
    findings: [
      ['model', 'Ruang anekoik di atas diafragma pada jendela posterolateral kanan, dengan paru kolaps di tepinya.'],
      ['model', 'CT: bulan sabit berdensitas cairan di hemitoraks kanan posterior (≈650 mL).'],
      ['model', 'Bunyi napas berkurang di basal kanan.'],
      ['illustrative', 'Perkusi pekak (hanya dijelaskan).'],
      ['absent', 'Hilangnya artefak cermin, "spine sign" yang realistis, septasi/ekogenisitas eksudat tidak disimulasikan.'],
    ],
    differentials: ['Konsolidasi atau atelektasis tanpa efusi.', 'Hemotoraks/empiema (sering ekogenik/bersepta di USG — tidak dimodelkan).', 'Asites (di BAWAH diafragma) dan efusi perikardial.'],
    limitations: ['Volume dan lokasi ditentukan oleh skor ketergantungan gravitasi sederhana.', 'Pemeriksaan pleura klinis mengikuti pedoman (BTS 2023).'],
    refs: ['R5', 'R6', 'R7'],
  },
  gastroparesis: {
    context: 'Kasus ilustratif: 45 tahun dengan diabetes, mual, cepat kenyang.',
    anatomy: ['stomach', 'liver', 'pancreas'],
    baseline: 'Normal model: ±3 kontraksi antrum per menit dengan oklusi radial ±60 %.',
    mechanism: 'Gangguan kontrol neuromuskular lambung (mis. neuropati otonom) → kontraksi antrum lebih jarang dan lebih dangkal → pengosongan lambung tertunda.',
    findings: [
      ['model', 'Kontraksi antrum 1,2/menit dengan oklusi ±22 %; indeks motilitas turun.'],
      ['absent', 'Waktu pengosongan lambung, isi makanan padat dan bezoar tidak disimulasikan.'],
    ],
    differentials: ['Obstruksi mekanik (mis. stenosis pilorus) harus disingkirkan.', 'Efek obat (opioid, agonis GLP-1), dispepsia fungsional.'],
    limitations: ['Diagnosis memerlukan gejala dan uji pengosongan lambung tervalidasi (ACG 2022); USG antrum adalah alat riset/pendidikan.'],
    refs: ['R8', 'R9', 'R10'],
  },
};
Object.assign(CASES, {
  pericardial: {
    context: 'Kasus ilustratif: perempuan 48 tahun, sesak dan nyeri dada pleuritik setelah infeksi virus.',
    anatomy: ['pericardial_fluid', 'myocardium', 'lv', 'rv', 'liver'],
    baseline: 'Normal: miokardium langsung berbatasan dengan perikardium; tidak ada ruang anekoik di sekeliling jantung.',
    mechanism: 'Cairan berkumpul di rongga perikardial (mis. perikarditis). Bila cepat atau banyak, tekanan intraperikardial naik dan mengganggu pengisian jantung (tamponade).',
    findings: [
      ['model', 'Subxifoid: pita anekoik sirkumferensial (±9 mm) di antara perikardium dan miokardium.'],
      ['model', 'CT: cincin berdensitas cairan di sekitar jantung; denyut jantung model 104/menit.'],
      ['illustrative', 'Bunyi jantung menjauh dan pulsus paradoksus (hanya dijelaskan).'],
      ['absent', 'Kolaps atrium/ventrikel kanan, variasi respiratorik aliran, pelebaran VCI dan perubahan EKG tidak disimulasikan.'],
    ],
    differentials: ['Lemak epikardial (ekogenik, anterior) dibandingkan cairan anekoik.', 'Efusi pleura kiri (posterior aorta desendens pada USG).', 'Penyebab: infeksi, keganasan, uremia, pascaoperasi, autoimun.'],
    limitations: ['Lapisan cairan dibentuk dengan perluasan geometris sederhana dari miokardium, bukan model tekanan.', 'Tamponade adalah diagnosis klinis (ESC 2015).'],
    refs: ['R11', 'R3'],
  },
  ascites: {
    context: 'Kasus ilustratif: laki-laki 57 tahun dengan sirosis, perut membesar.',
    anatomy: ['free_fluid', 'liver', 'gallbladder', 'diaphragm'],
    baseline: 'Normal: tepi hati langsung berbatasan dengan jaringan sekitar tanpa garis anekoik.',
    mechanism: 'Hipertensi portal dan retensi natrium menyebabkan cairan bebas di rongga peritoneum; pada posisi terlentang cairan berkumpul di daerah dependen seperti sekitar hati.',
    findings: [
      ['model', 'Jendela RUQ: garis anekoik (±10 mm) yang membingkai tepi inferior-posterior hati.'],
      ['model', 'CT: cairan berdensitas air di sekitar hati.'],
      ['illustrative', 'Shifting dullness dan undulasi (hanya dijelaskan).'],
      ['absent', 'Cairan di pelvis/kuadran kiri, septa, debris, serta resesus hepatorenal (ginjal ditahan karena lisensi) tidak disimulasikan.'],
    ],
    differentials: ['Hemoperitoneum pada trauma (cairan bebas pada FAST).', 'Efusi pleura kanan (di ATAS diafragma).', 'Kista atau kandung empedu (berbatas jelas, bukan membingkai organ).'],
    limitations: ['Volume dan distribusi adalah lapisan model sederhana.', 'Evaluasi asites memerlukan parasentesis diagnostik (AASLD 2021).'],
    refs: ['R12', 'T4'],
  },
  retention: {
    context: 'Kasus ilustratif: laki-laki 72 tahun, tidak bisa berkemih sejak 10 jam, nyeri suprapubik.',
    anatomy: ['bladder', 'bowel'],
    baseline: 'Normal pada tubuh atlas: kandung kemih hampir kosong (±32 mL lumen).',
    mechanism: 'Obstruksi aliran keluar (mis. pembesaran prostat) atau gangguan kontraksi detrusor menyebabkan urin tertahan dan kandung kemih meregang.',
    findings: [
      ['model', 'Suprapubik: kandung kemih anekoik besar dengan peningkatan akustik posterior.'],
      ['model', 'CT: kandung kemih berdensitas air yang membesar.'],
      ['illustrative', 'Volume diperkirakan dari tiga diameter (formula ellipsoid) — hitung sendiri dari skala cm.'],
      ['absent', 'Penebalan/trabekulasi dinding, hidronefrosis (ginjal ditahan) dan prostat yang membesar tidak disimulasikan.'],
    ],
    differentials: ['Asites pelvis (cairan di luar kandung kemih, tidak berdinding).', 'Kista ovarium/massa pelvis.', 'Kandung kemih penuh fisiologis sebelum berkemih.'],
    limitations: ['Pembesaran adalah perluasan geometris lumen; bukan model tekanan atau dinding.', 'Retensi dikonfirmasi dengan bladder scan/kateter dan dicari penyebabnya (Selius & Subedi 2008).'],
    refs: ['R13', 'T4'],
  },
});

export const FIDELITY = { model: 'Keluaran model', illustrative: 'Ilustratif (teks)', absent: 'Tidak disimulasikan' };
