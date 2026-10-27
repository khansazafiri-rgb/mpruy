// PENCAPAIAN DAN JULUKAN
//
// Dihitung langsung dari data yang sudah ada (jawaban, percobaan, Simulasi
// Dokter, aktivitas harian, pengajuan soal), jadi tidak ada tabel yang bisa
// tidak sinkron dan aktivitas lama ikut terhitung. Tidak mengubah poin atau
// peringkat leaderboard.
//
// evaluate() murni (bisa dites tanpa PocketBase); collect() membaca database.

// Tangga pencapaian: [target, nama]. Nama tier tertinggi yang tercapai menjadi kandidat julukan.
const LADDERS = [
  { key: "soal", label: "Soal dikerjakan", stat: "answered", unit: "soal", tiers: [[10, "Langkah pertama"], [100, "Rajin latihan"], [500, "Pejuang soal"], [1000, "Seribu soal"], [5000, "Penghuni bank soal"]] },
  { key: "benar", label: "Benar di percobaan pertama", stat: "correct", unit: "jawaban", tiers: [[50, "Mulai tepat"], [250, "Tajam"], [1000, "Seribu benar"]] },
  { key: "streak", label: "Hari aktif berturut-turut", stat: "bestStreak", unit: "hari", tiers: [[3, "Konsisten"], [7, "Seminggu penuh"], [30, "Sebulan tanpa absen"]] },
  { key: "dokter", label: "Kasus Simulasi Dokter", stat: "simCases", unit: "kasus", tiers: [[1, "Pasien pertama"], [10, "Dokter jaga"], [50, "Dokter IGD"]] },
  { key: "diagnosis", label: "Diagnosis tepat di Simulasi Dokter", stat: "simDxOk", unit: "kasus", tiers: [[5, "Diagnostik"], [25, "Ahli diagnosis"]] },
  { key: "cbt", label: "Simulasi CBT dan paket selesai", stat: "exams", unit: "sesi", tiers: [[1, "Uji coba pertama"], [10, "Siap ujian"], [50, "Veteran CBT"]] },
  { key: "kontributor", label: "Pengajuan soal diterima", stat: "contributions", unit: "pengajuan", tiers: [[1, "Kontributor"], [5, "Kontributor setia"]] },
];

// Tingkat penguasaan satu mata kuliah. cover = soal berbeda yang dikerjakan / soal tayang;
// acc = benar di percobaan pertama / soal bernilai di percobaan pertama.
const MASTERY = [
  { level: "master", name: (s) => "Master of " + s, cover: 0.8, acc: 0.8, minTotal: 30 },
  { level: "ahli", name: (s) => "Ahli " + s, cover: 0.5, acc: 0.7, minTotal: 30 },
  { level: "penjelajah", name: (s) => "Penjelajah " + s, cover: 0.25, acc: 0, minTotal: 20 },
];
// Prioritas julukan utama. Tangga umum bernilai 10–150 (makin tinggi tier dan makin penuh
// tangganya); Penjelajah setara tangga menengah, Ahli dan Master selalu di atasnya.
const RANK = { master: 600, ahli: 300, penjelajah: 60 };
const ladderRank = (level, size) => Math.round((100 * level) / size) + level * 10;

function num(v) { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; }

function ladderOut(def, value) {
  const tiers = def.tiers.map(([goal, name]) => ({ goal, name, earned: value >= goal }));
  const earned = tiers.filter((t) => t.earned);
  const next = tiers.find((t) => !t.earned) || null;
  return { key: def.key, label: def.label, unit: def.unit, value, tiers, level: earned.length, best: earned.length ? earned[earned.length - 1] : null, next: next ? { goal: next.goal, name: next.name } : null };
}

/**
 * stats: { answered, correct, bestStreak, simCases, simDxOk, exams, contributions,
 *          subjects: { [id]: { answered, correct, scored } } }
 * subjects: [{ id, name, total }] (soal tayang per mata kuliah)
 */
function evaluate(stats, subjects) {
  const st = stats || {};
  const ladders = LADDERS.map((def) => ladderOut(def, num(st[def.stat])));
  const perSubject = (subjects || []).map((s) => {
    const a = (st.subjects || {})[s.id] || {};
    const total = num(s.total);
    const answered = num(a.answered);
    const cover = total ? Math.min(1, answered / total) : 0;
    const acc = num(a.scored) ? num(a.correct) / num(a.scored) : 0;
    const hit = MASTERY.find((m) => total >= m.minTotal && cover >= m.cover && acc >= m.acc) || null;
    const nextLevel = hit ? MASTERY[MASTERY.indexOf(hit) - 1] || null : MASTERY[MASTERY.length - 1];
    return {
      id: s.id, name: s.name, total, answered,
      coverage: Math.round(cover * 100), accuracy: Math.round(acc * 100),
      level: hit ? hit.level : null, title: hit ? hit.name(s.name) : "",
      next: nextLevel && total >= nextLevel.minTotal ? { level: nextLevel.level, title: nextLevel.name(s.name), coverage: Math.round(nextLevel.cover * 100), accuracy: Math.round(nextLevel.acc * 100) } : null,
      score: hit ? RANK[hit.level] + Math.round(cover * 100) + Math.round(acc * 100) : 0,
    };
  });
  const candidates = [];
  ladders.forEach((l, i) => { if (l.best) candidates.push({ title: l.best.name, kind: l.key, rank: ladderRank(l.level, LADDERS[i].tiers.length) }); });
  perSubject.forEach((s) => { if (s.level) candidates.push({ title: s.title, kind: "mapel", rank: s.score }); });
  candidates.sort((a, b) => b.rank - a.rank);
  return {
    title: candidates.length ? { title: candidates[0].title, kind: candidates[0].kind } : null,
    titles: candidates.map((c) => c.title),
    earned: ladders.reduce((n, l) => n + l.level, 0) + perSubject.filter((s) => s.level).length,
    ladders,
    subjects: perSubject.filter((s) => s.total > 0).sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.name.localeCompare(b.name)).map(({ score, ...rest }) => rest),
  };
}

