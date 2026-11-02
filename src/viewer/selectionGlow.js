import * as THREE from 'three';
// Selection sweep: a thin band of light that travels along the selected structure from one end to the
// other (top end first), then starts again from the top. It is a render-only overlay that shares the
// structure's geometry; no vertex or index is changed and nothing here can be picked.
//
// The travel axis is the structure's own long axis (principal component of its vertices), so a muscle
// is swept along its fibres' general direction and a long bone from one epiphysis to the other.

const PERIOD = 2.6;      // seconds for one pass plus the pause before the next
const TRAVEL = 0.78;     // share of the period the band is moving
const WIDTH = 0.022;     // half-width of the bright core, as a share of the structure's length

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
uniform float sweepTime; uniform float sweepWidth; uniform vec3 sweepColor; uniform float sweepStatic;
varying float vAlong; varying vec3 vNormal; varying vec3 vView;
void main(){
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
  float light;
  if (sweepStatic > 0.5) {
    light = 0.18 + 0.35 * rim;                       // reduced motion: a still, soft sheen
  } else {
    float phase = fract(sweepTime / ${PERIOD.toFixed(2)});
    float travel = clamp(phase / ${TRAVEL.toFixed(2)}, 0.0, 1.0);
    float eased = travel * travel * (3.0 - 2.0 * travel);
    float centre = mix(-3.0 * sweepWidth, 1.0 + 3.0 * sweepWidth, eased);
    float d = abs(vAlong - centre);
    float core = 1.0 - smoothstep(0.0, sweepWidth, d);
    float halo = exp(-(d * d) / (sweepWidth * sweepWidth * 14.0)) * 0.32;
    float fade = 1.0 - smoothstep(0.92, 1.0, travel);  // dims as it leaves the far end
    light = (core * (0.75 + 0.6 * rim) + halo * (0.6 + 0.6 * rim)) * fade;
  }
  if (light < 0.003) discard;
  gl_FragColor = vec4(sweepColor * light, light);
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
        sweepColor: { value: new THREE.Color('#f2fffb') },
        sweepStatic: { value: still ? 1 : 0 },
      },
      vertexShader, fragmentShader,
      transparent: true, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.FrontSide,
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
