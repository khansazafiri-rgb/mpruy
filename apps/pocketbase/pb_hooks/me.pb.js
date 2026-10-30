/// <reference path="../pb_data/types.d.ts" />

// AKUN SENDIRI, PENGATURAN PUBLIK, DAN ANGKA LANDING PAGE

// Peran selalu ditetapkan server. Akun yang dibuat tanpa peran (misalnya dari
// dashboard PocketBase) menjadi "user".
onRecordCreate((e) => {
  if (!e.record.getString("role")) e.record.set("role", "user");
  e.next();
}, "users");

// Pengaturan yang aman dibaca siapa saja (tautan komunitas, batas unggah, dsb).
routerAdd("GET", "/api/medcoel/public-settings", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  return e.json(200, u.publicSettings(e.app));
});

// Angka untuk landing page. Hanya angka, tanpa isi soal: collection soal
// tidak boleh terbuka ke publik.
routerAdd("GET", "/api/medcoel/stats", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const s = u.settings(e.app);
  const questions = e.app.countRecords("questions", $dbx.exp("status = 'published'"));
  const out = { questions: questions };
  if (s.getBool("landingShowSubjects")) out.subjects = e.app.countRecords("subjects", $dbx.exp("hidden = FALSE"));
  if (s.getBool("landingShowUsers")) {
    out.users = e.app.countRecords("users", $dbx.exp("role = 'user' AND disabled = FALSE AND deletedAt = ''"));
  }
  e.response.header().set("Cache-Control", "public, max-age=60");
  return e.json(200, out);
});

routerAdd("GET", "/api/medcoel/me", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  // Catat aktivitas paling sering sekali per jam.
  const last = u.parseDate(user.getString("lastActiveAt"));
  if (!last || Date.now() - last.getTime() > 3600 * 1000) {
    try {
      const fresh = e.app.findRecordById("users", user.id);
      fresh.set("lastActiveAt", u.pbDate(new Date()));
      e.app.saveNoValidate(fresh);
    } catch (_) {}
  }
  const out = u.userSummary(e.app, user, true);
  // Kolom khusus admin tidak dikirim ke pemilik akun.
  const adminOnly = require(`${__hooks}/lib/signupConfig.js`).config(e.app).fields.filter((f) => f.where === "admin").map((f) => f.key);
  adminOnly.forEach((k) => { delete out.extra[k]; });
  const days = u.settings(e.app).getInt("campusChangeDays");
  const changed = u.parseDate(user.getString("campusChangedAt"));
  out.nextCampusChangeAt = changed && days > 0 ? new Date(changed.getTime() + days * 86400000).toISOString() : "";
  const drill = require(`${__hooks}/lib/learn.js`).drillingStatus(e.app);
  // Admin selalu melihat menu Drilling (pratinjau) walau belum dibuka untuk pengguna.
  out.drillingAvailable = drill.available || u.roleOf(user) === "admin";
  out.drillingPreview = !drill.available && u.roleOf(user) === "admin";
  out.unreadNotifications = e.app.countRecords("notifications", $dbx.exp("user = {:u} AND read = FALSE", { u: user.id }));
  return e.json(200, out);
});

