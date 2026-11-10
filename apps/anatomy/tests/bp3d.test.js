import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { parseBp3dFlag, validateInventory, BP3D_FRAME, bp3dHas, _bp3dReset, bp3dUsesSystem } from '../src/viewer/bp3dSource.js';
import { tissueClass } from '../src/viewer/bp3dMaterials.js';

const entry = (name, system = 'skeletal', id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) => ({ name, system, modelPath: `./structures/${id}/model.glb`, fmaId: 'FMA1' });

describe('BodyParts3D source flag (reversible, off by default)', () => {
  it('is off without the parameter and for other model values', () => {
    expect(parseBp3dFlag('')).toBeNull();
    expect(parseBp3dFlag('?models=atlas')).toBeNull();
    expect(parseBp3dFlag('?models=bp3dx')).toBeNull();
  });
  it('covers every system, or only the listed ones', () => {
    expect(parseBp3dFlag('?models=bp3d')).toEqual({ systems: null });
    expect([...parseBp3dFlag('?models=bp3d:skeletal,muscular').systems]).toEqual(['skeletal', 'muscular']);
  });
  it('does not change the Atlas when the flag is absent', () => {
    _bp3dReset('');
    expect(bp3dHas('Femur.l')).toBe(true); // nothing is filtered
    expect(bp3dUsesSystem('skeletal')).toBe(false);
  });
});

describe('inventory validation', () => {
  it('accepts only relative model paths inside structures/ and drops duplicates', () => {
    const v = validateInventory({ converted: [entry('Femur.l'), entry('Femur.l'), { name: 'X', system: 'skeletal', modelPath: 'https://evil.example/m.glb' }, { name: 'Y', system: 'skeletal', modelPath: './structures/../../etc/passwd' }, entry('Humerus.r')] });
    expect(v.converted.map((e) => e.name)).toEqual(['Femur.l', 'Humerus.r']);
  });
  it('takes the skin only from the fixed reference path', () => {
    expect(validateInventory({ converted: [entry('A')], referenceSurface: { modelPath: './reference-surface/skin.glb' } }).skin).toBeTruthy();
    expect(validateInventory({ converted: [entry('A')], referenceSurface: { modelPath: './elsewhere/skin.glb' } }).skin).toBeNull();
  });
  it('refuses an empty inventory', () => {
    expect(() => validateInventory({ converted: [] })).toThrow();
    expect(() => validateInventory(null)).toThrow();
  });
});

describe('coordinate frame', () => {
  const toWorld = (native) => {
    const g = new THREE.Group(); g.rotation.x = BP3D_FRAME.rotationX; g.scale.setScalar(BP3D_FRAME.scale); g.position.set(...BP3D_FRAME.offset); g.updateMatrixWorld(true);
    return new THREE.Vector3(...native).applyMatrix4(g.matrixWorld);
  };
  it('maps OBJ mm [X,Y,Z] to metres [X,Z,-Y] plus the fixed offset (left +X, up +Y, anterior +Z)', () => {
    const [ox, oy, oz] = BP3D_FRAME.offset;
    const p = toWorld([100, -200, 1000]); // 10 cm to patient left, 20 cm anterior (−Y native), 1 m up
    expect(p.x).toBeCloseTo(0.1 + ox, 6); expect(p.y).toBeCloseTo(1 + oy, 6); expect(p.z).toBeCloseTo(0.2 + oz, 6);
  });
  it('keeps the offset small (the two sources are the same body)', () => {
    expect(Math.hypot(...BP3D_FRAME.offset)).toBeLessThan(0.15);
  });
});

describe('materials', () => {
  it('stay identical to the review viewer palette', () => {
    const strip = (t) => t.split('\n').filter((l) => !l.startsWith('// Copy of')).join('\n').trim();
    const a = strip(readFileSync(new URL('../src/viewer/bp3dMaterials.js', import.meta.url), 'utf8'));
    const b = readFileSync(new URL('../../4d-lab/tools/bp3d-review-materials.mjs', import.meta.url), 'utf8').trim();
    expect(a).toBe(b);
  });
  it('classify bones and muscles consistently', () => {
    expect(tissueClass({ name: 'Femur.l', system: 'skeletal' })).toBe('bone');
    expect(tissueClass({ name: 'Biceps brachii.r', system: 'muscular' })).toBe('muscle');
  });
});
