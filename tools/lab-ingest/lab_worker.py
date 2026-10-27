"""Durable single-VPS OCT acquisition worker. Run under systemd, never an HTTP request.

All job state is held in PocketBase. Files are staged under a private cache directory;
only selected PNGs are sent to the validated draft-media API. No publication occurs.
"""
from __future__ import annotations

import hashlib
import fcntl
import json
import logging
import os
import signal
import time
import urllib.request
import uuid
from pathlib import Path

from medcoel_api import MedcoelAPI
from medmnist_core import download, export_pngs, manifest, validate_groups
from octmnist import CONFIG
from identification_guides import learning_guide
from authoring_gallery import gallery_items
from visual_mnist import answer_slots, practice_rows

LOG = logging.getLogger("medcoel.lab.worker")
STOP = False
JOB_PATH = "/api/medcoel/admin/lab-jobs"
SOURCE_KEY = "octmnist-224-source"
MODULE_KEY = "oct-retina-dasar-v1"
GUIDE_KEY = "panduan-identifikasi-oct-retina"


class Cancelled(Exception):
    pass


def _stop(_signal, _frame):
    global STOP
    STOP = True


def source_definition():
    return {"key": SOURCE_KEY, "title": "OCTMNIST 224px / MedMNIST+", "role": "asset",
        "ingestionAllowed": True, "datasetReviewRequired": True,
        "url": CONFIG.spec.source_url, "citation": CONFIG.spec.citation,
        "license": {"name": CONFIG.spec.license_name, "url": "https://creativecommons.org/licenses/by/4.0/",
                    "citation": CONFIG.spec.citation, "verified": False,
                    "commercialUse": True, "redistribution": True, "attributionRequired": True},
        "policies": [{"collection": MODULE_KEY, "allowed": True, "reviewed": False,
                      "note": "Tinjau sumber OCT dan lisensinya sebelum publikasi."}],
        "disclosure": "Gambar berlabel dataset untuk latihan, bukan diagnosis pasien."}


def asset_key(row):
    return f"octmnist-test-{row['index']:05d}"


def oct_guide_content():
    """Adapt the existing curated OCT guide to authoring V1 without dropping citations."""
    guide = learning_guide("octmnist", [CONFIG.spec.labels[i] for i in CONFIG.groupings[0].labels])
    references = {item["id"]: item for item in guide["sources"]}

    def cited(statement):
        names = [f"{references[key]['organization']} — {references[key]['resource']}"
                 for key in statement["sources"]]
        return statement["text"] + " [Sumber: " + "; ".join(names) + "]"

    source_records = []
    for item in guide["sources"]:
        citation = f"{item['organization']}, {item['resource']}. Diakses {item['accessed']}."
        source_records.append({"kind": "source", "data": {
            "key": "oct-guide-" + item["id"],
            "title": f"{item['organization']} — {item['resource']}",
            "role": "reference", "ingestionAllowed": False, "datasetReviewRequired": False,
            "url": item["url"], "citation": citation,
            "license": {"name": "Izin reproduksi belum diverifikasi; tautan referensi saja",
                        "url": item["url"], "citation": citation, "verified": False,
                        "commercialUse": False, "redistribution": False,
                        "attributionRequired": True},
            "disclosure": "Rujukan untuk panduan; tidak mengizinkan ingest gambar."}})

    steps = [{"title": "Orientasi OCT", "text": cited(guide["introduction"])}]
    steps.extend({"title": f"Langkah {i}", "text": cited(item)}
                 for i, item in enumerate(guide["checklist"], 1))
    steps.extend({"title": f"Catatan {i}", "text": cited(item)}
                 for i, item in enumerate(guide["notes"], 1))
    guide_record = {"kind": "guide", "data": {
        "key": GUIDE_KEY, "title": guide["title"], "subject": "OCT Retina",
        "scope": "module", "steps": steps,
        "sources": [record["data"]["key"] for record in source_records]}}
    comparison = {"key": "perbandingan-oct", "type": "identification_table",
        "title": guide["comparison"]["title"],
        "columns": ["Kategori"] + guide["comparison"]["columns"],
        "rows": [[row["label"]] + [cited(value) for value in row["values"]]
                 for row in guide["comparison"]["rows"]]}
    return source_records, guide_record, comparison


