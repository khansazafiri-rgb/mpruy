#!/usr/bin/env python3
"""Verify fresh publisher members against retained source hashes; emit no geometry."""
import argparse
import hashlib
import json
import re
import stat
import tempfile
import unittest
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/"
LEDGER = ROOT / "licensing/atlas-publication/checkpoint-evidence/body-1016-rights-ledger.json"
LEDGER_SHA = "6a077ac1bc67d586cbe24cc9bd22c8cda0eca961f91752324ef6c0a51c751f8a"
PROOF = ROOT / "licensing/atlas-publication/checkpoint-evidence/bp3d40-isa-license-comment-member-proof-20261127.json"
PROOF_SHA = "2939dc23c514802c79c302f78cad4324abf9d3e2451dfee00c87ca4d89c947d2"
OLD_LICENSE = b'# The license for this database is specified in the Creative Commons Attribution-Share Alike 2.1 Japan. If you use data from this database, please be sure attribute this database as follows: "BodyParts3D, (c)  The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan".\n# http://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html\n'
NEW_LICENSE = b'# Please refer to the following page for license information:\n# https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html\n'
sha = lambda b: hashlib.sha256(b).hexdigest()

def exact_member(raw, retained_sha):
    if sha(raw) == retained_sha:
        return "EXACT_RETAINED_RAW_BYTES"
    if raw.count(NEW_LICENSE) == 1 and OLD_LICENSE not in raw:
        if sha(raw.replace(NEW_LICENSE, OLD_LICENSE, 1)) == retained_sha:
            return "EXACT_RETAINED_BYTES_EXCEPT_KNOWN_LICENSE_COMMENTS"
    raise ValueError("Source identity/geometry/comments differ from retained raw member")

def safe_index(z, tree):
    entries = z.infolist()
    if not entries or len(entries) > 30000:
        raise ValueError("Archive entry budget")
    prefix = tree + "_BP3D_4.0_obj_99/"
    seen, found, total = set(), {}, 0
    for e in entries:
        p = PurePosixPath(e.filename)
        if (e.filename in seen or p.is_absolute() or ".." in p.parts or "." in p.parts
            or "\\" in e.filename or ":" in e.filename or "\0" in e.filename
            or stat.S_ISLNK(e.external_attr >> 16) or e.flag_bits & 1):
            raise ValueError("Unsafe archive entry")
        seen.add(e.filename)
        total += e.file_size
        if total > 8*1024**3 or e.file_size > 128*1024**2:
            raise ValueError("Archive expansion budget")
        if e.is_dir():
            if e.filename != prefix:
                raise ValueError("Unexpected archive directory")
            continue
        match = re.fullmatch(re.escape(prefix) + r"(FJ\d+[A-Za-z]?)\.obj", e.filename)
        if not match or match.group(1) in found:
            raise ValueError("Unexpected or duplicate source member")
        found[match.group(1)] = e.filename
    if not found:
        raise ValueError("No source OBJ members")
    return found

def compare_members(file, tree, expected, require_full=False):
    rows = []
    with zipfile.ZipFile(file) as z:
        index = safe_index(z, tree)
        if not expected.keys() <= index.keys() or require_full and expected.keys() != index.keys():
            raise ValueError("Retained source member set differs")
        for ident in sorted(expected):
            raw = z.read(index[ident])
            status = exact_member(raw, expected[ident])
            rows.append({"id": ident, "retainedRawSHA256": expected[ident],
                         "currentRawSHA256": sha(raw), "status": status})
    return {"tree": tree, "archiveOBJMembers": len(index), "retainedMembersVerified": len(rows),
            "extraMembersNotApproved": len(index.keys()-expected.keys()),
            "fullArchiveMemberSetCompared": require_full,
            "rows": rows}

