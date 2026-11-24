// PRIVATE REVIEW ONLY: score what the alternate BodyParts3D preview actually covers.
// An original Atlas model being visible does not make it licensed, source-equivalent,
// or safe to substitute into a missing BodyParts3D slot.
const f=(name)=>String(name||'').toLowerCase();
export const FOCUS_AREAS=Object.freeze([
  {id:'digiti-minimi-hand',label:'Digiti minimi — tangan (kiri/kanan)',
    match:x=>f(x.name).includes('digiti minimi')&&x.regions?.includes('upperLimb')},
  {id:'digiti-minimi-foot',label:'Digiti minimi — kaki (kiri/kanan)',
    match:x=>f(x.name).includes('digiti minimi')&&x.regions?.includes('lowerLimb')},
  {id:'nasal-skeleton',label:'Tulang hidung, septum dan etmoid',
    match:x=>x.system==='skeletal'&&/\b(nasal|ethmoid|vomer|concha)\b/i.test(x.name)},
  {id:'vertebral-skeleton',label:'Vertebra, sakrum dan koksigis',
    match:x=>x.system==='skeletal'&&/\b(vertebra|sacrum|coccyx|atlas|axis)\b/i.test(x.name)},
  {id:'sternum',label:'Sternum — manubrium, korpus dan xiphoid',
    match:x=>x.system==='skeletal'&&/\b(sternum|xiphoid)\b/i.test(x.name)},
  {id:'visceral',label:'Organ visceral — seluruh katalog yang tersedia',
    match:x=>x.system==='visceral'}
]);
const csv=x=>'"'+String(x??'').replaceAll('"','""')+'"';
export function buildVisibleGapReview(audit,triage){
  if(!Array.isArray(audit?.structures)||!Array.isArray(triage?.queue))
    throw Error('Full private source audit and its unapproved source triage are required');
  const queue=new Map(triage.queue.map(x=>[x.atlasName,x]));
  const areas=[],rows=[];
  for(const area of FOCUS_AREAS){
    const selected=audit.structures.filter(area.match), converted=selected.filter(x=>x.status==='converted');
    const missing=selected.filter(x=>x.status!=='converted');
    for(const structure of selected){
      const suggestion=queue.get(structure.name);
      rows.push({area:area.id,atlasName:structure.name,system:structure.system,
        status:structure.status,sourceIdentityVerified:false,
        clinicallyValidated:false,commerciallyApproved:false,
        hasProvisionalMesh:structure.status==='converted',
        sourceFma:structure.fmaId||null,sourceBp:structure.bpId||null,
        reviewTier:suggestion?.tier|| (structure.status==='converted'?'CONVERTED_UNVALIDATED':'NO_TRIAGE_MATCH'),
        suggestedOfficialName:suggestion?.candidate?.officialName||null,
        suggestedFma:suggestion?.candidate?.fmaId||null,
        suggestedBp:suggestion?.candidate?.bpId||null,
        warnings:suggestion?.candidate?.warnings||[],
        geometryWarnings:[...(structure.geometryFlags||[]),
          ...(structure.lateralityBoundsReview?[structure.lateralityBoundsReview]:[]),
          ...(structure.omittedZeroAreaTriangles?['OMITTED_ZERO_AREA_TRIANGLES']:[])]
      });
    }
    areas.push({id:area.id,label:area.label,total:selected.length,withMesh:converted.length,
      missing:missing.length,coveragePercent:selected.length?
      +((converted.length/selected.length)*100).toFixed(2):0,
      missingNames:missing.map(x=>x.name)});
  }
  return {status:'PRIVATE_ANATOMY_COVERAGE_ONLY',areas,rows,
    reviewOnly:true,releaseApproved:false,clinicalValidationCount:0,
    caveats:[
      'Model inventory coverage is not anatomical completeness or clinical validation',
      'The original Atlas renderer may contain different models with different rights and provenance',
      'Do not backfill BodyParts3D from the original Atlas or fuzzy suggested identities automatically',
      'BodyParts3D exact archive redistribution rights remain unresolved'
    ]};
}
export function visibleGapCsv(report){
  return ['priorityArea,atlasName,sourceSystem,modelStatus,sourceFMA,sourceBP,reviewTier,candidateOfficialName,candidateFMA,candidateBP,semanticWarnings,geometryWarnings,reviewed,commercialRelease',
    ...report.rows.map(x=>[
      x.area,x.atlasName,x.system,x.status,x.sourceFma,x.sourceBp,x.reviewTier,
      x.suggestedOfficialName,x.suggestedFma,x.suggestedBp,x.warnings.join('|'),
      x.geometryWarnings.join('|'),'false','false'].map(csv).join(','))].join('\n')+'\n';
}
export function visibleGapMarkdown(report){
  const lines=['# MEDCOEL Anatomy — missing coverage review (PRIVATE ONLY)','',
    'This compares the optional BodyParts3D GLB inventory against the existing Atlas catalogue; it does **not** compare, merge or redistribute original Atlas meshes.',
    '',
    '| Area | In catalogue | Converted GLBs | Not converted | Coverage |',
    '|---|---:|---:|---:|---:|',
    ...report.areas.map(a=>'| '+a.label+' | '+a.total+' | '+a.withMesh+
      ' | '+a.missing+' | '+a.coveragePercent+'% |'),
    '','## Source gaps by area'];
  for(const area of report.areas){
    lines.push('','### '+area.label,
      area.missing?area.missing+' structures have no matching converted BodyParts3D GLB.':
        'All structures in this catalogue slice have GLBs, but may still be anatomically incomplete or inaccurate.');
    for(const name of area.missingNames)lines.push('- '+name);
  }
  lines.push('','## Safety','',
    'An official FMA/BP/FJ lead or a GLB that renders does **not** validate muscle origin/insertion, laterality, geometry, tissue completeness, or commercial distribution.',
    'For digiti minimi, distinguish hand versus foot, left versus right, and abductor/flexor/opponens/extensor roles. The two modes use different mesh sources; never silently use a legacy Atlas model to fill a BodyParts3D gap.',
    'Refer to focus-gaps.csv for suggested candidate identity and collision warnings. All unconverted rows remain blocked until an anatomical reviewer confirms exact official source identity.',
    '','Public deployment remains NO-GO without medical and licence review.');
  return lines.join('\n')+'\n';
}
