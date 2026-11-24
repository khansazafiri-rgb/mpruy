// Host-side helpers for the Anatomy Live 4D Lab (static app mounted at /anatomy/4d-lab/).
export const LIVE_LAB_PATH = '/anatomy/4d-lab/';
export const LIVE_LAB_MANIFEST = LIVE_LAB_PATH + 'data/phantom/anatomy.json';
export const LIVE_LAB_ATLAS_MANIFEST = LIVE_LAB_PATH + 'data/atlas/anatomy.json';

/** Frame URL for /anatomy/live?scenario=…&ws=… (Lab track deep links). Only these two short keys are passed on. */
export function liveLabSrc(search = '') {
  const from = new globalThis.URLSearchParams(search), to = new globalThis.URLSearchParams();
  for (const key of ['scenario', 'ws']) { const v = from.get(key); if (v && /^[a-z_]{1,24}$/.test(v)) to.set(key, v); }
  const q = to.toString();
  return LIVE_LAB_PATH + (q ? '?' + q : '');
}

/**
 * Confirms the lab is really installed. A plain HEAD on the path is not enough: without the
 * Caddy route the SPA fallback would answer with the main index.html and the page would frame itself.
 */
export async function checkLiveLab(fetcher = globalThis.fetch, signal) {
  // A separate Vite build is required. Without the Caddy static mount the
  // generic MEDCOEL SPA returns 200/html for every URL, and should not be
  // mistaken for the original 4D Lab.
  const options = { cache: 'no-cache', signal };
  const response = await fetcher(LIVE_LAB_MANIFEST, options);
  if (!response.ok) throw new Error('Anatomy Live 4D Lab belum dipasang di server (HTTP ' + response.status + ').');
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('json')) throw new Error('Rute /anatomy/4d-lab/ belum diarahkan ke build 4D Lab.');
  const data = await response.json();
  if (data?.schema !== 'medcoel.anatomy.v1') throw new Error('Manifest 4D Lab tidak dikenali.');

  const home = await fetcher(LIVE_LAB_PATH, options);
  if (!home.ok || !(home.headers.get('content-type') || '').toLowerCase().includes('text/html')) {
    throw new Error('Halaman aplikasi 4D Lab tidak tersedia pada route /anatomy/4d-lab/.');
  }
  const html = await home.text();
  // The true standalone 4D Lab Vite build references its own hashed JS
  // under /anatomy/4d-lab/assets/. The main website's SPA does not.
  const script = html.match(/<script\b[^>]*\bsrc=["'](\/anatomy\/4d-lab\/assets\/[a-zA-Z0-9_.-]+\.js)["']/i);
  if (!script) throw new Error('Server mengembalikan halaman MEDCOEL, bukan build asli 4D Lab.');
  const asset = await fetcher(script[1], { ...options, method: 'HEAD' });
  if (!asset.ok || !/javascript|ecmascript/i.test(asset.headers.get('content-type') || '')) {
    throw new Error('Build 4D Lab belum lengkap: JavaScript simulator tidak tersedia.');
  }
  // The real Human Anatomy 4D Lab defaults to dataset=atlas; a working
  // procedural phantom does NOT establish that the actual CT/US+Atlas product
  // can run. Production currently denies /data/atlas/* pending rights.
  const atlasResponse = await fetcher(LIVE_LAB_ATLAS_MANIFEST, options);
  if (!atlasResponse.ok) {
    throw new Error('Dataset Atlas untuk 4D Lab asli belum diaktifkan (HTTP '+
      atlasResponse.status+'). Pemeriksaan izin sumber masih diperlukan.');
  }
  if (!(atlasResponse.headers.get('content-type') || '').toLowerCase().includes('json')) {
    throw new Error('Dataset Atlas 4D Lab dialihkan ke HTML, bukan manifest pencitraan.');
  }
  const atlasData = await atlasResponse.json();
  if (atlasData?.schema !== 'medcoel.anatomy.v1')
    throw new Error('Manifest Atlas 4D Lab tidak dikenali.');
  for (const file of ['ct.nrrd','labels.nrrd']) {
    const response = await fetcher(LIVE_LAB_PATH+'data/atlas/'+file,
      { ...options, method:'HEAD' });
    if (!response.ok || /text\/html/i.test(response.headers.get('content-type')||'')) {
      throw new Error('Dataset Atlas '+file+' belum tersedia untuk 4D Lab asli (HTTP '+
        response.status+').');
    }
  }
  return { synthetic: !!data.synthetic };
}

/**
 * 'ready' | 'missing' for the entry points (nav link, landing card). The lab is a separate build that can be absent on a
 * server (for example while its release is still gated); the entry points must then say so instead of leading to an error.
 * One check per page load, shared by everything that asks.
 */
let availability = null;
export function liveLabAvailability(fetcher = globalThis.fetch, { fresh = false } = {}) {
  if (!availability || fresh) availability = checkLiveLab(fetcher).then(() => 'ready', () => 'missing');
  return availability;
}
