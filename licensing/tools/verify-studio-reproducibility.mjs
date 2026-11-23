#!/usr/bin/env node
// Reproducibility check for Clinical Studio resources (private, local only).
// 1. Every parent asset (official raw input) in licensing/resources.v1.json is re-hashed from the retained acquisition.
// 2. Every preparation tool is re-run from those inputs; every derived asset must come out byte-identical.
// 3. Each tool digest must match the file at its declared pipelineCommit.
//    Current-tool drift is reported separately and blocks running a different pipeline as a reproduction.
// Writes a machine-readable record to local-data/studio-resources/evidence/reproducibility.json (never committed).
// Exit code 0 only if everything matches. Needs local-data/ (gitignored); prints SKIP and exits 2 without it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const RAW = path.join(REPO, 'local-data/studio-resources/raw'), BP3D = path.join(REPO, 'local-data/licensing-quarantine/bp3d-4.0');
const BUILD = path.join(REPO, 'local-data/studio-resources/build');

/** Maps a parent's logical "source/<sourceId>/<member>" path to the retained local file. */
export function localRawFile(asset,{repoRoot=REPO}={}) {
  const RAW=path.join(repoRoot,'local-data/studio-resources/raw'),BP3D=path.join(repoRoot,'local-data/licensing-quarantine/bp3d-4.0');
  const [, sourceId, ...rest] = asset.path.split('/'), member = asset.sourceFile.member;
  const base = { 'sri24-nitrc': path.join(RAW, 'sri24'), 'ptbxl-physionet': path.join(RAW, 'ptbxl'), 'lidc-idri-tcia': path.join(RAW, 'lidc'),
    'bodyparts3d-dbcls': BP3D, 'ptx498-zenodo': path.join(RAW, 'ptx498'), 'hc18-zenodo': path.join(RAW, 'hc18'), 'amos-zenodo': path.join(RAW, 'amos') }[sourceId];
  if (sourceId === 'spider-zenodo') return path.join(RAW, 'spider', member.startsWith('masks/') ? '1_t2_mask.mha' : '1_t2.mha');
  if (!base || !rest.length) throw Error('Unknown parent path ' + asset.path);
  return path.join(base, member);
}

