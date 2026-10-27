"""Focused durable-worker tests; no network or multi-GB download."""
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from lab_worker import Worker, asset_key, authoring_bundle, source_definition
from identification_guides import learning_guide
from octmnist import CONFIG
from medmnist_core import DatasetSpec, download, ensure_disk_space


class Response(io.BytesIO):
    def __init__(self, data, status=200, headers=None):
        super().__init__(data)
        self.status = status
        self.headers = headers or {}


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.cache = Path(self.tmp.name)
        self.content = b"validated-oct-fixture"
        self.spec = DatasetSpec("fixture", "Fixture", "https://example.test/file", hashlib.md5(self.content).hexdigest(),
                                "CC BY", "https://example.test", "citation", {0: "a"})

    def test_resume_partial_with_range_then_verify_before_rename(self):
        part = self.cache / "fixture_224.npz.part"
        part.write_bytes(self.content[:8])
        def fetch(req, timeout):
            self.assertEqual(req.get_header("Range"), "bytes=8-")
            return Response(self.content[8:], 206, {"Content-Range": f"bytes 8-{len(self.content)-1}/{len(self.content)}"})
        with patch("medmnist_core.urllib.request.urlopen", side_effect=fetch):
            result = download(self.spec, self.cache)
        self.assertEqual(result.read_bytes(), self.content)
        self.assertFalse(part.exists())

    def test_server_without_range_restarts_partial_safely(self):
        (self.cache / "fixture_224.npz.part").write_bytes(b"stale")
        with patch("medmnist_core.urllib.request.urlopen", return_value=Response(self.content)):
            result = download(self.spec, self.cache)
        self.assertEqual(result.read_bytes(), self.content)

    def test_checksum_failure_never_promotes_partial(self):
        with patch("medmnist_core.urllib.request.urlopen", return_value=Response(b"corrupt")):
            with self.assertRaisesRegex(RuntimeError, "MD5 tidak cocok"):
                download(self.spec, self.cache)
        self.assertFalse((self.cache / "fixture_224.npz").exists())
        self.assertTrue((self.cache / "fixture_224.npz.invalid").exists())

    def test_cancellation_preserves_unverified_partial(self):
        part = self.cache / "fixture_224.npz.part"
        part.write_bytes(self.content[:5])
        with patch("medmnist_core.urllib.request.urlopen", return_value=Response(self.content[5:], 206, {"Content-Range": f"bytes 5-{len(self.content)-1}/{len(self.content)}"})):
            with self.assertRaises(InterruptedError):
                download(self.spec, self.cache, cancelled=lambda: True)
        self.assertEqual(part.read_bytes(), self.content[:5])
        self.assertFalse((self.cache / "fixture_224.npz").exists())

    def test_disk_guard_rejects_insufficient_space(self):
        with patch("medmnist_core.shutil.disk_usage", return_value=type("Usage", (), {"free": 10})()):
            with self.assertRaisesRegex(RuntimeError, "Ruang disk kurang"):
                ensure_disk_space(self.cache, 20, reserve_bytes=5)

    def test_generated_bundle_is_draft_review_material(self):
        groups = {"learning": [], "practice": []}
        for label in range(4):
            groups["learning"] += [{"index": label * 100 + i, "label": label, "role": "learning"} for i in range(5)]
            groups["practice"] += [{"index": label * 100 + 50 + i, "label": label, "role": "practice"} for i in range(3)]
        bundle = authoring_bundle(groups, source_definition())
        module = next(r["data"] for r in bundle["records"] if r["kind"] == "module")
        records = {(r["kind"], r["data"]["key"]): r["data"] for r in bundle["records"]}
        self.assertEqual(records["catalog", "oftalmologi"]["title"], "Oftalmologi")
        self.assertEqual(records["catalog", "imaging-retina"]["parent"], "oftalmologi")
        self.assertEqual(records["catalog", "imaging-retina"]["title"], "OCT Retina")
        self.assertEqual(records["placement", "oct-retina-di-imaging"]["catalog"], "imaging-retina")
        blocks = module["chapters"][0]["sections"][0]["blocks"]
        self.assertEqual(len(next(b for b in blocks if b["type"] == "gallery")["assets"]), 20)
        self.assertEqual(len(module["questionBanks"][0]["questions"]), 12)
        self.assertFalse(set(next(b for b in blocks if b["type"] == "gallery")["assets"]) &
                         {q["asset"] for q in module["questionBanks"][0]["questions"]})
        curated = learning_guide("octmnist")
        guide = records["guide", "panduan-identifikasi-oct-retina"]
        self.assertEqual(len(guide["steps"]), 1 + len(curated["checklist"]) +
                         len(curated["profiles"]) + len(curated["notes"]))
        self.assertIn(curated["introduction"]["text"], guide["steps"][0]["text"])
        self.assertEqual(len(guide["sources"]), len(curated["sources"]))
        self.assertTrue(all(records["source", key]["role"] == "reference" and
                            records["source", key]["ingestionAllowed"] is False
                            for key in guide["sources"]))
        self.assertEqual(next(b for b in blocks if b["type"] == "identification_guide")["guide"], guide["key"])
        table = next(b for b in blocks if b["type"] == "identification_table")
        self.assertEqual(len(table["rows"]), len(curated["comparison"]["rows"]))
        self.assertEqual(next(b for b in blocks if b["type"] == "source_disclosure")["sources"], guide["sources"])
        self.assertFalse(bundle["records"][0]["data"]["license"]["verified"])
        self.assertFalse(bundle["records"][0]["data"]["policies"][0]["reviewed"])
        self.assertNotIn("published", json.dumps(bundle).lower())
        self.assertEqual(len({asset_key(r) for rows in groups.values() for r in rows}), 32)

    def test_crash_after_partial_registration_retries_only_remaining_assets(self):
        groups = {"learning": [], "practice": []}
        for label, name in CONFIG.spec.labels.items():
            for role, count, base in (("learning", 5, 0), ("practice", 3, 50)):
                for i in range(count):
                    index = label * 100 + base + i
                    filename = f"oct-{index}.png"
                    path = self.cache / filename
                    path.write_bytes(b"fixture")
                    groups[role].append({"dataset": "octmnist", "split": "test", "index": index,
                                         "label": label, "label_name": name, "role": role,
                                         "filename": filename, "local_path": str(path), "url_path": "/private/" + filename})
        class API:
            def __init__(self):
                self.media = []
                self.source = None
                self.checkpoints = []
                self.token = "local-fixture-token"
            def request(self, method, path, body=None):
                if path.endswith("/records?kind=source"):
                    return {"items": [{"key": "octmnist-224-source", "data": self.source}] if self.source else []}
                if path.endswith("/media"):
                    return {"items": self.media}
                if path.endswith("/preview"):
                    return {"ok": True, "token": self.token}
                if path.endswith("/apply"):
                    self.source = body["bundle"]["records"][0]["data"]
                    return {"published": False}
                if path.endswith("/checkpoint"):
                    self.checkpoints.append(body)
                    return body
                if path.endswith("octmnist-224-v1"):
                    return {"cancelRequested": False}
                raise AssertionError(path)
        api = API()
        uploads = []
        def upload(_api, row, source, _image_root):
            record = {"key": asset_key(row), "sourceKey": source}
            api.media.append(record)
            uploads.append(record["key"])
            if len(api.media) == 25:
                raise RuntimeError("simulated crash after persisted media")
            return record
        job = {"key": "octmnist-224-v1", "type": "dataset_acquisition", "dataset": "octmnist", "attempts": 1, "checkpoints": {}, "stage": "download"}
        with patch("lab_worker.download", return_value=self.cache / "fixture.npz"), \
             patch("lab_worker.export_pngs", return_value=groups), \
             patch("lab_worker.upload_media", side_effect=upload):
            Worker(api, self.cache).process(job)
            self.assertEqual(len(api.media), 25)
            self.assertEqual(api.checkpoints[-1]["status"], "failed")
            Worker(api, self.cache).process({**job, "attempts": 2})
        self.assertEqual(len(api.media), 32)
        self.assertEqual(len(uploads), 32)  # first 25 are not uploaded again
        self.assertEqual(api.checkpoints[-1]["status"], "completed")
        self.assertTrue(api.checkpoints[-1]["result"]["readyForReview"])

if __name__ == "__main__":
    unittest.main()
