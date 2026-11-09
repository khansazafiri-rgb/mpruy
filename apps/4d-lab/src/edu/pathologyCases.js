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
export const FIDELITY = { model: 'Keluaran model', illustrative: 'Ilustratif (teks)', absent: 'Tidak disimulasikan' };
