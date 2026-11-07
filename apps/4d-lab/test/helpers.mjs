import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseNrrd } from '../src/core/nrrd.js';
import { makeVolume } from '../src/core/volume.js';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DATA = path.join(ROOT, 'public/data/phantom');

let cache = null;
export async function loadPhantom() {
  if (cache) return cache;
  const [ctBuf, labBuf, anatomy, reg, skin, organs] = await Promise.all([
    readFile(path.join(DATA, 'ct.nrrd')), readFile(path.join(DATA, 'labels.nrrd')),
    readFile(path.join(DATA, 'anatomy.json'), 'utf8'), readFile(path.join(DATA, 'registration.json'), 'utf8'),
    readFile(path.join(DATA, 'skin.glb')), readFile(path.join(DATA, 'organs.glb')),
  ]);
  const ct = makeVolume(await parseNrrd(ctBuf, 'ct.nrrd'));
  const labels = makeVolume(await parseNrrd(labBuf, 'labels.nrrd'));
  const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  cache = { ct, labels, anatomy: JSON.parse(anatomy), reg: JSON.parse(reg), files: { 'skin.glb': ab(skin), 'organs.glb': ab(organs) } };
  return cache;
}

/** Deterministic PRNG for reproducible randomised tests. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const close = (a, b, tol) => Math.abs(a - b) <= tol;
