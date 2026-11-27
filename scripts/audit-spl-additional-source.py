"""SPL ear/head-neck candidate inventory only. No extraction, scene execution, volumes or publication."""
import argparse
import importlib.util
import json
import re
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("spl_inventory", ROOT / "scripts/audit-spl-knee-source.py")
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)
SOURCES = {
    "ear": ("https://www.openanatomy.org/atlases/nac/inner-ear-2018-02.zip", {"malleus", "incus", "stapes"}),
    "head-neck": ("https://www.openanatomy.org/atlases/nac/head-neck-2016-09.zip", {"nasal cavity", "nasopharynx", "oropharynx", "laryngopharynx", "parotid gland", "larynx"}),
}

def label(value, terms):
    value = re.sub(r"[ _-]+", " ", value.strip().lower())
    side = "UNSPECIFIED"
    for s in ("left", "right"):
        if value.startswith(s + " "):
            side, value = s.upper(), value[len(s)+1:]
            break
        if value.endswith(" " + s):
            side, value = s.upper(), value[:-len(s)-1]
            break
    return (value, side) if value in terms else None

def audit(archive, kind):
    url, terms = SOURCES[kind]
    if not 0 < archive.stat().st_size <= source.CAP:
        raise ValueError("archive size outside policy")
    receipt = source.inventory(archive)
    hits = {}
    held_scenes = 0
    with zipfile.ZipFile(archive) as z:
        members = {i.filename:i for i in z.infolist() if not i.is_dir()}
        for info in members.values():
            if PurePosixPath(info.filename).suffix.lower() != ".mrml":
                continue
            if info.file_size > 4*1024**2:
                held_scenes += 1
                continue
            raw = z.read(info)
            if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper() or b"\x00" in raw:
                held_scenes += 1
                continue
            try:
                root = ElementTree.fromstring(raw)
            except ElementTree.ParseError:
                held_scenes += 1
                continue
            stores = {}
            for n in root.iter():
                if n.tag.rsplit("}",1)[-1].lower() != "modelstorage":
                    continue
                ident, name = n.get("id",""), n.get("fileName","")
                rel = PurePosixPath(name)
                if not ident or not name or rel.is_absolute() or ".." in rel.parts or "\\" in name or ":" in name:
                    continue
                target = str(PurePosixPath(info.filename).parent / rel)
                valid = target in members and rel.suffix.lower() in source.MESH
                stores[ident] = target if valid and ident not in stores else None
            for n in root.iter():
                if n.tag.rsplit("}",1)[-1].lower() != "model":
                    continue
                target = stores.get(n.get("storageNodeRef",""))
                if target:
                    hits.setdefault(target,set()).add(label(n.get("name",""),terms))
        rows = []
        for member, labels in hits.items():
            if not any(x is not None for x in labels):
                continue
            import hashlib
            h = hashlib.sha256()
            with z.open(members[member]) as stream:
                while chunk := stream.read(1024**2):
                    h.update(chunk)
            known = sorted(x for x in labels if x is not None)
            rows.append({"meshSHA256":h.hexdigest(),"labels":[{"term":t,"side":s} for t,s in known],
                         "status":"EXACT_LABEL_CANDIDATE" if len(labels)==1 else "HOLD_CONFLICTING_LABELS",
                         "lateralityValidated":False})
    return {"schema":1,"source":url,"archiveSHA256":source.sha_file(archive),"archiveBytes":archive.stat().st_size,
            "inventory":receipt,"labelCandidates":rows,"heldScenes":held_scenes,"geometryParsed":False,
            "privacyReview":"PENDING","assetRightsReviewed":False,"clinicalValidation":False,
            "registrationValidated":False,"geometryPublished":0,"publicRelease":"NO_GO"}

class Tests(unittest.TestCase):
    def test_labels(self):
        self.assertEqual(label("left stapes",SOURCES["ear"][1]),("stapes","LEFT"))
        self.assertIsNone(label("stapes patient",SOURCES["ear"][1]))
        self.assertIsNone(label("left right stapes",SOURCES["ear"][1]))
    def test_link_conflict(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"test.zip"
            with zipfile.ZipFile(p,"w") as z:
                z.writestr("scene.mrml",'<MRML><ModelStorage id="s" fileName="a.vtk"/><Model storageNodeRef="s" name="Malleus"/><Model storageNodeRef="s" name="Incus"/></MRML>')
                z.writestr("a.vtk",b"fixture")
            result=audit(p,"ear")
            self.assertEqual(result["labelCandidates"][0]["status"],"HOLD_CONFLICTING_LABELS")
            self.assertFalse(result["geometryParsed"])
            self.assertEqual(list(Path(d).iterdir()),[p])

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("source",choices=SOURCES)
    args=parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="medcoel-spl-source-") as d:
        archive=Path(d)/"source.zip"
        subprocess.run(["curl","--fail","--silent","--show-error","--proto","=https","--max-time","300",
                        "--max-filesize",str(source.CAP),"--output",str(archive),SOURCES[args.source][0]],check=True)
        print("SPL ADDITIONAL SOURCE INVENTORY "+json.dumps(audit(archive,args.source),separators=(",",":")))

if __name__=="__main__":
    import sys
    if sys.argv[1:]==["--test"]:
        unittest.main(argv=[sys.argv[0]])
    else:
        main()
