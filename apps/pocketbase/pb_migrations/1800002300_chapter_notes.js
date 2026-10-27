/// <reference path="../pb_data/types.d.ts" />

// Catatan materi per BAB ("Pelajari materi" di halaman mata kuliah).
//
// Koleksi terpisah dari chapters supaya daftar BAB (dimuat utuh di admin dan di
// halaman mata kuliah) tidak ikut membawa teks catatan yang panjang. Satu BAB
// paling banyak satu catatan. Siswa aktif hanya bisa membaca catatan BAB dan
// mata kuliah yang tidak disembunyikan; hanya admin yang menulis.
migrate((app) => {
  const chapters = app.findCollectionByNameOrId("chapters");
  const ADMIN = "@request.auth.role = 'admin'";
  const READ = "(@request.auth.id != '' && @request.auth.disabled = false && chapter.hidden = false && chapter.subject.hidden = false) || " + ADMIN;
  app.save(new Collection({
    name: "chapter_notes",
    type: "base",
    listRule: READ,
    viewRule: READ,
    createRule: ADMIN,
    updateRule: ADMIN,
    deleteRule: ADMIN,
    fields: [
      { name: "chapter", type: "relation", required: true, maxSelect: 1, collectionId: chapters.id, cascadeDelete: true },
      { name: "content", type: "text", max: 200000 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_chapter_notes_chapter ON chapter_notes (chapter)"],
  }));
}, (app) => {
  app.delete(app.findCollectionByNameOrId("chapter_notes"));
});
