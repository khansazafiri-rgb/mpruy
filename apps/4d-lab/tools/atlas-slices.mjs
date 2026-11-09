// Render label (or CT) slices of a dataset as a PNG montage for visual QA.
//   node tools/atlas-slices.mjs <datasetDir> <out.png> [axial:z,...] [coronal:y,...] [sagittal:x,...] [--ct]
import fs from 'node:fs';
import path from 'node:path';
import { readNrrd } from '../pipeline/atlas/io.mjs';
import { encodePNG, montage } from './png.mjs';

const [dir, out, ...specs] = process.argv.slice(2);
const useCT = specs.includes('--ct');
const vol = readNrrd(path.join(dir, useCT ? 'ct.nrrd' : 'labels.nrrd'));
const anatomy = JSON.parse(fs.readFileSync(path.join(dir, 'anatomy.json'), 'utf8'));
const colors = new Map(anatomy.labels.map((l) => [l.id, l.color]));
const [nx, ny, nz] = vol.sizes, A = vol.affine;
const at = (i, j, k) => vol.data[(k * ny + j) * nx + i];
const px = (v) => useCT ? (() => { const g = Math.max(0, Math.min(255, ((v - (40 - 200)) / 400) * 255)); return [g, g, g]; })() : colors.get(v) || [255, 0, 255];
const tiles = [];
for (const spec of specs.filter((s) => s.includes(':'))) {
  const [kind, list] = spec.split(':');
  for (const val of list.split(',').map(Number)) {
    let W, H, get;
    if (kind === 'axial') { const k = Math.round((val - A[11]) / A[10]); W = nx; H = ny; get = (x, y) => at(x, y, k); }
    else if (kind === 'coronal') { const j = Math.round((val - A[7]) / A[5]); W = nx; H = nz; get = (x, y) => at(x, j, nz - 1 - y); }
    else { const i = Math.round((val - A[3]) / A[0]); W = ny; H = nz; get = (x, y) => at(i, x, nz - 1 - y); }
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rgba.set([...px(get(x, y)), 255], (y * W + x) * 4);
    tiles.push({ rgba, w: W, h: H });
  }
}
const m = montage(tiles);
fs.writeFileSync(out, encodePNG(m.rgba, m.w, m.h));
console.log('wrote', out, m.w, 'x', m.h);
