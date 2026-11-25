// Targeted local remediation of the four reported npm findings. No --force or production access.
// The exact registry-generated lock must be reviewed and committed separately.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {inspectLock,inspectInstalled} from './atlas-independent-dependency-audit.mjs';
import {checkSourceNotices} from './audit-atlas-publication-rights.mjs';
import {readNpmAudit,summarizeEvidence} from './diagnose-atlas-publication-audit.mjs';
import {auditPack} from './audit-bp3d-publication-geometry.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const app=path.join(root,'apps/atlas-independent'),q=path.join(root,'local-data/licensing-quarantine');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function command(exe,args,{allowFailure=false}={}){
 const p=spawnSync(exe,args,{cwd:root,stdio:'inherit',timeout:300000});
 if(p.error)throw p.error;
 if(!allowFailure)assert.equal(p.status,0,'Failed: '+exe+' '+args.join(' '));
 return p.status;
}
const [oldFolder,bpFolder]=process.argv.slice(2);
assert(/^atlas-publication-audit-[A-Za-z0-9_-]+$/.test(oldFolder||'')&&/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(bpFolder||''),'Explicit previous audit and BP3D folder required');
assert(fs.realpathSync(q)===q);
const old=path.join(q,oldFolder);assert(fs.realpathSync(old)===old);
const report={schema:1,publicRelease:'NO_GO',productionChanged:false,steps:{}};
try{
 const bp=auditPack(bpFolder);
 report.steps.bp3d=summarizeEvidence(bp,read(path.join(old,'hra-rights.json')),read(path.join(old,'z-anatomy-rights.json'))).bp3d;
 report.steps.bp3d.geometryMatched=bp.geometryMatched;
}catch(e){report.steps.bp3d={status:'BLOCKED',reason:String(e.message)};}
try{
 checkSourceNotices();
 const pkgPath=path.join(app,'package.json'),lockPath=path.join(app,'package-lock.json');
 assert(fs.realpathSync(pkgPath)===pkgPath&&fs.realpathSync(lockPath)===lockPath);
 const before=read(pkgPath);assert(before.dependencies?.three==='0.185.1'&&['8.1.5','8.3.8'].includes(before.devDependencies?.vite),'Unexpected dependency baseline');
 const npmArgs=['--prefix','apps/atlas-independent','--ignore-scripts','--registry=https://registry.npmjs.org'];
 command('npm',['install','--package-lock-only','--save-dev','--save-exact','vite@8.3.8',...npmArgs]);
 command('npm',['audit','fix','--package-lock-only',...npmArgs],{allowFailure:true});
 const after=read(pkgPath),lock=read(lockPath);
 assert.deepEqual(after.dependencies,before.dependencies);
 assert.deepEqual(after.devDependencies,{...before.devDependencies,vite:'8.3.8'});
 assert.deepEqual(after.scripts,before.scripts);
 const rows=inspectLock(after,lock);
 command('npm',['ci',...npmArgs]);
 inspectInstalled(app);
 command('npm',['test','--prefix','apps/atlas-independent']);
 const audit=readNpmAudit();
 report.steps.software={...audit,packages:rows.length,versions:Object.fromEntries(['vite','nanoid','postcss','source-map-js'].map(n=>[n,lock.packages['node_modules/'+n]?.version||null])),lockfile:'apps/atlas-independent/package-lock.json',lockfileNeedsGitReview:true};
}catch(e){report.steps.software={status:'BLOCKED_REMEDIATION',reason:String(e.message),lockfileNeedsGitReview:true};}
command(process.execPath,['--test','scripts/audit-bp3d-publication-geometry.test.mjs'],{allowFailure:false});
console.log('ATLAS REMEDIATION SUMMARY',JSON.stringify(report,null,2));
console.log('No publication or preview performed. Do not push private files; generated dependency manifest and lock require review.');
if(report.steps.software.status!=='NO_REPORTED_VULNERABILITIES'||report.steps.bp3d.status==='BLOCKED')process.exitCode=1;
