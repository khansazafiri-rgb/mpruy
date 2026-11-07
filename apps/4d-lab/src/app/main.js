// MEDCOEL Anatomy Live 4D Lab — workstation controller.
import { parseNrrd } from '../core/nrrd.js';
import { makeVolume, sameGrid } from '../core/volume.js';
import { validateRegistration } from '../core/mesh.js';
import { clinicalPose, freePose, freeQuat, freeAngles, FREE_PRESETS, imagingPlane, PROBES, rotateFree, CLINICAL_LIMITS, fovOutline } from '../core/probe.js';
import { CT_PRESETS } from '../core/reslice.js';
import { DEFAULT_PHYSIOLOGY, createClock, advanceClock, makeFrame, prepareGeometry, displacement, deformPositions, modelEjectionFraction, cardiacState, respState, antralContraction, systoleSeconds } from '../sim/physiology.js';
import { SCENARIOS, applyScenario, buildEffusion, motilityIndex } from '../sim/pathology.js';
import { cloneTissues, TISSUES, impedance } from '../sim/tissues.js';
import { siteMix, heartCycle } from '../sim/auscultation.js';
import { VIEWS, snapToSkin } from '../sim/views.js';
import { REFERENCES } from '../sim/references.js';
import { PatientScene } from './scene3d.js';
import { Monitor, drawStrip } from './monitor.js';
import { AudioEngine } from './audio.js';
import { voxelSurface } from './blobMesh.js';

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
const DATA = BASE + 'data/phantom/';
const SUGGESTED_VIEW = { hfref: 'apical', effusion: 'right_flank', gastroparesis: 'epigastric', normal: 'subxiphoid' };

// ------------------------------------------------------------------ state
const S = {
  mode: 'clinical', tool: 'probe', probeKey: 'phased',
  contact: null, angles: { rotate: 0, heelToe: 0, rock: 0 },
  free: { position: [20, 0, 40], q: freeQuat(FREE_PRESETS.coronal), size: { width: 260, height: 260 } },
  precision: { mm: 1, deg: 1 },
  us: { freq: 2.5, depth: 160, gain: 0, dynamicRange: 52, tgc: [0, 0, 0], autoTGC: true, focusFraction: 0.5, coupling: 'skin' },
  ct: { window: 400, level: 40, clip: true },
  display: 'split',
  params: { ...DEFAULT_PHYSIOLOGY }, playing: true, speed: 1,
  scenario: 'normal', compareNormal: false,
  tissues: cloneTissues(),
  appearance: { skinOpacity: 1, cutaway: 'none', cutDepth: 40, showCoverage: true, systems: { skeleton: true, cardiovascular: true, respiratory: true, abdominal: true, urinary: true, nervous: false, pathology: true } },
  steth: { point: null, normal: null, ref: null, normal0: null, filter: 'diaphragm', volume: 0.7 },
  view: 'subxiphoid',
};
const clock = createClock();
const audio = new AudioEngine();
let D = null; // loaded data
let scene = null, monitor = null, worker = null, geom = null;
let effusion = null;
let dirty = true, interacting = false, lastInteraction = 0, workerBusy = false, pending = false, lastFrameInfo = null, frameCount = 0;
let lastDeform = 0, motionShown = null;
const stats = { usMs: 0, deformMs: 0, fps: 0 };
window.__lab = { S, clock, stats, audio, get scene() { return scene; }, get monitor() { return monitor; }, get data() { return D; }, get last() { return lastFrameInfo; }, get effusion() { return effusion; } };

function markDirty() { dirty = true; }
function touch() { interacting = true; lastInteraction = performance.now(); markDirty(); }
function effectiveParams() { return S.compareNormal ? { ...applyScenario(DEFAULT_PHYSIOLOGY, 'normal'), ...pick(S.params, ['heartRate', 'respRate', 'breathDepth', 'breathHold', 'cardiacEnabled', 'respirationEnabled', 'peristalsisEnabled']) } : S.params; }
function effusionMl() { return S.compareNormal ? 0 : SCENARIOS[S.scenario].effusionMl; }
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

