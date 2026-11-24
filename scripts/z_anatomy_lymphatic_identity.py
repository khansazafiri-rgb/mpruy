"""Source-native lymphatic identity and gap audit. No inferred connections."""
import re
from collections import defaultdict

def key(value):
    n=' '.join(str(value).strip().lower().split())
    side=re.search(r'\.(l|r)$',n)
    if side:
        n=('left ' if side.group(1)=='l' else 'right ')+n[:-2]
    # Publisher parentheses around optional named nodes are notation only.
    return n.replace('(','').replace(')','')

ALIASES={'ductus thoracicus':'thoracic duct','ductus lymphaticus dexter':'right lymphatic duct',
         'chyle cistern':'cisterna chyli','intestinal trunk':'intestinal lymphatic trunk',
         'jugular trunk':'jugular lymphatic trunk','subclavian trunk':'subclavian lymphatic trunk',
         'bronchomediastinal trunk':'bronchomediastinal lymphatic trunk',
         'lumbar trunk':'lumbar lymphatic trunk'}
MIDLINE={'thoracic duct':('abdomen','thorax','headNeck'),
         'right lymphatic duct':('headNeck','thorax'),
         'cisterna chyli':('abdomen',),
         'intestinal lymphatic trunk':('abdomen',)}
TRUNKS={'jugular lymphatic trunk':('headNeck',),
        'subclavian lymphatic trunk':('upperLimb','thorax','headNeck'),
        'bronchomediastinal lymphatic trunk':('thorax',),
        'lumbar lymphatic trunk':('abdomen','pelvis')}
ORGANS={'thymus':('thorax',),'left lobe of thymus':('thorax',),'right lobe of thymus':('thorax',),
        'spleen':('abdomen',),'palatine tonsil':('headNeck',),'lingual tonsil':('headNeck',),
        'pharyngeal tonsil':('headNeck',),'tubal tonsil':('headNeck',)}
NODES={'cervical lymph nodes':('headNeck',),'deep cervical lymph nodes':('headNeck',),
       'superficial cervical lymph nodes':('headNeck',),'axillary lymph nodes':('upperLimb','thorax'),
       'inguinal lymph nodes':('pelvis','lowerLimb'),'superficial inguinal lymph nodes':('pelvis','lowerLimb'),
       'deep inguinal lymph nodes':('pelvis','lowerLimb'),'popliteal lymph nodes':('lowerLimb',),
       'mesenteric lymph nodes':('abdomen',),'mediastinal lymph nodes':('thorax',),
       'iliac lymph nodes':('pelvis',),'parasternal lymph nodes':('thorax',)}
REGIONAL_VESSELS={'head and neck':('headNeck',),'neck':('headNeck',),'head':('headNeck',),
                  'upper limb':('upperLimb',),'arm':('upperLimb',),'forearm':('upperLimb',),
                  'hand':('upperLimb',),'lower limb':('lowerLimb',),'thigh':('lowerLimb',),
                  'leg':('lowerLimb',),'foot':('lowerLimb',),'thorax':('thorax',),
                  'abdomen':('abdomen',),'pelvis':('pelvis',),'breast':('thorax',)}

def canonical(value):
    n=key(value)
    if n in ALIASES: return ALIASES[n]
    m=re.match(r'^(left|right) (.+)$',n)
    return m.group(1)+' '+ALIASES.get(m.group(2),m.group(2)) if m else n

def lymphatic_identity(value, existing=None):
    n=canonical(value)
    base=re.sub(r'^(left|right) ','',n)
    # Existing exact catalogue matches retain original regional evidence.
    if existing and existing.get('source')=='lymphatic':
        regions=existing.get('regions') or ['whole']
        if re.search(r'\b(node|nodes)\b',n): kind='node'
        elif n in ORGANS or base in ORGANS: kind='organ'
        elif n in MIDLINE or base in TRUNKS: kind='trunk'
        elif re.search(r'\blymphatic vessels?\b',n): kind='vessel'
        else: kind='other'
    elif n in MIDLINE: kind='trunk'; regions=MIDLINE[n]
    elif base in TRUNKS: kind='trunk'; regions=TRUNKS[base]
    elif n in ORGANS or base in ORGANS: kind='organ'; regions=ORGANS.get(n,ORGANS.get(base))
    elif base in NODES: kind='node'; regions=NODES[base]
    elif base in {'lymphatic vessel','lymphatic vessels','lymphatic capillary','lymphatic capillaries',
                  'afferent lymphatic vessel','efferent lymphatic vessel','lymphatic duct'}:
        kind='vessel'; regions=['whole']
    else:
        m=re.fullmatch(r'(?:superficial |deep |afferent |efferent )?lymphatic vessels? of (?:the )?(?:(?:left|right) )?(.+)',base)
        if not m or m.group(1) not in REGIONAL_VESSELS: return None
        kind='vessel'; regions=REGIONAL_VESSELS[m.group(1)]
    # Outer nodes, regional vessels, deeper central trunks and organs.
    layer={'node':0,'vessel':1,'trunk':2,'organ':2,'other':0}[kind]
    return {**(existing or {}),'source':'lymphatic','group':'lymphatic','layer':layer,
            'regions':list(regions),'lymphaticKind':kind}

def priorities():
    result=set(MIDLINE)|set(ORGANS)
    result.update(side+' '+n for n in TRUNKS for side in ('left','right'))
    result.update(side+' '+n for n in NODES for side in ('left','right'))
    result.update('lymphatic vessels of '+n for n in REGIONAL_VESSELS)
    return result

def lymphatic_audit(catalogue,source_inventory,converted,blocked,excluded):
    catalogue_names={canonical(n):m for n,m in catalogue.items() if m.get('source')=='lymphatic'}
    raw=defaultdict(list); mounted=defaultdict(list); failed=defaultdict(list)
    for r in source_inventory:
        n=canonical(r['name'])
        if lymphatic_identity(n,catalogue_names.get(n)): raw[n].append(r)
    for e in converted:
        if e.get('system')=='lymphatic': mounted[canonical(e['name'])].append(e)
    for r in [*blocked,*excluded]: failed[canonical(r['name'])].append(r['reason'])
    rows=[]
    for n in sorted(set(catalogue_names)|priorities()|set(raw)|set(mounted)):
        meta=lymphatic_identity(n,catalogue_names.get(n))
        models=mounted[n]; source=raw[n]
        kind=meta['lymphaticKind'] if meta else 'other'
        status=('AMBIGUOUS_EXPORTED_IDENTITY' if len(models)>1 else 'EXPORTED_CANDIDATE' if models else
                'EXPORT_BLOCKED' if failed[n] else 'SOURCE_PRESENT_NOT_EXPORTED' if source else 'NO_EXACT_SOURCE_OBJECT')
        rows.append({'name':n,'kind':kind,'status':status,'sourceObjects':source,'modelIds':[e['id'] for e in models],
                     'reasons':failed[n]})
    counts={k:sum(e.get('privateAtlasMeta',{}).get('lymphaticKind')==k for e in converted if e.get('system')=='lymphatic')
            for k in ('node','vessel','trunk','organ','other')}
    return {'rows':rows,'exportedByKind':counts,'summary':{s:sum(r['status']==s for r in rows) for s in sorted({r['status'] for r in rows})},
            'hasExportedVesselCandidates':counts['vessel']+counts['trunk']>0,
            'networkContinuityValidated':False,'clinicalValidation':False,'publicRelease':'NO_GO'}
