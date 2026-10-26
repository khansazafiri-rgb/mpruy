#!/usr/bin/env python3
"""Import a small, reviewable MedMNIST teaching pack into MEDCOEL Lab.

Current supported dataset: PneumoniaMNIST 224px.

Design goals:
- official-source download only
- checksum verification
- deterministic, disjoint learning/practice sampling; max 5 practice images/class
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
  python tools/lab-ingest/import_medmnist.py --apply --update-existing     # sync existing records (only modified records return to draft; review before publishing)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import urllib.request
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from medcoel_api import ApiError, MedcoelAPI  # noqa: E402
from sampling import LEARNING_PER_CLASS, PRACTICE_PER_CLASS, SELECTION_SEED, SelectionConfig, select_samples
from dataset_registry import require_enabled_dataset


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
    split: str = "test"
    resolution: int = 224
    task: str = "binary_classification"


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
    if arr.ndim != 1 or not np.issubdtype(arr.dtype, np.integer):
        raise ValueError("Expected integer single-label array shaped [N] or [N,1]; multi-label ingestion refused.")
    return arr


def png_name(split: str, index: int, label: int, spec: DatasetSpec = PNEUMONIA_224, role: str = "learning") -> str:
    if role == "practice":
        identity = f"{spec.key}:{spec.md5}:{split}:{index}"
        return f"{spec.key}-practice-{hashlib.sha256(identity.encode()).hexdigest()[:24]}.png"
    name = re.sub(r"[^a-z0-9]+", "-", spec.labels[label].lower()).strip("-")
    return f"{spec.key}-{split}-{name}-{index:04d}.png"


def export_pngs(npz_path: Path, config: SelectionConfig, spec: DatasetSpec = PNEUMONIA_224) -> dict[str, list[dict[str, Any]]]:
    require_enabled_dataset(spec.key)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    with np.load(npz_path, allow_pickle=False) as data:
        images = data[f"{spec.split}_images"]
        labels = flatten_labels(data[f"{spec.split}_labels"])
        if len(images) != len(labels):
            raise ValueError("Image and label counts differ")
        selection = select_samples(labels, spec.labels, dataset=spec.key, split=spec.split, version=spec.md5, config=config)
        groups = {"learning": [], "practice": []}
        for role in groups:
            for index in getattr(selection, role):
                label = int(labels[index])
                image = np.asarray(images[index])
                if image.ndim == 3 and image.shape[-1] == 1:
                    image = image[..., 0]
                if image.ndim not in (2, 3) or (image.ndim == 3 and image.shape[-1] not in (3, 4)):
                    raise ValueError(f"Unsupported image shape at index {index}: {image.shape}")
                filename = png_name(spec.split, index, label, spec, role)
                out = PUBLIC_DIR / filename
                Image.fromarray(np.asarray(image, dtype=np.uint8)).save(out, format="PNG", optimize=True)
                groups[role].append({"dataset": spec.key, "split": spec.split, "index": index, "label": label,
                    "label_name": spec.labels[label], "role": role, "filename": filename, "local_path": str(out),
                    "url_path": f"/lab-content/medmnist/{spec.key}/{filename}"})
    return groups


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
            new["tags"] = list(dict.fromkeys(old.get("tags", []) + body.get("tags", [])))
            new["related"] = old.get("related", [])
            new["legacyQuestions"] = old.get("legacyQuestions", [])
        if kind == "questions":
            archive = self.existing.get("objects", {}).get(archive_body()["slug"], {})
            old_links = [x for x in old.get("objects", []) if x != archive.get("id")]
            new["objects"] = list(dict.fromkeys(old_links + body.get("objects", [])))
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
            "prompt": "Foto toraks ini termasuk kategori benchmark mana?",
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


def archive_body() -> dict[str, Any]:
    return {"slug": "pneumoniamnist-arsip-ingestion", "title": "Arsip ingestion PneumoniaMNIST (jangan diterbitkan)",
        "pack": "", "domain": "imaging", "modality": "Chest X-ray", "summary": "Retensi soal importer yang sudah dideprekasi.",
        "tags": [], "assets": [], "related": [], "legacyQuestions": [],
        "data": {"definition": "Arsip operasional, bukan materi belajar. Soal dipertahankan sebagai draft untuk audit; tidak termasuk pack atau jalur belajar aktif."}}


def validate_groups(groups: dict[str, list[dict[str, Any]]], config: SelectionConfig) -> None:
    identities = {}
    for role, count in (("learning", config.learning_per_class), ("practice", config.practice_per_class)):
        rows = groups[role]
        for label, name in PNEUMONIA_224.labels.items():
            if sum(r["label"] == label for r in rows) != count:
                raise ValueError(f"{role}: expected {count} samples for class {name}")
        if len(rows) != count * len(PNEUMONIA_224.labels):
            raise ValueError(f"{role}: unexpected class or sample count")
        keys = []
        for r in rows:
            if (r.get("dataset", PNEUMONIA_224.key) != PNEUMONIA_224.key or
                    r.get("split", PNEUMONIA_224.split) != PNEUMONIA_224.split or
                    not isinstance(r["index"], int) or isinstance(r["index"], bool) or r["index"] < 0 or
                    r["label_name"] != PNEUMONIA_224.labels[r["label"]]):
                raise ValueError("Invalid source identity/class")
            keys.append(r["index"])
        if len(set(keys)) != len(keys):
            raise ValueError(f"{role}: duplicate source indices")
        identities[role] = set(keys)
    if identities["learning"] & identities["practice"]:
        raise ValueError("Learning/practice source indices overlap; sync refused")


def managed_question(q: dict[str, Any], assets: dict[str, dict[str, Any]], pack_id: str) -> bool:
    """Conservative ownership check; a slug alone never authorizes retirement."""
    if not re.fullmatch(r"pmnist-q-(normal|pneumonia)-[0-9]{4,}(?:-[a-z0-9]+)?", q["slug"]):
        return False
    if q.get("pack", "") not in ("", pack_id) or q.get("data", {}).get("type") != "image_identification":
        return False
    a = assets.get(q.get("asset"), {}).get("data", {})
    return a.get("dataset", {}).get("name") == "PneumoniaMNIST" or a.get("license", {}).get("dataset") == "PneumoniaMNIST"


def retire_question(importer: DraftImporter, old: dict[str, Any], practice_id: str, archive_id: str) -> None:
    """Use the canonical revision-checked PUT; keep the record and other object links."""
    log(f"{'DEPRECATE' if importer.apply else 'WOULD DEPRECATE'} questions: {old['slug']} rev {old['revision']} "
        f"({old['status']} -> draft; detach practice + pack; retain in draft archive, no delete)")
    importer.retired.append({"id": old["id"], "slug": old["slug"], "revision": old["revision"],
                             "action": "draft + detach practice/pack + retain archive", "reason": "not in disjoint practice selection"})
    if not importer.apply or not importer.update_existing:
        return
    payload = {k: v for k, v in old.items() if k not in ("status", "reviewedBy", "reviewedAt")}
    payload.update(pack="", title=("Deprecated · " + old["title"])[:200],
                   objects=[x for x in old["objects"] if x != practice_id] + [archive_id])
    try:
        importer.api.update("questions", old["id"], payload)
    except ApiError as exc:
        raise RuntimeError(f"Gagal mendeprekasi {old['slug']}; revision conflict? Rerun after reviewing changes. ({exc})") from exc
    importer.counts["update"] += 1
    if old["status"] == "published":
        importer.unpublished.append("questions:" + old["slug"])


def report_selection(groups, config, current=None, obsolete=None):
    log("\nPneumoniaMNIST")
    for role in ("learning", "practice"):
        log(f"\n{role.title()}:")
        for label, name in PNEUMONIA_224.labels.items():
            log(f"  {name:<14} {sum(r['label'] == label for r in groups[role])}")
    log("\nOverlap learning/practice: 0 (source indices)")
    log(f"Selection: {config.metadata()}")
    log(f"Practice questions: current: {current if current is not None else 'unknown (read-only API plan needs --update-existing)'}; target: {len(groups['practice'])}")
    if obsolete is not None:
        log(f"Obsolete importer-managed questions: {len(obsolete)}. They become draft, leave practice + pack, and remain in a draft archive. No hard deletes.")
        log("Legacy 20-question pack: all 20 old questions may be retired, because they reuse the learning gallery; 10 replacement questions use distinct images. This also removes the previous extra 10 from the active bank.")


def sync(api: MedcoelAPI, groups: dict[str, list[dict[str, Any]]], *, apply: bool, update_existing: bool,
         license_verified: bool, public_base: str, config: SelectionConfig = SelectionConfig()) -> DraftImporter:
    """Plan first, then revision-safe API writes. Never publishes or deletes records."""
    validate_groups(groups, config)
    pack = api.pack(PACK["slug"])
    pack_id = pack["id"] if pack else ""
    importer = DraftImporter(api, apply=apply, update_existing=update_existing, license_verified=license_verified)
    importer.retired = []
    for kind in ("assets", "objects", "questions", "pathways"):
        importer.refresh(kind)
    old_practice = importer.existing["objects"].get(object_practice([])["slug"])
    current = [q for q in importer.existing["questions"].values() if old_practice and old_practice["id"] in q.get("objects", [])]
    target_slugs = {question_body(r, "", "")["slug"] for r in groups["practice"]}
    assets = {a["id"]: a for a in importer.existing["assets"].values()}
    if any(not managed_question(q, assets, pack_id) for q in current):
        raise RuntimeError("Practice object contains unrecognized/manual questions. Review ownership before syncing; nothing changed.")
    obsolete = [q for q in current if q["slug"] not in target_slugs]
    report_selection(groups, config, len(current), obsolete)
    if obsolete and not update_existing:
        log("--update-existing is required to detach obsolete questions; create-only mode cannot finish this migration.")
        if apply:
            raise RuntimeError("Refusing apply without --update-existing: existing practice bank would exceed the policy. Nothing changed.")
    archive = importer.existing["objects"].get(archive_body()["slug"])
    if obsolete and archive and (archive.get("status") != "draft" or archive.get("pack")):
        raise RuntimeError("Archive must remain draft and outside all packs. Nothing changed.")
    if obsolete and update_existing:
        archive = importer.ensure("objects", archive_body())
        # Retire old published questions before adding any replacement drafts.
        for q in obsolete:
            retire_question(importer, q, old_practice["id"], archive["id"])
    elif obsolete:
        for q in obsolete:
            retire_question(importer, q, old_practice["id"], "<draft-archive>")
    if pack is None:
        log(f"{'CREATE' if apply else 'WOULD CREATE'} content pack: {PACK['slug']}")
        pack = api.create_pack(PACK) if apply else {"id": ""}
        pack_id = pack["id"]
    asset_records = {}
    for role in ("learning", "practice"):
        asset_records[role] = [importer.ensure("assets", asset_body(row, public_base, license_verified, pack_id)) for row in groups[role]]
    intro = importer.ensure("objects", object_intro([a["id"] for a in asset_records["learning"]], pack_id))
    practice = importer.ensure("objects", object_practice([], pack_id))
    for row, asset in zip(groups["practice"], asset_records["practice"]):
        importer.ensure("questions", question_body(row, practice["id"], asset["id"], pack_id))
    importer.ensure("pathways", pathway_body(intro["id"], practice["id"], pack_id))
    if apply and update_existing:
        active = [q for q in api.list_all("questions") if practice["id"] in q.get("objects", [])]
        if {q["slug"] for q in active} != target_slugs:
            raise RuntimeError("Post-sync membership differs from target. Do not publish; review concurrent edits and rerun.")
        log(f"Verified practice membership: {len(active)} target questions (drafts require review/publish).")
    c = importer.counts
    log(f"Ringkasan: {c['create']} dibuat, {c['update']} diperbarui, {c['unchanged']} tidak berubah, {c['skip']} dilewati; {len(importer.retired)} deprecated.")
    if importer.unpublished:
        log(f"{len(importer.unpublished)} published records changed and return to draft; retired records stay outside the pack. Unchanged published records keep their review/status.")
    log("DRY RUN selesai. PocketBase tidak diubah." if not apply else "Draft sync complete. Review before validation/publishing; no content was published.")
    return importer


def manifest(groups: dict[str, list[dict[str, Any]]], config: SelectionConfig) -> dict[str, Any]:
    validate_groups(groups, config)
    out = {"schema_version": 2, "dataset": PNEUMONIA_224.key, "resolution": 224, "split": "test",
           "source_md5": PNEUMONIA_224.md5, "selection_config": config.metadata(), "overlap": 0,
           "license": PNEUMONIA_224.license_name, "source_url": PNEUMONIA_224.source_url}
    for role in ("learning", "practice"):
        rows = groups[role]
        out[role] = {"total": len(rows), "per_class": getattr(config, role + "_per_class"),
            "counts": {name: sum(r["label"] == label for r in rows) for label, name in PNEUMONIA_224.labels.items()},
            "files": [{"dataset": PNEUMONIA_224.key, "split": "test", "source_sample_index": r["index"],
                       "class_label": r["label"], "class_name": r["label_name"], "role": role,
                       "filename": r["filename"], "url_path": r["url_path"]} for r in rows]}
    return out


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Prepare/import disjoint PneumoniaMNIST learning and practice samples")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Create/update drafts through the admin API; never publish")
    mode.add_argument("--dry-run", action="store_true", help="Default: local export and read-only sync plan")
    parser.add_argument("--learning-per-class", type=int, default=LEARNING_PER_CLASS)
    parser.add_argument("--per-class", type=int, default=None, help="Compatibility alias for --learning-per-class only")
    parser.add_argument("--practice-per-class", type=int, default=PRACTICE_PER_CLASS)
    parser.add_argument("--selection-seed", type=int, default=SELECTION_SEED)
    parser.add_argument("--public-base", default=os.getenv("MEDCOEL_PUBLIC_BASE", "https://medcoel.com"))
    parser.add_argument("--license-verified", action="store_true", help="License verified only after explicit human review")
    parser.add_argument("--update-existing", action="store_true", help="Explicitly sync importer-managed records, including obsolete practice retirement")
    args = parser.parse_args(argv)
    if args.per_class is not None:
        if args.learning_per_class != LEARNING_PER_CLASS and args.learning_per_class != args.per_class:
            parser.error("Conflicting --per-class and --learning-per-class")
        args.learning_per_class = args.per_class
    try:
        args.config = SelectionConfig(args.learning_per_class, args.practice_per_class, args.selection_seed)
    except ValueError as exc:
        parser.error(str(exc))
    if args.learning_per_class > 10:
        parser.error("Current Pneumonia gallery supports at most 10/class (20 assets/object). Future adapters must shard larger galleries; practice cap is independent.")
    return args


def main() -> int:
    args = parse_args()
    npz = download(PNEUMONIA_224)
    groups = export_pngs(npz, args.config)
    mf = manifest(groups, args.config)
    # Operational metadata belongs in ignored cache, not the student-facing static directory.
    manifest_dir = CACHE_DIR / "manifests"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifest_dir / "pneumoniamnist-v1.json"
    legacy = PUBLIC_DIR / "manifest.json"
    if legacy.exists():
        backup = manifest_dir / ("legacy-public-" + hashlib.sha256(legacy.read_bytes()).hexdigest()[:16] + ".json")
        legacy.replace(backup)
        log(f"Moved legacy public manifest to private operational cache: {backup}")
    if args.apply or args.update_existing:
        importer = sync(MedcoelAPI.from_env(), groups, apply=args.apply, update_existing=args.update_existing,
                        license_verified=args.license_verified, public_base=args.public_base, config=args.config)
        mf["retirements"] = importer.retired
    else:
        report_selection(groups, args.config)
        log("DRY RUN: no PocketBase connection. Add --update-existing for current counts and retirement plan.")
    manifest_path.write_text(json.dumps(mf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"Operational manifest (not served to students): {manifest_path}")
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
