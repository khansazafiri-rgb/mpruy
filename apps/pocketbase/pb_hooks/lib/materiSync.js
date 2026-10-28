// Memasukkan catatan materi dari apps/pocketbase/content/materi (index.json + file .md) ke chapter_notes.
// Dipanggil saat PocketBase mulai (pb_hooks/materi.pb.js), jadi cukup `git pull` + restart untuk memperbarui.
//
// Aturan per BAB (isi catatan = C, sidik jari tersimpan = H, isi di berkas = F):
//   belum ada catatan, atau kosong ................ dibuat dari F
//   H = sha256(C)        (belum pernah disunting) .. diperbarui bila F berbeda
//   H ada tetapi C sudah berbeda ................. disunting admin: dilewati
//   H kosong dan C berpenanda materi:v2 .......... hasil pemasangan lama (sebelum ada H): diperbarui
//   H kosong dan C tanpa penanda ................. tulisan admin: dilewati
const MARK = "<!-- materi:v2 -->";

function sync(app) {
  const base = `${__hooks}/../content/materi`;
  let index;
  try {
    index = JSON.parse(toString($os.readFile(`${base}/index.json`)));
  } catch (_) {
    return { made: 0, updated: 0, same: 0, skipped: 0, missing: 0, absent: true };
  }
  const notes = app.findCollectionByNameOrId("chapter_notes");
  const out = { made: 0, updated: 0, same: 0, skipped: 0, missing: 0, absent: false };
  index.forEach((e) => {
    let chapter;
    try {
      const subject = app.findFirstRecordByFilter("subjects", "slug = {:s}", { s: e.subject });
      chapter = app.findFirstRecordByFilter("chapters", "subject = {:s} && title = {:t} && drilling = false", { s: subject.id, t: e.chapter });
    } catch (_) {
      console.log(`[materi] BAB tidak ditemukan: ${e.subject} / ${e.chapter}`);
      out.missing++;
      return;
    }
    const content = toString($os.readFile(`${base}/${e.file}`));
    const hash = $security.sha256(content);
    let rec = null;
    try { rec = app.findFirstRecordByFilter("chapter_notes", "chapter = {:c}", { c: chapter.id }); } catch (_) { rec = null; }
    if (!rec) {
      rec = new Record(notes);
      rec.set("chapter", chapter.id);
      rec.set("content", content);
      rec.set("seedHash", hash);
      app.save(rec);
      out.made++;
      return;
    }
    const current = rec.getString("content");
    const stored = rec.getString("seedHash");
    if (current === content) {
      if (stored !== hash) { rec.set("seedHash", hash); app.save(rec); }
      out.same++;
      return;
    }
    const untouched = !current.trim() || (stored ? $security.sha256(current) === stored : current.indexOf(MARK) === 0);
    if (!untouched) { out.skipped++; return; }
    rec.set("content", content);
    rec.set("seedHash", hash);
    app.save(rec);
    out.updated++;
  });
  return out;
}

module.exports = { sync, MARK };
