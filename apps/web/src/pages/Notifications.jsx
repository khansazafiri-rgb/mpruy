import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, EmptyState, PageLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api, errorText } from '@/lib/api';
import pb from '@/lib/pb';
import { safeInternalPath } from '@/lib/safePath';
import { relative } from '@/lib/time';
import PageHead from '@/components/PageHead';

export default function Notifications() {
  const { refresh } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = () => pb.collection('notifications').getList(1, 100, { sort: '-created' }).then((r) => setItems(r.items)).catch((e) => setError(errorText(e)));
  useEffect(() => { load(); }, []);

  const read = async (n) => {
    if (n.read) return;
    try { await pb.collection('notifications').update(n.id, { read: true }); } catch { /* abaikan */ }
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    refresh();
  };
  const readAll = async () => {
    try { await api('notifications/read-all', { method: 'POST', body: {} }); await load(); refresh(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-7">
      <PageHead eyebrow="Kabar terbaru" title="Notifikasi" actions={items?.some((n) => !n.read) && <button type="button" className="btn-secondary btn-sm" onClick={readAll}><CheckCheck size={16} /> Tandai semua dibaca</button>} />
      <Alert>{error}</Alert>
      {!items ? <PageLoader /> : !items.length ? (
        <EmptyState icon={Bell} title="Belum ada notifikasi">Status pengajuan soal, soal yang sudah tayang, laporan yang selesai, dan pengingat ujian akan muncul di sini.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3 p-4">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-coral'}`} aria-label={n.read ? undefined : 'Belum dibaca'} />
                <div className="min-w-0 flex-1">
                  <p className={n.read ? 'font-medium' : 'font-bold'}>{n.title}</p>
                  {n.body && <p className="text-sm text-ink-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-ink-faint">{relative(n.created)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id} className="hover:bg-page">
                {n.link ? <Link to={safeInternalPath(n.link, '/notifikasi')} onClick={() => read(n)}>{body}</Link> : <button type="button" className="w-full text-left" onClick={() => read(n)}>{body}</button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
