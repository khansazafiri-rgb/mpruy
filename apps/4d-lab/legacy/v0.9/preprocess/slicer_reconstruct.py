"""Run inside Slicer's Python console. Does not upload anything."""
from pathlib import Path
import sys
import numpy as np
import vtk
import slicer
sys.path.insert(0,str(Path(__file__).resolve().parent))
from reconstruct import reconstruct

def run(volumeNode,outputDirectory,segmentationNode=None,segmentId=None,stride=2,roi=None):
    if volumeNode.GetParentTransformNode():
        raise ValueError('Harden the volume transform first and save/reload the same NRRD in the scanner.')
    matrix=vtk.vtkMatrix4x4();volumeNode.GetIJKToRASMatrix(matrix)
    ras=np.array([[matrix.GetElement(r,c) for c in range(4)] for r in range(4)])
    lps=np.diag([-1,-1,1,1])@ras
    data=slicer.util.arrayFromVolume(volumeNode)  # view, not a duplicated CT
    mask=None
    if segmentationNode:
        if segmentationNode.GetParentTransformNode():raise ValueError('Harden segmentation transform first.')
        if not segmentId:raise ValueError('Choose the corrected exterior segment ID.')
        mask=slicer.util.arrayFromSegmentBinaryLabelmap(segmentationNode,segmentId,volumeNode)
    result=reconstruct(data,lps,outputDirectory,stride=stride,corrected_mask=mask,roi=roi,source_name=volumeNode.GetName())
    # Show the full-resolution-referenced mask overlay for human QC in Slicer.
    packed=np.load(Path(outputDirectory)/'body-mask.npz');small=packed['mask']
    label=slicer.mrmlScene.AddNewNodeByClass('vtkMRMLLabelMapVolumeNode','MEDCOEL exterior QC')
    down=ras.copy();down[:3,:3]*=stride
    dm=vtk.vtkMatrix4x4()
    for r in range(4):
        for c in range(4):dm.SetElement(r,c,float(down[r,c]))
    label.SetIJKToRASMatrix(dm);slicer.util.updateVolumeFromArray(label,small.astype(np.uint8));slicer.util.setSliceViewerLayers(background=volumeNode,label=label,labelOpacity=.25)
    print('Reconstruction exported locally. Review skin/table/crop boundaries before use.');return result