def authoring_bundle(groups, source):
    guide_sources, guide_record, comparison = oct_guide_content()
    learning_items = gallery_items("octmnist", groups["learning"], CONFIG.student_labels, asset_key)
    questions = []
    group = CONFIG.groupings[0]
    slots = answer_slots(CONFIG, groups["practice"], group)
    for row in practice_rows(CONFIG, groups["practice"], group):
        slot = slots[row["index"]]
        choices = sorted((i for i in group.labels if i != row["label"]),
            key=lambda i: hashlib.sha256(f"{CONFIG.pack_slug}:option:{row['index']}:{i}".encode()).digest())
        choices.insert(slot, row["label"])
        questions.append({"key": f"oct-q-{row['index']:05d}", "type": "image_identification",
            "prompt": CONFIG.question_prompt, "asset": asset_key(row),
            "options": [{"label": "ABCD"[n], "text": CONFIG.student_labels[i]} for n, i in enumerate(choices)],
            "answer": "ABCD"[slot], "explanation": "Kategori dataset memerlukan pemeriksaan manusia; bukan diagnosis pasien.",
            "sources": [SOURCE_KEY]})
    return {"schemaVersion": 1, "records": [
        {"kind": "source", "data": source},
        *guide_sources,
        {"kind": "catalog", "data": {"key": "oftalmologi", "title": "Oftalmologi",
            "summary": "Pembelajaran mata dan penglihatan.", "order": 10}},
        {"kind": "catalog", "data": {"key": "imaging-retina", "title": "OCT Retina",
            "parent": "oftalmologi", "summary": "Dasar pembacaan citra OCT retina.", "order": 10}},
        guide_record,
        {"kind": "module", "data": {"key": MODULE_KEY, "title": "Dasar Interpretasi OCT Retina",
            "summary": CONFIG.description, "sources": [SOURCE_KEY] + guide_record["data"]["sources"],
            "chapters": [{"key": "pola-retina", "title": "Pola OCT Retina", "sections": [
                {"key": "contoh-berlabel", "title": "Contoh berlabel", "blocks": [
                    {"key": "batas", "type": "callout", "title": "Batas penggunaan", "tone": "warn",
                     "text": "Label dataset hanya untuk pembelajaran; jangan dipakai sebagai diagnosis pasien."},
                    {"key": "panduan-oct", "type": "identification_guide", "title": "Cara identifikasi OCT",
                     "guide": GUIDE_KEY},
                    {"key": "galeri", "type": "gallery", "title": "20 contoh OCT", "items": learning_items},
                    comparison,
                    {"key": "latihan", "type": "practice", "title": "Latihan klasifikasi", "bank": "latihan-oct"},
                    {"key": "sumber-panduan", "type": "source_disclosure", "title": "Sumber panduan OCT",
                     "sources": guide_record["data"]["sources"]}]}]}],
            "questionBanks": [{"key": "latihan-oct", "title": "Latihan OCT retina", "questions": questions}],
            "pathways": [{"key": "awal", "title": "Amati lalu latihan", "sections": ["contoh-berlabel"]}]}},
        {"kind": "placement", "data": {"key": "oct-retina-di-imaging", "title": "Dasar Interpretasi OCT Retina",
            "module": MODULE_KEY, "catalog": "imaging-retina", "order": 10}},
    ]}


