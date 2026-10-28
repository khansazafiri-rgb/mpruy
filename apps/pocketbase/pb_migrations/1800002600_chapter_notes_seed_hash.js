/// <reference path="../pb_data/types.d.ts" />

// Catatan materi yang berasal dari apps/pocketbase/content/materi disimpan bersama sidik jarinya
// (seedHash, SHA-256 isi saat dimasukkan). Dengan itu pemasangan ulang saat PocketBase dijalankan
// (pb_hooks/materi.pb.js) bisa memperbarui catatan yang belum pernah disunting admin, dan melewati
// yang sudah disunting.
migrate((app) => {
  const notes = app.findCollectionByNameOrId("chapter_notes");
  if (!notes.fields.getByName("seedHash")) {
    notes.fields.add(new TextField({ name: "seedHash", max: 80 }));
    app.save(notes);
  }
}, (app) => {
  const notes = app.findCollectionByNameOrId("chapter_notes");
  notes.fields.removeByName("seedHash");
  app.save(notes);
});
