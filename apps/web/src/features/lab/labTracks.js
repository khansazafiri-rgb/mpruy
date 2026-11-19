// Lab tracks: belajar per sistem tubuh / per keterampilan klinis, di atas konten yang SUDAH ada
// (Atlas 3D, kuis Atlas, Live 4D Lab, modul Lab terbit). Definisi: shared/lab-tracks.json.
// Ketersediaan dihitung saat dibuka: langkah "planned", sistem Atlas yang ditahan lisensi, dan modul yang belum
// terbit tampil sebagai "belum tersedia" dan TIDAK dihitung dalam progres atau status selesai.
import data from '../../../../../shared/lab-tracks.json' with { type: 'json' };
import { UNAVAILABLE_SYSTEMS } from '../anatomy/registry.mjs';
import { authoredExplore, datasetFor } from './labDiscovery.js';

export const TRACK_GROUPS = data.groups;
export const TRACKS = data.tracks;
export const KIND_LABEL = { atlas: 'Atlas 3D', quiz: 'Kuis Atlas', live: 'Live 4D Lab', module: 'Modul Lab', page: 'Modul interaktif', planned: 'Segera hadir' };

export const groupOf = (key) => TRACK_GROUPS.find((g) => g.key === key);
export const trackHref = (t) => `${groupOf(t.group).path}${t.key}`;
export function findTrack(group, key) { return TRACKS.find((t) => t.key === key && t.group === group) || null; }

/** Steps with `available`, `href` and, when unavailable, a readable `reason`. */
export function resolveSteps(track, { catalog = null, pathways = [], unavailableSystems = UNAVAILABLE_SYSTEMS } = {}) {
  const modules = new Map(authoredExplore(catalog).map((m) => [m.moduleKey, m]));
  return track.steps.map((s) => {
    if (s.kind === 'planned') return { ...s, available: false, reason: s.reason || 'Belum tersedia.' };
    if (s.system && unavailableSystems[s.system]) return { ...s, available: false, reason: unavailableSystems[s.system] };
    if (s.kind === 'module') {
      const m = modules.get(s.moduleKey);
      if (m) return { ...s, available: true, href: m.href };
      const p = pathways.find((x) => datasetFor(x)?.dataset === s.dataset);
      if (p) return { ...s, available: true, href: `/lab/jalur/${p.slug}` };
      return { ...s, available: false, reason: catalog ? 'Modul ini belum terbit di MEDCOEL Lab.' : 'Ketersediaan modul belum bisa diperiksa. Coba muat ulang halaman.' };
    }
    return { ...s, available: true };
  });
}

/** Progress over available steps only. status: soon (nothing available) | new | active | done. */
export function trackSummary(steps, progress) {
  const avail = steps.filter((s) => s.available);
  const doneKeys = new Set(progress?.completed || []);
  const done = avail.filter((s) => doneKeys.has(s.key)).length;
  const status = !avail.length ? 'soon' : done >= avail.length ? 'done' : done || progress?.lastStep ? 'active' : 'new';
  return { available: avail.length, total: steps.length, done, status, partial: avail.length < steps.length };
}

/** The step to continue with: the last opened one if not finished, else the first available unfinished. */
export function nextStep(steps, progress) {
  const done = new Set(progress?.completed || []);
  const last = steps.find((s) => s.key === progress?.lastStep && s.available && !done.has(s.key));
  return last || steps.find((s) => s.available && !done.has(s.key)) || null;
}
