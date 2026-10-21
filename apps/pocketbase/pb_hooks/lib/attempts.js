// Percobaan (attempt): membuat, menyajikan, menyimpan jawaban, dan
// menyelesaikan. Dipakai learn.pb.js.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const learn = require(HOOKS + "/lib/learn.js");

// Toleransi waktu setelah timer habis (detik), untuk jaringan yang lambat.
const GRACE_SEC = 120;
// Rata-rata di bawah ini per soal dianggap tidak wajar dan tidak diberi poin.
const MIN_SEC_PER_QUESTION = 3;

function create(app, user, o) {
  const col = app.findCollectionByNameOrId("attempts");
  const r = new Record(col);
  r.set("user", user.id);
  r.set("kind", o.kind);
  r.set("mode", o.mode);
  r.set("title", String(o.title || "").slice(0, 300));
  if (o.subject) r.set("subject", o.subject);
  if (o.pkg) r.set("package", o.pkg);
  r.set("settings", o.settings || {});
  r.set("questionIds", o.ids);
  r.set("status", "in_progress");
  r.set("timerMinutes", o.timerMinutes || 0);
  r.set("startedAt", u.pbDate(new Date()));
  r.set("points", 0);
  app.save(r);
  return r;
}

function own(app, user, id) {
  let r;
  try { r = app.findRecordById("attempts", String(id || "")); } catch (_) { r = null; }
  if (!r || r.getString("user") !== user.id) throw new NotFoundError("Percobaan tidak ditemukan.");
  return r;
}

function deadline(rec) {
  const t = rec.getInt("timerMinutes");
  const st = u.parseDate(rec.getString("startedAt"));
  if (!t || !st) return null;
  return new Date(st.getTime() + t * 60000);
}

function answersOf(app, rec) {
  const map = {};
  app.findRecordsByFilter("answers", "attempt = {:a}", "", 0, 0, { a: rec.id }).forEach((a) => {
    map[a.getString("question")] = a;
  });
  return map;
}

function payload(app, user, rec) {
  const ids = u.recJson(rec, "questionIds", []) || [];
  const qs = learn.loadQuestions(app, ids);
  const titles = learn.chapterTitles(app, qs.map((q) => q.getString("chapter")));
  const ans = answersOf(app, rec);
  const finished = rec.getString("status") === "finished";
  const learning = rec.getString("mode") === "learning";

  const questions = [];
  const answers = {};
  qs.forEach((q) => {
    const a = ans[q.id];
    const reveal = finished || (learning && a && a.getBool("locked"));
    questions.push(learn.serialize(q, reveal, titles));
    if (a) {
      const entry = { response: u.recJson(a, "response", null), locked: a.getBool("locked") };
      if (reveal) {
        entry.correct = a.getBool("correct");
        entry.scored = a.getBool("scored");
        entry.points = a.getInt("points");
        const g = learn.grade(q, entry.response);
        if (g.detail) entry.detail = g.detail;
      }
      answers[q.id] = entry;
    }
  });
  const dl = deadline(rec);
  return {
    attempt: {
      id: rec.id,
      kind: rec.getString("kind"),
      mode: rec.getString("mode"),
      title: rec.getString("title"),
      status: rec.getString("status"),
      subject: rec.getString("subject"),
      package: rec.getString("package"),
      settings: u.recJson(rec, "settings", {}),
      timerMinutes: rec.getInt("timerMinutes"),
      deadline: dl ? dl.toISOString() : "",
      startedAt: rec.getString("startedAt"),
      finishedAt: rec.getString("finishedAt"),
      score: rec.getFloat("score"),
      correctCount: rec.getInt("correctCount"),
      scoredCount: rec.getInt("scoredCount"),
      breakdown: u.recJson(rec, "breakdown", {}),
      points: rec.getInt("points"),
      flagged: rec.getBool("flagged"),
      durationSec: rec.getInt("durationSec"),
      total: ids.length,
    },
    questions: questions,
    answers: answers,
  };
}

function validResponse(q, response) {
  const t = q.getString("qtype");
  if (response === undefined || response === null) return null;
  if (t === "A" || t === "K") {
    const L = String(response).toUpperCase();
    const opts = u.recJson(q, "options", []) || [];
    if (!opts.some((o) => o.label === L)) throw new BadRequestError("Pilihan jawaban tidak dikenal.");
    return L;
  }
  if (typeof response !== "object" || Array.isArray(response)) throw new BadRequestError("Bentuk jawaban isian tidak sah.");
  const out = {};
  const subs = u.recJson(q, "subQuestions", []) || [];
  subs.forEach((s) => {
    const v = response[s.label];
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) out[s.label] = v.slice(0, 20).map((x) => String(x === undefined || x === null ? "" : x).slice(0, 2000));
    else out[s.label] = String(v).slice(0, 2000);
  });
  return out;
}

