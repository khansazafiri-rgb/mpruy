// MEDCOEL Anatomy Live 4D Lab — workstation controller.
import { parseNrrd } from '../core/nrrd.js';
import { makeVolume, sameGrid } from '../core/volume.js';
import { validateRegistration } from '../core/mesh.js';
import { clinicalPose, freePose, freeQuat, freeAngles, FREE_PRESETS, imagingPlane, PROBES, rotateFree, CLINICAL_LIMITS, fovOutline } from '../core/probe.js';
import { CT_PRESETS } from '../core/reslice.js';
import { DEFAULT_PHYSIOLOGY, createClock, advanceClock, makeFrame, prepareGeometry, displacement, deformPositions, modelEjectionFraction, cardiacState, respState, antralContraction, systoleSeconds } from '../sim/physiology.js';
import { SCENARIOS, applyScenario, buildEffusion, buildLayer, motilityIndex } from '../sim/pathology.js';
import { cloneTissues, TISSUES, impedance } from '../sim/tissues.js';
import { siteMix, heartCycle } from '../sim/auscultation.js';
import { VIEWS, snapToSkin } from '../sim/views.js';
import { REFERENCES } from '../sim/references.js';
import { PatientScene } from './scene3d.js';
import { imagingAvailability } from './regionCoverage.js';
import { shouldShowImagingPlane, shouldShowStethoscope } from './sceneVisibility.js';
import { Monitor, drawStrip } from './monitor.js';
import { AudioEngine } from './audio.js';
import { voxelSurface } from './blobMesh.js';
import { AtlasLayer, ATLAS_GROUPS } from './atlasLayer.js';
import { buildAtlasPanel, frameSummary } from './atlasPanel.js';
import { axisColor } from './controlBar.js';
import { buildPad, PAD_DIRS } from './probePad.js';
import { CONTROL_MODES, ORIENTATION_PRESETS } from './axisControl.js';
import { translate as axisTranslate, rotate as axisRotate, selectSide as axisSelectSide } from './axisMove.js';
import { Assist } from './assist.js';
import { Learn } from './learn.js';
import { startTutorial } from './tutorial.js';
import { generalSteps, triSteps } from './tutorialSteps.js';
import { triPlanes, stepSlice, sliceLabel, clampToBounds, MPR } from '../core/mpr.js';
import { pixelToLPS } from '../core/labels.js';
import { STRUCTURES, unavailableStructures } from '../edu/structures.js';
import { CASES, FIDELITY } from '../edu/pathologyCases.js';
import { SITE_GUIDE, ADVENTITIOUS } from '../edu/auscultationGuide.js';
import { EDU_REFERENCES } from '../edu/references.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
};
const BASE = import.meta.env.BASE_URL;
const QUERY = new URLSearchParams(location.search);
/** Bundled datasets. 'atlas' (default) is generated from the MEDCOEL Anatomy Atlas meshes; 'phantom' is the earlier procedural phantom. */
export const DATASETS = {
  atlas: { dir: BASE + 'data/atlas/', label: 'Atlas MEDCOEL · CT sintetis berbasis atlas' },
  phantom: { dir: BASE + 'data/phantom/', label: 'Phantom prosedural v1 (tanpa atlas)' },
};
const DATASET = DATASETS[QUERY.get('dataset')] ? QUERY.get('dataset') : 'atlas';
let DATA = DATASETS[DATASET].dir;
// The Lab owns a dedicated static asset-only pack of the documented atlas-derived models.
// It never loads nqwrc/3d-anatomy application code or depends on the NC Atlas Viewer route.
// Commercial publication still requires source-asset provenance and code-rights clearance.
const ATLAS_BASE = BASE + 'atlas-assets/';
// A view whose target organ is withheld (licence quarantine) says so instead of implying it is imaged.
const labelUnavailable = (id) => D?.anatomy?.labels?.some((l) => l.id === id && l.available === false);
const viewLabel = (v) => (v.key === 'ruq' && labelUnavailable(20) ? 'RUQ / hepatorenal (ginjal tidak tersedia)' : v.labelId);
const DEFAULT_ATLAS_SYSTEMS = ['visceral', 'cardiovascular', 'skeletal', 'lymphatic'];
const SUGGESTED_VIEW = { hfref: 'apical', effusion: 'right_flank', gastroparesis: 'epigastric', normal: 'subxiphoid', pericardial: 'subxiphoid', ascites: 'ruq', retention: 'bladder' };
/** Datasets may name their own teaching window per scenario (e.g. the clearest cardiac window of the atlas body). */
const suggestedView = (key) => D?.anatomy?.suggestedViews?.[key] || SUGGESTED_VIEW[key];

// ------------------------------------------------------------------ state
const S = {
  mode: 'clinical', tool: 'probe', probeKey: 'phased', navStep: 10,
  contact: null, angles: { rotate: 0, heelToe: 0, rock: 0 },
  free: { position: [20, 0, 40], q: freeQuat(FREE_PRESETS.coronal), size: { width: 260, height: 260 } },
  precision: { mm: 1, deg: 1 },
  us: { freq: 2.5, depth: 160, gain: 0, dynamicRange: 52, tgc: [0, 0, 0], autoTGC: true, focusFraction: 0.5, coupling: 'skin' },
  ct: { window: 400, level: 40, clip: true },
  display: 'split',
  params: { ...DEFAULT_PHYSIOLOGY }, playing: true, speed: 1,
  scenario: 'normal', compareNormal: false,
  tissues: cloneTissues(),
  appearance: { mode: 'external', atlasOpacity: 1, skinOpacity: 1, cutaway: 'none', cutDepth: 40, showCoverage: true, systems: { skeleton: true, cardiovascular: true, respiratory: true, abdominal: true, urinary: true, nervous: false, pathology: true } },
  steth: { point: null, normal: null, ref: null, normal0: null, filter: 'diaphragm', volume: 0.7 },
  view: 'subxiphoid',
  // axis-first control: WHAT is being changed (one quantity at a time); rings are an opt-in advanced tool
  ctl: { mode: 'place', stepMM: 5, stepDeg: 5, angleClinical: 'rotate', angleFree: 'pitch', rings: false },
  tri: { point: null }, ws: 'imaging', adventitious: 'none',
};
const clock = createClock();
const audio = new AudioEngine();
let D = null; // loaded data
let scene = null, monitor = null, worker = null, geom = null, atlas = null, atlasState = 'none', inEnvelope = null;
let lastAtlasDeform = 0, atlasDeformMs = 0, atlasMoving = 0, atlasDeformClockT = -1, selected = null;
let effusion = null, assist = null, learn = null;
let dirty = true, interacting = false, lastInteraction = 0, workerBusy = false, pending = false, lastFrameInfo = null, frameCount = 0;
let lastDeform = 0, motionShown = null;
const stats = { usMs: 0, deformMs: 0, fps: 0 };
window.__lab = { S, clock, stats, DATASET, physio: { displacement, makeFrame, effectiveParams: () => effectiveParams(), get geom() { return geom; } }, get atlas() { return atlas; }, get atlasState() { return atlasState; }, get atlasStats() { return { deformMs: atlasDeformMs, moving: atlasMoving, clockT: atlasDeformClockT }; }, audio, get assist() { return assist; }, get learn() { return learn; }, get scene() { return scene; }, get monitor() { return monitor; }, get data() { return D; }, get last() { return lastFrameInfo; }, get effusion() { return effusion; } };

function markDirty() { dirty = true; }
function touch() { interacting = true; lastInteraction = performance.now(); markDirty(); }
function effectiveParams() { return S.compareNormal ? { ...applyScenario(DEFAULT_PHYSIOLOGY, 'normal'), ...pick(S.params, ['heartRate', 'respRate', 'breathDepth', 'breathHold', 'cardiacEnabled', 'respirationEnabled', 'peristalsisEnabled']) } : S.params; }
function effusionMl() { return S.compareNormal ? 0 : SCENARIOS[S.scenario].effusionMl; }
function layerSpec() { return S.compareNormal ? null : SCENARIOS[S.scenario].layer || null; }
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

