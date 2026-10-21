/// <reference path="../pb_data/types.d.ts" />

// NOMOR WHATSAPP ADMIN
//
// Dipakai tombol "Konfirmasi lewat WhatsApp", "Hubungi admin lewat WhatsApp",
// dan kiriman lebih dari 5 PDF. Sebelumnya kosong, sehingga tautannya membuka
// WhatsApp tanpa tujuan. Hanya diisi bila masih kosong: nomor yang sudah
// diubah admin di Dashboard Admin > Pengaturan tidak ditimpa.

migrate(
  (app) => {
    const list = app.findRecordsByFilter("app_settings", "id != ''", "created", 1, 0);
    if (!list.length) return;
    const s = list[0];
    if (!String(s.getString("adminWhatsapp") || "").trim()) {
      s.set("adminWhatsapp", "6285144902681");
      app.save(s);
    }
  },
  (app) => {
    const list = app.findRecordsByFilter("app_settings", "adminWhatsapp = '6285144902681'", "created", 1, 0);
    if (!list.length) return;
    list[0].set("adminWhatsapp", "");
    app.save(list[0]);
  },
);
