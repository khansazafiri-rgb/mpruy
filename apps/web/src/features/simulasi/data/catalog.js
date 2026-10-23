// Katalog tindakan Simulasi Dokter (anamnesis, pemeriksaan fisik, penunjang,
// tatalaksana). Disalin apa adanya dari prototipe v3; format tiap baris
// dijelaskan di komentar setiap blok. Dibaca oleh engine.js.

export const CATTXT = {};

/* ANAMNESIS. Format: id|pertanyaan|nama singkat (untuk catatan)|tag|alasan klinis|flag|jawaban bawaan|catatan bawaan
   Tanpa flag "g" berarti pertanyaan spesifik: pemain harus memilih alasan. Jawaban bawaan = negatif ("Tidak, Dok." dan "nama (-)"). */
CATTXT.anam = `
# Keluhan utama dan riwayat penyakit sekarang
ku|Apa yang membuat Anda datang hari ini?|Keluhan utama||Keluhan utama menentukan arah seluruh anamnesis.|g|Saya kurang enak badan, Dok.|Keluhan utama: kurang enak badan
onset|Sejak kapan keluhan ini muncul? Mendadak atau bertahap?|Onset||Onset dan kecepatan perburukan membedakan proses akut, subakut, dan kronik.|g|Sudah beberapa hari, Dok.|Onset beberapa hari
lokasi|Di bagian mana rasanya, dan apakah menjalar?|Lokasi||Lokasi dan penjalaran menyempitkan organ asal keluhan.|g|Tidak ada yang menjalar, Dok.|Lokasi tidak khas
kualitas|Bagaimana sifat keluhannya, dan seberapa berat dari 1 sampai 10?|Sifat dan derajat||Sifat dan skala keparahan menunjukkan jenis dan beratnya gangguan.|g|Cukup mengganggu, Dok.|Derajat sedang
pemberat|Apa yang memperberat dan apa yang memperingan keluhan?|Faktor pemberat/peringan||Faktor yang memengaruhi keluhan membantu membedakan penyebab.|g|Tidak ada yang jelas, Dok.|Faktor pemberat/peringan tidak jelas
penyerta|Ada keluhan lain yang menyertai?|Gejala penyerta||Gejala penyerta sering menjadi petunjuk diagnosis.|g|Tidak ada yang lain, Dok.|Gejala penyerta (-)
progres|Dari awal sampai sekarang, keluhannya membaik, tetap, atau memburuk?|Perjalanan keluhan||Perjalanan penyakit menentukan urgensi dan kemungkinan komplikasi.|g|Rasanya tetap saja, Dok.|Perjalanan menetap
obat_coba|Sudah minum obat atau berobat ke tempat lain?|Pengobatan sebelumnya||Obat yang sudah dicoba dan responsnya menambah informasi, juga mencegah duplikasi terapi.|g|Belum, Dok.|Belum berobat/minum obat
harapan|Apa yang paling Anda khawatirkan dari keluhan ini?|Kekhawatiran pasien||Menggali kekhawatiran (ICE) membuat pasien merasa didengar dan mengarahkan edukasi.|g|Saya takut penyakitnya parah, Dok.|Kekhawatiran: takut penyakit berat
# Telaah sistem: umum
demam|Apakah ada demam?|Demam|infeksi|Demam menandakan infeksi atau inflamasi; polanya membantu menentukan penyebab.
menggigil|Apakah demamnya disertai menggigil?|Menggigil|infeksi|Menggigil berat mengarah ke infeksi bakteri atau bakteremia.
keringat_malam|Apakah sering berkeringat di malam hari?|Keringat malam|infeksi,onko|Keringat malam mengarahkan ke TB, keganasan, atau infeksi kronik.
bb_turun|Apakah berat badan turun tanpa sebab yang jelas?|Penurunan BB|infeksi,onko,metab|Penurunan berat badan tanpa sebab menandakan penyakit kronik, keganasan, atau gangguan metabolik.
lemas|Apakah badan terasa lemas atau cepat lelah?|Lemas/mudah lelah|hema,kardio,metab,infeksi|Lemas adalah gejala nonspesifik tetapi bisa menunjukkan anemia, gagal jantung, infeksi, atau gangguan metabolik.
nafsu|Apakah nafsu makan menurun?|Nafsu makan menurun|gi,infeksi|Penurunan nafsu makan sering menyertai infeksi, penyakit saluran cerna, dan penyakit kronik.
# Telaah sistem: pernapasan
batuk|Apakah ada batuk?|Batuk|resp,infeksi|Batuk adalah gejala utama penyakit saluran napas bawah.
dahak|Apakah batuknya berdahak? Seperti apa warna dahaknya?|Dahak|resp,infeksi|Dahak purulen mengarah ke infeksi bakteri, dahak berbusa merah muda ke edema paru.
hemoptisis|Apakah ada batuk darah?|Hemoptisis|resp,infeksi,onko|Batuk darah perlu menyingkirkan TB, keganasan, emboli paru, dan bronkiektasis.
sesak|Apakah napasnya terasa sesak?|Sesak napas|resp,kardio|Sesak adalah gejala kunci penyakit paru dan jantung.
sesak_aktivitas|Apakah sesak muncul saat beraktivitas?|Sesak saat aktivitas|resp,kardio|Sesak yang muncul saat aktivitas menandakan cadangan jantung atau paru berkurang.
ortopnea|Apakah lebih sesak saat berbaring, sampai perlu bantal lebih tinggi?|Ortopnea|kardio|Ortopnea adalah tanda khas gagal jantung.
pnd|Apakah pernah terbangun malam karena sesak?|PND|kardio|Paroxysmal nocturnal dyspnea sangat mendukung gagal jantung.
mengi|Apakah napasnya berbunyi mengi atau ngik-ngik?|Mengi|resp|Mengi menunjukkan penyempitan saluran napas seperti asma atau PPOK.
nyeri_pleuritik|Apakah nyeri dada muncul saat menarik napas dalam atau batuk?|Nyeri pleuritik|resp,infeksi|Nyeri pleuritik menunjukkan keterlibatan pleura, misalnya pneumonia atau emboli paru.
pilek|Apakah ada pilek atau hidung tersumbat?|Pilek/hidung tersumbat|tht,infeksi,resp|Pilek menunjukkan infeksi saluran napas atas, sering virus.
# Telaah sistem: kardiovaskular
nyeri_dada|Apakah ada nyeri dada seperti tertekan atau menjalar ke lengan atau rahang?|Nyeri dada khas jantung|kardio|Nyeri dada tipikal perlu ditanyakan untuk menyingkirkan sindrom koroner akut.
palpitasi|Apakah jantung terasa berdebar?|Palpitasi|kardio,metab|Berdebar bisa karena aritmia, gagal jantung, anemia, atau hipertiroid.
sinkop|Apakah pernah pingsan?|Sinkop|kardio,neuro|Sinkop menunjukkan gangguan perfusi otak karena jantung, pembuluh darah, atau saraf.
bengkak_kaki|Apakah kaki bengkak?|Edema tungkai|kardio,ren,obs|Edema tungkai terjadi pada gagal jantung, penyakit ginjal, hipoalbumin, dan kehamilan.
bengkak_wajah|Apakah wajah atau kelopak mata bengkak?|Edema wajah|ren,obs|Edema wajah khas untuk penyakit ginjal dan preeklampsia.
# Telaah sistem: saraf
sakit_kepala|Apakah ada sakit kepala?|Sakit kepala|neuro,obs,kardio|Sakit kepala bisa primer atau tanda hipertensi berat, infeksi SSP, dan preeklampsia.
pusing|Apakah ada pusing atau rasa melayang?|Pusing|neuro,kardio,hema|Pusing berkaitan dengan gangguan vestibular, tekanan darah, dan anemia.
pandangan_kabur|Apakah pandangan kabur atau berkunang-kunang?|Pandangan kabur|neuro,obs,kardio|Gangguan penglihatan adalah tanda gejala berat pada preeklampsia dan hipertensi.
kejang|Apakah pernah kejang?|Kejang|neuro,obs,infeksi|Kejang menunjukkan gangguan otak, infeksi SSP, atau eklampsia pada kehamilan.
kelemahan|Apakah ada kelemahan atau lumpuh pada satu sisi tubuh?|Kelemahan sesisi|neuro|Defisit motorik sesisi menunjukkan stroke.
kesemutan|Apakah ada kesemutan atau baal?|Parestesia|neuro,metab|Kesemutan terkait neuropati diabetik atau gangguan saraf lain.
# Telaah sistem: saluran cerna
mual|Apakah ada mual?|Mual|gi,abd,obs|Mual menyertai penyakit saluran cerna, hati, dan banyak kondisi sistemik.
muntah|Apakah ada muntah? Berapa kali dan isinya apa?|Muntah|gi,abd|Muntah menunjukkan iritasi saluran cerna, obstruksi, atau peningkatan tekanan intrakranial.
nyeri_ulu_hati|Apakah ada nyeri ulu hati?|Nyeri ulu hati|gi,obs,kardio|Nyeri epigastrium bisa dari lambung, hati, pankreas, atau jantung; pada kehamilan menandakan komplikasi hati.
diare|Apakah ada diare?|Diare|gi,infeksi|Diare menunjukkan infeksi saluran cerna atau penyebab nonifeksi.
bab_hitam|Apakah BAB berwarna hitam seperti aspal?|BAB hitam|gi|Melena menandakan perdarahan saluran cerna atas.
bab_darah|Apakah BAB disertai darah segar atau lendir?|BAB berdarah|gi,infeksi|Hematokezia mengarah ke kolitis, wasir, atau lesi usus bawah.
sembelit|Apakah ada sembelit atau sulit BAB?|Konstipasi|gi,abd|Konstipasi bisa menyertai obstruksi atau penyebab fungsional.
kuning|Apakah mata atau kulit tampak kuning?|Ikterus|gi,hema,infeksi|Ikterus mengarah ke penyakit hati, saluran empedu, atau hemolisis.
nyeri_menelan|Apakah nyeri saat menelan?|Odinofagia|tht,infeksi|Nyeri menelan khas untuk tonsilofaringitis dan abses di tenggorok.
kembung|Apakah perut terasa kembung atau begah?|Perut kembung|gi,abd|Kembung menyertai gangguan motilitas, obstruksi, dan asites.
# Telaah sistem: urogenital
bak_nyeri|Apakah nyeri atau perih saat buang air kecil?|Disuria|ren,infeksi|Disuria mengarah ke infeksi saluran kemih.
bak_darah|Apakah air kencing berdarah atau berwarna seperti teh?|Hematuria|ren|Hematuria menunjukkan batu, infeksi, atau penyakit glomerulus.
bak_sering|Apakah buang air kecil jadi lebih sering?|Poliuria/frekuensi|ren,metab,infeksi|Frekuensi meningkat pada ISK, diabetes, atau gangguan prostat.
bak_berkurang|Apakah jumlah air kencing berkurang?|Oliguria|ren,kardio|Oliguria menandakan hipoperfusi ginjal, dehidrasi, atau gagal ginjal.
haus|Apakah sering merasa sangat haus?|Polidipsia|metab|Polidipsia bersama poliuria mengarah ke diabetes melitus.
nyeri_pinggang|Apakah ada nyeri pinggang?|Nyeri pinggang|ren,abd|Nyeri pinggang menunjukkan penyakit ginjal atau batu saluran kemih.
# Telaah sistem: lainnya
nyeri_sendi|Apakah ada nyeri sendi?|Nyeri sendi|infeksi,metab|Nyeri sendi menunjukkan penyakit rematik, asam urat, atau infeksi virus.
nyeri_betis|Apakah ada nyeri atau bengkak pada satu betis?|Nyeri betis|hema,kardio|Nyeri betis unilateral menimbulkan kecurigaan trombosis vena dalam dan emboli paru.
ruam|Apakah ada ruam di kulit?|Ruam kulit|infeksi|Ruam menyertai infeksi virus, alergi obat, dan penyakit sistemik.
gatal|Apakah ada rasa gatal?|Gatal|infeksi,hema|Gatal bisa dari alergi, penyakit kulit, atau kolestasis.
nyeri_telinga|Apakah ada nyeri telinga?|Otalgia|tht,infeksi|Nyeri telinga bisa berasal dari telinga atau menjalar dari tenggorok (referred pain).
suara_serak|Apakah suara menjadi serak?|Suara serak|tht,infeksi|Suara serak menunjukkan laringitis atau gangguan pita suara.
mata_merah|Apakah mata merah atau berair?|Mata merah|infeksi|Mata merah menunjukkan konjungtivitis atau alergi.
# Khusus kehamilan
hpht|Kapan hari pertama haid terakhir, dan ini kehamilan keberapa?|HPHT dan paritas|obs|HPHT menentukan usia kehamilan, dasar semua keputusan obstetri.|only:spog|Kehamilan pertama, Dok.|HPHT dan paritas belum jelas
anc|Apakah rutin kontrol kehamilan? Pernah ada masalah?|Riwayat ANC|obs|Riwayat ANC menunjukkan tekanan darah dan hasil pemeriksaan sebelumnya.|only:spog|Rutin kontrol, Dok.|ANC rutin
gerak_janin|Apakah gerakan bayi masih aktif?|Gerak janin|obs|Gerak janin menilai kesejahteraan janin.|only:spog|Aktif, Dok.|Gerak janin aktif
ketuban|Apakah ada keluar darah atau air dari jalan lahir?|Perdarahan/air ketuban|obs|Perdarahan atau ketuban pecah mengubah penanganan obstetri.|only:spog|Tidak ada, Dok.|Perdarahan/air ketuban (-)
kontraksi|Apakah ada perut mulas atau kencang yang teratur?|Kontraksi|obs|Kontraksi teratur menunjukkan persalinan, termasuk persalinan prematur.|only:spog|Tidak ada, Dok.|Kontraksi (-)
riw_obs|Bagaimana riwayat kehamilan dan persalinan sebelumnya?|Riwayat obstetri|obs|Riwayat preeklampsia, keguguran, atau operasi caesar memengaruhi risiko.|only:spog|Ini kehamilan pertama, Dok.|G1P0A0
kb|Apakah menggunakan KB?|Riwayat KB|obs|Riwayat KB relevan untuk kemungkinan kehamilan dan konseling.|only:spog|Tidak, Dok.|KB (-)
# Khusus anak
imunisasi|Apakah imunisasinya sudah lengkap?|Imunisasi|anak,infeksi|Status imunisasi menentukan risiko difteri, campak, dan infeksi pneumokokus.|only:anak|Kata Mama sudah lengkap, Dok.|Imunisasi lengkap (kata ibu)
riw_lahir|Bagaimana riwayat kelahiran dan tumbuh kembangnya?|Riwayat kelahiran dan tumbuh kembang|anak|Riwayat perinatal dan tumbuh kembang melengkapi penilaian anak.|only:anak|Normal, Dok, kata Mama.|Riwayat lahir dan tumbuh kembang normal
sekolah|Apakah ada teman di sekolah yang sakit serupa?|Kontak teman sakit|anak,infeksi|Kontak dengan teman yang sakit menunjukkan sumber penularan.|only:anak|Nggak ada, Dok.|Kontak teman sakit (-)
makan_anak|Apakah anak masih mau makan dan minum?|Asupan makan/minum|anak,infeksi|Penurunan asupan menunjukkan beratnya penyakit dan risiko dehidrasi pada anak.|only:anak|Masih mau minum, Dok.|Asupan minum masih baik
# Riwayat penyakit dahulu
rpd_serupa|Apakah pernah mengalami keluhan yang sama sebelumnya?|Keluhan serupa dahulu||Kekambuhan menunjukkan penyakit kronik atau berulang.|g|Belum pernah, Dok.|Keluhan serupa sebelumnya (-)
rpd_ht|Apakah ada riwayat darah tinggi?|Hipertensi|kardio,ren,obs|Hipertensi adalah faktor risiko penyakit jantung, ginjal, dan stroke.
rpd_dm|Apakah ada riwayat kencing manis?|DM|metab,infeksi,kardio|Diabetes memengaruhi risiko infeksi, komplikasi, dan pilihan terapi.
rpd_jantung|Apakah ada riwayat penyakit jantung?|Penyakit jantung|kardio|Riwayat penyakit jantung mengubah kemungkinan diagnosis sesak atau nyeri dada.
rpd_paru|Apakah ada riwayat penyakit paru kronik?|Penyakit paru kronik|resp|Penyakit paru kronik meningkatkan kemungkinan eksaserbasi atau infeksi.
rpd_tb|Apakah pernah menderita TB atau minum obat TB?|Riwayat TB|resp,infeksi|Riwayat TB penting pada batuk, demam, dan penurunan berat badan.
rpd_asma|Apakah ada asma atau alergi saluran napas?|Asma/atopi|resp,anak|Riwayat atopi membantu membedakan asma dari infeksi.
rpd_ginjal|Apakah ada riwayat penyakit ginjal?|Penyakit ginjal|ren,kardio,obs|Penyakit ginjal memengaruhi dosis obat dan retensi cairan.
rpd_hati|Apakah ada riwayat sakit kuning atau penyakit hati?|Penyakit hati|gi,infeksi|Penyakit hati relevan untuk ikterus dan pemilihan obat.
rpd_stroke|Apakah pernah mengalami stroke?|Stroke|neuro,kardio|Riwayat stroke memengaruhi risiko vaskular dan terapi.
rpd_kanker|Apakah ada riwayat kanker?|Kanker|onko|Riwayat keganasan mengarahkan ke metastasis atau efek terapi.
rpd_operasi|Apakah pernah dirawat di rumah sakit atau dioperasi?|Rawat inap/operasi|abd|Riwayat operasi memengaruhi diagnosis banding nyeri perut dan risiko tindakan.
rpd_trauma|Apakah pernah mengalami cedera atau kecelakaan belakangan ini?|Trauma|abd,neuro|Trauma menyingkirkan penyebab mekanik dan perdarahan.
rpd_transfusi|Apakah pernah menerima transfusi darah?|Transfusi|hema,infeksi|Transfusi berkaitan dengan risiko infeksi dan penyakit darah.
# Obat dan alergi
obat_rutin|Obat apa yang rutin diminum, termasuk jamu dan suplemen?|Obat rutin||Obat rutin menunjukkan penyakit kronik dan interaksi obat.|g|Tidak ada, Dok.|Obat rutin (-)
kepatuhan|Apakah obat dari dokter diminum teratur?|Kepatuhan obat|kardio,metab|Kepatuhan obat menjelaskan dekompensasi penyakit kronik.|g|Teratur, Dok.|Minum obat teratur
obat_nsaid|Apakah sering minum obat pereda nyeri atau steroid?|Obat NSAID/steroid|gi,ren|NSAID dan steroid memengaruhi lambung, ginjal, dan tekanan darah.
alergi|Apakah ada alergi obat atau makanan?|Alergi||Alergi harus diketahui sebelum meresepkan obat.|g|Tidak ada alergi, Dok.|Alergi obat/makanan (-)
# Riwayat keluarga
rk_umum|Apakah ada penyakit tertentu yang diderita keluarga?|Riwayat keluarga||Riwayat keluarga mengarahkan ke penyakit herediter dan menular.|g|Tidak ada, Dok.|Riwayat keluarga (-)
rk_ht|Apakah ada keluarga dengan darah tinggi, termasuk saat hamil?|Hipertensi keluarga|kardio,obs|Riwayat hipertensi keluarga meningkatkan risiko, termasuk preeklampsia.
rk_dm|Apakah ada keluarga dengan kencing manis?|DM keluarga|metab|Diabetes bersifat familial.
rk_jantung|Apakah ada keluarga dengan penyakit jantung atau stroke?|Jantung/stroke keluarga|kardio,neuro|Riwayat penyakit jantung dini dalam keluarga meningkatkan risiko.
rk_tb|Apakah ada keluarga yang menderita TB?|TB keluarga|resp,infeksi|Kontak serumah dengan TB meningkatkan kecurigaan TB.
rk_kanker|Apakah ada keluarga dengan kanker?|Kanker keluarga|onko|Riwayat kanker keluarga mengarahkan skrining.
rk_atopi|Apakah ada keluarga dengan asma atau alergi?|Atopi keluarga|resp,anak|Atopi diturunkan dan membantu menilai asma.
# Riwayat sosial dan kebiasaan
pekerjaan|Apa pekerjaan Anda?|Pekerjaan||Pekerjaan menentukan paparan dan dampak penyakit terhadap fungsi.|g|Di rumah saja, Dok.|Pekerjaan: tidak khusus
rumah|Tinggal bersama siapa, dan bagaimana kondisi rumahnya?|Kondisi tempat tinggal||Lingkungan tinggal memengaruhi penularan dan dukungan perawatan.|g|Tinggal bersama keluarga, Dok.|Tinggal bersama keluarga
kebiasaan|Bagaimana pola makan, tidur, dan aktivitas sehari-hari?|Pola hidup||Pola hidup menjadi dasar edukasi dan faktor risiko.|g|Biasa saja, Dok.|Pola hidup tidak khusus
merokok|Apakah merokok? Sudah berapa lama dan berapa batang sehari?|Merokok|resp,kardio,onko|Merokok adalah faktor risiko utama penyakit paru dan jantung.
alkohol|Apakah minum alkohol?|Alkohol|gi,neuro|Alkohol relevan untuk penyakit hati, pankreas, dan saraf.
kontak_tb|Apakah ada kontak dengan penderita TB atau batuk lama?|Kontak TB|resp,infeksi|Kontak TB meningkatkan kemungkinan TB.
kontak_sakit|Apakah ada orang di sekitar yang sakit serupa?|Kontak sakit|infeksi|Kontak sakit menunjukkan penularan.
perjalanan|Apakah baru bepergian ke daerah lain atau luar negeri?|Riwayat bepergian|infeksi|Riwayat bepergian relevan untuk malaria, dengue, tifoid, dan infeksi lain.
pajanan|Apakah sering terpapar debu, asap, atau bahan kimia?|Pajanan lingkungan|resp|Pajanan kerja dan lingkungan memengaruhi penyakit paru.
garam|Apakah suka makanan asin atau berlemak?|Pola makan asin/berlemak|kardio,ren|Asupan garam tinggi berkaitan dengan hipertensi dan gagal jantung.
`;

