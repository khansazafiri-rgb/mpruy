"""Offline tests: synthetic arrays only; never download or contact PocketBase."""
import copy
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import import_medmnist as m
from sampling import SelectionConfig, select_samples
from dataset_registry import FUTURE_DATASETS, require_enabled_dataset


def samples(config=SelectionConfig()):
    labels = [0] * 40 + [1] * 40
    picked = select_samples(labels, m.PNEUMONIA_224.labels, dataset='pneumoniamnist', split='test', version=m.PNEUMONIA_224.md5, config=config)
    return {role: [{'index': i, 'label': labels[i], 'label_name': m.PNEUMONIA_224.labels[labels[i]],
                    'role': role, 'filename': f'x{i}.png', 'url_path': f'/lab-content/medmnist/test/x{i}.png'}
                   for i in getattr(picked, role)] for role in ('learning', 'practice')}


class FakeAPI:
    def __init__(self):
        self.records = {k: {} for k in m.MANAGED}
        self.writes = []
        self.the_pack = None
    def pack(self, _slug): return copy.deepcopy(self.the_pack)
    def list_all(self, kind): return copy.deepcopy(list(self.records[kind].values()))
    def create_pack(self, body):
        self.writes.append(('pack', body['slug'])); self.the_pack = {'id': 'p' * 15, **body}; return self.pack('')
    def create(self, kind, body):
        r = copy.deepcopy({'id': str(len(self.writes) + 1).zfill(15), 'status': 'draft', 'revision': 1, **body})
        self.writes.append(('create', kind, body['slug'])); self.records[kind][r['id']] = r; return copy.deepcopy(r)
    def update(self, kind, rid, body):
        self.assert_revision(kind, rid, body)
        self.writes.append(('update', kind, body['slug'])); r = copy.deepcopy({**body, 'id': rid, 'revision': body['revision'] + 1, 'status': 'draft'})
        self.records[kind][rid] = r; return copy.deepcopy(r)
    def assert_revision(self, kind, rid, body):
        if self.records[kind][rid]['revision'] != body['revision']:
            raise m.ApiError(400, 'PUT', rid, 'revision conflict')