def upload_media(api: MedcoelAPI, row, source_key: str, image_root: Path):
    path = Path(row["local_path"]).resolve()
    if (not path.is_relative_to(image_root.resolve()) or not path.is_file() or
            path.suffix != ".png" or path.name != row["filename"] or
            Path(row["local_path"]).is_symlink()):
        raise RuntimeError("File media staging tidak valid.")
    boundary = uuid.uuid4().hex
    fields = {"key": asset_key(row), "sourceKey": source_key,
              "title": "Citra OCT latihan" if row["role"] == "practice" else CONFIG.student_labels[row["label"]],
              "alt": "Citra OCT retina untuk latihan pengenalan pola"}
    payload = b"".join(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode() for key, value in fields.items())
    payload += f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{path.name}\"\r\nContent-Type: image/png\r\n\r\n".encode()
    payload += path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(api.base + "/api/medcoel/admin/lab-authoring/media", data=payload,
        headers={"Authorization": api.token, "Content-Type": f"multipart/form-data; boundary={boundary}"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.load(response)


class Worker:
    def __init__(self, api: MedcoelAPI, cache: Path):
        self.api, self.cache = api, cache
        self.last_check = 0.0
        self.cancel_requested = False

    def call(self, method, suffix, body=None):
        return self.api.request(method, JOB_PATH + suffix, body)

    def check(self, job, *, force=False):
        if STOP:
            raise InterruptedError("Worker dihentikan; akan lanjut setelah restart.")
        now = time.monotonic()
        if force or now - self.last_check > 3:
            self.cancel_requested = self.call("GET", "/" + job["key"])["cancelRequested"]
            self.last_check = now
        if self.cancel_requested:
            raise Cancelled("Dibatalkan admin pada checkpoint aman.")

    def mark(self, job, stage, progress, checkpoints, **extra):
        self.check(job, force=True)
        body = {"attempts": job["attempts"], "stage": stage, "progress": progress,
                "checkpoints": checkpoints, **extra}
        return self.call("POST", f"/worker/{job['key']}/checkpoint", body)

    def run_job(self, job):
        if job["type"] != "dataset_acquisition" or job["dataset"] != "octmnist":
            raise RuntimeError("Job definition tidak dikenal.")
        checkpoints = dict(job.get("checkpoints") or {})
        cache = self.cache / "jobs" / job["key"]
        cache.mkdir(parents=True, exist_ok=True)
        self.check(job, force=True)
        LOG.info("job start key=%s attempt=%s", job["key"], job["attempts"])
        last_report = [0]
        def on_progress(done, total):
            if done - last_report[0] >= 64 * 1024**2:
                last_report[0] = done
                self.mark(job, "download", min(34, int(done * 35 / (total or done + 1))), checkpoints,
                          currentItem=f"{done // 1024**2} MiB diunduh")
        npz = download(CONFIG.spec, self.cache, cancelled=lambda: bool(self.check(job) or False), progress=on_progress)
        checkpoints["download"] = True
        self.mark(job, "checksum", 35, checkpoints)
        checkpoints["checksum"] = True
        self.mark(job, "select", 40, checkpoints)
        selection_file = cache / "selection.json"
        if checkpoints.get("export") and selection_file.is_file():
            groups = json.loads(selection_file.read_text(encoding="utf-8"))
            if not all(Path(r["local_path"]).is_file() for role in groups.values() for r in role):
                groups = export_pngs(npz, CONFIG.selection, CONFIG.spec, cache / "images")
        else:
            groups = export_pngs(npz, CONFIG.selection, CONFIG.spec, cache / "images")
        validate_groups(groups, CONFIG.selection, CONFIG.spec)
        m = manifest(groups, CONFIG.selection, CONFIG.spec)
        if (m["learning"]["total"], m["practice"]["total"], m["overlap"]) != (20, 12, 0):
            raise RuntimeError("Jumlah/overlap OCT tidak sesuai.")
        selection_file.write_text(json.dumps(groups), encoding="utf-8")
        checkpoints["select"] = True; checkpoints["export"] = True
        self.mark(job, "register_media", 55, checkpoints)
        sources = self.api.request("GET", "/api/medcoel/admin/lab-authoring/records?kind=source")["items"]
        source = next((r["data"] for r in sources if r["key"] == SOURCE_KEY), None)
        if source is None:
            source = source_definition()
            bundle = {"schemaVersion": 1, "records": [{"kind": "source", "data": source}]}
            preview = self.api.request("POST", "/api/medcoel/admin/lab-authoring/preview", bundle)
            if not preview["ok"]:
                raise RuntimeError("Sumber OCT draft tidak valid: " + "; ".join(preview["errors"]))
            self.api.request("POST", "/api/medcoel/admin/lab-authoring/apply", {"bundle": bundle, "token": preview["token"]})
        if (source["role"] != "asset" or source["ingestionAllowed"] is not True or
                source["url"] != CONFIG.spec.source_url):
            raise RuntimeError("Sumber OCT tidak mengizinkan staging media.")
        existing = {r["key"]: r for r in self.api.request("GET", "/api/medcoel/admin/lab-authoring/media")["items"]}
        rows = groups["learning"] + groups["practice"]
        for index, row in enumerate(rows):
            self.check(job)
            key = asset_key(row)
            if key in existing:
                if existing[key]["sourceKey"] != SOURCE_KEY:
                    raise RuntimeError("Key media sudah dimiliki sumber lain: " + key)
            else:
                existing[key] = upload_media(self.api, row, SOURCE_KEY, cache / "images")
            self.mark(job, "register_media", 55 + int((index + 1) * 30 / 32), checkpoints,
                      completedItems=index + 1, currentItem=key)
        checkpoints["register_media"] = True
        self.mark(job, "generate_authoring", 90, checkpoints)
        bundle = authoring_bundle(groups, source)
        authoring_file = cache / "authoring.json"
        temporary = authoring_file.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(authoring_file)
        checkpoints["generate_authoring"] = True
        self.mark(job, "validate", 95, checkpoints)
        preview = self.api.request("POST", "/api/medcoel/admin/lab-authoring/preview", bundle)
        if not preview["ok"]:
            raise RuntimeError("Authoring JSON belum valid: " + "; ".join(preview["errors"]))
        checkpoints["validate"] = True
        self.mark(job, "validate", 100, checkpoints, status="completed",
                  result={"readyForReview": True, "sourceMd5": CONFIG.spec.md5,
                          "learning": 20, "practice": 12, "overlap": 0,
                          "registered": len(rows), "moduleKey": MODULE_KEY, "authoringJson": bundle})
        LOG.info("job completed key=%s assets=%s", job["key"], len(rows))

    def process(self, job):
        try:
            self.run_job(job)
        except (Cancelled, InterruptedError) as exc:
            status = "cancelled" if isinstance(exc, Cancelled) else "waiting_retry"
            self.call("POST", f"/worker/{job['key']}/checkpoint",
                      {"attempts": job["attempts"], "status": status, "error": str(exc)})
            LOG.warning("job %s %s", job["key"], status)
        except Exception as exc:
            # The admin receives only a concise message; credentials and HTTP headers are never logged.
            message = str(exc).split("Authorization:")[0][:500]
            self.call("POST", f"/worker/{job['key']}/checkpoint",
                      {"attempts": job["attempts"], "status": "failed", "error": message})
            LOG.error("job failed key=%s stage=%s: %s", job["key"], job["stage"], message)

    def serve(self):
        self.call("POST", "/worker/recover", {})
        while not STOP:
            response = self.call("POST", "/worker/next", {})
            if response["job"]:
                self.process(response["job"])
            else:
                time.sleep(5)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)
    cache = Path(os.getenv("MEDCOEL_LAB_CACHE", "/opt/medcoel/tools/lab-ingest/cache"))
    cache.mkdir(parents=True, exist_ok=True)
    with (cache / ".worker.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        Worker(MedcoelAPI.from_env(), cache).serve()
