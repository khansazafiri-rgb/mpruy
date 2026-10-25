#!/usr/bin/env python3
"""Integration test for the Lab ingest tools against a DISPOSABLE local PocketBase (never production).

  MEDCOEL_API_BASE=http://127.0.0.1:8090 MEDCOEL_ADMIN_IDENTITY=... MEDCOEL_ADMIN_PASSWORD=... python tools/lab-ingest/test_ingest.py

Simulates the state the OLD importer left in production (no pack, old titles, no dataset metadata, published),
then checks the explicit --update-existing sync, conflict handling, idempotency and publish_pack.py.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
base = os.environ.get("MEDCOEL_API_BASE", "http://127.0.0.1:8090")
if not any(h in base for h in ("127.0.0.1", "localhost")):
    raise SystemExit("test_ingest.py hanya boleh menyasar PocketBase lokal.")
os.environ.setdefault("MEDCOEL_API_BASE", base)

import import_medmnist as m  # noqa: E402
from medcoel_api import ApiError, MedcoelAPI  # noqa: E402

run = format(int(time.time()), "x")
checks = 0


def ok(cond: bool, msg: str) -> None:
    global checks
    assert cond, msg
    checks += 1


# Unique slugs per run so a shared dev DB stays clean to reason about.
m.PACK = {**m.PACK, "slug": f"pm-test-{run}"}
_orig = {k: getattr(m, k) for k in ("asset_body", "object_intro", "object_practice", "question_body", "pathway_body")}
m.asset_body = lambda *a, **k: {**_orig["asset_body"](*a, **k), "slug": _orig["asset_body"](*a, **k)["slug"] + f"-{run}"}
m.object_intro = lambda *a, **k: {**_orig["object_intro"](*a, **k), "slug": f"pmi-{run}"}
m.object_practice = lambda *a, **k: {**_orig["object_practice"](*a, **k), "slug": f"pmp-{run}"}
m.question_body = lambda *a, **k: {**_orig["question_body"](*a, **k), "slug": _orig["question_body"](*a, **k)["slug"] + f"-{run}"}
m.pathway_body = lambda *a, **k: {**_orig["pathway_body"](*a, **k), "slug": f"pmw-{run}"}

logs: list[str] = []
m.log = lambda message: logs.append(message)

rows = []
for i, (label_id, label) in enumerate([(0, "normal"), (0, "normal"), (1, "pneumonia"), (1, "pneumonia")]):
    rows.append({"index": 700 + i, "label": label_id, "label_name": label, "filename": f"x{i}.png", "url_path": f"/lab-content/medmnist/test/x{i}.png"})

api = MedcoelAPI.from_env()

# ---- 1. legacy production state (old importer: no pack, no dataset, old titles, assets on the practice object) ----
legacy_assets = []
for row in rows:
    body = _orig["asset_body"](row, "https://example.test", True, "")
    body["slug"] += f"-{run}"; body["data"].pop("dataset"); body.pop("pack")
    legacy_assets.append(api.create("assets", body))
ids = [a["id"] for a in legacy_assets]
# Admin had added an annotation and linked a related object by hand; the sync must keep both.
legacy_assets[0]["data"]["annotations"] = [{"id": "a1", "label": "Catatan admin", "layer": "anatomy", "region": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.2}}]
legacy_assets[0] = api.update("assets", legacy_assets[0]["id"], legacy_assets[0])
extra = api.create("objects", {"slug": f"pm-extra-{run}", "title": "Materi lain", "domain": "imaging", "assets": [], "related": [], "legacyQuestions": [], "tags": [], "data": {"definition": "x"}})
old_intro = _orig["object_intro"]([], ""); old_intro.pop("pack"); old_intro.update(slug=f"pmi-{run}", title="Pengenalan PneumoniaMNIST", assets=[], related=[extra["id"]], tags=["catatan-admin"]); old_intro["data"].pop("objectives")
old_practice = _orig["object_practice"]([], ""); old_practice.pop("pack"); old_practice.update(slug=f"pmp-{run}", assets=ids)
intro = api.create("objects", old_intro); practice = api.create("objects", old_practice)
qs = []
for row, asset in zip(rows, legacy_assets):
    q = _orig["question_body"](row, practice["id"], asset["id"], ""); q.pop("pack"); q["slug"] += f"-{run}"; qs.append(api.create("questions", q))
path = _orig["pathway_body"](intro["id"], practice["id"], ""); path.pop("pack"); path.update(slug=f"pmw-{run}", title="CXR Dasar: PneumoniaMNIST")
path = api.create("pathways", path)
everything = [("assets", a) for a in legacy_assets] + [("objects", intro), ("objects", practice)] + [("questions", q) for q in qs] + [("pathways", path)]
res = api.request("POST", "/api/medcoel/admin/lab-bulk/publish", {"confirmReviewed": True, "items": [{"kind": k, "id": r["id"]} for k, r in everything]})
ok(res["ok"] and len(res["published"]) == len(everything), f"legacy publish failed: {res}")

# ---- 2. dry-run plan prints what changes and writes nothing ----
before = {k: {r["slug"]: r["revision"] for r in api.list_all(k)} for k in ("assets", "objects", "questions", "pathways")}
logs.clear()
imp = m.sync(api, rows, apply=False, update_existing=True, license_verified=False, public_base="https://example.test")
text = "\n".join(logs)
after = {k: {r["slug"]: r["revision"] for r in api.list_all(k)} for k in before}
ok(before == after, "dry-run must not write")
ok("WOULD UPDATE objects: " + f"pmi-{run}" in text and "Chest X-Ray: Normal vs Pneumonia" in text, text)
ok("akan kembali ke draft dari published" in text and "data.objectives" in text and "pack:" in text, text)
ok(imp.counts["update"] >= 7 and "WOULD CREATE content pack" in text, str(imp.counts))
ok(api.pack(f"pm-test-{run}") is None, "dry-run must not create the pack")

# ---- 3. without the flag existing records are skipped, never overwritten ----
logs.clear()
imp = m.sync(api, rows, apply=True, update_existing=False, license_verified=False, public_base="https://example.test")
ok(imp.counts["skip"] >= 9 and imp.counts["update"] == 0, str(imp.counts))
ok(api.list_all("objects") and {r["slug"]: r for r in api.list_all("objects")}[f"pmi-{run}"]["title"] == "Pengenalan PneumoniaMNIST", "default run must not rename")
pack = api.pack(f"pm-test-{run}")  # the pack itself is additive and may be created by --apply

# ---- 4. revision conflict fails instead of overwriting ----
real_update = api.update
def conflict(kind, record_id, body):
    raise ApiError(400, "PUT", "x", '{"message":"Konten telah diubah."}')
api.update = conflict
try:
    m.sync(api, rows, apply=True, update_existing=True, license_verified=False, public_base="https://example.test")
    raise AssertionError("conflict must raise")
except RuntimeError as exc:
    ok("Gagal memperbarui" in str(exc), str(exc))
api.update = real_update

# ---- 5. explicit update applies, preserves admin edits, returns published records to draft ----
logs.clear()
imp = m.sync(api, rows, apply=True, update_existing=True, license_verified=False, public_base="https://example.test")
objs = {r["slug"]: r for r in api.list_all("objects")}
new_intro = objs[f"pmi-{run}"]; new_practice = objs[f"pmp-{run}"]
pack = api.pack(f"pm-test-{run}")
ok(new_intro["title"] == "Chest X-Ray: Normal vs Pneumonia" and len(new_intro["data"]["objectives"]) == 4, "intro not updated")
ok(len(new_intro["assets"]) == 4 and new_practice["assets"] == [], "gallery assets must move to the lesson object")
ok(new_intro["pack"] == pack["id"] and new_intro["status"] == "draft", "pack relation / draft state")
ok(new_intro["related"] == [extra["id"]] and "catatan-admin" in new_intro["tags"], "admin edits (related/tags) must be preserved")
assets = {r["slug"]: r for r in api.list_all("assets")}
a0 = assets[legacy_assets[0]["slug"]]
ok(a0["data"]["dataset"] == {"name": "PneumoniaMNIST", "task": "binary_classification", "split": "test", "label": "normal", "sample_index": 700, "resolution": [224, 224]}, a0["data"].get("dataset"))
ok(a0["data"]["license"]["verified"] is True, "admin-verified license must not be reset")
ok(a0["data"]["annotations"][0]["label"] == "Catatan admin", "annotations must be preserved")
ok(imp.unpublished and any(x.startswith("objects:") for x in imp.unpublished), "unpublish warning expected")
detail = api.pack(f"pm-test-{run}")
ok(detail["counts"]["assets"]["total"] == 4 and detail["counts"]["pathways"]["total"] == 1 and detail["counts"]["questions"]["total"] == 4, detail["counts"])

# ---- 6. idempotent ----
logs.clear()
imp = m.sync(api, rows, apply=True, update_existing=True, license_verified=False, public_base="https://example.test")
ok(imp.counts["update"] == 0 and imp.counts["unchanged"] >= 9, str(imp.counts) + chr(10) + chr(10).join(logs))

# ---- 7. publish_pack.py: accidental apply is refused; dry-run reports; apply publishes in order, idempotently ----
env = {**os.environ}
cli = [sys.executable, str(HERE / "publish_pack.py"), f"pm-test-{run}"]
r = subprocess.run(cli + ["--apply"], env=env, capture_output=True, text=True)
ok(r.returncode == 2 and "--confirm-reviewed" in r.stderr, r.stderr)
r = subprocess.run(cli + ["--dry-run"], env=env, capture_output=True, text=True)
ok(r.returncode == 0 and "READY TO PUBLISH" in r.stdout and "Assets:" in r.stdout, r.stdout + r.stderr)
ok(api.pack(f"pm-test-{run}")["counts"]["objects"]["published"] == 0, "dry-run must change nothing")
r = subprocess.run(cli + ["--apply", "--confirm-reviewed"], env=env, capture_output=True, text=True)
ok(r.returncode == 0 and "Status pack: published" in r.stdout, r.stdout + r.stderr)
r2 = subprocess.run(cli + ["--apply", "--confirm-reviewed"], env=env, capture_output=True, text=True)
ok(r2.returncode == 0 and "Diterbitkan: 0 record" in r2.stdout, r2.stdout + r2.stderr)
print(f"ingest tools: {checks} checks passed (plan, skip-by-default, conflict, update, preserve, idempotent, publish CLI).")
