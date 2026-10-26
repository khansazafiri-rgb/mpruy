"""Focused content/provenance tests; no downloads, network, or production credentials."""
import contextlib
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import bloodmnist as blood
import import_medmnist as pneumonia
from identification_guides import CONTENT, learning_guide
from medcoel_api import ApiError, MedcoelAPI
from test_sampling import FakeAPI, samples


def statements(value):
    if isinstance(value,dict):
        if 'text' in value:yield value
        for child in value.values():yield from statements(child)
    elif isinstance(value,list):
        for child in value:yield from statements(child)


class GuideTests(unittest.TestCase):
    def test_every_teaching_statement_has_traceable_source(self):
        for dataset in ('bloodmnist','pneumoniamnist'):
            guide=learning_guide(dataset);ids={s['id'] for s in guide['sources']}
            self.assertTrue(list(statements(guide)))
            for statement in statements(guide):
                self.assertTrue(statement['sources']);self.assertTrue(set(statement['sources']) <= ids)
            for source in guide['sources']:
                self.assertTrue(source['url'].startswith('https://'));self.assertTrue(source['organization'])
                self.assertTrue(source['resource']);self.assertEqual(source['accessed'],'2026-10-26')
    def test_blood_all_eight_profiles_caveats_and_group_filter(self):
        guide=learning_guide('bloodmnist')
        self.assertEqual({p['key'] for p in guide['profiles']},set(blood.BLOOD_224.labels.values()))
        im=next(p for p in guide['profiles'] if p['key']=='immature granulocytes')
        self.assertIn('morfologinya dapat bervariasi',str(im))
        eryth=next(p for p in guide['profiles'] if p['key']=='erythroblast')
        self.assertIn('tahap maturasi tiap citra belum ditetapkan',str(eryth))
        for group in blood.GROUPS:
            obj=blood.object_body(group,[])
            self.assertEqual([p['key'] for p in obj['data']['studyGuide']['profiles']], [blood.BLOOD_224.labels[i] for i in group['labels']])
            self.assertEqual(len(obj['data']['studyGuide']['comparison']['rows']),4)
            self.assertNotIn('studyGuide',blood.object_body(group,[],practice=True)['data'])
    def test_cxr_guidance_comparison_checklist_and_provenance(self):
        guide=pneumonia.object_intro([])['data']['studyGuide']
        self.assertEqual([p['key'] for p in guide['profiles']],['normal','pneumonia'])
        self.assertEqual(len(guide['comparison']['rows']),5);self.assertEqual(len(guide['checklist']),6)
        self.assertTrue({'who-2005','who-cres','acr','cxr-review'} <= {s['id'] for s in guide['sources']})
        self.assertIn('tidak cukup spesifik',str(guide));self.assertIn('tidak rutin diperlukan',str(guide))
        self.assertNotIn('studyGuide',pneumonia.object_practice([])['data'])
    def test_no_image_specific_claims_localization_or_runtime_research(self):
        guides=json.loads(CONTENT.read_text())
        for guide in guides.values():
            self.assertEqual(guide['scope'],'class')
            serialized=json.dumps(guide).lower()
            for key in ('"region"','"observedfeatures"','"boundingbox"','"heatmap"','"answer"'):
                self.assertNotIn(key,serialized)
            for statement in statements(guide):
                self.assertNotIn('Pada gambar ini tampak',statement['text'])
        for relative in ('identification_guides.py',):
            code=(CONTENT.parent.parent/relative).read_text()
            for dependency in ('import requests','import openai','urllib','web_search'):
                self.assertNotIn(dependency,code)
    def test_sampling_and_feedback_contract_remain_small_and_visual(self):
        self.assertEqual(pneumonia.parse_args([]).config.practice_per_class,5)
        self.assertEqual(pneumonia.parse_args(['--dataset','bloodmnist']).config.practice_per_class,3)
        g=samples();self.assertEqual([len(g[k]) for k in ('learning','practice')],[20,10])
        q=pneumonia.question_body(g['practice'][0],'o','a')['data']
        self.assertEqual(q['prompt'],'Foto toraks ini termasuk kategori mana?')
        self.assertEqual(q['type'],'image_identification');self.assertEqual(q['explanation'],'')
    def test_backend_capability_missing_fails_before_draft_writes(self):
        api=FakeAPI()
        with patch.object(api,'require_study_guides',side_effect=RuntimeError('backend missing')):
            with self.assertRaisesRegex(RuntimeError,'backend missing'):
                pneumonia.sync(api,samples(),apply=True,update_existing=True,license_verified=False,public_base='https://example.test')
        self.assertEqual(api.writes,[])
        real=MedcoelAPI('https://example.test','fixture','fixture')
        with patch.object(real,'request',side_effect=ApiError(404,'GET','capabilities','missing')):
            with self.assertRaisesRegex(RuntimeError,'nothing changed'):real.require_study_guides()
    def test_repeated_guide_import_unchanged_and_changes_invalidate_only_object(self):
        api=FakeAPI()
        with contextlib.redirect_stdout(io.StringIO()):
            first=pneumonia.sync(api,samples(),apply=True,update_existing=True,license_verified=False,public_base='https://example.test')
            self.assertEqual(first.counts['create'],43)
            obj=next(o for o in api.records['objects'].values() if 'studyGuide' in o['data']);obj['status']='published'
            obj['data']['studyGuide']['title']='Earlier title'
            api.writes.clear()
            result=pneumonia.sync(api,samples(),apply=True,update_existing=True,license_verified=False,public_base='https://example.test')
            self.assertEqual(result.counts['update'],1)
            self.assertEqual(api.records['objects'][obj['id']]['status'],'draft')
            api.writes.clear()
            result=pneumonia.sync(api,samples(),apply=True,update_existing=True,license_verified=False,public_base='https://example.test')
            self.assertEqual(result.counts['update'],0);self.assertEqual(api.writes,[])


if __name__=='__main__':unittest.main()
