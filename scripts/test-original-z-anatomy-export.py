"""Synthetic regression fixtures only, never included in any atlas pack."""
import bpy, importlib.util, pathlib, sys, math, json, struct
p=pathlib.Path(__file__).resolve().with_name('export-original-z-anatomy-private.py')
spec=importlib.util.spec_from_file_location('medcoel_export',p)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
assert mod.key('Internal carotid artery.l')=='left internal carotid artery'
assert mod.key('Internal carotid artery.r')!='left internal carotid artery'
assert mod.extra_identity('right external carotid artery')['group']=='arterial'
assert mod.extra_identity('left external jugular vein')['group']=='venous'
assert mod.extra_identity('thoracic duct')['source']=='lymphatic'
assert mod.extra_identity('left adrenal gland')['group']=='endocrine'
assert mod.extra_identity('left median nerve')['source']=='nervous'
assert mod.extra_identity('angular gyrus') is None
# Neural data must not depend on the quarantined legacy catalogue.
from z_anatomy_neural_identity import neural_identity, canonical, neural_audit, priority_labels
assert neural_identity('brainstem')['layer']==2
assert neural_identity('spinal cord')['regions']==['back']
assert neural_identity('right optic nerve')['regions']==['headNeck']
assert neural_identity('vagus nerve.l')['regions']==['headNeck','thorax','abdomen']
assert neural_identity('right brachial plexus')['layer']==1
assert neural_identity('left sciatic nerve')['regions']==['pelvis','lowerLimb']
assert canonical('Common peroneal nerve.r')=='right common fibular nerve'
assert canonical('Common peroneal nerve.l')!='right common fibular nerve'
assert neural_identity('left C8 spinal nerve') is not None
assert neural_identity('left C9 spinal nerve') is None
assert neural_identity('central canal of spinal cord') is None
assert neural_identity('posterior inferior cerebellar artery') is None
assert neural_identity('renal nerve shaped fixture') is None
assert 'spinal cord' in priority_labels() and 'left spinal cord' not in priority_labels()
a=neural_audit([{'name':'Optic nerve.l','type':'CURVE'}],
    [{'name':'Optic nerve.l','system':'nervous','id':'fixture'}],[],[])
assert next(r for r in a['rows'] if r['name']=='left optic nerve')['status']=='EXPORTED_CANDIDATE'
assert next(r for r in a['rows'] if r['name']=='right optic nerve')['status']=='NO_EXACT_SOURCE_OBJECT'
assert a['clinicalValidation'] is False
# Lymphatic coverage is not inferred from nodal presence.
from z_anatomy_lymphatic_identity import lymphatic_identity, lymphatic_audit, canonical as lymphatic_key
assert lymphatic_identity('ductus thoracicus')['lymphaticKind']=='trunk'
assert lymphatic_identity('cisterna chyli')['regions']==['abdomen']
assert lymphatic_identity('jugular lymphatic trunk.l')['regions']==['headNeck']
assert lymphatic_identity('lymphatic vessels of left leg')['lymphaticKind']=='vessel'
assert lymphatic_identity('left axillary lymph nodes')['lymphaticKind']=='node'
assert lymphatic_identity('left lobe of thymus')['lymphaticKind']=='organ'
assert lymphatic_identity('lumbar trunk') is None
assert lymphatic_identity('jugular vein.l') is None
assert lymphatic_identity('artery of lymph node') is None
assert lymphatic_key('(Anterior tibial node).l')=='left anterior tibial node'
assert lymphatic_key('(Anterior tibial node).r')!='left anterior tibial node'
meta={'source':'lymphatic','group':'lymphatic','regions':['headNeck'],'layer':0}
assert lymphatic_identity('Node of arch of azygos vein',meta)['lymphaticKind']=='node'
a=lymphatic_audit({'Submandibular nodes.l':meta},
    [{'name':'Submandibular nodes.l','type':'MESH'}],
    [{'name':'Submandibular nodes.l','system':'lymphatic','id':'fixture','privateAtlasMeta':{'lymphaticKind':'node'}}],[],[])