// Data tambahan milik sendiri (kolom dari Pengaturan > Pendaftaran yang boleh
// diubah pengguna). Kolom yang tidak dikirim tidak berubah.
routerAdd("POST", "/api/medcoel/me/extra", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const cfg = require(`${__hooks}/lib/signupConfig.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  const fresh = e.app.findRecordById("users", user.id);
  const r = cfg.validateExtra(cfg.config(e.app).fields, b.extra, "profile", u.recJson(fresh, "extra", {}) || {});
  if (Object.keys(r.errors).length) throw new BadRequestError("Ada isian yang perlu diperbaiki.", u.fieldErrors(r.errors));
  fresh.set("extra", r.values);
  e.app.save(fresh);
  return e.json(200, { extra: r.values });
});

// Ganti kampus: dibatasi sekali per N hari (app_settings.campusChangeDays) dan
// dicatat di campus_changes. Hak lihat soal langsung mengikuti kampus baru.
routerAdd("POST", "/api/medcoel/me/campus", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  const days = u.settings(e.app).getInt("campusChangeDays");
  const changed = u.parseDate(user.getString("campusChangedAt"));
  if (u.roleOf(user) !== "admin" && changed && days > 0 && Date.now() - changed.getTime() < days * 86400000) {
    const next = new Date(changed.getTime() + days * 86400000);
    throw new BadRequestError(
      "Kampus hanya bisa diganti sekali tiap " + days + " hari. Kamu bisa menggantinya lagi mulai " + u.localDate(next, "WIB") + ".",
    );
  }
  const cs = require(`${__hooks}/lib/campusSelect.js`);
  const sel = cs.check(e.app, b);
  if (Object.keys(sel.errors).length) throw new BadRequestError(Object.keys(sel.errors).map((k) => sel.errors[k]).join(" "));
  if (sel.value.mode === "none" && user.getString("campusOther") === u.NO_CAMPUS && !user.getString("campus")) {
    throw new BadRequestError("Itu sudah pilihanmu sekarang.");
  }
  let campus = "";
  let other = "";
  e.app.runInTransaction((tx) => {
    const place = cs.commit(tx, sel.value, u.roleOf(user) === "admin");
    campus = place.campus;
    other = place.campusOther;
  });
  if (campus && campus === user.getString("campus")) {
    throw new BadRequestError("Itu sudah kampusmu sekarang.");
  }
  const log = new Record(e.app.findCollectionByNameOrId("campus_changes"));
  log.set("user", user.id);
  if (user.getString("campus")) log.set("fromCampus", user.getString("campus"));
  log.set("fromOther", user.getString("campusOther"));
  if (campus) log.set("toCampus", campus);
  log.set("toOther", campus ? "" : other);

  const rec = e.app.findRecordById("users", user.id);
  rec.set("campus", campus);
  rec.set("campusOther", campus ? "" : other);
  rec.set("campusChangedAt", u.pbDate(new Date()));
  e.app.runInTransaction((tx) => {
    tx.save(log);
    tx.save(rec);
  });
  return e.json(200, u.userSummary(e.app, rec, true));
});

// Tandai semua notifikasi sudah dibaca.
routerAdd("POST", "/api/medcoel/notifications/read-all", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  e.app.db().newQuery("UPDATE notifications SET read = TRUE WHERE user = {:u} AND read = FALSE").bind({ u: user.id }).execute();
  return e.json(200, { ok: true });
});

// ---------------------------------------------------------------------------
// Pengumuman pop-up
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/announcements/active", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  const now = u.pbDate(new Date());
  const list = e.app.findRecordsByFilter(
    "announcements",
    "active = true && (startAt = '' || startAt <= {:now}) && (endAt = '' || endAt >= {:now})",
    "order,created",
    50,
    0,
    { now: now },
  );
  const campus = user.getString("campus");
  const out = [];
  list.forEach((a) => {
    if (a.getString("target") === "campuses" && (!campus || a.getStringSlice("campuses").indexOf(campus) < 0)) return;
    let dismissed = false;
    try {
      e.app.findFirstRecordByFilter("announcement_dismissals", "announcement = {:a} && user = {:u}", { a: a.id, u: user.id });
      dismissed = true;
    } catch (_) {}
    if (dismissed) return;
    out.push({ id: a.id, title: a.getString("title"), body: a.getString("body"), imageUrl: a.getString("imageUrl") });
  });
  return e.json(200, { items: out });
});

routerAdd("POST", "/api/medcoel/announcements/{id}/dismiss", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  const id = e.request.pathValue("id");
  try { e.app.findRecordById("announcements", id); } catch (_) { throw new NotFoundError("Pengumuman tidak ditemukan."); }
  try {
    e.app.findFirstRecordByFilter("announcement_dismissals", "announcement = {:a} && user = {:u}", { a: id, u: user.id });
  } catch (_) {
    const r = new Record(e.app.findCollectionByNameOrId("announcement_dismissals"));
    r.set("announcement", id);
    r.set("user", user.id);
    e.app.save(r);
  }
  return e.json(200, { ok: true });
});

// Daftar mata kuliah untuk langkah 3 pendaftaran (belum masuk). Hanya nama.
routerAdd("GET", "/api/medcoel/public-subjects", (e) => {
  const list = e.app.findRecordsByFilter("subjects", "hidden = false", "order,name", 200, 0);
  return e.json(200, {
    items: list.map((s) => ({ id: s.id, name: s.getString("name"), slug: s.getString("slug"), illustrationKey: s.getString("illustrationKey") })).sort(require(`${__hooks}/lib/catalogOrder.js`).byName),
  });
});
