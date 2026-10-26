"""Ingestion policy metadata. PneumoniaMNIST and BloodMNIST are enabled; no automatic downloads.

Future entries describe task/class shape, not a commercial-license approval.
Official label/task reference: github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py
"""
# Source review: 2026-10-26. Dataset licenses (not the software license):
# https://zenodo.org/records/10519652
# https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py
# https://data.mendeley.com/datasets/snkd93bnjr/1
ENABLED_DATASETS = {
    "pneumoniamnist": {"enabled": True},
    "bloodmnist": {"enabled": True, "task": "multi-class", "license": "CC BY 4.0", "license_review": "official metadata verified; per-asset human review required", "classes": {
        0: "basophil", 1: "eosinophil", 2: "erythroblast", 3: "immature granulocytes",
        4: "lymphocyte", 5: "monocyte", 6: "neutrophil", 7: "platelet"}},
}
FUTURE_DATASETS = {
    "pathmnist": {"enabled": False, "task": "multi-class", "license_review": "required", "classes": {
        0: "adipose", 1: "background", 2: "debris", 3: "lymphocytes", 4: "mucus", 5: "smooth muscle",
        6: "normal colon mucosa", 7: "cancer-associated stroma", 8: "colorectal adenocarcinoma epithelium"}},
    "octmnist": {"enabled": False, "task": "multi-class", "license_review": "required", "classes": {
        0: "choroidal neovascularization", 1: "diabetic macular edema", 2: "drusen", 3: "normal"}},
    "chestmnist": {"enabled": False, "task": "multi-label", "license_review": "required",
                   "blocked_reason": "Multi-label: single-answer classification is not valid without a curated subset."},
    "dermamnist": {"enabled": False, "task": "multi-class", "license": "CC BY-NC 4.0",
                   "blocked_reason": "NonCommercial dataset: excluded from MEDCOEL ingestion."},
}


def require_enabled_dataset(key: str) -> None:
    if key in ENABLED_DATASETS:
        return
    info = FUTURE_DATASETS.get(key, {})
    raise ValueError(f"{key} ingestion disabled. " + info.get("blocked_reason", "Individual license/content review and an explicit adapter are required."))
