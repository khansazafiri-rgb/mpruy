/// <reference path="../pb_data/types.d.ts" />

// UNGGAH FILE (lihat lib/drive.js untuk alur lengkapnya)
//
// POST /api/medcoel/upload/init      { kind, name, size, mime, draftId?, draftToken?, submission? }
// POST /api/medcoel/upload/complete  { fileId, uploadKey, driveFileId }      (mode drive)
// POST /api/medcoel/upload/local     multipart: fileId, uploadKey, file     (mode lokal)

routerAdd("POST", "/api/medcoel/upload/init", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const storage = require(`${__hooks}/lib/storage.js`);
  const b = u.body(e);
  const kind = String(b.kind || "");
  const origin = e.request.header.get("Origin") || "";
  const opts = { kind: kind, name: b.name, size: b.size, mime: b.mime, origin: origin };

  if (kind === "proof_whatsapp" || kind === "proof_instagram") {
    const sg = require(`${__hooks}/lib/signup.js`);
    const draft = sg.loadDraft(e.app, b.draftId, b.draftToken);
    if (!draft.getBool("emailVerified") || draft.getInt("step") < 4) {
      throw new BadRequestError("Selesaikan langkah sebelumnya dulu.");
    }
    // Batas wajar supaya draft tidak dipakai untuk menimbun file.
    const n = e.app.countRecords("stored_files", $dbx.exp("draftId = {:d}", { d: draft.id }));
    if (n >= 10) throw new BadRequestError("Terlalu banyak foto diunggah untuk pendaftaran ini. Mulai lagi dari awal.");
    opts.draftId = draft.id;
    opts.folder = ["bukti-komunitas", kind === "proof_whatsapp" ? "whatsapp" : "instagram", u.localDate(new Date(), "WIB").slice(0, 7)];
    opts.name = draft.getString("loginId") + "-" + (kind === "proof_whatsapp" ? "wa" : "ig") + "-" + Date.now() + extOf(b.mime);
  } else if (kind === "submission_pdf") {
    const user = u.requireUser(e);
    const s = u.settings(e.app);
    let sub;
    try { sub = e.app.findRecordById("submissions", String(b.submission || "")); } catch (_) { sub = null; }
    if (!sub || sub.getString("user") !== user.id) throw new NotFoundError("Pengajuan tidak ditemukan.");
    if (sub.getString("status") !== "draft") throw new BadRequestError("Pengajuan ini sudah dikirim, file tidak bisa ditambah lagi.");
    const files = e.app.countRecords("stored_files", $dbx.exp("submission = {:s} AND status IN ('pending','ready')", { s: sub.id }));
    if (files >= 5) throw new BadRequestError("Satu pengajuan paling banyak 5 PDF. Untuk lebih dari 5, kirim lewat WhatsApp admin.");
    const startToday = u.pbDate(new Date(Date.parse(u.localDate(new Date(), "WIB") + "T00:00:00Z") - 7 * 3600000));
    const today = e.app.countRecords("stored_files", $dbx.exp("owner = {:o} AND kind = 'submission_pdf' AND created >= {:t}", { o: user.id, t: startToday }));
    const quota = s.getInt("dailyUploadQuota") || 10;
    if (today >= quota) throw new BadRequestError("Kuota unggah hari ini (" + quota + " PDF) sudah habis. Coba lagi besok.");
    let subjectName = "lainnya";
    try { subjectName = e.app.findRecordById("subjects", sub.getString("subject")).getString("name"); } catch (_) {}
    opts.owner = user.id;
    opts.submission = sub.id;
    opts.folder = ["pengajuan", subjectName, sub.getString("code")];
  } else {
    throw new BadRequestError("Jenis unggahan tidak dikenal.");
  }

  const out = storage.init(e.app, opts);
  return e.json(200, out);

  function extOf(m) {
    return m === "image/png" ? ".png" : m === "image/webp" ? ".webp" : ".jpg";
  }
});

routerAdd("POST", "/api/medcoel/upload/complete", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const storage = require(`${__hooks}/lib/storage.js`);
  const b = u.body(e);
  const rec = storage.findPending(e.app, b.fileId, b.uploadKey);
  if (rec.getString("storage") !== "drive") throw new BadRequestError("Unggahan ini memakai mode lokal.");
  const done = storage.completeDrive(e.app, rec, String(b.driveFileId || ""));
  return e.json(200, storage.summary(e.app, done));
});

routerAdd("POST", "/api/medcoel/upload/local", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const storage = require(`${__hooks}/lib/storage.js`);
  const b = u.body(e);
  const rec = storage.findPending(e.app, b.fileId, b.uploadKey);
  if (rec.getString("storage") !== "local") throw new BadRequestError("Unggahan ini harus dikirim ke Google Drive.");
  const files = e.findUploadedFiles("file");
  const done = storage.completeLocal(e.app, rec, files && files.length ? files[0] : null);
  return e.json(200, storage.summary(e.app, done));
});
