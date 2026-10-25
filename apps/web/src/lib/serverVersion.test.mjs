import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { migrationNumber, REQUIRED_MIGRATION, serverIsBehind } from './serverVersion.js';

test('REQUIRED_MIGRATION sama dengan migrasi terbaru di pb_migrations', () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../pocketbase/pb_migrations');
  const latest = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().at(-1);
  assert.equal(migrationNumber(latest), REQUIRED_MIGRATION, `Naikkan REQUIRED_MIGRATION ke ${migrationNumber(latest)}`);
});

test('serverIsBehind', () => {
  assert.equal(serverIsBehind('1800001400_drilling.js'), true);
  assert.equal(serverIsBehind(''), true);
  assert.equal(serverIsBehind('1800001500_drilling_chapters.js'), true);
  assert.equal(serverIsBehind('1800001600_explanation_english.js'), true);
  assert.equal(serverIsBehind('1800001700_global_language.js'), false);
});
