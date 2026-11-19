// Lab tracks (by body system / clinical skill): per-user progress over the steps in shared/lab-tracks.json.
// This server copy only knows the keys (and which steps are planned) so it can validate writes;
// test/labTracks.test.mjs keeps it identical to the shared file. Planned steps can never be completed.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const u = require(HOOKS + '/lib/util.js');

// track -> { step: planned }
const TRACKS = {
  'dada-pernapasan': { 'atlas-toraks': false, 'kuis-toraks': false, 'cxr': false, 'usg-efusi': false, 'auskultasi-paru': false },
  'jantung-kardiovaskular': { 'atlas-kardio': false, 'kuis-kardio': false, 'usg-jantung': false, 'usg-hfref': false, 'usg-perikard': false, 'ekg': false },
  'saraf-otak': { 'atlas-saraf': false, 'atlas-kepala': false, 'kuis-tengkorak': false, 'oct-retina': false, 'neuro-mri': true },
  'rangka-otot': { 'atlas-rangka': false, 'kuis-tulang': false, 'temukan-tulang': false, 'atlas-otot': false, 'atlas-sendi': false },
  'abdomen-cerna': { 'atlas-abdomen': false, 'kuis-abdomen': false, 'usg-asites': false, 'usg-lambung': false, 'histo-kolorektal': false },
  'darah-imun': { 'sel-darah': false, 'atlas-limfatik': false },
  'kemih': { 'atlas-pelvis': false, 'usg-retensi': false, 'ginjal-3d': true },
  'auskultasi-jantung': { 'atlas-jantung': false, 'lokasi-normal': false, 's3-hfref': false, 'latihan-4d': false, 'murmur-katup': true },
  'auskultasi-paru': { 'atlas-paru': false, 'napas-normal': false, 'napas-efusi': false, 'rekaman-klinis': true },
  'tekanan-darah': { 'arteri-lengan': false, 'korotkoff': true, 'klasifikasi-td': true },
  'ekg': { 'atlas-jantung': false, 'konduksi': false, 'latihan-ritme': false, 'ekg-12-sadapan': true },
  'usg-dasar': { 'latihan-probe': false, 'jendela-normal': false, 'cairan-pleura': false, 'cairan-perikard': false, 'cairan-abdomen': false, 'kandung-kemih': false },
  'identifikasi-anatomi': { 'kenali': false, 'temukan': false, 'tulang': false },
  'interpretasi-citra': { 'cxr': false, 'oct': false, 'histo': false, 'darah': false },
};
function fail(message) { throw new BadRequestError(message); }
function row(app, user, track) {
  try { return app.findFirstRecordByFilter('lab_track_progress', 'user = {:u} && track = {:t}', { u: user.id, t: track }); } catch (_) { return null; }
}
function view(track, r) {
  const steps = TRACKS[track];
  const completed = r ? u.recJson(r, 'completed', []).filter((k) => steps && steps[k] === false) : [];
  return { track, completed, lastStep: r ? r.getString('lastStep') : '', updatedAt: r ? r.getString('updated') : '' };
}
function list(app, user) {
  return { items: app.findRecordsByFilter('lab_track_progress', 'user = {:u}', '-updated', 100, 0, { u: user.id })
    .filter((r) => TRACKS[r.getString('track')]).map((r) => view(r.getString('track'), r)) };
}
// body: { step, done?: boolean }. done omitted = only remember the last opened step.
function mark(app, user, track, body) {
  const steps = TRACKS[track];
  if (!steps) throw new NotFoundError('Jalur tidak ditemukan.');
  const step = String((body && body.step) || '');
  if (!(step in steps)) fail('Langkah ini bukan bagian dari jalur tersebut.');
  if (body.done !== undefined && typeof body.done !== 'boolean') fail('Nilai done tidak valid.');
  if (steps[step] && body.done !== undefined) fail('Langkah ini belum tersedia.');
  app.runInTransaction((tx) => {
    let r = row(tx, user, track);
    if (!r) { r = new Record(tx.findCollectionByNameOrId('lab_track_progress')); r.set('user', user.id); r.set('track', track); r.set('completed', []); }
    let done = u.recJson(r, 'completed', []).filter((k) => steps[k] === false);
    if (body.done === true && done.indexOf(step) < 0) done.push(step);
    if (body.done === false) done = done.filter((k) => k !== step);
    r.set('completed', done); r.set('lastStep', step); tx.save(r);
  });
  return view(track, row(app, user, track));
}
module.exports = { TRACKS, list, mark };
