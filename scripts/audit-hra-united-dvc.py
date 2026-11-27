"""Bounded private HRA United DVC evidence audit. Never export or register geometry."""
import argparse
import csv
import hashlib
import io
import json
import mmap
import re
import struct
import tempfile
import unittest
import urllib.request
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"licensing/atlas-publication/hra-united-pelvis-mouth-gap-discovery-20261127.json"
PIN="27d6d493cd53761abb10f087767ec4cc74acb051"
CAP=400_000_000
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None
OPENER=urllib.request.build_opener(NoRedirect())
def read_small(url,cap):
    with OPENER.open(url,timeout=60) as f:
        data=f.read(cap+1)
    if len(data)>cap:
        raise ValueError("metadata cap")
    return data
def git_blob(data):
    return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
def validate_pointer(data,row):
    if git_blob(data)!=row["dvcPointer"]["blobSHA"]:
        raise ValueError("DVC pointer blob mismatch")
    text=data.decode("utf8")
    md5=re.findall(r"(?m)^\s*-?\s*md5:\s*([a-f0-9]{32})\s*$",text)
    sizes=re.findall(r"(?m)^\s*size:\s*(\d+)\s*$",text)
    paths=re.findall(r"(?m)^\s*path:\s*([^\r\n]+?)\s*$",text)
    if md5!=[row["dvcPointer"]["md5"]] or sizes!=[str(row["bytes"])] or paths!=[row["filename"]]:
        raise ValueError("DVC pointer fields differ")
def fetch_asset(row,path):
    n=0
    sha=hashlib.sha256()
    md5=hashlib.md5()
    git=hashlib.sha1(b"blob "+str(row["bytes"]).encode()+b"\0")
    with OPENER.open(row["sourceURL"],timeout=120) as f,path.open("xb") as out:
        while chunk:=f.read(1024**2):
            n+=len(chunk)
            if n>row["bytes"] or n>CAP:
                raise ValueError("asset byte cap")
            out.write(chunk)
            sha.update(chunk)
            md5.update(chunk)
            git.update(chunk)
    if n!=row["bytes"]:
        raise ValueError("asset byte count differs")
    if "dvcPointer" in row:
        if md5.hexdigest()!=row["dvcPointer"]["md5"]:
            raise ValueError("DVC MD5 differs")
    elif git.hexdigest()!=row.get("glbBlob"):
        raise ValueError("Git GLB blob differs")
    return sha.hexdigest()
def glb_document(buf):
    if len(buf)<28 or struct.unpack_from("<4sII",buf)!=(b"glTF",2,len(buf)):
        raise ValueError("GLB header")
    length,kind=struct.unpack_from("<I4s",buf,12)
    offset=20+length
    if kind!=b"JSON" or length>32*1024**2 or offset+8>len(buf) or length%4:
        raise ValueError("GLB JSON")
    doc=json.loads(buf[20:offset])
    n,kind=struct.unpack_from("<I4s",buf,offset)
    start=offset+8
    if kind!=b"BIN\0" or start+n!=len(buf) or n%4:
        raise ValueError("GLB BIN")
    buffers=doc.get("buffers",[])
    if len(buffers)!=1 or "uri" in buffers[0] or not 0<=n-buffers[0]["byteLength"]<=3:
        raise ValueError("GLB buffer")
    return doc,start,buffers[0]["byteLength"]
def accessor(buf,doc,start,limit,index,typ,allowed):
    if not isinstance(index,int) or not 0<=index<len(doc["accessors"]):
        raise ValueError("accessor index")
    a=doc["accessors"][index]
    ct=a["componentType"]
    if a["type"]!=typ or ct not in allowed or "sparse" in a or a.get("normalized"):
        raise ValueError("accessor encoding held")
    dtype=np.dtype({5121:"u1",5123:"<u2",5125:"<u4",5126:"<f4"}[ct])
    count=a["count"]
    width=3 if typ=="VEC3" else 1
    elem=dtype.itemsize*width
    if not isinstance(count,int) or not 0<count<=20_000_000:
        raise ValueError("accessor count")
    vi=a["bufferView"]
    if not isinstance(vi,int) or not 0<=vi<len(doc["bufferViews"]):
        raise ValueError("buffer view index")
    v=doc["bufferViews"][vi]
    off=v.get("byteOffset",0)
    local=a.get("byteOffset",0)
    stride=v.get("byteStride",elem)
    if v["buffer"]!=0 or not all(isinstance(x,int) for x in (off,local,stride,v["byteLength"])) or min(off,local)<0 or stride<elem or stride%dtype.itemsize or local+(count-1)*stride+elem>v["byteLength"] or off+v["byteLength"]>limit:
        raise ValueError("accessor bounds")
    return np.ndarray((count,width),dtype=dtype,buffer=buf,offset=start+off+local,strides=(stride,dtype.itemsize))
