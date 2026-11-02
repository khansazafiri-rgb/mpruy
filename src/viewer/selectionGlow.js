import * as THREE from 'three';
// Selection sweep, after Complete Anatomy: the structure keeps its own colour and texture, and a soft
// yellow band with a thin bright leading edge travels along it from the upper end to the lower end,
// then starts again from the top. It is a render-only overlay that shares the structure's geometry;
// no vertex or index is changed and nothing here can be picked.
//
// The travel axis is the structure's own long axis (principal component of its vertices), so a muscle
// is swept along its fibres' general direction and a long bone from one epiphysis to the other.

const PERIOD = 3.0;      // seconds for one pass plus the pause before the next
const TRAVEL = 0.8;      // share of the period the band is moving
const WIDTH = 0.11;      // half-width of the yellow band, as a share of the structure's length
const EDGE = 0.012;      // half-width of the bright leading edge
const BAND_ALPHA = 0.46; // the structure stays readable under the band
const EDGE_ALPHA = 0.55;

const vertexShader = `
uniform vec3 sweepAxis; uniform float sweepMin; uniform float sweepSpan;
varying float vAlong; varying vec3 vNormal; varying vec3 vView;
void main(){
  vAlong = (dot(position, sweepAxis) - sweepMin) / sweepSpan;
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -p.xyz;
  gl_Position = projectionMatrix * p;
}`;

const fragmentShader = `
uniform float sweepTime; uniform float sweepWidth; uniform vec3 sweepColor; uniform vec3 edgeColor; uniform float sweepStatic;
varying float vAlong; varying vec3 vNormal; varying vec3 vView;
void main(){
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  float shade = 0.55 + 0.45 * max(dot(n, normalize(vec3(0.35, 0.6, 1.0))), 0.0);
  float body; float edge;
  if (sweepStatic > 0.5) {
    body = 0.45; edge = 0.0;                         // reduced motion: a still, light tint
  } else {
    float phase = fract(sweepTime / ${PERIOD.toFixed(2)});
    float travel = clamp(phase / ${TRAVEL.toFixed(2)}, 0.0, 1.0);
    float eased = travel * travel * (3.0 - 2.0 * travel);
    float centre = mix(-sweepWidth * 1.2, 1.0 + sweepWidth * 1.2, eased);
    float d = vAlong - centre;                         // > 0 is ahead of the band (further down)
    body = 1.0 - smoothstep(sweepWidth * 0.45, sweepWidth, abs(d));
    edge = 1.0 - smoothstep(0.0, ${EDGE.toFixed(3)}, abs(d - sweepWidth * 0.82));
    float visible = smoothstep(0.0, 0.06, travel) * (1.0 - smoothstep(0.94, 1.0, travel));
    body *= visible; edge *= visible;
  }
  float aBody = body * ${BAND_ALPHA.toFixed(2)};
  float aEdge = edge * ${EDGE_ALPHA.toFixed(2)};
  float alpha = aBody + aEdge * (1.0 - aBody);
  if (alpha < 0.004) discard;
  vec3 colour = (sweepColor * shade * aBody + edgeColor * aEdge * (1.0 - aBody)) / alpha;
  gl_FragColor = vec4(colour, alpha);
}`;

// Long axis of a geometry in its local space, cached on the geometry. Power iteration on the vertex
// covariance; at most ~6000 sampled vertices so even large muscles cost a few milliseconds once.
export function sweepAxisOf(geometry) {
  if (geometry.userData.medcoelSweep) return geometry.userData.medcoelSweep;
  const pos = geometry.getAttribute('position');
  const step = Math.max(1, Math.floor(pos.count / 6000));
  let n = 0; const mean = new THREE.Vector3(); const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += step) { mean.add(v.fromBufferAttribute(pos, i)); n++; }
  mean.divideScalar(Math.max(1, n));
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i).sub(mean);
    xx += v.x * v.x; xy += v.x * v.y; xz += v.x * v.z; yy += v.y * v.y; yz += v.y * v.z; zz += v.z * v.z;
  }
  const axis = new THREE.Vector3(0.3, 1, 0.2).normalize();
  for (let k = 0; k < 24; k++) {
    const x = xx * axis.x + xy * axis.y + xz * axis.z;
    const y = xy * axis.x + yy * axis.y + yz * axis.z;
    const z = xz * axis.x + yz * axis.y + zz * axis.z;
    axis.set(x, y, z);
    if (axis.lengthSq() < 1e-20) { axis.set(0, 1, 0); break; }
    axis.normalize();
  }
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < pos.count; i += step) {
    const t = v.fromBufferAttribute(pos, i).dot(axis);
    if (t < min) min = t; if (t > max) max = t;
  }
  const out = { axis, min, span: Math.max(max - min, 1e-6) };
  geometry.userData.medcoelSweep = out;
  return out;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// requestFrame: asks the viewer for another frame. The viewer draws on demand, so the sweep keeps
// asking while it exists and stops costing anything once released.
export function createSelectionGlow(meshes, requestFrame = () => {}) {
  const overlays = [];
  const still = reducedMotion();
  const start = typeof performance !== 'undefined' ? performance.now() : 0;
  for (const mesh of meshes) {
    if (!mesh.geometry?.getAttribute?.('position')) continue;
    mesh.updateWorldMatrix(true, false);
    const { axis, min, span } = sweepAxisOf(mesh.geometry);
    // Start at the upper end: flip the axis when it points down in world space.
    const world = axis.clone().transformDirection(mesh.matrixWorld);
    const flip = world.y > 0;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        sweepAxis: { value: flip ? axis.clone().negate() : axis.clone() },
        sweepMin: { value: flip ? -(min + span) : min },
        sweepSpan: { value: span },
        sweepTime: { value: 0 },
        sweepWidth: { value: WIDTH },
        sweepColor: { value: new THREE.Color('#ffc21f') },
        edgeColor: { value: new THREE.Color('#fff7dc') },
        sweepStatic: { value: still ? 1 : 0 },
      },
      vertexShader, fragmentShader,
      transparent: true, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      blending: THREE.NormalBlending, toneMapped: false, side: THREE.FrontSide,
    });
    const overlay = new THREE.Mesh(mesh.geometry, material);
    overlay.name = 'MEDCOEL selection sweep';
    overlay.renderOrder = 20;
    overlay.raycast = () => {};
    if (!still) overlay.onBeforeRender = () => {
      material.uniforms.sweepTime.value = ((typeof performance !== 'undefined' ? performance.now() : 0) - start) / 1000;
      requestFrame();
    };
    mesh.add(overlay);
    overlays.push(overlay);
  }
  requestFrame();
  return () => { for (const o of overlays) { o.onBeforeRender = () => {}; o.removeFromParent(); o.material.dispose(); } };
}
