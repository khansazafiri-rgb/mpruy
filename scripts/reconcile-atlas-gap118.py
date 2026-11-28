#!/usr/bin/env python3
"""Replay candidate evidence without upgrading any anatomical completeness/release claim."""
import argparse, collections, hashlib, json, pathlib, re, struct

def sha(b): return hashlib.sha256(b).hexdigest()
def read(p): return json.loads(pathlib.Path(p).read_bytes())
def label(s): return ' '.join(str(s).casefold().split())
def node_label(s):
    s=re.sub(r'^(VH_[FM]|Yao)_','',s)
    side=re.search(r'_(L|R)$',s)
    if side: s=('left ' if side[1]=='L' else 'right ')+s[:-2]
    return label(s.replace('_',' '))
def glb(p,expected):
    b=pathlib.Path(p).read_bytes()
    assert sha(b)==expected, 'Source GLB hash changed: '+str(p)
    assert struct.unpack_from('<III',b)==(0x46546c67,2,len(b)), 'Invalid GLB header'
    n,kind=struct.unpack_from('<II',b,12); assert kind==0x4e4f534a
    g=json.loads(b[20:20+n]); assert all(not x.get('uri') for x in g.get('buffers',[]))
    return g

def descendants(g,i,stack=()):
    assert i not in stack, 'Cyclic source node graph'
    n=g['nodes'][i]; out=[i] if 'mesh' in n else []
    for c in n.get('children',[]):out.extend(descendants(g,c,(*stack,i)))
    return sorted(set(out))

