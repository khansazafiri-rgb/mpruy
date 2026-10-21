import { FileText } from 'lucide-react';
import { SUB_STATUS, SUB_STATUS_CLASS } from '@/lib/labels';
import { fmtDate } from '@/lib/time';
import { Badge } from './ui';

export default function SubmissionCard({ s, children }) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-muted">{s.code}</p>
          <p className="font-semibold">{s.subjectName}</p>
        </div>
        <Badge className={SUB_STATUS_CLASS[s.status]}>{SUB_STATUS[s.status] || s.status}</Badge>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted"><FileText size={14} /> {s.pdfCount} PDF · diajukan {fmtDate(s.submittedAt || s.created)}</p>
      {s.queue && (s.status === 'antre' || s.status === 'menunggu_konfirmasi') && (
        <p className="mt-2 text-sm">
          {s.status === 'antre' ? `${s.queue.pdfAhead} PDF di depanmu. ` : ''}
          Perkiraan selesai sekitar <b>{s.queue.estimateDays} hari</b>{s.status === 'menunggu_konfirmasi' ? ' setelah dikonfirmasi' : ''}.
        </p>
      )}
      {s.status === 'selesai' && <p className="mt-2 text-sm text-brand-dark">{s.importedCount} soal sudah tayang.</p>}
      {s.statusNote && ['perlu_perbaikan', 'dibatalkan'].includes(s.status) && <p className="mt-2 rounded-lg bg-page p-2 text-sm">{s.statusNote}</p>}
      {children}
    </div>
  );
}
