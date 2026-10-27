// Menampilkan bidang konten soal/pembahasan: teks biasa atau daftar blok
// (paragraf, judul, daftar, tabel, gambar, kotak catatan, rumus, tautan).
// Lihat docs/FORMAT_SOAL.md untuk kontraknya.
import DOMPurify from 'dompurify';
import { AlertTriangle, Info, Lightbulb, Star } from 'lucide-react';
import { useState } from 'react';
import { driveToLh3, markupToHtml } from '@/lib/markup';

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'mark', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'img', 'a', 'small', 'code', 'blockquote', 'hr', 'h3', 'h4', 'caption'];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'loading', 'class', 'width'];

let hooked = false;
function sanitize(html) {
  if (!hooked) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      if (node.tagName === 'IMG') {
        const src = node.getAttribute('src') || '';
        node.setAttribute('src', driveToLh3(src));
        node.setAttribute('referrerpolicy', 'no-referrer');
        node.setAttribute('loading', 'lazy');
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false });
}

export function Html({ text, as: Tag = 'span', className = '', marks = false }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: sanitize(markupToHtml(text, { marksInHtml: marks })) }} />;
}

function Img({ url, caption, width }) {
  const [broken, setBroken] = useState(false);
  const src = driveToLh3(url);
  if (broken) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="my-2 block text-sm text-ink-muted underline break-all">
        Gambar tidak bisa dimuat. Buka langsung: {src}
      </a>
    );
  }
  return (
    <figure className="my-3" style={width ? { maxWidth: `${width}%` } : undefined}>
      <a href={src} target="_blank" rel="noopener noreferrer" title="Buka ukuran penuh">
        <img
          src={src}
          alt={caption || 'Gambar soal'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="max-h-[28rem] w-auto max-w-full rounded-xl border border-line bg-page"
        />
      </a>
      {caption && <figcaption className="mt-1.5 text-sm text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}

const NOTE = {
  highyield: { cls: 'bg-gold-soft border-gold', icon: Star, title: 'High-yield' },
  warning: { cls: 'bg-coral-soft border-coral/50', icon: AlertTriangle, title: 'Perhatian' },
  tip: { cls: 'bg-brand-soft border-brand/40', icon: Lightbulb, title: 'Tips' },
  info: { cls: 'bg-academic-soft border-academic/40', icon: Info, title: 'Catatan' },
};

function Block({ b }) {
  switch (b.type) {
    case 'paragraph':
      return <Html as="p" text={b.text} />;
    case 'heading':
      return <Html as="h4" text={b.text} />;
    case 'formula':
      return <Html as="p" text={b.text} className="my-2 rounded-lg bg-page px-3 py-2 font-mono text-[15px]" />;
    case 'link':
      return (
        <p><a href={b.url} target="_blank" rel="noopener noreferrer">{b.text || b.url}</a></p>
      );
    case 'image':
      return <Img url={b.url} caption={b.caption} width={b.width} />;
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return (
        <Tag>
          {b.items.map((it, i) => <li key={i}><Content value={it} inline /></li>)}
        </Tag>
      );
    }
    case 'table': {
      const headRow = b.header === 'row' || b.header === 'both';
      const headCol = b.header === 'column' || b.header === 'both';
      const rows = b.rows || [];
      const body = headRow ? rows.slice(1) : rows;
      const cell = (c, ri, ci, forceHead) => {
        const Tag = forceHead || (headCol && ci === 0) ? 'th' : 'td';
        return (
          <Tag key={ci} scope={forceHead ? 'col' : headCol && ci === 0 ? 'row' : undefined}>
            {c.image && <Img url={c.image} caption={c.caption} />}
            <Content value={c.text} inline />
          </Tag>
        );
      };
      return (
        <div className="scroll-x my-3 rounded-xl border border-line">
          <table>
            {b.caption && <caption className="caption-bottom p-2 text-sm text-ink-muted">{b.caption}</caption>}
            {headRow && rows[0] && <thead><tr>{rows[0].map((c, ci) => cell(c, 0, ci, true))}</tr></thead>}
            <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => cell(c, ri, ci, false))}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    case 'note': {
      const n = NOTE[b.variant] || NOTE.info;
      const Icon = n.icon;
      return (
        <div className={`my-3 rounded-xl border-l-4 p-3 ${n.cls}`}>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Icon size={16} aria-hidden /> {b.title || n.title}</p>
          <Content value={b.content} />
        </div>
      );
    }
    default:
      return b.text ? <Html as="p" text={b.text} /> : null;
  }
}

// value: string | Block[]
export function Content({ value, inline = false, marks = false }) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') {
    return inline ? <Html text={String(value)} marks={marks} /> : <Html as="div" text={String(value)} marks={marks} />;
  }
  if (!Array.isArray(value)) return null;
  return <>{value.map((b, i) => <Block key={i} b={b} />)}</>;
}

export default function RichContent({ value, className = '', marks = false }) {
  return <div className={`rich ${className}`}><Content value={value} marks={marks} /></div>;
}
