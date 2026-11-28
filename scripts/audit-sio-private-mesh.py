"""Private SIO mask-to-GLB geometry experiment; never publish or register to BP3D."""
import hashlib
import io
import json
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path
import numpy as np
from PIL import Image
from skimage.measure import marching_cubes
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parent.parent
spec = spec_from_file_location("sio_labels", ROOT / "scripts/audit-sio-label-volume.py")
labels = module_from_spec(spec)
spec.loader.exec_module(labels)
RECEIPT = ROOT / "licensing/atlas-publication/checkpoint-evidence/sio-label-volume-audit-20261127.json"
TARGETS = ("myocardium", "scrotum", "left rectus abdominis", "right rectus abdominis",
           "left transversus abdominis", "right transversus abdominis",
           "left internal oblique", "right internal oblique", "coccyx", "larynx")

def load_volume(file):
    expected = (774, 330, 573)
    a = np.empty(expected, dtype=np.uint16)
    with zipfile.ZipFile(file) as z:
        slices = labels.label_slices(z)
        for index, n in enumerate(range(labels.FIRST, labels.LAST + 1)):
            with Image.open(io.BytesIO(z.read(slices[n]))) as im:
                if im.format != "TIFF" or im.n_frames != 1 or im.size != (573, 330) or im.mode not in {"I;16", "I;16B", "I;16L", "I"}:
                    raise ValueError("Unexpected TIFF")
                s = np.asarray(im)
                if s.shape != expected[1:] or not np.issubdtype(s.dtype, np.integer) or s.min() < 0 or s.max() > 65535:
                    raise ValueError("Unexpected label slice")
                a[index] = s
    return a

def geometry(volume, label, expected_count):
    mask = volume == label
    axes = [np.flatnonzero(mask.any(axis=tuple(i for i in range(3) if i != j))) for j in range(3)]
    if not all(len(x) for x in axes) or int(mask.sum()) != expected_count:
        raise ValueError("Voxel count differs from retained audit")
    lo = np.array([x[0] for x in axes])
    hi = np.array([x[-1] for x in axes])
    if np.any(lo == 0) or np.any(hi == np.array(volume.shape)-1):
        raise ValueError("Mask touches source volume boundary; no artificial closure")
    cropped = mask[tuple(slice(int(l)-1, int(h)+2) for l,h in zip(lo,hi))]
    del mask
    v, f, _, _ = marching_cubes(cropped, level=0.5, spacing=(1.,1.,1.), allow_degenerate=False)
    # Keep coordinate axes in Z,Y,X file order. This is not an anatomical/world frame.
    v = np.asarray(v + lo - 1, dtype="<f4")
    f = np.asarray(f, dtype="<u4")
    if not len(v) or not len(f) or not np.isfinite(v).all() or f.max() >= len(v):
        raise ValueError("Invalid mesh")
    return v, f

def glb(v, f, name, label):
    pos = v.tobytes(order="C")
    idx = f.tobytes(order="C")
    binary = pos + idx
    doc = {"asset":{"version":"2.0","generator":"MEDCOEL SIO private mesh audit"},
           "scene":0,"scenes":[{"nodes":[0]}],"nodes":[{"mesh":0,"name":name}],
           "meshes":[{"primitives":[{"attributes":{"POSITION":0},"indices":1,"mode":4}]}],
           "buffers":[{"byteLength":len(binary)}],
           "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":len(pos),"target":34962},
                          {"buffer":0,"byteOffset":len(pos),"byteLength":len(idx),"target":34963}],
           "accessors":[{"bufferView":0,"componentType":5126,"count":len(v),"type":"VEC3",
                         "min":v.min(axis=0).tolist(),"max":v.max(axis=0).tolist()},
                        {"bufferView":1,"componentType":5125,"count":int(f.size),"type":"SCALAR"}],
           "extras":{"sourceLabel":label,"sourceFrame":"voxel-file-ZYX-mm",
                     "anatomicalOrientationVerified":False,"approvedForDistribution":False}}
    meta = json.dumps(doc,separators=(",",":")).encode()
    meta += b" " * (-len(meta)%4)
    result = struct.pack("<4sII",b"glTF",2,12+8+len(meta)+8+len(binary))
    return result + struct.pack("<I4s",len(meta),b"JSON")+meta+struct.pack("<I4s",len(binary),b"BIN\x00")+binary

def verify_glb(data, v, f):
    magic, version, total = struct.unpack_from("<4sII",data,0)
    n, tag = struct.unpack_from("<I4s",data,12)
    if (magic,version,total,tag) != (b"glTF",2,len(data),b"JSON"):
        raise ValueError("GLB header mismatch")
    doc = json.loads(data[20:20+n])
    b, kind = struct.unpack_from("<I4s",data,20+n)
    payload = data[28+n:]
    if kind != b"BIN\x00" or b != len(payload) or doc["buffers"][0]["byteLength"] != b:
        raise ValueError("GLB payload mismatch")
    if payload != v.tobytes(order="C")+f.tobytes(order="C"):
        raise ValueError("GLB geometry roundtrip mismatch")

def audit_scope_passes(rows, allow_known_source_boundary_hold=False):
    # Exact acquired source geometry audit; this does not complete the larynx.
    if len(rows) != len(TARGETS) or {r.get("name") for r in rows} != set(TARGETS):
        return False
    holds = [r for r in rows if r.get("status") != "PRIVATE_MESH_ROUNDTRIP_PASS"]
    if not holds:
        return True
    return allow_known_source_boundary_hold and holds == [{
        "name": "larynx", "status": "HOLD",
        "reason": "Mask touches source volume boundary; no artificial closure"
    }]

