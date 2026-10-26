/// <reference path="../pb_data/types.d.ts" />
// Independent of legacy Lab endpoints; no existing content is rewritten.
routerAdd('POST', '/api/medcoel/admin/lab-authoring/preview', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).preview(e.app, u.body(e)));
}, $apis.bodyLimit(1048576));
routerAdd('POST', '/api/medcoel/admin/lab-authoring/apply', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).apply(e.app, u.body(e)));
}, $apis.bodyLimit(1048576));
routerAdd('GET', '/api/medcoel/admin/lab-authoring/records', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, { items: require(`${__hooks}/lib/labAuthoring.js`).list(e.app, u.query(e, 'kind')) });
});
routerAdd('GET', '/api/medcoel/admin/lab-authoring/export/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).exportModule(e.app, e.request.pathValue('key')));
});
routerAdd('POST', '/api/medcoel/admin/lab-authoring/publish/{kind}/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const admin = u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).publish(e.app, e.request.pathValue('kind'), e.request.pathValue('key'), u.body(e), admin));
}, $apis.bodyLimit(16384));
routerAdd('GET', '/api/medcoel/admin/lab-authoring/media', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, { items: require(`${__hooks}/lib/labAuthoring.js`).listMedia(e.app) });
});
routerAdd('POST', '/api/medcoel/admin/lab-authoring/media', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).saveMedia(e.app, e));
}, $apis.bodyLimit(22 * 1024 * 1024));
routerAdd('POST', '/api/medcoel/admin/lab-authoring/media/{key}/publish', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).publishMedia(e.app, e.request.pathValue('key'), u.body(e)));
}, $apis.bodyLimit(16384));
routerAdd('GET', '/api/medcoel/admin/lab-authoring/modules/{key}/preview', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireAdmin(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).studentModule(e.app, e.request.pathValue('key'), true));
});
routerAdd('GET', '/api/medcoel/lab/catalog', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireUser(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).studentCatalog(e.app));
});
routerAdd('GET', '/api/medcoel/lab/modules/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireUser(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).studentModule(e.app, e.request.pathValue('key'), false));
});
routerAdd('POST', '/api/medcoel/lab/modules/{key}/questions/{bank}/{qid}/answer', (e) => {
  const u = require(`${__hooks}/lib/util.js`); u.requireUser(e);
  return e.json(200, require(`${__hooks}/lib/labAuthoring.js`).answer(e.app, e.request.pathValue('key'), e.request.pathValue('bank'), e.request.pathValue('qid'), u.body(e)));
}, $apis.bodyLimit(16384));
