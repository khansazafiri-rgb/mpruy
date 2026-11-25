// Private host protocol. No legacy structure ID mapping or arbitrary viewer commands.
export const STATUS='medcoel:independent-atlas-status';
export const PING='medcoel:independent-atlas-ping';
export const states=['loading','interactive','partial','error'];
export function validStatus(event,origin,frame){
 const d=event?.data;
 return !!frame&&event.origin===origin&&event.source===frame&&d?.type===STATUS&&d.version===1&&states.includes(d.state)&&typeof d.message==='string'&&d.message.length<=240;
}
export function validPing(event,origin,parent){
 return !!parent&&event?.source===parent&&event.origin===origin&&event.data?.type===PING&&event.data.version===1;
}
