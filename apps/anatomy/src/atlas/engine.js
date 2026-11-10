import {contextualBounds} from './framing.js';
import * as THREE from "three";
import { state, subscribe, notify, setIsolatedPart } from "../state/store.js";
import {
  loadModel,
  getMeshRegistry,
  ownMeshesOf,
} from "../viewer/loadModel.js";
import {
  applyVisibilityMask,
  captureVisibility,
  restoreVisibility,
  restoreAllParts,
  showPart,
  hidePart,
  isolatePart,
  setPartTransparency,
} from "../viewer/visibility.js";
import { deselectPart, selectPartById } from "../viewer/selection.js";
import { animateCamera } from "../viewer/camera.js";
import { GROUPS, initialSettings, visibleBySettings } from "./catalog.js";
import { bp3dHas } from "../viewer/bp3dSource.js";
export let settings = initialSettings();
let catalog = {},
  internal = 0,
  history = [],
  isolation = null,
  revision = 0,
  selectRevision = 0;
let status = "Ready";
export const getCatalog = () => catalog;
export const getStatus = () => status;
export const canUndo = () => history.length > 0;
export const hasIsolation = () => !!isolation;
export function metadata(id) {
  return catalog[id];
}
function quiet(fn) {
  internal++;
  try {
    return fn();
  } finally {
    internal--;
  }
}
function snapshot() {
  return {
    settings: structuredClone(settings),
    visibility: captureVisibility(),
    isolated: state.isolatedPart,
    context: isolation,
  };
}
function remember() {
  if (internal) return;
  history.push(snapshot());
  if (history.length > 30) history.shift();
}
function changed() {
  notify("atlasChanged", settings);
  save();
}
function mask() {
  const selectedIsolation = state.isolatedPart;
  applyVisibilityMask((id) => {
    const m = catalog[id];
    return m && visibleBySettings(m, settings);
  });
  // Axial regional clips keep long vessels/nerves in context. Limb scenes use
  // complete structures: never crop a femur or forearm to a height percentage.
  const bands = {
    headNeck: [1.38, 1.9],
    thorax: [1.08, 1.46],
    abdomen: [0.86, 1.28],
    pelvis: [0.7, 1.04],
  };
  const finding = globalThis.document?.body?.dataset?.studyMode === 'find';
  const band = selectedIsolation || finding ? null : bands[settings.region];
  state.viewer.renderer.clippingPlanes = band
    ? [
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -band[0]),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), band[1]),
      ]
    : [];
  state.viewer.render();
}
export function visibleBounds() {
  const b = new THREE.Box3();
  getMeshRegistry().forEach((node, id) =>
    ownMeshesOf(id)
      .filter((m) => m.visible)
      .forEach((m) => {
        m.geometry.computeBoundingBox();
        b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
      }),
  );
  const bands = {
    headNeck: [1.38, 1.9],
    thorax: [1.08, 1.46],
    abdomen: [0.86, 1.28],
    pelvis: [0.7, 1.04],
  };
  const band = state.isolatedPart ? null : bands[settings.region];
  if (band) {
    b.min.y = Math.max(b.min.y, band[0]);
    b.max.y = Math.min(b.max.y, band[1]);
  }
  return b;
}
export async function frame(box = visibleBounds(), direction = null, animate = true) {
  if (box.isEmpty()) return;
  const { camera, controls } = state.viewer;
  const size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const distance =
    Math.max(
      size.y / 2 / Math.tan(vfov / 2),
      size.x / 2 / (Math.tan(vfov / 2) * camera.aspect),
      size.z / 2,
    ) *
      1.3 +
    size.z / 2;
  const dir =
    direction || camera.position.clone().sub(controls.target).normalize();
  if (!animate) {
    camera.position.copy(center.clone().add(dir.multiplyScalar(Math.max(distance,0.08))));
    controls.target.copy(center);controls.update?.();state.viewer.render();return;
  }
  await animateCamera(
    camera,
    controls,
    center.clone().add(dir.multiplyScalar(Math.max(distance, 0.08))),
    center,
  );
}
async function loadEnabled() {
  const sources = [
    ...new Set(
      GROUPS.filter((g) => settings.groups[g.id].enabled).map((g) => g.source),
    ),
  ];
  const missing = sources.filter((s) => !state.loadedSystems.includes(s));
  const queue = [...missing];
  const failed = [];
  const worker = async () => {
    while (queue.length) {
      const source = queue.shift();
      status = `Loading ${source}…`;
      notify("atlasLoading", status);
      try {
        await loadModel(source, state.viewer);
        mask();
      } catch {
        failed.push(source);
      }
    }
  };
  await Promise.all([worker(), worker()]);
  if (failed.length)
    throw new Error(`Unable to load ${failed.join(", ")}. Try again.`);
}
async function commit(action, { fit = false } = {}) {
  const token = ++revision;
  remember();
  quiet(() => {
    deselectPart();
    if (isolation) {
      restoreVisibility(isolation.visibility);
      isolation = null;
    }
    setIsolatedPart(null);
    action();
  });
  try {
    await loadEnabled();
    if (token !== revision) return false;
    mask();
    status = "Ready";
    changed();
    if (fit) await frame();
    return true;
  } catch (e) {
    status = e.message;
    mask();
    changed();
    throw e;
  }
}
export const chooseRegion = (id) =>
  commit(
    () => {
      settings.region = id;
    },
    { fit: true },
  );
