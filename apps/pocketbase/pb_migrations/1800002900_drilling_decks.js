/// <reference path="../pb_data/types.d.ts" />

// DRILLING MATERI: berkas materi (slide PPT yang sudah menjadi gambar lh3 + penjelasan per slide).
//
// Drilling sekarang berisi "file kampusmu" per mata kuliah: soal DAN materi. Satu record
// `drilling_decks` = satu berkas materi (mis. satu PPT kuliah). Slide disimpan dalam satu bidang JSON
// berbentuk blok (lihat pb_hooks/lib/slides.js dan docs/MATERI_SLIDE.md).
//
// Hak lihat sama dengan soal Drilling: `scope` = all (General) atau campus (hanya kampus di `campuses`).
// Koleksi ini tidak punya aturan API publik; pembacaan lewat endpoint /api/medcoel/drilling/* yang
// menyaring menurut kampus pengguna, dan pengelolaan lewat /api/medcoel/admin/drilling/decks.
//
// `submissions.contentKind`: apa isi PDF pengajuan, "soal" (bawaan) atau "materi" (PPT). Dipilih pengaju;
// Hermes Agent menampilkannya ke admin dan memilih jalur impor yang sesuai.
migrate((app) => {
  const subjects = app.findCollectionByNameOrId("subjects");
  const campuses = app.findCollectionByNameOrId("campuses");
  const submissions = app.findCollectionByNameOrId("submissions");

  app.save(new Collection({
    name: "drilling_decks",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "subject", type: "relation", required: true, maxSelect: 1, collectionId: subjects.id, cascadeDelete: true },
      { name: "title", type: "text", required: true, max: 200 },
      { name: "description", type: "text", max: 600 },
      { name: "language", type: "select", maxSelect: 1, values: ["id", "en", "both"] },
      { name: "scope", type: "select", required: true, maxSelect: 1, values: ["all", "campus"] },
      { name: "campuses", type: "relation", maxSelect: 999, collectionId: campuses.id },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["published", "draft"] },
      { name: "slideCount", type: "number", onlyInt: true, min: 0, max: 1000 },
      { name: "cover", type: "text", max: 400 },
      { name: "slides", type: "json", maxSize: 4194304 },
      { name: "source", type: "select", maxSelect: 1, values: ["admin", "submission", "agent"] },
      { name: "submission", type: "relation", maxSelect: 1, collectionId: submissions.id },
      { name: "sortOrder", type: "number", onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_drilling_decks_subject ON drilling_decks (subject, status)"],
  }));

  submissions.fields.add(new SelectField({ name: "contentKind", maxSelect: 1, values: ["soal", "materi"] }));
  app.save(submissions);
  app.findRecordsByFilter("submissions", "id != ''", "", 0, 0).forEach((r) => { r.set("contentKind", "soal"); app.saveNoValidate(r); });
}, (app) => {
  const submissions = app.findCollectionByNameOrId("submissions");
  submissions.fields.removeByName("contentKind");
  app.save(submissions);
  app.delete(app.findCollectionByNameOrId("drilling_decks"));
});
