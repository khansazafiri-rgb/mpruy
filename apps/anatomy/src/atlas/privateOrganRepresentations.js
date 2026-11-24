// Source-native representation alternatives; no geometric registration claim.
// Only explicit anatomical whole/part families. Heart chambers and valves,
// nerves, vessels and unrelated nearby surfaces are never auto-suppressed.
const families=[
 {id:'right-lung',whole:'right lung',parts:['superior lobe of right lung','middle lobe of right lung','inferior lobe of right lung']},
 {id:'left-lung',whole:'left lung',parts:['superior lobe of left lung','inferior lobe of left lung']},
 {id:'thyroid',whole:'thyroid gland',parts:['left lobe of thyroid gland','right lobe of thyroid gland','isthmus of thyroid gland']},
 {id:'pituitary',whole:'pituitary gland',parts:['adenohypophysis','neurohypophysis']}
];
const aliases=new Map([
 ['hypophysis','pituitary gland'],['anterior lobe of pituitary gland','adenohypophysis'],['posterior lobe of pituitary gland','neurohypophysis'],
 ['left upper lobe of lung','superior lobe of left lung'],['right upper lobe of lung','superior lobe of right lung'],
 ['left superior lobe of lung','superior lobe of left lung'],['right superior lobe of lung','superior lobe of right lung'],
 ['left lower lobe of lung','inferior lobe of left lung'],['right lower lobe of lung','inferior lobe of right lung'],
 ['left inferior lobe of lung','inferior lobe of left lung'],['right inferior lobe of lung','inferior lobe of right lung'],
 ['right middle lobe of lung','middle lobe of right lung']
]);
function label(name){
 let n=String(name).trim().toLowerCase().replace(/\s+/g,' ');
 const side=n.match(/\.(l|r)$/);
 if(side)n=(side[1]==='l'?'left ':'right ')+n.slice(0,-2);
 return aliases.get(n)||n;
}
export function representationIndex(catalog,available){
 const lookup=new Map();
 for(const [id,meta] of Object.entries(catalog)){
  if(meta.source!=='visceral'||!available(id,meta.source))continue;
  const k=label(id);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push(id);
 }
 const index=new Map();
 for(const f of families){
  const whole=lookup.get(f.whole)||[],parts=f.parts.map(n=>lookup.get(n)||[]);
  // No suppression if identity is ambiguous or no distinct parent/part pair.
  if(whole.length!==1||parts.some(x=>x.length>1)||!parts.some(x=>x.length))continue;
  const item={id:f.id,whole:whole[0],parts:parts.flat(),expectedParts:f.parts.length};
  index.set(item.whole,{...item,role:'whole'});
  for(const p of item.parts)index.set(p,{...item,role:'parts'});
 }
 return index;
}
export function representationVisible(id,index,loaded,settings,focus=null){
 const f=index.get(id);
 if(!f)return true;
 // Selection/isolation must never be hidden by the representation policy.
 if(focus===id)return true;
 const whole=loaded(f.whole),parts=f.parts.filter(loaded);
 if(!whole||!parts.length)return true;
 const requested=settings.representationOverrides?.[f.id]||settings.representationMode||'auto';
 const mode=requested==='auto'?(parts.length===f.expectedParts?'parts':'whole'):requested;
 return mode==='all'||f.role===mode;
}
export function focusRepresentation(id,index,settings){
 const f=index.get(id);if(!f)return;
 settings.representationOverrides={...settings.representationOverrides,[f.id]:f.role};
}
export function validRepresentationState(settings){
 const mode=settings?.representationMode||'auto';
 if(!['auto','whole','parts','all'].includes(mode))return false;
 const overrides=settings?.representationOverrides||{};
 return typeof overrides==='object'&&!Array.isArray(overrides)&&Object.entries(overrides).every(([id,value])=>families.some(f=>f.id===id)&&['whole','parts'].includes(value));
}
