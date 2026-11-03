import {asset} from '../utils/paths.js';
import {fetchJson} from '../utils/fetchJson.js';
let manifest=null,pending;
export async function loadStructurePreviews(){
 if(!pending)pending=fetchJson('data/structure-thumbnails.json').then(data=>{manifest=data;return data;}).catch(()=>null);
 return pending;
}
export function structurePreview(id){
 const path=manifest?.structures?.[id]?.url;
 return typeof path==='string'&&/^thumbnails\/structures\/[a-f0-9]{24}\.webp$/.test(path)?asset(path):null;
}
export function regionPreview(id){
 const path=manifest?.regions?.[id]?.url;
 return typeof path==='string'&&/^thumbnails\/regions\/[A-Za-z]+\.webp$/.test(path)?asset(path):null;
}
