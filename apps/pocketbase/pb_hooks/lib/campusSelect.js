// PILIHAN PROGRAM STUDI + KAMPUS (pendaftaran, ganti kampus, admin).
//
// Satu record `campuses` = satu penyelenggaraan (program studi + institusi). Hak lihat soal
// khusus kampus berbasis id kampus, jadi "Kedokteran X" dan "Keperawatan X" otomatis terpisah.
//
// Pemilih menghasilkan salah satu dari tiga bentuk:
//   - tanpa kampus   : campusOther === NO_CAMPUS (mis. siswa SMA), tanpa program
//   - dari daftar    : campus = id kampus (program ikut dari kampus itu)
//   - tulis sendiri  : program (id) atau programOther (teks) + campusOther (teks)
// Bentuk ketiga baru membuat record saat dilakukan `commit` (mis. setelah email terverifikasi),
// supaya pendaftaran palsu tidak mengotori daftar. Record baru berstatus `unverified`: tidak
// tampil di daftar umum, tetapi orang lain yang menulis kampus yang sama otomatis bergabung ke
// record yang sama (dicocokkan tanpa memedulikan huruf besar/kecil dan spasi).

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");

const NAME_MAX = 120;

function norm(s) {
  return String(s || "").toLowerCase().replace(/[.,()]/g, " ").replace(/\s+/g, " ").trim();
}

// Nama yang diketik pengguna: teks biasa, bukan tautan atau tag. Mengembalikan "" bila tidak layak.
function cleanTyped(raw) {
  const s = u.cleanStr(raw, NAME_MAX).replace(/\s+/g, " ");
  if (s.length < 3 || !/[A-Za-zÀ-ɏ]{2}/.test(s)) return "";
  if (/[<>{}\[\]\\|]|https?:|www\.|@/i.test(s)) return "";
  return s;
}

function findProgram(app, id) {
  try { return app.findRecordById("programs", String(id || "")); } catch (_) { return null; }
}
function findCampus(app, id) {
  try { return app.findRecordById("campuses", String(id || "")); } catch (_) { return null; }
}

// Pilihan dari pemilih -> { errors, value }. Tidak menulis apa pun.
// value.mode: "none" | "listed" | "typed"
function check(app, b) {
  const errors = {};
  const campusId = u.cleanStr(b.campus, 40);
  const campusOther = u.cleanStr(b.campusOther, 200);
  const programId = u.cleanStr(b.program, 40);
  const programOther = u.cleanStr(b.programOther, 200);

  if (!campusId && campusOther === u.NO_CAMPUS) {
    return { errors, value: { mode: "none", campus: "", program: "", programOther: "", campusOther: u.NO_CAMPUS } };
  }

  let program = null;
  if (programId) {
    program = findProgram(app, programId);
    if (!program || !program.getBool("active")) { errors.program = "Program studi ini tidak tersedia. Pilih yang lain."; program = null; }
  }

  if (campusId) {
    const c = findCampus(app, campusId);
    if (!c || !c.getBool("active")) {
      errors.campus = "Pilih asal kampus dari daftar.";
    } else {
      const cp = c.getString("program");
      if (program && cp && cp !== program.id) errors.campus = "Kampus itu tidak menyelenggarakan program studi yang kamu pilih.";
      else if (!program && programOther) errors.campus = "Pilih program studi dari daftar, atau kosongkan kampus lalu tulis sendiri.";
      else return { errors, value: { mode: "listed", campus: c.id, program: cp, programOther: "", campusOther: "" } };
    }
    return { errors, value: null };
  }

  // Tulis sendiri: butuh program (daftar atau teks) dan nama kampus.
  let typedProgram = "";
  if (!program) {
    if (programOther) {
      typedProgram = cleanTyped(programOther);
      if (!typedProgram) errors.program = "Tulis nama program studimu dengan jelas (huruf saja, tanpa tautan).";
    } else if (!errors.program) {
      errors.program = "Pilih program studi, atau pilih Lainnya lalu tulis prodimu.";
    }
  }
  const typedCampus = cleanTyped(campusOther);
  if (!typedCampus) errors.campus = campusOther ? "Tulis nama kampusmu dengan jelas (huruf saja, tanpa tautan)." : "Pilih asal kampus, atau pilih kampus yang belum ada lalu tulis namanya.";
  if (Object.keys(errors).length) return { errors, value: null };
  return { errors, value: { mode: "typed", campus: "", program: program ? program.id : "", programOther: typedProgram, campusOther: typedCampus } };
}

function sameName(a, b) { return norm(a) === norm(b); }

function findOrCreateProgram(app, name, verified) {
  const all = app.findRecordsByFilter("programs", "id != ''", "", 0, 0);
  const hit = all.find((p) => sameName(p.getString("name"), name));
  if (hit) return hit;
  const r = new Record(app.findCollectionByNameOrId("programs"));
  r.set("name", name);
  r.set("order", 9000 + all.length);
  r.set("active", true);
  r.set("unverified", !verified);
  try { app.save(r); return r; } catch (err) {
    // Dua pendaftar menulis prodi yang sama bersamaan: pakai yang sudah terbuat.
    const again = app.findRecordsByFilter("programs", "id != ''", "", 0, 0).find((p) => sameName(p.getString("name"), name));
    if (again) return again;
    throw err;
  }
}

