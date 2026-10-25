const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const u = require(HOOKS + "/lib/util.js");
const en = require(HOOKS + "/lib/explanationEnglish.js");

function question(rec) {
  return en.source({
    subject: rec.getString("subject"), chapter: rec.getString("chapter"), qtype: rec.getString("qtype"),
    stem: u.recJson(rec, "stem", ""), image: rec.getString("image"), hint: rec.getString("hint"),
    statements: u.recJson(rec, "statements", []), answer: rec.getString("answer"),
    explanation: u.recJson(rec, "explanation", ""), options: u.recJson(rec, "options", []),
    subQuestions: u.recJson(rec, "subQuestions", []),
  });
}

function configured() {
  return !!(u.env("OPENAI_API_KEY") && u.env("MEDCOEL_TRANSLATION_MODEL"));
}

function localTerms(value) {
  try { return en.terms(value || []); } catch (err) { throw new BadRequestError(err.message); }
}

function snapshot(app, rec) {
  const q = question(rec);
  const glossary = en.terms(u.settings(app).getString("translationTerms"));
  const doc = u.recJson(rec, "explanationEnglish", null);
  const sourceHash = u.hash(JSON.stringify({ version: en.VERSION, source: q, glossary: glossary }));
  const protectedTerms = en.terms(doc && doc.protectedTerms || []);
  const allTerms = glossary.concat(protectedTerms);
  const entries = doc && Array.isArray(doc.segments) ? doc.segments : [];
  const stale = !!doc && doc.sourceHash !== sourceHash;
  const errors = en.validate(q, entries, allTerms);
  return {
    q: q, glossary: glossary, allTerms: allTerms, doc: doc,
    sourceHash: sourceHash, revision: u.hash(JSON.stringify(doc)),
    protectedTerms: protectedTerms, stale: stale, errors: errors,
  };
}

function view(app, rec) {
  const s = snapshot(app, rec);
  const doc = s.doc || {};
  const entries = doc.segments || [];
  let subjectName = "";
  try { subjectName = app.findRecordById("subjects", rec.getString("subject")).getString("name"); } catch (_) {}
  return {
    sourceHash: s.sourceHash, revision: s.revision,
    status: s.stale ? "stale" : doc.status || "empty",
    protectedTerms: s.protectedTerms, glossary: s.glossary,
    generatorConfigured: configured(), notes: doc.notes || [], errors: s.errors,
    reviewedAt: doc.reviewedAt || "", subjectName: subjectName, question: s.q,
    segments: en.segments(s.q).map((part) => {
      const saved = entries.find((entry) => entry.id === part.id);
      return { id: part.id, label: part.label, source: part.source, text: saved ? saved.text : "", keep: en.requiredTerms(part.source, s.allTerms) };
    }),
  };
}

function load(app, id) {
  try { return app.findRecordById("questions", id); } catch (_) { throw new NotFoundError("Soal tidak ditemukan."); }
}

function assertCurrent(s, body) {
  if (body.sourceHash !== s.sourceHash || body.revision !== s.revision) {
    throw new BadRequestError("Soal, kamus, atau draf sudah berubah. Tutup lalu buka kembali pembahasan Inggris sebelum menyimpan.");
  }
}

