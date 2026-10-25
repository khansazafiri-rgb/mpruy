/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const cases = app.findCollectionByNameOrId("sim_cases");
  cases.fields.add(new JSONField({ name: "english", maxSize: 600000 }));
  app.save(cases);
}, (app) => {
  const cases = app.findCollectionByNameOrId("sim_cases");
  cases.fields.removeByName("english");
  app.save(cases);
});
