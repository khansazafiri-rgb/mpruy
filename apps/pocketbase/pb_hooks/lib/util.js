// Fungsi bersama untuk semua hook MEDCOEL.
//
// Handler PocketBase berjalan terisolasi dan tidak bisa membaca variabel di
// luar fungsinya, jadi setiap handler memuat modul ini sendiri:
//   const u = require(`${__hooks}/lib/util.js`);

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";

function lib(name) {
  return require(HOOKS + "/lib/" + name + ".js");
}

function env(name, fallback) {
  const v = typeof $os !== "undefined" ? $os.getenv(name) : process.env[name];
  return v === undefined || v === null || v === "" ? (fallback === undefined ? "" : fallback) : v;
}

function isDev() {
  return env("MEDCOEL_DEV_MODE") === "1";
}

// ---------------------------------------------------------------------------
// Pengaturan aplikasi (satu baris di app_settings)
// ---------------------------------------------------------------------------

function settings(app) {
  const list = app.findRecordsByFilter("app_settings", "id != ''", "created", 1, 0);
  if (!list.length) throw new Error("app_settings belum ada. Jalankan migrasi.");
  return list[0];
}

function intSetting(app, name, fallback) {
  const v = settings(app).getInt(name);
  return v > 0 ? v : fallback;
}

function jsonSetting(app, name, fallback) {
  const raw = settings(app).get(name);
  const v = parseJson(raw, null);
  return v === null || v === undefined ? fallback : v;
}

// Field JSON dari record bisa datang sebagai string, byte, atau objek.
function parseJson(raw, fallback) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }
  try {
    const s = typeof toString === "function" ? toString(raw) : String(raw);
    if (typeof s === "string" && s.length && (s[0] === "{" || s[0] === "[" || s[0] === '"' || /^[\d\-tfn]/.test(s))) {
      return JSON.parse(s);
    }
  } catch (_) {}
  return raw;
}

function recJson(record, field, fallback) {
  return parseJson(record.get(field), fallback);
}

// Kunci AES 32 karakter untuk mengenkripsi password di pendaftaran sementara.
function secretKey(app) {
  const fromEnv = env("MEDCOEL_SECRET");
  if (fromEnv && fromEnv.length >= 32) return fromEnv.slice(0, 32);
  const s = settings(app);
  let k = s.getString("secret");
  if (!k || k.length < 32) {
    k = $security.randomString(32);
    s.set("secret", k);
    app.save(s);
  }
  return k.slice(0, 32);
}

// ---------------------------------------------------------------------------
// Request & autentikasi
// ---------------------------------------------------------------------------

function body(e) {
  const info = e.requestInfo();
  return (info && info.body) || {};
}

function query(e, name) {
  const info = e.requestInfo();
  const q = (info && info.query) || {};
  const v = q[name];
  return v === undefined || v === null ? "" : String(v);
}

function isUserRecord(rec) {
  return !!rec && rec.collection().name === "users";
}

function roleOf(rec) {
  return rec ? rec.getString("role") || "user" : "";
}

// Pengguna yang sudah masuk, aktif, dan belum dihapus. Token lama milik akun
// yang baru dinonaktifkan juga ditolak di sini.
function requireUser(e) {
  const a = e.auth;
  if (!isUserRecord(a)) throw new UnauthorizedError("Silakan masuk dulu.");
  if (a.getBool("disabled") || a.getString("deletedAt")) {
    throw new ForbiddenError("Akun ini sedang nonaktif. Hubungi admin lewat WhatsApp.");
  }
  return a;
}

// Data galat per field yang lolos penyaringan PocketBase (pesan aslinya tetap
// terkirim ke browser).
function fieldErrors(obj) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => { out[k] = new ValidationError("invalid_" + k, String(obj[k])); });
  return out;
}

function requireAdmin(e) {
  const a = requireUser(e);
  if (roleOf(a) !== "admin") throw new ForbiddenError("Halaman ini hanya untuk admin.");
  return a;
}

