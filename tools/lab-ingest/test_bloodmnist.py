"""Focused offline Blood pack checks: synthetic NPZ and revision-checking fake API only."""
import contextlib
import copy
from dataclasses import replace
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
import bloodmnist as b
import medmnist_core as core
import import_medmnist as cli
from dataset_registry import require_enabled_dataset
from sampling import SelectionConfig, select_samples
from test_sampling import FakeAPI


def samples(config=b.DEFAULT_CONFIG):
    labels = [c for c in b.BLOOD_224.labels for _ in range(12)]
    picked = select_samples(labels, b.BLOOD_224.labels, dataset=b.BLOOD_224.key, split='test', version=b.BLOOD_224.md5, config=config)
    return {role: [{'dataset': 'bloodmnist', 'split': 'test', 'index': i, 'label': labels[i],
                    'label_name': b.BLOOD_224.labels[labels[i]], 'role': role,
                    'filename': core.png_name('test', i, labels[i], b.BLOOD_224, role),
                    'url_path': '/lab-content/medmnist/bloodmnist/' + core.png_name('test', i, labels[i], b.BLOOD_224, role)}
                   for i in getattr(picked, role)] for role in ('learning', 'practice')}


def sync(api, **kwargs):
    return b.sync(api, samples(), apply=kwargs.get('apply', True), update_existing=kwargs.get('update_existing', True),
                  license_verified=kwargs.get('license_verified', False), public_base='https://example.test')


