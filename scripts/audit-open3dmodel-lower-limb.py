"""Private source ZIP and GLB JSON audit; never export or serve geometry."""
import hashlib, io, json, re, stat, struct, subprocess, tempfile, unittest, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATE = ROOT / "licensing/atlas-publication/open3dmodel-lower-limb-candidate-20261126.json"
CAP = 64 * 1024**2

def digest(data):
    return hashlib.sha256(data).hexdigest()

def safe_glb_entry(raw, spec):
    if not 0 < len(raw) <= CAP:
        raise ValueError("archive size")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        rows = z.infolist()
        if len(rows) != 1:
            raise ValueError("unexpected archive membership")
        f = rows[0]
        if f.filename != spec["glbFile"] or f.flag_bits & 1 or stat.S_ISLNK(f.external_attr >> 16) or not 0 < f.file_size <= CAP:
            raise ValueError("unsafe GLB entry")
        return z.read(f)

def unpack(raw, spec):
    if not 0 < len(raw) <= CAP or digest(raw) != spec["archiveSHA256"]:
        raise ValueError("archive hash or size mismatch")
    data = safe_glb_entry(raw, spec)
    if digest(data) != spec["glbSHA256"]:
        raise ValueError("GLB hash mismatch")
    return data

def diagnose(raw, spec):
    # Hash the sole bounded safe member, even when the ZIP wrapper differs.
    # Diagnostic only: no metadata/node parsing on an unapproved byte pair.
    report = {"schema":1,"archiveBytes":len(raw),"observedArchiveSHA256":digest(raw),
              "expectedArchiveSHA256":spec["archiveSHA256"],"archiveMatches":digest(raw)==spec["archiveSHA256"],
              "expectedGLBSHA256":spec["glbSHA256"],"geometryDecoded":False,"publicRelease":"NO_GO"}
    try:
        data = safe_glb_entry(raw,spec)
        report.update({"glbBytes":len(data),"observedGLBSHA256":digest(data),"glbMatches":digest(data)==spec["glbSHA256"]})
    except (ValueError,zipfile.BadZipFile,NotImplementedError,RuntimeError) as e:
        report.update({"glbMatches":False,"memberInspectionError":str(e)[:200]})
    report["status"] = ("EXACT_PAIR" if report["archiveMatches"] and report["glbMatches"] else
                        "HOLD_WRAPPER_CHANGED" if report["glbMatches"] else "HOLD_SOURCE_BYTES_CHANGED_OR_UNREADABLE")
    return report

def metadata(data):
    if len(data) < 20 or len(data) > CAP:
        raise ValueError("GLB size")
    magic, ver, total = struct.unpack_from("<4sII", data)
    if (magic, ver, total) != (b"glTF", 2, len(data)):
        raise ValueError("GLB header")
    size, kind = struct.unpack_from("<I4s", data, 12)
    if kind != b"JSON" or not 0 < size <= min(8*1024**2, len(data)-20) or size % 4:
        raise ValueError("GLB JSON chunk")
    doc = json.loads(data[20:20+size])
    if doc.get("asset",{}).get("version") != "2.0":
        raise ValueError("glTF version")
    nodes, meshes = doc.get("nodes",[]), doc.get("meshes",[])
    if not isinstance(nodes,list) or not isinstance(meshes,list) or len(nodes)>10000 or len(meshes)>10000:
        raise ValueError("node/mesh cap")
    return doc

def inventory(doc, targets):
    nodes, meshes = doc.get("nodes",[]), doc.get("meshes",[])
    rows = []
    for target in targets:
        for side, suffix in (("left","l"),("right","r")):
            expected = {f"{side} {target}".casefold(),f"{target}.{suffix}".casefold()}
            hits = []
            for i,n in enumerate(nodes):
                name, mesh = n.get("name"), n.get("mesh")
                if isinstance(name,str) and name.strip().casefold() in expected and type(mesh) is int and 0 <= mesh < len(meshes):
                    hits.append({"nodeIndex":i,"meshIndex":mesh,"sourceName":name})
            rows.append({"target":target,"side":side,"matches":hits,"status":"EXACT_NAMED_MESH_NODE_CANDIDATE" if len(hits)==1 else "HOLD_MISSING_OR_AMBIGUOUS"})
    return {"nodeCount":len(nodes),"meshCount":len(meshes),"extensionsRequired":doc.get("extensionsRequired",[]),"targets":rows,"uniqueNamedCandidates":sum(r["status"].startswith("EXACT") for r in rows),"geometryDecoded":False,"clinicalValidation":False,"registrationValidated":False,"assetRightsReviewed":False,"publicRelease":"NO_GO"}

def observed_inventory(doc, targets):
    result = inventory(doc, targets)
    # Discovery only: preserve exact raw spelling and node indices, no inferred side.
    nodes = doc.get("nodes", [])
    meshes = doc.get("meshes", [])
    candidates = []
    for i,n in enumerate(nodes):
        name, mesh = n.get("name"), n.get("mesh")
        if isinstance(name,str) and re.search(r"nerve|nervus|nervi",name,re.I) and type(mesh) is int and 0 <= mesh < len(meshes):
            candidates.append({"nodeIndex":i,"meshIndex":mesh,"sourceName":name})
    if len(candidates)>500: raise ValueError("nerve discovery count exceeds cap")
    return {**result,"nerveMeshNodeNames":candidates,"scope":"raw node-name discovery, not verified anatomy"}

