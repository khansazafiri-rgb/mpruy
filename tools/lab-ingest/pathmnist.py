"""Verified PathMNIST 224px tissue-pattern adapter; all writes remain drafts."""
from medmnist_core import DatasetSpec
from visual_mnist import VisualConfig, Group

SPEC = DatasetSpec(
    key="pathmnist", title="PathMNIST", task="multi-class",
    download_url="https://zenodo.org/records/10519652/files/pathmnist_224.npz?download=1",
    md5="2c51a510bcdc9cf8ddb2af93af1eadec", version="MedMNIST+ v3.0 / Zenodo 10519652",
    license_name="CC BY 4.0", source_url="https://zenodo.org/records/10519652",
    citation=("Yang J, Shi R, Wei D, et al. MedMNIST v2. Scientific Data. 2023;10:41. "
              "doi:10.1038/s41597-022-01721-8. Kather JN, Krisam J, Charoentong P, et al. "
              "Predicting survival from colorectal cancer histology slides using deep learning. "
              "PLOS Medicine. 2019;16:e1002730. doi:10.1371/journal.pmed.1002730. "
              "Source images: NCT-CRC-HE-100K and CRC-VAL-HE-7K, doi:10.5281/zenodo.1214456. "
              "MEDCOEL adaptation: selected 224px PNGs and Indonesian labels; attribution required."),
    labels={0: "adipose", 1: "background", 2: "debris", 3: "lymphocytes", 4: "mucus",
            5: "smooth muscle", 6: "normal colon mucosa", 7: "cancer-associated stroma",
            8: "colorectal adenocarcinoma epithelium"},
)

CONFIG = VisualConfig(
    spec=SPEC, student_labels={0: "Jaringan adiposa", 1: "Latar belakang", 2: "Debris jaringan",
        3: "Limfosit", 4: "Mukus", 5: "Otot polos", 6: "Mukosa kolon normal",
        7: "Stroma terkait kanker", 8: "Epitel adenokarsinoma kolorektal"},
    pack_slug="pathmnist-v1", pack_title="Pola Jaringan Histologi Kolorektal",
    description="Kenali sembilan kategori jaringan dan komponen pada patch histologi H&E kolorektal; bukan sembilan diagnosis penyakit.",
    modality="Histologi H&E", domain="clinical_pathology", learning_per_class=4, practice_per_class=2,
    question_prompt="Patch histologi H&E ini paling sesuai dengan kategori jaringan mana?",
    groupings=(
        Group("komponen-dasar", "Komponen Dasar Jaringan", (0, 1, 2)),
        Group("seluler-stroma", "Komponen Seluler & Stroma", (3, 4, 5)),
        Group("mukosa-keganasan", "Mukosa Kolon & Keganasan", (6, 7, 8)),
    ),
    original_source_url="https://zenodo.org/records/1214456",
)
