"""Fetch bounded public Zenodo record metadata only. No volumes, labels or meshes downloaded."""
import json
import urllib.request
import unittest

URL = "https://zenodo.org/api/records/15882019"
LIMIT = 2 * 1024**2
KEY = "SIO Object Labels.xlsx"
MD5 = "md5:3f996d6e1113a24e58304381b8e689e2"
ARCHIVE_KEY = "VOXEL-MAN_segmented-internal-organs.zip"
ARCHIVE_MD5 = "md5:dbdfada24e69591bdf9650453918d9ef"

def review(data):
    if data.get("id") != 15882019:
        raise ValueError("record identity differs")
    meta = data.get("metadata", {})
    license_id = meta.get("license", {})
    if isinstance(license_id, dict):
        license_id = license_id.get("id")
    if license_id not in {"cc-by-4.0", "CC-BY-4.0"}:
        raise ValueError("license needs review")
    if data.get("doi") != "10.5281/zenodo.15882019" and meta.get("doi") != "10.5281/zenodo.15882019":
        raise ValueError("DOI differs")
    files = data.get("files", [])
    if not 1 <= len(files) <= 100:
        raise ValueError("unexpected file count")
    rows, seen = [], set()
    for f in files:
        key, size, checksum = f.get("key"), f.get("size"), f.get("checksum")
        if not isinstance(key, str) or not key or len(key) > 200 or "/" in key or "\\" in key or key in seen:
            raise ValueError("unsafe filename")
        if not isinstance(size, int) or not 0 < size <= 100 * 1024**3:
            raise ValueError("unexpected byte count")
        if not isinstance(checksum, str) or not checksum.startswith("md5:") or len(checksum) != 36 or any(c not in "0123456789abcdef" for c in checksum[4:]):
            raise ValueError("unrecognized checksum")
        seen.add(key)
        rows.append({"key": key, "bytes": size, "checksum": checksum})
    if sum(f["key"] == KEY and f["checksum"] == MD5 for f in rows) != 1:
        raise ValueError("published label-file receipt differs")
    if sum(f["key"] == ARCHIVE_KEY and f["checksum"] == ARCHIVE_MD5 for f in rows) != 1:
        raise ValueError("published archive receipt differs")
    return {"schema":1,"record":15882019,"doi":"10.5281/zenodo.15882019",
            "license":"CC-BY-4.0","files":rows,"metadataVerified":True,
            "assetBytesVerified":False,"geometryParsed":False,"privacyReviewed":False,
            "clinicalValidation":False,"registrationValidated":False,"publicRelease":"NO_GO"}

def main():
    request = urllib.request.Request(URL, headers={"Accept":"application/json","User-Agent":"MEDCOEL source-metadata audit"})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.geturl() != URL:
            raise ValueError("unexpected redirect")
        raw = response.read(LIMIT + 1)
    if len(raw) > LIMIT:
        raise ValueError("metadata exceeds cap")
    print("SIO SOURCE METADATA " + json.dumps(review(json.loads(raw)), separators=(",",":")))

class Tests(unittest.TestCase):
    def fixture(self):
        return {"id":15882019,"doi":"10.5281/zenodo.15882019","metadata":{"license":{"id":"cc-by-4.0"}},"files":[{"key":KEY,"size":13700,"checksum":MD5},{"key":ARCHIVE_KEY,"size":395100000,"checksum":ARCHIVE_MD5}]}
    def test_record(self):
        self.assertFalse(review(self.fixture())["assetBytesVerified"])
    def test_changed_license(self):
        data=self.fixture()
        data["metadata"]["license"]["id"]="cc-by-nc-4.0"
        with self.assertRaises(ValueError):
            review(data)
    def test_changed_label_checksum(self):
        data=self.fixture()
        data["files"][0]["checksum"]="md5:"+"0"*32
        with self.assertRaises(ValueError):
            review(data)

    def test_changed_archive_checksum(self):
        data=self.fixture()
        data["files"][1]["checksum"]="md5:"+"0"*32
        with self.assertRaises(ValueError):
            review(data)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--test"]:
        unittest.main(argv=[sys.argv[0]])
    elif not sys.argv[1:]:
        main()
    else:
        raise SystemExit("unknown arguments")
