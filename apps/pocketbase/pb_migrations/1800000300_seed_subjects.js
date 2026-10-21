/// <reference path="../pb_data/types.d.ts" />

// MATA KULIAH AWAL
//
// Daftar mata kuliah awal masih pertanyaan terbuka di PRD. Enam mata kuliah
// di bawah ini mengikuti contoh ilustrasi yang diusulkan PRD, dan semuanya
// bisa diubah, disembunyikan, atau dihapus di Dashboard Admin > Mata kuliah.
// BAB sengaja tidak diisi: admin menambahkannya sendiri atau lewat impor JSON
// (impor membuat BAB baru bila namanya belum ada).

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("subjects");
    const data = [
      ["Anatomi", "anatomi", "anatomi", "Struktur tubuh manusia dari tulang sampai saraf."],
      ["Histologi", "histologi", "histologi", "Jaringan dan sel di bawah mikroskop."],
      ["Fisiologi", "fisiologi", "fisiologi", "Cara kerja organ dan sistem tubuh."],
      ["Biokimia", "biokimia", "biokimia", "Reaksi kimia dan metabolisme di dalam sel."],
      ["Parasitologi", "parasitologi", "parasitologi", "Cacing, protozoa, dan artropoda penyebab penyakit."],
      ["Mikrobiologi", "mikrobiologi", "mikrobiologi", "Bakteri, virus, dan jamur."],
    ];
    data.forEach(([name, slug, key, desc], i) => {
      const r = new Record(col);
      r.set("name", name);
      r.set("slug", slug);
      r.set("illustrationKey", key);
      r.set("description", desc);
      r.set("order", i + 1);
      r.set("hidden", false);
      app.save(r);
    });
  },
  (app) => {
    app.db().newQuery("DELETE FROM subjects").execute();
  },
);