// Akun agen (Hermes) masuk seperti pengguna biasa, berperan "agent". Bila
// MEDCOEL_AGENT_IPS diisi, permintaan juga harus datang dari alamat itu.
function requireAgent(e) {
  const a = requireUser(e);
  const role = roleOf(a);
  if (role !== "agent" && role !== "admin") throw new ForbiddenError("Hanya akun agen yang boleh memakai endpoint ini.");
  const allow = env("MEDCOEL_AGENT_IPS");
  if (role === "agent" && allow) {
    const ip = e.realIP();
    const list = allow.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.indexOf(ip) < 0) throw new ForbiddenError("Alamat IP " + ip + " tidak diizinkan untuk akun agen.");
  }
  return a;
}

// ---------------------------------------------------------------------------
// Waktu
// ---------------------------------------------------------------------------

const TZ_OFFSET = { WIB: 7, WITA: 8, WIT: 9 };

function nowIso() {
  return new Date().toISOString();
}

// PocketBase menyimpan tanggal sebagai "YYYY-MM-DD HH:MM:SS.sssZ".
function pbDate(d) {
  const iso = (d instanceof Date ? d : new Date(d)).toISOString();
  return iso.replace("T", " ");
}

function parseDate(s) {
  if (!s) return null;
  const str = String(s);
  const d = new Date(str.indexOf("T") >= 0 ? str : str.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

// Tanggal kalender (YYYY-MM-DD) di zona tertentu.
function localDate(d, tz) {
  const off = TZ_OFFSET[tz || "WIB"] || 7;
  const t = new Date((d instanceof Date ? d : new Date(d)).getTime() + off * 3600000);
  return t.toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  // dateA, dateB: "YYYY-MM-DD"
  const a = Date.UTC(+dateA.slice(0, 4), +dateA.slice(5, 7) - 1, +dateA.slice(8, 10));
  const b = Date.UTC(+dateB.slice(0, 4), +dateB.slice(5, 7) - 1, +dateB.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

// Senin minggu ini (WIB) sebagai waktu UTC, untuk leaderboard mingguan.
function startOfWeekWib(now) {
  const n = now || new Date();
  const wib = new Date(n.getTime() + 7 * 3600000);
  const dow = (wib.getUTCDay() + 6) % 7; // 0 = Senin
  const mondayWib = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - dow);
  return new Date(mondayWib - 7 * 3600000);
}

// ---------------------------------------------------------------------------
// Kode & token
// ---------------------------------------------------------------------------

function randomDigits(n) {
  return $security.randomStringWithAlphabet(n, "0123456789");
}

function hash(text) {
  return $security.sha256(String(text));
}

function sameHash(a, b) {
  return !!a && !!b && $security.equal(a, b);
}

// ---------------------------------------------------------------------------
// Validasi sederhana
// ---------------------------------------------------------------------------

function cleanStr(v, max) {
  const s = String(v === undefined || v === null ? "" : v).trim();
  return max ? s.slice(0, max) : s;
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));
}

// "0812..." / "+62 812..." / "62812..." -> "62812..."
function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.indexOf("0") === 0) d = "62" + d.slice(1);
  if (d.indexOf("62") !== 0) d = "62" + d;
  return d.length >= 10 && d.length <= 15 ? d : "";
}

