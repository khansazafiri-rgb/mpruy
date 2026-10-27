"""Build text-only teaching cards from curated class guides and selected learning rows."""
from __future__ import annotations

from collections import defaultdict
from typing import Callable

from identification_guides import learning_guide


def gallery_items(dataset: str, rows: list[dict], student_labels: dict[int, str],
                  media_key: Callable[[dict], str], guide: dict | None = None) -> list[dict]:
    guide = guide or learning_guide(dataset)
    profiles = {profile["key"]: profile for profile in guide["profiles"]}
    sources = {source["id"]: source for source in guide["sources"]}
    seen = defaultdict(int)
    items = []
    for row in rows:
        if row["role"] != "learning":
            raise ValueError("Teaching cards may contain learning rows only")
        label = row["label"]
        profile = profiles[row["label_name"]]
        seen[label] += 1
        statements = profile["features"] + profile["caveats"]
        lines = []
        for statement in statements:
            names = [f"{sources[key]['organization']} — {sources[key]['resource']}"
                     for key in statement["sources"]]
            lines.append(statement["text"] + " [Sumber: " + "; ".join(names) + "]")
        items.append({"asset": media_key(row),
                      "title": f"{student_labels[label]} · Contoh {seen[label]}",
                      "caption": "\n".join(lines)})
    return items
