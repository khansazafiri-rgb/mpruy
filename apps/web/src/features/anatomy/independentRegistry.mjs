// Private adapter for the original MEDCOEL Library presentation. Never load legacy data.
import {SYSTEMS,REGIONS,normalise} from './registry.mjs';
import {validateInventory} from '../../../../atlas-independent/src/inventory.js';
import {validateElementCatalog} from '../../../../atlas-independent/src/element-selection.js';
import {validId} from '../../../../atlas-independent/src/library-bridge.js';
const map={skeletal:'skeletal',muscular:'muscular',joints:'joints',arterial:'cardiovascular',venous:'cardiovascular',heart:'cardiovascular',nervous:'nervous',lymphatic:'lymphatic',respiratory:'visceral',digestive:'visceral',urinary:'visceral',reproductive:'visceral',endocrine:'visceral'};
const source='https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html';
export function buildIndependentRegistry(manifest,selection=null,recovery=null,host='127.0.0.1'){
 if(manifest?.sourceKind!=='independent-bp3d')throw Error('Katalog bukan sumber independen.');
 const body=validateInventory(manifest,host),elements=selection?validateElementCatalog(selection,body):[];
 let extras=[];
 if(recovery){
  if(recovery.schema!==1||recovery.publicRelease!=='NO_GO'||recovery.clinicalValidation!==false||recovery.registrationValidated!==false||![null,'NATIVE_FRAME_CANDIDATE'].includes(recovery.contextMode)||!Array.isArray(recovery.items))throw Error('Katalog pemulihan tidak valid.');
  extras=recovery.items;
  for(const e of extras)if(!/^bp-[a-f0-9]{24}$/.test(e.id)||!/^FMA\d+$/.test(e.fmaId)||!/^BP\d+$/.test(e.bpId)||typeof e.name!=='string'||!e.name.trim()||!Object.hasOwn(map,e.group)||e.priorityOnly!==true||typeof e.contextCandidate!=='boolean'||(e.contextCandidate&&recovery.contextMode!=='NATIVE_FRAME_CANDIDATE')||e.path!=='priority-recovery/'+e.id+'.glb'||e.source!=='BodyParts3D 4.0'||e.classificationProvisional!==true||e.approvedForDistribution!==false||e.clinicalValidation!==false||!['isa','partof'].includes(e.sourceTree))throw Error('Identitas pemulihan tidak valid.');
 }
 const ids=new Set(),fmas=new Set(),rows=[];
 for(const e of [...body,...elements,...extras.sort((a,b)=>Number(b.contextCandidate)-Number(a.contextCandidate))]){
  if(!validId(e.id)||ids.has(e.id)||!Object.hasOwn(map,e.group))throw Error('Identitas pustaka tidak valid.');
  ids.add(e.id);
  if(fmas.has(e.fmaId))continue;fmas.add(e.fmaId);
  const name=e.name.trim(),representation=e.selectionOnly?'exact-element-selection':e.contextCandidate?'native-context-candidate':e.priorityOnly?'isolated-source-reference':'body';
  rows.push({id:e.id,base:e.fmaId,fmaId:e.fmaId,bpId:e.bpId,name,nameKnown:true,latin:'',side:null,system:map[e.group],group:e.group,regions:[],bounds:null,aliases:[],definition:'',sources:[source],thumbnail:null,parentId:null,available:true,search:normalise([name,e.fmaId,e.bpId].join(' ')),nameKey:normalise(name),representation,clinicalValidation:false,approvedForDistribution:false});
 }
 rows.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id));
 return {schemaVersion:1,sourceCommit:'independent-bp3d-private-review',privateReview:true,previews:{},rows,byId:new Map(rows.map(r=>[r.id,r])),systems:SYSTEMS.map(s=>({...s,count:rows.filter(r=>r.system===s.id).length})),regions:REGIONS.filter(r=>r.id==='whole').map(r=>({...r,count:rows.length}))};
}
export async function fetchIndependentRegistry(fetcher=globalThis.fetch,host=globalThis.location?.hostname){
 if(host!=='127.0.0.1')throw Error('Pustaka hanya tersedia pada loopback.');
 async function load(name,optional=false){
  const r=await fetcher('/anatomy/viewer/'+name,{cache:'no-store'});
  if(optional&&r.status===404)return null;
  if(!r.ok||!(r.headers.get('content-type')||'').includes('json'))throw Error('Katalog sumber tidak tersedia: '+name);
  return r.json();
 }
 const [manifest,selection,recovery]=await Promise.all([load('inventory.json'),load('element-selection.json',true),load('priority-recovery/inventory.json',true)]);
 return buildIndependentRegistry(manifest,selection,recovery,host);
}
