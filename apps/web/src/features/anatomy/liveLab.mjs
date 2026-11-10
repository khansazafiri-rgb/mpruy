// Host-side helpers for the Anatomy Live 4D Lab (static app mounted at /anatomy/4d-lab/).
export const LIVE_LAB_PATH = '/anatomy/4d-lab/';
export const LIVE_LAB_MANIFEST = LIVE_LAB_PATH + 'data/phantom/anatomy.json';

/**
 * Confirms the lab is really installed. A plain HEAD on the path is not enough: without the
 * Caddy route the SPA fallback would answer with the main index.html and the page would frame itself.
 */
export async function checkLiveLab(fetcher = globalThis.fetch, signal) {
  const response = await fetcher(LIVE_LAB_MANIFEST, { cache: 'no-cache', signal });
  if (!response.ok) throw new Error('Anatomy Live 4D Lab belum dipasang di server (HTTP ' + response.status + ').');
  const type = response.headers.get('content-type') || '';
  if (!type.includes('json')) throw new Error('Rute /anatomy/4d-lab/ belum diarahkan ke build 4D Lab.');
  const data = await response.json();
  if (data?.schema !== 'medcoel.anatomy.v1') throw new Error('Manifest 4D Lab tidak dikenali.');
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