/** A valid historical tool pin is not invalidated merely by a later code fix. */
export function assessPinnedPreparationTool(derivation,{repoRoot=REPO}={}){
  const match=/^(apps\/studios\/tools\/prepare-[a-z0-9-]+\.mjs)@sha256:([a-f0-9]{64})$/.exec(derivation?.tool||'');
  const commit=derivation?.pipelineCommit;
  if(!match||!/^[a-f0-9]{40}$/.test(commit||''))return {ok:false,code:'INVALID_TOOL_REFERENCE'};
  const [,tool,expected]=match;
  try{
    const tree=execFileSync('git',['--no-optional-locks','ls-tree',commit,'--',tool],{cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','ignore']});
    if(!/^100(?:644|755) blob /.test(tree))return {ok:false,code:'PINNED_TOOL_NOT_REGULAR'};
    const pinned=execFileSync('git',['--no-optional-locks','show',commit+':'+tool],{cwd:repoRoot,maxBuffer:5*1024*1024,stdio:['ignore','pipe','ignore']});
    const historicalSha256=sha(pinned);
    let currentSha256=null,cursor=repoRoot;
    for(const part of tool.split('/')){
      cursor=path.join(cursor,part);
      if(fs.lstatSync(cursor,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('UNSAFE_CURRENT_TOOL');
    }
    if(fs.lstatSync(cursor,{throwIfNoEntry:false})?.isFile())currentSha256=sha(fs.readFileSync(cursor));
    return {ok:historicalSha256===expected,code:historicalSha256===expected?'PINNED_TOOL_MATCH':'PINNED_TOOL_HASH_MISMATCH',
      tool,pipelineCommit:commit,expectedSha256:expected,historicalSha256,currentSha256,
      currentMatches:currentSha256===expected};
  }catch{return {ok:false,code:'PINNED_TOOL_UNAVAILABLE_OR_UNSAFE',tool,pipelineCommit:commit};}
}

export async function verify({ run = true, dataRoot=REPO } = {}) {
  if(run&&path.resolve(dataRoot)!==path.resolve(REPO))throw Error('EXTERNAL_DATA_ROOT_IS_READ_ONLY');
  const dataBuild=path.join(dataRoot,'local-data/studio-resources/build');
  const resources = JSON.parse(fs.readFileSync(path.join(REPO, 'licensing/resources.v1.json'), 'utf8'));
  const parents = resources.assets.filter(a => a.sourceFile), derived = resources.assets.filter(a => !a.sourceFile);
  const result = { schema: 'medcoel.reproducibility.v1', checkedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim(),
    parents: { total: parents.length, matched: 0, mismatches: [] }, derived: { total: derived.length, matched: 0, mismatches: [] },
    staleToolDigests: [], currentToolChanges: [], reproductionRequested:run, reproductionFailures:[], ran: [] };
  for (const a of parents) {
    const f = localRawFile(a,{repoRoot:dataRoot});
    if (!fs.existsSync(f)) { result.parents.mismatches.push({ id: a.id, reason: 'missing local file' }); continue; }
    const h = sha(fs.readFileSync(f));
    if (h === a.sha256 && h === a.sourceFile.sha256) result.parents.matched++; else result.parents.mismatches.push({ id: a.id, expected: a.sha256, actual: h });
  }
  const studios = [...new Set(derived.map(a => a.id.split('.')[0]))];
  const toolPins=new Map();
  for (const a of derived) {
    const key=a.derivation.pipelineCommit+':'+a.derivation.tool;
    if(!toolPins.has(key))toolPins.set(key,assessPinnedPreparationTool(a.derivation));
    const pin=toolPins.get(key);
    if(!pin.ok)result.staleToolDigests.push({id:a.id,tool:pin.tool||a.derivation.tool,code:pin.code});
    else if(!pin.currentMatches)result.currentToolChanges.push({id:a.id,tool:pin.tool,
      historicalSha256:pin.historicalSha256,currentSha256:pin.currentSha256});
  }
  if (run) for (const studio of studios) {
    if([...result.staleToolDigests,...result.currentToolChanges].some(x=>x.id.startsWith(studio+'.'))){
      result.reproductionFailures.push({studio,code:'CURRENT_PIPELINE_IS_NOT_THE_PINNED_PIPELINE'});continue;
    }
    const tool = derived.find(a => a.id.startsWith(studio + '.')).derivation.tool.split('@')[0];
    const args = /prepare-(bp3d-region|image2d)\.mjs$/.test(tool) ? [tool, studio] : [tool];
    try{execFileSync(process.execPath, args, { cwd: REPO, stdio: 'ignore' });result.ran.push(args.join(' '));}
    catch{result.reproductionFailures.push({studio,code:'PREPARATION_FAILED'});}
  }
  for (const a of derived) {
    const studio = a.id.split('.')[0], f = path.join(dataBuild, studio, a.path);
    const h = fs.existsSync(f) ? sha(fs.readFileSync(f)) : null;
    if (h === a.sha256) result.derived.matched++; else result.derived.mismatches.push({ id: a.id, expected: a.sha256, actual: h });
  }
  result.ok = !result.parents.mismatches.length && !result.derived.mismatches.length && !result.staleToolDigests.length && !result.reproductionFailures.length;
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(RAW)) { console.log('SKIP: local-data/studio-resources/raw is not present on this machine'); process.exit(2); }
  const r = await verify({ run: !process.argv.includes('--no-run') });
  const out = path.join(REPO, 'local-data/studio-resources/evidence/reproducibility.json');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(r, null, 2));
  console.log(JSON.stringify({ ok: r.ok, head: r.head, parents: `${r.parents.matched}/${r.parents.total}`, derived: `${r.derived.matched}/${r.derived.total}`, stale: r.staleToolDigests.length,
    currentToolChanges:r.currentToolChanges.length,reproductionRequested:r.reproductionRequested,reproductionFailures:r.reproductionFailures,
    mismatches: [...r.parents.mismatches, ...r.derived.mismatches].slice(0, 5) }, null, 1));
  process.exit(r.ok ? 0 : 1);
}
