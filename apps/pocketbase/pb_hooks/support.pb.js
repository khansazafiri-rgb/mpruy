routerAdd("GET", "/api/medcoel/support/messages", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  return e.json(200, require(`${__hooks}/lib/support.js`).messages(e.app, user.id, u.query(e, "before")));
});
routerAdd("POST", "/api/medcoel/support/messages", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  return e.json(200, { message: require(`${__hooks}/lib/support.js`).send(e.app, user, user.id, u.body(e), false) });
});
routerAdd("GET", "/api/medcoel/admin/support", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  // One row per conversation, most recently active first; no private profile fields.
  const rows = arrayOf(new DynamicModel({ userId: "", name: "", text: "", category: "", senderRole: "", created: "" }));
  e.app.db().newQuery("SELECT m.user AS userId, u.name AS name, m.text AS text, m.category AS category, m.senderRole AS senderRole, m.created AS created FROM support_messages m JOIN users u ON u.id = m.user WHERE m.id = (SELECT x.id FROM support_messages x WHERE x.user = m.user ORDER BY x.created DESC, x.id DESC LIMIT 1) ORDER BY m.created DESC, m.id DESC LIMIT 200").all(rows);
  return e.json(200, { items: rows });
});
routerAdd("GET", "/api/medcoel/admin/support/{userId}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  const id = e.request.pathValue("userId");
  try { e.app.findRecordById("users", id); } catch (_) { throw new NotFoundError("Pengguna tidak ditemukan."); }
  return e.json(200, require(`${__hooks}/lib/support.js`).messages(e.app, id, u.query(e, "before")));
});
routerAdd("POST", "/api/medcoel/admin/support/{userId}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const admin = u.requireAdmin(e);
  const id = e.request.pathValue("userId");
  try { e.app.findRecordById("users", id); } catch (_) { throw new NotFoundError("Pengguna tidak ditemukan."); }
  return e.json(200, { message: require(`${__hooks}/lib/support.js`).send(e.app, admin, id, u.body(e), true) });
});
