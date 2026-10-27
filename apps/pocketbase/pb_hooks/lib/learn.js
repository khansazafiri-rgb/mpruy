// Belajar: memilih soal, menyajikan soal tanpa kunci, dan menilai jawaban.
//
// Kunci jawaban dan pembahasan tidak pernah dikirim ke browser sebelum soal
// dijawab (mode Learning) atau percobaan selesai (mode ujian). Dengan begitu
// skor dan leaderboard tidak bisa diakali dengan membaca respons API.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const isian = require(HOOKS + "/lib/isian.js");

const DIFFS = ["easy", "medium", "hard"];

// ---------------------------------------------------------------------------
// Kumpulan soal yang boleh dilihat pengguna (ringan: id + atribut saja)
// ---------------------------------------------------------------------------

// opts: { subject, chapters: [id], types: ["A","K"], drilling: "exclude" (bawaan) | "only" }
// Soal Drilling (BAB khusus chapters.drilling) tidak ikut kumpulan biasa kecuali diminta.
// Mengembalikan [{ id, chapter, difficulty, qtype, seen, wrong }]
function pool(app, user, opts) {
  const where = ["q.status = 'published'"];
  const params = {};
  if (opts.subject) { where.push("q.subject = {:subject}"); params.subject = opts.subject; }
  if (opts.chapters && opts.chapters.length) {
    const keys = opts.chapters.map((c, i) => { params["ch" + i] = c; return "{:ch" + i + "}"; });
    where.push("q.chapter IN (" + keys.join(",") + ")");
  }
  if (opts.types && opts.types.length) {
    const keys = opts.types.map((t, i) => { params["ty" + i] = t; return "{:ty" + i + "}"; });
    where.push("q.qtype IN (" + keys.join(",") + ")");
  }
  // Aturan kampus, sama dengan util.visibleFilter.
  if (opts.campusOnly) {
    const campus = user.getString("campus");
    if (!campus) return [];
    where.push("q.scope = 'campus' AND EXISTS (SELECT 1 FROM json_each(q.campuses) WHERE value = {:campus})");
    params.campus = campus;
  } else if (u.roleOf(user) !== "admin") {
    const campus = user.getString("campus");
    if (campus) {
      where.push("(q.scope = 'all' OR EXISTS (SELECT 1 FROM json_each(q.campuses) WHERE value = {:campus}))");
      params.campus = campus;
    } else {
      where.push("q.scope = 'all'");
    }
  }
  // Hanya BAB dan mata kuliah yang tidak disembunyikan.
  where.push("c.hidden = FALSE AND s.hidden = FALSE");
  where.push(opts.drilling === "only" ? "c.drilling = TRUE" : "COALESCE(c.drilling, FALSE) = FALSE");
  params.user = user.id;

  const rows = arrayOf(new DynamicModel({ id: "", chapter: "", difficulty: "", qtype: "", seen: 0, wrong: 0 }));
  app
    .db()
    .newQuery(
      "SELECT q.id AS id, q.chapter AS chapter, q.difficulty AS difficulty, q.qtype AS qtype, " +
        "(SELECT COUNT(*) FROM answers a WHERE a.user = {:user} AND a.question = q.id) AS seen, " +
        "(SELECT COUNT(*) FROM answers a WHERE a.user = {:user} AND a.question = q.id AND a.scored = TRUE AND a.correct = FALSE AND a.locked = TRUE) AS wrong " +
        "FROM questions q JOIN chapters c ON c.id = q.chapter JOIN subjects s ON s.id = q.subject " +
        "WHERE " + where.join(" AND ") + " ORDER BY q.`order`, q.created",
    )
    .bind(params)
    .all(rows);
  return rows.map((r) => ({
    id: r.id,
    chapter: r.chapter,
    difficulty: r.difficulty,
    qtype: r.qtype,
    seen: r.seen > 0,
    wrong: r.wrong > 0,
  }));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// Memilih n soal dengan tingkat kesulitan dan tipe dibagi seimbang. Soal yang
// belum pernah dikerjakan didahulukan.
function pickBalanced(items, n) {
  const buckets = {};
  items.forEach((it) => {
    const k = it.difficulty + "|" + it.qtype;
    (buckets[k] = buckets[k] || []).push(it);
  });
  const keys = shuffle(Object.keys(buckets));
  keys.forEach((k) => {
    const b = buckets[k];
    buckets[k] = shuffle(b.filter((x) => !x.seen)).concat(shuffle(b.filter((x) => x.seen)));
  });
  // Dahulukan bucket yang masih punya soal baru di tiap putaran.
  const out = [];
  while (out.length < n) {
    let took = false;
    const order = keys.slice().sort((a, b) => {
      const fa = buckets[a][0] && !buckets[a][0].seen ? 0 : 1;
      const fb = buckets[b][0] && !buckets[b][0].seen ? 0 : 1;
      return fa - fb;
    });
    for (const k of order) {
      if (out.length >= n) break;
      const it = buckets[k].shift();
      if (it) { out.push(it); took = true; }
    }
    if (!took) break;
  }
  return out;
}

// Soal per sumber: "unseen" = belum pernah dikerjakan, "wrong" = pernah
// dijawab salah, "all" = semua (yang belum didahulukan).
function bySource(items, source) {
  if (source === "wrong") return items.filter((x) => x.wrong);
  if (source === "unseen") return items.filter((x) => !x.seen);
  return items;
}

// Tipe campuran seimbang: separuh A, separuh K, sisanya diisi tipe apa pun.
function pickMixed(items, n) {
  const a = items.filter((x) => x.qtype === "A");
  const k = items.filter((x) => x.qtype === "K");
  if (!a.length || !k.length) return pickBalanced(items, n);
  const half = Math.ceil(n / 2);
  let fromK = Math.min(k.length, n - Math.min(a.length, half));
  let fromA = Math.min(a.length, n - fromK);
  fromK = Math.min(k.length, n - fromA);
  return shuffle(pickBalanced(a, fromA).concat(pickBalanced(k, fromK)));
}

// ---------------------------------------------------------------------------
// Penyajian soal
// ---------------------------------------------------------------------------

function loadQuestions(app, ids) {
  if (!ids.length) return [];
  const recs = app.findRecordsByIds("questions", ids);
  const map = {};
  recs.forEach((r) => { map[r.id] = r; });
  return ids.map((id) => map[id]).filter(Boolean);
}

function chapterTitles(app, chapterIds) {
  const uniq = chapterIds.filter((v, i, a) => v && a.indexOf(v) === i);
  const out = {};
  if (!uniq.length) return out;
  app.findRecordsByIds("chapters", uniq).forEach((c) => { out[c.id] = c.getString("title"); });
  return out;
}

// withKey=false: tanpa kunci, tanpa pembahasan, tanpa daftar jawaban isian.
function serialize(q, withKey, titles, app) {
  const opts = u.recJson(q, "options", []) || [];
  const subs = u.recJson(q, "subQuestions", []) || [];
  const out = {
    id: q.id,
    qtype: q.getString("qtype"),
    difficulty: q.getString("difficulty"),
    chapter: q.getString("chapter"),
    chapterTitle: titles ? titles[q.getString("chapter")] || "" : "",
    stem: u.recJson(q, "stem", ""),
    image: q.getString("image"),
    statements: u.recJson(q, "statements", []) || [],
    hint: q.getString("hint"),
    options: opts.map((o) => (withKey ? o : { label: o.label, text: o.text })),
    subQuestions: subs.map((s) => {
      const base = { label: s.label, question: s.question, answerCount: isian.jumlahKotak(s) };
      if (!withKey) return base;
      base.accepted = q.getString("qtype") === "isian" ? isian.jawabanDiterima(s) : s.validAnswers || [];
      if (s.explanation) base.explanation = s.explanation;
      if (s.keyPoints) base.keyPoints = s.keyPoints;
      if (s.keyPointsTitle) base.keyPointsTitle = s.keyPointsTitle;
      return base;
    }),
  };
  if (app) {
    const english = require(HOOKS + "/lib/explanationService.js").published(app, q);
    if (english) {
      out.questionEnglish = {
        stem: english.stem, hint: english.hint, statements: english.statements,
        options: english.options.map((o) => withKey ? o : { label: o.label, text: o.text }),
        subQuestions: english.subQuestions.map((s) => withKey ? s : { label: s.label, question: s.question }),
      };
      if (withKey) out.questionEnglish.explanation = english.explanation;
    }
  }
  if (withKey) {
    out.answer = q.getString("answer");
    out.explanation = u.recJson(q, "explanation", "");
    // Only current, reviewed translations are sent, and only when the original
    // explanations may be revealed. Drafts and review metadata stay private.
    if (app) {
      const english = require(HOOKS + "/lib/explanationService.js").published(app, q);
      if (english) out.explanationEnglish = english;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Penilaian
// ---------------------------------------------------------------------------

// Mengembalikan { scored, correct, detail }
function grade(q, response) {
  const t = q.getString("qtype");
  if (t === "esai") return { scored: false, correct: false, detail: null };
  if (t === "A" || t === "K") {
    const r = String(response === undefined || response === null ? "" : response).toUpperCase();
    return { scored: true, correct: !!r && r === q.getString("answer"), detail: null };
  }
  const subs = u.recJson(q, "subQuestions", []) || [];
  const resp = response && typeof response === "object" ? response : {};
  const detail = {};
  let all = subs.length > 0;
  subs.forEach((s) => {
    const n = isian.nilaiSub(s, resp[s.label]);
    detail[s.label] = { perKotak: n.perKotak, benar: n.benar };
    if (!n.benar) all = false;
  });
  return { scored: true, correct: all, detail: detail };
}

function hasResponse(q, response) {
  const t = q.getString("qtype");
  if (t === "A" || t === "K") return !!response;
  if (!response || typeof response !== "object") return false;
  return Object.keys(response).some((k) => {
    const v = response[k];
    return Array.isArray(v) ? v.some((x) => String(x || "").trim()) : String(v || "").trim();
  });
}

function pointsFor(app, difficulty) {
  const s = u.settings(app);
  if (difficulty === "easy") return s.getInt("pointsEasy");
  if (difficulty === "hard") return s.getInt("pointsHard");
  return s.getInt("pointsMedium");
}

// Menambah hitungan aktivitas harian (tanggal WIB).
function bumpDaily(app, userId, answered, correct) {
  const date = u.localDate(new Date(), "WIB");
  let rec;
  try {
    rec = app.findFirstRecordByFilter("daily_activity", "user = {:u} && date = {:d}", { u: userId, d: date });
  } catch (_) {
    rec = new Record(app.findCollectionByNameOrId("daily_activity"));
    rec.set("user", userId);
    rec.set("date", date);
    rec.set("answered", 0);
    rec.set("correct", 0);
  }
  rec.set("answered", rec.getInt("answered") + (answered || 0));
  rec.set("correct", rec.getInt("correct") + (correct || 0));
  app.save(rec);
}

const DRILLING_TITLE = "Drilling";

/** BAB khusus Drilling milik satu mata kuliah, atau null bila belum ada. */
function drillingChapter(app, subjectId) {
  try { return app.findFirstRecordByFilter("chapters", "subject = {:s} && drilling = true", { s: subjectId }); } catch (_) { return null; }
}

/** BAB khusus Drilling; dibuat bila belum ada. */
function ensureDrillingChapter(app, subjectId) {
  const have = drillingChapter(app, subjectId);
  if (have) return have;
  const c = new Record(app.findCollectionByNameOrId("chapters"));
  c.set("subject", subjectId);
  c.set("title", DRILLING_TITLE);
  c.set("order", 9999);
  c.set("hidden", false);
  c.set("drilling", true);
  app.save(c);
  return c;
}

/** Menu Drilling tampil bila sakelar admin menyala dan sudah ada soal drilling yang bisa dikerjakan. */
function drillingStatus(app) {
  const enabled = u.settings(app).getBool("drillingEnabled");
  const rows = arrayOf(new DynamicModel({ n: 0 }));
  app.db().newQuery(
    "SELECT COUNT(*) AS n FROM questions q JOIN chapters c ON c.id = q.chapter JOIN subjects s ON s.id = q.subject " +
      "WHERE q.status = 'published' AND q.scope = 'all' AND c.drilling = TRUE AND c.hidden = FALSE AND s.hidden = FALSE",
  ).all(rows);
  const total = rows.length ? rows[0].n : 0;
  return { enabled: enabled, total: total, available: enabled && total > 0 };
}

// BAB mata kuliah yang punya catatan materi berisi. Hanya id yang dibaca,
// bukan teks catatannya, supaya halaman mata kuliah tetap ringan.
function notedChapters(app, subjectId) {
  const rows = arrayOf(new DynamicModel({ chapter: "" }));
  app.db().newQuery(
    "SELECT n.chapter AS chapter FROM chapter_notes n JOIN chapters c ON c.id = n.chapter " +
      "WHERE c.subject = {:s} AND c.hidden = FALSE AND c.drilling = FALSE AND TRIM(n.content) != ''",
  ).bind({ s: subjectId }).all(rows);
  return new Set(rows.map((r) => r.chapter));
}

module.exports = { notedChapters, DIFFS, DRILLING_TITLE, drillingChapter, ensureDrillingChapter, drillingStatus, pool, pickBalanced, pickMixed, bySource, shuffle, loadQuestions, chapterTitles, serialize, grade, hasResponse, pointsFor, bumpDaily };
