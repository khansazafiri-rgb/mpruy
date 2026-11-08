from pathlib import Path
import numpy as np,json,tempfile
from reconstruct import read_nrrd,reconstruct
root=Path(__file__).resolve().parents[1];data,affine=read_nrrd(root/'assets/synthetic-patient.nrrd');pack=np.load(root/'assets/body-mask.npz');mask=pack['mask'];stride=int(pack['stride'])
def voxel(lps):return np.rint((np.linalg.inv(affine)@np.r_[lps,1])[:3]/stride).astype(int)[::-1]
assert mask[tuple(voxel([49,0,51]))], 'Fill internal lung cavity for exterior surface'
assert not mask[tuple(voxel([0,134,0]))], 'Remove disconnected table'
assert not mask[tuple(voxel([190,-130,0]))], 'Surrounding air excluded'
meta=json.loads((root/'assets/registration.json').read_text());assert meta['qc']['triangles']<=16000;assert meta['qc']['boundaryOrNonmanifoldEdges']==0
# Correction route uses the supplied binary mask and retains exactly the CT affine.
a=np.zeros((24,24,24),np.int16)-1000;a[4:20,4:20,4:20]=50;correct=a>0;m=np.diag([2.,3.,4.,1.]);m[:3,3]=[12,-22,31]
with tempfile.TemporaryDirectory() as out:
 r=reconstruct(a,m,out,stride=1,corrected_mask=correct,target_faces=2000)
 assert r['qc']['correctedMask'];assert np.allclose(np.array(r['ijkToLPS']).reshape(4,4),m)
print('PASS: source NRRD affine, table/air removal, cavity filling, closed mesh budget and corrected-segmentation route.')
