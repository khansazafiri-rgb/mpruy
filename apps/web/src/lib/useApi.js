import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// Memuat data dari endpoint; reload() untuk memuat ulang.
export function useApi(path, options, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const opt = useRef(options);
  opt.current = options;

  const reload = useCallback(async () => {
    if (!path) { setLoading(false); return null; }
    setLoading(true);
    setError(null);
    try {
      const d = await api(path, opt.current);
      setData(d);
      return d;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}
