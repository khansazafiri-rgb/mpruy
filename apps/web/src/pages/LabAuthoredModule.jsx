import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, errorText } from '@/lib/api';
import { ErrorState, PageLoader } from '@/components/ui';
import LabAuthoredContent from '@/features/lab/LabAuthoredContent';
import { modulePath } from '@/features/lab/labDiscovery';

export default function LabAuthoredModule() {
  const { key } = useParams(); const [params] = useSearchParams(); const bank = params.get('latihan') || ''; const [state, setState] = useState({ loading: true }); const [catalog, setCatalog] = useState(null); const [retry, setRetry] = useState(0);
  useEffect(() => { let live = true; setState({ loading: true }); api(`lab/modules/${encodeURIComponent(key)}`).then((data) => live && setState({ data })).catch((e) => live && setState({ error: errorText(e) })); return () => { live = false; }; }, [key, retry]);
  // The catalog only adds the "Discipline › Topic" trail; the module stays usable if it cannot be loaded.
  useEffect(() => { let live = true; api('lab/catalog').then((data) => live && setCatalog(data)).catch(() => {}); return () => { live = false; }; }, []);
  return <div className="min-w-0 space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10">
    <Link to={bank ? '/lab?mode=explore' : '/lab'} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} aria-hidden /> {bank ? 'Explore · Latihan soal' : 'Guided Learning'}</Link>
    {state.loading ? <PageLoader /> : state.error ? <ErrorState onRetry={() => setRetry((n) => n + 1)}>{state.error}</ErrorState> : <LabAuthoredContent key={bank || 'learn'} module={state.data} trail={modulePath(catalog, key)} initialMode={bank ? 'practice' : 'learn'} initialBank={bank} />}
  </div>;
}
