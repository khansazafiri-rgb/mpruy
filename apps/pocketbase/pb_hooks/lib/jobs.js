// Isi tugas terjadwal (cron.pb.js).

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const storage = require(HOOKS + "/lib/storage.js");
const subs = require(HOOKS + "/lib/submissions.js");

function cleanup(app) {
  const now = u.pbDate(new Date());
  const dayAgo = u.pbDate(new Date(Date.now() - 24 * 3600 * 1000));
  const out = { drafts: 0, pendingFiles: 0, draftSubmissions: 0, expiredSubmissions: 0, codes: 0 };

  // Pendaftaran sementara yang lewat 24 jam, beserta foto buktinya.
  app.findRecordsByFilter("signup_drafts", "expiresAt < {:now}", "", 500, 0, { now: now }).forEach((d) => {
    app.findRecordsByFilter("stored_files", "draftId = {:d} && owner = ''", "", 0, 0, { d: d.id }).forEach((f) => {
      try { storage.discard(app, f, "delete"); } catch (err) { console.log("cleanup file", err); }
    });
    app.delete(d);
    out.drafts++;
  });

  // Unggahan yang dibuka tapi tidak pernah selesai.
  app.findRecordsByFilter("stored_files", "status = 'pending' && created < {:t}", "", 500, 0, { t: dayAgo }).forEach((f) => {
    try { storage.discard(app, f, "delete"); out.pendingFiles++; } catch (err) { console.log("cleanup pending", err); }
  });

  // Draf pengajuan yang tidak pernah dikirim.
  app.findRecordsByFilter("submissions", "status = 'draft' && updated < {:t}", "", 200, 0, { t: dayAgo }).forEach((s) => {
    subs.files(app, s).forEach((f) => { try { storage.discard(app, f, "delete"); } catch (_) {} });
    app.delete(s);
    out.draftSubmissions++;
  });

  // Pengajuan yang tidak dikonfirmasi lewat WhatsApp dalam batas waktu.
  const days = u.intSetting(app, "confirmDays", 3);
  const limit = u.pbDate(new Date(Date.now() - days * 86400000));
  app.findRecordsByFilter("submissions", "status = 'menunggu_konfirmasi' && submittedAt < {:t}", "", 200, 0, { t: limit }).forEach((s) => {
    try { subs.setStatus(app, s, "kedaluwarsa", "", "system"); out.expiredSubmissions++; } catch (err) { console.log("expire", err); }
  });

  // Kode email lama.
  app.findRecordsByFilter("email_codes", "created < {:t}", "", 1000, 0, { t: dayAgo }).forEach((c) => { app.delete(c); out.codes++; });
  return out;
}

function examReminders(app) {
  const now = new Date();
  const horizon = u.pbDate(new Date(now.getTime() + 62 * 86400000));
  const list = app.findRecordsByFilter("exam_schedules", "examAt >= {:now} && examAt <= {:h}", "examAt", 0, 0, { now: u.pbDate(now), h: horizon });
  const perUser = {};
  let notified = 0;
  list.forEach((x) => {
    const tz = x.getString("timezone") || "WIB";
    const examDate = u.localDate(u.parseDate(x.getString("examAt")), tz);
    const left = u.daysBetween(u.localDate(now, tz), examDate);
    const want = u.recJson(x, "reminderDays", [7, 3, 1]) || [];
    const sent = u.recJson(x, "remindersSent", []) || [];
    if (want.indexOf(left) < 0 || sent.indexOf(left) >= 0) return;
    let subjectName = "";
    try { subjectName = app.findRecordById("subjects", x.getString("subject")).getString("name"); } catch (_) {}
    const when = left === 0 ? "hari ini" : left === 1 ? "besok" : left + " hari lagi";
    const title = x.getString("title") + " " + subjectName + " " + when;
    u.notify(app, x.getString("user"), "exam_reminder", title, "Jadwal: " + formatLocal(x.getString("examAt"), tz) + ". Semangat belajarnya!", "/jadwal");
    sent.push(left);
    x.set("remindersSent", sent);
    app.save(x);
    notified++;
    (perUser[x.getString("user")] = perUser[x.getString("user")] || []).push({ title: title, when: formatLocal(x.getString("examAt"), tz) });
  });

  let emails = 0;
  Object.keys(perUser).forEach((uid) => {
    let usr;
    try { usr = app.findRecordById("users", uid); } catch (_) { return; }
    if (usr.getBool("disabled") || usr.getString("deletedAt")) return;
    const items = perUser[uid];
    const html = u.mailLayout(
      "Pengingat ujian",
      "<p>Halo " + u.escapeHtml(usr.getString("name").split(" ")[0]) + ", ini ujian yang sudah dekat:</p><ul>" +
        items.map((it) => "<li><b>" + u.escapeHtml(it.title) + "</b><br>" + u.escapeHtml(it.when) + "</li>").join("") +
        '</ul><p><a href="' + (app.settings().meta.appURL || "https://medcoel.com") + '/beranda" style="color:#007060;font-weight:600">Buka MEDCOEL untuk latihan</a></p>',
    );
    if (u.sendMail(app, usr.email(), "Pengingat ujian MEDCOEL", html)) emails++;
  });
  return { notified: notified, emails: emails };
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatLocal(pbDateStr, tz) {
  const d = u.parseDate(pbDateStr);
  if (!d) return "";
  const off = u.TZ_OFFSET[tz] || 7;
  const t = new Date(d.getTime() + off * 3600000);
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return t.getUTCDate() + " " + BULAN[t.getUTCMonth()] + " " + t.getUTCFullYear() + ", " + pad(t.getUTCHours()) + "." + pad(t.getUTCMinutes()) + " " + tz;
}

module.exports = { cleanup, examReminders, formatLocal };
