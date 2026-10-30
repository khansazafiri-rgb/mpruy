// Impor soal ke database. Dipakai dashboard admin (pratinjau + simpan) dan
// akun agen Hermes. Kampus selalu diambil dari parameter (pengajuan atau
// pilihan admin), tidak pernah dari isi file.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const format = require(HOOKS + "/lib/format.js");
const learn = require(HOOKS + "/lib/learn.js");

function findSubject(app, ref) {
  const s = String(ref || "").trim();
  if (!s) throw new BadRequestError("Mata kuliah belum dipilih.");
  try {
    return app.findFirstRecordByFilter("subjects", "id = {:s} || slug = {:s} || name = {:s}", { s: s });
  } catch (_) {
    throw new BadRequestError("Mata kuliah '" + s + "' tidak ditemukan.");
  }
}

function resolveCampuses(app, list) {
  const out = [];
  const missing = [];
  (Array.isArray(list) ? list : []).forEach((ref) => {
    const s = String(ref || "").trim();
    if (!s) return;
    try {
      out.push(app.findFirstRecordByFilter("campuses", "id = {:s} || name = {:s}", { s: s }).id);
    } catch (_) {
      missing.push(s);
    }
  });
  if (missing.length) throw new BadRequestError("Kampus tidak ditemukan: " + missing.join(", ") + ".");
  return out.filter((v, i, a) => a.indexOf(v) === i);
}

function chapterIndex(app, subjectId) {
  const map = {};
  app.findRecordsByFilter("chapters", "subject = {:s} && drilling = false", "order", 0, 0, { s: subjectId }).forEach((c) => {
    map[c.getString("title").trim().toLowerCase()] = c;
  });
  return map;
}