def main(a):
    repo=pathlib.Path(a.repo); evidence=repo/'licensing/atlas-publication/checkpoint-evidence'
    queuePath=evidence/'atlas-owner-local-118-gap-queue-20261127.json'
    q=read(queuePath); assert len(q['rows'])==q['unresolved']==118
    assert len({(x['group'],label(x['target'])) for x in q['rows']})==118
    targets={label(x['target']) for x in q['rows']}; found=collections.defaultdict(list)
    vmPath=pathlib.Path(a.voxelman)/'manifest.json'; vm=read(vmPath)
    assert len(vm['rows'])==33 and vm['meshRoundtripPass']==33
    for x in vm['rows']:
        glb(x['path'],x['sha256'])
        if label(x['name']) in targets:
            found[label(x['name'])].append({'source':'VOXEL-MAN','match':'EXACT_PUBLISHER_WORKBOOK_LABEL','id':x['id'],'name':x['name'],'sha256':x['sha256'],'labelIds':x['labelIds'],'kind':x['kind'],'geometryRoundtrip':x['geometryRoundtrip'],'sourceFrame':x['sourceFrame'],'cropBoundary':x['touchesSourceVolumeBoundary'],'renderAtManifestCheckpoint':x['currentBrowserRender'],'wholeStructureValidated':False,'registrationValidated':False,'clinicalValidation':False})
    oePath=pathlib.Path(a.openear)/'openear-acquisition-geometry-report-20261127.json'; oe=read(oePath)
    assert len(oe['rows'])==3
    for x in oe['rows']:
        glb(pathlib.Path(a.openear)/x['outputFile'],x['outputSHA256'])
        source=pathlib.Path(a.openear)/x['sourceFile']; b=source.read_bytes()
        assert sha(b)==x['sourceSHA256'] and hashlib.md5(b).hexdigest()==x['publisherMD5']==x['actualMD5']
        assert x['laterality']=='UNSPECIFIED'
        # An unsided source can match only the exact unsided target, never left/right variants.
        assert label(x['target']) in targets
        found[label(x['target'])].append({'source':'OpenEar','match':'EXACT_UNSIDED_PUBLISHER_LABEL','name':x['publisherLabel'],'sha256':x['outputSHA256'],'sourceSHA256':x['sourceSHA256'],'sourceURL':x['sourceURL'],'laterality':'UNSPECIFIED','renderAtManifestCheckpoint':x['renderVerified'],'clinicalValidation':False,'registrationValidated':False,'wholeStructureValidated':False})
    hPath=evidence/'hra-80-rights-ledger.json'; h=read(hPath); assert len(h['rows'])==80
    hraNodes={}; byURL={}
    for x in h['rows']:
        g=glb(pathlib.Path(a.cache)/x['path'],x['sha256']);hraNodes[x['sourceURL']]=(x,g);byURL[x['sourceURL']]=x
        for i,n in enumerate(g.get('nodes',[])):
            name=n.get('name',''); key=node_label(name)
            if key in targets:
                ds=descendants(g,i); assert ds,'Matching source label has no descendant meshes'
                found[key].append({'source':'HRA','match':'EXACT_NODE_LABEL_AFTER_EXPLICIT_PUBLISHER_PREFIX_SYNTAX','labelDerivation':'Remove VH_F_/VH_M_/Yao_ prefix; underscores to spaces; terminal _L/_R to left/right. No semantic synonyms.','id':x['id'],'sha256':x['sha256'],'nodeIndex':i,'nodeName':name,'nodeKind':'DIRECT_MESH' if 'mesh' in n else 'PUBLISHER_GROUP','descendantMeshNodeIndices':ds,'sourceURL':x['sourceURL'],'rightsStatus':x['licenseStatus'],'clinicalValidation':False,'registrationValidated':False,'wholeStructureValidated':False})
    # Only exact recorded publisher crosswalk labels, joined to the actual same URL/node bytes.
    crossPath=repo/'licensing/atlas-publication/hra-united-pelvis-mouth-gap-discovery-20261127.json'
    cross=read(crossPath); crossMissing=[]
    for row in cross['rows']:
        if row['sourceURL'] not in hraNodes:
            crossMissing.append({'id':row['id'],'sourceURL':row['sourceURL'],'status':'PUBLISHER_CROSSWALK_DISCOVERY_ONLY_SOURCE_BYTES_NOT_IN_LOCAL_80'})
            continue
        x,g=hraNodes[row['sourceURL']]
        for m in row.get('matches',[]):
            key=label(m['label'])
            if key not in targets:continue
            matches=[i for i,n in enumerate(g.get('nodes',[])) if n.get('name')==m['nodeName']]
            assert len(matches)==1, 'Publisher crosswalk node identity does not match actual source'
            i=matches[0];ds=descendants(g,i);assert ds
            if any(c.get('source')=='HRA' and c.get('id')==x['id'] and c.get('nodeIndex')==i for c in found[key]):continue
            found[key].append({'source':'HRA','match':'EXACT_RECORDED_PUBLISHER_CROSSWALK_LABEL_AND_ACTUAL_NODE','id':x['id'],'sha256':x['sha256'],'nodeIndex':i,'nodeName':m['nodeName'],'ontologyId':m['ontologyId'],'nodeKind':'DIRECT_MESH' if 'mesh' in g['nodes'][i] else 'PUBLISHER_GROUP','descendantMeshNodeIndices':ds,'sourceURL':x['sourceURL'],'crosswalkURL':row['crosswalkURL'],'clinicalValidation':False,'registrationValidated':False,'wholeStructureValidated':False})
    pPath=pathlib.Path(a.peripheral); p=read(pPath)
    assert p['sourceIdComponents']==55 and p['sourceSHA256']=='6652c2606b30a5913c19a3a045d472f4c82e3c666d466cc4628ee822424e0e53'
    rows=[]
    for row in q['rows']:
        key=label(row['target']);cs=found[key];checks=[]
        for s in q['sourceDiscovery']:
            if key in {label(t) for t in s.get('candidateTargets',[])}:
                checks.append({'source':s['id'],'url':s['url'],'checkLevel':'RETAINED_DISCOVERY_RECORD_ONLY','finding':s['scope']})
        if row['group']=='nervous':
            checks.append({'source':'existing-peripheral-system-GLB','sha256':p['sourceSHA256'],'checkLevel':'DECODED_NUMERIC_COMPONENTS_NO_NAMED_CROSSWALK','finding':'55 numeric IDs; no exact named structure map or sufficient source rights evidence. No candidate assigned to target.'})
        blockers=[]
        if cs:
            blockers.append('Exact source-label candidate is not proof of complete anatomical structure; medical identity/extent and independent viewer integration still required.')
            if any(c['source']=='VOXEL-MAN' for c in cs):blockers.append('VOXEL-MAN physical spacing, anatomical orientation and body registration are unverified; isolated native voxel frame only.')
            if any(c.get('cropBoundary') for c in cs):blockers.append('Larynx touches source crop boundary; open surface must not be capped or counted as a complete larynx.')
            if any(c.get('nodeKind')=='PUBLISHER_GROUP' for c in cs):blockers.append('Publisher group contains component meshes; group name alone does not prove whole-structure geometry.')
            if any(c['source']=='OpenEar' for c in cs):blockers.append('OpenEar laterality and anatomical frame unspecified; no bilateral/mirrored structure claim.')
            status='SOURCE_LABEL_CANDIDATE_WITH_ACTUAL_BYTES_REVIEW_PENDING'
            nextAction='Validate source identity, extent, laterality and frame; retain isolated source rendering evidence; integrate only under exact rights and release gates.'
        else:
            status='NO_EXACT_LABEL_CANDIDATE_IN_THE_116_VERIFIED_SOURCE_FILES'
            blockers.append('No exact publisher label candidate in this bounded inventory replay. This is not a claim that no lawful source exists.')
            nextAction='Inspect the recorded discovery alternative at exact file/crosswalk level; acquire lawful source bytes and validate geometry, identity and laterality before conversion or coverage promotion.' if checks else 'Search lawful publisher datasets for this exact target; bind version, rights, source checksum and named geometry before conversion or coverage promotion.'
        if row['target'].startswith(('left ','right ')) and row['target'].split(' ',1)[1] in {'malleus','incus','stapes'}:
            blockers.append('Available OpenEar ossicle is unsided. It cannot satisfy this left/right target; no mirroring allowed.')
        if row['action']=='HOLD_EXTERNAL_RIGHTS_AND_CLINICAL_REVIEW':
            blockers.append('Existing external-source hold remains; decoded numeric components do not resolve named anatomy or redistribution rights.')
        rows.append({**row,'candidateStatus':status,'exactLabelCandidates':cs,'alternativesChecked':checks,'specificBlockers':blockers,'nextAction':nextAction,'wholeConceptCoveragePromoted':False,'releaseAuthorized':False})
    counts=collections.Counter(x['candidateStatus'] for x in rows)
    sourceCounts={s:len({x['target'] for x in rows if any(c['source']==s for c in x['exactLabelCandidates'])}) for s in ['VOXEL-MAN','OpenEar','HRA']}
    result={'schema':1,'scope':'Bounded executed replay of 118 target queue against 33 VOXEL-MAN GLBs, 3 unsided OpenEar GLBs and 80 HRA publisher GLBs. Exact name evidence only; no anatomy gap is automatically closed.','inputSHA256':{'queue':sha(queuePath.read_bytes()),'voxelmanManifest':sha(vmPath.read_bytes()),'openearReceipt':sha(oePath.read_bytes()),'hraLedger':sha(hPath.read_bytes()),'publisherDiscovery':sha(crossPath.read_bytes()),'peripheralDecodedAudit':sha(pPath.read_bytes())},'summary':{'baselineTargets':q['baselineTargets'],'queueRows':118,'sourceGLBsHashVerified':116,'candidateTargets':sum(bool(x['exactLabelCandidates']) for x in rows),'noExactCandidateTargets':sum(not x['exactLabelCandidates'] for x in rows),'candidateTargetsBySourceNonAdditive':sourceCounts,'statusCounts':dict(counts),'wholeStructuresRestored':0,'remainingAnatomicalValidationQueue':118,'externalHoldsPreserved':sum(x['action']=='HOLD_EXTERNAL_RIGHTS_AND_CLINICAL_REVIEW' for x in rows)},'labelPolicy':'Case and whitespace normalize only. HRA syntactic namespace/side conversion is explicit and does not infer ontology identity; recorded crosswalk labels require an exact actual node. No fuzzy, synonym, component-to-whole or side-to-bilateral match.','hraDiscoveryWithoutLocalSourceBytes':crossMissing,'notCheckedThisRun':['Open3DModel exact downloadable asset rights/geometry','Anatomia Aperta per-component rights and named nerve crosswalk','TotalSegmentator exact source/derivative commercial rights','Fresh SPL archive byte acquisition'], 'clinicalValidation':False,'registrationValidated':False,'releaseAuthorized':False,'publicRelease':'NO_GO','rows':rows}
    assert len(rows)==118 and result['summary']['candidateTargets']+result['summary']['noExactCandidateTargets']==118
    assert all(not x['wholeConceptCoveragePromoted'] and not x['releaseAuthorized'] for x in rows)
    out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result['summary'],sort_keys=True));print('receiptSHA256',sha(out.read_bytes()))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ['repo','voxelman','openear','cache','peripheral','out']:p.add_argument('--'+arg,required=True)
    main(p.parse_args())
