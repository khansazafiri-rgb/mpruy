// "Cek akun": kenapa menu Kampusmu (Drilling) tidak tampil untuk satu pengguna. Menunjukkan sakelar, kampus akun,
// dan tiap pengajuannya (materi/soal tersimpan, tayang, atau tidak) beserta alasannya dalam bahasa biasa.
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge } from '@/components/ui';
import { api, errorText } from '@/lib/api';

const STATUS = { selesai: 'Selesai', antre: 'Antre', diproses: 'Diproses', perlu_perbaikan: 'Perlu perbaikan', menunggu_konfirmasi: 'Menunggu konfirmasi', dibatalkan: 'Dibatalkan', draft: 'Draf', kedaluwarsa: 'Kedaluwarsa' };

export default function DrillingCheck() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const look = async (value) => {
    const term = String(value ?? q).trim();
    if (!term) return;
    setBusy(true); setError(''); setRes(null);
    try { setRes(await api(`admin/drilling/check?user=${encodeURIComponent(term)}`)); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return (
    <section className="card space-y-3 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Cek akun: kenapa Kampusmu tidak muncul?</h2>
        <p className="mt-1 text-sm text-ink-muted">Isi ID masuk, email, atau nama siswa. Hasilnya menunjukkan apa yang terlihat olehnya dan alasannya bila tidak ada.</p>
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); look(); }}>
        <input className="input w-64 flex-1 py-2" placeholder="Contoh: nayyara.666" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ID masuk, email, atau nama" />
        <button type="submit" className="btn-secondary" disabled={busy || !q.trim()}><Search size={17} aria-hidden /> {busy ? 'Memeriksa...' : 'Cek'}</button>
      </form>
      <Alert>{error}</Alert>
      {res?.candidates && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Beberapa akun cocok, pilih salah satu:</p>
          <ul className="space-y-1.5">
            {res.candidates.map((c) => (
              <li key={c.id}><button type="button" className="btn-ghost btn-sm" onClick={() => { setQ(c.loginId || c.id); look(c.loginId || c.id); }}>{c.name} ({c.loginId || c.id}){c.campus ? ` · ${c.campus}` : ''}</button></li>
            ))}
          </ul>
        </div>
      )}
      {res?.user && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {res.visible ? <Badge className="bg-brand-soft text-brand-dark"><CheckCircle2 size={14} aria-hidden /> Menu Kampusmu tampil</Badge> : <Badge className="bg-coral-soft text-coral"><XCircle size={14} aria-hidden /> Menu Kampusmu TIDAK tampil</Badge>}
            <span className="text-sm text-ink-muted">{res.user.name} ({res.user.loginId}) · {res.user.campus || 'kampus belum diisi'} · terlihat: {res.deckCount} materi, {res.questionCount} soal</span>
          </div>
          {res.reasons.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{res.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          {res.submissions.length === 0 ? <p className="text-sm text-ink-muted">Akun ini belum pernah mengajukan apa pun.</p> : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {res.submissions.map((s) => (
                <li key={s.code} className="space-y-1 p-3 text-sm">
                  <p className="font-semibold">{s.code} <span className="font-normal text-ink-muted">· {s.kind === 'materi' ? 'PPT materi' : 'Soal'} · {s.subject} · {STATUS[s.status] || s.status} · {s.scope === 'campus' ? `hanya ${s.campus || 'kampus pengaju'}` : 'General'}</span></p>
                  <p className="text-ink-muted">{s.decks.length} materi tersimpan · {s.questions} soal tayang</p>
                  {s.decks.map((d) => (
                    <p key={d.title} className="flex items-center gap-1.5">
                      {d.visible ? <CheckCircle2 size={14} className="text-brand" aria-hidden /> : <XCircle size={14} className="text-coral" aria-hidden />}
                      <span>{d.title}</span><span className="text-ink-muted">· {d.status === 'published' ? 'tayang' : 'draf'} · {d.scope === 'campus' ? `khusus ${d.campuses.join(', ')}` : 'General'}</span>
                    </p>
                  ))}
                  {s.notes.map((n) => <p key={n} className="text-coral">{n}</p>)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
