const normalize = (value) => String(value || '').normalize('NFKC').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLocaleLowerCase();

// Sorting by key keeps numbers stable even when a guide references sources in a new order.
export function citationIndex(sources = {}) {
  const entries = Object.values(sources).filter((s) => s?.key).sort((a, b) => a.key.localeCompare(b.key));
  const byTitle = new Map(entries.map((source, i) => [normalize(source.title), { ...source, number: i + 1 }]));
  return { entries: entries.map((source, i) => ({ ...source, number: i + 1 })), byTitle };
}

// Unknown markers stay visible as ordinary text; provenance is never silently dropped.
export function citationParts(value, index) {
  const text = String(value || ''), parts = []; let last = 0;
  for (const match of text.matchAll(/\[Sumber:\s*([^\]]+)\]/g)) {
    const names = match[1].split(';').map((name) => name.trim()).filter(Boolean);
    const sources = names.map((name) => index.byTitle.get(normalize(name)));
    const matched = names.length && sources.every(Boolean);
    const before = text.slice(last, match.index);
    if (before) parts.push({ type: 'text', value: matched ? before.replace(/[ \t]+$/, '') : before });
    if (matched) parts.push({ type: 'citations', sources: [...new Map(sources.map((source) => [source.key, source])).values()] });
    else parts.push({ type: 'text', value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length || !parts.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

export const citationAnchor = (moduleKey, sourceKey) => `${moduleKey}-source-${sourceKey}`;