export const toggleGroup = (id, on) =>
  commit(() => {
    settings.groups[id].enabled = on;
  });
export const stepGroup = (id, delta) =>
  commit(() => {
    const entry = settings.groups[id],
      g = GROUPS.find((x) => x.id === id);
    if (!entry.enabled) {
      if (delta < 0) return;
      entry.enabled = true;
      entry.removed = Math.max(0, g.layers.length - 1);
      return;
    }
    entry.removed = Math.min(
      g.layers.length,
      Math.max(0, entry.removed - delta),
    );
    if (entry.removed === g.layers.length) {
      entry.enabled = false;
      entry.removed = Math.max(0, g.layers.length - 1);
    }
  });
export const preset = (id) =>
  commit(
    () => {
      const groups =
        id === "all"
          ? GROUPS.map((g) => g.id)
          : id === "bones"
            ? ["skeletal", "joints"]
            : id === "organs"
              ? [
                  "heart",
                  "respiratory",
                  "digestive",
                  "urinary",
                  "reproductive",
                  "endocrine",
                ]
              : ["skeletal", "muscular"];
      GROUPS.forEach((g) => {
        settings.groups[g.id] = { enabled: groups.includes(g.id), removed: 0 };
      });
      quiet(() => restoreAllParts());
    },
    { fit: true },
  );
// Focus an entire study system, rather than a single mesh such as an atrium.
export const viewGroup = (id) => {
  const group = GROUPS.find((g) => g.id === id);
  if (!group) throw new Error("System unavailable");
  return commit(() => {
    settings.region = "whole";
    GROUPS.forEach((g) => {
      settings.groups[g.id] = { enabled: g.id === id, removed: 0 };
    });
    quiet(() => restoreAllParts());
  }, { fit: true });
};
// Reset quiz visibility using the atlas engine; framing only depends on chosen scope.
let studyScopeKey=null;
export async function prepareStudy({region,system}) {
  const key=region+'|'+system,fit=studyScopeKey!==key;
  const applied=await commit(()=>{
    settings.region=region;
    GROUPS.forEach(g=>{settings.groups[g.id]={enabled:!system||g.source===system||g.id==='skeletal',removed:0};});
    quiet(()=>restoreAllParts());
  },{fit});
  if(applied)studyScopeKey=key;
}
export async function reveal(id) {
  const meta = catalog[id];
  if (!meta)
    throw new Error("This structure is not available in the supplied model.");
  if (!bp3dHas(id))
    throw new Error("Struktur ini belum ada di BodyParts3D (pratinjau lokal, cakupan sebagian). Kembali ke model Atlas untuk melihatnya.");
  const token = ++selectRevision;
  const applied = await commit(() => {
    const yMin = meta.box[1],
      yMax = meta.box[4];
    const bands = {
      headNeck: [1.38, 1.9],
      thorax: [1.08, 1.46],
      abdomen: [0.86, 1.28],
      pelvis: [0.7, 1.04],
    };
    if (!meta.regions.includes(settings.region) || settings.region === "whole")
      settings.region = meta.regions[0] || "whole";
    const band = bands[settings.region];
    if (band && (yMin < band[0] - 0.005 || yMax > band[1] + 0.005))
      settings.region = "whole";
    settings.groups.skeletal.enabled = true;
    settings.groups.skeletal.removed = 0;
    settings.groups[meta.group].enabled = true;
    settings.groups[meta.group].removed = Math.min(
      settings.groups[meta.group].removed,
      meta.layer,
    );
  });
  if (!applied || token !== selectRevision) return;
  quiet(() => showPart(id));
  mask();
  selectPartById(id, state.viewer);
  await frame(contextualBounds(meta));
  changed();
}
export function isolateSelected() {
  if (!state.selectedPart || isolation) return;
  remember();
  isolation = snapshot();
  quiet(() => isolatePart(state.selectedPart.id));
  mask();
  changed();
  frame();
}
export function returnContext() {
  if (!isolation) return;
  remember();
  const old = isolation;
  isolation = null;
  quiet(() => {
    deselectPart();
    settings = structuredClone(old.settings);
    restoreVisibility(old.visibility);
  });
  mask();
  changed();
  frame();
}
export function hideSelected() {
  if (state.selectedPart) hidePart(state.selectedPart.id);
  quiet(() => deselectPart());
  mask();
  changed();
}
export function fadeSelected() {
  const id = state.selectedPart?.id;
  if (id)
    setPartTransparency(
      id,
      (state.partStates.get(id)?.opacity ?? 1) < 1 ? 1 : 0.25,
    );
  changed();
}
export function restoreScene() {
  remember();
  quiet(() => {
    deselectPart();
    isolation = null;
    restoreAllParts();
  });
  mask();
  changed();
}
export function undo() {
  const prev = history.pop();
  if (!prev) return;
  revision++;
  quiet(() => {
    deselectPart();
    isolation = prev.context || null;
    settings = prev.settings;
    restoreVisibility(prev.visibility);
    setIsolatedPart(prev.isolated || null);
  });
  mask();
  changed();
}
export const counts = (g) =>
  Object.values(catalog).filter(
    (m) =>
      m.group === g &&
      (settings.region === "whole" || m.regions.includes(settings.region)),
  ).length;
