// Konfigurasi pendaftaran yang diatur admin: kolom data tambahan, langkah
// bukti komunitas, dan sifat kolom bawaan (WhatsApp, semester).
// Isi JSON di app_settings selalu dibersihkan saat dibaca, jadi data yang
// rusak atau diisi manual tidak bisa merusak pendaftaran.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";

const FIELD_TYPES = ["text", "textarea", "handle", "url", "tel", "number", "select", "checkbox", "date"];
const WHERE = ["signup", "profile", "admin"];
const KEY_RE = /^[a-z][a-z0-9_]{1,30}$/;
// Kunci yang tidak boleh dipakai kolom tambahan (bentrok dengan kolom bawaan).
const RESERVED = ["loginid", "name", "email", "whatsapp", "password", "semester", "campus", "campusother", "role", "id"];
const BUILTIN_MODES = ["required", "optional", "hidden"];

function str(v, max) { return String(v === undefined || v === null ? "" : v).trim().slice(0, max); }

function settingsJson(app, field, fallback) {
  const u = require(HOOKS + "/lib/util.js");
  return u.jsonSetting(app, field, fallback);
}

function cleanFields(raw) {
  const seen = {};
  return (Array.isArray(raw) ? raw : []).map((f) => {
    if (!f || typeof f !== "object") return null;
    const key = str(f.key, 31).toLowerCase();
    if (!KEY_RE.test(key) || RESERVED.indexOf(key) >= 0 || seen[key]) return null;
    seen[key] = 1;
    const type = FIELD_TYPES.indexOf(f.type) >= 0 ? f.type : "text";
    const options = type === "select" ? (Array.isArray(f.options) ? f.options : String(f.options || "").split("\n")).map((o) => str(o, 100)).filter(Boolean).slice(0, 50) : [];
    return {
      key: key,
      label: str(f.label, 100) || key,
      type: type,
      required: f.required === true,
      placeholder: str(f.placeholder, 120),
      hint: str(f.hint, 300),
      options: options,
      prefix: type === "handle" ? str(f.prefix, 5) || "@" : "",
      maxLength: Math.max(1, Math.min(type === "textarea" ? 2000 : 300, parseInt(f.maxLength, 10) || (type === "textarea" ? 1000 : 200))),
      where: WHERE.indexOf(f.where) >= 0 ? f.where : "signup",
      editable: f.editable !== false,
      active: f.active !== false,
    };
  }).filter(Boolean);
}

function cleanProofs(raw) {
  const seen = {};
  return (Array.isArray(raw) ? raw : []).map((p) => {
    if (!p || typeof p !== "object") return null;
    const key = str(p.key, 31).toLowerCase();
    if (!KEY_RE.test(key) || seen[key]) return null;
    seen[key] = 1;
    const url = str(p.url, 500);
    return {
      key: key,
      title: str(p.title, 100) || key,
      short: str(p.short, 20) || str(p.title, 20) || key,
      description: str(p.description, 1500),
      url: /^https?:\/\//i.test(url) ? url : "",
      buttonLabel: str(p.buttonLabel, 60),
      question: str(p.question, 150) || "Sudah?",
      active: p.active !== false,
      required: p.required !== false,
    };
  }).filter(Boolean);
}

function cleanBuiltin(raw) {
  const b = raw && typeof raw === "object" ? raw : {};
  return {
    whatsapp: BUILTIN_MODES.indexOf(b.whatsapp) >= 0 ? b.whatsapp : "required",
    semester: BUILTIN_MODES.indexOf(b.semester) >= 0 ? b.semester : "required",
  };
}

