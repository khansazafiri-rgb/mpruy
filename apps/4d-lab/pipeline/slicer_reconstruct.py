"""Run inside 3D Slicer's Python Interactor (macOS/Windows/Linux). Nothing is uploaded.

    import sys; sys.path.insert(0, '/path/to/mpruy/apps/4d-lab/pipeline')
    import slicer_reconstruct as med
    med.run(slicer.util.getNode('CTACardio'), '/Users/you/Documents/MEDCOEL-CTACardio')
    # optional corrected exterior segment and/or organ label map:
    med.run(volume, outdir, segmentationNode=seg, segmentId=seg.GetSegmentation().GetNthSegmentID(0), labelmapNode=labels)

Exports ct.nrrd (the exact grid the browser must load), skin.glb, optional organs.glb + labels.nrrd,
registration.json and qc.json. Load these files together in the 4D Lab "Data" tab.
"""
from pathlib import Path
import sys
import numpy as np
import vtk
import slicer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from reconstruct import reconstruct_ct  # noqa: E402
from nrrd_io import write_nrrd  # noqa: E402


def _lps_affine(node):
    m = vtk.vtkMatrix4x4(); node.GetIJKToRASMatrix(m)
    ras = np.array([[m.GetElement(r, c) for c in range(4)] for r in range(4)])
    return np.diag([-1, -1, 1, 1]) @ ras


def run(volumeNode, outputDirectory, segmentationNode=None, segmentId=None, labelmapNode=None, threshold=-350):
    if volumeNode.GetParentTransformNode():
        raise ValueError('Harden the volume transform first, save it, and use that saved NRRD everywhere.')
    out = Path(outputDirectory); out.mkdir(parents=True, exist_ok=True)
    affine = _lps_affine(volumeNode)
    ct = slicer.util.arrayFromVolume(volumeNode)  # [k, j, i] view
    mask = labels = None
    if segmentationNode is not None:
        if segmentationNode.GetParentTransformNode():
            raise ValueError('Harden the segmentation transform first.')
        if not segmentId:
            raise ValueError('Pass the corrected exterior segment ID.')
        mask = slicer.util.arrayFromSegmentBinaryLabelmap(segmentationNode, segmentId, volumeNode)
    if labelmapNode is not None:
        if not np.allclose(_lps_affine(labelmapNode), affine, atol=1e-3):
            raise ValueError('Label map geometry differs from the CT: resample it to the CT first.')
        labels = slicer.util.arrayFromVolume(labelmapNode).astype(np.uint8)
        write_nrrd(out / 'labels.nrrd', labels, affine, comment='local label map (do not commit)')
    write_nrrd(out / 'ct.nrrd', ct.astype(np.int16), affine, comment='local CT copy for the 4D Lab (do not commit)')
    reg, body = reconstruct_ct(ct, affine, out, labels, mask, threshold, source_name=volumeNode.GetName())
    qc = slicer.mrmlScene.AddNewNodeByClass('vtkMRMLLabelMapVolumeNode', 'MEDCOEL exterior QC')
    qc.CopyOrientation(volumeNode); slicer.util.updateVolumeFromArray(qc, body.astype(np.uint8))
    slicer.util.setSliceViewerLayers(background=volumeNode, label=qc, labelOpacity=0.25)
    print('Exported to', out, '- review skin, table and crop boundaries before teaching use.')
    return reg
