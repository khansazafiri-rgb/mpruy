#!/usr/bin/env python3
"""API regression: disposable localhost PocketBase and synthetic sample identities only.

Set MEDCOEL_API_BASE, MEDCOEL_ADMIN_IDENTITY, MEDCOEL_ADMIN_PASSWORD before running.
Does not download datasets. Creates an isolated published legacy pack, migrates it, and tests publication.
"""
from __future__ import annotations
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
base = os.environ.get('MEDCOEL_API_BASE', 'http://127.0.0.1:8090')
if urlparse(base).hostname not in ('127.0.0.1', 'localhost', '::1'):
    raise SystemExit('test_ingest.py only supports disposable localhost PocketBase.')
os.environ['MEDCOEL_API_BASE'] = base
import import_medmnist as m
from medcoel_api import ApiError, MedcoelAPI
from sampling import SelectionConfig
from test_sampling import samples

checks = 0

def ok(cond, message):
    global checks
    assert cond, message
    checks += 1

run = format(time.time_ns(), 'x')
m.PACK = {**m.PACK, 'slug': f'pm-test-{run}'}
for name in ('asset_body', 'object_intro', 'object_practice', 'question_body', 'pathway_body', 'archive_body'):
    original = getattr(m, name)
    def named(*args, _original=original, **kwargs):
        b = _original(*args, **kwargs); b['slug'] += '-' + run; return b
    setattr(m, name, named)
logs = []; m.log = logs.append
config = SelectionConfig(); groups = samples(config); api = MedcoelAPI.from_env(); pack = api.create_pack(m.PACK)
assets = [api.create('assets', m.asset_body(r, 'https://example.test', True, pack['id'])) for r in groups['learning']]
a0 = assets[0]; a0['data']['annotations'] = [{'id': 'note', 'label': 'Catatan admin', 'layer': 'anatomy', 'region': {'x': .1, 'y': .1, 'width': .2, 'height': .2}}]
assets[0] = api.update('assets', a0['id'], a0)
extra = api.create('objects', {'slug': f'pm-extra-{run}', 'title': 'Materi lain', 'domain': 'imaging', 'assets': [], 'data': {'definition': 'Fixture'}})
b = m.object_intro([a['id'] for a in assets], pack['id']); b['tags'].append('catatan-admin'); b['related'] = [extra['id']]
intro = api.create('objects', b); practice = api.create('objects', m.object_practice([], pack['id']))
old_questions = []
for row, asset in zip(groups['learning'], assets):
    b = m.question_body(row, practice['id'], asset['id'], pack['id']); b['data']['explanation'] = 'Legacy filler'
    old_questions.append(api.create('questions', b))
path = api.create('pathways', m.pathway_body(intro['id'], practice['id'], pack['id']))
items = [('assets', a) for a in assets] + [('objects', intro), ('objects', practice)] + [('questions', q) for q in old_questions] + [('pathways', path)]
r = api.request('POST', '/api/medcoel/admin/lab-bulk/publish', {'confirmReviewed': True, 'items': [{'kind': k, 'id': r['id']} for k, r in items]})
ok(r['ok'], f'Legacy publish failed: {r}')

def snapshot(): return {k: api.list_all(k) for k in m.MANAGED}
def sync(**over):
    return m.sync(api, groups, apply=over.get('apply', True), update_existing=over.get('update_existing', True), license_verified=True, public_base='https://example.test', config=config)

before = snapshot(); logs.clear(); sync(apply=False)
ok(snapshot() == before, 'dry-run wrote PocketBase'); text = '\n'.join(logs)
ok('current: 20; target: 10' in text and 'Overlap learning/practice: 0' in text, text)
ok(text.count('WOULD DEPRECATE questions:') == 20 and 'previous extra 10' in text, text)
try:
    sync(update_existing=False); raise AssertionError('create-only must refuse legacy migration')
except RuntimeError as exc: ok('--update-existing' in str(exc), str(exc))
ok(snapshot() == before, 'refused migration wrote records')
real_update = api.update
api.update = lambda *_a, **_k: (_ for _ in ()).throw(ApiError(400, 'PUT', '/fixture', 'revision conflict'))
try:
    sync(); raise AssertionError('revision conflict must stop sync')
