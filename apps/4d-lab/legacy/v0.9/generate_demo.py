import math, struct, gzip
from pathlib import Path
nx,ny,nz=84,96,100
out=bytearray(nx*ny*nz*2)
p=0
for k in range(nz):
  y=(k/(nz-1)-.5)*2
  for j in range(ny):
    z=(j/(ny-1)-.5)*2
    for i in range(nx):
      x=(i/(nx-1)-.5)*2
      shoulders=math.exp(-(((y-.55)/.23)**2));waist=math.exp(-(((y+.32)/.28)**2))
      rx=.77*(1+.16*shoulders-.13*waist);rz=.66*(1+.12*shoulders+.05*math.exp(-(((y+.48)/.3)**2)))
      r=(x/rx)**2+((z-.025*y)/rz)**2
      value=-1000
      if r<=1 and abs(y)<.94:
        value=58 + 8*math.sin(i*.17)*math.cos(j*.2)
        spine=(x/.13)**2+((z+.44)/.13)**2
        if spine<1 and y>-.8:value=720
        lungL=((x+.33)/.27)**2+((y-.20)/.53)**2+((z+.01)/.43)**2
        lungR=((x-.33)/.27)**2+((y-.20)/.53)**2+((z+.01)/.43)**2
        if lungL<1 or lungR<1:value=-760+18*math.sin(i*.5)*math.sin(k*.3)
        heart=((x-.08)/.28)**2+((y+.02)/.32)**2+((z-.09)/.29)**2
        if heart<1:value=118+14*math.sin(j*.17)
        heartCavity=((x-.03)/.11)**2+((y+.02)/.14)**2+((z-.14)/.12)**2
        if heartCavity<1:value=190
      struct.pack_into('<h',out,p,round(value));p+=2
header=f'''NRRD0005
# MEDCOEL synthetic teaching phantom; not patient imaging.
type: short
dimension: 3
sizes: {nx} {ny} {nz}
space: left-posterior-superior
space directions: (3.5,0,0) (0,3.2,0) (0,0,3.2)
space origin: (0,0,0)
endian: little
encoding: gzip

'''
path=Path(__file__).parent/'demo-phantom.nrrd'
path.write_bytes(header.encode()+gzip.compress(out,compresslevel=6))
print(path, path.stat().st_size)
