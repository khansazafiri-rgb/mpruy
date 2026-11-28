import * as THREE from 'three';
import { GLTFLoader } from '/three/loaders/GLTFLoader.js';

const status = document.querySelector('#status');
const canvas = document.querySelector('#viewport');
const receipt = { schema: 1, harness: 'MEDCOEL actual source WebGL QC v1', startedAt: new Date().toISOString(), rows: [], pageErrors: [], clinicalValidation: false, anatomicalOrientationVerified: false, registrationValidated: false, wholeStructuresRestoredClaim: 0, approvedForDistribution: false, publicRelease: 'NO_GO' };
window.__sourceQC = receipt;
window.addEventListener('error', (e) => receipt.pageErrors.push(e.message));
window.addEventListener('unhandledrejection', (e) => receipt.pageErrors.push(String(e.reason)));
const frame = () => new Promise((done) => requestAnimationFrame(done));
const digest = async (data) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), (b) => b.toString(16).padStart(2, '0')).join('');
const loader = new GLTFLoader();

async function run() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(512, 512, false);
  renderer.setPixelRatio(1);
  const gl = renderer.getContext();
  receipt.webglVersion = gl.getParameter(gl.VERSION);
  receipt.renderer = gl.getParameter(gl.RENDERER);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#132b26');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x64706d, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(2, 3, 4); scene.add(light);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
  const manifest = await fetch('/manifest.json', { credentials: 'omit' }).then((r) => { if (!r.ok) throw Error('Manifest request failed'); return r.json(); });
  if (manifest.rows.length !== 36 || manifest.publicRelease !== 'NO_GO') throw Error('Unexpected source scope');
  // Warm the Three.js 0.185 physically based DFG LUT with an engineering box.
  // It is discarded before medical assets and never counted as anatomy.
  const warmGeometry=new THREE.BoxGeometry(),warmMaterial=new THREE.MeshStandardMaterial(),warm=new THREE.Mesh(warmGeometry,warmMaterial);
  camera.position.set(0,0,3);camera.lookAt(0,0,0);scene.add(warm);renderer.render(scene,camera);scene.remove(warm);warmGeometry.dispose();warmMaterial.dispose();renderer.renderLists.dispose();renderer.render(scene,camera);
  receipt.engineCacheCalibration='One retained Three.js DFG LUT after discarded engineering box; not a medical model';
  receipt.rendererBaseline={geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
  const pixels = new Uint8Array(512 * 512 * 4);
  for (const row of manifest.rows) {
    status.textContent = `Rendering actual source ${receipt.rows.length + 1}/36 · ${row.name}`;
    const started = performance.now();
    let object;
    const result = { id: row.id, name: row.name, source: row.source, sha256: row.sha256, expectedTriangles: row.triangles, sourceFrame: row.sourceFrame, views: [], renderVerified: false };
    try {
      const response = await fetch(row.url, { credentials: 'omit' });
      if (!response.ok) throw Error('Asset request failed');
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== row.bytes || await digest(buffer) !== row.sha256) throw Error('GLB checksum differs');
      const model = await loader.parseAsync(buffer, `${location.origin}/`);
      object = model.scene;
      let triangles = 0, bufferBytes = 0, meshCount = 0;
      object.traverse((node) => {
        if (!node.isMesh) return;
        meshCount += 1;
        const geometry = node.geometry;
        if (!geometry.attributes.normal) geometry.computeVertexNormals();
        triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3;
        bufferBytes += Object.values(geometry.attributes).reduce((sum, a) => sum + a.array.byteLength, 0) + (geometry.index?.array.byteLength ?? 0);
      });
      if (triangles !== row.triangles || !meshCount) throw Error('Decoded triangle count differs');
      const box = new THREE.Box3().setFromObject(object), sphere = box.getBoundingSphere(new THREE.Sphere());
      if (!(sphere.radius > 0 && Number.isFinite(sphere.radius))) throw Error('Source bounds invalid');
      result.meshes = meshCount;
      result.decodedTriangles = triangles;
      result.decodedGeometryBufferBytes = bufferBytes;
      result.loadMilliseconds = Math.round((performance.now() - started) * 100) / 100;
      result.sourceBounds = { min: box.min.toArray(), max: box.max.toArray() };
      scene.add(object);
      const distance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.12;
      camera.near = Math.max(sphere.radius / 1000, 0.001);
      camera.far = distance + sphere.radius * 10;
      camera.updateProjectionMatrix();
      const views = [[1, 0.5, 1], [0, 0, -1], [-1, 0.3, 0]];
      for (let i = 0; i < views.length; i++) {
        camera.position.copy(sphere.center).add(new THREE.Vector3(...views[i]).normalize().multiplyScalar(distance));
        camera.lookAt(sphere.center);
        renderer.render(scene, camera);
        await frame();
        gl.readPixels(0, 0, 512, 512, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const background = [...pixels.subarray(0, 3)];
        let foreground = 0;
        for (let p = 0; p < pixels.length; p += 4) if (Math.abs(pixels[p] - background[0]) + Math.abs(pixels[p + 1] - background[1]) + Math.abs(pixels[p + 2] - background[2]) > 24) foreground++;
        if (foreground < 100 || foreground > 512 * 512 * 0.95 || renderer.info.render.triangles !== triangles || gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw Error(`View ${i + 1} failed pixels/triangle/WebGL check`);
        result.views.push({ view: i + 1, foregroundPixels: foreground, renderedTriangles: renderer.info.render.triangles, webglErrors: 0 });
        if (i === 0) {
          const figure = document.createElement('figure'), image = new Image(), caption = document.createElement('figcaption');
          image.src = canvas.toDataURL('image/png'); image.alt = `Actual rendered ${row.source}: ${row.name}`;
          caption.textContent = `${row.name} · ${triangles.toLocaleString()} triangles`;
          figure.append(image, caption); document.querySelector('#gallery').append(figure);
        }
      }
      result.renderVerified = true;
    } catch (error) { result.error = String(error.message ?? error); }
    finally {
      if (object) {
        scene.remove(object);
        object.traverse((node) => { if (!node.isMesh) return; node.geometry.dispose(); for (const material of Array.isArray(node.material) ? node.material : [node.material]) { for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose(); } });
      }
      renderer.renderLists.dispose();
      renderer.render(scene, camera);
      result.retainedGeometriesAfterDispose = renderer.info.memory.geometries;
      result.retainedTexturesAfterDispose = renderer.info.memory.textures;
      result.totalMilliseconds = Math.round((performance.now() - started) * 100) / 100;
      receipt.rows.push(result);
      document.querySelector('#results').textContent = JSON.stringify(receipt, null, 2);
      await frame();
    }
  }
  receipt.finishedAt = new Date().toISOString();
  receipt.renderedPass = receipt.rows.filter((r) => r.renderVerified).length;
  receipt.renderedFail = receipt.rows.length - receipt.renderedPass;
  receipt.resourceDisposalPass = receipt.rows.filter((r) => r.retainedGeometriesAfterDispose === receipt.rendererBaseline.geometries && r.retainedTexturesAfterDispose === receipt.rendererBaseline.textures).length;
  receipt.complete = true;
  receipt.passed = receipt.renderedPass === 36 && receipt.resourceDisposalPass === 36 && receipt.pageErrors.length === 0;
  document.querySelector('#results').textContent = JSON.stringify(receipt, null, 2);
  status.textContent = `Completed · ${receipt.renderedPass}/36 actual GLBs rendered · ${receipt.rows.reduce((n, r) => n + r.views.length, 0)}/108 views · ${receipt.resourceDisposalPass}/36 resource disposal · ${receipt.pageErrors.length} page errors`;
  const response = await fetch('/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(receipt), credentials: 'omit' });
  receipt.receiptSaved = response.ok;
  document.querySelector('#results').textContent = JSON.stringify(receipt, null, 2);
}

run().catch((error) => { receipt.complete = true; receipt.passed = false; receipt.pageErrors.push(String(error)); status.textContent = `Source QC failed: ${error.message}`; document.querySelector('#results').textContent = JSON.stringify(receipt, null, 2); });
