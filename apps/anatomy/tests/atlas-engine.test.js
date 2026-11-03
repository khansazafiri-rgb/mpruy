import { beforeEach, describe, it, expect, vi } from "vitest";
import * as THREE from "three";
const env = vi.hoisted(() => ({
  nodes: new Map(),
  meshes: new Map(),
  models: [],
  fail: null,
}));
vi.mock("../src/viewer/loadModel.js", async () => {
  const three = await import("three");
  return {
    getMeshRegistry: () => env.nodes,
    ownMeshesOf: (id) => env.meshes.get(id) || [],
    withDescendants: (id) => [id],
    getMeshesBySystem: (source) =>
      [...env.nodes.values()].filter((n) => n.userData.system === source),
    loadModel: vi.fn(async (source) => {
      const state = env.state;
      if (env.fail === source) throw new Error("offline");
      if (state.loadedSystems.includes(source)) return;
      for (const p of env.models.filter((m) => m.source === source)) {
        const mesh = new three.Mesh(
          new three.BoxGeometry(0.02, 0.1, 0.02),
          new three.MeshStandardMaterial(),
        );
        mesh.position.set(0, p.y, 0);
        mesh.updateMatrixWorld();
        mesh.userData = {
          baseMaterial: mesh.material,
          partId: p.id,
          system: source,
        };
        env.nodes.set(p.id, mesh);
        env.meshes.set(p.id, [mesh]);
      }
      state.loadedSystems.push(source);
    }),
  };
});
vi.mock("../src/viewer/selection.js", async () => {
  return {
    deselectPart: () => {
      env.state.selectedPart = null;
    },
    selectPartById: (id) => {
      env.state.selectedPart = { id };
      return true;
    },
  };
});
vi.mock("../src/viewer/camera.js", () => ({
  animateCamera: vi.fn(async (camera, controls, pos, target) => {
    camera.position.copy(pos);
    controls.target.copy(target);
  }),
}));
let engine, state, visibility, catalog;
beforeEach(async () => {
  vi.resetModules();
  env.nodes.clear();
  env.meshes.clear();
  env.fail = null;
  env.models = [
    {
      id: "Fascia",
      source: "muscular",
      group: "muscular",
      layer: 0,
      regions: ["headNeck"],
      y: 1.5,
    },
    {
      id: "Platysma",
      source: "muscular",
      group: "muscular",
      layer: 1,
      regions: ["headNeck"],
      y: 1.5,
    },
    {
      id: "Deep neck",
      source: "muscular",
      group: "muscular",
      layer: 3,
      regions: ["headNeck"],
      y: 1.5,
    },
    {
      id: "Ulna.l",
      source: "skeletal",
      group: "skeletal",
      layer: 0,
      regions: ["upperLimb"],
      y: 1,
    },
    {
      id: "Femur.l",
      source: "skeletal",
      group: "skeletal",
      layer: 0,
      regions: ["lowerLimb"],
      y: 0.65,
    },
    {
      id: "Left ventricle",
      source: "cardiovascular",
      group: "heart",
      layer: 0,
      regions: ["thorax"],
      y: 1.3,
    },
    {
      id: "Aortic arch",
      source: "cardiovascular",
      group: "arterial",
      layer: 2,
      regions: ["thorax"],
      y: 1.3,
    },
    {
      id: "Stomach",
      source: "visceral",
      group: "digestive",
      layer: 0,
      regions: ["abdomen"],
      y: 1.15,
    },
  ];
  catalog = Object.fromEntries(
    env.models.map((p) => [
      p.id,
      { ...p, box: [-0.01, p.y - 0.05, -0.01, 0.01, p.y + 0.05, 0.01] },
    ]),
  );
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
  vi.stubGlobal("location", { hash: "", href: "http://localhost/" });
  ({ state } = await import("../src/state/store.js"));
  env.state = state;
  state.viewer = {
    renderer: { clippingPlanes: [] },
    camera: new THREE.PerspectiveCamera(50, 1, 0.01, 100),
    controls: { target: new THREE.Vector3() },
    render: () => {},
  };
  state.viewer.camera.position.set(0, 1, 3);
  visibility = await import("../src/viewer/visibility.js");
  engine = await import("../src/atlas/engine.js");
  await engine.initAtlas(catalog);
});
describe("Atlas interactions against real three.js mesh visibility", () => {
  it("starts with only the skeleton, leaving other models on demand", () => {
    expect(state.loadedSystems).toEqual(["skeletal"]);
    expect(engine.settings.groups.muscular.enabled).toBe(false);
  });
  it("shows the whole heart system and allows undo to recover the previous view", async () => {
    await engine.toggleGroup("muscular", true);
    await engine.chooseRegion("headNeck");
    await engine.viewGroup("heart");
    expect(engine.settings.region).toBe("whole");
    expect(env.meshes.get("Left ventricle")[0].visible).toBe(true);
    expect(env.meshes.get("Aortic arch")[0].visible).toBe(false);
    expect(env.meshes.get("Platysma")[0].visible).toBe(false);
    engine.undo();
    expect(engine.settings.region).toBe("headNeck");
    expect(env.meshes.get("Platysma")[0].visible).toBe(true);
  });
  it("reveals ulna from Thorax and clears the old clipping planes", async () => {
    await engine.chooseRegion("thorax");
    expect(env.meshes.get("Ulna.l")[0].visible).toBe(false);
    expect(state.viewer.renderer.clippingPlanes).toHaveLength(2);
    await engine.reveal("Ulna.l");
    expect(engine.settings.region).toBe("upperLimb");
    expect(env.meshes.get("Ulna.l")[0].visible).toBe(true);
    expect(state.selectedPart.id).toBe("Ulna.l");
    expect(state.viewer.renderer.clippingPlanes).toHaveLength(0);
  });
  it("reveals a previously manually hidden search result", async () => {
    await engine.reveal("Ulna.l");
    visibility.hidePart("Ulna.l");
    expect(env.meshes.get("Ulna.l")[0].visible).toBe(false);
    await engine.reveal("Ulna.l");
    expect(env.meshes.get("Ulna.l")[0].visible).toBe(true);
  });
  it("restores the removed superficial layer when searching for platysma", async () => {
    await engine.toggleGroup("muscular", true);
    await engine.chooseRegion("headNeck");
    await engine.stepGroup("muscular", -1);
    await engine.stepGroup("muscular", -1);
    expect(env.meshes.get("Platysma")[0].visible).toBe(false);
    await engine.reveal("Platysma");
    expect(env.meshes.get("Platysma")[0].visible).toBe(true);
    expect(env.meshes.get("Fascia")[0].visible).toBe(false);
  });
  it("does not reintroduce out-of-region anatomy during restore", async () => {
    await engine.toggleGroup("muscular", true);
    await engine.chooseRegion("headNeck");
    engine.restoreScene();
    expect(env.meshes.get("Ulna.l")[0].visible).toBe(false);
    expect(env.meshes.get("Platysma")[0].visible).toBe(true);
  });
  it("loads a shared file without switching on its other study groups", async () => {
    await engine.toggleGroup("heart", true);
    expect(env.meshes.get("Left ventricle")[0].visible).toBe(true);
    expect(env.meshes.get("Aortic arch")[0].visible).toBe(false);
  });
  it("returns from isolation to the previous layer and region settings", async () => {
    await engine.toggleGroup("muscular", true);
    await engine.chooseRegion("headNeck");
    await engine.stepGroup("muscular", -1);
    await engine.reveal("Platysma");
    engine.isolateSelected();
    expect(engine.hasIsolation()).toBe(true);
    expect(env.meshes.get("Deep neck")[0].visible).toBe(false);
    engine.returnContext();
    expect(engine.settings.region).toBe("headNeck");
    expect(env.meshes.get("Deep neck")[0].visible).toBe(true);
    expect(env.meshes.get("Fascia")[0].visible).toBe(false);
  });
  it("undoes a region change and the latest layer change", async () => {
    await engine.chooseRegion("headNeck");
    await engine.stepGroup("muscular", -1);
    engine.undo();
    expect(engine.settings.groups.muscular.removed).toBe(0);
    engine.undo();
    expect(engine.settings.region).toBe("whole");
  });
  it("reports a failed source and can retry without duplicate models", async () => {
    env.fail = "visceral";
    await expect(engine.toggleGroup("digestive", true)).rejects.toThrow(
      "Unable to load visceral",
    );
    expect(engine.getStatus()).toContain("Unable to load");
    env.fail = null;
    await engine.toggleGroup("digestive", true);
    expect(state.loadedSystems.filter((s) => s === "visceral")).toHaveLength(1);
    expect(env.meshes.get("Stomach")[0].visible).toBe(true);
  });
});