def reachable_nodes(doc):
    nodes=doc["nodes"]
    scene=doc.get("scene",0)
    if not isinstance(scene,int) or not 0<=scene<len(doc["scenes"]):
        raise ValueError("scene index")
    seen=set()
    def visit(i,depth=0):
        if not isinstance(i,int) or not 0<=i<len(nodes) or i in seen or depth>128:
            raise ValueError("ambiguous scene hierarchy")
        seen.add(i)
        for c in nodes[i].get("children",[]):
            visit(c,depth+1)
    for i in doc["scenes"][scene]["nodes"]:
        visit(i)
    return seen
def audit_mesh(buf,doc,start,limit,i):
    if not isinstance(i,int) or not 0<=i<len(doc["meshes"]):
        raise ValueError("mesh index")
    vertices=triangles=0
    fingerprints=[]
    for p in doc["meshes"][i]["primitives"]:
        if p.get("mode",4)!=4 or p.get("extensions") or "targets" in p:
            raise ValueError("unsupported primitive")
        pos=accessor(buf,doc,start,limit,p["attributes"]["POSITION"],"VEC3",{5126})
        idx=accessor(buf,doc,start,limit,p["indices"],"SCALAR",{5121,5123,5125})
        if not np.isfinite(pos).all() or idx.size%3 or idx.max()>=len(pos):
            raise ValueError("invalid triangle geometry")
        vertices+=len(pos)
        triangles+=idx.size//3
        # Compare exact ordered local position values and index connectivity.
        # This is not world-space equality, topology equivalence, or specimen identity.
        fingerprints.append({"vertices":len(pos),"triangles":idx.size//3,
                             "positionSHA256":hashlib.sha256(np.asarray(pos,dtype="<f4").tobytes(order="C")).hexdigest(),
                             "indexSHA256":hashlib.sha256(np.asarray(idx,dtype="<u4").tobytes(order="C")).hexdigest()})
    if not vertices or not triangles:
        raise ValueError("empty geometry")
    return vertices,triangles,fingerprints
