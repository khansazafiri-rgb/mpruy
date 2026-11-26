"""Read-only, pinned Z-Anatomy source geometry audit. No source assets or derived meshes are published.
Exact names or explicit documented aliases only; no invented nerve/vessel connections or side mirroring.
"""
import hashlib
import json
import math
import os
import pathlib
import shutil
import sys
import tempfile
import zipfile
from collections import defaultdict
from z_anatomy_neural_identity import canonical as nerve_key
from z_anatomy_lymphatic_identity import canonical as lymph_key, MIDLINE, TRUNKS, REGIONAL_VESSELS, lymphatic_identity

REVISION = '3c1679595d89aa508ddffc72cd5e125c5d609a59'
FILES = {'Z-Anatomy.zip': (86734957, 'f43cabc6f366b2a6058dd2ed4a2b3c7b9b2492cb'),
         'License.txt': (2754, '4d48d7e83d2b79ba4510314c7612b2c3c0a90f67')}
NERVES = ('femoral nerve', 'sciatic nerve', 'tibial nerve', 'common fibular nerve',
          'deep fibular nerve', 'superficial fibular nerve', 'obturator nerve', 'sural nerve',
          'saphenous nerve', 'medial plantar nerve', 'lateral plantar nerve', 'superior gluteal nerve',
          'inferior gluteal nerve', 'pudendal nerve')
SIDES = ('left', 'right')
NERVE_TARGETS = tuple(side+' '+name for side in SIDES for name in NERVES)
LYMPH_TARGETS = tuple(sorted(set(MIDLINE) | {side+' '+n for side in SIDES for n in TRUNKS}
    | {'lymphatic vessels of '+p+n for p in ('','left ','right ') for n in REGIONAL_VESSELS}))
ALLOWED = {'MESH','CURVE','SURFACE'}

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def check_blob(p, expected):
    size, git_sha = expected
    require(p.is_file() and not p.is_symlink() and p.stat().st_size == size, 'Source size mismatch')
    git = hashlib.sha1(('blob '+str(size)+'\0').encode())
    sha = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''):
            sha.update(block)
            git.update(block)
    require(git.hexdigest() == git_sha, 'Pinned Git blob mismatch')
    return sha.hexdigest()