function escapeHtml(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Nama yang tampil di leaderboard: nama depan + inisial belakang.
function displayName(fullName, anonymous) {
  if (anonymous) return "Anonim";
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Pengguna";
  if (parts.length === 1) return parts[0];
  return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
}

// ---------------------------------------------------------------------------
// Notifikasi & email
// ---------------------------------------------------------------------------

function notify(app, userId, kind, title, bodyText, link) {
  try {
    const col = app.findCollectionByNameOrId("notifications");
    const r = new Record(col);
    r.set("user", userId);
    r.set("kind", kind);
    r.set("title", String(title).slice(0, 200));
    r.set("body", String(bodyText || "").slice(0, 2000));
    r.set("link", String(link || "").slice(0, 500));
    r.set("read", false);
    app.save(r);
  } catch (err) {
    console.log("notify gagal:", err);
  }
}

function smtpEnabled(app) {
  const s = app.settings();
  return !!(s.smtp && s.smtp.enabled);
}

// Mengirim email. Mengembalikan true bila terkirim. Bila SMTP belum diatur
// (mode pengembangan), isinya dicetak ke log server supaya kode tetap bisa
// dicoba.
function sendMail(app, to, subject, html) {
  if (!smtpEnabled(app)) {
    console.log("[MEDCOEL email belum diatur] Ke: " + to + " | " + subject + "\n" + String(html).replace(/<[^>]+>/g, " "));
    return false;
  }
  try {
    const s = app.settings();
    const msg = new MailerMessage({
      from: { address: s.meta.senderAddress, name: s.meta.senderName || "MEDCOEL" },
      to: [{ address: to }],
      subject: subject,
      html: html,
    });
    app.newMailClient().send(msg);
    return true;
  } catch (err) {
    console.log("sendMail gagal:", err);
    return false;
  }
}

function mailLayout(title, inner) {
  return (
    '<div style="font-family:Inter,Arial,sans-serif;background:#F8F7F3;padding:24px">' +
    '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;color:#172B38">' +
    '<p style="margin:0 0 16px;font-weight:700;color:#007060;font-size:18px">MEDCOEL</p>' +
    '<h1 style="font-size:20px;margin:0 0 12px">' + escapeHtml(title) + "</h1>" +
    inner +
    '<p style="margin-top:28px;font-size:12px;color:#6b7a84">Email ini dikirim otomatis oleh medcoel.com.</p>' +
    "</div></div>"
  );
}

function codeMail(code, purposeText) {
  return mailLayout(
    "Kode " + purposeText,
    "<p>Masukkan kode berikut di halaman MEDCOEL. Kode berlaku 10 menit dan hanya bisa dipakai sekali.</p>" +
      '<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0;color:#00584E">' + code + "</p>" +
      "<p>Kalau kamu tidak merasa meminta kode ini, abaikan saja email ini.</p>",
  );
}

// ---------------------------------------------------------------------------
// Aturan siapa melihat soal
// ---------------------------------------------------------------------------

// Filter PocketBase untuk soal yang boleh dilihat pengguna. Soal umum
// (scope = all) terlihat semua orang. Soal terbatas hanya untuk kampus yang
// tercantum, dihitung dari kampus akun SAAT INI.
function visibleFilter(user) {
  const campus = user.getString("campus");
  if (roleOf(user) === "admin") return { filter: "status = 'published'", params: {} };
  if (!campus) return { filter: "status = 'published' && scope = 'all'", params: {} };
  return {
    filter: "status = 'published' && (scope = 'all' || campuses ?= {:campus})",
    params: { campus: campus },
  };
}

function canSeeQuestion(user, q) {
  if (q.getString("status") !== "published") return roleOf(user) === "admin";
  if (q.getString("scope") === "all") return true;
  if (roleOf(user) === "admin") return true;
  const campus = user.getString("campus");
  return !!campus && q.getStringSlice("campuses").indexOf(campus) >= 0;
}

// ---------------------------------------------------------------------------
// Pengaturan yang aman untuk publik
// ---------------------------------------------------------------------------

function publicSettings(app) {
  const s = settings(app);
  return {
    waCommunityUrl: s.getString("waCommunityUrl"),
    instagramUrl: s.getString("instagramUrl"),
    instagramHandle: s.getString("instagramHandle"),
    adminWhatsapp: normalizePhone(s.getString("adminWhatsapp")),
    submissionsOpen: s.getBool("submissionsOpen"),
    dailyCapacity: s.getInt("dailyCapacity") || 40,
    maxPdfMb: s.getInt("maxPdfMb") || 20,
    confirmDays: s.getInt("confirmDays") || 3,
    campusChangeDays: s.getInt("campusChangeDays"),
    simulationTypes: jsonSetting(app, "simulationTypes", ["A", "K"]),
    reminderDaysDefault: jsonSetting(app, "reminderDaysDefault", [7, 3, 1]),
    points: {
      easy: s.getInt("pointsEasy"),
      medium: s.getInt("pointsMedium"),
      hard: s.getInt("pointsHard"),
    },
    privacyPolicy: s.getString("privacyPolicy"),
    copyrightPolicy: s.getString("copyrightPolicy"),
    turnstileSiteKey: env("TURNSTILE_SITE_KEY"),
    driveConfigured: !!(env("GDRIVE_CLIENT_ID") && env("GDRIVE_REFRESH_TOKEN") && env("GDRIVE_ROOT_FOLDER_ID")),
  };
}

// Verifikasi Cloudflare Turnstile. Tanpa TURNSTILE_SECRET (mode
// pengembangan) pemeriksaan dilewati.
function verifyTurnstile(token, ip) {
  const secret = env("TURNSTILE_SECRET");
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = $http.send({
      url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "secret=" + encodeURIComponent(secret) + "&response=" + encodeURIComponent(token) + "&remoteip=" + encodeURIComponent(ip || ""),
      timeout: 15,
    });
    return !!(res.json && res.json.success);
  } catch (err) {
    console.log("turnstile gagal:", err);
    return false;
  }
}

