// Aktivitas siswa: daftar halaman yang BOLEH dicatat, validasi masukan, dan ringkasan untuk dashboard admin.
// Fungsi di sini murni (tanpa PocketBase) supaya bisa dites; akses database ada di activity.pb.js.
//
// PRIVASI: yang dicatat hanya pola halaman dari daftar di bawah. Alamat asli, ID, query, dan isi tidak pernah
// disimpan. Daftar ini harus sama dengan apps/web/src/lib/activityMap.mjs (tes menjaganya).

const SECTIONS = {
  beranda: "Beranda",
  soal: "Latihan soal",
  materi: "Materi & flashcard",
  drilling: "Kampusmu",
  simulasi: "Simulasi Dokter",
  lab: "MEDCOEL Lab",
  anatomi: "Anatomi 3D & 4D",
  progres: "Progres & peringkat",
  akun: "Akun & bantuan",
};

const PAGES = [
  ["/beranda", "beranda", "Beranda"],
  ["/mata-kuliah", "soal", "Daftar mata kuliah"],
  ["/mata-kuliah/:slug", "soal", "Halaman mata kuliah"],
  ["/kerjakan/:id", "soal", "Mengerjakan soal"],
  ["/tutorial/latihan-soal", "soal", "Tutorial latihan soal"],
  ["/mata-kuliah/:slug/materi/:chapterId", "materi", "Materi BAB"],
  ["/mata-kuliah/:slug/flashcard/:chapterId", "materi", "Flashcard BAB"],
  ["/drilling", "drilling", "Kampusmu (daftar)"],
  ["/drilling/:slug", "drilling", "Kampusmu per mata kuliah"],
  ["/drilling/materi/:id", "drilling", "Materi kampus"],
  ["/simulasi-dokter", "simulasi", "Simulasi Dokter"],
  ["/lab", "lab", "MEDCOEL Lab"],
  ["/lab/objek/:slug", "lab", "Lab: objek"],
  ["/lab/jalur/:slug", "lab", "Lab: jalur belajar"],
  ["/lab/modul/:key", "lab", "Lab: modul"],
  ["/lab/sistem/:track", "lab", "Lab: jalur sistem tubuh"],
  ["/lab/keterampilan/:track", "lab", "Lab: jalur keterampilan klinis"],
  ["/lab/ekg", "lab", "Lab: EKG skematik"],
  ["/anatomy", "anatomi", "Anatomi: ringkasan"],
  ["/anatomy/library", "anatomi", "Anatomi: pustaka"],
  ["/anatomy/structure/:id", "anatomi", "Anatomi: halaman struktur"],
  ["/anatomy/region/:id", "anatomi", "Anatomi: per regio"],
  ["/anatomy/system/:id", "anatomi", "Anatomi: per sistem"],
  ["/anatomy/study", "anatomi", "Anatomi: kuis 3D"],
  ["/anatomy/explore", "anatomi", "Atlas 3D"],
  ["/anatomy/live", "anatomi", "Live 4D Lab"],
  ["/riwayat", "progres", "Riwayat"],
  ["/progres", "progres", "Progres"],
  ["/leaderboard", "progres", "Leaderboard"],
  ["/jadwal", "progres", "Pusat ujian"],
  ["/jadwal/:exam/rencana", "progres", "Rencana belajar per ujian"],
  ["/rencana-belajar", "progres", "Belajar hari ini"],
  ["/profil", "akun", "Profil"],
  ["/notifikasi", "akun", "Notifikasi"],
  ["/chat-admin", "akun", "Chat admin"],
];

const KEYS = {};
PAGES.forEach(([key, section, label]) => { KEYS[key] = { section, label }; });

const MAX_SECONDS_PER_REPORT = 300; // satu laporan = paling banyak 5 menit aktif
const MAX_EVENTS_PER_REQUEST = 10;
const RETENTION_DAYS = 180;
const RANGES = [1, 7, 30, 90];
const WIB_HOURS = 7; // hari dihitung menurut WIB

