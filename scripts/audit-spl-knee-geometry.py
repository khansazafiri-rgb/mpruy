"""Exact pinned SPL mesh parse; no MRML execution, volume reading or geometry publication."""
import hashlib
import importlib.util
import json
import re
import subprocess
import struct
import tempfile
import unittest
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath
from urllib.parse import unquote
from xml.etree import ElementTree

import numpy as np
from vtkmodules.vtkCommonCore import vtkObject
from vtkmodules.vtkIOLegacy import vtkPolyDataReader
from vtkmodules.util.numpy_support import vtk_to_numpy

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("source_inventory", ROOT / "scripts/audit-spl-knee-source.py")
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)
vtkObject.GlobalWarningDisplayOff()

def digest(data):
    return hashlib.sha256(data).hexdigest()

# Allow only exact anatomical vocabulary. Never emit arbitrary scene names,
# filenames, patient metadata, or guessed laterality.
KNEE_TERMS = {
    "acl": "anterior cruciate ligament", "anterior cruciate ligament": "anterior cruciate ligament",
    "pcl": "posterior cruciate ligament", "posterior cruciate ligament": "posterior cruciate ligament",
    "mcl": "medial collateral ligament", "medial collateral ligament": "medial collateral ligament",
    "lcl": "lateral collateral ligament", "lateral collateral ligament": "lateral collateral ligament",
    "medial meniscus": "medial meniscus", "lateral meniscus": "lateral meniscus",
    "patellar ligament": "patellar ligament", "patellar tendon": "patellar tendon",
    "femur": "femur", "tibia": "tibia", "fibula": "fibula", "patella": "patella",
    "femoral cartilage": "femoral cartilage", "tibial cartilage": "tibial cartilage",
    "patellar cartilage": "patellar cartilage", "quadriceps tendon": "quadriceps tendon",
}
def anatomical_label(value):
    value = re.sub(r"[ _-]+", " ", value.strip().lower())
    side = "UNSPECIFIED"
    for name in ("left", "right"):
        if value.startswith(name + " "):
            side, value = name.upper(), value[len(name)+1:]
            break
        if value.endswith(" " + name):
            side, value = name.upper(), value[:-len(name)-1]
            break
    term = KNEE_TERMS.get(value)
    return (term, side) if term else None

def scene_links(z, mesh_paths, anatomical=None):
    """Resolve only local MRML model/storage references; never load a scene or volume."""
    links = {p: set() for p in mesh_paths}
    counts = Counter()
    transform_links = {p: set() for p in mesh_paths}
    for info in z.infolist():
        if PurePosixPath(info.filename).suffix.lower() != ".mrml":
            continue
        if info.file_size > 4 * 1024**2:
            counts["heldScene"] += 1
            continue
        raw = z.read(info)
        if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper() or b"\x00" in raw:
            counts["heldScene"] += 1
            continue
        try:
            root = ElementTree.fromstring(raw)
        except ElementTree.ParseError:
            counts["heldScene"] += 1
            continue
        for scope_index, scope_nodes in enumerate(source.mrml_scene_scopes(root)):
            storage = {}
            for node in scope_nodes:
                tag = node.tag.rsplit("}", 1)[-1].lower()
                if tag == "modelstorage":
                    key = node.get("id", "")
                    file = unquote(node.get("fileName", ""))
                    counts["modelStorageNodes"] += 1
                    if not key:
                        counts["storageMissingID"] += 1
                        continue
                    target = source.storage_path_diagnostics(info.filename, file, mesh_paths, counts)
                    if key in storage:
                        counts["duplicateStorageID"] += 1
                        storage[key] = None
                    else:
                        storage[key] = target
            hierarchy = source.hierarchy_label_candidates(scope_nodes, anatomical_label, counts)
            for node in scope_nodes:
                if node.tag.rsplit("}", 1)[-1].lower() != "model":
                    continue
                target = source.model_storage_target(node, storage, counts)
                if anatomical_label(node.get("name", "")):
                    counts["allowlistedModelLabelsLinked" if target else "allowlistedModelLabelsUnlinked"] += 1
                ident = node.get("id", "")
                if target and ident:
                    node_hash = digest((info.filename + "\0" + str(scope_index) + "\0" + ident).encode("utf8"))
                    links[target].add(node_hash)
                    direct = anatomical_label(node.get("name",""))
                    candidate_labels = hierarchy.get(ident,set())
                    for term, side in candidate_labels:
                        counts["hierarchyCandidate:"+term+":"+side] += 1
                    for hint in source.bounded_label_hints(node.get("name",""), KNEE_TERMS):
                        counts["modelNameHint:"+hint] += 1
                    for hint in source.bounded_label_hints(PurePosixPath(target).stem, KNEE_TERMS):
                        counts["meshFilenameHint:"+hint] += 1
                    if anatomical is not None:
                        anatomical[target].add(direct or ('UNRECOGNIZED', 'UNSPECIFIED'))
                        # Hierarchy-only hints remain held, never replace unknown direct evidence.
                        if direct and candidate_labels and candidate_labels != {direct}:
                            anatomical[target].update(candidate_labels)
                    transform_ids = source.mrml_role_ids(node, "transform", ("transformNodeRef", "parentTransformNodeRef"))
                    if transform_ids is None or transform_ids:
                        transform_links[target].add(node_hash)
                        counts["modelNodesWithTransformRef"] += 1
                    counts["linkedModelNodes"] += 1
                else:
                    counts["unresolvedModelNodes"] += 1
    return links, dict(counts), transform_links

