// Diagnosis baru untuk kasus tambahan: kunci -> [nama, tag]. Tag dipakai untuk menyusun opsi alasan.
export const NEW_DX = {
  // umum dan penyakit dalam
  malaria: ['Malaria', 'infeksi,hema'], chikungunya: ['Chikungunya', 'infeksi'], influenza: ['Influenza', 'resp,infeksi'],
  leptospirosis: ['Leptospirosis', 'infeksi,ren'], vaginitis: ['Vaginitis atau vaginosis', 'obs,infeksi'], pielonefritis: ['Pielonefritis akut', 'ren,infeksi'],
  ca_paru: ['Karsinoma paru', 'resp,onko'], gerd: ['Penyakit refluks gastroesofagus (GERD)', 'gi'], ulkus_peptik: ['Ulkus peptikum', 'gi'],
  ht_urgensi: ['Hipertensi urgensi', 'kardio,ren'], ht_emergensi: ['Hipertensi emergensi', 'kardio,neuro,ren'], stroke_hemoragik: ['Stroke hemoragik', 'neuro,kardio'],
  dka: ['Ketoasidosis diabetik', 'metab'], hhs: ['Status hiperosmolar hiperglikemik', 'metab'], hipoglikemia: ['Hipoglikemia', 'metab,neuro'],
  sirosis: ['Sirosis hepatis dekompensata', 'gi,hema'], hcc: ['Karsinoma hepatoseluler', 'gi,onko'], ugib: ['Perdarahan saluran cerna atas (ulkus peptikum)', 'gi,hema'],
  varises_eso: ['Ruptur varises esofagus', 'gi,hema'], ca_lambung: ['Karsinoma lambung', 'gi,onko'],
  // bedah
  hernia_ing: ['Hernia inguinalis inkarserata', 'abd,gi'], ileus: ['Ileus obstruktif', 'abd,gi'], pankreatitis: ['Pankreatitis akut', 'abd,gi'],
  ulkus_perf: ['Perforasi ulkus peptikum (peritonitis)', 'abd,gi,infeksi'], abses_sub: ['Abses subkutan', 'infeksi,metab'], hemoroid: ['Hemoroid interna', 'gi,abd'],
  trauma_abd: ['Trauma tumpul abdomen (ruptur lien)', 'abd,hema'], ca_kolon: ['Karsinoma kolorektal', 'gi,onko,abd'], fisura_ani: ['Fisura ani', 'gi'],
  // kandungan
  hiperemesis: ['Hiperemesis gravidarum', 'obs,gi'], abortus: ['Abortus inkomplit', 'obs'], abortus_im: ['Abortus iminens', 'obs'], kpd: ['Ketuban pecah dini', 'obs,infeksi'],
  previa: ['Plasenta previa', 'obs'], partus_preterm: ['Persalinan preterm', 'obs'], braxton: ['His palsu (Braxton Hicks)', 'obs'], solusio: ['Solusio plasenta', 'obs'],
  pid: ['Penyakit radang panggul', 'obs,infeksi'], kista_torsi: ['Kista ovarium terpuntir', 'abd,obs'], mioma: ['Mioma uteri', 'obs,hema'],
  adenomiosis: ['Adenomiosis', 'obs'], ca_serviks: ['Karsinoma serviks', 'obs,onko'], mola: ['Mola hidatidosa', 'obs'],
  // anak
  kejang_demam: ['Kejang demam sederhana', 'anak,neuro,infeksi'], otitis_media: ['Otitis media akut', 'tht,anak,infeksi'], otitis_externa: ['Otitis eksterna', 'tht,infeksi'],
  pneumonia_anak: ['Pneumonia pada anak', 'resp,anak,infeksi'], diare_anak: ['Diare akut dengan dehidrasi (anak)', 'gi,anak,infeksi'], morbili: ['Campak (morbili)', 'infeksi,anak'],
  rubella: ['Rubella', 'infeksi,anak'], roseola: ['Eksantema subitum (roseola)', 'infeksi,anak'], kawasaki: ['Penyakit Kawasaki', 'infeksi,anak,kardio'],
  varisela: ['Varisela (cacar air)', 'infeksi,anak'], hfmd: ['Penyakit tangan, kaki, dan mulut', 'infeksi,anak'], impetigo: ['Impetigo', 'infeksi'], skabies: ['Skabies', 'infeksi'],
  sindrom_nefrotik: ['Sindrom nefrotik', 'ren,anak'], gnapss: ['Glomerulonefritis akut pascastreptokokus', 'ren,anak,infeksi'],
  // diagnosis banding tambahan
  diseksi_aorta: ['Diseksi aorta', 'kardio'], pneumotoraks: ['Pneumotoraks', 'resp'], selulitis: ['Selulitis', 'infeksi'],
  nekrotikans: ['Fasiitis nekrotikans', 'infeksi'], trauma_hati: ['Trauma hati', 'abd,hema'], ruptur_usus: ['Perforasi usus akibat trauma', 'abd,gi'],
  trauma_ginjal: ['Kontusio atau laserasi ginjal', 'abd,ren'],
};
