// Pengajuan soal (Chat Admin > Upload soal) dan kontraknya dengan Hermes Agent.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const storage = require(HOOKS + "/lib/storage.js");

const LABEL = {
  draft: "Draf",
  menunggu_konfirmasi: "Menunggu konfirmasi",
  antre: "Antre",
  diproses: "Diproses",
  selesai: "Selesai",
  perlu_perbaikan: "Perlu perbaikan",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

// Perpindahan status yang sah. Selesai hanya lewat impor (atau admin sebagai
// cadangan bila Hermes tidak berjalan).
const NEXT = {
  draft: ["menunggu_konfirmasi", "dibatalkan"],
  menunggu_konfirmasi: ["antre", "dibatalkan", "kedaluwarsa", "perlu_perbaikan"],
  antre: ["diproses", "perlu_perbaikan", "dibatalkan", "selesai"],
  diproses: ["selesai", "perlu_perbaikan", "antre"],
  perlu_perbaikan: ["antre", "diproses", "dibatalkan"],
  selesai: ["diproses"],
  dibatalkan: [],
  kedaluwarsa: ["antre"],
};

function makeCode() {
  const d = u.localDate(new Date(), "WIB").replace(/-/g, "").slice(2);
  return "MC" + d + "-" + $security.randomStringWithAlphabet(4, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
}

// Judul dari nama berkas PDF: buang ".pdf", sisa ekstensi dokumen asal (.docx/.pptx) dan akhiran "compressed",
// garis bawah jadi spasi. "Tissue Bahas Pena B15 UB.docx_compressed.pdf" -> "Tissue Bahas Pena B15 UB".
function pdfTitle(name) {
  let t = String(name || "").replace(/\.pdf$/i, "");
  t = t.replace(/[_\s-]*compressed$/i, "");
  t = t.replace(/\.(docx?|pptx?|xlsx?|odt|odp)$/i, "");
  return t.replace(/_+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

function files(app, sub) {
  return app.findRecordsByFilter("stored_files", "submission = {:s} && (status = 'ready' || status = 'archived')", "created", 0, 0, { s: sub.id });
}

// Antrean dihitung per PDF, berurutan menurut waktu konfirmasi.
function queueInfo(app, sub) {
  const cap = u.intSetting(app, "dailyCapacity", 40);
  const rows = app.findRecordsByFilter("submissions", "status = 'antre' || status = 'diproses'", "confirmedAt,created", 0, 0);
  let ahead = 0;
  let totalQueued = 0;
  rows.forEach((r) => {
    totalQueued += r.getInt("pdfCount");
    if (sub && r.id === sub.id) return;
    if (!sub) return;
    const st = sub.getString("status");
    if (st === "antre") {
      const mine = sub.getString("confirmedAt") || sub.getString("created");
      const theirs = r.getString("confirmedAt") || r.getString("created");
      if (r.getString("status") === "diproses" || theirs < mine) ahead += r.getInt("pdfCount");
    } else {
      ahead += r.getInt("pdfCount");
    }
  });
  if (!sub) ahead = totalQueued;
  const own = sub ? sub.getInt("pdfCount") : 0;
  const days = Math.max(1, Math.ceil((ahead + own) / cap));
  return { pdfAhead: ahead, totalQueuedPdf: totalQueued, dailyCapacity: cap, estimateDays: days, overFiveDays: days > 5 };
}

function summary(app, sub, opts) {
  const o = opts || {};
  let subjectName = "";
  try { subjectName = app.findRecordById("subjects", sub.getString("subject")).getString("name"); } catch (_) {}
  let campusName = "";
  let programName = "";
  if (sub.getString("campus")) {
    try {
      const c = app.findRecordById("campuses", sub.getString("campus"));
      campusName = c.getString("name");
      if (c.getString("program")) programName = app.findRecordById("programs", c.getString("program")).getString("name");
    } catch (_) {}
  }
  const st = sub.getString("status");
  const out = {
    id: sub.id,
    code: sub.getString("code"),
    status: st,
    statusLabel: LABEL[st] || st,
    statusNote: sub.getString("statusNote"),
    subject: sub.getString("subject"),
    subjectName: subjectName,
    hasKey: sub.getBool("hasKey"),
    language: sub.getString("language"),
    scope: sub.getString("scope"),
    campus: sub.getString("campus"),
    campusName: campusName,
    programName: programName,
    pdfCount: sub.getInt("pdfCount"),
    contentKind: sub.getString("contentKind") === "materi" ? "materi" : "soal",
    viaWhatsapp: sub.getBool("viaWhatsapp"),
    createdByAdmin: sub.getBool("createdByAdmin"),
    importedCount: sub.getInt("importedCount"),
    created: sub.getString("created"),
    submittedAt: sub.getString("submittedAt"),
    confirmedAt: sub.getString("confirmedAt"),
    completedAt: sub.getString("completedAt"),
    files: files(app, sub).map((f) => {
      const s = storage.summary(app, f);
      s.title = pdfTitle(s.name);
      if (o.withLinks) s.link = storage.linkFor(app, f, o.auth).url;
      return s;
    }).map((s, i) => Object.assign(s, { n: i + 1 })),
  };
  if (st === "antre" || st === "diproses" || st === "menunggu_konfirmasi" || st === "draft") out.queue = queueInfo(app, sub);
  if (o.withUser) {
    try {
      const usr = app.findRecordById("users", sub.getString("user"));
      out.user = { id: usr.id, name: usr.getString("name"), loginId: usr.getString("loginId"), whatsapp: usr.getString("whatsapp"), email: usr.email() };
    } catch (_) {
      out.user = null;
    }
  }
  return out;
}

// Isi minimal yang dikirim ke Hermes untuk satu pengajuan (lihat PRD,
// "Kontrak dengan Hermes Agent").
function contract(app, sub, auth) {
  const s = summary(app, sub, { withLinks: true, withUser: true, auth: auth });
  return {
    id: s.id,
    code: s.code,
    status: s.status,
    submittedAt: s.submittedAt,
    confirmedAt: s.confirmedAt,
    user: s.user ? { id: s.user.id, name: s.user.name, loginId: s.user.loginId } : null,
    campus: { id: s.campus, name: s.campusName, program: s.programName },
    subject: { id: s.subject, name: s.subjectName },
    // Apa isi PDF-nya, dipilih pengaju: "soal" atau "materi" (PPT). Hermes memakainya untuk memberi tahu admin
    // dan memilih jalur impor (/import atau /materi-import).
    contentKind: s.contentKind,
    kindLabel: s.contentKind === "materi" ? "PPT materi" : "Soal",
    hasKeyAndExplanation: s.hasKey,
    language: s.language,
    restriction: s.scope === "campus" ? "campus" : "all",
    pdfCount: s.pdfCount,
    // n = nomor PDF (urutan unggah, sama dengan /files KODE N di Hermes); title = judul dari nama berkas.
    files: s.files.map((f) => ({ id: f.id, n: f.n, name: f.name, title: f.title, size: f.size, driveFileId: f.driveFileId, link: f.link })),
  };
}

// Mengirim pemberitahuan ke Hermes bila HERMES_WEBHOOK_URL diisi. Ditandatangani
// HMAC-SHA256 dengan HERMES_WEBHOOK_SECRET di header X-Medcoel-Signature.
function webhook(app, event, data) {
  const url = u.env("HERMES_WEBHOOK_URL");
  if (!url) return;
  try {
    const bodyText = JSON.stringify({ event: event, sentAt: new Date().toISOString(), data: data });
    const secret = u.env("HERMES_WEBHOOK_SECRET");
    const headers = { "Content-Type": "application/json" };
    if (secret) headers["X-Medcoel-Signature"] = $security.hs256(bodyText, secret);
    $http.send({ url: url, method: "POST", headers: headers, body: bodyText, timeout: 15 });
  } catch (err) {
    console.log("webhook Hermes gagal:", err);
  }
}

const USER_MESSAGES = {
  menunggu_konfirmasi: ["Pengajuan {code} terkirim", "Satu langkah lagi: konfirmasi ke admin lewat WhatsApp supaya pengajuanmu masuk antrean."],
  antre: ["Pengajuan {code} sudah dikonfirmasi", "Pengajuanmu masuk antrean. Perkiraan selesai sekitar {days} hari."],
  diproses: ["Pengajuan {code} sedang diproses", "Admin sedang mengubah PDF-mu menjadi soal."],
  selesai: ["Soal dari pengajuan {code} sudah tayang", "{count} soal sudah bisa dikerjakan. Terima kasih sudah berbagi!"],
  perlu_perbaikan: ["Pengajuan {code} perlu perbaikan", "{note}"],
  dibatalkan: ["Pengajuan {code} dibatalkan", "{note}"],
  kedaluwarsa: ["Pengajuan {code} kedaluwarsa", "Pengajuan tidak dikonfirmasi lewat WhatsApp tepat waktu, jadi filenya dihapus. Silakan ajukan ulang."],
};

// Pesan untuk pengajuan PPT materi (menggantikan pesan soal bila ada).
const DECK_MESSAGES = {
  diproses: ["Pengajuan {code} sedang diproses", "Admin sedang mengubah PPT-mu menjadi materi."],
  selesai: ["Materi dari pengajuan {code} sudah tayang", "{count} slide sudah bisa dipelajari di Drilling. Terima kasih sudah berbagi!"],
};

function setStatus(app, sub, status, note, actor) {
  const from = sub.getString("status");
  if (from === status) return sub;
  const allowed = NEXT[from] || [];
  if (allowed.indexOf(status) < 0) {
    throw new BadRequestError("Status " + (LABEL[from] || from) + " tidak bisa diubah menjadi " + (LABEL[status] || status) + ".");
  }
  if (status === "perlu_perbaikan" && !String(note || "").trim()) {
    throw new BadRequestError("Tulis alasan perbaikan untuk pengguna (mis. PDF tidak terbaca, bukan soal, atau duplikat).");
  }
  sub.set("status", status);
  if (note !== undefined) sub.set("statusNote", String(note || "").slice(0, 1000));
  if (status === "antre" && !sub.getString("confirmedAt")) sub.set("confirmedAt", u.pbDate(new Date()));
  if (status === "selesai") sub.set("completedAt", u.pbDate(new Date()));
  app.save(sub);

  if (status === "dibatalkan" || status === "kedaluwarsa") {
    const policy = u.settings(app).getString("expiredFilePolicy") || "archive";
    files(app, sub).forEach((f) => {
      try { storage.discard(app, f, policy, ["arsip", "pengajuan", sub.getString("code")]); } catch (err) { console.log("discard gagal", err); }
    });
  }

  const isDeck = sub.getString("contentKind") === "materi";
  const msg = isDeck && DECK_MESSAGES[status] ? DECK_MESSAGES[status] : USER_MESSAGES[status];
  if (msg && !(status === "dibatalkan" && actor === "user")) {
    const q = queueInfo(app, sub);
    const fill = (t) =>
      t
        .replace("{code}", sub.getString("code"))
        .replace("{days}", String(q.estimateDays))
        .replace("{count}", String(sub.getInt("importedCount")))
        .replace("{note}", sub.getString("statusNote") || (status === "dibatalkan" ? "Pengajuan dibatalkan admin." : ""));
    let link = "/chat-admin";
    if (status === "selesai") {
      try { link = (isDeck ? "/drilling/" : "/mata-kuliah/") + app.findRecordById("subjects", sub.getString("subject")).getString("slug"); } catch (_) {}
    }
    u.notify(app, sub.getString("user"), status === "selesai" ? "question_live" : "submission", fill(msg[0]), fill(msg[1]), link);
  }

  // Admin diberi tahu begitu pengguna mengirim pengajuan, tidak menunggu konfirmasi.
  if (from === "draft" && status === "menunggu_konfirmasi") notifyAdmins(app, sub);

  if (status === "antre") webhook(app, "submission.queued", contract(app, sub, null));
  return sub;
}

function notifyAdmins(app, sub) {
  try {
    const s = summary(app, sub, { withUser: true });
    const who = s.user ? s.user.name + " (" + s.user.loginId + ")" : "pengguna";
    const body = (s.subjectName || "Mata kuliah") + " · " + s.pdfCount + (s.contentKind === "materi" ? " PDF PPT materi · " : " PDF · ") + + (s.campusName || "kampus belum terdaftar") + ". Menunggu konfirmasi lewat WhatsApp.";
    app.findRecordsByFilter("users", "role = 'admin' && deletedAt = ''", "", 0, 0).forEach((a) => {
      u.notify(app, a.id, "submission", "Pengajuan baru " + s.code + " dari " + who, body, "/admin/pengajuan?status=menunggu_konfirmasi");
    });
  } catch (err) {
    console.log("notifyAdmins gagal:", err);
  }
}

// Batas PDF per pengajuan lewat web. Harus sama dengan MAX_PDF di apps/web/src/pages/ChatAdmin.jsx.
const MAX_PDFS = 10;

/**
 * Impor soal untuk satu pengajuan (dipakai agen). Kampus selalu dari pengajuan. forceDrilling = true untuk
 * rute /drilling-import, yang dipakai Hermes Agent saat tujuan impor adalah Drilling.
 */
function agentImport(e, forceDrilling) {
  const importer = require(HOOKS + "/lib/importer.js");
  u.requireAgent(e);
  const b = u.body(e);
  let sub;
  try { sub = e.app.findFirstRecordByFilter("submissions", "id = {:x} || code = {:x}", { x: e.request.pathValue("id") }); } catch (_) { sub = null; }
  if (!sub) throw new NotFoundError("Pengajuan tidak ditemukan.");
  const st = sub.getString("status");
  if (["antre", "diproses", "perlu_perbaikan"].indexOf(st) < 0) {
    throw new BadRequestError("Pengajuan berstatus " + (LABEL[st] || st) + " tidak bisa diimpor. Konfirmasi dulu pengajuannya.");
  }
  if (sub.getString("contentKind") === "materi") {
    throw new BadRequestError("Pengajuan " + sub.getString("code") + " berisi PPT materi, bukan soal. Kirim lewat /materi-import (di Hermes: /put lalu /confirm).");
  }
  // Kampus selalu dari pengajuan, apa pun isi JSON-nya. Pengajuan "kampus saja" yang masuk Drilling
  // hanya terlihat oleh pengguna kampus itu. Soal Drilling dikelompokkan per bagian bernama judul PDF.
  const drillingTarget = forceDrilling === true || b.drilling === true;
  const t = titleFor(e.app, sub, b.pdf);
  const setTitle = drillingTarget ? u.cleanStr(b.title, 200) || t.title : "";
  const result = importer.run(e.app, {
    setTitle: setTitle,
    input: b.questions !== undefined ? b.questions : b.text,
    subject: sub.getString("subject"),
    chapter: b.chapter || "",
    scope: sub.getString("scope") === "campus" ? "campus" : "all",
    campuses: sub.getString("scope") === "campus" ? [sub.getString("campus")] : [],
    source: "submission",
    submission: sub.id,
    skipInvalid: b.skipInvalid === true,
    drilling: drillingTarget,
    dryRun: b.dryRun === true,
  });
  if (drillingTarget) {
    result.setTitle = setTitle;
    result.pdf = t.index || undefined;
    if (!setTitle && t.count > 1) result.titleNote = titleNeeded(sub, t.count);
  }
  if (result.blocked) return e.json(400, Object.assign({ status: 400 }, result));
  if (!b.dryRun) {
    if (st !== "diproses") setStatus(e.app, sub, "diproses", sub.getString("statusNote"), "agent");
    sub.set("importedCount", sub.getInt("importedCount") + result.created);
    e.app.save(sub);
    setStatus(e.app, sub, "selesai", sub.getString("statusNote"), "agent");
  }
  return e.json(200, result);
}

/**
 * Judul bagian dari PDF pengajuan. `pdf` = nomor PDF (1..n, opsional). Satu PDF saja: judulnya otomatis.
 * Beberapa PDF tanpa nomor: tidak ada judul (title kosong, count > 1) dan pemanggil memutuskan.
 * Mengembalikan { title, index, count, explicit }.
 */
function titleFor(app, sub, pdf) {
  const list = files(app, sub);
  if (pdf !== undefined && pdf !== null && String(pdf).trim() !== "") {
    const n = parseInt(pdf, 10);
    if (!(n >= 1 && n <= list.length)) {
      throw new BadRequestError("PDF nomor " + pdf + " tidak ada. Pengajuan " + sub.getString("code") + " punya " + list.length + " PDF (nomor 1 sampai " + list.length + ").");
    }
    return { title: pdfTitle(list[n - 1].getString("name")), index: n, count: list.length, explicit: true };
  }
  if (list.length === 1) return { title: pdfTitle(list[0].getString("name")), index: 1, count: 1, explicit: false };
  return { title: "", index: 0, count: list.length, explicit: false };
}

/** Pesan bila judul tidak bisa ditentukan karena pengajuan punya beberapa PDF. */
function titleNeeded(sub, count) {
  return "Pengajuan " + sub.getString("code") + " punya " + count + " PDF, jadi judulnya belum bisa dipilih otomatis. Sebutkan nomor PDF-nya (di Hermes: /put " + sub.getString("code") + " 2, nomornya sama dengan /files " + sub.getString("code") + " 2).";
}

/**
 * Impor materi (slide + penjelasan) untuk satu pengajuan PPT materi. Kampus dan cakupan selalu dari pengajuan.
 * Berhasil: berkas tayang di Drilling mata kuliah itu, pengajuan menjadi selesai, pengaju diberi tahu.
 */
function agentImportDeck(e) {
  const decks = require(HOOKS + "/lib/decks.js");
  u.requireAgent(e);
  const b = u.body(e);
  let sub;
  try { sub = e.app.findFirstRecordByFilter("submissions", "id = {:x} || code = {:x}", { x: e.request.pathValue("id") }); } catch (_) { sub = null; }
  if (!sub) throw new NotFoundError("Pengajuan tidak ditemukan.");
  const st = sub.getString("status");
  if (["antre", "diproses", "perlu_perbaikan"].indexOf(st) < 0) {
    throw new BadRequestError("Pengajuan berstatus " + (LABEL[st] || st) + " tidak bisa diimpor. Konfirmasi dulu pengajuannya.");
  }
  if (sub.getString("contentKind") !== "materi") {
    throw new BadRequestError("Pengajuan " + sub.getString("code") + " berisi soal, bukan PPT materi. Kirim lewat /import.");
  }
  const campus = sub.getString("scope") === "campus";
  // Judul materi di web: permintaan eksplisit (title) > judul PDF (satu PDF, atau nomor PDF dipilih lewat `pdf`) > judul di JSON.
  const t = titleFor(e.app, sub, b.pdf);
  const asked = u.cleanStr(b.title, 200);
  const result = decks.importDeck(e.app, {
    input: decks.inputOf(b),
    subject: sub.getString("subject"),
    scope: campus ? "campus" : "all",
    campuses: campus ? [sub.getString("campus")] : [],
    forceTitle: asked || t.title,
    forceSource: asked ? "request" : "pdf",
    titleError: titleNeeded(sub, t.count),
    pdf: t.index || undefined,
    status: b.status === "draft" ? "draft" : "published",
    source: "submission",
    submission: sub.id,
    dryRun: b.dryRun === true,
  });
  if (result.blocked) return e.json(400, Object.assign({ status: 400, message: decks.blockedMessage(result) }, result));
  if (!b.dryRun) {
    if (st !== "diproses") setStatus(e.app, sub, "diproses", sub.getString("statusNote"), "agent");
    sub.set("importedCount", result.slideCount);
    e.app.save(sub);
    setStatus(e.app, sub, "selesai", sub.getString("statusNote"), "agent");
  }
  return e.json(200, result);
}

// Status yang masih boleh dialihkan tujuannya (jenis isi / mata kuliah): belum diimpor dan berkas masih ada.
const RETARGET_STATUSES = ["menunggu_konfirmasi", "antre", "diproses", "perlu_perbaikan"];

function plain(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Cari mata kuliah dari id, slug, atau nama untuk pengalihan lewat Hermes. Besar-kecil huruf tidak berpengaruh.
 * Cocok persis (id/slug/nama) didahulukan; kalau tidak ada, cocok sebagian pada nama/slug diterima hanya bila
 * tunggal. Beberapa kecocokan ditolak dengan daftar kandidatnya supaya admin tidak salah memindahkan.
 */
function findSubjectLoose(app, ref) {
  const raw = String(ref || "").trim();
  const q = plain(raw);
  if (!q) throw new BadRequestError("Sebutkan mata kuliah yang baru (nama lengkap atau slug).");
  const rows = app.findRecordsByFilter("subjects", "id != ''", "name", 500, 0).map((r) => ({
    rec: r,
    id: r.id,
    name: r.getString("name"),
    nameKey: plain(r.getString("name")),
    slugKey: plain(r.getString("slug")),
    hidden: r.getBool("hidden"),
  }));
  let hit = rows.filter((r) => r.id === raw || r.slugKey === q || r.nameKey === q);
  if (!hit.length) hit = rows.filter((r) => !r.hidden && (r.nameKey.indexOf(q) >= 0 || r.slugKey.indexOf(q) >= 0));
  if (!hit.length) throw new BadRequestError("Mata kuliah '" + raw + "' tidak ditemukan. Kirim /matkul di Hermes untuk melihat daftar nama yang benar.");
  if (hit.length > 1) {
    throw new BadRequestError("'" + raw + "' cocok dengan beberapa mata kuliah: " + hit.slice(0, 8).map((r) => r.name).join("; ") + ". Tulis nama lengkapnya.");
  }
  if (hit[0].hidden) throw new BadRequestError("Mata kuliah " + hit[0].name + " sedang disembunyikan, jadi tidak bisa dipakai sebagai tujuan.");
  return hit[0].rec;
}

/**
 * Alihkan satu pengajuan: ganti jenis isi ("soal" | "materi") dan/atau mata kuliahnya. Yang tidak disebut tidak berubah.
 * Kampus, cakupan, bahasa, berkas, dan status tidak disentuh. Pengajuan yang sudah diimpor (Selesai) atau ditutup
 * tidak bisa dialihkan. Mengembalikan { changed, contentKind: {from,to}, subject: {from,to} }.
 */
function retarget(app, sub, change) {
  const st = sub.getString("status");
  if (RETARGET_STATUSES.indexOf(st) < 0) {
    throw new BadRequestError("Pengajuan berstatus " + (LABEL[st] || st) + " tidak bisa dialihkan. Hanya pengajuan yang belum diimpor (Menunggu konfirmasi, Antre, Diproses, atau Perlu perbaikan) yang bisa diubah jenis isi atau mata kuliahnya.");
  }
  const askKind = change.contentKind === undefined || change.contentKind === null || String(change.contentKind).trim() === "" ? "" : String(change.contentKind).trim().toLowerCase();
  const askSubject = change.subject === undefined || change.subject === null ? "" : String(change.subject).trim();
  if (!askKind && !askSubject) throw new BadRequestError("Sebutkan jenis isi baru (soal atau materi) dan/atau mata kuliah yang baru.");
  if (askKind && askKind !== "soal" && askKind !== "materi") throw new BadRequestError("Jenis isi harus 'soal' atau 'materi'.");

  const oldKind = sub.getString("contentKind") === "materi" ? "materi" : "soal";
  const oldSubjectId = sub.getString("subject");
  let oldSubjectName = "";
  try { oldSubjectName = app.findRecordById("subjects", oldSubjectId).getString("name"); } catch (_) {}

  const newKind = askKind || oldKind;
  const target = askSubject ? findSubjectLoose(app, askSubject) : null;
  const newSubjectId = target ? target.id : oldSubjectId;
  const newSubjectName = target ? target.getString("name") : oldSubjectName;

  const changed = newKind !== oldKind || newSubjectId !== oldSubjectId;
  if (changed) {
    sub.set("contentKind", newKind);
    // PPT materi tidak punya kunci jawaban; saat jadi materi, penanda "ada kunci" dibersihkan.
    if (newKind === "materi") sub.set("hasKey", false);
    sub.set("subject", newSubjectId);
    app.save(sub);
  }
  return {
    changed: changed,
    contentKind: { from: oldKind, to: newKind },
    subject: { from: { id: oldSubjectId, name: oldSubjectName }, to: { id: newSubjectId, name: newSubjectName } },
  };
}

module.exports = { MAX_PDFS, LABEL, pdfTitle, titleFor, titleNeeded, NEXT, makeCode, files, queueInfo, summary, contract, webhook, setStatus, agentImport, agentImportDeck, RETARGET_STATUSES, findSubjectLoose, retarget };
