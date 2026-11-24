import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// CI guard for CLI programs that are not reached by imported-library tests.
// A prior release of the all-systems preview aborted at parse time before QC.
const relativePaths=[
  'scripts/bp3d-focused-onepass.mjs',
  'apps/4d-lab/tools/batch-bp3d-candidates.mjs',
  'apps/4d-lab/tools/audit-bp3d-completeness.mjs',
  'scripts/preview-4d-lab.mjs'
];
for(const file of relativePaths){
  test('private BodyParts3D CLI compiles before any dataset is accessed: '+file,()=>{
    const absolute=fileURLToPath(new URL('../'+file,import.meta.url));
    const result=spawnSync(process.execPath,['--check',absolute],{
      encoding:'utf8',timeout:20000});
    assert.equal(result.error,undefined,String(result.error));
    assert.equal(result.status,0,[
      'CLI syntax validation failed: '+file,
      result.stdout,result.stderr
    ].filter(Boolean).join('\n'));
  });
}
