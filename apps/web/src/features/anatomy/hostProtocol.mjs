export const ANATOMY_VIEWER_PATH = '/anatomy/viewer/';
export function acceptsAtlasMessage(event, origin, viewerWindow) {
  return !!viewerWindow && event.origin === origin && event.source === viewerWindow &&
    event.data?.version === 1 && ['medcoel:anatomy-ready','medcoel:anatomy-error'].includes(event.data?.type);
}
export function atlasFrameSrc(hash = '') {
  const params = new globalThis.URLSearchParams(hash.replace(/^#/,''));
  return ANATOMY_VIEWER_PATH + (params.has('atlas') ? '#atlas=' + encodeURIComponent(params.get('atlas')) : '');
}
// Tells the atlas where its "back" link goes, so the 3D page needs no second header from the host.
// The atlas only accepts plain path characters, so ( ) ! ' * (left as is by encodeURIComponent) are escaped.
export function withBackLink(src, back) {
  if (!back?.path) return src;
  const path = String(back.path).replace(/[()!'*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const [base, hash = ''] = src.split('#');
  const query = 'back=' + encodeURIComponent(path) + (back.label ? '&backLabel=' + encodeURIComponent(String(back.label).slice(0, 40)) : '');
  return base + (base.includes('?') ? '&' : '?') + query + (hash ? '#' + hash : '');
}
