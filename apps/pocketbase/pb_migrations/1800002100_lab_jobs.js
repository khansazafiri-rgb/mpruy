/// <reference path="../pb_data/types.d.ts" />
// Job state lives in PocketBase so it survives a worker crash and VPS reboot.
migrate((app) => {
  app.save(new Collection({
    name: 'lab_jobs', type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'key', type: 'text', required: true, max: 100, pattern: '^[a-z0-9][a-z0-9-]*$' },
      { name: 'type', type: 'select', required: true, maxSelect: 1, values: ['dataset_acquisition', 'media_registration', 'authoring_generation'] },
      { name: 'dataset', type: 'text', required: true, max: 50 },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['queued', 'running', 'waiting_retry', 'completed', 'failed', 'cancelled'] },
      { name: 'stage', type: 'text', max: 50 },
      { name: 'progress', type: 'number', onlyInt: true, min: 0, max: 100 },
      { name: 'currentItem', type: 'text', max: 100 },
      { name: 'totalItems', type: 'number', onlyInt: true, min: 0 },
      { name: 'completedItems', type: 'number', onlyInt: true, min: 0 },
      { name: 'attempts', type: 'number', onlyInt: true, min: 0 },
      { name: 'cancelRequested', type: 'bool' },
      { name: 'checkpoints', type: 'json', maxSize: 16384 },
      { name: 'error', type: 'text', max: 2000 },
      { name: 'result', type: 'json', maxSize: 32768 },
      { name: 'startedAt', type: 'date' },
      { name: 'finishedAt', type: 'date' },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_lab_jobs_key ON lab_jobs (key)'],
  }));
}, () => { throw new Error('Lab job rollback retains operational history. Revert code only.'); });
