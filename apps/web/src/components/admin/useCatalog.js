// Mata kuliah dan BAB untuk halaman admin (termasuk yang disembunyikan).
import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pb';

export function useCatalog() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const reload = useCallback(async () => {
    const [s, c] = await Promise.all([
      pb.collection('subjects').getFullList({ sort: 'order,name', requestKey: null }),
      pb.collection('chapters').getFullList({ sort: 'order,created', requestKey: null }),
    ]);
    setSubjects(s);
    setChapters(c);
  }, []);
  useEffect(() => { reload().catch(() => {}); }, [reload]);
  return { subjects, chapters, reload, chaptersOf: (sid) => chapters.filter((c) => c.subject === sid) };
}
