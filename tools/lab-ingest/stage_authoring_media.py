"""Stage selected MedMNIST PNGs as reusable draft lab_media; never publish content."""
from __future__ import annotations

import argparse
import json
import os
import urllib.request
import uuid
from pathlib import Path

from bloodmnist import BLOOD_224, DEFAULT_CONFIG as BLOOD_SELECTION, STUDENT_LABELS as BLOOD_LABELS
from import_medmnist import PNEUMONIA_224
from medcoel_api import MedcoelAPI
from medmnist_core import download, export_pngs, manifest, validate_groups
from octmnist import CONFIG as OCT
from pathmnist import CONFIG as PATH
from sampling import SelectionConfig

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CACHE = ROOT / "tools" / "lab-ingest" / "cache"
MEDIA_PATH = "/api/medcoel/admin/lab-authoring/media"
RECORDS_PATH = "/api/medcoel/admin/lab-authoring/records?kind=source"
DATASETS = {
    "pneumoniamnist": (PNEUMONIA_224, SelectionConfig(10, 5), {0: "Normal", 1: "Pneumonia"}),
    "bloodmnist": (BLOOD_224, BLOOD_SELECTION, BLOOD_LABELS),
    "pathmnist": (PATH.spec, PATH.selection, PATH.student_labels),
    "octmnist": (OCT.spec, OCT.selection, OCT.student_labels),
}


def source_key(dataset: str) -> str:
    return f"{dataset}-224-source"


def media_key(row: dict) -> str:
    return f"{row['dataset']}-{row['split']}-{row['index']:05d}"


def source_definition(spec) -> dict:
    return {"key": source_key(spec.key), "title": f"{spec.title} 224px / MedMNIST+",
            "role": "asset", "ingestionAllowed": True, "datasetReviewRequired": True,
            "url": spec.source_url, "citation": spec.citation,
            "license": {"name": spec.license_name, "url": "https://creativecommons.org/licenses/by/4.0/",
                        "citation": spec.citation, "verified": False, "commercialUse": True,
                        "redistribution": True, "attributionRequired": True},
            "policies": [],
            "disclosure": "Gambar berlabel dataset untuk pembelajaran, bukan diagnosis pasien."}


def check_source(existing: dict | None, spec) -> None:
    if existing is not None and (existing.get("role") != "asset" or
            existing.get("ingestionAllowed") is not True or
            existing.get("url") != spec.source_url):
        raise RuntimeError(f"Sumber {source_key(spec.key)} tidak sesuai untuk staging; tinjau manual.")


def upload_media(api: MedcoelAPI, row: dict, labels: dict[int, str], image_root: Path) -> dict:
    path = Path(row["local_path"])
    if (path.is_symlink() or path.resolve().parent != image_root.resolve() or
            not path.is_file() or path.suffix != ".png" or path.name != row["filename"]):
        raise RuntimeError("File staging media tidak valid.")
    practice = row["role"] == "practice"
    fields = {"key": media_key(row), "sourceKey": source_key(row["dataset"]),
              "title": "Citra latihan" if practice else labels[row["label"]],
              "alt": "Citra latihan identifikasi" if practice else f"Contoh {labels[row['label']]}"}
    boundary = uuid.uuid4().hex
    payload = b"".join(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode()
                       for key, value in fields.items())
    payload += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
                f"filename=\"{path.name}\"\r\nContent-Type: image/png\r\n\r\n").encode()
    payload += path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(api.base + MEDIA_PATH, data=payload,
                                 headers={"Authorization": api.token,
                                          "Content-Type": f"multipart/form-data; boundary={boundary}"},
                                 method="POST")
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.load(response)