class BloodTests(unittest.TestCase):
    def setUp(self):
        self.quiet = contextlib.redirect_stdout(io.StringIO()); self.quiet.__enter__()
    def tearDown(self):
        self.quiet.__exit__(None, None, None)
    def test_exact_classes_scope_and_enabled_policy(self):
        self.assertEqual(list(b.BLOOD_224.labels.values()), ['basophil', 'eosinophil', 'erythroblast',
            'immature granulocytes', 'lymphocyte', 'monocyte', 'neutrophil', 'platelet'])
        self.assertEqual(list(b.STUDENT_LABELS.values()), ['Basofil', 'Eosinofil', 'Eritroblas', 'Granulosit imatur', 'Limfosit', 'Monosit', 'Neutrofil', 'Trombosit'])
        self.assertEqual(b.BLOOD_224.task, 'multi-class'); self.assertEqual(b.BLOOD_224.license_name, 'CC BY 4.0')
        require_enabled_dataset('bloodmnist')
        for key in ('chestmnist', 'dermamnist'):
            with self.assertRaises(ValueError): require_enabled_dataset(key)
        require_enabled_dataset('pathmnist'); require_enabled_dataset('octmnist')
    def test_default_counts_disjoint_unique_deterministic(self):
        groups = samples(); core.validate_groups(groups, b.DEFAULT_CONFIG, b.BLOOD_224)
        self.assertEqual(groups, samples())
        self.assertEqual([len(groups[r]) for r in ('learning', 'practice')], [40, 24])
        for role, count in [('learning', 5), ('practice', 3)]:
            self.assertEqual([sum(r['label'] == c for r in groups[role]) for c in range(8)], [count] * 8)
        self.assertFalse({r['index'] for r in groups['learning']} & {r['index'] for r in groups['practice']})
        self.assertEqual(len({r['filename'] for role in groups for r in groups[role]}), 64)
        for row in groups['practice']:
            self.assertRegex(row['filename'], r'^bloodmnist-practice-[0-9a-f]{24}\.png$')
    def test_four_options_correct_once_balanced_deterministic_and_safe(self):
        for group in b.GROUPS:
            rows = b.practice_rows(samples()['practice'], group)
            self.assertEqual(len(rows), 12)
            questions = [b.question_body(r, group, n, 'obj', 'asset') for n, r in enumerate(rows)]
            self.assertEqual(questions, [b.question_body(r, group, n, 'obj', 'asset') for n, r in enumerate(rows)])
            self.assertEqual([sum(q['data']['answer'] == k for q in questions) for k in 'ABCD'], [3]*4)
            for row, q in zip(rows, questions):
                data=q['data']; self.assertEqual(len(data['options']), 4)
                self.assertEqual({o['text'] for o in data['options']}, {b.STUDENT_LABELS[i] for i in group['labels']})
                self.assertEqual([o['text'] for o in data['options'] if o['label'] == data['answer']], [b.STUDENT_LABELS[row['label']]])
                self.assertEqual(data['explanation'], '')
                self.assertEqual(data['prompt'], 'Citra ini paling sesuai dengan jenis sel darah apa?')
                rendered=json.dumps(q, ensure_ascii=False).lower()
                for forbidden in ('pneumonia','leukemia','malignan','infeksi','infection','anemia','nukleus','granula','promielosit','mielosit','metamielosit'):
                    self.assertNotIn(forbidden, rendered)
    def test_layout_and_full_apply_idempotency_with_preserved_review(self):
        api=FakeAPI(); first=sync(api)
        self.assertEqual({k:len(v) for k,v in api.records.items()}, {'assets':64,'objects':4,'questions':24,'pathways':1})
        self.assertEqual(first.counts['create'], 93)
        self.assertTrue(all(r['status']=='draft' for v in api.records.values() for r in v.values()))
        self.assertTrue(all(not a['data']['license']['verified'] for a in api.records['assets'].values()))
        objects=list(api.records['objects'].values()); path=next(iter(api.records['pathways'].values()))
        self.assertEqual(path['steps'], [o['id'] for o in objects])
        self.assertEqual([o['data']['mode'] for o in objects], ['lesson','practice','lesson','practice'])
        self.assertEqual([len(o['assets']) for o in objects], [20,0,20,0])
        self.assertEqual([sum(o['id'] in q['objects'] for q in api.records['questions'].values()) for o in objects], [0,12,0,12])
        for rows in api.records.values():
            for r in rows.values():r.update(status='published',reviewedBy='reviewer')
        for a in api.records['assets'].values():a['data']['license']['verified']=True
        before=copy.deepcopy(api.records); api.writes.clear()
        for update in (False, True):
            repeat=sync(api,update_existing=update)
            self.assertEqual(repeat.counts['unchanged'],93)
            self.assertEqual(api.records,before); self.assertEqual(api.writes,[])
    def test_revision_guard_admin_annotations_and_manual_ownership(self):
        api=FakeAPI(); sync(api)
        asset=next(iter(api.records['assets'].values())); asset['data']['annotations']=[{'id':'admin-note'}]
        sync(api); self.assertEqual(next(iter(api.records['assets'].values()))['data']['annotations'],[{'id':'admin-note'}])
        question=next(iter(api.records['questions'].values())); question['data']['prompt']='Old wording'
        with patch.object(api,'update',side_effect=cli.ApiError(400,'PUT','fixture','revision conflict')):
            with self.assertRaisesRegex(RuntimeError,'revision conflict'): sync(api)
        question['slug']='manual-content'; before=copy.deepcopy(api.records); api.writes.clear()
        with self.assertRaisesRegex(RuntimeError,'manual/obsolete'):sync(api)
        self.assertEqual(api.records,before); self.assertEqual(api.writes,[])
    def test_unexpected_question_links_fail_before_writes(self):
        api=FakeAPI();sync(api)
        question=next(iter(api.records['questions'].values()))
        question['objects'].append(next(iter(api.records['objects'])))
        before=copy.deepcopy(api.records);api.writes.clear()
        with self.assertRaisesRegex(RuntimeError,'unexpected object links'):sync(api)
        self.assertEqual(api.records,before);self.assertEqual(api.writes,[])
    def test_dry_plan_no_api_writes_and_plain_cli_no_connection_private_manifest(self):
        api=FakeAPI(); sync(api,apply=False); self.assertEqual(api.writes,[])
        with tempfile.TemporaryDirectory() as d:
            cache=Path(d)/'cache'; public=Path(d)/'public'
            with patch.object(b,'download'),patch.object(b,'export_pngs',return_value=samples()),patch.object(b.MedcoelAPI,'from_env') as api_factory:
                b.run(cli.parse_args(['--dataset','bloodmnist','--dry-run']),cache,public)
                api_factory.assert_not_called()
            mf=json.loads((cache/'manifests/bloodmnist-v1.json').read_text())
            self.assertEqual([mf['learning']['total'],mf['practice']['total'],mf['overlap']],[40,24,0])
            self.assertEqual(mf['dataset_version'],b.BLOOD_224.version)
            self.assertEqual(mf['source_md5'],'b718ff6835fcbdb22ba9eacccd7b2601')
            self.assertTrue(all('source_sample_index' in r and r['role']=='practice' for r in mf['practice']['files']))
            self.assertFalse(public.exists()); self.assertFalse(mf['license_verified_requested'])
    def test_export_rgb_npz_real_files_and_repeat(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); npz=root/'tiny.npz'; public=root/'public'
            images=np.arange(96*8*8*3,dtype=np.uint8).reshape(96,8,8,3)
            np.savez_compressed(npz,test_images=images,test_labels=np.repeat(np.arange(8),12).reshape(-1,1))
            groups=core.export_pngs(npz,b.DEFAULT_CONFIG,b.BLOOD_224,public)
            self.assertEqual(groups,core.export_pngs(npz,b.DEFAULT_CONFIG,b.BLOOD_224,public))
            self.assertEqual(len(list(public.glob('*.png'))),64)
            for role in groups:
                for r in groups[role]:
                    with core.Image.open(r['local_path']) as image:
                        self.assertEqual(image.mode,'RGB');np.testing.assert_array_equal(np.asarray(image),images[r['index']])
    def test_checksum_valid_cache_and_wrong_download_rejected(self):
        self.assertEqual(b.BLOOD_224.md5,'b718ff6835fcbdb22ba9eacccd7b2601')
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); fixture=b'fixture bytes'; spec=replace(b.BLOOD_224,md5=hashlib.md5(fixture).hexdigest())
            with patch.object(core.urllib.request,'urlopen',return_value=io.BytesIO(fixture)) as fetch:
                target=core.download(spec,root);self.assertEqual(target.read_bytes(),fixture);fetch.assert_called_once()
            with patch.object(core.urllib.request,'urlopen') as fetch:
                core.download(spec,root);fetch.assert_not_called()
            with patch.object(core.urllib.request,'urlopen',return_value=io.BytesIO(b'corrupt')):
                with self.assertRaisesRegex(RuntimeError,'MD5'):core.download(b.BLOOD_224,root)
            self.assertFalse(target.exists())
    def test_wrong_arrays_cap_and_legacy_cli(self):
        for labels in (np.zeros((8,2),dtype=int),np.array([0.,1.]),np.array(['0','1']),np.zeros((1,1,1),dtype=int)):
            with self.assertRaises(ValueError):core.flatten_labels(labels)
        for values in ([0]*12+[8]*12,):
            with self.assertRaises(ValueError):select_samples(values,b.BLOOD_224.labels,dataset='bloodmnist',split='test',version='v1',config=b.DEFAULT_CONFIG)
        self.assertEqual(cli.parse_args([]).config,SelectionConfig(10,5))
        self.assertEqual(cli.parse_args([]).dataset,'pneumoniamnist')
        self.assertEqual(cli.parse_args(['--dataset','bloodmnist']).config,SelectionConfig(5,3))
        for args in (['--practice-per-class','6'],['--learning-per-class','6']):
            with contextlib.redirect_stderr(io.StringIO()),self.assertRaises(SystemExit):cli.parse_args(['--dataset','bloodmnist']+args)
    def test_provenance_preserved_and_practice_alt_generic(self):
        for row in samples()['practice']:
            body=b.asset_body(row,'https://example.test',False)
            self.assertEqual(body['data']['dataset']['label'],b.BLOOD_224.labels[row['label']])
            self.assertEqual(body['data']['alt'],'Gambar latihan sel darah perifer')
            license=body['data']['license']; self.assertIn(b.BLOOD_224.md5,license['source'])
            self.assertIn(b.BLOOD_224.version,license['source']);self.assertIn('Acevedo',license['citation'])
            self.assertTrue(license['attribution_required']);self.assertFalse(license['verified'])


if __name__=='__main__':unittest.main()
