import clsx from 'clsx';
import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n';

export default function ScrollableNav({ items }) {
  const rail = useRef(null);
  const links = useRef(null);
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const [scroll, setScroll] = useState({ left: 0, max: 0, width: 0, total: 0 });

  const measure = () => {
    const el = rail.current;
    if (!el) return;
    const next = { left: el.scrollLeft, max: Math.max(0, el.scrollWidth - el.clientWidth), width: el.clientWidth, total: el.scrollWidth };
    setScroll((old) => Object.keys(next).every((key) => old[key] === next[key]) ? old : next);
  };

  useLayoutEffect(() => {
    const el = rail.current;
    el?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    measure();
    const observer = new ResizeObserver(measure);
    if (el) observer.observe(el);
    if (links.current) observer.observe(links.current);
    return () => observer.disconnect();
  }, [pathname, language, items.length]);

  const position = scroll.max ? Math.max(0, Math.min(100, scroll.left / scroll.max * 100)) : 0;
  const thumb = Math.max(24, scroll.total ? scroll.width * scroll.width / scroll.total : 24);
  return (
    <div className="app-nav-shell ml-3 hidden min-w-0 flex-1 lg:block">
      <p id="main-nav-hint" className="sr-only">{language === 'en' ? 'Scroll horizontally to see more menu items.' : 'Geser ke samping untuk melihat menu lain.'}</p>
      <nav id="main-navigation" ref={rail} className="app-nav-scroll" aria-label="Navigasi utama" aria-describedby="main-nav-hint" tabIndex={0} onScroll={measure}>
        <div ref={links} className="flex w-max items-center gap-1">
          {items.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('app-nav isolate font-medium transition-colors', isActive ? 'is-active' : 'text-ink-muted hover:bg-paper-2/60 hover:text-ink')}>
            {item.desk || item.label}
          </NavLink>)}
        </div>
      </nav>
      <input type="range" min={0} max={100} step={1} value={position} disabled={!scroll.max}
        className={clsx('app-nav-scrubber', !scroll.max && 'invisible')} style={{ '--nav-thumb-width': `${thumb}px` }}
        aria-label={language === 'en' ? 'Scroll main navigation' : 'Geser menu utama'} aria-controls="main-navigation" aria-valuetext={`${Math.round(position)}%`}
        onChange={(event) => { if (rail.current) rail.current.scrollLeft = Number(event.target.value) / 100 * scroll.max; measure(); }} />
    </div>
  );
}