/* PEMERIKSAAN FISIK. Format: id|nama pemeriksaan|temuan normal (bawaan)|catatan bawaan|tag|alasan klinis|flag
   Semua pemeriksaan fisik spesifik (wajib memilih alasan), kecuali bertanda g. */
CATTXT.fisik = `
# Pemeriksaan umum
ku_gcs|Keadaan umum dan kesadaran (GCS)|Tampak sakit ringan, kompos mentis, GCS 15.|KU sakit ringan, CM, GCS 15||Keadaan umum dan kesadaran adalah penilaian awal setiap pasien.|g
dehidrasi|Tanda dehidrasi (turgor, mukosa, mata)|Turgor baik, mukosa lembap, mata tidak cekung.|Dehidrasi (-)|gi,infeksi,anak|Penilaian dehidrasi menentukan kebutuhan cairan.
kulit|Kulit: pucat, ikterus, sianosis, ruam|Tidak pucat, tidak ikterik, tidak sianosis, tidak ada ruam.|Kulit: pucat/ikterik/sianosis/ruam (-)|hema,gi,infeksi|Kulit memberi petunjuk anemia, penyakit hati, hipoksia, dan infeksi sistemik.
# Kepala dan leher
mata_konj|Mata: konjungtiva|Konjungtiva tidak pucat.|Konjungtiva anemis (-)|hema|Konjungtiva pucat menandakan anemia.
sklera|Mata: sklera|Sklera tidak ikterik.|Sklera ikterik (-)|gi,hema|Ikterus sklera mengarah ke penyakit hepatobilier atau hemolisis.
pupil|Mata: pupil dan refleks cahaya|Pupil bulat isokor 3 mm, refleks cahaya (+).|Pupil isokor, RC (+)|neuro|Pupil dan refleks cahaya menilai fungsi saraf dan batang otak.
telinga|Telinga: liang dan membran timpani|Liang bersih, membran timpani utuh dan tidak hiperemis.|Telinga: dalam batas normal|tht,infeksi|Telinga diperiksa pada nyeri telinga dan infeksi tenggorok yang menjalar.
hidung|Hidung: mukosa dan sekret|Mukosa tidak hiperemis, sekret (-).|Hidung: dalam batas normal|tht,infeksi|Hidung dinilai pada pilek, sinusitis, dan alergi.
tenggorok|Tenggorok: faring dan tonsil|Faring tidak hiperemis, tonsil T1-T1 tenang.|Faring tenang, tonsil T1-T1|tht,infeksi|Pemeriksaan faring dan tonsil menilai tonsilofaringitis, difteri, dan abses.
mulut|Mulut: mukosa, lidah, gigi|Mukosa lembap, lidah tidak kotor, gigi dalam batas normal.|Mulut: dalam batas normal|gi,infeksi|Mulut memberi petunjuk dehidrasi, infeksi, dan gizi.
leher_kgb|Leher: kelenjar getah bening|KGB leher tidak teraba membesar.|KGB leher tidak teraba|infeksi,onko,tht|Pembesaran KGB menunjukkan infeksi lokal atau keganasan.
jvp|Leher: tekanan vena jugularis (JVP)|JVP tidak meningkat.|JVP normal|kardio|JVP meningkat menandakan kelebihan volume atau gagal jantung kanan.
tiroid|Leher: kelenjar tiroid|Tiroid tidak teraba membesar.|Tiroid tidak membesar|metab|Pembesaran tiroid menunjukkan gangguan tiroid.
kaku_kuduk|Leher: kaku kuduk|Kaku kuduk (-).|Kaku kuduk (-)|neuro,infeksi|Kaku kuduk menunjukkan iritasi meningen.
# Toraks
paru_inspeksi|Paru: inspeksi (bentuk dada, retraksi, gerak napas)|Dada simetris, retraksi (-), frekuensi napas normal.|Paru inspeksi: simetris, retraksi (-)|resp,kardio|Inspeksi menilai kerja napas dan asimetri gerak dada.
paru_palpasi|Paru: palpasi (fremitus taktil)|Fremitus taktil simetris.|Fremitus simetris|resp|Fremitus berubah pada konsolidasi dan efusi.
paru_perkusi|Paru: perkusi|Sonor di kedua lapang paru.|Perkusi paru sonor bilateral|resp|Perkusi membedakan konsolidasi (redup), efusi, dan pneumotoraks (hipersonor).
paru_auskul|Paru: auskultasi|Suara napas vesikuler, ronki (-), wheezing (-).|Auskultasi paru: vesikuler, ronki (-), wheezing (-)|resp,kardio|Auskultasi mendeteksi ronki, mengi, dan suara napas bronkial.
jantung_ictus|Jantung: palpasi iktus kordis|Iktus teraba di ICS V linea midklavikula kiri, tidak bergeser.|Iktus tidak bergeser|kardio|Pergeseran iktus menunjukkan pembesaran jantung.
jantung|Jantung: auskultasi (bunyi jantung, murmur, gallop)|BJ I-II reguler, murmur (-), gallop (-).|Jantung: BJ I-II reguler, murmur/gallop (-)|kardio|Auskultasi menilai irama, murmur katup, dan gallop gagal jantung.
# Abdomen
abd_inspeksi|Abdomen: inspeksi|Perut datar, simetris, tidak ada distensi atau bekas luka.|Abdomen datar, distensi (-)|gi,abd|Inspeksi menilai distensi, massa, dan bekas operasi.
abd_auskul|Abdomen: auskultasi bising usus|Bising usus normal.|Bising usus normal|gi,abd|Bising usus menurun pada ileus atau peritonitis, meningkat pada obstruksi dan diare.
abd_perkusi|Abdomen: perkusi|Timpani, nyeri ketok (-).|Perkusi abdomen timpani|gi,abd|Perkusi menilai udara, cairan, dan nyeri ketok.
abd_palpasi|Abdomen: palpasi (nyeri tekan, defans)|Supel, nyeri tekan (-), defans (-).|Abdomen supel, nyeri tekan (-)|gi,abd|Palpasi menentukan lokasi nyeri dan tanda iritasi peritoneum.
abd_hepar|Abdomen: palpasi hepar|Hepar tidak teraba.|Hepar tidak teraba|gi,kardio|Hepatomegali menunjukkan kongesti, hepatitis, atau infiltrasi.
abd_lien|Abdomen: palpasi lien|Lien tidak teraba.|Lien tidak teraba|hema,infeksi|Splenomegali menunjukkan infeksi, hemolisis, atau penyakit darah.
abd_asites|Abdomen: shifting dullness (asites)|Shifting dullness (-).|Asites (-)|gi,kardio,ren|Asites menunjukkan penyakit hati, jantung, atau ginjal.
abd_cva|Nyeri ketok sudut kostovertebra|Nyeri ketok CVA (-).|Nyeri ketok CVA (-)|ren|Nyeri ketok CVA menunjukkan pielonefritis atau batu ginjal.
abd_mcburney|Nyeri tekan titik McBurney|Nyeri tekan McBurney (-).|McBurney (-)|abd,gi|Nyeri tekan McBurney khas apendisitis.
abd_rebound|Nyeri lepas (rebound tenderness)|Nyeri lepas (-).|Rebound (-)|abd,gi|Nyeri lepas menunjukkan iritasi peritoneum.
abd_rovsing|Tanda Rovsing|Rovsing (-).|Rovsing (-)|abd,gi|Rovsing positif mendukung apendisitis.
abd_psoas|Tanda psoas|Psoas sign (-).|Psoas (-)|abd,gi|Psoas positif menunjukkan apendiks retrosekal atau abses psoas.
abd_obturator|Tanda obturator|Obturator sign (-).|Obturator (-)|abd,gi|Obturator positif menunjukkan apendiks pelvik.
abd_murphy|Tanda Murphy|Murphy sign (-).|Murphy (-)|abd,gi|Murphy positif mendukung kolesistitis.
hernia|Pemeriksaan hernia di lipat paha|Benjolan di lipat paha (-).|Hernia (-)|abd,gi|Hernia terjepit adalah penyebab nyeri perut akut yang tidak boleh terlewat.
rt|Colok dubur (rectal toucher)|Tonus sfingter normal, ampula tidak kolaps, nyeri tekan (-), sarung tangan: feses coklat.|RT: tonus normal, nyeri (-), darah (-)|gi,abd|Colok dubur menilai massa, nyeri pelvik, dan darah.
# Obstetri dan ginekologi
obst|Obstetri: tinggi fundus, Leopold, denyut jantung janin|TFU sesuai usia kehamilan, letak kepala, DJJ 140x/menit reguler.|TFU sesuai UK, letak kepala, DJJ 140x/menit|obs|Pemeriksaan obstetri menilai pertumbuhan dan kesejahteraan janin.|only:spog
vt|Pemeriksaan dalam (vaginal toucher)|Portio tertutup, pembukaan (-), ketuban utuh.|VT: pembukaan (-), ketuban utuh|obs|Pemeriksaan dalam menilai pembukaan serviks dan kemajuan persalinan.|only:spog
# Ekstremitas dan saraf
edema|Ekstremitas: edema, akral, dan CRT|Tidak ada edema, akral hangat, CRT <2 detik.|Edema (-), akral hangat, CRT <2 detik|kardio,ren,obs|Edema dan perfusi perifer menilai kelebihan cairan dan syok.
nadi_perifer|Ekstremitas: pulsasi nadi perifer|Nadi perifer teraba simetris.|Pulsasi nadi perifer teraba|kardio|Pulsasi menilai perfusi dan penyakit arteri.
clubbing|Jari tabuh (clubbing)|Clubbing (-).|Clubbing (-)|resp,onko|Jari tabuh berkaitan dengan penyakit paru kronik dan keganasan.
refleks_fis|Refleks fisiologis|Refleks fisiologis normal (+2).|Refleks fisiologis normal|neuro,obs|Refleks yang meningkat adalah tanda gejala berat pada preeklampsia.
refleks_pat|Refleks patologis|Refleks patologis (-).|Refleks patologis (-)|neuro|Refleks patologis menunjukkan lesi traktus kortikospinal.
motorik|Kekuatan motorik|Kekuatan otot 5 di keempat ekstremitas.|Motorik 5/5 keempat ekstremitas|neuro|Kekuatan otot menilai defisit motorik seperti pada stroke.
sensorik|Sensibilitas|Sensibilitas raba dan nyeri normal.|Sensibilitas normal|neuro,metab|Sensibilitas menilai neuropati dan lesi saraf.
nervus|Saraf kranial|Saraf kranial dalam batas normal.|Nervus kranialis normal|neuro|Saraf kranial dinilai pada keluhan neurologis dan sakit kepala.
meningeal|Tanda rangsang meningeal (Brudzinski dan Kernig)|Brudzinski dan Kernig (-).|Rangsang meningeal (-)|neuro,infeksi|Tanda meningeal menyingkirkan meningitis.
kgb_lain|KGB aksila dan inguinal|KGB aksila dan inguinal tidak teraba.|KGB aksila/inguinal tidak teraba|infeksi,onko|Pembesaran KGB generalisata menunjukkan penyakit sistemik.
`;

