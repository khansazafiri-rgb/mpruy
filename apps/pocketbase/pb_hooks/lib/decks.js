// Drilling materi: berkas materi (slide + penjelasan) per mata kuliah, General atau khusus kampus.
// Format isi ada di lib/slides.js. Hak lihat sama dengan soal Drilling: scope "all" = semua pengguna,
// scope "campus" = hanya pengguna yang kampusnya ada di `campuses`.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const slides = require(HOOKS + "/lib/slides.js");

const MAX_JSON = 3800000; // di bawah batas bidang JSON (4 MB)

function metaOf(rec, names) {
  const campuses = rec.getStringSlice("campuses");
  const out = {
    id: rec.id,
    subject: rec.getString("subject"),
    title: rec.getString("title"),
    description: rec.getString("description"),
    language: rec.getString("language") || "id",
    scope: rec.getString("scope") || "all",
    status: rec.getString("status"),
    slideCount: rec.getInt("slideCount"),
    cover: rec.getString("cover"),
    sortOrder: rec.getInt("sortOrder"),
    source: rec.getString("source"),
    created: rec.getString("created"),
    updated: rec.getString("updated"),
  };
  if (names) out.campuses = campuses.map((id) => ({ id: id, name: names[id] || "" }));
  else out.campusCount = campuses.length;
  return out;
}

function campusNames(app, decks) {
  const ids = {};
  decks.forEach((d) => d.getStringSlice("campuses").forEach((id) => { ids[id] = true; }));
  const names = {};
  Object.keys(ids).forEach((id) => { try { names[id] = app.findRecordById("campuses", id).getString("name"); } catch (_) {} });
  return names;
}

/** Bolehkah pengguna ini melihat berkas materi ini (di luar pemeriksaan sakelar dan status)? */
function visibleTo(rec, user) {
  if (rec.getString("scope") !== "campus") return true;
  const campus = user ? user.getString("campus") : "";
  return !!campus && rec.getStringSlice("campuses").indexOf(campus) >= 0;
}

/** Berkas materi tayang yang terlihat pengguna, tanpa isi slide. subjectId opsional. */
function listFor(app, user, subjectId) {
  const filter = "status = 'published'" + (subjectId ? " && subject = {:s}" : "");
  const recs = app.findRecordsByFilter("drilling_decks", filter, "sortOrder,created", 0, 0, subjectId ? { s: subjectId } : {});
  return recs.filter((r) => visibleTo(r, user));
}

/** Per mata kuliah: jumlah berkas, jumlah slide, dan berapa yang khusus kampus pengguna. */
function countsFor(app, user) {
  const out = {};
  const subjects = {};
  listFor(app, user).forEach((r) => {
    const s = r.getString("subject");
    if (subjects[s] === undefined) {
      try { subjects[s] = !app.findRecordById("subjects", s).getBool("hidden"); } catch (_) { subjects[s] = false; }
    }
    if (!subjects[s]) return;
    const c = (out[s] = out[s] || { deckCount: 0, slideCount: 0, campusDeckCount: 0 });
    c.deckCount += 1;
    c.slideCount += r.getInt("slideCount");
    if (r.getString("scope") === "campus") c.campusDeckCount += 1;
  });
  return out;
}

/** Jumlah berkas materi tayang: General (`total`) dan khusus kampus pengguna (`mine`). Untuk menu Drilling. */
function status(app, user) {
  const base = "SELECT COUNT(*) AS n FROM drilling_decks d JOIN subjects s ON s.id = d.subject WHERE d.status = 'published' AND s.hidden = FALSE AND ";
  const count = (cond, params) => {
    const rows = arrayOf(new DynamicModel({ n: 0 }));
    const q = app.db().newQuery(base + cond);
    (params ? q.bind(params) : q).all(rows);
    return rows.length ? rows[0].n : 0;
  };
  const total = count("d.scope = 'all'");
  const campus = user ? user.getString("campus") : "";
  const mine = campus ? count("d.scope = 'campus' AND EXISTS (SELECT 1 FROM json_each(d.campuses) WHERE value = {:campus})", { campus: campus }) : 0;
  return { total: total, mine: mine };
}

/** Satu berkas lengkap dengan slide, untuk pembaca. */
function full(rec) {
  const out = metaOf(rec);
  const data = u.recJson(rec, "slides", []);
  out.slides = Array.isArray(data) ? data : [];
  return out;
}

/** Mata kuliah dari id atau slug; mata kuliah tersembunyi hanya terlihat admin. */
function subjectFor(app, ref, admin) {
  let s;
  try { s = app.findFirstRecordByFilter("subjects", "id = {:x} || slug = {:x}", { x: String(ref || "") }); } catch (_) { s = null; }
  if (!s || (s.getBool("hidden") && !admin)) throw new NotFoundError("Mata kuliah tidak ditemukan.");
  return s;
}

function resolveCampuses(app, list) {
  return require(HOOKS + "/lib/importer.js").resolveCampuses(app, list);
}

