// Dipasang di AppShell. Menampilkan pemilih tutorial saat pertama masuk dan
// pengingat sekali per sesi selama masih ada tutorial yang belum selesai.
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { markTutorial, tutorialStatus } from '@/lib/tutorial';
import '@/styles/onboarding.css';
import {
  CHOOSER_EVENT, TUTORIAL_ROUTES, markSeenThisSession, neverChosen, pendingTutorials, quietPath, seenThisSession,
} from './state';
import TutorialChooser from './TutorialChooser';
import TutorialReminder from './TutorialReminder';

export default function TutorialGate() {
  const { me, refresh } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(null); // null | 'first' | 'manual'
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const eligible = me && (me.role || 'user') === 'user';
  const quiet = quietPath(loc.pathname);

  useEffect(() => {
    const onOpen = () => { setRemind(false); setOpen('manual'); };
    window.addEventListener(CHOOSER_EVENT, onOpen);
    return () => window.removeEventListener(CHOOSER_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!eligible || quiet || open) return undefined;
    if (neverChosen(me) && !seenThisSession('chooser', me)) {
      markSeenThisSession('chooser', me);
      markSeenThisSession('remind', me);
      setOpen('first');
      return undefined;
    }
    if (pendingTutorials(me).length && !seenThisSession('remind', me)) {
      const t = setTimeout(() => { markSeenThisSession('remind', me); setRemind(true); }, 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [eligible, quiet, open, me]);

  useEffect(() => { if (quiet) setRemind(false); }, [quiet]);

  const pick = useCallback((key) => { setOpen(null); setRemind(false); nav(TUTORIAL_ROUTES[key]); }, [nav]);
  const close = useCallback(() => setOpen(null), []);
  const skip = useCallback(async () => {
    setBusy(true);
    try {
      const todo = ['fk', 'dokter'].filter((k) => !tutorialStatus(me, k));
      for (const k of todo) await markTutorial(k, 'skipped');
      await refresh();
    } catch { /* tetap tutup: jangan kurung pengguna di layar ini */ }
    setBusy(false);
    setOpen(null);
  }, [me, refresh]);

  if (!eligible) return null;
  return (
    <>
      {open && <TutorialChooser me={me} first={open === 'first'} busy={busy} onPick={pick} onSkip={skip} onClose={close} />}
      {remind && !open && !quiet && (
        <TutorialReminder pending={pendingTutorials(me)} onOpen={() => { setRemind(false); setOpen('manual'); }} onPick={pick} onClose={() => setRemind(false)} />
      )}
    </>
  );
}
