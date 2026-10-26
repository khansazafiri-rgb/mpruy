"""Small, explicit Path/OCT teaching packs on the existing MedMNIST draft-only pipeline."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from identification_guides import learning_guide
from medcoel_api import MedcoelAPI, resolve_content_pack
from medmnist_core import DatasetSpec, DraftImporter, download, export_pngs, log, manifest, validate_groups
from sampling import SelectionConfig


@dataclass(frozen=True)
class Group:
    slug: str
    title: str
    labels: tuple[int, ...]


@dataclass(frozen=True)
class VisualConfig:
    spec: DatasetSpec
    student_labels: dict[int, str]
    pack_slug: str
    pack_title: str
    description: str
    modality: str
    domain: str
    learning_per_class: int
    practice_per_class: int
    question_prompt: str
    groupings: tuple[Group, ...]
    original_source_url: str

    def __post_init__(self):
        all_labels = [label for group in self.groupings for label in group.labels]
        if sorted(all_labels) != sorted(self.spec.labels) or set(self.student_labels) != set(self.spec.labels):
            raise ValueError("Each official class must occur in exactly one learning group")
        if max(len(group.labels) * self.learning_per_class for group in self.groupings) > 20:
            raise ValueError("Learning object exceeds the 20-asset API limit")
        SelectionConfig(self.learning_per_class, self.practice_per_class)

    @property
    def selection(self):
        return SelectionConfig(self.learning_per_class, self.practice_per_class)


def pack_body(cfg):
    return {"slug": cfg.pack_slug, "title": cfg.pack_title, "version": "v1",
            "description": cfg.description,
            "source": f"MedMNIST+ v3.0 / {cfg.spec.title} 224px · Zenodo 10519652",
            "licenseSummary": f"CC BY 4.0; original source: {cfg.original_source_url}. Image-level labels only; human review before publication."}


def object_slug(cfg, group, practice=False):
    return f"{cfg.spec.key}-{'latihan' if practice else 'belajar'}-{group.slug}"


def asset_slug(cfg, row):
    # Slugs are source identities; practice public filenames are opaque hashes.
    return f"{cfg.spec.key}-test-{row['index']:05d}"


def asset_body(cfg, row, public_base, verified, pack_id=""):
    practice = row["role"] == "practice"
    label = cfg.student_labels[row["label"]]
    spec = cfg.spec
    return {"slug": asset_slug(cfg, row), "title": "Citra latihan" if practice else label,
        "pack": pack_id, "data": {
            "url": public_base.rstrip("/") + row["url_path"],
            "alt": "Citra latihan identifikasi" if practice else f"Contoh kategori {label}",
            "synthetic": False, "annotations": [],
            "dataset": {"name": spec.title, "task": spec.task, "split": spec.split,
                        "sample_index": row["index"], "label": row["label_name"],
                        "resolution": [spec.resolution, spec.resolution]},
            "license": {"source": f"MedMNIST+ / {spec.title}; {spec.version}; 224px NPZ MD5 {spec.md5}; original {cfg.original_source_url}",
                        "dataset": spec.title, "license": spec.license_name,
                        "source_url": spec.source_url, "citation": spec.citation,
                        "commercial_use": True, "redistribution": True,
                        "modification": True, "attribution_required": True, "verified": verified}}}


def object_body(cfg, group, asset_ids, pack_id="", practice=False):
    title = f"Latihan {group.title}" if practice else group.title
    guide = learning_guide(cfg.spec.key, [cfg.spec.labels[i] for i in group.labels]) if not practice else None
    return {"slug": object_slug(cfg, group, practice), "title": title,
        "pack": pack_id, "domain": cfg.domain, "modality": cfg.modality,
        "summary": "Pilih kategori visual yang paling sesuai." if practice else "Lihat contoh, cari ciri umum, lalu bandingkan kategori.",
        "tags": [cfg.spec.title, cfg.modality], "assets": [] if practice else asset_ids,
        "related": [], "legacyQuestions": [], "data": {
            **({"studyGuide": guide} if guide else {}),
            "demo": False, "mode": "practice" if practice else "lesson",
            "definition": "Gunakan kategori dataset sebagai jawaban; tidak ada penilaian pasien." if practice else
                          "Panduan ciri tingkat kelas diikuti contoh gambar berlabel. Ciri tidak otomatis terlihat pada setiap gambar.",
            "objectives": ["Membandingkan " + ", ".join(cfg.student_labels[i] for i in group.labels) + "."],
            "keyFindings": [], "interpretation": cfg.description,
            "diagnosis": "", "differentials": [], "clinicalAssociations": [], "steps": [],
            "references": [{"title": "MedMNIST+ · sumber gambar", "url": cfg.spec.source_url},
                           {"title": "Dataset asli · sumber gambar", "url": cfg.original_source_url}],
            "lab": {"context": "", "rows": [], "rules": []}}}


def practice_rows(cfg, rows, group):
    selected = [r for r in rows if r["label"] in group.labels]
    return sorted(selected, key=lambda r: hashlib.sha256(
        f"{cfg.pack_slug}:question-order:{r['index']}".encode()).digest())


def answer_slots(cfg, rows, group):
    """Hash-rank answer slots while keeping every A/B/C(/D) equally frequent."""
    ordered = practice_rows(cfg, rows, group)
    by_hash = sorted(ordered, key=lambda r: hashlib.sha256(
        f"{cfg.pack_slug}:answer-position:{r['index']}".encode()).digest())
    n = len(group.labels)
    return {row["index"]: rank % n for rank, row in enumerate(by_hash)}


def question_body(cfg, row, group, slot, object_id, asset_id, pack_id=""):
    choices = sorted((i for i in group.labels if i != row["label"]),
        key=lambda i: hashlib.sha256(f"{cfg.pack_slug}:option:{row['index']}:{i}".encode()).digest())
    choices.insert(slot, row["label"])
    letters = "ABCD"[:len(choices)]
    return {"slug": f"{cfg.spec.key}-q-{row['index']:05d}",
        "title": f"Identifikasi {cfg.modality}", "pack": pack_id,
        "objects": [object_id], "asset": asset_id,
        "data": {"type": "image_identification", "prompt": cfg.question_prompt,
                 "options": [{"label": letters[n], "text": cfg.student_labels[i]} for n, i in enumerate(choices)],
                 "answer": letters[slot], "explanation": ""}}


def pathway_body(cfg, steps, pack_id=""):
    return {"slug": f"jalur-{cfg.spec.key}-v1", "title": cfg.pack_title, "pack": pack_id,
            "summary": cfg.description, "steps": steps, "data": {}}


def sync(cfg, api, groups, *, apply, update_existing, license_verified, public_base):
    validate_groups(groups, cfg.selection, cfg.spec)
    api.require_study_guides(cfg.spec.title)
    importer = DraftImporter(api, apply, update_existing, license_verified, report_unchanged=True)
    for kind in ("assets", "objects", "questions", "pathways"):
        importer.refresh(kind)
    slugs = tuple(object_slug(cfg, group, practice) for group in cfg.groupings for practice in (False, True))
    pack = resolve_content_pack(api, cfg.pack_slug, records=importer.existing,
                                object_slugs=slugs, dataset_name=cfg.spec.title)
    pack_id = pack["id"] if pack else ""
    targets = {"assets": {asset_slug(cfg, r) for role in groups for r in groups[role]},
               "objects": set(slugs),
               "questions": {f"{cfg.spec.key}-q-{r['index']:05d}" for r in groups["practice"]},
               "pathways": {pathway_body(cfg, [])["slug"]}}
    expected_objects = {f"{cfg.spec.key}-q-{row['index']:05d}":
        importer.existing["objects"].get(object_slug(cfg, group, True), {}).get("id")
        for group in cfg.groupings for row in practice_rows(cfg, groups["practice"], group)}
    object_ids = {r["id"] for r in importer.existing["objects"].values() if r["slug"] in slugs}
    for kind, rows in importer.existing.items():
        for old in rows.values():
            linked = bool(pack_id and old.get("pack") == pack_id) or (
                kind == "questions" and bool(object_ids.intersection(old.get("objects", []))))
            targeted = old["slug"] in targets[kind]
            if linked and not targeted:
                raise RuntimeError(f"{cfg.spec.title} pack contains manual/obsolete content; review ownership. Nothing changed.")
            if targeted:
                if not pack_id or old.get("pack") != pack_id:
                    raise RuntimeError(f"{cfg.spec.title} slug belongs to another/unresolved pack. Nothing changed.")
                if kind == "questions" and old.get("objects") != [expected_objects[old["slug"]]]:
                    raise RuntimeError(f"{cfg.spec.title} question has unexpected object links. Nothing changed.")
                if kind == "assets" and old.get("data", {}).get("dataset", {}).get("name") != cfg.spec.title:
                    raise RuntimeError(f"{cfg.spec.title} asset ownership is unrecognized. Nothing changed.")
    if pack is None:
        log(f"{'CREATE' if apply else 'WOULD CREATE'} content pack: {cfg.pack_slug}")
        pack = api.create_pack(pack_body(cfg)) if apply else {"id": "", "slug": cfg.pack_slug}
        pack_id = pack["id"]
    assets = {}
    for role in ("learning", "practice"):
        for row in groups[role]:
            assets[row["index"]] = importer.ensure("assets", asset_body(cfg, row, public_base, license_verified, pack_id))
    steps = []
    for group in cfg.groupings:
        learning = [r for label in group.labels for r in groups["learning"] if r["label"] == label]
        intro = importer.ensure("objects", object_body(cfg, group,
            [assets[r["index"]]["id"] for r in learning], pack_id))
        practice = importer.ensure("objects", object_body(cfg, group, [], pack_id, practice=True))
        steps.extend([intro["id"], practice["id"]])
        slots = answer_slots(cfg, groups["practice"], group)
        for row in practice_rows(cfg, groups["practice"], group):
            importer.ensure("questions", question_body(cfg, row, group, slots[row["index"]],
                practice["id"], assets[row["index"]]["id"], pack_id))
    importer.ensure("pathways", pathway_body(cfg, steps, pack_id))
    importer.pack = pack
    if apply:
        actual = {q["slug"] for q in api.list_all("questions") if q.get("pack") == pack_id}
        if actual != targets["questions"]:
            raise RuntimeError(f"{cfg.spec.title} question membership changed during import; do not publish.")
    log(f"Draft records: {importer.counts}; pack: {cfg.pack_slug}. No content published.")
    return importer


def report(cfg, groups):
    log(f"\n{cfg.spec.title} 224px")
    for role in ("learning", "practice"):
        log(f"\n{role.upper()}")
        for label, name in cfg.spec.labels.items():
            log(f"{name:<40} {sum(r['label'] == label for r in groups[role])}")
        log(f"{'TOTAL':<40} {len(groups[role])}")
    log(f"\nOverlap: 0\nLearning objects: {len(cfg.groupings)}\nPractice objects: {len(cfg.groupings)}")
    log(f"Questions: {len(groups['practice'])}\nPathway steps: {2 * len(cfg.groupings)}\nPack: {cfg.pack_slug} (draft)")
    for group in cfg.groupings:
        slots = answer_slots(cfg, groups["practice"], group)
        answers = ["ABCD"[slots[r["index"]]] for r in practice_rows(cfg, groups["practice"], group)]
        log(f"Latihan {group.title}: " + ", ".join(f"{k}={answers.count(k)}" for k in "ABCD"[:len(group.labels)]))


def run(cfg, args, cache_dir: Path, public_dir: Path):
    npz = download(cfg.spec, cache_dir)
    groups = export_pngs(npz, args.config, cfg.spec, public_dir)
    mf = manifest(groups, args.config, cfg.spec)
    mf.update(official_source_labels=cfg.spec.labels, student_labels=cfg.student_labels,
              citation=cfg.spec.citation, source_archive=cfg.spec.download_url,
              original_source_url=cfg.original_source_url,
              license_verified_requested=args.license_verified)
    report(cfg, groups)
    if args.apply or args.update_existing:
        importer = sync(cfg, MedcoelAPI.from_env(), groups, apply=args.apply,
                        update_existing=args.update_existing, license_verified=args.license_verified,
                        public_base=args.public_base)
        mf["pack"] = {"id": importer.pack["id"], "slug": importer.pack["slug"]}
        mf["draft_plan"] = importer.counts
    else:
        log("DRY RUN: no PocketBase connection; exported files only. No content published.")
    manifest_dir = cache_dir / "manifests"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    target = manifest_dir / f"{cfg.pack_slug}.json"
    target.write_text(json.dumps(mf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"Operational manifest (not served to students): {target}")
    return 0
