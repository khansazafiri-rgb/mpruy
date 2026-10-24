/// <reference path="../pb_data/types.d.ts" />
// Drilling: kumpulan soal General per mata kuliah tanpa BAB. Disimpan sebagai satu
// "BAB" khusus per mata kuliah (chapters.drilling = true) supaya semua mekanisme soal
// yang ada (jawaban, laporan, poin, riwayat) tetap dipakai. BAB khusus itu tidak
// ikut daftar BAB, simulasi, paket, dan progres per BAB.
// app_settings.drillingEnabled: sakelar admin untuk menampilkan menu Drilling
// (bawaan mati; menu juga baru tampil bila sudah ada soal drilling).
migrate((app) => {
  const ch = app.findCollectionByNameOrId("chapters");
  ch.fields.add(new BoolField({ name: "drilling" }));
  app.save(ch);
  app.findRecordsByFilter("chapters", "id != ''", "", 0, 0).forEach((r) => { r.set("drilling", false); app.saveNoValidate(r); });

  const st = app.findCollectionByNameOrId("app_settings");
  st.fields.add(new BoolField({ name: "drillingEnabled" }));
  app.save(st);
  app.findRecordsByFilter("app_settings", "id != ''", "", 0, 0).forEach((r) => { r.set("drillingEnabled", false); app.save(r); });
}, (app) => {
  const ch = app.findCollectionByNameOrId("chapters");
  ch.fields.removeByName("drilling");
  app.save(ch);
  const st = app.findCollectionByNameOrId("app_settings");
  st.fields.removeByName("drillingEnabled");
  app.save(st);
});
