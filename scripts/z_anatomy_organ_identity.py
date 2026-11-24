"""Conservative named organ identity rules and source-native coverage audit."""
import re
from collections import defaultdict

def key(value):
    n=' '.join(str(value).strip().lower().split())
    m=re.search(r'\.(l|r)$',n)
    if m: n=('left ' if m.group(1)=='l' else 'right ')+n[:-2]
    return n

# Explicit equivalences only; no inferred laterality, no parent-to-child substitution.
ALIASES={
 'hypophysis':'pituitary gland',
 'anterior lobe of pituitary gland':'adenohypophysis',
 'posterior lobe of pituitary gland':'neurohypophysis',
 'left suprarenal gland':'left adrenal gland','right suprarenal gland':'right adrenal gland',
 'suprarenal gland':'adrenal gland',
 'esophagus':'oesophagus','gall bladder':'gallbladder','cecum':'caecum',
 'appendix vermiformis':'vermiform appendix',
 'mitral valve':'left atrioventricular valve','bicuspid valve':'left atrioventricular valve',
 'tricuspid valve':'right atrioventricular valve',
 'left principal bronchus':'left main bronchus','right principal bronchus':'right main bronchus',
 'left upper lobe of lung':'superior lobe of left lung','right upper lobe of lung':'superior lobe of right lung',
 'left superior lobe of lung':'superior lobe of left lung','right superior lobe of lung':'superior lobe of right lung',
 'left lower lobe of lung':'inferior lobe of left lung','right lower lobe of lung':'inferior lobe of right lung',
 'left inferior lobe of lung':'inferior lobe of left lung','right inferior lobe of lung':'inferior lobe of right lung',
 'right middle lobe of lung':'middle lobe of right lung',
 'left atrial appendage':'left auricle of heart','right atrial appendage':'right auricle of heart'
}
def canonical(value): 
    n=key(value)
    return ALIASES.get(n,n)

# Each explicit name has one primary study group. A pancreatic organ can be
# referenced by both curricula without copying its geometry or inventing islets.
GROUPS={
 'respiratory':{
   ('headNeck',):{'larynx','epiglottis','nasal cavity','mucosa of nasal cavity'},
   ('headNeck','thorax'):{'trachea'},
   ('thorax',):{'lung','left lung','right lung','superior lobe of left lung','inferior lobe of left lung',
    'superior lobe of right lung','middle lobe of right lung','inferior lobe of right lung',
    'left main bronchus','right main bronchus','left superior lobar bronchus','left inferior lobar bronchus',
    'right superior lobar bronchus','right middle lobar bronchus','right inferior lobar bronchus',
    'right intermediate bronchus','pleura','left pleura','right pleura','visceral pleura','parietal pleura',
    'left visceral pleura','right visceral pleura','left parietal pleura','right parietal pleura'}
 },
 'endocrine':{
   ('headNeck',):{'pituitary gland','adenohypophysis','neurohypophysis','pineal gland','thyroid gland',
    'left lobe of thyroid gland','right lobe of thyroid gland','isthmus of thyroid gland',
    'left superior parathyroid gland','right superior parathyroid gland','left inferior parathyroid gland',
    'right inferior parathyroid gland','left parathyroid gland','right parathyroid gland','parathyroid gland'},
   ('abdomen',):{'adrenal gland','left adrenal gland','right adrenal gland'}
 },
 'heart':{
   ('thorax',):{'heart','left atrium','right atrium','left ventricle','right ventricle',
    'interatrial septum','interventricular septum','left auricle of heart','right auricle of heart',
    'left atrioventricular valve','right atrioventricular valve','aortic valve','pulmonary valve',
    'chordae tendineae','myocardium','endocardium','epicardium','pericardium','fibrous pericardium',
    'parietal layer of serous pericardium','visceral layer of serous pericardium'}
 },
 'digestive':{
   ('headNeck','thorax','abdomen'):{'oesophagus'},
   ('headNeck',):{'tongue','left parotid gland','right parotid gland','left submandibular gland',
    'right submandibular gland','left sublingual gland','right sublingual gland'},
   ('abdomen',):{'stomach','liver','gallbladder','bile duct','common bile duct','cystic duct',
    'pancreas','head of pancreas','body of pancreas','tail of pancreas','pancreatic duct','small intestine',
    'duodenum','jejunum','ileum','large intestine','caecum','vermiform appendix','ascending colon',
    'transverse colon','descending colon','greater omentum','lesser omentum','mesentery of small intestine'},
   ('abdomen','pelvis'):{'sigmoid colon'},('pelvis',):{'rectum','anal canal'}
 },
 'urinary':{
   ('abdomen',):{'left kidney','right kidney','left renal pelvis','right renal pelvis'},
   ('abdomen','pelvis'):{'left ureter','right ureter'},
   ('pelvis',):{'urinary bladder','urethra'}
 },
 'reproductive':{
   ('pelvis',):{'prostate','penis','left testis','right testis','left epididymis','right epididymis',
    'left ductus deferens','right ductus deferens','left seminal gland','right seminal gland'}
 }
}
LOOKUP={name:{'source':'cardiovascular' if group=='heart' else 'visceral','group':group,'layer':0,'regions':list(regions)}
        for group,by_region in GROUPS.items() for regions,names in by_region.items() for name in names}