// Rantai hari aktif terpanjang dari daftar tanggal "YYYY-MM-DD" (urutan bebas).
function longestStreak(dates) {
  const days = [...new Set((dates || []).filter(Boolean))].map((d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000).sort((a, b) => a - b);
  let best = 0; let run = 0; let prev = null;
  for (const d of days) { run = prev !== null && d - prev === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}

// ---------------------------------------------------------------------------
// Membaca database (hanya di PocketBase)
// ---------------------------------------------------------------------------

function inList(ids, params) {
  return ids.map((id, i) => { params["u" + i] = id; return "{:u" + i + "}"; }).join(",");
}
function rows(app, model, sql, params) {
  const out = arrayOf(new DynamicModel(model));
  app.db().newQuery(sql).bind(params).all(out);
  return out;
}

// Statistik pencapaian untuk banyak pengguna sekaligus (leaderboard memakai ini untuk 50 baris).
// withStreak: rantai hari aktif dihitung hanya bila diminta (perlu membaca semua tanggal).
function collect(app, userIds, opts) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  const out = {};
  ids.forEach((id) => { out[id] = { answered: 0, correct: 0, bestStreak: 0, simCases: 0, simDxOk: 0, exams: 0, contributions: 0, subjects: {} }; });
  if (!ids.length) return out;
  const p = {}; const list = inList(ids, p);
  rows(app, { user: "", subject: "", answered: 0, correct: 0, scored: 0 },
    "SELECT user, subject, COUNT(DISTINCT question) AS answered, " +
      "SUM(CASE WHEN firstTry = TRUE AND scored = TRUE AND correct = TRUE THEN 1 ELSE 0 END) AS correct, " +
      "SUM(CASE WHEN firstTry = TRUE AND scored = TRUE THEN 1 ELSE 0 END) AS scored " +
      "FROM answers WHERE user IN (" + list + ") GROUP BY user, subject", p,
  ).forEach((r) => {
    const s = out[r.user]; if (!s) return;
    s.subjects[r.subject] = { answered: r.answered, correct: r.correct, scored: r.scored };
    s.answered += r.answered; s.correct += r.correct;
  });
  rows(app, { user: "", cases: 0, dxok: 0 },
    "SELECT user, COUNT(DISTINCT caseKey) AS cases, COUNT(DISTINCT CASE WHEN dxOk = TRUE THEN caseKey END) AS dxok FROM doctor_sims WHERE user IN (" + list + ") GROUP BY user", p,
  ).forEach((r) => { if (out[r.user]) { out[r.user].simCases = r.cases; out[r.user].simDxOk = r.dxok; } });
  rows(app, { user: "", n: 0 },
    "SELECT user, COUNT(*) AS n FROM attempts WHERE status = 'finished' AND kind IN ('simulation', 'package') AND user IN (" + list + ") GROUP BY user", p,
  ).forEach((r) => { if (out[r.user]) out[r.user].exams = r.n; });
  rows(app, { user: "", n: 0 },
    "SELECT user, COUNT(*) AS n FROM submissions WHERE status = 'selesai' AND user IN (" + list + ") GROUP BY user", p,
  ).forEach((r) => { if (out[r.user]) out[r.user].contributions = r.n; });
  if (opts && opts.withStreak) {
    const dates = {};
    rows(app, { user: "", date: "" }, "SELECT user, date FROM daily_activity WHERE answered > 0 AND user IN (" + list + ")", p)
      .forEach((r) => { (dates[r.user] = dates[r.user] || []).push(r.date); });
    ids.forEach((id) => { out[id].bestStreak = longestStreak(dates[id]); });
  }
  return out;
}

// Soal tayang per mata kuliah yang tidak disembunyikan (dasar cakupan penguasaan).
function subjectTotals(app) {
  const totals = {};
  rows(app, { subject: "", n: 0 }, "SELECT subject, COUNT(*) AS n FROM questions WHERE status = 'published' GROUP BY subject", {})
    .forEach((r) => { totals[r.subject] = r.n; });
  return app.findRecordsByFilter("subjects", "hidden = false", "order,name", 500, 0)
    .map((s) => ({ id: s.id, name: s.getString("name"), total: totals[s.id] || 0 }));
}

module.exports = { LADDERS, MASTERY, evaluate, longestStreak, collect, subjectTotals };
