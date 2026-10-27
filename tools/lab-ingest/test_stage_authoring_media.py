"""Focused staging and teaching-card checks without network or large datasets."""
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from authoring_gallery import gallery_items
from stage_authoring_media import DATASETS, media_key, source_definition, source_key, stage_selected, upload_media
from medmnist_core import png_name
from sampling import select_samples


class FakeApi:
    def __init__(self):
        self.calls = []

    def request(self, method, path, body):
        self.calls.append((method, path, body))
        if path.endswith('/preview'):
            return {"ok": True, "token": "review-token", "entries": [{"action": "create"}]}
        return {"changed": 1}


def groups_for(spec, config):
    # More than enough samples per class; source indices are still selected by the real algorithm.
    labels = [label for label in spec.labels for _ in range(100)]
    selected = select_samples(labels, spec.labels, dataset=spec.key, split=spec.split,
                              version=spec.md5, config=config)
    return {role: [{"dataset": spec.key, "split": spec.split, "index": index,
                    "label": labels[index], "label_name": spec.labels[labels[index]],
                    "role": role, "filename": f"{spec.key}-{index}.png",
                    "local_path": f"/private/{spec.key}-{index}.png"}
                   for index in getattr(selected, role)] for role in ("learning", "practice")}


class StageTests(unittest.TestCase):
    def test_counts_disjoint_keys_and_no_practice_metadata_leak(self):
        totals = [0, 0]
        expected = {'pneumoniamnist': (20, 10), 'bloodmnist': (40, 24),
                    'pathmnist': (36, 18), 'octmnist': (20, 12)}
        for dataset, (spec, config, labels) in DATASETS.items():
            groups = groups_for(spec, config)
            self.assertEqual(tuple(len(groups[role]) for role in ('learning', 'practice')), expected[dataset])
            self.assertEqual(len(groups['learning']), len(spec.labels) * config.learning_per_class)
            self.assertEqual(len(groups['practice']), len(spec.labels) * config.practice_per_class)
            self.assertFalse({r['index'] for r in groups['learning']} & {r['index'] for r in groups['practice']})
            self.assertEqual(len({media_key(r) for role in groups for r in groups[role]}), sum(map(len, groups.values())))
            self.assertTrue(all(media_key(r) == f"{spec.key}-{spec.split}-{r['index']:05d}" for r in groups['practice']))
            result = stage_selected(None, spec, labels, groups, Path('/private'), apply=False,
                                    existing_media={}, existing_sources={})
            self.assertEqual(result['newly_uploaded'], 0)
            totals[0] += result['learning']; totals[1] += result['practice']
        self.assertEqual(totals, [116, 64])
        self.assertEqual(sum(totals), 180)

    def test_practice_upload_metadata_and_filename_are_generic(self):
        spec, _, labels = DATASETS['bloodmnist']
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as tmp:
            filename = png_name(spec.split, 123, 6, spec, 'practice')
            self.assertNotIn('neutrophil', filename)
            path = Path(tmp) / filename; path.write_bytes(b'png-fixture')
            row = {"dataset": spec.key, "split": spec.split, "index": 123, "label": 6,
                   "label_name": spec.labels[6], "role": "practice", "filename": filename,
                   "local_path": str(path)}
            class Response(io.BytesIO):
                def __enter__(self): return self
                def __exit__(self, *_): self.close()
            class Api:
                base = 'https://example.org'
                token = 'token'
            with patch('stage_authoring_media.urllib.request.urlopen', return_value=Response(b'{"key":"ok"}')) as fetch:
                upload_media(Api(), row, labels, Path(tmp))
            payload = fetch.call_args.args[0].data.decode('utf-8')
            self.assertIn('Citra latihan', payload)
            self.assertIn('Citra latihan identifikasi', payload)
            self.assertNotIn('Neutrofil', payload)
            self.assertNotIn('neutrophil', payload)

    def test_resume_preserves_reviewed_source_and_only_uploads_missing(self):
        spec, config, labels = DATASETS['octmnist']
        groups = groups_for(spec, config)
        rows = groups['learning'] + groups['practice']
        verified = source_definition(spec); verified['license']['verified'] = True
        verified['policies'] = [{'collection': 'reviewed', 'allowed': True, 'reviewed': True}]
        sources = {source_key(spec.key): {'key': source_key(spec.key), 'status': 'published', 'data': verified}}
        media = {media_key(r): {'key': media_key(r), 'sourceKey': source_key(spec.key)} for r in rows[:3]}
        api = FakeApi(); uploaded = []
        def uploader(_api, row, _labels, _root):
            uploaded.append(row)
            return {'key': media_key(row), 'sourceKey': source_key(spec.key)}
        result = stage_selected(api, spec, labels, groups, Path('/private'), apply=True,
                                existing_media=media, existing_sources=sources, uploader=uploader)
        self.assertEqual((result['existing_skipped'], result['newly_uploaded'], result['total_ready']), (3, 29, 32))
        self.assertEqual(len(uploaded), 29)
        self.assertEqual(api.calls, [])
        self.assertTrue(verified['license']['verified'] and verified['policies'][0]['reviewed'])
        again = stage_selected(api, spec, labels, groups, Path('/private'), apply=True,
                               existing_media=media, existing_sources=sources, uploader=uploader)
        self.assertEqual((again['existing_skipped'], again['newly_uploaded']), (32, 0))

    def test_conflicting_key_fails_before_any_write_and_new_source_stays_unverified(self):
        spec, config, labels = DATASETS['pneumoniamnist']
        groups = groups_for(spec, config)
        first = media_key(groups['learning'][0]); api = FakeApi()
        with self.assertRaisesRegex(RuntimeError, 'sumber lain'):
            stage_selected(api, spec, labels, groups, Path('/private'), apply=True,
                           existing_media={first: {'key': first, 'sourceKey': 'other'}}, existing_sources={})
        self.assertEqual(api.calls, [])
        stage_selected(api, spec, labels, groups, Path('/private'), apply=True,
                       existing_media={}, existing_sources={},
                       uploader=lambda _a, row, _l, _p: {'key': media_key(row), 'sourceKey': source_key(spec.key)})
        self.assertEqual([path for _, path, _ in api.calls],
                         ['/api/medcoel/admin/lab-authoring/preview', '/api/medcoel/admin/lab-authoring/apply'])
        self.assertFalse(api.calls[0][2]['records'][0]['data']['license']['verified'])

    def test_curated_profile_cards_reuse_class_text_for_four_datasets(self):
        for dataset, (spec, config, labels) in DATASETS.items():
            groups = groups_for(spec, config)
            items = gallery_items(dataset, groups['learning'], labels, media_key)
            self.assertEqual(len(items), len(groups['learning']))
            self.assertTrue(all(item['title'] and item['caption'] and '[Sumber: ' in item['caption'] for item in items))
            self.assertFalse({item['asset'] for item in items} & {media_key(r) for r in groups['practice']})
            with self.assertRaisesRegex(ValueError, 'learning'):
                gallery_items(dataset, groups['practice'][:1], labels, media_key)


if __name__ == '__main__':
    unittest.main()
