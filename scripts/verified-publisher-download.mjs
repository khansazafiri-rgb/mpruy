/**
 * Download admission for a publisher-indexed, checksum-pinned PRIVATE file.
 * Uses manual redirects to see exactly which HTTPS host is contacted.
 * Never logs signed query strings; never treats a 202 bot challenge as bytes.
 */
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_HOPS = 8;
const HTTPS = 'https:';
// Exact Cloudflare R2 account hostname returned by Figshare's official
// ndownloader/API endpoints for the pinned file ids (owner observed 2026-11-22).
// Keep this FIGSHARE ONLY. Do not widen to *.r2.cloudflarestorage.com.
const FIGSHARE_PINNED_R2_HOST = '44c1cec316ec56bca76dfd65d2882b20.r2.cloudflarestorage.com';

const isTrustedObjectStorage = host =>
  host === 's3.amazonaws.com' ||
  /^(?:[a-z0-9][a-z0-9.-]*\.)?s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(host) ||
  host === 'zenodo.s3.cern.ch';

export function validatePublisherDownloadHost(url, publisher) {
  const parsed = new URL(url);
  if (parsed.protocol !== HTTPS || parsed.username || parsed.password || parsed.port || parsed.hash) {
    throw Error('ACQUIRE_UNTRUSTED_URL');
  }
  const host = parsed.hostname.toLowerCase();
  if (publisher === 'figshare') {
    if (['ndownloader.figshare.com', 'api.figshare.com', 'figshare.com'].includes(host) ||
        host === FIGSHARE_PINNED_R2_HOST || isTrustedObjectStorage(host)) return parsed;
  } else if (publisher === 'zenodo') {
    if (host === 'zenodo.org' || host === 'zenodo.s3.cern.ch' ||
        isTrustedObjectStorage(host)) return parsed;
  }
  throw Error('ACQUIRE_UNTRUSTED_REDIRECT_HOST:' + host);
}

export function publisherDownloadEndpoints(entry) {
  const u = new URL(entry.downloadUrl);
  if (u.hostname === 'ndownloader.figshare.com') {
    if (!Number.isSafeInteger(entry.sourceFileId) || entry.sourceFileId <= 0 ||
        u.pathname !== '/files/' + entry.sourceFileId || u.search) {
      throw Error('ACQUIRE_FIGSHARE_FILE_ID_NOT_PINNED');
    }
    return [
      { label: 'figshare-ndownloader', url: u.href },
      { label: 'figshare-api', url: 'https://api.figshare.com/v2/file/download/' + entry.sourceFileId }
    ];
  }
  if (u.hostname === 'zenodo.org') return [{ label: 'zenodo', url: u.href }];
  throw Error('ACQUIRE_UNKNOWN_PUBLISHER_ENDPOINT');
}

function mediaTypeAllowed(response) {
  const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase().trim();
  return type !== 'text/html' && type !== 'application/xhtml+xml' &&
    type !== 'application/json' && type !== 'application/problem+json';
}

