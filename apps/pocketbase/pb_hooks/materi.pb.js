/// <reference path="../pb_data/types.d.ts" />

// Pasang/perbarui catatan materi dari content/materi sekali setiap PocketBase dijalankan.
//
// Dijalankan lewat cron per menit (hanya yang pertama bekerja; berikutnya langsung kembali), bukan saat
// bootstrap, karena migrasi baru baru diterapkan setelah bootstrap selesai. Jadi setelah `git pull` + restart,
// catatan baru muncul dalam waktu sekitar satu menit. Kegagalan di sini tidak menghalangi server.
cronAdd("medcoelMateriSync", "* * * * *", () => {
  if ($app.store().get("materiSynced")) return;
  $app.store().set("materiSynced", true);
  try {
    const r = require(`${__hooks}/lib/materiSync.js`).sync($app);
    if (!r.absent) console.log(`[materi] ${r.made} dibuat, ${r.updated} diperbarui, ${r.same} sudah terbaru, ${r.skipped} dilewati (disunting admin), ${r.missing} BAB tidak ditemukan.`);
  } catch (err) {
    console.log("[materi] gagal memasang catatan: " + err);
  }
});
