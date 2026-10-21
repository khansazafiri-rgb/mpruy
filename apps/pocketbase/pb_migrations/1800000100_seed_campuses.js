/// <reference path="../pb_data/types.d.ts" />

// DAFTAR KAMPUS AWAL
//
// Diambil dari daftar fakultas kedokteran di web lama (PCV Classroom), 105 nama.
// Daftar ini BELUM lengkap: PRD mencatat sekitar 155 institusi terdaftar per
// April 2026. Sebelum rilis, cocokkan dengan data resmi PDDikti atau KKI lewat
// Dashboard Admin > Pengaturan > Kampus (tambah, ubah nama, gabungkan).
// Pendaftar dari kampus yang belum ada tetap bisa memilih "Lainnya".

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("campuses");
    const data = [
    ["FK Universitas Syiah Kuala","Banda Aceh","ptn"],
    ["FK Universitas Malikussaleh","Lhokseumawe","ptn"],
    ["FK Universitas Sumatera Utara","Medan","ptn"],
    ["FK Universitas Andalas","Padang","ptn"],
    ["FK Universitas Riau","Pekanbaru","ptn"],
    ["FK Universitas Jambi","Jambi","ptn"],
    ["FK Universitas Sriwijaya","Palembang","ptn"],
    ["FK Universitas Bengkulu","Bengkulu","ptn"],
    ["FK Universitas Lampung","Bandar Lampung","ptn"],
    ["FK Universitas Maritim Raja Ali Haji","Tanjungpinang","ptn"],
    ["FK Universitas Bangka Belitung","Pangkalpinang","ptn"],
    ["FK Universitas Indonesia","Jakarta","ptn"],
    ["FK UPN Veteran Jakarta","Jakarta","ptn"],
    ["FK Universitas Pembangunan Jaya","Tangerang Selatan","ptn"],
    ["FK Universitas Sultan Ageng Tirtayasa","Serang","ptn"],
    ["FK Universitas Padjadjaran","Bandung","ptn"],
    ["FK Universitas Siliwangi","Tasikmalaya","ptn"],
    ["FK Universitas Singaperbangsa Karawang","Karawang","ptn"],
    ["FK Universitas Diponegoro","Semarang","ptn"],
    ["FK Universitas Sebelas Maret","Surakarta","ptn"],
    ["FK Universitas Jenderal Soedirman","Purwokerto","ptn"],
    ["FK Universitas Tidar","Magelang","ptn"],
    ["FK Universitas Gadjah Mada","Yogyakarta","ptn"],
    ["FK Universitas Airlangga","Surabaya","ptn"],
    ["FIKKIA Universitas Airlangga","Banyuwangi","ptn"],
    ["FK Universitas Brawijaya","Malang","ptn"],
    ["FK Universitas Jember","Jember","ptn"],
    ["FK Universitas Negeri Surabaya","Surabaya","ptn"],
    ["FK Universitas Trunojoyo Madura","Bangkalan","ptn"],
    ["FK Universitas Udayana","Denpasar","ptn"],
    ["FK Universitas Mataram","Mataram","ptn"],
    ["FK Universitas Nusa Cendana","Kupang","ptn"],
    ["FK Universitas Tanjungpura","Pontianak","ptn"],
    ["FK Universitas Palangka Raya","Palangka Raya","ptn"],
    ["FK Universitas Lambung Mangkurat","Banjarmasin","ptn"],
    ["FK Universitas Mulawarman","Samarinda","ptn"],
    ["FK Universitas Borneo Tarakan","Tarakan","ptn"],
    ["FK Universitas Hasanuddin","Makassar","ptn"],
    ["FK Universitas Sam Ratulangi","Manado","ptn"],
    ["FK Universitas Tadulako","Palu","ptn"],
    ["FK Universitas Halu Oleo","Kendari","ptn"],
    ["FK Universitas Negeri Gorontalo","Gorontalo","ptn"],
    ["FK Universitas Sulawesi Barat","Majene","ptn"],
    ["FK Universitas Pattimura","Ambon","ptn"],
    ["FK Universitas Khairun","Ternate","ptn"],
    ["FK Universitas Cenderawasih","Jayapura","ptn"],
    ["FK Universitas Papua","Manokwari","ptn"],
    ["FK Universitas Trisakti","Jakarta","pts"],
    ["FK Universitas Tarumanagara","Jakarta","pts"],
    ["FK Universitas Atma Jaya","Jakarta","pts"],
    ["FK Universitas Kristen Indonesia","Jakarta","pts"],
    ["FK Universitas YARSI","Jakarta","pts"],
    ["FK Universitas Muhammadiyah Jakarta","Jakarta","pts"],
    ["FK UIN Syarif Hidayatullah","Tangerang Selatan","pts"],
    ["FK Universitas Pelita Harapan","Tangerang","pts"],
    ["FK Universitas Katolik Indonesia Atma Jaya","Jakarta","pts"],
    ["FK Universitas Pembangunan Nasional Veteran Jakarta","Jakarta","pts"],
    ["FK Universitas Gunadarma","Depok","pts"],
    ["FK Universitas Binawan","Jakarta","pts"],
    ["FK Universitas Esa Unggul","Jakarta","pts"],
    ["FK Universitas Kristen Maranatha","Bandung","pts"],
    ["FK Universitas Islam Bandung","Bandung","pts"],
    ["FK Universitas Jenderal Achmad Yani","Cimahi","pts"],
    ["FK Universitas Swadaya Gunung Jati","Cirebon","pts"],
    ["FK Universitas Muhammadiyah Bandung","Bandung","pts"],
    ["FK Universitas Islam Sultan Agung","Semarang","pts"],
    ["FK Universitas Muhammadiyah Semarang","Semarang","pts"],
    ["FK Universitas Muhammadiyah Surakarta","Surakarta","pts"],
    ["FK Universitas Islam Indonesia","Yogyakarta","pts"],
    ["FK Universitas Muhammadiyah Yogyakarta","Yogyakarta","pts"],
    ["FK Universitas Kristen Duta Wacana","Yogyakarta","pts"],
    ["FK Universitas Ahmad Dahlan","Yogyakarta","pts"],
    ["FK Universitas Alma Ata","Yogyakarta","pts"],
    ["FK Universitas Muhammadiyah Purwokerto","Purwokerto","pts"],
    ["FK Universitas Katolik Soegijapranata","Semarang","pts"],
    ["FK Universitas Katolik Widya Mandala","Surabaya","pts"],
    ["FK Universitas Hang Tuah","Surabaya","pts"],
    ["FK Universitas Wijaya Kusuma","Surabaya","pts"],
    ["FK Universitas Muhammadiyah Surabaya","Surabaya","pts"],
    ["FK Universitas Nahdlatul Ulama Surabaya","Surabaya","pts"],
    ["FK Universitas Ciputra","Surabaya","pts"],
    ["FK Universitas Islam Malang","Malang","pts"],
    ["FK Universitas Muhammadiyah Malang","Malang","pts"],
    ["FK UIN Maulana Malik Ibrahim","Malang","pts"],
    ["FK Universitas Jenderal Soedirman Jember","Jember","pts"],
    ["FK Universitas Baiturrahmah","Padang","pts"],
    ["FK Universitas Abulyatama","Aceh Besar","pts"],
    ["FK Universitas Methodist Indonesia","Medan","pts"],
    ["FK Universitas HKBP Nommensen","Medan","pts"],
    ["FK Universitas Islam Sumatera Utara","Medan","pts"],
    ["FK Universitas Prima Indonesia","Medan","pts"],
    ["FK Universitas Batam","Batam","pts"],
    ["FK Universitas Malahayati","Bandar Lampung","pts"],
    ["FK Universitas Muhammadiyah Palembang","Palembang","pts"],
    ["FK Universitas Abdurrab","Pekanbaru","pts"],
    ["FK Universitas Warmadewa","Denpasar","pts"],
    ["FK Universitas Muhammadiyah Banjarmasin","Banjarmasin","pts"],
    ["FK Universitas Muslim Indonesia","Makassar","pts"],
    ["FK Universitas Bosowa","Makassar","pts"],
    ["FK Universitas Kristen Indonesia Tomohon","Tomohon","pts"],
    ["FK Universitas Alkhairaat","Palu","pts"],
    ["FK Universitas Widya Mandira","Kupang","pts"],
    ["FK Universitas Nusa Nipa","Maumere","pts"],
    ["FK Universitas Pertahanan RI","Bogor","kedinasan"],
    ["FK Universitas Kristen Krida Wacana","Jakarta","kedinasan"],
    ];
    data.forEach(([name, city, kind], i) => {
      const r = new Record(col);
      r.set("name", name);
      r.set("city", city);
      r.set("kind", kind);
      r.set("active", true);
      r.set("order", i + 1);
      app.save(r);
    });
  },
  (app) => {
    app.db().newQuery("DELETE FROM campuses").execute();
  },
);
