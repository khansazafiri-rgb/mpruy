/// <reference path="../pb_data/types.d.ts" />
// Additive foundation. All collection APIs are locked; guarded Lab routes own access.
migrate((app) => {
  const base = () => [
    { name: 'slug', type: 'text', required: true, max: 100, pattern: '^[a-z0-9-]+$' },
    { name: 'title', type: 'text', required: true, max: 200 },
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['draft', 'published'] },
    { name: 'data', type: 'json', maxSize: 131072 },
    { name: 'reviewedBy', type: 'relation', collectionId: app.findCollectionByNameOrId('users').id, maxSelect: 1, cascadeDelete: false },
    { name: 'reviewedAt', type: 'date' },
    { name: 'revision', type: 'number', onlyInt: true, min: 1 },
    { name: 'created', type: 'autodate', onCreate: true },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ];
  const make = (name, fields) => {
    const c = new Collection({ name, type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: base().concat(fields || []), indexes: ['CREATE UNIQUE INDEX idx_' + name + '_slug ON ' + name + ' (slug)', 'CREATE INDEX idx_' + name + '_status ON ' + name + ' (status)'] });
    app.save(c); return c;
  };
  const rel = (name, c, max) => ({ name, type: 'relation', collectionId: c.id, maxSelect: max || 1, cascadeDelete: false });
  const assets = make('lab_assets');
  const objects = make('lab_objects', [
    { name: 'domain', type: 'select', required: true, maxSelect: 1, values: ['imaging', 'clinical_pathology', 'microbiology', 'parasitology', 'histology'] },
    { name: 'modality', type: 'text', max: 100 }, { name: 'summary', type: 'text', max: 600 },
    { name: 'tags', type: 'json', maxSize: 4096 }, rel('assets', assets, 20),
    rel('legacyQuestions', app.findCollectionByNameOrId('questions'), 50),
  ]);
  objects.fields.add(new RelationField(rel('related', objects, 30))); app.save(objects);
  make('lab_questions', [rel('objects', objects, 30), rel('asset', assets)]);
  const paths = make('lab_pathways', [{ name: 'summary', type: 'text', max: 600 }]);
  const steps = new Collection({ name: 'lab_path_steps', type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [rel('pathway', paths), rel('object', objects), { name: 'position', type: 'number', required: true, onlyInt: true, min: 1 }],
    indexes: ['CREATE UNIQUE INDEX idx_lab_step_position ON lab_path_steps (pathway, position)', 'CREATE UNIQUE INDEX idx_lab_step_object ON lab_path_steps (pathway, object)'] });
  app.save(steps);
}, () => {
  // Production rollback is code-only: retain authored content and schema.
  throw new Error('Lab rollback preserves data. Revert application code; do not drop Lab collections. See docs/LAB.md.');
});
