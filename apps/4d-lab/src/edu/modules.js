// Guided learning modules. Each task is checked against the REAL simulator state (plane orientation, labelled
// structures present in the current image, structure under the beam centre, stethoscope site, scenario).
// Content: draft for clinical-educator review. Practice state is stored locally only (no server writes).
const near = (n, axis, deg = 15) => Math.abs(n[0] * axis[0] + n[1] * axis[1] + n[2] * axis[2]) >= Math.cos(deg * Math.PI / 180);
const AXIS = { axial: [0, 0, 1], coronal: [0, 1, 0], sagittal: [1, 0, 0] };
const has = (st, keys, min = 120) => keys.every((k) => (st.visible.get(k) || 0) >= min);

export const MODES = {
  explore: { label: 'Eksplorasi', text: 'Semua label dan penjelasan terbuka. Jelajahi bebas.', assist: 'guided' },
  guided: { label: 'Terpandu', text: 'Tugas langkah demi langkah dengan petunjuk.', assist: 'contours' },
  practice: { label: 'Latihan', text: 'Label disembunyikan sampai kamu memilih. Petunjuk tidak otomatis.', assist: 'challenge' },
  review: { label: 'Tinjau', text: 'Ringkasan jawaban, kesalahan dan penjelasannya.', assist: 'guided' },
};

