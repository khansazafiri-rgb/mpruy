import { Check, Loader2, MessageCircle, Send } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Alert } from './ui';

const CATEGORIES = { question: 'Pertanyaan', problem: 'Laporkan kendala', feedback: 'Saran & masukan' };
function mergeMessages(old, next) {
  const byId = new Map([...old, ...next].map((m) => [m.id, m]));
  return [...byId.values()].sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
}
export default function SupportConversation({ userId, admin = false, compact = false }) {
  const inputId = useId();
  const path = admin ? `admin/support/${userId}` : 'support/messages';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('question');
  const [busy, setBusy] = useState(false);
  const [older, setOlder] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sent, setSent] = useState('');
  const messageList = useRef(null);
  const stick = useRef(true);
  const pending = useRef(null);
  const form = useRef(null);
  const mounted = useRef(false);
  const sendLock = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    mounted.current = true;
    let fetching = false;
    const load = async () => {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const r = await api(path);
        if (!alive) return;
        setItems((prev) => mergeMessages(prev, r.items));
        setOlder((prev) => prev === null ? (r.hasMore ? r.nextBefore : '') : prev);
        setLoadError('');
      } catch (e) { if (alive) setLoadError(e.message); }
      finally { fetching = false; if (alive) setLoading(false); }
    };
    load();
    const timer = setInterval(load, 10000);
    window.addEventListener('focus', load);
    return () => { alive = false; mounted.current = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, [path, retry]);
  const lastId = items.at(-1)?.id;
  useEffect(() => {
    if (stick.current && messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
  }, [lastId]);
  useEffect(() => {
    const list = messageList.current;
    const observer = new ResizeObserver(() => {
      if (stick.current) list.scrollTop = list.scrollHeight;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);
  const loadOlder = async () => {
    setLoadingOlder(true);
    try {
      const r = await api(path, { query: { before: older } });
      stick.current = false;
      setItems((prev) => mergeMessages(prev, r.items)); setOlder(r.hasMore ? r.nextBefore : '');
    } catch (e) { setError(e.message); } finally { setLoadingOlder(false); }
  };
  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sendLock.current) return;
    sendLock.current = true; setBusy(true); setError(''); setSent('');
    if (pending.current?.text !== value || pending.current?.category !== category) pending.current = { text: value, clientKey: crypto.randomUUID(), category };
    try {
      const r = await api(path, { method: 'POST', body: pending.current });
      if (!mounted.current) return;
      stick.current = true; setItems((prev) => mergeMessages(prev, [r.message])); setText(''); setSent('Pesan terkirim.'); pending.current = null;
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { sendLock.current = false; if (mounted.current) setBusy(false); }
  };
  return (
    <div className={`support-conversation ${compact ? 'is-compact' : ''}`}>
      <div className="support-status"><span className="support-avatar"><MessageCircle size={17} /></span><div><b>{admin ? 'Percakapan pengguna' : 'Admin MEDCOEL'}</b><span>{admin ? 'Balasan dikirim sebagai admin' : 'Kirim pertanyaan, kendala, atau masukan'}</span></div><span className="support-refresh">Diperbarui otomatis</span></div>
      <div ref={messageList} className="support-messages" role="log" aria-label="Percakapan dengan admin" aria-live="polite" onScroll={(e) => { const t = e.currentTarget; stick.current = t.scrollHeight - t.scrollTop - t.clientHeight < 90; }}>
        {older && <button type="button" onClick={loadOlder} disabled={loadingOlder} className="support-older">{loadingOlder ? 'Memuat...' : 'Muat pesan sebelumnya'}</button>}
        {loading ? <p className="support-empty"><Loader2 size={19} className="animate-spin" /> Memuat percakapan…</p> : !items.length && <div className="support-welcome"><span><MessageCircle size={24} /></span><h3>Halo, ada yang bisa dibantu?</h3><p>Tulis pertanyaan atau ceritakan kendalamu di sini. Admin akan membalas saat tersedia.</p><small>Pesanmu hanya terlihat olehmu dan admin.</small></div>}
        {items.map((m) => {
          const mine = admin ? m.senderRole === 'admin' : m.senderRole !== 'admin';
          return <div className={`support-message ${mine ? 'is-mine' : ''}`} key={m.id}><span>{m.senderRole === 'admin' ? 'Admin MEDCOEL' : admin ? 'Pengguna' : 'Kamu'}{m.category && m.category !== 'question' ? ` · ${CATEGORIES[m.category]}` : ''}</span><p>{m.text}</p><time dateTime={m.created.replace(' ', 'T')}>{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(m.created))}{mine && <Check size={11} aria-label="Terkirim" />}</time></div>;
        })}
      </div>
      <div className="support-composer">
        {(error || loadError) && <div className="mb-3"><Alert>{error || loadError}</Alert><button type="button" className="mt-2 text-xs font-semibold text-brand underline" onClick={() => setRetry((n) => n + 1)}>Muat ulang percakapan</button></div>}
        <form ref={form} onSubmit={send}>
          {!admin && <div className="support-categories" role="group" aria-label="Jenis pesan">{Object.entries(CATEGORIES).map(([k, v]) => <button key={k} type="button" aria-pressed={category === k} onClick={() => setCategory(k)}>{v}</button>)}</div>}
          <div className="support-input-wrap"><label className="sr-only" htmlFor={inputId}>{admin ? 'Tulis balasan' : 'Tulis pesan'}</label><textarea id={inputId} placeholder={admin ? 'Tulis balasan untuk pengguna…' : 'Tulis pesan untuk admin…'} maxLength={4000} value={text} disabled={busy} onChange={(e) => { setText(e.target.value); setSent(''); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); form.current.requestSubmit(); } }} /><button type="submit" disabled={!text.trim() || busy} aria-label={admin ? 'Kirim balasan' : 'Kirim pesan'}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button></div>
          <div className="support-input-note"><span role="status">{sent || (admin ? 'Balasan tersimpan di percakapan pengguna.' : 'Admin membalas saat tersedia. Shift + Enter untuk baris baru.')}</span><span>{text.length}/4000</span></div>
        </form>
      </div>
    </div>
  );
}