// opts:
//   input        teks atau data yang sudah diurai
//   subject      id/slug/nama mata kuliah
//   chapter      id BAB (opsional). Bila diisi, semua soal masuk BAB ini.
//   drilling     true = semua soal masuk Drilling mata kuliah itu (tanpa BAB; General atau khusus kampus sesuai scope)
//   scope        "all" | "campus"
//   campuses     daftar id/nama kampus (wajib bila scope = campus)
//   source       "admin" | "submission" | "agent"
//   submission   id pengajuan (opsional)
//   skipInvalid  true = soal valid tetap masuk walau ada yang bermasalah
//   dryRun       true = hanya pratinjau
//   status       "published" (bawaan) | "draft"
function run(app, opts) {
  const subject = findSubject(app, opts.subject);
  const scope = opts.scope === "campus" ? "campus" : "all";
  const campuses = scope === "campus" ? resolveCampuses(app, opts.campuses) : [];
  if (scope === "campus" && !campuses.length) throw new BadRequestError("Pilih minimal satu kampus untuk soal terbatas.");
  let drilling = opts.drilling === true;

  // chapter boleh berupa id BAB (semua soal dipaksa masuk BAB itu) atau judul
  // BAB (dipakai untuk soal yang tidak menulis field BAB sendiri).
  let fixedChapter = null;
  let defaultTitle = "";
  if (opts.chapter) {
    const ref = String(opts.chapter).trim();
    try { fixedChapter = app.findRecordById("chapters", ref); } catch (_) { fixedChapter = null; }
    if (fixedChapter && fixedChapter.getString("subject") !== subject.id) {
      throw new BadRequestError("BAB tidak ditemukan di mata kuliah ini.");
    }
    if (!fixedChapter) defaultTitle = ref.slice(0, 200);
    if (fixedChapter && fixedChapter.getBool("drilling")) drilling = true;
  }
  if (drilling) {
    // Soal Drilling selalu masuk BAB khusus Drilling milik mata kuliah ini (dibuat saat disimpan bila belum ada).
    fixedChapter = learn.drillingChapter(app, subject.id);
    defaultTitle = learn.DRILLING_TITLE;
  }

  let parsed;
  try {
    parsed = format.parseImport(opts.input, {
      chapterTitle: fixedChapter ? fixedChapter.getString("title") : defaultTitle,
      requireChapter: !fixedChapter && !drilling,
    });
  } catch (err) {
    throw new BadRequestError(String(err && err.message ? err.message : err).replace(/^Error: /, ""));
  }

  const chapters = chapterIndex(app, subject.id);
  const newChapters = [];
  const existingCodes = {};
  app
    .findRecordsByFilter("questions", "subject = {:s} && code != ''", "", 0, 0, { s: subject.id })
    .forEach((q) => { existingCodes[q.getString("code")] = q.id; });
  const seenCodes = {};

  parsed.items.forEach((it) => {
    if (!it.question) return;
    if (drilling) {
      if (it.preview && it.preview.chapterTitle && it.preview.chapterTitle.toLowerCase() !== learn.DRILLING_TITLE.toLowerCase()) {
        it.warnings.push("Field BAB '" + it.preview.chapterTitle + "' diabaikan; soal masuk Drilling.");
      }
      it.chapterTitle = learn.DRILLING_TITLE;
    } else if (fixedChapter) {
      if (it.preview && it.preview.chapterTitle && it.preview.chapterTitle.toLowerCase() !== fixedChapter.getString("title").toLowerCase()) {
        it.warnings.push("Field BAB '" + it.preview.chapterTitle + "' diabaikan; soal masuk ke BAB " + fixedChapter.getString("title") + ".");
      }
      it.chapterTitle = fixedChapter.getString("title");
    } else {
      const key = it.question.chapterTitle.toLowerCase();
      if (!chapters[key] && newChapters.indexOf(it.question.chapterTitle) < 0) newChapters.push(it.question.chapterTitle);
    }
    const code = it.question.code;
    if (code) {
      if (existingCodes[code]) {
        it.duplicate = true;
        it.warnings.push("Kode soal '" + code + "' sudah ada di mata kuliah ini; soal ini dilewati supaya tidak dobel.");
      } else if (seenCodes[code]) {
        it.duplicate = true;
        it.warnings.push("Kode soal '" + code + "' muncul lebih dari sekali di file; yang ini dilewati.");
      }
      seenCodes[code] = true;
    }
  });

  const invalid = parsed.items.filter((it) => !it.question);
  const valid = parsed.items.filter((it) => it.question && !it.duplicate);
  const summary = {
    subject: { id: subject.id, name: subject.getString("name") },
    total: parsed.items.length,
    valid: valid.length,
    invalid: invalid.length,
    duplicates: parsed.items.filter((it) => it.duplicate).length,
    newChapters: newChapters,
    warnings: parsed.warnings,
    schemaVersion: parsed.schemaVersion,
    items: parsed.items.map((it) => ({
      index: it.index,
      chapterTitle: it.chapterTitle,
      ok: !!it.question && !it.duplicate,
      duplicate: !!it.duplicate,
      errors: it.errors,
      warnings: it.warnings,
      question: it.question || it.preview || null,
    })),
    created: 0,
    chaptersCreated: 0,
  };

  if (opts.dryRun) return summary;
  if (invalid.length && !opts.skipInvalid) {
    // Tidak ada yang disimpan. Pemanggil mengirim ringkasan ini dengan status 400.
    summary.blocked = true;
    summary.message = invalid.length + " soal bermasalah. Perbaiki dulu, atau pilih \"Lewati soal bermasalah\" supaya soal yang valid tetap masuk.";
    return summary;
  }
  if (!valid.length) throw new BadRequestError("Tidak ada soal baru yang bisa disimpan.");

  const createdIds = [];
  app.runInTransaction((tx) => {
    const target = drilling ? learn.ensureDrillingChapter(tx, subject.id) : fixedChapter;
    const chCol = tx.findCollectionByNameOrId("chapters");
    let maxOrder = 0;
    Object.keys(chapters).forEach((k) => { maxOrder = Math.max(maxOrder, chapters[k].getInt("order")); });
    newChapters.forEach((title) => {
      const c = new Record(chCol);
      c.set("subject", subject.id);
      c.set("title", title);
      c.set("order", ++maxOrder);
      c.set("hidden", false);
      tx.save(c);
      chapters[title.toLowerCase()] = c;
      summary.chaptersCreated++;
    });

    const qCol = tx.findCollectionByNameOrId("questions");
    const orderBase = {};
    valid.forEach((it) => {
      const q = it.question;
      const ch = target || chapters[q.chapterTitle.toLowerCase()];
      if (orderBase[ch.id] === undefined) {
        orderBase[ch.id] = tx.countRecords("questions", $dbx.exp("chapter = {:c}", { c: ch.id }));
      }
      const r = new Record(qCol);
      r.set("subject", subject.id);
      r.set("chapter", ch.id);
      r.set("qtype", q.qtype);
      r.set("difficulty", q.difficulty);
      r.set("stem", q.stem);
      r.set("image", q.image);
      r.set("statements", q.statements);
      r.set("options", q.options);
      r.set("answer", q.answer);
      r.set("subQuestions", q.subQuestions);
      r.set("explanation", q.explanation);
      r.set("hint", q.hint);
      r.set("scope", scope);
      r.set("campuses", campuses);
      r.set("source", opts.source || "admin");
      if (opts.submission) r.set("submission", opts.submission);
      r.set("status", opts.status === "draft" ? "draft" : "published");
      r.set("schemaVersion", format.SCHEMA_VERSION);
      r.set("code", q.code);
      r.set("order", ++orderBase[ch.id]);
      tx.save(r);
      createdIds.push(r.id);
    });
  });
  summary.created = createdIds.length;
  summary.createdIds = createdIds;
  // Daftar soal lengkap tidak perlu dikirim balik setelah tersimpan.
  summary.items = summary.items.filter((it) => !it.ok || it.warnings.length).map((it) => ({ index: it.index, ok: it.ok, errors: it.errors, warnings: it.warnings }));
  return summary;
}

