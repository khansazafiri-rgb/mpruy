// Unggahan file: memilih Google Drive (produksi) atau penyimpanan lokal
// sementara (pengembangan, bila Drive belum diatur).
//
// Mode lokal hanya untuk mencoba web di laptop. Di server produksi, isi
// variabel GDRIVE_* supaya file tidak menumpuk di server (lihat drive.js).

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const drive = require(HOOKS + "/lib/drive.js");

const KIND_RULES = {
  proof_whatsapp: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 2 * 1024 * 1024, label: "foto bukti" },
  proof_instagram: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 2 * 1024 * 1024, label: "foto bukti" },
  submission_pdf: { mimes: ["application/pdf"], maxBytes: 0, label: "PDF" },
};

function mode() {
  return drive.configured() ? "drive" : "local";
}

function rulesFor(app, kind) {
  const r = KIND_RULES[kind];
  if (!r) throw new BadRequestError("Jenis unggahan tidak dikenal.");
  const out = Object.assign({}, r);
  if (kind === "submission_pdf") out.maxBytes = (u.intSetting(app, "maxPdfMb", 20)) * 1024 * 1024;
  return out;
}

function safeName(name, fallbackExt) {
  let s = String(name || "").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) s = "file" + (fallbackExt || "");
  return s.slice(0, 150);
}

// Membuat catatan stored_files berstatus pending dan, untuk Drive, sesi unggah.
function init(app, opts) {
  const rules = rulesFor(app, opts.kind);
  const size = parseInt(opts.size, 10);
  if (!(size > 0)) throw new BadRequestError("Ukuran file tidak terbaca. Pilih ulang filenya.");
  if (size > rules.maxBytes) {
    throw new BadRequestError(
      "Ukuran " + rules.label + " terlalu besar (" + (size / 1048576).toFixed(1) + " MB). Batasnya " +
        Math.round(rules.maxBytes / 1048576) + " MB. Kecilkan dulu filenya lalu coba lagi.",
    );
  }
  const mime = String(opts.mime || "").toLowerCase();
  if (rules.mimes.indexOf(mime) < 0) {
    throw new BadRequestError(
      opts.kind === "submission_pdf"
        ? "Yang bisa diunggah hanya file PDF."
        : "Foto bukti harus berformat JPG, PNG, atau WebP.",
    );
  }

  const col = app.findCollectionByNameOrId("stored_files");
  const rec = new Record(col);
  const key = $security.randomString(40);
  rec.set("kind", opts.kind);
  if (opts.owner) rec.set("owner", opts.owner);
  if (opts.draftId) rec.set("draftId", opts.draftId);
  if (opts.submission) rec.set("submission", opts.submission);
  rec.set("storage", mode());
  rec.set("name", safeName(opts.name, mime === "application/pdf" ? ".pdf" : ".jpg"));
  rec.set("mime", mime);
  rec.set("size", size);
  rec.set("status", "pending");
  rec.set("uploadKey", key);
  app.save(rec);

  const out = { fileId: rec.id, uploadKey: key, mode: mode() };
  if (out.mode === "drive") {
    out.uploadUrl = drive.startUpload(app, {
      folder: opts.folder,
      name: rec.getString("name"),
      mime: mime,
      size: size,
      uploadKey: key,
      origin: opts.origin,
    });
  }
  return out;
}

function findPending(app, fileId, uploadKey) {
  let rec;
  try { rec = app.findRecordById("stored_files", fileId); } catch (_) { rec = null; }
  if (!rec || !u.sameHash(rec.getString("uploadKey"), String(uploadKey || ""))) {
    throw new NotFoundError("Unggahan tidak ditemukan. Ulangi dari awal.");
  }
  return rec;
}

// Dipanggil setelah browser selesai mengirim ke Drive.
function completeDrive(app, rec, driveFileId) {
  if (rec.getString("status") === "ready") return rec;
  const meta = drive.getMeta(app, driveFileId);
  const fail = (msg) => {
    if (meta) drive.remove(app, driveFileId);
    rec.set("status", "deleted");
    app.save(rec);
    throw new BadRequestError(msg);
  };
  if (!meta || meta.trashed) fail("File belum sampai di penyimpanan. Coba unggah ulang.");
  if (!meta.appProperties || meta.appProperties.medcoelKey !== rec.getString("uploadKey")) {
    fail("File ini bukan hasil sesi unggah yang dibuka web. Coba unggah ulang.");
  }
  const rules = rulesFor(app, rec.getString("kind"));
  const size = parseInt(meta.size, 10) || 0;
  if (size <= 0 || size > rules.maxBytes) fail("Ukuran file di luar batas. Kecilkan filenya lalu coba lagi.");
  const real = drive.sniff(drive.headBytes(app, driveFileId, 16));
  if (rules.mimes.indexOf(real) < 0) {
    fail(
      rec.getString("kind") === "submission_pdf"
        ? "Isi file ini bukan PDF, walaupun namanya berakhiran .pdf. Ekspor ulang sebagai PDF lalu unggah lagi."
        : "Isi file ini bukan foto JPG, PNG, atau WebP. Ambil tangkapan layar ulang lalu unggah lagi.",
    );
  }
  rec.set("driveFileId", driveFileId);
  rec.set("size", size);
  rec.set("mime", real);
  rec.set("status", "ready");
  app.save(rec);
  return rec;
}