except RuntimeError as exc: ok('revision conflict' in str(exc), str(exc))
finally: api.update = real_update
ok(all(r['status'] == 'published' for r in api.list_all('questions') if r['id'] in {q['id'] for q in old_questions}), 'conflict changed old questions')
imp = sync(); state = snapshot(); objects = {r['slug']: r for r in state['objects']}; amap = {r['id']: r for r in state['assets']}
active = [q for q in state['questions'] if practice['id'] in q['objects']]
retired = [q for q in state['questions'] if q['id'] in {r['id'] for r in old_questions}]; archive = objects[m.archive_body()['slug']]
ok(len(active) == 10 and len(imp.retired) == 20 and len(retired) == 20, 'expected 10 active members, all old20 retained')
ok(all(q['status'] == 'draft' and q['pack'] == '' and archive['id'] in q['objects'] and practice['id'] not in q['objects'] and q['title'].startswith('Deprecated · ') for q in retired), 'unsafe retirement')
ok(archive['status'] == 'draft' and archive['pack'] == '', 'archive must stay outside pack')
learning_ids = objects[intro['slug']]['assets']; li = {amap[a]['data']['dataset']['sample_index'] for a in learning_ids}; pi = {amap[q['asset']]['data']['dataset']['sample_index'] for q in active}
ok(len(learning_ids) == 20 and len(pi) == 10 and not li & pi, 'learning/practice overlap')
for label in ('normal', 'pneumonia'):
    ok(sum(amap[a]['data']['dataset']['label'] == label for a in learning_ids) == 10, 'learning imbalance')
    ok(sum(amap[q['asset']]['data']['dataset']['label'] == label for q in active) == 5, 'practice imbalance')
ok(all(q['data']['explanation'] == '' and 'region' not in q['data'] for q in active), 'filler/localization generated')
ok(objects[intro['slug']]['status'] == 'published' and objects[practice['slug']]['status'] == 'published', 'unchanged published objects invalidated')
ok(objects[intro['slug']]['related'] == [extra['id']] and 'catatan-admin' in objects[intro['slug']]['tags'], 'admin edits lost')
ok(amap[a0['id']]['data']['annotations'][0]['label'] == 'Catatan admin' and amap[a0['id']]['status'] == 'published', 'annotation/asset invalidated')
ok(api.pack(m.PACK['slug'])['counts']['assets']['total'] == 30 and api.pack(m.PACK['slug'])['counts']['questions']['total'] == 10, 'wrong pack membership')
before = snapshot(); rerun = sync(); ok(snapshot() == before and rerun.counts['update'] == 0 and not rerun.retired, 'sync not idempotent')
selected = active[0]; selected['data']['prompt'] = 'Old prompt'; api.update('questions', selected['id'], selected)
cli = [sys.executable, str(HERE / 'publish_pack.py'), m.PACK['slug']]
def publish(*flags): return subprocess.run(cli + list(flags), capture_output=True, text=True)
r = publish('--dry-run'); ok(r.returncode == 0 and 'READY TO PUBLISH' in r.stdout, r.stdout + r.stderr)
r = publish('--apply', '--confirm-reviewed'); ok(r.returncode == 0, r.stdout + r.stderr)
repeat = sync(); after = snapshot()
ok(repeat.counts['update'] == 1 and repeat.unpublished == ['questions:' + selected['slug']], 'only changed question should return to draft')
ok(sum(a['status'] == 'draft' for a in after['questions'] if practice['id'] in a['objects']) == 1, 'unchanged questions invalidated')
sync(); r = publish('--apply', '--confirm-reviewed'); ok(r.returncode == 0, r.stdout + r.stderr)
r = api.request('GET', f"/api/medcoel/lab/objects/{practice['id']}")
ok(len(r['questions']) == 10 and all('dataset' not in q['image'] and 'sample_index' not in q['image'] for q in r['questions']), 'student practice count/metadata')
r = api.request('GET', f"/api/medcoel/lab/objects/{intro['id']}")
ok(all('sample_index' not in a.get('dataset', {}) for a in r['assets']), 'indices leaked')
for method, endpoint, body in [('GET', f"/api/medcoel/lab/objects/{archive['id']}", None), ('POST', f"/api/medcoel/lab/questions/{retired[0]['id']}/answer", {'response': 'A'})]:
    try:
        api.request(method, endpoint, body); raise AssertionError('retired content accessible')
    except ApiError as exc: ok(exc.code == 404, str(exc))
r = publish('--apply', '--confirm-reviewed'); ok(r.returncode == 0 and 'Diterbitkan: 0 record' in r.stdout, 'publish not idempotent')
print(f'ingest API: {checks} checks passed; learning=20, practice=10, overlap=0; old20 retained in draft archive.')
