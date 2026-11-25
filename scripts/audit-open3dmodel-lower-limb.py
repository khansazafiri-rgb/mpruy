"""Private source ZIP and GLB JSON audit; never export or serve geometry."""
import hashlib, io, json, re, stat, struct, subprocess, tempfile, unittest, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATE = ROOT / "licensing/atlas-publication/open3dmodel-lower-limb-candidate-20261126.json"
CAP = 64 * 1024**2

def digest(data):
    return hashlib.sha256(data).hexdigest()

def unpack(raw, spec):
    if not 0 < len(raw) <= CAP or digest(raw) != spec["archiveSHA256"]:
        raise ValueError("archive hash or size mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        rows = z.infolist()
        if len(rows) != 1:
            raise ValueError("unexpected archive membership")
        f = rows[0]
        if f.filename != spec["glbFile"] or f.flag_bits & 1 or stat.S_ISLNK(f.external_attr >> 16) or not 0 < f.file_size <= CAP:
            raise ValueError("unsafe GLB entry")
        data = z.read(f)
    if digest(data) != spec["glbSHA256"]:
        raise ValueError("GLB hash mismatch")
    return data

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

def main():
    spec=json.loads(CANDIDATE.read_text())
    with tempfile.TemporaryDirectory(prefix="medcoel-lower-limb-") as tmp:
        file=Path(tmp)/"source.zip"
        subprocess.run(["curl","--fail","--silent","--show-error","--location","--proto","=https","--proto-redir","=https","--max-redirs","3","--max-time","180","--max-filesize",str(CAP),"--output",str(file),spec["archiveURL"]],check=True)
        if not 0 < file.stat().st_size <= CAP: raise ValueError("archive size")
        raw=file.read_bytes()
        data=unpack(raw,spec)
        report=inventory(metadata(data),spec["targetLabels"])
        report.update({"schema":1,"archiveSHA256":digest(raw),"glbSHA256":digest(data),"archiveBytes":len(raw),"glbBytes":len(data),"exactThirdPartyHashReplay":True})
        print("OPEN3DMODEL LOWER LIMB QUARANTINE REPORT "+json.dumps(report,separators=(",",":")))

class Tests(unittest.TestCase):
    def test_exact_and_ambiguous_labels(self):
        d={"meshes":[{}],"nodes":[{"name":"Sciatic nerve.l","mesh":0},{"name":"Right Sciatic nerve","mesh":0},{"name":"Right Sciatic nerve","mesh":0},{"name":"Branch of femoral nerve.l","mesh":0}]}
        r=inventory(d,["Sciatic nerve","Femoral nerve"])
        self.assertEqual(r["uniqueNamedCandidates"],1)
        self.assertEqual(r["targets"][1]["status"],"HOLD_MISSING_OR_AMBIGUOUS")
        self.assertFalse(r["geometryDecoded"])
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
        with self.assertRaises(ValueError): unpack(raw,{**spec,"glbSHA256":"0"*64})
if __name__=="__main__":
    import sys
    if sys.argv[1:]==["--test"]: unittest.main(argv=[sys.argv[0]])
    elif not sys.argv[1:]: main()
    else: raise SystemExit("unknown arguments")
