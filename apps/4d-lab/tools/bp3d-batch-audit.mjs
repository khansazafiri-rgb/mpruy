// Read-only audit of generated review data. Never promotes source candidates.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {summarizeGeometry} from './review-bp3d-candidate.mjs';

export async function auditGeneratedBatch(folder) {
  const root=path.resolve(folder), manifest=JSON.parse(fs.readFileSync(path.join(root,'inventory.json'),'utf8'));
  if(manifest.approvedForCommercialDistribution!==false||manifest.geometryRegisteredToMEDCOEL!==false)
    throw new Error('Review inventory must remain unapproved and unregistered');
  const ids=new Set(),names=new Set(),errors=[];
  for(const item of manifest.converted){
    if(ids.has(item.id)||names.has(item.name))errors.push(item.name+': duplicate identity');
    ids.add(item.id);names.add(item.name);
    const model=path.resolve(root,item.modelPath);
    if(!model.startsWith(root+path.sep)||path.basename(model)!=='model.glb'){
      errors.push(item.name+': unsafe model path');continue;
    }
    if(!fs.existsSync(model)){errors.push(item.name+': missing GLB');continue;}
    const bytes=fs.readFileSync(model);
    if(createHash('sha256').update(bytes).digest('hex')!==item.glbSha256){
      errors.push(item.name+': hash mismatch');continue;
    }
    try{
      const summary=summarizeGeometry(await new NodeIO().readBinary(new Uint8Array(bytes)));
      if(summary.sourceMeshes!==item.sourceMeshes||summary.triangles!==item.triangles)
        errors.push(item.name+': element or triangle count mismatch');
    }catch(error){errors.push(item.name+': invalid GLB '+error.message);}
  }
  if(manifest.summary.converted!==manifest.converted.length)
    errors.push('converted total does not match inventory');
  if(manifest.referenceSurface){
    const ref=manifest.referenceSurface;
    const skin=ref.boundsNative;
    if(!skin?.min||!skin?.max||skin.min.length!==3||skin.max.length!==3)
      errors.push('skin source bounds missing');
    else for(const item of manifest.converted){
      const bounds=item.boundsNative;
      if(!bounds?.min||!bounds?.max||[...bounds.min,...bounds.max].some(n=>!Number.isFinite(n))||
        bounds.min.some((n,i)=>n<skin.min[i]-5)||
        bounds.max.some((n,i)=>n>skin.max[i]+5))
        errors.push(item.name+': outside reference skin source bounds');
    }
    const refPath=path.resolve(root,ref.modelPath);
    if(ref.fmaId!=='FMA7163'||ref.bpId!=='BP9115'||ref.fjId!=='FJ2810'||
      !refPath.startsWith(root+path.sep)||path.basename(refPath)!=='skin.glb')
      errors.push('unsafe or mismatched skin reference identity');
    else if(!fs.existsSync(refPath))errors.push('missing skin reference GLB');
    else if(createHash('sha256').update(fs.readFileSync(refPath)).digest('hex')!==ref.glbSha256)
      errors.push('skin reference hash mismatch');
    if(!ref.rightsReview?.startsWith('BLOCKED:'))errors.push('skin rights warning missing');
  }
  return {catalogCount:manifest.summary.catalogCount,converted:manifest.converted.length,
    mappingGaps:manifest.summary.gaps,independentModels:ids.size,errors,
    approvedForCommercialDistribution:false};
}
