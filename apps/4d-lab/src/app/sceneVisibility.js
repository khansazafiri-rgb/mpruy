// 3D educational imaging overlay visibility policy.
// Audio and auscultation should not show a USG/CT slice intersecting the patient.
// The 2D monitor can continue receiving CT/USG frames for reference: this controls
// only the textured plane/outline projected into the patient scene.
export function shouldShowImagingPlane({ tool, ws }) {
  return ws !== 'ausc' && tool !== 'stethoscope';
}