assert a['exportedByKind']['node']==1 and not a['hasExportedVesselCandidates']
assert next(r for r in a['rows'] if r['name']=='thoracic duct')['status']=='NO_EXACT_SOURCE_OBJECT'
assert not a['networkContinuityValidated']
a=lymphatic_audit({},[{'name':'thoracic duct','type':'CURVE'}],[],[{'name':'thoracic duct','reason':'no evaluated surface'}],[])
assert next(r for r in a['rows'] if r['name']=='thoracic duct')['status']=='EXPORT_BLOCKED'
# Organs and organ substructures must not be conflated.
from z_anatomy_organ_identity import organ_identity, organ_audit, canonical as organ_key
assert organ_key('Hypophysis')=='pituitary gland'
assert organ_key('Adenohypophysis')!='pituitary gland'
assert organ_key('Suprarenal gland.l')=='left adrenal gland'
assert organ_key('Suprarenal gland.r')!='left adrenal gland'
assert organ_key('Right upper lobe of lung')=='superior lobe of right lung'
assert organ_key('Left lung')!='superior lobe of left lung'
assert organ_key('Mitral valve')=='left atrioventricular valve'
assert organ_key('Posterior leaflet of left atrioventricular valve')!='left atrioventricular valve'
assert organ_identity('left principal bronchus')['group']=='respiratory'
assert organ_identity('pineal gland')['group']=='endocrine'
assert organ_identity('pancreas')['group']=='digestive'
assert organ_identity('thyroid artery') is None
assert organ_identity('Circumflex artery of heart',{'source':'cardiovascular','group':'heart'}) is None
assert organ_identity('left parathyroid gland')['regions']==['headNeck']
a=organ_audit({},[{'name':'Right lung','type':'MESH'}],
    [{'name':'Right lung','system':'visceral','group':'respiratory','id':'fixture'}],[],[])
assert not a['fiveLobeCandidatesExported'] and not a['solidOrganSurfaceValidated']
assert next(r for r in a['rows'] if r['name']=='right lung')['status']=='EXPORTED_CANDIDATE'
assert next(r for r in a['rows'] if r['name']=='middle lobe of right lung')['status']=='NO_EXACT_SOURCE_OBJECT'
a=organ_audit({},[{'name':'thyroid gland','type':'MESH'}],[],[{'name':'thyroid gland','reason':'fixture blocked'}],[])
assert next(r for r in a['rows'] if r['name']=='thyroid gland')['status']=='EXPORT_BLOCKED'
# Cardiovascular identity must override the name of the supplied organ.
assert mod.vascular_group('Circumflex artery of heart','heart')=='arterial'
assert mod.vascular_group('Anterior interventricular artery','heart')=='arterial'
assert mod.vascular_group('Pulmonary vein.l','heart')=='venous'
assert mod.vascular_group('Coronary sinus','heart')=='venous'
assert mod.vascular_group('Septal branches of anterior interventricular artery','heart')=='arterial'
assert mod.vascular_group('Left coronary leaflet','heart')=='heart'
assert mod.vascular_group('Anterior leaflet of pulmonary valve','heart')=='heart'
assert mod.vascular_group('Common carotid artery.r','arterial')=='arterial'
meta=mod.vascular_meta('Internal carotid artery.l',{'source':'cardiovascular','group':'arterial','layer':0,'regions':['whole']})
assert meta['group']=='arterial' and meta['layer']==1 and 'headNeck' in meta['regions']
meta=mod.vascular_meta('Circumflex artery of heart',{'source':'cardiovascular','group':'heart','layer':0,'regions':['thorax']})
assert meta['group']=='arterial' and 'thorax' in meta['regions']
# Geometrical test fixture, not an anatomical model. A source bevel is respected.
data=bpy.data.curves.new('fixture-source-bevel','CURVE');data.dimensions='3D'
data.resolution_u=3;data.bevel_depth=.01;data.bevel_resolution=2
s=data.splines.new('POLY');s.points.add(2)
for i,xyz in enumerate([(0,0,0,1),(.04,.02,.1,1),(.1,0,.2,1)]):s.points[i].co=xyz
obj=bpy.data.objects.new('fixture-source-bevel',data);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.update()
pos,norm,bounds,skipped=mod.geometry(obj,bpy.context.evaluated_depsgraph_get(),1)
assert len(pos)==len(norm) and len(pos)>0 and len(pos)%9==0
assert bounds[4]-bounds[1]>.15 and bounds[3]-bounds[0]>.05
assert all(math.isfinite(v) for v in pos)
binary=mod.glb(pos,norm,bounds,{'approvedForDistribution':False})
magic,version,total=struct.unpack('<III',binary[:12]);assert magic==0x46546c67 and version==2 and total==len(binary)
jlen,jtype=struct.unpack('<II',binary[12:20]);doc=json.loads(binary[20:20+jlen])
assert doc['accessors'][0]['count']==len(pos)//3 and doc['extras']['reviewStatus']=='candidate-only'
data.bevel_depth=0;data.bevel_object=None;data.extrude=0
bpy.context.view_layer.update()
try:
    mod.geometry(obj,bpy.context.evaluated_depsgraph_get(),1)
except RuntimeError:
    pass
else:
    raise AssertionError('Unbeveled curve without a surface must not be converted')
print('SOURCE EXPORT FIXTURES PASS: exact identity, source bevel, native GLB and empty-curve rejection',flush=True)
