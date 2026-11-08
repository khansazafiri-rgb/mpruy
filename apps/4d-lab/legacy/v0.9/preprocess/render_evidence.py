"""Offline VTK reconstruction renders; explicitly not browser screenshots."""
from pathlib import Path
import json
import numpy as np
import vtk
from vtk.util.numpy_support import numpy_to_vtk
root=Path(__file__).resolve().parents[1];meta=json.loads((root/'assets/registration.json').read_text())
# Read our exported GLB binary positions/indices without a third-party mesh dependency.
import struct
raw=(root/'assets/patient.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);off=20+n+8
v=doc['bufferViews'][0];points=np.frombuffer(raw,dtype='<f4',count=v['byteLength']//4,offset=off+v['byteOffset']).reshape(-1,3)
lps=points[:,[0,2,1]]*[-1000,1000,1000]
v=doc['bufferViews'][1];faces=np.frombuffer(raw,dtype='<u4',count=v['byteLength']//4,offset=off+v['byteOffset']).reshape(-1,3)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
tri=lps[faces];normal=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);normal/=np.maximum(1e-9,np.linalg.norm(normal,axis=1))[:,None]
vertexNormals=np.zeros_like(lps)
for corner in range(3):np.add.at(vertexNormals,faces[:,corner],normal)
vertexNormals/=np.maximum(1e-9,np.linalg.norm(vertexNormals,axis=1))[:,None]
normal=vertexNormals[faces].mean(1)
light=np.array([-.3,-.6,.7]);light/=np.linalg.norm(light);shade=.45+.55*np.abs(normal@light)
colors=np.c_[shade[:,None]*np.array([.75,.58,.46]),np.ones(len(tri))]
for name,azimuth in [('anterior',-90),('posterior',90),('lateral',0)]:
 fig=plt.figure(figsize=(10,9),facecolor='#081723');ax=fig.add_subplot(111,projection='3d',computed_zorder=False);ax.set_facecolor('#081723')
 collection=Poly3DCollection(tri,facecolors=colors,edgecolors='none',zsort='average');ax.add_collection3d(collection)
 a=np.array(meta['ijkToLPS']).reshape(4,4);lo=a[:3,3];hi=lo+(np.array(meta['sizes'])-1)*np.diag(a)[:3]
 import itertools
 corners=np.array(list(itertools.product(*zip(lo,hi))))
 for i in range(8):
  for bit in (1,2,4):
   if not i&bit:
    q=corners[[i,i|bit]];ax.plot(q[:,0],q[:,1],q[:,2],color='#4b788e',linewidth=.7,zorder=0)
 ax.set_xlim(-220,220);ax.set_ylim(-220,220);ax.set_zlim(-220,220);ax.set_box_aspect((1,1,1));ax.view_init(elev=5,azim=azimuth);ax.set_axis_off()
 fig.text(.04,.94,'MEDCOEL | '+name.upper(),color='white',size=22)
 fig.text(.04,.88,'SYNTHETIC CT RECONSTRUCTION',color='#9fddd4',size=15)
 fig.text(.04,.07,'Offline mesh render - not browser evidence\n14,000 triangles | acquired-volume box | synthetic regional anatomy',color='#bdd3dc',size=12)
 fig.savefig(root/'evidence'/f'{name}.png',dpi=120,facecolor=fig.get_facecolor());plt.close(fig)
print('Saved three offline mesh renders.')
