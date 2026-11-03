import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, Bone, Box, Brain, Check, ChevronRight, Eye, Heart, Keyboard, Layers,
  MousePointerClick, Search, Target,
} from 'lucide-react';
import Logo from '@/components/Logo';
import Mascot from '@/components/Mascot';
import MascotTip, { useMascotsOn } from '@/components/MascotTip';
import HumanAnatomy from './HumanAnatomy';
import { AnatomyDataProvider, useAnatomyLibrary } from '../features/anatomy/LibraryData';
import {
  REGIONS, SYSTEMS, browseStructures, filterStructures, normalise, relatedStructures, structureHref, exploreHref,
} from '../features/anatomy/registry.mjs';
import { PROGRESS_STATES, recordAnswer, setProgressStatus } from '../features/anatomy/libraryProgress.mjs';
import { STUDY_MODES, makeQuestion, evaluateStudyAttempt, studyScope } from '../features/anatomy/study.mjs';
import LibraryViewer from '../features/anatomy/LibraryViewer';
import StructureThumbnail from '../features/anatomy/StructureThumbnail';
import './AnatomyLibrary.css';

const SYSTEM_ICONS = {
  skeletal: Bone, muscular: Layers, joints: Layers, cardiovascular: Heart, nervous: Brain, lymphatic: Layers, visceral: Heart,
};
const MODE_ICONS = { identify: Eye, find: MousePointerClick };
const PROGRESS_LABELS = { NOT_STUDIED: 'Belum dipelajari', LEARNING: 'Sedang dipelajari', MASTERED: 'Dikuasai' };
const SIDE_LABELS = { left: 'kiri', right: 'kanan' };
const systemName = (id) => SYSTEMS.find((s) => s.id === id)?.name || '';
const regionName = (id) => REGIONS.find((r) => r.id === id)?.name || '';
const count = (n) => Number(n).toLocaleString('id-ID');

// The dataset often repeats the English name as the "Latin" one ("Humerus (right)" / "Humerus").
// Only show a Latin line when it adds something.
function latinOf(row) {
  if (!row.latin) return '';
  return normalise(row.latin) === normalise(row.name.replace(/\s*\((left|right)\)\s*$/, '')) ? '' : row.latin;
}
function cardSubtitle(row) {
  return latinOf(row) || row.regions.slice(0, 2).map(regionName).filter(Boolean).join(' · ') || systemName(row.system);
}

export default function AnatomyProduct() {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, '');
  const legacy = new URLSearchParams(location.hash.slice(1)).has('atlas') || new URLSearchParams(location.search).has('landmarks');
  if (path === '/anatomy' && legacy) return <HumanAnatomy back={{ path: '/anatomy', label: 'Anatomi' }} />;
  if (path === '/anatomy/explore') return <AnatomyDataProvider><Explore /></AnatomyDataProvider>;
  return (
    <AnatomyDataProvider>
      <LibraryShell>
        <Routes>
          <Route index element={<AnatomyLanding />} />
          <Route path="library" element={<LibraryCollection />} />
          <Route path="structure/:id" element={<StructurePage />} />
          <Route path="region/:regionId" element={<RegionPage />} />
          <Route path="system/:systemId" element={<SystemPage />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="*" element={<Missing />} />
        </Routes>
      </LibraryShell>
    </AnatomyDataProvider>
  );
}

function LibraryShell({ children }) {
  const { storageError } = useAnatomyLibrary();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.startsWith('/anatomy/structure/')) document.title = 'Anatomi Manusia | MEDCOEL';
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="anatomy-product">
      <header className="anatomy-product-header">
        <Link to="/anatomy" aria-label="Anatomi Manusia MEDCOEL"><Logo /></Link>
        <span className="anatomy-product-title">Anatomi Manusia</span>
        <nav aria-label="Navigasi anatomi">
          <NavLink end to="/anatomy">Ringkasan</NavLink>
          <NavLink to="/anatomy/library">Pustaka</NavLink>
          <NavLink to="/anatomy/study">Kuis</NavLink>
          <Link to="/anatomy/explore" className="anatomy-nav-3d">Atlas 3D <Box size={14} /></Link>
        </nav>
        <Link className="anatomy-back" to="/beranda">← Beranda</Link>
      </header>
      <main className="anatomy-learning-main">
        {storageError && <p role="alert" className="anatomy-warning">{storageError}</p>}
        {children}
      </main>
      <footer className="anatomy-product-footer">
        <Logo variant="mark" />
        <span>Anatomi Manusia · Belajar dengan tubuh di depan mata.</span>
        <span>Dataset Z-Anatomy · Progres tersimpan di perangkat ini</span>
      </footer>
    </div>
  );
}

