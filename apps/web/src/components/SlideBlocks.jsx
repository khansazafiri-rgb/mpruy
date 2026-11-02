// Penjelasan satu slide materi (blok dari pb_hooks/lib/slides.js). Daftar bersarang tampil rapi: nomor di kiri
// dengan jorokan gantung, anak butir menjorok lebih dalam dan berganti huruf lalu angka romawi.
import clsx from 'clsx';
import { AlertTriangle, Check, Info, Lightbulb, Microscope, Square, Star, Stethoscope } from 'lucide-react';
import { Html } from '@/components/RichContent';
import '@/styles/notes.css';
import '@/styles/deck.css';

const CALLOUT = {
  klinis: { icon: Stethoscope, title: 'Korelasi klinis' },
  warning: { icon: AlertTriangle, title: 'Jebakan ujian' },
  highyield: { icon: Star, title: 'High-yield' },
  tip: { icon: Lightbulb, title: 'Tips mengingat' },
  praktikum: { icon: Microscope, title: 'Clue praktikum' },
  info: { icon: Info, title: 'Catatan' },
};

function Inline({ text, as = 'span', className }) {
  return <Html as={as} text={text} marks className={className} />;
}

function List({ block, depth = 0 }) {
  const Tag = block.style === 'number' || block.style === 'alpha' ? 'ol' : 'ul';
  const check = block.style === 'check';
  return (
    <Tag className={clsx('deck-list', `is-${block.style}`)} data-depth={Math.min(depth, 4)} start={block.style === 'number' && block.start > 1 ? block.start : undefined}>
      {block.items.map((it, i) => (
        <li key={i} className={clsx(check && 'deck-check', check && it.checked && 'is-done')}>
          {check && <span className="deck-check-box" aria-hidden>{it.checked ? <Check size={13} /> : <Square size={13} />}</span>}
          <span className="deck-li-body">
            {it.text && <Inline text={it.text} className="deck-li-text" />}
            {(it.children || []).map((c, j) => <List key={j} block={c} depth={depth + 1} />)}
          </span>
        </li>
      ))}
    </Tag>
  );
}

function Callout({ block }) {
  const c = CALLOUT[block.kind] || CALLOUT.info;
  const Icon = c.icon;
  return (
    <aside className={clsx('notes-callout deck-callout', `is-${block.kind}`)}>
      <p className="notes-callout-head">
        <span className="notes-callout-ico">{block.icon ? <span aria-hidden>{block.icon}</span> : <Icon size={16} aria-hidden />}</span>
        {block.title || c.title}
      </p>
      <div className="notes-callout-body"><Blocks blocks={block.blocks || []} nested /></div>
    </aside>
  );
}

function Blocks({ blocks, nested = false }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'heading': {
        const H = b.level === 1 ? 'h3' : b.level === 2 ? 'h4' : 'h5';
        return <H key={i} className={clsx('deck-h', `is-${b.level}`)}><Inline text={b.text} /></H>;
      }
      case 'paragraph':
        return <Inline key={i} as="p" text={b.text} className={clsx('deck-p', nested && 'is-nested')} />;
      case 'quote':
        return <blockquote key={i} className="deck-quote"><Inline text={b.text} /></blockquote>;
      case 'list':
        return <List key={i} block={b} />;
      case 'callout':
        return <Callout key={i} block={b} />;
      case 'divider':
        return <hr key={i} className="deck-hr" />;
      case 'table':
        return (
          <div key={i} className="deck-table" tabIndex={0} role="region" aria-label="Tabel">
            <table>
              <thead><tr>{b.headers.map((h, j) => <th key={j}><Inline text={h} /></th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Inline text={c} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  });
}

// `indent` pada paragraf diterapkan lewat atribut data supaya CSS mengatur jaraknya.
function Indented({ blocks }) {
  return blocks.map((b, i) => (b.type === 'paragraph' && b.indent
    ? <div key={i} className="deck-indent" data-indent={b.indent}><Blocks blocks={[b]} /></div>
    : <Blocks key={i} blocks={[b]} />));
}

export default function SlideBlocks({ blocks, className }) {
  if (!blocks?.length) return null;
  return <div className={clsx('deck-body', className)}><Indented blocks={blocks} /></div>;
}
