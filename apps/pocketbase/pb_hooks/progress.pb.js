/// <reference path="../pb_data/types.d.ts" />

// PROGRES SAYA DAN LEADERBOARD

// BAB dianggap tuntas bila minimal 80% soalnya (yang bisa kamu lihat) sudah
// pernah dikerjakan.
routerAdd("GET", "/api/medcoel/progress", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const user = u.requireUser(e);
  const TUNTAS = 0.8;

  // Aktivitas harian 30 hari terakhir (WIB).
  const today = u.localDate(new Date(), "WIB");
  const from = u.localDate(new Date(Date.now() - 29 * 86400000), "WIB");
  const days = e.app.findRecordsByFilter("daily_activity", "user = {:u} && date >= {:f}", "date", 0, 0, { u: user.id, f: from });
  const byDate = {};
  days.forEach((d) => { byDate[d.getString("date")] = { answered: d.getInt("answered"), correct: d.getInt("correct") }; });
  const daily = [];
  for (let i = 29; i >= 0; i--) {
    const d = u.localDate(new Date(Date.now() - i * 86400000), "WIB");
    daily.push(Object.assign({ date: d }, byDate[d] || { answered: 0, correct: 0 }));
  }
  // Hari aktif berturut-turut, dihitung mundur dari hari ini (atau kemarin bila hari ini belum belajar).
  const all = e.app.findRecordsByFilter("daily_activity", "user = {:u} && answered > 0", "-date", 400, 0, { u: user.id });
  const set = {};
  all.forEach((d) => { set[d.getString("date")] = true; });
  let streak = 0;
  let cursor = set[today] ? 0 : 1;
  for (;;) {
    const d = u.localDate(new Date(Date.now() - cursor * 86400000), "WIB");
    if (!set[d]) break;
    streak++;
    cursor++;
  }
  const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0);

  // Per mata kuliah.
  const subjects = e.app.findRecordsByFilter("subjects", "hidden = false", "order,name", 200, 0);
  const pool = learn.pool(e.app, user, {});
  const chSubject = {};
  e.app.findRecordsByFilter("chapters", "hidden = false", "", 0, 0).forEach((c) => { chSubject[c.id] = c.getString("subject"); });
  const perCh = {};
  pool.forEach((it) => {
    const p = (perCh[it.chapter] = perCh[it.chapter] || { total: 0, seen: 0 });
    p.total++;
    if (it.seen) p.seen++;
  });
  const acc = arrayOf(new DynamicModel({ subject: "", answered: 0, correct: 0 }));
  e.app
    .db()
    .newQuery("SELECT subject, COUNT(*) AS answered, SUM(CASE WHEN correct = TRUE THEN 1 ELSE 0 END) AS correct FROM answers WHERE user = {:u} AND scored = TRUE AND locked = TRUE GROUP BY subject")
    .bind({ u: user.id })
    .all(acc);
  const accMap = {};
  acc.forEach((r) => { accMap[r.subject] = r; });
  const studying = user.getStringSlice("studyingSubjects");
  const perSubject = subjects.map((s) => {
    const chs = Object.keys(chSubject).filter((c) => chSubject[c] === s.id && perCh[c]);
    const done = chs.filter((c) => perCh[c].seen / perCh[c].total >= TUNTAS).length;
    const a = accMap[s.id] || { answered: 0, correct: 0 };
    return {
      id: s.id,
      name: s.getString("name"),
      slug: s.getString("slug"),
      studying: studying.indexOf(s.id) >= 0,
      chaptersWithQuestions: chs.length,
      chaptersDone: done,
      chaptersDonePct: chs.length ? Math.round((done / chs.length) * 100) : 0,
      answered: a.answered,
      correctPct: a.answered ? Math.round((a.correct / a.answered) * 100) : 0,
    };
  });

  // Riwayat skor simulasi/paket.
  const attempts = e.app.findRecordsByFilter("attempts", "user = {:u} && status = 'finished' && score >= 0", "-finishedAt", 30, 0, { u: user.id });
  const scores = attempts.reverse().map((a) => ({
    id: a.id,
    kind: a.getString("kind"),
    title: a.getString("title"),
    score: a.getFloat("score"),
    finishedAt: a.getString("finishedAt"),
  }));

  // Ujian terdekat.
  let nextExam = null;
  try {
    const list = e.app.findRecordsByFilter("exam_schedules", "user = {:u} && examAt >= {:now}", "examAt", 1, 0, { u: user.id, now: u.pbDate(new Date()) });
    if (list.length) {
      const x = list[0];
      let subjectName = "";
      try { subjectName = e.app.findRecordById("subjects", x.getString("subject")).getString("name"); } catch (_) {}
      nextExam = { id: x.id, title: x.getString("title"), subjectName: subjectName, examAt: x.getString("examAt"), timezone: x.getString("timezone") };
    }
  } catch (_) {}

  return e.json(200, {
    streak: streak,
    last7: { answered: sum(daily.slice(-7), "answered"), correct: sum(daily.slice(-7), "correct"), activeDays: daily.slice(-7).filter((d) => d.answered > 0).length },
    last30: { answered: sum(daily, "answered"), correct: sum(daily, "correct"), activeDays: daily.filter((d) => d.answered > 0).length },
    daily: daily,
    subjects: perSubject.sort(require(`${__hooks}/lib/catalogOrder.js`).byPreference),
    scores: scores,
    nextExam: nextExam,
    totalPoints: pointsOf(user.id),
  });

  function pointsOf(uid) {
    return require(`${__hooks}/lib/leaderboard.js`).totalOf(e.app, uid);
  }
});

