// Pure viewer presentation state: no anatomical transforms or clinical claims.
export const OPACITY_MIN=15;
export const CACHE_SOFT_BYTES=256*1024*1024;
export function initialPresentation(){return {opacity:{},context:false,wireframe:false};}
export function setGroupOpacity(state,group,value){
 if(!Number.isFinite(Number(value)))return state;
 return {...state,opacity:{...state.opacity,[group]:Math.max(OPACITY_MIN,Math.min(100,Math.round(Number(value))))}};
}
export function effectiveOpacity(entry,state,selectedId){
 if(entry.id===selectedId)return 1;
 const own=(state.opacity[entry.group]??100)/100;
 return state.context&&selectedId?Math.min(own,.22):own;
}
export function materialKey(entry,kind,state,selectedId){
 const selected=entry.id===selectedId;
 return [selected?'highlight':kind,effectiveOpacity(entry,state,selectedId).toFixed(2),state.wireframe&&!selected?'wire':'solid'].join(':');
}
// Eviction applies only to hidden, unselected, non-inflight assets. Visible anatomy
// is never silently removed in order to enforce a memory target.
export function chooseEvictions(records,{limit=CACHE_SOFT_BYTES,selectedId=null,inflight=new Set()}={}){
 const total=records.reduce((n,r)=>n+r.bytes,0);
 let remaining=total;
 const ids=[];
 const eligible=records.filter(r=>!r.visible&&r.id!==selectedId&&!inflight.has(r.id)).sort((a,b)=>a.lastUsed-b.lastUsed||a.id.localeCompare(b.id));
 for(const r of eligible){if(remaining<=limit)break;ids.push(r.id);remaining-=r.bytes;}
 return {ids,total,remaining,aboveBudget:remaining>limit};
}
export function fitParameters(size,fov,aspect){
 if(!Array.isArray(size)||size.length!==3||!size.every(v=>Number.isFinite(v)&&v>=0)||!Number.isFinite(fov)||fov<=0||fov>=180||!Number.isFinite(aspect)||aspect<=0)throw Error('Invalid camera bounds');
 const radius=Math.max(Math.hypot(...size)/2,1e-8);
 const halfVertical=fov*Math.PI/360,halfHorizontal=Math.atan(Math.tan(halfVertical)*aspect);
 const distance=radius/Math.sin(Math.min(halfVertical,halfHorizontal))*1.12;
 return {distance,near:Math.max(radius*.0005,1e-10),far:Math.max(distance+radius*4,radius*100),radius};
}
export function nextPickedId(ids,selectedId,cycle=false){
 const unique=[...new Set(ids.filter(Boolean))];
 if(!unique.length)return null;
 if(!cycle)return unique[0];
 const i=unique.indexOf(selectedId);return unique[(i+1)%unique.length];
}
