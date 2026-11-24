import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { parseBp3dFlag, validateInventory, BP3D_FRAME, bp3dHas, _bp3dReset, bp3dUsesSystem, bp3dSummary, loadBp3dInventory, loadBp3dSystem } from '../src/viewer/bp3dSource.js';
import { tissueClass } from '../src/viewer/bp3dMaterials.js';
import { createSelectionGlow } from '../src/viewer/selectionGlow.js';

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
  it.each([
    ['left lung','visceral','respiratory','lung'],
    ['right main bronchus','visceral','respiratory','airway'],
    ['left coronary artery','cardiovascular','heart','artery'],
    ['pulmonary vein','cardiovascular','heart','vein'],
    ['heart','cardiovascular','heart','heart'],
    ['mitral valve','cardiovascular','heart','heartValve'],
    ['papillary muscle of left ventricle','cardiovascular','heart','heart'],
    ['left optic nerve','nervous','nervous','nerve'],
    ['cerebellum','nervous','nervous','brain'],
    ['central canal of spinal cord','nervous','nervous','unknown'],
    ['left kidney','visceral','urinary','kidney'],
    ['liver','visceral','digestive','liver'],
    ['spleen','lymphatic','lymphatic','spleen'],
    ['lymph node','lymphatic','lymphatic','lymphatic'],
    ['tendon of biceps brachii','muscular','muscular','tendon'],
    ['mesentery of small intestine','visceral','digestive','mesentery'],
    ['greater omentum','visceral','digestive','mesentery'],
    ['perirenal fat','visceral','urinary','adipose'],
    ['adipose tissue','muscular','muscular','adipose'],
    ['artery of mesentery','cardiovascular','arterial','artery'],
    ['lymph node of mesentery','lymphatic','lymphatic','lymphatic'],
    ['left lobe of thymus','lymphatic','lymphatic','lymphoidOrgan'],
    ['palatine tonsil.l','lymphatic','lymphatic','lymphoidOrgan'],
    ['node of arch of azygos vein','lymphatic','lymphatic','lymphatic'],
    ['thoracic duct','lymphatic','lymphatic','lymphaticTrunk'],
    ['cisterna chyli','lymphatic','lymphatic','lymphaticTrunk'],
    ['left jugular lymphatic trunk','lymphatic','lymphatic','lymphaticTrunk'],
    ['efferent lymphatic vessel','lymphatic','lymphatic','lymphaticVessel'],
    ['parietal peritoneum','visceral','digestive','peritoneum']
  ])('assigns a distinct educational material to %s', (name,system,group,expected) => {
    expect(tissueClass({name,system,group})).toBe(expected);
  });
  it('classify bones and muscles consistently', () => {
    expect(tissueClass({ name: 'Femur.l', system: 'skeletal' })).toBe('bone');
    expect(tissueClass({ name: 'Biceps brachii.r', system: 'muscular' })).toBe('muscle');
  });
});

describe('selection sweep on double-sided sources', () => {
  const meshWith = (side) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ side }));
  };
  it('follows a double-sided base material (BodyParts3D) so the beam is not culled', () => {
    const m = meshWith(THREE.DoubleSide); const release = createSelectionGlow([m]);
    expect(m.children[0].material.side).toBe(THREE.DoubleSide); release();
  });
  it('keeps front-face-only for Atlas meshes (default behaviour unchanged)', () => {
    const m = meshWith(THREE.FrontSide); const release = createSelectionGlow([m]);
    expect(m.children[0].material.side).toBe(THREE.FrontSide); release();
  });
});