/** Kalimat galat untuk respons 400 saat impor diblokir: menyebut slide bermasalah dan apa yang salah. */
function blockedMessage(result) {
  const items = (result && result.items) || [];
  const first = items.slice(0, 3).map((it) => (it.index ? "Slide " + it.index + ": " : "") + (it.errors || []).join("; "));
  const more = items.length > 3 ? " (dan " + (items.length - 3) + " lagi)" : "";
  return "Materi belum bisa diimpor, tidak ada yang tersimpan. " + first.join(" | ") + more;
}

/** Masukan berkas dari badan permintaan: text (teks), deck (objek), atau slides (array). */
function inputOf(b) {
  if (b.deck !== undefined && b.deck !== null) return b.deck;
  if (b.slides !== undefined && b.slides !== null) return { title: b.title, description: b.description, language: b.language, slides: b.slides };
  return b.text !== undefined ? b.text : b.materi;
}

/**
 * Memasukkan satu berkas materi. opts:
 *   input        teks atau objek berkas (lihat slides.js)
 *   subject      id mata kuliah (wajib)
 *   scope        "all" | "campus"; campuses: id atau nama kampus
 *   title        judul bila berkas tidak menulis judul
 *   status       "published" (bawaan) | "draft"
 *   source       "admin" | "submission" | "agent"; submission: id pengajuan
 *   dryRun       hanya memeriksa
 * Berkas dengan judul, mata kuliah, dan cakupan yang sama diperbarui (bukan digandakan).
 */
function importDeck(app, opts) {
  const parsed = slides.parseDeck(opts.input, {});
  const base = { slideCount: parsed.slideCount, warnings: parsed.warnings };
  if (parsed.blocked) return Object.assign({ blocked: true, created: 0, updated: 0 }, base, { items: parsed.items });
  const deck = parsed.deck;
  // Judul: forceTitle (mis. judul PDF) > judul di JSON > opts.title > judul bawaan bertanggal.
  const forced = String(opts.forceTitle || "").trim();
  if (!forced && !deck.title && opts.titleError) {
    return Object.assign({ blocked: true, created: 0, updated: 0 }, base, { items: [{ index: 0, errors: [opts.titleError] }] });
  }
  const title = forced || String(deck.title || opts.title || "").trim() || "Materi " + u.localDate(new Date(), "WIB");
  const titleSource = forced ? opts.forceSource || "request" : deck.title ? "json" : opts.title ? "request" : "default";
  const scope = opts.scope === "campus" ? "campus" : "all";
  const campuses = scope === "campus" ? resolveCampuses(app, opts.campuses) : [];
  if (scope === "campus" && !campuses.length) throw new BadRequestError("Pilih minimal satu kampus untuk materi khusus kampus.");
  const json = JSON.stringify(deck.slides);
  if (json.length > MAX_JSON) {
    return Object.assign({ blocked: true, created: 0, updated: 0 }, base, { items: [{ index: 0, errors: ["Materi terlalu besar (" + Math.round(json.length / 1024) + " KB). Pecah menjadi beberapa berkas."] }] });
  }
  let existing = null;
  try {
    const same = app.findRecordsByFilter("drilling_decks", "subject = {:s} && title = {:t} && scope = {:c}", "", 0, 0, { s: opts.subject, t: title, c: scope });
    existing = same.filter((r) => {
      const a = r.getStringSlice("campuses").slice().sort().join(",");
      return a === campuses.slice().sort().join(",");
    })[0] || null;
  } catch (_) { existing = null; }
  const result = Object.assign({ blocked: false, title: title, titleSource: titleSource, pdf: opts.pdf, scope: scope, created: existing ? 0 : 1, updated: existing ? 1 : 0, replaced: !!existing }, base, { items: [] });
  if (opts.dryRun) return result;

  const rec = existing || new Record(app.findCollectionByNameOrId("drilling_decks"));
  rec.set("subject", opts.subject);
  rec.set("title", title.slice(0, 200));
  rec.set("description", String(deck.description || "").slice(0, 600));
  rec.set("language", deck.language || "id");
  rec.set("scope", scope);
  rec.set("campuses", campuses);
  rec.set("status", opts.status === "draft" ? "draft" : "published");
  rec.set("slideCount", deck.slides.length);
  rec.set("cover", (deck.slides.filter((s) => s.images.length)[0] || { images: [""] }).images[0]);
  rec.set("slides", deck.slides);
  rec.set("source", opts.source || "admin");
  if (opts.submission) rec.set("submission", opts.submission);
  if (!existing) rec.set("sortOrder", app.countRecords("drilling_decks", $dbx.exp("subject = {:s}", { s: opts.subject })));
  app.save(rec);
  result.id = rec.id;
  return result;
}

module.exports = { blockedMessage, subjectFor, inputOf, metaOf, campusNames, visibleTo, listFor, countsFor, status, full, importDeck };
