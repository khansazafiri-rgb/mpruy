#!/usr/bin/env python3
"""Import a small, reviewable MedMNIST teaching pack into MEDCOEL Lab.

Current supported dataset: PneumoniaMNIST 224px.

Design goals:
- official-source download only
- checksum verification
- deterministic balanced sampling
- idempotent API writes by slug
- draft-only content (never auto-publish)
- no MONAI/PyTorch dependency
- no lesion localization invented from image-level labels

Environment variables used when --apply is supplied:
  MEDCOEL_ADMIN_IDENTITY
  MEDCOEL_ADMIN_PASSWORD
  MEDCOEL_API_BASE   (default: https://medcoel.com)

Examples:
  python tools/lab-ingest/import_medmnist.py --dry-run
  python tools/lab-ingest/import_medmnist.py --apply
  python tools/lab-ingest/import_medmnist.py --apply --per-class 15
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class DatasetSpec:
    key: str
    title: str
    download_url: str
    md5: str
    license_name: str
    source_url: str
    citation: str
    labels: dict[int, str]


PNEUMONIA_224 = DatasetSpec(
    key="pneumoniamnist",
    title="PneumoniaMNIST",
    download_url="https://zenodo.org/records/10519652/files/pneumoniamnist_224.npz?download=1",
    md5="d6a3c71de1b945ea11211b03746c1fe1",
    license_name="CC BY 4.0",
    source_url="https://medmnist.com/",
    citation=(
        "Yang J, Shi R, Wei D, et al. MedMNIST v2—A large-scale lightweight benchmark for "
        "2D and 3D biomedical image classification. Scientific Data. 2023;10:41. "
        "PneumoniaMNIST is derived from pediatric chest X-rays described by Kermany DS, "
        "Goldbaum M, et al. Identifying Medical Diagnoses and Treatable Diseases by "
        "Image-Based Deep Learning. Cell. 2018;172(5):1122-1131.e9."
    ),
    labels={0: "normal", 1: "pneumonia"},
)


ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = ROOT / "tools" / "lab-ingest" / "cache"
PUBLIC_DIR = ROOT / "apps" / "web" / "public" / "lab-content" / "medmnist" / PNEUMONIA_224.key


def log(message: str) -> None:
    print(message, flush=True)


def md5sum(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download(spec: DatasetSpec) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    target = CACHE_DIR / f"{spec.key}_224.npz"
    if target.exists() and md5sum(target) == spec.md5:
        log(f"Dataset cache OK: {target}")
        return target
    if target.exists():
        log("Checksum cache tidak cocok; mengunduh ulang.")
        target.unlink()

    partial = target.with_suffix(".npz.part")
    if partial.exists():
        partial.unlink()
    log(f"Mengunduh {spec.title} 224px dari Zenodo resmi...")
    req = urllib.request.Request(spec.download_url, headers={"User-Agent": "MEDCOEL-Lab-Ingest/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response, partial.open("wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    partial.replace(target)
    actual = md5sum(target)
    if actual != spec.md5:
        target.unlink(missing_ok=True)
        raise RuntimeError(f"MD5 tidak cocok. expected={spec.md5} actual={actual}")
    log(f"Download terverifikasi: {target}")
    return target


def flatten_labels(raw: np.ndarray) -> np.ndarray:
    arr = np.asarray(raw)
    if arr.ndim == 2 and arr.shape[1] == 1:
        arr = arr[:, 0]
    return arr.astype(int)


def balanced_selection(labels: np.ndarray, per_class: int) -> list[int]:
    selected: list[int] = []
    for label in sorted(PNEUMONIA_224.labels):
        idx = np.where(labels == label)[0]
        if len(idx) < per_class:
            raise RuntimeError(f"Kelas {label} hanya punya {len(idx)} sampel; diminta {per_class}.")
        selected.extend(int(i) for i in idx[:per_class])
    return selected


def png_name(split: str, index: int, label: int) -> str:
    return f"{PNEUMONIA_224.key}-{split}-{PNEUMONIA_224.labels[label]}-{index:04d}.png"


def export_pngs(npz_path: Path, per_class: int) -> list[dict[str, Any]]:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    with np.load(npz_path, allow_pickle=False) as data:
        images = data["test_images"]
        labels = flatten_labels(data["test_labels"])
        selected = balanced_selection(labels, per_class)
        rows: list[dict[str, Any]] = []
        for index in selected:
            label = int(labels[index])
            image = np.asarray(images[index])
            if image.ndim == 3 and image.shape[-1] == 1:
                image = image[..., 0]
            if image.ndim != 2:
                raise RuntimeError(f"Shape tidak didukung pada index {index}: {image.shape}")
            image = np.asarray(image, dtype=np.uint8)
            filename = png_name("test", index, label)
            out = PUBLIC_DIR / filename
            Image.fromarray(image, mode="L").save(out, format="PNG", optimize=True)
            rows.append({
                "index": index,
                "label": label,
                "label_name": PNEUMONIA_224.labels[label],
                "filename": filename,
                "local_path": str(out),
                "url_path": f"/lab-content/medmnist/{PNEUMONIA_224.key}/{filename}",
            })
    return rows


class MedcoelAPI:
    def __init__(self, base: str, identity: str, password: str):
        self.base = base.rstrip("/")
        self.identity = identity
        self.password = password
        self.token = ""

    def _request(self, method: str, path: str, body: dict[str, Any] | None = None) -> Any:
        headers = {"Accept": "application/json"}
        payload = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            payload = json.dumps(body).encode("utf-8")
        if self.token:
            headers["Authorization"] = self.token
        req = urllib.request.Request(self.base + path, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {exc.code} {method} {path}: {raw}") from exc

    def login(self) -> None:
        data = self._request("POST", "/api/collections/users/auth-with-password", {
            "identity": self.identity,
            "password": self.password,
        })
        self.token = data.get("token", "")
        if not self.token:
            raise RuntimeError("Login admin berhasil tanpa token? Periksa respons PocketBase.")

    def list_all(self, kind: str) -> list[dict[str, Any]]:
        page = 1
        out: list[dict[str, Any]] = []
        while True:
            data = self._request("GET", f"/api/medcoel/admin/lab/{kind}?page={page}")
            out.extend(data.get("items", []))
            if not data.get("hasMore"):
                return out
            page += 1

    def create(self, kind: str, body: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", f"/api/medcoel/admin/lab/{kind}", body)


class DraftImporter:
    def __init__(self, api: MedcoelAPI):
        self.api = api
        self.existing: dict[str, dict[str, dict[str, Any]]] = {}

    def refresh(self, kind: str) -> None:
        self.existing[kind] = {row["slug"]: row for row in self.api.list_all(kind)}

    def ensure(self, kind: str, body: dict[str, Any]) -> dict[str, Any]:
        if kind not in self.existing:
            self.refresh(kind)
        slug = body["slug"]
        old = self.existing[kind].get(slug)
        if old:
            log(f"SKIP existing {kind}: {slug} ({old['status']}, rev {old['revision']})")
            return old
        row = self.api.create(kind, body)
        self.existing[kind][slug] = row
        log(f"CREATE draft {kind}: {slug}")
        return row


def license_payload(verified: bool) -> dict[str, Any]:
    return {
        "source": "MedMNIST v2 / PneumoniaMNIST",
        "dataset": "PneumoniaMNIST",
        "license": PNEUMONIA_224.license_name,
        "source_url": PNEUMONIA_224.source_url,
        "citation": PNEUMONIA_224.citation,
        "commercial_use": True,
        "redistribution": True,
        "modification": True,
        "attribution_required": True,
        "verified": verified,
    }


def asset_body(row: dict[str, Any], public_base: str, verified: bool) -> dict[str, Any]:
    label_id = int(row["label"])
    label = row["label_name"]
    return {
        "slug": f"pmnist-test-{label}-{int(row['index']):04d}",
        "title": f"PneumoniaMNIST test #{int(row['index'])} · {label}",
        "data": {
            "url": public_base.rstrip("/") + row["url_path"],
            "alt": (
                "Foto toraks pediatrik dari PneumoniaMNIST untuk latihan klasifikasi benchmark "
                f"dengan label dataset '{label}'."
            ),
            "synthetic": False,
            "license": license_payload(verified),
            "annotations": [],
        },
    }


def object_intro(asset_ids: list[str]) -> dict[str, Any]:
    return {
        "slug": "pneumoniamnist-pengenalan",
        "title": "Chest X-Ray: Normal vs Pneumonia",
        "domain": "imaging",
        "modality": "Chest X-ray",
        "summary": "Bandingkan foto toraks normal dan pneumonia pediatrik: apa yang diamati, bagaimana membandingkan, dan batas materi latihan ini.",
        "tags": ["CXR", "thorax", "pneumonia", "pediatrik", "MedMNIST"],
        "assets": asset_ids,
        "related": [],
        "legacyQuestions": [],
        "data": {
            "demo": False,
            "objectives": [
                "Mengenali tampilan umum foto toraks normal",
                "Mengenali pola dasar pneumonia secara garis besar",
                "Membandingkan contoh normal dan pneumonia",
                "Memahami batas materi latihan ini",
            ],
            "definition": (
                "Foto toraks (chest X-ray, CXR) adalah gambar proyeksi 2D. Mulailah dengan orientasi: pastikan gambar frontal, "
                "lalu nilai paru kanan dan kiri. Pada paru normal, lapang paru tampak relatif gelap dan simetris. "
                "Pada pneumonia, area paru dapat tampak lebih putih (opasitas meningkat). "
                "Geser galeri di bawah, buka beberapa kasus, lalu gunakan tombol Bandingkan."
            ),
            "keyFindings": [
                "Gunakan gambar sebagai latihan klasifikasi pola global, bukan sebagai pengganti pembacaan radiologi lengkap.",
                "Dataset tidak menyediakan anotasi lokasi lesi pada setiap gambar, sehingga MEDCOEL tidak membuat hotspot lesi buatan.",
            ],
            "interpretation": (
                "Hasil latihan menunjukkan kecocokan terhadap label benchmark PneumoniaMNIST. "
                "Label dataset bukan diagnosis pasien dan tidak menyatakan lokasi kelainan."
            ),
            "diagnosis": "",
            "differentials": [],
            "clinicalAssociations": ["Latihan interpretasi citra thoraks", "Klasifikasi normal vs pneumonia"],
            "references": [
                {"title": "MedMNIST", "url": "https://medmnist.com/"},
                {"title": "MedMNIST GitHub", "url": "https://github.com/MedMNIST/MedMNIST"},
            ],
            "steps": [
                {"title": "Orientasi", "finding": "Pastikan citra adalah foto toraks frontal dan nilai kualitas gambar secara umum."},
                {"title": "Periksa lapang paru", "finding": "Lihat paru kanan dan kiri secara terpisah, lalu bandingkan keduanya."},
                {"title": "Bandingkan simetri", "finding": "Perhatikan apakah kecerahan kedua paru seimbang atau ada sisi yang tampak lebih putih."},
                {"title": "Cari opasitas meningkat", "finding": "Area yang lebih putih dapat mengarah ke pneumonia, tetapi label dataset tidak menunjukkan lokasi lesi."},
                {"title": "Susun interpretasi", "finding": "Pilih normal atau pneumonia, lalu bandingkan dengan label benchmark setelah menjawab."},
            ],
            "lab": {"context": "", "rows": [], "rules": []},
        },
    }


def object_practice(asset_ids: list[str]) -> dict[str, Any]:
    return {
        "slug": "pneumoniamnist-latihan-klasifikasi",
        "title": "Latihan CXR: Normal vs Pneumonia",
        "domain": "imaging",
        "modality": "Chest X-ray",
        "summary": "Latihan identifikasi gambar CXR pediatrik menggunakan ground-truth benchmark PneumoniaMNIST.",
        "tags": ["CXR", "thorax", "pneumonia", "normal", "image identification"],
        "assets": [],
        "related": [],
        "legacyQuestions": [],
        "data": {
            "demo": False,
            "definition": "Kumpulan citra terpilih dari test split PneumoniaMNIST untuk latihan klasifikasi dua kelas.",
            "keyFindings": [
                "Tentukan kategori benchmark berdasarkan tampilan CXR secara keseluruhan.",
                "Tidak ada target bounding box atau segmentasi pada content pack ini.",
            ],
            "interpretation": (
                "Jawaban dinilai terhadap label dataset. Gunakan latihan ini untuk pengenalan pola, "
                "bukan untuk keputusan klinis atau diagnosis mandiri."
            ),
            "diagnosis": "",
            "differentials": [],
            "clinicalAssociations": ["Pneumonia pediatrik", "Interpretasi foto toraks"],
            "references": [
                {"title": "MedMNIST", "url": "https://medmnist.com/"},
                {"title": "PneumoniaMNIST source benchmark", "url": "https://zenodo.org/records/10519652"},
            ],
            "steps": [],
            "lab": {"context": "", "rows": [], "rules": []},
        },
    }


def question_body(row: dict[str, Any], object_id: str, asset_id: str) -> dict[str, Any]:
    label = row["label_name"]
    answer = "A" if label == "normal" else "B"
    return {
        "slug": f"pmnist-q-{label}-{int(row['index']):04d}",
        "title": f"PneumoniaMNIST #{int(row['index'])}: klasifikasi CXR",
        "objects": [object_id],
        "asset": asset_id,
        "data": {
            "type": "image_identification",
            "prompt": "Berdasarkan label benchmark PneumoniaMNIST, foto toraks ini termasuk kategori mana?",
            "options": [
                {"label": "A", "text": "Normal"},
                {"label": "B", "text": "Pneumonia"},
            ],
            "answer": answer,
            "explanation": (
                f"Ground-truth PneumoniaMNIST untuk citra ini adalah '{label}'. "
                "Dataset menyediakan label tingkat-gambar, bukan anotasi lokasi lesi. "
                "Karena itu pertanyaan ini menilai klasifikasi benchmark dan tidak menyatakan lokasi abnormalitas."
            ),
        },
    }


def pathway_body(intro_id: str, practice_id: str) -> dict[str, Any]:
    return {
        "slug": "jalur-cxr-pneumoniamnist",
        "title": "CXR Dasar: PneumoniaMNIST",
        "summary": "Mulai dari keterbatasan dataset lalu lanjut ke latihan klasifikasi. Semua langkah tetap dapat dibuka langsung.",
        "steps": [intro_id, practice_id],
        "data": {},
    }


def manifest(rows: list[dict[str, Any]], per_class: int) -> dict[str, Any]:
    return {
        "dataset": PNEUMONIA_224.key,
        "resolution": 224,
        "split": "test",
        "per_class": per_class,
        "total": len(rows),
        "license": PNEUMONIA_224.license_name,
        "source_url": PNEUMONIA_224.source_url,
        "files": [{k: row[k] for k in ("index", "label", "label_name", "filename", "url_path")} for row in rows],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare/import PneumoniaMNIST content for MEDCOEL Lab")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Create draft Lab records through the MEDCOEL admin API")
    mode.add_argument("--dry-run", action="store_true", help="Default: download/export/manifest only; do not change PocketBase")
    parser.add_argument("--per-class", type=int, default=10, help="Number of test images per class (default: 10)")
    parser.add_argument("--public-base", default=os.getenv("MEDCOEL_PUBLIC_BASE", "https://medcoel.com"))
    parser.add_argument("--license-verified", action="store_true", help="Mark license metadata verified after explicit human review")
    args = parser.parse_args()

    if args.per_class < 1 or args.per_class > 10:
        parser.error("--per-class must be 1..10 for v1 because one Lab object supports at most 20 assets")

    npz = download(PNEUMONIA_224)
    rows = export_pngs(npz, args.per_class)
    mf = manifest(rows, args.per_class)
    manifest_path = PUBLIC_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(mf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    counts: dict[str, int] = {}
    for row in rows:
        counts[row["label_name"]] = counts.get(row["label_name"], 0) + 1
    log(f"Prepared {len(rows)} PNG: {counts}")
    log(f"Public directory: {PUBLIC_DIR}")
    log(f"Manifest: {manifest_path}")

    if not args.apply:
        log("DRY RUN selesai. PocketBase tidak diubah.")
        log("Jalankan lagi dengan --apply setelah memeriksa gambar dan manifest.")
        return 0

    identity = os.getenv("MEDCOEL_ADMIN_IDENTITY", "")
    password = os.getenv("MEDCOEL_ADMIN_PASSWORD", "")
    base = os.getenv("MEDCOEL_API_BASE", "https://medcoel.com")
    if not identity or not password:
        raise RuntimeError("--apply memerlukan MEDCOEL_ADMIN_IDENTITY dan MEDCOEL_ADMIN_PASSWORD")

    api = MedcoelAPI(base, identity, password)
    api.login()
    importer = DraftImporter(api)

    asset_records: list[dict[str, Any]] = []
    for row in rows:
        asset_records.append(importer.ensure("assets", asset_body(row, args.public_base, args.license_verified)))

    intro = importer.ensure("objects", object_intro([a["id"] for a in asset_records]))
    practice = importer.ensure("objects", object_practice([a["id"] for a in asset_records]))

    for row, asset in zip(rows, asset_records):
        importer.ensure("questions", question_body(row, practice["id"], asset["id"]))

    importer.ensure("pathways", pathway_body(intro["id"], practice["id"]))

    log("Import draft selesai.")
    log("Buka /admin/lab untuk review license -> assets -> objects -> questions -> pathway.")
    if not args.license_verified:
        log("License verified=false secara sengaja; ubah hanya setelah review manusia sebelum publish asset.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Dibatalkan.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
