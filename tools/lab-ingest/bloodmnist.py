"""Explicit BloodMNIST v1 cell-recognition content adapter (drafts only)."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from medmnist_core import DatasetSpec, DraftImporter, download, export_pngs, manifest, validate_groups, log
from medcoel_api import MedcoelAPI, resolve_content_pack
from sampling import SelectionConfig
from identification_guides import learning_guide

BLOOD_224 = DatasetSpec(
    key="bloodmnist", title="BloodMNIST", resolution=224, task="multi-class",
    download_url="https://zenodo.org/records/10519652/files/bloodmnist_224.npz?download=1",
    md5="b718ff6835fcbdb22ba9eacccd7b2601", version="MedMNIST+ v3.0 / Zenodo 10519652",
    license_name="CC BY 4.0", source_url="https://zenodo.org/records/10519652",
    citation=("Yang J, Shi R, Wei D, et al. MedMNIST v2. Scientific Data. 2023;10:41. doi:10.1038/s41597-022-01721-8. "
              "Acevedo A, Merino A, Alférez S, Molina Á, Boldú L, Rodellar J. "
              "A dataset of microscopic peripheral blood cell images for development of automatic recognition systems. "
              "Data in Brief. 2020;30:105474. doi:10.1016/j.dib.2020.105474. "
              "Original data: Mendeley Data v1, doi:10.17632/snkd93bnjr.1. "
              "MEDCOEL adaptation: 224px PNG examples and Indonesian class labels; attribution required."),
    labels={0: "basophil", 1: "eosinophil", 2: "erythroblast", 3: "immature granulocytes",
            4: "lymphocyte", 5: "monocyte", 6: "neutrophil", 7: "platelet"},
)
# Official info.py expands class 3 in parentheses. It is still ONE source class.
OFFICIAL_LABELS = {**BLOOD_224.labels, 3: "immature granulocytes(myelocytes, metamyelocytes and promyelocytes)"}
STUDENT_LABELS = {0: "Basofil", 1: "Eosinofil", 2: "Eritroblas", 3: "Granulosit imatur",
                  4: "Limfosit", 5: "Monosit", 6: "Neutrofil", 7: "Trombosit"}
DEFAULT_CONFIG = SelectionConfig(5, 3)
DESCRIPTION = "Belajar mengenali delapan kelompok sel darah perifer melalui contoh citra BloodMNIST dan latihan identifikasi visual."
PACK = {"slug": "bloodmnist-v1", "title": "Identifikasi Sel Darah Perifer", "version": "v1",
        "description": DESCRIPTION, "source": "MedMNIST v2 / BloodMNIST 224px · Zenodo 10519652",
        "licenseSummary": "CC BY 4.0. Atribusi MedMNIST dan Acevedo et al.; pengenalan jenis sel, bukan diagnosis pasien."}
GROUPS = (
    {"slug": "granulosit", "title": "Granulosit", "practice_title": "Latihan Granulosit", "labels": (6, 1, 0, 3)},
    {"slug": "sel-darah-perifer", "title": "Limfosit, Monosit, Eritroblas & Trombosit",
     "practice_title": "Latihan Sel Darah Perifer", "labels": (4, 5, 2, 7)},
)


def object_slug(group, practice=False):
    return f"bloodmnist-{'latihan' if practice else 'belajar'}-{group['slug']}"


def asset_slug(row):
    return f"bmnist-test-{row['label_name'].replace(' ', '-')}-{row['index']:04d}"


def asset_body(row, public_base, verified, pack_id=""):
    practice = row["role"] == "practice"
    label = STUDENT_LABELS[row["label"]]
    return {"slug": asset_slug(row), "title": "Citra latihan sel darah" if practice else label,
        "pack": pack_id, "data": {
            "url": public_base.rstrip("/") + row["url_path"],
            "alt": "Gambar latihan sel darah perifer" if practice else f"Contoh {label.lower()}",
            "synthetic": False, "annotations": [],
            "dataset": {"name": "BloodMNIST", "task": "multi-class", "split": BLOOD_224.split,
                        "sample_index": row["index"], "label": row["label_name"], "resolution": [224, 224]},
            # Existing schema retains source as text. Keep version + checksum here to avoid a backend migration.
            "license": {"source": f"MedMNIST v2 / BloodMNIST; {BLOOD_224.version}; 224px NPZ MD5 {BLOOD_224.md5}",
                        "dataset": "BloodMNIST", "license": BLOOD_224.license_name, "source_url": BLOOD_224.source_url,
                        "citation": BLOOD_224.citation, "commercial_use": True, "redistribution": True,
                        "modification": True, "attribution_required": True, "verified": verified}}}


def object_body(group, asset_ids, pack_id="", practice=False):
    return {"slug": object_slug(group, practice), "title": group["practice_title"] if practice else group["title"],
        "pack": pack_id, "domain": "clinical_pathology", "modality": "Sel darah perifer",
        "summary": "Identifikasi jenis sel pada citra." if practice else "Amati beberapa contoh dari setiap kelompok sel.",
        "tags": ["sel darah perifer", "BloodMNIST"], "assets": [] if practice else asset_ids,
        "related": [], "legacyQuestions": [], "data": {
            **({"studyGuide": learning_guide("bloodmnist", [BLOOD_224.labels[i] for i in group["labels"]])} if not practice else {}),
            "demo": False, "mode": "practice" if practice else "lesson",
            "definition": "Pilih jenis sel yang paling sesuai." if practice else "Bandingkan contoh citra pada setiap kelompok sel.",
            "objectives": ["Mengenali " + ", ".join(STUDENT_LABELS[i] for i in group["labels"]) + "."],
            "keyFindings": [], "interpretation": "Materi pengenalan jenis sel, bukan penentuan diagnosis pasien.",
            "diagnosis": "", "differentials": [], "clinicalAssociations": [], "steps": [],
            "references": [{"title": "MedMNIST / MedMNIST v2", "url": "https://medmnist.com/"},
                           {"title": "BloodMNIST 224px · CC BY 4.0", "url": BLOOD_224.source_url},
                           {"title": "Acevedo et al. · dataset asal", "url": "https://data.mendeley.com/datasets/snkd93bnjr/1"}],
            "lab": {"context": "", "rows": [], "rules": []}}}


def practice_rows(rows, group):
    selected = [r for r in rows if r["label"] in group["labels"]]
    # Stable source-identity hashing; no dependency on Python RNG or dictionary iteration order.
    return sorted(selected, key=lambda r: hashlib.sha256(f"bloodmnist-v1:questions:{r['index']}".encode()).digest())


def question_body(row, group, position, object_id, asset_id, pack_id=""):
    correct = row["label"]
    distractors = sorted((i for i in group["labels"] if i != correct),
        key=lambda i: hashlib.sha256(f"bloodmnist-v1:options:{row['index']}:{i}".encode()).digest())
    slot = position % 4
    distractors.insert(slot, correct)
    return {"slug": f"bmnist-q-{row['index']:04d}", "title": "Identifikasi sel darah perifer",
        "pack": pack_id, "objects": [object_id], "asset": asset_id,
        "data": {"type": "image_identification", "prompt": "Citra ini paling sesuai dengan jenis sel darah apa?",
                 "options": [{"label": "ABCD"[n], "text": STUDENT_LABELS[i]} for n, i in enumerate(distractors)],
                 "answer": "ABCD"[slot], "explanation": ""}}


def pathway_body(steps, pack_id=""):
    return {"slug": "jalur-sel-darah-perifer-bloodmnist", "title": PACK["title"], "pack": pack_id,
            "summary": DESCRIPTION, "steps": steps, "data": {}}


def sync(api, groups, *, apply, update_existing, license_verified, public_base, config=DEFAULT_CONFIG):
    validate_groups(groups, config, BLOOD_224)
    if config.learning_per_class > 5:
        raise ValueError("Blood learning exceeds the 20-asset object limit")
    api.require_study_guides()
    importer = DraftImporter(api, apply, update_existing, license_verified, report_unchanged=True)
    for kind in ("assets", "objects", "questions", "pathways"):
        importer.refresh(kind)
    slugs = tuple(object_slug(g, p) for g in GROUPS for p in (False, True))
    pack = resolve_content_pack(api, PACK["slug"], records=importer.existing,
                                object_slugs=slugs, dataset_name="BloodMNIST")
    pack_id = pack["id"] if pack else ""
    targets = {"assets": {asset_slug(r) for role in groups for r in groups[role]},
               "objects": set(slugs), "questions": {f"bmnist-q-{r['index']:04d}" for r in groups["practice"]},
               "pathways": {pathway_body([])["slug"]}}
    expected_question_objects = {
        f"bmnist-q-{row['index']:04d}": importer.existing["objects"].get(object_slug(group, True), {}).get("id")
        for group in GROUPS for row in practice_rows(groups["practice"], group)
    }
    old_objects = {r["id"] for r in importer.existing["objects"].values() if r["slug"] in slugs}
    # v1 selection is fixed. Never silently append a second bank or absorb manual content on reselection.
    for kind, rows in importer.existing.items():
        for old in rows.values():
            linked = bool(pack_id and old.get("pack") == pack_id) or (kind == "questions" and bool(old_objects.intersection(old.get("objects", []))))
            targeted = old["slug"] in targets[kind]
            if linked and not targeted:
                raise RuntimeError("Blood pack has manual/obsolete content; review membership before reselection. Nothing changed.")
            if targeted:
                if not pack_id or old.get("pack") != pack_id:
                    raise RuntimeError("Blood slug belongs to different/unresolved pack; nothing changed.")
                if kind == "questions" and old.get("objects") != [expected_question_objects[old["slug"]]]:
                    raise RuntimeError("Blood question has unexpected object links; review membership. Nothing changed.")
                if kind == "assets" and old.get("data", {}).get("dataset", {}).get("name") != "BloodMNIST":
                    raise RuntimeError("Blood asset ownership is unrecognized; nothing changed.")
    if pack is None:
        log(f"{'CREATE' if apply else 'WOULD CREATE'} content pack: {PACK['slug']}")
        pack = api.create_pack(PACK) if apply else {"id": "", "slug": PACK["slug"]}
        pack_id = pack["id"]
    assets = {}
    for role in ("learning", "practice"):
        for row in groups[role]:
            assets[row["index"]] = importer.ensure("assets", asset_body(row, public_base, license_verified, pack_id))
    steps = []
    for group in GROUPS:
        learning = [r for label in group["labels"] for r in groups["learning"] if r["label"] == label]
        intro = importer.ensure("objects", object_body(group, [assets[r["index"]]["id"] for r in learning], pack_id))
        practice = importer.ensure("objects", object_body(group, [], pack_id, practice=True))
        steps.extend([intro["id"], practice["id"]])
        for position, row in enumerate(practice_rows(groups["practice"], group)):
            importer.ensure("questions", question_body(row, group, position, practice["id"], assets[row["index"]]["id"], pack_id))
    importer.ensure("pathways", pathway_body(steps, pack_id))
    importer.pack = pack
    if apply:
        actual = {q["slug"] for q in api.list_all("questions") if q.get("pack") == pack_id}
        if actual != targets["questions"]:
            raise RuntimeError("Blood membership changed during import; do not publish. Review and rerun.")
    log(f"Draft records: {importer.counts}; pack: {pack['slug']}. No content published.")
    return importer


def report(groups, config, verified):
    log("\nBloodMNIST 224px")
    for role in ("learning", "practice"):
        log("\n" + role.upper())
        for label, name in BLOOD_224.labels.items():
            log(f"{name:<24} {sum(r['label'] == label for r in groups[role])}")
        log(f"{'TOTAL':<24} {len(groups[role])}")
    log("\nOverlap: 0\nLearning objects: 2\nPractice objects: 2")
    log(f"Questions: {len(groups['practice'])}\nPathway: 1\nPack: {PACK['slug']} (draft)")
    log(f"Assets: {sum(len(r) for r in groups.values())}; license.verified requested: {verified} (existing verification preserved)")
    log(f"Selection: {config.metadata()}")
    for group in GROUPS:
        answers = [question_body(r, group, n, "", "")["data"]["answer"]
                   for n, r in enumerate(practice_rows(groups["practice"], group))]
        log(f"{group['practice_title']}: " + ", ".join(f"{k}={answers.count(k)}" for k in "ABCD"))


def run(args, cache_dir: Path, public_dir: Path):
    npz = download(BLOOD_224, cache_dir)
    groups = export_pngs(npz, args.config, BLOOD_224, public_dir)
    mf = manifest(groups, args.config, BLOOD_224)
    mf.update(official_source_labels=OFFICIAL_LABELS, citation=BLOOD_224.citation,
              source_archive=BLOOD_224.download_url, license_verified_requested=args.license_verified)
    report(groups, args.config, args.license_verified)
    if args.apply or args.update_existing:
        importer = sync(MedcoelAPI.from_env(), groups, apply=args.apply, update_existing=args.update_existing,
                        license_verified=args.license_verified, public_base=args.public_base, config=args.config)
        mf["pack"] = {"id": importer.pack["id"], "slug": importer.pack["slug"]}
        mf["draft_plan"] = importer.counts
    else:
        log("DRY RUN: no PocketBase connection; files only. All new content remains draft on apply.")
    manifest_dir = cache_dir / "manifests"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    target = manifest_dir / "bloodmnist-v1.json"
    target.write_text(json.dumps(mf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"Operational manifest (not served to students): {target}")
    return 0
