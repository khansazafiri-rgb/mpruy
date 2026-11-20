/// <reference path="../pb_data/types.d.ts" />
// Read-only Studio API. No datasets, publishing or release activation.
routerAdd('GET', '/api/medcoel/studios', (e) => {
  return require(__hooks + '/lib/studios.js').list(e);
});
routerAdd('GET', '/api/medcoel/studios/{id}/launch', (e) => {
  return require(__hooks + '/lib/studios.js').launch(e, e.request.pathValue('id'));
});
