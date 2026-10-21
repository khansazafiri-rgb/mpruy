// CHAT ADMIN: satu utas obrolan. Asisten menyapa dan menawarkan pilihan
// (upload PDF, tanya/kendala/masukan ke admin, cek status, WhatsApp) sebagai
// balasan cepat di dalam percakapan. Pesan ke admin disimpan sebagai
// percakapan dengan admin manusia; asisten hanya mengarahkan.
import '@/styles/chat.css';
import clsx from 'clsx';
import { CircleHelp, FileText, FileUp, Lightbulb, ListChecks, MessageCircle, RotateCcw, Trash2, TriangleAlert, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logoMark from '@/assets/logo-mark.webp';
import SubmissionCard from '@/components/SubmissionCard';
import { CATEGORIES, Composer, SupportMessage, useStickToBottom, useSupportThread } from '@/components/SupportConversation';
import { Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { looksLikePdf, uploadFile } from '@/lib/upload';
import { confirmMessage, manyPdfMessage, waLink } from '@/lib/wa';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Bubble({ from = 'bot', wide = false, children }) {
  if (from === 'me') {
    return <div className="chat-row is-mine"><div className="chat-msg"><div className="chat-bubble is-me">{children}</div></div></div>;
  }
  return (
    <div className="chat-row is-bot">
      <img src={logoMark} alt="" className="chat-avatar" />
      <div className={clsx('chat-msg', wide && 'is-wide')}><div className="chat-bubble is-bot">{children}</div></div>
    </div>
  );
}

function Typing() {
  return (
    <div className="chat-row is-bot" aria-hidden>
      <img src={logoMark} alt="" className="chat-avatar" />
      <div className="chat-msg"><div className="chat-bubble is-bot chat-typing"><i /><i /><i /></div></div>
    </div>
  );
}

function Chips({ options, onPick, label = 'Pilihan balasan' }) {
  return (
    <div className={clsx('chat-chips', options.length > 12 && 'is-long')} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onPick(o)} className={clsx('chat-chip', o.tone && `is-toned tone-${o.tone}`)}>
          {o.icon && <o.icon size={16} aria-hidden />}{o.label}
        </button>
      ))}
    </div>
  );
}

const LANG = [{ value: 'id', label: 'Indonesia' }, { value: 'en', label: 'Inggris' }, { value: 'both', label: 'Keduanya' }];

