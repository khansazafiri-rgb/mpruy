// Exact source hierarchy links, derived from retained HRA audits (2026-11-26).
// Never a registered body model or whole-concept coverage claim.
export const HRA_LEARNING_LINKS=[
  {
    "group": "reproductive",
    "target": "uterus",
    "organ": "uterus-female",
    "label": "uterus",
    "ontologyId": "UBERON:0000995",
    "index": 1,
    "kind": "GROUP"
  },
  {
    "group": "reproductive",
    "target": "cervix of uterus",
    "organ": "uterus-female",
    "label": "uterine cervix",
    "ontologyId": "UBERON:0000002",
    "index": 9,
    "kind": "NODE"
  },
  {
    "group": "reproductive",
    "target": "ovary",
    "organ": "ovary-female-left",
    "label": "Left ovary",
    "ontologyId": "UBERON:0002119",
    "index": 0,
    "kind": "NODE"
  },
  {
    "group": "reproductive",
    "target": "left ovary",
    "organ": "ovary-female-left",
    "label": "Left ovary",
    "ontologyId": "UBERON:0002119",
    "index": 0,
    "kind": "NODE"
  },
  {
    "group": "reproductive",
    "target": "ovary",
    "organ": "ovary-female-right",
    "label": "Right ovary",
    "ontologyId": "UBERON:0002118",
    "index": 0,
    "kind": "NODE"
  },
  {
    "group": "reproductive",
    "target": "right ovary",
    "organ": "ovary-female-right",
    "label": "Right ovary",
    "ontologyId": "UBERON:0002118",
    "index": 0,
    "kind": "NODE"
  },
  {
    "group": "reproductive",
    "target": "uterine tube",
    "organ": "fallopian-tube-female-left",
    "label": "left uterine tube",
    "ontologyId": "UBERON:0001303",
    "index": 0,
    "kind": "GROUP"
  },
  {
    "group": "reproductive",
    "target": "left uterine tube",
    "organ": "fallopian-tube-female-left",
    "label": "left uterine tube",
    "ontologyId": "UBERON:0001303",
    "index": 0,
    "kind": "GROUP"
  },
  {
    "group": "reproductive",
    "target": "uterine tube",
    "organ": "fallopian-tube-female-right",
    "label": "right uterine tube",
    "ontologyId": "UBERON:0001302",
    "index": 0,
    "kind": "GROUP"
  },
  {
    "group": "reproductive",
    "target": "right uterine tube",
    "organ": "fallopian-tube-female-right",
    "label": "right uterine tube",
    "ontologyId": "UBERON:0001302",
    "index": 0,
    "kind": "GROUP"
  },
  {
    "group": "respiratory",
    "target": "left superior lobar bronchus",
    "organ": "lung-female",
    "label": "lobar bronchus of left lung upper lobe",
    "ontologyId": "UBERON:0012065",
    "index": 43,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "left inferior lobar bronchus",
    "organ": "lung-female",
    "label": "lobar bronchus of left lung lower lobe",
    "ontologyId": "UBERON:0012066",
    "index": 44,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "right middle lobar bronchus",
    "organ": "lung-female",
    "label": "Middle lobar bronchus",
    "ontologyId": "FMA:7401",
    "index": 61,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "right superior lobar bronchus",
    "organ": "lung-female",
    "label": "Right superior lobar bronchus",
    "ontologyId": "FMA:7397",
    "index": 62,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "right inferior lobar bronchus",
    "organ": "lung-female",
    "label": "Right inferior lobar bronchus",
    "ontologyId": "FMA:7404",
    "index": 63,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "left superior lobar bronchus",
    "organ": "lung-male",
    "label": "lobar bronchus of left lung upper lobe",
    "ontologyId": "UBERON:0012065",
    "index": 43,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "left inferior lobar bronchus",
    "organ": "lung-male",
    "label": "lobar bronchus of left lung lower lobe",
    "ontologyId": "UBERON:0012066",
    "index": 44,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "right middle lobar bronchus",
    "organ": "lung-male",
    "label": "Middle lobar bronchus",
    "ontologyId": "FMA:7401",
    "index": 62,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "right superior lobar bronchus",
    "organ": "lung-male",
    "label": "Right superior lobar bronchus",
    "ontologyId": "FMA:7397",
    "index": 63,
    "kind": "NODE"
  },
  {
    "group": "respiratory",
    "target": "right inferior lobar bronchus",
    "organ": "lung-male",
    "label": "Right inferior lobar bronchus",
    "ontologyId": "FMA:7404",
    "index": 68,
    "kind": "NODE"
  },
  {
    "group": "heart",
    "target": "interventricular septum",
    "organ": "heart-female",
    "label": "interventricular septum",
    "ontologyId": "UBERON:0002094",
    "index": 2,
    "kind": "NODE"
  },
  {
    "group": "heart",
    "target": "interventricular septum",
    "organ": "heart-male",
    "label": "interventricular septum",
    "ontologyId": "UBERON:0002094",
    "index": 16,
    "kind": "NODE"
  },
  {
    "group": "heart",
    "target": "papillary muscle",
    "organ": "heart-female",
    "label": "papillary muscle of heart",
    "ontologyId": "UBERON:0002494",
    "index": 7,
    "kind": "GROUP"
  },
  {
    "group": "heart",
    "target": "papillary muscle",
    "organ": "heart-male",
    "label": "papillary muscle of heart",
    "ontologyId": "UBERON:0002494",
    "index": 6,
    "kind": "GROUP"
  }
];
const key=s=>String(s).trim().toLowerCase();
export function hraLearningReferences(group,target,entries){
 const result=[];
 for(const link of HRA_LEARNING_LINKS.filter(x=>x.group===group&&x.target===key(target))){
  for(const e of entries){
   if(!/^[a-f0-9]{24}$/.test(e.id||'')||e.approvedForDistribution!==false||e.registrationValidated!==false||!e.source?.startsWith('https://cdn.humanatlas.io/digital-objects/ref-organ/'+link.organ+'/'))continue;
   const rows=link.kind==='GROUP'?e.sourceGroups:e.sourceCrosswalk;
   const c=rows?.filter(x=>x.index===link.index&&x.ontologyId===link.ontologyId&&key(x.label)===key(link.label))||[];
   if(c.length!==1)continue;
   result.push({id:'hra-'+e.id+'-'+link.index,assetId:e.id,nodeIndex:link.index,ontologyId:link.ontologyId,name:c[0].label,organ:link.organ,type:'HRA_SOURCE_COMPONENT',kind:link.kind});
  }
 }
 return result;
}
