"""Dataset-independent, versioned single-label sampling; no downloads or API writes."""
from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
from numbers import Integral
from typing import Mapping, Sequence

PRACTICE_CAP = 5
LEARNING_PER_CLASS = 10
PRACTICE_PER_CLASS = 5
SELECTION_SEED = 20261026
ALGORITHM = "prefix-learning-sha256-practice-v1"


@dataclass(frozen=True)
class SelectionConfig:
    learning_per_class: int = LEARNING_PER_CLASS
    practice_per_class: int = PRACTICE_PER_CLASS
    seed: int = SELECTION_SEED

    def __post_init__(self):
        for name in ("learning_per_class", "practice_per_class", "seed"):
            if isinstance(getattr(self, name), bool) or not isinstance(getattr(self, name), int):
                raise ValueError(f"{name} must be an integer")
        if self.learning_per_class < 1:
            raise ValueError("learning_per_class must be at least 1")
        if not 1 <= self.practice_per_class <= PRACTICE_CAP:
            raise ValueError(f"practice_per_class must be 1..{PRACTICE_CAP}")

    def metadata(self):
        return {**asdict(self), "algorithm": ALGORITHM, "disjoint": True}


@dataclass(frozen=True)
class Selection:
    learning: tuple[int, ...]
    practice: tuple[int, ...]


def select_samples(labels: Sequence[int], classes: Mapping[int, str], *, dataset: str,
                   split: str, version: str, config: SelectionConfig) -> Selection:
    """Keep the legacy gallery prefix, rank remaining samples by seeded SHA-256.

    Unlike Python/NumPy RNG sequences, this ranking is stable across library versions.
    Source sample indices are identities; a new dataset checksum is a new selection version.
    Only scalar integer labels are accepted: multi-label data requires a separate curator.
    """
    if not classes or len(set(classes.values())) != len(classes):
        raise ValueError("classes must be a nonempty mapping with unique names")
    groups = {key: [] for key in sorted(classes)}
    for index, label in enumerate(labels):
        if isinstance(label, bool) or not isinstance(label, Integral) or label not in groups:
            raise ValueError(f"Expected scalar single-label class at sample {index}; got {label!r}")
        groups[int(label)].append(index)
    learning, practice = [], []
    for label, indices in groups.items():
        required = config.learning_per_class + config.practice_per_class
        if len(indices) < required:
            raise ValueError(f"{dataset}/{split} class {classes[label]} has {len(indices)} samples; "
                             f"needs {config.learning_per_class} learning + {config.practice_per_class} disjoint practice. Overlap refused.")
        learning.extend(indices[:config.learning_per_class])
        def rank(index):
            identity = f"{ALGORITHM}:{dataset}:{version}:{split}:{config.seed}:{label}:{index}"
            return hashlib.sha256(identity.encode("utf-8")).digest(), index
        remaining = sorted(indices[config.learning_per_class:], key=rank)
        practice.extend(remaining[:config.practice_per_class])
    assert not set(learning).intersection(practice)
    return Selection(tuple(learning), tuple(practice))
