#!/usr/bin/env python3
"""Import a small, reviewable MedMNIST teaching pack into MEDCOEL Lab.

Current supported dataset: PneumoniaMNIST 224px.

Design goals:
- official-source download only
- checksum verification
- deterministic balanced sampling
- idempotent API writes by slug (existing records are only touched with --update-existing)
- draft-only content (never auto-publish)
- every record belongs to the content pack pneumoniamnist-v1
- no MONAI/PyTorch dependency
- no lesion localization invented from image-level labels

Environment variables used with --apply or --update-existing:
  MEDCOEL_ADMIN_IDENTITY
  MEDCOEL_ADMIN_PASSWORD
  MEDCOEL_API_BASE   (default: https://medcoel.com)

Examples:
  python tools/lab-ingest/import_medmnist.py --dry-run
  python tools/lab-ingest/import_medmnist.py --apply
  python tools/lab-ingest/import_medmnist.py --dry-run --update-existing   # print the sync plan, change nothing
  python tools/lab-ingest/import_medmnist.py --apply --update-existing     # sync existing records (they return to draft; re-publish after)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from medcoel_api import ApiError, MedcoelAPI  # noqa: E402


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


PACK = {
    "slug": "pneumoniamnist-v1",
    "title": "PneumoniaMNIST v1",
    "version": "v1",
    "description": "Contoh foto toraks pediatrik normal vs pneumonia untuk latihan pengenalan pola dan klasifikasi.",
    "source": "MedMNIST v2 · PneumoniaMNIST 224px (Zenodo 10519652)",
    "licenseSummary": "CC BY 4.0. Label hanya tingkat-gambar; tidak ada anotasi lokasi.",
}

# Fields this importer owns per kind. Everything else on an existing record is preserved on update.
MANAGED = {
    "assets": ["title", "pack"],
    "objects": ["title", "summary", "domain", "modality", "assets", "pack"],
    "questions": ["title", "objects", "asset", "pack"],
    "pathways": ["title", "summary", "steps", "pack"],
}
PRESERVED_DATA = {"assets": ["annotations"], "objects": ["blocks", "demo"], "questions": [], "pathways": []}


def brief(value: Any) -> str:
    text = json.dumps(value, ensure_ascii=False, sort_keys=True) if not isinstance(value, str) else value
    return text if len(text) <= 70 else text[:67] + "..."


class DraftImporter:
    """Create (and, only when asked, update) Lab records through the admin API.

    Default is create-only: existing slugs are skipped. `update_existing` rewrites only importer-owned fields,
    keeps admin edits (annotations, blocks, related links, tags, verified license) and sends the record's
    current revision so a concurrent edit makes the server refuse instead of being overwritten.
    Saving through the API returns a record to draft; published records must be re-published afterwards.
    """

    def __init__(self, api: MedcoelAPI, apply: bool, update_existing: bool, license_verified: bool):
        self.api = api
        self.apply = apply
        self.update_existing = update_existing
        self.license_verified = license_verified
        self.existing: dict[str, dict[str, dict[str, Any]]] = {}
        self.slugs: dict[str, str] = {}
        self.counts = {"create": 0, "update": 0, "unchanged": 0, "skip": 0}
        self.unpublished: list[str] = []

    def refresh(self, kind: str) -> None:
        self.existing[kind] = {row["slug"]: row for row in self.api.list_all(kind)}
        for row in self.existing[kind].values():
            self.slugs[row["id"]] = row["slug"]

    def _slug(self, value: Any) -> Any:
        if isinstance(value, list):
            return [self._slug(v) for v in value]
        return self.slugs.get(value, value) if isinstance(value, str) else value

    def _merge(self, kind: str, old: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
        new = {**old}
        for key in MANAGED[kind]:
            if key in body:
                new[key] = body[key]
        data = {**body["data"]}
        for key in PRESERVED_DATA[kind]:
            if key in old.get("data", {}):
                data[key] = old["data"][key]
        if kind == "assets":
            old_license = old.get("data", {}).get("license", {})
            data["license"] = {**data["license"], "verified": bool(self.license_verified or old_license.get("verified"))}
        if kind == "objects":
            new["tags"] = sorted(set(old.get("tags", [])) | set(body.get("tags", [])))
            new["related"] = old.get("related", [])
            new["legacyQuestions"] = old.get("legacyQuestions", [])
        new["data"] = data
        return new

    def _diff(self, kind: str, old: dict[str, Any], new: dict[str, Any], owned: set[str]) -> list[str]:
        out: list[str] = []
        keys = MANAGED[kind] + (["tags"] if kind == "objects" else [])
        for key in keys:
            if self._slug(old.get(key)) != self._slug(new.get(key)):
                out.append(f"{key}: {brief(self._slug(old.get(key)))} -> {brief(self._slug(new.get(key)))}")
        # Only keys this importer sends: the server adds defaults (media, schemaVersion, empty lists) that are not changes.
        for key in sorted(owned):
            if old.get("data", {}).get(key) != new["data"].get(key):
                out.append(f"data.{key}: {brief(old.get('data', {}).get(key))} -> {brief(new['data'].get(key))}")
        return out

    def ensure(self, kind: str, body: dict[str, Any]) -> dict[str, Any]:
        if kind not in self.existing:
            self.refresh(kind)
        slug = body["slug"]
        old = self.existing[kind].get(slug)
        if old is None:
            self.counts["create"] += 1
            if not self.apply:
                log(f"WOULD CREATE draft {kind}: {slug}")
                row = {"id": f"<new:{slug}>", "slug": slug, "status": "draft", "revision": 0}
            else:
                row = self.api.create(kind, body)
                log(f"CREATE draft {kind}: {slug}")
            self.existing[kind][slug] = row
            self.slugs[row["id"]] = slug
            return row
        if not self.update_existing:
            self.counts["skip"] += 1
            log(f"SKIP existing {kind}: {slug} ({old['status']}, rev {old['revision']}); gunakan --update-existing untuk memperbarui")
            return old
        new = self._merge(kind, old, body)
        changes = self._diff(kind, old, new, set(body["data"]))
        if not changes:
            self.counts["unchanged"] += 1
            log(f"UNCHANGED {kind}: {slug}")
            return old
        self.counts["update"] += 1
        note = f" (akan kembali ke draft dari {old['status']})" if old["status"] == "published" else ""
        if old["status"] == "published":
            self.unpublished.append(f"{kind}:{slug}")
        log(f"{'UPDATE' if self.apply else 'WOULD UPDATE'} {kind}: {slug} rev {old['revision']}{note}")
        for line in changes:
            log(f"    {line}")
        if not self.apply:
            return old
        payload = {k: v for k, v in new.items() if k not in ("status", "reviewedBy", "reviewedAt")}
        payload["revision"] = old["revision"]
        try:
            row = self.api.update(kind, old["id"], payload)
        except ApiError as exc:
            raise RuntimeError(f"Gagal memperbarui {kind}:{slug}; konten berubah di server? Muat ulang dan ulangi. ({exc})") from exc
        self.existing[kind][slug] = row
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


def asset_body(row: dict[str, Any], public_base: str, verified: bool, pack_id: str = "") -> dict[str, Any]:
    label_id = int(row["label"])
    label = row["label_name"]
    return {
        "slug": f"pmnist-test-{label}-{int(row['index']):04d}",
        "title": f"PneumoniaMNIST test #{int(row['index'])} · {label}",
        "pack": pack_id,
        "data": {
            "dataset": {
                "name": "PneumoniaMNIST",
                "split": "test",
                "sample_index": int(row["index"]),
                "label": label,
                "resolution": [224, 224],
                "task": "binary_classification",
            },
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


def object_intro(asset_ids: list[str], pack_id: str = "") -> dict[str, Any]:
    return {
        "pack": pack_id,
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


def object_practice(asset_ids: list[str], pack_id: str = "") -> dict[str, Any]:
    return {
        "pack": pack_id,
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
            "mode": "practice",
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


def question_body(row: dict[str, Any], object_id: str, asset_id: str, pack_id: str = "") -> dict[str, Any]:
    label = row["label_name"]
    answer = "A" if label == "normal" else "B"
    return {
        "slug": f"pmnist-q-{label}-{int(row['index']):04d}",
        "title": f"PneumoniaMNIST #{int(row['index'])}: klasifikasi CXR",
        "pack": pack_id,
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
            # Intentionally empty: the dataset has image-level labels only, so there is no medically valid
            # image-specific explanation to show. Feedback is just the correct/incorrect result and the answer.
            "explanation": "",
        },
    }


def pathway_body(intro_id: str, practice_id: str, pack_id: str = "") -> dict[str, Any]:
    return {
        "pack": pack_id,
        "slug": "jalur-cxr-pneumoniamnist",
        "title": "CXR Dasar",
        "summary": "Kenali foto toraks normal dan pneumonia, lalu latihan satu kasus per layar. Semua langkah tetap dapat dibuka langsung.",
        "steps": [intro_id, practice_id],
        "data": {},
    }


def sync(api: MedcoelAPI, rows: list[dict[str, Any]], *, apply: bool, update_existing: bool, license_verified: bool, public_base: str) -> DraftImporter:
    """Create/update the PneumoniaMNIST pack through the admin API (testable with synthetic rows)."""
    pack = api.pack(PACK["slug"])
    if pack is None:
        log(f"{'CREATE' if apply else 'WOULD CREATE'} content pack: {PACK['slug']}")
        pack = api.create_pack(PACK) if apply else {"id": ""}
    pack_id = pack["id"]
    importer = DraftImporter(api, apply=apply, update_existing=update_existing, license_verified=license_verified)

    asset_records: list[dict[str, Any]] = []
    for row in rows:
        asset_records.append(importer.ensure("assets", asset_body(row, public_base, license_verified, pack_id)))
    ids = [a["id"] for a in asset_records]

    intro = importer.ensure("objects", object_intro(ids, pack_id))
    practice = importer.ensure("objects", object_practice([], pack_id))
    for row, asset in zip(rows, asset_records):
        importer.ensure("questions", question_body(row, practice["id"], asset["id"], pack_id))
    importer.ensure("pathways", pathway_body(intro["id"], practice["id"], pack_id))

    c = importer.counts
    log(f"Ringkasan: {c['create']} dibuat, {c['update']} diperbarui, {c['unchanged']} tidak berubah, {c['skip']} dilewati.")
    if importer.unpublished:
        log(f"PERHATIAN: {len(importer.unpublished)} record yang sudah terbit kembali ke draft setelah diperbarui; terbitkan ulang lewat:")
        log("  python tools/lab-ingest/publish_pack.py pneumoniamnist --dry-run  (lalu --apply --confirm-reviewed)")
    if not apply:
        log("DRY RUN selesai. PocketBase tidak diubah.")
    else:
        log("Selesai. Periksa /admin/lab, lalu validasi dan terbitkan content pack.")
        if not license_verified:
            log("License verified=false secara sengaja untuk record baru; ubah hanya setelah review manusia sebelum publish asset.")
    return importer


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
    parser.add_argument("--update-existing", action="store_true", help="Also update records whose slug already exists (importer-owned fields only; needs admin credentials; with --dry-run it only prints the plan)")
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

    connect = args.apply or args.update_existing
    if not connect:
        log("DRY RUN selesai. PocketBase tidak diubah.")
        log("Tambahkan --update-existing untuk melihat rencana perubahan konten yang sudah ada (hanya membaca).")
        log("Jalankan lagi dengan --apply setelah memeriksa gambar dan manifest.")
        return 0

    sync(MedcoelAPI.from_env(), rows, apply=args.apply, update_existing=args.update_existing, license_verified=args.license_verified, public_base=args.public_base)
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
