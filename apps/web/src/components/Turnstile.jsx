// Captcha gratis Cloudflare Turnstile. Tampil hanya bila admin mengisi
// TURNSTILE_SITE_KEY di server.
import { useEffect, useRef } from 'react';

let loader = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return loader;
}

export default function Turnstile({ siteKey, onToken }) {
  const el = useRef(null);
  const widget = useRef(null);
  useEffect(() => {
    if (!siteKey) return undefined;
    let alive = true;
    loadScript().then(() => {
      if (!alive || !el.current || !window.turnstile) return;
      widget.current = window.turnstile.render(el.current, {
        sitekey: siteKey,
        language: 'id',
        callback: (t) => onToken(t),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    }).catch(() => {});
    return () => {
      alive = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
    };
  }, [siteKey, onToken]);
  if (!siteKey) return null;
  return <div ref={el} className="min-h-[65px]" />;
}
