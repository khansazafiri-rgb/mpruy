#!/usr/bin/env python3
"""Disposable localhost API smoke test; synthetic identities, no downloads.

Requires fresh local PocketBase + test admin and student credentials in environment.
Never run against production. This test publishes synthetic fixtures ONLY on localhost.
"""
import contextlib
import io
import os
from urllib.parse import urlparse
import bloodmnist as b
from medcoel_api import ApiError, MedcoelAPI
from test_bloodmnist import samples


def main():
    base=os.environ.get('MEDCOEL_API_BASE','')
    if urlparse(base).hostname not in ('127.0.0.1','localhost','::1'):
        raise SystemExit('test_blood_api.py requires a disposable localhost server.')
    api=MedcoelAPI.from_env()
    student=MedcoelAPI(base,os.environ['BLOOD_TEST_STUDENT'],os.environ['BLOOD_TEST_STUDENT_PASSWORD']);student.login()
    checks=0
    def ok(condition,message):
        nonlocal checks
        assert condition,message
        checks+=1
    groups=samples()
    def sync(**over):
        with contextlib.redirect_stdout(io.StringIO()):
            return b.sync(api,groups,apply=over.get('apply',True),update_existing=over.get('update_existing',True),
                          license_verified=over.get('license_verified',False),public_base='https://example.test')
    def snapshot():return {k:api.list_all(k) for k in ('assets','objects','questions','pathways')}
    before=snapshot();sync(apply=False)
    ok(snapshot()==before,'dry plan wrote records')
    first=sync();pack_id=first.pack['id']; state=snapshot()
    owned={k:[r for r in rows if r.get('pack')==pack_id] for k,rows in state.items()}
    ok([len(owned[k]) for k in ('assets','objects','questions','pathways')]==[64,4,24,1],'wrong pack counts')
    ok(all(r['status']=='draft' for rows in owned.values() for r in rows),'new content not draft')
    validation=api.request('POST',f'/api/medcoel/admin/lab-packs/{pack_id}/validate',{})
    ok(not validation['ok'] and len(validation['errors'])==64,'license gate not enforced')
    for a in owned['assets']:
        ok(b.BLOOD_224.md5 in a['data']['license']['source'] and a['data']['dataset']['label'] in b.BLOOD_224.labels.values(),'provenance not retained')
    ok(sync(update_existing=False).counts['unchanged']==93 and snapshot()==state,'identical apply writes')
    # Verify API canonicalization and privacy in draft preview before any fixture publication.
    for group in b.GROUPS:
        obj=next(o for o in owned['objects'] if o['slug']==b.object_slug(group,True))
        preview=api.request('GET',f"/api/medcoel/admin/lab/objects/{obj['id']}/preview")
        ok(len(preview['questions'])==12 and not preview['assets'],'preview practice membership')
    # Explicit human-review flag in this LOCAL synthetic fixture, never an automatic importer publish.
    sync(license_verified=True)
    validation=api.request('POST',f'/api/medcoel/admin/lab-packs/{pack_id}/validate',{})
    ok(validation['ok'],str(validation['errors']))
    published=api.request('POST',f'/api/medcoel/admin/lab-packs/{pack_id}/publish',{'confirmReviewed':True})
    ok(published['ok'] and len(published['published'])==93,'fixture publish failed')
    state=snapshot()
    for group in b.GROUPS:
        obj=next(o for o in owned['objects'] if o['slug']==b.object_slug(group,True))
        detail=student.request('GET',f"/api/medcoel/lab/objects/{obj['id']}")
        ok(len(detail['questions'])==12 and detail['assets']==[],'student practice count')
        for q in detail['questions']:
            ok(set(q)=={'id','type','prompt','options','image'},'question payload leaked private fields')
            ok(set(q['image'])=={'id','url','alt','synthetic','license'},'image leaked source labels/index/annotations')
            ok(q['image']['alt']=='Gambar latihan','answer-bearing alt')
            ok('/bloodmnist-practice-' in q['image']['url'] and len(q['options'])==4,'unsafe filename/options')
        q=detail['questions'][0]; full=next(r for r in state['questions'] if r['id']==q['id'])
        result=student.request('POST',f"/api/medcoel/lab/questions/{q['id']}/answer",{'response':full['data']['answer']})
        ok(result['correct'] and result['answer']==full['data']['answer'] and result['explanation']=='','feedback not label-only')
        learning=next(o for o in owned['objects'] if o['slug']==b.object_slug(group))
        lesson=student.request('GET',f"/api/medcoel/lab/objects/{learning['id']}")
        ok(len(lesson['assets'])==20 and all('sample_index' not in a['dataset'] for a in lesson['assets']),'learning metadata leak')
    path=owned['pathways'][0]
    pathway=student.request('GET',f"/api/medcoel/lab/pathways/{path['id']}")
    ok([s['slug'] for s in pathway['steps']]==[b.object_slug(g,p) for g in b.GROUPS for p in (False,True)],'path order')
    again=sync();ok(again.counts['unchanged']==93 and snapshot()==state,'published reviews changed on identical rerun')
    print(f'Blood API: {checks} checks passed; assets=64, learning=40, practice=24, overlap=0; draft/license/privacy/idempotency OK.')


if __name__=='__main__':main()