export const MODULES = [
  {
    id: 'm1', title: 'Modul 1 — Anatomi potong lintang', goal: 'Mengenali organ toraks–abdomen pada bidang aksial, koronal dan sagital CT.',
    refs: ['G1', 'E4'],
    tasks: [
      { id: 'm1-axial-kidney', type: 'navigate', title: 'Potongan aksial setinggi ginjal kanan', prompt: 'Buat bidang CT AKSIAL yang memperlihatkan hati dan ginjal sekaligus.', hint: 'Mode Free 3D → preset Aksial, lalu mode ↕ untuk mencari ketinggian ginjal (di bawah hati).', setup: { free: 'axial', at: 'kidney', display: 'ct' }, check: (st) => st.plane && near(st.plane.n, AXIS.axial) && has(st, ['liver', 'kidney']), explain: 'Ginjal kanan terletak posterior–inferior dari hati (resesus hepatorenal). Pada potongan aksial, sisi kiri pasien tampil di kanan layar (konvensi radiologis).' },
      { id: 'm1-id-liver', type: 'identify', target: 'liver', title: 'Identifikasi hati', prompt: 'Klik HATI pada citra (label disembunyikan).', setup: { free: 'axial', at: 'liver', display: 'ct' }, explain: 'Hati adalah organ padat terbesar di kuadran kanan atas, tepat di bawah kubah diafragma kanan.' },
      { id: 'm1-coronal', type: 'navigate', title: 'Potongan koronal paru–diafragma–hati', prompt: 'Buat bidang KORONAL yang memperlihatkan paru kanan, diafragma dan hati.', hint: 'Preset Koronal, lalu mode ⇅ (anterior–posterior) untuk mengatur kedalaman.', setup: { free: 'coronal', at: 'liver', display: 'ct' }, check: (st) => st.plane && near(st.plane.n, AXIS.coronal) && has(st, ['lung_r', 'liver']) && has(st, ['diaphragm'], 20), explain: 'Kubah diafragma kanan memisahkan paru kanan dari hati; kubah kanan biasanya lebih tinggi dari kiri.' },
      { id: 'm1-id-aorta', type: 'identify', target: 'aorta', title: 'Identifikasi aorta', prompt: 'Klik AORTA pada potongan aksial.', setup: { free: 'axial', at: 'kidney', display: 'ct' }, explain: 'Aorta abdominal berada di kiri garis tengah, anterior korpus vertebra; vena kava inferior berada di kanannya.' },
      { id: 'm1-sagittal', type: 'navigate', title: 'Potongan sagital melalui kandung kemih', prompt: 'Buat bidang SAGITAL yang memperlihatkan kandung kemih.', hint: 'Preset Sagital, lalu ↕ ke pelvis dan ↔ ke garis tengah.', setup: { free: 'sagittal', at: 'bladder', display: 'ct' }, check: (st) => st.plane && near(st.plane.n, AXIS.sagittal) && has(st, ['bladder'], 30), explain: 'Kandung kemih terletak di belakang simfisis pubis; pada tubuh atlas ini kandung kemih hampir kosong.' },
      { id: 'm1-quiz', type: 'quiz', title: 'Orientasi gambar', prompt: 'Pada CT aksial dengan konvensi radiologis, sisi KIRI pasien tampil di…', options: ['Kiri layar', 'Kanan layar', 'Atas layar'], answer: 1, explain: 'Konvensi radiologis: kita "melihat dari kaki pasien", sehingga kiri pasien di kanan layar. Huruf L/R di tepi monitor menunjukkannya.' },
    ],
  },
  {
    id: 'm2', title: 'Modul 2 — Dasar USG point-of-care (simulasi)', goal: 'Memahami orientasi probe, pemilihan probe dan jendela dasar pada model sintetis.',
    refs: ['E1', 'E2', 'E3', 'T4'],
    tasks: [
      { id: 'm2-probe', type: 'quiz', title: 'Pilih probe', prompt: 'Probe mana yang paling sesuai untuk jendela jantung di antara iga?', options: ['Linear (frekuensi tinggi)', 'Kurvilinear (abdomen)', 'Phased array (jejak kecil)'], answer: 2, explain: 'Phased array memiliki jejak kecil yang muat di ruang interkostal dan menghasilkan sektor dari satu titik.' },
      { id: 'm2-bladder', type: 'place', title: 'Kandung kemih di tengah layar', prompt: 'Tempatkan probe sehingga kandung kemih (urin) berada di tengah berkas USG.', hint: 'Jendela standar "Kandung kemih suprapubik", lalu mode ↕ sedikit ke inferior/superior.', setup: { view: 'bladder', display: 'us' }, check: (st) => st.centreKey === 'bladder', explain: 'Urin anekoik menghasilkan peningkatan akustik posterior — DIMODELKAN di simulator.' },
      { id: 'm2-heart', type: 'place', title: 'Jendela subxifoid', prompt: 'Dapatkan citra USG yang memperlihatkan ventrikel kiri dan kanan.', hint: 'Jendela "Subxifoid 4 ruang", lalu ⟳ tilt sedikit.', setup: { view: 'subxiphoid', display: 'us' }, check: (st) => has(st, ['lv', 'rv'], 80), explain: 'Pendekatan subxifoid memakai hati sebagai jendela akustik dan menghindari paru.' },
      { id: 'm2-ruq', type: 'place', title: 'RUQ: hati dan ginjal', prompt: 'Tampilkan hati dan ginjal kanan bersama pada USG.', setup: { view: 'ruq', display: 'us' }, check: (st) => has(st, ['liver', 'kidney'], 120), explain: 'Resesus hepatorenal (Morison) adalah tempat cairan bebas dicari dalam pemeriksaan trauma.' },
      { id: 'm2-depth', type: 'quiz', title: 'Kedalaman dan frekuensi', prompt: 'Menaikkan frekuensi probe biasanya…', options: ['Meningkatkan resolusi tetapi mengurangi penetrasi', 'Meningkatkan penetrasi', 'Tidak berpengaruh'], answer: 0, explain: 'Atenuasi meningkat dengan frekuensi — perilaku ini dimodelkan (ubah Frekuensi di Citra lanjut).' },
    ],
  },
  {
    id: 'm3', title: 'Modul 3 — Auskultasi klinis', goal: 'Menghubungkan area auskultasi dengan peristiwa siklus jantung dan bunyi napas.',
    refs: ['A1', 'A2', 'R4'],
    tasks: [
      { id: 'm3-s2', type: 'listen', title: 'Di mana S2 paling keras?', prompt: 'Letakkan stetoskop di area tempat S2 paling keras.', check: (st) => st.site === 'aortic' || st.site === 'pulmonic', explain: 'S2 (penutupan katup aorta dan pulmonal) paling keras di basis jantung (SIC II kanan/kiri).' },
      { id: 'm3-s1', type: 'listen', title: 'Di mana S1 paling keras?', prompt: 'Letakkan stetoskop di area tempat S1 paling keras.', check: (st) => st.site === 'mitral' || st.site === 'tricuspid', explain: 'S1 (penutupan katup mitral dan trikuspid) paling keras di apeks dan batas sternum kiri bawah.' },
      { id: 'm3-s3', type: 'listen', title: 'Dengar S3', prompt: 'Skenario HFrEF: dengarkan S3 dengan BELL di area mitral.', setup: { scenario: 'hfref' }, check: (st) => st.site === 'mitral' && st.filter === 'bell' && st.scenario === 'hfref', explain: 'S3 bernada rendah pada awal diastol; bell meneruskan frekuensi rendah.' },
      { id: 'm3-quiz', type: 'quiz', title: 'EKG vs bunyi jantung', prompt: 'Apa yang menghasilkan bunyi S1/S2?', options: ['Gelombang listrik EKG', 'Penutupan katup dan getaran mekanis', 'Aliran udara'], answer: 1, explain: 'EKG merekam aktivitas listrik; S1/S2 adalah peristiwa mekanis-akustik penutupan katup.' },
    ],
  },
  {
    id: 'm4', title: 'Modul 4 — Normal vs patologis', goal: 'Membandingkan temuan normal dengan skenario model.',
    refs: ['R1', 'R5', 'R8'],
    tasks: [
      { id: 'm4-effusion', type: 'identify', target: 'pleural_fluid', title: 'Temukan efusi pleura', prompt: 'Skenario efusi kanan: klik cairan pleura pada citra.', setup: { scenario: 'effusion', display: 'split' }, explain: 'Cairan bebas menempati bagian dependen (posterior-basal) pada pasien terlentang.' },
      { id: 'm4-ef', type: 'quiz', title: 'Fraksi ejeksi', prompt: 'Pada skenario HFrEF, EF model sekitar…', options: ['≈58 %', '≈26 %', '≈80 %'], answer: 1, explain: 'HFrEF didefinisikan EF ≤40 % (ESC 2021). EF terukur dari deformasi LV atlas ≈19 %.' },
      { id: 'm4-gi', type: 'quiz', title: 'Motilitas antrum', prompt: 'Pada pola gastroparesis model, kontraksi antrum…', options: ['Lebih sering', 'Lebih jarang dan lebih dangkal', 'Tidak berubah'], answer: 1, explain: '1,2/menit dan oklusi ±22 % vs normal 3/menit dan ±60 %. Diagnosis klinis butuh uji pengosongan lambung.' },
    ],
  },
  {
    id: 'm5', title: 'Modul 5 — Kasus terpandu: sesak napas', goal: 'Memilih lokasi pemeriksaan, mengenali temuan dan menjelaskan anatominya (kasus ilustratif).',
    refs: ['R5', 'R6'],
    tasks: [
      { id: 'm5-window', type: 'place', title: 'Pilih jendela', prompt: 'Pasien ilustratif sesak dengan bunyi napas kanan bawah berkurang. Tempatkan probe di posterolateral kanan di atas diafragma hingga cairan tampak.', setup: { scenario: 'effusion', display: 'us' }, hint: 'Jendela "Basal kanan posterolateral".', check: (st) => has(st, ['pleural_fluid'], 60), explain: 'Jendela posterolateral basal mencapai bagian dependen rongga pleura.' },
      { id: 'm5-id', type: 'identify', target: 'atelectasis', title: 'Paru kolaps', prompt: 'Klik paru yang terkompresi (atelektasis) di dalam efusi.', explain: 'Paru tanpa udara tampak seperti jaringan padat yang mengapung dalam cairan.' },
      { id: 'm5-quiz', type: 'quiz', title: 'Penalaran', prompt: 'Mengapa cairan terkumpul di posterior pada kasus ini?', options: ['Karena paru kanan lebih besar', 'Karena pasien terlentang dan cairan bebas mengikuti gravitasi', 'Karena diafragma kanan lebih tinggi'], answer: 1, explain: 'Cairan bebas menempati bagian terendah rongga pleura — posterior pada posisi terlentang.' },
    ],
  },
];

/** Local-only progress (no account/database writes). */
const KEY = 'medcoel-4dlab-progress-v1';
export function loadProgress() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
export function saveProgress(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ } }
