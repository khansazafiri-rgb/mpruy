"""Audit source label images only; no cryosection/CT reads, geometry export or clinical claims."""
import hashlib
import io
import json
import re
import stat
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import quote
import numpy as np
from PIL import Image
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
CANDIDATE = ROOT / "licensing/atlas-publication/sio-visible-human-source-candidate.json"
BASE = "https://zenodo.org/records/15882019/files/"
ARCHIVE_LIMIT = 512 * 1024**2
LABEL_LIMIT = 1024**2
FIRST, LAST = 1256, 2029
SHAPES = {(330, 573), (573, 330)}

def fetch(spec, dest, limit):
    url = BASE + quote(spec["key"], safe="") + "?download=1"
    subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location",
                    "--proto", "=https", "--proto-redir", "=https",
                    "--max-redirs", "3", "--max-time", "360",
                    "--max-filesize", str(limit), "--output", str(dest), url], check=True)
    if not 0 < dest.stat().st_size <= limit:
        raise ValueError("source byte limit")
    with dest.open("rb") as f:
        actual = hashlib.file_digest(f, "md5").hexdigest()
    if actual != spec["md5"]:
        raise ValueError("published checksum mismatch")
    with dest.open("rb") as f:
        return {"bytes": dest.stat().st_size, "md5": actual,
                "sha256": hashlib.file_digest(f, "sha256").hexdigest()}

def safe_members(z, cap, max_total):
    entries = z.infolist()
    if len(entries) > cap:
        raise ValueError("too many archive members")
    seen, total = set(), 0
    for info in entries:
        p = PurePosixPath(info.filename)
        if not info.filename or "\\" in info.filename or ":" in info.filename or p.is_absolute() or ".." in p.parts or info.filename.casefold() in seen or stat.S_ISLNK(info.external_attr >> 16) or info.flag_bits & 1:
            raise ValueError("unsafe member")
        seen.add(info.filename.casefold())
        total += info.file_size
        if total > max_total:
            raise ValueError("uncompressed byte limit")
    return entries

def label_candidates(file, targets):
    # No formula execution, macros, arbitrary worksheet metadata or links in output.
    with zipfile.ZipFile(file) as z:
        safe_members(z, 200, 16 * 1024**2)
    book = load_workbook(file, read_only=True, data_only=False, keep_links=False)
    result = {s: set() for s in targets}
    try:
        for sheet in book.worksheets:
            if sheet.max_row is None or sheet.max_column is None or sheet.max_row > 20000 or sheet.max_column > 50:
                raise ValueError("worksheet dimension limit")
            for row in sheet.iter_rows(values_only=True):
                strings = {v.strip().casefold() for v in row if isinstance(v, str) and not v.startswith("=")}
                integers = {v for v in row if type(v) is int and 0 < v <= 65535}
                for name in targets:
                    if name.casefold() in strings:
                        # Multiple label numbers may be legitimate; do not silently choose one.
                        if len(integers) == 1:
                            result[name].update(integers)
                        else:
                            result[name].add(None)
    finally:
        book.close()
    return {k: {"candidateLabelNumbers": sorted(x for x in v if x is not None),
                "ambiguousRow": None in v,
                "status": "EXACT_TEXT_ROW_CANDIDATE" if v and None not in v else "HOLD_LABEL_MAPPING"} for k,v in result.items()}

def label_slices(z, first=FIRST, last=LAST):
    entries = safe_members(z, 10000, 2 * 1024**3)
    slices = {}
    for info in entries:
        match = re.fullmatch(r"labels(\d{4})\.tif", PurePosixPath(info.filename).name, re.IGNORECASE)
        if not match:
            continue
        n = int(match[1])
        if n in slices or not first <= n <= last or not 0 < info.file_size <= 8 * 1024**2:
            raise ValueError("unexpected or duplicate label slice")
        slices[n] = info
    if set(slices) != set(range(first, last + 1)):
        raise ValueError("missing label slices")
    return slices

