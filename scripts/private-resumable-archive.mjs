/**
 * Bounded-memory private archive downloader. Exact file-size/MD5 pinning is
 * mandatory. A stable .partial + sidecar survives timeout and interruption.
 * Never extracts archives, changes rights statuses, or deploys any bytes.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { openVerifiedPublisherStream } from './verified-publisher-download.mjs';

const MiB = 1048576;
const regular = file => {
  const s = fs.lstatSync(file, { throwIfNoEntry: false });
  if (s && (!s.isFile() || s.isSymbolicLink())) throw Error('ACQUIRE_PARTIAL_NOT_REGULAR_FILE');
  return s;
};
export async function hashFileBounded(file) {
  const md5 = crypto.createHash('md5'), sha = crypto.createHash('sha256');
  for await (const b of fs.createReadStream(file, { highWaterMark: MiB })) {
    md5.update(b); sha.update(b);
  }
  return { md5: md5.digest('hex'), sha256: sha.digest('hex') };
}
function lock(file) {
  const name = file + '.lock';
  regular(name);
  let fd;
  try { fd = fs.openSync(name, 'wx', 0o600); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    let pid = null;
    try { pid = JSON.parse(fs.readFileSync(name, 'utf8')).pid; } catch {}
    if (!Number.isSafeInteger(pid) || pid < 1)
      throw Error('ACQUIRE_LOCK_NEEDS_MANUAL_REVIEW');
    try { process.kill(pid, 0); throw Error('ACQUIRE_CONCURRENT_DOWNLOAD_ACTIVE'); }
    catch (e) { if (e.code !== 'ESRCH') throw e; }
    fs.rmSync(name);
    fd = fs.openSync(name, 'wx', 0o600);
  }
  fs.writeSync(fd, JSON.stringify({ pid: process.pid, created: new Date().toISOString() }));
  fs.closeSync(fd);
  return () => fs.rmSync(name, { force: true });
}
const pin = e => ({ schema:'medcoel.private-partial.v1', source:e.source,
  filename:e.filename, expectedBytes:e.expectedBytes,
  publisherMd5:e.publisherMd5, downloadUrl:e.downloadUrl });
function setup(e, out) {
  const partial = out + '.partial', sidecar = out + '.partial.json';
  const p = regular(partial), m = regular(sidecar), expected = pin(e);
  if (!p && m) fs.rmSync(sidecar); // interrupted before first byte
  if (p && !m) throw Error('ACQUIRE_ORPHAN_PARTIAL_NEEDS_MANUAL_REVIEW');
  if (p && m) {
    let actual;
    try { actual = JSON.parse(fs.readFileSync(sidecar, 'utf8')); }
    catch { throw Error('ACQUIRE_PARTIAL_METADATA_CORRUPT'); }
    if (Object.keys(expected).some(key => expected[key] !== actual[key]))
      throw Error('ACQUIRE_PARTIAL_SOURCE_PIN_CHANGED');
    if (p.size > e.expectedBytes) throw Error('ACQUIRE_PARTIAL_OVERSIZED');
  }
  if (!p) {
    fs.writeFileSync(sidecar, JSON.stringify(expected)+'\n', { flag:'wx', mode:0o600 });
    const fd = fs.openSync(partial, 'wx', 0o600); fs.closeSync(fd);
  }
  return { partial, sidecar };
}
export async function downloadPrivateArchive(entry, out, {
  fetcher = fetch, openStream = openVerifiedPublisherStream,
  maxAttempts = 3, logger = console.log, progressMiB = 64
} = {}) {
  if (!Number.isSafeInteger(entry.expectedBytes) || entry.expectedBytes < 1 ||
      !/^[a-f0-9]{32}$/i.test(entry.publisherMd5) ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 6)
    throw Error('ACQUIRE_INVALID_TRANSFER_PLAN');
  const unlock = lock(out + '.partial');
  try {
    const { partial, sidecar } = setup(entry, out);
    let mark = fs.statSync(partial).size, last = Date.now(), etag = null;
    for (let attempt=1; attempt<=maxAttempts; attempt++) {
      let offset = fs.statSync(partial).size;
      if (offset === entry.expectedBytes) break;
      logger('PRIVATE '+entry.source+' · '+entry.filename+' · attempt '+
        attempt+'/'+maxAttempts+' · '+(offset/MiB).toFixed(1)+'/'+(entry.expectedBytes/MiB).toFixed(1)+' MiB');
      let opened;
      try {
        opened = await openStream(entry, { fetcher, offset, ifRange:etag });
        if (offset && !opened.resumed) {
          logger('Publisher ignored Range; verified full response restarting from 0.');
          fs.truncateSync(partial, 0);
          offset = 0;
        }
        if (!offset && opened.resumed) throw Error('ACQUIRE_UNREQUESTED_PARTIAL_RESPONSE');
        const nextTag = opened.response.headers.get('etag');
        if (nextTag && !nextTag.startsWith('W/') && nextTag.length <= 256) etag = nextTag;
        const fd = fs.openSync(partial, 'r+');
        const reader = opened.response.body?.getReader();
        if (!reader) { fs.closeSync(fd); throw Error('ACQUIRE_EMPTY_DOWNLOAD'); }
        let written = offset;
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            const chunk = Buffer.from(result.value);
            if (written + chunk.length > entry.expectedBytes)
              throw Error('ACQUIRE_OVERSIZED_DOWNLOAD');
            let sent = 0;
            while (sent < chunk.length) {
              const n = fs.writeSync(fd, chunk, sent, chunk.length-sent, written+sent);
              if (!n) throw Error('ACQUIRE_ZERO_BYTE_DISK_WRITE');
              sent += n;
            }
            written += chunk.length;
            opened.touch?.();
            if (written-mark >= progressMiB*MiB || Date.now()-last > 30_000) {
              logger('PRIVATE progress '+entry.source+' '+(written/MiB).toFixed(1)+
                '/'+(entry.expectedBytes/MiB).toFixed(1)+' MiB');
              mark = written; last = Date.now();
            }
          }
          fs.fsyncSync(fd);
        } finally { fs.closeSync(fd); reader.releaseLock(); }
        if (written === entry.expectedBytes) break;
        throw Error('ACQUIRE_STREAM_ENDED_EARLY');
      } catch (e) {
        if (/UNTRUSTED|INVALID_CONTENT_RANGE|SOURCE_PIN_CHANGED|OVERSIZED_DOWNLOAD|UNREQUESTED_PARTIAL/.test(e.message))
          throw e;
        logger('PRIVATE transfer interrupted: '+String(e.message).slice(0,160));
        if (attempt === maxAttempts)
          throw Error('ACQUIRE_RESUMABLE_PARTIAL_RETAINED:'+String(e.message).slice(0,140));
      } finally { opened?.close?.(); }
    }
    if (fs.statSync(partial).size !== entry.expectedBytes)
      throw Error('ACQUIRE_RESUMABLE_PARTIAL_RETAINED:INCOMPLETE_LENGTH');
    logger('PRIVATE verifying publisher MD5 and SHA-256 ...');
    const hashes = await hashFileBounded(partial);
    if (hashes.md5.toLowerCase() !== entry.publisherMd5.toLowerCase())
      throw Error('ACQUIRE_COMPLETED_ARCHIVE_MD5_MISMATCH_QUARANTINED');
    fs.renameSync(partial, out);
    fs.rmSync(sidecar, { force:true });
    logger('PRIVATE archive verified: '+entry.source+' · '+entry.filename);
    return { status:'DOWNLOADED_PRIVATE_ONLY', sha256:hashes.sha256 };
  } finally { unlock(); }
}
