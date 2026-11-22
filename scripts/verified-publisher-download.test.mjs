import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openVerifiedPublisherStream,
  publisherDownloadEndpoints, validatePublisherDownloadHost
} from './verified-publisher-download.mjs';

const entry = {
  source: 'fracatlas-v7',
  filename: 'FracAtlas.zip',
  expectedBytes: 4,
  publisherMd5: '0'.repeat(32),
  sourceFileId: 12345,
  downloadUrl: 'https://ndownloader.figshare.com/files/12345'
};
const body = () => new Uint8Array([1, 2, 3, 4]);

test('FIGSHARE-001: a publisher 202 interstitial uses verified official API fallback', async () => {
  const seen = [];
  const fetcher = async (url, opts) => {
    seen.push(url);
    assert.equal(opts.redirect, 'manual');
    if (url === 'https://ndownloader.figshare.com/files/12345')
      return new Response(null, { status: 302, headers: {
        location: 'https://figshare.com/ndownloader/files/12345'
      } });
    if (url === 'https://figshare.com/ndownloader/files/12345')
      return new Response(null, { status: 202 });
    if (url === 'https://api.figshare.com/v2/file/download/12345')
      return new Response(null, { status: 302, headers: {
        location: 'https://fshare-public.s3.eu-west-1.amazonaws.com/snap.bin?X-Amz-Signature=redacted'
      } });
    if (url.startsWith('https://fshare-public.s3.eu-west-1.amazonaws.com/'))
      return new Response(body(), { status: 200, headers: {
        'content-type': 'application/octet-stream',
        'content-length': '4'
      } });
    throw Error('unexpected URL: ' + url);
  };
  const outcome = await openVerifiedPublisherStream(entry, { fetcher });
  assert.equal(outcome.endpoint, 'figshare-api');
  assert.deepEqual(new Uint8Array(await outcome.response.arrayBuffer()), body());
  assert.deepEqual(seen.slice(0, 3), [
    'https://ndownloader.figshare.com/files/12345',
    'https://figshare.com/ndownloader/files/12345',
    'https://api.figshare.com/v2/file/download/12345'
  ]);
});

test('FIGSHARE-002: unexpected redirect hosts are refused before network request', async () => {
  const seen = [];
  const bad = async (url) => {
    seen.push(url);
    return new Response(null, { status: 302, headers: { location: 'https://internal.example.org/private?token=secret' } });
  };
  await assert.rejects(
    openVerifiedPublisherStream(entry, { fetcher: bad }),
    err => {
      assert.match(err.message, /ACQUIRE_UNTRUSTED_REDIRECT_HOST:internal\.example\.org/);
      assert.ok(!err.message.includes('secret'), 'signed URL query must not leak');
      return true;
    }
  );
  assert.equal(seen.length, 2, 'never request the malicious redirected URL, even on fallback');
  assert.throws(() => validatePublisherDownloadHost('http://s3.amazonaws.com/foo', 'figshare'),
    /ACQUIRE_UNTRUSTED_URL/);
});

test('FIGSHARE-003: HTTP 403/404/202 and HTML on both endpoints are actionable failures', async () => {
  const denied = async url => url.includes('ndownloader')
    ? new Response(null, { status: 403 })
    : new Response('<html>Login</html>', { status: 200,
      headers: { 'content-type': 'text/html' } });
  await assert.rejects(openVerifiedPublisherStream(entry, { fetcher: denied }),
    err => {
      assert.match(err.message, /figshare-ndownloader=ACQUIRE_HTTP_403_AT_ndownloader\.figshare\.com/);
      assert.match(err.message, /figshare-api=ACQUIRE_INTERSTITIAL_OR_NONFILE_RESPONSE_AT_api\.figshare\.com/);
      return true;
    });
});

