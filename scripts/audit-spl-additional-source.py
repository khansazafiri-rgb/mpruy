"""SPL ear/head-neck candidate inventory only. No extraction, scene execution, volumes or publication."""
import argparse
from collections import Counter
import importlib.util
import json
import re
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import unquote
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
    diagnostics = Counter()
    filename_candidates = []
    with zipfile.ZipFile(archive) as z:
        members = {i.filename:i for i in z.infolist() if not i.is_dir()}
        mesh_paths = {member for member in members if PurePosixPath(member).suffix.lower() in source.MESH}
        for member, info in members.items():
            if PurePosixPath(member).suffix.lower() in source.MESH:
                # Exact allowlisted basename only, never emit unknown filenames or infer identity.
                match = label(PurePosixPath(member).stem, terms)
                if match:
                    import hashlib
                    with z.open(info) as stream:
                        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
                    filename_candidates.append({'meshSHA256':digest,'term':match[0],'side':match[1],'status':'FILENAME_ONLY_UNVERIFIED'})
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
            for scope_index, scope_nodes in enumerate(source.mrml_scene_scopes(root)):
                stores = {}
                for n in scope_nodes:
                    if n.tag.rsplit("}",1)[-1].lower() != "modelstorage":
                        continue
                    diagnostics['storageNodes'] += 1
                    ident, name = n.get("id",""), unquote(n.get("fileName",""))
                    if not ident:
                        diagnostics['storageMissingID'] += 1
                        continue
                    target = source.storage_path_diagnostics(info.filename, name, mesh_paths, diagnostics)
                    if ident in stores:
                        diagnostics['duplicateStorageID'] += 1
                        stores[ident] = None
                    else:
                        stores[ident] = target
                    diagnostics['resolvedStorage' if target else 'unresolvedStorage'] += 1
                for n in scope_nodes:
                    if n.tag.rsplit("}",1)[-1].lower() != "model":
                        continue
                    diagnostics['modelNodes'] += 1
                    target = source.model_storage_target(n, stores, diagnostics)
                    diagnostics['linkedModels' if target else 'unlinkedModels'] += 1
                    candidate = label(n.get("name",""),terms)
                    if candidate:
                        diagnostics['allowlistedModelLabelsLinked' if target else 'allowlistedModelLabelsUnlinked'] += 1
                    if target:
                        hits.setdefault(target,set()).add(candidate)
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
            "inventory":receipt,"labelCandidates":rows,"filenameOnlyCandidates":filename_candidates,"sceneDiagnostics":dict(diagnostics),"heldScenes":held_scenes,"geometryParsed":False,
            "privacyReview":"PENDING","assetRightsReviewed":False,"clinicalValidation":False,
            "registrationValidated":False,"geometryPublished":0,"publicRelease":"NO_GO"}

class Tests(unittest.TestCase):
    def test_labels(self):
        self.assertEqual(label("left stapes",SOURCES["ear"][1]),("stapes","LEFT"))
        self.assertIsNone(label("stapes patient",SOURCES["ear"][1]))
        self.assertIsNone(label("left right stapes",SOURCES["ear"][1]))
    def test_filename_candidate_is_not_identity(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'fixture.zip'
            with zipfile.ZipFile(p,'w') as z:
                z.writestr('Data/Left Malleus.vtk',b'fixture')
                z.writestr('Data/unknown-private-name.vtk',b'fixture')
                z.writestr('scene.mrml','<MRML><Model name="Malleus" storageNodeRef="missing"/></MRML>')
            result=audit(p,'ear')
            self.assertEqual(result['labelCandidates'],[])
            self.assertEqual(result['filenameOnlyCandidates'][0]['status'],'FILENAME_ONLY_UNVERIFIED')
            self.assertEqual(len(result['filenameOnlyCandidates']),1)
            self.assertEqual(result['sceneDiagnostics']['unlinkedModels'],1)
            self.assertNotIn('unknown-private-name',json.dumps(result))
    def test_modern_storage_role(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"test.zip"
            with zipfile.ZipFile(p,"w") as z:
                z.writestr("scene.mrml",'<MRML><ModelStorage id="s" fileName="Data/a%20b.vtk"/><Model name="Left Stapes" references="display:d;storage:s;"/></MRML>')
                z.writestr("Data/a b.vtk",b"fixture")
            result=audit(p,"ear")
            self.assertEqual(result["labelCandidates"][0]["labels"],[{"term":"stapes","side":"LEFT"}])
            self.assertEqual(result["sceneDiagnostics"]["linkedModels"],1)
            self.assertEqual(result["sceneDiagnostics"]["modernStorageReferences"],1)
            self.assertFalse(result["labelCandidates"][0]["lateralityValidated"])
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
