// Small, explicitly scoped educational glossary. Source identities and original
// labels are unchanged. Translation and synonym candidates need medical review.
const glossary={
 FMA52590:{source:'Cauda equina',id:['cauda equina','kauda ekuina'],en:['cauda equina'],latin:['cauda equina'],side:null},
 FMA37068:{source:'Left median nerve',id:['saraf median kiri','nervus medianus kiri'],en:['left median nerve','median nerve left'],latin:['nervus medianus sinister'],side:'left'},
 FMA37321:{source:'Left ulnar nerve',id:['saraf ulnaris kiri','nervus ulnaris kiri'],en:['left ulnar nerve','ulnar nerve left'],latin:['nervus ulnaris sinister'],side:'left'},
 FMA37071:{source:'Left radial nerve',id:['saraf radialis kiri','nervus radialis kiri'],en:['left radial nerve','radial nerve left'],latin:['nervus radialis sinister'],side:'left'},
 FMA37074:{source:'Left axillary nerve',id:['saraf aksilaris kiri','nervus axillaris kiri'],en:['left axillary nerve','axillary nerve left'],latin:['nervus axillaris sinister'],side:'left'},
 FMA37066:{source:'Left musculocutaneous nerve',id:['saraf muskulokutaneus kiri','nervus musculocutaneus kiri'],en:['left musculocutaneous nerve','musculocutaneous nerve left'],latin:['nervus musculocutaneus sinister'],side:'left'},
 FMA18157:{source:'Trunk of left vagus nerve',id:['trunkus nervus vagus kiri','batang saraf vagus kiri'],en:['trunk of left vagus nerve','left vagus nerve trunk'],latin:['truncus nervi vagi sinistri'],side:'left'},
 FMA18151:{source:'Trunk of right vagus nerve',id:['trunkus nervus vagus kanan','batang saraf vagus kanan'],en:['trunk of right vagus nerve','right vagus nerve trunk'],latin:['truncus nervi vagi dextri'],side:'right'},
 FMA49178:{source:'Isthmus of thyroid gland',id:['ismus kelenjar tiroid','isthmus tiroid'],en:['isthmus of thyroid gland','thyroid isthmus'],latin:['isthmus glandulae thyroideae'],side:null},
 FMA13111:{source:'Right external jugular vein',id:['vena jugularis eksterna kanan','vena jugular eksternal kanan'],en:['right external jugular vein','external jugular vein right'],latin:['vena jugularis externa dextra'],side:'right'}
};
const normalize=s=>String(s??'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
function row(e){const r=glossary[e?.fmaId];return r&&normalize(r.source)===normalize(e.name)?r:null;}
const left=new Set(['left','kiri','sinister','sinistra','sinistrum','sinistri','sinistrae']),right=new Set(['right','kanan','dexter','dextra','dextrum','dextri','dextrae']);
function sideOf(s){const tokens=normalize(s).split(' '),l=tokens.some(t=>left.has(t)),r=tokens.some(t=>right.has(t));return l&&r?'conflict':l?'left':r?'right':null;}
function editDistance(a,b){let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const n=[i];for(let j=1;j<=b.length;j++)n[j]=Math.min(n[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=n;}return p[b.length];}
export function challengeLabel(e,lang){const r=row(e);return r?.[lang]?.[0]||e.name;}
export function typedReferenceAnswer(e,input){
 const r=row(e),v=normalize(input);if(!r||!v||v.length>120)return {correct:false,kind:'NO_MATCH'};
 const side=sideOf(v);if(side!==r.side)return {correct:false,kind:'LATERALITY'};
 const aliases=[r.source,...r.id,...r.en,...r.latin].map(normalize);
 if(aliases.includes(v))return {correct:true,kind:'EXACT'};
 // Only one edit inside a long non-laterality token. No token omission,
 // reordering, approximate side, or acceptance of another concept's synonym.
 const allOthers=Object.values(glossary).filter(x=>x!==r).flatMap(x=>[x.source,...x.id,...x.en,...x.latin]).map(normalize);
 if(allOthers.includes(v))return {correct:false,kind:'OTHER_CONCEPT'};
 function close(a){const x=a.split(' '),y=v.split(' ');if(x.length!==y.length)return false;let differences=0;for(let i=0;i<x.length;i++){if(x[i]===y[i])continue;if(left.has(x[i])||right.has(x[i])||left.has(y[i])||right.has(y[i])||Math.min(x[i].length,y[i].length)<6||editDistance(x[i],y[i])!==1)return false;differences++;}return differences===1;}
 if(aliases.some(close)&&!allOthers.some(close))return {correct:true,kind:'MINOR_TYPO'};
 return {correct:false,kind:'NO_MATCH'};
}

export function hasChallengeGlossary(e){return Boolean(row(e));}