def organ_identity(value, existing=None):
    n=canonical(value)
    exact=LOOKUP.get(n)
    if existing:
        # Never turn a vessel, nerve or unrelated catalog entry into an organ.
        if existing.get('source') not in {'visceral','cardiovascular'}: return None
        if existing['source']=='cardiovascular' and existing.get('group')!='heart': return None
        if existing['source']=='cardiovascular' and re.search(r'\b(artery|arteries|vein|veins|arterial|venous)\b',n): return None
        if exact and exact['source']==existing['source']:
            return {**existing,**exact}
        if existing['source']=='visceral' or existing.get('group')=='heart':
            return dict(existing)
        return None
    return dict(exact) if exact else None

def catalogue_index(catalogue):
    result=defaultdict(list)
    for name,meta in catalogue.items():
        if organ_identity(name,meta): result[canonical(name)].append((name,meta))
    return result

def organ_audit(catalogue,source_inventory,converted,blocked,excluded):
    catalog=catalogue_index(catalogue)
    raw=defaultdict(list); models=defaultdict(list); failed=defaultdict(list)
    for r in source_inventory:
        n=canonical(r['name'])
        if n in catalog or n in LOOKUP: raw[n].append(r)
    for e in converted:
        if e['system']=='visceral' or e.get('group')=='heart': models[canonical(e['name'])].append(e)
    for r in [*blocked,*excluded]: failed[canonical(r['name'])].append(r['reason'])
    rows=[]
    for n in sorted(set(catalog)|set(LOOKUP)|set(models)):
        candidates=models[n]; source=raw[n]; aliases=catalog.get(n,[])
        meta=organ_identity(n,aliases[0][1]) if len(aliases)==1 else LOOKUP.get(n)
        group=meta['group'] if meta else candidates[0].get('group','unknown') if candidates else 'unknown'
        status=('AMBIGUOUS_IDENTITY' if len(aliases)>1 or len(candidates)>1 else
                'EXPORTED_CANDIDATE' if candidates else 'EXPORT_BLOCKED' if failed[n] else
                'SOURCE_PRESENT_NOT_EXPORTED' if source else 'NO_EXACT_SOURCE_OBJECT')
        rows.append({'name':n,'group':group,'status':status,'sourceObjects':source,
                     'modelIds':[e['id'] for e in candidates],'reasons':failed[n]})
    summary={}
    for r in rows:
        counts=summary.setdefault(r['group'],{})
        counts[r['status']]=counts.get(r['status'],0)+1
    by_name={r['name']:r for r in rows}
    lobes=['superior lobe of right lung','middle lobe of right lung','inferior lobe of right lung',
           'superior lobe of left lung','inferior lobe of left lung']
    return {'rows':rows,'summary':summary,
            'fiveLobeCandidatesExported':all(by_name[n]['status']=='EXPORTED_CANDIDATE' for n in lobes),
            'lungLobes':[{ 'name':n,'status':by_name[n]['status']} for n in lobes],
            'pancreasNote':'Whole pancreas is not separate endocrine islet geometry.',
            'femaleAnatomyNote':'Female reference organs must remain in their own source frame.',
            'solidOrganSurfaceValidated':False,'parentChildOverlapValidated':False,
            'clinicalValidation':False,'publicRelease':'NO_GO'}