// ------------------------------------------------------------------ data loading
async function fetchBuf(name) {
  const r = await fetch(DATA + name, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Gagal memuat ${name} (HTTP ${r.status})`);
  return r.arrayBuffer();
}
function status(text, kind = 'info') { const s = $('#loadStatus'); if (s) { s.textContent = text; s.dataset.kind = kind; } }

async function loadPhantom() { // bundled dataset (atlas-derived by default; ?dataset=phantom for the procedural phantom)
  status(`Memuat ${DATASETS[DATASET].label} (CT, label, mesh)…`);
  const reg = await fetch(DATA + 'registration.json').then((r) => r.json());
  const meshFiles = (reg.meshes || []).map((m) => m.file);
  const [ctBuf, labBuf, anatomy, ...bufs] = await Promise.all([fetchBuf('ct.nrrd'), fetchBuf('labels.nrrd'), fetch(DATA + 'anatomy.json').then((r) => r.json()), ...meshFiles.map(fetchBuf)]);
  const files = Object.fromEntries(meshFiles.map((f, i) => [f, bufs[i]]));
  await useDataset({ ctBuf, labBuf, anatomy, reg, files, source: DATASET, name: DATASET === 'atlas' ? 'MEDCOEL atlas-derived synthetic CT' : 'MEDCOEL synthetic phantom' });
}

async function useDataset({ ctBuf, labBuf, anatomy, reg, files, source, name }) {
  const t0 = performance.now();
  const ct = makeVolume(await parseNrrd(ctBuf.slice(0), 'ct.nrrd'));
  let labels = labBuf ? makeVolume(await parseNrrd(labBuf.slice(0), 'labels.nrrd')) : null;
  if (labels && !sameGrid(ct, labels)) { labels = null; status('Label map tidak sama grid dengan CT; diabaikan.', 'warn'); }
  let meshes = null, regErrors = [];
  if (reg && files) {
    const v = await validateRegistration(reg, ct, files);
    regErrors = v.errors; if (v.ok) meshes = v.meshes;
  }
  D = { ct, labels, anatomy: anatomy || null, reg, meshes, source, name, regErrors, loadMs: performance.now() - t0 };
  // Patient-space points belong to a particular volume/mesh registration.
  S.contact = null; S.tri.point = null;
  S.steth.ref = S.steth.point = S.steth.normal = S.steth.key = null;
  // Identification uses ONLY this dataset's own label table: a local CT without anatomy.json gets no names.
  assist.setLabels(labels ? anatomy?.labels || [] : []); centroidCache.clear();
  geom = anatomy?.heart ? prepareGeometry(anatomy) : null;
  if (!geom) { S.params.cardiacEnabled = S.params.respirationEnabled = S.params.peristalsisEnabled = false; }
  // imaging worker gets its own copy of the compressed data
  worker?.terminate();
  worker = new Worker(new URL('./imaging.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = onWorker;
  worker.onerror = (e) => fail('Worker pencitraan gagal: ' + (e.message || 'unknown'));
  await new Promise((res, rej) => {
    const h = (e) => { if (e.data.type === 'loaded') { worker.removeEventListener('message', h); res(); } else if (e.data.type === 'error') rej(new Error(e.data.message)); };
    worker.addEventListener('message', h);
    worker.postMessage({ type: 'load', ctBuffer: ctBuf, labelBuffer: labBuf, anatomy: labels ? anatomy : null }, [ctBuf, ...(labBuf ? [labBuf] : [])]);
  });
  worker.postMessage({ type: 'tissues', tissues: S.tissues });
  // 3D scene
  const isAtlas = anatomy?.dataset === 'atlas';
  monitor.ctCaption = isAtlas ? 'CT SINTETIS dari Atlas MEDCOEL · bukan citra pasien' : source === 'local' ? 'CT lokal · tidak diregistrasi ke atlas' : 'Reformat CT phantom sintetis · bukan data pasien';
  document.body.dataset.dataset = isAtlas ? 'atlas' : 'phantom';
  if (meshes) {
    const keep = Object.fromEntries(Object.entries(meshes).map(([k, m]) => [k, { lps: m.lps, indices: m.indices }]));
    // the atlas shell is a whole body (no artificial acquisition caps); the phantom's skin is capped at the CT ends
    scene.setMeshes(keep, { coverage: ct.bounds, capZ: isAtlas ? -Infinity : ct.bounds.lo[2] + 6 });
    if (isAtlas) { const b = boundsOf(meshes.skin.lps); scene.setTableFor(b.lo, b.hi); scene.setBodyBounds(b.lo, b.hi); scene.setView("examiner", false); }
    prepareMotionMasks();
  } else {
    scene.setMeshes({}, { coverage: ct.bounds, capZ: -1e9 });
    S.mode = 'free';
  }
  scene.setSites(anatomy?.auscultation || [], shouldShowStethoscope(S));
  if (meshes && labels) applyView(S.view, false);
  else {
    S.free.position = [...ct.centre];
    S.mode = 'free';
  }
  if (!S.contact) { S.mode = 'free'; S.free.position = [...ct.centre]; }
  if (!meshes) status(regErrors.length ? 'Mesh ditolak: ' + regErrors.join('; ') : 'CT dimuat tanpa mesh kulit: gunakan Free 3D.', 'warn');
  else status(`${name}: CT ${ct.sizes.join('×')} @ ${ct.spacing.map((s) => s.toFixed(2)).join('/')} mm · mesh terregistrasi (${Object.keys(meshes).length} objek) · ${Math.round(D.loadMs)} ms`, 'ok');
  refreshAll();
  setScenario(S.scenario, false);
  markDirty();
  if (isAtlas) loadAtlasLayer(anatomy); else { atlas?.setVisible(false); atlasState = 'not-registered'; }
}

function boundsOf(lps) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < lps.length; i += 3) for (let d = 0; d < 3; d++) { lo[d] = Math.min(lo[d], lps[i + d]); hi[d] = Math.max(hi[d], lps[i + d]); }
  return { lo, hi };
}

/** Shared atlas meshes, baked into this dataset's LPS frame (exact: the CT was generated from them). */
async function loadAtlasLayer(anatomy) {
  atlas ||= new AtlasLayer(scene.patient, ATLAS_BASE);
  atlas.setFrame(anatomy.atlasFrame.atlasToLPS);
  atlasState = 'loading'; document.body.dataset.atlas = 'loading'; renderAtlasPanel();
  try {
    for (const sys of DEFAULT_ATLAS_SYSTEMS) { await atlas.load(sys, (f) => { const e = $('#atlasStatus'); if (e) e.textContent = `Memuat atlas: ${sys} ${(f * 100).toFixed(0)}%`; }); renderAtlasPanel(); applyAppearance(); }
    atlasState = 'ready'; document.body.dataset.atlas = 'ready';
  } catch (e) {
    atlasState = 'unavailable'; document.body.dataset.atlas = 'unavailable';
    status('Model Atlas MEDCOEL tidak dapat dimuat dari ' + ATLAS_BASE + ' (' + e.message + '). Pencitraan tetap berjalan dengan CT sintetis; lapisan anatomi atlas tidak ditampilkan.', 'warn');
  }
  renderAtlasPanel(); applyAppearance(); motionShown = null;
}
export async function loadAtlasSystem(sys) { if (!atlas) return; await atlas.load(sys); renderAtlasPanel(); applyAppearance(); motionShown = null; }

// candidate vertices that can move (saves work every frame)
function prepareMotionMasks() {
  if (!geom) return;
  const rm = geom.rm;
  // vertices outside this envelope can never be moved by the field (heart support, respiratory box, stomach box)
  inEnvelope = (x, y, z) => {
    const nearHeart = Math.hypot(x - geom.C[0], y - geom.C[1], z - geom.C[2]) < 165;
    const inResp = Math.abs(x) < rm.halfWidth + 5 && z > rm.zRange[0] - 5 && z < rm.zRange[1] + 5;
    const b = geom.stomachBox, inGi = x > b.lo[0] && x < b.hi[0] && y > b.lo[1] && y < b.hi[1] && z > b.lo[2] && z < b.hi[2];
    return nearHeart || inResp || inGi;
  };
  for (const m of Object.values(scene.meshes)) {
    const ref = m.ref, idx = [];
    for (let i = 0; i < ref.length; i += 3) if (inEnvelope(ref[i], ref[i + 1], ref[i + 2])) idx.push(i / 3);
    m.moving = Uint32Array.from(idx); m.cur = new Float32Array(ref);
  }
}

function deformMeshes(f) {
  const t0 = performance.now(), d = [0, 0, 0];
  for (const [name, m] of Object.entries(scene.meshes)) {
    if (!m.moving || (!m.mesh.visible && name !== 'skin')) continue;
    if (name !== 'skin' && organsHidden()) continue; // organs are hidden under opaque, uncut skin
    const ref = m.ref, cur = m.cur;
    for (const v of m.moving) { const i = v * 3; displacement(f, ref[i], ref[i + 1], ref[i + 2], d); cur[i] = ref[i] + d[0]; cur[i + 1] = ref[i + 1] + d[1]; cur[i + 2] = ref[i + 2] + d[2]; }
    scene.updatePositions(name, cur);
  }
  if (scene.effusionMesh) { scene.effusionMesh.geometry.attributes.position.array.set(deformPositions(f, scene.effusionRef)); scene.effusionMesh.geometry.attributes.position.needsUpdate = true; }
  stats.deformMs = performance.now() - t0;
}
/** Atlas structures marked as animated follow the same field (throttled separately: more vertices). */
function deformAtlas(f) {
  if (!atlas || !inEnvelope || organsHidden()) return;
  const t0 = performance.now();
  atlasMoving = atlas.deform(displacement, f, inEnvelope);
  atlasDeformMs = performance.now() - t0; atlasDeformClockT = f.t;
}

// ------------------------------------------------------------------ poses
function currentContact(f) {
  if (!S.contact) return null;
  const d = [0, 0, 0]; if (f && geom) displacement(f, ...S.contact.point, d);
  return { point: S.contact.point.map((v, i) => v + d[i]), normal: S.contact.normal };
}
function currentPose(f) {
  if (S.mode === 'free') return freePose({ position: S.free.position, q: S.free.q });
  const c = currentContact(f); if (!c) return null;
  return clinicalPose(c, S.angles);
}
function currentPlane(pose) {
  if (!pose) return null;
  const plane = imagingPlane(pose, PROBES[S.probeKey], S.us.depth, S.free.size);
  plane.outline = fovOutline(plane);
  return plane;
}

function applyView(key, animate = true) {
  const v = VIEWS.find((x) => x.key === key); if (!v || !D?.labels) return;
  // datasets may carry their own windows (contact on their skin + angles solved to aim at the target organ)
  const dv = D.anatomy?.views?.find((x) => x.key === key);
  const c = dv ? { point: [...dv.contact.point], normal: [...dv.contact.normal] } : snapToSkin((x, y, z) => D.labels.nearest(x, y, z), v.target, v.dir);
  if (!c) return;
  S.view = key; S.mode = 'clinical'; S.contact = c; S.angles = { ...(dv?.angles || v.angles) };
  setProbe(v.probe, false); S.us.depth = v.depth;
  refreshAll(); touch();
  if (animate) scene.setView('examiner');
}
function setProbe(key, keepDepth = true) {
  S.probeKey = key; const p = PROBES[key];
  S.us.freq = p.defaultFreq; if (!keepDepth) S.us.depth = p.defaultDepth;
  S.us.depth = Math.min(p.depth[1], Math.max(p.depth[0], S.us.depth));
}

// ------------------------------------------------------------------ worker bridge
function requestImaging(f, plane) {
  // A skin-only region has NO CT/USG dataset. Never ask the worker to invent a
  // slice or show an old texture from the previously selected trunk location.
  const coverage = currentProbeCoverage();
  if (coverage && !coverage.available) {
    dirty = false; pending = false; scene.hideImagePlane(); refreshRegionCoverage(); return;
  }
  if (!worker || (!plane && S.display !== 'tri')) return;
  if (workerBusy) { pending = true; return; }
  workerBusy = true; pending = false; dirty = false;
  requestImaging.job = { generation: requestImaging.generation || 0, display: S.display };
  const quality = interacting || S.playing ? 0.62 : 1;
  const common = {
    settings: { ...S.us, probeKey: S.probeKey, window: S.ct.window, level: S.ct.level, ctClip: S.ct.clip },
    clock: { t: clock.t, beatPhase: clock.beatPhase, breathPhase: clock.breathPhase, giPhase: clock.giPhase, heldR: clock.heldR },
    params: geom ? effectiveParams() : null, effusionMl: effusionMl(), layer: layerSpec(), wantLabels: !!D?.labels,
  };
  if (S.display === 'tri') { // three linked CT reformats through one patient-space point (CT only, never US geometry)
    if (!S.tri.point) S.tri.point = triStart();
    const planes = triPlanes(S.tri.point, D.ct.bounds);
    worker.postMessage({ type: 'render', id: ++frameCount, quality, ...common, plane: null, display: 'tri', sizes: { width: 0 }, tri: { planes, size: quality < 1 ? 220 : 320 } });
    requestImaging.plane = null; requestImaging.tri = { point: [...S.tri.point], planes }; requestImaging.quality = quality;
    return;
  }
  const ser = { mode: plane.mode, top: plane.top, u: plane.u, v: plane.v, n: plane.n, width: plane.width, height: plane.height, depth: plane.depth, centre: plane.centre };
  worker.postMessage({
    type: 'render', id: ++frameCount, plane: ser, quality, ...common,
    display: S.display === 'split' ? 'both' : S.display, sizes: { width: quality < 1 ? 300 : 420 },
  });
  requestImaging.plane = plane; requestImaging.tri = null; requestImaging.quality = quality;
}
function onWorker(e) {
  const m = e.data;
  if (m.type === 'frame') {
    workerBusy = false; stats.usMs = m.ms;
    // Drop a result produced for the previous mode before it can redraw its plane.
    if (requestImaging.job?.generation !== (requestImaging.generation || 0) || requestImaging.job?.display !== S.display) { markDirty(); return; }
    // Late async frame from a previously covered region must not replace the
    // explicit missing-data notice after moving the probe to head or limbs.
    const coverage = currentProbeCoverage();
    if (coverage && !coverage.available) { scene.hideImagePlane(); refreshRegionCoverage(); return; }
    if (m.tri) { onTriFrame(m); if (pending) markDirty(); return; }
    lastFrameInfo = { id: m.id, centreLabel: m.centreLabel, ms: m.ms, ctOutside: m.ct?.outsideFraction, quality: requestImaging.quality, hasUS: !!m.us, hasCT: !!m.ct };
    const plane = requestImaging.plane;
    if (m.labels) assist.ingest('main', new Uint8Array(m.labels.buf), m.labels.w, m.labels.h); else assist.clear(['main']);
    assist.clear(['ax', 'co', 'sa']);
    monitor.setFrame(m, { plane, display: S.display, usHeader: usHeader(), ctHeader: ctHeader() });
    const tex = S.display === 'ct' ? m.ct : m.us || m.ct;
    if (shouldShowImagingPlane(S)) scene.setImagePlane(plane, tex ? { rgba: S.display === 'split' && m.us ? m.us.rgba : tex.rgba, w: tex.w, h: tex.h } : null);
    else scene.hideImagePlane();
    assist.push(); assistPanelSoon();
    updateReadouts();
    if (pending) markDirty();
  } else if (m.type === 'error') { workerBusy = false; fail('Pencitraan: ' + m.message); }
  else if (m.type === 'warning') status(m.message, 'warn');
}
function onTriFrame(m) {
  const t = requestImaging.tri; if (!t) return;
  lastFrameInfo = { id: m.id, centreLabel: D?.labels ? D.labels.nearest(...t.point) : -1, ms: m.ms, ctOutside: 0, quality: requestImaging.quality, tri: true };
  for (const im of m.tri) if (im.labels) assist.ingest(im.key, new Uint8Array(im.labels), im.w, im.h);
  assist.clear(['main']);
  const headers = Object.fromEntries(Object.keys(MPR).map((k) => [k, [`${MPR[k].name.toUpperCase()} · CT MPR`, sliceLabel(k, t.point)]]));
  monitor.setFrame(m, { display: 'tri', tri: { point: t.point, planes: t.planes, headers } });
  const ax = m.tri.find((x) => x.key === 'ax'); // the axial plane is drawn in 3D as the "3D + plane" reference
  if (shouldShowImagingPlane(S)) scene.setImagePlane(t.planes.ax, ax ? { rgba: ax.rgba, w: ax.w, h: ax.h } : null);
  else scene.hideImagePlane();
  assist.push(); assistPanelSoon(); updateReadouts();
}
/** Start from the centre of the acquired CT volume, not the prior probe beam.
 * The beam is often near the body surface / edge of coverage. That made the first
 * tri-planar view appear empty even though the CT dataset itself was available.
 * After first use, keep the learner's last linked crosshair until the dataset changes.
 */
function triStart() {
  return [...D.ct.centre];
}
let panelTimer = 0;
function assistPanelSoon() { if (panelTimer) return; panelTimer = setTimeout(() => { panelTimer = 0; assist.renderPanel(); }, 350); }
function usHeader() {
  const p = PROBES[S.probeKey];
  return [`USG SIMULASI · ${S.mode === 'free' ? 'transduser virtual (Free 3D)' : p.label}`, `${S.us.freq.toFixed(1)} MHz · D ${(S.us.depth / 10).toFixed(1)} cm · G ${S.us.gain} dB · DR ${S.us.dynamicRange}`];
}
function ctHeader() { return ['CT REFORMAT', `W ${S.ct.window} · L ${S.ct.level}`]; }

// ------------------------------------------------------------------ main loop
let lastT = performance.now(), lastAudio = 0, audioOffset = 0, fpsAcc = 0, fpsN = 0;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { stats.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (!D) return;
  refreshRegionCoverage();
  if (audio.on) { const a = audio.now(); dt = Math.max(0, Math.min(0.1, a - lastAudio)); lastAudio = a; audioOffset = a - clock.t - dt; }
  const params = effectiveParams();
  if (S.playing && geom) { advanceClock(clock, dt * (audio.on ? 1 : S.speed), params); markDirty(); }
  if (interacting && now - lastInteraction > 260) { interacting = false; markDirty(); }
  const f = geom ? makeFrame(clock, params, geom) : null;
  // meshes (throttled)
  const motionKey = S.playing ? null : `${clock.beatPhase}|${clock.breathPhase}|${clock.giPhase}|${S.scenario}|${S.compareNormal}`;
  if (f && scene.meshes.skin && (S.playing ? now - lastDeform > 45 : motionShown !== motionKey)) {
    deformMeshes(f); lastDeform = now;
    // atlas: adaptive rate (about 3x its own cost, at least 60 ms) so the main thread stays responsive
    if (!S.playing || now - lastAtlasDeform > Math.max(60, 3 * atlasDeformMs)) { deformAtlas(f); lastAtlasDeform = now; }
    motionShown = motionKey;
  }
  const pose = currentPose(f), plane = currentPlane(pose);
  if (pose) {
    // The three rotation rings are an opt-in ADVANCED tool; the default is axis-first control (mode bar).
    if (S.mode === 'clinical') {
      // A contact reference is helpful when the illustrative skin is transparent
      // or clipped away, otherwise the correctly anchored probe looks airborne.
      const showContact = S.appearance.skinOpacity < 0.7 || S.appearance.cutaway !== 'none';
      scene.setProbe(pose, S.probeKey, S.tool === 'probe', showContact);
      scene.gizmoAxes = { u: pose.u, b: pose.b, e: pose.e };
      scene.setGizmo('clinical', pose.origin, scene.gizmoAxes, S.tool === 'probe' && S.ctl.rings);
    } else {
      scene.setProbe(pose, S.probeKey, false);
      scene.gizmoAxes = {};
      scene.setGizmo('free', pose.centre, {}, S.ctl.rings);
    }
    updateAxisGuide(pose);
  }
  if (S.steth.ref && f) { const d = [0, 0, 0]; displacement(f, ...S.steth.ref, d); S.steth.point = S.steth.ref.map((v, i) => v + d[i]); }
  // Sound playback does not select the instrument. A posterior listening point must
  // never leave a dangling chestpiece under the table in other workspaces.
  scene.setStethoscope(S.steth.point, S.steth.normal, shouldShowStethoscope(S));
  if (dirty) requestImaging(f, plane);
  // audio + strip
  const mix = currentMix();
  if (audio.on && f) audio.schedule({ simTime: clock.t, audioOffset, beatPhase: clock.beatPhase, breathPhase: clock.breathPhase, heartRate: params.heartRate, respRate: params.respRate, breathHold: params.breathHold, mix, s3: s3On(), r: f.r, bowelRate: 12, adventitious: S.adventitious });
  if (f) drawStrip($('#strip'), stripTraces(f, params, mix), 5);
  scene.render(now);
  if (now - (loop.lastPanel || 0) > 250) { updateLive(f); loop.lastPanel = now; }
}

function s3On() { return !S.compareNormal && !!SCENARIOS[S.scenario].auscultation.s3; }
let mixCache = null;
function currentMix() {
  if (!D?.labels || !D.anatomy?.auscultation) return null;
  const point = S.steth.point || D.anatomy.auscultation.find((s) => s.key === 'mitral')?.point, normal = S.steth.normal || [0, -1, 0];
  if (!point) return null;
  const key = point.map((v) => v.toFixed(1)).join() + effusionMl() + s3On();
  if (mixCache?.key === key) return mixCache.mix;
  const labelAt = (x, y, z) => { const l = D.labels.nearest(x, y, z); return effusion && effusion.from.has(l) && !S.compareNormal ? effusion.classify(x, y, z, l) || l : l; };
  const mix = siteMix({ point: S.steth.ref || point, normal, sites: D.anatomy.auscultation, labelAt, s3: s3On() });
  mixCache = { key, mix }; return mix;
}

// strip traces over the last 5 s
let pcgCache = null;
function stripTraces(f, p, mix) {
  const span = 5, N = 420, T = 60 / p.heartRate, Ts = systoleSeconds(T);
  const ecg = new Float32Array(N), pcg = new Float32Array(N), resp = new Float32Array(N), gi = new Float32Array(N);
  const w = mix?.weights || { M1: 0.8, T1: 0.5, A2: 0.8, P2: 0.4, S3: s3On() ? 0.8 : 0 };
  const key = [T.toFixed(4), Object.values(w).map((x) => x.toFixed(3)).join(), s3On()].join('|');
  if (pcgCache?.key !== key) pcgCache = { key, cyc: heartCycle({ T, r: 0.3, s3: s3On(), weights: w, sampleRate: 1200 }).samples };
  const cyc = pcgCache.cyc, sr = 1200;
  for (let i = 0; i < N; i++) {
    const back = (1 - i / (N - 1)) * span;
    const bp = clock.beatPhase - back * p.heartRate / 60, c = ((bp % 1) + 1) % 1, tau = c * T;
    // schematic ECG: P wave, QRS just before mechanical systole, T wave near end-systole (timing aid only)
    const qrsT = T - 0.03, tT = Ts - 0.06;
    const dq = ((tau - qrsT + T * 1.5) % T) - T / 2;
    ecg[i] = 0.12 * Math.exp(-(((tau - (T - 0.16)) / 0.025) ** 2)) + (dq > -0.03 && dq < 0.04 ? (dq < -0.012 ? -0.15 : dq < 0.012 ? 1 - Math.abs(dq) * 40 : -0.25 * (1 - (dq - 0.012) / 0.028)) : 0) + 0.28 * Math.exp(-(((tau - tT) / 0.05) ** 2));
    const k = Math.min(cyc.length - 1, Math.floor(tau * sr));
    let mx = 0; for (let j = Math.max(0, k - 3); j <= Math.min(cyc.length - 1, k + 3); j++) mx = Math.max(mx, Math.abs(cyc[j]));
    pcg[i] = Math.min(1, mx * 0.9);
    const ph = (((clock.breathPhase - back * p.respRate / 60) % 1) + 1) % 1;
    resp[i] = (p.breathHold ? (clock.heldR ?? 0) : respState(ph).r) * 2 - 1;
    if (geom) gi[i] = antralContraction({ ...f, gi: clock.giPhase - back * p.antralFrequency / 60 }, geom.waveStart + 60) / Math.max(0.2, p.antralAmplitude) * 1.6 - 0.8;
  }
  const curState = cardiacState(clock.beatPhase % 1, T);
  return [
    { label: 'EKG (skema)', value: `${p.heartRate}/mnt · ${curState.segment}`, data: ecg, color: '#52e3a4', scale: 0.9 },
    { label: 'Fonokardiogram', value: mix ? `situs: ${siteLabel(mix.nearest?.key)}` : 'S1 · S2', data: pcg, color: '#ffd166', envelope: true },
    { label: 'Respirasi', value: `${p.breathHold ? 'tahan napas' : respState(clock.breathPhase % 1).phase === 'inspiration' ? 'inspirasi' : 'ekspirasi'} · ${p.respRate}/mnt`, data: resp, color: '#7fb8ff', scale: 0.8 },
    { label: 'Antrum', value: `${p.antralFrequency.toFixed(1)}/mnt · MI ${motilityIndex(p)}`, data: gi, color: '#ff9ec1', scale: 0.9 },
  ];
}
function siteLabel(key) { const s = D?.anatomy?.auscultation?.find((x) => x.key === key); return s ? s.nameId : '—'; }

// ------------------------------------------------------------------ readouts
// Region readout thresholds (LPS mm). Defaults are the procedural phantom's; datasets override via anatomy.regions.
const PHANTOM_REGIONS = { headZ: 255, neckZ: 185, armX: 205, thighZ: -360, thoraxZ: -5, pelvisZ: -270, epigastricZ: -125, umbilicalZ: -190, quadrantSplitZ: -150, icsParasternal: null };
const REGION = (p, n) => {
  const R = { ...PHANTOM_REGIONS, ...(D?.anatomy?.regions || {}) };
  const [x, , z] = p, side = Math.abs(x) < 18 ? 'garis tengah' : x < 0 ? 'kanan' : 'kiri';
  const face = n[1] < -0.55 ? 'anterior' : n[1] > 0.55 ? 'posterior' : 'lateral';
  if (z > R.headZ) return 'Kepala (di luar fokus pemeriksaan)';
  if (z > R.neckZ) return `Leher / pangkal leher ${side}`;
  if (Math.abs(x) > R.armX) return `Lengan ${x < 0 ? 'kanan' : 'kiri'}`;
  if (z < R.thighZ) return `Paha ${side}`;
  if (z > R.thoraxZ) {
    // intercostal space: measured from the atlas ribs when available (nearest ICS level), else the phantom's spacing rule
    const lv = R.icsParasternal?.filter((v) => v != null);
    const ics = lv?.length ? 1 + lv.reduce((bi, v, i) => (Math.abs(v - z) < Math.abs(lv[bi] - z) ? i : bi), 0) : Math.max(1, Math.round((185 - z) / 26));
    const line = Math.abs(x) < 18 ? 'sternum' : Math.abs(x) < 45 ? 'parasternal' : Math.abs(x) < 105 ? 'linea midklavikula' : face === 'lateral' ? 'linea aksilaris media' : 'linea aksilaris anterior';
    return `Toraks ${face} ${side} · ≈SIC ${ics} · ${line}`;
  }
  if (z < R.pelvisZ) return `Suprapubik / pelvis ${side}`;
  if (Math.abs(x) < 40 && z > R.epigastricZ) return 'Epigastrium';
  if (Math.abs(x) < 40 && z > R.umbilicalZ) return 'Umbilikal';
  const q = (z > R.quadrantSplitZ ? 'atas' : 'bawah');
  return face === 'posterior' ? `Punggung bawah / flank ${side}` : face === 'lateral' ? `Flank ${side}` : `Kuadran ${side} ${q}`;
};
function labelName(id) { const l = D?.anatomy?.labels?.find((x) => x.id === id); return l ? `${l.nameId} (${l.name})` : id === 39 ? 'Cairan pleura' : id === 41 ? 'Paru kolaps' : '—'; }

function updateReadouts() {
  const r = $('#poseReadout'); if (!r) return;
  const f = geom ? makeFrame(clock, effectiveParams(), geom) : null;
  const pose = currentPose(f);
  if (!pose) { r.textContent = 'Klik kulit pasien untuk menempatkan probe.'; return; }
  const fmt = (v) => v.map((x) => x.toFixed(1)).join(', ');
  if (S.mode === 'clinical') {
    r.innerHTML = '';
    r.append(el('div', { class: 'ro-strong', 'data-testid': 'contact-region' }, REGION(S.contact.point, S.contact.normal)),
      el('div', {}, `Kontak (LPS mm): ${fmt(S.contact.point)}`),
      el('div', {}, `Rotasi ${S.angles.rotate.toFixed(1)}° · heel–toe ${S.angles.heelToe.toFixed(1)}° · rock ${S.angles.rock.toFixed(1)}°`),
      el('div', {}, `Di tengah berkas: ${labelName(lastFrameInfo?.centreLabel)}`));
  } else {
    const a = freeAngles(S.free.q);
    r.innerHTML = '';
    r.append(el('div', { class: 'ro-strong' }, 'Free 3D · bidang bebas 6-DOF'), el('div', {}, `Pusat (LPS mm): ${fmt(S.free.position)}`),
      el('div', {}, `Pitch ${a.pitch}° · Yaw ${a.yaw}° · Roll ${a.roll}°`),
      el('div', { 'data-testid': 'outside-readout', class: (lastFrameInfo?.ctOutside || 0) > 0.001 ? 'ro-warn' : '' }, `Di luar cakupan CT: ${Math.round((lastFrameInfo?.ctOutside || 0) * 100)}%`),
      el('div', {}, `Di pusat bidang: ${labelName(lastFrameInfo?.centreLabel)}`));
  }
}
function updateLive(f) {
  const p = effectiveParams();
  const live = $('#liveReadout');
  if (live && f) {
    live.textContent = `${S.playing ? '▶' : '❚❚'} t ${clock.t.toFixed(1)} s · fase jantung ${(f.c * 100).toFixed(0)}% (${f.segment}) · respirasi ${f.respPhase === 'inspiration' ? 'inspirasi' : f.respPhase === 'expiration' ? 'ekspirasi' : 'tahan'} · EF model ${(modelEjectionFraction(p) * 100).toFixed(0)}% · ${stats.fps.toFixed(0)} fps · citra ${stats.usMs.toFixed(0)} ms`;
  }
  const mem = $('#memReadout');
  if (mem) mem.textContent = performance.memory ? `JS heap ${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)} MiB (Chromium)` : 'Ukuran heap tidak tersedia di browser ini';
  const aud = $('#auscReadout');
  if (aud) {
    const mix = currentMix();
    aud.textContent = mix ? `Terdekat: ${siteLabel(mix.nearest?.key)} (${mix.nearest?.distanceMM.toFixed(0)} mm) · bunyi jantung ${(Math.max(mix.weights.M1, mix.weights.A2) * 100).toFixed(0)}% · napas ${(mix.breath * 100).toFixed(0)}% · usus ${(mix.bowel * 100).toFixed(0)}%${s3On() ? ' · S3 aktif' : ''}` : 'Pilih situs auskultasi.';
  }
}

// ------------------------------------------------------------------ pathology
function setScenario(key, moveView = true) {
  S.scenario = key; S.compareNormal = false;
  const sc = SCENARIOS[key];
  S.params = { ...applyScenario(DEFAULT_PHYSIOLOGY, key), cardiacEnabled: !!geom, respirationEnabled: !!geom, peristalsisEnabled: !!geom };
  effusion = sc.effusionMl > 0 && D?.labels ? buildEffusion(D.labels, sc.effusionMl, { diaphragm: geom?.diaphragm }) : sc.layer && D?.labels ? buildLayer(D.labels, sc.layer) : null;
  if (effusion) {
    const b = effusion.box || D.rightLungBox || (D.rightLungBox = labelBox(D.labels, 7));
    const want = effusion.meshLabel;
    const m = voxelSurface((x, y, z) => { const l = D.labels.nearest(x, y, z); return effusion.from.has(l) && effusion.classify(x, y, z, l) === want && l !== want; }, b.lo, b.hi, 4, 5);
    scene.setEffusionMesh(m);
  } else scene.setEffusionMesh(null);
  mixCache = null; pcgCache = null;
  if (moveView && suggestedView(key)) applyView(suggestedView(key));
  renderPathology(); refreshAll(); markDirty();
}

/** LPS bounding box of one label (padded). */
function labelBox(vol, label) {
  const [nx, ny, nz] = vol.sizes, a = vol.affine, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (vol.data[(k * ny + j) * nx + i] !== label) continue;
    const p = [a[0] * i + a[1] * j + a[2] * k + a[3], a[4] * i + a[5] * j + a[6] * k + a[7], a[8] * i + a[9] * j + a[10] * k + a[11]];
    for (let d = 0; d < 3; d++) { lo[d] = Math.min(lo[d], p[d]); hi[d] = Math.max(hi[d], p[d]); }
  }
  return { lo: lo.map((v) => v - 6), hi: hi.map((v) => v + 6) };
}

/** Atlas has a full-body illustrative skin but only trunk CT. Allow the student
 * to place the probe on any real skin surface; do not fabricate images there. */
function contactInCoverage(c) {
  if (!c) return false;
  if (D?.anatomy?.dataset === 'atlas') return true; // covered by explicit unavailable-data UI
  const b = D?.ct?.bounds; if (!b) return true;
  const ok = [0, 1, 2].every((i) => c.point[i] >= b.lo[i] + 2 && c.point[i] <= b.hi[i] - 2);
  if (!ok) status('Titik itu di luar cakupan CT: tidak ada data pencitraan di sana.', 'warn');
  return ok;
}

/** Read-only region classification from source atlas landmarks and CT bounds.
 * No extra voxels are loaded or synthesised when the probe is moved. */
function currentProbeCoverage() {
  if (!D?.ct || D.anatomy?.dataset !== 'atlas' || S.mode !== 'clinical' ||
      S.tool !== 'probe' || !S.contact || S.display === 'tri') return null;
  return imagingAvailability({
    point: S.contact.point, bounds: D.ct.bounds,
    landmarks: D.anatomy.regions, dataset: 'atlas',
  });
}
let lastCoverageKey = '';
function refreshRegionCoverage() {
  const c = currentProbeCoverage(), unavailable = !!c && !c.available;
  const key = c ? `${c.region}/${c.available}/${S.mode}/${S.tool}` : 'none';
  if (lastCoverageKey !== key) {
    const badge = $('#regionStatus'), notice = $('#coverageNotice'), text = $('#coverageNoticeText');
    if (badge) {
      badge.hidden = !c;
      if (c) { badge.textContent = c.available ? `${c.regionLabel} · CT tersedia` : `${c.regionLabel} · belum ada citra`; badge.dataset.available = String(c.available); }
    }
    if (notice) notice.hidden = !unavailable;
    if (text && unavailable) text.textContent = c.message;
    lastCoverageKey = key;
  }
  if (unavailable) scene?.hideImagePlane();
  return c;
}

// ------------------------------------------------------------------ direction pad (direct control)
// No mode to choose first: labelled patient-direction buttons (hold to repeat), arrow keys, and direct dragging of the
// probe on the skin. The camera is always free (drag empty space / wheel). Directions are anatomical (LPS), never
// camera-relative; hovering a direction shows its patient axis in 3D.
function ctlEnv() {
  const b = scene.bodyBounds || D?.ct?.bounds;
  return {
    closestSkin: (p) => scene.closestSkin(p), raySkin: (o, d) => scene.raySkin(o, d), coverage: D?.anatomy?.dataset === 'atlas' ? null : D?.ct?.bounds,
    bodyCentre: b ? [(b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, (b.lo[2] + b.hi[2]) / 2] : [0, 0, 0],
  };
}
function report(r) { if (r && !r.ok && r.error) status(r.error, 'warn'); else if (r?.note) status(r.note, 'info'); }
/** What each of the three tools is made of (shown as chips under the selector; one place, so text and behaviour stay in step). */
const MODE_ELEMENTS = {
  clinical: ['Probe di kulit', 'Jendela standar', 'Putar · miring', 'Kontak tetap'],
  free: ['Bidang CT bebas', 'Geser 6 arah', 'Angguk · geleng · guling', 'Tanpa kulit'],
  tri: ['Aksial', 'Koronal', 'Sagital', 'Satu titik silang'],
};
const padKind = () => (S.display === 'tri' ? 'tri' : S.mode === 'free' ? 'plane' : 'probe');
const TRI_AXES = { ax: { i: 2, name: 'Aksial', direction: 'Superior (+) / Inferior (−)' }, co: { i: 1, name: 'Koronal', direction: 'Posterior (+) / Anterior (−)' }, sa: { i: 0, name: 'Sagital', direction: 'Kiri pasien (+) / Kanan pasien (−)' } };
function setTriCoordinate(key, mm) {
  if (!D?.ct || !Number.isFinite(mm)) return;
  S.tri.point ||= triStart();
  const i = TRI_AXES[key].i;
  const p = [...S.tri.point]; p[i] = mm;
  S.tri.point = clampToBounds(p, D.ct.bounds);
  pad?.update(); updateTriControls(); touch();
}
function updateTriControls() {
  if (!D?.ct || S.display !== 'tri') return;
  const p = S.tri.point || triStart();
  for (const [key, { i }] of Object.entries(TRI_AXES)) {
    const row = $(`#tri-${key}`); if (!row) continue;
    const input = row.querySelector('input'), out = row.querySelector('output');
    input.min = D.ct.bounds.lo[i]; input.max = D.ct.bounds.hi[i];
    input.step = Math.max(0.1, D.ct.spacing[i] || 1);
    if (document.activeElement !== input) input.value = p[i];
    out.textContent = `${p[i].toFixed(1)} mm`;
  }
}
function buildTriControls() {
  const root = $('#triSliceRows');
  root.replaceChildren(...Object.entries(TRI_AXES).map(([key, { i, name, direction }]) => {
    const step = (sign) => setTriCoordinate(key, (S.tri.point || triStart())[i] + sign * (D.ct.spacing[i] || 1));
    return el('div', { class: 'tri-slice-row', id: `tri-${key}`, 'data-testid': `tri-row-${key}` },
      el('label', {}, `${name} · ${direction}`, el('input', { type: 'range', 'data-testid': `tri-slider-${key}`, 'aria-label': `Posisi irisan ${name}`, oninput: (e) => setTriCoordinate(key, Number(e.target.value)) })),
      el('button', { type: 'button', 'data-testid': `tri-prev-${key}`, 'aria-label': `${name}: ke arah negatif`, onclick: () => step(-1) }, '−'),
      el('output', { 'data-testid': `tri-value-${key}` }),
      el('button', { type: 'button', 'data-testid': `tri-next-${key}`, 'aria-label': `${name}: ke arah positif`, onclick: () => step(1) }, '+'));
  }));
  $('#triCenter').onclick = () => { S.tri.point = [...D.ct.centre]; pad?.update(); updateTriControls(); touch(); };
  $('#triHelp').onclick = () => startTour(true, 'tri');
  $('#triReturnProbe').onclick = () => setScanMode('clinical');
}
/** Move the current target one step in a patient direction (pad button, arrow key). */
function padMove(dir, fine = false) {
  const d = PAD_DIRS[dir]; if (!d) return;
  // clinical anterior/posterior walks around the body: use a larger step so the back is reachable in a few clicks
  const base = d.axis === 'depth' && padKind() === 'probe' ? Math.max(20, S.ctl.stepMM) : S.ctl.stepMM;
  const mm = d.sign * base * (fine ? 0.2 : 1);
  if (padKind() === 'tri') {
    if (!S.tri.point) S.tri.point = triStart();
    const axis = CONTROL_MODES[d.axis].axis;
    S.tri.point = clampToBounds(S.tri.point.map((v, i) => v + axis[i] * mm), D.ct.bounds);
  } else report(axisTranslate(S, d.axis, mm, ctlEnv()));
  afterMove();
}
function padRotate(key, sign, fine = false) {
  const deg = sign * S.ctl.stepDeg * (fine ? 0.2 : 1);
  if (S.mode === 'free') S.ctl.angleFree = key; else S.ctl.angleClinical = key;
  report(axisRotate(S, deg)); afterMove();
}
function afterMove() { mixCache = null; refreshAll(); touch(); }
function padPivot() {
  if (padKind() === 'tri') return S.tri.point;
  if (S.mode === 'clinical') return S.contact?.point || null;
  const f = geom ? makeFrame(clock, effectiveParams(), geom) : null, pl = currentPlane(currentPose(f));
  return pl ? pl.top.map((v, i) => v + pl.v[i] * pl.height * 0.5) : S.free.position;
}
let guideDir = null, guideKey = '';
function updateAxisGuide() {
  const pivot = guideDir ? padPivot() : null, d = guideDir && PAD_DIRS[guideDir];
  const key = d && pivot ? guideDir + pivot.map((v) => v.toFixed(0)).join() : '';
  if (key === guideKey) return; guideKey = key;
  if (!key) { scene.setAxisGuide(null); return; }
  const def = CONTROL_MODES[d.axis];
  scene.setAxisGuide({ pivot, axis: def.axis, color: axisColor(d.axis), plus: '+ ' + def.plus, minus: '− ' + def.minus });
}
function padReadout() {
  const f1 = (v) => v.toFixed(1);
  const p = padKind() === 'tri' ? S.tri.point : S.mode === 'free' ? S.free.position : S.contact?.point;
  if (!p) return 'Klik kulit pasien untuk menempatkan probe';
  const where = padKind() === 'probe' ? REGION(S.contact.point, S.contact.normal) + ' · ' : '';
  return `${where}S ${f1(p[2])} · L ${f1(p[0])} · P ${f1(p[1])} mm`;
}
function padAngle(key) {
  if (S.mode === 'free') return `${freeAngles(S.free.q)[key]}°`;
  return `${S.angles[key].toFixed(1)}°`;
}
let pad = null;
function renderPad() {
  const root = $('#probePad'); if (!root || !scene || !D) return;
  const kind = padKind();
  if (!pad || pad.kind !== kind) {
    pad = buildPad(root, {
      el, kind, steps: { mm: S.ctl.stepMM, deg: S.ctl.stepDeg },
      extras: kind === 'probe' && D?.labels ? () => [
        el('select', { class: 'pad-sel', 'data-testid': 'pad-window', 'aria-label': 'Jendela standar', title: 'Lompat ke jendela pemeriksaan standar', onchange: (e) => { if (e.target.value) applyView(e.target.value); } },
          el('option', { value: '' }, 'Jendela standar…'), ...VIEWS.map((v) => el('option', { value: v.key }, viewLabel(v)))),
        el('select', { class: 'pad-sel', 'data-testid': 'pad-probe', 'aria-label': 'Jenis probe', onchange: (e) => { setProbe(e.target.value, false); refreshAll(); touch(); } },
          ...Object.values(PROBES).map((p) => el('option', { value: p.key, selected: p.key === S.probeKey || undefined }, p.label))),
      ] : null,
      actions: {
        move: (dir) => padMove(dir), rotate: (k, sign) => padRotate(k, sign), preset: (k) => applyOrientationPreset(k),
        side: (k) => { const r = axisSelectSide(S, k, ctlEnv()); report(r); if (r.ok) { scene.setView(k); afterMove(); } },
        setStep: (what, v) => { if (what === 'deg') S.ctl.stepDeg = v; else S.ctl.stepMM = v; },
        hover: (dir) => { guideDir = dir; },
        readout: padReadout, angle: padAngle,
        slice: setTriCoordinate,
        sliceRange: (k) => { const i = { ax: 2, co: 1, sa: 0 }[k], b = D.ct.bounds, p = S.tri.point || triStart(); return { min: b.lo[i], max: b.hi[i], value: p[i] }; },
      },
    });
  } else pad.update();
}
/** One-click orientation presets: clinical = relative to the local patient frame at the contact; free = patient planes. */
function applyOrientationPreset(k) {
  if (k === 'perpendicular') S.angles = { ...S.angles, heelToe: 0, rock: 0 };
  else if (S.mode === 'free') { if (FREE_PRESETS[k]) S.free.q = freeQuat(FREE_PRESETS[k]); }
  else { const p = ORIENTATION_PRESETS.clinical[k]; if (p?.angles) S.angles = { rotate: p.angles.rotate, heelToe: 0, rock: 0 }; }
  afterMove();
}

