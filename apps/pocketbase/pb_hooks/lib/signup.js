// Bantuan untuk alur pendaftaran (signup.pb.js).

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");

const RESERVED = ["admin", "administrator", "medcoel", "hermes", "agent", "root", "support", "official", "superuser"];

function loadDraft(app, id, token) {
  let d;
  try { d = app.findRecordById("signup_drafts", String(id || "")); } catch (_) { d = null; }
  if (!d || !u.sameHash(d.getString("tokenHash"), u.hash(String(token || "")))) {
    throw new NotFoundError("Pendaftaran sementara tidak ditemukan atau sudah lewat 24 jam. Mulai lagi dari langkah 1.");
  }
  const exp = u.parseDate(d.getString("expiresAt"));
  if (exp && exp.getTime() < Date.now()) {
    throw new NotFoundError("Pendaftaran sementara sudah lewat 24 jam. Mulai lagi dari langkah 1.");
  }
  return d;
}

function validateProfile(app, b) {
  const cfg = require(HOOKS + "/lib/signupConfig.js").config(app);
  const loginId = u.cleanStr(b.loginId, 40).toLowerCase();
  const name = u.cleanStr(b.name, 100).replace(/\s+/g, " ");
  const email = u.cleanStr(b.email, 200).toLowerCase();
  const whatsapp = u.normalizePhone(b.whatsapp);
  const password = String(b.password || "");
  const semester = parseInt(b.semester, 10);
  const campusId = u.cleanStr(b.campus, 40);
  const campusOther = u.cleanStr(b.campusOther, 200);

  const errors = {};
  if (!/^[a-z0-9._]{4,30}$/.test(loginId)) errors.loginId = "Login ID 4-30 karakter: huruf kecil, angka, titik, atau garis bawah.";
  else if (RESERVED.indexOf(loginId) >= 0) errors.loginId = "Login ID ini tidak bisa dipakai.";
  else {
    try { app.findFirstRecordByFilter("users", "loginId = {:id}", { id: loginId }); errors.loginId = "Login ID sudah dipakai. Coba yang lain."; } catch (_) {}
  }
  if (name.length < 2) errors.name = "Isi nama lengkapmu.";
  if (!u.isEmail(email)) errors.email = "Format email belum benar.";
  else {
    try { app.findAuthRecordByEmail("users", email); errors.email = "Email ini sudah terdaftar. Silakan masuk, atau pakai Lupa password."; } catch (_) {}
  }
  const waMode = cfg.builtin.whatsapp;
  const waRaw = String(b.whatsapp || "").trim();
  if (waMode === "required" && !whatsapp) errors.whatsapp = "Nomor WhatsApp belum benar. Contoh: 081234567890.";
  else if (waMode === "optional" && waRaw && !whatsapp) errors.whatsapp = "Nomor WhatsApp belum benar. Kosongkan bila tidak ingin mengisi.";
  if (password.length < 8) errors.password = "Password minimal 8 karakter.";
  else if (password !== String(b.passwordConfirm || "")) errors.passwordConfirm = "Ulangi password belum sama.";
  const semMode = cfg.builtin.semester;
  const semOk = semester >= 1 && semester <= 14;
  if (semMode === "required" && !semOk) errors.semester = "Pilih semester 1 sampai 14.";
  else if (semMode === "optional" && String(b.semester || "") !== "" && String(b.semester) !== "0" && !semOk) errors.semester = "Pilih semester 1 sampai 14.";
  const extra = require(HOOKS + "/lib/signupConfig.js").validateExtra(cfg.fields, b.extra, "signup", {});
  Object.keys(extra.errors).forEach((k) => { errors[k] = extra.errors[k]; });

  let campus = "";
  if (campusId) {
    try {
      const c = app.findRecordById("campuses", campusId);
      if (!c.getBool("active")) errors.campus = "Kampus ini sudah tidak tersedia. Pilih yang lain.";
      else campus = c.id;
    } catch (_) {
      errors.campus = "Pilih asal kampus dari daftar.";
    }
  } else if (!campusOther) {
    errors.campus = "Pilih asal kampus, atau pilih Lainnya lalu tulis nama kampusmu.";
  }

  if (Object.keys(errors).length) {
    throw new BadRequestError("Ada isian yang perlu diperbaiki.", u.fieldErrors(errors));
  }
  return {
    loginId, name, email, password, campus, campusOther: campus ? "" : campusOther,
    whatsapp: waMode === "hidden" ? "" : whatsapp,
    semester: semMode === "hidden" || !semOk ? 0 : semester,
    extra: extra.values,
  };
}

function maskEmail(email) {
  const parts = String(email).split("@");
  if (parts.length !== 2) return email;
  const n = parts[0];
  return (n.length <= 2 ? n[0] + "*" : n.slice(0, 2) + "***" + n.slice(-1)) + "@" + parts[1];
}

function sendEmailCode(app, draft) {
  if (draft.getInt("emailCodeSends") >= 6) {
    throw new TooManyRequestsError("Kode sudah dikirim berkali-kali. Periksa folder Spam, atau mulai lagi dengan email lain.");
  }
  const code = u.randomDigits(6);
  draft.set("emailCodeHash", u.hash(code + ":" + draft.id));
  draft.set("emailCodeExpires", u.pbDate(new Date(Date.now() + 10 * 60 * 1000)));
  draft.set("emailCodeAttempts", 0);
  draft.set("emailCodeSends", draft.getInt("emailCodeSends") + 1);
  app.save(draft);
  const sent = u.sendMail(app, draft.getString("email"), "Kode verifikasi MEDCOEL: " + code, u.codeMail(code, "verifikasi email"));
  if (!sent && !u.isDev()) {
    throw new ApiError(503, "Email belum bisa dikirim dari server. Coba lagi nanti atau hubungi admin.");
  }
  return { devCode: !sent && u.isDev() ? code : "" };
}