def measure_labels(file):
    counts = np.zeros(65536, dtype=np.uint64)
    shape = None
    with zipfile.ZipFile(file) as z:
        slices = label_slices(z)
        for n in range(FIRST, LAST + 1):
            # Read only publisher-labelled segmentation TIFFs. Not patient CT/RGB files.
            with Image.open(io.BytesIO(z.read(slices[n]))) as im:
                if im.format != "TIFF" or im.n_frames != 1 or im.size not in SHAPES or im.mode not in {"I;16","I;16B","I;16L","I"}:
                    raise ValueError("unexpected TIFF encoding")
                a = np.asarray(im)
                if a.ndim != 2 or a.shape not in SHAPES or not np.issubdtype(a.dtype, np.integer) or a.min() < 0 or a.max() > 65535:
                    raise ValueError("unexpected label array")
                if shape is not None and a.shape != shape:
                    raise ValueError("inconsistent shape")
                shape = a.shape
                counts += np.bincount(a.reshape(-1).astype(np.int64), minlength=65536).astype(np.uint64)
    return {"shapeInFileOrder": [LAST-FIRST+1, *shape], "nonzeroLabelCount": int(np.count_nonzero(counts[1:])),
            "voxelCounts": {str(i): int(counts[i]) for i in np.flatnonzero(counts)}}

def main():
    source = json.loads(CANDIDATE.read_text())
    with tempfile.TemporaryDirectory(prefix="medcoel-sio-label-") as tmp:
        folder = Path(tmp)
        sheet = folder / "labels.xlsx"
        archive = folder / "source.zip"
        label_receipt = fetch(source["labelFile"], sheet, LABEL_LIMIT)
        candidates = label_candidates(sheet, source["prioritySourceLabels"])
        print("SIO EXACT LABEL FILE RECEIPT " + json.dumps({"file": label_receipt, "targets": candidates, "publicRelease":"NO_GO"}, separators=(",",":")))
        archive_receipt = fetch(source["archiveFile"], archive, ARCHIVE_LIMIT)
        volume = measure_labels(archive)
        for row in candidates.values():
            row["voxelCounts"] = {str(n): volume["voxelCounts"].get(str(n),0) for n in row["candidateLabelNumbers"]}
        print("SIO LABEL VOLUME AUDIT " + json.dumps({
            "schema":1,"sourceArchive":archive_receipt,"sourceLabelFile":label_receipt,
            "shapeInFileOrder":volume["shapeInFileOrder"],"nonzeroLabelCount":volume["nonzeroLabelCount"],
            "targets":candidates,"sourceLabelBytesVerified":True,"labelMappingReviewed":False,
            "coordinateFrameVerified":False,"privacyReviewed":False,"clinicalValidation":False,
            "registrationValidated":False,"geometryParsed":False,"geometryPublished":0,
            "publicRelease":"NO_GO"}, separators=(",",":")))

class Tests(unittest.TestCase):
    def test_slice_sequence(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data,"w") as z:
            z.writestr("pack/labels1256.tif", b"fixture")
            z.writestr("pack/labels1257.tif", b"fixture")
            z.writestr("pack/rgb1256.tif", b"unread fixture")
        with zipfile.ZipFile(data) as z:
            self.assertEqual(set(label_slices(z,1256,1257)),{1256,1257})
            with self.assertRaises(ValueError):
                label_slices(z,1256,1258)
    def test_duplicate_label_rejected(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data,"w") as z:
            z.writestr("a/labels1256.tif",b"fixture")
            z.writestr("b/labels1256.tif",b"fixture")
        with zipfile.ZipFile(data) as z:
            with self.assertRaises(ValueError):
                label_slices(z,1256,1256)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--test"]:
        unittest.main(argv=[sys.argv[0]])
    elif not sys.argv[1:]:
        main()
    else:
        raise SystemExit("unknown arguments")