const TEACHING = {
  subxiphoid: ['Jendela subxifoid', 'Cari hubungan jantung dengan diafragma dan hati. Ubah heel–toe sedikit untuk melihat perubahan ruang jantung.'],
  parasternal: ['Jendela parasternal', 'Amati orientasi ruang jantung dan bagaimana tulang rusuk serta paru memengaruhi jendela akustik.'],
  apical: ['Jendela apikal', 'Model atlas memiliki hambatan paru pada apeks. Gunakan subxifoid jika pandangan jantung terhalang; jangan menganggap ini citra ekokardiografi klinis.'],
  right_flank: ['Toraks posterolateral kanan', 'Bandingkan paru berisi udara dengan cairan pleura pada skenario efusi kanan. Perhatikan batas cakupan dan bayangan akustik.'],
  ruq: ['Kuadran kanan atas', 'Amati hati dan ginjal kanan. Geser probe superior–inferior untuk melihat pergeseran bidang Morison.'],
  epigastric: ['Antrum epigastrik', 'Amati antrum dan perubahan bentuknya selama gerak peristaltik prosedural.'],
  bladder: ['Suprapubik', 'Perhatikan cairan kandung kemih yang tampak relatif anekoik pada simulasi USG.'],
  lung_anterior: ['Paru anterior', 'Perhatikan garis pleura dan reverberasi sederhana pada model. Ini bukan simulasi lengkap artefak paru.'],
};
function renderTeaching() {
  const e = $('#teachingText'); if (!e) return;
  const v = TEACHING[S.view] || ['Eksplorasi bebas', 'Pilih jendela standar atau pindahkan bidang pemindaian, lalu jelaskan perubahan anatomi yang kamu lihat.'];
  const s = SCENARIOS[S.scenario];
  e.replaceChildren(
    el('strong', {}, S.mode === 'free' ? 'Navigasi bidang 3D' : v[0]),
    el('p', {}, S.mode === 'free'
      ? 'LPS: kiri (+L), posterior (+P), superior (+S). Tombol arah memindahkan bidang CT sungguhan, bukan kamera atau gambar 2D.'
      : v[1]),
    el('p', { class: 'meta' }, s?.key && s.key !== 'normal'
      ? `Skenario aktif: ${s.titleId}. Bandingkan dengan normal dan baca tab Patologi sebelum menarik kesimpulan.`
      : 'Cobalah ubah satu arah/sudut pada satu waktu, lalu perhatikan label jaringan dan citra yang berubah.'),
    el('p', { class: 'meta' }, 'Semua citra dan bunyi berasal dari simulasi edukatif, bukan pemeriksaan pasien atau alat diagnostik.'),
  );
}