// Status tutorial pengguna (users.tutorials), hanya kunci dan nilai yang dikenal.
function tutorialsOf(u) {
  let raw = {};
  try { const txt = u.getString("tutorials"); raw = txt && txt !== "null" ? JSON.parse(txt) : {}; } catch (_) { raw = {}; }
  if (typeof raw !== "object" || Array.isArray(raw)) raw = {};
  const out = {};
  ["fk", "dokter"].forEach((k) => { if (raw[k] === "done" || raw[k] === "skipped") out[k] = raw[k]; });
  return out;
}

// Ringkasan aman satu akun, untuk dikirim ke pemiliknya sendiri atau admin.
function userSummary(app, u, withPrivate) {
  let campusName = "";
  const campusId = u.getString("campus");
  if (campusId) {
    try { campusName = app.findRecordById("campuses", campusId).getString("name"); } catch (_) {}
  }
  const out = {
    id: u.id,
    loginId: u.getString("loginId"),
    name: u.getString("name"),
    role: roleOf(u),
    semester: u.getInt("semester"),
    campus: campusId,
    campusName: campusName || u.getString("campusOther"),
    campusOther: u.getString("campusOther"),
    studyingSubjects: u.getStringSlice("studyingSubjects"),
    leaderboardAnonymous: u.getBool("leaderboardAnonymous"),
    created: u.getString("created"),
  };
  if (withPrivate) {
    out.email = u.email();
    out.whatsapp = u.getString("whatsapp");
    out.disabled = u.getBool("disabled");
    out.disabledReason = u.getString("disabledReason");
    out.deletedAt = u.getString("deletedAt");
    out.campusChangedAt = u.getString("campusChangedAt");
    out.lastActiveAt = u.getString("lastActiveAt");
    out.tutorials = tutorialsOf(u);
  }
  return out;
}

module.exports = {
  tutorialsOf,
  lib,
  env,
  isDev,
  settings,
  intSetting,
  jsonSetting,
  parseJson,
  recJson,
  secretKey,
  body,
  query,
  roleOf,
  requireUser,
  requireAdmin,
  fieldErrors,
  requireAgent,
  TZ_OFFSET,
  nowIso,
  pbDate,
  parseDate,
  localDate,
  daysBetween,
  startOfWeekWib,
  randomDigits,
  hash,
  sameHash,
  cleanStr,
  isEmail,
  normalizePhone,
  escapeHtml,
  displayName,
  notify,
  smtpEnabled,
  sendMail,
  mailLayout,
  codeMail,
  visibleFilter,
  canSeeQuestion,
  publicSettings,
  verifyTurnstile,
  userSummary,
};
