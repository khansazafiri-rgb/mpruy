// Independent study-state logic. No coordinates inferred, no source geometry changed.
export const layerLabels={skeletal:['Tulang'],muscular:['Dalam','Menengah dalam','Menengah','Superfisial'],joints:['Sendi'],arterial:['Cabang kecil','Cabang utama','Trunkus'],venous:['Cabang kecil','Cabang utama','Trunkus'],heart:['Jantung'],nervous:['Cabang perifer','Saraf utama','Sistem pusat'],lymphatic:['Nodus','Pembuluh','Trunkus / organ'],respiratory:['Pernapasan'],digestive:['Pencernaan'],urinary:['Kemih'],reproductive:['Reproduksi'],endocrine:['Endokrin']};
export function normalizeName(n){return String(n).trim().toLowerCase().replace(/\s+/g,' ').replace(/^(.*)\.([lr])$/,(_m,x,s)=>(s==='l'?'left ':'right ')+x);}
const families=[
 ['right lung',['superior lobe of right lung','middle lobe of right lung','inferior lobe of right lung']],
 ['left lung',['superior lobe of left lung','inferior lobe of left lung']],
 ['thyroid gland',['left lobe of thyroid gland','right lobe of thyroid gland','isthmus of thyroid gland']],
 ['pituitary gland',['adenohypophysis','neurohypophysis']]
];
const aliases={'hypophysis':'pituitary gland','anterior lobe of pituitary gland':'adenohypophysis','posterior lobe of pituitary gland':'neurohypophysis'};
const canonical=n=>{n=normalizeName(n);return aliases[n]||n;};
export function buildAlternatives(entries){
 const index=new Map(),lookup=new Map();
 for(const e of entries){if(!['respiratory','endocrine'].includes(e.group))continue;const n=canonical(e.name);const a=lookup.get(n)||[];a.push(e);lookup.set(n,a);}
 for(const [whole,parts] of families){
  const parent=lookup.get(whole)||[],children=parts.map(n=>lookup.get(n)||[]);
  if(parent.length!==1||children.some(a=>a.length>1)||!children.some(a=>a.length)||children.flat().some(e=>e.group!==parent[0].group))continue;
  const family={key:whole,parent:parent[0].id,children:children.flat().map(e=>e.id),expected:parts.length};
  index.set(family.parent,{...family,kind:'whole'});
  for(const id of family.children)index.set(id,{...family,kind:'parts'});
 }
 return index;
}
export function initialStudy(){return {enabled:new Set(['skeletal']),minimumLayer:{},region:'whole',hidden:new Set(),isolated:null,representation:'auto',overrides:{}};}
export function baseVisible(e,s){
 if(s.isolated)return e.id===s.isolated;
 return s.enabled.has(e.group)&&!s.hidden.has(e.id)&&(s.region==='whole'||e.regions.includes(s.region))&&(e.layer??0)>=(s.minimumLayer[e.group]??0);
}
export function displayed(e,s,index,loaded,byId){
 if(!baseVisible(e,s))return false;
 if(s.isolated)return true;
 const f=index.get(e.id);if(!f)return true;
 const eligible=id=>loaded(id)&&byId.has(id)&&baseVisible(byId.get(id),s);
 if(!eligible(f.parent)||!f.children.some(eligible))return true;
 const requested=s.overrides[f.key]||s.representation;
 const mode=requested==='auto'?(f.children.filter(eligible).length===f.expected?'parts':'whole'):requested;
 return mode==='all'||f.kind===mode;
}
export function revealEntry(e,s,index){
 s.enabled.add(e.group);s.minimumLayer[e.group]=Math.min(s.minimumLayer[e.group]??0,e.layer??0);
 s.hidden.delete(e.id);s.isolated=null;
 if(s.region!=='whole'&&!e.regions.includes(s.region))s.region='whole';
 const f=index.get(e.id);if(f)s.overrides[f.key]=f.kind;
}
export function materialKind(e){
 const n=normalizeName(e.name);
 if(e.group==='nervous'){if(/\b(brain|cerebrum|cerebellum|brainstem)\b/.test(n)&&!/\bnerve\b/.test(n))return 'brain';if(n==='spinal cord')return 'spinalCord';}
 if(e.group==='lymphatic'){if(/\b(node|nodes)\b/.test(n))return 'lymphNode';if(/\b(duct|trunk|cisterna chyli|cistern)\b/.test(n))return 'lymphTrunk';if(/\b(vessel|vessels)\b/.test(n))return 'lymphVessel';if(/\bspleen\b/.test(n))return 'spleen';return 'lymphatic';}
 if(e.group==='respiratory'){if(/\b(pleura|pleural)\b/.test(n))return 'pleura';if(/\b(bronchus|bronchi|trachea|larynx)\b/.test(n))return 'airway';}
 return e.group;
}
