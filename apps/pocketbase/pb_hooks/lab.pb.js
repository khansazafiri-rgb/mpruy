/// <reference path="../pb_data/types.d.ts" />
routerAdd('GET', '/api/medcoel/lab/objects', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); u.requireUser(e);
  const page = Math.min(10000, Math.max(1, parseInt(u.query(e, 'page'), 10) || 1));
  return e.json(200, lab.browse(e.app, u.query(e, 'q'), u.query(e, 'domain'), page));
});
routerAdd('GET', '/api/medcoel/lab/objects/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const user = u.requireUser(e);
  return e.json(200, lab.detail(e.app, e.request.pathValue('key'), user));
});
routerAdd('GET', '/api/medcoel/lab/pathways', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); u.requireUser(e);
  const page = Math.min(10000, Math.max(1, parseInt(u.query(e, 'page'), 10) || 1));
  const rows = e.app.findRecordsByFilter('lab_pathways', "status = 'published'", 'title,id', 25, (page - 1) * 24);
  return e.json(200, { items: rows.slice(0, 24).map(lab.card), hasMore: rows.length > 24, page });
});
routerAdd('GET', '/api/medcoel/lab/pathways/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); u.requireUser(e);
  return e.json(200, lab.pathOut(e.app, lab.find(e.app, 'pathways', e.request.pathValue('key'), true)));
});
routerAdd('POST', '/api/medcoel/lab/questions/{id}/answer', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); u.requireUser(e);
  return e.json(200, lab.answer(e.app, e.request.pathValue('id'), u.body(e)));
}, $apis.bodyLimit(16384));
// Bridge to the existing runner, grading, history and campus visibility rules.
routerAdd('POST', '/api/medcoel/lab/objects/{key}/practice', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const att = require(`${__hooks}/lib/attempts.js`); const user = u.requireUser(e);
  const object = lab.detail(e.app, e.request.pathValue('key'), user); const id = u.body(e).question;
  if (!object.legacyQuestions.some((q) => q.id === id)) throw new NotFoundError('Soal tidak tersedia.');
  const q = e.app.findRecordById('questions', id);
  const r = att.create(e.app, user, { kind: 'practice', mode: 'learning', subject: q.getString('subject'), title: 'Lab · ' + object.title, settings: { labObject: object.id, count: 1, mode: 'learning' }, ids: [id], timerMinutes: 0 });
  return e.json(200, { id: r.id });
}, $apis.bodyLimit(16384));
routerAdd('GET', '/api/medcoel/admin/lab/{kind}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); u.requireAdmin(e);
  const kind = e.request.pathValue('kind'); const page = Math.min(10000, Math.max(1, parseInt(u.query(e, 'page'), 10) || 1));
  const rows = e.app.findRecordsByFilter(lab.collection(kind), 'id != ""', '-updated,id', 51, (page - 1) * 50);
  return e.json(200, { items: rows.slice(0, 50).map((r) => lab.adminOut(e.app, kind, r)), hasMore: rows.length > 50, page });
});
routerAdd('POST', '/api/medcoel/admin/lab/{kind}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); u.requireAdmin(e);
  return e.json(200, lab.save(e.app, e.request.pathValue('kind'), '', u.body(e)));
}, $apis.bodyLimit(131072));
routerAdd('PUT', '/api/medcoel/admin/lab/{kind}/{id}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); u.requireAdmin(e);
  return e.json(200, lab.save(e.app, e.request.pathValue('kind'), e.request.pathValue('id'), u.body(e)));
}, $apis.bodyLimit(131072));
routerAdd('POST', '/api/medcoel/admin/lab/{kind}/{id}/publish', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const admin = u.requireAdmin(e);
  return e.json(200, lab.publish(e.app, e.request.pathValue('kind'), e.request.pathValue('id'), u.body(e), admin));
}, $apis.bodyLimit(16384));
routerAdd('POST', '/api/medcoel/admin/lab-demo', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labDemo.js`).create(e.app));
}, $apis.bodyLimit(16384));
