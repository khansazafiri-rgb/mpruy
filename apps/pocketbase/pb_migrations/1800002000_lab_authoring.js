/// <reference path="../pb_data/types.d.ts" />
// Additive authoring storage. The student API reads publishedData, never mutable drafts.
migrate((app) => {
  const records = new Collection({
    name: 'lab_authoring', type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['module', 'catalog', 'placement', 'source', 'guide'] },
      { name: 'key', type: 'text', required: true, max: 100, pattern: '^[a-z0-9][a-z0-9-]*$' },
      { name: 'title', type: 'text', required: true, max: 200 },
      { name: 'data', type: 'json', maxSize: 524288 },
      { name: 'publishedData', type: 'json', maxSize: 524288 },
      { name: 'revision', type: 'number', onlyInt: true, min: 1 },
      { name: 'reviewedBy', type: 'relation', collectionId: app.findCollectionByNameOrId('users').id, maxSelect: 1, cascadeDelete: false },
      { name: 'reviewedAt', type: 'date' },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_lab_authoring_kind_key ON lab_authoring (kind, key)'],
  });
  app.save(records);
  const media = new Collection({
    name: 'lab_media', type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'key', type: 'text', required: true, max: 100, pattern: '^[a-z0-9][a-z0-9-]*$' },
      { name: 'title', type: 'text', required: true, max: 200 },
      { name: 'file', type: 'file', maxSelect: 1, maxSize: 20 * 1024 * 1024, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], protected: false },
      { name: 'externalUrl', type: 'text', max: 2048 },
      { name: 'alt', type: 'text', required: true, max: 500 },
      { name: 'sourceKey', type: 'text', required: true, max: 100 },
      { name: 'license', type: 'json', maxSize: 8192 },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['draft', 'published'] },
      { name: 'revision', type: 'number', onlyInt: true, min: 1 },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_lab_media_key ON lab_media (key)'],
  });
  app.save(media);
}, () => { throw new Error('Lab authoring rollback retains data. Revert code only.'); });
