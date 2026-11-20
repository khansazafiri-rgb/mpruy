/// <reference path="../pb_data/types.d.ts" />

// PROGRES BELAJAR CLINICAL STUDIOS (aditif; tidak mengubah koleksi lain).
//
// Satu baris per percobaan Challenge (server-graded) atau per sesi Guided (dilaporkan klien, ditandai selfReported).
// Skor Challenge hanya ditulis oleh server saat menilai jawaban: jawaban PERTAMA per soal yang dihitung, jadi mengulang
// soal tidak menaikkan skor. Tidak ada jawaban teks, kunci jawaban, atau isi dataset yang disimpan: hanya id soal,
// benar/salah, dan waktu. ID kampus (relasi users.campus) disalin saat percobaan dibuat untuk ringkasan admin per kampus.
// Tidak ada aturan API publik: baca lewat GET /api/medcoel/studios/{id}/progress (milik sendiri) dan
// GET /api/medcoel/admin/studio-progress (admin). Rekaman ikut terhapus bila akun dihapus (cascadeDelete).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  app.save(new Collection({
    name: "studio_progress",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "campus", type: "text", max: 120 },
      { name: "studioId", type: "text", required: true, max: 64, pattern: "^[a-z][a-z0-9-]{2,63}$" },
      { name: "releaseId", type: "text", required: true, max: 128 },
      { name: "mode", type: "select", required: true, maxSelect: 1, values: ["challenge", "guided"] },
      { name: "attemptKey", type: "text", required: true, min: 64, max: 64, pattern: "^[a-f0-9]{64}$" },
      { name: "selfReported", type: "bool" },
      { name: "total", type: "number", onlyInt: true, min: 0, max: 1000 },
      { name: "answered", type: "number", onlyInt: true, min: 0, max: 1000 },
      { name: "correct", type: "number", onlyInt: true, min: 0, max: 1000 },
      { name: "answers", type: "json", maxSize: 20000 },
      { name: "completedAt", type: "date" },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_studio_progress_attempt ON studio_progress (user, attemptKey)",
      "CREATE INDEX idx_studio_progress_user_studio ON studio_progress (user, studioId)",
      "CREATE INDEX idx_studio_progress_campus ON studio_progress (campus, studioId)",
    ],
  }));
}, (app) => {
  app.delete(app.findCollectionByNameOrId("studio_progress"));
});