function save(app, id, body, adminId, generated) {
  app.runInTransaction((tx) => {
    const rec = load(tx, id);
    const s = snapshot(tx, rec);
    assertCurrent(s, body);
    const protectedTerms = localTerms(body.protectedTerms);
    if (!Array.isArray(body.segments)) throw new BadRequestError("Daftar pembahasan belum diisi.");
    const expected = en.segments(s.q);
    const seen = {};
    body.segments.forEach((entry) => {
      if (!entry || typeof entry.id !== "string" || typeof entry.text !== "string" ||
        !expected.some((p) => p.id === entry.id) || Object.prototype.hasOwnProperty.call(seen, entry.id) || entry.text.length > 40000) {
        throw new BadRequestError("Bagian pembahasan tidak sah, berulang, atau terlalu panjang.");
      }
      seen[entry.id] = entry.text;
    });
    const entries = expected.map((p) => ({ id: p.id, text: seen[p.id] || "" }));
    if (JSON.stringify(entries).length > 450000) throw new BadRequestError("Total pembahasan terlalu panjang.");
    const errors = en.validate(s.q, entries, s.glossary.concat(protectedTerms));
    const reviewed = !generated && body.action === "review";
    if (reviewed && body.reviewConfirmed !== true) throw new BadRequestError("Periksa makna, negasi, istilah, angka, dan alasan tiap pilihan sebelum menayangkan.");
    if (reviewed && errors.length) throw new BadRequestError(errors.slice(0, 6).join(" "));
    rec.set("explanationEnglish", {
      version: en.VERSION, sourceHash: s.sourceHash,
      status: reviewed ? "reviewed" : "draft", protectedTerms: protectedTerms, segments: entries,
      notes: generated ? generated.notes.filter((x) => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 1000)) : [],
      reviewedBy: reviewed ? adminId : "", reviewedAt: reviewed ? u.pbDate(new Date()) : "",
    });
    tx.save(rec);
  });
  return view(app, load(app, id));
}

function generate(app, id, body, adminId) {
  if (!configured()) throw new BadRequestError("Bantuan draf belum diatur. Isi OPENAI_API_KEY dan MEDCOEL_TRANSLATION_MODEL di server, atau tulis pembahasan Inggris manual.");
  if (body.sendConfirmed !== true) throw new BadRequestError("Setujui pengiriman isi soal dan pembahasannya ke OpenAI untuk membuat draf.");
  const s = snapshot(app, load(app, id));
  assertCurrent(s, body);
  const protectedTerms = localTerms(body.protectedTerms);
  if (!en.segments(s.q).length) throw new BadRequestError("Isi pembahasan sumber dulu.");
  const req = en.request(s.q, s.glossary.concat(protectedTerms), u.env("MEDCOEL_TRANSLATION_MODEL"));
  if (JSON.stringify(req).length > 100000) throw new BadRequestError("Soal terlalu panjang untuk bantuan draf. Isi terjemahan manual.");
  // Limit spending from accidental repeated clicks. Failed calls count too.
  const key = "explanation_generator:" + adminId;
  const bucket = app.store().get(key);
  const now = Date.now();
  const count = bucket && bucket.until > now ? bucket.count : 0;
  if (count >= 10) throw new BadRequestError("Batas bantuan draf 10 soal per jam tercapai. Lanjutkan manual atau coba nanti.");
  app.store().set(key, { count: count + 1, until: bucket && bucket.until > now ? bucket.until : now + 3600000 });
  let res;
  try {
    res = $http.send({
      url: "https://api.openai.com/v1/responses", method: "POST", timeout: 60,
      headers: { Authorization: "Bearer " + u.env("OPENAI_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch (_) { throw new BadRequestError("Layanan draf belum merespons. Draf sebelumnya tetap tersimpan; coba lagi nanti."); }
  if (res.statusCode !== 200) throw new BadRequestError("Bantuan draf gagal (" + res.statusCode + "). Periksa konfigurasi dan kuota layanan, atau isi manual.");
  let draft;
  try { draft = en.parseResponse(res.json); } catch (err) { throw new BadRequestError(err.message); }
  // Re-read and compare after the network call; never overwrite newer edits.
  return save(app, id, Object.assign({}, body, { segments: draft.segments, action: "draft" }), adminId, draft);
}

function published(app, rec) {
  const s = snapshot(app, rec);
  if (!s.doc || s.doc.version !== en.VERSION || s.doc.status !== "reviewed" || s.stale || s.errors.length) return null;
  return en.apply(s.q, s.doc.segments);
}

module.exports = { load, view, save, generate, published };
