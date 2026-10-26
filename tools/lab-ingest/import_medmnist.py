#!/usr/bin/env python3
"""Import a small, reviewable MedMNIST teaching pack into MEDCOEL Lab.

Supported datasets: PneumoniaMNIST and BloodMNIST 224px.

Design goals:
- official-source download only
- checksum verification
- deterministic, disjoint learning/practice sampling; max 5 practice images/class
- idempotent API writes by slug (existing records are only touched with --update-existing)
- draft-only content (never auto-publish)
- dataset-specific content packs with explicit teaching adapters
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
import sys
from pathlib import Path
from typing import Any


sys.path.insert(0, str(Path(__file__).resolve().parent))
from medcoel_api import ApiError, MedcoelAPI, resolve_content_pack  # noqa: E402
from sampling import LEARNING_PER_CLASS, PRACTICE_PER_CLASS, SELECTION_SEED, SelectionConfig, select_samples
from identification_guides import learning_guide
import medmnist_core as core
from medmnist_core import DatasetSpec, MANAGED, PRESERVED_DATA, flatten_labels, md5sum, log


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


# Backward-compatible facade; Pneumonia content/migration remains below.
def download(spec: DatasetSpec) -> Path:
    return core.download(spec, CACHE_DIR)


def png_name(split, index, label, spec=PNEUMONIA_224, role="learning"):
    return core.png_name(split, index, label, spec, role)


def export_pngs(npz_path, config, spec=PNEUMONIA_224):
    return core.export_pngs(npz_path, config, spec, PUBLIC_DIR)


PACK = {
    "slug": "pneumoniamnist-v1",
    "title": "PneumoniaMNIST v1",
    "version": "v1",
    "description": "Contoh foto toraks pediatrik normal vs pneumonia untuk latihan pengenalan pola dan klasifikasi.",
    "source": "MedMNIST v2 · PneumoniaMNIST 224px (Zenodo 10519652)",
    "licenseSummary": "CC BY 4.0. Label hanya tingkat-gambar; tidak ada anotasi lokasi.",
}

class DraftImporter(core.DraftImporter):
    def __init__(self, api, apply, update_existing, license_verified):
        super().__init__(api, apply, update_existing, license_verified, archive_slug=archive_body()["slug"])


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
            "studyGuide": learning_guide("pneumoniamnist"),
            "objectives": [
                "Mengenali tampilan umum foto toraks normal",
                "Mengenali pola dasar pneumonia secara garis besar",
                "Membandingkan contoh normal dan pneumonia",
                "Memahami batas materi latihan ini",
            ],
            "definition": "Bandingkan kategori Normal dan Pneumonia melalui panduan ciri umum, lalu amati beberapa contoh dan berlatih. Ciri umum tidak menyatakan temuan yang sudah dipastikan pada setiap gambar.",
            "keyFindings": [],
            "interpretation": "Label pada tingkat gambar tidak menentukan lokasi lesi atau penyebab penyakit. Gunakan sebagai latihan pengenalan pola, bukan diagnosis pasien.",
            "diagnosis": "",
            "differentials": [],
            "clinicalAssociations": ["Latihan interpretasi citra thoraks", "Klasifikasi normal vs pneumonia"],
            "references": [
                {"title": "MedMNIST", "url": "https://medmnist.com/"},
                {"title": "MedMNIST GitHub", "url": "https://github.com/MedMNIST/MedMNIST"},
            ],
            "steps": [],
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
            "prompt": "Foto toraks ini termasuk kategori mana?",
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


def validate_groups(groups, config):
    return core.validate_groups(groups, config, PNEUMONIA_224)


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
    api.require_study_guides()
    importer = DraftImporter(api, apply=apply, update_existing=update_existing, license_verified=license_verified)
    importer.retired = []
    importer.pack = None
    for kind in ("assets", "objects", "questions", "pathways"):
        importer.refresh(kind)
    pack = resolve_content_pack(api, PACK["slug"], records=importer.existing,
                                object_slugs=(object_intro([])["slug"], object_practice([])["slug"]))
    pack_id = pack["id"] if pack else ""
    if pack:
        log(f"Using existing content pack: {pack['slug']} ({pack_id}); requested slug: {PACK['slug']}")
    old_practice = importer.existing["objects"].get(object_practice([])["slug"])
    current = [q for q in importer.existing["questions"].values() if old_practice and old_practice["id"] in q.get("objects", [])]
    target_slugs = {question_body(r, "", "")["slug"] for r in groups["practice"]}
    assets = {a["id"]: a for a in importer.existing["assets"].values()}
    unrecognized = [q["slug"] for q in current if not managed_question(q, assets, pack_id)]
    if unrecognized:
        raise RuntimeError(f"unrecognized/manual questions for resolved pack {pack_id or '(none)'}: " +
                           ", ".join(unrecognized) + ". Review ownership; nothing changed.")
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
    importer.pack = pack
    c = importer.counts
    log(f"Ringkasan: {c['create']} dibuat, {c['update']} diperbarui, {c['unchanged']} tidak berubah, {c['skip']} dilewati; {len(importer.retired)} deprecated.")
    if importer.unpublished:
        log(f"{len(importer.unpublished)} published records changed and return to draft; retired records stay outside the pack. Unchanged published records keep their review/status.")
    log("DRY RUN selesai. PocketBase tidak diubah." if not apply else "Draft sync complete. Review before validation/publishing; no content was published.")
    return importer


def manifest(groups, config):
    return core.manifest(groups, config, PNEUMONIA_224)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Prepare/import disjoint MedMNIST learning and practice samples")
    parser.add_argument("--dataset", choices=("pneumoniamnist", "bloodmnist"), default="pneumoniamnist")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Create/update drafts through the admin API; never publish")
    mode.add_argument("--dry-run", action="store_true", help="Default: local export and read-only sync plan")
    parser.add_argument("--learning-per-class", type=int, default=None)
    parser.add_argument("--per-class", type=int, default=None, help="Compatibility alias for --learning-per-class only")
    parser.add_argument("--practice-per-class", type=int, default=None)
    parser.add_argument("--selection-seed", type=int, default=SELECTION_SEED)
    parser.add_argument("--public-base", default=os.getenv("MEDCOEL_PUBLIC_BASE", "https://medcoel.com"))
    parser.add_argument("--license-verified", action="store_true", help="License verified only after explicit human review")
    parser.add_argument("--update-existing", action="store_true", help="Explicitly sync importer-managed records, including obsolete practice retirement")
    args = parser.parse_args(argv)
    if args.per_class is not None:
        if args.learning_per_class is not None and args.learning_per_class != args.per_class:
            parser.error("Conflicting --per-class and --learning-per-class")
        args.learning_per_class = args.per_class
    if args.learning_per_class is None:
        args.learning_per_class = 5 if args.dataset == "bloodmnist" else LEARNING_PER_CLASS
    if args.practice_per_class is None:
        args.practice_per_class = 3 if args.dataset == "bloodmnist" else PRACTICE_PER_CLASS
    try:
        args.config = SelectionConfig(args.learning_per_class, args.practice_per_class, args.selection_seed)
    except ValueError as exc:
        parser.error(str(exc))
    if args.dataset == "bloodmnist" and args.learning_per_class > 5:
        parser.error("Blood learning supports at most 5/class (four classes, 20 assets/object).")
    if args.dataset == "pneumoniamnist" and args.learning_per_class > 10:
        parser.error("Current Pneumonia gallery supports at most 10/class (20 assets/object). Future adapters must shard larger galleries; practice cap is independent.")
    return args


def main() -> int:
    args = parse_args()
    if args.dataset == "bloodmnist":
        from bloodmnist import run
        return run(args, CACHE_DIR, PUBLIC_DIR.parent / "bloodmnist")
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
        mf["pack"] = {"id": importer.pack["id"], "slug": importer.pack.get("slug", PACK["slug"])}
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