def stage_selected(api: MedcoelAPI | None, spec, labels: dict[int, str], groups: dict,
                   image_root: Path, *, apply: bool, existing_media: dict,
                   existing_sources: dict, uploader=upload_media) -> dict:
    rows = groups["learning"] + groups["practice"]
    keys = [media_key(row) for row in rows]
    if len(set(keys)) != len(keys) or set(r["index"] for r in groups["learning"]) & set(r["index"] for r in groups["practice"]):
        raise RuntimeError("Key media ganda atau learning/practice overlap.")
    key = source_key(spec.key)
    source = existing_sources.get(key)
    check_source(source.get("data", source) if source else None, spec)
    for media in (existing_media[k] for k in keys if k in existing_media):
        if media["sourceKey"] != key:
            raise RuntimeError("Key media sudah dimiliki sumber lain: " + media["key"])
    skipped = sum(k in existing_media for k in keys)
    if apply and source is None:
        definition = source_definition(spec)
        bundle = {"schemaVersion": 1, "records": [{"kind": "source", "data": definition}]}
        preview = api.request("POST", "/api/medcoel/admin/lab-authoring/preview", bundle)
        if not preview["ok"]:
            raise RuntimeError("Sumber draft tidak valid: " + "; ".join(preview["errors"]))
        if len(preview.get("entries", [])) != 1 or preview["entries"][0].get("action") != "create":
            raise RuntimeError("Sumber sudah ada atau berubah; staging dihentikan agar metadata review tidak tertimpa.")
        api.request("POST", "/api/medcoel/admin/lab-authoring/apply", {"bundle": bundle, "token": preview["token"]})
        existing_sources[key] = {"data": definition}
    uploaded = 0
    if apply:
        for row in rows:
            k = media_key(row)
            if k not in existing_media:
                existing_media[k] = uploader(api, row, labels, image_root)
                uploaded += 1
    return {"dataset": spec.key, "learning": len(groups["learning"]),
            "practice": len(groups["practice"]), "overlap": 0,
            "existing_skipped": skipped, "newly_uploaded": uploaded,
            "total_ready": skipped + uploaded}


def operational_manifest(groups: dict, config, spec) -> dict:
    output = manifest(groups, config, spec)
    for role in ("learning", "practice"):
        output[role]["files"] = [
            {"media_key": media_key(row), "source_sample_index": row["index"],
             "role": role, "label_id": row["label"], "label_name": row["label_name"],
             "filename": row["filename"]} for row in groups[role]]
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", choices=[*DATASETS, "all"], default="all")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    parser.add_argument("--cache-dir", type=Path, default=Path(os.getenv("MEDCOEL_LAB_CACHE", DEFAULT_CACHE)))
    args = parser.parse_args()
    cache = args.cache_dir.resolve()
    if cache.is_relative_to(ROOT / "apps" / "web" / "public"):
        parser.error("Cache staging harus privat, bukan apps/web/public.")
    selected = list(DATASETS) if args.dataset == "all" else [args.dataset]
    api = MedcoelAPI.from_env() if args.apply or os.getenv("MEDCOEL_ADMIN_PASSWORD") else None
    existing_media = {r["key"]: r for r in api.request("GET", MEDIA_PATH)["items"]} if api else {}
    existing_sources = {r["key"]: r for r in api.request("GET", RECORDS_PATH)["items"]} if api else {}
    results = []
    for dataset in selected:
        spec, config, labels = DATASETS[dataset]
        npz = download(spec, cache)
        image_root = cache / "authoring-media" / dataset
        groups = export_pngs(npz, config, spec, image_root)
        validate_groups(groups, config, spec)
        report = operational_manifest(groups, config, spec)
        path = cache / "manifests" / f"authoring-media-{dataset}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(path)
        result = stage_selected(api, spec, labels, groups, image_root, apply=args.apply,
                                existing_media=existing_media, existing_sources=existing_sources)
        results.append(result)
        print(f"{dataset}: learning={result['learning']} practice={result['practice']} overlap=0 "
              f"existing/skipped={result['existing_skipped']} newly_uploaded={result['newly_uploaded']} "
              f"total_ready={result['total_ready']}", flush=True)
        print(f"  private manifest: {path}", flush=True)
    print("Final inventory by source:", flush=True)
    for dataset in selected:
        key = source_key(dataset)
        count = sum(r["sourceKey"] == key for r in existing_media.values()) if api else 0
        print(f"  {key}: {count if api else 'unknown (offline dry-run)'}", flush=True)
    print("No content published." if args.apply else "DRY RUN: no API writes or publication.", flush=True)


if __name__ == "__main__":
    main()