// ------------------------------------------------------------------ data loading
async function fetchBuf(name) {
  const r = await fetch(DATA + name, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Gagal memuat ${name} (HTTP ${r.status})`);
  return r.arrayBuffer();
}
function status(text, kind = 'info') { const s = $('#loadStatus'); if (s) { s.textContent = text; s.dataset.kind = kind; } }

async function loadPhantom() {
  status('Memuat phantom sintetis (CT, label, mesh)…');
  const [ctBuf, labBuf, anatomy, reg, skin, organs] = await Promise.all([
    fetchBuf('ct.nrrd'), fetchBuf('labels.nrrd'), fetch(DATA + 'anatomy.json').then((r) => r.json()), fetch(DATA + 'registration.json').then((r) => r.json()), fetchBuf('skin.glb'), fetchBuf('organs.glb'),
  ]);
  await useDataset({ ctBuf, labBuf, anatomy, reg, files: { 'skin.glb': skin, 'organs.glb': organs }, source: 'phantom', name: 'MEDCOEL synthetic phantom' });
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
  if (meshes) {
    const keep = Object.fromEntries(Object.entries(meshes).map(([k, m]) => [k, { lps: m.lps, indices: m.indices }]));
    scene.setMeshes(keep, { coverage: ct.bounds, capZ: ct.bounds.lo[2] + 6 });
    prepareMotionMasks();
  } else {
    scene.setMeshes({}, { coverage: ct.bounds, capZ: -1e9 });
    S.mode = 'free';
  }
  scene.setSites(anatomy?.auscultation || [], S.tool === 'stethoscope');
  if (meshes && labels) applyView(S.view, false); else S.free.position = [...ct.centre];
  if (!meshes) status(regErrors.length ? 'Mesh ditolak: ' + regErrors.join('; ') : 'CT dimuat tanpa mesh kulit: gunakan Free 3D.', 'warn');
  else status(`${name}: CT ${ct.sizes.join('×')} @ ${ct.spacing.map((s) => s.toFixed(2)).join('/')} mm · mesh terregistrasi (${Object.keys(meshes).length} objek) · ${Math.round(D.loadMs)} ms`, 'ok');
  refreshAll();
  setScenario(S.scenario, false);
  markDirty();
}

// candidate vertices that can move (saves work every frame)
function prepareMotionMasks() {
  if (!geom) return;
  const f = makeFrame({ t: 0, beatPhase: 0.3, breathPhase: 0.4, giPhase: 0.5 }, { ...DEFAULT_PHYSIOLOGY, breathDepth: 60, antralAmplitude: 0.9, lvDilation: 1.25 }, geom);
  const d = [0, 0, 0];
  for (const m of Object.values(scene.meshes)) {
    const ref = m.ref, idx = [];
    for (let i = 0; i < ref.length; i += 3) {
      const x = ref[i], y = ref[i + 1], z = ref[i + 2];
      const nearHeart = Math.hypot(x - geom.C[0], y - geom.C[1], z - geom.C[2]) < 165;
      const inResp = Math.abs(x) < 215 && z > -345 && z < 245;
      const b = geom.stomachBox, inGi = x > b.lo[0] && x < b.hi[0] && y > b.lo[1] && y < b.hi[1] && z > b.lo[2] && z < b.hi[2];
      if (nearHeart || inResp || inGi) { displacement(f, x, y, z, d); idx.push(i / 3); }
    }
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
  const c = snapToSkin((x, y, z) => D.labels.nearest(x, y, z), v.target, v.dir);
  if (!c) return;
  S.view = key; S.mode = 'clinical'; S.contact = c; S.angles = { ...v.angles };
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
  if (!worker || !plane) return;
  if (workerBusy) { pending = true; return; }
  workerBusy = true; pending = false; dirty = false;
  const quality = interacting || S.playing ? 0.62 : 1;
  const ser = { mode: plane.mode, top: plane.top, u: plane.u, v: plane.v, n: plane.n, width: plane.width, height: plane.height, depth: plane.depth, centre: plane.centre };
  worker.postMessage({
    type: 'render', id: ++frameCount, plane: ser, quality,
    settings: { ...S.us, probeKey: S.probeKey, window: S.ct.window, level: S.ct.level, ctClip: S.ct.clip },
    clock: { t: clock.t, beatPhase: clock.beatPhase, breathPhase: clock.breathPhase, giPhase: clock.giPhase, heldR: clock.heldR },
    params: geom ? effectiveParams() : null, effusionMl: effusionMl(), display: S.display === 'split' ? 'both' : S.display, sizes: { width: quality < 1 ? 300 : 420 },
  });
  requestImaging.plane = plane; requestImaging.quality = quality;
}
function onWorker(e) {
  const m = e.data;
  if (m.type === 'frame') {
    workerBusy = false; stats.usMs = m.ms; lastFrameInfo = { id: m.id, centreLabel: m.centreLabel, ms: m.ms, ctOutside: m.ct?.outsideFraction, quality: requestImaging.quality, hasUS: !!m.us, hasCT: !!m.ct };
    const plane = requestImaging.plane;
    monitor.setFrame(m, { plane, display: S.display, usHeader: usHeader(), ctHeader: ctHeader() });
    const tex = S.display === 'ct' ? m.ct : m.us || m.ct;
    scene.setImagePlane(plane, tex ? { rgba: S.display === 'split' && m.us ? m.us.rgba : tex.rgba, w: tex.w, h: tex.h } : null);
    updateReadouts();
    if (pending) markDirty();
  } else if (m.type === 'error') { workerBusy = false; fail('Pencitraan: ' + m.message); }
  else if (m.type === 'warning') status(m.message, 'warn');
}
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
  if (audio.on) { const a = audio.now(); dt = Math.max(0, Math.min(0.1, a - lastAudio)); lastAudio = a; audioOffset = a - clock.t - dt; }
  const params = effectiveParams();
  if (S.playing && geom) { advanceClock(clock, dt * (audio.on ? 1 : S.speed), params); markDirty(); }
  if (interacting && now - lastInteraction > 260) { interacting = false; markDirty(); }
  const f = geom ? makeFrame(clock, params, geom) : null;
  // meshes (throttled)
  const motionKey = S.playing ? null : `${clock.beatPhase}|${clock.breathPhase}|${clock.giPhase}|${S.scenario}|${S.compareNormal}`;
  if (f && scene.meshes.skin && (S.playing ? now - lastDeform > 45 : motionShown !== motionKey)) { deformMeshes(f); lastDeform = now; motionShown = motionKey; }
  const pose = currentPose(f), plane = currentPlane(pose);
  if (pose) {
    if (S.mode === 'clinical') {
      scene.setProbe(pose, S.probeKey, true);
      scene.gizmoAxes = { u: pose.u, b: pose.b, e: pose.e };
      scene.setGizmo('clinical', pose.origin, scene.gizmoAxes, S.tool === 'probe');
    } else {
      scene.setProbe(pose, S.probeKey, false);
      scene.gizmoAxes = {};
      scene.setGizmo('free', pose.centre, {}, true);
    }
  }
  if (S.steth.ref && f) { const d = [0, 0, 0]; displacement(f, ...S.steth.ref, d); S.steth.point = S.steth.ref.map((v, i) => v + d[i]); }
  scene.setStethoscope(S.steth.point, S.steth.normal, S.tool === 'stethoscope' || audio.on);
  if (dirty) requestImaging(f, plane);
  // audio + strip
  const mix = currentMix();
  if (audio.on && f) audio.schedule({ simTime: clock.t, audioOffset, beatPhase: clock.beatPhase, breathPhase: clock.breathPhase, heartRate: params.heartRate, respRate: params.respRate, breathHold: params.breathHold, mix, s3: s3On(), r: f.r, bowelRate: 12 });
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
  const labelAt = (x, y, z) => { const l = D.labels.nearest(x, y, z); return effusion && l === 7 && !S.compareNormal ? effusion.classify(x, y, z, l) || l : l; };
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
const REGION = (p, n) => {
  const [x, , z] = p, side = Math.abs(x) < 18 ? 'garis tengah' : x < 0 ? 'kanan' : 'kiri';
  const face = n[1] < -0.55 ? 'anterior' : n[1] > 0.55 ? 'posterior' : 'lateral';
  if (z > 255) return 'Kepala (di luar fokus pemeriksaan)';
  if (z > 185) return `Leher / pangkal leher ${side}`;
  if (Math.abs(x) > 205) return `Lengan ${x < 0 ? 'kanan' : 'kiri'}`;
  if (z < -360) return `Paha ${side}`;
  if (z > -5) {
    const ics = Math.max(1, Math.round((185 - z) / 26));
    const line = Math.abs(x) < 18 ? 'sternum' : Math.abs(x) < 45 ? 'parasternal' : Math.abs(x) < 105 ? 'linea midklavikula' : face === 'lateral' ? 'linea aksilaris media' : 'linea aksilaris anterior';
    return `Toraks ${face} ${side} · ≈SIC ${ics} · ${line}`;
  }
  if (z < -270) return `Suprapubik / pelvis ${side}`;
  if (Math.abs(x) < 40 && z > -125) return 'Epigastrium';
  if (Math.abs(x) < 40 && z > -190) return 'Umbilikal';
  const q = (z > -150 ? 'atas' : 'bawah');
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
  effusion = sc.effusionMl > 0 && D?.labels ? buildEffusion(D.labels, sc.effusionMl) : null;
  if (effusion) {
    const m = voxelSurface((x, y, z) => { const l = D.labels.nearest(x, y, z); return l === 7 && effusion.classify(x, y, z, l) === 39; }, [-175, -110, -130], [5, 140, 140], 4, 5);
    scene.setEffusionMesh(m);
  } else scene.setEffusionMesh(null);
  mixCache = null; pcgCache = null;
  if (moveView && SUGGESTED_VIEW[key]) applyView(SUGGESTED_VIEW[key]);
  renderPathology(); refreshAll(); markDirty();
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
  for (const c of controls) c.sync?.();
  document.body.dataset.mode = S.mode; document.body.dataset.tool = S.tool;
  for (const b of document.querySelectorAll('[data-seg]')) { const [k, v] = b.dataset.seg.split(':'); b.setAttribute('aria-pressed', String(S[k] === v || (k === 'display' && S.display === v))); }
  const sel = $('#probeSelect'); if (sel) sel.value = S.probeKey;
  const sc = $('#scenarioSelect'); if (sc) sc.value = S.scenario;
  const cmp = $('#compareBtn'); if (cmp) { cmp.setAttribute('aria-pressed', String(S.compareNormal)); cmp.textContent = S.compareNormal ? 'Tampilkan patologis' : 'Bandingkan dengan normal'; cmp.disabled = S.scenario === 'normal'; }
  $('#playBtn') && ($('#playBtn').textContent = S.playing ? '❚❚ Jeda' : '▶ Putar');
  updateReadouts();
}

function seg(group, items, testid) {
  return el('div', { class: 'seg', role: 'group', 'data-testid': testid }, ...items.map(([val, text]) => el('button', { type: 'button', 'data-seg': `${group}:${val}`, 'data-testid': `${testid}-${val}`, onclick: () => { onSeg(group, val); } }, text)));
}
function onSeg(group, val) {
  if (group === 'mode') { S.mode = val; if (val === 'clinical' && !S.contact) applyView(S.view, false); }
  else if (group === 'tool') { S.tool = val; scene.siteMarkers.visible = val === 'stethoscope'; }
  else if (group === 'display') { S.display = val; }
  refreshAll(); touch();
}

function buildPanels() {
  // ---------------- Probe tab
  const probeTab = $('#tab-probe');
  probeTab.append(
    el('h3', {}, 'Mode pemindaian'), seg('mode', [['clinical', 'Probe klinis'], ['free', 'Free 3D']], 'mode'),
    el('p', { class: 'hint clinical-only' }, 'Probe menempel di kulit. Rotasi, heel–toe dan rock berputar di titik kontak yang tetap. Seret probe untuk berpindah; klik kulit untuk menempatkan.'),
    el('p', { class: 'hint free-only' }, 'Bidang bebas 6-DOF tanpa batasan kulit. Seret panah (translasi) dan cincin (rotasi) di 3D, atau ketik angka presisi.'),
    el('div', { class: 'clinical-only' },
      field('Jenis probe', el('select', { id: 'probeSelect', 'data-testid': 'probe-select', onchange: (e) => { setProbe(e.target.value, false); refreshAll(); touch(); } }, ...Object.values(PROBES).map((p) => el('option', { value: p.key }, p.label)))),
      el('h4', {}, 'Jendela standar'),
      el('div', { class: 'view-grid' }, ...VIEWS.map((v) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'view-' + v.key, onclick: () => applyView(v.key) }, v.labelId))),
      el('h4', {}, 'Angulasi (titik kontak tetap)'),
      numberControl({ id: 'angRotate', testid: 'angle-rotate', label: 'Rotasi (sumbu berkas)', min: -180, max: 180, step: 0.5, unit: '°', steps: [-5, -1, 1, 5], get: () => S.angles.rotate, set: (v) => { S.angles.rotate = v; } }),
      numberControl({ id: 'angHeel', testid: 'angle-heeltoe', label: 'Heel–toe (dalam bidang)', min: -CLINICAL_LIMITS.heelToe, max: CLINICAL_LIMITS.heelToe, step: 0.5, unit: '°', steps: [-5, -1, 1, 5], get: () => S.angles.heelToe, set: (v) => { S.angles.heelToe = v; } }),
      numberControl({ id: 'angRock', testid: 'angle-rock', label: 'Rock / fan (keluar bidang)', min: -CLINICAL_LIMITS.rock, max: CLINICAL_LIMITS.rock, step: 0.5, unit: '°', steps: [-5, -1, 1, 5], get: () => S.angles.rock, set: (v) => { S.angles.rock = v; } }),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => { S.angles = { rotate: 0, heelToe: 0, rock: 0 }; refreshAll(); touch(); } }, 'Transversal 0°'),
        el('button', { type: 'button', class: 'btn', onclick: () => { S.angles = { rotate: 90, heelToe: 0, rock: 0 }; refreshAll(); touch(); } }, 'Longitudinal 90°'),
        el('button', { type: 'button', class: 'btn', onclick: () => { S.angles = { ...S.angles, heelToe: 0, rock: 0 }; refreshAll(); touch(); } }, 'Tegak lurus kulit'))),
    el('div', { class: 'free-only' },
      el('h4', {}, 'Preset bidang'),
      el('div', { class: 'view-grid' }, ...Object.entries({ axial: 'Aksial', coronal: 'Koronal', sagittal: 'Sagital', oblique: 'Oblik' }).map(([k, t]) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'free-' + k, onclick: () => { S.free.q = freeQuat(FREE_PRESETS[k]); refreshAll(); touch(); } }, t))),
      field('Presisi', el('select', { onchange: (e) => { const [mm, deg] = e.target.value.split('/').map(Number); S.precision = { mm, deg }; rebuildFreeSteps(); } }, el('option', { value: '1/1' }, '1 mm / 1°'), el('option', { value: '0.1/0.1' }, '0,1 mm / 0,1°'), el('option', { value: '10/15' }, '10 mm / 15°'))),
      el('div', { id: 'freeControls' })),
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
      el('ul', {}, ...['Model sinar lurus, hamburan tunggal, irisan 2D (tanpa ketebalan elevasi).', 'Tanpa refraksi, aberasi kecepatan suara, side-lobe, harmonik, Doppler.', 'Nilai c, ρ, α dari literatur (T1–T4); hamburan balik adalah skala ekogenisitas relatif untuk pengajaran.', 'Reverberasi hanya dimodelkan antara transduser dan reflektor gas/udara pertama.', 'Phantom sintetis: bukan anatomi pasien, tidak tervalidasi klinis.'].map((t) => el('li', {}, t)))),
  );
  tissueSel.value = String(S.tissues.findIndex((t) => t.key === 'liver')); buildTissue();

  // ---------------- Physiology tab
  const ph = $('#tab-physiology');
  ph.append(
    el('p', { class: 'hint warn' }, 'Gerak fisiologis prosedural: pendekatan edukatif, bukan CT 4D atau ekokardiografi terukur.'),
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

  // ---------------- Auscultation tab
  const au = $('#tab-ausc');
  au.append(
    el('p', { class: 'hint' }, 'Pilih alat Stetoskop lalu klik kulit, atau pilih situs di bawah. Bunyi disintesis (bukan rekaman) dan diselaraskan dengan siklus jantung yang sama dengan gerak organ.'),
    seg('tool', [['probe', 'Probe USG'], ['stethoscope', 'Stetoskop']], 'tool'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn primary', id: 'audioBtn', 'data-testid': 'audio-toggle', onclick: toggleAudio }, '🔈 Nyalakan suara'),
      field('Mode', el('select', { 'data-testid': 'steth-filter', onchange: (e) => { S.steth.filter = e.target.value; audio.setFilter(e.target.value); } }, el('option', { value: 'diaphragm' }, 'Diafragma (frekuensi tinggi)'), el('option', { value: 'bell' }, 'Bell (frekuensi rendah: S3)')))),
    numberControl({ id: 'vol', label: 'Volume', min: 0, max: 1, step: 0.05, get: () => S.steth.volume, set: (v) => { S.steth.volume = v; audio.setVolume(v); } }),
    el('div', { id: 'auscReadout', class: 'readout', 'data-testid': 'ausc-readout', 'aria-live': 'polite' }),
    el('h4', {}, 'Situs auskultasi'),
    el('div', { id: 'siteList', class: 'site-list' }),
    el('details', { class: 'limits' }, el('summary', {}, 'Yang perlu didengar'), el('ul', {},
      el('li', {}, 'S1 (penutupan mitral + trikuspid) paling keras di apeks; S2 (aorta + pulmonal) paling keras di basis.'),
      el('li', {}, 'Split S2 fisiologis melebar saat inspirasi (P2 tertunda), ikuti jejak respirasi.'),
      el('li', {}, 'S3: bunyi bernada rendah ±120–180 ms setelah S2, paling jelas dengan bell di apeks (skenario HFrEF).'),
      el('li', {}, 'Bunyi napas vesikular lebih keras saat inspirasi; berkurang di atas efusi.'),
      el('li', {}, 'Semua bunyi adalah sintesis edukatif; tidak menggantikan rekaman klinis.'))),
  );
  const list = $('#siteList');
  for (const s of D?.anatomy?.auscultation || []) list.append(el('button', { type: 'button', class: 'chipbtn site ' + s.focus, 'data-testid': 'site-' + s.key, onclick: () => placeSteth(s.point, s.normal, s.key) }, s.nameId));

  // ---------------- Pathology tab
  $('#scenarioSelect').append(...Object.values(SCENARIOS).map((s) => el('option', { value: s.key }, s.titleId)));
  renderPathology();

  // ---------------- Data tab
  const dt = $('#tab-data');
  dt.append(
    el('p', { class: 'hint' }, 'Data lokal diproses di perangkat ini dan tidak diunggah. Untuk CTACardio: jalankan pipeline lokal (pipeline/README.md) lalu muat CT + label + paket mesh dari folder yang sama.'),
    field('CT (.nrrd, tunggal)', el('input', { type: 'file', id: 'ctFile', accept: '.nrrd', 'data-testid': 'ct-file' })),
    field('Label map (.nrrd, opsional)', el('input', { type: 'file', id: 'labFile', accept: '.nrrd' })),
    field('Paket mesh (skin.glb, organs.glb, registration.json, anatomy.json)', el('input', { type: 'file', id: 'meshFiles', accept: '.glb,.json', multiple: true })),
    el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn primary', onclick: loadLocal }, 'Muat data lokal'), el('button', { type: 'button', class: 'btn', onclick: () => loadPhantom().catch((e) => fail(e.message)) }, 'Phantom bawaan')),
    el('div', { id: 'dataInfo', class: 'readout' }),
    el('div', { id: 'memReadout', class: 'meta' }),
  );
}

function rebuildFreeSteps() {
  const box = $('#freeControls'); if (!box) return;
  box.innerHTML = '';
  const mm = S.precision.mm, deg = S.precision.deg;
  const names = [['L', 'Kiri(+) / Kanan(−)'], ['P', 'Posterior(+) / Anterior(−)'], ['S', 'Superior(+) / Inferior(−)']];
  names.forEach(([ax, t], i) => box.append(numberControl({ id: 'free' + ax, testid: 'free-pos-' + ax, label: `${ax}: ${t}`, min: -600, max: 600, step: mm, unit: 'mm', steps: [-10 * mm, -mm, mm, 10 * mm], get: () => S.free.position[i], set: (v) => { S.free.position[i] = v; } })));
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
      el('button', { type: 'button', class: 'btn', onclick: () => applyView(SUGGESTED_VIEW[S.scenario]) }, 'Ke jendela yang disarankan')) : null,
    el('table', { class: 'compare' },
      el('tr', {}, el('th', {}, ''), el('th', {}, 'Normal'), el('th', {}, 'Skenario')),
      el('tr', {}, el('td', {}, 'EF model'), el('td', {}, `${(modelEjectionFraction(n) * 100).toFixed(0)}%`), el('td', { 'data-testid': 'ef-scenario' }, `${(modelEjectionFraction(p) * 100).toFixed(0)}%`)),
      el('tr', {}, el('td', {}, 'Dilatasi LV'), el('td', {}, '1,00×'), el('td', {}, `${p.lvDilation.toFixed(2)}×`)),
      el('tr', {}, el('td', {}, 'Efusi pleura'), el('td', {}, '0 mL'), el('td', {}, `${sc.effusionMl} mL`)),
      el('tr', {}, el('td', {}, 'Indeks motilitas antrum'), el('td', {}, String(motilityIndex(n))), el('td', {}, String(motilityIndex(p))))),
    sc.findings.length ? el('h4', {}, 'Yang perlu dicari') : null,
    sc.findings.length ? el('ul', {}, ...sc.findings.map((f) => el('li', {}, f))) : null,
    sc.teaching ? el('p', { class: 'hint' }, sc.teaching) : null,
    sc.references.length ? el('h4', {}, 'Referensi') : null,
    sc.references.length ? el('ol', { class: 'refs' }, ...sc.references.map((r) => el('li', {}, `[${r}] ${REFERENCES[r]}`))) : null,
    el('p', { class: 'hint warn' }, 'Skenario adalah model pendidikan berparameter, bukan diagnosis dan bukan perangkat medis tervalidasi.'),
  );
}

function placeSteth(point, normal, key) {
  S.tool = 'stethoscope';
  // site points are reference anatomy coordinates
  S.steth.ref = [...point]; S.steth.normal = [...normal]; S.steth.point = [...point]; S.steth.key = key;
  mixCache = null; refreshAll(); scene.siteMarkers.visible = true;
}
async function toggleAudio() {
  const b = $('#audioBtn');
  if (!audio.supported) { b.textContent = 'Web Audio tidak tersedia'; return; }
  if (audio.on) { audio.stop(); b.textContent = '🔈 Nyalakan suara'; b.setAttribute('aria-pressed', 'false'); return; }
  lastAudio = await audio.start(); audio.setVolume(S.steth.volume); audio.setFilter(S.steth.filter);
  S.playing = true; S.speed = 1;
  if (!S.steth.ref) { const m = D.anatomy.auscultation.find((s) => s.key === 'mitral'); if (m) placeSteth(m.point, m.normal, 'mitral'); }
  b.textContent = '🔊 Matikan suara'; b.setAttribute('aria-pressed', 'true'); refreshAll();
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
    $('#dataInfo').textContent = `${ct.name} dimuat lokal. ${D.labels ? 'Label tersedia.' : 'Tanpa label: USG memakai klasifikasi HU (kasar).'} ${D.meshes ? 'Mesh terverifikasi.' : 'Tanpa mesh: hanya Free 3D.'} ${geom ? '' : 'Gerak fisiologis butuh anatomy.json.'}`;
  } catch (e) { fail(e.message); }
}

function fail(msg) { const b = $('#runtimeError'); b.hidden = false; b.textContent = msg; console.error(msg); }

// ------------------------------------------------------------------ layout controls
function installLayout() {
  const ws = $('#workspace'), div = $('#divider');
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
  $('#speedSelect').onchange = (e) => { S.speed = Number(e.target.value); if (audio.on && S.speed !== 1) { audio.stop(); $('#audioBtn').textContent = '🔈 Nyalakan suara'; } };
  $('#scenarioSelect').onchange = (e) => setScenario(e.target.value);
  for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => scene.setView(b.dataset.view);
  $('#skinOpacity').oninput = (e) => { S.appearance.skinOpacity = Number(e.target.value) / 100; applyAppearance(); };
  $('#cutaway').onchange = (e) => { S.appearance.cutaway = e.target.value; if (e.target.value !== 'none' && S.appearance.skinOpacity > 0.95) { S.appearance.skinOpacity = 1; } applyAppearance(); };
  $('#cutDepth').oninput = (e) => { S.appearance.cutDepth = Number(e.target.value); applyAppearance(); };
  for (const c of document.querySelectorAll('[data-system]')) c.onchange = () => { S.appearance.systems[c.dataset.system] = c.checked; applyAppearance(); };
  $('#coverageToggle').onchange = (e) => { S.appearance.showCoverage = e.target.checked; applyAppearance(); };
  // tabs
  for (const t of document.querySelectorAll('[role=tab]')) t.onclick = () => {
    for (const x of document.querySelectorAll('[role=tab]')) x.setAttribute('aria-selected', String(x === t));
    for (const p of document.querySelectorAll('[role=tabpanel]')) p.hidden = p.id !== t.getAttribute('aria-controls');
  };
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); S.playing = !S.playing; refreshAll(); }
    if (e.key === 'f') $('#fullBtn').click();
  });
}
function organsHidden() { return S.appearance.skinOpacity >= 0.999 && S.appearance.cutaway === 'none'; }
function applyAppearance() {
  scene.setAppearance(S.appearance);
  if (organsHidden()) for (const [n, m] of Object.entries(scene.meshes)) if (n !== 'skin') m.mesh.visible = false;
  motionShown = null;
}

// ------------------------------------------------------------------ boot
async function boot() {
  try {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('WebGL tidak tersedia: tampilan 3D tidak dapat dibuat. Aktifkan akselerasi grafis di browser.');
    scene = new PatientScene($('#viewport'), {
      onContact: (c) => { S.contact = c; S.mode = 'clinical'; touch(); },
      onSkinClick: (c) => { if (S.tool === 'stethoscope') placeSteth(c.point, c.normal, null); else if (S.mode === 'clinical') { S.contact = c; touch(); } },
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
    installLayout();
    await loadPhantom();
    buildPanels();
    applyAppearance(); refreshAll();
    document.body.dataset.ready = '1';
    requestAnimationFrame(loop);
  } catch (e) { fail(e.message || String(e)); document.body.dataset.ready = 'error'; }
}
boot();
