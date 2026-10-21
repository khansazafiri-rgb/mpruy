/// <reference path="../pb_data/types.d.ts" />

// PENDAFTARAN LIMA LANGKAH
//
// Selama pendaftaran, data disimpan sebagai pendaftaran sementara
// (signup_drafts), bukan akun. Pendaftaran sementara tidak bisa dipakai masuk,
// bisa dilanjutkan bila halaman tertutup (browser menyimpan draftId + token),
// dan terhapus otomatis setelah 24 jam (cron.pb.js). Akun baru dibuat setelah
// langkah kelima, selalu dengan peran "user".
//
//   1. POST /api/medcoel/signup/start     data diri + captcha -> kode email
//   2. POST /api/medcoel/signup/verify    kode 6 digit (10 menit)
//   3. POST /api/medcoel/signup/subjects  mata kuliah yang sedang dipelajari
//   4. POST /api/medcoel/signup/proof     bukti grup WhatsApp (foto)
//   5. POST /api/medcoel/signup/proof     bukti mengikuti Instagram (foto)
//      POST /api/medcoel/signup/finish    membuat akun

routerAdd("GET", "/api/medcoel/signup/check-login-id", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const id = u.query(e, "loginId").trim().toLowerCase();
  const reserved = ["admin", "administrator", "medcoel", "hermes", "agent", "root", "support", "official", "superuser"];
  if (!/^[a-z0-9._]{4,30}$/.test(id)) {
    return e.json(200, { available: false, reason: "Login ID 4-30 karakter: huruf kecil, angka, titik, atau garis bawah." });
  }
  if (reserved.indexOf(id) >= 0) return e.json(200, { available: false, reason: "Login ID ini tidak bisa dipakai." });
  let taken = false;
  try { e.app.findFirstRecordByFilter("users", "loginId = {:id}", { id: id }); taken = true; } catch (_) {}
  return e.json(200, { available: !taken, reason: taken ? "Login ID sudah dipakai. Coba yang lain." : "" });
});

routerAdd("POST", "/api/medcoel/signup/start", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sg = require(`${__hooks}/lib/signup.js`);
  const b = u.body(e);

  if (!u.verifyTurnstile(b.turnstileToken, e.realIP())) {
    throw new BadRequestError("Verifikasi captcha gagal. Muat ulang halaman lalu coba lagi.");
  }

  const p = sg.validateProfile(e.app, b);

  let draft = null;
  if (b.draftId && b.draftToken) {
    try { draft = sg.loadDraft(e.app, b.draftId, b.draftToken); } catch (_) { draft = null; }
  }
  const emailChanged = !draft || draft.getString("email") !== p.email;
  if (!draft) {
    draft = new Record(e.app.findCollectionByNameOrId("signup_drafts"));
    draft.set("emailCodeSends", 0);
  }
  const token = $security.randomString(48);
  draft.set("tokenHash", u.hash(token));
  draft.set("loginId", p.loginId);
  draft.set("email", p.email);
  draft.set("profile", {
    loginId: p.loginId,
    name: p.name,
    email: p.email,
    whatsapp: p.whatsapp,
    semester: p.semester,
    campus: p.campus,
    campusOther: p.campusOther,
  });
  draft.set("passwordEnc", $security.encrypt(p.password, u.secretKey(e.app)));
  draft.set("ip", e.realIP());
  draft.set("expiresAt", u.pbDate(new Date(Date.now() + 24 * 3600 * 1000)));
  if (emailChanged) {
    draft.set("emailVerified", false);
    draft.set("step", 2);
  }
  e.app.save(draft);

  let sent = { devCode: "" };
  if (emailChanged) sent = sg.sendEmailCode(e.app, draft);
  else e.app.save(draft);

  return e.json(200, sg.state(e.app, draft, { draftToken: token, devCode: sent.devCode }));
});

routerAdd("GET", "/api/medcoel/signup/draft", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sg = require(`${__hooks}/lib/signup.js`);
  const draft = sg.loadDraft(e.app, u.query(e, "draftId"), u.query(e, "draftToken"));
  return e.json(200, sg.state(e.app, draft, {}));
});

