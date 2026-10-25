/// <reference path="../pb_data/types.d.ts" />
onRecordValidate((e) => {
  const en = require(`${__hooks}/lib/explanationEnglish.js`);
  try { en.terms(e.record.getString("translationTerms")); } catch (err) { throw new BadRequestError(err.message); }
  e.next();
}, "app_settings");

routerAdd("GET", "/api/medcoel/admin/questions/{id}/english", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const service = require(`${__hooks}/lib/explanationService.js`);
  u.requireAdmin(e);
  return e.json(200, service.view(e.app, service.load(e.app, e.request.pathValue("id"))));
});

routerAdd("POST", "/api/medcoel/admin/questions/{id}/english", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const service = require(`${__hooks}/lib/explanationService.js`);
  const admin = u.requireAdmin(e);
  const body = u.body(e);
  if (["draft", "review"].indexOf(body.action) < 0) throw new BadRequestError("Pilih simpan draf atau tayangkan hasil pemeriksaan.");
  return e.json(200, service.save(e.app, e.request.pathValue("id"), body, admin.id));
});

routerAdd("POST", "/api/medcoel/admin/questions/{id}/english/generate", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const service = require(`${__hooks}/lib/explanationService.js`);
  const admin = u.requireAdmin(e);
  return e.json(200, service.generate(e.app, e.request.pathValue("id"), u.body(e), admin.id));
});
