import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SupportConversation from './SupportConversation';
import { Modal } from './ui';
export default function FloatingSupport() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  if (location.pathname === '/chat-admin') return null;
  return <><button type="button" className="floating-support" aria-label="Buka chat admin" aria-haspopup="dialog" onClick={() => setOpen(true)}><MessageCircle size={22} /><span>Butuh bantuan?</span></button><Modal open={open} title="Chat Admin" onClose={() => setOpen(false)} footer={<Link to="/chat-admin" onClick={() => setOpen(false)} className="btn-ghost btn-sm">Buka halaman chat & unggah PDF<ArrowUpRight size={14} /></Link>}>{open && <SupportConversation compact />}</Modal></>;
}