describe('selective skeletal/visceral source in the ORIGINAL Atlas interface', () => {
  const inventory = { converted: [
    entry('Femur.l', 'skeletal', 'femur'),
    entry('Tibia.l', 'skeletal', 'tibia'),
    entry('Liver', 'visceral', 'liver')
  ] };
  const useInventory = async () => {
    _bp3dReset('?models=bp3d:skeletal,visceral');
    await loadBp3dInventory(async () => ({ ok: true, json: async () => inventory }));
  };
  it('filters missing bones and organs without filtering muscles and other unchanged Atlas systems', async () => {
    try {
      await useInventory();
      expect(bp3dUsesSystem('skeletal')).toBe(true);
      expect(bp3dUsesSystem('visceral')).toBe(true);
      expect(bp3dUsesSystem('muscular')).toBe(false);
      expect(bp3dHas('Femur.l', 'skeletal')).toBe(true);
      expect(bp3dHas('Absent bone', 'skeletal')).toBe(false);
      expect(bp3dHas('Liver', 'visceral')).toBe(true);
      expect(bp3dHas('Absent organ', 'visceral')).toBe(false);
      expect(bp3dHas('Biceps brachii.l', 'muscular')).toBe(true);
      expect(bp3dHas('Some joint', 'joints')).toBe(true);
    } finally { _bp3dReset(''); }
  });
  it('keeps catalogue IDs usable for the existing selection, glow, and isolation registry', async () => {
    try {
      await useInventory();
      const loader = { loadAsync: async () => {
        const scene = new THREE.Group();
        scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
        return {scene};
      }};
      const result = await loadBp3dSystem('skeletal', loader);
      expect(result.userData.bp3d).toEqual({total: 2, failed: 0});
      const nodes = result.children[0].children;
      expect(nodes.map(node => node.userData.za_name)).toEqual(['Femur.l', 'Tibia.l']);
      expect(nodes.every(node => node.children[0].children[0].material.side === THREE.DoubleSide)).toBe(true);
    } finally { _bp3dReset(''); }
  });
  it('fails closed on one corrupt or missing bone, not a misleading partial skeleton', async () => {
    try {
      await useInventory();
      const loader = { loadAsync: async (url) => {
        if (url.includes('/tibia/')) throw new Error('Missing GLB');
        const scene = new THREE.Group();
        scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
        return {scene};
      }};
      await expect(loadBp3dSystem('skeletal', loader)).rejects.toThrow(/incomplete: 1\/2 models failed/);
    } finally { _bp3dReset(''); }
  });
  it('rejects empty GLB scenes rather than claiming those structures are available', async () => {
    try {
      await useInventory();
      const loader = { loadAsync: async () => ({scene: new THREE.Group()}) };
      await expect(loadBp3dSystem('visceral', loader)).rejects.toThrow(/incomplete: 1\/1 models failed/);
    } finally { _bp3dReset(''); }
  });
});

describe('unverified bulk candidate review stays in the EXISTING Atlas banner', () => {
  it('tracks an explicit provisional source state without changing gold-glow or viewer layout', async () => {
    _bp3dReset('?models=bp3d:skeletal,muscular');
    try {
      await loadBp3dInventory(async () => ({ok:true,json:async()=>({
        converted:[entry('Femur.l','skeletal'),entry('Anconeus muscle.l','muscular')],
        provisionalSource:true,approvedForCommercialDistribution:false,
        summary:{provisionalNewModels:1,reusedBaselineModels:1}
      })}));
      expect(bp3dSummary().provisional).toBe(true);
      expect(bp3dHas('Anconeus muscle.l','muscular')).toBe(true);
      expect(bp3dHas('Femur.l','skeletal')).toBe(true);
      expect(bp3dHas('Absent muscle','muscular')).toBe(false);
      expect(bp3dHas('Hepatic artery','cardiovascular')).toBe(true);
    } finally { _bp3dReset(''); }
  });
  it('does not label the ordinary source as provisional', () => {
    const original = validateInventory({converted:[entry('Femur.l')]});
    const provisional = validateInventory({converted:[entry('Femur.l')],provisionalSource:true});
    expect(original.provisionalSource).toBe(false);
    expect(provisional.provisionalSource).toBe(true);
  });
});
