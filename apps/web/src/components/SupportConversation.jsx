// Percakapan dengan admin manusia (koleksi privat support_messages).
// useSupportThread dipakai bersama oleh Chat Admin pengguna (pesan tampil di
// dalam utas obrolan) dan kotak masuk admin (komponen bawaan file ini).
import '@/styles/chat.css';
import { Check, Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useChatState } from '@/lib/chatStore';
import logoMark from '@/assets/logo-mark.webp';
import { Alert } from './ui';

export const CATEGORIES = { question: 'Pertanyaan', problem: 'Laporkan kendala', feedback: 'Saran & masukan' };

function mergeMessages(old, next) {
  const byId = new Map([...old, ...next].map((m) => [m.id, m]));
  return [...byId.values()].sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
}

// Memuat dan memperbarui percakapan tiap 10 detik (dan saat jendela kembali
// aktif). send() memakai clientKey yang sama saat pengiriman diulang supaya
// pesan tidak dobel bila koneksi sempat gagal.
export function useSupportThread({ admin = false, userId } = {}) {
  const path = admin ? `admin/support/${userId}` : 'support/messages';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [older, setOlder] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const pending = useRef(null);
  const sendLock = useRef(false);
  const mounted = useRef(false);

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
        setOlder((prev) => (prev === null ? (r.hasMore ? r.nextBefore : '') : prev));
        setLoadError('');
      } catch (e) {
        if (alive) setLoadError(e.message);
      } finally {
        fetching = false;
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 10000);
    window.addEventListener('focus', load);
    return () => { alive = false; mounted.current = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, [path, retryKey]);

  const loadOlder = useCallback(async () => {
    if (!older) return;
    setLoadingOlder(true);
    try {
      const r = await api(path, { query: { before: older } });
      setItems((prev) => mergeMessages(prev, r.items));
      setOlder(r.hasMore ? r.nextBefore : '');
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [older, path]);

  // Melempar galat bila gagal, supaya pemanggil bisa menampilkan pesannya.
  const send = useCallback(async (text, category = 'question') => {
    const value = String(text || '').trim();
    if (!value || sendLock.current) return null;
    sendLock.current = true;
    try {
      if (pending.current?.text !== value || pending.current?.category !== category) {
        pending.current = { text: value, clientKey: crypto.randomUUID(), category };
      }
      const r = await api(path, { method: 'POST', body: pending.current });
      pending.current = null;
      if (mounted.current) setItems((prev) => mergeMessages(prev, [r.message]));
      return r.message;
    } finally {
      sendLock.current = false;
    }
  }, [path]);

  return { items, loading, loadError, older, loadingOlder, loadOlder, send, retry: () => setRetryKey((n) => n + 1) };
}

// Menempel ke pesan terbaru. Hanya gulir oleh pengguna (roda, sentuh, tombol panah)
// yang bisa melepasnya; gulir otomatis tidak, karena isi bisa bertambah
// tepat sebelum event scroll diproses.
export function useStickToBottom() {
  const ref = useRef(null);
  const stick = useRef(true);
  const userAt = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => { if (stick.current) el.scrollTop = el.scrollHeight; });
    ro.observe(el.firstElementChild);
    const intent = () => { userAt.current = Date.now(); };
    const keyIntent = (e) => { if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) intent(); };
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
      if (near) stick.current = true;
      else if (Date.now() - userAt.current < 1200) stick.current = false;
    };
    const opts = { passive: true };
    el.addEventListener('wheel', intent, opts);
    el.addEventListener('touchmove', intent, opts);
    el.addEventListener('keydown', keyIntent);
    el.addEventListener('scroll', onScroll, opts);
    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', intent); el.removeEventListener('touchmove', intent);
      el.removeEventListener('keydown', keyIntent);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);
  // Dipanggil saat pengguna mengirim atau memilih sesuatu: selalu ke bawah.
  const toBottom = useCallback(() => { stick.current = true; }, []);
  const release = useCallback(() => { stick.current = false; }, []);
  return { ref, toBottom, release };
}