def node_transform_chain(doc,index):
    parents={}
    for i,n in enumerate(doc["nodes"]):
        for child in n.get("children",[]):
            if child in parents:
                raise ValueError("multiple parents")
            parents[child]=i
    chain=[]
    while True:
        n=doc["nodes"][index]
        chain.append({k:n[k] for k in ("matrix","translation","rotation","scale") if k in n})
        if index not in parents:
            break
        index=parents[index]
        if len(chain)>128:
            raise ValueError("transform ancestry depth")
    return hashlib.sha256(json.dumps(chain[::-1],sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
def audit(row):
    expected=f"https://cdn.humanatlas.io/digital-objects/ref-organ/{row['id']}/{row['version']}/assets/{row['filename']}"
    if row["sourceURL"]!=expected or not 0<row["bytes"]<=CAP or row["approvedForDistribution"] is not False:
        raise ValueError("manifest policy")
    base=f"https://raw.githubusercontent.com/hubmapconsortium/hra-kg/{PIN}/digital-objects/ref-organ/{row['id']}/{row['version']}/raw/"
    metadata=read_small(base+"metadata.yaml",65536)
    if git_blob(metadata)!=row["metadataBlob"] or b"CC BY 4.0" not in metadata or row["doi"].encode() not in metadata:
        raise ValueError("publisher metadata differs")
    if "dvcPointer" in row:
        validate_pointer(read_small(base+row["filename"]+".dvc",4096),row)
    elif not re.fullmatch(r"[a-f0-9]{40}",row.get("glbBlob","")):
        raise ValueError("missing pinned binary identity")
    cw=read_small(base+"crosswalk.csv",2*1024**2)
    if git_blob(cw)!=row["crosswalkBlob"]:
        raise ValueError("crosswalk blob")
    # Exact CSV fields, not substring matching.
    records=list(csv.reader(io.StringIO(cw.decode("utf-8-sig"))))
    with tempfile.TemporaryDirectory(prefix="medcoel-hra-united-") as td:
        path=Path(td)/"source.glb"
        sha=fetch_asset(row,path)
        with path.open("rb") as f,mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as buf:
            doc,start,limit=glb_document(buf)
            reachable=reachable_nodes(doc)
            results=[]
            for target in row["matches"]:
                fields=[target[k] for k in ("nodeName","ontologyId","label")]
                if sum(any(c==fields[0] for c in record) and all(v in record for v in fields) for record in records)!=1:
                    raise ValueError("exact crosswalk row missing or ambiguous")
                hits=[i for i,n in enumerate(doc["nodes"]) if n.get("name")==target["nodeName"]]
                result={**target,"status":"HOLD_UNRESOLVED_OR_NONMESH_NODE"}
                if len(hits)==1 and hits[0] in reachable and "mesh" in doc["nodes"][hits[0]]:
                    i=hits[0]
                    try:
                        v,t,fp=audit_mesh(buf,doc,start,limit,doc["nodes"][i]["mesh"])
                        result.update(status="EXACT_NAMED_MESH_GEOMETRY_CANDIDATE",nodeIndex=i,vertices=v,triangles=t,orderedLocalPrimitiveFingerprints=fp,transformChainSHA256=node_transform_chain(doc,i))
                    except (ValueError,KeyError,IndexError,TypeError,OverflowError):
                        result["status"]="HOLD_UNSUPPORTED_OR_INVALID_GEOMETRY"
                if len(hits)==1 and hits[0] in reachable and "mesh" not in doc["nodes"][hits[0]]:
                    descendants=[]
                    def descend(i):
                        n=doc["nodes"][i]
                        if "mesh" in n:
                            v,t,fp=audit_mesh(buf,doc,start,limit,n["mesh"])
                            descendants.append({"nodeIndex":i,"vertices":v,"triangles":t,"orderedLocalPrimitiveFingerprints":fp,"transformChainSHA256":node_transform_chain(doc,i)})
                        for child in n.get("children",[]):
                            descend(child)
                    try:
                        descend(hits[0])
                        if descendants:
                            result.update(status="EXACT_SOURCE_GROUP_GEOMETRY_CANDIDATE",nodeIndex=hits[0],descendantMeshes=descendants)
                    except (ValueError,KeyError,IndexError,TypeError,OverflowError):
                        result["status"]="HOLD_INVALID_GROUP_GEOMETRY"
                result["exactNameMatches"]=len(hits)
                results.append(result)
            return {"schema":1,"id":row["id"],"sourceURL":expected,"publisherRevision":PIN,"bytes":row["bytes"],"dvcMD5":row.get("dvcPointer",{}).get("md5"),"gitGLBBlob":row.get("glbBlob"),"metadataBlob":row["metadataBlob"],"sha256":sha,"results":results,"componentLineage":"PENDING_MIXED_COMPOSITE_SOURCE","clinicalValidation":False,"registrationValidated":False,"approvedForDistribution":False,"publicRelease":"NO_GO"}
class Tests(unittest.TestCase):
    def test_pointer(self):
        data=b"outs:\n- md5: "+b"a"*32+b"\n  size: 10\n  path: a.glb\n"
        row={"dvcPointer":{"blobSHA":git_blob(data),"md5":"a"*32},"bytes":10,"filename":"a.glb"}
        validate_pointer(data,row)
        with self.assertRaises(ValueError):
            validate_pointer(data,{**row,"bytes":11})
    def test_glb_bounds(self):
        with self.assertRaises(ValueError):
            glb_document(b"invalid")
    def test_ordered_geometry_fingerprint(self):
        p=np.array([[0,0,0],[1,0,0],[0,1,0]],dtype="<f4").tobytes()
        idx=np.array([0,1,2],dtype="<u2").tobytes()
        doc={"meshes":[{"primitives":[{"attributes":{"POSITION":0},"indices":1}]}],
             "accessors":[{"bufferView":0,"componentType":5126,"count":3,"type":"VEC3"},{"bufferView":1,"componentType":5123,"count":3,"type":"SCALAR"}],
             "bufferViews":[{"buffer":0,"byteLength":len(p)},{"buffer":0,"byteOffset":len(p),"byteLength":len(idx)}]}
        v,t,f=audit_mesh(p+idx,doc,0,len(p+idx),0)
        self.assertEqual((v,t),(3,1))
        self.assertEqual(f[0]["positionSHA256"],hashlib.sha256(p).hexdigest())
        self.assertEqual(f[0]["indexSHA256"],hashlib.sha256(np.array([0,1,2],dtype="<u4").tobytes()).hexdigest())
        doc["nodes"]=[{"children":[1],"translation":[1,0,0]},{}]
        self.assertNotEqual(node_transform_chain(doc,0),node_transform_chain(doc,1))
    def test_repeated_nodes(self):
        with self.assertRaises(ValueError):
            reachable_nodes({"nodes":[{"children":[0]}],"scenes":[{"nodes":[0]}]})
if __name__=="__main__":
    import sys
    if sys.argv[1:]==["--test"]:
        unittest.main(argv=[sys.argv[0]])
    else:
        parser=argparse.ArgumentParser()
        parser.add_argument("source",choices=["united-female","united-male","mouth-female","mouth-male"])
        args=parser.parse_args()
        manifest=json.loads(MANIFEST.read_text())
        if manifest["publisherRevision"]!=PIN or manifest["publicRelease"]!="NO_GO":
            raise ValueError("manifest pin")
        row,=[r for r in manifest["rows"] if r["id"]==args.source]
        print("HRA UNITED DVC AUDIT "+json.dumps(audit(row),separators=(",",":")))