/** Return the 200 response stream only after every hop and content type is checked. */
export async function openVerifiedPublisherStream(entry, {
  fetcher = fetch, offset = 0, ifRange = null, stallMs = 120_000
} = {}) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= entry.expectedBytes ||
      !Number.isInteger(stallMs) || stallMs < 1000) throw Error('ACQUIRE_INVALID_RANGE_OR_STALL_LIMIT');
  if (ifRange !== null && (typeof ifRange !== 'string' ||
      ifRange.length > 256 || /[\r\n]/.test(ifRange))) throw Error('ACQUIRE_UNSAFE_IF_RANGE');
  const endpoints = publisherDownloadEndpoints(entry);
  const publisher = endpoints[0].label.startsWith('figshare') ? 'figshare' : 'zenodo';
  const errors = [];
  for (const endpoint of endpoints) {
    let current = endpoint.url;
    try {
      const visited = new Set();
      for (let hop = 0; hop <= MAX_HOPS; hop++) {
        const parsed = validatePublisherDownloadHost(current, publisher);
        if (visited.has(current)) throw Error('ACQUIRE_REDIRECT_LOOP');
        visited.add(current);
        let response;
        const controller = new AbortController();
        let stallTimer;
        const touch = () => {
          clearTimeout(stallTimer);
          stallTimer = setTimeout(() => controller.abort(
            new Error('ACQUIRE_STALLED_TRANSFER')), stallMs);
          stallTimer.unref?.();
        };
        const close = () => clearTimeout(stallTimer);
        try {
          touch(); // Timeout is inactivity-based; successful chunks reset it.
          response = await fetcher(parsed.href, {
            redirect: 'manual',
            headers: {
              Accept: 'application/octet-stream, application/zip, text/csv, */*',
              'User-Agent': 'MEDCOEL-private-medical-source/1.0',
              'Accept-Encoding': 'identity',
              ...(offset ? { Range: 'bytes=' + offset + '-',
                ...(ifRange ? { 'If-Range': ifRange } : {}) } : {})
            },
            signal: controller.signal
          });
        } catch (e) {
          close();
          throw Error('ACQUIRE_NETWORK_FAILURE_AT_' + parsed.hostname + ':' +
            (controller.signal.aborted ? 'STALL_TIMEOUT' : (e.code || e.name || 'FETCH_FAILED')));
        }
        const responseUrl = response.url || current;
        validatePublisherDownloadHost(responseUrl, publisher);
        if (REDIRECT_CODES.has(response.status)) {
          const location = response.headers.get('location');
          close();
          await response.body?.cancel().catch(() => {});
          if (!location) throw Error('ACQUIRE_REDIRECT_MISSING_LOCATION_AT_' + parsed.hostname);
          current = new URL(location, responseUrl).href;
          validatePublisherDownloadHost(current, publisher);
          continue;
        }
        if (response.status !== 200 && response.status !== 206) {
          close();
          await response.body?.cancel().catch(() => {});
          // 202 is an anti-bot/interstitial response on some Figshare routes.
          throw Error('ACQUIRE_HTTP_' + response.status + '_AT_' + new URL(responseUrl).hostname);
        }
        if (response.status === 206) {
          // A partial response without Range is never acceptable.
          const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
            response.headers.get('content-range') || '');
          if (!offset || !match || Number(match[1]) !== offset ||
              Number(match[3]) !== entry.expectedBytes ||
              Number(match[2]) < offset || Number(match[2]) >= entry.expectedBytes ||
              (response.headers.has('content-length') &&
                Number(response.headers.get('content-length')) !==
                Number(match[2]) - offset + 1)) {
            close();
            await response.body?.cancel().catch(() => {});
            throw Error('ACQUIRE_INVALID_CONTENT_RANGE_AT_' + new URL(responseUrl).hostname);
          }
        }
        if (!mediaTypeAllowed(response)) {
          close();
          await response.body?.cancel().catch(() => {});
          throw Error('ACQUIRE_INTERSTITIAL_OR_NONFILE_RESPONSE_AT_' +
            new URL(responseUrl).hostname);
        }
        const length = Number(response.headers.get('content-length') || 0);
        if (length > (response.status === 206 ? entry.expectedBytes - offset : entry.expectedBytes)) {
          close();
          await response.body?.cancel().catch(() => {});
          throw Error('ACQUIRE_SOURCE_LENGTH_EXCEEDS_PIN_AT_' + new URL(responseUrl).hostname);
        }
        if (!response.body) { close(); throw Error('ACQUIRE_EMPTY_RESPONSE_STREAM'); }
        return { response, endpoint: endpoint.label, resumed: response.status === 206,
          touch, close };
      }
      throw Error('ACQUIRE_TOO_MANY_REDIRECTS');
    } catch (e) {
      errors.push(endpoint.label + '=' + String(e.message).slice(0, 160));
    }
  }
  throw Error('ACQUIRE_OFFICIAL_ENDPOINTS_FAILED:' + errors.join(' | '));
}
