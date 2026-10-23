// Perhitungan poin leaderboard gabungan (soal + Simulasi Dokter).

function simWeight(app) {
  const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
  const s = require(HOOKS + "/lib/util.js").settings(app);
  const v = s.getInt("pointsSimulation");
  return v >= 0 ? v : 10;
}

// Subkueri poin per pengguna. since: Date atau null. Mengembalikan teks SQL + parameter.
function pointsSql(app, since, userFilter) {
  const params = { w: simWeight(app) };
  const qWhere = ["a.points > 0"];
  const sWhere = ["1 = 1"];
  if (since) {
    const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
    params.since = require(HOOKS + "/lib/util.js").pbDate(since);
    qWhere.push("a.updated >= {:since}");
    sWhere.push("d.created >= {:since}");
  }
  if (userFilter) { params.uid = userFilter; qWhere.push("a.user = {:uid}"); sWhere.push("d.user = {:uid}"); }
  const sql =
    "SELECT a.user AS user, SUM(a.points) AS qp, 0 AS sp, COUNT(*) AS n FROM answers a WHERE " + qWhere.join(" AND ") + " GROUP BY a.user " +
    "UNION ALL " +
    "SELECT b.user AS user, 0 AS qp, SUM(CAST(ROUND(b.best * {:w} / 100.0) AS INTEGER)) AS sp, 0 AS n FROM (" +
    "SELECT d.user AS user, d.caseKey AS caseKey, MAX(d.score) AS best FROM doctor_sims d WHERE " + sWhere.join(" AND ") + " GROUP BY d.user, d.caseKey" +
    ") b GROUP BY b.user";
  return { sql: sql, params: params };
}

/** Baris peringkat (maks. 200), urut poin tertinggi. */
function rows(app, opts) {
  const p = pointsSql(app, opts.since, "");
  const where = ["usr.role = 'user'", "usr.disabled = FALSE", "usr.deletedAt = ''"];
  if (opts.campus) { where.push("usr.campus = {:campus}"); p.params.campus = opts.campus; }
  const out = arrayOf(new DynamicModel({ user: "", name: "", anon: false, campus: "", qpoints: 0, spoints: 0, points: 0, answers: 0 }));
  app.db().newQuery(
    "SELECT t.user AS user, usr.name AS name, usr.leaderboardAnonymous AS anon, usr.campus AS campus, " +
      "SUM(t.qp) AS qpoints, SUM(t.sp) AS spoints, SUM(t.qp) + SUM(t.sp) AS points, SUM(t.n) AS answers " +
      "FROM (" + p.sql + ") t JOIN users usr ON usr.id = t.user WHERE " + where.join(" AND ") +
      " GROUP BY t.user HAVING SUM(t.qp) + SUM(t.sp) > 0 ORDER BY points DESC, answers ASC LIMIT 200",
  ).bind(p.params).all(out);
  return out;
}

/** Total poin sepanjang waktu satu pengguna. */
function totalOf(app, uid) {
  const p = pointsSql(app, null, uid);
  const out = arrayOf(new DynamicModel({ points: 0 }));
  app.db().newQuery("SELECT COALESCE(SUM(t.qp) + SUM(t.sp), 0) AS points FROM (" + p.sql + ") t").bind(p.params).all(out);
  return out.length ? out[0].points : 0;
}

module.exports = { simWeight, rows, totalOf };
