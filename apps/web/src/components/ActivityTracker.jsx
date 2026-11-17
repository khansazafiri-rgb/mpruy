import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import pb from '@/lib/pb';
import { activityKey } from '@/lib/activityMap.mjs';
import { createTracker, HEARTBEAT_MS, sendActivity } from '@/lib/activityTracker';

// Mencatat halaman mana yang dibuka siswa (hanya pola halaman + waktu aktif) untuk dashboard admin.
// Hanya untuk siswa yang masuk; admin dan agen tidak dicatat. Lihat docs/ACTIVITY_TRACKING.md.
export default function ActivityTracker() {
  const { me } = useAuth();
  const { pathname } = useLocation();
  const tracker = useRef(null);
  const enabled = !!me && me.role === 'user';

  useEffect(() => {
    if (!enabled) return undefined;
    const t = createTracker({
      send: (payload) => sendActivity(pb.authStore.token, payload),
      isVisible: () => document.visibilityState === 'visible',
    });
    tracker.current = t;
    t.enter(activityKey(window.location.pathname));
    const touch = () => t.touch();
    const onVisibility = () => (document.visibilityState === 'hidden' ? t.hide() : t.show());
    const opts = { passive: true, capture: true };
    ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, touch, opts));
    document.addEventListener('visibilitychange', onVisibility);
    const onHide = () => t.hide();
    window.addEventListener('pagehide', onHide);
    const beat = setInterval(() => t.tick(), HEARTBEAT_MS);
    return () => {
      clearInterval(beat);
      ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.removeEventListener(ev, touch, opts));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      t.leave();
      tracker.current = null;
    };
  }, [enabled]);

  useEffect(() => { tracker.current?.enter(activityKey(pathname)); }, [pathname]);
  return null;
}
