/// <reference path="../pb_data/types.d.ts" />

// DASHBOARD ADMIN
//
// Mata kuliah, BAB, paket, pengumuman, kampus, dan pengaturan memakai API
// collection biasa (aturannya hanya mengizinkan admin). Endpoint di sini untuk
// hal yang butuh logika server: soal (tertutup dari API biasa), impor,
// pengguna (email/WA hanya terlihat admin), dan ringkasan.

routerAdd("GET", "/api/medcoel/admin/summary", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const storage = require(`${__hooks}/lib/storage.js`);
  u.requireAdmin(e);
  const week = u.pbDate(new Date(Date.now() - 7 * 86400000));
  const active = u.pbDate(new Date(Date.now() - 7 * 86400000));
  const c = (col, expr, params) => e.app.countRecords(col, $dbx.exp(expr, params || {}));
  return e.json(200, {
    users: c("users", "role = 'user' AND deletedAt = ''"),
    newUsers7d: c("users", "role = 'user' AND created >= {:t}", { t: week }),
    activeUsers7d: c("users", "role = 'user' AND lastActiveAt >= {:t}", { t: active }),
    disabledUsers: c("users", "role = 'user' AND disabled = TRUE AND deletedAt = ''"),
    questions: c("questions", "status = 'published'"),
    draftQuestions: c("questions", "status = 'draft'"),
    queue: c("submissions", "status = 'antre'"),
    processing: c("submissions", "status = 'diproses'"),
    waitingConfirm: c("submissions", "status = 'menunggu_konfirmasi'"),
    newReports: c("question_reports", "status = 'baru'"),
    attempts7d: c("attempts", "created >= {:t}", { t: week }),
    storageMode: storage.mode(),
    smtp: u.smtpEnabled(e.app),
    turnstile: !!u.env("TURNSTILE_SECRET"),
  });
});

// Migrasi terakhir yang sudah dijalankan server. Web membandingkannya dengan yang dibutuhkannya (lib/serverVersion.js)
// dan memperingatkan admin bila server belum dijalankan ulang setelah pembaruan.
routerAdd("GET", "/api/medcoel/admin/server-version", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  const rows = arrayOf(new DynamicModel({ file: "" }));
  e.app.db().newQuery("SELECT file FROM _migrations ORDER BY file DESC LIMIT 1").all(rows);
  return e.json(200, { migration: rows.length ? rows[0].file : "" });
});

// Drilling: status sakelar dan, untuk SEMUA mata kuliah (juga yang belum punya soal), jumlah soal tayang/draf
// serta BAB Drilling-nya. BAB Drilling dibuat bila belum ada, jadi admin selalu bisa menambah soal.
routerAdd("GET", "/api/medcoel/admin/drilling", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  u.requireAdmin(e);
  const st = learn.drillingStatus(e.app);
  const rows = arrayOf(new DynamicModel({ subject: "", status: "", scope: "", n: 0 }));
  e.app.db().newQuery("SELECT q.subject AS subject, q.status AS status, q.scope AS scope, COUNT(*) AS n FROM questions q JOIN chapters c ON c.id = q.chapter WHERE c.drilling = TRUE GROUP BY q.subject, q.status, q.scope").all(rows);
  const per = {};
  rows.forEach((r) => { const p = (per[r.subject] = per[r.subject] || { published: 0, draft: 0, campusOnly: 0 }); p[r.status] = (p[r.status] || 0) + r.n; if (r.scope === "campus") p.campusOnly += r.n; });
  const subjects = e.app.findRecordsByFilter("subjects", "id != ''", "order,name", 500, 0).map((s) => {
    const ch = learn.ensureDrillingChapter(e.app, s.id);
    const p = per[s.id] || { published: 0, draft: 0, campusOnly: 0 };
    return { id: s.id, name: s.getString("name"), subjectHidden: s.getBool("hidden"), published: p.published, draft: p.draft, campusOnly: p.campusOnly, chapter: ch.id, hidden: ch.getBool("hidden") };
  });
  const total = subjects.reduce((a, s) => a + s.published, 0);
  const drafts = subjects.reduce((a, s) => a + s.draft, 0);
  return e.json(200, { enabled: st.enabled, available: st.available, total: st.total, published: total, drafts: drafts, subjects: subjects });
});

