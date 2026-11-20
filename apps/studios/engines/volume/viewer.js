// Volume engine (MRI and CT): NiiVue for GPU multiplanar rendering, plus MEDCOEL helpers that keep every
// readout in the image's own world space (the NIfTI affine). Labels are looked up with the SAME affine the overlay uses.
import { Niivue, SLICE_TYPE, DRAG_MODE } from '@niivue/niivue';
import { worldToVoxel } from './nifti.js';

export const VIEWS = { multiplanar: SLICE_TYPE.MULTIPLANAR, axial: SLICE_TYPE.AXIAL, coronal: SLICE_TYPE.CORONAL, sagittal: SLICE_TYPE.SAGITTAL, render: SLICE_TYPE.RENDER };

export async function createVolumeViewer(canvas, { onLocation = () => {}, background = [0, 0, 0, 1] } = {}) {
  const nv = new Niivue({
    backColor: background, crosshairColor: [0.1, 0.85, 0.6, 1], show3Dcrosshair: true, isOrientCube: false,
    isRadiologicalConvention: false, multiplanarForceRender: false, dragAndDropEnabled: false, loadingText: 'Memuat volume…',
    isColorbar: false, textHeight: 0.04, isOrientationTextVisible: true,
  });
  await nv.attachToCanvas(canvas);
  nv.opts.dragMode = DRAG_MODE.pan;
  let labelVolume = null, view = 'multiplanar';
  const state = { mm: [0, 0, 0], vox: [0, 0, 0], value: null, label: 0, view, zoom: 1, moves: 0 };
  nv.onLocationChange = data => {
    state.mm = Array.from(data.mm || [0, 0, 0]).slice(0, 3);
    state.vox = Array.from(data.vox || [0, 0, 0]);
    state.value = data.values?.[0]?.value ?? null;
    state.label = labelAt(state.mm);
    state.moves++;
    onLocation({ ...state });
  };
  function labelAt(mm) {
    if (!labelVolume) return 0;
    const [i, j, k] = worldToVoxel(labelVolume.affine, mm).map(Math.round);
    const [X, Y, Z] = labelVolume.dims;
    if (i < 0 || j < 0 || k < 0 || i >= X || j >= Y || k >= Z) return 0;
    return labelVolume.data[i + X * (j + Y * k)];
  }
  return {
    nv, state,
    async load(volumes) { await nv.loadVolumes(volumes); },
    /** Parsed label volume (same grid as the image, validated by the caller) used for structure lookup. */
    setLabelVolume(vol) { labelVolume = vol; state.label = labelAt(state.mm); },
    setLabelColormap(index, structures) {
      const max = Math.max(...structures.map(s => s.id));
      const R = [], G = [], B = [], A = [], I = [], labels = [];
      for (let id = 0; id <= max; id++) {
        const s = structures.find(x => x.id === id);
        I.push(id); R.push(s ? s.rgb[0] : 0); G.push(s ? s.rgb[1] : 0); B.push(s ? s.rgb[2] : 0); A.push(s ? 255 : 0); labels.push(s ? s.nameEn : '');
      }
      nv.volumes[index].setColormapLabel({ R, G, B, A, I, labels });
      nv.updateGLVolume();
    },
    setView(name) { if (!(name in VIEWS)) return; view = name; state.view = name; nv.setSliceType(VIEWS[name]); onLocation({ ...state }); },
    setWindow(index, min, max) { const v = nv.volumes[index]; if (!v) return; v.cal_min = min; v.cal_max = max; nv.updateGLVolume(); },
    setOpacity(index, value) { if (nv.volumes[index]) nv.setOpacity(index, value); },
    /** Move the shared crosshair to a world coordinate (mm); all three planes follow. */
    setCrosshairMm(mm) { nv.scene.crosshairPos = nv.mm2frac(mm); nv.drawScene(); nv.createOnLocationChange?.(); state.mm = mm.slice(); state.label = labelAt(mm); onLocation({ ...state }); },
    zoom(factor) { const p = nv.scene.pan2Dxyzmm; nv.setPan2Dxyzmm([p[0], p[1], p[2], Math.max(0.5, Math.min(8, p[3] * factor))]); state.zoom = nv.scene.pan2Dxyzmm[3]; onLocation({ ...state }); },
    reset() { nv.setPan2Dxyzmm([0, 0, 0, 1]); nv.scene.crosshairPos = [0.5, 0.5, 0.5]; this.setView('multiplanar'); nv.drawScene(); state.zoom = 1; },
    labelAt,
    dispose() { try { nv.gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* already gone */ } },
  };
}
