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
  return {catalogCount:manifest.summary.catalogCount,converted:manifest.converted.length,
    mappingGaps:manifest.summary.gaps,independentModels:ids.size,errors,
    approvedForCommercialDistribution:false};
}
