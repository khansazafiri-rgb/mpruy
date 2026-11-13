// Soal UJI (data uji lokal untuk rekaman video, bukan konten produksi): BAB "Anatomi Paru & Saluran Napas". Format: docs/FORMAT_SOAL.md.
const o = (text, correct, explanation) => ({ text, correct, explanation });
export const CHAPTER = 'Anatomi Paru & Saluran Napas';
export const PARU = [
  { difficulty: 'easy', text: 'Seorang anak 3 tahun tiba-tiba tersedak kacang saat bermain, lalu batuk dan tampak sesak. Benda asing yang terhirup paling sering masuk ke bronkus utama sisi...',
    options: [
      o('Kanan', true, 'Bronkus utama kanan lebih pendek, lebih lebar, dan arahnya lebih vertikal, sehingga benda asing lebih mudah masuk ke sisi kanan.'),
      o('Kiri', false, 'Bronkus utama kiri lebih panjang, lebih sempit, dan lebih horizontal karena melewati bawah arkus aorta; benda asing lebih jarang masuk ke sini.'),
      o('Kanan dan kiri sama sering', false, 'Perbedaan sudut dan diameter membuat sisi kanan lebih sering terkena.'),
      o('Bronkus lobaris superior kiri', false, 'Benda asing yang lolos melewati karina lebih mudah menuju bronkus utama kanan, bukan langsung ke cabang lobaris kiri.'),
      o('Bronkiolus terminal', false, 'Bronkiolus terminal terlalu kecil untuk dimasuki benda asing sebesar kacang.'),
    ] },
  { difficulty: 'easy', text: 'Jumlah lobus paru kanan dan paru kiri berturut-turut adalah...',
    options: [
      o('3 dan 2', true, 'Paru kanan memiliki lobus superior, medius, dan inferior (dipisahkan fissura obliqua dan horizontalis). Paru kiri hanya lobus superior dan inferior; lingula dan incisura cardiaca menyesuaikan posisi jantung.'),
      o('2 dan 3', false, 'Terbalik: yang bertiga adalah paru kanan.'),
      o('3 dan 3', false, 'Paru kiri hanya memiliki dua lobus.'),
      o('2 dan 2', false, 'Paru kanan memiliki tiga lobus.'),
      o('4 dan 3', false, 'Tidak ada lobus tambahan pada paru normal.'),
    ] },
  { difficulty: 'medium', text: 'Seorang mahasiswa diminta menjelaskan otot utama yang berkontraksi saat inspirasi tenang. Otot yang paling berperan adalah...',
    options: [
      o('Diafragma', true, 'Diafragma berkontraksi dan mendatar sehingga rongga toraks membesar; mm. intercostales externi membantu mengangkat iga. Ekspirasi tenang bersifat pasif.'),
      o('M. rectus abdominis', false, 'Otot dinding perut ini aktif pada ekspirasi paksa dan batuk, bukan inspirasi tenang.'),
      o('M. intercostalis internus', false, 'Terutama menurunkan iga pada ekspirasi paksa.'),
      o('M. obliquus internus abdominis', false, 'Membantu ekspirasi paksa dengan menekan isi abdomen ke atas.'),
      o('M. transversus abdominis', false, 'Juga otot ekspirasi paksa; tidak berperan pada inspirasi tenang.'),
    ] },
  { difficulty: 'medium', text: 'Dokter memasang selang WSD pada pasien pneumotoraks. Selang dimasukkan menyusuri tepi atas costa di bawah sela iga yang dipilih untuk menghindari...',
    options: [
      o('Vasa dan N. intercostalis di sulcus costae pada tepi bawah costa', true, 'Berkas neurovaskular interkostal (vena, arteri, saraf dari atas ke bawah) berjalan di sulkus pada tepi inferior costa. Menyusuri tepi superior costa di bawahnya menghindari berkas tersebut.'),
      o('M. serratus anterior', false, 'Otot ini memang dilewati di dinding lateral, tetapi bukan alasan memilih tepi atas costa.'),
      o('A. pulmonalis', false, 'A. pulmonalis berada di hilus paru, jauh dari dinding toraks.'),
      o('Ductus thoracicus', false, 'Ductus thoracicus berada di mediastinum posterior.'),
      o('Pleura parietalis', false, 'Pleura parietalis justru harus ditembus untuk mencapai rongga pleura.'),
    ] },
  { difficulty: 'medium', text: 'Lapisan pleura yang melekat langsung pada permukaan paru dan mengikuti fissura disebut...',
    options: [
      o('Pleura visceralis', true, 'Pleura visceralis (pulmonalis) menyelimuti paru dan masuk ke fissura; pleura parietalis melapisi dinding toraks, diafragma, dan mediastinum.'),
      o('Pleura parietalis', false, 'Melapisi dinding rongga toraks, bukan permukaan paru.'),
      o('Fascia endothoracica', false, 'Lapisan jaringan ikat di antara dinding toraks dan pleura parietalis.'),
      o('Pleura diaphragmatica', false, 'Bagian pleura parietalis yang menutupi diafragma.'),
      o('Pericardium fibrosum', false, 'Lapisan luar kantung jantung, bukan pleura.'),
    ] },
  { difficulty: 'medium', text: 'Seorang pasien dengan cedera servikal tinggi mengalami kelumpuhan diafragma. Saraf yang mempersarafi diafragma berasal dari segmen...',
    options: [
      o('C3 sampai C5 (N. phrenicus)', true, 'N. phrenicus (C3, C4, C5) membawa persarafan motorik diafragma. Mnemonik: "C3, 4, 5 keeps the diaphragm alive".'),
      o('C1 sampai C2', false, 'Segmen ini tidak membentuk N. phrenicus.'),
      o('C6 sampai C8', false, 'Segmen ini terutama untuk pleksus brakialis ekstremitas atas.'),
      o('T1 sampai T4', false, 'Segmen torakal atas tidak mempersarafi diafragma.'),
      o('T9 sampai T12', false, 'Segmen torakal bawah mempersarafi otot dinding abdomen dan sensorik tepi diafragma, bukan motorik utamanya.'),
    ] },
  { difficulty: 'hard', text: 'Bifurkasio trakea (karina) pada orang dewasa dalam posisi berdiri terletak kira-kira setinggi...',
    options: [
      o('Angulus sterni, setinggi T4-T5', true, 'Karina terletak setinggi angulus sterni (Louis), kira-kira T4-T5, dan sedikit turun saat inspirasi.'),
      o('Cartilago cricoidea (C6)', false, 'Cartilago cricoidea menandai batas laring dengan trakea, jauh di atas karina.'),
      o('Incisura jugularis (T2-T3)', false, 'Terlalu tinggi; karina berada kira-kira dua ruas vertebra di bawahnya.'),
      o('Processus xiphoideus (T9)', false, 'Terlalu rendah, setinggi puncak hati dan dasar jantung.'),
      o('Vertebra T10', false, 'Hiatus esofagus diafragma ada di sekitar T10, bukan karina.'),
    ] },
  { difficulty: 'medium', text: 'Segmen bronkopulmoner adalah...',
    options: [
      o('Unit paru yang dilayani satu bronkus segmentalis dan cabang a. pulmonalis sendiri, dipisahkan septa jaringan ikat dari segmen lain', true, 'Karena terpisah secara fungsional, satu segmen dapat diangkat (segmentektomi) tanpa mengganggu segmen di sekitarnya.'),
      o('Seluruh satu lobus paru', false, 'Satu lobus terdiri atas beberapa segmen.'),
      o('Kumpulan alveolus yang bermuara ke satu bronkiolus terminal', false, 'Itu disebut asinus, unit yang jauh lebih kecil.'),
      o('Bagian paru di antara dua costa', false, 'Segmen tidak ditentukan oleh iga.'),
      o('Area pleura yang menempel pada diafragma', false, 'Itu bagian pleura, bukan unit parenkim paru.'),
    ] },
];