// Aksi massal untuk semua soal Drilling satu mata kuliah: tayangkan / jadikan draf / pindah ke BAB biasa / hapus.
routerAdd("POST", "/api/medcoel/admin/drilling/bulk", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  let subject;
  try { subject = e.app.findRecordById("subjects", String(b.subject || "")); } catch (_) { throw new BadRequestError("Pilih mata kuliahnya dulu."); }
  const dch = learn.drillingChapter(e.app, subject.id);
  if (!dch) return e.json(200, { ok: true, count: 0 });
  const only = b.status === "draft" ? " && status = 'draft'" : b.status === "published" ? " && status = 'published'" : "";
  const recs = e.app.findRecordsByFilter("questions", "chapter = {:c}" + only, "", 0, 0, { c: dch.id });
  let target = null;
  if (b.action === "move") {
    try { target = e.app.findRecordById("chapters", String(b.chapter || "")); } catch (_) { throw new BadRequestError("Pilih BAB tujuan."); }
    if (target.getBool("drilling") || target.getString("subject") !== subject.id) throw new BadRequestError("Pilih BAB biasa dari mata kuliah yang sama.");
  }
  if (["publish", "draft", "move", "delete"].indexOf(b.action) < 0) throw new BadRequestError("Aksi tidak dikenal.");
  e.app.runInTransaction((tx) => {
    recs.forEach((r) => {
      if (b.action === "delete") return tx.delete(r);
      if (b.action === "publish") r.set("status", "published");
      else if (b.action === "draft") r.set("status", "draft");
      else if (b.action === "move") r.set("chapter", target.id);
      tx.save(r);
    });
  });
  return e.json(200, { ok: true, count: recs.length });
});

// ---------------------------------------------------------------------------
// Soal
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/admin/questions", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const format = require(`${__hooks}/lib/format.js`);
  u.requireAdmin(e);
  const parts = ["id != ''"];
  const params = {};
  const add = (name, expr) => {
    const v = u.query(e, name);
    if (v) { parts.push(expr); params[name] = v; }
  };
  add("id", "id = {:id}");
  add("subject", "subject = {:subject}");
  add("chapter", "chapter = {:chapter}");
  add("difficulty", "difficulty = {:difficulty}");
  add("qtype", "qtype = {:qtype}");
  add("status", "status = {:status}");
  add("scope", "scope = {:scope}");
  add("q", "(stem ~ {:q} || code ~ {:q} || options ~ {:q})");
  const page = Math.max(1, parseInt(u.query(e, "page"), 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(u.query(e, "perPage"), 10) || 30));
  const filter = parts.join(" && ");
  const list = e.app.findRecordsByFilter("questions", filter, "order,created", perPage, (page - 1) * perPage, params);
  // countRecords tidak menerima filter PocketBase, jadi total dihitung dengan kueri yang sama tanpa batas.
  const total = e.app.findRecordsByFilter("questions", filter, "", 0, 0, params).length;
  return e.json(200, {
    page: page,
    perPage: perPage,
    totalItems: total,
    items: list.map((q) => adminQuestion(q)),
  });

  function adminQuestion(q) {
    const j = (f, d) => u.recJson(q, f, d);
    return {
      id: q.id,
      subject: q.getString("subject"),
      chapter: q.getString("chapter"),
      qtype: q.getString("qtype"),
      difficulty: q.getString("difficulty"),
      stem: j("stem", ""),
      stemPlain: format.contentToPlain(j("stem", "")).replace(/<[^>]+>/g, " ").slice(0, 200),
      image: q.getString("image"),
      statements: j("statements", []),
      options: j("options", []),
      answer: q.getString("answer"),
      subQuestions: j("subQuestions", []),
      explanation: j("explanation", ""),
      hint: q.getString("hint"),
      scope: q.getString("scope"),
      campuses: q.getStringSlice("campuses"),
      source: q.getString("source"),
      submission: q.getString("submission"),
      status: q.getString("status"),
      code: q.getString("code"),
      order: q.getInt("order"),
      created: q.getString("created"),
      updated: q.getString("updated"),
    };
  }
});

