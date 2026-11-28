import array,json,mmap,os,struct,subprocess,sys
from pathlib import Path
R=Path(sys.argv[1]).resolve();T=R/'selftest';T.mkdir(exist_ok=True)
plan=json.loads((R/'conversion-plan.json').read_text())['rows'];counts=json.loads((R/'meshes/voxel-counts.json').read_text());p=T/'fixture.raw'
with p.open('wb') as f:f.truncate(774*330*573*2)
def at(z,y,x):return ((z*330+y)*573+x)*2
with p.open('r+b') as f:
 with mmap.mmap(f.fileno(),0) as m:
  used=set()
  for t in plan:
   base=20+t['index']*10;k=0
   for z in range(base,base+3):
    for y in range(30,34):
     for x in range(40,45):
      l=t['labels'][k%len(t['labels'])];k+=1;used.add(l);struct.pack_into('<H',m,at(z,y,x),l)
  extra=[int(k) for k in counts if int(k)>0 and int(k) not in used]
  for j,l in enumerate(extra):struct.pack_into('<H',m,at(750,310,j),l)
result=subprocess.run([str(R/'mesh_source'),str(p),str(R/'conversion-plan.txt'),str(T)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,check=True)
(R/'selftest.log').write_text(result.stdout)
report=[]
for t in plan:
 meta=json.loads((T/f"target-{t['index']}.json").read_text());b=(T/f"target-{t['index']}.mesh").read_bytes();nv,nf=struct.unpack_from('<II',b);v=array.array('f');v.frombytes(b[8:8+nv*12]);ix=array.array('I');ix.frombytes(b[8+nv*12:])
 lo=[min(v[a::3]) for a in range(3)];hi=[max(v[a::3]) for a in range(3)];z=20+t['index']*10
 assert lo==[z-.5,29.5,39.5] and hi==[z+2.5,33.5,44.5] and (nv,nf)==(94,184) and meta['voxels']==60
 signed=0;edges={}
 for q in range(0,len(ix),3):
  aa,bb,cc=ix[q:q+3];a=v[aa*3:aa*3+3];b=v[bb*3:bb*3+3];c=v[cc*3:cc*3+3]
  signed+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
  for l,r in [(aa,bb),(bb,cc),(cc,aa)]:
   k=tuple(sorted((l,r)));edges[k]=edges.get(k,0)+1
 assert all(n==2 for n in edges.values()) and nv-len(edges)+nf==2 and signed>0
 report.append({'index':t['index'],'vertices':nv,'triangles':nf,'signedVolume':round(signed,8),'closedManifold':True,'EulerCharacteristic':2})
(R/'converter-selftest-report.json').write_text(json.dumps({'schema':1,'engineeringFixtureOnly':True,'tested':len(report),'passedBoundsCountsAndManifold':len(report),'outwardWindingPassed':all(r['signedVolume']>0 for r in report),'rows':report},indent=2)+'\n')
print(json.dumps({'tested':len(report),'boundsManifold':len(report),'signedVolumeFirst':report[0]['signedVolume'],'outwardAll':all(r['signedVolume']>0 for r in report)}))
