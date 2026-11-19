/// <reference path="../pb_data/types.d.ts" />

// AKTIVITAS SISWA (dashboard admin): halaman/bagian web mana yang paling sering dibuka.
//
// Hanya AGREGAT HARIAN per (siswa, hari, halaman): berapa kali dibuka dan berapa detik aktif. `key` adalah POLA
// halaman dari daftar tetap (mis. "/mata-kuliah/:slug"), bukan alamat asli, jadi tidak ada ID, kata pencarian,
// isi jawaban, atau query yang tersimpan. Aktivitas admin tidak dicatat. Baris lebih dari 180 hari dihapus
// otomatis (pb_hooks/lib/jobs.js). Koleksi ini tidak punya aturan API publik: tulis lewat
// POST /api/medcoel/activity, baca lewat GET /api/medcoel/admin/activity (lihat docs/ACTIVITY_TRACKING.md).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  app.save(new Collection({
    name: "activity_daily",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "day", type: "text", required: true, min: 10, max: 10, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      { name: "key", type: "text", required: true, max: 80 },
      { name: "views", type: "number", onlyInt: true, min: 0, max: 100000 },
      { name: "seconds", type: "number", onlyInt: true, min: 0, max: 86400 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_activity_daily_unique ON activity_daily (user, day, key)",
      "CREATE INDEX idx_activity_daily_day ON activity_daily (day)",
    ],
  }));
}, (app) => {
  app.delete(app.findCollectionByNameOrId("activity_daily"));
});