routerAdd("POST", "/api/medcoel/admin/questions", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  const rec = new Record(e.app.findCollectionByNameOrId("questions"));
  rec.set("source", "admin");
  const warnings = importer.applyForm(e.app, rec, b);
  rec.set("order", e.app.countRecords("questions", $dbx.exp("chapter = {:c}", { c: rec.getString("chapter") })) + 1);
  e.app.save(rec);
  return e.json(200, { id: rec.id, warnings: warnings });
});

routerAdd("PATCH", "/api/medcoel/admin/questions/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  u.requireAdmin(e);
  let rec;
  try { rec = e.app.findRecordById("questions", e.request.pathValue("id")); } catch (_) { throw new NotFoundError("Soal tidak ditemukan."); }
  const warnings = importer.applyForm(e.app, rec, u.body(e));
  e.app.save(rec);
  return e.json(200, { id: rec.id, warnings: warnings });
});

routerAdd("DELETE", "/api/medcoel/admin/questions/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  let rec;
  try { rec = e.app.findRecordById("questions", e.request.pathValue("id")); } catch (_) { throw new NotFoundError("Soal tidak ditemukan."); }
  e.app.delete(rec);
  return e.json(200, { ok: true });
});

// Aksi massal: pindah BAB, ubah tingkat, ubah pembatasan kampus, tayang/draf, hapus.
routerAdd("POST", "/api/medcoel/admin/questions/bulk", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  const ids = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 1000) : [];
  if (!ids.length) throw new BadRequestError("Pilih soalnya dulu.");
  const recs = e.app.findRecordsByIds("questions", ids);
  let target = null;
  if (b.action === "move") {
    try { target = e.app.findRecordById("chapters", String(b.chapter || "")); } catch (_) { throw new BadRequestError("Pilih BAB tujuan."); }
  }
  let campuses = [];
  if (b.action === "scope" && b.scope === "campus") {
    campuses = importer.resolveCampuses(e.app, b.campuses);
    if (!campuses.length) throw new BadRequestError("Pilih minimal satu kampus.");
  }
  const isDrilling = {};
  e.app.findRecordsByFilter("chapters", "drilling = true", "", 0, 0).forEach((c) => { isDrilling[c.id] = true; });
  if (b.action === "difficulty" && ["easy", "medium", "hard"].indexOf(b.difficulty) < 0) throw new BadRequestError("Pilih tingkat kesulitan.");
  e.app.runInTransaction((tx) => {
    recs.forEach((r) => {
      if (b.action === "delete") return tx.delete(r);
      if (b.action === "move") {
        r.set("chapter", target.id);
        r.set("subject", target.getString("subject"));
        // Soal di Drilling selalu General.
        if (target.getBool("drilling")) { r.set("scope", "all"); r.set("campuses", []); }
      }
      else if (b.action === "difficulty") r.set("difficulty", b.difficulty);
      else if (b.action === "scope") {
        if (b.scope === "campus" && isDrilling[r.getString("chapter")]) throw new BadRequestError("Soal Drilling harus General. Pindahkan dulu ke BAB biasa.");
        r.set("scope", b.scope === "campus" ? "campus" : "all"); r.set("campuses", b.scope === "campus" ? campuses : []); }
      else if (b.action === "publish") r.set("status", "published");
      else if (b.action === "draft") r.set("status", "draft");
      else throw new BadRequestError("Aksi tidak dikenal.");
      tx.save(r);
    });
  });
  return e.json(200, { ok: true, count: recs.length });
});