// ------------------------------------------------------------------ UI building
function field(label, input, extra) { return el('label', { class: 'field' }, el('span', { class: 'field-label' }, label), input, extra); }
/** Range + number + step buttons, bound to get/set. */
function numberControl({ id, label, min, max, step, get, set, unit = '', steps = null, testid }) {
  const range = el('input', { type: 'range', min, max, step, id: id + 'Range', 'aria-label': label });
  const num = el('input', { type: 'number', min, max, step: 'any', id, 'data-testid': testid || id, 'aria-label': label + ' (angka)' });
  const apply = (v) => { v = Math.min(max, Math.max(min, Number(v))); if (!Number.isFinite(v)) return; set(v); sync(); touch(); };
  const sync = () => { const v = get(); range.value = v; if (document.activeElement !== num) num.value = +Number(v).toFixed(3); };
  range.addEventListener('input', () => apply(range.value));
  num.addEventListener('change', () => apply(num.value));
  num.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(num.value); });
  const btns = el('div', { class: 'steps' }, ...(steps || []).map((s) => el('button', { type: 'button', class: 'step', onclick: () => apply(get() + s), 'aria-label': `${label} ${s > 0 ? '+' : ''}${s}${unit}` }, `${s > 0 ? '+' : '−'}${Math.abs(s)}`)));
  const wrap = el('div', { class: 'num-control' }, el('div', { class: 'num-head' }, el('span', {}, label), el('span', { class: 'num-input' }, num, unit ? el('span', { class: 'unit' }, unit) : null)), range, steps ? btns : null);
  wrap.sync = sync; controls.push(wrap); sync();
  return wrap;
}
const controls = [];
function refreshAll() {
  refreshRegionCoverage();
  for (const c of controls) c.sync?.();
  document.body.dataset.mode = S.mode; document.body.dataset.tool = S.tool;
  const tri = S.display === 'tri', clinical = S.mode === 'clinical' && !tri;
  const modeStatus = $('#modeStatus'); if (modeStatus) {
    const skinHidden = S.appearance.skinOpacity < 0.7 || S.appearance.cutaway !== 'none';
    modeStatus.textContent = tri ? 'Tri-planar CT' : clinical ? skinHidden ? 'Probe klinis · kontak kulit ilustratif' : 'Probe klinis' : 'Free 3D / Bidang CT';
    modeStatus.title = clinical && skinHidden
      ? 'Kulit ilustratif sedang transparan/terpotong. Lingkaran hijau menunjukkan kontak probe pada permukaan kulit yang tidak terlihat; bukan struktur anatomi baru.'
      : '';
  }
  // three-way tool selector: Probe klinis / Bidang CT bebas / Tri-planar CT (always visible, one click each)
  const current = tri ? 'tri' : clinical ? 'clinical' : 'free';
  for (const b of document.querySelectorAll('[data-mode-tab]')) b.setAttribute('aria-pressed', String(b.dataset.modeTab === current));
  const returnProbe = $('#returnProbe'); if (returnProbe) { returnProbe.disabled = !D?.meshes?.skin; returnProbe.title = returnProbe.disabled ? 'Probe klinis memerlukan mesh kulit terregistrasi (tidak ada pada CT ini).' : 'Probe USG menempel di kulit pasien'; }
  const elements = $('#modeElements');
  if (elements) {
    const chips = MODE_ELEMENTS[current];
    const key = chips.join('|');
    if (elements.dataset.key !== key) { elements.dataset.key = key; elements.replaceChildren(...chips.map((t) => el('span', { class: 'chip' }, t))); }
  }
  document.body.dataset.tool3 = current;
  const triControls = $('#triControls'); if (triControls) triControls.hidden = !tri;
  const monitorPanel = $('#monitorPanel'); if (monitorPanel) monitorPanel.dataset.display = S.display;
  requestAnimationFrame(syncMonitorScrollbar);
  const triReturn = $('#triReturnProbe'); if (triReturn) triReturn.hidden = !D?.meshes?.skin;
  for (const b of document.querySelectorAll('[data-seg]')) { const [k, v] = b.dataset.seg.split(':'); b.setAttribute('aria-pressed', String(S[k] === v || (k === 'display' && S.display === v))); }
  const sel = $('#probeSelect'); if (sel) sel.value = S.probeKey;
  const sc = $('#scenarioSelect'); if (sc) sc.value = S.scenario;
  const cmp = $('#compareBtn'); if (cmp) { cmp.setAttribute('aria-pressed', String(S.compareNormal)); cmp.textContent = S.compareNormal ? 'Tampilkan patologis' : 'Bandingkan dengan normal'; cmp.disabled = S.scenario === 'normal'; }
  $('#playBtn') && ($('#playBtn').textContent = S.playing ? '❚❚ Jeda' : '▶ Putar');
  updateReadouts();
  renderTeaching();
  renderPad();
  updateTriControls();
}

function seg(group, items, testid) {
  return el('div', { class: 'seg', role: 'group', 'data-testid': testid }, ...items.map(([val, text]) => el('button', { type: 'button', 'data-seg': `${group}:${val}`, 'data-testid': `${testid}-${val}`, onclick: () => { onSeg(group, val); } }, text)));
}
function onSeg(group, val) {
  if (group === 'mode') { setScanMode(val); return; }
  else if (group === 'tool') { setTool(val); return; }
  else if (group === 'display') { setImagingDisplay(val); return; }
  refreshAll(); touch();
}

