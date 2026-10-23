/// <reference path="../pb_data/types.d.ts" />
// Leaderboard gabungan soal + Simulasi Dokter. pointsSimulation = poin untuk
// skor 100 di satu kasus (skor terbaik per kasus per periode yang dihitung).
migrate((app) => {
  const col = app.findCollectionByNameOrId("app_settings");
  col.fields.add(new NumberField({ name: "pointsSimulation", onlyInt: true, min: 0, max: 1000 }));
  app.save(col);
  app.findRecordsByFilter("app_settings", "id != ''", "", 0, 0).forEach((r) => { r.set("pointsSimulation", 10); app.save(r); });
}, (app) => {
  const col = app.findCollectionByNameOrId("app_settings");
  col.fields.removeByName("pointsSimulation");
  app.save(col);
});