// Impor: pratinjau (dryRun) lalu simpan.
routerAdd("POST", "/api/medcoel/admin/import", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  let submission = null;
  if (b.submission) {
    try { submission = e.app.findRecordById("submissions", String(b.submission)); } catch (_) { throw new BadRequestError("Pengajuan tidak ditemukan."); }
  }
  const result = importer.run(e.app, {
    input: b.text !== undefined ? b.text : b.questions,
    subject: submission ? submission.getString("subject") : b.subject,
    chapter: b.chapter || "",
    drilling: b.drilling === true,
    scope: submission ? (submission.getString("scope") === "campus" ? "campus" : "all") : b.scope,
    campuses: submission ? (submission.getString("scope") === "campus" ? [submission.getString("campus")] : []) : b.campuses,
    source: submission ? "submission" : "admin",
    submission: submission ? submission.id : "",
    skipInvalid: b.skipInvalid === true,
    dryRun: b.dryRun === true,
    status: b.status,
  });
  if (result.blocked) return e.json(400, Object.assign({ status: 400 }, result));
  if (!b.dryRun && submission && result.created > 0) {
    submission.set("importedCount", submission.getInt("importedCount") + result.created);
    e.app.save(submission);
    const st = submission.getString("status");
    if (st === "antre" || st === "perlu_perbaikan") subs.setStatus(e.app, submission, "diproses", submission.getString("statusNote"), "admin");
    if (b.markDone !== false) subs.setStatus(e.app, submission, "selesai", submission.getString("statusNote"), "admin");
  }
  return e.json(200, result);
});

// ---------------------------------------------------------------------------
// Pengguna
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/admin/users", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const storage = require(`${__hooks}/lib/storage.js`);
  const admin = u.requireAdmin(e);
  const parts = ["id != ''"];
  const params = {};
  const q = u.query(e, "q");
  if (q) { parts.push("(name ~ {:q} || loginId ~ {:q} || email ~ {:q} || whatsapp ~ {:q} || extra ~ {:q})"); params.q = q; }
  const st = u.query(e, "status");
  if (st === "active") parts.push("disabled = false && deletedAt = ''");
  if (st === "disabled") parts.push("disabled = true && deletedAt = ''");
  if (st === "deleted") parts.push("deletedAt != ''");
  const role = u.query(e, "role");
  if (role) { parts.push("role = {:role}"); params.role = role; }
  const campus = u.query(e, "campus");
  if (campus) { parts.push("campus = {:campus}"); params.campus = campus; }
  const page = Math.max(1, parseInt(u.query(e, "page"), 10) || 1);
  const filter = parts.join(" && ");
  const list = e.app.findRecordsByFilter("users", filter, "-created", 50, (page - 1) * 50, params);
  const total = e.app.findRecordsByFilter("users", filter, "", 0, 0, params).length;
  const items = list.map((usr) => {
    const out = u.userSummary(e.app, usr, true);
    out.proofs = e.app.findRecordsByFilter("community_proofs", "user = {:u}", "created", 10, 0, { u: usr.id }).map((p) => {
      let link = "";
      try { link = storage.linkFor(e.app, e.app.findRecordById("stored_files", p.getString("file")), admin).url; } catch (_) {}
      return { kind: p.getString("kind"), key: p.getString("proofKey") || p.getString("kind"), link: link, created: p.getString("created") };
    });
    out.attempts = e.app.countRecords("attempts", $dbx.exp("user = {:u}", { u: usr.id }));
    return out;
  });
  const cfg = require(`${__hooks}/lib/signupConfig.js`).config(e.app);
  return e.json(200, { items: items, page: page, totalItems: total, fields: cfg.fields, proofSteps: cfg.proofs.map((p) => ({ key: p.key, title: p.short || p.title })) });
});

