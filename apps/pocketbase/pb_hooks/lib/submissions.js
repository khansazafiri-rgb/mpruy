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
  if (sub.getString("campus")) {
    try { campusName = app.findRecordById("campuses", sub.getString("campus")).getString("name"); } catch (_) {}
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
    pdfCount: sub.getInt("pdfCount"),
    viaWhatsapp: sub.getBool("viaWhatsapp"),
    createdByAdmin: sub.getBool("createdByAdmin"),
    importedCount: sub.getInt("importedCount"),
    created: sub.getString("created"),
    submittedAt: sub.getString("submittedAt"),
    confirmedAt: sub.getString("confirmedAt"),
    completedAt: sub.getString("completedAt"),
    files: files(app, sub).map((f) => {
      const s = storage.summary(app, f);
      if (o.withLinks) s.link = storage.linkFor(app, f, o.auth).url;
      return s;
    }),
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
    campus: { id: s.campus, name: s.campusName },
    subject: { id: s.subject, name: s.subjectName },
    hasKeyAndExplanation: s.hasKey,
    language: s.language,
    restriction: s.scope === "campus" ? "campus" : "all",
    pdfCount: s.pdfCount,
    files: s.files.map((f) => ({ id: f.id, name: f.name, size: f.size, driveFileId: f.driveFileId, link: f.link })),
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

  const msg = USER_MESSAGES[status];
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
      try { link = "/mata-kuliah/" + app.findRecordById("subjects", sub.getString("subject")).getString("slug"); } catch (_) {}
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
    const body = (s.subjectName || "Mata kuliah") + " · " + s.pdfCount + " PDF · " + (s.campusName || "kampus belum terdaftar") + ". Menunggu konfirmasi lewat WhatsApp.";
    app.findRecordsByFilter("users", "role = 'admin' && deletedAt = ''", "", 0, 0).forEach((a) => {
      u.notify(app, a.id, "submission", "Pengajuan baru " + s.code + " dari " + who, body, "/admin/pengajuan?status=menunggu_konfirmasi");
    });
  } catch (err) {
    console.log("notifyAdmins gagal:", err);
  }
}

module.exports = { LABEL, NEXT, makeCode, files, queueInfo, summary, contract, webhook, setStatus };
