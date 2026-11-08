"""Anatomy-inspired synthetic chest/abdomen fixture with table and lung cavities."""
from pathlib import Path
import gzip,json
import numpy as np
from reconstruct import reconstruct
out=Path(__file__).resolve().parents[1]/'assets';out.mkdir(exist_ok=True)
shape=(160,120,160);spacing=np.array([2.6,2.6,2.6]);origin=np.array([-206.7,-154.7,-206.7]);a=np.diag([*spacing,1.]);a[:3,3]=origin
k,j,i=np.indices(shape,dtype=np.float32);x=i*spacing[0]+origin[0];p=j*spacing[1]+origin[1];s=k*spacing[2]+origin[2]
# Torso with shoulder shelf, neck base, chest, waist and anterior relief.
rx=119+24*np.exp(-((s-107)/35)**2)-16*np.exp(-((s+99)/47)**2)
rx=np.where(s>134,45+(rx-45)*np.clip((174-s)/40,0,1),rx)
rz=78+15*np.exp(-((s-72)/65)**2)+10*np.exp(-((s+130)/50)**2)
rz=np.where(s>140,43+(rz-43)*np.clip((174-s)/34,0,1),rz)
center=-4*np.exp(-((s-75)/60)**2)
# Pectoral/anterior and scapular/posterior bulges are part of voxel geometry.
front=9*np.exp(-((np.abs(x)-58)/37)**2)*np.exp(-((s-76)/40)**2)
back=6*np.exp(-((np.abs(x)-64)/26)**2)*np.exp(-((s-94)/39)**2)
rz=rz+np.where(p<0,front,back)
body=(x/rx)**2+((p-center)/rz)**2<1
# Partial upper arms connected at shoulders, lower ends remain cropped.
arm=((np.abs(x)-154)/30)**2+((p-1)/46)**2<1
arm&=(s<114)&(s>-42)
shoulder=((np.abs(x)-128)/46)**2+(p/66)**2+((s-101)/44)**2<1
body|=arm|shoulder
body&=s<183
ct=np.where(body,45+8*np.sin(x*.08)*np.cos(s*.07),-1000).astype(np.int16)
lung=(((np.abs(x)-49)/39)**2+((p+1)/53)**2+((s-51)/92)**2<1)&body
ct[lung]=-780
heart=((x+12)/39)**2+((p+28)/33)**2+((s-25)/52)**2<1;ct[heart&body]=140
spine=(x/12)**2+((p-58)/12)**2<1;ct[spine&body]=700
# Disconnected table below posterior body, deliberately outside body mask.
table=(p>127)&(p<140)&(np.abs(x)<185);ct[table]=250
header='NRRD0005\ntype: short\ndimension: 3\nsizes: 160 120 160\nspace: left-posterior-superior\nspace directions: (2.6,0,0) (0,2.6,0) (0,0,2.6)\nspace origin: (-206.7,-154.7,-206.7)\nencoding: gzip\nendian: little\n\n'
(out/'synthetic-patient.nrrd').write_bytes(header.encode()+gzip.compress(ct.astype('<i2').tobytes(),mtime=0))
meta=reconstruct(ct,a,out,stride=2,target_faces=14000,source_name='Synthetic anatomical-region fixture',synthetic=True)
print(json.dumps(meta['qc'],indent=2))