routerAdd("POST", "/api/medcoel/signup/resend", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sg = require(`${__hooks}/lib/signup.js`);
  const b = u.body(e);
  const draft = sg.loadDraft(e.app, b.draftId, b.draftToken);
  if (draft.getBool("emailVerified")) return e.json(200, sg.state(e.app, draft, {}));
  const last = u.parseDate(draft.getString("updated"));
  if (last && Date.now() - last.getTime() < 60 * 1000 && draft.getInt("emailCodeSends") > 0) {
    throw new BadRequestError("Tunggu satu menit sebelum meminta kode baru.");
  }
  const sent = sg.sendEmailCode(e.app, draft);
  return e.json(200, sg.state(e.app, draft, { devCode: sent.devCode }));
});

routerAdd("POST", "/api/medcoel/signup/verify", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sg = require(`${__hooks}/lib/signup.js`);
  const b = u.body(e);
  const draft = sg.loadDraft(e.app, b.draftId, b.draftToken);
  if (draft.getBool("emailVerified")) return e.json(200, sg.state(e.app, draft, {}));

  const code = String(b.code || "").replace(/\D/g, "");
  const exp = u.parseDate(draft.getString("emailCodeExpires"));
  if (!exp || exp.getTime() < Date.now()) {
    throw new BadRequestError("Kode sudah kedaluwarsa (berlaku 10 menit). Tekan Kirim ulang kode.");
  }
  if (draft.getInt("emailCodeAttempts") >= 5) {
    throw new BadRequestError("Terlalu banyak percobaan. Tekan Kirim ulang kode untuk mendapat kode baru.");
  }
  if (!u.sameHash(draft.getString("emailCodeHash"), u.hash(code + ":" + draft.id))) {
    draft.set("emailCodeAttempts", draft.getInt("emailCodeAttempts") + 1);
    e.app.save(draft);
    throw new BadRequestError("Kodenya belum cocok. Periksa lagi email dari MEDCOEL.");
  }
  draft.set("emailVerified", true);
  draft.set("emailCodeHash", "");
  draft.set("step", Math.max(3, draft.getInt("step")));
  e.app.save(draft);
  return e.json(200, sg.state(e.app, draft, {}));
});

routerAdd("POST", "/api/medcoel/signup/subjects", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sg = require(`${__hooks}/lib/signup.js`);
  const b = u.body(e);
  const draft = sg.loadDraft(e.app, b.draftId, b.draftToken);
  if (!draft.getBool("emailVerified")) throw new BadRequestError("Verifikasi email dulu.");
  const ids = Array.isArray(b.subjects) ? b.subjects.map(String) : [];
  const valid = ids.filter((id) => {
    try { return !e.app.findRecordById("subjects", id).getBool("hidden"); } catch (_) { return false; }
  });
  if (!valid.length) throw new BadRequestError("Centang minimal satu mata kuliah yang sedang kamu pelajari.");
  draft.set("subjects", valid);
  draft.set("step", Math.max(4, draft.getInt("step")));
  e.app.save(draft);
  return e.json(200, sg.state(e.app, draft, {}));
});

routerAdd("POST", "/api/medcoel/signup/proof", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sg = require(`${__hooks}/lib/signup.js`);
  const b = u.body(e);
  const draft = sg.loadDraft(e.app, b.draftId, b.draftToken);
  const kind = b.kind === "instagram" ? "instagram" : b.kind === "whatsapp" ? "whatsapp" : "";
  if (!kind) throw new BadRequestError("Jenis bukti tidak dikenal.");
  if (b.joined !== true) {
    throw new BadRequestError(
      kind === "whatsapp"
        ? "Gabung ke komunitas WhatsApp MEDCOEL dulu supaya bisa lanjut."
        : "Ikuti Instagram MEDCOEL dulu supaya bisa lanjut.",
    );
  }
  const needStep = kind === "whatsapp" ? 4 : 5;
  if (draft.getInt("step") < needStep) throw new BadRequestError("Selesaikan langkah sebelumnya dulu.");
  let file;
  try { file = e.app.findRecordById("stored_files", String(b.fileId || "")); } catch (_) { file = null; }
  if (!file || file.getString("draftId") !== draft.id || file.getString("kind") !== "proof_" + kind || file.getString("status") !== "ready") {
    throw new BadRequestError("Foto bukti belum terunggah. Pilih fotonya lagi.");
  }
  draft.set(kind === "whatsapp" ? "proofWhatsapp" : "proofInstagram", file.id);
  draft.set("step", Math.max(kind === "whatsapp" ? 5 : 6, draft.getInt("step")));
  e.app.save(draft);
  return e.json(200, sg.state(e.app, draft, {}));
});