function UploadFlow({ onStatus, onMenu }) {
  const { me, settings } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [a, setA] = useState({}); // jawaban
  const [step, setStep] = useState('subject');
  const [draft, setDraft] = useState(null);
  const [uploads, setUploads] = useState([]); // { name, progress, error }
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [left, setLeft] = useState(false);

  useEffect(() => { api('subjects').then((d) => setSubjects(d.items)).catch((e) => setError(e.message)); }, []);

  const answer = (key, o, next) => { setA((x) => ({ ...x, [key]: o.value, [`${key}Label`]: o.label })); setStep(next); setError(''); };

  const pickCount = async (o) => {
    answer('count', o, o.value === 'many' ? 'many' : 'files');
    if (o.value === 'many') return;
    setBusy(true);
    try {
      const d = await api('submissions', {
        method: 'POST',
        body: { subject: a.subject, hasKey: a.hasKey === 'yes', language: a.language, scope: a.scope, pdfCount: Number(o.value) },
      });
      setDraft(d);
    } catch (e) { setError(e.message); setStep('count'); } finally { setBusy(false); }
  };

  const maxMb = settings?.maxPdfMb || 20;
  const addFiles = async (files) => {
    setError('');
    const list = [...files];
    const room = 5 - (draft?.files?.length || 0) - uploads.filter((u) => !u.error && u.progress < 1).length;
    if (list.length > room) { setError(`Satu pengajuan paling banyak 5 PDF. Sisa tempat: ${Math.max(0, room)}.`); list.splice(Math.max(0, room)); }
    for (const f of list) {
      const key = `${f.name}-${f.size}-${Date.now()}`;
      if (f.size > maxMb * 1048576) { setUploads((u) => [...u, { key, name: f.name, progress: 0, error: `Lebih dari ${maxMb} MB. Kecilkan atau pisah PDF-nya.` }]); continue; }
      if (!(await looksLikePdf(f))) { setUploads((u) => [...u, { key, name: f.name, progress: 0, error: 'Isi file ini bukan PDF. Ekspor ulang sebagai PDF.' }]); continue; }
      setUploads((u) => [...u, { key, name: f.name, progress: 0 }]);
      try {
        await uploadFile(new File([f], f.name, { type: 'application/pdf' }), { kind: 'submission_pdf', submission: draft.id }, (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))));
        setUploads((u) => u.filter((x) => x.key !== key));
        setDraft(await api(`submissions/${draft.id}`));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: e.message } : x)));
      }
    }
  };
  const removeFile = async (f) => {
    try { setDraft(await api(`submissions/${draft.id}/files/${f.id}/remove`, { method: 'POST', body: {} })); } catch (e) { setError(e.message); }
  };
  const send = async () => {
    setBusy(true); setError('');
    try { setSent(await api(`submissions/${draft.id}/send`, { method: 'POST', body: { agreement: agree } })); setStep('sent'); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const restart = () => { setA({}); setStep('subject'); setDraft(null); setUploads([]); setAgree(false); setSent(null); setError(''); };
  const leave = (fn) => { setLeft(true); fn(); };
  const campusName = me?.campusName || 'kampusmu';
  const waNumber = settings?.adminWhatsapp;
  const steps = ['subject', 'hasKey', 'language', 'scope', 'count', 'files', 'summary', 'sent', 'many'];
  const at = (s) => steps.indexOf(step) >= steps.indexOf(s);

  return (
    <>
      <Bubble>Siap! Aku bantu ubah PDF soalmu jadi soal latihan di web. <b>Soal ini untuk mata kuliah apa?</b></Bubble>
      {step === 'subject' && (subjects.length ? <Chips label="Pilih mata kuliah" options={subjects.map((s) => ({ value: s.id, label: s.name }))} onPick={(o) => answer('subject', o, 'hasKey')} /> : !error && <div className="chat-chips"><Spinner /></div>)}
      {at('hasKey') && <Bubble from="me">{a.subjectLabel}</Bubble>}

      {at('hasKey') && <Bubble><b>Apakah PDF sudah memuat pembahasan dan kunci jawaban?</b></Bubble>}
      {step === 'hasKey' && <Chips options={[{ value: 'yes', label: 'Ya, sudah ada' }, { value: 'no', label: 'Belum ada' }]} onPick={(o) => answer('hasKey', o, 'language')} />}
      {at('language') && <Bubble from="me">{a.hasKeyLabel}</Bubble>}

      {at('language') && <Bubble><b>Soalnya pakai bahasa apa?</b></Bubble>}
      {step === 'language' && <Chips options={LANG} onPick={(o) => answer('language', o, 'scope')} />}
      {at('scope') && <Bubble from="me">{a.languageLabel}</Bubble>}

      {at('scope') && <Bubble><b>Soal ini hanya untuk pengguna dari kampusmu, atau boleh dilihat pengguna dari kampus lain juga?</b></Bubble>}
      {step === 'scope' && (
        <Chips
          options={[
            ...(me?.campus ? [{ value: 'campus', label: `Hanya kampus saya (${campusName})` }] : []),
            { value: 'all', label: 'Semua kampus' },
          ]}
          onPick={(o) => answer('scope', o, 'count')}
        />
      )}
      {step === 'scope' && !me?.campus && <p className="chat-aside">Kampusmu belum ada di daftar MEDCOEL, jadi pilihan Hanya kampus saya belum tersedia.</p>}
      {at('count') && <Bubble from="me">{a.scopeLabel}</Bubble>}

      {at('count') && <Bubble><b>Berapa PDF yang mau kamu kirim?</b></Bubble>}
      {step === 'count' && <Chips options={[...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })), { value: 'many', label: 'Lebih dari 5' }]} onPick={pickCount} />}
      {at('files') && step !== 'many' && <Bubble from="me">{a.countLabel} PDF</Bubble>}

      {step === 'many' && (
        <>
          <Bubble from="me">Lebih dari 5</Bubble>
          <Bubble>
            Untuk lebih dari 5 PDF, kirim filenya lewat WhatsApp admin ya. Pesannya sudah aku isi. Admin akan mencatat pengajuanmu supaya tetap muncul di status pengajuan.
            <div className="mt-3">
              <a href={waLink(waNumber, manyPdfMessage({ ...a, hasKey: a.hasKey === 'yes', subjectName: a.subjectLabel }, me))} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm"><MessageCircle size={16} /> Kirim lewat WhatsApp</a>
            </div>
            {!waNumber && <p className="mt-2 text-xs text-coral">Nomor WhatsApp admin belum diatur.</p>}
          </Bubble>
        </>
      )}

      {at('files') && step !== 'many' && step !== 'sent' && (
        <Bubble wide>
          {busy && !draft ? 'Menyiapkan tempat unggah...' : (
            <div className="space-y-3">
              <p>Unggah PDF-nya di sini. Boleh sekaligus atau satu per satu, maksimal 5 file, masing-masing paling besar {maxMb} MB.</p>
              <label className="chat-drop">
                <FileUp className="text-brand" aria-hidden />
                <span className="text-sm font-semibold">Pilih PDF</span>
                <span className="text-xs text-ink-muted">PDF, maks. {maxMb} MB per file</span>
                <input type="file" accept="application/pdf,.pdf" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} disabled={!draft} />
              </label>
              <ul className="space-y-1.5">
                {(draft?.files || []).map((f) => (
                  <li key={f.id} className="chat-file">
                    <FileText size={16} className="text-brand" aria-hidden /><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="text-xs text-ink-muted">{(f.size / 1048576).toFixed(1)} MB</span>
                    <button type="button" onClick={() => removeFile(f)} className="rounded p-1 text-ink-muted hover:text-coral" aria-label={`Hapus ${f.name}`}><Trash2 size={15} /></button>
                  </li>
                ))}
                {uploads.map((u) => (
                  <li key={u.key} className={clsx('chat-file', u.error && 'is-error')}>
                    <FileText size={16} aria-hidden /><span className="min-w-0 flex-1 truncate">{u.name}</span>
                    <span className="text-xs">{u.error || `${Math.round(u.progress * 100)}%`}</span>
                    {u.error && <button type="button" onClick={() => setUploads((l) => l.filter((x) => x.key !== u.key))} aria-label="Tutup"><X size={14} /></button>}
                  </li>
                ))}
              </ul>
              {draft?.files?.length > 0 && step === 'files' && <button type="button" className="btn-primary btn-sm" onClick={() => setStep('summary')}>Lanjut ke ringkasan</button>}
            </div>
          )}
        </Bubble>
      )}

      {step === 'summary' && draft && (
        <Bubble wide>
          <p className="font-semibold">Ringkasan pengajuan</p>
          <dl className="chat-summary">
            <dt>Mata kuliah</dt><dd>{draft.subjectName}</dd>
            <dt>Kunci & pembahasan</dt><dd>{draft.hasKey ? 'Sudah ada di PDF' : 'Belum ada'}</dd>
            <dt>Bahasa</dt><dd>{a.languageLabel}</dd>
            <dt>Dapat dilihat</dt><dd>{draft.scope === 'campus' ? `Hanya pengguna ${draft.campusName}` : 'Pengguna semua kampus'}</dd>
            <dt>File</dt><dd>{draft.files.map((f) => f.name).join(', ')}</dd>
            <dt>Antrean</dt><dd>{draft.queue?.pdfAhead || 0} PDF di depan. Perkiraan selesai sekitar <b>{draft.queue?.estimateDays} hari</b> setelah dikonfirmasi (paling lama sekitar 5 hari). Ini perkiraan, bukan janji.</dd>
          </dl>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Saya berhak membagikan isi PDF ini untuk keperluan belajar, dan setuju admin boleh menolaknya bila melanggar <Link to="/kebijakan-privasi" className="underline">hak cipta</Link>.</span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={send} disabled={!agree || busy}>{busy ? 'Mengirim...' : 'Kirim pengajuan'}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setStep('files')}>Ubah file</button>
          </div>
        </Bubble>
      )}

      {step === 'sent' && sent && (
        <>
          <Bubble from="me">Kirim pengajuan</Bubble>
          <Bubble wide>
            <p>Pengajuan <b>{sent.code}</b> tercatat dengan status <b>Menunggu konfirmasi</b>. Satu langkah lagi: konfirmasi ke admin lewat WhatsApp supaya pengajuanmu masuk antrean.</p>
            <p className="mt-1 text-sm text-ink-muted">Pengajuan yang tidak dikonfirmasi dalam {settings?.confirmDays || 3} hari akan kedaluwarsa dan filenya dihapus.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={waLink(waNumber, confirmMessage(sent, me))} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm"><MessageCircle size={16} /> Konfirmasi lewat WhatsApp</a>
            </div>
            {!waNumber && <p className="mt-2 text-xs text-coral">Nomor WhatsApp admin belum diatur.</p>}
          </Bubble>
        </>
      )}

      {error && <div className="chat-aside"><Alert>{error}</Alert></div>}
      {!left && (
        <Chips
          label="Pilihan lain"
          options={step === 'sent'
            ? [{ value: 'status', label: 'Lihat status pengajuan', icon: ListChecks, tone: 'lilac' }, { value: 'menu', label: 'Ada hal lain', icon: MessageCircle, tone: 'sky' }]
            : [{ value: 'restart', label: 'Ulangi dari awal', icon: RotateCcw }, { value: 'menu', label: 'Batal, ke menu', icon: X }]}
          onPick={(o) => {
            if (o.value === 'restart') restart();
            else if (o.value === 'status') leave(() => onStatus(o.label));
            else leave(() => onMenu(o.label));
          }}
        />
      )}
    </>
  );
}

