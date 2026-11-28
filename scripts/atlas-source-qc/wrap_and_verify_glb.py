import array,hashlib,json,math,struct,sys
from pathlib import Path
ROOT=Path(sys.argv[1]).resolve();OUT=ROOT/'glb';OUT.mkdir(exist_ok=True,mode=0o700)
sha=lambda b:hashlib.sha256(b).hexdigest()
plan=json.loads((ROOT/'conversion-plan.json').read_text());source=json.loads((ROOT/'source/local-label-volume.json').read_text());counts=json.loads((ROOT/'meshes/voxel-counts.json').read_text());prior=json.loads((Path(__file__).resolve().parents[2]/'licensing/atlas-publication/checkpoint-evidence/sio-label-volume-audit-20261127.json').read_text())
assert len([k for k in counts if int(k)>0])==336 and sum(counts.values())==774*330*573
rows=[]
for r in plan['rows']:
 n=r['index'];base=ROOT/f'meshes/target-{n}';m=json.loads(base.with_suffix('.json').read_text());raw=base.with_suffix('.mesh').read_bytes();nv,nf=struct.unpack_from('<II',raw);assert nv==m['vertices'] and nf==m['triangles'] and len(raw)==8+nv*12+nf*12
 pos=raw[8:8+nv*12];indices=raw[8+nv*12:];v=array.array('f');v.frombytes(pos);ix=array.array('I');ix.frombytes(indices)
 assert v.itemsize==4 and ix.itemsize==4 and len(v)==nv*3 and len(ix)==nf*3 and all(math.isfinite(x) for x in v) and max(ix)<nv and min(ix)>=0
 lo=[min(v[a::3]) for a in range(3)];hi=[max(v[a::3]) for a in range(3)];assert all(0<=lo[a]<hi[a]<[774,330,573][a] for a in range(3))
 vox=sum(counts[str(i)] for i in r['labels']);assert vox==m['voxels'] and all(counts[str(i)]>0 for i in r['labels'])
 old=prior['targets'][r['name']]
 if len(r['labels'])==1:assert old['candidateLabelNumbers']==r['labels'] and old['voxelCounts']=={str(r['labels'][0]):vox}
 ident='sio-'+sha((source['canonicalU16LESHA256']+':'+','.join(map(str,r['labels']))).encode())[:24]
 binary=pos+indices
 doc={'asset':{'version':'2.0','generator':'MEDCOEL source-label Marching Cubes 0.5; Three.js MIT lookup table'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':r['name']}],'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1,'material':0,'mode':4}]}],'materials':[{'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[0.78,0.66,0.58,1.0],'metallicFactor':0,'roughnessFactor':0.82}}],'buffers':[{'byteLength':len(binary)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(pos),'target':34962},{'buffer':0,'byteOffset':len(pos),'byteLength':len(indices),'target':34963}],'accessors':[{'bufferView':0,'componentType':5126,'count':nv,'type':'VEC3','min':lo,'max':hi},{'bufferView':1,'componentType':5125,'count':nf*3,'type':'SCALAR','min':[0],'max':[max(ix)]}],'extras':{'source':'VOXEL-MAN segmented internal organs; Zenodo 15882019','sourceLabelNumbers':r['labels'],'sourceWorkbookRow':r['row'],'sourceWorkbookSHA256':source['labelFileSHA256'],'sourceDecodedLabelVolumeSHA256':source['canonicalU16LESHA256'],'coordinateFrame':'voxel-index-ZYX','voxelSpacingPhysicallyVerified':False,'classification':r['kind'],'touchesSourceVolumeBoundary':m['touchesSourceVolumeBoundary'],'wholeAnatomicalStructureValidated':False,'clinicalValidation':False,'registrationValidated':False,'approvedForDistribution':False}}
 meta=json.dumps(doc,separators=(',',':'),ensure_ascii=True).encode();meta+=b' '*(-len(meta)%4)
 data=struct.pack('<4sII',b'glTF',2,12+8+len(meta)+8+len(binary))+struct.pack('<I4s',len(meta),b'JSON')+meta+struct.pack('<I4s',len(binary),b'BIN\0')+binary
 file=OUT/(ident+'.glb');file.write_bytes(data);file.chmod(0o600)
 actual=file.read_bytes();magic,version,size=struct.unpack_from('<4sII',actual);jl,kind=struct.unpack_from('<I4s',actual,12);bound=json.loads(actual[20:20+jl]);bl,bk=struct.unpack_from('<I4s',actual,20+jl);payload=actual[28+jl:]
 assert (magic,version,size,kind,bk)==(b'glTF',2,len(actual),b'JSON',b'BIN\0') and bl==len(payload)==bound['buffers'][0]['byteLength']
 assert payload[:nv*12]==pos and payload[nv*12:]==indices and bound['nodes'][0]['name']==r['name'] and bound['extras']['sourceLabelNumbers']==r['labels']
 row={**r,**m,'id':ident,'path':str(file),'bytes':len(data),'sha256':sha(data),'positionBufferSHA256':sha(pos),'indexBufferSHA256':sha(indices),'triangles':nf,'vertices':nv,'voxelCount':vox,'labelIds':r['labels'],'sourceFrame':'voxel-index-ZYX','bounds':{'min':lo,'max':hi},'geometryRoundtrip':'PASS','currentBrowserRender':'PENDING','clinicalValidation':False,'wholeStructureValidated':False,'approvedForDistribution':False}
 rows.append(row)
report={'schema':1,'sourceDOI':'10.5281/zenodo.15882019','sourceLabelFileSHA256':source['labelFileSHA256'],'sourceDecodedLabelVolumeSHA256':source['canonicalU16LESHA256'],'sourceZipSHA256ReverifiedThisRun':source['sourceZipSHA256ReverifiedThisRun'],'sourceZipExpectedSHA256':prior['sourceArchive']['sha256'],'sourceExtraction':source['sourceExtraction'],'sourceLabelTIFFs':774,'shape':[774,330,573],'nonzeroSourceLabels':336,'workbookRowsVerified':202,'singleSourceLabelRepresentations':sum(len(r['labels'])==1 for r in rows),'publisherExplicitLabelUnions':sum(len(r['labels'])>1 for r in rows),'meshRoundtripPass':len(rows),'renderingPass':0,'triangles':sum(r['triangles'] for r in rows),'vertices':sum(r['vertices'] for r in rows),'glbBytes':sum(r['bytes'] for r in rows),'boundaryTruncated':sum(r['touchesSourceVolumeBoundary'] for r in rows),'wholeStructuresRestoredClaim':0,'readsCTorRGB':False,'coordinateFrameVerified':False,'clinicalValidation':False,'privacyReviewed':False,'approvedForDistribution':False,'publicRelease':'NO_GO','rows':rows}
(ROOT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='rows'},indent=2))
print('BOUNDARY',[(r['name'],r['triangles']) for r in rows if r['touchesSourceVolumeBoundary']])
