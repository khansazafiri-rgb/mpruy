import { useState } from 'react';
import { api } from '@/lib/api';
import { REPORT_REASON } from '@/lib/labels';
import { Alert, Modal } from './ui';

export default function ReportDialog({ questionId, onClose }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setError('');
    try {
      await api(`questions/${questionId}/report`, { method: 'POST', body: { reason, note } });
      setDone(true);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Laporkan soal" onClose={onClose} size="sm" footer={done ? (
      <button type="button" className="btn-primary" onClick={onClose}>Tutup</button>
    ) : (<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={send} disabled={!reason || busy}>{busy ? 'Mengirim...' : 'Kirim laporan'}</button>
    </>)}>
      {done ? (
        <Alert kind="success">Terima kasih. Laporanmu sudah masuk dan kamu akan dapat notifikasi saat selesai ditangani admin.</Alert>
      ) : (
        <div className="space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="label">Apa masalahnya?</legend>
            {Object.entries(REPORT_REASON).map(([k, v]) => (
              <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${reason === k ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} className="accent-[rgb(var(--brand))]" /> {v}
              </label>
            ))}
          </fieldset>
          <div>
            <label htmlFor="note" className="label">Keterangan {reason === 'lainnya' ? '' : '(opsional)'}</label>
            <textarea id="note" className="input min-h-[80px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: kunci seharusnya C karena ..." />
          </div>
          <Alert>{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