function DataBoundary({ children }) {
  const { registry, error, retry } = useAnatomyLibrary();
  const mascots = useMascotsOn();
  if (error) return (
    <section role="alert" className="library-empty">
      {mascots && <Mascot name="nilo" mood="think" size={96} label="" />}
      <h1>Pustaka anatomi belum dapat dimuat</h1>
      <p>{error}</p>
      <button className="btn-primary btn-sm" onClick={retry}>Coba lagi</button>
    </section>
  );
  if (!registry) return (
    <div className="library-skeleton" role="status">
      <span className="library-skeleton-label">
        {mascots && <Mascot name="kori" mood="think" size={44} label="" />}
        Menyiapkan pustaka anatomi…
      </span>
      <div /><div /><div />
    </div>
  );
  return children;
}

function SectionHeading({ eyebrow, title, description, link, to }) {
  return (
    <div className="library-section-heading">
      <div>
        {eyebrow && <p className="library-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {to && <Link to={to}>{link} <ArrowRight size={16} /></Link>}
    </div>
  );
}

// Search with live picture suggestions: the first matches show their 3D preview straight away,
// Enter opens the highlighted one (or the full results when none is highlighted).
function SearchForm({ initial = '', compact = false }) {
  const { registry } = useAnatomyLibrary();
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const listId = useId();
  // Suggestions favour short, whole-structure names ("Humerus" before "Humeral head of ...") and
  // show each left/right pair once.
  const hits = useMemo(() => {
    const q = normalise(query);
    if (!registry || q.length < 2) return [];
    const seen = new Set();
    return filterStructures(registry, { query })
      .filter((r) => r.nameKnown)
      .slice(0, 300)
      .map((r, i) => ({ r, i, starts: r.nameKey.startsWith(q) ? 0 : 1 }))
      .sort((a, b) => a.starts - b.starts || a.r.nameKey.length - b.r.nameKey.length || a.i - b.i)
      .map((x) => x.r)
      .filter((r) => !seen.has(r.base) && seen.add(r.base))
      .slice(0, 6);
  }, [registry, query]);
  const showList = open && hits.length > 0;
  const allResults = () => navigate('/anatomy/library' + (query ? '?q=' + encodeURIComponent(query) : ''));
  const submit = (e) => {
    e.preventDefault();
    if (showList && hits[active]) navigate(structureHref(hits[active].id));
    else allResults();
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); setActive(-1); return; }
    if (!hits.length || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    setOpen(true);
    setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % hits.length : i <= 0 ? hits.length - 1 : i - 1));
  };
  return (
    <form
      className={'anatomy-search ' + (compact ? 'is-compact' : '')}
      onSubmit={submit}
      role="search"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      <Search size={21} aria-hidden />
      <input
        role="combobox"
        aria-label="Cari struktur anatomi"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? listId + '-' + active : undefined}
        placeholder="Cari humerus, musculus, jantung…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      <button type="submit">Cari <ArrowRight size={16} /></button>
      {showList && (
        <div className="anatomy-search-suggest">
          <ul id={listId} role="listbox" aria-label="Saran struktur">
            {hits.map((row, i) => (
              <li key={row.id} id={listId + '-' + i} role="option" aria-selected={i === active}>
                <Link to={structureHref(row.id)} tabIndex={-1} onMouseEnter={() => setActive(i)}>
                  <StructureThumbnail path={row.thumbnail} name={row.name} className="suggest-thumb" eager />
                  <span>
                    <strong>{row.name}</strong>
                    <small>{systemName(row.system)}{cardSubtitle(row) !== systemName(row.system) ? ' · ' + cardSubtitle(row) : ''}</small>
                  </span>
                  <ChevronRight size={15} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" className="anatomy-search-all" onClick={allResults}>
            Lihat semua hasil untuk “{query.trim()}” <ArrowRight size={14} />
          </button>
        </div>
      )}
    </form>
  );
}

function AnatomyLanding() {
  return <DataBoundary><LandingContent /></DataBoundary>;
}
function LandingContent() {
  const { registry, progress } = useAnatomyLibrary();
  const mascots = useMascotsOn();
  const mastered = Object.values(progress.structures).filter((r) => r.status === 'MASTERED').length;
  const featured = ['Humerus.r', 'Ulna.r', 'Femur.r', 'Scapula.r'].map((id) => registry.byId.get(id)).filter(Boolean);
  return (
    <>
      <section className="anatomy-hero">
        <div className="anatomy-hero-copy">
          <p className="library-eyebrow">PUSTAKA BELAJAR MEDCOEL</p>
          <h1>Anatomi<br /><em>Manusia.</em></h1>
          <p className="anatomy-hero-lead">Pahami tubuh,<br />satu struktur demi satu struktur.</p>
          <p className="anatomy-hero-description">
            Jelajahi struktur, hubungkan regio dan sistem, lalu uji pemahamanmu langsung pada atlas 3D.
          </p>
          <div className="anatomy-hero-actions">
            <Link className="btn-primary" to="/anatomy/explore"><Box size={17} /> Buka Atlas 3D <ArrowRight size={16} /></Link>
            <Link className="btn-secondary" to="/anatomy/study"><Target size={17} /> Mulai kuis interaktif</Link>
          </div>
          <div className="anatomy-hero-stats">
            <span><strong>{count(registry.rows.length)}</strong>struktur</span>
            <span><strong>{SYSTEMS.length}</strong>sistem</span>
            <span><strong>{REGIONS.length}</strong>regio belajar</span>
          </div>
        </div>
        <div className="anatomy-hero-art">
          <span className="library-art-label">TUBUH MANUSIA / RUANG BELAJARMU</span>
          <StructureThumbnail path={registry.previews.hero?.url} name="Anatomi otot dan rangka manusia" className="anatomy-hero-model" eager />
          <span className="library-art-caption">Jelajahi. Hubungkan. Ingat.</span>
        </div>
      </section>

      <section className="library-search-section" aria-labelledby="anatomy-search-title">
        <div>
          <p className="library-eyebrow">MULAI DARI SATU NAMA</p>
          <h2 id="anatomy-search-title">Cari struktur</h2>
          <p>Bahasa Inggris, Latin, Indonesia, atau sinonimnya. Gambar 3D-nya langsung muncul.</p>
          {mascots && (
            <MascotTip mascot="kori" mood="wave" size={56} className="library-search-tip">
              Coba ketik “hum”, aku tunjukkan gambarnya sebelum kamu selesai mengetik.
            </MascotTip>
          )}
        </div>
        <div>
          <SearchForm />
          <div className="library-search-suggestions">
            <span>Coba</span>
            {['Humerus', 'Ulna', 'Jantung', 'Platysma'].map((q) => (
              <Link key={q} to={'/anatomy/library?q=' + q}>{q} ↗</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="library-section">
        <SectionHeading eyebrow="PENDEKATAN REGIONAL" title="Jelajahi per regio" description="Bangun pemahaman dari satu bagian tubuh." />
        <div className="library-region-grid">
          {registry.regions.map((r) => (
            <Link key={r.id} className="library-region-card" to={'/anatomy/region/' + r.id}>
              <StructureThumbnail path={registry.previews.regions?.[r.id]?.url} name={r.name} className="region-thumbnail" />
              <div>
                <h3>{r.name}</h3>
                <p>{r.description}</p>
                <small>{count(r.count)} struktur</small>
              </div>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>

      <section className="library-section">
        <SectionHeading eyebrow="LIHAT HUBUNGANNYA" title="Jelajahi per sistem" description="Tujuh sistem dari atlas Z-Anatomy." />
        <div className="library-system-grid">
          {registry.systems.map((s) => {
            const Icon = SYSTEM_ICONS[s.id];
            return (
              <Link key={s.id} className={'library-system-card system-' + s.id} to={'/anatomy/system/' + s.id}>
                <SystemPicture registry={registry} system={s} Icon={Icon} />
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <small>{count(s.count)} struktur <ArrowRight size={14} /></small>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="library-section">
        <SectionHeading
          eyebrow="DARI NAMA KE PEMAHAMAN"
          title="Pustaka anatomi"
          description="Setiap struktur punya halaman untuk dibaca dan dibuka di 3D."
          to="/anatomy/library"
          link="Lihat semua struktur"
        />
        <div className="library-structure-grid">
          {featured.map((r) => <StructureCard key={r.id} row={r} />)}
        </div>
      </section>

      <section className="library-study-banner">
        <div className="library-study-symbol">
          {mascots ? <Mascot name="kila" mood="cheer" size={112} label="" /> : <Target size={62} />}
        </div>
        <div>
          <p className="library-eyebrow">BIAR NEMPEL DI KEPALA</p>
          <h2>Kuis anatomi 3D</h2>
          <p>Kenali struktur yang disorot atau cari sendiri struktur yang diminta pada model 3D.</p>
          <div className="library-study-tags">
            <span>{STUDY_MODES.length} mode kuis</span>
            <span>Pengecoh sejenis</span>
            <span>{mastered} dikuasai</span>
          </div>
        </div>
        <Link className="btn-primary" to="/anatomy/study">Mulai sesi kuis <ArrowRight size={16} /></Link>
      </section>
    </>
  );
}

function StatusBadge({ id }) {
  const { progress } = useAnatomyLibrary();
  const state = progress.structures[id]?.status || 'NOT_STUDIED';
  return (
    <span className={'library-progress progress-' + state.toLowerCase()}>
      {state === 'MASTERED' && <Check size={10} />} {PROGRESS_LABELS[state]}
    </span>
  );
}

function StructureCard({ row }) {
  const Icon = SYSTEM_ICONS[row.system];
  return (
    <Link className="library-structure-card" to={structureHref(row.id)}>
      <StructureThumbnail path={row.thumbnail} name={row.name} />
      <div className="library-structure-card-top">
        <Icon size={20} />
        <StatusBadge id={row.id} />
      </div>
      <h3>{row.name}</h3>
      <p className="library-latin">{cardSubtitle(row)}</p>
      <div className="library-card-meta">
        <span>{systemName(row.system)}</span>
        <ChevronRight size={15} />
      </div>
    </Link>
  );
}

function LibraryCollection({ fixedSystem = '' }) {
  return <DataBoundary><CollectionContent fixedSystem={fixedSystem} /></DataBoundary>;
}
function CollectionContent({ fixedSystem }) {
  const { registry } = useAnatomyLibrary();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const system = fixedSystem || params.get('system') || '';
  const region = params.get('region') || '';
  const page = Math.max(1, Math.trunc(Number(params.get('page'))) || 1);
  const sort = params.get('sort') || 'overview';
  const rows = useMemo(
    () => (query || sort === 'name'
      ? filterStructures(registry, { query, system, region })
      : browseStructures(filterStructures(registry, { system, region }))),
    [registry, query, system, region, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 48));
  const activePage = Math.min(pages, page);
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: key === 'q' });
  };
  const goToPage = (n) => { update('page', String(n)); window.scrollTo(0, 0); };
  const title = region && system && regionName(region) && systemName(system)
    ? regionName(region) + ' / ' + systemName(system)
    : fixedSystem ? 'Sistem ' + systemName(fixedSystem) : 'Pustaka anatomi';
  return (
    <>
      <PageIntro title={title} eyebrow="JELAJAHI STRUKTUR" description="Nama, konteks, dan jalan pintas langsung ke atlas 3D." />
      <div className="library-filterbar">
        <label className="library-query">
          <Search size={18} />
          <input aria-label="Cari struktur" value={query} placeholder="Inggris, Latin, Indonesia, atau sinonim…" onChange={(e) => update('q', e.target.value)} />
        </label>
        <label>
          Sistem
          <select aria-label="Saring menurut sistem" value={system} disabled={!!fixedSystem} onChange={(e) => update('system', e.target.value)}>
            <option value="">Semua sistem</option>
            {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>
          Regio
          <select aria-label="Saring menurut regio" value={region} onChange={(e) => update('region', e.target.value)}>
            <option value="">Semua regio</option>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label>
          Urutan
          <select aria-label="Urutan struktur" value={sort} disabled={!!query} onChange={(e) => update('sort', e.target.value)}>
            <option value="overview">Struktur utama dulu</option>
            <option value="name">Nama A–Z</option>
          </select>
        </label>
        {(query || region || (!fixedSystem && system)) && (
          <button className="library-clear" onClick={() => setParams({})}>Hapus filter</button>
        )}
      </div>

      {!query && !region ? (
        <section className="library-section">
          <SectionHeading
            eyebrow="1 · PILIH REGIO"
            title="Mau mulai dari bagian mana?"
            description={system ? 'Pilih regio di dalam sistem ini.' : 'Mulai dari satu bagian tubuh, lalu pilih sistemnya.'}
          />
          <RegionChoices registry={registry} onChoose={(id) => update('region', id)} system={system} />
        </section>
      ) : !query && !system ? (
        <section className="library-section">
          <SectionHeading eyebrow="2 · PILIH SISTEM" title="Jelajahi regio ini per sistem" />
          <SystemChoices registry={registry} region={region} onChoose={(id) => update('system', id)} />
        </section>
      ) : null}

      {!query && region && !system && SYSTEMS.map((group) => {
        const items = rows.filter((row) => row.system === group.id);
        return items.length ? (
          <section key={group.id} className="library-section">
            <SectionHeading
              title={group.name}
              description={count(items.length) + ' struktur · struktur utama dulu'}
              to={'/anatomy/library?region=' + region + '&system=' + group.id}
              link="Lihat koleksi lengkap"
            />
            <div className="library-structure-grid">
              {items.slice(0, 8).map((row) => <StructureCard key={row.id} row={row} />)}
            </div>
          </section>
        ) : null;
      })}

      {(query || (region && system)) && (
        <>
          <div className="library-result-meta" role="status">
            <span><b>{count(rows.length)}</b> struktur {query && `untuk “${query}”`}</span>
            <span>Halaman {activePage} / {pages}</span>
          </div>
          {rows.length ? (
            <div className="library-structure-grid">
              {rows.slice((activePage - 1) * 48, activePage * 48).map((row) => <StructureCard key={row.id} row={row} />)}
            </div>
          ) : (
            <EmptyResult onReset={() => setParams({})} />
          )}
          {pages > 1 && (
            <nav className="library-pagination" aria-label="Halaman pustaka">
              <button disabled={activePage === 1} onClick={() => goToPage(activePage - 1)}>← Sebelumnya</button>
              <span>{activePage} / {pages}</span>
              <button disabled={activePage === pages} onClick={() => goToPage(activePage + 1)}>Berikutnya →</button>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function EmptyResult({ onReset }) {
  const mascots = useMascotsOn();
  return (
    <div className="library-empty">
      {mascots ? <Mascot name="nilo" mood="think" size={96} label="" /> : <Search size={32} />}
      <h2>Belum ada struktur yang cocok</h2>
      <p>Coba nama lain (Inggris, Latin, atau Indonesia) atau longgarkan filter sistem/regio.</p>
      <button className="btn-secondary btn-sm" onClick={onReset}>Atur ulang pencarian</button>
    </div>
  );
}

function RegionChoices({ registry, onChoose, system = '', selected = '' }) {
  return (
    <div className="library-region-grid">
      {registry.regions.map((r) => {
        const n = filterStructures(registry, { region: r.id, system }).length;
        return (
          <button type="button" className="library-region-card" key={r.id} aria-pressed={selected === r.id} onClick={() => onChoose(r.id)} disabled={!n}>
            <StructureThumbnail path={registry.previews.regions?.[r.id]?.url} name={r.name} className="region-thumbnail" />
            <div>
              <h3>{r.name}</h3>
              <small>{count(n)} struktur</small>
            </div>
            <ArrowRight size={16} />
          </button>
        );
      })}
    </div>
  );
}

// Picture of the whole system rendered from the atlas meshes; the icon stays as a fallback.
function SystemPicture({ registry, system, Icon }) {
  const path = registry.previews.systems?.[system.id]?.url;
  if (!path) return <Icon size={22} className="library-system-icon" />;
  return (
    <span className="library-system-picture">
      <StructureThumbnail path={path} name={'Sistem ' + system.name} className="system-thumbnail" />
    </span>
  );
}

function SystemChoices({ registry, region, onChoose, selected }) {
  return (
    <div className="library-system-grid">
      {SYSTEMS.map((s) => {
        const n = filterStructures(registry, { region, system: s.id }).length;
        const Icon = SYSTEM_ICONS[s.id];
        return (
          <button type="button" className="library-system-card" key={s.id} disabled={!n} aria-pressed={selected === s.id} onClick={() => onChoose(s.id)}>
            <SystemPicture registry={registry} system={s} Icon={Icon} />
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <small>{count(n)} struktur</small>
          </button>
        );
      })}
    </div>
  );
}

function PageIntro({ title, eyebrow, description }) {
  return (
    <header className="library-page-intro">
      <Link to="/anatomy"><ArrowLeft size={14} /> Anatomi Manusia</Link>
      <p className="library-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function RegionPage() {
  const { regionId } = useParams();
  return <DataBoundary>{REGIONS.some((r) => r.id === regionId) ? <RegionContent id={regionId} /> : <Missing />}</DataBoundary>;
}
function RegionContent({ id }) {
  const { registry } = useAnatomyLibrary();
  const navigate = useNavigate();
  const region = REGIONS.find((r) => r.id === id);
  const rows = browseStructures(filterStructures(registry, { region: id }));
  return (
    <>
      <PageIntro title={region.name} eyebrow="JELAJAHI PER REGIO" description={`${region.description} · ${count(rows.length)} struktur`} />
      <div className="library-related-links">
        <Link to={'/anatomy/library?region=' + id}><BookOpen size={15} /> Semua struktur di regio ini</Link>
        <Link to={'/anatomy/study?region=' + id}><Target size={15} /> Kuis regio ini</Link>
      </div>
      <div className="library-section">
        <SectionHeading title="Pilih sistem" description="Mulai dari struktur utama, lalu buka koleksi lengkapnya." />
        <SystemChoices registry={registry} region={id} onChoose={(system) => navigate('/anatomy/library?region=' + id + '&system=' + system)} />
      </div>
      {SYSTEMS.map((s) => {
        const group = rows.filter((r) => r.system === s.id);
        if (!group.length) return null;
        return (
          <section key={s.id} className="library-section">
            <SectionHeading title={s.name} description={`${count(group.length)} struktur`} to={`/anatomy/library?region=${id}&system=${s.id}`} link="Lihat semua" />
            <div className="library-structure-grid">
              {group.slice(0, 8).map((row) => <StructureCard key={row.id} row={row} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}

function SystemPage() {
  const { systemId } = useParams();
  return SYSTEMS.some((s) => s.id === systemId) ? <LibraryCollection fixedSystem={systemId} /> : <Missing />;
}

function StructurePage() {
  return <DataBoundary><StructureContent /></DataBoundary>;
}
function StructureContent() {
  const { id } = useParams();
  const { registry, progress, updateProgress } = useAnatomyLibrary();
  const row = registry.byId.get(id);
  useEffect(() => { if (row) document.title = row.name + ' | Anatomi MEDCOEL'; }, [row]);
  if (!row) return <Missing message="Struktur ini tidak ditemukan dalam dataset anatomi." />;
  const related = relatedStructures(registry, row);
  const system = SYSTEMS.find((s) => s.id === row.system);
  const status = progress.structures[row.id]?.status || 'NOT_STUDIED';
  const latin = latinOf(row);
  return (
    <>
      <nav className="library-breadcrumb" aria-label="Breadcrumb">
        <Link to="/anatomy/library">Pustaka</Link>
        <ChevronRight size={13} />
        <Link to={'/anatomy/system/' + row.system}>{system.name}</Link>
        <ChevronRight size={13} />
        <span>{row.name}</span>
      </nav>
      <article className="library-structure-detail">
        <div className="library-detail-copy">
          <p className="library-eyebrow">{system.name.toUpperCase()} · {row.side ? 'SISI ' + SIDE_LABELS[row.side].toUpperCase() : 'STRUKTUR'}</p>
          <h1>{row.name}</h1>
          {latin && <p className="library-detail-latin">{latin}</p>}
          <div className="library-detail-tags">
            <Link to={'/anatomy/system/' + row.system}>{system.name}</Link>
            {row.regions.map((r) => <Link key={r} to={'/anatomy/region/' + r}>{regionName(r)}</Link>)}
          </div>
          <div className="library-definition">
            <h2>Tentang struktur ini</h2>
            {!row.nameKnown && (
              <p className="anatomy-warning">
                Nama struktur belum teridentifikasi dalam dataset sumber. Mesh ID: {row.id}. Struktur ini tidak dipakai untuk kuis.
              </p>
            )}
            {row.definition
              ? <p>{row.definition}</p>
              : <p>Deskripsi belum tersedia dalam dataset. Buka atlas 3D untuk melihat lokasi dan struktur di sekitarnya.</p>}
            {row.sources.length > 0 && (
              <div className="library-sources">
                Sumber:{' '}
                {row.sources.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{new URL(url).hostname} ↗</a>)}
              </div>
            )}
          </div>
          <p className="library-provenance">Nama dan deskripsi dari metadata Z-Anatomy. Pembagian regio mengikuti katalog kuis atlas.</p>
        </div>
        <aside className="library-detail-aside">
          <StructureThumbnail path={row.thumbnail} name={row.name} className="library-detail-preview" eager />
          <h2>Lihat dalam konteksnya.</h2>
          <p>Struktur ini bersinar di atlas, sementara struktur di sekitarnya tetap terlihat. Isolasi tersedia kalau perlu.</p>
          {row.available
            ? <Link className="btn-primary" to={exploreHref(row.id)}><Box size={16} /> Lihat di 3D <ArrowRight size={16} /></Link>
            : <p>Model belum tersedia.</p>}
          <div className="library-progress-control" role="radiogroup" aria-label="Status belajarmu">
            <span>Status belajarmu</span>
            <div className="library-progress-segment">
              {PROGRESS_STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => updateProgress(setProgressStatus(progress, row.id, s))}
                >
                  {status === s && <Check size={12} />} {PROGRESS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <Link className="library-detail-study" to={'/anatomy/study?system=' + row.system}>Kuis sistem ini <ArrowRight size={14} /></Link>
        </aside>
      </article>
      <section className="library-section">
        <SectionHeading title="Struktur terkait" description="Struktur lain di sistem dan regio yang sama." />
        <div className="library-structure-grid">
          {related.map((r) => <StructureCard key={r.id} row={r} />)}
        </div>
      </section>
    </>
  );
}

function Missing({ message = 'Halaman anatomi ini tidak ditemukan.' }) {
  const mascots = useMascotsOn();
  return (
    <section className="library-empty">
      {mascots ? <Mascot name="nilo" mood="think" size={104} label="" /> : <Box size={40} />}
      <h1>Tidak ada di atlas ini</h1>
      <p>{message}</p>
      <Link className="btn-primary btn-sm" to="/anatomy/library">Buka pustaka anatomi</Link>
    </section>
  );
}

// Full-screen atlas. The atlas draws its own top bar, so the host only tells it where "back" goes.
function Explore() {
  const [params] = useSearchParams();
  const id = params.get('structure');
  useEffect(() => { document.title = 'Atlas 3D | MEDCOEL'; }, []);
  const back = id ? { path: structureHref(id), label: 'Detail struktur' } : { path: '/anatomy', label: 'Anatomi' };
  return (
    <div className="library-explore">
      {id
        ? <DataBoundary><ExploreTarget id={id} back={back} /></DataBoundary>
        : <div className="library-explore-default"><HumanAnatomy back={back} /></div>}
    </div>
  );
}
function ExploreTarget({ id, back }) {
  const { registry } = useAnatomyLibrary();
  if (!registry.byId.get(id)?.available) return <div className="library-explore-message"><Missing message="Model struktur ini tidak tersedia dalam atlas." /></div>;
  return <LibraryViewer structureId={id} back={back} />;
}

function StudyPage() {
  return <DataBoundary><StudyContent /></DataBoundary>;
}
function StudyContent() {
  const { registry, progress, updateProgress } = useAnatomyLibrary();
  const mascots = useMascotsOn();
  const [params, setParams] = useSearchParams();
  const requestedMode = params.get('mode');
  const mode = STUDY_MODES.some((m) => m.id === requestedMode) ? requestedMode : 'identify';
  const system = params.get('system') || '';
  const region = params.get('region') || '';
  const [round, setRound] = useState(null);
  const [error, setError] = useState('');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const systemChosen = params.has('system');
  const { regionChosen, eligibleCount, ready: setupReady } = studyScope(registry, { mode, system, region, systemChosen });
  const [editingRegion, setEditingRegion] = useState(!regionChosen);
  const serial = useRef(0);
  const locked = useRef(false);
  const quizTop = useRef(null);
  const roundKey = round?.key;
  useEffect(() => { quizTop.current?.scrollIntoView({ block: 'start' }); }, [roundKey]);
  const configKey = mode + '|' + system + '|' + region;
  const [questionKey, setQuestionKey] = useState('');
  useEffect(() => { setRound(null); locked.current = false; }, [configKey]);

  function nextQuestion() {
    if (!setupReady) return;
    try {
      const question = makeQuestion(registry, { mode, system, region, excludeId: round?.question.targetId });
      locked.current = false;
      setRound({ question, key: ++serial.current, ready: false, answer: null });
      setQuestionKey(configKey);
      setError('');
    } catch (e) {
      setError(e.message);
      setRound(null);
    }
  }
  function answer(id) {
    if (!round?.ready || locked.current || questionKey !== configKey) return;
    const result = evaluateStudyAttempt(round.question, id, { ready: round.ready, locked: locked.current });
    if (!result) return;
    const { correct } = result;
    locked.current = result.locked;
    setRound((r) => ({ ...r, answer: { id, correct } }));
    setScore((s) => ({ total: s.total + 1, correct: s.correct + Number(correct) }));
    updateProgress(recordAnswer(progress, round.question.targetId, correct));
  }
  // Keyboard: 1-4 answers, Enter goes to the next question. Ignored while typing in a field.
  const keys = useRef({});
  keys.current = { round, answer, nextQuestion };
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName || '')) return;
      const { round: r, answer: pick, nextQuestion: next } = keys.current;
      if (!r) return;
      const n = Number(e.key);
      if (!r.answer && n >= 1 && n <= r.question.options.length) { e.preventDefault(); pick(r.question.options[n - 1].id); }
      else if (r.answer && (r.question.mode !== 'find' || r.answer.correct) && e.key === 'Enter' && e.target?.tagName !== 'BUTTON' && e.target?.tagName !== 'A') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filter = (name, value) => {
    const p = new URLSearchParams(params);
    p.set(name, value);
    if (name === 'region') { p.delete('system'); setEditingRegion(false); }
    setParams(p);
    setRound(null);
    setError('');
  };
  const target = round && registry.byId.get(round.question.targetId);
  const activeMode = STUDY_MODES.find((m) => m.id === mode);
  const chosenLabel = round?.answer && !round.answer.correct
    ? round.question.options.find((o) => o.id === round.answer.id)?.label || registry.byId.get(round.answer.id)?.name || ''
    : '';
  const accuracy = score.total ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <>
      <PageIntro title="Kuis anatomi" eyebrow="ACTIVE RECALL, LANGSUNG DI 3D" description="Kenali struktur yang disorot atau temukan sendiri pada model 3D." />
      {!round ? (
        <section className="library-quiz-setup">
          {mascots && (
            <MascotTip mascot="kori" mood="talk" size={64} className="library-setup-tip">
              Pilih regio dan sistem, lalu cara bermain. Kenali struktur yang disorot atau cari sendiri di model dengan kontrol sembunyikan dan tampilkan kembali.
            </MascotTip>
          )}
          <div className="library-setup-step">
            <span>01</span>
            <div>
              <h2>Pilih bagian tubuh</h2>
              <p>Mulai dari regio yang ingin kamu pelajari.</p>
            </div>
            {regionChosen && <strong>{regionName(region)}</strong>}
          </div>
          {editingRegion || !regionChosen ? (
            <div className="library-setup-regions">
              <RegionChoices registry={registry} system="" selected={region} onChoose={(id) => filter('region', id)} />
            </div>
          ) : (
            <div className="library-selected-region">
              <StructureThumbnail path={registry.previews.regions?.[region]?.url} name={regionName(region)} className="region-thumbnail" />
              <div>
                <strong>{regionName(region)}</strong>
                <p>{REGIONS.find((r) => r.id === region).description}</p>
              </div>
              <button className="btn-secondary btn-sm" onClick={() => setEditingRegion(true)}>Ganti regio</button>
            </div>
          )}
          {regionChosen && !editingRegion && (
            <>
              <div className="library-setup-step">
                <span>02</span>
                <div>
                  <h2>Pilih sistem anatomi</h2>
                  <p>Fokus pada satu sistem atau campur semua sistem di regio ini.</p>
                </div>
              </div>
              <SystemChoices registry={registry} region={region} selected={system} onChoose={(id) => filter('system', id)} />
              <button className="library-all-systems" aria-pressed={systemChosen && !system} onClick={() => filter('system', '')}>
                Semua sistem di {regionName(region)}
              </button>
              {systemChosen && (
                <>
                  <div className="library-setup-step">
                    <span>03</span>
                    <div>
                      <h2>Pilih cara bermain</h2>
                      <p>Bisa diganti kapan saja di antara soal.</p>
                    </div>
                  </div>
                  <div className="library-mode-cards" role="radiogroup" aria-label="Mode kuis">
                    {STUDY_MODES.map((m) => {
                      const Icon = MODE_ICONS[m.id];
                      return (
                        <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className="library-mode-card" onClick={() => filter('mode', m.id)}>
                          <Icon size={20} aria-hidden />
                          <strong>{m.name}</strong>
                          <span>{m.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="library-setup-summary">
                    <div>
                      <p className="library-eyebrow">SIAP LATIHAN</p>
                      <h2>{systemName(system) || 'Semua sistem'} · {regionName(region)}</h2>
                      <p>{count(eligibleCount)} struktur · {activeMode?.name}</p>
                    </div>
                    <button className="btn-primary" disabled={!setupReady} onClick={nextQuestion}>
                      <Target size={17} /> Mulai kuis <ArrowRight size={16} />
                    </button>
                    {eligibleCount < 4 && <p role="status">Pilih cakupan yang lebih luas supaya ada cukup pilihan jawaban.</p>}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      ) : (
        <div className="library-session-bar">
          <div>
            <strong>{regionName(region)} / {systemName(system) || 'Semua sistem'}</strong>
            <span>{activeMode?.name} · Benar {score.correct} dari {score.total} percobaan{score.total ? ` (${accuracy}%)` : ''}</span>
          </div>
          <div className="library-session-meter" aria-hidden><span style={{ width: accuracy + '%' }} /></div>
          <button className="btn-secondary btn-sm" onClick={() => { setRound(null); serial.current = 0; setScore({ correct: 0, total: 0 }); }}>Mulai ulang / ubah area</button>
        </div>
      )}
      {error && <p role="alert" className="anatomy-warning">{error}</p>}
      {round && (
        <div className="library-quiz-layout" ref={quizTop}>
          <div className="library-quiz-viewer">
            <div className="library-model-prompt"><strong>{round.question.prompt}</strong>{mode === 'find' && round.answer && <span role="status">{round.answer.correct ? 'Benar! Lanjutkan ke soal berikutnya.' : 'Belum tepat. Coba lagi tanpa membuka lokasi jawaban.'}</span>}</div>
            <LibraryViewer
              structureId={round.question.targetId}
              mode={mode}
              region={region}
              system={system}
              requestKey={round.key}
              onPick={answer}
              onReady={(ready) => setRound((r) => (r?.key === round.key ? { ...r, ready } : r))}
            />
            <p>Seret untuk memutar · Gulir/cubit untuk zoom · Shift + seret untuk menggeser</p>
          </div>
          <section className="library-question">
            <p className="library-eyebrow">SOAL {round.key} · {activeMode?.name}</p>
            <h2>{round.question.prompt}</h2>
            {mode === 'find' ? (
              <p className="meta">Tap struktur untuk membuka kontrol. Sembunyikan penghalang, lalu tekan “Pilih sebagai jawaban” saat yakin. “Tampilkan semua” mengembalikan struktur tersembunyi.</p>
            ) : (
              <div className="library-answer-options">
                {round.question.options.map((o, i) => (
                  <button
                    key={o.id}
                    disabled={!round.ready || !!round.answer}
                    className={round.answer ? (o.id === round.question.answerId ? 'is-correct' : o.id === round.answer.id ? 'is-wrong' : '') : ''}
                    onClick={() => answer(o.id)}
                  >
                    <span className="library-answer-key" aria-hidden>{i + 1}</span>
                    <span className="library-answer-label">{o.label}</span>
                    {round.answer && o.id === round.question.answerId ? <Check size={16} /> : <ChevronRight size={15} />}
                  </button>
                ))}
              </div>
            )}
            {!round.ready && <p role="status" className="meta">Menyiapkan struktur…</p>}
            {round.answer && (
              <div className={'library-answer-feedback ' + (round.answer.correct ? 'correct' : 'incorrect')} role="status">
                <MascotTip
                  mascot={round.answer.correct ? 'kila' : 'nilo'}
                  mood={round.answer.correct ? 'cheer' : 'think'}
                  size={60}
                  pop
                  title={round.answer.correct ? 'Benar, mantap!' : 'Belum tepat, santai saja.'}
                >
                  {chosenLabel && <p>Kamu memilih <b>{chosenLabel}</b>.</p>}
                  {mode === 'find' && !round.answer.correct ? <p>Belum tepat. Cari lagi pada model; lokasi jawaban tetap dirahasiakan.</p> : <p>Jawabannya <b>{target.name}</b>{mode === 'find' ? ', kini ditampilkan di model.' : '.'}</p>}
                </MascotTip>
                {(mode !== 'find' || round.answer.correct) && <span>{systemName(target.system)} · {target.regions.map(regionName).join(', ')}</span>}
                {(mode !== 'find' || round.answer.correct) && <div className="library-feedback-actions">
                  <button className="btn-primary" onClick={nextQuestion} autoFocus>Soal berikutnya <ArrowRight size={16} /></button>
                  <Link target="_blank" to={structureHref(target.id)} rel="noreferrer">Baca tentang struktur ini ↗</Link>
                </div>}
              </div>
            )}
            <p className="library-question-note">
              <Keyboard size={14} aria-hidden />{' '}
              {round.question.options.length ? `Tekan 1–${round.question.options.length} untuk menjawab, Enter untuk soal berikutnya.` : 'Enter untuk soal berikutnya setelah menjawab.'}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
