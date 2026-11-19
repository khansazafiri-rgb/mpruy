// Shared by the Lab home hub and the track pages.
import { useEffect, useState } from 'react';
import { Activity, Bone, Brain, Droplet, FlaskConical, Gauge, Heart, Image, ScanLine, Soup, Stethoscope, Target, Wind } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { liveLabAvailability } from '../anatomy/liveLab.mjs';

export const TRACK_ICON = { wind: Wind, heart: Heart, brain: Brain, bone: Bone, soup: Soup, droplet: Droplet, flask: FlaskConical, stethoscope: Stethoscope, gauge: Gauge, activity: Activity, scan: ScanLine, target: Target, image: Image };
const STATUS = { soon: ['Segera hadir', 'chip'], new: ['Belum mulai', 'chip'], active: ['Sedang berjalan', 'chip chip-brand'], done: ['Selesai', 'chip chip-brand'] };
export const statusChip = (s) => STATUS[s.status] || STATUS.new;

/** Shared loader for the Lab home hub and track pages: published catalog, pathways and own track progress. */
export function useTrackData() {
  const [d, setD] = useState({ catalog: null, pathways: [], progress: {}, features: {}, live: 'ready', error: '', ready: false });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all([api('lab/catalog').catch(() => null), api('lab/pathways').catch(() => ({ items: [] })), api('lab/tracks'), liveLabAvailability()])
      .then(([catalog, pathways, tracks, liveLab]) => live && setD({ catalog, pathways: pathways?.items || [], progress: Object.fromEntries((tracks.items || []).map((x) => [x.track, x])), features: tracks.features || {}, live: liveLab, error: '', ready: true }))
      .catch((e) => live && setD((x) => ({ ...x, error: errorText(e), ready: true })));
    return () => { live = false; };
  }, [n]);
  return { ...d, retry: () => setN((x) => x + 1), setProgress: (p) => setD((x) => ({ ...x, progress: { ...x.progress, [p.track]: p } })) };
}

