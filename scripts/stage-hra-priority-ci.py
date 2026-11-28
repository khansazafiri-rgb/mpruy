"""CI-only temporary registry for isolated HRA mesh browser replay."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("isolation",ROOT/"scripts/audit-hra-priority-isolation.py")
iso=importlib.util.module_from_spec(spec)
spec.loader.exec_module(iso)
def main():
    if os.environ.get("GITHUB_ACTIONS")!="true":
        raise ValueError("CI-only staging")
    base=Path(os.environ["RUNNER_TEMP"]).resolve()
    out=Path(os.environ["HRA_PRIORITY_CI_STAGE"])
    if out.resolve()!=out or out.parent!=base or not out.name.startswith("hra-priority-") or not out.is_dir() or any(out.iterdir()):
        raise ValueError("stage must be empty isolated runner temp directory")
    proof=json.loads((ROOT/"licensing/atlas-publication/hra-priority-isolation-roundtrip-audit-20261127.json").read_text())
    plan=json.loads(iso.PLAN.read_text())
    manifest=json.loads(iso.source.MANIFEST.read_text())
    if any(x["publicRelease"]!="NO_GO" for x in (proof,plan,manifest)):
        raise ValueError("private-only receipts")
    entries=[]
    def stage(item,row,target,result,actual):
        old,=[x for x in proof["rows"] if x["id"]==item["id"]]
        expected,=[x for x in old["results"] if x["nodeIndex"]==target["nodeIndex"]]
        if actual!=expected or old["sourceSHA256"]!=item["sourceSHA256"]:
            raise ValueError("isolated receipt mismatch")
        doc,_,_=iso.source.glb_document(result)
        index,=[i for i,n in enumerate(doc["nodes"]) if n.get("mesh")==0]
        id=hashlib.sha256((row["sourceURL"]+"#isolated-node="+str(target["nodeIndex"])).encode()).hexdigest()[:24]
        with (out/(id+".glb")).open("xb") as handle:
            handle.write(result)
        entries.append({"id":id,"name":target["label"]+" · "+item["id"]+" · isolated geometry only",
            "source":row["sourceURL"],"version":row["version"],"meshCount":1,
            "triangles":sum(x["triangles"] for x in target["orderedLocalPrimitiveFingerprints"]),
            "bytes":len(result),"sha256":actual["isolatedSHA256"],"sourceSHA256":item["sourceSHA256"],
            "originalNodeIndex":target["nodeIndex"],"geometryOnly":True,"materialsPreserved":False,
            "approvedForDistribution":False,"registrationValidated":False,"clinicalValidation":False,
            "sourceCrosswalk":[{"index":index,"nodeName":target["nodeName"],"label":target["label"],"ontologyId":target["ontologyId"]}]})
    for item in plan["rows"]:
        row,=[r for r in manifest["rows"] if r["id"]==item["id"]]
        iso.audit(item,row,stage)
    if len(entries)!=15 or len({e["id"] for e in entries})!=15:
        raise ValueError("exact registry count")
    (out/"inventory.json").write_text(json.dumps({"schema":1,"items":entries,"publicRelease":"NO_GO","registrationValidated":False,"clinicalValidation":False}))
    print("HRA PRIORITY CI STAGED 15 isolated checksum-bound meshes")
if __name__=="__main__":
    main()