def glb_roundtrip(points, indices):
    """Geometry-only GLB in memory, exact native numeric coordinates and indices."""
    positions = np.asarray(points, dtype="<f4")
    faces = np.asarray(indices, dtype="<u4")
    if not np.array_equal(positions.astype("<f8"), points):
        return {"status": "HOLD_FLOAT32_PRECISION"}
    if not np.array_equal(faces.astype("<i8"), indices):
        return {"status": "HOLD_INDEX_PRECISION"}
    p = positions.tobytes(order="C")
    f = faces.tobytes(order="C")
    binary = p + f
    document = {
        "asset": {"version": "2.0", "generator": "MEDCOEL geometry-only audit"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "mode": 4}]}],
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(p), "target": 34962},
                        {"buffer": 0, "byteOffset": len(p), "byteLength": len(f), "target": 34963}],
        "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(points), "type": "VEC3",
                       "min": positions.min(axis=0).tolist(), "max": positions.max(axis=0).tolist()},
                      {"bufferView": 1, "componentType": 5125, "count": len(indices), "type": "SCALAR",
                       "min": [int(faces.min())], "max": [int(faces.max())]}]
    }
    js = json.dumps(document, allow_nan=False, separators=(",", ":")).encode("ascii")
    js += b" " * (-len(js) % 4)
    glb = (struct.pack("<III", 0x46546C67, 2, 28 + len(js) + len(binary)) +
           struct.pack("<II", len(js), 0x4E4F534A) + js +
           struct.pack("<II", len(binary), 0x004E4942) + binary)
    magic, version, total = struct.unpack_from("<III", glb)
    jlen, jtype = struct.unpack_from("<II", glb, 12)
    blen, btype = struct.unpack_from("<II", glb, 20 + jlen)
    data = glb[28+jlen:]
    decoded = json.loads(glb[20:20+jlen])
    if (magic != 0x46546C67 or version != 2 or total != len(glb) or jtype != 0x4E4F534A
        or btype != 0x004E4942 or blen != len(data) or decoded != document):
        raise ValueError("GLB container mismatch")
    restored = np.frombuffer(data, dtype="<f4", count=points.size).reshape(points.shape)
    restored_indices = np.frombuffer(data, dtype="<u4", count=len(indices), offset=len(p))
    if not np.array_equal(restored.astype("<f8"), points) or not np.array_equal(restored_indices.astype("<i8"), indices):
        raise ValueError("GLB roundtrip mismatch")
    return {"status": "EXACT_NATIVE_GLTF_ROUNDTRIP", "glbSHA256": digest(glb), "glbBytes": len(glb),
            "geometryOnly": True, "sourceArraysCopied": False, "sceneTransformsApplied": False,
            "coordinateUnitsValidated": False, "published": False}