def download(name, target, maximum=512*1024**2):
    class Redirects(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            u = urlparse(newurl)
            if u.scheme != "https" or u.hostname != "dbarchive.biosciencedbc.jp":
                raise ValueError("Publisher redirect outside allowlist")
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    url = BASE + name
    opener = urllib.request.build_opener(Redirects())
    n, h = 0, hashlib.sha256()
    with opener.open(url, timeout=900) as response, target.open("xb") as out:
        if response.headers.get("Content-Length") and int(response.headers["Content-Length"]) > maximum:
            raise ValueError("Source download budget")
        while True:
            b = response.read(1024**2)
            if not b:
                break
            n += len(b)
            if n > maximum:
                raise ValueError("Source download budget")
            out.write(b)
            h.update(b)
    return {"url": url, "bytes": n, "sha256": h.hexdigest()}

def main():
    lb, pb = LEDGER.read_bytes(), PROOF.read_bytes()
    if sha(lb) != LEDGER_SHA or sha(pb) != PROOF_SHA:
        raise ValueError("Retained evidence pin changed")
    ledger, proof = json.loads(lb), json.loads(pb)
    if len(ledger["rows"]) != 1016 or len(proof["rows"]) != 2234:
        raise ValueError("Retained evidence scope differs")
    historical = json.loads((ROOT/"licensing/atlas-publication/dbcls-live-audit-20261125.json").read_text())["report"]["receipts"]
    expected_isa = {r["fj"]: r["oldRawSHA256"] for r in proof["rows"]}
    expected_partof = {}
    for row in ledger["rows"]:
        if row["sourceTree"] != "partof":
            continue
        for e in row["sourceElements"]:
            if e["id"] in expected_partof and expected_partof[e["id"]] != e["sha256"]:
                raise ValueError("Conflicting retained member")
            expected_partof[e["id"]] = e["sha256"]
    if len(expected_partof) != 164:
        raise ValueError("Retained PART-OF release scope differs")
    result = {"schema": 1, "scope": "All2234ISA members plus164PART-OF members used by the retained1016-model release. Extra PART-OF objects are not approved.",
              "clinicalValidation": False, "registrationValidated": False, "approvedForDistribution": False,
              "historicalArchivePinsChanged": False, "oldZIPAcquisitionClaimed": False, "geometryPublished": 0, "publicRelease": "NO_GO", "sources": []}
    with tempfile.TemporaryDirectory(prefix="bp40-release-source-") as d:
        folder = Path(d)
        for tree, expected in [("isa",expected_isa),("partof",expected_partof)]:
            file = folder/(tree+".zip")
            receipt = download(tree+"_BP3D_4.0_obj_99.zip",file)
            print("OBSERVED PUBLISHER ARCHIVE " + json.dumps({"tree":tree,**receipt}),flush=True)
            comparison = compare_members(file, tree, expected, require_full=tree=="isa")
            comparison["currentArchive"] = receipt
            comparison["historicalArchive"] = next(r for r in historical if r["tree"]==tree and r["kind"]=="archive")
            tables = []
            for kind, name in [("names",tree+"_parts_list_e.txt"),("elements",tree+"_element_parts.txt")]:
                observed = download(name,folder/name,32*1024**2)
                retained = next(r for r in historical if r["tree"]==tree and r["kind"]==kind)
                if observed["sha256"] != retained["sha256"] or observed["bytes"] != retained["bytes"]:
                    raise ValueError("Publisher identity/membership table changed")
                tables.append({"kind":kind,**observed})
            comparison["exactIdentityAndMembershipTables"] = tables
            result["sources"].append(comparison)
    result["retainedSourceMembersVerified"] = 2398
    result["releaseSourceMemberAuditPassed"] = True
    result["uniqueWholeAnatomyCount"] = None
    print("BP40 RELEASE MEMBER AUDIT " + json.dumps(result,separators=(",",":")))

class Tests(unittest.TestCase):
    def test_exact_comment_only_and_geometry_identity_rejection(self):
        before=OLD_LICENSE+b"# FMA1\nv 0 0 0\nv 1 0 0\nf 1 2 1\n"
        after=before.replace(OLD_LICENSE,NEW_LICENSE)
        self.assertEqual(exact_member(before,sha(before)),"EXACT_RETAINED_RAW_BYTES")
        self.assertEqual(exact_member(after,sha(before)),"EXACT_RETAINED_BYTES_EXCEPT_KNOWN_LICENSE_COMMENTS")
        for bad in [after.replace(b"v 1 0 0",b"v 2 0 0"),after.replace(b"FMA1",b"FMA2"),after+b"# different\n"]:
            with self.assertRaises(ValueError):
                exact_member(bad,sha(before))
    def test_scope_and_zip_paths(self):
        with tempfile.TemporaryDirectory() as d:
            file=Path(d)/"fixture.zip"
            raw=OLD_LICENSE+b"# engineering fixture, not anatomy\n"
            with zipfile.ZipFile(file,"w") as z:
                z.writestr("isa_BP3D_4.0_obj_99/FJ1.obj",raw)
            self.assertEqual(compare_members(file,"isa",{"FJ1":sha(raw)},True)["retainedMembersVerified"],1)
            with self.assertRaises(ValueError):
                compare_members(file,"isa",{"FJ2":sha(raw)},True)
            with zipfile.ZipFile(file,"w") as z:
                z.writestr("../FJ1.obj",raw)
            with zipfile.ZipFile(file) as z, self.assertRaises(ValueError):
                safe_index(z,"isa")

if __name__ == "__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--test",action="store_true")
    a=p.parse_args()
    if a.test:
        unittest.main(argv=[__file__])
    else:
        main()
