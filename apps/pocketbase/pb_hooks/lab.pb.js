/// <reference path="../pb_data/types.d.ts" />
routerAdd('GET', '/api/medcoel/lab/objects', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const user = u.requireUser(e);
  const page = Math.min(10000, Math.max(1, parseInt(u.query(e, 'page'), 10) || 1));
  return e.json(200, lab.browse(e.app, u.query(e, 'q'), u.query(e, 'domain'), page, { demo: user.getString('role') === 'admin' && u.query(e, 'demo') === '1' }));
});
routerAdd('GET', '/api/medcoel/lab/objects/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const user = u.requireUser(e);
  return e.json(200, lab.detail(e.app, e.request.pathValue('key'), user));
});
routerAdd('GET', '/api/medcoel/lab/pathways', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const user = u.requireUser(e);
  const page = Math.min(10000, Math.max(1, parseInt(u.query(e, 'page'), 10) || 1));
  const rows = e.app.findRecordsByFilter('lab_pathways', "status = 'published'", 'title,id', 25, (page - 1) * 24);
  const prog = require(`${__hooks}/lib/labProgress.js`);
  const showDemo = user.getString('role') === 'admin' && u.query(e, 'demo') === '1';
  return e.json(200, { items: rows.slice(0, 24).filter((p) => showDemo || !lab.isDemoSlug(p.getString('slug'))).map((p) => ({ ...lab.card(p), ...prog.brief(e.app, user, p) })), hasMore: rows.length > 24, page });
});
routerAdd('GET', '/api/medcoel/lab/pathways/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const user = u.requireUser(e);
  const p = lab.find(e.app, 'pathways', e.request.pathValue('key'), true);
  const out = lab.pathOut(e.app, p); const st = require(`${__hooks}/lib/labProgress.js`).state(e.app, user, p);
  return e.json(200, { ...out, progress: { completed: st.completed, lastObject: st.lastObject } });
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
routerAdd('GET', '/api/medcoel/lab/overview', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const user = u.requireUser(e);
  return e.json(200, require(`${__hooks}/lib/labProgress.js`).overview(e.app, user));
});
routerAdd('POST', '/api/medcoel/lab/progress', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const user = u.requireUser(e);
  return e.json(200, require(`${__hooks}/lib/labProgress.js`).mark(e.app, user, u.body(e)));
}, $apis.bodyLimit(4096));
// Content packs, bulk validation and publishing. All publishing goes through lab.publishSet (single canonical rule set).
routerAdd('GET', '/api/medcoel/admin/lab/{kind}/{id}/preview', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const user = u.requireAdmin(e);
  if (e.request.pathValue('kind') !== 'objects') throw new NotFoundError('Pratinjau hanya untuk materi.');
  return e.json(200, lab.detail(e.app, e.request.pathValue('id'), user, { preview: true }));
});
routerAdd('GET', '/api/medcoel/admin/lab-packs', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, { items: require(`${__hooks}/lib/labPacks.js`).list(e.app) });
});
routerAdd('POST', '/api/medcoel/admin/lab-packs', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labPacks.js`).save(e.app, '', u.body(e)));
}, $apis.bodyLimit(16384));
routerAdd('GET', '/api/medcoel/admin/lab-packs/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labPacks.js`).detail(e.app, e.request.pathValue('key')));
});
routerAdd('PUT', '/api/medcoel/admin/lab-packs/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const packs = require(`${__hooks}/lib/labPacks.js`); u.requireAdmin(e);
  return e.json(200, packs.save(e.app, packs.find(e.app, e.request.pathValue('key')).id, u.body(e)));
}, $apis.bodyLimit(16384));
routerAdd('POST', '/api/medcoel/admin/lab-packs/{key}/validate', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labPacks.js`).validate(e.app, e.request.pathValue('key')));
});
routerAdd('POST', '/api/medcoel/admin/lab-packs/{key}/publish', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const admin = u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labPacks.js`).publish(e.app, e.request.pathValue('key'), u.body(e), admin));
}, $apis.bodyLimit(65536));
// Selected records: dryRun=true only validates ("review"), otherwise publishes in dependency order after human confirmation.
routerAdd('POST', '/api/medcoel/admin/lab-bulk/publish', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const lab = require(`${__hooks}/lib/lab.js`); const admin = u.requireAdmin(e); const b = u.body(e);
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 500) throw new BadRequestError('Pilih 1–500 item.');
  const items = b.items.map((i) => { if (!lab.KINDS.includes(i.kind)) throw new BadRequestError('Jenis konten tidak dikenal.'); return { kind: i.kind, id: String(i.id), revision: i.revision }; });
  return e.json(200, lab.publishSet(e.app, items, admin, { confirmReviewed: b.confirmReviewed === true, dryRun: b.dryRun === true }));
}, $apis.bodyLimit(131072));