function findOrCreateCampus(app, program, institution, verified) {
  const rows = app.findRecordsByFilter("campuses", "program = {:p}", "", 0, 0, { p: program.id });
  const hit = rows.find((c) => sameName(c.getString("institution"), institution) || sameName(c.getString("name"), institution));
  if (hit) return hit;
  const r = new Record(app.findCollectionByNameOrId("campuses"));
  r.set("name", program.getString("name") + " " + institution);
  r.set("institution", institution);
  r.set("program", program.id);
  r.set("kind", "lainnya");
  r.set("active", true);
  r.set("unverified", !verified);
  r.set("order", 9000 + rows.length);
  try { app.save(r); return r; } catch (err) {
    const again = app.findRecordsByFilter("campuses", "program = {:p}", "", 0, 0, { p: program.id })
      .find((c) => sameName(c.getString("institution"), institution));
    if (again) return again;
    throw err;
  }
}

// Menjadikan hasil check() sebagai kolom akun: { campus, campusOther }.
// app boleh berupa transaksi. verified true bila yang menulis admin.
function commit(app, value, verified) {
  if (value.mode === "none") return { campus: "", campusOther: u.NO_CAMPUS };
  if (value.mode === "listed") return { campus: value.campus, campusOther: "" };
  const program = value.program ? findProgram(app, value.program) : findOrCreateProgram(app, value.programOther, !!verified);
  const campus = findOrCreateCampus(app, program, value.campusOther, !!verified);
  return { campus: campus.id, campusOther: "" };
}

// Gabungkan satu kampus ke kampus lain (pengguna, pengajuan, soal, pengumuman ikut pindah).
function mergeCampus(tx, srcId, dstId) {
  const src = tx.findRecordById("campuses", srcId);
  const dst = tx.findRecordById("campuses", dstId);
  let moved = 0;
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
  return { moved, into: dst.getString("name") };
}

// Gabungkan satu program ke program lain. Kampus yang namanya kembar di program tujuan ikut
// digabung; sisanya dipindah dan namanya disesuaikan.
function mergeProgram(tx, srcId, dstId) {
  const src = tx.findRecordById("programs", srcId);
  const dst = tx.findRecordById("programs", dstId);
  const dstRows = tx.findRecordsByFilter("campuses", "program = {:p}", "", 0, 0, { p: dst.id });
  let moved = 0, merged = 0;
  tx.findRecordsByFilter("campuses", "program = {:p}", "", 0, 0, { p: src.id }).forEach((c) => {
    const inst = c.getString("institution") || c.getString("name");
    const twin = dstRows.find((d) => sameName(d.getString("institution"), inst));
    if (twin) { mergeCampus(tx, c.id, twin.id); merged++; return; }
    c.set("program", dst.id);
    c.set("name", dst.getString("name") + " " + inst);
    tx.save(c);
    dstRows.push(c);
    moved++;
  });
  tx.delete(src);
  return { moved, merged, into: dst.getString("name") };
}

// Tempel daftar massal: satu baris "Institusi | Kota | ptn/pts" (kota dan jenis boleh kosong).
function bulkAdd(app, program, text) {
  const rows = app.findRecordsByFilter("campuses", "program = {:p}", "", 0, 0, { p: program.id });
  const have = {};
  rows.forEach((c) => { have[norm(c.getString("institution") || c.getString("name"))] = c; });
  const out = { added: 0, skipped: 0, invalid: [] };
  String(text || "").split(/\r?\n/).forEach((line) => {
    const raw = line.trim();
    if (!raw) return;
    const parts = raw.split("|").map((x) => x.trim());
    const inst = cleanTyped(parts[0]);
    if (!inst) { out.invalid.push(raw.slice(0, 80)); return; }
    const hit = have[norm(inst)];
    if (hit) {
      // Baris yang sama menjadikan kampus buatan pengguna "resmi".
      if (hit.getBool("unverified")) { hit.set("unverified", false); app.save(hit); out.added++; } else out.skipped++;
      return;
    }
    const kind = ["ptn", "pts", "kedinasan", "lainnya"].indexOf((parts[2] || "").toLowerCase()) >= 0 ? parts[2].toLowerCase() : "lainnya";
    const r = new Record(app.findCollectionByNameOrId("campuses"));
    r.set("name", program.getString("name") + " " + inst);
    r.set("institution", inst);
    r.set("city", u.cleanStr(parts[1], 100));
    r.set("kind", kind);
    r.set("program", program.id);
    r.set("active", true);
    r.set("unverified", false);
    r.set("order", 9000 + rows.length + out.added);
    app.save(r);
    have[norm(inst)] = r;
    out.added++;
  });
  return out;
}

module.exports = { norm, cleanTyped, check, commit, findOrCreateProgram, findOrCreateCampus, mergeCampus, mergeProgram, bulkAdd };
