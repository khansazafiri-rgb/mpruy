import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const mainFile = fileURLToPath(new URL('../src/app/main.js', import.meta.url));

test('4D workstation entry point parses: no unresolved merge markers or duplicate recovery entry points', () => {
  const code = readFileSync(mainFile, 'utf8');
  const syntax = spawnSync(process.execPath, ['--check', mainFile], {encoding: 'utf8'});
  assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);
  assert.doesNotMatch(code, /^(?:<{7}|={7}|>{7})/m);
  assert.equal((code.match(/\b(?:let|const) DATASET\s*=/g) || []).length, 1);
  assert.equal((code.match(/async function loadPhantom\s*\(/g) || []).length, 1);
  assert.match(code, /recoverBundledDataset\(DATASET,readBundledDataset/);
});