def strip_triangles(offsets, connectivity, point_count):
    """Expand VTK triangle strips using alternating winding; retain native arrays in evidence."""
    if len(offsets) < 2 or offsets[0] != 0 or offsets[-1] != len(connectivity) or np.any(np.diff(offsets) < 3):
        raise ValueError("invalid strip offsets")
    if len(connectivity) > 12_000_000 or connectivity.min() < 0 or connectivity.max() >= point_count:
        raise ValueError("strip index out of range")
    count = int(np.sum(np.diff(offsets) - 2))
    if not 1 <= count <= 4_000_000:
        raise ValueError("strip triangle cap")
    tri = np.empty((count, 3), dtype="<i8")
    k = 0
    for start, end in zip(offsets[:-1], offsets[1:]):
        strip = connectivity[start:end]
        length = len(strip) - 2
        a, bb, c = strip[:-2], strip[1:-1], strip[2:]
        block = tri[k:k+length]
        block[:, 0] = a
        block[:, 1] = bb
        block[:, 2] = c
        block[1::2, 0] = bb[1::2]
        block[1::2, 1] = a[1::2]
        k += length
    distinct = (tri[:,0] != tri[:,1]) & (tri[:,1] != tri[:,2]) & (tri[:,0] != tri[:,2])
    # Degenerate connector triangles carry no surface. Count them explicitly.
    skipped = int(np.count_nonzero(~distinct))
    if not np.any(distinct):
        raise ValueError("empty strip surface")
    return tri[distinct].reshape(-1), skipped

def parse_mesh(raw, scratch, diagnostics=None):
    if not raw.startswith(b"# vtk DataFile Version") or len(raw) > 32 * 1024**2:
        raise ValueError("unsupported legacy VTK")
    file = scratch / "source.vtk"
    file.write_bytes(raw)
    errors = []
    reader = vtkPolyDataReader()
    reader.AddObserver("ErrorEvent", lambda *_: errors.append(True))
    reader.SetFileName(str(file))
    if not reader.IsFilePolyData():
        raise ValueError("not polydata")
    reader.Update()
    mesh = reader.GetOutput()
    if errors or reader.GetErrorCode() or mesh is None or mesh.GetPoints() is None:
        raise ValueError("VTK reader failure")
    n = mesh.GetNumberOfPoints()
    polys = mesh.GetNumberOfPolys()
    strips = mesh.GetNumberOfStrips()
    verts = mesh.GetNumberOfVerts()
    lines = mesh.GetNumberOfLines()
    if diagnostics is not None:
        diagnostics.update({"vtkPoints": n, "vtkPolys": polys, "vtkStrips": strips, "vtkVerts": verts, "vtkLines": lines})
    if not 3 <= n <= 2_000_000 or not 1 <= polys + strips <= 4_000_000:
        raise ValueError("mesh size")
    if verts or lines or (polys and strips) or mesh.GetNumberOfCells() != polys + strips:
        raise ValueError("nonpolygon geometry")
    cells = mesh.GetStrips() if strips else mesh.GetPolys()
    if cells is None:
        raise ValueError("mesh size")
    points = np.asarray(vtk_to_numpy(mesh.GetPoints().GetData()), dtype="<f8")
    offsets = np.asarray(vtk_to_numpy(cells.GetOffsetsArray()), dtype="<i8")
    indices = np.asarray(vtk_to_numpy(cells.GetConnectivityArray()), dtype="<i8")
    if points.shape != (n, 3) or not np.isfinite(points).all():
        raise ValueError("invalid positions")
    if len(offsets) != cells.GetNumberOfCells() + 1 or offsets[0] != 0 or offsets[-1] != len(indices):
        raise ValueError("invalid offsets")
    native_index_sha = digest(indices.tobytes(order="C"))
    native_offset_sha = digest(offsets.tobytes(order="C"))
    skipped = 0
    if strips:
        indices, skipped = strip_triangles(offsets, indices, n)
    elif np.any(np.diff(offsets) != 3):
        raise ValueError("nontriangular polygons: no automatic triangulation")
    if len(indices) == 0 or indices.min() < 0 or indices.max() >= n:
        raise ValueError("index out of range")
    tri = indices.reshape(-1, 3)
    distinct = (tri[:, 0] != tri[:, 1]) & (tri[:, 1] != tri[:, 2]) & (tri[:, 0] != tri[:, 2])
    if not distinct.all():
        raise ValueError("repeated vertex index")
    return {"points": n, "triangles": len(tri),
            "nativePositionsSHA256": digest(points.tobytes(order="C")),
            "nativeConnectivitySHA256": native_index_sha,
            "nativeOffsetsSHA256": native_offset_sha,
            "triangleConnectivitySHA256": digest(indices.tobytes(order="C")),
            "nativeTopology": "TRIANGLE_STRIPS" if strips else "TRIANGLE_POLYGONS",
            "degenerateStripConnectorTrianglesSkipped": skipped,
            "glbRoundtrip": glb_roundtrip(points, indices),
            "frame": "VTK native coordinates; scene transforms not applied",
            "pointDataArrays": mesh.GetPointData().GetNumberOfArrays(),
            "cellDataArrays": mesh.GetCellData().GetNumberOfArrays(),
            "fieldDataArrays": mesh.GetFieldData().GetNumberOfArrays()}

