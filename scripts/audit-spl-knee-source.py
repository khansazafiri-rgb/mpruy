"""Inventory only. No extraction, execution, distribution, or patient metadata logging."""
import hashlib
import json
import stat
import subprocess
import tempfile
import unittest
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath

SOURCE = "https://www.openanatomy.org/atlases/nac/knee-2016-09.zip"
CAP = 512 * 1024**2
MESH = {".vtk", ".vtp", ".stl", ".obj", ".ply", ".gii", ".glb", ".gltf"}
SCENE = {".mrml", ".json"}
VOLUME = {".nrrd", ".nhdr", ".nii", ".mha", ".mhd", ".dcm"}

# MRML v4.10.2 supports both legacy role attributes and role:id1 id2; records.
# Source: Slicer/Slicer Libs/MRML/Core/vtkMRMLNode.cxx (ParseReferencesAttribute)
# and vtkMRMLStorableNode.cxx (storage role). Never emit node IDs.
def mrml_role_ids(node, role, legacy_attributes):
    legacy = {x for a in legacy_attributes for x in node.get(a, "").split()}
    modern = set()
    for record in node.get("references", "").split(";"):
        if not record.strip():
            continue
        key, sep, values = record.partition(":")
        if not sep or ":" in values:
            return None
        if key.strip() == role:
            modern.update(values.split())
    if legacy and modern and legacy != modern:
        return None
    return legacy or modern

def model_storage_target(node, storage, counts):
    ids = mrml_role_ids(node, "storage", ("storageNodeRef",))
    if ids is None:
        counts["conflictingStorageReferences"] += 1
        return None
    if len(ids) != 1:
        counts["missingOrMultipleStorageReferences"] += 1
        return None
    if node.get("references") and not node.get("storageNodeRef"):
        counts["modernStorageReferences"] += 1
    key = next(iter(ids))
    target = storage.get(key)
    if target is None:
        counts["unresolvedStorageReference"] += 1
        counts["storageIDPresentButPathHeld" if key in storage else "storageIDAbsent"] += 1
    return target

def storage_path_diagnostics(scene, filename, mesh_paths, counts):
    """Bounded aggregate evidence only; no fallback selection and no raw paths."""
    rel = PurePosixPath(filename)
    if not filename or rel.is_absolute() or ".." in rel.parts or "\\" in filename or ":" in filename:
        counts["unsafeOrMissingStoragePath"] += 1
        return None
    target = str(PurePosixPath(scene).parent / rel)
    if target in mesh_paths:
        counts["sceneRelativeExactMeshPath"] += 1
        return target
    counts["sceneRelativeMeshPathAbsent"] += 1
    if str(rel) in mesh_paths:
        counts["archiveRootExactPathCandidateHeld"] += 1
    basename_matches = sum(PurePosixPath(x).name == rel.name for x in mesh_paths)
    if basename_matches:
        counts["uniqueBasenameCandidateHeld" if basename_matches == 1 else "ambiguousBasenameCandidatesHeld"] += 1
    elif any(PurePosixPath(x).name.casefold() == rel.name.casefold() for x in mesh_paths):
        counts["caseFoldBasenameCandidateHeld"] += 1
    else:
        counts["noBasenameCandidate"] += 1
    return None

def inventory(archive):
    counts, mesh_digests = Counter(), []
    total = 0
    with zipfile.ZipFile(archive) as z:
        seen = set()
        entries = z.infolist()
        if len(entries) > 20000:
            raise ValueError("member count limit")
        for info in entries:
            p = PurePosixPath(info.filename)
            if (not info.filename or "\\" in info.filename or ":" in info.filename
                or p.is_absolute() or ".." in p.parts or info.filename.casefold() in seen
                or stat.S_ISLNK(info.external_attr >> 16) or info.flag_bits & 1):
                raise ValueError("unsafe archive member")
            seen.add(info.filename.casefold())
            if info.is_dir():
                continue
            total += info.file_size
            if total > 2 * CAP or info.file_size > CAP:
                raise ValueError("uncompressed size limit")
            ext = p.suffix.lower()
            category = ("mesh" if ext in MESH else "scene" if ext in SCENE else
                        "volume" if ext in VOLUME or p.name.lower().endswith(".nii.gz") else
                        "nested_archive" if ext in {".zip", ".mrb"} else "other")
            counts[category] += 1
            if category == "mesh":
                h = hashlib.sha256()
                count = 0
                with z.open(info) as stream:
                    while chunk := stream.read(1024**2):
                        count += len(chunk)
                        if count > info.file_size:
                            raise ValueError("size mismatch")
                        h.update(chunk)
                if count != info.file_size:
                    raise ValueError("truncated member")
                mesh_digests.append({"extension": ext, "bytes": count, "sha256": h.hexdigest()})
    return {"counts": dict(counts), "uncompressedBytes": total, "meshMembers": mesh_digests}