/** "YYYY-MM-DD" menurut WIB. */
function dayOf(date, offsetHours) {
  const t = (date instanceof Date ? date : new Date(date)).getTime() + (offsetHours === undefined ? WIB_HOURS : offsetHours) * 3600000;
  return new Date(t).toISOString().slice(0, 10);
}

const toInt = (v, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};

/** Satu laporan -> { key, views, seconds } yang bersih, atau null bila tidak boleh/tidak berguna. */
function cleanEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const key = typeof raw.key === "string" ? raw.key : "";
  if (!Object.prototype.hasOwnProperty.call(KEYS, key)) return null; // hanya pola dari daftar
  const views = toInt(raw.views, 1);
  const seconds = toInt(raw.seconds, MAX_SECONDS_PER_REPORT);
  if (!views && !seconds) return null;
  return { key, views, seconds };
}

/** Isi permintaan ({key,...} atau {events:[...]}) -> daftar laporan bersih (maks. 10). */
function cleanBody(body) {
  const list = body && Array.isArray(body.events) ? body.events : [body];
  const out = [];
  for (const raw of list.slice(0, MAX_EVENTS_PER_REQUEST)) {
    const ev = cleanEvent(raw);
    if (ev) out.push(ev);
  }
  return out;
}

function rangeOf(raw) {
  const n = Number(raw);
  return RANGES.indexOf(n) >= 0 ? n : 7;
}

/** Hari pertama (WIB) dari rentang yang berakhir hari ini. */
function fromDay(days, now) {
  return dayOf(new Date((now || new Date()).getTime() - (days - 1) * 86400000));
}

function listDays(days, now) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayOf(new Date((now || new Date()).getTime() - i * 86400000)));
  return out;
}

/**
 * Ringkasan untuk dashboard.
 *   keyRows  : [{ key, views, seconds, students }]   per halaman
 *   pairRows : [{ key, user }]                        pasangan (halaman, siswa) yang berbeda
 *   dayRows  : [{ day, views, seconds, students }]    per hari
 *   total    : jumlah siswa berbeda pada rentang
 */
function summarize({ days, now, keyRows, pairRows, dayRows, total, firstDay }) {
  const pageList = [];
  const sec = {};
  Object.keys(SECTIONS).forEach((s) => { sec[s] = { section: s, label: SECTIONS[s], views: 0, seconds: 0, users: new Set() }; });
  const usersOfKey = {};
  (pairRows || []).forEach((p) => { (usersOfKey[p.key] = usersOfKey[p.key] || new Set()).add(p.user); });
  let totalViews = 0, totalSeconds = 0;
  (keyRows || []).forEach((r) => {
    const meta = KEYS[r.key];
    if (!meta) return; // pola lama yang sudah tidak dikenal
    totalViews += r.views; totalSeconds += r.seconds;
    pageList.push({ key: r.key, label: meta.label, section: meta.section, sectionLabel: SECTIONS[meta.section], views: r.views, students: r.students, minutes: Math.round(r.seconds / 60) });
    const s = sec[meta.section];
    s.views += r.views; s.seconds += r.seconds;
    (usersOfKey[r.key] || new Set()).forEach((u) => s.users.add(u));
  });
  const sections = Object.values(sec).filter((s) => s.views > 0 || s.seconds > 0)
    .map((s) => ({ section: s.section, label: s.label, views: s.views, students: s.users.size, minutes: Math.round(s.seconds / 60), share: totalViews ? Math.round((s.views / totalViews) * 1000) / 10 : 0 }))
    .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label));
  pageList.sort((a, b) => b.views - a.views || a.label.localeCompare(b.label));
  const byDay = {};
  (dayRows || []).forEach((r) => { byDay[r.day] = r; });
  const daily = listDays(days, now).map((d) => ({ day: d, views: byDay[d] ? byDay[d].views : 0, students: byDay[d] ? byDay[d].students : 0, minutes: byDay[d] ? Math.round(byDay[d].seconds / 60) : 0 }));
  return {
    days, from: fromDay(days, now), to: dayOf(now || new Date()), trackingStartedOn: firstDay || "",
    totals: { views: totalViews, students: total || 0, minutes: Math.round(totalSeconds / 60) },
    sections, pages: pageList.slice(0, 20), daily,
  };
}

