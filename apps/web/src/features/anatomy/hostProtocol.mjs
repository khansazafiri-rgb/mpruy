export const ANATOMY_VIEWER_PATH = '/anatomy/viewer/';
export function acceptsAtlasMessage(event, origin, viewerWindow) {
  return !!viewerWindow && event.origin === origin && event.source === viewerWindow &&
    event.data?.version === 1 && ['medcoel:anatomy-ready','medcoel:anatomy-error'].includes(event.data?.type);
}
export function atlasFrameSrc(hash = '') {
  const params = new globalThis.URLSearchParams(hash.replace(/^#/,''));
  return ANATOMY_VIEWER_PATH + (params.has('atlas') ? '#atlas=' + encodeURIComponent(params.get('atlas')) : '');
}