// Mode lokal: file dikirim ke server sebagai multipart.
function completeLocal(app, rec, file) {
  if (!file) throw new BadRequestError("File tidak ikut terkirim. Pilih ulang filenya.");
  const rules = rulesFor(app, rec.getString("kind"));
  if (file.size > rules.maxBytes) throw new BadRequestError("Ukuran file di luar batas.");
  // Jenis file dicek dari isinya, bukan dari nama atau jenis yang dikirim browser.
  let real = "";
  try {
    const rc = file.reader.open();
    try { real = drive.sniff(toBytes(rc, 16)); } finally { rc.close(); }
  } catch (err) {
    console.log("storage: gagal membaca awal file", err);
  }
  if (rules.mimes.indexOf(real) < 0) {
    rec.set("status", "deleted");
    app.save(rec);
    throw new BadRequestError(
      rec.getString("kind") === "submission_pdf"
        ? "Isi file ini bukan PDF, walaupun namanya berakhiran .pdf. Ekspor ulang sebagai PDF lalu unggah lagi."
        : "Isi file ini bukan foto JPG, PNG, atau WebP. Ambil tangkapan layar ulang lalu unggah lagi.",
    );
  }
  rec.set("mime", real);
  rec.set("localFile", file);
  rec.set("size", file.size);
  rec.set("status", "ready");
  try {
    app.save(rec);
  } catch (err) {
    // Validasi mime PocketBase memeriksa isi file, bukan hanya ekstensinya.
    rec.set("status", "deleted");
    rec.set("localFile", null);
    try { app.save(rec); } catch (_) {}
    throw new BadRequestError(
      rec.getString("kind") === "submission_pdf"
        ? "Isi file ini bukan PDF. Ekspor ulang sebagai PDF lalu unggah lagi."
        : "Isi file ini bukan foto JPG, PNG, atau WebP.",
    );
  }
  return rec;
}

// Menghapus atau mengarsipkan file (pengajuan kedaluwarsa/dibatalkan).
function discard(app, rec, policy, archiveFolder) {
  const st = rec.getString("storage");
  if (st === "drive" && rec.getString("driveFileId")) {
    if (policy === "archive") {
      if (drive.configured() && drive.moveTo(app, rec.getString("driveFileId"), archiveFolder || ["arsip"])) {
        rec.set("status", "archived");
        app.save(rec);
        return;
      }
    }
    if (drive.configured()) drive.remove(app, rec.getString("driveFileId"));
  }
  if (st === "local" && policy === "archive") {
    rec.set("status", "archived");
    app.save(rec);
    return;
  }
  rec.set("localFile", null);
  rec.set("status", "deleted");
  app.save(rec);
}

// Tautan untuk admin/agen. Drive: halaman lihat di Drive admin (hanya bisa
// dibuka akun yang punya akses folder). Lokal: tautan file berumur pendek.
function linkFor(app, rec, authRecord) {
  if (rec.getString("storage") === "drive" && rec.getString("driveFileId")) {
    return { url: drive.viewLink(rec.getString("driveFileId")), driveFileId: rec.getString("driveFileId") };
  }
  const name = rec.getString("localFile");
  if (!name) return { url: "" };
  let token = "";
  try { token = authRecord.newFileToken(); } catch (_) {}
  const base = (app.settings().meta.appURL || "").replace(/\/+$/, "");
  return {
    url: base + "/api/files/stored_files/" + rec.id + "/" + name + (token ? "?token=" + token : ""),
    local: true,
  };
}

function summary(app, rec) {
  return {
    id: rec.id,
    kind: rec.getString("kind"),
    name: rec.getString("name"),
    size: rec.getInt("size"),
    mime: rec.getString("mime"),
    status: rec.getString("status"),
    storage: rec.getString("storage"),
    driveFileId: rec.getString("driveFileId"),
    created: rec.getString("created"),
  };
}

module.exports = { mode, init, findPending, completeDrive, completeLocal, discard, linkFor, summary, rulesFor };