export function fmtTime(created) {
  const d = new Date(String(created).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

// Satu pesan percakapan admin. mine = pesan dari sisi yang sedang membaca.
export function SupportMessage({ m, mine, admin = false }) {
  const fromAdmin = m.senderRole === 'admin';
  const who = fromAdmin ? 'Admin MEDCOEL' : admin ? 'Pengguna' : 'Kamu';
  const cat = m.category && m.category !== 'question' ? CATEGORIES[m.category] : '';
  return (
    <div className={`chat-row has-time ${mine ? 'is-mine' : 'is-bot'}`}>
      {!mine && (fromAdmin ? <img src={logoMark} alt="" className="chat-avatar" /> : <span className="chat-avatar is-user" aria-hidden>U</span>)}
      <div className="chat-msg">
        <span className="chat-meta">{who}{cat ? ` · ${cat}` : ''}</span>
        <p className={`chat-bubble ${mine ? 'is-me' : fromAdmin ? 'is-admin' : 'is-bot'}`}>{m.text}</p>
        <time className="chat-time" dateTime={String(m.created).replace(' ', 'T')}>{fmtTime(m.created)}{mine && <Check size={12} aria-label="Terkirim" />}</time>
      </div>
    </div>
  );
}

// Kolom tulis pesan, dipakai pengguna dan admin.
// draftKey (opsional): tulisan yang belum terkirim disimpan di chatStore, jadi tidak hilang
// saat chat dipindah dari panel ke halaman penuh.
export function Composer({ onSend, disabled, placeholder, note, inputRef, children, draftKey }) {
  const id = useId();
  const [localText, setLocalText] = useState('');
  const [storedText, setStoredText] = useChatState(`draft:${draftKey || 'lokal'}`, '');
  const [text, setText] = draftKey ? [storedText, setStoredText] : [localText, setLocalText];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const form = useRef(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setError('');
    try { await onSend(text); setText(''); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form ref={form} className="chat-composer" onSubmit={submit}>
      {children}
      {error && <Alert className="mb-2">{error}</Alert>}
      <div className="chat-input">
        <label className="sr-only" htmlFor={id}>{placeholder}</label>
        <textarea
          id={id} ref={inputRef} rows={1} placeholder={placeholder} maxLength={4000} value={text} disabled={disabled || busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); form.current.requestSubmit(); } }}
        />
        <button type="submit" disabled={!text.trim() || busy || disabled} aria-label="Kirim pesan">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
      </div>
      <div className="chat-note"><span>{note}</span>{text.length > 3500 && <span>{text.length}/4000</span>}</div>
    </form>
  );
}

// Tampilan percakapan mandiri. Dipakai kotak masuk admin (admin + userId).
export default function SupportConversation({ userId, admin = false }) {
  const t = useSupportThread({ admin, userId });
  const scroller = useStickToBottom();
  return (
    <div className="chat-shell is-inbox">
      <div ref={scroller.ref} className="chat-thread tex-grid" role="log" aria-label="Percakapan dengan pengguna" aria-live="polite">
        <div className="chat-thread-inner">
          {t.older && <button type="button" onClick={() => { scroller.release(); t.loadOlder(); }} disabled={t.loadingOlder} className="chat-older">{t.loadingOlder ? 'Memuat...' : 'Muat pesan sebelumnya'}</button>}
          {t.loading && <p className="chat-loading"><Loader2 size={18} className="animate-spin" /> Memuat percakapan…</p>}
          {!t.loading && !t.items.length && <p className="chat-loading">Belum ada pesan.</p>}
          {t.items.map((m) => <SupportMessage key={m.id} m={m} admin={admin} mine={admin ? m.senderRole === 'admin' : m.senderRole !== 'admin'} />)}
        </div>
      </div>
      {t.loadError && <div className="px-4 pt-3"><Alert>{t.loadError}</Alert><button type="button" className="mt-1 text-sm font-semibold text-brand underline" onClick={t.retry}>Muat ulang percakapan</button></div>}
      <Composer
        onSend={async (text) => { scroller.toBottom(); await t.send(text, 'question'); }}
        placeholder={admin ? 'Tulis balasan untuk pengguna…' : 'Tulis pesan untuk admin…'}
        note={admin ? 'Balasan tampil di Chat Admin pengguna. Shift + Enter untuk baris baru.' : 'Admin membalas saat tersedia.'}
      />
    </div>
  );
}