function setScanMode(mode) {
  if (mode === 'clinical') {
    if (!D?.meshes?.skin) { status('Probe klinis memerlukan mesh kulit terregistrasi; gunakan Free 3D untuk CT ini.', 'warn'); return; }
    if (!S.contact || !contactInCoverage(S.contact)) applyView(S.view, false);
    if (!S.contact || !contactInCoverage(S.contact)) S.contact = scene.raySkin(D.ct.centre, [0, -1, 0]) || scene.closestSkin(D.ct.centre);
    if (!S.contact || !contactInCoverage(S.contact)) { status('Titik kontak kulit tidak tersedia di cakupan CT.', 'warn'); return; }
    S.mode = 'clinical'; S.tool = 'probe'; S.ctl.mode = 'place';
    scene.siteMarkers.visible = false;
    scene.setInteraction('place');
    if (S.display === 'tri' || S.display === 'ct') S.display = 'split';
  } else if (mode === 'free') { S.mode = 'free'; S.tool = 'probe'; scene.siteMarkers.visible = false; if (S.display === 'tri') S.display = 'ct'; }
  else return;
  scene.hideImagePlane(); requestImaging.generation = (requestImaging.generation || 0) + 1;
  refreshAll(); touch();
}
function setImagingDisplay(display) {
  if (display === 'tri') {
    if (!S.tri.point) S.tri.point = triStart();
    S.mode = 'free'; S.tool = 'probe';
    scene.siteMarkers.visible = false;
    S.display = 'tri';
  } else S.display = display;
  scene.hideImagePlane(); requestImaging.generation = (requestImaging.generation || 0) + 1;
  refreshAll(); touch();
  if (display === 'tri') startTour(false, 'tri');
}

function buildPanels() {
  // ---------------- Probe tab
  const probeTab = $('#tab-probe');
  probeTab.append(
    el('h3', {}, 'Mode pemindaian'), seg('mode', [['clinical', 'Probe klinis'], ['free', 'Free 3D']], 'mode'),
    el('p', { class: 'hint clinical-only' }, 'Probe menempel di kulit. Klik kulit (mode ⌖ Tempatkan) untuk meletakkan probe; ↕ dan ↔ menggesernya di permukaan; ⇅ memilih sisi tubuh; ⟳ mengubah sudut di titik kontak yang tetap.'),
    el('p', { class: 'hint free-only' }, 'Bidang CT bebas dalam koordinat pasien (LPS), tidak terikat kulit. ↕ ↔ ⇅ menggeser bidang, ⟳ memutarnya; preset Aksial/Koronal/Sagital/Oblik ada di bilah ⟳.'),
    el('section', { class: 'learn-card', 'aria-label': 'Panduan belajar' },
      el('h4', {}, 'Apa yang sedang dipelajari?'),
      el('div', { id: 'teachingText', 'aria-live': 'polite' })),
    el('div', { class: 'clinical-only' },
      field('Jenis probe', el('select', { id: 'probeSelect', 'data-testid': 'probe-select', onchange: (e) => { setProbe(e.target.value, false); refreshAll(); touch(); } }, ...Object.values(PROBES).map((p) => el('option', { value: p.key }, p.label)))),
      el('h4', {}, 'Jendela standar'),
      el('div', { class: 'view-grid' }, ...VIEWS.map((v) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'view-' + v.key, onclick: () => applyView(v.key) }, viewLabel(v)))),
      el('details', { class: 'adv', 'data-testid': 'adv-angles' }, el('summary', {}, 'Sudut presisi & cincin 3D (lanjutan)'),
      el('p', { class: 'hint' }, 'Angulasi berputar di titik kontak yang tetap. Biasanya cukup memakai mode ⟳ Putar.'),
      numberControl({ id: 'angRotate', testid: 'angle-rotate', label: 'Rotasi (sumbu berkas)', min: -180, max: 180, step: 0.5, unit: '°', steps: [-5, -1, 1, 5], get: () => S.angles.rotate, set: (v) => { S.angles.rotate = v; } }),
      numberControl({ id: 'angHeel', testid: 'angle-heeltoe', label: 'Heel–toe (dalam bidang)', min: -CLINICAL_LIMITS.heelToe, max: CLINICAL_LIMITS.heelToe, step: 0.5, unit: '°', steps: [-5, -1, 1, 5], get: () => S.angles.heelToe, set: (v) => { S.angles.heelToe = v; } }),
      numberControl({ id: 'angRock', testid: 'angle-rock', label: 'Rock / fan (keluar bidang)', min: -CLINICAL_LIMITS.rock, max: CLINICAL_LIMITS.rock, step: 0.5, unit: '°', steps: [-5, -1, 1, 5], get: () => S.angles.rock, set: (v) => { S.angles.rock = v; } }),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => { S.angles = { ...S.angles, heelToe: 0, rock: 0 }; refreshAll(); touch(); } }, 'Tegak lurus kulit')),
      ringsToggle())),
    el('div', { class: 'free-only' },
      el('h4', {}, 'Preset bidang'),
      el('div', { class: 'view-grid' }, ...Object.entries({ axial: 'Aksial', coronal: 'Koronal', sagittal: 'Sagital', oblique: 'Oblik' }).map(([k, t]) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'free-' + k, onclick: () => { S.free.q = freeQuat(FREE_PRESETS[k]); refreshAll(); touch(); } }, t))),
      el('details', { class: 'adv' }, el('summary', {}, 'Posisi & sudut presisi (lanjutan)'),
      field('Presisi', el('select', { onchange: (e) => { const [mm, deg] = e.target.value.split('/').map(Number); S.precision = { mm, deg }; rebuildFreeSteps(); } }, el('option', { value: '1/1' }, '1 mm / 1°'), el('option', { value: '0.1/0.1' }, '0,1 mm / 0,1°'), el('option', { value: '10/15' }, '10 mm / 15°'))),
      el('div', { id: 'freeControls' }), ringsToggle())),
    el('h4', {}, 'Posisi saat ini'), el('div', { id: 'poseReadout', class: 'readout', 'aria-live': 'polite' }),
  );
  rebuildFreeSteps();

  // ---------------- Imaging tab
  const img = $('#tab-imaging');
  const tissueSel = el('select', { id: 'tissueSelect', 'data-testid': 'tissue-select' }, ...S.tissues.map((t, i) => el('option', { value: i }, t.name)));
  const tissueBox = el('div', { id: 'tissueControls' });
  const buildTissue = () => {
    tissueBox.innerHTML = '';
    const i = Number(tissueSel.value), t = () => S.tissues[i];
    const push = () => { worker?.postMessage({ type: 'tissues', tissues: S.tissues }); touch(); zRead.textContent = `Z = ${impedance(t()).toFixed(3)} MRayl`; };
    const zRead = el('div', { class: 'meta' });
    tissueBox.append(
      numberControl({ id: 'tC', label: 'Kecepatan suara c', min: 300, max: 4100, step: 5, unit: 'm/s', get: () => t().c, set: (v) => { t().c = v; push(); } }),
      numberControl({ id: 'tRho', label: 'Densitas ρ', min: 1, max: 2100, step: 5, unit: 'kg/m³', get: () => t().rho, set: (v) => { t().rho = v; push(); } }),
      numberControl({ id: 'tAlpha', testid: 'tissue-alpha', label: 'Atenuasi α', min: 0, max: 45, step: 0.01, unit: 'dB/cm/MHz', get: () => t().alpha, set: (v) => { t().alpha = v; push(); } }),
      numberControl({ id: 'tScatter', testid: 'tissue-scatter', label: 'Hamburan balik (relatif)', min: 0, max: 2, step: 0.01, get: () => t().scatter, set: (v) => { t().scatter = v; push(); } }),
      zRead, el('div', { class: 'meta' }, `Rentang literatur: ${t().range}`),
      el('button', { type: 'button', class: 'btn', onclick: () => { S.tissues[i] = { ...TISSUES[i] }; buildTissue(); push(); } }, 'Kembalikan nilai bawaan'));
    push();
  };
  tissueSel.addEventListener('change', buildTissue);
  img.append(
    el('h3', {}, 'Tampilan monitor'), seg('display', [['us', 'USG'], ['ct', 'CT'], ['split', 'USG + CT']], 'display'),
    el('h4', {}, 'USG simulasi'),
    numberControl({ id: 'usFreq', testid: 'us-freq', label: 'Frekuensi', min: 1.5, max: 15, step: 0.1, unit: 'MHz', get: () => S.us.freq, set: (v) => { S.us.freq = v; } }),
    numberControl({ id: 'usDepth', testid: 'us-depth', label: 'Kedalaman', min: 20, max: 260, step: 5, unit: 'mm', get: () => S.us.depth, set: (v) => { S.us.depth = v; } }),
    numberControl({ id: 'usGain', testid: 'us-gain', label: 'Gain', min: -30, max: 30, step: 1, unit: 'dB', get: () => S.us.gain, set: (v) => { S.us.gain = v; } }),
    numberControl({ id: 'usDR', label: 'Dynamic range', min: 30, max: 90, step: 1, unit: 'dB', get: () => S.us.dynamicRange, set: (v) => { S.us.dynamicRange = v; } }),
    numberControl({ id: 'tgc0', label: 'TGC dekat', min: -20, max: 20, step: 1, unit: 'dB', get: () => S.us.tgc[0], set: (v) => { S.us.tgc[0] = v; } }),
    numberControl({ id: 'tgc1', label: 'TGC tengah', min: -20, max: 20, step: 1, unit: 'dB', get: () => S.us.tgc[1], set: (v) => { S.us.tgc[1] = v; } }),
    numberControl({ id: 'tgc2', label: 'TGC jauh', min: -20, max: 20, step: 1, unit: 'dB', get: () => S.us.tgc[2], set: (v) => { S.us.tgc[2] = v; } }),
    numberControl({ id: 'usFocus', label: 'Fokus (fraksi kedalaman)', min: 0.1, max: 0.95, step: 0.05, get: () => S.us.focusFraction, set: (v) => { S.us.focusFraction = v; } }),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: true, onchange: (e) => { S.us.autoTGC = e.target.checked; touch(); } }), 'Kompensasi atenuasi otomatis (TGC bawaan)'),
    el('h4', {}, 'CT window / level'),
    el('div', { class: 'view-grid' }, ...Object.entries(CT_PRESETS).map(([k, p]) => el('button', { type: 'button', class: 'chipbtn', onclick: () => { S.ct.window = p.window; S.ct.level = p.level; refreshAll(); touch(); } }, p.label))),
    numberControl({ id: 'ctW', testid: 'ct-window', label: 'Window', min: 50, max: 3000, step: 10, unit: 'HU', get: () => S.ct.window, set: (v) => { S.ct.window = v; } }),
    numberControl({ id: 'ctL', testid: 'ct-level', label: 'Level', min: -1000, max: 1500, step: 5, unit: 'HU', get: () => S.ct.level, set: (v) => { S.ct.level = v; } }),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: true, onchange: (e) => { S.ct.clip = e.target.checked; touch(); } }), 'Potong CT sesuai bidang pandang probe'),
    el('h4', {}, 'Parameter jaringan (akustik)'),
    el('p', { class: 'hint' }, 'Ubah sifat akustik jaringan dan lihat efeknya pada simulasi (mis. atenuasi hati ↑ → bayangan dalam lebih gelap).'),
    field('Jaringan', tissueSel), tissueBox,
    el('details', { class: 'limits' }, el('summary', {}, 'Asumsi & keterbatasan simulasi USG'),
      el('ul', {}, ...['Model sinar lurus, hamburan tunggal, irisan 2D (tanpa ketebalan elevasi).', 'Tanpa refraksi, aberasi kecepatan suara, side-lobe, harmonik, Doppler.', 'Nilai c, ρ, α dari literatur (T1–T4); hamburan balik adalah skala ekogenisitas relatif untuk pengajaran.', 'Reverberasi hanya dimodelkan antara transduser dan reflektor gas/udara pertama.', 'Data sintetis (CT dari Atlas MEDCOEL atau phantom prosedural): bukan anatomi pasien, tidak tervalidasi klinis.'].map((t) => el('li', {}, t)))),
  );
  tissueSel.value = String(S.tissues.findIndex((t) => t.key === 'liver')); buildTissue();

  // ---------------- Physiology tab
  const ph = $('#tab-physiology');
  ph.append(
    el('p', { class: 'hint warn' }, 'Gerak fisiologis prosedural: pendekatan edukatif, bukan CT 4D atau ekokardiografi terukur.'),
    el('section', { class: 'learn-card', 'data-testid': 'physio-explain' },
      el('h4', {}, 'Apa yang bergerak dan mengapa'),
      el('p', {}, el('b', {}, 'Siklus jantung: '), 'sistol (kontraksi ventrikel, katup AV menutup = S1) lalu diastol (relaksasi dan pengisian, katup semilunar menutup = S2). Jeda di End-diastole/End-systole lalu bandingkan ukuran rongga LV pada citra dan 3D.'),
      el('p', {}, el('b', {}, 'Respirasi: '), 'diafragma turun saat inspirasi sehingga hati, limpa dan paru bergeser kaudal — amati pergeseran organ di bidang USG/CT yang tetap. Tahan napas membekukan gerak ini.'),
      el('p', {}, el('b', {}, 'Antrum lambung: '), 'gelombang peristaltik ±3/menit mencampur dan mendorong isi lambung ke pilorus (jendela Antrum epigastrik).'),
      el('p', { class: 'meta' }, 'Gerak organ 3D dan pengambilan sampel citra memakai fungsi pergeseran yang SAMA, sehingga yang terlihat di 3D sesuai dengan citra.')),
    el('h4', {}, 'Jantung'),
    numberControl({ id: 'hr', testid: 'heart-rate', label: 'Denyut jantung', min: 40, max: 160, step: 1, unit: '/mnt', get: () => S.params.heartRate, set: (v) => { S.params.heartRate = v; } }),
    numberControl({ id: 'cphase', testid: 'cardiac-phase', label: 'Fase siklus jantung (saat dijeda)', min: 0, max: 99, step: 1, unit: '%', get: () => Math.floor((clock.beatPhase % 1) * 100), set: (v) => { clock.beatPhase = Math.floor(clock.beatPhase) + v / 100; S.playing = false; } }),
    el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn', 'data-testid': 'to-ed', onclick: () => { clock.beatPhase = Math.floor(clock.beatPhase); S.playing = false; refreshAll(); touch(); } }, 'End-diastole'), el('button', { type: 'button', class: 'btn', 'data-testid': 'to-es', onclick: () => { const T = 60 / S.params.heartRate; clock.beatPhase = Math.floor(clock.beatPhase) + (systoleSeconds(T) - 0.004) / T; S.playing = false; refreshAll(); touch(); } }, 'End-systole')),
    el('h4', {}, 'Respirasi'),
    numberControl({ id: 'rr', testid: 'resp-rate', label: 'Laju napas', min: 6, max: 36, step: 1, unit: '/mnt', get: () => S.params.respRate, set: (v) => { S.params.respRate = v; } }),
    numberControl({ id: 'depth', testid: 'breath-depth', label: 'Ekskursi diafragma', min: 0, max: 70, step: 1, unit: 'mm', get: () => S.params.breathDepth, set: (v) => { S.params.breathDepth = v; } }),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', 'data-testid': 'breath-hold', onchange: (e) => { S.params.breathHold = e.target.checked; touch(); } }), 'Tahan napas'),
    el('h4', {}, 'Saluran cerna (antrum lambung)'),
    numberControl({ id: 'af', testid: 'antral-frequency', label: 'Frekuensi kontraksi', min: 0, max: 6, step: 0.1, unit: '/mnt', get: () => S.params.antralFrequency, set: (v) => { S.params.antralFrequency = v; } }),
    numberControl({ id: 'aa', testid: 'antral-amplitude', label: 'Amplitudo (oklusi radial)', min: 0, max: 0.8, step: 0.01, get: () => S.params.antralAmplitude, set: (v) => { S.params.antralAmplitude = v; } }),
    numberControl({ id: 'as', label: 'Kecepatan rambat', min: 0.5, max: 6, step: 0.1, unit: 'mm/s', get: () => S.params.antralSpeed, set: (v) => { S.params.antralSpeed = v; } }),
    el('h4', {}, 'Aktif / nonaktif'),
    ...[['cardiacEnabled', 'Siklus jantung'], ['respirationEnabled', 'Respirasi'], ['peristalsisEnabled', 'Peristalsis']].map(([k, t]) => el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: true, 'data-testid': 'enable-' + k, onchange: (e) => { S.params[k] = e.target.checked; touch(); } }), t)),
  );

  // ---------------- Auscultation workspace
  const au = $('#tab-ausc');
  const SITE_GROUPS = [['Jantung', /^(aortic|pulmonic|erb|tricuspid|mitral)$/], ['Paru', /^lung_/], ['Abdomen', /^abd_/]];
  au.append(
    el('h3', {}, 'Auskultasi virtual'),
    el('p', { class: 'hint' }, 'Klik titik berwarna pada pasien atau pilih situs di bawah. Semua bunyi DISINTESIS oleh kode MEDCOEL (bukan rekaman) dan diselaraskan dengan siklus jantung/napas yang sama dengan gerak organ.'),
    el('div', { class: 'ausc-controls' },
      el('button', { type: 'button', class: 'btn primary big', id: 'audioBtn', 'data-testid': 'audio-toggle', onclick: toggleAudio }, '🔈 Putar bunyi'),
      el('div', { class: 'seg small', role: 'group', 'aria-label': 'Sisi stetoskop' },
        ...[['diaphragm', 'Diafragma'], ['bell', 'Bell']].map(([v, t]) => el('button', { type: 'button', 'data-testid': 'steth-' + v, 'aria-pressed': String(S.steth.filter === v), onclick: () => setFilter(v) }, t))),
      el('select', { 'data-testid': 'steth-filter', class: 'visually-hidden', 'aria-hidden': 'true', tabindex: '-1', onchange: (e) => setFilter(e.target.value) }, el('option', { value: 'diaphragm' }, 'Diafragma'), el('option', { value: 'bell' }, 'Bell'))),
    numberControl({ id: 'vol', testid: 'volume', label: 'Volume', min: 0, max: 1, step: 0.05, get: () => S.steth.volume, set: (v) => { S.steth.volume = v; audio.setVolume(v); } }),
    el('p', { class: 'meta' }, 'Suara hanya diputar setelah tombol ditekan (tidak autoplay). EKG di monitor adalah sinyal LISTRIK skematik; S1/S2 adalah peristiwa MEKANIS penutupan katup — bunyi tidak dibuat dari EKG.'),
    ...SITE_GROUPS.map(([title, re]) => el('div', { class: 'site-group' }, el('h4', {}, title),
      el('div', { class: 'site-list' }, ...(D?.anatomy?.auscultation || []).filter((x) => re.test(x.key)).map((x) => el('button', { type: 'button', class: 'chipbtn site ' + x.focus, 'data-testid': 'site-' + x.key, onclick: () => { placeSteth(x.point, x.normal, x.key); renderAusc(); } }, x.nameId))))),
    el('section', { id: 'auscSite', class: 'learn-card', 'data-testid': 'ausc-site', 'aria-live': 'polite' }),
    el('div', { id: 'auscReadout', class: 'readout', 'data-testid': 'ausc-readout', 'aria-live': 'polite' }),
    el('h4', {}, 'Normal vs patologis'),
    el('div', { class: 'view-grid' }, ...['normal', 'hfref', 'effusion'].map((k) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'ausc-scenario-' + k, onclick: () => { setScenario(k, false); renderAusc(); } }, SCENARIOS[k].titleId))),
    el('div', { id: 'auscCompare', class: 'meta' }),
    el('h4', {}, 'Bunyi tambahan paru (demo)'),
    el('select', { 'data-testid': 'adventitious', onchange: (e) => { S.adventitious = e.target.value; renderAusc(); } }, ...Object.entries(ADVENTITIOUS).map(([k, a]) => el('option', { value: k }, a.label))),
    el('p', { id: 'advText', class: 'hint warn' }),
    el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn', 'data-testid': 'ausc-practice', onclick: () => { setWorkspace('learn'); learn.start('m3'); } }, 'Latihan auskultasi (Modul 3) →')),
    el('details', { class: 'limits' }, el('summary', {}, 'Batas simulasi bunyi'), el('ul', {},
      el('li', {}, 'S1, S2 (dengan split S2 respiratorik), S3 pada skenario HFrEF, bunyi napas vesikular dan bunyi usus disintesis secara prosedural.'),
      el('li', {}, 'S4, murmur dan bunyi bronkial TIDAK dimodelkan. Crackles/wheeze hanya demo pengenalan pola dan belum ditinjau klinis.'),
      el('li', {}, 'Bunyi usus sintetis tidak boleh dipakai sebagai penanda diagnosis gastrointestinal.'),
      el('li', {}, 'Kualitas audio dan interpretasi klinis harus ditinjau sebelum rilis publik.'))),
  );
  renderAusc();

  // ---------------- Pathology tab
  $('#scenarioSelect').append(...Object.values(SCENARIOS).map((s) => el('option', { value: s.key }, s.titleId)));
  renderPathology();

  // ---------------- Data tab
  const dt = $('#tab-data');
  dt.append(
    el('h3', {}, 'Dataset bawaan'),
    field('Dataset', el('select', { 'data-testid': 'dataset-select', onchange: (e) => { const q = new URLSearchParams(location.search); q.set('dataset', e.target.value); location.search = q.toString(); } }, ...Object.entries(DATASETS).map(([k, d]) => el('option', { value: k, selected: k === DATASET || undefined }, d.label)))),
    el('p', { class: 'hint' }, DATASET === 'atlas' ? 'Atlas MEDCOEL: CT dan label sintetis dibangun dari mesh Atlas Anatomi MEDCOEL (bukan citra pasien). Mesh atlas, CT, kulit dan probe berada dalam satu kerangka LPS yang eksak.' : 'Phantom prosedural v1: tubuh sintetis lama tanpa atlas; tidak diregistrasi ke Atlas MEDCOEL.'),
    el('h3', {}, 'Data lokal'),
    el('p', { class: 'hint' }, 'Data lokal diproses di perangkat ini dan tidak diunggah. Untuk CTACardio: jalankan pipeline lokal (pipeline/README.md) lalu muat CT + label + paket mesh dari folder yang sama.'),
    field('CT (.nrrd, tunggal)', el('input', { type: 'file', id: 'ctFile', accept: '.nrrd', 'data-testid': 'ct-file' })),
    field('Label map (.nrrd, opsional)', el('input', { type: 'file', id: 'labFile', accept: '.nrrd' })),
    field('Paket mesh (skin.glb, organs.glb, registration.json, anatomy.json)', el('input', { type: 'file', id: 'meshFiles', accept: '.glb,.json', multiple: true })),
    el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn primary', onclick: loadLocal }, 'Muat data lokal'), el('button', { type: 'button', class: 'btn', onclick: () => loadPhantom().catch((e) => fail(e.message)) }, 'Phantom bawaan')),
    el('div', { id: 'dataInfo', class: 'readout' }),
    el('div', { id: 'memReadout', class: 'meta' }),
  );
}

