// Read-only source packages for contextual translation outside the website.
// No user profiles, attempts, uploaded files, credentials or server settings.
routerAdd("GET", "/api/medcoel/admin/english/source", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const service = require(`${__hooks}/lib/explanationService.js`);
  u.requireAdmin(e);
  const kind = u.query(e, "kind") || "question";
  if (["question", "case", "catalog"].indexOf(kind) < 0) throw new BadRequestError("Jenis materi tidak dikenal.");
  const after = u.query(e, "after") || "";
  if (after && !/^[a-z0-9]{15}$/.test(after)) throw new BadRequestError("Penanda halaman tidak sah.");
  const collection = kind === "case" ? "sim_cases" : kind === "catalog" ? "chapters" : "questions";
  const rows = e.app.findRecordsByFilter(collection, "id > {:after}", "id", 51, 0, { after: after });
  const records = rows.slice(0, 50);
  const items = records.map((rec) => {
    if (kind === "catalog") return { id: rec.id, subject: rec.getString("subject"), title: rec.getString("title") };
    const d = service.view(e.app, rec, kind === "case" ? "case" : undefined);
    return {
      id: rec.id, sourceHash: d.sourceHash, revision: d.revision, status: d.status,
      subjectName: d.subjectName, source: d.question,
      glossary: d.glossary, protectedTerms: d.protectedTerms, segments: d.segments,
    };
  });
  const result = { kind: kind, items: items, next: rows.length > 50 ? records[records.length - 1].id : "" };
  if (kind === "catalog" && !after) {
    result.subjects = e.app.findRecordsByFilter("subjects", "id != ''", "id", 0, 0).map((s) => ({
      id: s.id, name: s.getString("name"), slug: s.getString("slug"), description: s.getString("description"),
    }));
  }
  return e.json(200, result);
});
