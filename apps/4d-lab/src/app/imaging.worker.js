// Imaging worker: CT reslice + simulated ultrasound off the main thread.
// Receives the compressed NRRD files once, then render requests with plane + settings + clock.
import { parseNrrd } from '../core/nrrd.js';
import { makeVolume, sameGrid } from '../core/volume.js';
import { reslice, windowLevel } from '../core/reslice.js';
import { PROBES } from '../core/probe.js';
import { createSampler } from '../sim/sampler.js';
import { simulateUltrasound, scanConvert } from '../sim/ultrasound.js';
import { prepareGeometry, makeFrame } from '../sim/physiology.js';
import { buildEffusion } from '../sim/pathology.js';
import { TISSUES } from '../sim/tissues.js';

let ct = null, labels = null, anatomy = null, sampler = null, geom = null, tissues = TISSUES;
const effusionCache = new Map();

async function load({ ctBuffer, labelBuffer, anatomy: an }) {
  ct = makeVolume(await parseNrrd(ctBuffer, 'ct'));
  labels = labelBuffer ? makeVolume(await parseNrrd(labelBuffer, 'labels')) : null;
  if (labels && !sameGrid(ct, labels)) { labels = null; postMessage({ type: 'warning', message: 'Label map grid differs from the CT; using HU-based tissue classes instead.' }); }
  anatomy = an || null;
  sampler = createSampler({ ct, labels, anatomy: labels ? anatomy : null });
  geom = anatomy?.heart ? prepareGeometry(anatomy) : null;
  effusionCache.clear();
  return { sizes: ct.sizes, bounds: ct.bounds, hasLabels: !!labels, hasMotion: !!geom, valueRange: ct.valueRange() };
}

function render(req) {
  const t0 = performance.now();
  const { plane, settings, clock, params, effusionMl, display, sizes, quality } = req;
  if (geom && params) sampler.setFrame(makeFrame(clock, params, geom)); else sampler.setFrame(null);
  let eff = null;
  if (labels && effusionMl > 0) {
    if (!effusionCache.has(effusionMl)) effusionCache.set(effusionMl, buildEffusion(labels, effusionMl));
    eff = effusionCache.get(effusionMl);
  }
  sampler.setEffusion(eff);
  plane.probe = PROBES[settings.probeKey];
  const out = { type: 'frame', id: req.id };
  const transfer = [];
  const W = sizes.width, H = Math.max(16, Math.round(W * plane.height / plane.width));
  if (display !== 'ct') {
    const us = simulateUltrasound(sampler, plane, { ...settings, probe: plane.probe, tissues, quality });
    const rgba = scanConvert(us, W, H);
    out.us = { rgba: rgba.buffer, w: W, h: H, lines: us.nLines, samples: us.nS };
    transfer.push(rgba.buffer);
  }
  if (display !== 'us') {
    const res = reslice({ sample: sampler.ct }, plane, W, H, { clipToFov: plane.mode === 'clinical' && settings.ctClip });
    const rgba = windowLevel(res, settings.window, settings.level);
    if (plane.mode === 'clinical' && settings.ctClip) for (let i = 0; i < res.fov.length; i++) if (!res.fov[i]) rgba[i * 4 + 3] = 0;
    out.ct = { rgba: rgba.buffer, w: W, h: H, outsideFraction: res.outsideFraction };
    transfer.push(rgba.buffer);
  }
  // tissue under the beam centre (for the readout)
  const mid = [0, 1, 2].map((i) => plane.top[i] + plane.v[i] * plane.height * 0.5);
  out.centreLabel = labels ? sampler.label(...mid) : -1;
  out.ms = performance.now() - t0;
  postMessage(out, transfer);
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'load') postMessage({ type: 'loaded', id: m.id, info: await load(m) });
    else if (m.type === 'tissues') tissues = m.tissues;
    else if (m.type === 'render') { if (ct) render(m); }
  } catch (err) {
    postMessage({ type: 'error', id: m.id, message: err.message });
  }
};