/** Konfigurasi lengkap (untuk server dan admin). */
function config(app) {
  const u = require(HOOKS + "/lib/util.js");
  const s = u.settings(app);
  const proofs = cleanProofs(settingsJson(app, "signupProofs", null) || [
    { key: "whatsapp", title: "Gabung komunitas WhatsApp", short: "WhatsApp", question: "Sudah bergabung ke komunitas WhatsApp?" },
    { key: "instagram", title: "Ikuti Instagram MEDCOEL", short: "Instagram", question: "Sudah mengikuti Instagram MEDCOEL?" },
  ]);
  // Tautan bawaan WhatsApp/Instagram dari Pengaturan > Komunitas bila kosong.
  proofs.forEach((p) => {
    if (!p.url && p.key === "whatsapp") p.url = s.getString("waCommunityUrl");
    if (!p.url && p.key === "instagram") p.url = s.getString("instagramUrl");
  });
  return { fields: cleanFields(settingsJson(app, "signupFields", [])), proofs: proofs, builtin: cleanBuiltin(settingsJson(app, "signupBuiltin", {})) };
}

/** Bagian yang dikirim ke browser siapa pun (tanpa kolom khusus admin). */
function publicConfig(app) {
  const c = config(app);
  return {
    fields: c.fields.filter((f) => f.active && f.where !== "admin"),
    proofs: c.proofs.filter((p) => p.active),
    builtin: c.builtin,
  };
}

function activeProofs(app) { return config(app).proofs.filter((p) => p.active); }

/**
 * Memeriksa nilai kolom tambahan.
 * mode: "signup" (kolom pendaftaran, wajib ditegakkan), "profile" (pengguna
 * mengubah kolom yang boleh diubah), "admin" (semua kolom, wajib tidak ditegakkan).
 * Mengembalikan { values, errors } dengan nama galat "extra_<kunci>".
 */
function validateExtra(defs, input, mode, existing) {
  const values = Object.assign({}, existing && typeof existing === "object" ? existing : {});
  const errors = {};
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  defs.forEach((f) => {
    if (!f.active) return;
    if (mode === "signup" && f.where !== "signup") return;
    if (mode === "profile" && (f.where === "admin" || !f.editable)) return;
    if (mode !== "signup" && src[f.key] === undefined) return;
    const raw = src[f.key];
    let v;
    let bad = "";
    if (f.type === "checkbox") {
      v = raw === true || raw === "true" || raw === 1;
      if (f.required && !v && mode !== "admin") bad = "Centang " + f.label + " untuk lanjut.";
    } else {
      let t = str(raw, f.maxLength);
      if (f.type === "handle") t = t.replace(/^@+/, "").replace(/\s+/g, "");
      if (f.type === "tel") t = t.replace(/[^\d+]/g, "");
      if (!t) {
        if (f.required && mode !== "admin") bad = "Isi " + f.label + ".";
        v = "";
      } else if (f.type === "url") {
        if (!/^https?:\/\//i.test(t)) t = "https://" + t;
        if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(t)) bad = f.label + " harus berupa tautan, mis. https://...";
        v = t;
      } else if (f.type === "handle") {
        if (!/^[A-Za-z0-9._-]{1,60}$/.test(t)) bad = f.label + " hanya boleh huruf, angka, titik, garis bawah, atau strip.";
        v = t;
      } else if (f.type === "tel") {
        if (t.replace(/\D/g, "").length < 8) bad = f.label + " belum benar.";
        v = t;
      } else if (f.type === "number") {
        const n = Number(t.replace(",", "."));
        if (!isFinite(n)) bad = f.label + " harus berupa angka.";
        v = isFinite(n) ? n : "";
      } else if (f.type === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) bad = f.label + " harus berupa tanggal.";
        v = t;
      } else if (f.type === "select") {
        if (f.options.indexOf(t) < 0) bad = "Pilih " + f.label + " dari daftar.";
        v = t;
      } else {
        v = t;
      }
    }
    if (bad) errors["extra_" + f.key] = bad;
    else values[f.key] = v;
  });
  // Kunci yang tidak ada di konfigurasi diabaikan (nilai lama dari kolom yang
  // sudah dihapus admin tetap tersimpan).
  return { values: values, errors: errors };
}

/** Kunci file bukti: whatsapp/instagram memakai jenis lama, lainnya proof_other + proofKey. */
function proofStoredKind(key) { return key === "whatsapp" || key === "instagram" ? "proof_" + key : "proof_other"; }

module.exports = { FIELD_TYPES, config, publicConfig, activeProofs, validateExtra, proofStoredKind, cleanFields, cleanProofs, cleanBuiltin };