def audit(archive, receipt, scratch):
    if not 0 < archive.stat().st_size <= source.CAP:
        raise ValueError("archive size outside policy")
    if source.sha_file(archive) != receipt["archiveSHA256"]:
        raise ValueError("publisher archive changed")
    if source.inventory(archive)["meshMembers"] != receipt["meshMembers"]:
        raise ValueError("mesh inventory changed")
    with zipfile.ZipFile(archive) as z:
        meshes = [i for i in z.infolist() if PurePosixPath(i.filename).suffix.lower() == ".vtk"]
        if len(meshes) != 48:
            raise ValueError("unexpected VTK count")
        anatomical = {i.filename: set() for i in meshes}
        links, scene_counts, transform_links = scene_links(z, set(anatomical), anatomical)
        rows = []
        for i in meshes:
            raw = z.read(i)
            row = {"sourceSHA256": digest(raw), "memberBytes": len(raw),
                   "sceneNodeLinks": len(links[i.filename]),
                   "sceneNodeIdentityHashes": sorted(links[i.filename]),
                   "sceneNodesWithTransformRef": len(transform_links[i.filename]),
                   "sceneTransformsApplied": False}
            labels = anatomical[i.filename]
            recognized = sorted(labels - {("UNRECOGNIZED", "UNSPECIFIED")})
            row["anatomicalCandidates"] = [{"term": term, "side": side} for term, side in recognized]
            row["anatomicalIdentityStatus"] = ("EXACT_ALLOWLIST_LABEL_CANDIDATE" if len(labels) == 1 and recognized else "HOLD_UNRESOLVED_OR_CONFLICTING_LABEL")
            row["lateralityValidated"] = False
            try:
                row.update(parse_mesh(raw, scratch, row))
                row["status"] = "NATIVE_TRIANGLE_GEOMETRY_PARSED"
            except (ValueError, TypeError, AttributeError, RuntimeError) as exc:
                row["status"] = "HOLD_GEOMETRY"
                # Do not echo parser text or source names, which could include metadata.
                row["reasonClass"] = type(exc).__name__
                # Only expose reason strings authored by this script, not VTK metadata.
                safe_reasons = {"unsupported legacy VTK", "not polydata", "VTK reader failure",
                                "mesh size", "nonpolygon geometry", "invalid positions",
                                "invalid offsets", "nontriangular polygons: no automatic triangulation",
                                "index out of range", "repeated vertex index", "GLB container mismatch",
                                "GLB roundtrip mismatch", "invalid strip offsets", "strip index out of range",
                                "strip triangle cap", "empty strip surface"}
                row["reasonCode"] = str(exc) if isinstance(exc, ValueError) and str(exc) in safe_reasons else "UNCLASSIFIED_PARSER_ERROR"
            rows.append(row)
    return {"schema": 1, "sourceArchiveSHA256": receipt["archiveSHA256"],
            "meshCount": len(rows), "parsed": sum(r["status"] == "NATIVE_TRIANGLE_GEOMETRY_PARSED" for r in rows),
            "held": sum(r["status"] != "NATIVE_TRIANGLE_GEOMETRY_PARSED" for r in rows),
            "linkedMeshes": sum(r["sceneNodeLinks"] > 0 for r in rows),
            "exactGLBRoundtrips": sum(r.get("glbRoundtrip", {}).get("status") == "EXACT_NATIVE_GLTF_ROUNDTRIP" for r in rows),
            "sceneCounts": scene_counts, "rows": rows, "privacyReview": "PENDING",
            "exactLabelCandidates": sum(r["anatomicalIdentityStatus"] == "EXACT_ALLOWLIST_LABEL_CANDIDATE" for r in rows),
            "heldIdentity": sum(r["anatomicalIdentityStatus"] != "EXACT_ALLOWLIST_LABEL_CANDIDATE" for r in rows),
            "lateralityValidated": False,
            "assetRightsReviewed": False, "clinicalValidation": False,
            "registrationValidated": False, "geometryPublished": 0, "publicRelease": "NO_GO"}

