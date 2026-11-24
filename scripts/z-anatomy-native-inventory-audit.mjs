// Private inventory-to-renderer consistency audit; rejects metadata regressions.
const limits={skeletal:['skeletal',1],muscular:['muscular',4],joints:['joints',1],
 arterial:['cardiovascular',3],venous:['cardiovascular',3],heart:['cardiovascular',1],
 nervous:['nervous',3],lymphatic:['lymphatic',3],respiratory:['visceral',1],
 digestive:['visceral',1],urinary:['visceral',1],reproductive:['visceral',1],endocrine:['visceral',1]};
const regions=new Set(['whole','headNeck','thorax','abdomen','pelvis','upperLimb','lowerLimb','back']);
export function auditNativeInventory(inv){
 const issues=[],groups=Object.fromEntries(Object.keys(limits).map(g=>[g,0])),names=new Set(),ids=new Set();
 const entries=Array.isArray(inv?.converted)?inv.converted:[];
 if(inv?.sourceFrame!=='z-anatomy-world-y-up-metres'||inv?.sourceNativeDisplayOnly!==true||
    inv?.approvedForCommercialDistribution!==false||!entries.length)issues.push({reason:'Invalid private native inventory'});
 for(const e of entries){
  const m=e.privateAtlasMeta,lim=limits[e.group],why=[];
  if(typeof e.name!=='string'||!e.name.trim()||names.has(e.name))why.push('invalid or duplicate display identity');
  if(!/^za-[a-f0-9]{24}$/.test(e.id||'')||ids.has(e.id))why.push('invalid or duplicate source identity');
  if(e.approvedForDistribution!==false||e.modelPath!=='./structures/'+e.id+'/model.glb')why.push('invalid private model path/approval');
  if(!lim||lim[0]!==e.system||m?.group!==e.group||m?.source!==e.system)why.push('group/source mismatch');
  if(!Number.isInteger(m?.layer)||m.layer<0||m.layer>=(lim?.[1]||0))why.push('layer outside viewer range');
  if(!Array.isArray(m?.regions)||!m.regions.length||m.regions.some(r=>!regions.has(r)))why.push('invalid region metadata');
  const b=m?.box;
  if(!Array.isArray(b)||b.length!==6||!b.every(Number.isFinite)||[0,1,2].some(i=>b[i]>b[i+3])||
      !b.some((v,i)=>i<3&&v<b[i+3]))why.push('invalid native bounds');
  if(!Number.isSafeInteger(e.triangles)||e.triangles<1)why.push('invalid triangle count');
  if(!/^[a-f0-9]{64}$/.test(e.glbSha256||''))why.push('missing GLB checksum');
  names.add(e.name);ids.add(e.id);
  if(why.length)issues.push({name:e.name,id:e.id,reasons:why});else groups[e.group]++;
 }
 return {passed:issues.length===0,issues,models:entries.length,groups,
  unavailableGroups:Object.keys(groups).filter(g=>!groups[g]),sourceFrame:inv?.sourceFrame||null,
  geometryAnatomyValidated:false,registrationValidated:false,publicRelease:'NO_GO'};
}
