/// <reference path="../pb_data/types.d.ts" />
// New endpoints are read-only, no database migration, dataset read, or release activation.
routerAdd('GET', '/api/medcoel/studios', (e) =>
  require(`${__hooks} + '/lib/studios.js').list(e)
);
routerAdd('GET', '/api/medcoel/studios/{id}/launch', (e) =>
  require(`${__hooks} + '/lib/studios.js').launch(e, e.request.pathValue('id'))
);
