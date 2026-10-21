// PENYIMPANAN FILE DI GOOGLE DRIVE ADMIN
//
// PDF soal dan foto bukti tidak disimpan di server web. Alurnya:
//
//   1. Browser meminta izin unggah ke server (/api/medcoel/upload/init).
//   2. Server membuka "sesi unggah" (resumable upload) di Google Drive atas nama
//      akun admin, dengan nama file, folder, dan kunci unggah yang ditentukan
//      server, lalu memberikan alamat sesi itu ke browser.
//   3. Browser mengirim isi file langsung ke Google Drive lewat alamat sesi.
//      File tidak pernah lewat memori atau disk server.
//   4. Browser melapor selesai (/api/medcoel/upload/complete). Server
//      memeriksa file di Drive: kunci unggah cocok, ukuran dalam batas, dan
//      beberapa byte pertamanya memang PDF/JPG/PNG/WebP. File yang tidak lolos
//      langsung dihapus dari Drive.
//
// Akses ke Drive memakai OAuth akun admin (refresh token), bukan akun layanan
// biasa: akun layanan umumnya tidak punya kuota penyimpanan sendiri sehingga
// unggahan ke My Drive gagal. Shared Drive juga didukung (supportsAllDrives).
//
// Variabel lingkungan (file .env server, bukan repositori):
//   GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN,
//   GDRIVE_ROOT_FOLDER_ID   folder induk MEDCOEL di Drive admin
// Panduan membuatnya ada di docs/GOOGLE_DRIVE.md.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

function configured() {
  return !!(u.env("GDRIVE_CLIENT_ID") && u.env("GDRIVE_CLIENT_SECRET") && u.env("GDRIVE_REFRESH_TOKEN") && u.env("GDRIVE_ROOT_FOLDER_ID"));
}

function accessToken(app) {
  const store = app.store();
  const cached = store.get("medcoel_gdrive_token");
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  const res = $http.send({
    url: "https://oauth2.googleapis.com/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "client_id=" + encodeURIComponent(u.env("GDRIVE_CLIENT_ID")) +
      "&client_secret=" + encodeURIComponent(u.env("GDRIVE_CLIENT_SECRET")) +
      "&refresh_token=" + encodeURIComponent(u.env("GDRIVE_REFRESH_TOKEN")) +
      "&grant_type=refresh_token",
    timeout: 20,
  });
  if (res.statusCode !== 200 || !res.json || !res.json.access_token) {
    console.log("drive: gagal mengambil access token", res.statusCode, toString(res.body));
    throw new Error("Penyimpanan Google Drive tidak bisa diakses. Coba lagi nanti atau hubungi admin.");
  }
  const token = res.json.access_token;
  store.set("medcoel_gdrive_token", { token: token, exp: Date.now() + (res.json.expires_in || 3000) * 1000 });
  return token;
}

function call(app, method, url, bodyObj, extraHeaders) {
  const headers = Object.assign({ Authorization: "Bearer " + accessToken(app) }, extraHeaders || {});
  const opt = { url: url, method: method, headers: headers, timeout: 30 };
  if (bodyObj !== undefined && bodyObj !== null) {
    headers["Content-Type"] = "application/json; charset=UTF-8";
    opt.body = JSON.stringify(bodyObj);
  }
  return $http.send(opt);
}

function q(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Mencari atau membuat folder bertingkat di bawah GDRIVE_ROOT_FOLDER_ID.
// parts: ["pengajuan", "Anatomi", "MC-123"]
function ensureFolder(app, parts) {
  const store = app.store();
  let parent = u.env("GDRIVE_ROOT_FOLDER_ID");
  let pathKey = "";
  for (const raw of parts) {
    const name = String(raw).replace(/[\/\\]/g, "-").slice(0, 100) || "-";
    pathKey += "/" + name;
    const cacheKey = "medcoel_gdrive_folder:" + pathKey;
    const hit = store.get(cacheKey);
    if (hit) { parent = hit; continue; }
    const query =
      "name = '" + q(name) + "' and '" + q(parent) + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const res = call(app, "GET", API + "/files?q=" + encodeURIComponent(query) + "&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true");
    let id = res.json && res.json.files && res.json.files.length ? res.json.files[0].id : "";
    if (!id) {
      const created = call(app, "POST", API + "/files?supportsAllDrives=true&fields=id", {
        name: name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parent],
      });
      if (created.statusCode >= 300 || !created.json || !created.json.id) {
        console.log("drive: gagal membuat folder", created.statusCode, toString(created.body));
        throw new Error("Folder penyimpanan di Google Drive tidak bisa dibuat.");
      }
      id = created.json.id;
    }
    store.set(cacheKey, id);
    parent = id;
  }
  return parent;
}

