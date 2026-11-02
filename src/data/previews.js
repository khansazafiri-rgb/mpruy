import {asset} from '../utils/paths.js';
let manifest=null,pending;
export async function loadStructurePreviews(){
 if(!pending)pending=fetch(asset('data/structure-thumbnails.json')).then(r=>{if(!r.ok)throw Error('Preview manifest unavailable');return r.json();}).then(data=>{manifest=data;return data;}).catch(()=>null);
 return pending;
}
export function structurePreview(id){
 const path=manifest?.structures?.[id]?.url;
 return typeof path==='string'&&/^thumbnails\/structures\/[a-f0-9]{24}\.webp$/.test(path)?asset(path):null;
}
