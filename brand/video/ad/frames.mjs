// Pecah klip layar menjadi urutan JPG 30 fps (ad/build/frames/<klip>/00001.jpg) supaya
// panggung bisa menampilkan frame yang tepat untuk setiap waktu render.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const clips = JSON.parse(fs.readFileSync(path.join(HERE, 'clips', 'clips.json'), 'utf8'));
for (const [name, info] of Object.entries(clips)) {
  const dir = path.join(HERE, 'build', 'frames', name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(HERE, 'clips', info.file), '-vf', 'fps=30', '-q:v', '4', path.join(dir, '%05d.jpg')], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log(name, fs.readdirSync(dir).length, 'frame');
}