/* Pemeriksaan fisik yang dilaporkan suster lewat kartu.
   Format: id|nama|judul kartu|baris (nama=nilai dipisah titik koma)|tag|alasan|flag|sub|ucapan */
CATTXT.fisik_card = `
# Pemeriksaan umum
vital|Tanda vital lengkap (tekanan darah, nadi, napas, suhu, SpO2)|Tanda vital|Tekanan darah=120/80 mmHg;Nadi=80 x/menit;Napas=18 x/menit;Suhu=36,7 C;SpO2=98%||Tanda vital adalah dasar penilaian stabilitas pasien.|g|Suster Ani|Ini hasil tanda vitalnya, Dok.
antro|Berat badan dan tinggi badan|Antropometri|Berat badan=60 kg;Tinggi badan=160 cm;IMT=23,4||Antropometri menilai status gizi dan menjadi dasar dosis obat.|g|Suster Ani|Ini hasilnya, Dok.
`;

/* PEMERIKSAAN PENUNJANG. Format: id|nama|judul kartu|baris (nama=nilai; dipisah titik koma)|tag|alasan klinis|flag|sub|ucapan suster
   Hasil bawaan = normal. Flag "inv" = mahal/invasif: dinilai "tidak tepat" bila tidak ada indikasi di kasus itu. */