def main(allow_known_source_boundary_hold=False):
    source = json.loads(labels.CANDIDATE.read_text())
    receipt = json.loads(RECEIPT.read_text())
    if receipt["publicRelease"] != "NO_GO" or not receipt["sourceLabelBytesVerified"]:
        raise ValueError("No retained source audit")
    with tempfile.TemporaryDirectory(prefix="medcoel-sio-private-mesh-") as d:
        p = Path(d)
        sheet, archive = p/"labels.xlsx", p/"source.zip"
        if labels.fetch(source["labelFile"],sheet,labels.LABEL_LIMIT) != receipt["sourceLabelFile"]:
            raise ValueError("Label workbook differs from retained audit")
        if labels.fetch(source["archiveFile"],archive,labels.ARCHIVE_LIMIT) != receipt["sourceArchive"]:
            raise ValueError("Volume differs from retained audit")
        mapping = labels.label_candidates(sheet,TARGETS)
        volume = load_volume(archive)
        rows = []
        for name in TARGETS:
            old = receipt["targets"][name]
            try:
                if old["status"] != "EXACT_TEXT_ROW_CANDIDATE" or mapping[name]["status"] != old["status"] or mapping[name]["candidateLabelNumbers"] != old["candidateLabelNumbers"]:
                    raise ValueError("Label mapping is unresolved or changed")
                ident = old["candidateLabelNumbers"][0]
                count = old["voxelCounts"][str(ident)]
                v,f = geometry(volume,ident,count)
                data = glb(v,f,name,ident)
                out = p/f"label-{ident}.glb"
                out.write_bytes(data)
                verify_glb(out.read_bytes(),v,f)
                rows.append({"name":name,"label":ident,"voxels":count,"vertices":len(v),"triangles":len(f),
                             "boundsFileZYXmm":[v.min(axis=0).tolist(),v.max(axis=0).tolist()],
                             "glbSHA256":hashlib.sha256(data).hexdigest(),"bytes":len(data),
                             "status":"PRIVATE_MESH_ROUNDTRIP_PASS"})
            except ValueError as exc:
                rows.append({"name":name,"status":"HOLD","reason":str(exc)})
        report={"schema":1,"sourceArchive":receipt["sourceArchive"],"sourceLabelFile":receipt["sourceLabelFile"],
                "rows":rows,"passed":sum(r["status"]=="PRIVATE_MESH_ROUNDTRIP_PASS" for r in rows),
                "clinicalValidation":False,"registrationValidated":False,"coordinateFrameVerified":False,
                "privacyReviewed":False,"approvedForDistribution":False,"geometryPublished":0,"publicRelease":"NO_GO"}
        report["wholeAnatomyComplete"] = False
        report["knownSourceBoundaryHoldAcceptedForAuditOnly"] = bool(
            allow_known_source_boundary_hold and report["passed"] == len(TARGETS)-1
            and audit_scope_passes(rows, True))
        report["auditScopePassed"] = audit_scope_passes(rows, allow_known_source_boundary_hold)
        print("SIO PRIVATE MESH AUDIT "+json.dumps(report,separators=(",",":")))
        if not report["auditScopePassed"]:
            raise SystemExit(2)

class Tests(unittest.TestCase):
    def test_known_crop_is_documented_hold_only_in_explicit_audit_scope(self):
        rows=[{"name":n,"status":"PRIVATE_MESH_ROUNDTRIP_PASS"} for n in TARGETS[:-1]]
        rows.append({"name":"larynx","status":"HOLD","reason":"Mask touches source volume boundary; no artificial closure"})
        self.assertFalse(audit_scope_passes(rows))
        self.assertTrue(audit_scope_passes(rows, True))
        self.assertEqual(rows[-1]["status"], "HOLD")
        self.assertFalse(audit_scope_passes(rows[:-1], True))
    def test_unexpected_hold_or_changed_scope_is_never_accepted(self):
        rows=[{"name":n,"status":"PRIVATE_MESH_ROUNDTRIP_PASS"} for n in TARGETS]
        self.assertTrue(audit_scope_passes(rows))
        rows[0]={"name":"myocardium","status":"HOLD","reason":"unknown source error"}
        self.assertFalse(audit_scope_passes(rows, True))
        rows[-1]={"name":"larynx","status":"HOLD","reason":"different checksum"}
        self.assertFalse(audit_scope_passes(rows, True))
        rows[0]={"name":"larynx","status":"PRIVATE_MESH_ROUNDTRIP_PASS"}
        self.assertFalse(audit_scope_passes(rows, True))

    def test_cube_roundtrip(self):
        a=np.zeros((8,9,10),dtype=np.uint16)
        a[2:5,3:6,4:7]=7
        v,f=geometry(a,7,27)
        np.testing.assert_allclose(v.min(axis=0),[1.5,2.5,3.5])
        np.testing.assert_allclose(v.max(axis=0),[4.5,5.5,6.5])
        data=glb(v,f,"fixture",7)
        verify_glb(data,v,f)
        with self.assertRaises(ValueError):
            verify_glb(data[:-1],v,f)
    def test_bad_count_and_boundary(self):
        a=np.zeros((5,5,5),dtype=np.uint16)
        a[0,2,2]=7
        with self.assertRaises(ValueError):
            geometry(a,7,2)
        with self.assertRaises(ValueError):
            geometry(a,7,1)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--test"]:
        unittest.main(argv=[sys.argv[0]])
    elif sys.argv[1:] == ["--allow-known-source-boundary-hold"]:
        main(allow_known_source_boundary_hold=True)
    elif not sys.argv[1:]:
        main()
    else:
        raise SystemExit("unknown arguments")
