/// <reference path="../pb_data/types.d.ts" />
// Pendaftaran yang bisa diatur admin (Pengaturan > Pendaftaran & profil):
// - signupFields: kolom data tambahan (mis. akun TikTok), disimpan di users.extra.
// - signupProofs: langkah bukti komunitas (WhatsApp, Instagram, atau langkah baru).
// - signupBuiltin: WhatsApp dan semester wajib, opsional, atau disembunyikan.
migrate((app) => {
  const settings = app.findCollectionByNameOrId("app_settings");
  settings.fields.add(new JSONField({ name: "signupFields", maxSize: 50000 }));
  settings.fields.add(new JSONField({ name: "signupProofs", maxSize: 20000 }));
  settings.fields.add(new JSONField({ name: "signupBuiltin", maxSize: 2000 }));
  app.save(settings);
  app.findRecordsByFilter("app_settings", "id != ''", "", 0, 0).forEach((r) => {
    r.set("signupFields", []);
    r.set("signupProofs", [
      { key: "whatsapp", title: "Gabung komunitas WhatsApp", short: "WhatsApp", description: "Dapat kabar paling cepat saat soal baru tayang.\nDiskusi soal dan pembahasan bareng mahasiswa kedokteran dari kampus lain.\nInfo jadwal, tips belajar, dan pengumuman penting dari admin.", url: "", buttonLabel: "Buka komunitas WhatsApp", question: "Sudah bergabung ke komunitas WhatsApp?", active: true, required: true },
      { key: "instagram", title: "Ikuti Instagram MEDCOEL", short: "Instagram", description: "Instagram MEDCOEL berisi rangkuman materi, info fitur baru, dan kabar komunitas. Ikuti supaya tidak ketinggalan.", url: "", buttonLabel: "Buka Instagram", question: "Sudah mengikuti Instagram MEDCOEL?", active: true, required: true },
    ]);
    r.set("signupBuiltin", { whatsapp: "required", semester: "required" });
    app.save(r);
  });

  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new JSONField({ name: "extra", maxSize: 20000 }));
  // Data tambahan hanya lewat /api/medcoel/me/extra supaya selalu divalidasi.
  if (users.updateRule && users.updateRule.indexOf("@request.body.extra:isset") < 0) users.updateRule += " && @request.body.extra:isset = false";
  app.save(users);

  const drafts = app.findCollectionByNameOrId("signup_drafts");
  drafts.fields.getByName("profile").maxSize = 30000;
  drafts.fields.add(new JSONField({ name: "proofs", maxSize: 5000 }));
  app.save(drafts);

  const files = app.findCollectionByNameOrId("stored_files");
  const fk = files.fields.getByName("kind");
  if (fk.values.indexOf("proof_other") < 0) fk.values = fk.values.concat(["proof_other"]);
  files.fields.add(new TextField({ name: "proofKey", max: 40 }));
  app.save(files);

  const proofs = app.findCollectionByNameOrId("community_proofs");
  const pk = proofs.fields.getByName("kind");
  if (pk.values.indexOf("other") < 0) pk.values = pk.values.concat(["other"]);
  proofs.fields.add(new TextField({ name: "proofKey", max: 40 }));
  app.save(proofs);
}, (app) => {
  // Data pengguna dipertahankan bila rilis dibatalkan.
});
