import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// One process owns the durable Telegram delivery ledger. A second service must
// not race the same file acknowledgements or consume the same bot updates.
export function acquireAgentLock(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, 'agent.lock'), value = JSON.stringify({ pid: process.pid, owner: crypto.randomUUID() });
  for (let attempt = 0; attempt < 2; attempt++) {
    try { const fd = fs.openSync(file, 'wx', 0o600); fs.writeFileSync(fd, value); fs.closeSync(fd); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const previous = fs.readFileSync(file, 'utf8'), { pid } = JSON.parse(previous);
      if (!Number.isInteger(pid) || pid <= 0) throw Error('Invalid Hermes process lock; inspect it before starting.');
      let alive = true; try { process.kill(pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; }
      if (alive) throw Error('Another Hermes process owns this state directory.');
      if (fs.readFileSync(file, 'utf8') !== previous) throw Error('Hermes process lock changed while starting.');
      fs.unlinkSync(file);
      if (attempt === 1) throw Error('Unable to acquire Hermes process lock.');
    }
  }
  return () => { try { if (fs.readFileSync(file, 'utf8') === value) fs.unlinkSync(file); } catch { /* already removed */ } };
}
