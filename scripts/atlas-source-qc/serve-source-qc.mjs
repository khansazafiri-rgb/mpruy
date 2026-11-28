import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const importMap = JSON.stringify({ imports: { three: '/three/three.module.js' } });
const importHash = createHash('sha256').update(importMap).digest('base64');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MEDCOEL source geometry QC</title><style>body{margin:16px;background:#132b26;color:#faf9e5;font:14px system-ui}h1{font-size:20px}canvas{max-width:100%;height:auto;border:1px solid #a39054}#gallery{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;max-width:160px}figure img{width:160px}figcaption{font-size:11px}pre{white-space:pre-wrap;overflow-wrap:anywhere}#status{position:sticky;top:0;background:#132b26;padding:8px}</style><h1>MEDCOEL · Actual source geometry QC</h1><p>Isolated publisher frame; no clinical, laterality, registration or distribution approval inferred.</p><p id="status" role="status">Starting real WebGL source checks…</p><canvas id="viewport" width="512" height="512"></canvas><div id="gallery"></div><details><summary>Numeric execution receipt</summary><pre id="results"></pre></details><script type="importmap">${importMap}</script><script type="module" src="/source-qc-browser.js"></script></html>`;

export function inspectGLB(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) throw Error('Invalid GLB header');
  const length = bytes.readUInt32LE(12);
  const doc = JSON.parse(bytes.subarray(20, 20 + length));
  if (doc.extensionsRequired?.length || (doc.buffers ?? []).some((x) => x.uri) || (doc.images ?? []).some((x) => x.uri)) throw Error('External or unsupported GLB dependency');
  if (doc.nodes?.some((n) => n.matrix || n.translation || n.rotation || n.scale)) throw Error('Source QC expects unchanged native frame');
  if (!doc.meshes?.length || doc.meshes.some((m) => m.primitives.some((p) => p.mode !== undefined && p.mode !== 4))) throw Error('Triangle geometry expected');
  const triangles = doc.meshes.reduce((sum, m) => sum + m.primitives.reduce((n, p) => n + doc.accessors[p.indices].count / 3, 0), 0);
  if (!Number.isSafeInteger(triangles) || triangles <= 0) throw Error('Invalid triangle count');
  return { triangles };
}

export function requestAllowed(req, host) {
  return req.headers.host === host && (!req.headers.origin || req.headers.origin === `http://${host}`)
    && (!req.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(req.headers['sec-fetch-site']));
}

export async function createSourceServer(options) {
  const evidence = resolve(options.evidenceDir ?? `${repo}/licensing/atlas-publication/checkpoint-evidence`);
  const voxel = JSON.parse(await readFile(`${evidence}/voxelman-source-33-conversion-20261127.json`, 'utf8'));
  const ears = JSON.parse(await readFile(`${evidence}/openear-source-3-conversion-20261127.json`, 'utf8'));
  if (voxel.rows.length !== 33 || ears.rows.length !== 3 || voxel.publicRelease !== 'NO_GO') throw Error('Source evidence changed');
  const assets = new Map();
  const rows = [];
  for (const r of voxel.rows) rows.push({ id: r.id, name: r.name, path: resolve(options.voxelDir, `${r.id}.glb`), sha256: r.sha256, bytes: r.bytes, triangles: r.triangles, source: 'VOXEL-MAN', sourceFrame: 'voxel-index-ZYX', touchesSourceVolumeBoundary: r.touchesSourceVolumeBoundary });
  for (const r of ears.rows) rows.push({ id: `openear-${r.target}`, name: r.publisherLabel, path: resolve(options.openearDir, r.outputFile), sha256: r.outputSHA256, bytes: r.outputBytes, triangles: r.triangleCount, source: 'OpenEar', sourceFrame: 'preserved source coordinates', laterality: 'UNSPECIFIED' });
  for (const r of rows) {
    const data = await readFile(r.path);
    if (data.length !== r.bytes || sha(data) !== r.sha256 || inspectGLB(data).triangles !== r.triangles) throw Error(`Source GLB differs: ${r.id}`);
    assets.set(`/source/${r.id}.glb`, { path: r.path, type: 'model/gltf-binary' });
    delete r.path;
    r.url = `/source/${r.id}.glb`;
    r.approvedForDistribution = false;
    r.clinicalValidation = false;
    r.registrationValidated = false;
  }
  const threeFiles = ['build/three.module.js', 'build/three.core.js', 'examples/jsm/loaders/GLTFLoader.js', 'examples/jsm/utils/BufferGeometryUtils.js', 'examples/jsm/utils/SkeletonUtils.js'];
  for (const file of threeFiles) {
    const url = file.startsWith('build/') ? `/three/${basename(file)}` : `/three/${file.slice('examples/jsm/'.length)}`;
    assets.set(url, { path: resolve(options.threeDir, file), type: 'text/javascript; charset=utf-8' });
  }
  assets.set('/source-qc-browser.js', { path: resolve(here, 'source-qc-browser.js'), type: 'text/javascript; charset=utf-8' });
  const manifest = { schema: 1, rows, clinicalValidation: false, registrationValidated: false, publicRelease: 'NO_GO' };
  const server = createServer(async (req, res) => {
    const host = `127.0.0.1:${server.address().port}`;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'sha256-${importHash}'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'`);
    try {
      if (!requestAllowed(req, host)) { res.writeHead(403); res.end('Forbidden'); return; }
      if (req.method === 'POST' && req.url === '/receipt' && options.receiptOut) {
        if (req.headers.origin !== `http://${host}`) throw Error('Receipt origin required');
        let data = '';
        for await (const chunk of req) { data += chunk; if (data.length > 1024**2) throw Error('Receipt too large'); }
        const receipt = JSON.parse(data);
        if (receipt.schema !== 1 || !Array.isArray(receipt.rows) || receipt.rows.length !== 36 || new Set(receipt.rows.map((r) => r.id)).size !== 36
            || receipt.rows.some((r) => !rows.some((m) => m.id === r.id && m.sha256 === r.sha256)) || receipt.publicRelease !== 'NO_GO') throw Error('Receipt scope differs');
        await writeFile(options.receiptOut, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"saved":true}'); return;
      }
      if (req.method !== 'GET') { res.writeHead(405); res.end('Method not allowed'); return; }
      if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return; }
      if (req.url === '/manifest.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(manifest)); return; }
      const asset = assets.get(req.url);
      if (!asset) { res.writeHead(404); res.end('Not found'); return; }
      const data = await readFile(asset.path);
      res.writeHead(200, { 'Content-Type': asset.type }); res.end(data);
    } catch (error) { res.writeHead(400); res.end('Source QC request rejected'); }
  });
  return { server, manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { 'voxel-dir': { type: 'string' }, 'openear-dir': { type: 'string' }, 'three-dir': { type: 'string', default: resolve(repo, 'apps/atlas-independent/node_modules/three') }, port: { type: 'string', default: '4193' }, 'receipt-out': { type: 'string' } } });
  if (!values['voxel-dir'] || !values['openear-dir']) throw Error('Require --voxel-dir and --openear-dir');
  const { server } = await createSourceServer({ voxelDir: values['voxel-dir'], openearDir: values['openear-dir'], threeDir: values['three-dir'], receiptOut: values['receipt-out'] });
  server.listen(Number(values.port), '127.0.0.1', () => console.log(`SOURCE QC READY http://127.0.0.1:${server.address().port}/ (36 exact pinned GLBs; private source-frame review)`));
}
