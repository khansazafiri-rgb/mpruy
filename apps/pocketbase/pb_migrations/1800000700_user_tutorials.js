/// <reference path="../pb_data/types.d.ts" />

// STATUS TUTORIAL PENGGUNA
//
// users.tutorials menyimpan status dua tutorial setelah daftar:
// { fk: "done" | "skipped", dokter: "done" | "skipped" }. Kosong berarti belum
// pernah dipilih, jadi pemilih tutorial muncul saat pertama masuk. Diubah
// lewat POST /api/medcoel/me/tutorial (pb_hooks/tutorial.pb.js).

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("tutorials")) {
      users.fields.add(new JSONField({ name: "tutorials", maxSize: 2000 }));
      app.save(users);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (users.fields.getByName("tutorials")) {
      users.fields.removeByName("tutorials");
      app.save(users);
    }
  },
);
