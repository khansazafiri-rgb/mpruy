/// <reference path="../pb_data/types.d.ts" />

// SOAL YANG SALAH (lihat lib/wrong.js)
//
//   GET  /api/medcoel/wrong?subject=ID&chapter=ID&page=1&perPage=10
//        daftar soal yang jawaban terakhirnya salah, lengkap dengan kunci, pembahasan, dan jawaban pengguna,
//        plus ringkasan per mata kuliah dan BAB untuk saringan
//   POST /api/medcoel/attempts/wrong   { subject?, chapter?, count?, mode? }
//        latihan baru berisi soal-soal salah itu (jawab benar = soal keluar dari daftar)

routerAdd("GET", "/api/medcoel/wrong", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const wrong = require(`${__hooks}/lib/wrong.js`);
  const user = u.requireUser(e);
  const all = wrong.rows(e.app, user);
  const subject = u.query(e, "subject");
  const chapter = u.query(e, "chapter");
  const shown = wrong.filter(all, subject, chapter);
  const perPage = Math.max(1, Math.min(30, parseInt(u.query(e, "perPage"), 10) || 10));
  const pages = Math.max(1, Math.ceil(shown.length / perPage));
  const page = Math.max(1, Math.min(pages, parseInt(u.query(e, "page"), 10) || 1));
  const slice = shown.slice((page - 1) * perPage, page * perPage);

  const items = [];
  if (slice.length) {
    const qs = {};
    learn.loadQuestions(e.app, slice.map((r) => r.question)).forEach((q) => { qs[q.id] = q; });
    const ans = {};
    e.app.findRecordsByIds("answers", slice.map((r) => r.answer)).forEach((a) => { ans[a.id] = a; });
    const attempts = {};
    e.app.findRecordsByIds("attempts", slice.map((r) => r.attempt).filter((v, i, a) => a.indexOf(v) === i)).forEach((a) => { attempts[a.id] = a; });
    const titles = learn.chapterTitles(e.app, slice.map((r) => r.chapter));
    const subjectNames = {};
    e.app.findRecordsByIds("subjects", slice.map((r) => r.subject).filter((v, i, a) => a.indexOf(v) === i)).forEach((s) => { subjectNames[s.id] = s.getString("name"); });
    slice.forEach((r) => {
      const q = qs[r.question];
      const a = ans[r.answer];
      if (!q || !a) return;
      const response = u.recJson(a, "response", null);
      const g = learn.grade(q, response);
      const at = attempts[r.attempt];
      items.push({
        id: q.id,
        question: learn.serialize(q, true, titles, e.app),
        response: response,
        detail: g.detail || undefined,
        times: r.times,
        answeredAt: r.answeredAt,
        attempt: at ? { id: at.id, title: at.getString("title"), kind: at.getString("kind") } : null,
        subject: { id: r.subject, name: subjectNames[r.subject] || "" },
        chapter: { id: r.chapter, title: titles[r.chapter] || "" },
      });
    });
  }
  return e.json(200, {
    total: all.length,
    count: shown.length,
    page: page,
    perPage: perPage,
    totalPages: pages,
    subjects: wrong.summary(e.app, all),
    items: items,
  });
});

routerAdd("POST", "/api/medcoel/attempts/wrong", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const wrong = require(`${__hooks}/lib/wrong.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  const subjectId = String(b.subject || "");
  const chapterId = String(b.chapter || "");
  const picked = wrong.filter(wrong.rows(e.app, user), subjectId, chapterId);
  if (!picked.length) throw new BadRequestError("Tidak ada soal salah di pilihan ini. Mantap!");
  const want = b.count === "all" ? 100 : parseInt(b.count, 10) || 20;
  const n = Math.max(1, Math.min(100, want, picked.length));
  const mode = b.mode === "exam" ? "exam" : "learning";
  const chosen = learn.shuffle(picked).slice(0, n);
  // Mata kuliah percobaan: yang dipilih, atau satu-satunya mata kuliah di antara soal terpilih.
  const subjects = chosen.map((r) => r.subject).filter((v, i, a) => a.indexOf(v) === i);
  const subjectOf = subjectId || (subjects.length === 1 ? subjects[0] : "");
  let title = "Ulangi soal salah";
  try { if (subjectOf) title += " " + e.app.findRecordById("subjects", subjectOf).getString("name"); } catch (_) {}
  try { if (chapterId) title += " · " + e.app.findRecordById("chapters", chapterId).getString("title"); } catch (_) {}
  const rec = att.create(e.app, user, {
    kind: "practice",
    mode: mode,
    subject: subjectOf,
    title: title,
    settings: { wrongRetry: true, subject: subjectId, chapter: chapterId, count: n, mode: mode },
    ids: chosen.map((r) => r.question),
    timerMinutes: 0,
  });
  const out = att.payload(e.app, user, rec);
  out.available = picked.length;
  return e.json(200, out);
});
