"""Focused Path/OCT checks with synthetic labels/images and disposable API only."""
import contextlib
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

import medmnist_core as core
from dataset_registry import require_enabled_dataset
from identification_guides import learning_guide
from medcoel_api import MedcoelAPI
from octmnist import CONFIG as OCT
from pathmnist import CONFIG as PATH
from sampling import select_samples
from test_sampling import FakeAPI
import visual_mnist as visual


def rows(cfg):
    labels = [label for label in cfg.spec.labels for _ in range(16)]
    selected = select_samples(labels, cfg.spec.labels, dataset=cfg.spec.key, split='test',
                              version=cfg.spec.md5, config=cfg.selection)
    return {role: [{'dataset': cfg.spec.key, 'split': 'test', 'index': i, 'label': labels[i],
                    'label_name': cfg.spec.labels[labels[i]], 'role': role,
                    'filename': core.png_name('test', i, labels[i], cfg.spec, role),
                    'url_path': '/lab-content/medmnist/' + cfg.spec.key + '/' +
                                core.png_name('test', i, labels[i], cfg.spec, role)}
                   for i in getattr(selected, role)] for role in ('learning', 'practice')}


class VisualPackTests(unittest.TestCase):
    def setUp(self):
        self.silent = contextlib.redirect_stdout(io.StringIO()); self.silent.__enter__()
    def tearDown(self):
        self.silent.__exit__(None, None, None)

    def test_official_spec_counts_determinism_manifest_and_opaque_practice(self):
        for cfg, n, learn, practice, checksum in [(PATH, 9, 36, 18, '2c51a510bcdc9cf8ddb2af93af1eadec'),
                                                   (OCT, 4, 20, 12, 'abc493b6d529d5de7569faaef2773ba3')]:
            require_enabled_dataset(cfg.spec.key)
            self.assertEqual((cfg.spec.task, cfg.spec.license_name, cfg.spec.md5), ('multi-class', 'CC BY 4.0', checksum))
            self.assertEqual(len(cfg.spec.labels), n)
            grouped = rows(cfg); self.assertEqual(grouped, rows(cfg))
            core.validate_groups(grouped, cfg.selection, cfg.spec)
            self.assertEqual((len(grouped['learning']), len(grouped['practice'])), (learn, practice))
            self.assertFalse({r['index'] for r in grouped['learning']} & {r['index'] for r in grouped['practice']})
            self.assertEqual(len({r['filename'] for role in grouped for r in grouped[role]}), learn + practice)
            self.assertTrue(all(r['filename'].startswith(cfg.spec.key + '-practice-') for r in grouped['practice']))
            self.assertTrue(all(not any(label.replace(' ', '-') in r['filename'] for label in cfg.spec.labels.values())
                                for r in grouped['practice']))
            mf = core.manifest(grouped, cfg.selection, cfg.spec)
            self.assertEqual((mf['learning']['total'], mf['practice']['total'], mf['overlap']), (learn, practice, 0))
            self.assertEqual(mf['source_md5'], checksum)
            self.assertEqual(set(mf['learning']['counts'].values()), {cfg.learning_per_class})
            self.assertEqual(set(mf['practice']['counts'].values()), {cfg.practice_per_class})
            self.assertEqual(mf['selection_config']['disjoint'], True)

    def test_path_structure_options_balanced_and_safe(self):
        grouped = rows(PATH); self.assertEqual([len(g.labels) for g in PATH.groupings], [3, 3, 3])
        self.assertEqual([g.title for g in PATH.groupings], ['Komponen Dasar Jaringan', 'Komponen Seluler & Stroma', 'Mukosa Kolon & Keganasan'])
        all_questions = []
        for group in PATH.groupings:
            practice = visual.practice_rows(PATH, grouped['practice'], group)
            slots = visual.answer_slots(PATH, grouped['practice'], group)
            qs = [visual.question_body(PATH, r, group, slots[r['index']], 'o', 'a') for r in practice]
            self.assertEqual(len(qs), 6)
            self.assertEqual([sum(q['data']['answer'] == c for q in qs) for c in 'ABC'], [2, 2, 2])
            for row, q in zip(practice, qs):
                d = q['data']; self.assertEqual(len(d['options']), 3)
                self.assertEqual({o['text'] for o in d['options']}, {PATH.student_labels[i] for i in group.labels})
                self.assertEqual(next(o['text'] for o in d['options'] if o['label'] == d['answer']), PATH.student_labels[row['label']])
                self.assertEqual(d['prompt'], PATH.question_prompt); self.assertEqual(d['explanation'], '')
            all_questions.extend(qs)
        self.assertEqual(len(all_questions), 18)
        self.assertNotIn('diagnosis penyakit', PATH.question_prompt.lower())

    def test_oct_structure_options_and_balance(self):
        grouped = rows(OCT); self.assertEqual(len(OCT.groupings), 1)
        group = OCT.groupings[0]; self.assertEqual(group.title, 'Dasar Interpretasi OCT Retina')
        practice = visual.practice_rows(OCT, grouped['practice'], group)
        slots = visual.answer_slots(OCT, grouped['practice'], group)
        qs = [visual.question_body(OCT, r, group, slots[r['index']], 'o', 'a') for r in practice]
        self.assertEqual(len(qs), 12)
        self.assertEqual([sum(q['data']['answer'] == c for q in qs) for c in 'ABCD'], [3, 3, 3, 3])
        self.assertNotEqual([q['data']['answer'] for q in qs], list('ABCD') * 3)
        for row, q in zip(practice, qs):
            d = q['data']; self.assertEqual(len(d['options']), 4)
            self.assertEqual({o['text'] for o in d['options']}, set(OCT.student_labels.values()))
            self.assertEqual(next(o['text'] for o in d['options'] if o['label'] == d['answer']), OCT.student_labels[row['label']])
            self.assertEqual(d['prompt'], OCT.question_prompt); self.assertEqual(d['explanation'], '')

    def test_guides_class_level_sources_and_medical_boundaries(self):
        for cfg in (PATH, OCT):
            keys = []
            for group in cfg.groupings:
                guide = learning_guide(cfg.spec.key, [cfg.spec.labels[i] for i in group.labels])
                self.assertEqual(guide['dataset'], cfg.spec.title)
                self.assertEqual(guide['scope'], 'class')
                self.assertEqual(len(guide['profiles']), len(group.labels))
                self.assertEqual([p['key'] for p in guide['profiles']], [cfg.spec.labels[i] for i in group.labels])
                self.assertEqual([r['key'] for r in guide['comparison']['rows']], [cfg.spec.labels[i] for i in group.labels])
                sources = {x['id'] for x in guide['sources']}
                def visit(value):
                    if isinstance(value, dict):
                        if 'text' in value:
                            self.assertTrue(value['text']); self.assertTrue(value['sources'])
                            self.assertTrue(set(value['sources']) <= sources)
                        for child in value.values(): visit(child)
                    elif isinstance(value, list):
                        for child in value: visit(child)
                visit(guide)
                keys.extend(p['key'] for p in guide['profiles'])
                self.assertNotIn('observedFeatures', json.dumps(guide))
            self.assertEqual(set(keys), set(cfg.spec.labels.values()))
        path = learning_guide('pathmnist', ['background', 'debris'])
        text = json.dumps(path, ensure_ascii=False).lower()
        self.assertIn('kategori teknis', text); self.assertIn('bukan diagnosis', text)
        oct_guide = learning_guide('octmnist')
        self.assertIn('Cara Membaca OCT', oct_guide['title'])
        self.assertEqual(len(oct_guide['checklist']), 6)
        for forbidden in ('anti-vegf', 'stadium pasien', 'terapi diberikan', 'type 1 cnv', 'type 2 cnv'):
            self.assertNotIn(forbidden, json.dumps(oct_guide, ensure_ascii=False).lower())

    def test_synthetic_export_grayscale_rgb_and_private_dry_run(self):
        for cfg, channels in [(PATH, 3), (OCT, 1)]:
            with tempfile.TemporaryDirectory() as d:
                root = Path(d); archive = root / 'tiny.npz'; public = root / 'public'; cache = root / 'cache'
                n = len(cfg.spec.labels) * 16
                shape = (n, 8, 8, channels) if channels == 3 else (n, 8, 8)
                images = np.arange(int(np.prod(shape)), dtype=np.uint8).reshape(shape)
                labels = np.repeat(list(cfg.spec.labels), 16).reshape(-1, 1)
                np.savez_compressed(archive, test_images=images, test_labels=labels)
                grouped = core.export_pngs(archive, cfg.selection, cfg.spec, public)
                self.assertEqual(grouped, core.export_pngs(archive, cfg.selection, cfg.spec, public))
                self.assertEqual(len(list(public.glob('*.png'))), len(grouped['learning']) + len(grouped['practice']))
                with patch.object(visual, 'download', return_value=archive), patch.object(visual, 'MedcoelAPI') as api:
                    args = type('Args', (), {'config': cfg.selection, 'apply': False, 'update_existing': False,
                        'license_verified': False, 'public_base': 'https://example.test'})()
                    visual.run(cfg, args, cache, public)
                    api.from_env.assert_not_called()
                mf = json.loads((cache / 'manifests' / (cfg.pack_slug + '.json')).read_text())
                self.assertEqual(mf['overlap'], 0)
                self.assertEqual(mf['source_md5'], cfg.spec.md5)

    def test_fake_api_drafts_idempotent_and_manual_content_refusal(self):
        for cfg, counts in [(PATH, (54, 6, 18, 1)), (OCT, (32, 2, 12, 1))]:
            api = FakeAPI(); grouped = rows(cfg)
            def sync(update=True):
                return visual.sync(cfg, api, grouped, apply=True, update_existing=update,
                                   license_verified=False, public_base='https://example.test')
            sync()
            self.assertEqual(tuple(len(api.records[k]) for k in ('assets','objects','questions','pathways')), counts)
            self.assertTrue(all(r['status'] == 'draft' for kind in api.records.values() for r in kind.values()))
            self.assertTrue(all(not a['data']['license']['verified'] for a in api.records['assets'].values()))
            steps = next(iter(api.records['pathways'].values()))['steps']
            self.assertEqual(len(steps), len(cfg.groupings) * 2)
            objects = list(api.records['objects'].values())
            self.assertEqual([o['data']['mode'] for o in objects], ['lesson','practice'] * len(cfg.groupings))
            self.assertEqual([len(o['assets']) for o in objects],
                             [x for group in cfg.groupings for x in (len(group.labels) * cfg.learning_per_class, 0)])
            for obj, group in zip(objects[1::2], cfg.groupings):
                self.assertEqual(sum(obj['id'] in q['objects'] for q in api.records['questions'].values()),
                                 len(group.labels) * cfg.practice_per_class)
            before = copy.deepcopy(api.records); api.writes.clear(); sync()
            self.assertEqual(api.records, before); self.assertEqual(api.writes, [])
            old = next(iter(api.records['questions'].values())); old['slug'] = 'manual-extra'
            before = copy.deepcopy(api.records); api.writes.clear()
            with self.assertRaisesRegex(RuntimeError, 'manual/obsolete'): sync()
            self.assertEqual(api.records, before); self.assertEqual(api.writes, [])

    def test_old_backend_rejected_before_any_asset_write(self):
        api = MedcoelAPI('https://example.test', 'fixture', 'fixture')
        with patch.object(api, 'request', return_value={'studyGuide': 1}):
            with self.assertRaisesRegex(RuntimeError, 'does not support PathMNIST'):
                visual.sync(PATH, api, rows(PATH), apply=True, update_existing=False,
                            license_verified=False, public_base='https://example.test')


if __name__ == '__main__': unittest.main()
