"""Headless, source-native Z-Anatomy export. Never enables upstream Blender scripts.
Exact catalogue labels and explicit peripheral nerve identities; evaluate source meshes and curves. No public output.
"""
import bpy, sys, os, re, json, zipfile, hashlib, struct, math, pathlib, shutil
from array import array
from mathutils import Vector

def require(ok, message):
    if not ok:
        raise RuntimeError(message)
def digest(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()
def key(n):
    n=' '.join(str(n).strip().lower().split())
    m=re.search(r'\.(l|r)$',n)
    if m: n=('left ' if m.group(1)=='l' else 'right ')+n[:-2]
    return n
def write(p,v):
    p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def pad(data,byte=b'\0'):
    return data+byte*((-len(data))%4)
def glb(pos,norm,bounds,lineage):
    pb=pos.tobytes(); nb=norm.tobytes(); count=len(pos)//3
    doc={"asset":{"version":"2.0","generator":"MEDCOEL source-native candidate export"},"scene":0,
      "scenes":[{"nodes":[0]}],"nodes":[{"mesh":0}],"meshes":[{"primitives":[{"attributes":{"POSITION":0,"NORMAL":1},"material":0}]}],
      "materials":[{"doubleSided":True,"pbrMetallicRoughness":{"baseColorFactor":[.8,.82,.84,1],"metallicFactor":0,"roughnessFactor":.85}}],
      "buffers":[{"byteLength":len(pb)+len(nb)}],
      "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":len(pb),"target":34962},{"buffer":0,"byteOffset":len(pb),"byteLength":len(nb),"target":34962}],
      "accessors":[{"bufferView":0,"componentType":5126,"count":count,"type":"VEC3","min":bounds[:3],"max":bounds[3:]},
                   {"bufferView":1,"componentType":5126,"count":count,"type":"VEC3"}],
      "extras":{"reviewStatus":"candidate-only","provenance":lineage}}
    j=pad(json.dumps(doc,separators=(',',':')).encode(),b' ')
    b=pad(pb+nb)
    return struct.pack('<III',0x46546c67,2,28+len(j)+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b

def geometry(obj,deps,scale):
    # Blender evaluates bevel depth, taper and modifiers from the publisher.
    # Never give an unbeveled centreline an invented vessel radius.
    ev=obj.evaluated_get(deps); mesh=ev.to_mesh(preserve_all_data_layers=False,depsgraph=deps)
    require(mesh is not None,'Source object has no evaluated surface')
    try:
        mesh.calc_loop_triangles()
        require(0<len(mesh.loop_triangles)<=1500000,'Empty or oversized mesh')
        world=ev.matrix_world; normalmat=world.to_3x3().inverted_safe().transposed()
        def orient(v): return (v.x,v.z,-v.y)
        coords=[tuple(x*scale for x in orient(world@v.co)) for v in mesh.vertices]
        pos=array('f'); norm=array('f'); skipped=0
        flipped=world.to_3x3().determinant()<0
        for t in mesh.loop_triangles:
            ids=list(t.vertices); loops=list(t.loops)
            if flipped: ids[1],ids[2]=ids[2],ids[1]; loops[1],loops[2]=loops[2],loops[1]
            points=[Vector(coords[i]) for i in ids]
            cross=(points[1]-points[0]).cross(points[2]-points[0])
            if cross.length_squared<=1e-28: skipped+=1; continue
            face=cross.normalized()
            smooth=mesh.polygons[t.polygon_index].use_smooth
            for i,li,p in zip(ids,loops,points):
                if smooth:
                    try: vn=mesh.corner_normals[li].vector
                    except (AttributeError,IndexError): vn=mesh.vertices[i].normal
                    normal=Vector(orient(normalmat@vn)).normalized()
                    if normal.length_squared<.5: normal=face
                else: normal=face
                pos.extend(p); norm.extend(normal)
        require(len(pos)>0 and all(math.isfinite(x) for x in pos) and all(math.isfinite(x) for x in norm),'Invalid coordinates')
        bounds=[min(pos[i::3]) for i in range(3)]+[max(pos[i::3]) for i in range(3)]
        require(max(abs(x) for x in bounds)<10,'Source coordinate range outside body scale')
        return pos,norm,bounds,skipped
    finally: ev.to_mesh_clear()

def main():
    args=sys.argv[sys.argv.index('--')+1:]
    require(len(args)==5,'Expected ZIP, license, catalogue, output, pinned revision')
    archive,licensefile,catalogfile,out=map(pathlib.Path,args[:4]); revision=args[4]
    require(re.fullmatch('[a-f0-9]{40}',revision),'Unpinned source')
    require(out.is_dir() and not out.is_symlink() and 'licensing-quarantine' in out.parts,'Private output required')
    cat=json.loads(catalogfile.read_text()); catalog={}
    for n,m in cat.items(): catalog.setdefault(key(n),[]).append((n,m))
    source_license=licensefile.read_text(encoding='utf-8',errors='replace')
    require('CC-BY-SA 4.0' in source_license or 'Attribution-ShareAlike 4.0' in source_license,'Unexpected publisher license notice')
    source_hash=digest(archive)
    with zipfile.ZipFile(archive) as z:
        blends=[x for x in z.infolist() if pathlib.PurePosixPath(x.filename).name.lower()=='startup.blend' and not x.is_dir()]
        require(len(blends)==1 and 0<blends[0].file_size<=1024*1024*1024,'Expected one bounded startup.blend')
        blend=out/'source.blend'
        with z.open(blends[0]) as src,open(blend,'xb') as dst: shutil.copyfileobj(src,dst)
    blend_hash=digest(blend)
    bpy.ops.wm.open_mainfile(filepath=str(blend),load_ui=False,use_scripts=False)
    scene=bpy.context.scene; scale=scene.unit_settings.scale_length
    require(math.isfinite(scale) and scale>0,'Invalid source unit scale')
    # Never assign unclear third-party structures based on a shape or substring.
    restricted=re.compile(r'\b(kidney|renal pelvis|renal calyx|calyces|cochlea|vestibule|tympanic|malleus|incus|stapes|inner ear|semicircular duct|semicircular canal)\b',re.I)
    peripheral={'median nerve','ulnar nerve','radial nerve','sciatic nerve','femoral nerve','tibial nerve','common fibular nerve','deep fibular nerve','superficial fibular nerve','musculocutaneous nerve','axillary nerve','obturator nerve','brachial plexus','lumbar plexus','sacral plexus'}
    byname={}
    source_inventory=[]
    type_counts={}
    for obj in scene.objects:
        type_counts[obj.type]=type_counts.get(obj.type,0)+1
        source_inventory.append({"name":obj.name,"type":obj.type,"collections":[c.name for c in obj.users_collection],
            "parent":obj.parent.name if obj.parent else None,"modifiers":[m.type for m in obj.modifiers]})
        if obj.type in {'MESH','CURVE','SURFACE'}: byname.setdefault(key(obj.name),[]).append(obj)
    write(out/'source-object-inventory.json',source_inventory)
    print("SOURCE OBJECT TYPES",type_counts,flush=True)
    pack=out/'pack'; (pack/'structures').mkdir(parents=True)
    converted=[]; blocked=[]; signatures=set(); unmatched=[]; excluded=[]
    deps=bpy.context.evaluated_depsgraph_get()
    for label,objects in sorted(byname.items()):
        matches=catalog.get(label,[])
        if restricted.search(label):
            excluded.append({'name':label,'reason':'known restricted source identity'});continue
        if len(matches)==1:
            name,meta=matches[0]
        elif len(matches)==0 and re.sub(r'^(left|right) ','',label) in peripheral:
            name=objects[0].name
            meta={"source":"nervous","group":"nervous","layer":0,"regions":["whole"]}
        else:
            unmatched.append({'name':label,'objects':[{'name':o.name,'type':o.type,'collections':[c.name for c in o.users_collection]} for o in objects],'reason':'no unique supported identity'});continue
        if len(objects)!=1:
            blocked.append({"name":name,"reason":"ambiguous source object name"});continue
        obj=objects[0]
        try:
            pos,norm,bounds,skipped=geometry(obj,deps,scale)
            sig=hashlib.sha256(pos.tobytes()).hexdigest()
            require(sig not in signatures,'Duplicate exact position buffer')
            ident='za-'+hashlib.sha256(obj.name.encode()).hexdigest()[:24]
            lineage={"source":"Z-Anatomy original publisher archive","revision":revision,"archiveSHA256":source_hash,
              "sourceBlendSHA256":blend_hash,"sourceObjectName":obj.name,"sourceObjectType":obj.type,"sourceModifiers":[m.type for m in obj.modifiers],"sourceCollections":[c.name for c in obj.users_collection],
              "sourceLicenseNoticeSHA256":digest(licensefile),"coordinateFrame":"source Blender world Y-up metres",
              "sceneUnitScale":scale,"geometryPositionSHA256":sig,"degenerateTrianglesOmitted":skipped,
              "registrationValidated":False,"geometryAnatomyValidated":False,"approvedForDistribution":False,
              "commercialRightsStatus":"BLOCKED_PER_OBJECT_REVIEW"}
            binary=glb(pos,norm,bounds,lineage); h=hashlib.sha256(binary).hexdigest()
            target=pack/'structures'/ident; target.mkdir(); (target/'model.glb').write_bytes(binary)
            lineage["generatedGLBSHA256"]=h; write(target/'lineage.json',lineage)
            converted.append({"id":ident,"name":name,"system":meta["source"],"group":meta["group"],
              "modelPath":"./structures/"+ident+"/model.glb","glbSha256":h,"fmaId":None,
              "triangles":len(pos)//9,"sourceObjectType":obj.type,"approvedForDistribution":False,"privateAtlasMeta":{**meta,"box":bounds}})
            signatures.add(sig)
            if len(converted)%100==0: print("Z-ANATOMY EXPORTED",len(converted),flush=True)
        except Exception as e: blocked.append({"name":name,"reason":str(e)})
    bones=[e["privateAtlasMeta"]["box"] for e in converted if e["system"]=="skeletal"]
    require(bones,'No source skeleton matched')
    height=max(b[4] for b in bones)-min(b[1] for b in bones)
    require(1.0<=height<=2.5,'Source skeleton height outside expected adult range; no guessed rescaling')
    groups={}
    for e in converted: groups[e["group"]]=groups.get(e["group"],0)+1
    inv={"kind":"z-anatomy-original-source-private","source":{"publisher":"Z-Anatomy","revision":revision,"archiveSHA256":source_hash,"blendSHA256":blend_hash},
         "sourceNativeDisplayOnly":True,"sourceFrame":"z-anatomy-world-y-up-metres","provisionalSource":True,
         "approvedForCommercialDistribution":False,"converted":converted,"summary":{"converted":len(converted)}}
    write(pack/'inventory.json',inv)
    present={e['name'] for e in converted}
    write(out/'source-recovery-report.json',{"total":len(converted),"groups":groups,"sourceObjectTypes":type_counts,"convertedObjectTypes":{t:sum(e["sourceObjectType"]==t for e in converted) for t in type_counts},"unmatched":unmatched,"excluded":excluded,"skeletonHeightMetres":height,"blocked":blocked,
        "missingCatalogue":[n for n in cat if n not in present],"sourceRevision":revision,"publicRelease":"NO_GO","clinicalValidation":False})
    print("Z-ANATOMY SOURCE EXPORT COMPLETE",len(converted),groups,flush=True)
main()