CATTXT.penunjang = `
# Darah rutin dan inflamasi
dl|Darah lengkap|Darah lengkap|Hemoglobin=13,5 g/dL;Leukosit=7.500 /uL;Trombosit=250.000 /uL;Hematokrit=41%|infeksi,hema,abd|Darah lengkap menilai infeksi, anemia, dan trombosit.||Laboratorium|Hasil laboratoriumnya sudah keluar, Dok.
hitung_jenis|Hitung jenis leukosit|Hitung jenis|Neutrofil=60%;Limfosit=30%;Monosit=6%;Eosinofil=3%;Basofil=1%|infeksi,hema|Hitung jenis membedakan infeksi bakteri, virus, dan alergi.||Laboratorium|Hasilnya sudah ada, Dok.
led|Laju endap darah (LED)|LED|LED=12 mm/jam|infeksi,onko|LED adalah penanda inflamasi nonspesifik.||Laboratorium|Hasilnya sudah ada, Dok.
crp|CRP|CRP|CRP=3 mg/L|infeksi,abd|CRP menilai derajat inflamasi dan membantu membedakan infeksi bakteri.||Laboratorium|Ini hasilnya, Dok.
pct|Prokalsitonin|Prokalsitonin|Prokalsitonin=0,05 ng/mL|infeksi|Prokalsitonin membantu menilai infeksi bakteri berat dan sepsis.|inv|Laboratorium|Hasilnya sudah ada, Dok.
ptapt|PT dan aPTT|Hemostasis|PT=12 detik;aPTT=30 detik|hema,obs|Hemostasis dinilai pada perdarahan, sebelum tindakan, dan gangguan koagulasi.||Laboratorium|Hasilnya sudah ada, Dok.
gol_darah|Golongan darah dan rhesus|Golongan darah|Golongan darah=O;Rhesus=positif|hema,obs|Golongan darah disiapkan sebelum operasi atau persalinan.||Laboratorium|Hasilnya sudah ada, Dok.
# Kimia darah
gds|Gula darah sewaktu|Gula darah sewaktu|GDS=105 mg/dL|metab,infeksi|Gula darah menyingkirkan diabetes dan hipoglikemia.||Laboratorium|Ini hasilnya, Dok.
hba1c|HbA1c|HbA1c|HbA1c=5,4%|metab|HbA1c menilai kontrol gula darah 3 bulan terakhir.||Laboratorium|Hasilnya sudah ada, Dok.
lipid|Profil lipid|Profil lipid|Kolesterol total=180 mg/dL;LDL=110 mg/dL;HDL=50 mg/dL;Trigliserida=120 mg/dL|kardio,metab|Profil lipid menilai risiko kardiovaskular.||Laboratorium|Hasilnya sudah ada, Dok.
ureum|Ureum dan kreatinin|Fungsi ginjal|Ureum=24 mg/dL;Kreatinin=0,9 mg/dL|ren,kardio,obs|Fungsi ginjal menilai perfusi, dosis obat, dan komplikasi ginjal.||Laboratorium|Hasilnya sudah ada, Dok.
elektrolit|Elektrolit (Na, K, Cl)|Elektrolit|Natrium=140 mmol/L;Kalium=4,0 mmol/L;Klorida=104 mmol/L|ren,kardio,gi|Elektrolit menilai gangguan akibat dehidrasi, diuretik, dan penyakit ginjal.||Laboratorium|Hasilnya sudah ada, Dok.
sgot|SGOT dan SGPT|Fungsi hati|SGOT=24 U/L;SGPT=22 U/L|gi,obs,infeksi|Enzim hati menilai kerusakan sel hati, termasuk pada preeklampsia berat dan hepatitis.||Laboratorium|Hasilnya sudah ada, Dok.
bilirubin|Bilirubin total dan direk|Bilirubin|Bilirubin total=0,8 mg/dL;Bilirubin direk=0,2 mg/dL|gi,hema|Bilirubin menilai ikterus dan penyakit hepatobilier.||Laboratorium|Hasilnya sudah ada, Dok.
albumin|Albumin|Albumin|Albumin=4,2 g/dL|gi,ren,kardio|Albumin rendah berkaitan dengan edema, penyakit hati, dan sindrom nefrotik.||Laboratorium|Hasilnya sudah ada, Dok.
asam_urat|Asam urat|Asam urat|Asam urat=5,2 mg/dL|metab,ren|Asam urat dinilai pada nyeri sendi dan batu ginjal.||Laboratorium|Hasilnya sudah ada, Dok.
amilase|Amilase dan lipase|Pankreas|Amilase=60 U/L;Lipase=35 U/L|gi,abd|Amilase dan lipase menilai pankreatitis.||Laboratorium|Hasilnya sudah ada, Dok.
ags|Analisis gas darah|Analisis gas darah|pH=7,40;pCO2=40 mmHg;pO2=95 mmHg;HCO3=24 mmol/L|resp,kardio,metab|Analisis gas darah menilai oksigenasi dan keseimbangan asam-basa pada pasien berat.|inv|Laboratorium|Hasilnya sudah ada, Dok.
laktat|Laktat darah|Laktat|Laktat=1,1 mmol/L|infeksi,kardio|Laktat menilai hipoperfusi dan derajat sepsis.|inv|Laboratorium|Hasilnya sudah ada, Dok.
d_dimer|D-dimer|D-dimer|D-dimer=0,3 ug/mL|resp,kardio,hema|D-dimer membantu menyingkirkan emboli paru dan trombosis vena.||Laboratorium|Hasilnya sudah ada, Dok.
troponin|Troponin|Troponin|Troponin I=0,01 ng/mL|kardio|Troponin menyingkirkan kerusakan miokard pada nyeri dada atau sesak.||Laboratorium|Hasilnya sudah ada, Dok.
ntprobnp|NT-proBNP|NT-proBNP|NT-proBNP=90 pg/mL|kardio|NT-proBNP membantu menegakkan atau menyingkirkan gagal jantung.||Laboratorium|Hasilnya sudah ada, Dok.
# Mikrobiologi dan serologi
sputum|Gram dan BTA sputum|Sputum|Gram=Flora normal;BTA=Negatif|resp,infeksi|Pewarnaan Gram dan BTA menilai penyebab bakteri dan TB.||Laboratorium|Hasilnya sudah ada, Dok.
tcm|TCM (tes cepat molekuler) TB|TCM TB|MTB=Tidak terdeteksi|resp,infeksi|TCM mendeteksi Mycobacterium tuberculosis dan resistensi rifampisin.||Laboratorium|Hasilnya sudah ada, Dok.
kultur_sputum|Kultur sputum|Kultur sputum|Hasil=Flora normal|resp,infeksi|Kultur sputum mencari kuman penyebab dan resistensi.|inv|Laboratorium|Hasilnya sudah ada, Dok.
kultur_darah|Kultur darah|Kultur darah|Hasil=Tidak ada pertumbuhan kuman|infeksi|Kultur darah untuk bakteremia dan sepsis, terutama pada pasien berat.|inv|Laboratorium|Hasilnya sudah ada, Dok.
swab|Rapid test strep dari swab tenggorok|Rapid strep test|Streptococcus grup A=Negatif|tht,infeksi|Rapid test membantu memastikan penyebab streptokokus pada faringitis.||Laboratorium|Hasilnya sudah ada, Dok.
swab_kultur|Kultur apus tenggorok dan tes difteri|Kultur apus tenggorok|Hasil=Flora normal;Corynebacterium diphtheriae=Tidak ditemukan|tht,infeksi|Kultur apus menyingkirkan difteri dan memastikan penyebab bakteri.||Laboratorium|Hasilnya sudah ada, Dok.
ns1|NS1 dan serologi dengue|Dengue|NS1=Negatif;IgM=Negatif;IgG=Negatif|infeksi,hema|Tes dengue untuk demam akut dengan trombositopenia.||Laboratorium|Hasilnya sudah ada, Dok.
tifoid|Tes tifoid (Tubex atau Widal)|Tifoid|Tubex=Negatif (skor 2)|infeksi,gi|Tes tifoid pada demam lebih dari tiga hari disertai keluhan saluran cerna.||Laboratorium|Hasilnya sudah ada, Dok.
malaria|Apusan darah tepi atau tes cepat malaria|Malaria|Plasmodium=Tidak ditemukan|infeksi,hema|Malaria perlu disingkirkan pada demam dengan riwayat bepergian ke daerah endemis.||Laboratorium|Hasilnya sudah ada, Dok.
hiv|Tes HIV|HIV|Anti-HIV=Non-reaktif|infeksi|Tes HIV dilakukan dengan konseling dan indikasi, misalnya TB atau infeksi oportunistik.||Laboratorium|Hasilnya sudah ada, Dok.
hbsag|HBsAg|HBsAg|HBsAg=Non-reaktif|gi,infeksi,obs|HBsAg menyaring hepatitis B, termasuk pada ibu hamil.||Laboratorium|Hasilnya sudah ada, Dok.
# Urin dan tinja
urin|Urin lengkap (dipstik dan sedimen)|Urin dipstik|Protein=Negatif;Glukosa=Negatif;Leukosit=Negatif;Darah=Negatif|ren,obs,infeksi,abd|Urin menilai proteinuria, infeksi saluran kemih, dan batu.||Laboratorium|Hasil dipstik sudah ada, Dok.
kultur_urin|Kultur urin|Kultur urin|Hasil=Tidak ada pertumbuhan kuman|ren,infeksi|Kultur urin memastikan penyebab ISK.|inv|Laboratorium|Hasilnya sudah ada, Dok.
tes_hamil|Tes kehamilan (hCG)|Tes hCG|hCG urin=Negatif|obs,abd|Tes hamil menyingkirkan kehamilan pada perempuan usia subur dengan nyeri perut.||Laboratorium|Hasilnya sudah ada, Dok.
feses|Pemeriksaan feses rutin|Feses rutin|Konsistensi=Lunak;Leukosit=0-1;Eritrosit=0-1;Parasit=Tidak ditemukan|gi,infeksi|Feses rutin pada diare dan nyeri perut bila ada kecurigaan infeksi usus.||Laboratorium|Hasilnya sudah ada, Dok.
# Pencitraan dan fungsi
ronsen|Foto toraks PA|Ronsen toraks PA|Jantung=Ukuran normal;Paru=Tidak ada infiltrat;Pleura=Normal|resp,kardio,infeksi|Foto toraks menilai parenkim paru, ukuran jantung, dan pleura.||Radiologi|Laporan radiologinya sudah masuk, Dok.
ronsen_abd|Foto polos abdomen (BOF)|Foto polos abdomen|Kesan=Pola gas usus normal, tidak ada udara bebas|abd,gi,ren|Foto polos abdomen untuk obstruksi, perforasi, dan batu radiopak.||Radiologi|Laporan radiologinya sudah masuk, Dok.
usg_abd|USG abdomen|USG abdomen|Kesan=Tidak tampak kelainan pada organ intraabdomen|abd,gi,ren|USG abdomen untuk nyeri perut, apendiks, empedu, ginjal, dan cairan bebas.||Radiologi|Hasil USG sudah ada, Dok.
usg_obs|USG obstetri|USG obstetri|Janin=Tunggal, hidup, letak kepala;Taksiran berat=Sesuai usia kehamilan;Cairan ketuban=Cukup|obs|USG menilai pertumbuhan janin, plasenta, dan cairan ketuban.|only:spog|Poli kandungan|USG sudah selesai, Dok.
ctg|Kardiotokografi (CTG)|CTG|Baseline=140x/menit;Variabilitas=Baik;Kesan=Reaktif|obs|CTG menilai kesejahteraan janin.|only:spog|Poli kandungan|CTG sudah terpasang, Dok.
ekg|EKG 12 sadapan|EKG|Irama=Sinus, 80x/menit;Kesan=Normal|kardio|EKG menilai irama, iskemia, dan hipertrofi ventrikel.||Ruang tindakan|EKG sudah direkam, Dok.
echo|Ekokardiografi|Ekokardiografi|LVEF=60%;Ruang jantung=Ukuran normal;Katup=Tidak ada kelainan bermakna|kardio|Ekokardiografi memastikan fungsi ventrikel dan kelainan katup.||Poli jantung|Hasil ekokardiografinya sudah ada, Dok.
spirometri|Spirometri|Spirometri|FEV1/FVC=0,82;Kesan=Normal|resp|Spirometri menilai obstruksi saluran napas pada asma dan PPOK, dilakukan saat stabil.||Poli paru|Hasil spirometrinya sudah ada, Dok.
ct_kepala|CT scan kepala|CT scan kepala|Kesan=Tidak tampak kelainan intrakranial|neuro|CT kepala untuk stroke, perdarahan, dan lesi intrakranial.|inv|Radiologi|Laporan CT sudah masuk, Dok.
ct_toraks|CT scan toraks|CT scan toraks|Kesan=Tidak tampak kelainan parenkim paru|resp|CT toraks untuk kelainan paru yang tidak jelas, emboli paru, atau keganasan.|inv|Radiologi|Laporan CT sudah masuk, Dok.
ct_abd|CT scan abdomen|CT scan abdomen|Kesan=Tidak tampak kelainan intraabdomen|abd,gi,ren|CT abdomen untuk nyeri perut yang tidak jelas setelah USG atau pada kecurigaan komplikasi.|inv|Radiologi|Laporan CT sudah masuk, Dok.
mri|MRI|MRI|Kesan=Tidak tampak kelainan|neuro|MRI untuk kelainan jaringan lunak dan saraf yang tidak terlihat pada CT.|inv|Radiologi|Laporan MRI sudah masuk, Dok.
endoskopi|Endoskopi saluran cerna atas|Endoskopi|Kesan=Mukosa lambung dan duodenum normal|gi|Endoskopi untuk perdarahan saluran cerna atas dan dispepsia dengan tanda bahaya.|inv|Ruang endoskopi|Hasil endoskopinya sudah ada, Dok.
kolonoskopi|Kolonoskopi|Kolonoskopi|Kesan=Mukosa kolon normal|gi|Kolonoskopi untuk perdarahan bawah, perubahan kebiasaan BAB, dan skrining.|inv|Ruang endoskopi|Hasil kolonoskopinya sudah ada, Dok.
angiografi|Angiografi koroner|Angiografi koroner|Kesan=Arteri koroner normal|kardio|Angiografi koroner untuk sindrom koroner akut dengan indikasi intervensi.|inv|Ruang kateterisasi|Hasil angiografinya sudah ada, Dok.
biopsi|Biopsi jaringan|Biopsi|Hasil=Tidak ditemukan keganasan|onko|Biopsi untuk memastikan keganasan atau kelainan jaringan yang tidak jelas.|inv|Patologi anatomi|Hasil biopsinya sudah ada, Dok.
`;

