export const SPATIAL_SOURCE='a874a3dcb111d5b4de543c5be6253f5013416f4d';
export const SYSTEMS=[['skeletal','Skeletal','Bones & cartilage'],['muscular','Muscular','Muscles & fascia'],['joints','Joints','Joints & ligaments'],['cardiovascular','Cardiovascular','Heart, arteries & veins'],['nervous','Nervous','Nerves & senses'],['lymphatic','Lymphatic','Lymphoid structures'],['visceral','Visceral','Organs & viscera']].map(([id,name,description])=>({id,name,description}));
export const REGIONS=[['headNeck','Head & Neck','Skull, face and neck'],['thorax','Thorax','Chest and mediastinum'],['abdomen','Abdomen','Abdominal wall and organs'],['pelvis','Pelvis','Pelvis and perineum'],['upperLimb','Upper Limb','Shoulder to fingertips'],['lowerLimb','Lower Limb','Hip and thigh to toes'],['back','Back','Vertebral column and back muscles'],['whole','Whole body','All available structures']].map(([id,name,description])=>({id,name,description}));
export const normalise=text=>String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const baseName=id=>id.replace(/\.[lr]$/,'');
export function structureHref(id){return '/anatomy/structure/'+encodeURIComponent(id);}
export function exploreHref(id){return '/anatomy/explore'+(id?'?structure='+encodeURIComponent(id):'');}
export function buildRegistry({systems,catalog,lexicon={},definitions={},synonyms={},reference={},previews={}}) {
 if(!systems||!catalog||typeof systems!=='object'||typeof catalog!=='object')throw Error('Anatomy metadata is incomplete');
 const rows=[],seen=new Set();
 for(const system of SYSTEMS) {
  const ids=systems[system.id];if(!Array.isArray(ids))throw Error('Missing anatomy system: '+system.id);
  for(const id of ids) {
   if(typeof id!=='string'||seen.has(id))throw Error('Duplicate or invalid mesh identity');seen.add(id);
   const meta=catalog[id],base=baseName(id),latin=lexicon[base]?.la||'',side=/\.([lr])$/.exec(id)?.[1];
   const clean=base.replace(/^\((.*)\)$/,'$1').trim(),nameKnown=!clean.includes('?')&&/\p{L}{2}/u.test(clean),name=(nameKnown?clean:'Unlabelled structure')+(side?` (${side==='r'?'right':'left'})`:'');
   const aliases=new Set(synonyms[normalise(base)]||synonyms[base.toLowerCase()]||[]);
   // Each locale is its own dictionary. Additional Indonesian entries need no search-engine change.
   for(const dictionary of Object.values(reference.synonyms||{}))for(const [term,values] of Object.entries(dictionary)) {
    if(normalise(base).includes(normalise(term))||(meta?.group==='heart'&&term==='heart'))for(const value of values)aliases.add(value);
   }
   const regions=(meta?.regions||[]).filter(r=>REGIONS.some(v=>v.id===r&&r!=='whole'));
   const raw=typeof definitions[base]==='string'?definitions[base]:'',urls=raw.match(/https?:\/\/[^\s]+/g)||[];
   rows.push({thumbnail:previewPath(previews.structures?.[id]?.url),parentId:previews.structures?.[id]?.parentId||null,id,base,name,nameKnown,latin,side:side==='r'?'right':side==='l'?'left':null,system:system.id,regions,group:meta?.group||system.id,bounds:Array.isArray(meta?.box)?[...meta.box]:null,aliases:[...aliases],definition:raw.replace(/https?:\/\/[^\s]+/g,'').trim(),sources:urls.filter(u=>{try{return ['http:','https:'].includes(new globalThis.URL(u).protocol);}catch{return false;}}),available:meta?.source===system.id&&Array.isArray(meta.box)&&meta.box.length===6&&meta.box.every(Number.isFinite),search:normalise([id,name,latin,...aliases].join(' ')),nameKey:normalise(name)});
  }
 }
 rows.sort((a,b)=>Number(b.nameKnown)-Number(a.nameKnown)||a.name.localeCompare(b.name,'en'));
 const byId=new Map(rows.map(r=>[r.id,r]));
 return {schemaVersion:1,sourceCommit:SPATIAL_SOURCE,previews,rows,byId,systems:SYSTEMS.map(s=>({...s,count:rows.filter(r=>r.system===s.id).length})),regions:REGIONS.map(r=>({...r,count:rows.filter(s=>r.id==='whole'||s.regions.includes(r.id)).length}))};
}
export function filterStructures(registry,{query='',system='',region=''}={}) {
 if(system&&!SYSTEMS.some(s=>s.id===system))return [];
 if(region&&!REGIONS.some(r=>r.id===region))return [];
 const q=normalise(query),tokens=q.split(' ').filter(Boolean);
 const scored=registry.rows.filter(r=>(!system||r.system===system)&&(!region||region==='whole'||r.regions.includes(region))&&tokens.every(t=>r.search.includes(t))).map(row=>({row,rank:!q?0:normalise(row.id)===q||row.nameKey===q?0:normalise(row.base)===q?1:row.nameKey.startsWith(q)?2:normalise(row.latin).startsWith(q)?3:4}));
 return scored.sort((a,b)=>a.rank-b.rank||Number(b.row.nameKnown)-Number(a.row.nameKnown)||a.row.name.localeCompare(b.row.name,'en')).map(x=>x.row);
}
export function relatedStructures(registry,row,limit=8) {
 if(!row)return [];
 const distance=r=>!r.bounds||!row.bounds?Infinity:[0,1,2].reduce((sum,i)=>sum+((r.bounds[i]+r.bounds[i+3]-row.bounds[i]-row.bounds[i+3])/2)**2,0);
 return registry.rows.filter(r=>r.nameKnown&&r.id!==row.id&&r.system===row.system&&(r.base===row.base||r.regions.some(v=>row.regions.includes(v)))).map(r=>({r,rank:r.base===row.base?0:r.group===row.group?1:2,distance:distance(r)})).sort((a,b)=>a.rank-b.rank||a.distance-b.distance||a.r.name.localeCompare(b.r.name,'en')).slice(0,limit).map(x=>x.r);
}

// Accept only local, generated atlas assets. Never send searches or identifiers to an image service.
export function previewPath(path){return typeof path==='string'&&/^thumbnails\/(?:structures\/[a-f0-9]{24}|regions\/[a-zA-Z]+|hero)\.webp$/.test(path)?path:null;}
export function browseStructures(rows){
 const extent=r=>r.bounds?Math.max(...[0,1,2].map(i=>r.bounds[i+3]-r.bounds[i])):0;
 return [...rows].sort((a,b)=>Number(b.nameKnown)-Number(a.nameKnown)||Number(!!a.parentId)-Number(!!b.parentId)||extent(b)-extent(a)||a.name.localeCompare(b.name,'en'));
}
