// Only published, visible questions explicitly shared with the signed-in campus.
// No request parameter can select another campus or expose pending uploads.
routerAdd("GET", "/api/medcoel/campus-materials", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const user = u.requireUser(e);
  const campus = user.getString("campus");
  if (!campus) return e.json(200, { campusName: "", items: [] });
  const pool = learn.pool(e.app, user, { campusOnly: true });
  const counts = {};
  pool.forEach((q) => { counts[q.chapter] = (counts[q.chapter] || 0) + 1; });
  const subjects = {};
  e.app.findRecordsByFilter("chapters", "hidden = false", "title", 0, 0).forEach((c) => {
    if (!counts[c.id]) return;
    const sid = c.getString("subject");
    let s = subjects[sid];
    if (!s) {
      const rec = e.app.findRecordById("subjects", sid);
      s = subjects[sid] = { id: sid, name: rec.getString("name"), slug: rec.getString("slug"), questionCount: 0, chapters: [] };
    }
    s.chapters.push({ id: c.id, title: c.getString("title"), total: counts[c.id] });
    s.questionCount += counts[c.id];
  });
  const byName = require(`${__hooks}/lib/catalogOrder.js`).byName;
  const items = Object.keys(subjects).map((id) => subjects[id]).sort(byName);
  items.forEach((s) => s.chapters.sort(byName));
  return e.json(200, { campusName: e.app.findRecordById("campuses", campus).getString("name"), items: items });
});