routerAdd("POST", "/api/medcoel/signup/finish", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sg = require(`${__hooks}/lib/signup.js`);
  const b = u.body(e);
  const draft = sg.loadDraft(e.app, b.draftId, b.draftToken);
  const result = sg.finish(e.app, draft);
  return e.json(200, result);
});

// ---------------------------------------------------------------------------
// Lupa password: kode 6 digit, 10 menit, sekali pakai, 5 kali per jam per email
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/medcoel/password/request", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const b = u.body(e);
  const email = u.cleanStr(b.email, 200).toLowerCase();
  if (!u.isEmail(email)) throw new BadRequestError("Format email belum benar.");

  // Jawaban selalu sama, ada atau tidak akunnya, supaya daftar email
  // pengguna tidak bisa ditebak dari sini.
  const ok = { ok: true, message: "Kalau email itu terdaftar, kode reset sudah dikirim. Cek juga folder Spam." };

  const sejam = u.pbDate(new Date(Date.now() - 3600 * 1000));
  const recent = e.app.countRecords("email_codes", $dbx.exp("email = {:e} AND purpose = 'reset_password' AND created > {:t}", { e: email, t: sejam }));
  if (recent >= 5) throw new TooManyRequestsError("Permintaan kode sudah 5 kali dalam satu jam. Coba lagi nanti.");

  let user = null;
  try { user = e.app.findAuthRecordByEmail("users", email); } catch (_) { user = null; }
  const col = e.app.findCollectionByNameOrId("email_codes");
  const rec = new Record(col);
  const code = u.randomDigits(6);
  rec.set("email", email);
  rec.set("purpose", "reset_password");
  rec.set("expiresAt", u.pbDate(new Date(Date.now() + 10 * 60 * 1000)));
  rec.set("used", !user || user.getBool("disabled") || !!user.getString("deletedAt"));
  rec.set("attempts", 0);
  rec.set("codeHash", u.hash(code + ":" + email));
  e.app.save(rec);

  if (!rec.getBool("used")) {
    const sent = u.sendMail(e.app, email, "Kode reset password MEDCOEL: " + code, u.codeMail(code, "reset password"));
    if (!sent && u.isDev()) ok.devCode = code;
  }
  return e.json(200, ok);
});

routerAdd("POST", "/api/medcoel/password/reset", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const b = u.body(e);
  const email = u.cleanStr(b.email, 200).toLowerCase();
  const code = String(b.code || "").replace(/\D/g, "");
  const pw = String(b.password || "");
  if (pw.length < 8) throw new BadRequestError("Password minimal 8 karakter.");
  if (pw !== String(b.passwordConfirm || "")) throw new BadRequestError("Ulangi password belum sama.");

  let rec = null;
  try {
    const list = e.app.findRecordsByFilter("email_codes", "email = {:e} && purpose = 'reset_password' && used = false", "-created", 1, 0, { e: email });
    rec = list[0] || null;
  } catch (_) { rec = null; }
  const bad = "Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru.";
  if (!rec) throw new BadRequestError(bad);
  const exp = u.parseDate(rec.getString("expiresAt"));
  if (!exp || exp.getTime() < Date.now() || rec.getInt("attempts") >= 5) throw new BadRequestError(bad);
  if (!u.sameHash(rec.getString("codeHash"), u.hash(code + ":" + email))) {
    rec.set("attempts", rec.getInt("attempts") + 1);
    e.app.save(rec);
    throw new BadRequestError("Kodenya belum cocok. Periksa lagi email dari MEDCOEL.");
  }
  let user;
  try { user = e.app.findAuthRecordByEmail("users", email); } catch (_) { throw new BadRequestError(bad); }
  rec.set("used", true);
  e.app.save(rec);
  user.setPassword(pw);
  // Mengganti password mengakhiri sesi di perangkat lain.
  user.refreshTokenKey();
  e.app.save(user);
  return e.json(200, { ok: true, loginId: user.getString("loginId") });
});
