"""Load curated authoring-time content. Never searches the web or calls an LLM."""
import copy
import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parent / 'content' / 'identification-guides.json'


def learning_guide(dataset, labels=None):
    guide = copy.deepcopy(json.loads(CONTENT.read_text(encoding='utf-8'))[dataset])
    if labels is not None:
        order = list(labels)
        guide['profiles'] = sorted((p for p in guide['profiles'] if p['key'] in order), key=lambda p: order.index(p['key']))
        guide['comparison']['rows'] = sorted((r for r in guide['comparison']['rows'] if r['key'] in order), key=lambda r: order.index(r['key']))
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
