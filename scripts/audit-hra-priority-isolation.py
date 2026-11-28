"""In-memory isolated source geometry roundtrip; no file export, registration or release."""
import argparse
import hashlib
import importlib.util
import json
import mmap
import struct
import tempfile
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("hra_source",ROOT/"scripts/audit-hra-united-dvc.py")
source=importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)
PLAN=ROOT/"licensing/atlas-publication/hra-united-mouth-priority-extraction-plan-20261127.json"
def encode_isolated(buf,doc,start,limit,index):
    node=doc["nodes"][index]
    _,_,expected=source.audit_mesh(buf,doc,start,limit,node["mesh"])
    # Only the selected mesh's own geometry and ancestor transforms.
    # No other source anatomy, materials, images, metadata or external references.
    parents={}
    for i,n in enumerate(doc["nodes"]):
        for child in n.get("children",[]):
            if child in parents:
                raise ValueError("multiple parents")
            parents[child]=i
    chain=[index]
    while chain[-1] in parents:
        chain.append(parents[chain[-1]])
        if len(chain)>128:
            raise ValueError("hierarchy depth")
    nodes=[]
    for i,old in enumerate(reversed(chain)):
        n=doc["nodes"][old]
        if "skin" in n or "weights" in n or n.get("extensions"):
            raise ValueError("unsupported transform/skin")
        out={k:n[k] for k in ("matrix","translation","rotation","scale") if k in n}
        if "matrix" in out and len(out)!=1:
            raise ValueError("mixed transform representation")
        if i<len(chain)-1:
            out["children"]=[i+1]
        else:
            out["mesh"]=0
            out["name"]=node["name"]
        nodes.append(out)
    binary=bytearray()
    views=[]
    accessors=[]
    primitives=[]
    def add(arr,typ,ctype,target):
        while len(binary)%4:
            binary.append(0)
        offset=len(binary)
        binary.extend(arr.tobytes(order="C"))
        views.append({"buffer":0,"byteOffset":offset,"byteLength":arr.nbytes,"target":target})
        a={"bufferView":len(views)-1,"componentType":ctype,"count":len(arr),"type":typ}
        if typ=="VEC3":
            a.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
        accessors.append(a)
        return len(accessors)-1
    for p in doc["meshes"][node["mesh"]]["primitives"]:
        pos=np.asarray(source.accessor(buf,doc,start,limit,p["attributes"]["POSITION"],"VEC3",{5126}),dtype="<f4")
        idx=np.asarray(source.accessor(buf,doc,start,limit,p["indices"],"SCALAR",{5121,5123,5125}),dtype="<u4")
        primitives.append({"mode":4,"attributes":{"POSITION":add(pos,"VEC3",5126,34962)},"indices":add(idx,"SCALAR",5125,34963)})
    out={"asset":{"version":"2.0","generator":"MEDCOEL private geometry audit"},"scene":0,"scenes":[{"nodes":[0]}],"nodes":nodes,"meshes":[{"primitives":primitives}],"buffers":[{"byteLength":len(binary)}],"bufferViews":views,"accessors":accessors}
    payload=json.dumps(out,separators=(",",":"),allow_nan=False).encode()
    payload+=b" "*(-len(payload)%4)
    binary+=b"\0"*(-len(binary)%4)
    result=struct.pack("<4sII",b"glTF",2,28+len(payload)+len(binary))+struct.pack("<I4s",len(payload),b"JSON")+payload+struct.pack("<I4s",len(binary),b"BIN\0")+binary
    check,offset,n=source.glb_document(result)
    _,_,actual=source.audit_mesh(result,check,offset,n,0)
    if actual!=expected or source.node_transform_chain(doc,index)!=source.node_transform_chain(check,len(nodes)-1):
        raise ValueError("roundtrip geometry or transform chain differs")
    if len(check["meshes"])!=1 or sum("mesh" in n for n in check["nodes"])!=1:
        raise ValueError("unselected geometry leaked")
    return bytes(result),actual
def audit(item,row,stage=None):
    with tempfile.TemporaryDirectory(prefix="medcoel-hra-isolation-") as d:
        path=Path(d)/"source.glb"
        if source.fetch_asset(row,path)!=item["sourceSHA256"]:
            raise ValueError("retained source SHA256 mismatch")
        with path.open("rb") as f,mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as buf:
            doc,start,limit=source.glb_document(buf)
            reachable=source.reachable_nodes(doc)
            results=[]
            for t in item["targets"]:
                i=t["nodeIndex"]
                if i not in reachable or doc["nodes"][i]["name"]!=t["nodeName"] or source.node_transform_chain(doc,i)!=t["transformChainSHA256"]:
                    raise ValueError("retained node evidence mismatch")
                result,fp=encode_isolated(buf,doc,start,limit,i)
                if fp!=t["orderedLocalPrimitiveFingerprints"]:
                    raise ValueError("retained local geometry mismatch")
                result_row={"nodeIndex":i,"ontologyId":t["ontologyId"],"label":t["label"],"isolatedBytes":len(result),"isolatedSHA256":hashlib.sha256(result).hexdigest(),"status":"EXACT_GEOMETRY_AND_TRANSFORM_CHAIN_ROUNDTRIP"}
                if stage:
                    stage(item,row,t,result,result_row)
                results.append(result_row)
            return {"schema":1,"id":item["id"],"sourceSHA256":item["sourceSHA256"],"results":results,"geometryPersisted":bool(stage),"materialsPreserved":False,"clinicalValidation":False,"registrationValidated":False,"approvedForDistribution":False,"publicRelease":"NO_GO"}
class Tests(unittest.TestCase):
    def test_minimal_isolation(self):
        p=np.array([[0,0,0],[1,0,0],[0,1,0]],dtype="<f4").tobytes()
        i=np.array([0,1,2],dtype="<u2").tobytes()
        doc={"nodes":[{"mesh":0,"children":[1],"translation":[1,2,3]},{"name":"target","mesh":0}],"meshes":[{"primitives":[{"attributes":{"POSITION":0},"indices":1}]}],"accessors":[{"bufferView":0,"componentType":5126,"count":3,"type":"VEC3"},{"bufferView":1,"componentType":5123,"count":3,"type":"SCALAR"}],"bufferViews":[{"buffer":0,"byteLength":len(p)},{"buffer":0,"byteOffset":len(p),"byteLength":len(i)}]}
        out,fp=encode_isolated(p+i,doc,0,len(p+i),1)
        check,_,_=source.glb_document(out)
        self.assertNotIn("mesh",check["nodes"][0])
        self.assertEqual(check["nodes"][0]["translation"],[1,2,3])
        self.assertEqual(fp[0]["triangles"],1)
if __name__=="__main__":
    import sys
    if sys.argv[1:]==["--test"]:
        unittest.main(argv=[sys.argv[0]])
    else:
        parser=argparse.ArgumentParser()
        parser.add_argument("source",choices=["united-female","united-male","mouth-female","mouth-male"])
        args=parser.parse_args()
        plan=json.loads(PLAN.read_text())
        manifest=json.loads(source.MANIFEST.read_text())
        if plan["publicRelease"]!="NO_GO" or manifest["publicRelease"]!="NO_GO":
            raise ValueError("private only")
        item,=[r for r in plan["rows"] if r["id"]==args.source]
        row,=[r for r in manifest["rows"] if r["id"]==args.source]
        print("HRA PRIORITY ISOLATION AUDIT "+json.dumps(audit(item,row),separators=(",",":")))
