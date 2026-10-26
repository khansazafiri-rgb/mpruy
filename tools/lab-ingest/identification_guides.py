"""Load curated authoring-time content. Never searches the web or calls an LLM."""
import copy
import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parent / 'content' / 'identification-guides.json'
VISUAL_CONTENT = Path(__file__).resolve().parent / 'content' / 'path-oct-guides.json'


def learning_guide(dataset, labels=None):
    data = json.loads(CONTENT.read_text(encoding='utf-8'))
    if dataset not in data:
        data = json.loads(VISUAL_CONTENT.read_text(encoding='utf-8'))
    guide = copy.deepcopy(data[dataset])
    if labels is not None:
        order = list(labels)
        guide['profiles'] = sorted((p for p in guide['profiles'] if p['key'] in order), key=lambda p: order.index(p['key']))
        guide['comparison']['rows'] = sorted((r for r in guide['comparison']['rows'] if r['key'] in order), key=lambda r: order.index(r['key']))
        if dataset == 'pathmnist':
            # Keep each 3-class lesson focused; the common safety step remains last.
            lead = 0 if 'background' in order else 1 if 'smooth muscle' in order else 2
            guide['checklist'] = [guide['checklist'][lead], guide['checklist'][3]]
            if 'cancer-associated stroma' not in order:
                guide['notes'] = guide['notes'][:1]
    used = set()
    def visit(value):
        if isinstance(value, dict):
            if 'text' in value:
                used.update(value['sources'])
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)
    visit(guide)
    guide['sources'] = [s for s in guide['sources'] if s['id'] in used]
    return guide