routerAdd("POST", "/api/medcoel/admin/users/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const admin = u.requireAdmin(e);
  const b = u.body(e);
  let usr;
  try { usr = e.app.findRecordById("users", e.request.pathValue("id")); } catch (_) { throw new NotFoundError("Pengguna tidak ditemukan."); }
  if (usr.id === admin.id && (b.action === "disable" || b.action === "delete")) throw new BadRequestError("Tidak bisa menonaktifkan akunmu sendiri.");
  if (u.roleOf(usr) === "admin" && b.action !== "enable" && b.action !== "profile") throw new BadRequestError("Akun admin dikelola langsung di database.");
  const reason = u.cleanStr(b.reason, 300);
  if (b.action === "disable") {
    usr.set("disabled", true);
    usr.set("disabledReason", reason || "Dinonaktifkan admin.");
    usr.refreshTokenKey();
  } else if (b.action === "enable") {
    usr.set("disabled", false);
    usr.set("disabledReason", "");
  } else if (b.action === "delete") {
    // Hapus lunak: data tetap ada untuk riwayat, akun tidak bisa dipakai.
    usr.set("deletedAt", u.pbDate(new Date()));
    usr.set("disabled", true);
    usr.set("disabledReason", reason || "Akun dihapus.");
    usr.refreshTokenKey();
  } else if (b.action === "restore") {
    usr.set("deletedAt", "");
    usr.set("disabled", false);
    usr.set("disabledReason", "");
  } else if (b.action === "campus") {
    const cid = u.cleanStr(b.campus, 40);
    if (cid) { try { e.app.findRecordById("campuses", cid); } catch (_) { throw new BadRequestError("Kampus tidak ditemukan."); } }
    const log = new Record(e.app.findCollectionByNameOrId("campus_changes"));
    log.set("user", usr.id);
    if (usr.getString("campus")) log.set("fromCampus", usr.getString("campus"));
    if (cid) log.set("toCampus", cid);
    log.set("toOther", cid ? "" : u.cleanStr(b.campusOther, 200));
    e.app.save(log);
    usr.set("campus", cid);
    usr.set("campusOther", cid ? "" : u.cleanStr(b.campusOther, 200));
  } else if (b.action === "profile") {
    // Ubah data diri oleh admin. Hanya field yang dikirim yang diubah.
    const cfg = require(`${__hooks}/lib/signupConfig.js`);
    const errors = {};
    if (b.name !== undefined) {
      const name = u.cleanStr(b.name, 100).replace(/\s+/g, " ");
      if (name.length < 2) errors.name = "Nama minimal 2 huruf."; else usr.set("name", name);
    }
    if (b.loginId !== undefined) {
      const id = u.cleanStr(b.loginId, 40).toLowerCase();
      if (!/^[a-z0-9._]{4,30}$/.test(id)) errors.loginId = "Login ID 4-30 karakter: huruf kecil, angka, titik, atau garis bawah.";
      else if (id !== usr.getString("loginId")) {
        let taken = false;
        try { e.app.findFirstRecordByFilter("users", "loginId = {:id}", { id: id }); taken = true; } catch (_) {}
        if (taken) errors.loginId = "Login ID sudah dipakai."; else usr.set("loginId", id);
      }
    }
    if (b.email !== undefined) {
      const email = u.cleanStr(b.email, 200).toLowerCase();
      if (!u.isEmail(email)) errors.email = "Format email belum benar.";
      else if (email !== usr.email()) {
        let taken = false;
        try { e.app.findAuthRecordByEmail("users", email); taken = true; } catch (_) {}
        if (taken) errors.email = "Email sudah dipakai akun lain."; else usr.setEmail(email);
      }
    }
    if (b.whatsapp !== undefined) {
      const raw = String(b.whatsapp || "").trim();
      const wa = u.normalizePhone(raw);
      if (raw && !wa) errors.whatsapp = "Nomor WhatsApp belum benar."; else usr.set("whatsapp", wa || "");
    }
    if (b.semester !== undefined) {
      const sem = parseInt(b.semester, 10) || 0;
      if (sem < 0 || sem > 14) errors.semester = "Semester 0-14 (0 = tidak diisi)."; else usr.set("semester", sem);
    }
    if (b.leaderboardAnonymous !== undefined) usr.set("leaderboardAnonymous", b.leaderboardAnonymous === true);
    if (b.role !== undefined && u.roleOf(usr) !== "admin") {
      if (b.role !== "user" && b.role !== "agent") errors.role = "Peran hanya pengguna atau agen."; else usr.set("role", b.role);
    }
    if (b.extra !== undefined) {
      const r = cfg.validateExtra(cfg.config(e.app).fields, b.extra, "admin", u.recJson(usr, "extra", {}) || {});
      Object.keys(r.errors).forEach((k) => { errors[k] = r.errors[k]; });
      usr.set("extra", r.values);
    }
    if (Object.keys(errors).length) throw new BadRequestError("Ada isian yang perlu diperbaiki.", u.fieldErrors(errors));
  } else {
    throw new BadRequestError("Aksi tidak dikenal.");
  }
  e.app.save(usr);
  return e.json(200, u.userSummary(e.app, usr, true));
});

