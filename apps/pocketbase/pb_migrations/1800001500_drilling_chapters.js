/// <reference path="../pb_data/types.d.ts" />
// Setiap mata kuliah punya BAB khusus Drilling sejak awal (disembunyikan dari daftar BAB), supaya admin
// bisa memilih "Drilling" saat mengimpor atau menulis soal tanpa menunggu soal pertama dari Hermes Agent.
// Mata kuliah baru mendapat BAB ini otomatis (hook di learn.pb.js).
migrate((app) => {
  const chapters = app.findCollectionByNameOrId("chapters");
  app.findRecordsByFilter("subjects", "id != ''", "", 0, 0).forEach((s) => {
    let have = null;
    try { have = app.findFirstRecordByFilter("chapters", "subject = {:s} && drilling = true", { s: s.id }); } catch (_) { have = null; }
    if (have) return;
    const c = new Record(chapters);
    c.set("subject", s.id);
    c.set("title", "Drilling");
    c.set("order", 9999);
    c.set("hidden", false);
    c.set("drilling", true);
    app.save(c);
  });
}, (app) => {
  app.findRecordsByFilter("chapters", "drilling = true", "", 0, 0).forEach((c) => {
    const n = app.countRecords("questions", $dbx.exp("chapter = {:c}", { c: c.id }));
    if (n === 0) app.delete(c);
  });
});
