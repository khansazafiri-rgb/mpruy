/// <reference path="../pb_data/types.d.ts" />

// Memasukkan catatan materi per BAB dari apps/pocketbase/content/materi (index.json
// + satu file Markdown per BAB; dibuat oleh tools/materi-import dari dokumen
// "Catatan Belajar Lengkap").
//
// Aman dijalankan ulang dan tidak menimpa pekerjaan admin: BAB yang sudah punya
// catatan tulisan tangan (isi tanpa penanda "materi:v2") dilewati. Catatan yang
// berasal dari impor sebelumnya (berpenanda) boleh diperbarui. Untuk memperbarui
// isi setelah dokumen sumber berubah, jalankan ulang konverter lalu
// `node apps/pocketbase/scripts/import-materi.mjs` (lihat docs/CATATAN_MATERI.md).
migrate((app) => {
  const base = `${__hooks}/../content/materi`;
  let index;
  try {
    index = JSON.parse(toString($os.readFile(`${base}/index.json`)));
  } catch (_) {
    console.log("[materi] content/materi/index.json tidak ditemukan; dilewati.");
    return;
  }
  const MARK = "<!-- materi:v2 -->";
  const notes = app.findCollectionByNameOrId("chapter_notes");
  let made = 0, updated = 0, skipped = 0, missing = 0;
  index.forEach((e) => {
    let chapter;
    try {
      const subject = app.findFirstRecordByFilter("subjects", "slug = {:s}", { s: e.subject });
      chapter = app.findFirstRecordByFilter("chapters", "subject = {:s} && title = {:t} && drilling = false", { s: subject.id, t: e.chapter });
    } catch (_) {
      console.log(`[materi] BAB tidak ditemukan: ${e.subject} / ${e.chapter}`);
      missing++;
      return;
    }
    const content = toString($os.readFile(`${base}/${e.file}`));
    let rec = null;
    try { rec = app.findFirstRecordByFilter("chapter_notes", "chapter = {:c}", { c: chapter.id }); } catch (_) { rec = null; }
    if (rec) {
      const old = rec.getString("content").trim();
      if (old && old.indexOf(MARK) !== 0) { skipped++; return; }
      rec.set("content", content);
      app.save(rec);
      updated++;
      return;
    }
    rec = new Record(notes);
    rec.set("chapter", chapter.id);
    rec.set("content", content);
    app.save(rec);
    made++;
  });
  console.log(`[materi] ${made} dibuat, ${updated} diperbarui, ${skipped} dilewati (tulisan admin), ${missing} BAB tidak ditemukan.`);
}, () => {
  // Tidak ada yang dihapus saat mundur: catatan mungkin sudah disunting admin.
});