// Satu soal dari form Edit Soal -> field record.
function applyForm(app, rec, body) {
  const r = format.normalizeQuestion(body.question || {}, { chapterTitle: "-" });
  if (!r.question) throw new BadRequestError("Soal belum lengkap: " + r.errors.join(" "), { errors: r.errors });
  const q = r.question;
  const subject = findSubject(app, body.subject || rec.getString("subject"));
  let ch;
  try { ch = app.findRecordById("chapters", String(body.chapter || rec.getString("chapter"))); } catch (_) { ch = null; }
  if (!ch || ch.getString("subject") !== subject.id) throw new BadRequestError("Pilih BAB di mata kuliah ini.");
  const scope = body.scope === "campus" ? "campus" : "all";
  const campuses = scope === "campus" ? resolveCampuses(app, body.campuses) : [];
  if (scope === "campus" && !campuses.length) throw new BadRequestError("Pilih minimal satu kampus untuk soal terbatas.");
  rec.set("subject", subject.id);
  rec.set("chapter", ch.id);
  rec.set("qtype", q.qtype);
  rec.set("difficulty", q.difficulty);
  rec.set("stem", q.stem);
  rec.set("image", q.image);
  rec.set("statements", q.statements);
  rec.set("options", q.options);
  rec.set("answer", q.answer);
  rec.set("subQuestions", q.subQuestions);
  rec.set("explanation", q.explanation);
  rec.set("hint", q.hint);
  rec.set("scope", scope);
  rec.set("campuses", campuses);
  rec.set("status", body.status === "draft" ? "draft" : "published");
  rec.set("schemaVersion", format.SCHEMA_VERSION);
  if (body.code !== undefined) rec.set("code", String(body.code || "").slice(0, 100));
  if (!rec.getString("source")) rec.set("source", "admin");
  return r.warnings;
}

module.exports = { run, applyForm, findSubject, resolveCampuses };
