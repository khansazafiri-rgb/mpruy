/// <reference path="../pb_data/types.d.ts" />

// TUGAS TERJADWAL (waktu cron dalam UTC)
//
// - Tiap jam      : hapus pendaftaran sementara > 24 jam, unggahan yang
//                   tidak selesai, draf pengajuan lama, kode email lama, dan
//                   pengajuan yang tidak dikonfirmasi tepat waktu.
// - 00:07 UTC     : pengingat ujian (07:07 WIB / 08:07 WITA / 09:07 WIT).
//                   Satu email per pengguna per hari, karena layanan email
//                   gratis punya batas kirim harian.

cronAdd("medcoelCleanup", "17 * * * *", () => {
  const job = require(`${__hooks}/lib/jobs.js`);
  job.cleanup($app);
});

cronAdd("medcoelExamReminders", "7 0 * * *", () => {
  const job = require(`${__hooks}/lib/jobs.js`);
  job.examReminders($app);
});

// Saat jadwal ujian diubah, pengingat dihitung ulang dari awal.
onRecordUpdateRequest((e) => {
  const before = e.record.original();
  if (before.getString("examAt") !== e.record.getString("examAt")) e.record.set("remindersSent", []);
  const u = require(`${__hooks}/lib/util.js`);
  const days = u.recJson(e.record, "reminderDays", []);
  if (Array.isArray(days)) {
    e.record.set(
      "reminderDays",
      days.map((x) => parseInt(x, 10)).filter((x) => x >= 0 && x <= 60).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a).slice(0, 6),
    );
  }
  e.next();
}, "exam_schedules");

// Pengingat bawaan bila pengguna tidak mengisi sendiri; nilai dibatasi 0-60 hari.
onRecordCreateRequest((e) => {
  const u = require(`${__hooks}/lib/util.js`);
  let days = u.recJson(e.record, "reminderDays", null);
  if (!Array.isArray(days) || !days.length) days = u.jsonSetting(e.app, "reminderDaysDefault", [7, 3, 1]);
  e.record.set("reminderDays", cleanDays(days));
  e.record.set("remindersSent", []);
  e.next();

  function cleanDays(list) {
    return list.map((x) => parseInt(x, 10)).filter((x) => x >= 0 && x <= 60).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a).slice(0, 6);
  }
}, "exam_schedules");

// Endpoint uji untuk admin: menjalankan tugas sekarang juga.
routerAdd("POST", "/api/medcoel/admin/run-job/{name}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const job = require(`${__hooks}/lib/jobs.js`);
  u.requireAdmin(e);
  const name = e.request.pathValue("name");
  if (name === "cleanup") return e.json(200, job.cleanup(e.app));
  if (name === "reminders") return e.json(200, job.examReminders(e.app));
  throw new NotFoundError("Tugas tidak dikenal.");
});
