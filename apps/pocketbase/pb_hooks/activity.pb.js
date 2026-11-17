/// <reference path="../pb_data/types.d.ts" />

// AKTIVITAS SISWA
//
// POST /api/medcoel/activity        siswa yang masuk melaporkan halaman yang dibuka (pola halaman dari daftar tetap,
//                                   jumlah buka, detik aktif). Aktivitas admin/agen tidak dicatat.
// GET  /api/medcoel/admin/activity  ringkasan untuk dashboard admin: ?days=1|7|30|90 (bawaan 7).
//
// Hanya agregat harian; tidak ada ID, query, atau isi yang disimpan. Lihat docs/ACTIVITY_TRACKING.md.

routerAdd("POST", "/api/medcoel/activity", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const act = require(`${__hooks}/lib/activity.js`);
  const user = u.requireUser(e);
  const role = u.roleOf(user);
  if (role !== "user") return e.json(200, { ok: true, recorded: 0 }); // admin dan agen tidak dilacak
  const events = act.cleanBody(u.body(e));
  const day = act.dayOf(new Date());
  let recorded = 0;
  events.forEach((ev) => { if (act.bump(e.app, user.id, day, ev)) recorded++; });
  return e.json(200, { ok: true, recorded });
});

routerAdd("GET", "/api/medcoel/admin/activity", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const act = require(`${__hooks}/lib/activity.js`);
  u.requireAdmin(e);
  e.response.header().set("Cache-Control", "no-store");
  return e.json(200, act.report(e.app, act.rangeOf(u.query(e, "days"))));
});