/* TATALAKSANA. Format: id|nama tindakan|siapa menjawab (sus/pas)|ucapan|catatan P|tag|alasan klinis|flag|sub
   Tindakan obat dan prosedur wajib dengan alasan; rencana (edukasi, rawat, pulang) bertanda g. */
CATTXT.tata = `
# Suportif dan monitoring
oksigen|Beri oksigen|sus|Baik, Dok. Oksigen sudah terpasang, saturasinya saya pantau.|Oksigen dipasang, SpO2 dipantau|resp,kardio,infeksi|Oksigen diberikan bila ada hipoksemia atau sesak berat; bukan untuk semua pasien.
posisi|Atur posisi pasien (semi-Fowler atau miring kiri)|sus|Baik, Dok. Posisi pasien sudah diatur.|Posisi pasien diatur|resp,kardio,obs|Posisi tegak membantu pasien sesak; miring kiri pada kehamilan mengurangi kompresi vena cava.|g
monitor|Pasang pemantauan tanda vital berkala|sus|Baik, Dok. Tanda vital saya pantau setiap interval yang ditentukan.|Pemantauan tanda vital berkala|umum|Pemantauan berkala mendeteksi perburukan lebih awal.|g
infus_rutin|Pasang jalur infus dengan cairan rumatan|sus|Baik, Dok. Infus sudah terpasang.|Infus kristaloid rumatan terpasang|abd,gi,infeksi,obs|Jalur infus dipasang untuk akses obat dan cairan, terutama pada pasien puasa atau akan dioperasi.
infus_bolus|Beri cairan kristaloid cepat (bolus)|sus|Baik, Dok. Cairan diberikan cepat sesuai instruksi.|Bolus kristaloid|gi,infeksi,abd|Bolus cairan untuk syok atau dehidrasi berat; berbahaya pada gagal jantung dan preeklampsia karena risiko edema paru.
puasa|Puasakan pasien|sus|Baik, Dok. Pasien sudah saya puasakan.|Pasien dipuasakan|abd,gi|Puasa dilakukan bila ada kemungkinan operasi atau tindakan anestesi.
kateter|Pasang kateter urin|sus|Baik, Dok. Kateter sudah terpasang, produksi urin saya catat.|Kateter urin dipasang, produksi urin dipantau|ren,kardio,obs|Kateter untuk memantau produksi urin pada pasien berat atau dengan magnesium sulfat.
ngt|Pasang selang lambung (NGT)|sus|Baik, Dok. NGT sudah terpasang.|NGT dipasang|gi,abd|NGT untuk dekompresi pada obstruksi atau pemberian nutrisi.
# Obat
paracetamol|Beri paracetamol|sus|Baik, Dok. Paracetamol sudah diberikan.|Paracetamol diberikan|infeksi,abd,tht,anak|Paracetamol menurunkan demam dan nyeri ringan hingga sedang dengan profil aman.
nsaid|Beri NSAID (ibuprofen, ketorolak)|sus|Baik, Dok. NSAID sudah diberikan.|NSAID diberikan|abd,infeksi,tht|NSAID untuk nyeri sedang; hati-hati pada gangguan ginjal, gagal jantung, lambung, dan kehamilan.
opioid|Beri opioid kuat (morfin)|sus|Baik, Dok. Morfin diberikan sesuai instruksi.|Opioid kuat diberikan|abd|Opioid untuk nyeri berat setelah penilaian; pada nyeri perut akut tidak boleh menunda diagnosis tanpa evaluasi.|inv
antiemetik|Beri antiemetik|sus|Baik, Dok. Obat mual sudah diberikan.|Antiemetik diberikan|gi,abd|Antiemetik meringankan mual dan muntah.
ppi|Beri penghambat pompa proton (PPI)|sus|Baik, Dok. Obat lambung sudah diberikan.|PPI diberikan|gi|PPI untuk dispepsia, gastritis, dan profilaksis lambung.
antasida|Beri antasida|sus|Baik, Dok. Antasida sudah diberikan.|Antasida diberikan|gi|Antasida meredakan gejala asam lambung ringan.
antibiotik_oral|Beri antibiotik oral|sus|Baik, Dok. Antibiotik oral sudah diberikan.|Antibiotik oral diberikan|infeksi,resp,tht|Antibiotik oral untuk infeksi bakteri ringan sampai sedang yang bisa rawat jalan.
antibiotik_iv|Beri antibiotik intravena|sus|Baik, Dok. Antibiotik intravena sudah diberikan.|Antibiotik IV diberikan|infeksi,abd|Antibiotik IV untuk infeksi berat, perioperatif, atau pasien yang tidak bisa minum.
antihipertensi|Beri antihipertensi|sus|Baik, Dok. Obat antihipertensi sudah diberikan, tekanan darah saya pantau.|Antihipertensi diberikan|kardio,obs|Antihipertensi menurunkan tekanan darah yang tinggi, terutama pada krisis atau preeklampsia berat.
diuretik|Beri diuretik intravena|sus|Baik, Dok. Diuretik sudah diberikan, produksi urin saya catat.|Diuretik IV diberikan, produksi urin dipantau|kardio,ren|Diuretik mengurangi kelebihan cairan pada gagal jantung dan edema paru; berbahaya bila pasien dehidrasi.
magnesium|Beri magnesium sulfat (MgSO4)|sus|Baik, Dok. MgSO4 diberikan sesuai protokol, refleks dan urin saya pantau.|MgSO4 diberikan (profilaksis kejang)|obs|MgSO4 mencegah dan mengobati kejang eklampsia.
steroid_janin|Beri kortikosteroid pematangan paru janin|sus|Baik, Dok. Kortikosteroid sudah saya berikan sesuai jadwal.|Kortikosteroid pematangan paru janin|obs|Steroid antenatal mengurangi gangguan napas bayi bila persalinan dini diperkirakan.
steroid_sis|Beri kortikosteroid sistemik|sus|Baik, Dok. Kortikosteroid sudah diberikan.|Kortikosteroid sistemik diberikan|resp,infeksi|Steroid sistemik untuk eksaserbasi asma atau PPOK dan kondisi inflamasi tertentu; tidak untuk infeksi tanpa indikasi.
bronkodilator|Beri nebulisasi bronkodilator|sus|Baik, Dok. Nebulisasi sudah diberikan.|Nebulisasi bronkodilator|resp|Bronkodilator meredakan mengi pada asma dan PPOK.
antikoagulan|Beri antikoagulan (heparin)|sus|Baik, Dok. Heparin diberikan sesuai instruksi.|Antikoagulan diberikan|hema,kardio,resp|Antikoagulan untuk emboli paru, trombosis, dan sindrom koroner; ada risiko perdarahan.|inv
rehidrasi|Beri larutan rehidrasi oral (oralit)|sus|Baik, Dok. Oralit sudah diberikan.|Oralit diberikan|gi,infeksi,anak|Oralit adalah terapi utama dehidrasi ringan sampai sedang.
# Rencana dan komunikasi
konsul_bedah|Konsul dokter bedah|sus|Baik, Dok. Saya hubungi dokter bedah sekarang.|Konsul bedah|abd,gi|Konsul bedah untuk kasus yang mungkin memerlukan operasi.|g
konsul_og|Konsul dokter kandungan|sus|Baik, Dok. Saya hubungi dokter kandungan sekarang.|Konsul sp.OG|obs|Konsul kandungan untuk komplikasi kehamilan.|g
konsul_pd|Konsul dokter penyakit dalam|sus|Baik, Dok. Saya hubungi dokter penyakit dalam sekarang.|Konsul sp.PD|kardio,resp,metab,ren|Konsul penyakit dalam untuk penyakit sistemik atau kompleks.|g
operasi|Siapkan operasi segera|sus|Baik, Dok. Kamar operasi dan persetujuan tindakan saya siapkan.|Persiapan operasi segera|abd,gi|Operasi segera diindikasikan pada kasus bedah akut yang sudah terdiagnosis.|inv
observasi|Observasi di ruang tindakan beberapa jam|sus|Baik, Dok. Pasien saya observasi di ruang tindakan.|Observasi beberapa jam|umum|Observasi dipilih bila diagnosis belum pasti dan pasien perlu dipantau.|g
rawat|Rawat inap|sus|Baik, Dok. Saya siapkan administrasi rawat inap.|Rawat inap|umum|Rawat inap untuk pasien yang memerlukan pemantauan atau terapi intensif.|g
rawat_icu|Rawat intensif (ICU)|sus|Baik, Dok. Saya koordinasikan ruang ICU.|Rawat ICU|umum|ICU untuk pasien kritis dengan ancaman gagal organ.|inv
rujuk|Rujuk ke rumah sakit rujukan|sus|Baik, Dok. Surat rujukan saya siapkan.|Rujuk ke RS rujukan|umum|Rujukan bila kasus melebihi kompetensi atau fasilitas layanan.|g
pulang|Pulangkan dengan kontrol ulang|pas|Baik, Dok. Terima kasih.|Pulang, kontrol ulang|umum|Pulang hanya aman bila kondisi stabil dan tidak ada tanda bahaya.|g
edukasi|Edukasi pasien dan keluarga|pas|Baik, Dok. Saya mengerti.|Edukasi diberikan, pasien mengerti|umum|Edukasi memastikan pasien memahami penyakit, obat, dan tanda bahaya.|g
edukasi_rokok|Konseling berhenti merokok|pas|Baik, Dok. Saya akan coba berhenti.|Konseling berhenti merokok|resp,kardio|Berhenti merokok adalah intervensi pencegahan terpenting.|g
edukasi_diet|Edukasi diet dan pembatasan garam atau cairan|pas|Baik, Dok. Saya akan atur makan.|Edukasi diet: batasi garam/cairan|kardio,ren,metab|Diet memengaruhi tekanan darah, retensi cairan, dan gula darah.|g
surat_sakit|Beri surat keterangan istirahat sakit|sus|Baik, Dok. Suratnya saya siapkan.|Surat istirahat sakit|umum|Surat istirahat membantu pemulihan dan keperluan administrasi.|g
`;
