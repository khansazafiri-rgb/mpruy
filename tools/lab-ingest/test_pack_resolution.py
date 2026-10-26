"""Focused regression for production's valid content linked to a noncanonical pack slug."""
import copy
from unittest import TestCase, main
from unittest.mock import patch

from medcoel_api import ApiError, resolve_content_pack
from publish_pack import resolve
from test_sampling import FakeAPI, samples
import import_medmnist as m


class PackAPI(FakeAPI):
    def pack(self, key):
        p = self.the_pack
        return copy.deepcopy(p) if p and key in (p['id'], p['slug']) else None


def legacy_fixture():
    api = PackAPI()
    api.the_pack = {'id': 'legacy000000001', 'slug': 'pneumoniamnist-224-v1'}
    pack = api.the_pack['id']; groups = samples()
    assets = [api.create('assets', m.asset_body(r, 'https://example.test', True, pack)) for r in groups['learning']]
    intro = api.create('objects', m.object_intro([a['id'] for a in assets], pack))
    practice = api.create('objects', m.object_practice([], pack))
    for row, asset in zip(groups['learning'], assets):
        api.create('questions', m.question_body(row, practice['id'], asset['id'], pack))
    api.create('pathways', m.pathway_body(intro['id'], practice['id'], pack))
    api.writes.clear()
    return api, groups


class PackResolutionTests(TestCase):
    def test_read_only_plan_resolves_production_shape_without_new_pack(self):
        api, groups = legacy_fixture(); before = copy.deepcopy(api.records)
        with patch.object(m, 'log'):
            result = m.sync(api, groups, apply=False, update_existing=True, license_verified=True, public_base='https://example.test')
        self.assertEqual(result.pack, api.the_pack)
        self.assertEqual(len(result.retired), 20)
        self.assertEqual(api.writes, []); self.assertEqual(api.records, before)
    def test_apply_reuses_id_and_slug_and_remains_idempotent(self):
        api, groups = legacy_fixture(); original = copy.deepcopy(api.the_pack)
        with patch.object(m, 'log'):
            m.sync(api, groups, apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
            before = copy.deepcopy(api.records); api.writes.clear()
            m.sync(api, groups, apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
        self.assertEqual(api.the_pack, original); self.assertEqual(api.records, before); self.assertEqual(api.writes, [])
        self.assertEqual(sum(q.get('pack') == original['id'] for q in api.records['questions'].values()), 10)
    def test_publish_cli_uses_the_same_legacy_pack(self):
        api, _ = legacy_fixture()
        self.assertEqual(resolve(api, 'pneumoniamnist'), api.the_pack)
        self.assertEqual(resolve(api, 'pneumoniamnist-v1'), api.the_pack)
        self.assertEqual(api.writes, [])
    def test_conflicting_references_refuse_before_writes(self):
        api, groups = legacy_fixture()
        next(iter(api.records['questions'].values()))['pack'] = 'otherpack000001'
        with patch.object(m, 'log'), self.assertRaisesRegex(RuntimeError, 'Conflicting pack references'):
            m.sync(api, groups, apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
        self.assertEqual(api.writes, [])
    def test_missing_pack_id_never_creates_replacement(self):
        api, groups = legacy_fixture(); api.the_pack = None
        with patch.object(m, 'log'), self.assertRaisesRegex(RuntimeError, 'cannot be resolved by ID'):
            m.sync(api, groups, apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
        self.assertEqual(api.writes, [])
    def test_matching_provenance_is_required_for_fallback(self):
        api, _ = legacy_fixture()
        for a in api.records['assets'].values(): a['data'].pop('dataset'); a['data']['license']['dataset'] = 'Other'
        with self.assertRaisesRegex(RuntimeError, 'provenance is missing'):
            resolve_content_pack(api, 'pneumoniamnist-v1')
        self.assertEqual(api.writes, [])
    def test_real_manual_question_still_rejected(self):
        api, groups = legacy_fixture(); next(iter(api.records['questions'].values()))['slug'] = 'manual-question'
        with patch.object(m, 'log'), self.assertRaisesRegex(RuntimeError, 'unrecognized/manual questions'):
            m.sync(api, groups, apply=True, update_existing=True, license_verified=True, public_base='https://example.test')
        self.assertEqual(api.writes, [])
    def test_new_install_and_unassigned_legacy_still_create_canonical(self):
        api = PackAPI()
        self.assertIsNone(resolve_content_pack(api, 'pneumoniamnist-v1'))
        self.assertEqual(api.writes, [])
    def test_unrelated_pack_cannot_be_discovered_from_other_objects(self):
        api, _ = legacy_fixture()
        for o in api.records['objects'].values(): o['slug'] = 'other-' + o['slug']
        self.assertIsNone(resolve_content_pack(api, 'pneumoniamnist-v1'))
        self.assertEqual(api.writes, [])
    def test_non404_errors_propagate_without_writes(self):
        api, _ = legacy_fixture()
        api.pack = lambda key: (_ for _ in ()).throw(ApiError(403, 'GET', key, 'forbidden'))
        with self.assertRaises(ApiError): resolve_content_pack(api, 'pneumoniamnist-v1')
        self.assertEqual(api.writes, [])


if __name__ == '__main__': main()
