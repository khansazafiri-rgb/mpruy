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
  // chaptersOf: hanya BAB biasa. chapterChoicesOf: BAB biasa ditambah BAB khusus Drilling (soal General tanpa BAB).
  const babs = (sid) => chapters.filter((c) => c.subject === sid && !c.drilling);
  const choices = (sid) => chapters.filter((c) => c.subject === sid).map((c) => (c.drilling ? { ...c, label: 'Drilling (General, tanpa BAB)' } : { ...c, label: c.title })).sort((a, b) => (a.drilling ? 1 : 0) - (b.drilling ? 1 : 0));
  return { subjects, chapters, reload, chaptersOf: babs, chapterChoicesOf: choices };
}
