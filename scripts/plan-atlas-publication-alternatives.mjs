// Crosswalk only: independently sourced geometry is an alternative, not a licence transfer
// or a spatially registered replacement of the Z-Anatomy mesh.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const key=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ').replace(/^(.*)\.([lr])$/,(_m,n,s)=>(s==='l'?'left ':'right ')+n);
export function planAlternatives(za,bp){
 assert(za.publicRelease==='NO_GO'&&bp.publicRelease==='NO_GO'&&Array.isArray(za.rows)&&Array.isArray(bp.rows));
 const byName=new Map();
 for(const b of bp.rows){
  if(b.status!=='EXACT_RAW_GEOMETRY_MATCH'||b.approvedForDistribution!==false)continue;
  const k=key(b.name)+'|'+b.group;
  if(!byName.has(k))byName.set(k,[]);byName.get(k).push(b);
 }
 const counts={},rows=za.rows.map(z=>{
  const matches=byName.get(key(z.name)+'|'+z.group)||[];
  const status=matches.length===1?'INDEPENDENT_SOURCE_ALTERNATIVE':matches.length>1?'AMBIGUOUS_ALTERNATIVE':'NO_VERIFIED_RAW_ALTERNATIVE';
  const g=counts[z.group]??={total:0,independentAlternatives:0,ambiguous:0,missing:0};g.total++;
  if(matches.length===1)g.independentAlternatives++;else if(matches.length>1)g.ambiguous++;else g.missing++;
  return {id:z.id,name:z.name,group:z.group,status,
   alternatives:matches.map(b=>({id:b.id,sha256:b.sha256,fmaId:b.fmaId,bpId:b.bpId,tree:b.tree,publisherReceiptComplete:b.publisherReceiptComplete})),
   existingZAnatomyRightsVerified:false,registrationValidated:false,approvedForDistribution:false};
 });
 return {scope:'Alternative exact-name/source-verified position candidates only. No inferred Z-Anatomy ownership, no cross-frame overlay.',groups:counts,rows,
  total:rows.length,independentAlternatives:rows.filter(r=>r.status==='INDEPENDENT_SOURCE_ALTERNATIVE').length,approved:0,publicRelease:'NO_GO'};
}
function local(folder,file){
 const dir=path.join(q,folder),p=path.join(dir,file);
 assert(fs.realpathSync(dir)===dir&&fs.realpathSync(p)===p&&fs.statSync(p).isFile());return p;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [za,bp]=process.argv.slice(2);
 assert(/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(za||'')&&(bp==='bp3d-all-systems'||/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(bp||'')));
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const report=planAlternatives(read(local(za,'publication-rights-review.json')),read(local(bp,'publication-bp3d-geometry-evidence.json')));
 const out=path.join(q,za,'publication-source-alternatives.json'),tmp=out+'.'+process.pid+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(tmp,out);
 console.log('INDEPENDENT SOURCE ALTERNATIVES',out,report.independentAlternatives+'/'+report.total,'approved: 0');
}
