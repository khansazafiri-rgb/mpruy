"""Exact pinned SPL mesh parse; no MRML execution, volume reading or geometry publication."""
import hashlib
import importlib.util
import json
import subprocess
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

def scene_links(z, mesh_paths):
    """Resolve only local MRML model/storage references; never load a scene or volume."""
    links = {p: set() for p in mesh_paths}
    counts = Counter()
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
        storage = {}
        for node in root.iter():
            tag = node.tag.rsplit("}", 1)[-1].lower()
            if tag == "modelstorage":
                key = node.get("id", "")
                file = unquote(node.get("fileName", ""))
                rel = PurePosixPath(file)
                if not key or not file or rel.is_absolute() or ".." in rel.parts or "\\" in file or ":" in file:
                    continue
                target = str(PurePosixPath(info.filename).parent / rel)
                if key in storage:
                    storage[key] = None
                else:
                    storage[key] = target if target in mesh_paths else None
        for node in root.iter():
            if node.tag.rsplit("}", 1)[-1].lower() != "model":
                continue
            target = storage.get(node.get("storageNodeRef", ""))
            ident = node.get("id", "")
            if target and ident:
                links[target].add(digest((info.filename + "\0" + ident).encode("utf8")))
                counts["linkedModelNodes"] += 1
            else:
                counts["unresolvedModelNodes"] += 1
    return links, dict(counts)

def parse_mesh(raw, scratch):
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
    cells = mesh.GetPolys()
    if not 3 <= n <= 2_000_000 or cells is None or not 1 <= cells.GetNumberOfCells() <= 4_000_000:
        raise ValueError("mesh size")
    if mesh.GetNumberOfCells() != cells.GetNumberOfCells():
        raise ValueError("nonpolygon geometry")
    points = np.asarray(vtk_to_numpy(mesh.GetPoints().GetData()), dtype="<f8")
    offsets = np.asarray(vtk_to_numpy(cells.GetOffsetsArray()), dtype="<i8")
    indices = np.asarray(vtk_to_numpy(cells.GetConnectivityArray()), dtype="<i8")
    if points.shape != (n, 3) or not np.isfinite(points).all():
        raise ValueError("invalid positions")
    if len(offsets) != cells.GetNumberOfCells() + 1 or offsets[0] != 0 or offsets[-1] != len(indices):
        raise ValueError("invalid offsets")
    if np.any(np.diff(offsets) != 3):
        raise ValueError("nontriangular polygons: no automatic triangulation")
    if indices.min() < 0 or indices.max() >= n:
        raise ValueError("index out of range")
    tri = indices.reshape(-1, 3)
    distinct = (tri[:, 0] != tri[:, 1]) & (tri[:, 1] != tri[:, 2]) & (tri[:, 0] != tri[:, 2])
    if not distinct.all():
        raise ValueError("repeated vertex index")
    return {"points": n, "triangles": len(tri),
            "nativePositionsSHA256": digest(points.tobytes(order="C")),
            "nativeConnectivitySHA256": digest(indices.tobytes(order="C")),
            "frame": "VTK native coordinates; scene transforms not applied",
            "pointDataArrays": mesh.GetPointData().GetNumberOfArrays(),
            "cellDataArrays": mesh.GetCellData().GetNumberOfArrays(),
            "fieldDataArrays": mesh.GetFieldData().GetNumberOfArrays()}

def audit(archive, receipt, scratch):
    if source.sha_file(archive) != receipt["archiveSHA256"]:
        raise ValueError("publisher archive changed")
    if source.inventory(archive)["meshMembers"] != receipt["meshMembers"]:
        raise ValueError("mesh inventory changed")
    with zipfile.ZipFile(archive) as z:
        meshes = [i for i in z.infolist() if PurePosixPath(i.filename).suffix.lower() == ".vtk"]
        if len(meshes) != 48:
            raise ValueError("unexpected VTK count")
        links, scene_counts = scene_links(z, {i.filename for i in meshes})
        rows = []
        for i in meshes:
            raw = z.read(i)
            row = {"sourceSHA256": digest(raw), "memberBytes": len(raw),
                   "sceneNodeLinks": len(links[i.filename]),
                   "sceneNodeIdentityHashes": sorted(links[i.filename])}
            try:
                row.update(parse_mesh(raw, scratch))
                row["status"] = "NATIVE_TRIANGLE_GEOMETRY_PARSED"
            except (ValueError, TypeError, AttributeError, RuntimeError) as exc:
                row["status"] = "HOLD_GEOMETRY"
                # Do not echo parser text or source names, which could include metadata.
                row["reasonClass"] = type(exc).__name__
            rows.append(row)
    return {"schema": 1, "sourceArchiveSHA256": receipt["archiveSHA256"],
            "meshCount": len(rows), "parsed": sum(r["status"] == "NATIVE_TRIANGLE_GEOMETRY_PARSED" for r in rows),
            "held": sum(r["status"] != "NATIVE_TRIANGLE_GEOMETRY_PARSED" for r in rows),
            "linkedMeshes": sum(r["sceneNodeLinks"] > 0 for r in rows),
            "sceneCounts": scene_counts, "rows": rows, "privacyReview": "PENDING",
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

FIXTURE = b"# vtk DataFile Version 3.0\nEngineering fixture\nASCII\nDATASET POLYDATA\nPOINTS 3 float\n0 0 0 1 0 0 0 1 0\nPOLYGONS 1 4\n3 0 1 2\n"
class Tests(unittest.TestCase):
    def test_triangle(self):
        with tempfile.TemporaryDirectory() as d:
            r = parse_mesh(FIXTURE, Path(d))
            self.assertEqual((r["points"], r["triangles"]), (3, 1))
            self.assertEqual(r["nativeConnectivitySHA256"], digest(np.array([0,1,2], dtype="<i8").tobytes()))
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
                links, counts = scene_links(z, {"pack/Data/test.vtk"})
                self.assertEqual(len(links["pack/Data/test.vtk"]), 1)
                self.assertEqual(counts["linkedModelNodes"], 1)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--test"]:
        unittest.main(argv=[sys.argv[0]])
    elif not sys.argv[1:]:
        main()
    else:
        raise SystemExit("unknown arguments")
