import { Inbox, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import SupportConversation from '@/components/SupportConversation';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
export default function SupportInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => api('admin/support').then((r) => { if (alive) { setItems(r.items); setError(''); } }).catch((e) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    load(); const timer = setInterval(() => { if (!document.hidden) load(); }, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return <div className="space-y-5"><div><p className="eyebrow mb-2">BANTUAN & MASUKAN</p><h1 className="page-title">Pesan pengguna</h1><p className="mt-2 text-sm text-ink-muted">Pertanyaan, kendala, dan masukan. Pilih percakapan untuk membalas.</p></div><Alert>{error}</Alert>{loading ? <Spinner /> : <div className="support-inbox"><aside>{items.length ? items.map((i) => <button type="button" key={i.userId} className={selected?.userId === i.userId ? 'is-selected' : ''} onClick={() => setSelected(i)}><b>{i.name}</b><span>{i.senderRole === 'admin' ? 'Admin: ' : ''}{i.text}</span><small>{i.senderRole === 'user' ? 'Pesan terakhir dari pengguna' : 'Sudah dibalas admin'}</small></button>) : <EmptyState icon={Inbox} title="Belum ada percakapan">Pesan pengguna akan muncul di sini.</EmptyState>}</aside><section>{selected ? <div><h2 className="mb-3 font-semibold">{selected.name}</h2><SupportConversation key={selected.userId} admin userId={selected.userId} /></div> : <EmptyState icon={MessageCircle} title="Pilih percakapan">Balasan yang kamu kirim akan terlihat di Chat Admin pengguna.</EmptyState>}</section></div>}</div>;
}
