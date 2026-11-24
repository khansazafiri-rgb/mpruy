"""Explicit neural identity and coverage rules for private source-native review.
No inferred source presence, no fabricated connecting geometry, no release approval.
"""
import re
from collections import defaultdict

def label_key(value):
    n=' '.join(str(value).strip().lower().split())
    m=re.search(r'\.(l|r)$',n)
    return ('left ' if m.group(1)=='l' else 'right ')+n[:-2] if m else n

# Only these unambiguous synonyms are used for identity comparisons.
ALIASES={
    'medulla spinalis':'spinal cord',
    'medulla oblongata':'medulla oblongata',
    'common peroneal nerve':'common fibular nerve',
    'deep peroneal nerve':'deep fibular nerve',
    'superficial peroneal nerve':'superficial fibular nerve',
    'brain stem':'brainstem'
}
CENTRAL_HEAD={
    'brain','cerebrum','cerebral hemisphere','cerebellum','cerebellar hemisphere',
    'brainstem','brain stem','midbrain','pons','medulla oblongata','thalamus','hypothalamus',
    'corpus callosum','fornix','hippocampus','amygdala','caudate nucleus','putamen','globus pallidus',
    'internal capsule','external capsule','insula','frontal lobe','parietal lobe','temporal lobe',
    'occipital lobe','precentral gyrus','postcentral gyrus','cingulate gyrus','olfactory bulb',
    'olfactory tract','optic chiasm','optic tract','cerebellar vermis','superior cerebellar peduncle',
    'middle cerebellar peduncle','inferior cerebellar peduncle'
}
CRANIAL={
    'olfactory nerve','optic nerve','oculomotor nerve','trochlear nerve','trigeminal nerve',
    'abducens nerve','facial nerve','vestibulocochlear nerve','glossopharyngeal nerve',
    'vagus nerve','accessory nerve','hypoglossal nerve','ophthalmic nerve','maxillary nerve',
    'mandibular nerve','infraorbital nerve','supraorbital nerve','mental nerve','lingual nerve',
    'inferior alveolar nerve','buccal nerve','greater occipital nerve','lesser occipital nerve',
    'greater auricular nerve','transverse cervical nerve','trigeminal ganglion','ciliary ganglion',
    'pterygopalatine ganglion','otic ganglion','submandibular ganglion'
}
UPPER={
    'brachial plexus','axillary nerve','musculocutaneous nerve','median nerve','ulnar nerve',
    'radial nerve','suprascapular nerve','long thoracic nerve','thoracodorsal nerve',
    'dorsal scapular nerve','medial pectoral nerve','lateral pectoral nerve',
    'medial cutaneous nerve of arm','medial cutaneous nerve of forearm',
    'lateral cutaneous nerve of forearm','posterior cutaneous nerve of forearm',
    'superficial branch of radial nerve','deep branch of radial nerve',
    'anterior interosseous nerve','posterior interosseous nerve'
}
LOWER={
    'lumbar plexus','sacral plexus','lumbosacral plexus','sciatic nerve','femoral nerve',
    'obturator nerve','tibial nerve','common fibular nerve','deep fibular nerve',
    'superficial fibular nerve','sural nerve','saphenous nerve','superior gluteal nerve',
    'inferior gluteal nerve','posterior femoral cutaneous nerve','lateral femoral cutaneous nerve',
    'medial plantar nerve','lateral plantar nerve','pudendal nerve','genitofemoral nerve',
    'ilioinguinal nerve','iliohypogastric nerve'
}
TRUNK={'phrenic nerve','intercostal nerve','subcostal nerve','sympathetic trunk',
       'greater splanchnic nerve','lesser splanchnic nerve','least splanchnic nerve',
       'pelvic splanchnic nerve','celiac plexus','superior hypogastric plexus','inferior hypogastric plexus'}
SPINE={'spinal cord','conus medullaris','cauda equina','filum terminale',
       'cervical enlargement','lumbar enlargement','dorsal root ganglion'}