def main(observed=False):
    spec=json.loads((ROOT / "licensing/atlas-publication/open3dmodel-lower-limb-observed-source-20261126.json" if observed else CANDIDATE).read_text())
    if observed and (spec["publicRelease"]!="NO_GO" or spec["assetRightsReviewed"] is not False or spec["geometryDecoded"] is not False):
        raise ValueError("observed candidate quarantine gate")
    with tempfile.TemporaryDirectory(prefix="medcoel-lower-limb-") as tmp:
        file=Path(tmp)/"source.zip"
        subprocess.run(["curl","--fail","--silent","--show-error","--location","--proto","=https","--proto-redir","=https","--max-redirs","3","--max-time","180","--max-filesize",str(CAP),"--output",str(file),spec["archiveURL"]],check=True)
        if not 0 < file.stat().st_size <= CAP: raise ValueError("archive size")
        raw=file.read_bytes()
        receipt=diagnose(raw,spec)
        print("OPEN3DMODEL SOURCE BYTE DIAGNOSTIC "+json.dumps(receipt,separators=(",",":")),flush=True)
        if receipt["status"]!="EXACT_PAIR": raise ValueError(receipt["status"])
        data=unpack(raw,spec)
        if observed and (len(raw)!=spec["archiveBytes"] or len(data)!=spec["glbBytes"]): raise ValueError("observed byte size changed")
        report=(observed_inventory if observed else inventory)(metadata(data),spec["targetLabels"])
        report.update({"schema":1,"archiveSHA256":digest(raw),"glbSHA256":digest(data),"archiveBytes":len(raw),"glbBytes":len(data),"exactThirdPartyHashReplay":True})
        if observed:
            report.pop("exactThirdPartyHashReplay",None)
            report.update({"exactObservedPublisherBytesReplay":True,"legacyComparison":spec["legacyComparison"],"assetRightsReviewed":False,"publicRelease":"NO_GO"})
        print(("OPEN3DMODEL OBSERVED NERVE DISCOVERY " if observed else "OPEN3DMODEL LOWER LIMB QUARANTINE REPORT ")+json.dumps(report,separators=(",",":")))

class Tests(unittest.TestCase):
    def test_exact_and_ambiguous_labels(self):
        d={"meshes":[{}],"nodes":[{"name":"Sciatic nerve.l","mesh":0},{"name":"Right Sciatic nerve","mesh":0},{"name":"Right Sciatic nerve","mesh":0},{"name":"Branch of femoral nerve.l","mesh":0}]}
        r=inventory(d,["Sciatic nerve","Femoral nerve"])
        self.assertEqual(r["uniqueNamedCandidates"],1)
        self.assertEqual(r["targets"][1]["status"],"HOLD_MISSING_OR_AMBIGUOUS")
        self.assertFalse(r["geometryDecoded"])
        discovered=observed_inventory(d,["Sciatic nerve","Femoral nerve"])
        self.assertEqual(len(discovered["nerveMeshNodeNames"]),4)
        self.assertEqual(discovered["publicRelease"],"NO_GO")
    def test_header(self):
        b=json.dumps({"asset":{"version":"2.0"},"nodes":[],"meshes":[]}).encode()
        b+=b" "*((-len(b))%4)
        data=struct.pack("<4sII",b"glTF",2,20+len(b))+struct.pack("<I4s",len(b),b"JSON")+b
        self.assertEqual(metadata(data)["asset"]["version"],"2.0")
        with self.assertRaises(ValueError): metadata(data[:-1])
    def test_zip_and_hash(self):
        data=b"fixture"
        out=io.BytesIO()
        with zipfile.ZipFile(out,"w") as z: z.writestr("lower-limb.glb",data)
        raw=out.getvalue()
        spec={"archiveSHA256":digest(raw),"glbSHA256":digest(data),"glbFile":"lower-limb.glb"}
        self.assertEqual(unpack(raw,spec),data)
        self.assertEqual(diagnose(raw,spec)["status"],"EXACT_PAIR")
        changed={**spec,"archiveSHA256":"0"*64}
        self.assertEqual(diagnose(raw,changed)["status"],"HOLD_WRAPPER_CHANGED")
        with self.assertRaises(ValueError): unpack(raw,changed)
        self.assertEqual(diagnose(raw,{**spec,"glbSHA256":"0"*64})["status"],"HOLD_SOURCE_BYTES_CHANGED_OR_UNREADABLE")
        self.assertEqual(diagnose(b"not a ZIP",spec)["status"],"HOLD_SOURCE_BYTES_CHANGED_OR_UNREADABLE")
        with self.assertRaises(ValueError): unpack(raw,{**spec,"glbSHA256":"0"*64})
if __name__=="__main__":
    import sys
    if sys.argv[1:]==["--test"]: unittest.main(argv=[sys.argv[0]])
    elif sys.argv[1:]==["--inspect-observed"]: main(True)
    elif not sys.argv[1:]: main()
    else: raise SystemExit("unknown arguments")
