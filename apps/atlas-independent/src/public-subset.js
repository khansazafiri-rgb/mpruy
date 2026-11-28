// A separate, exact-asset educational product. The legacy private validator is
// unchanged; this module never turns NO_GO review inventories into public ones.
import {groups} from './inventory.js';
export const SUBSET_PRODUCT='medcoel-human-anatomy-independent-subset';
export const PUBLIC_HOSTS=new Set(['127.0.0.1','localhost','medcoel.com','www.medcoel.com']);
const hex=/^[a-f0-9]{64}$/;
export function subsetBuildPin(){return import.meta.env?.VITE_MEDCOEL_SUBSET_PIN||'';}
export function subsetHostAllowed(host,pin){return hex.test(pin||'')&&PUBLIC_HOSTS.has(host);}
export function assetPinRows(entries){return entries.map(e=>[e.id,e.name,e.group,e.fmaId,e.bpId,e.path,e.sha256,e.bytes,e.license]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);}
export async function sha256Bytes(bytes,subtle=globalThis.crypto?.subtle){if(!subtle)throw Error('SHA-256 tidak tersedia');return [...new Uint8Array(await subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function verifySubsetInventory(doc,host,pin,subtle=globalThis.crypto?.subtle){
 if(!subsetHostAllowed(host,pin)||doc?.schema!==1||doc.mode!=='licensed-educational-subset'||doc.product!==SUBSET_PRODUCT||doc.publicRelease!=='PUBLIC_LICENSE_EVIDENCE_VERIFIED'||doc.sourceKind!=='independent-bp3d'||doc.sourceFrame!=='native-official-OBJ'||doc.assetSetSHA256!==pin||doc.clinicalValidation!==false||doc.registrationValidated!==false||!Array.isArray(doc.entries)||!doc.entries.length||doc.entries.length>2500)throw Error('Paket subset tidak cocok dengan build ini');
 const ids=new Set();
 for(const e of doc.entries){
  if(!/^bp-[a-f0-9]{24}$/.test(e.id||'')||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!Object.hasOwn(groups,e.group)||!/^FMA\d+$/.test(e.fmaId||'')||!/^BP\d+$/.test(e.bpId||'')||e.source!=='BodyParts3D 4.0'||e.classificationProvisional!==true||e.path!=='models/'+e.id+'.glb'||e.license!=='CC-BY-4.0'||e.approvedForDistribution!==true||!hex.test(e.sha256||'')||!Number.isSafeInteger(e.bytes)||e.bytes<20||e.bytes>64*1024*1024||!Array.isArray(e.regions)||e.regions.length!==1||e.regions[0]!=='whole'||e.layer!==undefined||typeof e.attribution!=='string'||!e.attribution.includes('Database Center for Life Science'))throw Error('Identitas aset subset tidak valid');
  ids.add(e.id);
 }
 const digest=await sha256Bytes(new TextEncoder().encode(JSON.stringify(assetPinRows(doc.entries))),subtle);
 if(digest!==pin)throw Error('Inventaris subset berubah dari pin build');
 return doc.entries;
}
export async function verifiedSubsetModel(buffer,entry,subtle=globalThis.crypto?.subtle){
 if(buffer.byteLength!==entry.bytes||await sha256Bytes(buffer,subtle)!==entry.sha256)throw Error('Checksum model berbeda dari subset berizin');
 return buffer;
}
