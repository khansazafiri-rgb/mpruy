"""Shared MedMNIST I/O and revision-safe draft writer; content stays in explicit adapters."""
from __future__ import annotations
import hashlib
import json
import re
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
import numpy as np
from PIL import Image
from medcoel_api import ApiError, MedcoelAPI
from sampling import SelectionConfig, select_samples
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
    version: str = ""


def log(message: str) -> None:
    print(message, flush=True)


def md5sum(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download(spec: DatasetSpec, cache_dir: Path) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    target = cache_dir / f"{spec.key}_{spec.resolution}.npz"
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


def png_name(split: str, index: int, label: int, spec: DatasetSpec, role: str = "learning") -> str:
    if role == "practice":
        identity = f"{spec.key}:{spec.md5}:{split}:{index}"
        return f"{spec.key}-practice-{hashlib.sha256(identity.encode()).hexdigest()[:24]}.png"
    name = re.sub(r"[^a-z0-9]+", "-", spec.labels[label].lower()).strip("-")
    return f"{spec.key}-{split}-{name}-{index:04d}.png"


def export_pngs(npz_path: Path, config: SelectionConfig, spec: DatasetSpec, public_dir: Path) -> dict[str, list[dict[str, Any]]]:
    require_enabled_dataset(spec.key)
    public_dir.mkdir(parents=True, exist_ok=True)
    with np.load(npz_path, allow_pickle=False) as data:
        labels = flatten_labels(data[f"{spec.split}_labels"])
    selection = select_samples(labels, spec.labels, dataset=spec.key, split=spec.split, version=spec.md5, config=config)
    selected = set(selection.learning + selection.practice)
    groups = {"learning": [], "practice": []}
    # NPY image arrays inside NPZ are contiguous; stream and discard unselected rows.
    # This avoids materializing ~515 MB of test RGB images for a 64-image pack.
    with zipfile.ZipFile(npz_path) as archive, archive.open(f"{spec.split}_images.npy") as stream:
        version = np.lib.format.read_magic(stream)
        if version == (1, 0):
            shape, fortran, dtype = np.lib.format.read_array_header_1_0(stream)
        elif version == (2, 0):
            shape, fortran, dtype = np.lib.format.read_array_header_2_0(stream)
        else:
            raise ValueError(f"Unsupported NPY version: {version}")
        if fortran or dtype != np.dtype("uint8") or len(shape) not in (3, 4):
            raise ValueError("Expected contiguous uint8 image array [N,H,W] or [N,H,W,C]")
        if shape[0] != len(labels):
            raise ValueError("Image and label counts differ")
        if len(shape) == 4 and shape[-1] not in (1, 3, 4):
            raise ValueError("Unsupported image channels")
        row_size = int(np.prod(shape[1:]))
        if row_size <= 0 or row_size > 16 * 1024 * 1024:
            raise ValueError("Invalid image dimensions")
        images = {}
        for index in range(max(selected) + 1):
            raw = stream.read(row_size)
            if len(raw) != row_size:
                raise ValueError("Truncated image array")
            if index in selected:
                images[index] = np.frombuffer(raw, dtype=dtype).reshape(shape[1:])
        for role in groups:
            for index in getattr(selection, role):
                label = int(labels[index])
                image = images[index]
                if image.ndim == 3 and image.shape[-1] == 1:
                    image = image[..., 0]
                filename = png_name(spec.split, index, label, spec, role)
                out = public_dir / filename
                Image.fromarray(image).save(out, format="PNG", optimize=True)
                groups[role].append({"dataset": spec.key, "split": spec.split, "index": index, "label": label,
                    "label_name": spec.labels[label], "role": role, "filename": filename, "local_path": str(out),
                    "url_path": f"/lab-content/medmnist/{spec.key}/{filename}"})
    return groups


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

    def __init__(self, api: MedcoelAPI, apply: bool, update_existing: bool, license_verified: bool, *, archive_slug: str = "", report_unchanged: bool = False):
        self.archive_slug = archive_slug
        self.report_unchanged = report_unchanged
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
            archive = self.existing.get("objects", {}).get(self.archive_slug, {})
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
        # Blood reports a truly identical rerun as UNCHANGED even in create-only mode.
        if self.report_unchanged and not self.update_existing:
            proposed = self._merge(kind, old, body)
            if not self._diff(kind, old, proposed, set(body["data"])):
                self.counts["unchanged"] += 1
                log(f"UNCHANGED {kind}: {slug}")
                return old
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


def validate_groups(groups: dict[str, list[dict[str, Any]]], config: SelectionConfig, spec: DatasetSpec) -> None:
    identities = {}
    for role, count in (("learning", config.learning_per_class), ("practice", config.practice_per_class)):
        rows = groups[role]
        for label, name in spec.labels.items():
            if sum(r["label"] == label for r in rows) != count:
                raise ValueError(f"{role}: expected {count} samples for class {name}")
        if len(rows) != count * len(spec.labels):
            raise ValueError(f"{role}: unexpected class or sample count")
        keys = []
        for r in rows:
            if (r.get("dataset", spec.key) != spec.key or
                    r.get("split", spec.split) != spec.split or
                    not isinstance(r["index"], int) or isinstance(r["index"], bool) or r["index"] < 0 or
                    r["label_name"] != spec.labels[r["label"]]):
                raise ValueError("Invalid source identity/class")
            keys.append(r["index"])
        if len(set(keys)) != len(keys):
            raise ValueError(f"{role}: duplicate source indices")
        identities[role] = set(keys)
    if identities["learning"] & identities["practice"]:
        raise ValueError("Learning/practice source indices overlap; sync refused")


def manifest(groups: dict[str, list[dict[str, Any]]], config: SelectionConfig, spec: DatasetSpec) -> dict[str, Any]:
    validate_groups(groups, config, spec)
    out = {"schema_version": 2, "dataset": spec.key, "resolution": spec.resolution, "split": spec.split,
           "source_md5": spec.md5, "selection_config": config.metadata(), "overlap": 0,
           "license": spec.license_name, "source_url": spec.source_url}
    if spec.version:
        out["dataset_version"] = spec.version
    for role in ("learning", "practice"):
        rows = groups[role]
        out[role] = {"total": len(rows), "per_class": getattr(config, role + "_per_class"),
            "counts": {name: sum(r["label"] == label for r in rows) for label, name in spec.labels.items()},
            "files": [{"dataset": spec.key, "split": spec.split, "source_sample_index": r["index"],
                       "class_label": r["label"], "class_name": r["label_name"], "role": role,
                       "filename": r["filename"], "url_path": r["url_path"]} for r in rows]}
    return out