def canonical(value):
    n=label_key(value)
    side=re.match(r'^(left|right) (.+)$',n)
    prefix=side.group(1)+' ' if side else ''
    base=side.group(2) if side else n
    return prefix+ALIASES.get(base,base)

def neural_identity(value):
    n=canonical(value)
    base=re.sub(r'^(left|right) ','',n)
    layer=0
    if base in CENTRAL_HEAD: regions=['headNeck']; layer=2
    elif base in SPINE: regions=['back']; layer=2 if base!='dorsal root ganglion' else 1
    elif base in CRANIAL:
        regions=['headNeck']
        if base=='vagus nerve': regions+=['thorax','abdomen']
        layer=1
    elif base in UPPER: regions=['upperLimb']; layer=1
    elif base in LOWER:
        regions=['pelvis','lowerLimb']
        if base in {'lumbar plexus','sacral plexus','lumbosacral plexus'}: regions+=['back']
        layer=1
    elif base in TRUNK:
        regions=['thorax','abdomen']
        if base=='phrenic nerve': regions=['headNeck','thorax']
        if base in {'pelvic splanchnic nerve','superior hypogastric plexus','inferior hypogastric plexus'}: regions=['pelvis']
        if base=='sympathetic trunk': regions=['headNeck','thorax','abdomen','pelvis','back']
        layer=1
    elif re.fullmatch(r'(?:c[1-8]|t(?:[1-9]|1[0-2])|l[1-5]|s[1-5]|co1) spinal nerve',base):
        regions=['back']; layer=1
        if base.startswith('c'): regions+=['headNeck']
        elif base.startswith('t'): regions+=['thorax']
        else: regions+=['pelvis']
    else: return None
    return {'source':'nervous','group':'nervous','layer':layer,'regions':regions}

def priority_labels():
    bilateral=lambda names:[side+' '+n for n in sorted(names) for side in ('left','right')]
    midline={'brain','cerebrum','cerebellum','brainstem','midbrain','pons','medulla oblongata','corpus callosum','fornix','optic chiasm','cerebellar vermis','spinal cord','conus medullaris','cauda equina','filum terminale','cervical enlargement','lumbar enlargement','celiac plexus','superior hypogastric plexus','inferior hypogastric plexus'}
    paired=(CENTRAL_HEAD|SPINE|CRANIAL|UPPER|LOWER|TRUNK)-midline-{'brain stem'}
    return sorted(midline)+bilateral(paired)+[
        side+' '+level+' spinal nerve' for level in
        [*(f'c{i}' for i in range(1,9)),*(f't{i}' for i in range(1,13)),*(f'l{i}' for i in range(1,6)),*(f's{i}' for i in range(1,6)),'co1']
        for side in ('left','right')]

def neural_audit(source_inventory,converted,blocked,excluded):
    raw=defaultdict(list); mounted=defaultdict(list); failed=defaultdict(list)
    for r in source_inventory:
        if neural_identity(r['name']): raw[canonical(r['name'])].append(r)
    for e in converted:
        if e['system']=='nervous': mounted[canonical(e['name'])].append(e)
    for r in [*blocked,*excluded]: failed[canonical(r['name'])].append(r['reason'])
    rows=[]
    for name in sorted(set(priority_labels())|set(raw)|set(mounted)):
        source=raw[name]; models=mounted[name]
        status=('AMBIGUOUS_EXPORTED_IDENTITY' if len(models)>1 else 'EXPORTED_CANDIDATE' if models else
                'EXPORT_BLOCKED' if failed[name] else 'SOURCE_PRESENT_NOT_EXPORTED' if source else 'NO_EXACT_SOURCE_OBJECT')
        rows.append({'name':name,'status':status,'sourceObjects':source,
                     'modelIds':[e['id'] for e in models],'reasons':failed[name]})
    return {'rows':rows,'summary':{s:sum(r['status']==s for r in rows) for s in sorted({r['status'] for r in rows})},
            'sourceNeuralObjects':sum(len(v) for v in raw.values()),'exportedNeuralModels':sum(len(v) for v in mounted.values()),
            'continuityValidated':False,'clinicalValidation':False,'publicRelease':'NO_GO'}
