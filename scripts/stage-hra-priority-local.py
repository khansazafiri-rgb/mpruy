"""Opt-in local quarantine only. Regenerate audited isolated GLBs, never publish."""
import argparse
import hashlib
import importlib.util
import json
import os
import shutil
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("isolation",ROOT/"scripts/audit-hra-priority-isolation.py")
iso=importlib.util.module_from_spec(spec)
spec.loader.exec_module(iso)
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--private-quarantine",action="store_true",required=True)
    parser.parse_args()
    q=ROOT/"local-data/licensing-quarantine"
    q.mkdir(parents=True,exist_ok=True,mode=0o700)
    if q.resolve()!=q or not q.is_dir() or q.stat().st_mode & 0o022:
        raise ValueError("unsafe quarantine root")
    proof=json.loads((ROOT/"licensing/atlas-publication/hra-priority-isolation-roundtrip-audit-20261127.json").read_text())
    plan=json.loads(iso.PLAN.read_text())
    manifest=json.loads(iso.source.MANIFEST.read_text())
    if any(x["publicRelease"]!="NO_GO" for x in (proof,plan,manifest)) or proof["isolatedMeshes"]!=15:
        raise ValueError("private-only receipts")
    out=Path(tempfile.mkdtemp(prefix="hra-priority-isolated-",dir=q))
    ids=set()
    try:
        def stage(item,row,target,result,actual):
            old,=[x for x in proof["rows"] if x["id"]==item["id"]]
            expected,=[x for x in old["results"] if x["nodeIndex"]==target["nodeIndex"]]
            if actual!=expected or old["sourceSHA256"]!=item["sourceSHA256"]:
                raise ValueError("isolated receipt mismatch")
            ident=hashlib.sha256((row["sourceURL"]+"#isolated-node="+str(target["nodeIndex"])).encode()).hexdigest()[:24]
            if ident in ids:
                raise ValueError("duplicate derived ID")
            with (out/(ident+".glb")).open("xb") as handle:
                handle.write(result)
            os.chmod(out/(ident+".glb"),0o600)
            ids.add(ident)
        for item in plan["rows"]:
            row,=[r for r in manifest["rows"] if r["id"]==item["id"]]
            iso.audit(item,row,stage)
        if len(ids)!=15:
            raise ValueError("exact registry count")
        print("HRA PRIVATE PRIORITY FOLDER "+out.name)
    except BaseException:
        shutil.rmtree(out)
        raise
if __name__=="__main__":
    main()
