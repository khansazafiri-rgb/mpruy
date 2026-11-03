export const LIBRARY_COMMAND='medcoel:anatomy-library-select';
export const LIBRARY_RESULT='medcoel:anatomy-library-result';
export const LIBRARY_PICK='medcoel:anatomy-library-pick';
export const validStructureId=id=>typeof id==='string'&&id.length>0&&id.length<=240&&[...id].every(char=>char.charCodeAt(0)>=32);
const regions=['whole','headNeck','thorax','abdomen','pelvis','upperLimb','lowerLimb','back'];
const systems=['','skeletal','muscular','joints','cardiovascular','nervous','lymphatic','visceral'];
const validScope=d=>d.mode!=='find'||(regions.includes(d.region)&&systems.includes(d.system));
const validRequest=id=>typeof id==='string'&&/^[\w-]{8,100}$/.test(id);
export function acceptsLibraryCommand(event,origin,parentWindow,selfWindow) {
 const d=event.data;
 return !!parentWindow&&parentWindow!==selfWindow&&event.origin===origin&&event.source===parentWindow&&d?.version===1&&d.type===LIBRARY_COMMAND&&validRequest(d.requestId)&&validStructureId(d.structureId)&&validScope(d)&&['explore','identify','find'].includes(d.mode);
}
export function acceptsLibraryEvent(event,origin,viewerWindow,requestId) {
 if(!viewerWindow||event.origin!==origin||event.source!==viewerWindow)return false;
 const d=event.data;
 if(d?.version!==1||d.requestId!==requestId||!validRequest(d.requestId))return false;
 if(d.type===LIBRARY_RESULT)return typeof d.ok==='boolean'&&(d.ok?validStructureId(d.structureId):typeof d.message==='string'&&d.message.length<=300);
 return d.type===LIBRARY_PICK&&d.intent==='answer'&&validStructureId(d.structureId);
}
