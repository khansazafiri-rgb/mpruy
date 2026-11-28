// Independent source IDs only. Never resolve an old library name to a guessed mesh.
export const OPEN='medcoel:independent-library-open';
export const RESULT='medcoel:independent-library-result';
export const validId=id=>typeof id==='string'&&/^(bp|sel)-[a-f0-9]{24}$/.test(id);
const validRequest=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);
export function validOpen(event,origin,parent,self){
 const d=event?.data;
 return !!parent&&parent!==self&&event.source===parent&&event.origin===origin&&d?.version===1&&d.type===OPEN&&validId(d.structureId)&&validRequest(d.requestId)&&Object.keys(d).every(k=>['type','version','structureId','requestId'].includes(k));
}
export function validResult(event,origin,frame,requestId,structureId){
 const d=event?.data;
 return !!frame&&event.source===frame&&event.origin===origin&&d?.version===1&&d.type===RESULT&&validRequest(requestId)&&d.requestId===requestId&&validId(structureId)&&d.structureId===structureId&&typeof d.ok==='boolean'&&typeof d.message==='string'&&d.message.length<=240;
}
export function deepLink(search,hash=''){
 if(hash)return null;
 const params=new URLSearchParams(search);
 if([...params.keys()].some(k=>k!=='structure'&&k!=='utm_source'))return null;
 const values=params.getAll('structure');
 if(values.length===0)return '';
 return values.length===1&&validId(values[0])?values[0]:null;
}
export async function openKnownStructure(command,lookup,choose,visible){
 const e=lookup(command.structureId);
 if(!e||e.id!==command.structureId)return {ok:false,message:'Struktur tidak tersedia dalam katalog independen.'};
 const chosen=await choose(e);
 if(chosen!==true||!visible(e))return {ok:false,message:'Struktur tidak berhasil ditampilkan dan disorot.'};
 return {ok:true,message:'Struktur sumber berhasil disorot. Review privat.'};
}
