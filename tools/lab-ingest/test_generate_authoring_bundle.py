"""Offline taxonomy/bundle regressions; no real media or production API."""
import copy
import unittest

from generate_authoring_bundle import MODULES, SUPPORTED, authoring_bundle, selection_from_manifest
from lab_worker import MODULE_KEY as OCT_MODULE
from stage_authoring_media import DATASETS, media_key, operational_manifest, source_key, source_definition
from test_stage_authoring_media import groups_for


def fixtures(dataset):
    spec, selection, labels = DATASETS[dataset]
    groups = groups_for(spec, selection)
    for rows in groups.values():
        for row in rows:
            row['url_path'] = ''
    media = {media_key(row): {'key': media_key(row), 'sourceKey': source_key(dataset),
             'title': 'Citra latihan' if role == 'practice' else labels[row['label']],
             'alt': 'Citra latihan identifikasi' if role == 'practice' else labels[row['label']]}
             for role, rows in groups.items() for row in rows}
    return groups, media, operational_manifest(groups, selection, spec)


class BundleTests(unittest.TestCase):
    def test_exact_counts_taxonomy_rich_learning_and_existing_question_answers(self):
        expected = {'pneumoniamnist': (20, 10, 'pencitraan-medis'),
                    'bloodmnist': (40, 24, 'patologi-klinik'),
                    'pathmnist': (36, 18, 'histologi-histopatologi')}
        for dataset in SUPPORTED:
            groups, media, manifest = fixtures(dataset)
            selection = selection_from_manifest(manifest, dataset)
            bundle = authoring_bundle(dataset, selection, media, {})
            self.assertEqual(bundle, authoring_bundle(dataset, selection, media, {}))
            module = next(row['data'] for row in bundle['records'] if row['kind'] == 'module')
            blocks = module['chapters'][0]['sections'][0]['blocks']
            gallery = next(block for block in blocks if block['type'] == 'gallery')
            questions = module['questionBanks'][0]['questions']
            self.assertEqual((len(gallery['items']), len(questions)), expected[dataset][:2])
            self.assertEqual(MODULES[dataset]['root'], expected[dataset][2])
            self.assertTrue(any(row['kind'] == 'catalog' and row['data']['key'] == expected[dataset][2] for row in bundle['records']))
            self.assertEqual(module['key'], MODULES[dataset]['moduleKey'])
            self.assertEqual(module['title'], MODULES[dataset]['title'])
            self.assertLess(blocks.index(gallery), next(i for i, block in enumerate(blocks) if block['type'] == 'identification_table'))
            self.assertTrue(all(item['title'] and '[Sumber:' in item['caption'] for item in gallery['items']))
            self.assertFalse({item['asset'] for item in gallery['items']} & {q['asset'] for q in questions})
            by_key = {media_key(row): row for row in groups['practice']}
            for question in questions:
                row = by_key[question['asset']]
                expected_label = DATASETS[dataset][2][row['label']]
                actual_label = next(option['text'] for option in question['options'] if option['label'] == question['answer'])
                self.assertEqual(actual_label, expected_label)
                self.assertEqual(question['explanation'], '')
                self.assertNotIn('caption', question)
                self.assertEqual(media[question['asset']]['title'], 'Citra latihan')
            guide = next(row['data'] for row in bundle['records'] if row['kind'] == 'guide')
            self.assertFalse(any(step['title'] in set(DATASETS[dataset][2].values()) for step in guide['steps']))
            self.assertFalse(bundle['records'][0]['data']['license']['verified'])
            self.assertFalse(bundle['records'][0]['data']['policies'][0]['reviewed'])
        self.assertEqual(MODULES['octmnist']['moduleKey'], OCT_MODULE)
        self.assertEqual(MODULES['octmnist']['child'], 'imaging-retina')

    def test_registered_identity_and_private_manifest_validation_fail_closed(self):
        dataset = 'pathmnist'
        groups, media, manifest = fixtures(dataset)
        bad = copy.deepcopy(manifest); bad['source_md5'] = 'wrong'
        with self.assertRaises(ValueError): selection_from_manifest(bad, dataset)
        bad = copy.deepcopy(manifest); bad['practice']['files'][0]['media_key'] = 'wrong'
        with self.assertRaises(ValueError): selection_from_manifest(bad, dataset)
        missing = dict(media); missing.pop(media_key(groups['learning'][0]))
        with self.assertRaisesRegex(ValueError, 'Media belum terdaftar'):
            authoring_bundle(dataset, groups, missing, {})
        unsafe = copy.deepcopy(media); unsafe[media_key(groups['practice'][0])]['title'] = 'Jaringan adiposa'
        with self.assertRaisesRegex(ValueError, 'generik'):
            authoring_bundle(dataset, groups, unsafe, {})

    def test_source_snapshot_keeps_human_review_and_oct_is_not_regenerated(self):
        dataset = 'bloodmnist'
        groups, media, _ = fixtures(dataset)
        source = source_definition(DATASETS[dataset][0]); source['license']['verified'] = True
        source['disclosure'] = 'Human-reviewed disclosure.'
        source['policies'] = [{'collection': MODULES[dataset]['moduleKey'], 'allowed': True, 'reviewed': True}]
        bundle = authoring_bundle(dataset, groups, media, {source['key']: {'data': source, 'status': 'published'}})
        self.assertEqual(bundle['records'][0]['data'], source)
        with self.assertRaisesRegex(ValueError, 'OCT'):
            authoring_bundle('octmnist', {}, {}, {})


if __name__ == '__main__':
    unittest.main()