// ---- bagian yang memakai PocketBase (hanya dipanggil dari handler) -----------------------------------------------

/**
 * Tambahkan satu laporan bersih ke baris (siswa, hari, halaman). Upsert ATOMIK di database (satu pernyataan SQL),
 * jadi laporan yang datang bersamaan tidak saling menimpa dan tidak ada baris kembar.
 */
function bump(app, userId, day, ev) {
  try {
    const id = $security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789");
    const now = new Date().toISOString().replace("T", " ");
    app.db().newQuery(
      "INSERT INTO activity_daily (id, user, day, `key`, views, seconds, created, updated) VALUES ({:id}, {:u}, {:d}, {:k}, {:v}, {:s}, {:now}, {:now}) " +
      "ON CONFLICT (user, day, `key`) DO UPDATE SET views = MIN(views + {:v}, 100000), seconds = MIN(seconds + {:s}, 86400), updated = {:now}"
    ).bind({ id, u: userId, d: day, k: ev.key, v: ev.views, s: ev.seconds, now }).execute();
    return true;
  } catch (err) { console.log("activity bump", err); return false; }
}

/** Ambil angka dari database dan susun ringkasannya. */
function report(app, days) {
  const now = new Date();
  const from = fromDay(days, now);
  const q = (sql, shape) => { const rows = arrayOf(new DynamicModel(shape)); app.db().newQuery(sql).bind({ from }).all(rows); return rows; };
  const keyRows = q("SELECT key AS key, COALESCE(SUM(views), 0) AS views, COALESCE(SUM(seconds), 0) AS seconds, COUNT(DISTINCT user) AS students FROM activity_daily WHERE day >= {:from} GROUP BY key", { key: "", views: 0, seconds: 0, students: 0 });
  const pairRows = q("SELECT DISTINCT key AS key, user AS user FROM activity_daily WHERE day >= {:from}", { key: "", user: "" });
  const dayRows = q("SELECT day AS day, COALESCE(SUM(views), 0) AS views, COALESCE(SUM(seconds), 0) AS seconds, COUNT(DISTINCT user) AS students FROM activity_daily WHERE day >= {:from} GROUP BY day", { day: "", views: 0, seconds: 0, students: 0 });
  const totalRow = q("SELECT COUNT(DISTINCT user) AS n FROM activity_daily WHERE day >= {:from}", { n: 0 });
  const firstRow = q("SELECT COALESCE(MIN(day), '') AS d FROM activity_daily WHERE {:from} <> ''", { d: "" });
  return summarize({
    days, now, firstDay: firstRow.length ? firstRow[0].d : "",
    keyRows: keyRows.map((r) => ({ key: r.key, views: r.views, seconds: r.seconds, students: r.students })),
    pairRows: pairRows.map((r) => ({ key: r.key, user: r.user })),
    dayRows: dayRows.map((r) => ({ day: r.day, views: r.views, seconds: r.seconds, students: r.students })),
    total: totalRow.length ? totalRow[0].n : 0,
  });
}

/** Hapus baris yang lebih tua dari masa simpan. */
function purge(app, keepDays) {
  const cutoff = dayOf(new Date(Date.now() - (keepDays || RETENTION_DAYS) * 86400000));
  app.db().newQuery("DELETE FROM activity_daily WHERE day < {:d}").bind({ d: cutoff }).execute();
}

module.exports = { bump, report, purge, SECTIONS, PAGES, KEYS, MAX_SECONDS_PER_REPORT, MAX_EVENTS_PER_REQUEST, RETENTION_DAYS, RANGES, dayOf, cleanEvent, cleanBody, rangeOf, fromDay, listDays, summarize };
