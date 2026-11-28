from pathlib import Path
import hashlib,json,struct,math,collections,datetime,sys
OUT=Path(sys.argv[1]).resolve(); SOURCE=Path(sys.argv[2]).resolve(); OUT.mkdir(exist_ok=True)
EXPECTED={'Incus':'5f0430a838001558e891469b6a6d66f4','Malleus':'46619b2950cb568d14d1e381df5cf197','Stapes':'a7f5acd451088b2efa6ab6bc30990bfe'}
AUTHORS=['Daniel Manuel Sieber','Steven Arild Wuyts Andersen','Mads Sølvsten Sørensen','Peter Trier Mikkelsen']
sha=lambda b:hashlib.sha256(b).hexdigest()
rows=[]
for name,md5 in EXPECTED.items():
 raw=(SOURCE/(name+'.ply')).read_bytes(); assert hashlib.md5(raw).hexdigest()==md5
 (OUT/(name+'.ply')).write_bytes(raw)
 lines=raw.decode('ascii').splitlines();end=lines.index('end_header');header=lines[:end]
 assert 'format ascii 1.0' in header
 nv=int(next(x for x in header if x.startswith('element vertex ')).split()[-1]); nf=int(next(x for x in header if x.startswith('element face ')).split()[-1])
 pts=[];colors=[]
 for line in lines[end+1:end+1+nv]:
  fields=line.split(); assert len(fields)==6
  p=list(map(float,fields[:3]));c=list(map(int,fields[3:]));assert all(map(math.isfinite,p));assert all(0<=v<=255 for v in c)
  pts.append(p);colors.append(c)
 faces=[]
 for line in lines[end+1+nv:end+1+nv+nf]:
  f=list(map(int,line.split()));assert f[0]==3 and len(f)==4;assert all(0<=i<nv for i in f[1:]);faces.append(f[1:])
 assert len(pts)==nv and len(faces)==nf
 bounds={'min':[min(p[a] for p in pts) for a in range(3)],'max':[max(p[a] for p in pts) for a in range(3)]}
 edges=collections.Counter();degenerate=0;area=0
 for f in faces:
  for a,b in zip(f,f[1:]+f[:1]):edges[tuple(sorted((a,b)))]+=1
  u=[pts[f[1]][a]-pts[f[0]][a] for a in range(3)];v=[pts[f[2]][a]-pts[f[0]][a] for a in range(3)]
  cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];ar=math.sqrt(sum(x*x for x in cross))/2;area+=ar
  if ar<=1e-15:degenerate+=1
 parent=list(range(nv))
 def find(i):
  while parent[i]!=i: parent[i]=parent[parent[i]];i=parent[i]
  return i
 for f in faces:
  for i in f[1:]:parent[find(i)]=find(f[0])
 parts=len({find(i) for i in range(nv)})
 binary=bytearray();views=[];accessors=[]
 def add(data,target,component,count,kind,normalized=False,**more):
  while len(binary)%4:binary.append(0)
  offset=len(binary);binary.extend(data);vi=len(views);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(data),'target':target})
  acc={'bufferView':vi,'componentType':component,'count':count,'type':kind,**more}
  if normalized:acc['normalized']=True
  accessors.append(acc);return len(accessors)-1
 pi=add(struct.pack('<'+'f'*(3*nv),*(v for p in pts for v in p)),34962,5126,nv,'VEC3',**bounds)
 # glTF vertex colors are linear; PLY source bytes are treated as sRGB by Three PLYLoader.
 def linear(c):
  s=c/255
  return s/12.92 if s<0.04045 else ((s+0.055)/1.055)**2.4
 ci=add(struct.pack('<'+'f'*(3*nv),*(linear(v) for c in colors for v in c)),34962,5126,nv,'VEC3')
 ii=add(struct.pack('<'+'H'*(3*nf),*(v for f in faces for v in f)),34963,5123,3*nf,'SCALAR')
 meta={'source':'https://zenodo.org/records/4362584','sourceFile':name+'.ply','sourceSHA256':sha(raw),'license':'CC-BY-4.0','authors':AUTHORS,'laterality':'unspecified','sourceFrame':'preserved; source units and anatomical registration not established','anatomicalCoverage':'publisher named individual ossicle; no side inferred','changes':'ASCII PLY to glTF 2.0 GLB; coordinates and triangle indices preserved; source RGB converted from sRGB to glTF linear vertex color'}
 doc={'asset':{'version':'2.0','generator':'MEDCOEL independent OpenEar PLY converter','copyright':'; '.join(AUTHORS)+'; CC BY 4.0; doi:10.5281/zenodo.4362584'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':name,'mesh':0,'extras':meta}],'meshes':[{'name':name,'primitives':[{'attributes':{'POSITION':pi,'COLOR_0':ci},'indices':ii,'material':0,'mode':4}]}],'materials':[{'name':'OpenEar source vertex colors','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':0.7},'doubleSided':False}],'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':accessors,'extras':meta}
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4)
 result=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
 out=OUT/(name.lower()+'.glb');out.write_bytes(result)
 rows.append({'target':name.lower(),'publisherLabel':name,'sourceURL':'https://zenodo.org/records/4362584/files/'+name+'.ply?download=1','sourceFile':name+'.ply','sourceBytes':len(raw),'publisherMD5':md5,'actualMD5':hashlib.md5(raw).hexdigest(),'sourceSHA256':sha(raw),'outputFile':out.name,'outputBytes':len(result),'outputSHA256':sha(result),'vertexCount':nv,'triangleCount':nf,'bounds':bounds,'finitePositions':True,'indicesInBounds':True,'degenerateTriangles':degenerate,'connectedComponents':parts,'boundaryEdges':sum(n==1 for n in edges.values()),'nonManifoldEdges':sum(n>2 for n in edges.values()),'surfaceAreaSourceUnitsSquared':area,'laterality':'UNSPECIFIED','transform':{'translation':[0,0,0],'rotation':[0,0,0,1],'scale':[1,1,1]},'registrationValidated':False,'clinicalValidation':False,'renderVerified':False,'coveragePromoted':False,'status':'ACQUIRED_CHECKSUM_AND_GEOMETRY_PASS_RENDER_AND_IDENTITY_REVIEW_PENDING'})
report={'schema':1,'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'recordURL':'https://zenodo.org/records/4362584','doi':'10.5281/zenodo.4362584','title':'OpenEar color example from Visible Ear Simulator anatomy Delta','authors':AUTHORS,'published':'2021-09-01','recordModified':'2024-07-19','license':'CC-BY-4.0','licenseURL':'https://creativecommons.org/licenses/by/4.0/legalcode','licenseEvidence':'Official Zenodo record Rights section observed in native Safari 2026-11-27; record file table MD5 checked against downloaded bytes.','downloadedSourceFiles':3,'checksumPassed':3,'convertedGLB':3,'wholeConceptCoveragePromoted':0,'browserRenderingVerified':0,'rows':rows,'limitations':['Publisher record does not specify laterality; no left/right claims or mirroring.','Source units, anatomical orientation, and transform into MEDCOEL full-body frame unestablished; use isolated source-frame review only.','Clinical identity validation, actual browser rendering and viewer integration are pending.','Dataset rights do not cover Visible Ear Simulator software or UI.','Source includes surface geometry and vertex color only; record provides no separate donor consent document.']}
(OUT/'openear-acquisition-geometry-report-20261127.json').write_text(json.dumps(report,indent=2)+'\n')
(OUT/'ATTRIBUTION.md').write_text('OpenEar color example from Visible Ear Simulator anatomy Delta\n\nDaniel Manuel Sieber, Steven Arild Wuyts Andersen, Mads Sølvsten Sørensen, Peter Trier Mikkelsen (2021). Zenodo. https://doi.org/10.5281/zenodo.4362584\n\nLicensed under Creative Commons Attribution 4.0 International: https://creativecommons.org/licenses/by/4.0/\n\nModified by MEDCOEL: PLY to GLB conversion, preserving geometry and original source frame; source sRGB vertex colors converted to glTF linear vertex colors. No anatomical side, source unit, whole-body registration, or clinical completeness has been inferred. This does not imply endorsement by the authors.\n')
print(json.dumps([{'name':r['target'],'vertices':r['vertexCount'],'triangles':r['triangleCount'],'boundary':r['boundaryEdges'],'nonmanifold':r['nonManifoldEdges'],'degenerate':r['degenerateTriangles'],'components':r['connectedComponents'],'glbBytes':r['outputBytes']}for r in rows],indent=2))