// Ekspor CSV semua pengguna yang cocok dengan filter (termasuk kolom tambahan).
routerAdd("GET", "/api/medcoel/admin/users/export", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const cfg = require(`${__hooks}/lib/signupConfig.js`);
  u.requireAdmin(e);
  const parts = ["id != ''"];
  const params = {};
  const q = u.query(e, "q");
  if (q) { parts.push("(name ~ {:q} || loginId ~ {:q} || email ~ {:q} || whatsapp ~ {:q} || extra ~ {:q})"); params.q = q; }
  const st = u.query(e, "status");
  if (st === "active") parts.push("disabled = false && deletedAt = ''");
  if (st === "disabled") parts.push("disabled = true && deletedAt = ''");
  if (st === "deleted") parts.push("deletedAt != ''");
  const list = e.app.findRecordsByFilter("users", parts.join(" && "), "-created", 20000, 0, params);
  const fields = cfg.config(e.app).fields;
  const cell = (v) => {
    let t = v === undefined || v === null ? "" : String(v);
    // Cegah rumus spreadsheet dari isian pengguna.
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[",\n\r;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const head = ["Login ID", "Nama", "Email", "WhatsApp", "Semester", "Kampus", "Peran", "Status", "Terdaftar", "Terakhir aktif"].concat(fields.map((f) => f.label));
  const rows = [head.map(cell).join(",")];
  list.forEach((usr) => {
    const s = u.userSummary(e.app, usr, true);
    const status = s.deletedAt ? "Dihapus" : s.disabled ? "Nonaktif" : "Aktif";
    rows.push([s.loginId, s.name, s.email, s.whatsapp, s.semester || "", s.campusName, s.role, status, s.created, s.lastActiveAt]
      .concat(fields.map((f) => { const v = s.extra[f.key]; return typeof v === "boolean" ? (v ? "Ya" : "Tidak") : v; }))
      .map(cell).join(","));
  });
  e.response.header().set("Content-Type", "text/csv; charset=utf-8");
  e.response.header().set("Content-Disposition", 'attachment; filename="pengguna-medcoel.csv"');
  return e.string(200, "\ufeff" + rows.join("\r\n") + "\r\n");
});

// ---------------------------------------------------------------------------
// Laporan soal
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/admin/reports", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const format = require(`${__hooks}/lib/format.js`);
  u.requireAdmin(e);
  const st = u.query(e, "status");
  const list = e.app.findRecordsByFilter("question_reports", st ? "status = {:s}" : "id != ''", "-created", 200, 0, { s: st });
  return e.json(200, {
    items: list.map((r) => {
      let q = null;
      try { q = e.app.findRecordById("questions", r.getString("question")); } catch (_) {}
      let rep = null;
      try { rep = e.app.findRecordById("users", r.getString("reporter")); } catch (_) {}
      return {
        id: r.id,
        reason: r.getString("reason"),
        note: r.getString("note"),
        status: r.getString("status"),
        adminNote: r.getString("adminNote"),
        created: r.getString("created"),
        question: q ? {
          id: q.id,
          subject: q.getString("subject"),
          chapter: q.getString("chapter"),
          stemPlain: format.contentToPlain(u.recJson(q, "stem", "")).replace(/<[^>]+>/g, " ").slice(0, 240),
        } : null,
        reporter: rep ? { id: rep.id, name: rep.getString("name"), loginId: rep.getString("loginId") } : null,
      };
    }),
  });
});

