"""Verified OCTMNIST 224px retinal-pattern adapter; all writes remain drafts."""
from medmnist_core import DatasetSpec
from visual_mnist import VisualConfig, Group

SPEC = DatasetSpec(
    key="octmnist", title="OCTMNIST", task="multi-class",
    download_url="https://zenodo.org/records/10519652/files/octmnist_224.npz?download=1",
    md5="abc493b6d529d5de7569faaef2773ba3", version="MedMNIST+ v3.0 / Zenodo 10519652",
    license_name="CC BY 4.0", source_url="https://zenodo.org/records/10519652",
    citation=("Yang J, Shi R, Wei D, et al. MedMNIST v2. Scientific Data. 2023;10:41. "
              "doi:10.1038/s41597-022-01721-8. Kermany DS, Goldbaum M, Cai W, et al. "
              "Identifying Medical Diagnoses and Treatable Diseases by Image-Based Deep Learning. "
              "Cell. 2018;172:1122-1131.e9. doi:10.1016/j.cell.2018.02.010. "
              "Original OCT data: Kermany, Zhang, Goldbaum, Mendeley Data v2, "
              "doi:10.17632/rscbjbr9sj.2. MEDCOEL adaptation: 224px PNGs and teaching guides; attribution required."),
    labels={0: "choroidal neovascularization", 1: "diabetic macular edema", 2: "drusen", 3: "normal"},
)

CONFIG = VisualConfig(
    spec=SPEC, student_labels={0: "Choroidal neovascularization (CNV)",
        1: "Diabetic macular edema (DME)", 2: "Drusen", 3: "Normal"},
    pack_slug="octmnist-v1", pack_title="Dasar Interpretasi OCT Retina",
    description="Kenali orientasi OCT dan bandingkan empat kategori pola retina; bukan diagnosis atau keputusan terapi pasien.",
    modality="OCT Retina", domain="imaging", learning_per_class=5, practice_per_class=3,
    question_prompt="Citra OCT retina ini paling sesuai dengan kategori mana?",
    groupings=(Group("retina", "Dasar Interpretasi OCT Retina", (3, 1, 2, 0)),),
    original_source_url="https://data.mendeley.com/datasets/rscbjbr9sj/2",
)