// check=true pada mode Learning: kunci dibuka dan jawaban dikunci.
function answer(app, user, rec, qid, response, check) {
  if (rec.getString("status") !== "in_progress") throw new ApiError(409, "Percobaan ini sudah selesai.");
  const ids = u.recJson(rec, "questionIds", []) || [];
  if (ids.indexOf(qid) < 0) throw new BadRequestError("Soal ini bukan bagian dari percobaan.");
  const dl = deadline(rec);
  if (dl && Date.now() > dl.getTime() + GRACE_SEC * 1000) {
    throw new ApiError(409, "Waktu pengerjaan sudah habis. Jawaban terakhir tidak tersimpan.");
  }
  let q;
  try { q = app.findRecordById("questions", qid); } catch (_) { throw new NotFoundError("Soal sudah tidak tersedia."); }

  let a = null;
  try { a = app.findFirstRecordByFilter("answers", "attempt = {:a} && question = {:q}", { a: rec.id, q: qid }); } catch (_) { a = null; }
  const learning = rec.getString("mode") === "learning";

  if (a && a.getBool("locked")) {
    return {
      alreadyChecked: true,
      result: { correct: a.getBool("correct"), scored: a.getBool("scored"), detail: learn.grade(q, u.recJson(a, "response", null)).detail },
      question: learn.serialize(q, true, learn.chapterTitles(app, [q.getString("chapter")])),
    };
  }

  const resp = validResponse(q, response);
  const g = learn.grade(q, resp);
  let isNew = false;
  if (!a) {
    isNew = true;
    a = new Record(app.findCollectionByNameOrId("answers"));
    a.set("user", user.id);
    a.set("attempt", rec.id);
    a.set("question", q.id);
    a.set("subject", q.getString("subject"));
    a.set("chapter", q.getString("chapter"));
    a.set("difficulty", q.getString("difficulty"));
    a.set("qtype", q.getString("qtype"));
    const before = app.countRecords("answers", $dbx.exp("user = {:u} AND question = {:q}", { u: user.id, q: q.id }));
    a.set("firstTry", before === 0);
    a.set("points", 0);
  }
  a.set("response", resp);
  a.set("correct", g.correct);
  a.set("scored", g.scored);
  const lockNow = learning && check;
  a.set("locked", lockNow);
  app.save(a);
  if (isNew) learn.bumpDaily(app, user.id, 1, 0);

  if (lockNow) {
    return {
      result: { correct: g.correct, scored: g.scored, detail: g.detail },
      question: learn.serialize(q, true, learn.chapterTitles(app, [q.getString("chapter")])),
    };
  }
  return { saved: true };
}

function finish(app, user, rec) {
  if (rec.getString("status") === "finished") return rec;
  const ids = u.recJson(rec, "questionIds", []) || [];
  const qs = learn.loadQuestions(app, ids);
  const titles = learn.chapterTitles(app, qs.map((q) => q.getString("chapter")));
  const ans = answersOf(app, rec);
  const start = u.parseDate(rec.getString("startedAt")) || new Date();
  const duration = Math.max(0, Math.round((Date.now() - start.getTime()) / 1000));

  let correct = 0;
  let scored = 0;
  let answeredScored = 0;
  const byChapter = {};
  const byDifficulty = {};
  const byType = {};
  const add = (bag, key, extra, ok) => {
    const b = (bag[key] = bag[key] || Object.assign({ total: 0, correct: 0 }, extra || {}));
    b.total++;
    if (ok) b.correct++;
  };
  qs.forEach((q) => {
    if (q.getString("qtype") === "esai") return;
    scored++;
    const a = ans[q.id];
    const ok = !!a && a.getBool("correct");
    if (a && learn.hasResponse(q, u.recJson(a, "response", null))) answeredScored++;
    if (ok) correct++;
    add(byChapter, q.getString("chapter"), { title: titles[q.getString("chapter")] || "" }, ok);
    add(byDifficulty, q.getString("difficulty"), null, ok);
    add(byType, q.getString("qtype"), null, ok);
  });

  const flagged = answeredScored >= 5 && duration < answeredScored * MIN_SEC_PER_QUESTION;
  let points = 0;
  app.runInTransaction((tx) => {
    Object.keys(ans).forEach((qid) => {
      const a = ans[qid];
      let p = 0;
      if (!flagged && a.getBool("firstTry") && a.getBool("correct") && a.getBool("scored")) {
        p = learn.pointsFor(tx, a.getString("difficulty"));
      }
      points += p;
      a.set("points", p);
      a.set("locked", true);
      tx.save(a);
    });
    const fresh = tx.findRecordById("attempts", rec.id);
    fresh.set("status", "finished");
    fresh.set("finishedAt", u.pbDate(new Date()));
    fresh.set("durationSec", duration);
    fresh.set("correctCount", correct);
    fresh.set("scoredCount", scored);
    fresh.set("score", scored ? Math.round((correct / scored) * 1000) / 10 : -1);
    fresh.set("breakdown", { chapters: byChapter, difficulty: byDifficulty, types: byType });
    fresh.set("points", points);
    fresh.set("flagged", flagged);
    tx.save(fresh);
    if (correct) learn.bumpDaily(tx, user.id, 0, correct);
  });
  return rec;
}

module.exports = { create, own, payload, answer, finish, deadline };
