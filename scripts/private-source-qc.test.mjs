import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseQcArgs,assertPrivateQcOutput} from './private-studio-source-qc.mjs';

test('PRIVATE-QC-001: command has no download, approval or public output flag',()=>{
  assert.deepEqual(parseQcArgs(['--owner-root','/owner','--out','/private/report.json']),{'--owner-root':'/owner','--out':'/private/report.json'});
  for(const args of [['--approve'],['--unknown','value'],['--out'],['--out','--owner-root'],['--out','a','--out','b']])
    assert.throws(()=>parseQcArgs(args),/QC_INVALID_ARGUMENT/);
});
test('PRIVATE-QC-002: output cannot traverse to a public folder or follow symlinks',t=>{
  const repoRoot=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-private-qc-'));
  t.after(()=>fs.rmSync(repoRoot,{recursive:true,force:true}));
  fs.mkdirSync(path.join(repoRoot,'local-data'));fs.mkdirSync(path.join(repoRoot,'public'));
  fs.symlinkSync(path.join(repoRoot,'public'),path.join(repoRoot,'local-data','escaped'));
  assert.equal(assertPrivateQcOutput(path.join(repoRoot,'local-data','qc','report.json'),{repoRoot}),path.join(repoRoot,'local-data','qc','report.json'));
  assert.throws(()=>assertPrivateQcOutput(path.join(repoRoot,'local-data','..','public','report.json'),{repoRoot}),/MUST_REMAIN_PRIVATE/);
  assert.throws(()=>assertPrivateQcOutput(path.join(repoRoot,'local-data','escaped','report.json'),{repoRoot}),/SYMLINK_REFUSED/);
});