function proofInfo(app, id) {
  if (!id) return null;
  try {
    const f = app.findRecordById("stored_files", id);
    return { id: f.id, name: f.getString("name"), status: f.getString("status") };
  } catch (_) {
    return null;
  }
}

// Bukti yang sudah diunggah di draft: { kunci: idFile } (null = dilewati).
function draftProofs(d) {
  const out = u.recJson(d, "proofs", {}) || {};
  if (out.whatsapp === undefined && d.getString("proofWhatsapp")) out.whatsapp = d.getString("proofWhatsapp");
  if (out.instagram === undefined && d.getString("proofInstagram")) out.instagram = d.getString("proofInstagram");
  return out;
}

function state(app, d, extra) {
  const p = u.recJson(d, "profile", {}) || {};
  const out = {
    draftId: d.id,
    step: d.getInt("step") || 2,
    emailVerified: d.getBool("emailVerified"),
    emailMasked: maskEmail(d.getString("email")),
    profile: {
      loginId: p.loginId || "",
      name: p.name || "",
      email: p.email || "",
      whatsapp: p.whatsapp || "",
      semester: p.semester || "",
      campus: p.campus || "",
      campusOther: p.campusOther || "",
      extra: p.extra || {},
    },
    subjects: u.recJson(d, "subjects", []) || [],
    proofWhatsapp: proofInfo(app, d.getString("proofWhatsapp")),
    proofInstagram: proofInfo(app, d.getString("proofInstagram")),
    proofs: (() => { const m = draftProofs(d); const o = {}; Object.keys(m).forEach((k) => { o[k] = m[k] ? proofInfo(app, m[k]) : { skipped: true }; }); return o; })(),
    expiresAt: d.getString("expiresAt"),
  };
  if (extra && extra.draftToken) out.draftToken = extra.draftToken;
  if (extra && extra.devCode) out.devCode = extra.devCode;
  return out;
}

function finish(app, d) {
  if (!d.getBool("emailVerified")) throw new BadRequestError("Verifikasi email dulu.");
  const subjects = u.recJson(d, "subjects", []) || [];
  if (!subjects.length) throw new BadRequestError("Pilih mata kuliah yang sedang dipelajari dulu.");
  const proofSteps = require(HOOKS + "/lib/signupConfig.js").activeProofs(app);
  const given = draftProofs(d);
  proofSteps.forEach((ps) => {
    if (ps.required && !given[ps.key]) throw new BadRequestError("Selesaikan langkah " + ps.title + " dulu.");
  });
  if (d.getInt("step") < 4 + proofSteps.length) throw new BadRequestError("Selesaikan semua langkah pendaftaran dulu.");

  const p = u.recJson(d, "profile", {}) || {};
  // Cek ulang: Login ID atau email bisa saja dipakai orang lain selama
  // pendaftaran ini berjalan.
  let idTaken = false;
  try { app.findFirstRecordByFilter("users", "loginId = {:id}", { id: p.loginId }); idTaken = true; } catch (_) {}
  if (idTaken) {
    throw new BadRequestError("Login ID " + p.loginId + " baru saja dipakai orang lain. Kembali ke langkah 1 dan pilih Login ID lain.");
  }
  let emailTaken = false;
  try { app.findAuthRecordByEmail("users", p.email); emailTaken = true; } catch (_) {}
  if (emailTaken) throw new BadRequestError("Email ini sudah terdaftar. Silakan masuk.");

  let password = $security.decrypt(d.getString("passwordEnc"), u.secretKey(app));
  if (typeof password !== "string") password = toString(password);
  const needApproval = u.settings(app).getBool("requireProofApproval");

  let userId = "";
  app.runInTransaction((tx) => {
    const col = tx.findCollectionByNameOrId("users");
    const user = new Record(col);
    user.set("loginId", p.loginId);
    user.set("name", p.name);
    user.setEmail(p.email);
    user.set("emailVisibility", false);
    user.setVerified(true);
    user.setPassword(password);
    user.set("whatsapp", p.whatsapp || "");
    user.set("semester", p.semester || 0);
    user.set("extra", p.extra || {});
    if (p.campus) user.set("campus", p.campus);
    user.set("campusOther", p.campusOther || "");
    user.set("studyingSubjects", subjects);
    user.set("role", "user");
    user.set("disabled", needApproval);
    user.set("disabledReason", needApproval ? "Menunggu pemeriksaan bukti komunitas oleh admin." : "");
    user.set("leaderboardAnonymous", false);
    tx.save(user);
    userId = user.id;

    const proofCol = tx.findCollectionByNameOrId("community_proofs");
    Object.keys(given).forEach((key) => {
      const fileId = given[key];
      if (!fileId) return;
      const r = new Record(proofCol);
      r.set("user", user.id);
      r.set("kind", key === "whatsapp" || key === "instagram" ? key : "other");
      r.set("proofKey", key);
      r.set("file", fileId);
      tx.save(r);
      try {
        const f = tx.findRecordById("stored_files", fileId);
        f.set("owner", user.id);
        tx.save(f);
      } catch (_) {}
    });
    tx.delete(d);
  });

  return { ok: true, loginId: p.loginId, userId: userId, pendingApproval: needApproval };
}

module.exports = { loadDraft, validateProfile, sendEmailCode, state, finish, maskEmail, draftProofs };