// Membuka sesi unggah. Mengembalikan alamat sesi untuk browser.
// origin: header Origin dari browser, supaya Google mengizinkan CORS.
function startUpload(app, opts) {
  const folderId = ensureFolder(app, opts.folder);
  const headers = {
    "X-Upload-Content-Type": opts.mime,
    "X-Upload-Content-Length": String(opts.size),
  };
  if (opts.origin) headers.Origin = opts.origin;
  const res = call(
    app,
    "POST",
    UPLOAD + "/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,mimeType",
    {
      name: opts.name,
      parents: [folderId],
      mimeType: opts.mime,
      appProperties: { medcoelKey: opts.uploadKey },
    },
    headers,
  );
  const loc = (res.headers && (res.headers.Location || res.headers.location)) || [];
  const url = Array.isArray(loc) ? loc[0] : loc;
  if (res.statusCode !== 200 || !url) {
    console.log("drive: gagal membuka sesi unggah", res.statusCode, toString(res.body));
    throw new Error("Sesi unggah ke Google Drive gagal dibuka. Coba lagi sebentar lagi.");
  }
  return url;
}

function getMeta(app, fileId) {
  const res = call(app, "GET", API + "/files/" + encodeURIComponent(fileId) + "?supportsAllDrives=true&fields=id,name,size,mimeType,parents,appProperties,webViewLink,trashed");
  if (res.statusCode !== 200) return null;
  return res.json;
}

// Beberapa byte pertama isi file, sebagai array angka.
function headBytes(app, fileId, n) {
  const res = $http.send({
    url: API + "/files/" + encodeURIComponent(fileId) + "?alt=media&supportsAllDrives=true",
    method: "GET",
    headers: { Authorization: "Bearer " + accessToken(app), Range: "bytes=0-" + ((n || 16) - 1) },
    timeout: 30,
  });
  if (res.statusCode !== 200 && res.statusCode !== 206) return [];
  return res.body || [];
}

function remove(app, fileId) {
  try {
    const res = call(app, "DELETE", API + "/files/" + encodeURIComponent(fileId) + "?supportsAllDrives=true");
    return res.statusCode === 204 || res.statusCode === 200 || res.statusCode === 404;
  } catch (err) {
    console.log("drive: gagal menghapus", fileId, err);
    return false;
  }
}

function moveTo(app, fileId, folderParts) {
  try {
    const meta = getMeta(app, fileId);
    if (!meta) return false;
    const target = ensureFolder(app, folderParts);
    const removeParents = (meta.parents || []).join(",");
    const res = call(
      app,
      "PATCH",
      API + "/files/" + encodeURIComponent(fileId) + "?supportsAllDrives=true&addParents=" + encodeURIComponent(target) +
        (removeParents ? "&removeParents=" + encodeURIComponent(removeParents) : ""),
      {},
    );
    return res.statusCode === 200;
  } catch (err) {
    console.log("drive: gagal memindahkan", fileId, err);
    return false;
  }
}

function viewLink(fileId) {
  return "https://drive.google.com/file/d/" + fileId + "/view";
}

// Pengenal jenis file dari byte pertamanya.
function sniff(bytes) {
  const b = bytes || [];
  const s = (from, len) => String.fromCharCode.apply(null, b.slice(from, from + len));
  if (b.length >= 5 && s(0, 5) === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && s(1, 3) === "PNG") return "image/png";
  if (b.length >= 12 && s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "image/webp";
  return "";
}

module.exports = { configured, ensureFolder, startUpload, getMeta, headBytes, remove, moveTo, viewLink, sniff };
