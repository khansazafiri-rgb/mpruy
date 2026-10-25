/// <reference path="../pb_data/types.d.ts" />
// Additive only: content packs, optional pack relation on Lab content, anatomy domain, per-user Lab progress.
// Nothing is dropped or rewritten. All new collection APIs stay locked; guarded Lab routes own access.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const rel = (name, c, max) => ({ name, type: 'relation', collectionId: c.id, maxSelect: max || 1, cascadeDelete: false });

  const packs = new Collection({
    name: 'lab_packs', type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'slug', type: 'text', required: true, max: 100, pattern: '^[a-z0-9-]+$' },
      { name: 'title', type: 'text', required: true, max: 200 },
      { name: 'version', type: 'text', max: 40 },
      { name: 'description', type: 'text', max: 1000 },
      { name: 'source', type: 'text', max: 500 },
      { name: 'licenseSummary', type: 'text', max: 1000 },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['draft', 'published', 'archived'] },
      { name: 'revision', type: 'number', onlyInt: true, min: 1 },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_lab_packs_slug ON lab_packs (slug)'],
  });
  app.save(packs);

  // Optional relation: existing records keep working without a pack.
  for (const name of ['lab_assets', 'lab_objects', 'lab_questions', 'lab_pathways']) {
    const c = app.findCollectionByNameOrId(name);
    if (!c.fields.getByName('pack')) c.fields.add(new RelationField(rel('pack', packs)));
    if (!c.indexes.some((i) => i.includes('idx_' + name + '_pack'))) c.indexes.push('CREATE INDEX idx_' + name + '_pack ON ' + name + ' (pack)');
    if (name === 'lab_objects') {
      const domain = c.fields.getByName('domain');
      if (!domain.values.includes('anatomy')) domain.values = domain.values.concat(['anatomy']);
    }
    app.save(c);
  }

  // One row per user and pathway: where the learner stopped and which lessons they finished.
  const progress = new Collection({
    name: 'lab_progress', type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      rel('user', users), rel('pathway', app.findCollectionByNameOrId('lab_pathways')), rel('lastObject', app.findCollectionByNameOrId('lab_objects')),
      { name: 'completed', type: 'json', maxSize: 8192 },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_lab_progress_user_path ON lab_progress (user, pathway)'],
  });
  app.save(progress);
}, () => {
  // Production rollback is code-only: retain authored content and schema.
  throw new Error('Lab rollback preserves data. Revert application code; do not drop Lab collections. See docs/LAB.md.');
});
