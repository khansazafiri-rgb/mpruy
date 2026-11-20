/// <reference path="../pb_data/types.d.ts" />
// Studio API. No datasets, publishing or release activation. Learner progress is the only thing written.
routerAdd('GET', '/api/medcoel/studios', (e) => {
  return require(__hooks + '/lib/studios.js').list(e);
});
routerAdd('GET', '/api/medcoel/studios/{id}/launch', (e) => {
  return require(__hooks + '/lib/studios.js').launch(e, e.request.pathValue('id'));
});
// Authorised studio asset delivery: session cookie + signed clearance + attested installation, re-checked per request.
routerAdd('GET', '/api/medcoel/studio-assets/{id}/{release}/{path...}', (e) => {
  return require(__hooks + '/lib/studio-runtime.js').asset(e, e.request.pathValue('id'), e.request.pathValue('release'), e.request.pathValue('path'));
});
// Server-side Challenge grading for a launched studio session (answer keys never leave the server).
routerAdd('POST', '/api/medcoel/studio-assets/{id}/{release}/_challenge/{action}', (e) => {
  return require(__hooks + '/lib/studio-runtime.js').challenge(e, e.request.pathValue('id'), e.request.pathValue('release'), e.request.pathValue('action'));
});
// Guided progress for a launched Guided session (client-reported, labelled selfReported).
routerAdd('POST', '/api/medcoel/studio-assets/{id}/{release}/_progress/guided', (e) => {
  return require(__hooks + '/lib/studio-runtime.js').guidedProgress(e, e.request.pathValue('id'), e.request.pathValue('release'));
});
// The learner's own progress per studio (re-entry) and the admin aggregate (per studio/campus, no answers).
routerAdd('GET', '/api/medcoel/studios/{id}/progress', (e) => {
  return require(__hooks + '/lib/studio-progress.js').mine(e, e.request.pathValue('id'));
});
routerAdd('GET', '/api/medcoel/admin/studio-progress', (e) => {
  return require(__hooks + '/lib/studio-progress.js').adminReport(e);
});
