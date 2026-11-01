// Lifecycle status only. No account data or auth tokens cross the frame boundary.
export function reportAtlasStatus(status) {
  if (window.parent === window) return;
  window.parent.postMessage({type:status === 'ready' ? 'medcoel:anatomy-ready' : 'medcoel:anatomy-error',version:1},window.location.origin);
}
export function hostedShareUrl(viewerUrl) {
  if (window.parent === window) return viewerUrl;
  const source=new URL(viewerUrl);
  const host=new URL('/anatomy',window.location.origin);
  host.hash=source.hash;
  return host.href;
}