function MyRequests() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const { me, settings } = useAuth();
  const load = () => api('submissions/mine').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const cancel = async (s) => {
    if (!window.confirm(`Batalkan pengajuan ${s.code}?`)) return;
    try { await api(`submissions/${s.id}/cancel`, { method: 'POST', body: {} }); load(); } catch (e) { setError(e.message); }
  };
  if (error) return <Alert>{error}</Alert>;
  if (!items) return <Spinner />;
  if (!items.length) return <p>Kamu belum pernah mengajukan soal. Kalau punya PDF soal, pilih <b>Upload soal PDF</b> ya.</p>;
  return (
    <div className="space-y-2">
      <p>Ini pengajuan soalmu, dari yang terbaru:</p>
      {items.map((s) => (
        <SubmissionCard key={s.id} s={s}>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.status === 'menunggu_konfirmasi' && (
              <a href={waLink(settings?.adminWhatsapp, confirmMessage(s, me))} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm"><MessageCircle size={15} /> Konfirmasi lewat WhatsApp</a>
            )}
            {['menunggu_konfirmasi', 'antre'].includes(s.status) && <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => cancel(s)}>Batalkan</button>}
          </div>
        </SubmissionCard>
      ))}
    </div>
  );
}

const MENU = [
  { value: 'upload', label: 'Upload soal PDF', icon: FileUp, tone: 'mint' },
  { value: 'question', label: 'Tanya admin', icon: CircleHelp, tone: 'sky' },
  { value: 'problem', label: 'Laporkan kendala', icon: TriangleAlert, tone: 'rose' },
  { value: 'feedback', label: 'Kasih saran', icon: Lightbulb, tone: 'sun' },
  { value: 'status', label: 'Cek status pengajuanku', icon: ListChecks, tone: 'lilac' },
  { value: 'wa', label: 'Chat WhatsApp admin', icon: MessageCircle, tone: 'wa' },
];

