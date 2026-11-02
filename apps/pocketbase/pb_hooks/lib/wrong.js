// SOAL YANG SALAH: kumpulan soal yang jawaban terakhir penggunanya salah, dari semua percobaan (latihan topik,
// paket, simulasi, Drilling). Soal keluar dari kumpulan ini begitu dijawab benar lagi di percobaan mana pun.
//
// Hanya jawaban yang sudah "terkunci" yang dihitung (mode Learning setelah Cek jawaban, atau percobaan yang sudah
// selesai), sehingga kunci dan pembahasan yang ditampilkan memang sudah boleh dilihat pengguna itu.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const learn = require(HOOKS + "/lib/learn.js");

/**
 * Semua soal salah milik pengguna, terbaru dulu. Mengembalikan
 * [{ answer, question, attempt, subject, chapter, answeredAt, times }] (times = berapa kali salah sampai sekarang).
 */
function rows(app, user) {
  const params = { user: user.id };
  const where = [
    "a.user = {:user} AND a.locked = TRUE AND a.scored = TRUE AND a.correct = FALSE",
    "q.status = 'published' AND c.hidden = FALSE AND s.hidden = FALSE",
    // jawaban ini yang paling baru untuk soalnya
    "NOT EXISTS (SELECT 1 FROM answers b WHERE b.user = a.user AND b.question = a.question AND b.locked = TRUE AND b.scored = TRUE " +
      "AND (b.created > a.created OR (b.created = a.created AND b.id > a.id)))",
  ];
  // Aturan kampus yang sama dengan kumpulan soal biasa (learn.pool).
  if (u.roleOf(user) !== "admin") {
    const campus = user.getString("campus");
    if (campus) {
      where.push("(q.scope = 'all' OR EXISTS (SELECT 1 FROM json_each(q.campuses) WHERE value = {:campus}))");
      params.campus = campus;
    } else {
      where.push("q.scope = 'all'");
    }
  }
  const out = arrayOf(new DynamicModel({ answer: "", question: "", attempt: "", subject: "", chapter: "", answeredAt: "", times: 0 }));
  app
    .db()
    .newQuery(
      "SELECT a.id AS answer, a.question AS question, a.attempt AS attempt, q.subject AS subject, q.chapter AS chapter, a.created AS answeredAt, " +
        "(SELECT COUNT(*) FROM answers w WHERE w.user = a.user AND w.question = a.question AND w.locked = TRUE AND w.scored = TRUE AND w.correct = FALSE) AS times " +
        "FROM answers a JOIN questions q ON q.id = a.question JOIN chapters c ON c.id = q.chapter JOIN subjects s ON s.id = q.subject " +
        "WHERE " + where.join(" AND ") + " ORDER BY a.created DESC, a.id DESC",
    )
    .bind(params)
    .all(out);
  return out.map((r) => ({ answer: r.answer, question: r.question, attempt: r.attempt, subject: r.subject, chapter: r.chapter, answeredAt: r.answeredAt, times: r.times }));
}

/** Ringkasan per mata kuliah dan BAB (untuk saringan di halaman): [{ id, name, slug, count, chapters: [{ id, title, count }] }]. */
function summary(app, all) {
  const subjects = {};
  const order = [];
  all.forEach((r) => {
    if (!subjects[r.subject]) { subjects[r.subject] = { id: r.subject, count: 0, chapters: {}, chapterOrder: [] }; order.push(r.subject); }
    const s = subjects[r.subject];
    s.count++;
    if (!s.chapters[r.chapter]) { s.chapters[r.chapter] = { id: r.chapter, count: 0 }; s.chapterOrder.push(r.chapter); }
    s.chapters[r.chapter].count++;
  });
  const subjectRecs = {};
  if (order.length) app.findRecordsByIds("subjects", order).forEach((s) => { subjectRecs[s.id] = s; });
  const chapterIds = [];
  order.forEach((id) => subjects[id].chapterOrder.forEach((c) => chapterIds.push(c)));
  const titles = learn.chapterTitles(app, chapterIds);
  const list = order.map((id) => {
    const s = subjects[id];
    const rec = subjectRecs[id];
    return {
      id: id,
      name: rec ? rec.getString("name") : "",
      slug: rec ? rec.getString("slug") : "",
      count: s.count,
      chapters: s.chapterOrder.map((c) => ({ id: c, title: titles[c] || "", count: s.chapters[c].count })).sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0)),
    };
  });
  list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return list;
}

/** Menyaring baris menurut mata kuliah dan BAB (id; kosong = semua). */
function filter(all, subject, chapter) {
  return all.filter((r) => (!subject || r.subject === subject) && (!chapter || r.chapter === chapter));
}

module.exports = { rows, summary, filter };
