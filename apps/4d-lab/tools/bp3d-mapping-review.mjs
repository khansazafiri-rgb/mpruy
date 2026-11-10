// Human review queue only: no fuzzy recommendation can enter converted models.
import {normalizeAnatomyName} from '../../../licensing/tools/prepare-bodyparts3d-source.mjs';

const synonym = Object.freeze({
  musculus:'muscle', musculi:'muscle', muscles:'muscle',
  arteria:'artery', arteriae:'artery', arteries:'artery',
  vena:'vein', venae:'vein', veins:'vein',
  nervus:'nerve', nervi:'nerve', nerves:'nerve',
  ligamentum:'ligament', ligamenti:'ligament', ligaments:'ligament',
  os:'bone', ossis:'bone', bones:'bone',
  sinister:'left', sinistra:'left', sinistrum:'left',
  dexter:'right', dextra:'right', dextrum:'right',
});
const stop = new Set(['of','the','and','part','branch','anterior','posterior','superior','inferior']);
export function reviewTokens(name) {
  // Expand punctuated Latin initials only as a suggestion aid. The same
  // initials can have other meanings; confidence is capped below.
  const expanded=String(name).replace(/\b([amvn])\.(?=\s)/gi,(_,letter)=>
    ({a:'arteria',m:'musculus',v:'vena',n:'nervus'})[letter.toLowerCase()]+' ');
  return normalizeAnatomyName(expanded).split(' ').filter(Boolean).map(token=>synonym[token]||token);
}
const side = tokens => tokens.includes('left')?'left':tokens.includes('right')?'right':null;
const category = tokens => {
  for(const term of ['artery','vein','nerve','muscle','ligament','tendon','cartilage'])
    if(tokens.includes(term))return term;
  return null;
};
const conflict = (a,b) => {
  const types=[category(a),category(b)];
  return types.every(Boolean)&&types[0]!==types[1]?'explicit-tissue-type-mismatch':null;
};
const csv = value => '"'+String(value??'').replaceAll('"','""')+'"';

export function reconcileMapping({gaps,officialRows,converted=[],elementIndex=new Map(),archiveFiles=[]}) {
  const entries=officialRows.map(row=>({ ...row,tokens:reviewTokens(row.name) }));
  const inverted=new Map();
  const identityCount=new Map();
  for(let index=0;index<entries.length;index++)for(const token of new Set(entries[index].tokens)){
    if(stop.has(token)||token.length<3)continue;
    if(!inverted.has(token))inverted.set(token,new Set());
    inverted.get(token).add(index);
  }
  for(const row of entries){const key=row.fmaId+'|'+row.bpId;identityCount.set(key,(identityCount.get(key)||0)+1);}
  const paths=new Set(archiveFiles.map(file=>file.split('/').at(-1).replace(/\.obj$/i,'').toUpperCase()));
  const duplicates=new Map();
  for(const row of converted){
    const key=row.fmaId+'|'+row.bpId;
    if(!duplicates.has(key))duplicates.set(key,[]);
    duplicates.get(key).push(row.name);
  }
  const queue=gaps.map(gap=>{
    const tokens=reviewTokens(gap.name), options=new Set();
    for(const token of new Set(tokens))for(const index of inverted.get(token)||[])options.add(index);
    const suggestions=[], rejections={oppositeSide:0,tissueType:0};
    for(const index of options){
      const row=entries[index], a=side(tokens),b=side(row.tokens);
      if(a&&b&&a!==b){rejections.oppositeSide++;continue;}
      const mismatch=conflict(tokens,row.tokens);
      if(mismatch){rejections.tissueType++;continue;}
      const A=new Set(tokens.filter(x=>!stop.has(x))),B=new Set(row.tokens.filter(x=>!stop.has(x)));
      const overlap=[...A].filter(x=>B.has(x)).length, union=new Set([...A,...B]).size;
      const score=union?overlap/union:0;
      if(score<0.4)continue;
      const sourceIds=[...(elementIndex.get(row.fmaId)||[])].sort();
      const missingElements=sourceIds.filter(id=>!paths.has(id.toUpperCase()));
      const warnings=[];
      if(!sourceIds.length||missingElements.length)warnings.push('missing-source-geometry');
      if(a&&!b)warnings.push('source-side-unspecified');
      if(!a&&b)warnings.push('atlas-side-unspecified');
      if(/\b[amvn]\.\s/i.test(gap.name)||/\b[amvn]\.\s/i.test(row.name))
        warnings.push('abbreviation-expanded-check-meaning');
      const sameIdentity=identityCount.get(row.fmaId+'|'+row.bpId);
      if(sameIdentity>1)warnings.push('multiple-official-names-for-identity');
      suggestions.push({fmaId:row.fmaId,bpId:row.bpId,officialName:row.name,
        sourceElementIds:sourceIds,missingElements,similarity:Number(score.toFixed(3)),
        confidence:score>=0.85&&!warnings.length?'high-review':score>=0.6?'medium-review':'low-review',
        warnings,approved:false});
    }
    suggestions.sort((a,b)=>b.similarity-a.similarity||a.officialName.localeCompare(b.officialName,'en'));
    const top=suggestions.slice(0,5);
    if(top.length>1&&top[0].similarity===top[1].similarity)top.forEach(x=>{
      x.warnings.push('tied-best-match');x.confidence='ambiguous-review';
    });
    return {name:gap.name,system:gap.system,reason:gap.reason,
      directOfficialIds:gap.officialIds||[],rejections,suggestions:top,
      disposition:'unverified-human-review',approved:false};
  });
  const systems={};
  for(const row of queue){
    const s=systems[row.system]??={unmatched:0,ambiguous:0,missingSource:0,
      withSuggestions:0,withoutSuggestions:0,highReview:0};
    s[row.reason]=(s[row.reason]||0)+1;
    if(row.suggestions.length)s.withSuggestions++;else s.withoutSuggestions++;
    if(row.suggestions[0]?.confidence==='high-review')s.highReview++;
  }
  const duplicateDirectIdentities=[...duplicates].filter(([,names])=>names.length>1)
    .map(([identity,names])=>({identity,names:names.sort()})).sort((a,b)=>a.identity.localeCompare(b.identity));
  const summary={catalogGaps:queue.length,withSuggestions:queue.filter(x=>x.suggestions.length).length,
    noSuggestions:queue.filter(x=>!x.suggestions.length).length,
    highReview:queue.filter(x=>x.suggestions[0]?.confidence==='high-review').length,
    duplicateDirectIdentities:duplicateDirectIdentities.length,automaticallyApproved:0};
  return {report:{schemaVersion:1,status:'UNVERIFIED-REVIEW-ONLY',summary,systems,
    duplicateDirectIdentities,queue,approvedForDistribution:false},
    csv:['atlasName,system,reason,topOfficialName,FMA,BP,FJ,confidence,score,warnings,approved',
      ...queue.map(row=>{const top=row.suggestions[0];return [row.name,row.system,row.reason,
        top?.officialName,top?.fmaId,top?.bpId,top?.sourceElementIds.join('|'),
        top?.confidence,top?.similarity,top?.warnings.join('|'),'false'].map(csv).join(',');})].join('\n')+'\n'};
}