export const idsForGroup = (g) =>
  Object.keys(catalog).filter(
    (id) =>
      catalog[id].group === g &&
      (settings.region === "whole" ||
        catalog[id].regions.includes(settings.region)),
  );
function serialise() {
  const context = isolation || snapshot();
  const { camera, controls } = state.viewer;
  return {
    settings: context.settings,
    visibility: context.visibility.filter(([, v, o]) => !v || o !== 1),
    selected: state.selectedPart?.id || null,
    isolated: isolation ? state.isolatedPart : null,
    camera: [...camera.position.toArray(), ...controls.target.toArray()],
  };
}
function save() {
  if (globalThis.document?.body?.classList.contains('anatomy-annotator-active')) return;
  if (globalThis.document?.body?.classList.contains('anatomy-study-active')) return;
  try {
    localStorage.setItem("medcoel:atlas:v2", JSON.stringify(serialise()));
  } catch {
    /* optional persistence */
  }
}
export function shareView() {
  const url = new URL(location.href);
  url.hash = "atlas=" + encodeURIComponent(JSON.stringify(serialise()));
  return url.href;
}
function validSaved(saved) {
  if (
    !saved?.settings ||
    ![
      "whole",
      "headNeck",
      "thorax",
      "abdomen",
      "pelvis",
      "upperLimb",
      "lowerLimb",
      "back",
    ].includes(saved.settings.region)
  )
    return false;
  return GROUPS.every((g) => {
    const p = saved.settings.groups?.[g.id];
    return (
      typeof p?.enabled === "boolean" &&
      Number.isInteger(p.removed) &&
      p.removed >= 0 &&
      p.removed < g.layers.length
    );
  });
}
export async function initAtlas(data) {
  catalog = data;
  state.atlas = {};
  let saved;
  try {
    const hash = new URLSearchParams(location.hash.slice(1));
    saved = JSON.parse(
      hash.get("atlas") || localStorage.getItem("medcoel:atlas:v2") || "null",
    );
  } catch {
    /* use defaults */
  }
  // A quiz starts from its participant scope, never the previous atlas selection.
  if (globalThis.document?.body?.classList.contains('anatomy-study-active')) saved = null;
  if (validSaved(saved)) {
    settings = saved.settings;
    // Links saved before the licence quarantine may still mention withheld groups.
    for (const id of Object.keys(settings.groups)) if (!GROUPS.some((g) => g.id === id)) delete settings.groups[id];
  }
  await loadEnabled();
  if (validSaved(saved) && Array.isArray(saved.visibility))
    quiet(() =>
      restoreVisibility(
        saved.visibility.filter(
          (row) =>
            Array.isArray(row) &&
            catalog[row[0]] &&
            typeof row[1] === "boolean" &&
            Number.isFinite(row[2]) &&
            row[2] >= 0 &&
            row[2] <= 1,
        ),
      ),
    );
  mask();
  status = "Ready";
  await frame(undefined, new THREE.Vector3(0, 0, 1), false);
  subscribe("beforeVisibilityChange", () => remember());
  for (const key of [
    "partHidden",
    "partShown",
    "partTransparencyChanged",
    "allPartsRestored",
  ])
    subscribe(key, () => {
      if (!internal) {
        mask();
        changed();
      }
    });
  // Native callout isolation has the same reversible context as the side panel.
  subscribe("partIsolated", () => {
    if (!internal) {
      const prior = history.at(-1);
      if (prior) isolation = prior;
      mask();
      changed();
    }
  });
  if (saved?.selected && catalog[saved.selected]) await reveal(saved.selected);
  if (saved?.isolated && saved.isolated === state.selectedPart?.id)
    isolateSelected();
  if (
    Array.isArray(saved?.camera) &&
    saved.camera.length === 6 &&
    saved.camera.every((x) => Number.isFinite(x) && Math.abs(x) < 100)
  ) {
    state.viewer.camera.position.fromArray(saved.camera);
    state.viewer.controls.target.fromArray(saved.camera, 3);
    state.viewer.controls.update?.();
  }
  history = [];
  state.viewer.controls.addEventListener?.("end", save);
  changed();
}
