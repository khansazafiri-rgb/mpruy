// Galat tak terduga di server tidak lagi tampil sebagai "Something went wrong while processing
// your request." Pesan itu tidak memberi tahu apa pun, dan teks yang sudah ditulis rapi di kode
// (mis. kegagalan Google Drive) hanya masuk log.
//
// Yang diubah hanya dua jenis kegagalan yang sebelumnya selalu jadi pesan umum:
//   - pengecualian JavaScript biasa (Error, TypeError, ...);
//   - kegagalan jaringan ke layanan luar ($http.send: timeout, DNS, koneksi ditolak).
// Galat yang disengaja (BadRequestError, NotFoundError, ApiError, ...) dan galat yang sudah
// diterjemahkan PocketBase sendiri (validasi field, data tidak ditemukan) dibiarkan apa adanya.
//
// Pengguna biasa mendapat penjelasan singkat plus KODE; detail teknis lengkap dengan kode yang
// sama masuk log server (journalctl -u pocketbase | grep KODE). Admin langsung melihat detailnya.
routerUse((e) => {
  try {
    return e.next();
  } catch (err) {
    const v = err && err.value;
    const isGo = !!err && err.name === "GoError";
    if (isGo && (!v || typeof v.status === "number")) throw err; // galat yang disengaja
    const isNet = isGo && typeof v.op === "string" && typeof v.url === "string"; // *url.Error dari $http.send
    if (isGo && !isNet) throw err; // validasi, "no rows", dst.: biarkan PocketBase menanganinya

    const ref = $security.randomString(6).toUpperCase();
    const where = e.request.method + " " + e.request.url.path;
    const detail = isNet
      ? "Tidak tersambung ke layanan luar (" + String(v.url).replace(/[?#].*$/, "").slice(0, 80) + "): " + String(v.err || v).slice(0, 160)
      : String(err.name || "Error") + ": " + String(err.message || err).slice(0, 240);
    console.log("[galat server " + ref + "]", where, "|", detail, "|", String((err && err.stack) || "").slice(0, 600).replace(/\s+/g, " "));

    let admin = false;
    try { admin = !!e.auth && e.auth.getString("role") === "admin"; } catch (_) {}
    const msg = isNet
      ? "Server tidak bisa menghubungi layanan luar yang dibutuhkan. Coba lagi sebentar lagi; kalau tetap begini, beri tahu admin dengan kode " + ref + "."
      : "Terjadi kesalahan di server saat memproses ini. Ini masalah di server, bukan di isianmu. Coba lagi; kalau tetap begini, beri tahu admin dengan kode " + ref + ".";
    throw new ApiError(500, admin ? msg + " Detail: " + detail : msg);
  }
});
