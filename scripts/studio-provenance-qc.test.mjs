import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {assessPinnedPreparationTool} from '../licensing/tools/verify-studio-reproducibility.mjs';

test('PROVENANCE-QC-001: later edits do not invalidate an authentic historical tool; drift stays explicit',t=>{
  const repoRoot=fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-pinned-tool-'));
  t.after(()=>fs.rmSync(repoRoot,{recursive:true,force:true}));
  const tool='apps/studios/tools/prepare-fixture.mjs',original='// Engineering fixture; never clinical approval\n';
  fs.mkdirSync(path.dirname(path.join(repoRoot,tool)),{recursive:true});
  fs.writeFileSync(path.join(repoRoot,tool),original);
  const git=(...args)=>execFileSync('git',args,{cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  git('init');git('add',tool);git('-c','user.name=MEDCOEL QC','-c','user.email=qc@example.test','commit','-m','Synthetic tool provenance fixture');
  const derivation={pipelineCommit:git('rev-parse','HEAD'),tool:tool+'@sha256:'+crypto.createHash('sha256').update(original).digest('hex')};
  assert.equal(assessPinnedPreparationTool(derivation,{repoRoot}).currentMatches,true);
  fs.writeFileSync(path.join(repoRoot,tool),original+'// Current code changed\n');
  const checked=assessPinnedPreparationTool(derivation,{repoRoot});
  assert.equal(checked.ok,true);
  assert.equal(checked.currentMatches,false);
  assert.equal(checked.code,'PINNED_TOOL_MATCH');
  assert.notEqual(checked.currentSha256,checked.historicalSha256);
  assert.equal(assessPinnedPreparationTool({...derivation,tool:tool+'@sha256:'+'0'.repeat(64)},{repoRoot}).ok,false);
});

test('PROVENANCE-QC-002: missing commit, path traversal and incomplete provenance fail closed',()=>{
  for(const derivation of [{},{tool:'../../secrets@sha256:'+'a'.repeat(64),pipelineCommit:'a'.repeat(40)},
    {tool:'apps/studios/tools/prepare-fixture.mjs@sha256:'+'a'.repeat(64),pipelineCommit:'0'.repeat(40)}])
    assert.equal(assessPinnedPreparationTool(derivation).ok,false);
});