class SamplingTests(unittest.TestCase):
    def test_default_balanced_disjoint_and_legacy_gallery(self):
        groups = samples(); m.validate_groups(groups, SelectionConfig())
        for label in (0, 1):
            self.assertEqual(sum(r['label'] == label for r in groups['learning']), 10)
            self.assertEqual(sum(r['label'] == label for r in groups['practice']), 5)
        self.assertEqual([r['index'] for r in groups['learning']], list(range(10)) + list(range(40, 50)))
        self.assertFalse({r['index'] for r in groups['learning']} & {r['index'] for r in groups['practice']})
    def test_deterministic_across_runs_and_seed_configurable(self):
        self.assertEqual(samples(), samples())
        self.assertNotEqual(samples()['practice'], samples(SelectionConfig(seed=1))['practice'])
    def test_generic_multiclass_and_learning_not_capped_at_five(self):
        for n in (4, 8, 9):
            classes = {i: f'class-{i}' for i in range(n)}
            result = select_samples([i for i in classes for _ in range(30)], classes, dataset='synthetic', split='test', version='v1', config=SelectionConfig(12, 5))
            self.assertEqual(len(result.learning), n * 12); self.assertEqual(len(result.practice), n * 5)
            self.assertFalse(set(result.learning) & set(result.practice))
    def test_practice_cap_cli_and_config(self):
        for n in (0, 6, 20):
            with self.assertRaises(ValueError): SelectionConfig(practice_per_class=n)
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            m.parse_args(['--practice-per-class', '6'])
        self.assertEqual(m.parse_args(['--per-class', '8']).config, SelectionConfig(8, 5))
    def test_insufficient_samples_and_multilabel_fail_clearly(self):
        with self.assertRaisesRegex(ValueError, 'Overlap refused'):
            select_samples([0] * 14, {0: 'only'}, dataset='tiny', split='test', version='v1', config=SelectionConfig())
        for labels in (np.zeros((3, 2), dtype=int), np.array([0.5, 1.0])):
            with self.assertRaises(ValueError): m.flatten_labels(labels)
    def test_manifest_separates_roles_and_reproducibility(self):
        data = m.manifest(samples(), SelectionConfig())
        self.assertEqual((data['learning']['total'], data['practice']['total'], data['overlap']), (20, 10, 0))
        self.assertEqual(data['source_md5'], m.PNEUMONIA_224.md5)
        self.assertEqual(data['selection_config']['seed'], 20261026)
        self.assertTrue(all(f['role'] == 'practice' and 'source_sample_index' in f for f in data['practice']['files']))
    def test_future_ingestion_disabled(self):
        for key in FUTURE_DATASETS:
            with self.assertRaises(ValueError): require_enabled_dataset(key)
        self.assertEqual([len(FUTURE_DATASETS[k]['classes']) for k in ('bloodmnist', 'pathmnist', 'octmnist')], [8, 9, 4])
    def test_export_on_tiny_synthetic_npz_and_repeated_selection(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); src = root / 'synthetic.npz'
            np.savez(src, test_images=np.zeros((80, 8, 8), dtype=np.uint8), test_labels=np.array([0] * 40 + [1] * 40).reshape(-1, 1))
            with patch.object(m, 'PUBLIC_DIR', root / 'public'):
                a = m.export_pngs(src, SelectionConfig()); b = m.export_pngs(src, SelectionConfig())
            self.assertEqual(a, b); self.assertEqual(len(list((root / 'public').glob('*.png'))), 30)
    def test_sync_rejects_overlap_before_any_api_access(self):
        g = samples(); g['practice'][0] = g['learning'][0]
        with self.assertRaisesRegex(ValueError, 'overlap'):
            m.sync(None, g, apply=True, update_existing=True, license_verified=False, public_base='https://example.test')
    def test_dryrun_no_writes_idempotent_apply_and_publication_status(self):
        api = FakeAPI(); g = samples()
        with patch.object(m, 'log'):
            m.sync(api, g, apply=False, update_existing=True, license_verified=False, public_base='https://example.test')
            self.assertEqual(api.writes, [])
            m.sync(api, g, apply=True, update_existing=True, license_verified=False, public_base='https://example.test')
            self.assertEqual(len(api.records['assets']), 30); self.assertEqual(len(api.records['questions']), 10)
            for rows in api.records.values():
                for r in rows.values(): r.update(status='published', reviewedBy='admin')
            before = copy.deepcopy(api.records); api.writes.clear()
            m.sync(api, g, apply=True, update_existing=True, license_verified=False, public_base='https://example.test')
            self.assertEqual(api.records, before); self.assertEqual(api.writes, [])
            r = next(iter(api.records['questions'].values())); r['data']['prompt'] = 'Old wording'
            m.sync(api, g, apply=True, update_existing=True, license_verified=False, public_base='https://example.test')
            self.assertEqual(len(api.writes), 1); self.assertEqual(api.records['questions'][r['id']]['status'], 'draft')
    def test_private_manifest_cli_and_no_dataset_download(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); public = root / 'public'; public.mkdir(); (public / 'manifest.json').write_text('{}')
            with patch.object(m, 'CACHE_DIR', root / 'cache'), patch.object(m, 'PUBLIC_DIR', public), patch.object(m, 'download') as download, patch.object(m, 'export_pngs', return_value=samples()), patch.object(m, 'log'), patch.object(m.sys, 'argv', ['import_medmnist.py', '--dry-run']), patch.object(m.MedcoelAPI, 'from_env') as api:
                self.assertEqual(m.main(), 0); api.assert_not_called(); download.assert_called_once()
            private = root / 'cache/manifests/pneumoniamnist-v1.json'
            self.assertEqual(json.loads(private.read_text())['practice']['total'], 10)
            self.assertFalse((public / 'manifest.json').exists())
    def test_practice_urls_hide_class_and_sample_identity(self):
        for label, name in m.PNEUMONIA_224.labels.items():
            path = m.png_name('test', 1234, label, role='practice')
            self.assertRegex(path, r'^pneumoniamnist-practice-[0-9a-f]{24}\.png$')
            self.assertNotIn(name, path.split('-practice-')[1])
            self.assertEqual(path, m.png_name('test', 1234, label, role='practice'))
        self.assertEqual(m.png_name('test', 4, 0), 'pneumoniamnist-test-normal-0004.png')
    def test_reselection_reactivates_archive_records_without_linking_archive(self):
        api = FakeAPI(); config = SelectionConfig()
        with patch.object(m, 'log'):
            m.sync(api, samples(), apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
            m.sync(api, samples(SelectionConfig(seed=1)), apply=True, update_existing=True, license_verified=True, public_base='https://example.test', config=SelectionConfig(seed=1))
            m.sync(api, samples(), apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
        practice = next(r for r in api.records['objects'].values() if r['slug'] == m.object_practice([])['slug'])
        archive = next(r for r in api.records['objects'].values() if r['slug'] == m.archive_body()['slug'])
        active = [q for q in api.records['questions'].values() if practice['id'] in q['objects']]
        self.assertEqual(len(active), 10)
        self.assertTrue(all(archive['id'] not in q['objects'] for q in active))
    def test_manual_question_blocks_migration_before_writes(self):
        api = FakeAPI()
        with patch.object(m, 'log'):
            m.sync(api, samples(), apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
            q = next(iter(api.records['questions'].values())); q['slug'] = 'admin-handcrafted-question'
            before = copy.deepcopy(api.records); api.writes.clear()
            with self.assertRaisesRegex(RuntimeError, 'unrecognized/manual'):
                m.sync(api, samples(), apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
        self.assertEqual(api.records, before); self.assertEqual(api.writes, [])
    def test_no_filler_or_unsupported_localization(self):
        q = m.question_body(samples()['practice'][0], 'o', 'a')
        self.assertEqual(q['data']['explanation'], '')
        self.assertEqual(q['data']['prompt'], 'Foto toraks ini termasuk kategori benchmark mana?')
        self.assertNotIn('region', q['data'])


if __name__ == '__main__': unittest.main()
