/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const questions = app.findCollectionByNameOrId("questions");
  questions.fields.add(new JSONField({ name: "explanationEnglish", maxSize: 600000 }));
  app.save(questions);
  const settings = app.findCollectionByNameOrId("app_settings");
  settings.fields.add(new TextField({ name: "translationTerms", max: 6000 }));
  app.save(settings);
}, (app) => {
  const questions = app.findCollectionByNameOrId("questions");
  questions.fields.removeByName("explanationEnglish");
  app.save(questions);
  const settings = app.findCollectionByNameOrId("app_settings");
  settings.fields.removeByName("translationTerms");
  app.save(settings);
});