let framesOpen = false, comparison = null;
async function loadComparison() { // atlas-vs-phantom residuals are measured by the atlas build; show them in both datasets
  if (comparison) return comparison;
  comparison = D?.anatomy?.comparisonWithProceduralPhantom || await fetch(DATASETS.atlas.dir + 'anatomy.json').then((r) => r.json()).then((a) => a.comparisonWithProceduralPhantom).catch(() => null);
  renderAtlasPanel(); return comparison;
}
function setTool(val) {
  S.tool = val;
  scene.siteMarkers.visible = shouldShowStethoscope(S);
  // Hide the stale image plane immediately when the auscultation instrument is selected.
  // The async imaging worker also checks this visibility policy before rendering its reply.
  if (!shouldShowImagingPlane(S)) scene.hideImagePlane();
  if (val !== 'inspect') { selected = selected || null; }
  refreshAll(); renderAtlasPanel(); touch();
}
function renderAtlasPanel() {
  const box = $('#tab-anatomy'); if (!box || !scene) return;
  buildAtlasPanel(box, {
    el, atlas, atlasState, S, D, DISPLAY_MODES, selected, comparison, framesOpen,
    actions: {
      setDisplayMode, setTool,
      loadSystem: (sys) => loadAtlasSystem(sys),
      setGroup: (g, o) => { atlas.setGroup(g, o); renderAtlasPanel(); motionShown = null; },
      setRespiratoryDetail: (enabled) => { atlas.setRespiratoryDetail(enabled); renderAtlasPanel(); motionShown = null; },
      select: (name) => { S.atlasQuery = name; if (atlas?.structures.has(name)) { selected = name; atlas.highlight(name); } renderAtlasPanel(); },
      highlight: (name) => { atlas.highlight(atlas.highlighted === name ? null : name); renderAtlasPanel(); },
      isolate: (name) => { atlas.isolate(name); if (name && organsHidden()) setDisplayMode('internal'); renderAtlasPanel(); },
      hide: (name, hidden = true) => { atlas.setStructureHidden(name, hidden); renderAtlasPanel(); },
      showAll: () => { atlas.showAll(); atlas.highlight(null); selected = null; renderAtlasPanel(); },
      markAnimated: (v) => { atlas.markAnimated = v; atlas.apply(); },
      framesOpen: (v) => { framesOpen = v; },
    },
  });
}

function ringsToggle() {
  return el('label', { class: 'check' }, el('input', { type: 'checkbox', 'data-testid': 'rings-toggle', checked: S.ctl.rings || undefined, onchange: (e) => { S.ctl.rings = e.target.checked; for (const c of document.querySelectorAll('[data-testid=rings-toggle]')) c.checked = S.ctl.rings; touch(); } }),
    'Tampilkan cincin/panah manipulasi 3D (lanjutan, untuk pengguna berpengalaman)');
}
function rebuildFreeSteps() {
  const box = $('#freeControls'); if (!box) return;
  box.innerHTML = '';
  const mm = S.precision.mm, deg = S.precision.deg;
  const names = [['L', 'Kiri(+) / Kanan(−)'], ['P', 'Posterior(+) / Anterior(−)'], ['S', 'Superior(+) / Inferior(−)']];
  names.forEach(([ax, t], i) => box.append(numberControl({ id: 'free' + ax, testid: 'free-pos-' + ax, label: `${ax}: ${t}`, min: -1500, max: 1500, step: mm, unit: 'mm', steps: [-10 * mm, -mm, mm, 10 * mm], get: () => S.free.position[i], set: (v) => { S.free.position[i] = v; } })));
  const ang = (k) => freeAngles(S.free.q)[k];
  const setAng = (k, v) => { const a = freeAngles(S.free.q); a[k] = v; S.free.q = freeQuat(a); };
  [['pitch', 'Pitch (sumbu L–R)'], ['yaw', 'Yaw (sumbu S–I)'], ['roll', 'Roll (sumbu A–P)']].forEach(([k, t]) => box.append(numberControl({ id: 'free' + k, testid: 'free-ang-' + k, label: t, min: -180, max: 180, step: deg, unit: '°', steps: [-5 * deg, -deg, deg, 5 * deg], get: () => ang(k), set: (v) => setAng(k, v) })));
  box.append(numberControl({ id: 'freeSize', label: 'Ukuran bidang', min: 60, max: 500, step: 10, unit: 'mm', get: () => S.free.size.width, set: (v) => { S.free.size = { width: v, height: v }; } }));
}

function renderPathology() {
  const box = $('#tab-pathology'); if (!box) return;
  const sc = SCENARIOS[S.scenario];
  box.innerHTML = '';
  const p = applyScenario(DEFAULT_PHYSIOLOGY, S.scenario), n = applyScenario(DEFAULT_PHYSIOLOGY, 'normal');
  box.append(
    el('div', { class: 'scenario-grid' }, ...Object.values(SCENARIOS).map((s) => el('button', { type: 'button', class: 'scenario' + (s.key === S.scenario ? ' active' : ''), 'data-testid': 'scenario-' + s.key, onclick: () => setScenario(s.key) }, el('strong', {}, s.titleId), el('span', {}, s.system)))),
    el('h3', {}, sc.title), el('p', {}, sc.summary),
    S.scenario !== 'normal' ? el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn primary', id: 'compareBtn', 'data-testid': 'compare-toggle', onclick: () => { S.compareNormal = !S.compareNormal; mixCache = null; pcgCache = null; scene.setEffusionMesh(null); if (!S.compareNormal && effusion) setScenario(S.scenario, false); refreshAll(); touch(); } }, 'Bandingkan dengan normal'),
      el('button', { type: 'button', class: 'btn', onclick: () => applyView(suggestedView(S.scenario)) }, 'Ke jendela yang disarankan')) : null,
    el('table', { class: 'compare' },
      el('tr', {}, el('th', {}, ''), el('th', {}, 'Normal'), el('th', {}, 'Skenario')),
      el('tr', {}, el('td', {}, 'EF model'), el('td', {}, `${(modelEjectionFraction(n) * 100).toFixed(0)}%`), el('td', { 'data-testid': 'ef-scenario' }, `${(modelEjectionFraction(p) * 100).toFixed(0)}%`)),
      el('tr', {}, el('td', {}, 'Dilatasi LV'), el('td', {}, '1,00×'), el('td', {}, `${p.lvDilation.toFixed(2)}×`)),
      el('tr', {}, el('td', {}, 'Efusi pleura'), el('td', {}, '0 mL'), el('td', {}, `${sc.effusionMl} mL`)),
      sc.layer && effusion ? el('tr', {}, el('td', {}, 'Lapisan cairan model'), el('td', {}, '0 mL'), el('td', { 'data-testid': 'layer-volume' }, `≈${effusion.volumeMl} mL`)) : null,
      el('tr', {}, el('td', {}, 'Indeks motilitas antrum'), el('td', {}, String(motilityIndex(n))), el('td', {}, String(motilityIndex(p))))),
    ...caseSections(S.scenario),
    !CASES[S.scenario] && sc.findings.length ? el('h4', {}, 'Yang perlu dicari') : null,
    !CASES[S.scenario] && sc.findings.length ? el('ul', {}, ...sc.findings.map((f) => el('li', {}, f))) : null,
    sc.teaching ? el('p', { class: 'hint' }, sc.teaching) : null,
    sc.references.length ? el('h4', {}, 'Referensi') : null,
    sc.references.length ? el('ol', { class: 'refs' }, ...sc.references.map((r) => el('li', {}, `[${r}] ${REF_ALL[r] || REFERENCES[r]}`))) : null,
    el('p', { class: 'hint warn' }, 'Skenario adalah model pendidikan berparameter, bukan diagnosis dan bukan perangkat medis tervalidasi.'),
  );
}

