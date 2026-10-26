import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorText } from '@/lib/api';
import { Alert, PageLoader } from '@/components/ui';
import LabAuthoredContent from '@/features/lab/LabAuthoredContent';

export default function LabAuthoredModule() {
  const { key } = useParams(); const [state, setState] = useState({ loading: true });
  useEffect(() => { let live = true; setState({ loading: true }); api(`lab/modules/${encodeURIComponent(key)}`).then((data) => live && setState({ data })).catch((e) => live && setState({ error: errorText(e) })); return () => { live = false; }; }, [key]);
  return <div className="space-y-4 pb-24"><Link to="/lab" className="text-sm font-semibold text-brand">← MEDCOEL Lab</Link>{state.loading ? <PageLoader /> : state.error ? <Alert>{state.error}</Alert> : <LabAuthoredContent module={state.data} />}</div>;
}
