import { useEffect, useState } from 'react';
import { liveLabAvailability } from './liveLab.mjs';

/** 'checking' while the single availability check runs, then 'ready' or 'missing'. */
export function useLiveLabAvailable() {
  const [state, setState] = useState('checking');
  useEffect(() => {
    let live = true;
    liveLabAvailability().then((s) => { if (live) setState(s); });
    return () => { live = false; };
  }, []);
  return state;
}