// Leaderboard gabungan. period: week | all. scope: all | campus.
// Poin = poin soal (benar di percobaan pertama) + poin Simulasi Dokter
// (skor terbaik per kasus dalam periode x pointsSimulation / 100).
routerAdd("GET", "/api/medcoel/leaderboard", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const lb = require(`${__hooks}/lib/leaderboard.js`);
  const user = u.requireUser(e);
  const period = u.query(e, "period") === "all" ? "all" : "week";
  const scope = u.query(e, "scope") === "campus" ? "campus" : "all";
  const since = period === "week" ? u.startOfWeekWib(new Date()) : null;
  if (scope === "campus" && !user.getString("campus")) {
    return e.json(200, { period: period, scope: scope, items: [], me: null, note: "Akunmu belum punya kampus, jadi peringkat per kampus belum tersedia. Isi kampusmu di Profil untuk memakainya." });
  }
  const rows = lb.rows(e.app, { since: since, campus: scope === "campus" ? user.getString("campus") : "" });

  const campusNames = {};
  const nameOf = (id) => {
    if (!id) return "";
    if (campusNames[id] === undefined) {
      try { campusNames[id] = e.app.findRecordById("campuses", id).getString("name"); } catch (_) { campusNames[id] = ""; }
    }
    return campusNames[id];
  };
  // Julukan tiap baris yang tampil (50 teratas dan diri sendiri), dihitung sekaligus.
  const ach = require(`${__hooks}/lib/achievements.js`);
  const shownIds = rows.slice(0, 50).map((r) => r.user);
  const mine = rows.find((r) => r.user === user.id);
  if (mine) shownIds.push(mine.user);
  const stats = ach.collect(e.app, shownIds, { withStreak: true });
  const totals = ach.subjectTotals(e.app);
  const titleOf = (uid) => { const t = stats[uid] ? ach.evaluate(stats[uid], totals).title : null; return t ? t.title : ""; };
  let me = null;
  let rank = 0;
  let prev = null;
  const items = rows.map((r, i) => {
    if (r.points !== prev) { rank = i + 1; prev = r.points; }
    const entry = {
      rank: rank,
      name: u.displayName(r.name, r.anon),
      campus: r.anon ? "" : nameOf(r.campus),
      points: r.points,
      questionPoints: r.qpoints,
      simPoints: r.spoints,
      isMe: r.user === user.id,
      title: i < 50 || r.user === user.id ? titleOf(r.user) : "",
    };
    if (entry.isMe) me = entry;
    return entry;
  });
  return e.json(200, { period: period, scope: scope, since: since ? since.toISOString() : "", simPerCase: lb.simWeight(e.app), items: items.slice(0, 50), me: me });
});

// Pencapaian dan julukan diri sendiri (dihitung dari data yang ada, tidak mengubah poin).
routerAdd("GET", "/api/medcoel/achievements", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const ach = require(`${__hooks}/lib/achievements.js`);
  const user = u.requireUser(e);
  const stats = ach.collect(e.app, [user.id], { withStreak: true })[user.id];
  return e.json(200, ach.evaluate(stats, ach.subjectTotals(e.app)));
});
