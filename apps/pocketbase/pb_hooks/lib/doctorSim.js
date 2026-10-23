// Kasus dan diagnosis Simulasi Dokter disimpan di koleksi sim_cases dan
// sim_diagnoses (dikelola admin). File ini membaca, memvalidasi, dan
// menyajikan datanya. Mesin simulasi tetap berjalan di browser.

const POLI = { umum: "Poli umum", bedah: "Poli bedah", spog: "Poli kandungan", anak: "Poli anak", dalam: "Poli penyakit dalam" };
// Gambar pasien yang tersedia di apps/web/public/simulasi (PAS_<nama>_<ekspresi>.webp).
const PATIENTS = ["kakek", "bapak", "nenek", "ibuhamil", "ibu", "anakp", "anakl"];
const EXPR = ["master", "nyeri", "meringis", "cemas", "lemas", "lega", "sesak"];
const SUS_EXPR = ["netral", "senyum", "serius"];
const KEY_RE = /^[a-z0-9_]{2,20}$/;
const ID_RE = /^[a-z0-9_]{1,40}$/;

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  if (!isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function serialize(r) {
  return {
    id: r.id,
    caseKey: r.getString("caseKey"),
    caseTitle: r.getString("caseTitle"),
    dxKey: r.getString("dxKey"),
    dxOk: r.getBool("dxOk"),
    score: r.getInt("score"),
    durationSec: r.getInt("durationSec"),
    mode: r.getString("mode"),
    timeout: r.getBool("timeout"),
    actionsCount: r.getInt("actionsCount"),
    keyDone: r.getInt("keyDone"),
    keyTotal: r.getInt("keyTotal"),
    created: r.getString("created"),
  };
}

function jsonOf(rec, field) {
  // Field JSON terbaca sebagai byte mentah; getString memberi teks JSON-nya.
  const txt = rec.getString(field);
  if (!txt || txt === "null") return {};
  try { const v = JSON.parse(txt); return v && typeof v === "object" ? v : {}; } catch (_) { return {}; }
}

function findCase(app, key) {
  if (!KEY_RE.test(String(key || ""))) return null;
  try { return app.findFirstRecordByFilter("sim_cases", "key = {:k}", { k: String(key) }); } catch (_) { return null; }
}

function caseOut(rec, full) {
  const out = {
    key: rec.getString("key"),
    title: rec.getString("title"),
    poli: rec.getString("poli"),
    poliName: POLI[rec.getString("poli")] || "",
    dxOk: rec.getString("dxOk"),
    active: rec.getBool("active"),
    order: rec.getInt("order"),
    updated: rec.getString("updated"),
  };
  const data = jsonOf(rec, "data");
  out.patient = data.id || "";
  out.pas = data.pas || "";
  if (full) out.data = data;
  return out;
}

function dxRecords(app) {
  return app.findRecordsByFilter("sim_diagnoses", "id != ''", "order,name", 0, 0);
}

function dxOut(rec) {
  return { key: rec.getString("key"), name: rec.getString("name"), tags: rec.getString("tags"), order: rec.getInt("order") };
}

/**
 * Isi untuk pemain: kasus aktif + semua diagnosis, dalam bentuk yang dipakai mesin di browser.
 * withInactive (khusus admin, untuk mencoba kasus): kasus nonaktif ikut dengan tanda inactive.
 */
function content(app, withInactive) {
  const dx = {};
  dxRecords(app).forEach((r) => { dx[r.getString("key")] = [r.getString("name"), r.getString("tags")]; });
  const cases = {};
  app.findRecordsByFilter("sim_cases", withInactive ? "id != ''" : "active = true", "order,key", 0, 0).forEach((r) => {
    const d = jsonOf(r, "data");
    if (!r.getBool("active")) d.inactive = true;
    d.poli = r.getString("poli");
    d.dxOk = r.getString("dxOk");
    d.title = r.getString("title");
    d.order = r.getInt("order");
    cases[r.getString("key")] = d;
  });
  return { cases: cases, dx: dx };
}

// ---------------------------------------------------------------------------
// Validasi isian admin
// ---------------------------------------------------------------------------

function str(v, max) { return String(v === undefined || v === null ? "" : v).trim().slice(0, max); }

function idList(v, errors, field) {
  const parts = String(v || "").split(/\s+/).filter(Boolean);
  const bad = parts.filter((p) => !ID_RE.test(p));
  if (bad.length) errors[field] = "Id tindakan tidak sah: " + bad.slice(0, 5).join(", ");
  const seen = {};
  return parts.filter((p) => { if (seen[p]) return false; seen[p] = 1; return true; }).join(" ");
}

/**
 * Membersihkan dan memeriksa isian kasus dari dashboard admin.
 * Mengembalikan { key, title, poli, dxOk, active, order, data }.
 */
function validateCase(app, b, existing) {
  const errors = {};
  const d = b.data && typeof b.data === "object" ? b.data : {};
  const key = existing ? existing.getString("key") : str(b.key, 20).toLowerCase();
  if (!existing) {
    if (!KEY_RE.test(key)) errors.key = "Kode kasus 2-20 karakter: huruf kecil, angka, atau garis bawah.";
    else if (findCase(app, key)) errors.key = "Kode kasus sudah dipakai.";
  }
  const poli = POLI[b.poli] ? b.poli : "";
  if (!poli) errors.poli = "Pilih poli.";
  const dxKeys = {};
  dxRecords(app).forEach((r) => { dxKeys[r.getString("key")] = 1; });

  const pas = PATIENTS.indexOf(d.pas) >= 0 ? d.pas : "";
  if (!pas) errors.pas = "Pilih gambar pasien.";
  const expr = EXPR.indexOf(d.expr) >= 0 ? d.expr : "master";
  const patient = str(d.id, 80);
  if (patient.length < 2) errors.id = "Isi nama dan usia pasien, misalnya: Pak Slamet, 68 tahun.";

  const intro = (Array.isArray(d.intro) ? d.intro : []).slice(0, 10).map((l) => ({
    w: l && (l.w === "sus" || l.w === "pas") ? l.w : "pas",
    e: l && l.w === "sus" ? (SUS_EXPR.indexOf(l.e) >= 0 ? l.e : "netral") : (EXPR.indexOf(l && l.e) >= 0 ? l.e : expr),
    t: str(l && l.t, 600),
  })).filter((l) => l.t);
  if (!intro.length) errors.intro = "Tulis minimal satu kalimat pembuka.";

  const dxOk = str(d.dxOk || b.dxOk, 40);
  if (!dxKeys[dxOk]) errors.dxOk = "Pilih diagnosis yang tepat dari daftar diagnosis.";
  let ddx = (Array.isArray(d.ddx) ? d.ddx : []).map((k) => str(k, 40)).filter((k) => dxKeys[k]);
  if (dxOk && ddx.indexOf(dxOk) < 0) ddx.unshift(dxOk);
  ddx = ddx.filter((k, i) => ddx.indexOf(k) === i).slice(0, 12);
  if (ddx.length < 2) errors.ddx = "Pilih minimal satu diagnosis banding selain diagnosis yang tepat.";

  const K = idList(d.K, errors, "K");
  const U = idList(d.U, errors, "U");
  const B = idList(d.B, errors, "B");
  if (!K) errors.K = errors.K || "Pilih minimal satu tindakan penting.";

  const A = {};
  const rawA = d.A && typeof d.A === "object" && !Array.isArray(d.A) ? d.A : {};
  Object.keys(rawA).slice(0, 400).forEach((id) => {
    if (!ID_RE.test(id)) return;
    const v = rawA[id];
    if (!v || typeof v !== "object") return;
    const o = {};
    ["say", "note", "t", "title", "sub", "rows"].forEach((f) => { if (v[f] !== undefined && v[f] !== null && String(v[f]).trim()) o[f] = str(v[f], 1500); });
    if (v.e && EXPR.indexOf(v.e) >= 0) o.e = v.e;
    if (v.who === "sus" || v.who === "pas") o.who = v.who;
    if (Object.keys(o).length) A[id] = o;
  });

  if (Object.keys(errors).length) throw new BadRequestError("Ada isian kasus yang perlu diperbaiki.", fieldErrors(errors));
  const title = str(b.title, 120) || patient + " · " + POLI[poli];
  return {
    key: key,
    title: title,
    poli: poli,
    dxOk: dxOk,
    active: b.active === undefined ? (existing ? existing.getBool("active") : false) : b.active === true,
    order: clampInt(b.order === undefined ? (existing ? existing.getInt("order") : 0) : b.order, 0, 100000),
    data: { pas: pas, expr: expr, id: patient, intro: intro, dxOk: dxOk, ddx: ddx, ref: str(d.ref, 3000), K: K, U: U, B: B, A: A },
  };
}

function validateDx(b, isNew) {
  const errors = {};
  const key = str(b.key, 40).toLowerCase();
  if (isNew && !ID_RE.test(key)) errors.key = "Kode diagnosis: huruf kecil, angka, atau garis bawah (maks. 40).";
  const name = str(b.name, 120);
  if (name.length < 2) errors.name = "Isi nama diagnosis.";
  const tags = String(b.tags || "").split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter((t) => /^[a-z]{2,20}$/.test(t));
  if (!tags.length) errors.tags = "Isi minimal satu kelompok, misalnya resp atau infeksi.";
  if (Object.keys(errors).length) throw new BadRequestError("Ada isian diagnosis yang perlu diperbaiki.", fieldErrors(errors));
  return { key: key, name: name, tags: tags.filter((t, i) => tags.indexOf(t) === i).join(","), order: clampInt(b.order || 0, 0, 100000) };
}

function fieldErrors(obj) {
  const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
  return require(HOOKS + "/lib/util.js").fieldErrors(obj);
}

module.exports = { POLI, PATIENTS, EXPR, SUS_EXPR, KEY_RE, clampInt, serialize, findCase, caseOut, content, dxRecords, dxOut, validateCase, validateDx, jsonOf };