def main():
    receipt = json.loads((ROOT / "licensing/atlas-publication/spl-knee-source-inventory-20261125.json").read_text())["report"]
    with tempfile.TemporaryDirectory(prefix="medcoel-spl-mesh-audit-") as d:
        scratch = Path(d)
        archive = scratch / "source.zip"
        subprocess.run(["curl", "--fail", "--silent", "--show-error", "--proto", "=https",
                        "--max-time", "300", "--max-filesize", str(source.CAP),
                        "--output", str(archive), source.SOURCE], check=True)
        report = audit(archive, receipt, scratch)
        print("SPL KNEE NATIVE GEOMETRY AUDIT " + json.dumps(report, separators=(",", ":")))
        if report["held"]:
            raise SystemExit("One or more meshes held; review bounded report")
        if report["exactGLBRoundtrips"] != report["meshCount"]:
            raise SystemExit("One or more GLB conversions held; no integration allowed")

FIXTURE = b"# vtk DataFile Version 3.0\nEngineering fixture\nASCII\nDATASET POLYDATA\nPOINTS 3 float\n0 0 0 1 0 0 0 1 0\nPOLYGONS 1 4\n3 0 1 2\n"
class Tests(unittest.TestCase):
    def test_allowlist_preserves_laterality_and_rejects_arbitrary_metadata(self):
        self.assertEqual(anatomical_label('Left ACL'), ('anterior cruciate ligament', 'LEFT'))
        self.assertEqual(anatomical_label('medial_meniscus_right'), ('medial meniscus', 'RIGHT'))
        self.assertEqual(anatomical_label('PCL'), ('posterior cruciate ligament', 'UNSPECIFIED'))
        for value in ('left right ACL', 'ACL of patient X', 'John Doe', 'ACL 1', 'meniscus'):
            self.assertIsNone(anatomical_label(value))
    def test_conflicting_scene_labels_not_collapsed(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'test.zip'
            with zipfile.ZipFile(p, 'w') as z:
                z.writestr('pack/scene.mrml', '<MRML><ModelStorage id="s" fileName="Data/test.vtk"/><Model id="a" storageNodeRef="s" name="ACL"/><Model id="b" storageNodeRef="s" name="PCL"/></MRML>')
            labels = {'pack/Data/test.vtk': set()}
            with zipfile.ZipFile(p) as z:
                scene_links(z, set(labels), labels)
            self.assertEqual(len(labels['pack/Data/test.vtk']), 2)
    def test_triangle(self):
        with tempfile.TemporaryDirectory() as d:
            r = parse_mesh(FIXTURE, Path(d))
            self.assertEqual((r["points"], r["triangles"]), (3, 1))
            self.assertEqual(r["nativeConnectivitySHA256"], digest(np.array([0,1,2], dtype="<i8").tobytes()))
            self.assertEqual(r["glbRoundtrip"]["status"], "EXACT_NATIVE_GLTF_ROUNDTRIP")
            self.assertFalse(r["glbRoundtrip"]["sourceArraysCopied"])
    def test_triangle_strip_winding_and_native_evidence(self):
        with tempfile.TemporaryDirectory() as d:
            strip = FIXTURE.replace(b"POINTS 3 float\n0 0 0 1 0 0 0 1 0", b"POINTS 4 float\n0 0 0 1 0 0 0 1 0 1 1 0").replace(b"POLYGONS 1 4\n3 0 1 2", b"TRIANGLE_STRIPS 1 5\n4 0 1 2 3")
            r = parse_mesh(strip, Path(d))
            self.assertEqual(r["nativeTopology"], "TRIANGLE_STRIPS")
            self.assertEqual(r["triangles"], 2)
            self.assertEqual(r["nativeConnectivitySHA256"], digest(np.array([0,1,2,3], dtype="<i8").tobytes()))
            self.assertEqual(r["triangleConnectivitySHA256"], digest(np.array([0,1,2,2,1,3], dtype="<i8").tobytes()))
            self.assertEqual(r["glbRoundtrip"]["status"], "EXACT_NATIVE_GLTF_ROUNDTRIP")
    def test_strip_invalid_and_degenerate_connector(self):
        with self.assertRaises(ValueError):
            strip_triangles(np.array([0,3]), np.array([0,1,9]), 4)
        indices, skipped = strip_triangles(np.array([0,5]), np.array([0,1,2,2,3]), 4)
        self.assertEqual(indices.tolist(), [0,1,2])
        self.assertEqual(skipped, 2)
    def test_float64_precision_held(self):
        points = np.array([[0.1,0,0],[1,0,0],[0,1,0]], dtype="<f8")
        result = glb_roundtrip(points, np.array([0,1,2], dtype="<i8"))
        self.assertEqual(result["status"], "HOLD_FLOAT32_PRECISION")
    def test_polygon_not_triangulated(self):
        with tempfile.TemporaryDirectory() as d:
            quad = FIXTURE.replace(b"POINTS 3 float\n0 0 0 1 0 0 0 1 0", b"POINTS 4 float\n0 0 0 1 0 0 0 1 0 1 1 0").replace(b"POLYGONS 1 4\n3 0 1 2", b"POLYGONS 1 5\n4 0 1 2 3")
            with self.assertRaises(ValueError):
                parse_mesh(quad, Path(d))
    def test_scene_link_without_loading(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "fixture.zip"
            with zipfile.ZipFile(p, "w") as z:
                z.writestr("pack/scene.mrml", '<MRML><ModelStorage id="storage" fileName="Data/test.vtk"/><Model id="model" storageNodeRef="storage"/></MRML>')
            with zipfile.ZipFile(p) as z:
                links, counts, transforms = scene_links(z, {"pack/Data/test.vtk"})
                self.assertEqual(len(links["pack/Data/test.vtk"]), 1)
                self.assertEqual(counts["linkedModelNodes"], 1)
                self.assertEqual(len(transforms["pack/Data/test.vtk"]), 0)
    def test_modern_mrml_role_link_and_conflict(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "fixture.zip"
            with zipfile.ZipFile(p, "w") as z:
                z.writestr("pack/scene.mrml", '<MRML><ModelStorage id="s" fileName="Data/test.vtk"/><ModelStorage id="t" fileName="Data/other.vtk"/><Model id="m" name="Left ACL" references="display:d;storage:s;transform:t1;"/><Model id="conflict" name="PCL" storageNodeRef="s" references="storage:t;"/></MRML>')
            labels = {"pack/Data/test.vtk": set(), "pack/Data/other.vtk": set()}
            with zipfile.ZipFile(p) as z:
                links, counts, transforms = scene_links(z, set(labels), labels)
            self.assertEqual(labels["pack/Data/test.vtk"], {("anterior cruciate ligament", "LEFT")})
            self.assertEqual(len(links["pack/Data/test.vtk"]), 1)
            self.assertEqual(transforms["pack/Data/test.vtk"], links["pack/Data/test.vtk"])
            self.assertEqual(counts["conflictingStorageReferences"], 1)
            self.assertFalse(links["pack/Data/other.vtk"])
    def test_snapshot_id_reuse_does_not_cross_link(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "fixture.zip"
            with zipfile.ZipFile(p, "w") as z:
                z.writestr("scene.mrml", '<MRML><ModelStorage id="s" fileName="a.vtk"/><Model id="m" name="Left ACL" storageNodeRef="s"/><SceneView><ModelStorage id="s" fileName="b.vtk"/><Model id="m" name="Right PCL" storageNodeRef="s"/></SceneView><SceneView><Model id="m" name="ACL" storageNodeRef="s"/></SceneView></MRML>')
            labels = {"a.vtk": set(), "b.vtk": set()}
            with zipfile.ZipFile(p) as z:
                links, counts, transforms = scene_links(z, set(labels), labels)
            self.assertEqual(labels["a.vtk"], {("anterior cruciate ligament", "LEFT")})
            self.assertEqual(labels["b.vtk"], {("posterior cruciate ligament", "RIGHT")})
            self.assertEqual(counts["linkedModelNodes"], 2)
            self.assertEqual(counts["storageIDAbsent"], 1)
            self.assertEqual(counts.get("duplicateStorageID", 0), 0)
    def test_transform_reference_not_applied(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "fixture.zip"
            with zipfile.ZipFile(p, "w") as z:
                z.writestr("pack/scene.mrml", '<MRML><ModelStorage id="s" fileName="Data/test.vtk"/><Model id="m" storageNodeRef="s" transformNodeRef="t"/></MRML>')
            with zipfile.ZipFile(p) as z:
                links, counts, transforms = scene_links(z, {"pack/Data/test.vtk"})
                self.assertEqual(transforms["pack/Data/test.vtk"], links["pack/Data/test.vtk"])
                self.assertEqual(counts["modelNodesWithTransformRef"], 1)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--test"]:
        unittest.main(argv=[sys.argv[0]])
    elif not sys.argv[1:]:
        main()
    else:
        raise SystemExit("unknown arguments")