def sha_file(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()

def source_index(objects, key):
    index = defaultdict(list)
    for obj in objects:
        index[key(obj.name)].append(obj)
    return index

def classify_hits(hits):
    if not hits:
        return 'NO_EXACT_SOURCE_OBJECT'
    if len(hits) != 1:
        return 'AMBIGUOUS_SOURCE_OBJECT'
    if hits[0].type not in ALLOWED:
        return 'NO_EVALUABLE_SOURCE_SURFACE'
    return 'EXACT_SOURCE_OBJECT'

def summarize(rows):
    counts = defaultdict(int)
    for row in rows:
        counts[row['status']] += 1
    return dict(sorted(counts.items()))

def audit_rows(targets, index, evaluate):
    rows=[]
    for target in targets:
        hits=index.get(target, [])
        status=classify_hits(hits)
        row={'target':target, 'status':status, 'sourceObjects':[{'name':o.name,'type':o.type} for o in hits],
             'approvedForDistribution':False}
        if status == 'EXACT_SOURCE_OBJECT':
            try:
                row.update(evaluate(hits[0]))
                row['status']='EVALUATED_SOURCE_SURFACE'
            except Exception as e:
                row['status']='GEOMETRY_HELD'
                row['reason']=str(e)[:240]
        rows.append(row)
    return rows

def test():
    from types import SimpleNamespace as O
    assert len(NERVE_TARGETS)==28 and len(set(NERVE_TARGETS))==28
    assert 'right lymphatic duct' in LYMPH_TARGETS
    assert 'left lumbar lymphatic trunk' in LYMPH_TARGETS
    a=O(name='Femoral nerve.l',type='CURVE')
    b=O(name='Right femoral nerve',type='MESH')
    c=O(name='Saphenous branch of Femoralis nerve.r',type='MESH')
    d=O(name='Left common peroneal nerve',type='MESH')
    e=O(name='Left common fibular nerve',type='MESH')
    f=O(name='Right sciatic nerve',type='EMPTY')
    index=source_index([a,b,c,d,e,f],nerve_key)
    rows=audit_rows(NERVE_TARGETS,index,lambda obj:{'triangles':1})
    by={r['target']:r for r in rows}
    assert by['left femoral nerve']['status']=='EVALUATED_SOURCE_SURFACE'
    assert by['right femoral nerve']['status']=='EVALUATED_SOURCE_SURFACE'
    assert by['right saphenous nerve']['status']=='NO_EXACT_SOURCE_OBJECT'
    assert by['left common fibular nerve']['status']=='AMBIGUOUS_SOURCE_OBJECT'
    assert by['right sciatic nerve']['status']=='NO_EVALUABLE_SOURCE_SURFACE'
    assert all(not r['approvedForDistribution'] for r in rows)
    with tempfile.TemporaryDirectory() as tmp:
        p=pathlib.Path(tmp)/'x'
        p.write_bytes(b'abc')
        assert check_blob(p,(3,hashlib.sha1(b'blob 3\0abc').hexdigest()))==hashlib.sha256(b'abc').hexdigest()
        try: check_blob(p,(3,'0'*40))
        except RuntimeError: pass
        else: raise AssertionError('Wrong source accepted')
    print('Z-ANATOMY GAP AUDIT SELF TEST PASS')

def main():
    import bpy
    import importlib.util
    spec=importlib.util.spec_from_file_location('medcoel_native_export',pathlib.Path(__file__).resolve().with_name('export-original-z-anatomy-private.py'))
    exporter=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(exporter)
    geometry=exporter.geometry
    args=sys.argv[sys.argv.index('--')+1:]
    require(len(args)==1,'Expected explicit temporary source directory')
    root=pathlib.Path(args[0])
    require(root.is_dir() and root.resolve()==root and not root.is_symlink(),'Unsafe source directory')
    archive=root/'Z-Anatomy.zip'
    notice=root/'License.txt'
    archive_sha=check_blob(archive,FILES[archive.name])
    license_sha=check_blob(notice,FILES[notice.name])
    require('CC-BY-SA 4.0' in notice.read_text(encoding='utf-8'),'Unexpected license notice')
    with tempfile.TemporaryDirectory(dir=root,prefix='native-audit-') as t:
        blend=pathlib.Path(t)/'startup.blend'
        with zipfile.ZipFile(archive) as z:
            matches=[x for x in z.infolist() if pathlib.PurePosixPath(x.filename).name.lower()=='startup.blend' and not x.is_dir()]
            require(len(matches)==1 and 0<matches[0].file_size<=1024*1024*1024,'Unexpected archive layout')
            require(matches[0].compress_size>0 and matches[0].file_size/matches[0].compress_size<500,'Unsafe archive compression')
            with z.open(matches[0]) as src,blend.open('xb') as dst: shutil.copyfileobj(src,dst,1024*1024)
        require(blend.stat().st_size==matches[0].file_size,'Extracted size mismatch')
        blend_sha=sha_file(blend)
        bpy.ops.wm.open_mainfile(filepath=str(blend),load_ui=False,use_scripts=False)
        scene=bpy.context.scene
        scale=scene.unit_settings.scale_length
        require(math.isfinite(scale) and scale>0,'Invalid source units')
        objects=list(scene.objects)
        nerve_index=source_index(objects,nerve_key)
        lymph_index=source_index(objects,lymph_key)
        def include(layer):
            layer.exclude=False
            layer.hide_viewport=False
            for child in layer.children: include(child)
        include(bpy.context.view_layer.layer_collection)
        for collection in bpy.data.collections: collection.hide_viewport=False
        for obj in objects:
            if obj.type in ALLOWED:
                obj.hide_viewport=False
                try: obj.hide_set(False)
                except RuntimeError: pass
        bpy.context.view_layer.update()
        deps=bpy.context.evaluated_depsgraph_get()
        def evaluate(obj):
            require(obj.library is None and getattr(obj.data,'library',None) is None,'Linked external object/data held')
            pos,norm,bounds,skipped=geometry(obj,deps,scale)
            require(len(pos)%9==0 and len(pos)==len(norm),'Invalid native triangle arrays')
            return {'triangles':len(pos)//9,'omittedDegenerateTriangles':skipped,
                    'sourcePositionSHA256':hashlib.sha256(pos.tobytes()).hexdigest(),
                    'nativeBoundsMetres':bounds,'sourceCollections':sorted(c.name for c in obj.users_collection),
                    'sourceModifiers':[m.type for m in obj.modifiers]}
        nerves=audit_rows(NERVE_TARGETS,nerve_index,evaluate)
        lymph=audit_rows(LYMPH_TARGETS,lymph_index,evaluate)
        extra=sorted(n for n in lymph_index if n not in LYMPH_TARGETS and
            (lymphatic_identity(n) or {}).get('lymphaticKind') in {'trunk','vessel'})
        # Only discovery names; no geometry or inferred network connectivity.
        report={'schema':1,'revision':REVISION,'archiveGitBlob':FILES[archive.name][1],
            'archiveSHA256':archive_sha,'sourceBlendSHA256':blend_sha,'licenseSHA256':license_sha,
            'blenderVersion':bpy.app.version_string,'sourceSceneObjects':len(objects),
            'nativeCoordinateFrame':'source Blender world converted to Y-up metres',
            'nerveTargets':len(NERVE_TARGETS),'nerveSummary':summarize(nerves),'nerveRows':nerves,
            'lymphaticTargets':len(LYMPH_TARGETS),'lymphaticSummary':summarize(lymph),'lymphaticRows':lymph,
            'additionalLymphaticLabelCandidates':extra,
            'geometryExported':0,'geometryPublished':0,'assetRightsReviewed':False,
            'networkContinuityValidated':False,'clinicalValidation':False,'registrationValidated':False,
            'publicRelease':'NO_GO'}
        print('Z-ANATOMY PINNED GAP AUDIT '+json.dumps(report,separators=(',',':'),allow_nan=False),flush=True)

if __name__=='__main__':
    if '--test' in sys.argv: test()
    else: main()
