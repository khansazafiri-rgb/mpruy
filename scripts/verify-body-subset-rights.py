import argparse,collections,csv,hashlib,json,pathlib,struct,zipfile,datetime
p=argparse.ArgumentParser(description="Verify exact BP3D source and GLB bytes; does not authorize release")
p.add_argument("--quarantine",type=pathlib.Path,required=True)
p.add_argument("--cache",type=pathlib.Path,required=True)
p.add_argument("--out",type=pathlib.Path,required=True)
a=p.parse_args()
ROOT=a.quarantine.resolve()
CACHE=a.cache.resolve()
OUT=a.out.resolve(); OUT.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
inv=json.loads((CACHE/'inventory.json').read_bytes())
attr='BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International'
evidence=['https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html','https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html','https://dbarchive.biosciencedbc.jp/update_histories/181']
trees={}
for tree,dirname in [('isa','bp3d-4.0'),('partof','bp3d-4.0-partof')]:
 d=ROOT/dirname
 files={'archive':d/(tree+'_BP3D_4.0_obj_99.zip'),'names':d/(tree+'_parts_list_e.txt'),'elements':d/(tree+'_element_parts.txt')}
 hashes={k:sha(v.read_bytes()) for k,v in files.items()}
 names={r['concept id']:r for r in csv.DictReader(files['names'].open(),delimiter='\t')}
 elements=collections.defaultdict(set)
 for r in csv.DictReader(files['elements'].open(),delimiter='\t'):elements[r['concept id']].add(r['element file id'])
 trees[tree]={'hashes':hashes,'names':names,'elements':elements,'zip':zipfile.ZipFile(files['archive']),'members':{}}
rows=[];failures=[];totaltri=0;sourceocc=0
for r in inv['bodyModels']:
 try:
  assert r['license']=='CC-BY-4.0' and r['attribution']==attr
  t=trees[r['sourceTree']];assert t['hashes']==r['sourceHashes'],'source pin mismatch'
  name=t['names'][r['fmaId']];assert name['representation id']==r['bpId'] and name['en']==r['name'],'official identity mismatch'
  assert {e['id'] for e in r['sourceElements']}==t['elements'][r['fmaId']],'source membership mismatch'
  for e in r['sourceElements']:
   assert e['zipEntry']==r['sourceTree']+'_BP3D_4.0_obj_99/'+e['id']+'.obj'
   if e['zipEntry'] not in t['members']:
    b=t['zip'].read(e['zipEntry']);tri=0
    for line in b.splitlines():
     if line.startswith(b'f '):tri+=max(0,len(line.split())-3)
    t['members'][e['zipEntry']]={'sha256':sha(b),'triangles':tri}
   assert t['members'][e['zipEntry']]['sha256']==e['sha256'],'member digest mismatch'
   assert t['members'][e['zipEntry']]['triangles']>=e['triangles'],'raw/export triangle mismatch'
  path=CACHE/r['path'];assert path.resolve().is_relative_to(CACHE.resolve())
  b=path.read_bytes();assert sha(b)==r['sha256'],'GLB pin mismatch'
  magic,version,size=struct.unpack_from('<III',b);assert (magic,version,size)==(0x46546c67,2,len(b))
  length,kind=struct.unpack_from('<II',b,12);assert kind==0x4e4f534a
  g=json.loads(b[20:20+length]);p=g['extras']['provenance']
  assert p['fmaId']==r['fmaId'] and p['bpId']==r['bpId'] and p['tree']==r['sourceTree'] and p['officialName']==r['name'] and p['sourceHashes']==r['sourceHashes'] and p['sourceElements']==r['sourceElements'],'embedded provenance mismatch'
  assert {n['extras']['officialElementFileId'] for n in g['nodes']}=={e['id'] for e in r['sourceElements']}
  assert all('uri' not in v for v in g.get('buffers',[])) and not g.get('images') and not g.get('textures'),'external/image asset'
  tris=0
  for mesh in g['meshes']:
   for prim in mesh['primitives']:
    assert prim.get('mode',4)==4
    count=g['accessors'][prim['indices']]['count'] if 'indices' in prim else g['accessors'][prim['attributes']['POSITION']]['count']
    assert count%3==0;tris+=count//3
  assert tris==r['triangles']
  assert sum(e['triangles'] for e in r['sourceElements'])==tris
  assert sum(t['members'][e['zipEntry']]['triangles'] for e in r['sourceElements'])-sum(n['extras'].get('omittedDegenerateTriangles',0) for n in g['nodes'])==tris
  rows.append({k:r[k] for k in ['id','path','sha256','sourceTree','fmaId','bpId','sourceHashes','sourceElements','license','attribution','licenseURL','sourceArchive','changes']})
  rows[-1].update(glbSHA256=r['sha256'],officialName=r['name'],bytes=len(b),triangles=tris,licenseStatus='PUBLIC_LICENSE_PERMISSION_VERIFIED',evidenceURLs=evidence,checks={'exactGLBHash':True,'exactSourceHashes':True,'officialIdentity':True,'exactElementMembership':True,'exactMemberHashes':True,'embeddedProvenance':True,'triangleAccounting':True,'noExternalURIsOrImages':True})
  totaltri+=tris;sourceocc+=len(r['sourceElements'])
 except Exception as e:failures.append({'id':r['id'],'error':str(e) or type(e).__name__})
assert not failures,failures
ledger={'schema':1,'product':'medcoel-human-anatomy-independent-subset','status':'PUBLIC_LICENSE_PERMISSION_VERIFIED','releaseAuthorized':False,'clinicalValidation':False,'registrationValidated':False,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Only listed byte-pinned BP3D 4.0 converted GLBs and their explicit source elements. License permits commercial use/distribution subject to CC BY attribution and modification notice. Does not approve other code/assets or clinical claims.','licenseBasis':{'license':'CC-BY-4.0','sourceVersion':'BodyParts3D 4.0, June 19 2013','publisherLicensePageUpdated':'2025-02-27','publisherHistoricalHeaderClarification':'2026-11-26','evidenceURLs':evidence,'historicalHeaderResolution':'Publisher notice confirms currently effective CC BY 4.0 despite stale CC BY-SA 2.1 comments in some OBJ files. Exact old pinned bytes validated here. New downloads require their own checksum verification.'},'summary':{'assets':len(rows),'sourceElementOccurrences':sourceocc,'distinctSourceMembersByTree':{k:len(v['members']) for k,v in trees.items()},'triangles':totaltri,'bytes':sum(r['bytes'] for r in rows),'passed':len(rows),'failed':0},'rows':rows}
p=OUT/'body-1016-rights-ledger.json';p.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
(OUT/'body-1016-rights-check-summary.json').write_text(json.dumps({'ledgerSHA256':sha(p.read_bytes()),**ledger['summary'],'releaseAuthorized':False,'noPrivateInventoryFlagsChanged':True},indent=2)+'\n')
print(json.dumps(ledger['summary']));print('ledgerSHA256',sha(p.read_bytes()))
