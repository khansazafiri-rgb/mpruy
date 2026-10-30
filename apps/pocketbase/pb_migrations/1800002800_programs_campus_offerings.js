/// <reference path="../pb_data/types.d.ts" />

// PROGRAM STUDI + KAMPUS
//
// Hak lihat soal khusus kampus tetap berbasis id kampus. Supaya "Kedokteran UNER" dan
// "Keperawatan UNER" tidak saling melihat soal, satu record `campuses` sekarang berarti
// SATU PENYELENGGARAAN: pasangan (program studi, institusi). Jadi tidak ada logika hak lihat
// yang berubah; yang baru hanya cara memilihnya: pilih program studi dulu, lalu kampus yang
// menyelenggarakan prodi itu.
//
// - `programs`: daftar program studi (isian bebas lewat "Lainnya" membuat record `unverified`).
// - `campuses.program`, `campuses.institution`, `campuses.unverified`.
//   Record lama (105 FK) otomatis menjadi program "Kedokteran". Nama lama tidak diubah
//   karena dipakai impor (resolveCampuses) dan riwayat.
// - Kampus yang ditulis sendiri oleh pengguna dibuat `unverified` (tidak tampil di daftar umum,
//   tapi pengguna lain dari kampus yang sama otomatis bergabung ke record yang sama). Admin
//   memeriksa dan bisa menggabungkan lewat Pengaturan > Daftar kampus.
//
// Daftar kampus untuk prodi selain Kedokteran di bawah ini BELUM lengkap (sumber resmi PDDikti
// tidak dapat diambil otomatis). Lengkapi lewat Pengaturan > Daftar kampus > Tempel daftar.

const PROGRAMS = [
  "Kedokteran", "Kedokteran Gigi", "Kedokteran Hewan", "Farmasi", "Keperawatan", "Kebidanan",
  "Kesehatan Masyarakat", "Ilmu Gizi", "Fisioterapi", "Teknologi Laboratorium Medis",
  "Radiologi", "Rekam Medis dan Informasi Kesehatan", "Kesehatan Lingkungan",
  "Keselamatan dan Kesehatan Kerja", "Promosi Kesehatan", "Administrasi Kesehatan",
  "Psikologi", "Okupasi Terapi", "Terapi Wicara", "Optometri", "Ortotik Prostetik",
  "Keperawatan Anestesiologi", "Teknik Elektromedis", "Kesehatan Tradisional",
  "Ilmu Biomedik", "Profesi Apoteker", "Profesi Ners",
];

