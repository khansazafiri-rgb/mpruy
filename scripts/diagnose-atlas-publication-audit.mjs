// Summarize actual audit blockers, without copying model geometry or granting rights.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
export function summarizeEvidence(bp,hra,za){
 const reasons={};
 for(const r of bp.rows.filter(x=>x.status==='HOLD')){
  const key=String(r.reason||'Unknown').slice(0,250);
  const v=reasons[key]??={count:0,examples:[]};v.count++;if(v.examples.length<3)v.examples.push(r.name);
 }
 const statuses={};for(const r of hra.rows)statuses[r.status]=(statuses[r.status]||0)+1;
 const priorities={};for(const r of za.rows)for(const reason of r.reasons||[])priorities[reason]=(priorities[reason]||0)+1;
 return {bp3d:{total:bp.total,matched:bp.matched,held:bp.held,holdReasons:reasons},hra:{total:hra.total,matched:hra.matched,statuses},zAnatomy:{totals:za.totals,priorityReasons:priorities},publicRelease:'NO_GO'};
}
export function summarizeNpmAudit(doc){
 assert(doc?.auditReportVersion===2&&doc.metadata?.vulnerabilities&&doc.vulnerabilities&&typeof doc.vulnerabilities==='object'&&!doc.error,'npm audit failed or returned unsupported report');
 const v=doc.metadata.vulnerabilities;
 assert(['critical','high','moderate','low','info','total'].every(k=>Number.isInteger(v[k])&&v[k]>=0),'Missing audit severity totals');
 return {counts:v,findings:Object.entries(doc.vulnerabilities).map(([name,x])=>({name,severity:x.severity,range:x.range,isDirect:x.isDirect,via:x.via,fixAvailable:x.fixAvailable})),status:v.high+v.critical>0?'BLOCKED_HIGH_OR_CRITICAL':v.total>0?'REVIEW_REQUIRED':'NO_REPORTED_VULNERABILITIES'};
}
export function readNpmAudit(){
 const proc=spawnSync('npm',['audit','--prefix','apps/atlas-independent','--json'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:120000});
 if(proc.error)throw proc.error;
 assert([0,1].includes(proc.status),'Unexpected npm audit exit');
 return summarizeNpmAudit(JSON.parse(proc.stdout));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const folder=process.argv[2];assert(/^atlas-publication-audit-[A-Za-z0-9_-]+$/.test(folder||''));
 const dir=path.join(q,folder);assert(fs.realpathSync(dir)===dir&&fs.realpathSync(q)===q);
 function read(n){const p=path.join(dir,n+'.json');assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile());return JSON.parse(fs.readFileSync(p,'utf8'));}
 const result=summarizeEvidence(read('bp3d-geometry'),read('hra-rights'),read('z-anatomy-rights'));
 try{result.software=readNpmAudit();}catch(e){result.software={status:'BLOCKED_AUDIT_UNAVAILABLE',reason:String(e.message)};}
 console.log(JSON.stringify(result,null,2));
}
