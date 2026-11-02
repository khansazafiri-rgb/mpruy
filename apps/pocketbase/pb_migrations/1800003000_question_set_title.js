/// <reference path="../pb_data/types.d.ts" />

// JUDUL BAGIAN SOAL DRILLING (diambil dari judul PDF).
//
// Soal Drilling dikelompokkan per "bagian": satu bagian = satu PDF/berkas soal, bernama judul PDF-nya.
// Siswa melihat bagian-bagian itu di Drilling mata kuliah dan bisa berlatih per bagian atau semuanya.
// `questions.setTitle` kosong = bagian "Soal lainnya" (soal lama, atau pengajuan beberapa PDF tanpa nomor PDF).
//
// Soal Drilling lama yang berasal dari pengajuan dengan tepat satu PDF diberi judul dari nama PDF itu.
migrate((app) => {
  const q = app.findCollectionByNameOrId("questions");
  q.fields.add(new TextField({ name: "setTitle", max: 200 }));
  q.indexes = (q.indexes || []).concat(["CREATE INDEX idx_questions_set ON questions (subject, setTitle)"]);
  app.save(q);

  const clean = (name) => String(name || "").replace(/\.pdf$/i, "").replace(/[_\s-]*compressed$/i, "")
    .replace(/\.(docx?|pptx?|xlsx?|odt|odp)$/i, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  const titleOf = {};
  try {
    app.findRecordsByFilter("questions", "submission != '' && chapter.drilling = true", "", 0, 0).forEach((r) => {
      const sub = r.getString("submission");
      if (titleOf[sub] === undefined) {
        const files = app.findRecordsByFilter("stored_files", "submission = {:s} && (status = 'ready' || status = 'archived')", "created", 0, 0, { s: sub });
        titleOf[sub] = files.length === 1 ? clean(files[0].getString("name")) : "";
      }
      r.set("setTitle", titleOf[sub]);
      app.saveNoValidate(r);
    });
  } catch (err) {
    console.log("[setTitle] isi judul bagian untuk soal lama dilewati:", err);
  }
}, (app) => {
  const q = app.findCollectionByNameOrId("questions");
  q.indexes = (q.indexes || []).filter((i) => i.indexOf("idx_questions_set") < 0);
  q.fields.removeByName("setTitle");
  app.save(q);
});
