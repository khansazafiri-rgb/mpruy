#!/usr/bin/env python3
"""Validate and publish a MEDCOEL Lab content pack through the admin API.

The CLI is an operational interface, not a validation bypass: validation and publishing run on the server
with the same canonical rules as the admin UI (license, dependencies, question validity). Records are
published in dependency order (assets -> objects -> questions -> pathways) inside one transaction;
already-published records are skipped, so running it twice is safe.

  python tools/lab-ingest/publish_pack.py pneumoniamnist --dry-run
  python tools/lab-ingest/publish_pack.py pneumoniamnist --apply --confirm-reviewed

Environment: MEDCOEL_ADMIN_IDENTITY, MEDCOEL_ADMIN_PASSWORD, MEDCOEL_API_BASE (default https://medcoel.com).
Exit codes: 0 ok / nothing to do, 2 validation errors (nothing changed), 1 other failure.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from medcoel_api import ApiError, MedcoelAPI, resolve_content_pack  # noqa: E402

LABELS = [("assets", "Assets"), ("objects", "Objects"), ("questions", "Questions"), ("pathways", "Pathways")]


def resolve(api: MedcoelAPI, name: str) -> dict[str, Any]:
    for slug in (name, f"{name}-v1"):
        pack = api.pack(slug)
        if pack:
            return pack
    if name in ("pneumoniamnist", "pneumoniamnist-v1"):
        pack = resolve_content_pack(api, "pneumoniamnist-v1")
        if pack:
            return pack
    raise RuntimeError(f"Content pack '{name}' tidak ditemukan. Jalankan import_medmnist.py --apply terlebih dahulu.")


def report(res: dict[str, Any], apply: bool) -> None:
    pack = res["pack"]
    print("\nMEDCOEL LAB CONTENT PACK\n")
    print(f"{pack['title']}  ({pack['slug']}, status: {pack['status']})\n")
    counts = res.get("counts", {})
    for kind, label in LABELS:
        c = counts.get(kind, {"total": 0, "ready": 0, "skipped": 0})
        extra = f", {c['skipped']} sudah terbit" if c["skipped"] else ""
        print(f"{label + ':':<12} {c['ready']:>3} ready{extra}  (dari {c['total']})")
    errors = res["errors"]
    lic = [e for e in errors if "isensi" in e["message"] or "license" in e["message"]]
    dep = [e for e in errors if "belum terbit" in e["message"]]
    print(f"\nLicense errors:      {len(lic)}")
    print(f"Dependency errors:   {len(dep)}")
    print(f"Validation errors:   {len(errors) - len(lic) - len(dep)}\n")
    for e in errors:
        print(f"  {e['kind']}/{e['slug']}\n    -> {e['message']}")
    if errors:
        print("\nCANNOT PUBLISH (tidak ada yang diubah)")
    elif res.get("empty"):
        print("Content pack kosong.")
    else:
        print("READY TO PUBLISH" if not apply else "")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate/publish a MEDCOEL Lab content pack")
    parser.add_argument("pack", help="slug content pack, mis. pneumoniamnist (awalan -v1 otomatis dicoba)")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Default: validasi saja, tidak mengubah apa pun")
    mode.add_argument("--apply", action="store_true", help="Terbitkan pack (memerlukan --confirm-reviewed)")
    parser.add_argument("--confirm-reviewed", action="store_true", help="Saya telah memeriksa isi, jawaban, sumber, dan hak penggunaan aset pada pack ini")
    args = parser.parse_args()
    if args.apply and not args.confirm_reviewed:
        parser.error("--apply memerlukan --confirm-reviewed (pemeriksaan manusia wajib; CLI bukan jalan pintas validasi)")

    api = MedcoelAPI.from_env()
    pack = resolve(api, args.pack)
    val = api.request("POST", f"/api/medcoel/admin/lab-packs/{pack['id']}/validate", {})
    report(val, args.apply)
    if not val["ok"]:
        return 2
    if not args.apply:
        print("Dry run: tidak ada perubahan. Tambahkan --apply --confirm-reviewed setelah pemeriksaan manusia.")
        return 0
    res = api.request("POST", f"/api/medcoel/admin/lab-packs/{pack['id']}/publish", {"confirmReviewed": True})
    if not res["ok"]:
        for e in res["errors"]:
            print(f"  {e['kind']}/{e['slug']}: {e['message']}", file=sys.stderr)
        return 2
    print(f"Diterbitkan: {len(res['published'])} record, dilewati (sudah terbit): {len(res['skipped'])}.")
    for item in res["published"]:
        print(f"  + {item['kind']}/{item['slug']}")
    print(f"Status pack: {res['pack']['status']}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ApiError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