// [institusi, kota, jenis]
const OFFERINGS = {
  "Kedokteran Gigi": [
    ["Universitas Indonesia", "Jakarta", "ptn"], ["Universitas Gadjah Mada", "Yogyakarta", "ptn"],
    ["Universitas Airlangga", "Surabaya", "ptn"], ["Universitas Padjadjaran", "Bandung", "ptn"],
    ["Universitas Hasanuddin", "Makassar", "ptn"], ["Universitas Sumatera Utara", "Medan", "ptn"],
    ["Universitas Jember", "Jember", "ptn"], ["Universitas Sam Ratulangi", "Manado", "ptn"],
    ["Universitas Syiah Kuala", "Banda Aceh", "ptn"], ["Universitas Sriwijaya", "Palembang", "ptn"],
    ["Universitas Andalas", "Padang", "ptn"], ["Universitas Udayana", "Denpasar", "ptn"],
    ["Universitas Lambung Mangkurat", "Banjarmasin", "ptn"],
    ["Universitas Trisakti", "Jakarta", "pts"], ["Universitas Prof. Dr. Moestopo (Beragama)", "Jakarta", "pts"],
    ["Universitas Baiturrahmah", "Padang", "pts"], ["Universitas Mahasaraswati Denpasar", "Denpasar", "pts"],
    ["Universitas Islam Sultan Agung", "Semarang", "pts"], ["Universitas Muhammadiyah Surakarta", "Surakarta", "pts"],
    ["Universitas Muhammadiyah Yogyakarta", "Yogyakarta", "pts"], ["Universitas Muslim Indonesia", "Makassar", "pts"],
    ["Universitas Kristen Maranatha", "Bandung", "pts"], ["Universitas Hang Tuah", "Surabaya", "pts"],
  ],
  "Kedokteran Hewan": [
    ["IPB University", "Bogor", "ptn"], ["Universitas Gadjah Mada", "Yogyakarta", "ptn"],
    ["Universitas Airlangga", "Surabaya", "ptn"], ["Universitas Brawijaya", "Malang", "ptn"],
    ["Universitas Udayana", "Denpasar", "ptn"], ["Universitas Syiah Kuala", "Banda Aceh", "ptn"],
    ["Universitas Hasanuddin", "Makassar", "ptn"], ["Universitas Nusa Cendana", "Kupang", "ptn"],
    ["Universitas Wijaya Kusuma Surabaya", "Surabaya", "pts"],
  ],
  "Farmasi": [
    ["Universitas Indonesia", "Depok", "ptn"], ["Universitas Gadjah Mada", "Yogyakarta", "ptn"],
    ["Institut Teknologi Bandung", "Bandung", "ptn"], ["Universitas Airlangga", "Surabaya", "ptn"],
    ["Universitas Padjadjaran", "Bandung", "ptn"], ["Universitas Hasanuddin", "Makassar", "ptn"],
    ["Universitas Sumatera Utara", "Medan", "ptn"], ["Universitas Andalas", "Padang", "ptn"],
    ["Universitas Syiah Kuala", "Banda Aceh", "ptn"], ["Universitas Sriwijaya", "Palembang", "ptn"],
    ["Universitas Jember", "Jember", "ptn"], ["Universitas Udayana", "Denpasar", "ptn"],
    ["Universitas Jenderal Soedirman", "Purwokerto", "ptn"], ["Universitas Mulawarman", "Samarinda", "ptn"],
    ["Universitas Sam Ratulangi", "Manado", "ptn"], ["Universitas Brawijaya", "Malang", "ptn"],
    ["UIN Syarif Hidayatullah Jakarta", "Tangerang Selatan", "ptn"],
    ["UIN Maulana Malik Ibrahim Malang", "Malang", "ptn"],
    ["Universitas Islam Indonesia", "Yogyakarta", "pts"], ["Universitas Ahmad Dahlan", "Yogyakarta", "pts"],
    ["Universitas Sanata Dharma", "Yogyakarta", "pts"], ["Universitas Surabaya", "Surabaya", "pts"],
    ["Universitas Pancasila", "Jakarta", "pts"], ["Universitas Setia Budi", "Surakarta", "pts"],
    ["Universitas Muhammadiyah Surakarta", "Surakarta", "pts"], ["Universitas Muhammadiyah Yogyakarta", "Yogyakarta", "pts"],
    ["Universitas Katolik Widya Mandala Surabaya", "Surabaya", "pts"],
  ],
  "Keperawatan": [
    ["Universitas Indonesia", "Depok", "ptn"], ["Universitas Gadjah Mada", "Yogyakarta", "ptn"],
    ["Universitas Airlangga", "Surabaya", "ptn"], ["Universitas Padjadjaran", "Bandung", "ptn"],
    ["Universitas Diponegoro", "Semarang", "ptn"], ["Universitas Hasanuddin", "Makassar", "ptn"],
    ["Universitas Sumatera Utara", "Medan", "ptn"], ["Universitas Andalas", "Padang", "ptn"],
    ["Universitas Syiah Kuala", "Banda Aceh", "ptn"], ["Universitas Jember", "Jember", "ptn"],
    ["Universitas Brawijaya", "Malang", "ptn"], ["Universitas Jenderal Soedirman", "Purwokerto", "ptn"],
    ["Universitas Riau", "Pekanbaru", "ptn"], ["Universitas Sriwijaya", "Palembang", "ptn"],
    ["Universitas Lambung Mangkurat", "Banjarmasin", "ptn"], ["Universitas Tanjungpura", "Pontianak", "ptn"],
    ["Universitas Mulawarman", "Samarinda", "ptn"], ["Universitas Sam Ratulangi", "Manado", "ptn"],
    ["Universitas Pattimura", "Ambon", "ptn"], ["UIN Syarif Hidayatullah Jakarta", "Tangerang Selatan", "ptn"],
    ["Universitas Muhammadiyah Yogyakarta", "Yogyakarta", "pts"], ["Universitas Muhammadiyah Malang", "Malang", "pts"],
    ["Universitas Muhammadiyah Surakarta", "Surakarta", "pts"], ["Universitas Pelita Harapan", "Tangerang", "pts"],
    ["Universitas Binawan", "Jakarta", "pts"], ["Universitas Esa Unggul", "Jakarta", "pts"],
    ["Universitas Respati Indonesia", "Jakarta", "pts"], ["Universitas Aisyiyah Yogyakarta", "Yogyakarta", "pts"],
  ],
  "Kebidanan": [
    ["Universitas Airlangga", "Surabaya", "ptn"], ["Universitas Padjadjaran", "Bandung", "ptn"],
    ["Universitas Brawijaya", "Malang", "ptn"], ["Universitas Aisyiyah Yogyakarta", "Yogyakarta", "pts"],
  ],
  "Kesehatan Masyarakat": [
    ["Universitas Indonesia", "Depok", "ptn"], ["Universitas Airlangga", "Surabaya", "ptn"],
    ["Universitas Diponegoro", "Semarang", "ptn"], ["Universitas Hasanuddin", "Makassar", "ptn"],
    ["Universitas Sumatera Utara", "Medan", "ptn"], ["Universitas Andalas", "Padang", "ptn"],
    ["Universitas Sriwijaya", "Palembang", "ptn"], ["Universitas Syiah Kuala", "Banda Aceh", "ptn"],
    ["Universitas Jember", "Jember", "ptn"], ["Universitas Sam Ratulangi", "Manado", "ptn"],
    ["Universitas Udayana", "Denpasar", "ptn"], ["Universitas Jambi", "Jambi", "ptn"],
    ["Universitas Halu Oleo", "Kendari", "ptn"], ["Universitas Lambung Mangkurat", "Banjarbaru", "ptn"],
    ["Universitas Mulawarman", "Samarinda", "ptn"], ["Universitas Riau", "Pekanbaru", "ptn"],
    ["Universitas Tadulako", "Palu", "ptn"], ["Universitas Negeri Semarang", "Semarang", "ptn"],
    ["UIN Syarif Hidayatullah Jakarta", "Tangerang Selatan", "ptn"],
  ],
  "Ilmu Gizi": [
    ["IPB University", "Bogor", "ptn"], ["Universitas Gadjah Mada", "Yogyakarta", "ptn"],
    ["Universitas Indonesia", "Depok", "ptn"], ["Universitas Airlangga", "Surabaya", "ptn"],
    ["Universitas Diponegoro", "Semarang", "ptn"], ["Universitas Hasanuddin", "Makassar", "ptn"],
    ["Universitas Brawijaya", "Malang", "ptn"], ["Universitas Andalas", "Padang", "ptn"],
  ],
  "Fisioterapi": [
    ["Universitas Brawijaya", "Malang", "ptn"], ["Universitas Hasanuddin", "Makassar", "ptn"],
    ["Universitas Muhammadiyah Surakarta", "Surakarta", "pts"], ["Universitas Esa Unggul", "Jakarta", "pts"],
    ["Universitas Binawan", "Jakarta", "pts"], ["Universitas Aisyiyah Yogyakarta", "Yogyakarta", "pts"],
  ],
};

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
// "FK Universitas X" -> "Universitas X". FIKKIA (kampus Banyuwangi) dibiarkan utuh agar tidak
// kembar dengan FK Universitas Airlangga.
const institutionOf = (name) => (/^FK\s+/.test(name) ? name.replace(/^FK\s+/, "") : name);