function setFilter(v) {
  S.steth.filter = v; audio.setFilter(v);
  for (const b of document.querySelectorAll('[data-testid^=steth-]')) if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.testid === 'steth-' + v));
  const sel = document.querySelector('[data-testid=steth-filter]'); if (sel) sel.value = v;
  renderAusc();
}
const REF_ALL = { ...REFERENCES, ...EDU_REFERENCES };
function renderAusc() {
  const box = $('#auscSite'); if (!box) return;
  const key = S.steth.key, site = D?.anatomy?.auscultation?.find((x) => x.key === key), g = key && SITE_GUIDE[key];
  for (const b of document.querySelectorAll('[data-testid^=site-]')) b.setAttribute('aria-pressed', String(b.dataset.testid === 'site-' + key));
  box.replaceChildren(...(site && g ? [
    el('h4', {}, 'Situs: ' + site.nameId),
    el('p', {}, el('b', {}, 'Dengarkan: '), g.listen), el('p', {}, el('b', {}, 'Mengapa di sini: '), g.why),
    key === 'mitral' && S.scenario === 'hfref' ? el('p', { class: 'hint' }, 'Skenario HFrEF: pilih BELL untuk S3 bernada rendah di awal diastol.') : null,
    el('p', { class: 'meta' }, 'Rujukan: ' + g.refs.map((r) => `[${r}] ${REF_ALL[r] || r}`).join(' · ')),
  ] : [el('h4', {}, 'Pilih situs'), el('p', { class: 'meta' }, S.steth.ref ? 'Stetoskop di titik bebas pada kulit: campuran bunyi dihitung dari jarak ke organ.' : 'Klik titik pada pasien atau tombol situs.')]));
  const cmp = $('#auscCompare');
  if (cmp) cmp.textContent = S.scenario === 'hfref' ? 'HFrEF (model): S3 sintetis ±180 ms setelah S2, paling jelas dengan bell di area mitral. Bandingkan dengan Normal.'
    : S.scenario === 'effusion' ? 'Efusi pleura kanan (model): bunyi napas berkurang di basal kanan, terutama posterior. Bandingkan dengan sisi kiri dan dengan Normal.'
      : 'Normal: S1 paling keras di apeks, S2 di basis; bunyi napas vesikular simetris.';
  const adv = $('#advText'); if (adv) adv.textContent = ADVENTITIOUS[S.adventitious]?.text || '';
}
/** Structured case (context, anatomy, baseline, mechanism, findings by fidelity, differentials, limits, review status). */
function caseSections(key) {
  const c = CASES[key]; if (!c) return [];
  const sec = (title, ...kids) => el('section', { class: 'case-sec' }, el('h4', {}, title), ...kids);
  return [el('div', { class: 'case', 'data-testid': 'case-' + key },
    el('p', { class: 'case-context' }, c.context),
    sec('Anatomi terkait', el('div', { class: 'view-grid' }, ...c.anatomy.filter((k) => STRUCTURES[k]).map((k) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'case-struct-' + k, onclick: () => { if (assist.level === 'off') setAssistLevel('guided'); assist.select(k); } }, STRUCTURES[k].nameId)))),
    sec('Baseline normal', el('p', {}, c.baseline)),
    sec('Mekanisme', el('p', {}, c.mechanism)),
    sec('Temuan', el('ul', { class: 'findings' }, ...c.findings.map(([fid, t]) => el('li', { class: 'fid-' + fid }, el('span', { class: 'fid', title: 'Tingkat kesesuaian simulasi' }, FIDELITY[fid]), ' ', t)))),
    sec('Pertimbangan diferensial', el('ul', {}, ...c.differentials.map((t) => el('li', {}, t)))),
    sec('Keterbatasan', el('ul', {}, ...c.limitations.map((t) => el('li', {}, t)))),
    el('p', { class: 'review-status' }, 'Status tinjauan: DRAF — belum ditinjau pendidik klinis (lihat MEDICAL_REVIEW_CHECKLIST.md).'),
  )];
}
function placeSteth(point, normal, key) {
  S.tool = 'stethoscope';
  scene.hideImagePlane();
  // site points are reference anatomy coordinates
  S.steth.ref = [...point]; S.steth.normal = [...normal]; S.steth.point = [...point]; S.steth.key = key;
  mixCache = null; refreshAll(); scene.siteMarkers.visible = true;
}
function syncAudioButtons() {
  const b = $('#audioBtn'), quick = $('#soundQuickBtn');
  if (b) { b.textContent = audio.on ? '⏹ Hentikan bunyi' : '🔈 Putar bunyi'; b.setAttribute('aria-pressed', String(audio.on)); }
  if (quick) { quick.textContent = audio.on ? '🔊 Suara aktif' : '🔈 Dengar jantung'; quick.setAttribute('aria-pressed', String(audio.on)); }
}
async function toggleAudio() {
  if (!audio.supported) { status('Web Audio tidak tersedia di browser ini.', 'warn'); return; }
  if (audio.on) { audio.stop(); syncAudioButtons(); return; }
  try {
    lastAudio = await audio.start(); audio.setVolume(S.steth.volume); audio.setFilter(S.steth.filter);
    S.playing = true; S.speed = 1;
    $('#speedSelect').value = '1';
    // The real stethoscope model is already synchronized to the cardiac motion/PCG.
    if (!S.steth.ref) {
      const m = D?.anatomy?.auscultation?.find((s) => s.key === 'mitral');
      if (m) {
        // Quick playback must not silently switch the user from Probe to Stethoscope.
        S.steth.ref = [...m.point]; S.steth.point = [...m.point];
        S.steth.normal = [...m.normal]; S.steth.key = 'mitral'; mixCache = null;
      }
    }
    syncAudioButtons(); refreshAll();
    status('Suara stetoskop sintetis aktif. EKG di layar adalah sinyal listrik skematik, bukan sumber bunyi.', 'ok');
  } catch (e) { status('Gagal mengaktifkan suara: ' + (e?.message || e), 'warn'); syncAudioButtons(); }
}

async function loadLocal() {
  try {
    const ct = $('#ctFile').files[0]; if (!ct) throw new Error('Pilih file CT .nrrd');
    const lab = $('#labFile').files[0];
    const files = {}; let reg = null, anatomy = null;
    for (const f of $('#meshFiles').files) {
      if (f.name.endsWith('.glb')) files[f.name] = await f.arrayBuffer();
      else if (f.name === 'registration.json') reg = JSON.parse(await f.text());
      else if (f.name === 'anatomy.json') anatomy = JSON.parse(await f.text());
    }
    await useDataset({ ctBuf: await ct.arrayBuffer(), labBuf: lab ? await lab.arrayBuffer() : null, anatomy, reg, files: reg ? files : null, source: 'local', name: ct.name });
    renderAtlasPanel();
    $('#dataInfo').textContent = `${ct.name} dimuat lokal. ${D.labels ? 'Label tersedia.' : 'Tanpa label: USG memakai klasifikasi HU (kasar).'} ${D.meshes ? 'Mesh terverifikasi.' : 'Tanpa mesh: hanya Free 3D.'} ${geom ? '' : 'Gerak fisiologis butuh anatomy.json.'}`;
  } catch (e) { fail(e.message); }
}

function fail(msg) { const b = $('#runtimeError'); b.hidden = false; b.textContent = msg; console.error(msg); }

// ------------------------------------------------------------------ 2D <-> 3D anatomy links
/** Image -> 3D: highlight the matching atlas structure, ONLY where registration is exact (atlas dataset). */
function link3d(st) {
  if (!atlas || D?.anatomy?.dataset !== 'atlas') { if (st && D?.anatomy?.dataset !== 'atlas') status('Tautan ke 3D hanya tersedia pada dataset atlas (registrasi eksak); data ini tidak diregistrasi ke atlas.', 'info'); return; }
  const name = st?.atlas.find((n) => atlas.structures.has(n)) || null;
  atlas.highlight(name); selected = name; renderAtlasPanel();
  if (st && !name && st.atlas.length) status(`${st.nameId}: model 3D-nya belum dimuat atau tidak tersedia.`, 'info');
}
function isolate3d(key) {
  const st = STRUCTURES[key], name = st?.atlas.find((n) => atlas?.structures.has(n)); if (!name) return;
  atlas.isolate(name); if (organsHidden()) setDisplayMode('internal'); renderAtlasPanel();
}
/** 3D -> image: select the structure in the imaging overlay if it has a label and intersects the current image. */
function link3dToImage(atlasName) {
  if (D?.anatomy?.dataset !== 'atlas') return;
  if (assist.level === 'off') setAssistLevel('guided');
  const r = assist.selectByAtlasName(atlasName);
  if (!r.ok) status(`${atlasName}: ${r.reason}`, 'info');
  else if (!r.inImage) status(`${STRUCTURES[r.key].nameId} tidak memotong bidang citra saat ini. Geser bidang (↕ ↔ ⇅) untuk melihatnya.`, 'info');
}
function setAssistLevel(level) { assist.setLevel(level); const s = $('#assistLevel'); if (s) s.value = level; document.body.dataset.assist = level; }

// ------------------------------------------------------------------ learning bridge
const centroidCache = new Map();
function structureCentroid(key) {
  if (centroidCache.has(key)) return centroidCache.get(key);
  const vol = D?.labels, st = STRUCTURES[key]; if (!vol || !st) return null;
  const set = new Set(st.labels), [nx, ny, nz] = vol.sizes, a = vol.affine, c = [0, 0, 0]; let n = 0;
  for (let k = 0; k < nz; k += 2) for (let j = 0; j < ny; j += 2) for (let i = 0; i < nx; i += 2) {
    if (!set.has(vol.data[(k * ny + j) * nx + i])) continue;
    c[0] += a[0] * i + a[1] * j + a[2] * k + a[3]; c[1] += a[4] * i + a[5] * j + a[6] * k + a[7]; c[2] += a[8] * i + a[9] * j + a[10] * k + a[11]; n++;
  }
  const r = n ? c.map((v) => v / n) : null; centroidCache.set(key, r); return r;
}
/** Prepare the view a task asks for, using the real simulator controls. */
function learnSetup(spec) {
  if (spec.scenario && spec.scenario !== S.scenario) setScenario(spec.scenario, !spec.view);
  if (spec.view) applyView(spec.view);
  if (spec.free) {
    S.mode = 'free'; S.free.q = freeQuat(FREE_PRESETS[spec.free]);
    const c = spec.at && structureCentroid(spec.at); if (c) S.free.position = c;
  }
  if (spec.display === 'tri') setImagingDisplay('tri');
  else if (spec.display) S.display = spec.display;
  else if (spec.view && S.display === 'tri') S.display = 'split';
  if (spec.tool) setTool(spec.tool);
  scene.hideImagePlane(); requestImaging.generation = (requestImaging.generation || 0) + 1;
  refreshAll(); touch();
}
/** What the learner currently sees, from the same label rasters as the overlay. */
function learnSnapshot() {
  const f = geom ? makeFrame(clock, effectiveParams(), geom) : null, plane = currentPlane(currentPose(f));
  const visible = new Map(); for (const v of assist.visible(S.display === 'tri' ? 'ax' : 'main', 1)) visible.set(v.key, v.area);
  const g = lastFrameInfo?.centreLabel >= 0 ? assist.G.lut[lastFrameInfo.centreLabel] : 0;
  return { plane, visible, centreKey: assist.G.keyOf(g), site: S.steth.key || null, filter: S.steth.filter, scenario: S.scenario, display: S.display, mode: S.mode };
}

// Always-visible monitor scrollbar for Safari (which often hides native scrollbars).
// The rail is outside the CT canvas so pointer movement here never changes a CT slice.
let syncMonitorScrollbar = () => {};
function setupMonitorScrollbar() {
  const scroller = $('#monitorScroll'), track = $('#monitorScrollTrack'),
    thumb = $('#monitorScrollThumb'), up = $('#monitorScrollUp'), down = $('#monitorScrollDown');
  if (!scroller || !track || !thumb || !up || !down) return;
  const measure = () => {
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const trackHeight = track.getBoundingClientRect().height;
    const thumbHeight = trackHeight > 0
      ? Math.min(trackHeight, Math.max(36, trackHeight * scroller.clientHeight / Math.max(scroller.scrollHeight, 1)))
      : 0;
    return { max, thumbHeight, travel: Math.max(0, trackHeight - thumbHeight) };
  };
  const sync = () => {
    const { max, thumbHeight, travel } = measure();
    const fraction = max > 1 ? Math.max(0, Math.min(1, scroller.scrollTop / max)) : 0;
    thumb.style.height = `${Math.round(thumbHeight)}px`;
    thumb.style.transform = `translateY(${Math.round(fraction * travel)}px)`;
    track.classList.toggle('can-scroll', max > 1);
    track.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    track.setAttribute('aria-valuetext', `${Math.round(fraction * 100)}% posisi gulir monitor`);
    up.disabled = max <= 1 || scroller.scrollTop <= 1;
    down.disabled = max <= 1 || scroller.scrollTop >= max - 1;
  };
  const jump = (delta) => scroller.scrollBy({ top: delta, behavior: 'smooth' });
  up.addEventListener('click', () => jump(-Math.max(130, scroller.clientHeight * 0.65)));
  down.addEventListener('click', () => jump(Math.max(130, scroller.clientHeight * 0.65)));
  let drag = null;
  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const m = measure();
    if (m.max <= 1 || m.travel <= 0) return;
    if (event.target !== thumb) {
      const rect = track.getBoundingClientRect();
      scroller.scrollTop = Math.max(0, Math.min(m.max, (event.clientY - rect.top - m.thumbHeight / 2) / m.travel * m.max));
    }
    drag = { pointerId: event.pointerId, y: event.clientY, scrollTop: scroller.scrollTop };
    track.setPointerCapture(event.pointerId);
    track.classList.add('is-dragging');
    event.preventDefault();
    sync();
  });
  track.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const { max, travel } = measure();
    if (travel > 0) scroller.scrollTop = Math.max(0, Math.min(max, drag.scrollTop + (event.clientY - drag.y) * max / travel));
  });
  const endDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('keydown', (event) => {
    const m = measure();
    const step = Math.max(50, Math.round(scroller.clientHeight * 0.2));
    const next = {
      ArrowUp: scroller.scrollTop - step,
      ArrowDown: scroller.scrollTop + step,
      PageUp: scroller.scrollTop - scroller.clientHeight * 0.8,
      PageDown: scroller.scrollTop + scroller.clientHeight * 0.8,
      Home: 0,
      End: m.max,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    scroller.scrollTop = Math.max(0, Math.min(m.max, next));
  });
  scroller.addEventListener('scroll', sync, { passive: true });
  const observer = new ResizeObserver(() => requestAnimationFrame(sync));
  for (const node of [scroller, track, $('#triControls'), $('.monitor-body'), $('.strip-wrap'), $('.playbar')]) {
    if (node) observer.observe(node);
  }
  syncMonitorScrollbar = sync;
  requestAnimationFrame(sync);
}

