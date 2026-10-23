/// <reference path="../pb_data/types.d.ts" />
// showMascots: maskot (Kori, Kila, Nilo) tampil di halaman pengguna. Bisa
// dimatikan admin di Pengaturan > Umum.
migrate((app) => {
  const col = app.findCollectionByNameOrId("app_settings");
  col.fields.add(new BoolField({ name: "showMascots" }));
  app.save(col);
  app.findRecordsByFilter("app_settings", "id != ''", "", 0, 0).forEach((r) => { r.set("showMascots", true); app.save(r); });
}, (app) => {
  const col = app.findCollectionByNameOrId("app_settings");
  col.fields.removeByName("showMascots");
  app.save(col);
});