// ---------------------------------------------------------------------------
// Kampus: gabungkan dua nama yang sama
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/medcoel/admin/campuses/merge", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  const from = String(b.from || "");
  const into = String(b.into || "");
  if (!from || !into || from === into) throw new BadRequestError("Pilih dua kampus yang berbeda.");
  let src, dst;
  try { src = e.app.findRecordById("campuses", from); dst = e.app.findRecordById("campuses", into); } catch (_) { throw new NotFoundError("Kampus tidak ditemukan."); }
  let moved = 0;
  e.app.runInTransaction((tx) => {
    tx.findRecordsByFilter("users", "campus = {:c}", "", 0, 0, { c: src.id }).forEach((r) => { r.set("campus", dst.id); tx.saveNoValidate(r); moved++; });
    tx.findRecordsByFilter("submissions", "campus = {:c}", "", 0, 0, { c: src.id }).forEach((r) => { r.set("campus", dst.id); tx.save(r); });
    ["questions", "announcements"].forEach((col) => {
      tx.findRecordsByFilter(col, "campuses ?= {:c}", "", 0, 0, { c: src.id }).forEach((r) => {
        const list = r.getStringSlice("campuses").map((x) => (x === src.id ? dst.id : x)).filter((v, i, a) => a.indexOf(v) === i);
        r.set("campuses", list);
        tx.save(r);
      });
    });
    tx.delete(src);
  });
  return e.json(200, { ok: true, movedUsers: moved, into: dst.getString("name") });
});

// Kampus yang ditulis manual ("Lainnya") paling sering, sebagai usulan pilihan tetap.
routerAdd("GET", "/api/medcoel/admin/campuses/other", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  const rows = arrayOf(new DynamicModel({ name: "", n: 0 }));
  e.app.db().newQuery("SELECT campusOther AS name, COUNT(*) AS n FROM users WHERE campusOther != '' AND campusOther != {:none} GROUP BY LOWER(TRIM(campusOther)) ORDER BY n DESC LIMIT 50").bind({ none: u.NO_CAMPUS }).all(rows);
  return e.json(200, { items: rows.map((r) => ({ name: r.name, count: r.n })) });
});

// ---------------------------------------------------------------------------
// Pengumuman: berapa pengguna yang sudah menutup
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/admin/announcements/stats", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  const rows = arrayOf(new DynamicModel({ announcement: "", n: 0 }));
  e.app.db().newQuery("SELECT announcement, COUNT(*) AS n FROM announcement_dismissals GROUP BY announcement").all(rows);
  const out = {};
  rows.forEach((r) => { out[r.announcement] = r.n; });
  return e.json(200, { dismissed: out });
});

// Tautan file untuk admin (bukti komunitas, PDF pengajuan).
routerAdd("GET", "/api/medcoel/admin/files/{id}/link", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const storage = require(`${__hooks}/lib/storage.js`);
  const admin = u.requireAdmin(e);
  let f;
  try { f = e.app.findRecordById("stored_files", e.request.pathValue("id")); } catch (_) { throw new NotFoundError("File tidak ditemukan."); }
  return e.json(200, storage.linkFor(e.app, f, admin));
});
