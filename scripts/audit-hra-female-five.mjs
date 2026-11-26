// Quarantine-only audit: no source assets copied to public or persistent storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePublisherMetadata} from './acquire-hra-publication-metadata.mjs';
import {inspectGlb} from './atlas-onepass-supplementary.mjs';
const root=new URL('../',import.meta.url),pin='27d6d493cd53761abb10f087767ec4cc74acb051';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\x00')).update(b).digest('hex');
async function download(url,cap){
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000)});
 assert(response.ok&&response.url===url&&response.body,'Source unavailable '+response.status);
 const chunks=[];let n=0;for await(const c of response.body){n+=c.length;assert(n<=cap,'Source cap exceeded');chunks.push(c);}
 assert(n>0,'Empty source');return Buffer.concat(chunks);
}
export function crosswalkNodes(csv,doc){
 const lines=csv.trim().split(/\r?\n/);assert.equal(lines.shift(),'node_name,OntologyID,label');
 const nodes=doc.nodes||[],meshes=doc.meshes||[],seen=new Set();
 return lines.map(line=>{
  const m=line.match(/^([A-Za-z0-9_.-]+),((?:FMA|UBERON):\d+),([^,\r\n]+)$/);
  assert(m&&!seen.has(m[1]),'Invalid or ambiguous crosswalk row');seen.add(m[1]);
  const hits=nodes.map((n,i)=>({n,i})).filter(({n})=>n.name===m[1]);
  const meshNodes=hits.filter(({n})=>Number.isInteger(n.mesh)&&n.mesh>=0&&n.mesh<meshes.length);
  return {nodeName:m[1],ontologyId:m[2],label:m[3],nodeIndices:hits.map(x=>x.i),meshNodeIndices:meshNodes.map(x=>x.i),status:hits.length===1&&meshNodes.length===1?'EXACT_NAMED_MESH_NODE':'HOLD_GROUP_MISSING_OR_AMBIGUOUS'};
 });
}
export async function audit(batch='female-five'){
 const configs={'female-five':{file:'licensing/atlas-publication/hra-female-five-pinned-candidates-20261126.json',count:5,marker:'HRA FEMALE PINNED QUARANTINE REPORT '},'cardiopulmonary-four':{file:'licensing/atlas-publication/hra-cardiopulmonary-four-pinned-candidates-20261126.json',count:4,marker:'HRA CARDIOPULMONARY PINNED QUARANTINE REPORT '},'urogenital-7':{file:'licensing/atlas-publication/hra-urogenital-7-pinned-candidates-20261126.json',count:7,marker:'HRA UROGENITAL PINNED QUARANTINE REPORT '}};
 configs['ureter-four']={file:'licensing/atlas-publication/hra-ureter-four-pinned-candidates-20261126.json',count:4,marker:'HRA URETER PINNED QUARANTINE REPORT '};
 configs['cns-four']={file:'licensing/atlas-publication/hra-cns-four-pinned-candidates-20261126.json',count:4,marker:'HRA CNS PINNED QUARANTINE REPORT '};
 assert(Object.hasOwn(configs,batch),'Unknown HRA batch');const config=configs[batch];
 const spec=JSON.parse(fs.readFileSync(new URL(config.file,root),'utf8'));
 assert(spec.publisherRevision===pin&&spec.publicRelease==='NO_GO'&&spec.rows.length===config.count);
 const rows=[];
 for(const e of spec.rows){
  try{
   assert(/^[a-z0-9-]+$/.test(e.id)&&/^v\d+\.\d+$/.test(e.version)&&/^[a-z0-9-]+\.glb$/.test(e.filename));
   const base='https://raw.githubusercontent.com/hubmapconsortium/hra-kg/'+pin+'/digital-objects/ref-organ/'+e.id+'/'+e.version+'/raw/';
   const expected='https://cdn.humanatlas.io/digital-objects/ref-organ/'+e.id+'/'+e.version+'/assets/'+e.filename;
   assert(e.assetURL===expected&&e.approvedForDistribution===false);
   const [meta,cross,raw,cdn]=await Promise.all([download(base+'metadata.yaml',262144),download(base+'crosswalk.csv',262144),download(base+e.filename,32*1024*1024),download(expected,32*1024*1024)]);
   assert(gitBlob(meta)===e.metadataBlob&&gitBlob(cross)===e.crosswalkBlob&&gitBlob(raw)===e.glbBlob&&raw.length===e.bytes,'Pinned Git bytes differ');
   const proof=parsePublisherMetadata(meta.toString('utf8'),expected);assert(proof.doi===e.doi&&proof.license===e.sourceLicense);assert.deepEqual(proof.creators,e.creators);
   assert(raw.equals(cdn),'CDN and pinned Git GLB differ');
   const info=inspectGlb(raw);const gltf=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString('utf8'));
   const labels=crosswalkNodes(cross.toString('utf8'),gltf);assert.equal(labels.length,e.expectedCrosswalkRows);
   if(batch==='ureter-four'||batch==='cns-four')assert.deepEqual(labels.map(({nodeName,ontologyId,label})=>({nodeName,ontologyId,label})),e.sourceLabels,'Pinned crosswalk label mismatch');
   rows.push({id:e.id,version:e.version,assetURL:expected,bytes:raw.length,sha256:sha(raw),metadataSHA256:sha(meta),crosswalkSHA256:sha(cross),...info,labels,sourceMethod:e.sourceMethod||null,clinicalLimitations:e.clinicalLimitations||[],exactMeshNodeCount:labels.filter(x=>x.status==='EXACT_NAMED_MESH_NODE').length,license:proof.license,doi:proof.doi,creators:proof.creators,status:'EXACT_PUBLISHER_AND_PINNED_GLTF_BYTES',clinicalValidation:false,registrationValidated:false,approvedForDistribution:false});
  }catch(error){rows.push({id:e.id,version:e.version,status:'HOLD',reason:String(error.message).slice(0,500),approvedForDistribution:false});}
 }
 const matched=rows.filter(e=>e.status==='EXACT_PUBLISHER_AND_PINNED_GLTF_BYTES');
 const report={schema:1,publisherRevision:pin,matched:matched.length,held:rows.length-matched.length,exactNamedMeshNodes:matched.reduce((n,e)=>n+e.exactMeshNodeCount,0),rows,publicRelease:'NO_GO',registrationValidated:false,clinicalValidation:false,geometryPublished:0};
 console.log(config.marker+JSON.stringify(report));assert.equal(matched.length,spec.rows.length,'Source or metadata on hold');
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await audit(process.argv[2]||'female-five');