const PROMPTS = {
  question: 'Boleh! Tulis pertanyaanmu di kolom bawah. Pesannya langsung masuk ke admin MEDCOEL, dan balasannya muncul di sini saat admin membalas.',
  problem: 'Waduh, maaf ya. Ceritakan kendalanya di kolom bawah: di halaman apa, apa yang kamu lakukan, lalu apa yang terjadi. Admin akan membalas di sini.',
  feedback: 'Senang banget dengar masukanmu. Tulis saran atau idemu di kolom bawah, nanti dibaca langsung oleh admin.',
};

let seq = 0;
const nid = () => `e${++seq}`;

export function ChatAdminBody({ compact = false }) {
  const { me, settings } = useAuth();
  const support = useSupportThread();
  const [events, setEvents] = useState(() => [{ id: nid(), kind: 'menu', intro: true }]);
  const [history, setHistory] = useState(null); // { ids:Set, max:string } setelah muatan pertama
  const [category, setCategory] = useState('question');
  const acked = useRef(false);
  const timers = useRef([]);
  const scroller = useStickToBottom();
  const input = useRef(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Pesan admin yang datang selama sesi ini masuk ke utas sesuai urutan datang.
  useEffect(() => {
    if (support.loading) return;
    if (!history) {
      setHistory({ ids: new Set(support.items.map((m) => m.id)), max: support.items.at(-1)?.created || '' });
      return;
    }
    setEvents((ev) => {
      const known = new Set(ev.filter((e) => e.kind === 'msg').map((e) => e.msgId));
      const fresh = support.items.filter((m) => !history.ids.has(m.id) && !known.has(m.id) && m.created >= history.max);
      return fresh.length ? [...ev, ...fresh.map((m) => ({ id: `m-${m.id}`, kind: 'msg', msgId: m.id }))] : ev;
    });
  }, [support.loading, support.items, history]);

  const byId = useMemo(() => new Map(support.items.map((m) => [m.id, m])), [support.items]);
  const liveIds = useMemo(() => new Set(events.filter((e) => e.kind === 'msg').map((e) => e.msgId)), [events]);
  const past = history ? support.items.filter((m) => !liveIds.has(m.id)) : [];

  const push = useCallback((list) => setEvents((ev) => [...ev, ...list.map((x) => ({ id: nid(), ...x }))]), []);
  // Balasan asisten muncul setelah indikator mengetik singkat.
  const say = useCallback((list, after) => {
    const typing = { id: nid(), kind: 'typing' };
    const items = list.map((x) => ({ id: nid(), ...x }));
    setEvents((ev) => [...ev, typing]);
    const t = setTimeout(() => {
      setEvents((ev) => [...ev.filter((e) => e.id !== typing.id), ...items]);
      after?.();
    }, reduceMotion() ? 0 : 550);
    timers.current.push(t);
  }, []);

  const pick = (menuId, o) => {
    scroller.toBottom();
    setEvents((ev) => [...ev.map((e) => (e.id === menuId ? { ...e, picked: o.value } : e)), { id: nid(), kind: 'user', text: o.label }]);
    if (o.value === 'upload') {
      if (settings && !settings.submissionsOpen) say([{ kind: 'bot', key: 'closed' }, { kind: 'menu' }]);
      else say([{ kind: 'upload' }]);
    } else if (PROMPTS[o.value]) {
      setCategory(o.value);
      acked.current = false;
      say([{ kind: 'bot', key: o.value }], () => input.current?.focus());
    } else if (o.value === 'status') {
      say([{ kind: 'status' }, { kind: 'menu' }]);
    } else if (o.value === 'wa') {
      say([{ kind: 'wa' }, { kind: 'menu' }]);
    }
  };

  const onSend = async (text) => {
    scroller.toBottom();
    await support.send(text, category);
    if (!acked.current) {
      acked.current = true;
      say([{ kind: 'bot', key: 'sent' }, { kind: 'menu' }]);
    }
  };

  const lastMenu = [...events].reverse().find((e) => e.kind === 'menu')?.id;
  const firstName = (me?.name || '').trim().split(/\s+/)[0];
  const waHello = `Halo Admin MEDCOEL, saya ${me?.name || ''}${me?.loginId ? ` (${me.loginId})` : ''}. `;

  const renderEvent = (e) => {
    switch (e.kind) {
      case 'typing': return <Typing key={e.id} />;
      case 'user': return <Bubble key={e.id} from="me">{e.text}</Bubble>;
      case 'msg': {
        const m = byId.get(e.msgId);
        return m ? <SupportMessage key={e.id} m={m} mine={m.senderRole !== 'admin'} /> : null;
      }
      case 'menu': {
        const active = e.id === lastMenu && !e.picked;
        return (
          <div key={e.id} className="contents">
            {e.intro ? (past.length > 0 && <Bubble>Mau lanjut tanya admin, atau ada yang lain?</Bubble>) : <Bubble>Ada lagi yang bisa aku bantu?</Bubble>}
            {active && <Chips options={MENU} onPick={(o) => pick(e.id, o)} />}
          </div>
        );
      }
      case 'upload':
        return (
          <div key={e.id} className="contents">
            <UploadFlow
              onStatus={(label) => { scroller.toBottom(); push([{ kind: 'user', text: label }]); say([{ kind: 'status' }, { kind: 'menu' }]); }}
              onMenu={(label) => { scroller.toBottom(); push([{ kind: 'user', text: label }]); say([{ kind: 'menu' }]); }}
            />
          </div>
        );
      case 'status': return <Bubble key={e.id} wide><MyRequests /></Bubble>;
      case 'wa':
        return (
          <Bubble key={e.id}>
            Untuk hal yang perlu cepat, langsung chat admin di WhatsApp ya.
            <div className="mt-3"><a href={waLink(settings?.adminWhatsapp, waHello)} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm"><MessageCircle size={16} /> Buka WhatsApp admin</a></div>
            {!settings?.adminWhatsapp && <p className="mt-2 text-xs text-coral">Nomor WhatsApp admin belum diatur.</p>}
          </Bubble>
        );
      case 'bot':
        if (e.key === 'closed') return <Bubble key={e.id}>Maaf, pengajuan soal sedang ditutup sementara karena antrean penuh. Coba lagi beberapa hari lagi, atau tanya admin dulu.</Bubble>;
        if (e.key === 'sent') return <Bubble key={e.id}>Pesanmu sudah masuk ke admin MEDCOEL. Balasannya muncul di sini saat admin membalas, jadi kamu boleh tutup chat ini dulu.</Bubble>;
        return <Bubble key={e.id}>{PROMPTS[e.key]}</Bubble>;
      default: return null;
    }
  };

  return (
    <div className={clsx('chat-shell', compact && 'is-compact')}>
      <div
        ref={scroller.ref}
        className="chat-thread tex-grid"
        role="log"
        aria-label="Percakapan Chat Admin"
        aria-live="polite"
      >
        <div className="chat-thread-inner">
          <p className="chat-day"><span>Chat Admin MEDCOEL</span></p>
          <Bubble>
            <span className="hand chat-hello">Halo{firstName ? `, ${firstName}` : ''}! 👋</span>
            Aku asisten Chat Admin MEDCOEL. Mau ngapain hari ini? Pilih salah satu di bawah, atau langsung tulis pesan untuk admin.
          </Bubble>
          {past.length > 0 && (
            <>
              <Bubble>Ini percakapanmu dengan admin sebelumnya. Balasan baru juga akan muncul di sini.</Bubble>
              {support.older && <button type="button" onClick={() => { scroller.release(); support.loadOlder(); }} disabled={support.loadingOlder} className="chat-older">{support.loadingOlder ? 'Memuat...' : 'Muat pesan sebelumnya'}</button>}
              {past.map((m) => <SupportMessage key={m.id} m={m} mine={m.senderRole !== 'admin'} />)}
              <p className="chat-day"><span>Sekarang</span></p>
            </>
          )}
          {events.map(renderEvent)}
        </div>
      </div>
      {support.loadError && (
        <div className="chat-load-error">
          <Alert>{support.loadError}</Alert>
          <button type="button" className="mt-1 text-sm font-semibold text-brand underline" onClick={support.retry}>Muat ulang percakapan</button>
        </div>
      )}
      <Composer
        onSend={onSend}
        inputRef={input}
        disabled={support.loading}
        placeholder="Tulis pesan untuk admin…"
        note={<>Pesanmu hanya terlihat olehmu dan admin. <Link to="/kebijakan-privasi" className="underline">Kebijakan privasi</Link></>}
      >
        <div className="chat-category">
          <label htmlFor={compact ? 'chat-cat-compact' : 'chat-cat'}>Dikirim sebagai</label>
          <select id={compact ? 'chat-cat-compact' : 'chat-cat'} value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </Composer>
    </div>
  );
}

export default function ChatAdmin() {
  return (
    <div className="chat-admin-page mx-auto max-w-3xl">
      <div className="mb-5">
        <p className="eyebrow">Bantuan</p>
        <h1 className="page-title mt-1">Chat Admin</h1>
        <p className="mt-1 text-ink-muted">Upload PDF soal, tanya admin, laporkan kendala, atau kasih masukan. Semua lewat obrolan ini.</p>
      </div>
      <ChatAdminBody />
    </div>
  );
}