def sha_file(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

def main():
    with tempfile.TemporaryDirectory(prefix="medcoel-spl-knee-") as tmp:
        file = Path(tmp) / "source.zip"
        subprocess.run(["curl", "--fail", "--silent", "--show-error",
                        "--proto", "=https", "--max-time", "300",
                        "--max-filesize", str(CAP), "--output", str(file), SOURCE],
                       check=True)
        if not 0 < file.stat().st_size <= CAP:
            raise ValueError("download size limit")
        report = inventory(file)
        print("SPL KNEE SOURCE INVENTORY " + json.dumps({
            "schema": 1, "source": SOURCE, "archiveSHA256": sha_file(file),
            "archiveBytes": file.stat().st_size, **report,
            "licenseClaim": "3D Slicer License section B",
            "privacyReview": "PENDING", "assetRightsReviewed": False,
            "geometryParsed": False, "registrationValidated": False,
            "clinicalValidation": False, "geometryPublished": 0,
            "publicRelease": "NO_GO"
        }, separators=(",", ":")))
        if not report["counts"].get("mesh") and not report["counts"].get("nested_archive"):
            raise ValueError("no direct mesh or nested bundle found")

class Tests(unittest.TestCase):
    def test_inventory_no_extraction(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "test.zip"
            with zipfile.ZipFile(p, "w") as z:
                z.writestr("test/fixture.vtk", b"engineering fixture")
                z.writestr("test/fixture.nrrd", b"engineering fixture")
            r = inventory(p)
            self.assertEqual(r["counts"], {"mesh": 1, "volume": 1})
            self.assertEqual(r["meshMembers"][0]["sha256"], hashlib.sha256(b"engineering fixture").hexdigest())
            self.assertEqual(list(Path(d).iterdir()), [p])
    def test_mrml_storage_role_and_conflicts(self):
        from xml.etree.ElementTree import fromstring
        stores = {"s": "Data/a.vtk", "t": "Data/b.vtk"}
        counts = Counter()
        for attrs in ('storageNodeRef="s "', 'references="display:d;storage:s;"',
                      'storageNodeRef="s" references="storage:s;"'):
            self.assertEqual(model_storage_target(fromstring("<Model " + attrs + "/>"), stores, counts), "Data/a.vtk")
        for attrs in ('references="storage:s t;"', 'storageNodeRef="s" references="storage:t;"',
                      'references="storage:s;bad"', 'references="storage:unknown;"', 'references="display:s;"'):
            self.assertIsNone(model_storage_target(fromstring("<Model " + attrs + "/>"), stores, counts))
        self.assertEqual(counts["conflictingStorageReferences"], 2)
    def test_storage_diagnostics_never_promote_fallbacks(self):
        counts = Counter()
        paths = {"pack/Data/a.vtk", "Data/b.vtk", "other/c.vtk", "other2/c.vtk"}
        self.assertEqual(storage_path_diagnostics("pack/scene.mrml", "Data/a.vtk", paths, counts), "pack/Data/a.vtk")
        for name in ("Data/b.vtk", "c.vtk", "A.vtk", "../a.vtk", "/a.vtk"):
            self.assertIsNone(storage_path_diagnostics("pack/scene.mrml", name, paths, counts))
        self.assertEqual(counts["archiveRootExactPathCandidateHeld"], 1)
        self.assertEqual(counts["uniqueBasenameCandidateHeld"], 1)
        self.assertEqual(counts["ambiguousBasenameCandidatesHeld"], 1)
        self.assertEqual(counts["caseFoldBasenameCandidateHeld"], 1)
        self.assertEqual(counts["unsafeOrMissingStoragePath"], 2)
    def test_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "test.zip"
            with zipfile.ZipFile(p, "w") as z:
                z.writestr("../escape.vtk", b"fixture")
            with self.assertRaises(ValueError):
                inventory(p)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--test"]:
        unittest.main(argv=[sys.argv[0]])
    elif not sys.argv[1:]:
        main()
    else:
        raise SystemExit("unknown arguments")
