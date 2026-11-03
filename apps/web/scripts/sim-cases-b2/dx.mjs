// Diagnosis baru untuk batch 2 kasus Simulasi Dokter: kunci -> [nama, tag].
// Tag dipakai mencocokkan alasan pemain dengan tag tindakan katalog (lihat docs/SIMULASI_DOKTER.md).
// Kunci tidak boleh bentrok dengan BUILTIN_DX maupun NEW_DX batch 1 (diperiksa skrip ekspor).
export const NEW_DX_B2 = {
  // poli umum
  herpes_zoster: ['Herpes zoster', 'infeksi'], dermatitis_kontak: ['Dermatitis kontak', 'infeksi'],
  gout: ['Artritis gout akut', 'metab'], artritis_septik: ['Artritis septik', 'infeksi'], pseudogout: ['Pseudogout', 'metab'], ra: ['Artritis reumatoid', 'metab'],
  tth: ['Nyeri kepala tipe tegang', 'neuro'], sinusitis: ['Sinusitis akut', 'tht,infeksi,resp'], sah: ['Perdarahan subaraknoid', 'neuro,kardio'],
  anafilaksis: ['Reaksi anafilaksis', 'resp,kardio'], serangan_panik: ['Serangan panik', 'neuro'], sinkop_vasovagal: ['Sinkop vasovagal', 'kardio,neuro'],
  bppv: ['Vertigo posisional paroksismal jinak (BPPV)', 'neuro,tht'], neuritis_vestibular: ['Neuritis vestibularis', 'neuro,tht,infeksi'], meniere: ['Penyakit Meniere', 'tht,neuro'],
  hipotensi_ortostatik: ['Hipotensi ortostatik', 'kardio'],
  // bedah
  kolitis: ['Kolitis infeksi', 'gi,infeksi'], abses_perianal: ['Abses perianal', 'infeksi,gi,abd'], fistula_perianal: ['Fistula perianal', 'gi,abd,infeksi'],
  erisipelas: ['Erisipelas', 'infeksi'], dvt: ['Trombosis vena dalam', 'kardio,hema'],
  epidural: ['Hematoma epidural', 'neuro,trauma'], komosio: ['Komosio serebri', 'neuro,trauma'], kontusio_serebri: ['Kontusio serebri', 'neuro,trauma'], subdural: ['Hematoma subdural', 'neuro,trauma'],
  fraktur_terbuka: ['Fraktur terbuka tibia', 'trauma,infeksi'], fraktur_tertutup: ['Fraktur tertutup', 'trauma'], dislokasi: ['Dislokasi sendi', 'trauma'],
  kompartemen: ['Sindrom kompartemen', 'trauma,hema'], cedera_vaskular: ['Cedera vaskular tungkai', 'trauma,kardio'],
  struma_nodosa: ['Struma nodosa (nodul tiroid)', 'metab,onko'], tiroiditis: ['Tiroiditis', 'metab,infeksi'], ca_tiroid: ['Karsinoma tiroid', 'metab,onko'], kista_tiroglosus: ['Kista duktus tiroglosus', 'metab'],
  kolangitis: ['Kolangitis akut', 'gi,abd,infeksi'], abses_hati: ['Abses hati', 'gi,infeksi'], kolik_bilier: ['Kolik bilier', 'gi,abd'],
  ulkus_dm: ['Ulkus kaki diabetik', 'metab,infeksi'], ulkus_arteri: ['Ulkus arteri (penyakit arteri perifer)', 'kardio,metab'], osteomielitis: ['Osteomielitis', 'infeksi'], ulkus_vena: ['Ulkus vena', 'kardio'],
  pneumotoraks_tension: ['Pneumotoraks tension', 'resp,trauma,kardio'], hemotoraks: ['Hemotoraks', 'resp,trauma,hema'], tamponade: ['Tamponade jantung', 'kardio,trauma'], kontusio_paru: ['Kontusio paru', 'resp,trauma'],
  bph_retensi: ['Retensi urin akut akibat BPH', 'ren,abd'], striktur_uretra: ['Striktur uretra', 'ren'], batu_uretra: ['Batu uretra', 'ren'], prostatitis: ['Prostatitis akut', 'ren,infeksi'], ca_prostat: ['Karsinoma prostat', 'ren,onko'],
  // kandungan
  ruptur_uteri: ['Ruptur uteri', 'obs'], inpartu: ['Persalinan normal kala I fase aktif', 'obs'], kehamilan_ganda: ['Kehamilan ganda', 'obs'],
  abortus_tertunda: ['Abortus tertunda (missed abortion)', 'obs'], servisitis: ['Servisitis', 'obs,infeksi'], polip_serviks: ['Polip serviks', 'obs'],
  pua: ['Perdarahan uterus abnormal', 'obs,hema'], hipotiroid: ['Hipotiroid', 'metab'], polip_endometrium: ['Polip endometrium', 'obs'], ca_endometrium: ['Karsinoma endometrium', 'obs,onko'],
  anemia_hamil: ['Anemia defisiensi besi dalam kehamilan', 'hema,obs'], hemodilusi: ['Hemodilusi fisiologis kehamilan', 'hema,obs'], talasemia: ['Talasemia', 'hema'],
  cacingan: ['Infeksi cacing', 'gi,infeksi,hema'], anemia_penyakit_kronik: ['Anemia penyakit kronik', 'hema,infeksi'],
  prolaps_tp: ['Prolaps tali pusat', 'obs'], gawat_janin: ['Gawat janin', 'obs'],
  atonia: ['Atonia uteri (perdarahan pascasalin)', 'obs,hema'], retensio_plasenta: ['Retensio atau sisa plasenta', 'obs,hema'], laserasi_jalan_lahir: ['Laserasi jalan lahir', 'obs,hema'], koagulopati: ['Koagulopati', 'hema'],
  sungsang: ['Letak sungsang (presentasi bokong)', 'obs'], letak_lintang: ['Letak lintang', 'obs'], polihidramnion: ['Polihidramnion', 'obs'],
  // anak
  ensefalitis: ['Ensefalitis', 'neuro,infeksi'], malaria_serebral: ['Malaria serebral', 'neuro,infeksi'],
  dss: ['Sindrom syok dengue', 'infeksi,hema,anak,kardio'], sepsis: ['Sepsis dan syok septik', 'infeksi,kardio'],
  gizi_buruk: ['Gizi buruk', 'gi,anak,metab'], hiv: ['HIV/AIDS dengan infeksi oportunistik', 'infeksi'], diare_kronik: ['Diare kronik', 'gi,infeksi,anak'], gizi_kurang: ['Gizi kurang', 'gi,anak,metab'],
  dermatitis_atopik: ['Dermatitis atopik', 'anak'], gigitan_serangga: ['Reaksi gigitan serangga', 'infeksi'], tinea: ['Tinea (dermatofitosis)', 'infeksi'],
  gn_lain: ['Glomerulonefritis lain', 'ren,anak'], dra: ['Demam reumatik akut', 'infeksi,anak,kardio'], jia: ['Artritis idiopatik juvenil', 'anak,metab'],
  rinitis_alergi: ['Rinitis alergi', 'tht,resp'], common_cold: ['Common cold', 'tht,infeksi,resp'], hipertrofi_adenoid: ['Hipertrofi adenoid', 'tht'], benda_asing_hidung: ['Benda asing di hidung', 'tht'],
  askariasis: ['Askariasis', 'gi,infeksi,anak'], pertusis: ['Pertusis', 'resp,infeksi,anak'],
  // penyakit dalam
  kejang_pascaiktal: ['Keadaan pascakejang', 'neuro'], perikarditis: ['Perikarditis akut', 'kardio'], hipovolemia: ['Syok hipovolemik', 'gi,kardio'],
  af: ['Fibrilasi atrium', 'kardio'], svt: ['Takikardia supraventrikular', 'kardio'], ekstrasistol: ['Ekstrasistol', 'kardio'],
  aki: ['Cedera ginjal akut', 'ren'], limfoma: ['Limfoma', 'onko,hema'], efusi_pleura: ['Efusi pleura', 'resp'],
};
