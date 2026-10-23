/// <reference path="../pb_data/types.d.ts" />
// Hasil Simulasi Dokter per pengguna. Semua akses lewat endpoint
// /api/medcoel/doctor-sim/* (aturan API koleksi ditutup).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  app.save(new Collection({
    type: "base", name: "doctor_sims", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "caseKey", type: "text", required: true, max: 20 },
      { name: "caseTitle", type: "text", max: 120 },
      { name: "dxKey", type: "text", max: 40 },
      { name: "dxOk", type: "bool" },
      { name: "score", type: "number", min: 0, max: 100, onlyInt: true },
      { name: "durationSec", type: "number", min: 0, max: 86400, onlyInt: true },
      { name: "mode", type: "select", maxSelect: 1, values: ["santai", "timer"] },
      { name: "timeout", type: "bool" },
      { name: "actionsCount", type: "number", min: 0, max: 1000, onlyInt: true },
      { name: "keyDone", type: "number", min: 0, max: 1000, onlyInt: true },
      { name: "keyTotal", type: "number", min: 0, max: 1000, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_doctor_sims_user_created ON doctor_sims (user, created)"],
  }));
}, (app) => {
  // Hasil latihan pengguna dipertahankan bila rilis dibatalkan.
});
