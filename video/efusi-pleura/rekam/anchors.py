#!/usr/bin/env python3
"""Gabungkan data penanda per bingkai (dari raster struktur aplikasi) -> data/anchors.json.
Per bingkai: cv (kotak kanvas monitor, px CSS), lay (tata letak citra di kanvas, px perangkat), probe (3D), dan untuk tiap topeng:
centroid + kotak batas (koordinat topeng 420x298) serta luas. Topeng sendiri (PNG) tetap di rekam/frames/<seg>/f####_<nama>.png."""
import glob, json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FR = os.path.join(ROOT, 'rekam', 'frames')
out = {}
for segdir in sorted(glob.glob(os.path.join(FR, '*'))):
    seg = os.path.basename(segdir)
    if seg not in ('A', 'BC', 'EF', 'H'): continue
    merged = {}
    for f in sorted(glob.glob(os.path.join(segdir, 'anchors*.json'))):
        merged.update(json.load(open(f)))
    segout = {}
    for k, m in sorted(merged.items(), key=lambda kv: int(kv[0])):
        e = {'cv': [round(v, 2) for v in m['cv']], 'ang': {a: round(v, 2) for a, v in m['ang'].items()}}
        lay = m.get('layouts') or {}
        if lay:
            e['lay'] = {key: {a: round(v, 2) for a, v in d.items() if a in ('x0', 'y0', 'dw', 'dh')} for key, d in lay.items()}
        if m.get('probe'):
            e['probe'] = [round(v, 1) for v in m['probe']]
        masks = {}
        for name in ('pleural_fluid', 'diaphragm', 'atelectasis'):
            p = os.path.join(segdir, f'f{int(k):04d}_{name}.png')
            if not os.path.exists(p):
                continue
            a = np.asarray(Image.open(p).convert('RGBA'))[:, :, 3] > 20
            ys, xs = np.nonzero(a)
            if len(xs) < 30:
                continue
            masks[name] = {'area': int(len(xs)), 'c': [round(float(xs.mean()), 1), round(float(ys.mean()), 1)],
                           'bb': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
        if masks:
            e['m'] = masks
        segout[int(k)] = e
    out[seg] = segout
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'anchors.json'), 'w'), separators=(',', ':'))
print({s: len(v) for s, v in out.items()})