// ------------------------------------------------------------------ layout controls
function installLayout() {
  const ws = $('#workspace'), div = $('#divider');
  $('#returnProbe').onclick = () => setScanMode('clinical');
  $('#freeMode').onclick = () => setScanMode('free');
  $('#triMode').onclick = () => { if (S.display !== 'tri') setImagingDisplay('tri'); };
  buildTriControls();
  setupMonitorScrollbar();
  $('#triShowImages').onclick = () => {
    const scroller = $('#monitorScroll'), image = $('.monitor-body');
    if (!scroller || !image) return;
    const next = scroller.scrollTop + image.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({ top: Math.max(0, next), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  let drag = null;
  div.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, w: $('#monitorPanel').getBoundingClientRect().width }; div.setPointerCapture(e.pointerId); });
  div.addEventListener('pointermove', (e) => { if (!drag) return; const w = Math.min(window.innerWidth * 0.75, Math.max(280, drag.w - (e.clientX - drag.x))); ws.style.setProperty('--monitor-w', w + 'px'); });
  div.addEventListener('pointerup', () => { drag = null; });
  div.addEventListener('keydown', (e) => { const cur = $('#monitorPanel').getBoundingClientRect().width; if (e.key === 'ArrowLeft') ws.style.setProperty('--monitor-w', cur + 40 + 'px'); if (e.key === 'ArrowRight') ws.style.setProperty('--monitor-w', Math.max(280, cur - 40) + 'px'); });
  $('#zoomIn').onclick = () => monitor.zoomBy(1.25); $('#zoomOut').onclick = () => monitor.zoomBy(0.8);
  $('#fitBtn').onclick = () => monitor.fit(); $('#oneBtn').onclick = () => monitor.oneToOne();
  $('#expandBtn').onclick = () => { document.body.classList.toggle('monitor-expanded'); $('#expandBtn').setAttribute('aria-pressed', String(document.body.classList.contains('monitor-expanded'))); };
  $('#fullBtn').onclick = async () => {
    const p = $('#monitorPanel');
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (p.requestFullscreen) await p.requestFullscreen(); else document.body.classList.toggle('monitor-expanded'); }
    catch { document.body.classList.toggle('monitor-expanded'); }
  };
  $('#playBtn').onclick = () => { S.playing = !S.playing; refreshAll(); touch(); };
  for (const b of document.querySelectorAll('.monitor-toolbar [data-seg]')) b.onclick = () => { const [k, v] = b.dataset.seg.split(':'); onSeg(k, v); };
  $('#speedSelect').onchange = (e) => { S.speed = Number(e.target.value); if (audio.on && S.speed !== 1) { audio.stop(); syncAudioButtons(); } };
  $('#soundQuickBtn').onclick = toggleAudio;
  $('#scenarioSelect').onchange = (e) => setScenario(e.target.value);
  for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => scene.setView(b.dataset.view);
  $('#skinOpacity').oninput = (e) => { S.appearance.skinOpacity = Number(e.target.value) / 100; S.appearance.mode = 'custom'; applyAppearance(); renderAtlasPanel(); };
  $('#cutaway').onchange = (e) => { S.appearance.cutaway = e.target.value; S.appearance.mode = 'custom'; if (e.target.value !== 'none' && S.appearance.skinOpacity > 0.95) { S.appearance.skinOpacity = 1; } applyAppearance(); renderAtlasPanel(); };
  $('#cutDepth').oninput = (e) => { S.appearance.cutDepth = Number(e.target.value); applyAppearance(); };
  for (const c of document.querySelectorAll('[data-system]')) c.onchange = () => { S.appearance.systems[c.dataset.system] = c.checked; applyAppearance(); };
  $('#coverageToggle').onchange = (e) => { S.appearance.showCoverage = e.target.checked; applyAppearance(); };
  // tabs
  for (const t of document.querySelectorAll('[role=tab]')) t.onclick = () => {
    for (const x of document.querySelectorAll('[role=tab]')) x.setAttribute('aria-selected', String(x === t));
    for (const p of document.querySelectorAll('[role=tabpanel]')) p.hidden = p.id !== t.getAttribute('aria-controls');
  };
  // drawer sidebar: closed by default so the patient and the image get the space; opened on demand
  $('#panelToggle').onclick = () => setSidebar(document.body.dataset.sidebar !== 'open');
  document.querySelector('.drawer-close').onclick = () => setSidebar(false);
  $('#helpBtn').onclick = () => { const h = $('#helpPop'); h.hidden = !h.hidden; $('#helpBtn').setAttribute('aria-expanded', String(!h.hidden)); };
  $('#replayTourBtn').onclick = () => { $('#helpPop').hidden = true; $('#helpBtn').setAttribute('aria-expanded', 'false'); startTour(true); };
  for (const b of document.querySelectorAll('.pane-switch [data-pane]')) b.onclick = () => setPane(b.dataset.pane);
  setPane('patient');
  setSidebar(false); document.body.dataset.ws = 'imaging';
  // workspaces: one task-focused workspace at a time, sharing the same patient, scene and monitor
  for (const b of document.querySelectorAll('.ws-nav [data-ws]')) b.onclick = () => setWorkspace(b.dataset.ws);
  $('#assistLevel').onchange = (e) => setAssistLevel(e.target.value);
  const wl = $('#wlPreset');
  if (wl) { wl.append(...Object.entries(CT_PRESETS).map(([k, p]) => el('option', { value: k }, p.label))); wl.onchange = (e) => { const p = CT_PRESETS[e.target.value]; if (p) { S.ct.window = p.window; S.ct.level = p.level; refreshAll(); touch(); } }; }
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); S.playing = !S.playing; refreshAll(); return; }
    if (e.key === 'f') { $('#fullBtn').click(); return; }
    // arrows = patient directions on the pad (← Kanan pasien, → Kiri pasien), PageUp/PageDown = anterior/posterior,
    // Q/E = rotate the probe (or yaw the plane); Shift = fine
    const key = { ArrowUp: 'superior', ArrowDown: 'inferior', ArrowLeft: 'right', ArrowRight: 'left', PageUp: 'anterior', PageDown: 'posterior' }[e.key];
    if (key) { e.preventDefault(); padMove(key, e.shiftKey); return; }
    if ((e.key === 'q' || e.key === 'e') && padKind() !== 'tri') padRotate(S.mode === 'free' ? 'yaw' : 'rotate', e.key === 'e' ? 1 : -1, e.shiftKey);
  });
}
// Interactive tutorial (mascot-led, learn-by-doing): engine in tutorial.js, content in tutorialSteps.js. Shown once per browser
// (key bumped to v3 when it became interactive); students replay it from the ? help menu.
const TOUR_KEY = 'medcoel-4dlab-tour-v3';
const TRI_TOUR_KEY = 'medcoel-4dlab-tri-tour-v2';
function startTour(force = false, kind = 'general') {
  const tri = kind === 'tri';
  const ctx = { S, scene, padKind, setAssistLevel, assistSelect: $('#assistLevel'), hoverTip: $('#hoverTip') };
  startTutorial({
    steps: tri ? triSteps(ctx) : generalSteps(ctx), storageKey: tri ? TRI_TOUR_KEY : TOUR_KEY,
    label: tri ? 'PANDUAN TRI-PLANAR' : 'TUTORIAL INTERAKTIF', el, setPane, force,
  });
}
function setSidebar(open) {
  document.body.dataset.sidebar = open ? 'open' : 'closed';
  $('#panelToggle')?.setAttribute('aria-expanded', String(open));
  setTimeout(() => { scene?.resize?.(); monitor?.resize(); monitor?.draw(); }, 230);
}
/** Small screens show one pane at a time (patient or image); larger screens show both. */
function setPane(pane) {
  document.body.dataset.pane = pane;
  for (const b of document.querySelectorAll('.pane-switch [data-pane]')) b.setAttribute('aria-selected', String(b.dataset.pane === pane));
  setTimeout(() => { scene?.resize?.(); monitor?.resize(); monitor?.draw(); }, 60);
}
const WS_DEFAULT_TAB = { imaging: 'tab-probe', ausc: 'tab-ausc', physio: 'tab-physiology', patho: 'tab-pathology', learn: 'tab-learn' };
function setWorkspace(ws) {
  if (!WS_DEFAULT_TAB[ws]) return;
  S.ws = ws; document.body.dataset.ws = ws;
  for (const b of document.querySelectorAll('.ws-nav [data-ws]')) b.setAttribute('aria-selected', String(b.dataset.ws === ws));
  for (const t of document.querySelectorAll('.tabs [role=tab]')) t.hidden = t.dataset.ws !== ws;
  const first = document.querySelector(`.tabs [aria-controls=${WS_DEFAULT_TAB[ws]}]`); first?.click();
  // the imaging workspace is driven from the mode bar (panel closed); the others live in the panel
  setSidebar(ws !== 'imaging');
  if (ws === 'ausc') { // the stethoscope is the tool of this workspace; start at the mitral area
    setTool('stethoscope');
    if (!S.steth.ref) { const m = D?.anatomy?.auscultation?.find((x) => x.key === 'mitral'); if (m) placeSteth(m.point, m.normal, 'mitral'); }
    renderAusc();
  } else if (S.tool === 'stethoscope') setTool('probe');
  if (ws === 'patho') renderPathology();
  if (ws === 'learn') learn?.render();
  document.body.dataset.learning = ws === 'learn' ? '1' : '';
}
function organsHidden() { return S.appearance.skinOpacity >= 0.999 && S.appearance.cutaway === 'none'; }
/** Workstation display modes (atlas dataset): what is drawn, never what is imaged. */
export const DISPLAY_MODES = {
  external: { label: 'Tubuh luar', skinOpacity: 1, cutaway: 'none', atlasOpacity: 1, showCoverage: false },
  transparent: { label: 'Kulit transparan', skinOpacity: 0.22, cutaway: 'none', atlasOpacity: 1, showCoverage: false },
  cutaway: { label: 'Cutaway anatomis', skinOpacity: 1, cutaway: 'anterior', atlasOpacity: 1, showCoverage: false },
  internal: { label: 'Anatomi dalam', skinOpacity: 0, cutaway: 'none', atlasOpacity: 1, showCoverage: false },
  coverage: { label: 'Cakupan pencitraan', skinOpacity: 0.16, cutaway: 'none', atlasOpacity: 0.35, showCoverage: true },
};
function setDisplayMode(key) {
  const m = DISPLAY_MODES[key]; if (!m) return;
  Object.assign(S.appearance, { mode: key, skinOpacity: m.skinOpacity, cutaway: m.cutaway, atlasOpacity: m.atlasOpacity, showCoverage: m.showCoverage });
  const so = $('#skinOpacity'); if (so) so.value = String(Math.max(5, Math.round(m.skinOpacity * 100)));
  const cu = $('#cutaway'); if (cu) cu.value = m.cutaway;
  const ct = $('#coverageToggle'); if (ct) ct.checked = m.showCoverage;
  applyAppearance(); renderAtlasPanel();
}
function applyAppearance() {
  scene.setAppearance(S.appearance);
  if (organsHidden()) for (const [n, m] of Object.entries(scene.meshes)) if (n !== 'skin') m.mesh.visible = false;
  if (atlas) { atlas.globalOpacity = S.appearance.atlasOpacity ?? 1; atlas.setVisible(D?.anatomy?.dataset === 'atlas' && atlasState !== 'unavailable' && !organsHidden()); }
  document.body.dataset.display = S.appearance.mode || 'custom';
  motionShown = null;
}

// ------------------------------------------------------------------ boot
async function boot() {
  try {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('WebGL tidak tersedia: tampilan 3D tidak dapat dibuat. Aktifkan akselerasi grafis di browser.');
    // Bundled CT/labels are gzip NRRD: DecompressionStream needs Safari 16.4+ / Chrome 80+ / Firefox 113+.
    if (typeof DecompressionStream === 'undefined') throw new Error('Browser ini terlalu lama untuk 4D Lab (tidak ada DecompressionStream). Perbarui ke Safari 16.4 atau lebih baru (macOS: Pengaturan Sistem → Pembaruan Perangkat Lunak), atau gunakan Chrome/Firefox terbaru.');
    scene = new PatientScene($('#viewport'), {
      onContact: (c) => { if (!contactInCoverage(c)) return; S.contact = c; S.mode = 'clinical'; touch(); updateReadouts(); },
      onSkinClick: (c, interaction) => {
        if (S.tool === 'stethoscope') { placeSteth(c.point, c.normal, null); return; }
        if (S.mode === 'clinical' && contactInCoverage(c)) { S.contact = c; touch(); updateReadouts(); renderPad(); }
      },

      onPick: (e) => {
        if (S.tool !== 'inspect' || !atlas) return false;
        const hit = scene.pickAtlas(e, atlas); selected = hit?.name || null;
        atlas.highlight(selected); renderAtlasPanel();
        if (selected) link3dToImage(selected);
        return true;
      },
      onRotate: (axis, deg) => {
        if (S.mode === 'clinical') { const lim = CLINICAL_LIMITS[axis] || 1e9; S.angles[axis] = axis === 'rotate' ? ((S.angles[axis] + deg + 540) % 360) - 180 : Math.max(-lim, Math.min(lim, S.angles[axis] + deg)); }
        else S.free.q = rotateFree(S.free.q, { L: [1, 0, 0], P: [0, 1, 0], S: [0, 0, 1] }[axis], deg);
        refreshAll(); touch();
      },
      onTranslate: (axis, mm) => { const i = { L: 0, P: 1, S: 2 }[axis]; S.free.position[i] += mm; refreshAll(); touch(); },
      onSite: (key) => { const s = D.anatomy.auscultation.find((x) => x.key === key); if (s) placeSteth(s.point, s.normal, key); },
      onDragStart: () => touch(), onDragEnd: () => touch(),
    });
    monitor = new Monitor($('#monitor'));
    assist = new Assist({
      el, monitor, tip: $('#hoverTip'), panel: $('#assistPanel'),
      dataset: () => D?.anatomy?.dataset || D?.source, labelsAvailable: () => !!D?.labels,
      unavailable: () => unavailableStructures(D?.anatomy),
      link3d: (st) => link3d(st), isolate3d: (key) => isolate3d(key), restore3d: () => { atlas?.isolate(null); atlas?.highlight(null); renderAtlasPanel(); },
      onSelect: () => {}, onAnswer: (id) => learn?.answerPick(id),
    });
    monitor.onHover = (hit, ev) => assist.onHover(hit, ev);
    monitor.onPick = (hit) => {
      if (S.display === 'tri' && hit && !hit.outside && hit.key !== 'info' && hit.plane) { // move the linked crosshair
        S.tri.point = clampToBounds(pixelToLPS(hit.plane, hit.w, hit.h, hit.px, hit.py), D.ct.bounds); touch();
        pad?.update(); updateTriControls();
      }
      assist.onPick(hit);
    };
    monitor.onSlice = (key, sign, fine) => { if (!S.tri.point) return; S.tri.point = stepSlice(S.tri.point, key, sign * (fine ? 0.5 : 1) * Math.min(...D.ct.spacing), D.ct.bounds); pad?.update(); updateTriControls(); touch(); };
    installLayout();
    await loadPhantom();
    learn = new Learn({ el, root: $('#tab-learn'), snapshot: learnSnapshot, setup: learnSetup, setAssist: (lv) => setAssistLevel(lv), status,
      navigation: () => ({ mode: S.mode, display: S.display }), returnProbe: () => { setScanMode('clinical'); learn.render(); } });
    buildPanels();
    learn.render();
    scene.setInteraction('place'); renderPad(); startTour();
    if (DATASET === 'atlas') setDisplayMode('transparent'); else S.appearance.mode = 'custom';
    applyAppearance(); refreshAll(); renderAtlasPanel(); loadComparison();
    document.body.dataset.ready = '1';
    requestAnimationFrame(loop);
  } catch (e) { fail(e.message || String(e)); document.body.dataset.ready = 'error'; }
}
boot();
