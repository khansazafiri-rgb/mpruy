"""Read-only comparison of retained and newly acquired official BP3D ZIPs.
Preserves historical pins and reports only the exact verified publisher license revision.
Never changes GLBs, clinical review records or release authorization.
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
# Full-archive pins bind this exception to one publisher revision. Arbitrary
# comment edits or matching geometry hashes do not qualify.
OLD_ISA_SHA256 = "40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e"
NEW_ISA_SHA256 = "ac7d9ab0b3d75b4c75445f0f39e3782f309bbb321d2191f449773107ae504793"
OLD_LICENSE = b'# The license for this database is specified in the Creative Commons Attribution-Share Alike 2.1 Japan. If you use data from this database, please be sure attribute this database as follows: "BodyParts3D, (c)  The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan".\n# http://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html\n'
NEW_LICENSE = b'# Please refer to the following page for license information:\n# https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html\n'

def exact_license_comment_change(before, after):
    if before.count(OLD_LICENSE) != 1 or after.count(NEW_LICENSE) != 1:
        return False
    return before.replace(OLD_LICENSE, NEW_LICENSE, 1) == after

def verified_license_revision(old, new, a, b, x, y, old_other, new_other):
    if (a != {"sha256": OLD_ISA_SHA256, "bytes": 142903898}
        or b != {"sha256": NEW_ISA_SHA256, "bytes": 142717267}
        or len(x) != 2234 or x.keys() != y.keys() or old_other or new_other):
        return None
    with zipfile.ZipFile(old) as az, zipfile.ZipFile(new) as bz:
        ai, bi = az.infolist(), bz.infolist()
        if (len(ai) != 2234 or any(i.is_dir() for i in ai) or len(bi) != 2235
            or [i.filename for i in bi if i.is_dir()] != ["isa_BP3D_4.0_obj_99/"]):
            raise ValueError("Known revision packaging differs")
        for ident, before in x.items():
            after = y[ident]
            if (before["member"] != after["member"]
                or before["bytes"] - after["bytes"] != 238
                or not exact_license_comment_change(az.read(before["member"]), bz.read(after["member"]))):
                raise ValueError("Known revision contains an unexpected OBJ change: " + ident)
    for file, expected in [(old, a), (new, b)]:
        with Path(file).open("rb") as stream:
            if digest(stream) != expected:
                raise ValueError("Archive changed during license revision replay")
    return {
        "status": "EXACT_PINNED_PUBLISHER_LICENSE_COMMENT_REVISION",
        "objMembersCompared": 2234, "memberPathsUnchanged": 2234,
        "perOBJBytesRemoved": 238,
        "allGeometryCommandsAndIdentityBytesIdentical": True,
        "allowedPackagingDifference": "One empty isa_BP3D_4.0_obj_99/ directory",
        "publisherLicenseClarification": "https://dbarchive.biosciencedbc.jp/update_histories/181",
        "historicalSourcePinPreserved": True,
    }


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
                    if item.file_size != 0:
                        raise ValueError("Nonempty archive directory")
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
    revision = verified_license_revision(old, new, a, b, x, y, old_other, new_other)
    return {
        "schema": 1, "oldArchive": a, "newArchive": b,
        "verifiedPublisherRevision": revision,
        "technicalSourceEquivalent": (equal and old_other == new_other) or revision is not None,
        "counts": counts, "rows": rows, "allRawObjBytesIdentical": equal,
        "nonObjMembersIdentical": old_other == new_other,
        "oldNonObjMembers": old_other, "newNonObjMembers": new_other,
        "scope": "Raw member equality, or exact pinned license-comment-only revision. Publisher names/elements tables and derived GLBs require separate replay; no clinical or release approval.",
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

    def test_exact_license_change(self):
        a = OLD_LICENSE + b"# English name : left nerve\nv 1 0 0\nf 1 2 3\n"
        b = a.replace(OLD_LICENSE, NEW_LICENSE)
        self.assertTrue(exact_license_comment_change(a, b))
        for bad in [b.replace(b"v 1", b"v 2"), b.replace(b"left nerve", b"right nerve"), b + NEW_LICENSE]:
            self.assertFalse(exact_license_comment_change(a, bad))
        self.assertFalse(exact_license_comment_change(a + OLD_LICENSE, b))
        self.assertFalse(exact_license_comment_change(b"v 0 0 0", b))

    def test_unpinned_license_change_not_accepted(self):
        with tempfile.TemporaryDirectory() as d:
            a, x = self.make(d, "a.zip", [("FJ1.obj", OLD_LICENSE + b"v 0 0 0\n")])
            b, y = self.make(d, "b.zip", [("FJ1.obj", NEW_LICENSE + b"v 0 0 0\n")])
            r = compare(a, b, x, y)
            self.assertIsNone(r["verifiedPublisherRevision"])
            self.assertFalse(r["technicalSourceEquivalent"])

    def test_extra_non_obj_not_source_equivalent(self):
        with tempfile.TemporaryDirectory() as d:
            a, x = self.make(d, "a.zip", [("FJ1.obj", b"v 0 0 0\n")])
            b, y = self.make(d, "b.zip", [("FJ1.obj", b"v 0 0 0\n"), ("unexpected.bin", b"x")])
            r = compare(a, b, x, y)
            self.assertTrue(r["allRawObjBytesIdentical"])
            self.assertFalse(r["technicalSourceEquivalent"])

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
        if not result["technicalSourceEquivalent"]:
            sys.exit(2)
