// Pengumuman pop-up dari admin. Tampil setiap kali masuk atau memuat ulang
// halaman sampai pengguna menekan tombol silang. Tidak tertutup oleh klik di
// luar kotak atau tombol Escape. Beberapa pengumuman tampil satu per satu.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { driveToLh3 } from '@/lib/markup';
import { Html } from './RichContent';
import { Modal } from './ui';

export default function AnnouncementPopup() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api('announcements/active').then((d) => setItems(d.items || [])).catch(() => {});
  }, []);

  const current = items[0];
  if (!current) return null;

  const close = async () => {
    setItems((list) => list.slice(1));
    try { await api(`announcements/${current.id}/dismiss`, { method: 'POST', body: {} }); } catch { /* tetap tutup */ }
  };

  return (
    <Modal open title={current.title} onClose={close} dismissable={false} labelledBy="announcement-title">
      {current.imageUrl && (
        <img src={driveToLh3(current.imageUrl)} alt="" referrerPolicy="no-referrer" className="mx-auto mb-3 max-h-80 w-auto rounded-xl border border-line" />
      )}
      {current.body && <Html as="div" text={current.body} className="rich text-[15px]" />}
      {items.length > 1 && <p className="mt-3 text-xs text-ink-muted">Masih ada {items.length - 1} pengumuman lain.</p>}
    </Modal>
  );
}
