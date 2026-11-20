// Host bridge for an independently built studio. The studio never receives auth tokens: the host passes only the
// validated launch context over a MessageChannel after a same-origin handshake. Standalone (no parent) = local preview.
export function connectHost({ studioId, onLaunch, alsoAccept = [] }) {
  const origin = window.location.origin;
  let port = null;
  const post = (type, payload = {}) => { if (port) port.postMessage({ v: 1, type, at: Date.now(), payload }); };
  function onMessage(event) {
    if (event.origin !== origin || event.source !== window.parent || event.data?.v !== 1 || event.data?.type !== 'host.launch' || !event.ports?.length || port) return;
    const launch = event.data.launch;
    // "test-" ids exist only in dev-mode test catalogs (server side); production launches use the canonical id.
    if (!launch || (launch.studioId !== studioId && !alsoAccept.includes(launch.studioId))) return;
    port = event.ports[0];
    window.removeEventListener('message', onMessage);
    onLaunch(sanitizeLaunch(launch), post);
  }
  window.addEventListener('message', onMessage);
  window.addEventListener('pagehide', () => { port?.close(); port = null; });
  if (window.parent !== window) window.parent.postMessage({ v: 1, type: 'studio.hello' }, origin);
  else onLaunch(sanitizeLaunch({ studioId, releaseId: 'local-preview', mode: new URLSearchParams(location.search).get('mode') || 'explore', language: 'id', standalone: true }), post);
  return { post };
}

/** Only known, bounded fields survive; unknown modes fall back to explore. */
export function sanitizeLaunch(l) {
  const mode = ['explore', 'guided', 'challenge'].includes(l?.mode) ? l.mode : 'explore';
  return { studioId: String(l?.studioId || ''), releaseId: String(l?.releaseId || ''), mode, language: l?.language === 'en' ? 'en' : 'id', standalone: l?.standalone === true };
}