test('FIGSHARE-004: file id and signed source are pinned for both endpoints', () => {
  const endpoints = publisherDownloadEndpoints(entry);
  assert.deepEqual(endpoints.map(x => x.label), ['figshare-ndownloader', 'figshare-api']);
  assert.deepEqual(endpoints.map(x => x.url), [
    'https://ndownloader.figshare.com/files/12345',
    'https://api.figshare.com/v2/file/download/12345'
  ]);
  assert.throws(() => publisherDownloadEndpoints({
    ...entry, sourceFileId: 99999
  }), /ACQUIRE_FIGSHARE_FILE_ID_NOT_PINNED/);
  assert.throws(() => validatePublisherDownloadHost('https://evil.com.amazonaws.com.attacker.test/', 'figshare'),
    /ACQUIRE_UNTRUSTED_REDIRECT_HOST/);
});

test('FIGSHARE-005: non-200 status is never mistaken for a downloaded file', async () => {
  const e = { ...entry, sourceFileId: 12345 };
  const reply = async () => new Response(null, { status: 202 });
  await assert.rejects(openVerifiedPublisherStream(e, { fetcher: reply }),
    /ACQUIRE_HTTP_202_AT_/);
});

const FIGSHARE_R2_HOST = '44c1cec316ec56bca76dfd65d2882b20.r2.cloudflarestorage.com';

test('FIGSHARE-006: observed exact Cloudflare R2 redirect is admitted for Figshare only', async () => {
  const signed = 'https://' + FIGSHARE_R2_HOST +
    '/bucket/pinned.bin?X-Amz-Signature=dont-log-signed-values';
  const seen = [];
  const fetcher = async (url, opts) => {
    seen.push(url);
    assert.equal(opts.redirect, 'manual');
    if (url === entry.downloadUrl) return new Response(null, {
      status: 302, headers: { location: signed }
    });
    if (url === signed) return new Response(body(), {
      status: 200, headers: { 'content-type': 'application/octet-stream', 'content-length': '4' }
    });
    throw Error('unexpected endpoint');
  };
  const out = await openVerifiedPublisherStream(entry, { fetcher });
  assert.equal(out.endpoint, 'figshare-ndownloader');
  assert.deepEqual(new Uint8Array(await out.response.arrayBuffer()), body());
  assert.deepEqual(seen, [entry.downloadUrl, signed]);
  assert.equal(validatePublisherDownloadHost(signed, 'figshare').hostname, FIGSHARE_R2_HOST);
  assert.throws(() => validatePublisherDownloadHost(signed, 'zenodo'),
    /ACQUIRE_UNTRUSTED_REDIRECT_HOST/);
});

test('FIGSHARE-007: R2 lookalikes and insecure R2 redirects never leave the allowlist', async () => {
  const lookalikes = [
    'https://untrusted.r2.cloudflarestorage.com/x',
    'https://' + FIGSHARE_R2_HOST + '.attacker.example/x',
    'https://other.' + FIGSHARE_R2_HOST + '/x',
    'https://r2.cloudflarestorage.com/x'
  ];
  for (const bad of lookalikes) {
    assert.throws(() => validatePublisherDownloadHost(bad, 'figshare'),
      /ACQUIRE_UNTRUSTED_REDIRECT_HOST/);
  }
  assert.throws(
    () => validatePublisherDownloadHost('http://' + FIGSHARE_R2_HOST + '/x', 'figshare'),
    /ACQUIRE_UNTRUSTED_URL/
  );
  const received = [];
  const fetcher = async url => {
    received.push(url);
    return new Response(null, {
      status: 302,
      headers: { location: lookalikes[1] + '?X-Amz-Signature=private-token' }
    });
  };
  await assert.rejects(openVerifiedPublisherStream(entry, { fetcher }), err => {
    assert.match(err.message, /ACQUIRE_UNTRUSTED_REDIRECT_HOST/);
    assert.ok(!err.message.includes('private-token'));
    return true;
  });
  assert.deepEqual(received, [
    'https://ndownloader.figshare.com/files/12345',
    'https://api.figshare.com/v2/file/download/12345'
  ], 'redirect targets must be rejected before any network request');
});
