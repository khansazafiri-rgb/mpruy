"""Local-only CT exterior reconstruction. Requires numpy, scipy and vtk (bundled in Slicer)."""
from pathlib import Path
import json, struct, hashlib, time, gzip, re, argparse
import numpy as np
from scipy import ndimage as ndi
import vtk
from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy

def read_nrrd(path):
    with open(path,'rb') as f:
        header=[]
        while True:
            line=f.readline()
            if line in (b'\n',b'\r\n',b''):break
            header.append(line.decode('ascii'))
        fields={s.split(':',1)[0].strip().lower():s.split(':',1)[1].strip() for s in header if ':' in s and not s.startswith('#')}
        sizes=list(map(int,fields['sizes'].split()))
        types={'short':'i2','int16':'i2','unsigned short':'u2','ushort':'u2','float':'f4','uchar':'u1','unsigned char':'u1'}
        dtype=np.dtype(types[fields['type']]).newbyteorder('<' if fields.get('endian','little')=='little' else '>')
        raw=gzip.GzipFile(fileobj=f).read() if fields.get('encoding') in ('gzip','gz') else f.read()
    data=np.frombuffer(raw,dtype=dtype).reshape(sizes[::-1])
    if 'data file' in fields:raise ValueError('Use single-file NRRD')
    dirs=np.array([[float(x) for x in v.split(',')] for v in re.findall(r'\(([^)]+)\)',fields['space directions'])]).T
    origin=np.array([float(x) for x in fields['space origin'].strip('()').split(',')])
    units=re.findall(r'"([^"]+)"',fields.get('space units','"mm" "mm" "mm"'))
    factors={'mm':1,'millimeter':1,'millimeters':1,'cm':10,'m':1000}
    if len(units)!=3 or any(u not in factors for u in units):raise ValueError('Export NRRD in known spatial units, preferably mm')
    scale=np.array([factors[u] for u in units]);dirs=dirs*scale[:,None];origin=origin*scale
    space=fields.get('space','').lower()
    if space not in ('left-posterior-superior','right-anterior-superior'):raise ValueError('Explicit LPS/RAS geometry is required')
    affine=np.eye(4);affine[:3,:3]=dirs;affine[:3,3]=origin
    if space=='right-anterior-superior':affine=np.diag([-1,-1,1,1])@affine
    return data,affine

def largest(mask):
    labels,n=ndi.label(mask)
    if not n:raise ValueError('No body component; change threshold or supply corrected mask')
    counts=np.bincount(labels.ravel());counts[0]=0
    return labels==counts.argmax(),int(n)

