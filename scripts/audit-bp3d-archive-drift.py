"""Read-only comparison of retained and newly acquired official BP3D ZIPs.
Never changes source pins, GLBs, review records or release authorization.
"""
import argparse
import hashlib
import json
import re
import stat
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath

MAX_ARCHIVE = 512 * 1024**2
MAX_TOTAL = 8 * 1024**3
MAX_MEMBER = 128 * 1024**2
MAX_MEMBERS = 30000
HEX = re.compile(r"[0-9a-f]{64}")

def digest(stream):
    h = hashlib.sha256()
    size = 0
    for chunk in iter(lambda: stream.read(1024**2), b""):
        h.update(chunk)
        size += len(chunk)
    return {"sha256": h.hexdigest(), "bytes": size}

def inventory(file, expected):
    if not HEX.fullmatch(expected):
        raise ValueError("Expected SHA-256 must be from a trusted receipt")
    file = Path(file)
    if file.is_symlink() or not file.is_file() or not 0 < file.stat().st_size <= MAX_ARCHIVE:
        raise ValueError("Unsafe archive")
    with file.open("rb") as stream:
        receipt = digest(stream)
        if receipt["sha256"] != expected:
            raise ValueError("Archive pin mismatch")
        stream.seek(0)
        with zipfile.ZipFile(stream) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_MEMBERS:
                raise ValueError("Too many members")
            seen, objects, other = set(), {}, {}
            total = 0
            for item in infos:
                name = item.filename
                p = PurePosixPath(name)
                mode = item.external_attr >> 16
                if (not name or "\\" in name or ":" in name or p.is_absolute()
                    or ".." in p.parts or name.casefold() in seen
                    or stat.S_ISLNK(mode) or item.flag_bits & 1):
                    raise ValueError("Unsafe or duplicate archive member")
                seen.add(name.casefold())
                if item.is_dir():
                    continue
                total += item.file_size
                if item.file_size > MAX_MEMBER or total > MAX_TOTAL:
                    raise ValueError("Archive expansion limit")
                with archive.open(item) as member:
                    raw = digest(member)
                if raw["bytes"] != item.file_size:
                    raise ValueError("Member size mismatch")
                if p.suffix.lower() == ".obj":
                    if not re.fullmatch(r"FJ\d+[A-Za-z]?", p.stem) or p.stem in objects or not raw["bytes"]:
                        raise ValueError("Unexpected or duplicate OBJ identity")
                    objects[p.stem] = {"member": name, **raw}
                else:
                    other[name] = raw
            if not objects:
                raise ValueError("No official OBJ identities")
        stream.seek(0)
        if digest(stream) != receipt:
            raise ValueError("Archive changed during audit")
    return receipt, objects, other

def compare(old, new, old_sha, new_sha):
    a, x, old_other = inventory(old, old_sha)
    b, y, new_other = inventory(new, new_sha)
    rows = []
    for ident in sorted(x.keys() | y.keys()):
        before, after = x.get(ident), y.get(ident)
        if before is None:
            status = "ADDED"
        elif after is None:
            status = "REMOVED"
        elif before["sha256"] != after["sha256"]:
            status = "RAW_OBJ_CHANGED"
        elif before["member"] != after["member"]:
            status = "IDENTICAL_OBJ_RELOCATED"
        else:
            status = "IDENTICAL_OBJ"
        rows.append({"id": ident, "status": status, "before": before, "after": after})
    counts = {}
    for row in rows:
        s = row["status"]
        counts[s] = counts.get(s, 0) + 1
    equal = all(r["status"] in {"IDENTICAL_OBJ", "IDENTICAL_OBJ_RELOCATED"} for r in rows)
    return {
        "schema": 1, "oldArchive": a, "newArchive": b,
        "counts": counts, "rows": rows, "allRawObjBytesIdentical": equal,
        "nonObjMembersIdentical": old_other == new_other,
        "oldNonObjMembers": old_other, "newNonObjMembers": new_other,
        "scope": "Raw member equality only; names/elements tables and derived GLBs require separate replay.",
        "sourcePinUpdated": False, "registrationValidated": False,
        "clinicalValidation": False, "approvedForDistribution": False,
        "publicRelease": "NO_GO",
    }

class Tests(unittest.TestCase):
    def make(self, folder, name, entries, compression=zipfile.ZIP_STORED):
        p = Path(folder) / name
        with zipfile.ZipFile(p, "w", compression=compression) as z:
            for k, v in entries:
                z.writestr(k, v)
        with p.open("rb") as f:
            return p, digest(f)["sha256"]

    def test_repacked(self):
        with tempfile.TemporaryDirectory() as d:
            a, x = self.make(d, "a.zip", [("FJ1.obj", b"v 0 0 0\n")])
            b, y = self.make(d, "b.zip", [("FJ1.obj", b"v 0 0 0\n")], zipfile.ZIP_DEFLATED)
            self.assertNotEqual(x, y)
            r = compare(a, b, x, y)
            self.assertTrue(r["allRawObjBytesIdentical"])
            self.assertEqual(r["publicRelease"], "NO_GO")

    def test_changed_removed_added_relocated(self):
        with tempfile.TemporaryDirectory() as d:
            a, x = self.make(d, "a.zip", [("FJ1.obj", b"a"), ("FJ2.obj", b"b"), ("FJ4.obj", b"d")])
            b, y = self.make(d, "b.zip", [("FJ1.obj", b"z"), ("FJ3.obj", b"c"), ("folder/FJ4.obj", b"d")])
            r = compare(a, b, x, y)
            self.assertFalse(r["allRawObjBytesIdentical"])
            self.assertEqual(r["counts"], {"RAW_OBJ_CHANGED": 1, "REMOVED": 1, "ADDED": 1, "IDENTICAL_OBJ_RELOCATED": 1})

    def test_unsafe_and_bad_pin(self):
        with tempfile.TemporaryDirectory() as d:
            a, x = self.make(d, "a.zip", [("../FJ1.obj", b"a")])
            with self.assertRaises(ValueError):
                inventory(a, x)
            with self.assertRaises(ValueError):
                inventory(a, "0"*64)

    def test_duplicate_identity(self):
        with tempfile.TemporaryDirectory() as d:
            a, x = self.make(d, "a.zip", [("a/FJ1.obj", b"a"), ("b/FJ1.obj", b"a")])
            with self.assertRaises(ValueError):
                inventory(a, x)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--test"]:
        unittest.main(argv=[sys.argv[0]])
    else:
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("old", type=Path)
        parser.add_argument("new", type=Path)
        parser.add_argument("--old-sha256", required=True)
        parser.add_argument("--new-sha256", required=True)
        args = parser.parse_args()
        result = compare(args.old, args.new, args.old_sha256, args.new_sha256)
        print(json.dumps(result, indent=2))
        if not result["allRawObjBytesIdentical"]:
            sys.exit(2)