describe('study exploration reuses actual visibility and camera engine',()=>{
 it('prepares the chosen region/system with all layers, without any selected target',async()=>{
  await engine.prepareStudy({region:'headNeck',system:'muscular'});
  expect(state.selectedPart).toBeNull();expect(state.isolatedPart).toBeNull();
  for(const id of ['Fascia','Platysma','Deep neck'])expect(env.meshes.get(id)[0].visible).toBe(true);
  expect(engine.settings.groups.muscular.removed).toBe(0);expect(env.meshes.get('Ulna.l')[0].visible).toBe(false);
 });
 it('next question resets multiple hides and fade while preserving the participant camera',async()=>{
  await engine.prepareStudy({region:'headNeck',system:'muscular'});
  visibility.hidePart('Fascia');visibility.hidePart('Platysma');visibility.setPartTransparency('Deep neck',.2);
  state.viewer.camera.position.set(2,3,4);state.viewer.controls.target.set(.1,.2,.3);
  await engine.prepareStudy({region:'headNeck',system:'muscular'});
  expect(state.viewer.camera.position.toArray()).toEqual([2,3,4]);expect(state.viewer.controls.target.toArray()).toEqual([.1,.2,.3]);
  for(const id of ['Fascia','Platysma','Deep neck'])expect(env.meshes.get(id)[0].visible).toBe(true);
  expect(state.hiddenParts.size).toBe(0);expect(state.transparentParts.size).toBe(0);expect(state.selectedPart).toBeNull();
 });
 it('reset visibility recovers hidden structures without changing scope or creating a selection',async()=>{
  await engine.prepareStudy({region:'headNeck',system:'muscular'});visibility.hidePart('Fascia');visibility.hidePart('Platysma');engine.restoreScene();
  expect(env.meshes.get('Fascia')[0].visible).toBe(true);expect(env.meshes.get('Platysma')[0].visible).toBe(true);expect(env.meshes.get('Ulna.l')[0].visible).toBe(false);expect(state.selectedPart).toBeNull();
 });
 it('restart or changed scope removes previous hidden state and isolation',async()=>{
  await engine.prepareStudy({region:'whole',system:''});visibility.hidePart('Ulna.l');visibility.isolatePart('Platysma');
  await engine.prepareStudy({region:'whole',system:'skeletal'});expect(env.meshes.get('Ulna.l')[0].visible).toBe(true);expect(state.hiddenParts.size).toBe(0);expect(state.isolatedPart).toBeNull();
 });
});
