// three.js patient scene. Patient geometry lives in LPS millimetres inside ONE group whose matrix
// maps LPS -> scene (supine on the exam table). Nothing in here feeds the imaging calculation.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { computeBoundsTree, acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/** LPS (x=Left, y=Posterior, z=Superior) -> scene (x=Superior/head, y=Anterior/up, z=Left). det = +1. */
export const LPS_TO_SCENE = new THREE.Matrix4().set(0, 0, 1, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);

export const ORGAN_STYLE = {
  skeleton: { color: 0xefe6d2, system: 'skeleton', opacity: 1 },
  heart: { color: 0xb3343d, system: 'cardiovascular', opacity: 1 },
  aorta: { color: 0xc8463b, system: 'cardiovascular', opacity: 1 },
  vena_cava: { color: 0x3d5a98, system: 'cardiovascular', opacity: 1 },
  pulmonary_artery: { color: 0x6b5fb5, system: 'cardiovascular', opacity: 1 },
  lung_r: { color: 0xe9a7b6, system: 'respiratory', opacity: 0.38 },
  lung_l: { color: 0xe9a7b6, system: 'respiratory', opacity: 0.38 },
  airway: { color: 0xa8b7c0, system: 'respiratory', opacity: 0.9 },
  diaphragm: { color: 0xb8604f, system: 'respiratory', opacity: 0.55 },
  liver: { color: 0x8e3b2b, system: 'abdominal', opacity: 1 },
  gallbladder: { color: 0x5f9a48, system: 'abdominal', opacity: 1 },
  spleen: { color: 0x7d3361, system: 'abdominal', opacity: 1 },
  pancreas: { color: 0xe0b876, system: 'abdominal', opacity: 1 },
  esophagus: { color: 0xc98a7c, system: 'abdominal', opacity: 1 },
  stomach: { color: 0xe39d8a, system: 'abdominal', opacity: 1 },
  small_bowel: { color: 0xf0bba5, system: 'abdominal', opacity: 1 },
  colon: { color: 0xb88468, system: 'abdominal', opacity: 1 },
  kidneys: { color: 0xa2503f, system: 'urinary', opacity: 1 },
  bladder: { color: 0xe6d36a, system: 'urinary', opacity: 0.8 },
  brain: { color: 0xe8d0d0, system: 'nervous', opacity: 1 },
  effusion: { color: 0x4aa3ff, system: 'pathology', opacity: 0.6 },
};

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export class PatientScene {
  constructor(container, handlers) {
    this.container = container;
    this.h = handlers;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.setClearColor(0xe9ece6, 1);
    this.renderer.domElement.setAttribute('data-testid', 'patient-canvas');
    this.renderer.domElement.setAttribute('aria-label', 'Pasien virtual 3D: seret probe atau klik kulit untuk menempatkan probe');
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 5, 9000);
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this._installPointer(); // before OrbitControls so handles win the pointer
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.12; this.controls.screenSpacePanning = true;
    this.controls.minDistance = 250; this.controls.maxDistance = 4200;
    this.controls.addEventListener('change', () => { this.cameraVersion++; });
    this.cameraVersion = 0;
    this._lights();
    this.patient = new THREE.Group();
    this.patient.matrixAutoUpdate = false; this.patient.matrix.copy(LPS_TO_SCENE);
    this.scene.add(this.patient);
    this.meshes = {};
    this.clip = { anterior: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), plane: new THREE.Plane() };
    this._table();
    this._probeModel('convex');
    this._imagePlane();
    this._gizmo();
    this._stethoscope();
    this.labels = [];
    this._axisGuide();
    this.setInteraction('place');
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f86, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(300, 1600, -700); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6); fill.position.set(-800, 500, 900); this.scene.add(fill);
    const under = new THREE.DirectionalLight(0xfff4ea, 0.9); under.position.set(200, -1600, -300); this.scene.add(under); // posterior views
  }

  _table() {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1750, 34, 640), new THREE.MeshStandardMaterial({ color: 0x5f6b6d, roughness: 0.7, metalness: 0.1 }));
    top.position.set(-230, -175, 0); g.add(top);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1700, 30, 600), new THREE.MeshStandardMaterial({ color: 0xcdd9d3, roughness: 0.95 }));
    pad.position.set(-230, -143, 0); g.add(pad);
    this.tableLegs = [];
    for (const x of [-950, 500]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(80, 560, 420), new THREE.MeshStandardMaterial({ color: 0x47524f }));
      leg.position.set(x, -470, 0); g.add(leg); this.tableLegs.push(leg);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({ color: 0xd6dbd2, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -750; g.add(floor);
    const grid = new THREE.GridHelper(5000, 50, 0xb9c2b8, 0xc8cfc6); grid.position.y = -749; g.add(grid);
    this.floorParts = [floor, grid];
    this.table = g; this.scene.add(g);
    this.tableMaterials = [top.material, pad.material];
    this.tableParts = { top, pad };
  }

  /**
   * Fit the exam table under a body (LPS bounds of the skin): pad top touches the most posterior skin,
   * length covers head to feet. Used for datasets whose body is longer than the phantom's CT box.
   */
  setTableFor(lo, hi) {
    const { top, pad } = this.tableParts, len = hi[2] - lo[2] + 160, cx = (hi[2] + lo[2]) / 2;
    pad.scale.x = len / 1700; top.scale.x = (len + 50) / 1750; pad.position.x = cx; top.position.x = cx;
    pad.position.y = -hi[1] - 15.5; top.position.y = pad.position.y - 32;
    this.tableLegs[0].position.x = lo[2] + 160; this.tableLegs[1].position.x = hi[2] - 160;
  }

  /** Build skin + organ meshes from LPS position arrays. */
  setMeshes(meshes, { coverage, capZ }) {
    for (const m of Object.values(this.meshes)) { this.patient.remove(m.mesh); m.mesh.geometry.dispose(); }
    this.meshes = {};
    this.capZ = capZ;
    for (const [name, m] of Object.entries(meshes)) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.lps), 3));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(m.indices), 1));
      geo.computeVertexNormals();
      const isSkin = name === 'skin';
      const style = ORGAN_STYLE[name] || { color: 0xaaaaaa, system: 'other', opacity: 1 };
      const mat = new THREE.MeshStandardMaterial({
        color: isSkin ? 0xd8a587 : style.color, roughness: isSkin ? 0.62 : 0.55, metalness: 0,
        transparent: !isSkin && style.opacity < 1, opacity: isSkin ? 1 : style.opacity, side: THREE.DoubleSide,
        depthWrite: isSkin || style.opacity >= 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name; mesh.renderOrder = isSkin ? 10 : style.opacity < 1 ? 5 : 1;
      if (isSkin) {
        geo.computeBoundsTree();
        // static REFERENCE skin (never deformed) for continuous sliding and side selection
        const rg = new THREE.BufferGeometry();
        rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.lps), 3));
        rg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(geo.attributes.normal.array), 3));
        rg.setIndex(new THREE.BufferAttribute(new Uint32Array(m.indices), 1));
        this.skinRef = { geo: rg, bvh: new MeshBVH(rg) };
      }
      this.patient.add(mesh);
      this.meshes[name] = { mesh, ref: new Float32Array(m.lps), refNormals: new Float32Array(geo.attributes.normal.array), system: isSkin ? 'skin' : style.system, baseOpacity: style.opacity };
    }
    // CT acquisition coverage box
    if (this.coverage) this.patient.remove(this.coverage);
    const size = [0, 1, 2].map((i) => coverage.hi[i] - coverage.lo[i]);
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), new THREE.LineBasicMaterial({ color: 0x2f8f80, transparent: true, opacity: 0.55 }));
    box.position.set(...[0, 1, 2].map((i) => (coverage.hi[i] + coverage.lo[i]) / 2));
    this.coverage = box; this.patient.add(box);
    this.bounds = coverage;
    this._orientationLabels();
    this.setView('examiner', false);
  }

  /** Update a mesh's vertex positions (LPS) in place; refit the BVH used for skin picking. */
  updatePositions(name, positions) {
    const m = this.meshes[name]; if (!m) return;
    m.mesh.geometry.attributes.position.array.set(positions);
    m.mesh.geometry.attributes.position.needsUpdate = true;
    if (name === 'skin' && m.mesh.geometry.boundsTree) m.mesh.geometry.boundsTree.refit();
    m.mesh.geometry.computeBoundingSphere();
  }

  setEffusionMesh(mesh) {
    if (this.effusionMesh) { this.patient.remove(this.effusionMesh); this.effusionMesh.geometry.dispose(); this.effusionMesh = null; }
    if (!mesh) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1)); geo.computeVertexNormals();
    this.effusionMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: ORGAN_STYLE.effusion.color, transparent: true, opacity: 0.6, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    this.effusionMesh.renderOrder = 6;
    this.effusionRef = new Float32Array(mesh.positions);
    this.patient.add(this.effusionMesh);
  }

  /** Visibility: skin opacity, systems, cutaway. */
  setAppearance({ skinOpacity, systems, cutaway, cutDepth, showCoverage }) {
    const skin = this.meshes.skin?.mesh;
    if (skin) {
      skin.material.opacity = skinOpacity; skin.material.transparent = skinOpacity < 0.999; skin.material.depthWrite = skinOpacity >= 0.999;
      skin.visible = skinOpacity > 0.01; // 'internal anatomy' mode hides the shell (it stays pickable for the probe)
      skin.material.needsUpdate = true;
      const planes = [];
      if (cutaway === 'anterior') { this.clip.anterior.constant = cutDepth; planes.push(this.clip.anterior); }
      if (cutaway === 'plane' && this.clipPlaneReady) planes.push(this.clip.plane);
      skin.material.clippingPlanes = planes;
      skin.material.clipShadows = true;
    }
    for (const [name, m] of Object.entries(this.meshes)) if (name !== 'skin') m.mesh.visible = !!systems[m.system];
    if (this.effusionMesh) this.effusionMesh.visible = true;
    if (this.coverage) this.coverage.visible = showCoverage;
    this.labelsVisible = true;
  }

  // ------------------------------------------------------------------ probe, plane, gizmo
  _probeModel(kind) {
    if (this.probe) this.patient.remove(this.probe);
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x27343b, roughness: 0.45, metalness: 0.15 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x5fd0b5, roughness: 0.4 });
    const ap = kind === 'linear' ? 40 : kind === 'convex' ? 58 : 22;
    let head;
    if (kind === 'convex') {
      head = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 16, 40, 1, false, -0.58, 1.16), body);
      head.rotation.set(Math.PI / 2, 0, 0); head.position.set(0, 50, 0); // pie-slice head: curved face touches the skin
      const cap = new THREE.Mesh(new THREE.BoxGeometry(ap, 26, 16), body); cap.position.y = 18; g.add(cap);
    } else {
      head = new THREE.Mesh(new THREE.BoxGeometry(ap, 18, kind === 'linear' ? 12 : 16), body); head.position.y = 9;
    }
    g.add(head);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(ap - 4, 1.5, 9), new THREE.MeshStandardMaterial({ color: 0x9fb2b8, roughness: 0.3 }));
    lens.position.y = kind === 'convex' ? 1.5 : 0.8; g.add(lens);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(13, 17, 105, 24), body); handle.position.y = 85; g.add(handle);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(17.4, 17.4, 6, 24), accent); band.position.y = 40; g.add(band);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0x552200 }));
    marker.position.set(-ap / 2 - 1, 20, 0); g.add(marker);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3([0, 138, 0]), v3([0, 200, 20]), v3([-40, 260, 120]), v3([-80, 250, 260])]), 30, 4, 8), body);
    g.add(cable);
    g.traverse((o) => { o.userData.handle = { kind: 'probe' }; });
    g.matrixAutoUpdate = false;
    this.probe = g; this.probeKind = kind;
    this.patient.add(g);
  }

  _imagePlane() {
    this.planeCanvas = document.createElement('canvas'); this.planeCanvas.width = 4; this.planeCanvas.height = 4;
    this.planeTex = new THREE.CanvasTexture(this.planeCanvas); this.planeTex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    this.planeMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.planeTex, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    this.planeMesh.renderOrder = 20;
    const outline = new THREE.LineLoop(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 80), 3)), new THREE.LineBasicMaterial({ color: 0x5fd0b5 }));
    this.planeOutline = outline;
    this.patient.add(this.planeMesh, outline);
  }

  /** plane: {top,u,v,width,height} in LPS. image: {rgba,w,h} */
  setImagePlane(plane, image) {
    const W = plane.width, H = plane.height, t = plane.top, u = plane.u, vv = plane.v;
    const p = (s, d) => [t[0] + u[0] * s + vv[0] * d, t[1] + u[1] * s + vv[1] * d, t[2] + u[2] * s + vv[2] * d];
    const pts = [p(-W / 2, 0), p(W / 2, 0), p(-W / 2, H), p(W / 2, H)];
    const pos = this.planeMesh.geometry.attributes.position;
    pts.forEach((q, i) => pos.setXYZ(i, ...q)); pos.needsUpdate = true; this.planeMesh.geometry.computeBoundingSphere();
    const ol = this.planeOutline.geometry.attributes.position;
    const poly = (plane.outline || [[-W / 2, 0], [W / 2, 0], [W / 2, H], [-W / 2, H]]).map(([s2, d2]) => p(s2, d2));
    poly.forEach((q, i) => ol.setXYZ(i, ...q)); this.planeOutline.geometry.setDrawRange(0, poly.length); ol.needsUpdate = true; this.planeOutline.geometry.computeBoundingSphere();
    if (image) {
      if (this.planeCanvas.width !== image.w || this.planeCanvas.height !== image.h) {
        this.planeCanvas.width = image.w; this.planeCanvas.height = image.h;
        this.planeTex.dispose(); this.planeTex = new THREE.CanvasTexture(this.planeCanvas); this.planeTex.colorSpace = THREE.SRGBColorSpace;
        this.planeMesh.material.map = this.planeTex; this.planeMesh.material.needsUpdate = true;
      }
      this.planeCanvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(image.rgba), image.w, image.h), 0, 0);
      this.planeTex.needsUpdate = true;
    }
    // plane-aligned cutaway: keep the half-space behind the image plane (normal points away from viewer side)
    const n = new THREE.Vector3(...plane.n).applyMatrix4(new THREE.Matrix4().extractRotation(LPS_TO_SCENE)).normalize();
    const c = v3(p(0, H / 2)).applyMatrix4(LPS_TO_SCENE);
    this.clip.plane.setFromNormalAndCoplanarPoint(n.multiplyScalar(-1), c); this.clipPlaneReady = true;
  }

  setProbe(pose, kind, visible) {
    if (kind !== this.probeKind) this._probeModel(kind);
    this.probe.visible = visible;
    if (!visible) return;
    const m = new THREE.Matrix4().makeBasis(v3(pose.u), v3(pose.b).multiplyScalar(-1), v3(pose.e));
    m.setPosition(v3(pose.origin));
    this.probe.matrix.copy(m); this.probe.matrixWorldNeedsUpdate = true;
  }

  _gizmo() {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const mk = (color, axisKey, kind) => {
      const geo = kind === 'ring' ? new THREE.TorusGeometry(34, 1.8, 10, 64) : new THREE.CylinderGeometry(2.2, 2.2, 70, 10);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 }));
      mesh.renderOrder = 40; mesh.userData.handle = { kind, axis: axisKey }; mesh.userData.baseColor = color;
      if (kind === 'arrow') {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 16, 14), mesh.material); cone.position.y = 42; cone.userData.handle = mesh.userData.handle; cone.renderOrder = 40; mesh.add(cone);
        mesh.geometry.translate(0, 0, 0);
      }
      // wide invisible picking sleeve
      const pickGeo = kind === 'ring' ? new THREE.TorusGeometry(34, 7, 6, 48) : new THREE.CylinderGeometry(9, 9, 90, 8);
      const pick = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ visible: false })); pick.userData.handle = mesh.userData.handle; mesh.add(pick);
      return mesh;
    };
    this.gizmoParts = {
      rotate: mk(0x2fbf71, 'rotate', 'ring'), heelToe: mk(0x3b82f6, 'heelToe', 'ring'), rock: mk(0xef4444, 'rock', 'ring'),
      rotL: mk(0xef4444, 'L', 'ring'), rotP: mk(0x2fbf71, 'P', 'ring'), rotS: mk(0x3b82f6, 'S', 'ring'),
      movL: mk(0xef4444, 'L', 'arrow'), movP: mk(0x2fbf71, 'P', 'arrow'), movS: mk(0x3b82f6, 'S', 'arrow'),
    };
    for (const m of Object.values(this.gizmoParts)) g.add(m);
    this.gizmo = g; this.patient.add(g);
  }

  /** axes: {key: [x,y,z]} rotation axes (LPS) for rings; mode clinical|free; pivot LPS. */
  setGizmo(mode, pivot, axes, visible = true) {
    this.gizmo.visible = visible;
    const P = this.gizmoParts, z = new THREE.Vector3(0, 0, 1), y = new THREE.Vector3(0, 1, 0);
    const show = mode === 'clinical' ? ['rotate', 'heelToe', 'rock'] : ['rotL', 'rotP', 'rotS', 'movL', 'movP', 'movS'];
    for (const [k, m] of Object.entries(P)) m.visible = show.includes(k);
    const orient = (mesh, axis, base, offset = 0) => {
      mesh.quaternion.setFromUnitVectors(base, v3(axis).normalize());
      mesh.position.copy(v3(axis).normalize().multiplyScalar(offset));
    };
    if (mode === 'clinical') {
      orient(P.rotate, axes.b, z); orient(P.heelToe, axes.e, z); orient(P.rock, axes.u, z);
      P.rotate.scale.setScalar(1.25); P.heelToe.scale.setScalar(1.0); P.rock.scale.setScalar(1.0);
    } else {
      orient(P.rotL, [1, 0, 0], z); orient(P.rotP, [0, 1, 0], z); orient(P.rotS, [0, 0, 1], z);
      orient(P.movL, [1, 0, 0], y, 70); orient(P.movP, [0, 1, 0], y, 70); orient(P.movS, [0, 0, 1], y, 70);
      for (const k of ['rotL', 'rotP', 'rotS']) P[k].scale.setScalar(1.6);
    }
    this.gizmo.matrix.makeTranslation(...pivot); this.gizmo.matrixWorldNeedsUpdate = true;
    this.gizmoPivot = pivot;
  }

  _stethoscope() {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9d2d6, metalness: 0.85, roughness: 0.25 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 9, 36), metal); disc.position.y = 4.5; g.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(22, 2.5, 10, 36), new THREE.MeshStandardMaterial({ color: 0x1f2a30 })); rim.rotation.x = Math.PI / 2; rim.position.y = 1; g.add(rim);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 30, 12), metal); stem.position.set(0, 20, 0); stem.rotation.z = 0.6; g.add(stem);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3([-9, 32, 0]), v3([-40, 90, 0]), v3([-60, 160, 60]), v3([-40, 230, 120])]), 30, 4, 8), new THREE.MeshStandardMaterial({ color: 0x1f2a30, roughness: 0.6 }));
    g.add(tube);
    g.visible = false; this.steth = g; this.patient.add(g);
    this.siteMarkers = new THREE.Group(); this.siteMarkers.visible = false; this.patient.add(this.siteMarkers);
  }

  setStethoscope(point, normal, visible) {
    this.steth.visible = !!(visible && point);
    if (!this.steth.visible) return;
    const n = v3(normal).normalize(), up = Math.abs(n.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const xA = new THREE.Vector3().crossVectors(up, n).normalize(), zA = new THREE.Vector3().crossVectors(xA, n);
    const m = new THREE.Matrix4().makeBasis(xA, n, zA); m.setPosition(v3(point)); this.steth.matrix.copy(m); this.steth.matrixWorldNeedsUpdate = true;
  }

  setSites(sites, visible) {
    this.siteMarkers.clear();
    for (const s of sites) {
      const c = s.focus === 'heart' ? 0xd2414c : s.focus === 'lung' ? 0x3b82f6 : 0xc59a1a;
      const m = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: true }));
      const n = v3(s.normal).normalize();
      m.position.copy(v3(s.point).add(n.clone().multiplyScalar(1.2)));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      m.userData.site = s.key; m.userData.handle = { kind: 'site', key: s.key };
      this.siteMarkers.add(m);
    }
    this.siteMarkers.visible = visible;
    this.sites = sites;
  }

  // ------------------------------------------------------------------ labels
  _orientationLabels() {
    for (const l of this.labels) l.el.remove();
    const b = this.bounds, c = [0, 1, 2].map((i) => (b.lo[i] + b.hi[i]) / 2);
    const defs = [
      ['Kepala · S', [c[0], c[1], b.hi[2] + 25]], ['Kaki · I', [c[0], c[1], b.lo[2] - 25]],
      ['Kanan · R', [b.lo[0] - 30, c[1] - 40, c[2]]], ['Kiri · L', [b.hi[0] + 30, c[1] - 40, c[2]]],
      ['Anterior · A', [c[0], b.lo[1] - 50, c[2] - 60]], ['Posterior · P', [c[0], b.hi[1] + 40, c[2] - 60]],
      ['Batas akuisisi CT', [b.hi[0], b.lo[1], b.lo[2]]],
    ];
    this.labels = defs.map(([text, p], i) => {
      const el = document.createElement('div'); el.className = 'orient-label' + (i === 6 ? ' small' : ''); el.textContent = text;
      this.container.appendChild(el); return { el, p };
    });
  }

  _updateLabels() {
    const w = this.container.clientWidth, h = this.container.clientHeight, v = new THREE.Vector3();
    const occupied = [];
    for (const l of this.labels) {
      v.set(...l.p).applyMatrix4(LPS_TO_SCENE).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      // Drop labels behind the camera, outside the viewport, under the top toolbar,
      // or overlapping a higher-priority anatomical direction label.
      let visible = v.z < 1 && Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.94 && y > 64 && y < h - 60;
      const halfWidth = Math.max(35, l.el.textContent.length * 3.6 + 10);
      if (visible) {
        const r = { l: x - halfWidth, r: x + halfWidth, t: y - 13, b: y + 13 };
        if (occupied.some((o) => r.l < o.r + 5 && r.r > o.l - 5 && r.t < o.b + 4 && r.b > o.t - 4)) visible = false;
        else occupied.push(r);
      }
      l.el.style.display = visible ? 'block' : 'none';
      if (visible) l.el.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`;
    }
    for (const l of this.guideLabels || []) {
      if (!this.guideSpec) { l.el.style.display = 'none'; continue; }
      v.set(...l.p).applyMatrix4(LPS_TO_SCENE).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h, ok = v.z < 1 && x > 4 && y > 4 && x < w - 4 && y < h - 4;
      l.el.style.display = ok ? 'block' : 'none';
      if (ok) l.el.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px)`;
    }
  }

  // ------------------------------------------------------------------ camera
  /** Whole-body bounds (LPS) for the 'whole' preset; datasets whose body extends beyond the CT box set this. */
  setBodyBounds(lo, hi) { this.body = { lo, hi }; }

  setView(name, animate = true) {
    const b = name === 'whole' && this.body ? this.body : this.bounds || { lo: [-200, -150, -400], hi: [200, 150, 400] };
    const T = new THREE.Vector3(...[0, 1, 2].map((i) => (b.lo[i] + b.hi[i]) / 2)).applyMatrix4(LPS_TO_SCENE);
    T.set(T.x + (name === 'whole' ? 0 : 60), 0, T.z);
    const k = this.body ? 1.15 : 1; // a whole-body shell needs a little more room than the phantom's CT box
    const views = {
      examiner: [-380 * k, 1250 * k, -1650 * k], anterior: [0, 2300 * k, -80], posterior: [0, -2100 * k, -100], right: [0, 160, -2250 * k],
      left: [0, 160, 2250 * k], head: [2200 * k, 380, 0], feet: [-2400 * k, 380, 0],
      whole: this.body ? [-300, 1.55 * (this.body.hi[2] - this.body.lo[2]) + 400, -1.2 * (this.body.hi[2] - this.body.lo[2])] : [-380, 1250, -1650],
    };
    const off = views[name] || views.examiner;
    const to = T.clone().add(new THREE.Vector3(...off));
    this.viewName = name;
    if (!animate) { this.camera.position.copy(to); this.controls.target.copy(T); this.controls.update(); this.cameraVersion++; return; }
    const from = this.camera.position.clone(), ft = this.controls.target.clone(), t0 = performance.now();
    this._anim = (now) => {
      const k = Math.min(1, (now - t0) / 450), e = k * k * (3 - 2 * k);
      this.camera.position.lerpVectors(from, to, e); this.controls.target.lerpVectors(ft, T, e); this.cameraVersion++;
      if (k >= 1) this._anim = null;
    };
  }

  cameraState() { return { position: this.camera.position.toArray(), target: this.controls.target.toArray(), version: this.cameraVersion }; }

  resize() {
    const w = Math.max(10, this.container.clientWidth), h = Math.max(10, this.container.clientHeight);
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  render(now) {
    if (this._anim) this._anim(now);
    this.controls.update();
    const below = this.camera.position.y < -150;
    if (below !== this._below) { // posterior view looks up through a see-through table
      this._below = below;
      for (const m of this.tableMaterials) { m.transparent = below; m.opacity = below ? 0.12 : 1; m.depthWrite = !below; m.needsUpdate = true; }
      for (const f of this.floorParts) f.visible = !below;
      for (const l of this.tableLegs) l.visible = !below;
    }
    this._updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  // ------------------------------------------------------------------ picking
  _pointerNDC(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  // ------------------------------------------------------------------ axis-first interaction
  /** One interaction at a time: only 'camera' lets the pointer orbit/pan/zoom the camera. */
  setInteraction(mode) {
    this.interaction = mode;
    const cam = mode === 'camera';
    if (this.controls) { this.controls.enableRotate = cam; this.controls.enablePan = cam; this.controls.enableZoom = cam; }
    this.renderer.domElement.dataset.interaction = mode;
  }

  _axisGuide() {
    const g = new THREE.Group(); g.visible = false;
    const mk = (color) => new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 110, color, 22, 13);
    this.guidePlus = mk(0x2563eb); this.guideMinus = mk(0x2563eb);
    for (const a of [this.guidePlus, this.guideMinus]) a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; o.material.opacity = 0.95; } o.renderOrder = 45; });
    g.add(this.guidePlus, this.guideMinus); this.guide = g; this.patient.add(g);
    this.guideLabels = ['plus', 'minus'].map((k) => { const e = document.createElement('div'); e.className = 'axis-label ' + k; e.style.display = 'none'; this.container.appendChild(e); return { el: e, p: [0, 0, 0] }; });
  }

  /** Show a two-headed patient-axis arrow at `pivot` (LPS) with anatomical labels, or hide it (null). */
  setAxisGuide(spec) {
    if (!spec) { this.guide.visible = false; for (const l of this.guideLabels) l.el.style.display = 'none'; this.guideSpec = null; return; }
    const ax = v3(spec.axis).normalize(), color = new THREE.Color(spec.color);
    this.guidePlus.position.set(...spec.pivot); this.guidePlus.setDirection(ax); this.guidePlus.setColor(color);
    this.guideMinus.position.set(...spec.pivot); this.guideMinus.setDirection(ax.clone().negate()); this.guideMinus.setColor(color);
    this.guide.visible = true; this.guideSpec = spec;
    const end = (sg) => spec.pivot.map((v, i) => v + sg * 140 * spec.axis[i]);
    this.guideLabels[0].p = end(1); this.guideLabels[0].el.textContent = spec.plus;
    this.guideLabels[1].p = end(-1); this.guideLabels[1].el.textContent = spec.minus;
    for (const l of this.guideLabels) l.el.style.color = spec.color;
  }

  /** Screen-space vector (CSS px) of +1 mm along an LPS axis at an LPS pivot. */
  screenAxis(pivot, axis) {
    const a = this._screen(pivot), b = this._screen(pivot.map((v, i) => v + axis[i] * 50));
    return [(b.x - a.x) / 50, (b.y - a.y) / 50];
  }

  /** Closest point on the static reference skin + interpolated outward normal (LPS). */
  closestSkin(p) {
    if (!this.skinRef) return null;
    const hit = this.skinRef.bvh.closestPointToPoint(v3(p)); if (!hit) return null;
    return this._surfaceAt(hit.point, hit.faceIndex);
  }
  /** First reference-skin hit of a ray from `origin` along `dir` (LPS). */
  raySkin(origin, dir) {
    if (!this.skinRef) return null;
    const hit = this.skinRef.bvh.raycastFirst(new THREE.Ray(v3(origin), v3(dir).normalize()), THREE.DoubleSide);
    return hit ? this._surfaceAt(hit.point, hit.faceIndex) : null;
  }
  _surfaceAt(point, f) {
    const g = this.skinRef.geo, pos = g.attributes.position, nrm = g.attributes.normal, idx = g.index;
    const a = idx.getX(3 * f), b = idx.getX(3 * f + 1), c = idx.getX(3 * f + 2);
    const tri = new THREE.Triangle(new THREE.Vector3().fromBufferAttribute(pos, a), new THREE.Vector3().fromBufferAttribute(pos, b), new THREE.Vector3().fromBufferAttribute(pos, c));
    const bc = new THREE.Vector3(); tri.getBarycoord(point, bc);
    const n = new THREE.Vector3().fromBufferAttribute(nrm, a).multiplyScalar(bc.x).add(new THREE.Vector3().fromBufferAttribute(nrm, b).multiplyScalar(bc.y)).add(new THREE.Vector3().fromBufferAttribute(nrm, c).multiplyScalar(bc.z)).normalize();
    return { point: point.toArray(), normal: n.toArray() };
  }

  /** Skin pick -> reference LPS contact (barycentric on the deformed mesh, mapped to reference vertices). */
  pickSkin(e) {
    const skin = this.meshes.skin?.mesh; if (!skin) return null;
    this._pointerNDC(e);
    const hits = this.raycaster.intersectObject(skin, false);
    const inv = new THREE.Matrix4().copy(LPS_TO_SCENE).invert();
    for (const hit of hits) {
      const f = hit.face, pos = skin.geometry.attributes.position, ref = this.meshes.skin.ref, nr = this.meshes.skin.refNormals;
      const p = hit.point.clone().applyMatrix4(inv);
      const A = new THREE.Vector3().fromBufferAttribute(pos, f.a), B = new THREE.Vector3().fromBufferAttribute(pos, f.b), C = new THREE.Vector3().fromBufferAttribute(pos, f.c);
      const bary = new THREE.Vector3(); THREE.Triangle.getBarycoord(p, A, B, C, bary);
      const R = (i) => [ref[3 * i], ref[3 * i + 1], ref[3 * i + 2]], N = (i) => [nr[3 * i], nr[3 * i + 1], nr[3 * i + 2]];
      const mix = (fn) => [0, 1, 2].map((k) => fn(f.a)[k] * bary.x + fn(f.b)[k] * bary.y + fn(f.c)[k] * bary.z);
      const point = mix(R), n = mix(N), ln = Math.hypot(...n);
      if (point[2] < this.capZ) continue; // artificial acquisition cap: not skin
      return { point, normal: n.map((x) => x / ln) };
    }
    return null;
  }

  _hitHandle(e) {
    this._pointerNDC(e);
    const targets = [];
    if (this.gizmo.visible) this.gizmo.traverse((o) => { if (o.isMesh && o.userData.handle) targets.push(o); });
    if (this.probe.visible && this.interaction === 'place') this.probe.traverse((o) => { if (o.isMesh) targets.push(o); }); // probe drags only in Place mode
    if (this.siteMarkers.visible) this.siteMarkers.traverse((o) => { if (o.isMesh) targets.push(o); });
    // invisible pick sleeves are children of visible handles: test them explicitly
    const hits = this.raycaster.intersectObjects(targets, false).filter((h) => {
      let o = h.object; while (o) { if (!o.visible) return false; o = o.parent; } return true; // hidden handles are not pickable
    });
    return hits.find((h) => h.object.userData.handle)?.object.userData.handle || null;
  }

  _installPointer() {
    const el = this.renderer.domElement;
    let drag = null, down = null;
    el.addEventListener('wheel', (e) => {
      if (this.interaction === 'camera') return; // OrbitControls zooms
      e.preventDefault(); e.stopImmediatePropagation();
      if (this.interaction !== 'place') this.h.onAxisWheel?.(e.deltaY < 0 ? 1 : -1, e.shiftKey);
    }, { passive: false, capture: true });
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY };
      const hd = e.shiftKey ? null : this._hitHandle(e);
      if (!hd && this.interaction !== 'camera' && this.interaction !== 'place') {
        // axis-first: dragging anywhere changes ONLY the selected quantity
        e.stopImmediatePropagation(); e.preventDefault(); el.setPointerCapture(e.pointerId);
        drag = { axis: true, last: { x: e.clientX, y: e.clientY }, x: e.clientX, y: e.clientY };
        this.h.onDragStart?.({ kind: 'axis' }); return;
      }
      if (!hd) return;
      e.stopImmediatePropagation(); e.preventDefault();
      el.setPointerCapture(e.pointerId);
      if (this.controls) this.controls.enabled = false;
      drag = { handle: hd, x: e.clientX, y: e.clientY, last: { x: e.clientX, y: e.clientY } };
      if (hd.kind === 'site') { this.h.onSite?.(hd.key); drag = null; if (this.controls) this.controls.enabled = true; return; }
      this.h.onDragStart?.(hd);
    }, { capture: true });
    el.addEventListener('pointermove', (e) => {
      if (!drag) { this.h.onHover?.(this._hoverKind(e)); return; }
      if (drag.axis) { this.h.onAxisDrag?.(e.clientX - drag.last.x, e.clientY - drag.last.y, e.shiftKey); drag.last = { x: e.clientX, y: e.clientY }; return; }
      const hd = drag.handle;
      if (hd.kind === 'probe') { const c = this.pickSkin(e); if (c) this.h.onContact?.(c, true); }
      else if (hd.kind === 'ring') {
        const p0 = this._screen(this.gizmoPivot);
        const a0 = Math.atan2(drag.last.y - p0.y, drag.last.x - p0.x), a1 = Math.atan2(e.clientY - p0.y, e.clientX - p0.x);
        let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        const axis = this._axisFor(hd.axis);
        const toward = axis.clone().applyMatrix4(new THREE.Matrix4().extractRotation(LPS_TO_SCENE)).dot(this.camera.getWorldDirection(new THREE.Vector3())) < 0;
        this.h.onRotate?.(hd.axis, (toward ? -1 : 1) * da * 180 / Math.PI);
      } else if (hd.kind === 'arrow') {
        const axis = this._axisFor(hd.axis), p0 = this._screen(this.gizmoPivot), p1 = this._screen(this.gizmoPivot.map((v, i) => v + axis.getComponent(i) * 50));
        const sx = p1.x - p0.x, sy = p1.y - p0.y, l2 = sx * sx + sy * sy;
        if (l2 > 4) this.h.onTranslate?.(hd.axis, ((e.clientX - drag.last.x) * sx + (e.clientY - drag.last.y) * sy) / l2 * 50);
      }
      drag.last = { x: e.clientX, y: e.clientY };
    });
    const up = (e) => {
      const wasAxis = drag?.axis;
      if (drag) { drag = null; if (this.controls) this.controls.enabled = true; this.h.onDragEnd?.(); if (!wasAxis || Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 5) { down = null; return; } }
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && e.button === 0) {
        if (this.h.onPick?.(e)) { down = null; return; } // inspect tool consumed the click
        const c = this.pickSkin(e); if (c) this.h.onSkinClick?.(c, this.interaction);
      }
      down = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { drag = null; if (this.controls) this.controls.enabled = true; });
  }

  _hoverKind(e) {
    const hd = this._hitHandle(e);
    this.renderer.domElement.style.cursor = hd ? (hd.kind === 'probe' ? 'grab' : 'pointer') : ''; // '' lets the per-mode CSS cursor apply
    return hd;
  }

  _axisFor(key) {
    const a = this.gizmoAxes || {};
    const map = { L: [1, 0, 0], P: [0, 1, 0], S: [0, 0, 1], rotate: a.b, heelToe: a.e, rock: a.u };
    return v3(map[key] || [1, 0, 0]).normalize();
  }

  _screen(lps) {
    const v = v3(lps).applyMatrix4(LPS_TO_SCENE).project(this.camera), r = this.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  }

  /** Raycast the atlas layer at a pointer event (inspect tool). */
  pickAtlas(e, atlas) {
    this._pointerNDC(e);
    return atlas.pick(this.raycaster, new THREE.Matrix4().copy(LPS_TO_SCENE).invert());
  }

  /** Screen position of an LPS point (for tests and overlays). */
  screenOf(lps) { return this._screen(lps); }
}
