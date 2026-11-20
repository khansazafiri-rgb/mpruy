// Small DOM helpers shared by the studio shells (no framework; each studio is its own tiny app).
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}
export const MODE_LABEL = { explore: 'Explore', guided: 'Guided', challenge: 'Challenge' };

/** Standard studio frame: identity, data-status banner, workspace, side panel, status line. */
export function studioFrame({ title, modality, mode, dataNotice }) {
  const status = el('p', { class: 'studio-status', role: 'status', 'aria-live': 'polite', 'data-testid': 'studio-status' }, 'Memuat…');
  const panel = el('aside', { class: 'studio-panel', 'aria-label': 'Panel belajar' });
  const workspace = el('main', { class: 'studio-workspace' });
  const header = el('header', { class: 'studio-head' },
    el('div', {}, el('p', { class: 'studio-eyebrow' }, 'MEDCOEL Clinical Studio · ' + modality), el('h1', {}, title)),
    el('span', { class: 'studio-mode', 'data-mode': mode }, MODE_LABEL[mode] || mode));
  const notice = el('p', { class: 'studio-notice', role: 'note' }, dataNotice);
  document.body.append(el('div', { class: 'studio' }, header, notice, el('div', { class: 'studio-body' }, workspace, panel), status));
  return { status: t => { status.textContent = t; }, panel, workspace, notice };
}
