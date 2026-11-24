// Conservative text-only candidate ranking. Not medical source identity validation.
const ordinal=['first','second','third','fourth','fifth','sixth','seventh','eighth',
  'ninth','tenth','eleventh','twelfth'];
const divisions={c:'cervical',t:'thoracic',l:'lumbar'};
export function officialVertebralLevel(name){
  const n=String(name||'').toLowerCase().replace(/[-_]/g,' ');
  const short=n.match(/\b(?:vertebra\s+)?([ctl])\s*(1[0-2]|[1-9])\b/);
  if(short)return short[1]+Number(short[2]);
  const full=n.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+(cervical|thoracic|lumbar)\s+vertebra\b/);
  if(full){
    const div=Object.keys(divisions).find(k=>divisions[k]===full[2]);
    return div+(ordinal.indexOf(full[1])+1);
  }
  if(/\batlas\b/.test(n)&&!/\bdisk\b|\bdisc\b|\bjoint\b|\bligament\b/.test(n))return 'c1';
  if(/\baxis\b/.test(n)&&!/\bdisk\b|\bdisc\b|\bjoint\b|\bligament\b/.test(n))return 'c2';
  return null;
}
export function semanticWholePartFlags(atlasName,officialName){
 const a=String(atlasName||'').toLowerCase(),b=String(officialName||'').toLowerCase(),flags=[];
 if(/^(liver|stomach|pancreas|duodenum|oesophagus|esophagus|pleura|thyroid gland|pineal gland|spleen|sigmoid colon|right main bronchus)$/i.test(a)&&
   /\b(segment|sector|lobe|artery|vein|duct|part|region|cavity|mucosa|branch|tree)\b/.test(b))
   flags.push('WHOLE_ORGAN_VS_SOURCE_SUBPART');
 if(/\bmeso[- ]?appendix\b/.test(a)&&/\bappendix\b/.test(b)&&!/\bmeso[- ]?appendix\b/.test(b))
   flags.push('MESOAPPENDIX_NOT_APPENDIX');
 if(/\btaenia\b/.test(a)&&!/\btaenia\b/.test(b))
   flags.push('TAENIA_NOT_UNRELATED_MUSCLE');
 if(/^(atlas\s*\(c1\)|axis\s*\(c2\))$/.test(a)&&/\b(intervertebral|disk|disc|joint)\b/.test(b))
   flags.push('VERTEBRA_NOT_INTERVERTEBRAL_DISK');
 return flags;
}
export const disqualifyingSourceFlags=new Set([
 'OPPOSITE_SIDE','HAND_VS_FOOT','DIFFERENT_VERTEBRAL_LEVEL',
 'VERTEBRAL_LEVEL_NOT_SPECIFIED','SOURCE_SIDE_NOT_SPECIFIED',
 'EXPLICIT_ANATOMY_TYPE_MISMATCH','NO_SHARED_SPECIFIC_ANATOMICAL_ANCHOR',
 'WHOLE_ORGAN_VS_SOURCE_SUBPART','MESOAPPENDIX_NOT_APPENDIX',
 'TAENIA_NOT_UNRELATED_MUSCLE','VERTEBRA_NOT_INTERVERTEBRAL_DISK',
 'CARTILAGE_NOT_RIB_BONE','SOURCE_SUBPART_NOT_WHOLE',
 'FMA_BP_REPRESENTATION_ALREADY_USED','NO_FJ_IDS','MISSING_OBJ_ELEMENTS'
]);
export const sourceLeadRisk=w=>w.some(x=>disqualifyingSourceFlags.has(x))?1:0;