def write_glb(path,points,faces):
    # glTF +X right, +Y superior, +Z posterior, in metres; determinant +1.
    points=np.asarray(points[:,[0,2,1]]*[-.001,.001,.001],dtype='<f4');faces=np.asarray(faces,dtype='<u4')
    payload=points.tobytes()+faces.tobytes();posbytes=points.nbytes
    doc={'asset':{'version':'2.0','generator':'MEDCOEL local CT reconstruction'},'scene':0,'scenes':[{'nodes':[0]}], 'nodes':[{'mesh':0}],
         'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1,'material':0}]}],
         'materials':[{'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[.68,.49,.39,1],'metallicFactor':0,'roughnessFactor':.85}}],
         'buffers':[{'byteLength':len(payload)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':posbytes,'target':34962},{'buffer':0,'byteOffset':posbytes,'byteLength':faces.nbytes,'target':34963}],
         'accessors':[{'bufferView':0,'componentType':5126,'count':len(points),'type':'VEC3','min':points.min(0).tolist(),'max':points.max(0).tolist()}, {'bufferView':1,'componentType':5125,'count':faces.size,'type':'SCALAR'}]}
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);payload+=b'\0'*((-len(payload))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(payload))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(payload),0x004e4942)+payload)

def reconstruct(data,affine,outdir,stride=2,threshold=-350,target_faces=16000,corrected_mask=None,roi=None,source_name='local CT',synthetic=False):
    start=time.perf_counter();outdir=Path(outdir);outdir.mkdir(parents=True,exist_ok=True)
    stride=max(1,int(stride));small=data[::stride,::stride,::stride]
    if corrected_mask is not None:
        if corrected_mask.shape!=data.shape:raise ValueError('Corrected mask geometry/shape must equal CT')
        mask=corrected_mask[::stride,::stride,::stride]>0;components=0
    else:
        mask=small>threshold
        if roi is not None:
            ijk=np.indices(mask.shape,dtype=np.float32)[::-1]*stride
            inside=np.ones(mask.shape,bool)
            for axis in range(3):inside&=(ijk[axis]>=roi[axis*2])&(ijk[axis]<=roi[axis*2+1])
            mask&=inside
        # Mild opening breaks narrow table/body bridges. Review is mandatory.
        mask=ndi.binary_opening(mask,iterations=1)
        mask,components=largest(mask)
        for k in range(len(mask)):mask[k]=ndi.binary_fill_holes(mask[k])
        mask=ndi.binary_closing(np.pad(mask,1),iterations=1)[1:-1,1:-1,1:-1]
        mask,_=largest(mask)
    contacts={name:bool(np.any(np.take(mask,i,axis=ax))) for name,ax,i in [('I−',2,0),('I+',2,-1),('J−',1,0),('J+',1,-1),('K−',0,0),('K+',0,-1)]}
    np.savez_compressed(outdir/'body-mask.npz',mask=mask,ijkToLPS=affine,stride=stride)
    padded=np.pad(mask.astype(np.uint8),1)
    image=vtk.vtkImageData();image.SetDimensions(*padded.shape[::-1]);image.GetPointData().SetScalars(numpy_to_vtk(padded.ravel(),deep=True,array_type=vtk.VTK_UNSIGNED_CHAR))
    iso=vtk.vtkFlyingEdges3D();iso.SetInputData(image);iso.SetValue(0,.5);iso.Update()
    poly=vtk.vtkPolyData();poly.DeepCopy(iso.GetOutput())
    pts=vtk_to_numpy(poly.GetPoints().GetData());ijk=(pts-1)*stride
    lps=ijk@affine[:3,:3].T+affine[:3,3];poly.GetPoints().SetData(numpy_to_vtk(lps,deep=True))
    smooth=vtk.vtkWindowedSincPolyDataFilter();smooth.SetInputData(poly);smooth.SetNumberOfIterations(10);smooth.SetPassBand(.15);smooth.BoundarySmoothingOff();smooth.FeatureEdgeSmoothingOff();smooth.NormalizeCoordinatesOn();smooth.Update()
    dec=vtk.vtkDecimatePro();dec.SetInputConnection(smooth.GetOutputPort());dec.SetTargetReduction(max(0,1-target_faces/max(1,smooth.GetOutput().GetNumberOfCells())));dec.PreserveTopologyOn();dec.SplittingOff();dec.Update()
    normals=vtk.vtkPolyDataNormals();normals.SetInputConnection(dec.GetOutputPort());normals.ConsistencyOn();normals.AutoOrientNormalsOn();normals.SplittingOff();normals.Update();mesh=normals.GetOutput()
    points=vtk_to_numpy(mesh.GetPoints().GetData()).copy();faces=vtk_to_numpy(mesh.GetPolys().GetData()).reshape(-1,4)[:,1:].copy()
    if len(points)<10:raise ValueError('Reconstruction empty')
    path=outdir/'patient.glb';write_glb(path,points,faces)
    # Sparse source values are a mismatch guard, not cryptographic CT identity.
    indices=[[int((n-1)*f) for n,f in zip(data.shape[::-1],fractions)] for fractions in [(a,b,c) for a in (.15,.35,.5,.65,.85) for b in (.2,.5,.8) for c in (.2,.5,.8)]]
    probes=[{'ijk':p,'value':float(data[p[2],p[1],p[0]])} for p in indices]
    inv=np.linalg.inv(affine);anchors=[]
    for index in np.linspace(0,len(points)-1,20,dtype=int):
        point=points[index];v=(inv@np.r_[point,1])[:3]
        anchors.append({'vertex':int(index),'ijk':v.tolist(),'lpsMM':point.tolist()})
    edges=vtk.vtkFeatureEdges();edges.SetInputData(mesh);edges.BoundaryEdgesOn();edges.NonManifoldEdgesOn();edges.FeatureEdgesOff();edges.ManifoldEdgesOff();edges.Update()
    meta={'schema':'medcoel.patient.v1','source':source_name,'synthetic':synthetic,'units':'metres','glbToLPS':[-1000,0,0,0,0,0,1000,0,0,1000,0,0,0,0,0,1],
          'ijkToLPS':affine.ravel().tolist(),'sizes':list(data.shape[::-1]),'samples':probes,'anchors':anchors,'meshSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),
          'qc':{'reviewRequired':True,'validatedAnatomy':False,'thresholdHU':threshold,'stride':stride,'correctedMask':corrected_mask is not None,'roiIJK':roi,'initialComponents':components,'touchesAcquisitionFaces':contacts,'artificialCapsAtTouchedFaces':True,'boundaryOrNonmanifoldEdges':edges.GetOutput().GetNumberOfCells(),'triangles':len(faces),'vertices':len(points),'elapsedSeconds':round(time.perf_counter()-start,3)},
          'limitations':['Threshold may merge bedding/table with skin: inspect and correct segmentation.','Padded acquisition ends are artificial caps, not anatomical skin.','Only acquired CT coverage is represented.']}
    (outdir/'registration.json').write_text(json.dumps(meta,indent=2))
    return meta

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('outdir');parser.add_argument('--stride',type=int,default=2);parser.add_argument('--threshold',type=float,default=-350);parser.add_argument('--target-faces',type=int,default=16000);parser.add_argument('--roi',nargs=6,type=int);parser.add_argument('--mask',help='Corrected single-file binary NRRD in exactly the CT geometry')
    args=parser.parse_args();data,affine=read_nrrd(args.input);mask=None
    if args.mask:
        mask,ma=read_nrrd(args.mask)
        if not np.allclose(ma,affine):raise ValueError('Mask affine differs from CT')
    print(json.dumps(reconstruct(data,affine,args.outdir,args.stride,args.threshold,args.target_faces,mask,args.roi,Path(args.input).name),indent=2))
