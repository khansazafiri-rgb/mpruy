// Discovery only. No candidate from this report may be auto-exported.
const norm=s=>String(s).normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');
const tokens=s=>norm(s).replace(/[(),-]/g,' ').split(/\s+/).filter(Boolean);
const unordered=s=>tokens(s).sort().join(' ');
export function diagnoseSourceGaps(sources,specs,resolved){
 const inventory=[];
 for(const s of sources)for(const n of s.names){
  const ids=[...(s.elements.get(n.fmaId)||[])].sort(),missing=ids.filter(id=>!s.archiveIndex.has(id));
  inventory.push({tree:s.tree,name:n.name,fmaId:n.fmaId,bpId:n.bpId,elementCount:ids.length,missingElementCount:missing.length,complete:ids.length>0&&!missing.length});
 }
 return specs.flatMap(([group,names,pinned,tree],i)=>{
  if(resolved[i]?.status==='EXPORT_CANDIDATE')return [];
  const allowed=inventory.filter(n=>(!tree||n.tree===tree)&&(!pinned||n.fmaId===pinned));
  const exact=allowed.filter(n=>names.some(k=>norm(k)===norm(n.name)));
  const reordered=allowed.filter(n=>!exact.includes(n)&&names.some(k=>unordered(k)===unordered(n.name)));
  const pinnedRows=pinned?allowed.filter(n=>!exact.includes(n)&&!reordered.includes(n)):[];
  // Same tokens only: laterality, ordinal, region and other qualifiers are retained.
  // A different order is not proof of anatomical equivalence.
  const candidates=[...exact.map(n=>({...n,match:'EXACT_LABEL'})),...reordered.map(n=>({...n,match:'TOKEN_ORDER_REVIEW'})),...pinnedRows.map(n=>({...n,match:'PINNED_FMA_LABEL_REVIEW'}))];
  const status=exact.some(n=>n.complete)?'AMBIGUOUS_COMPLETE_IDENTITY':exact.length?'EXACT_LABEL_INCOMPLETE_MESH':reordered.length?'TOKEN_ORDER_REVIEW':pinnedRows.length?'PINNED_LABEL_MISMATCH':'NO_MATCH_IN_CHECKED_TABLES';
  return [{group,target:names[0],status,originalStatus:resolved[i]?.status||null,candidateCount:candidates.length,candidates:candidates.slice(0,12),autoExport:false}];
 });
}