migrate(
  (app) => {
    const ADMIN = "@request.auth.role = 'admin'";
    const rel = (name, c) => ({ name, type: "relation", collectionId: c.id, maxSelect: 1, cascadeDelete: false });

    const programs = new Collection({
      type: "base",
      name: "programs",
      listRule: "unverified = false || " + ADMIN,
      viewRule: "unverified = false || " + ADMIN,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: "name", type: "text", required: true, max: 120 },
        { name: "order", type: "number", onlyInt: true },
        { name: "active", type: "bool" },
        { name: "unverified", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_programs_name ON programs (name COLLATE NOCASE)"],
    });
    app.save(programs);

    const campuses = app.findCollectionByNameOrId("campuses");
    campuses.fields.add(new RelationField(rel("program", programs)));
    campuses.fields.add(new TextField({ name: "institution", max: 200 }));
    campuses.fields.add(new BoolField({ name: "unverified" }));
    campuses.indexes.push("CREATE INDEX idx_campuses_program ON campuses (program)");
    // Kampus yang belum diperiksa admin tidak tampil di daftar umum.
    campuses.listRule = "unverified = false || " + ADMIN;
    campuses.viewRule = "unverified = false || " + ADMIN;
    app.save(campuses);

    const byName = {};
    PROGRAMS.forEach((name, i) => {
      const r = new Record(programs);
      r.set("name", name);
      r.set("order", i + 1);
      r.set("active", true);
      r.set("unverified", false);
      app.save(r);
      byName[name] = r;
    });

    // Kampus lama: semuanya penyelenggaraan Kedokteran.
    const kedokteran = byName["Kedokteran"];
    app.findAllRecords("campuses").forEach((c) => {
      c.set("program", kedokteran.id);
      c.set("institution", institutionOf(c.getString("name")));
      c.set("unverified", false);
      app.saveNoValidate(c);
    });

    // Kampus awal untuk prodi lain. Nama record = "<Prodi> <Institusi>" (unik, mudah dicari admin).
    const taken = new Set(app.findAllRecords("campuses").map((c) => norm(c.getString("name"))));
    let order = 1000;
    Object.keys(OFFERINGS).forEach((program) => {
      OFFERINGS[program].forEach(([institution, city, kind]) => {
        const name = program + " " + institution;
        if (taken.has(norm(name))) return;
        taken.add(norm(name));
        const r = new Record(campuses);
        r.set("name", name);
        r.set("institution", institution);
        r.set("city", city);
        r.set("kind", kind);
        r.set("program", byName[program].id);
        r.set("active", true);
        r.set("unverified", false);
        r.set("order", ++order);
        app.save(r);
      });
    });
  },
  () => {
    // Jalur mundur hanya lewat kode: menghapus kolom ini akan membuat kampus kembali bercampur
    // lintas prodi dan merusak hak lihat soal. Lihat docs/PROGRAM_STUDI_KAMPUS.md.
    throw new Error("Rollback program studi dan kampus tidak dilakukan otomatis. Kembalikan kode aplikasi; data tetap aman.");
  },
);
